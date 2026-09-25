import { existsSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { runcli } from "./ncm.ts";

const doctrine = readFileSync(new URL("./doctrine.md", import.meta.url), "utf8").trimEnd();
const surfaced = new Set<string>();

export default function nCodeMode(pi: ExtensionAPI): void {
	pi.on("before_agent_start", ({ systemPrompt }) => ({
		systemPrompt: [...systemPrompt, doctrine],
	}));

	pi.registerTool({
		name: "ncm",
		label: "ncm",
		approval: "read",
		description: "check @cc contracts (check [path]), list contracts applying to files (list <path>...), or list ceilings (ledger [path]).",
		parameters: pi.zod.object({
			command: pi.zod.enum(["check", "list", "ledger"]),
			paths: pi.zod.array(pi.zod.string()).optional(),
		}),
		execute: async (_toolCallId, { command, paths }: { command: "check" | "list" | "ledger"; paths?: string[] }, _signal, _onUpdate, context) => {
			const lines: string[] = [];
			const requested = paths?.length ? paths : command === "list" ? [] : [context.cwd];
			const targets = requested.map((path) => resolve(context.cwd, path));
			const collect = (text: string) => { lines.push(text); };
			const code = runcli([command, ...targets], collect, collect);
			return { content: [{ type: "text", text: lines.join("\n") }], isError: code === 2 };
		},
	});

	const reset = () => surfaced.clear();
	pi.on("session_start", reset);
	pi.on("session_switch", reset);
	pi.on("session_branch", reset);

	// @cc [label:product] edit-notice
	// after a successful edit or write, append ncm findings and, once per session per file,
	// its governing contracts. append nothing when both are empty; ignore files outside git.
	pi.on("tool_result", (event, context) => {
		if (event.isError || (event.toolName !== "edit" && event.toolName !== "write")) return;
		const details = event.toolName === "edit"
			? (event.details as { path?: string; perFileResults?: Array<{ path: string; isError?: boolean }> } | undefined)
			: undefined;
		const files = new Set<string>();
		if (event.toolName === "edit" && details?.perFileResults?.length) {
			for (const item of details.perFileResults) {
				if (!item.isError && item.path) files.add(resolve(context.cwd, item.path));
			}
		} else {
			const path = event.toolName === "write" ? event.input.path : details?.path ?? event.input.path;
			if (typeof path === "string" && path) files.add(resolve(context.cwd, path));
		}
		const findings: string[] = [];
		const notices: string[] = [];
		for (const file of files) {
			if (!existsSync(file)) continue;
			const checkLines: string[] = [];
			const status = runcli(["check", file], (text) => { checkLines.push(text); }, () => { });
			if (status === 2) continue;
			if (status === 1) findings.push(...checkLines.slice(0, -1));
			if (surfaced.has(file)) continue;
			const listLines: string[] = [];
			if (runcli(["list", file], (text) => { listLines.push(text); }, () => { }) !== 0) continue;
			surfaced.add(file);
			if (listLines.length > 1) notices.push(`contracts that govern ${relative(context.cwd, file) || "."}:\n${listLines.slice(0, -1).join("\n")}`);
		}
		if (findings.length) notices.unshift(`findings:\n${findings.join("\n")}`);
		if (!notices.length) return;
		return { content: [...event.content, { type: "text", text: `\n[n-code-mode]\n${notices.join("\n")}` }] };
	});
}
