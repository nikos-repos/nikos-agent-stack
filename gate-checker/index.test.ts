import { afterAll, expect, test } from "bun:test";
import { execSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve as resolvePath } from "node:path";
import {
	applyPolicy,
	checkCitations,
	claimsTestSuccess,
	extractModClaims,
	extractSnapshotRefs,
	formatFailures,
	freshEvidence,
	inlineAdditions,
	processShape,
	ranTestRunner,
	reliesOnSubagents,
	rewriteGitCommit,
	rewriteSmartCommit,
	runCommitGate,
	runVerifyGate,
	treeStateKey,
	GATE_NUDGE,
	MAX_CONTINUATIONS,
	PROCESS_SHAPE_MAX_FILES,
	type GateFailure,
	type GateLevel,
	type GatePolicy,
	type TurnEvidence,
} from "./index.ts";
import {
	checkAddedLines,
	contentToAdded,
	diffByLineSet,
	extractManifest,
	hashContent,
	makeClaimMatcher,
	parseDiffAdditions,
	DEFAULT_FORBIDDEN_MARKERS,
	MANIFEST_CLOSE,
	MANIFEST_JSON_KEYS,
	MANIFEST_OPEN,
} from "./predicates.js";
import * as ledger from "./ledger.js";
import { describeLevel, loadConfig, policyFor, saveConfig, LEVELS, RULE_FAMILY } from "./config.js";

// the self-check that used to run from `bun run index.ts` lives here. the
// runtime entry point ships without it, and the assertions stay identical.

const scratch: string[] = [];

function tempdir(prefix: string): string {
	const dir = mkdtempSync(resolvePath(tmpdir(), prefix));
	scratch.push(dir);
	return dir;
}

afterAll(() => {
	for (const dir of scratch.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// a synthetic absolute path. the rewrites compare strings, so no real script and
// no real home directory is involved.
const SCRIPT_PATH = "/opt/gate-checker/skills/git-pushing/scripts/smart_commit.sh";

// --- reference extraction ---------------------------------------------------

test("snapshot tag references are extracted and upper-cased", () => {
	const refs = extractSnapshotRefs("edited [foo.ts#A1B2] and [bar.py#C3D4]");
	expect(refs.length).toBe(2);
	expect(refs[0].tag).toBe("A1B2");
});

test("modification claims are extracted only for backticked file paths", () => {
	const mods = extractModClaims("I updated `src/foo.ts` and changed `lib/bar.py`");
	expect(mods.length).toBe(2);
	expect(mods[0]).toBe("src/foo.ts");

	const nonFile = extractModClaims("I replaced `var` with `let` and changed `MAX_RETRIES`");
	expect(nonFile.includes("var")).toBe(false);
	expect(nonFile.includes("MAX_RETRIES")).toBe(false);
	expect(extractModClaims("I updated `src/foo.ts` and `lib/bar.py`").includes("src/foo.ts")).toBe(true);
});

test("test-success claims are detected without false positives", () => {
	expect(claimsTestSuccess("all tests passed successfully")).toBe(true);
	expect(claimsTestSuccess("the test suite passes")).toBe(true);
	expect(claimsTestSuccess("the function returns a value")).toBe(false);
});

test("a test runner is recognised from the bash ledger", () => {
	const ev = freshEvidence();
	ev.bashCommands.push({ cmd: "npm test", isError: false });
	expect(ranTestRunner(ev)).toBe(true);
	ev.bashCommands.push({ cmd: "pytest -xvs", isError: false });
	expect(ranTestRunner(ev)).toBe(true);

	const noTest = freshEvidence();
	noTest.bashCommands.push({ cmd: "echo hello", isError: false });
	expect(ranTestRunner(noTest)).toBe(false);

	const bun = freshEvidence();
	bun.bashCommands.push({ cmd: "bun test", isError: false });
	expect(ranTestRunner(bun)).toBe(true);
	const node = freshEvidence();
	node.bashCommands.push({ cmd: "node --test", isError: false });
	expect(ranTestRunner(node)).toBe(true);
	const bunRun = freshEvidence();
	bunRun.bashCommands.push({ cmd: "bun run test", isError: false });
	expect(ranTestRunner(bunRun)).toBe(true);
});

// --- completion gate --------------------------------------------------------
const fixmeMarker = ["FIX", "ME: broken"].join("");
const passStubMarker = ["pass", "  # st", "ub"].join("");
const todoMarker = ["TODO:", " implement"].join("");
const slashStubMarker = ["// st", "ub"].join("");
const fixmeDetail = ['"fix', 'me:"'].join("");
const passDetail = ['"pass', '  # "'].join("");


test("real stubs in added lines are caught with their line number", () => {
	const hits = checkAddedLines(
		contentToAdded("f.py", `line1\n// ${fixmeMarker}\ndef foo():\n    ${passStubMarker}\n`),
		DEFAULT_FORBIDDEN_MARKERS,
	);
	expect(hits.some((h) => h.detail.includes(fixmeDetail))).toBe(true);
	expect(hits.some((h) => h.detail.includes(passDetail))).toBe(true);
	expect(hits.some((h) => h.detail.includes(fixmeDetail) && h.detail.includes("line 2"))).toBe(true);
});

test("legitimate code is never flagged as a stub", () => {
	const legitCode = [
		'test("stub server returns 200", () => {',
		"const stub = sinon.stub();",
		"const noop = () => {};",
		'const PLACEHOLDER_USER_ID = "user";',
	];
	for (const line of legitCode) {
		expect(checkAddedLines(contentToAdded("f.ts", line), DEFAULT_FORBIDDEN_MARKERS).length).toBe(0);
	}
});

test("markers match regardless of case", () => {
	expect(
		checkAddedLines(contentToAdded("a.py", `# ${todoMarker}\n`), DEFAULT_FORBIDDEN_MARKERS).length,
	).toBe(1);
});

test("the completion gate judges only added lines", () => {
	const diff = [
		"diff --git a/src/legacy.py b/src/legacy.py",
		"--- a/src/legacy.py",
		"+++ b/src/legacy.py",
		"@@ -3,0 +4,2 @@",
		"+def g():",
		"+    return 2",
	].join("\n");
	const added = new Map<string, Array<{ line: number; text: string }>>();
	parseDiffAdditions(diff, added);
	expect(added.size).toBe(1);
	expect(added.get("src/legacy.py")?.length ?? 0).toBe(2);
	expect(added.get("src/legacy.py")?.[0]?.line).toBe(4);
	expect(checkAddedLines(added, DEFAULT_FORBIDDEN_MARKERS).length).toBe(0);

	const withMarker = new Map<string, Array<{ line: number; text: string }>>();
	parseDiffAdditions(
		["--- a/src/new.py", "+++ b/src/new.py", "@@ -0,0 +1,1 @@", `+    # ${todoMarker} later`].join("\n"),
		withMarker,
	);
	expect(checkAddedLines(withMarker, DEFAULT_FORBIDDEN_MARKERS).length).toBe(1);
});

// --- citation gate ----------------------------------------------------------

test("a fabricated modification is flagged and a real one is not", () => {
	const failures = checkCitations(
		"I modified `src/fake.ts` and updated `src/real.ts`",
		[],
		new Set(["src/real.ts"]),
		freshEvidence(),
		true,
	);
	expect(
		failures.some((f) => f.rule === "fabricated_modification" && f.detail.includes("src/fake.ts")),
	).toBe(true);
	expect(failures.some((f) => f.detail.includes("src/real.ts"))).toBe(false);
});

test("non-file backtick tokens are never treated as claims", () => {
	const failures = checkCitations(
		"I replaced `var` with `let` and refactored `handleError`",
		[],
		new Set(),
		freshEvidence(),
		true,
	);
	expect(failures.some((f) => f.detail.includes("var"))).toBe(false);
	expect(failures.some((f) => f.detail.includes("handleError"))).toBe(false);
});

test("without git, modification claims are not adjudicated", () => {
	const failures = checkCitations("I modified `src/fake.ts`", [], new Set(), freshEvidence(), false);
	expect(failures.some((f) => f.rule === "fabricated_modification")).toBe(false);
});

test("a test claim needs a test run, and a real run grounds it", () => {
	expect(
		checkCitations("all tests passed", [], new Set(), freshEvidence(), true).some(
			(f) => f.rule === "fabricated_test_result",
		),
	).toBe(true);

	const real = freshEvidence();
	real.bashCommands.push({ cmd: "npm test", isError: false });
	expect(checkCitations("all tests passed", [], new Set(), real, true).length).toBe(0);
});

test("a passing verify run grounds a test claim", () => {
	const verified = freshEvidence();
	verified.verifyPassed = true;
	expect(checkCitations("all tests passed", [], new Set(), verified, true).length).toBe(0);
	expect(
		checkCitations("all tests passed", [], new Set(), freshEvidence(), true).some(
			(f) => f.rule === "fabricated_test_result",
		),
	).toBe(true);
});

test("subagent claims are checked against the diff", () => {
	const bad = checkCitations(
		"the reviewer subagent reported its findings",
		["I updated `src/fake.ts` and all tests passed"],
		new Set(["src/real.ts"]),
		freshEvidence(),
		true,
	);
	expect(bad.some((f) => f.rule === "subagent_fabricated_modification")).toBe(true);
	expect(bad.some((f) => f.rule === "subagent_unverified_test")).toBe(true);

	const okEvidence = freshEvidence();
	okEvidence.bashCommands.push({ cmd: "npm test", isError: false });
	const good = checkCitations(
		"the reviewer subagent reported its findings",
		["I updated `src/auth.ts` and all tests passed"],
		new Set(["src/auth.ts"]),
		okEvidence,
		true,
	);
	expect(good.some((f) => f.rule === "subagent_fabricated_modification")).toBe(false);
	expect(good.some((f) => f.rule === "subagent_unverified_test")).toBe(false);
});

test("a subagent report is judged only when the parent leans on it", () => {
	const noManifest = ["I reviewed it. Looks correct."];
	expect(
		checkCitations("i ran the tests myself and they pass", noManifest, new Set(), freshEvidence(), true).filter(
			(f) => f.rule.startsWith("subagent_"),
		).length,
	).toBe(0);
	expect(
		checkCitations("the reviewer confirmed it", noManifest, new Set(), freshEvidence(), true).some(
			(f) => f.rule === "subagent_missing_manifest",
		),
	).toBe(true);

	expect(reliesOnSubagents("all done")).toBe(false);
	expect(reliesOnSubagents("the subagent found a bug")).toBe(true);
	expect(reliesOnSubagents("per the review, it is correct")).toBe(true);
});

test("a retry reports only newly seen subagents", () => {
	const ev = freshEvidence();
	const parent = "the reviewer reported back";
	expect(checkCitations(parent, ["report one, no manifest"], new Set(), ev, true).length).toBe(1);
	expect(
		checkCitations(parent, ["report one, no manifest", "report two, no manifest"], new Set(), ev, true).length,
	).toBe(1);
	expect(
		checkCitations(parent, ["report one, no manifest", "report two, no manifest"], new Set(), ev, true).length,
	).toBe(0);
});

test("a missing manifest warns when corroborated and blocks when contradicted", () => {
	const warn = checkCitations(
		"the reviewer says it is correct",
		["looks correct to me"],
		new Set(),
		freshEvidence(),
		true,
	);
	expect(warn[0]?.severity).toBe("warn");

	const block = checkCitations(
		"the reviewer says it is correct",
		["I updated `src/ghost.ts` for you"],
		new Set(["src/real.ts"]),
		freshEvidence(),
		true,
	);
	expect(block.find((f) => f.rule === "subagent_missing_manifest")?.severity).toBe("block");
	expect(
		checkAddedLines(contentToAdded("a.ts", `${slashStubMarker}\n`), DEFAULT_FORBIDDEN_MARKERS)[0]?.severity,
	).toBeUndefined();
});

// --- claim matching ---------------------------------------------------------

test("claims resolve from the repository root and from a subdirectory cwd", () => {
	const changed = new Set(["src/sub/a.txt"]);
	expect(makeClaimMatcher(changed, "/repo", "/repo")("src/sub/a.txt")).toBe(true);
	const fromSub = makeClaimMatcher(changed, "/repo", "/repo/src");
	expect(fromSub("sub/a.txt")).toBe(true);
	expect(fromSub("src/sub/a.txt")).toBe(true);
	expect(fromSub("/repo/src/sub/a.txt")).toBe(true);
	expect(fromSub("other/z.txt")).toBe(false);
	expect(makeClaimMatcher(changed, null, "/x")("src/sub/a.txt")).toBe(true);
});

// --- subagent manifest ------------------------------------------------------

test("the literal manifest block parses, and absence is the failure", () => {
	const ok = extractManifest(`Did the work.\n${MANIFEST_OPEN}\nsrc/a.ts\n- \`src/b.ts\`\n${MANIFEST_CLOSE}\n`);
	expect(ok !== null && ok.length === 2).toBe(true);
	expect(ok?.[1]).toBe("src/b.ts");

	const empty = extractManifest(`Nothing to change.\n${MANIFEST_OPEN}\n${MANIFEST_CLOSE}`);
	expect(empty !== null && empty.length === 0).toBe(true);
	expect(extractManifest(`${MANIFEST_OPEN}\nnone\n${MANIFEST_CLOSE}`)?.length).toBe(0);
	expect(extractManifest("I updated some files.")).toBeNull();
	expect(extractManifest(`${MANIFEST_OPEN}\nsrc/a.ts`)).toBeNull();
});

test("manifest contents are checked against the diff", () => {
	const ev = freshEvidence();
	expect(
		checkCitations("per the review, done", ["I updated the relevant files."], new Set(), ev, true).some(
			(f) => f.rule === "subagent_missing_manifest",
		),
	).toBe(true);
	expect(
		checkCitations(
			"per the review, done",
			[`${MANIFEST_OPEN}\nsrc/ghost.ts\n${MANIFEST_CLOSE}`],
			new Set(["src/real.ts"]),
			ev,
			true,
		).some((f) => f.rule === "subagent_manifest_mismatch"),
	).toBe(true);
	expect(
		checkCitations(
			"per the review, done",
			[`${MANIFEST_OPEN}\nsrc/real.ts\n${MANIFEST_CLOSE}`],
			new Set(["src/real.ts"]),
			ev,
			true,
		).length,
	).toBe(0);
	expect(
		checkCitations(
			"done",
			[`Found it in the parser.\n${MANIFEST_OPEN}\n${MANIFEST_CLOSE}`],
			new Set(),
			ev,
			true,
		).length,
	).toBe(0);
});

test("a manifest is recoverable from a json subagent report", () => {
	expect(JSON.stringify(extractManifest('{"changed": ["src/a.ts"]}'))).toBe('["src/a.ts"]');
	expect(extractManifest('{"section": {"review": "ok", "changed": []}}')?.length).toBe(0);
	expect(extractManifest('{"changed": null}')?.length).toBe(0);
	for (const key of MANIFEST_JSON_KEYS) {
		expect(extractManifest(`{"${key}": ["src/a.ts"]}`)?.length).toBe(1);
	}
	expect(
		extractManifest(JSON.stringify({ verdict: "correct", manifest: `${MANIFEST_OPEN}\n${MANIFEST_CLOSE}` }))?.length,
	).toBe(0);
	expect(
		extractManifest(JSON.stringify({ manifest: `${MANIFEST_OPEN}\nsrc/a.ts\n${MANIFEST_CLOSE}` }))?.length,
	).toBe(1);
	expect(extractManifest('<output>\n{"changed": ["src/a.ts"]}\n</output>')?.length).toBe(1);
	expect(extractManifest('{"verdict": "correct", "notes": "looks fine"}')).toBeNull();
	expect(extractManifest(`report\n${MANIFEST_OPEN}\nsrc/a.ts\n${MANIFEST_CLOSE}`)?.length).toBe(1);
});

test("a non-path json value is not a manifest", () => {
	expect(extractManifest('{"changed": "yes"}')).toBeNull();
	expect(extractManifest('{"changed": "done reviewing"}')).toBeNull();
	expect(extractManifest('{"changed": "src/a.ts\\nsrc/b.ts"}')?.length).toBe(2);
	expect(extractManifest('{"changed": true}')).toBeNull();
});

// --- inline completion gate -------------------------------------------------

test("the inline gate judges exactly what one write or edit introduced", () => {
	const diff = ["@@ -10,0 +11,2 @@", "+def g():", `+    # ${todoMarker}`, ""].join("\n");
	const added = inlineAdditions("edit", "src/x.py", {}, { diff });
	expect(added?.has("src/x.py") ?? false).toBe(true);
	expect(checkAddedLines(added ?? new Map(), DEFAULT_FORBIDDEN_MARKERS).length).toBe(1);
	expect(
		checkAddedLines(added ?? new Map(), DEFAULT_FORBIDDEN_MARKERS)[0]?.detail.includes("line 12"),
	).toBe(true);

	const written = inlineAdditions("write", "src/y.ts", { content: `const a = 1;\n${slashStubMarker}\n` }, {});
	expect(checkAddedLines(written ?? new Map(), DEFAULT_FORBIDDEN_MARKERS).length).toBe(1);
	const clean = inlineAdditions("write", "src/z.ts", { content: "const a = 1;\n" }, {});
	expect(checkAddedLines(clean ?? new Map(), DEFAULT_FORBIDDEN_MARKERS).length).toBe(0);
	expect(inlineAdditions("write", "", {}, {})).toBeNull();
});

// --- no-git content hashing -------------------------------------------------

test("content hashing reproduces a diff when there is no repository", () => {
	const before = `def a():\n    # ${todoMarker}\n    pass\n`;
	const afterClean = `${before}\ndef b():\n    return 1\n`;
	expect(checkAddedLines(diffByLineSet("m.py", before, afterClean), DEFAULT_FORBIDDEN_MARKERS).length).toBe(0);
	expect(
		checkAddedLines(diffByLineSet("m.py", before, `${before}\n${slashStubMarker}\n`), DEFAULT_FORBIDDEN_MARKERS).length,
	).toBe(1);
	expect(
		checkAddedLines(
			diffByLineSet("m.py", before, `${before}${before.split("\n")[1]}\n`),
			DEFAULT_FORBIDDEN_MARKERS,
		).length,
	).toBe(1);
	expect(diffByLineSet("m.py", before, before).size).toBe(0);
	expect(hashContent("abc")).toBe(hashContent("abc"));
	expect(hashContent("abc")).not.toBe(hashContent("abd"));
});

// --- failure formatting and the subagent nudge ------------------------------

test("formatted failures carry the header and the detail", () => {
	const formatted = formatFailures([{ gate: "completion", rule: "forbidden_marker", detail: "test detail" }]);
	expect(formatted.includes("[GATE CHECKER")).toBe(true);
	expect(formatted.includes("test detail")).toBe(true);
});

test("the subagent nudge states the manifest, markers, and commit rules", () => {
	expect(GATE_NUDGE.length > 0).toBe(true);
	expect(GATE_NUDGE.includes("forbidden markers")).toBe(true);
	expect(GATE_NUDGE.includes("git-pushing")).toBe(true);
});

// --- commit routing ---------------------------------------------------------

test("a raw git commit is rewritten to the commit script", () => {
	const simple = rewriteGitCommit('git commit -m "feat: add auth"', SCRIPT_PATH);
	expect(simple).not.toBeNull();
	expect(simple?.includes("smart_commit.sh") ?? false).toBe(true);
	expect(simple?.includes("feat: add auth") ?? false).toBe(true);
	expect(simple?.includes("--no-push") ?? false).toBe(true);
});

// regression: a prior edit dropped `parts.push(scriptCall)`, so every rewrite
// returned "" and the falsy check in the tool_call handler silently disabled
// commit routing.
test("the rewrite is non-empty and actually invokes the script", () => {
	const rewritten = rewriteGitCommit('git commit -m "feat: x"', SCRIPT_PATH);
	expect((rewritten?.length ?? 0) > 0).toBe(true);
	expect(rewritten?.includes("smart_commit.sh") ?? false).toBe(true);
});

test("compound commit commands keep their surrounding work", () => {
	const withAdd = rewriteGitCommit('git add . && git commit -m "fix: bug"', SCRIPT_PATH);
	expect(withAdd !== null && withAdd.includes("smart_commit.sh")).toBe(true);
	expect(withAdd?.includes("git add")).toBe(false);
	expect(withAdd?.includes("fix: bug") ?? false).toBe(true);

	const withTrailing = rewriteGitCommit('git commit -m "test: add tests" && npm run build', SCRIPT_PATH);
	expect(withTrailing?.includes("npm run build") ?? false).toBe(true);
	expect(withTrailing?.includes("smart_commit.sh") ?? false).toBe(true);
});

test("commit messages survive quoting, apostrophes, and semicolons", () => {
	expect(
		rewriteGitCommit("git commit -m 'docs: update readme'", SCRIPT_PATH)?.includes("docs: update readme") ?? false,
	).toBe(true);

	const apostrophe = rewriteGitCommit('git commit -m "fix: handle user\'s input"', SCRIPT_PATH);
	expect(apostrophe !== null && apostrophe.includes("--no-push")).toBe(true);

	const semicolons = rewriteGitCommit('git commit -m "fix: handle a; b; c"', SCRIPT_PATH);
	expect(semicolons?.includes("handle a; b; c") ?? false).toBe(true);
	expect(!semicolons?.includes('c"') || semicolons?.includes("handle a; b; c")).toBe(true);
});

test("a message-less commit lets the script generate one", () => {
	const result = rewriteGitCommit("git commit", SCRIPT_PATH);
	expect(result !== null && result.includes("smart_commit.sh")).toBe(true);
	expect(result).toBe(`bash '${SCRIPT_PATH}' --no-push`);
});

test("commands that are not a real git commit are left alone", () => {
	expect(rewriteGitCommit("npm test", SCRIPT_PATH)).toBeNull();
	expect(rewriteGitCommit("git status", SCRIPT_PATH)).toBeNull();
	expect(rewriteGitCommit("git commit-tree HEAD", SCRIPT_PATH)).toBeNull();
	expect(rewriteGitCommit('git commit --amend -m "fix"', SCRIPT_PATH)).toBeNull();
	expect(rewriteGitCommit('echo "git commit"', SCRIPT_PATH)).toBeNull();
	expect(rewriteGitCommit('grep "git commit" log.txt', SCRIPT_PATH)).toBeNull();
	expect(rewriteGitCommit('sed "s/git commit/x/g"', SCRIPT_PATH)).toBeNull();
});

test("a direct commit-script invocation is normalised", () => {
	const relative = rewriteSmartCommit("bash skills/git-pushing/scripts/smart_commit.sh", SCRIPT_PATH);
	expect(relative?.includes(`'${SCRIPT_PATH}'`) ?? false).toBe(true);
	expect(relative?.endsWith("--no-push") ?? false).toBe(true);

	const withMessage = rewriteSmartCommit('bash ./smart_commit.sh "feat: x"', SCRIPT_PATH);
	expect(withMessage?.includes('"feat: x"') ?? false).toBe(true);

	expect((rewriteSmartCommit(`bash ${SCRIPT_PATH} "m" --no-push`, SCRIPT_PATH) ?? "").split("--no-push").length <= 2).toBe(true);
	expect(rewriteSmartCommit(`bash '${SCRIPT_PATH}' 'm' --no-push`, SCRIPT_PATH)).toBeNull();
	expect(rewriteSmartCommit("ls -la", SCRIPT_PATH)).toBeNull();
	expect(rewriteSmartCommit("bash my_smart_commit.sh", SCRIPT_PATH)).toBeNull();
	expect(rewriteSmartCommit("bash ./scripts/smart_commit.sh", SCRIPT_PATH)?.includes(SCRIPT_PATH) ?? false).toBe(true);
});

// --- delivery gates against a real repository -------------------------------

test("the commit gate reads a real working tree", () => {
	const repo = tempdir("gate-delivery-");
	const git = (c: string) => execSync(c, { cwd: repo, encoding: "utf-8", stdio: "pipe" });
	git("git init -q .");
	git("git config user.email t@t.t && git config user.name t");
	writeFileSync(resolvePath(repo, "a.txt"), "one\n");
	git("git add -A && git commit -q -m init");

	expect(runCommitGate(repo)).toBeNull();
	writeFileSync(resolvePath(repo, "a.txt"), "two\n");
	expect(runCommitGate(repo)?.rule).toBe("uncommitted_changes");
	git("git checkout -- a.txt");
	writeFileSync(resolvePath(repo, "scratch.log"), "noise\n");
	expect(runCommitGate(repo)).toBeNull();
});

test("the verify gate reports the failing command output", () => {
	const repo = tempdir("gate-verify-");
	expect(runVerifyGate(repo, "true")).toBeNull();
	const failure = runVerifyGate(repo, "echo boom >&2; exit 1");
	expect(failure?.rule).toBe("verify_failed");
	expect(failure?.detail.includes("boom") ?? false).toBe(true);
});

test("the verify cache key moves whenever the tree moves", () => {
	const repo = tempdir("gate-treekey-");
	const git = (c: string) => execSync(c, { cwd: repo, encoding: "utf-8", stdio: "pipe" });
	git("git init -q .");
	git("git config user.email t@t.t && git config user.name t");
	writeFileSync(resolvePath(repo, "a.txt"), "one\n");
	git("git add -A && git commit -q -m init");

	const none = new Map<string, string | null>();
	const first = treeStateKey(repo, true, none);
	expect(treeStateKey(repo, true, none)).toBe(first);
	writeFileSync(resolvePath(repo, "a.txt"), "three\n");
	expect(treeStateKey(repo, true, none)).not.toBe(first);

	const second = treeStateKey(repo, true, none);
	writeFileSync(resolvePath(repo, "fixture.json"), "{}\n");
	expect(treeStateKey(repo, true, none)).not.toBe(second);

	const touched = new Map<string, string | null>([["a.txt", null]]);
	const noGit = treeStateKey(repo, false, touched);
	expect(treeStateKey(repo, false, touched)).toBe(noGit);
	writeFileSync(resolvePath(repo, "a.txt"), "four\n");
	expect(treeStateKey(repo, false, touched)).not.toBe(noGit);
	expect(treeStateKey(repo, false, none)).not.toBe(treeStateKey(repo, false, none));
});

// --- "a process should have run" detector -----------------------------------

test("the process-shape detector reports matches and near misses", () => {
	const evidenceFor = (cmds: string[]): TurnEvidence => {
		const e = freshEvidence();
		e.bashCommands = cmds.map((cmd) => ({ cmd, isError: false }));
		return e;
	};
	const withTests = evidenceFor(["bun test"]);
	const noTests = evidenceFor(["ls -la"]);

	expect(processShape(withTests, 3).matched).toBe(true);
	expect(processShape(withTests, 0).reason).toBe("no-changes");
	expect(processShape(withTests, PROCESS_SHAPE_MAX_FILES + 1).reason).toBe("too-broad");
	expect(processShape(withTests, PROCESS_SHAPE_MAX_FILES).matched).toBe(true);
	expect(processShape(noTests, 3).reason).toBe("no-test-run");

	const failedTests = freshEvidence();
	failedTests.bashCommands = [{ cmd: "bun test", isError: true }];
	expect(processShape(failedTests, 3).reason).toBe("no-test-run");
	expect(processShape(withTests, 5).changed).toBe(5);
	expect(processShape(withTests, 1).reason).toBeNull();
});

test("the ledger aggregates process-shape records", () => {
	const summary = ledger.summarize([
		{ event: "process_shape", matched: true, reason: null },
		{ event: "process_shape", matched: false, reason: "no-changes" },
		{ event: "process_shape", matched: false, reason: "no-changes" },
		{ event: "process_shape", matched: false, reason: "too-broad" },
	]);
	expect(summary.shapeRequests).toBe(4);
	expect(summary.shapeMatched).toBe(1);
	expect(summary.shapeMatchRate).toBe(0.25);
	expect(summary.shapeMissBy["no-changes"]).toBe(2);
	expect(ledger.summarize([]).shapeMatchRate).toBe(0);
});

// --- the engagement dial ----------------------------------------------------

test("the level is read from the config file, then the env, then the default", () => {
	const cfg = resolvePath(tempdir("gate-cfg-"), "config.json");
	expect(loadConfig({}, cfg).level).toBe("medium");
	expect(loadConfig({ OMP_GATES_LEVEL: "low" }, cfg).level).toBe("low");
	expect(loadConfig({ OMP_GATES_LEVEL: "paranoid" }, cfg).level).toBe("medium");
	expect(loadConfig({ OMP_DELIVERY_GATES: "1" }, cfg).level).toBe("high");
	expect(loadConfig({ OMP_DELIVERY_GATES: "0" }, cfg).level).toBe("medium");
	expect(loadConfig({}, cfg).verifyCmd).toBeNull();
	expect(loadConfig({ OMP_VERIFY_CMD: "bun test" }, cfg).verifyCmd).toBe("bun test");
});

test("the dial re-grades every rule family per level", () => {
	const failure = (rule: string, severity?: "block" | "warn"): GateFailure => ({
		gate: "citation",
		rule,
		detail: rule,
		...(severity ? { severity } : {}),
	});
	const all = [
		failure("forbidden_marker"),
		failure("fabricated_modification"),
		failure("ungrounded_snapshot_tag"),
		failure("subagent_missing_manifest", "warn"),
		failure("subagent_fabricated_modification"),
		failure("verify_failed"),
		failure("uncommitted_changes"),
	];
	const grade = (level: GateLevel) =>
		new Map(applyPolicy(all, policyFor(level) as GatePolicy).map((x) => [x.rule, x.severity ?? "block"]));

	expect(applyPolicy(all, policyFor("off") as GatePolicy).length).toBe(0);
	expect(policyFor("off").inline).toBe(false);

	const low = grade("low");
	expect([...low.values()].every((v) => v === "warn")).toBe(true);
	expect(low.get("forbidden_marker")).toBe("warn");
	expect(low.has("uncommitted_changes")).toBe(false);
	expect(low.has("subagent_missing_manifest")).toBe(false);
	expect(policyFor("low").inline).toBe(true);

	const medium = grade("medium");
	expect(medium.get("forbidden_marker")).toBe("block");
	expect(medium.get("fabricated_modification")).toBe("block");
	expect(medium.get("verify_failed")).toBe("block");
	expect(medium.has("uncommitted_changes")).toBe(false);
	expect(medium.get("subagent_missing_manifest")).toBe("warn");

	const high = grade("high");
	expect([...high.values()].every((v) => v === "block")).toBe(true);
	expect(high.get("uncommitted_changes")).toBe("block");
	expect(high.get("subagent_missing_manifest")).toBe("block");

	expect(applyPolicy([failure("brand_new_rule")], policyFor("low") as GatePolicy).length).toBe(1);
	expect(
		applyPolicy(
			[{ gate: "citation", rule: "future_rule", detail: "x", severity: "warn" }],
			policyFor("high") as GatePolicy,
		)[0]?.severity,
	).toBe("warn");
});

// --- every emitted rule reaches the dial ------------------------------------

// read the rule ids out of the source that emits them, so a rule added later
// cannot slip past the dial by having no policy entry. a hand-written list here
// would pass while the real gate blocked at a level that promises not to.
const RUNTIME_INTEGRITY_RULES = ["mutation_lease_conflict", "recovery_required", "scope_unavailable"];

function emittedRuleIds(): { graded: string[]; advisory: string[] } {
	const graded = new Set<string>();
	for (const file of ["index.ts", "predicates.js"]) {
		const source = readFileSync(resolvePath(import.meta.dir, file), "utf8");
		for (const [, id] of source.matchAll(/\brule:\s*"([a-z_]+)"/g)) graded.add(id);
	}
	const advisory = new Set<string>();
	const risks = readFileSync(resolvePath(import.meta.dir, "risks.js"), "utf8");
	for (const [, id] of risks.matchAll(/"(risk\.[a-z_]+)"/g)) advisory.add(id);
	return { graded: [...graded].sort(), advisory: [...advisory].sort() };
}

const asEmitted = (rule: string): GateFailure => ({ gate: "journal", rule, detail: rule });

test("the rule enumeration actually finds the emitted rules", () => {
	const { graded, advisory } = emittedRuleIds();
	// guards the regexes: an enumeration that matched nothing would make every
	// test below pass vacuously.
	expect(graded.length).toBeGreaterThanOrEqual(13);
	expect(advisory.length).toBeGreaterThanOrEqual(10);
	for (const rule of RUNTIME_INTEGRITY_RULES) expect(graded).toContain(rule);
	expect(graded).toContain("forbidden_marker");
	expect(advisory).toContain("risk.destructive_operation");
});

test("every emitted rule has a policy family", () => {
	for (const rule of emittedRuleIds().graded) {
		expect(RULE_FAMILY[rule]).toBeDefined();
	}
});

test("no emitted rule blocks at low", () => {
	for (const rule of emittedRuleIds().graded) {
		const graded = applyPolicy([asEmitted(rule)], policyFor("low") as GatePolicy);
		expect(graded.every((f) => (f.severity ?? "block") !== "block")).toBe(true);
	}
});

test("every emitted rule is dropped at off", () => {
	for (const rule of emittedRuleIds().graded) {
		expect(applyPolicy([asEmitted(rule)], policyFor("off") as GatePolicy).length).toBe(0);
	}
});

test("runtime integrity failures block at medium and high", () => {
	for (const rule of RUNTIME_INTEGRITY_RULES) {
		for (const level of ["medium", "high"] as GateLevel[]) {
			const graded = applyPolicy([asEmitted(rule)], policyFor(level) as GatePolicy);
			expect(graded.length).toBe(1);
			expect(graded[0].severity ?? "block").toBe("block");
		}
	}
});

test("advisory risk findings stay advisory at every enabled level", () => {
	for (const rule of emittedRuleIds().advisory) {
		for (const level of ["low", "medium", "high"] as GateLevel[]) {
			const emitted: GateFailure = { gate: "risk", rule, detail: rule, severity: "warn" };
			const graded = applyPolicy([emitted], policyFor(level) as GatePolicy);
			expect(graded.length).toBe(1);
			expect(graded[0].severity).toBe("warn");
		}
	}
});

test("runaway protection is never on the dial", () => {
	expect(MAX_CONTINUATIONS).toBe(3);
	for (const level of LEVELS) {
		expect(policyFor(level) !== undefined && MAX_CONTINUATIONS === 3).toBe(true);
	}
});

test("the level round-trips through a real config file", () => {
	const cfg = resolvePath(tempdir("gate-roundtrip-"), "config.json");
	expect(saveConfig("high", "bun test", cfg).ok).toBe(true);
	const back = loadConfig({}, cfg);
	expect(back.level).toBe("high");
	expect(back.verifyCmd).toBe("bun test");
	expect(loadConfig({ OMP_GATES_LEVEL: "low" }, cfg).level).toBe("high");
	saveConfig("off", undefined, cfg);
	expect(loadConfig({}, cfg).level).toBe("off");
});

test("the level description names what actually changes", () => {
	expect(describeLevel("high", "bun test").includes("HIGH")).toBe(true);
	expect(describeLevel("high", null).includes("high expects a verify command")).toBe(true);
	expect(describeLevel("off", null).includes("gates: OFF")).toBe(true);
});
