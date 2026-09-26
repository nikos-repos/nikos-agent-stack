import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { scan, type finding } from "../ncm.ts";

// @cc [label:product] stop-gate
// exits 2 with ncm findings in files changed from HEAD (tracked or untracked-unignored),
// so Claude keeps working; exits 0 when none, outside git, or continuing from a stop hook.
// each changed file is checked on its own, so a collision an edited CONTRACTS file causes
// is reported on that file.
let input: { cwd?: string; stop_hook_active?: boolean } = {};
try {
	input = JSON.parse(readFileSync(0, "utf8"));
} catch {
	// Invalid hook input cannot request another block.
}
if (input?.stop_hook_active === true) process.exit(0);

const cwd = input?.cwd || process.env.CLAUDE_PROJECT_DIR || process.cwd();
let root: string;
try {
	root = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd, encoding: "utf8" }).trim();
} catch {
	process.exit(0);
}

// @cc [label:ceiling] uncommitted-scope
// files committed during the turn escape this check.
// until: the hook gets a turn-start baseline, then diff against it.
const changed = new Set<string>();
for (const args of [
	["diff", "--name-only", "-z", "HEAD"],
	["ls-files", "--others", "--exclude-standard", "-z"],
]) {
	try {
		for (const file of execFileSync("git", args, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).split("\0")) {
			const path = resolve(root, file);
			// a nested repository lists as a directory: it is another project.
			if (file && existsSync(path) && statSync(path).isFile()) changed.add(file);
		}
	} catch {
		// A failed Git query contributes no changed files.
	}
}
if (!changed.size) process.exit(0);

const findings: finding[] = [];
try {
	for (const file of changed) findings.push(...scan(resolve(root, file)).findings);
} catch {
	process.exit(0);
}
if (!findings.length) process.exit(0);

console.error("ncm found contract problems in changed files:");
for (const { file, line, message } of findings) console.error(`${file}:${line}: ${message}`);
console.error("fix the code or the contract, then finish.");
process.exit(2);
