import { describe, expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { budget, runcli, scan, version } from "./ncm.ts";

const here = dirname(fileURLToPath(import.meta.url));
const ncm = resolve(here, "ncm.ts");

// fixture lines are quoted one by one so this file never declares a contract itself.
function fixture(): string {
	const root = mkdtempSync(resolve(tmpdir(), "ncm-"));
	execFileSync("git", ["init", "-q", root]);
	const write = (path: string, lines: string[]) => {
		mkdirSync(dirname(resolve(root, path)), { recursive: true });
		writeFileSync(resolve(root, path), lines.join("\n") + "\n");
	};
	write("CONTRACTS", [
		"@cc [label:rule] validated-input",
		"stages receive validated pages and MUST NOT re-check required fields.",
		"",
		"deletes: the per-stage None guards.",
		"",
		"@cc [owner:niko,label:rule] git-scoped",
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
		" * @cc [label:rule] trusted-caller",
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
		"@cc [label:rule] twice",
		"second.",
		"deletes: b.",
		"",
		"@cc [label:rule] bad id here",
		"spaces in the id.",
		"",
		"@cc [label:rule] no-prose",
		"@cc [label:ceiling] no-trailer",
		"a ceiling with no until line.",
	]);
	write("many/CONTRACTS", Array.from({ length: budget + 1 }, (_, i) => `@cc [label:rule] r${i}\nprose.\ndeletes: x${i}.\n`));
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
			const rule = result.contracts.find((item) => item.id === "validated-input");
			expect(rule?.trailer).toBe("the per-stage None guards.");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("reports grammar, label, trailer, duplicate id, and budget findings", () => {
		const root = fixture();
		try {
			const messages = scan(root).findings.map((item) => `${item.file}:${item.line}: ${item.message}`);
			expect(messages).toEqual([
				"bad/CONTRACTS:1: contract no-label: label must be rule or ceiling",
				"bad/CONTRACTS:9: duplicate id twice (first at line 5)",
				"bad/CONTRACTS:13: invalid @cc directive",
				"bad/CONTRACTS:16: contract no-prose: no prose body",
				"bad/CONTRACTS:17: ceiling no-trailer: needs a until: trailer as its last line",
				`many/CONTRACTS:1: CONTRACTS holds ${budget + 1} contracts; the budget is ${budget}`,
				"src/c.cs:1: ceiling single-series: needs a until: trailer as its last line",
			]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("the cli checks, lists the ledger, and refuses a directory outside git", () => {
		const root = fixture();
		const plain = mkdtempSync(resolve(tmpdir(), "ncm-plain-"));
		try {
			const check = spawnSync("bun", [ncm, "check", root], { encoding: "utf8" });
			expect(check.status).toBe(1);
			expect(check.stdout).toContain("src/c.cs:1: ceiling single-series");
			expect(check.stdout.trim().split("\n").pop()).toBe("ncm: 7 findings in 3 files");

			const ledger = spawnSync("bun", [ncm, "ledger", resolve(root, "src")], { encoding: "utf8" });
			expect(ledger.status).toBe(0);
			expect(ledger.stdout).toContain("src/a.py:3\tall-pairs\tuntil: more than 5000 blocks; then banded lsh.");
			expect(ledger.stdout).toContain("src/c.cs:1\tsingle-series\tuntil: (missing)");
			expect(ledger.stdout.trim().split("\n").pop()).toBe("ncm: 3 ceilings in 3 files");

			const outside = spawnSync("bun", [ncm, "check", plain], { encoding: "utf8" });
			expect(outside.status).toBe(2);
			expect(outside.stderr).toContain("ncm needs a git repository");

			const lines: string[] = [];
			expect(runcli(["--version"], (text) => lines.push(text))).toBe(0);
			expect(lines).toEqual([`ncm ${version}`]);
			expect(runcli(["nope"], () => {}, () => {})).toBe(2);
		} finally {
			rmSync(root, { recursive: true, force: true });
			rmSync(plain, { recursive: true, force: true });
		}
	});
});
