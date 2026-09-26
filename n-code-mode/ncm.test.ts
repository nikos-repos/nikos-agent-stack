import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runcli, scan, version } from "./ncm.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ncm = resolve(here, "ncm.ts");

// fixture lines are quoted one by one so ncm does not parse them as this file's contracts.
// @cc [label:architecture] one-fixture
// ncm.test.ts builds one git repository with fixture() and drives it through scan, runcli, and the Claude Stop hook script. a new case is lines in that fixture plus its expected finding in the existing list. no mocks, no second fixture builder, no test block per check.
// deletes: per-case fixture builders, fs and git mocks, and a test block or file per check.
function fixture(): string {
	const root = mkdtempSync(resolve(tmpdir(), "ncm-"));
	execFileSync("git", ["init", "-q", root]);
	const write = (path: string, lines: string[]) => {
		mkdirSync(dirname(resolve(root, path)), { recursive: true });
		writeFileSync(resolve(root, path), lines.join("\n") + "\n");
	};
	write("CONTRACTS", [
		"@cc [label:product] validated-input",
		"stages receive validated pages and MUST NOT re-check required fields.",
		"",
		"deletes: the per-stage None guards.",
		"",
		"@cc [owner:niko,label:architecture] git-scoped",
		"file discovery is git ls-files.",
		"deletes: skip-lists for build output.",
	]);
	write("src/a.py", [
		"import sys",
		"",
		"# @cc [label:ceiling] all-pairs",
		"# all pairs over block ids.",
		"# until: more than 5000 blocks; then banded lsh.",
		"def dedup(blocks): ...",
	]);
	write("src/b.ts", [
		"/**",
		" * @cc [label:product] trusted-caller",
		" * callers pass validated input.",
		" * deletes: guards in every caller.",
		" */",
		"export function run() {}",
	]);
	write("src/c.cs", [
		"// @cc [label:ceiling] single-series",
		"// assumes BarsArray[0] only.",
		"protected override void OnBarUpdate() {}",
	]);
	write("src/d.html", [
		"<!-- @cc [label:ceiling] fake-submit",
		"the demo status fakes success.",
		"until: a backend exists. -->",
		"<form></form>",
	]);
	write("bad/CONTRACTS", [
		"@cc [owner:niko] no-label",
		"has an owner but no label.",
		"deletes: nothing.",
		"",
		"@cc [label:rule] twice",
		"first.",
		"deletes: a.",
		"",
		"@cc [label:architecture] twice",
		"second.",
		"deletes: b.",
		"",
		"@cc [label:architecture] bad id here",
		"spaces in the id.",
		"",
		"@cc [label:architecture] no-prose",
		"@cc [label:ceiling] no-trailer",
		"a ceiling with no until line.",
		"",
		"@cc [label:toString] proto",
		"prose.",
		"deletes: x.",
		"",
		"@cc[label:product] nospace",
	]);
	write("sub/CONTRACTS", ["@cc [label:architecture] git-scoped", "repeated from the root.", "deletes: nothing new."]);
	write("docs/notes.md", ["# @cc [label:ceiling] doc-example", "# until: never; this is documentation."]);
	writeFileSync(resolve(root, "img.png"), Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x40, 0x63, 0x63, 0x20]));
	// a nested repository is another project: git lists it as one directory entry and ncm skips it.
	execFileSync("git", ["init", "-q", resolve(root, "nested")]);
	write("nested/x.py", ["# @cc [label:ceiling] nested-example", "# no trailer, and out of scope."]);
	return root;
}

describe("n-code-mode checker", () => {
	test("reads @cc blocks out of any comment style and out of CONTRACTS", () => {
		const root = fixture();
		try {
			const result = scan(root);
			const ids = result.contracts.map((item) => item.id);
			expect(ids).toContain("validated-input");
			expect(ids).toContain("git-scoped");
			expect(ids).toContain("all-pairs");
			expect(ids).toContain("trusted-caller");
			expect(ids).toContain("fake-submit");
			expect(ids).not.toContain("doc-example");
			expect(ids).not.toContain("nested-example");
			const ceiling = result.contracts.find((item) => item.id === "fake-submit");
			expect(ceiling?.trailer).toBe("a backend exists.");
			const product = result.contracts.find((item) => item.id === "validated-input");
			expect(product?.trailer).toBeNull();
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("reports grammar, label, trailer, and duplicate id findings", () => {
		const root = fixture();
		try {
			const show = (target: string) => scan(target).findings.map((item) => `${item.file}:${item.line}: ${item.message}`);
			const messages = show(root);
			expect(messages).toEqual([
				"bad/CONTRACTS:1: contract no-label: label must be product, security, architecture, or ceiling",
				"bad/CONTRACTS:5: contract twice: label must be product, security, architecture, or ceiling",
				"bad/CONTRACTS:9: duplicate id twice (first at line 5)",
				"bad/CONTRACTS:13: invalid @cc directive",
				"bad/CONTRACTS:16: contract no-prose: no prose body",
				"bad/CONTRACTS:17: ceiling no-trailer: needs a until: trailer as its last line",
				"bad/CONTRACTS:20: contract proto: label must be product, security, architecture, or ceiling",
				"bad/CONTRACTS:24: invalid @cc directive",
				"src/c.cs:1: ceiling single-series: needs a until: trailer as its last line",
				"sub/CONTRACTS:1: duplicate id git-scoped across CONTRACTS files (also at CONTRACTS:6)",
			]);
			// a scoped scan still sees the CONTRACTS it collides with, and reports on its own side.
			expect(show(resolve(root, "sub"))).toEqual(["sub/CONTRACTS:1: duplicate id git-scoped across CONTRACTS files (also at CONTRACTS:6)"]);
			expect(show(resolve(root, "CONTRACTS"))).toEqual(["CONTRACTS:6: duplicate id git-scoped across CONTRACTS files (also at sub/CONTRACTS:1)"]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("the cli checks, lists contracts and ceilings, and refuses a directory outside git", () => {
		const root = fixture();
		const plain = mkdtempSync(resolve(tmpdir(), "ncm-plain-"));
		try {
			const check = spawnSync("bun", [ncm, "check", root], { encoding: "utf8" });
			expect(check.status).toBe(1);
			expect(check.stdout).toContain("src/c.cs:1: ceiling single-series");
			expect(check.stdout.trim().split("\n").pop()).toBe("ncm: 10 findings in 3 files");

			const ledger = spawnSync("bun", [ncm, "ledger", resolve(root, "src")], { encoding: "utf8" });
			expect(ledger.status).toBe(0);
			expect(ledger.stdout).toContain("src/a.py:3\tall-pairs\tuntil: more than 5000 blocks; then banded lsh.");
			expect(ledger.stdout).toContain("src/c.cs:1\tsingle-series\tuntil: (missing)");
			expect(ledger.stdout.trim().split("\n").pop()).toBe("ncm: 3 ceilings in 3 files");

			const list = spawnSync("bun", [ncm, "list", resolve(root, "src/a.py"), resolve(root, "src/b.ts")], { encoding: "utf8" });
			expect(list.status).toBe(0);
			expect(list.stdout.trimEnd().split("\n")).toEqual([
				"CONTRACTS:1\tproduct\tvalidated-input\tstages receive validated pages and MUST NOT re-check required fields. deletes: the per-stage None guards.",
				"CONTRACTS:6\tarchitecture\tgit-scoped\tfile discovery is git ls-files. deletes: skip-lists for build output.",
				"src/a.py:3\tceiling\tall-pairs\tall pairs over block ids. until: more than 5000 blocks; then banded lsh.",
				"src/b.ts:2\tproduct\ttrusted-caller\tcallers pass validated input. deletes: guards in every caller.",
				"ncm: 4 contracts apply to 2 paths",
			]);
			const mixed: string[] = [];
			expect(runcli(["list", resolve(root, "src/a.py"), resolve(root, "nested/x.py")], () => { }, (text) => { mixed.push(text); })).toBe(2);
			expect(mixed.join("\n")).toContain("list paths must share one repository");

			const outside = spawnSync("bun", [ncm, "check", plain], { encoding: "utf8" });
			expect(outside.status).toBe(2);
			expect(outside.stderr).toContain("ncm needs a git repository");

			const stopHook = resolve(here, "hooks/stop.ts");
			const blocked = spawnSync("bun", [stopHook], { encoding: "utf8", input: JSON.stringify({ cwd: root }) });
			expect(blocked.status).toBe(2);
			expect(blocked.stderr).toContain("src/c.cs:1: ceiling single-series");

			const continuing = spawnSync("bun", [stopHook], { encoding: "utf8", input: JSON.stringify({ cwd: root, stop_hook_active: true }) });
			expect(continuing.status).toBe(0);

			const notGit = spawnSync("bun", [stopHook], { encoding: "utf8", input: JSON.stringify({ cwd: plain }) });
			expect(notGit.status).toBe(0);

			const lines: string[] = [];
			expect(runcli(["--version"], (text) => lines.push(text))).toBe(0);
			expect(lines).toEqual([`ncm ${version}`]);
			expect(runcli(["nope"], () => { }, () => { })).toBe(2);
			expect(runcli(["list"], () => { }, () => { })).toBe(2);
		} finally {
			rmSync(root, { recursive: true, force: true });
			rmSync(plain, { recursive: true, force: true });
		}
	});

	test("the package dogfoods its own contracts and pins one version", () => {
		const manifest = JSON.parse(readFileSync(resolve(here, ".claude-plugin/plugin.json"), "utf8"));
		expect(manifest.version).toBe(version);
		const own = scan(here);
		expect(own.findings).toEqual([]);
		expect(own.contracts.length).toBeGreaterThan(0);
	});
});
