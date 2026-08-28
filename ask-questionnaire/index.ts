// ============================================================================
// ask-questionnaire — forces one batched questionnaire before any other action
// when a phase declares that the work needs an interview.
// ============================================================================
// omp already ships the native ask tool as its interactive questionnaire ui
// and transport. this extension only gates the agent loop around it:
//   1. accept an explicit questionnaire_open declaration
//   2. inject the declaring phase's reason before the model call
//   3. block every tool outside read-only tools, ask, and declaration retries
//   4. clear the pending request only after a successful (non-error) ask result
//   5. expose one continuation decision for gate-checker to evaluate
//
// it uses only documented public extension events (before_agent_start,
// tool_call, tool_result, and session lifecycle). no omp core patches, no
// private imports, no re-implementation of the ask ui or transport.
// ============================================================================

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { installQuestionnaireStop } from "./stop-decision.ts";

export { questionnaireStop } from "./stop-decision.ts";

const guidanceCustomType = "nikos-agent-stack.ask-questionnaire.guidance";

// This is an allowlist rather than a mutating blocklist: newly added tools
// default to blocked while an interview is pending.
const QUESTIONNAIRE_READ_TOOLS = new Set([
	"read",
	"grep",
	"glob",
	"lsp",
	"ast_grep",
	"inspect_image",
	"ask",
	"questionnaire_open",
]);

// --- event shapes (documented public payloads only) -------------------------

interface BeforeAgentStartEvent {
	type: "before_agent_start";
	prompt: string;
}

interface BeforeAgentStartResult {
	message?: {
		customType: string;
		content: string;
		display?: boolean;
	};
}

interface ToolCallEvent {
	toolName: string;
	toolCallId: string;
	input: Record<string, unknown>;
}

interface ToolCallResult {
	block?: boolean;
	reason?: string;
}

interface ToolResultEvent {
	toolName: string;
	toolCallId: string;
	isError: boolean;
}

// --- extension factory ------------------------------------------------------

export default function askQuestionnaire(pi: ExtensionAPI): void {
	let pending: { owner: string; reason: string } | null = null;

	const reset = (): void => {
		pending = null;
	};

	pi.registerTool({
		name: "questionnaire_open",
		label: "open questionnaire",
		description: "declare that this phase needs a batched questionnaire before it proceeds.",
		approval: "write",
		parameters: pi.zod.object({
			owner: pi.zod.string().describe("skill or phase declaring it, e.g. \"factory-discovery\""),
			reason: pi.zod.string().describe("what the interview must settle before work starts"),
		}),
		execute: async (
			_toolCallId: string,
			params: Record<string, unknown>,
			_signal: AbortSignal | undefined,
			_onUpdate: unknown,
			_context: unknown,
		): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
			const owner = String(params.owner);
			if (pending) {
				if (pending.owner !== owner)
					return { isError: true, content: [{ type: "text", text: "questionnaire already open for " + pending.owner }] };
				return { content: [{ type: "text", text: "already open" }] };
			}
			pending = { owner, reason: String(params.reason) };
			return { content: [{ type: "text", text: "questionnaire armed by " + owner }] };
		},
	});

	installQuestionnaireStop(async () => {
		if (!pending) return undefined;
		return { continue: true, additionalContext: pending.reason };
	});

	// inject the questionnaire guidance before the model call while pending.
	// display:false keeps it out of the tui transcript while still entering the
	// model context.
	pi.on("before_agent_start", (_event: BeforeAgentStartEvent): BeforeAgentStartResult | void => {
		if (!pending) return;
		return {
			message: {
				customType: guidanceCustomType,
				content: pending.reason,
				display: false,
			},
		};
	});

	// while pending, allow read-only tools, ask, and questionnaire_open retries.
	// every other tool is blocked with the declaring reason.
	pi.on("tool_call", (event: ToolCallEvent): ToolCallResult | void => {
		if (!pending) return;
		if (QUESTIONNAIRE_READ_TOOLS.has(event.toolName)) return;
		return { block: true, reason: pending.reason };
	});

	// clear only after a successful ask result. a failed ask keeps the request
	// pending so the agent retries the questionnaire on its next turn.
	pi.on("tool_result", (event: ToolResultEvent) => {
		if (!pending) return;
		if (event.toolName === "ask" && !event.isError) pending = null;
	});

	// reset pending state for session start/switch/branch.
	pi.on("session_start", reset);
	pi.on("session_switch", reset);
	pi.on("session_branch", reset);
}
