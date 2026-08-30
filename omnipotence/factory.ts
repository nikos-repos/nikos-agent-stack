import { existsSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const factoryprocessid = "factory.new-project";

// ponytail: ordered by how strongly the name promises a plan; single-markdown fallback below.
const planfilenames = ["final-plan.md", "plan.md", "spec.md", "requirements.md"];

export interface factoryrequest {
	projectroot: string;
	entry: { kind: string; value?: string };
}

function directoryentries(root: string): string[] {
	try {
		return readdirSync(root);
	} catch {
		return [];
	}
}

function findplanfile(root: string): string | null {
	for (const name of planfilenames) {
		const candidate = join(root, name);
		if (existsSync(candidate)) return candidate;
	}
	const markdown = directoryentries(root).filter((name) => name.toLowerCase().endsWith(".md"));
	return markdown.length === 1 ? join(root, markdown[0] as string) : null;
}

function pathkind(target: string): "directory" | "file" | null {
	try {
		const stats = statSync(target);
		return stats.isDirectory() ? "directory" : stats.isFile() ? "file" : null;
	} catch {
		return null;
	}
}

// resolves what a user meant from what is already on disk. returns null only when there is
// genuinely nothing to go on, so the caller can ask for an idea instead of failing.
export function factoryrequestfor(cwd: string, target: string): factoryrequest | null {
	const trimmed = target.trim();
	// `~` only expands as a whole segment prefix; a literal leading tilde elsewhere is a real name.
	const home = trimmed === "~" ? homedir() : trimmed.startsWith("~/") ? join(homedir(), trimmed.slice(2)) : trimmed;
	const candidate = trimmed ? resolve(cwd, home) : "";
	const kind = candidate ? pathkind(candidate) : null;
	// an unmistakable path prefix means the user meant a place, not an idea. this has to settle
	// before any cwd fallback: resuming whatever project happens to sit in cwd would swallow the
	// typo silently, which is the exact outcome naming a path is supposed to rule out.
	if (trimmed && kind === null && /^(?:[~/]|\.\.?\/)/u.test(trimmed)) {
		throw new Error(
			`no such path: ${candidate}. use a folder that exists, or /factory <your idea> to describe the project.`,
		);
	}
	if (kind === "file") {
		return { projectroot: dirname(candidate), entry: { kind: "spec", value: candidate } };
	}
	const projectroot = kind === "directory" ? candidate : cwd;
	if (existsSync(join(projectroot, ".factory", "state.json"))) {
		return { projectroot, entry: { kind: "resume" } };
	}
	const plan = findplanfile(projectroot);
	if (plan) return { projectroot, entry: { kind: "spec", value: plan } };
	if (trimmed && kind === null) return { projectroot, entry: { kind: "rough-idea", value: trimmed } };
	return null;
}

export function factoryflags(args: unknown): { preview: boolean; fresh: boolean; target: string } {
	let text = String(args ?? "").replace(/[\r\n]+/gu, " ").trim();
	const preview = /(^|\s)--preview(\s|$)/u.test(text);
	const fresh = /(^|\s)--fresh(\s|$)/u.test(text);
	text = text.replace(/(^|\s)--(?:preview|fresh)(?=\s|$)/gu, " ").trim();
	return { preview, fresh, target: text };
}
