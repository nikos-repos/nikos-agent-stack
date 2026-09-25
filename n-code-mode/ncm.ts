#!/usr/bin/env bun
// ncm: the n-code-mode contract checker and ceiling ledger.
//
// it reads @cc blocks out of comment text in any language and out of CONTRACTS files,
// then checks grammar, labels, required ceiling endings, and id uniqueness. it never
// parses a syntax tree and never judges prose; the review skill does the judging.

// @cc [label:architecture] stdlib-only
// ncm.ts imports node builtins only. a runtime dependency MUST NOT be added to the checker.
// deletes: an install step, a lockfile entry, and a supply-chain read for the checker.

// @cc [label:architecture] deep-module
// ncm.ts is the whole checker. it exports scan, runcli, and version with their result types; every other function stays private. a new check goes inside parsefile or scan, never into a new module or a new export.
// deletes: a module split, the imports and re-exports between the pieces, and callers or tests pinned to internals.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";

export const version = "0.1.0";

// the directive grammar is code-contracts' own: `@cc [key:value,...] id`, tokens without
// whitespace, commas, colons, or brackets. metadata is optional; the id is not.
const token = String.raw`[^\s,:\[\]]+`;
const directivepattern = new RegExp(`^@cc +(?:\\[(${token}:${token}(?:,${token}:${token})*)\\] +)?(${token})$`, "u");
const directivestart = /^@cc\b/u;
const linemarker = /^\s*(?:\/\/+|#+|--)\s?/u;
const blockopener = /^\s*(\/\*+|"""|'''|<!--)\s?/u;
const blockdecoration = /^\s*\*+(?!\/)\s?/u;
const closers: Record<string, string> = { '"""': '"""', "'''": "'''", "<!--": "-->" };
const knownlabels = { product: true, security: true, architecture: true, ceiling: true } as const;
type label = keyof typeof knownlabels;

export interface contract {
	file: string;
	line: number;
	id: string;
	label: label | null;
	prose: string[];
	trailer: string | null;
}
export interface finding {
	file: string;
	line: number;
	message: string;
}
export interface scanresult {
	contracts: contract[];
	findings: finding[];
	files: number;
}

// one entry per source line: the comment text on that line, or null when the line is code.
// CONTRACTS files are all content, so every line is text.
function commenttext(source: string, everyline: boolean): Array<string | null> {
	const out: Array<string | null> = [];
	let closer: string | null = null;
	for (const raw of source.split("\n")) {
		if (everyline) {
			out.push(raw.trim());
			continue;
		}
		if (closer) {
			const end = raw.indexOf(closer);
			if (end >= 0) closer = null;
			out.push((end < 0 ? raw : raw.slice(0, end)).replace(blockdecoration, "").trim());
			continue;
		}
		const open = blockopener.exec(raw);
		if (open) {
			const want = open[1].startsWith("/*") ? "*/" : closers[open[1]];
			const rest = raw.slice(open[0].length);
			const end = rest.indexOf(want);
			if (end < 0) closer = want;
			out.push((end < 0 ? rest : rest.slice(0, end)).trim());
			continue;
		}
		const line = linemarker.exec(raw);
		out.push(line ? raw.slice(line[0].length).trim() : null);
	}
	return out;
}

function parsefile(file: string, source: string): Pick<scanresult, "contracts" | "findings"> {
	const iscontracts = basename(file) === "CONTRACTS";
	const lines = commenttext(source.replaceAll("\r\n", "\n"), iscontracts);
	const contracts: contract[] = [];
	const findings: finding[] = [];
	const seen = new Map<string, number>();

	for (let i = 0; i < lines.length; i++) {
		const text = lines[i];
		if (text === null || !directivestart.test(text)) continue;
		const line = i + 1;
		const match = directivepattern.exec(text);
		if (!match) {
			findings.push({ file, line, message: "invalid @cc directive" });
			continue;
		}
		const [, metadata = "", id] = match;
		const labels = metadata
			.split(",")
			.filter(Boolean)
			.map((attribute) => attribute.split(":"))
			.filter(([key]) => key === "label")
			.map(([, value]) => value);

		// prose runs until the comment ends, a blank comment line, or the next directive.
		// inside CONTRACTS a blank line is allowed; only the next directive or the end stops it.
		const prose: string[] = [];
		let j = i + 1;
		for (; j < lines.length; j++) {
			const next = lines[j];
			if (next === null || directivestart.test(next) || (next === "" && !iscontracts)) break;
			prose.push(next);
		}
		while (prose.length && prose[prose.length - 1] === "") prose.pop();
		i = j - 1;

		const label = labels.length === 1 && Object.hasOwn(knownlabels, labels[0]) ? (labels[0] as label) : null;
		const want = label === "ceiling" ? "until:" : null;
		const last = prose[prose.length - 1] ?? "";
		const trailer = want && last.startsWith(want) ? last.slice(want.length).trim() || null : null;
		contracts.push({ file, line, id, label, prose, trailer });

		if (!label) findings.push({ file, line, message: `contract ${id}: label must be product, security, architecture, or ceiling` });
		if (!prose.length) findings.push({ file, line, message: `contract ${id}: no prose body` });
		else if (want && !trailer) findings.push({ file, line, message: `${label} ${id}: needs a ${want} trailer as its last line` });
		const first = seen.get(id);
		if (first === undefined) seen.set(id, line);
		else findings.push({ file, line, message: `duplicate id ${id} (first at line ${first})` });
	}
	return { contracts, findings };
}

function git(args: string[], cwd: string): string {
	return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
}

function repository(target: string): { start: string; root: string; isDirectory: boolean } {
	const start = resolve(target);
	if (!existsSync(start)) throw new Error(`no such path: ${target}`);
	const isDirectory = statSync(start).isDirectory();
	const cwd = isDirectory ? start : dirname(start);
	let root: string;
	try {
		root = git(["rev-parse", "--show-toplevel"], cwd).trim();
	} catch {
		throw new Error(`ncm needs a git repository; ${target} is not inside one`);
	}
	return { start, root, isDirectory };
}

// text files under pathspec that mention @cc: tracked plus untracked-and-not-ignored, the way a
// review sees the tree. git does the sniffing, skips binaries, and never enters a nested repository.
function candidates(root: string, pathspec: string): string[] {
	try {
		return git(["grep", "-I", "-l", "-z", "--untracked", "-e", "@cc", "--", pathspec], root).split("\0").filter(Boolean);
	} catch (cause) {
		if ((cause as { status?: number }).status === 1) return [];
		throw cause;
	}
}

// markdown is documentation: examples in it are not declarations.
// @cc [label:product] repo-relative-paths
// every finding and contract path is relative to the repository root, whatever path was passed.
// @cc [label:product] sorted-findings
// findings are sorted by file, then line.
// @cc [label:product] scoped-duplicates
// a scan whose path holds a CONTRACTS file still checks its ids against every CONTRACTS file
// in the repository, and reports each collision on the in-scope side.
export function scan(target = "."): scanresult {
	const { start, root } = repository(target);
	const pathspec = relative(root, start) || ".";

	const result: scanresult = { contracts: [], findings: [], files: 0 };
	const scoped = new Map<string, contract[]>();
	for (const file of candidates(root, pathspec)) {
		const extension = extname(file).toLowerCase();
		if (extension === ".md" || extension === ".markdown") continue;
		const parsed = parsefile(file, readFileSync(resolve(root, file), "utf8"));
		if (!parsed.contracts.length && !parsed.findings.length) continue;
		result.files += 1;
		result.contracts.push(...parsed.contracts);
		result.findings.push(...parsed.findings);
		if (basename(file) === "CONTRACTS") scoped.set(file, parsed.contracts);
	}

	// CONTRACTS ids are citable across the repository, so they are unique across every CONTRACTS file,
	// in scope or not. a scope holding a CONTRACTS file walks the tree again to find the others, and
	// each duplicate is reported on its in-scope side.
	const everyfile = pathspec === "." || !scoped.size ? [...scoped.keys()] : candidates(root, ":(glob)**/CONTRACTS");
	const firsts = new Map<string, contract>();
	for (const file of everyfile) {
		for (const item of scoped.get(file) ?? parsefile(file, readFileSync(resolve(root, file), "utf8")).contracts) {
			const first = firsts.get(item.id);
			if (!first) firsts.set(item.id, item);
			else if (first.file !== item.file && (scoped.has(first.file) || scoped.has(item.file))) {
				const [at, other] = scoped.has(item.file) ? [item, first] : [first, item];
				result.findings.push({ file: at.file, line: at.line, message: `duplicate id ${item.id} across CONTRACTS files (also at ${other.file}:${other.line})` });
			}
		}
	}
	result.findings.sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
	return result;
}

// @cc [label:product] list-scope
// for a file, list every CONTRACTS file from the repository root through its directory,
// then its own blocks (except markdown); a CONTRACTS path counts once. for a directory,
// list only CONTRACTS files through that directory. do not follow calls.
function list(targets: readonly string[]): contract[] {
	const byLocation = new Map<string, contract>();
	for (const target of targets) {
		const { start, root, isDirectory } = repository(target);
		const relativeDirectory = relative(root, isDirectory ? start : dirname(start));
		const parts = relativeDirectory ? relativeDirectory.split(sep) : [];
		let directory = root;
		for (let i = 0; i <= parts.length; i++) {
			if (i) directory = resolve(directory, parts[i - 1]);
			const path = resolve(directory, "CONTRACTS");
			if (!existsSync(path)) continue;
			for (const item of parsefile(relative(root, path), readFileSync(path, "utf8")).contracts) {
				byLocation.set(`${item.file}:${item.line}`, item);
			}
		}
		if (!isDirectory && basename(start) !== "CONTRACTS") {
			const extension = extname(start).toLowerCase();
			if (extension === ".md" || extension === ".markdown") continue;
			for (const item of parsefile(relative(root, start), readFileSync(start, "utf8")).contracts) {
				byLocation.set(`${item.file}:${item.line}`, item);
			}
		}
	}
	return [...byLocation.values()].sort((a, b) => (a.file === b.file ? a.line - b.line : a.file < b.file ? -1 : 1));
}

const usage = `ncm commands:
  check [path]    validate every @cc block under path (default: the current directory)
  list <path>...  list contracts governing each path (one or more paths required)
  ledger [path]   list every ceiling under path with its until: condition

paths print relative to the repository root.
exit codes: 0 clean, 1 findings, 2 usage or environment error
global flags: --help --version`;

export function runcli(args: readonly string[], write: (text: string) => void = console.log, error: (text: string) => void = console.error): number {
	if (args.includes("--help")) {
		write(usage);
		return 0;
	}
	if (args.includes("--version")) {
		write(`ncm ${version}`);
		return 0;
	}
	const [command, ...paths] = args;
	if ((command !== "check" && command !== "list" && command !== "ledger") || (command === "list" ? !paths.length : paths.length > 1)) {
		error(usage);
		return 2;
	}
	let result: scanresult;
	try {
		if (command === "list") {
			const contracts = list(paths);
			for (const item of contracts) write(`${item.file}:${item.line}\t${item.label ?? "-"}\t${item.id}\t${item.prose.filter(Boolean).join(" ")}`);
			write(`ncm: ${contracts.length} contracts apply to ${paths.length} paths`);
			return 0;
		}
		result = scan(paths[0] ?? ".");
	} catch (cause) {
		error(`ncm: ${cause instanceof Error ? cause.message : String(cause)}`);
		return 2;
	}
	if (command === "ledger") {
		const ceilings = result.contracts.filter((item) => item.label === "ceiling");
		for (const item of ceilings) write(`${item.file}:${item.line}\t${item.id}\tuntil: ${item.trailer ?? "(missing)"}`);
		write(`ncm: ${ceilings.length} ceilings in ${new Set(ceilings.map((item) => item.file)).size} files`);
		return 0;
	}
	for (const item of result.findings) write(`${item.file}:${item.line}: ${item.message}`);
	if (result.findings.length) {
		write(`ncm: ${result.findings.length} findings in ${new Set(result.findings.map((item) => item.file)).size} files`);
		return 1;
	}
	const ceilings = result.contracts.filter((item) => item.label === "ceiling").length;
	write(`ncm: clean. ${result.contracts.length} contracts in ${result.files} files (${ceilings} ceilings)`);
	return 0;
}

if (import.meta.main) process.exitCode = runcli(process.argv.slice(2));
