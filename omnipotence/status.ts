import { basename } from "node:path";
import type { effectrecord, runrecord } from "./store.ts";

// the one fact a returning user needs from the status line: whose turn is it.
const runstates: Record<string, string> = {
	waiting_for_user: "your turn",
	blocked: "blocked",
	halted: "paused",
	completed: "done",
	failed: "failed",
};

function runlabel(run: runrecord): string {
	const input = run.input;
	if (input && typeof input === "object" && !Array.isArray(input)) {
		const root = Reflect.get(input, "projectRoot");
		if (typeof root === "string" && root.length > 0) return basename(root);
	}
	return run.processid;
}

function runphase(effects: readonly effectrecord[] | undefined): string | null {
	for (const effect of effects ?? []) {
		if (effect.status !== "requested") continue;
		const match = /^phase\/([a-z0-9-]+)\//u.exec(effect.key);
		if (match) return match[1] as string;
	}
	return null;
}

export function runsentence(run: runrecord, effects?: readonly effectrecord[]): string {
	const phase = runphase(effects);
	const state = runstates[run.status] ?? "working";
	return [runlabel(run), phase, state].filter(Boolean).join(" · ");
}
