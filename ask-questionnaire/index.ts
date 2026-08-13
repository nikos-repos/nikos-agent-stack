// ============================================================================
// ask-questionnaire — forces one batched questionnaire before any other action
// when the user starts a new project.
// ============================================================================
// omp already ships the native ask tool as its interactive questionnaire ui
// and transport. this extension only gates the agent loop around it:
//   1. detect a direct new-project request from user input
//   2. inject concise questionnaire guidance before the model call
//   3. block every non-ask tool while the questionnaire is pending
//   4. clear the pending request only after a successful (non-error) ask result
//   5. request one continuation turn at session stop if still unanswered
//
// it uses only documented public extension events (input, before_agent_start,
// tool_call, tool_result, session_stop, session lifecycle). no omp core
// patches, no private imports, no re-implementation of the ask ui or transport.
// ============================================================================

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

// --- the detector, reproduced verbatim from the omp new-project prompt guard
//
// matches direct requests that start a new api, application, cli, codebase,
// dashboard, extension, library, package, plugin, project, repository,
// service, site, tool, or website.
const newProjectPrompt =
	/\b(?:bootstrap|build|create|develop|initialize|make|scaffold|set\s+up|start)\s+(?:(?:me|us)\s+)?(?:(?:a|an|my|our)\s+)?(?:brand[- ]new\s+|new\s+)?(?:[\p{L}\p{N}.+#-]+\s+){0,3}(?:api|app(?:lication)?|cli|codebase|dashboard|extension|library|package|plugin|project|repo(?:sitory)?|service|site|tool|website)\b/iu;

// exported for tests and reuse. true when text is a direct new-project request.
export function initiatesNewProject(text: string): boolean {
	return newProjectPrompt.test(text);
}

// concise guidance injected before the model call and reused as the
// session-stop continuation context. mirrors the omp instruction wording so
// the agent sees one batched questionnaire as the first project action.
const guidance =
	"this request starts a new project. call the ask tool now with one batched questionnaire before planning, editing, or using another tool.";

const guidanceCustomType = "nikos-agent-stack.ask-questionnaire.guidance";

// --- event shapes (documented public payloads only) -------------------------

interface InputEvent {
	type: "input";
	text: string;
	source: "interactive" | "rpc" | "extension";
}

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

interface SessionStopEvent {
	type: "session_stop";
	stop_hook_active: boolean;
}

interface SessionStopResult {
	continue?: boolean;
	additionalContext?: string;
}

// --- extension factory ------------------------------------------------------

export default function askQuestionnaire(pi: ExtensionAPI): void {
	// a detected direct new-project request is pending until a successful ask
	// result clears it. reset on every session start/switch/branch so a stale
	// request never survives a context change.
	let pending = false;

	const reset = (): void => {
		pending = false;
	};

	// detect only direct user input. extension-originated prompts (steers,
	// follow-ups, injected messages) carry source "extension" and must not arm
	// the workflow.
	//
	// arming also requires the ask tool to be active. a pending request clears
	// only on a successful ask result, so arming without ask reachable would
	// block every tool for the rest of the session.
	pi.on("input", (event: InputEvent) => {
		if (event.source === "extension") return;
		if (!pi.getActiveTools().includes("ask")) return;
		if (initiatesNewProject(event.text)) pending = true;
	});

	// inject the questionnaire guidance before the model call while pending.
	// display:false keeps it out of the tui transcript while still entering the
	// model context.
	pi.on("before_agent_start", (_event: BeforeAgentStartEvent): BeforeAgentStartResult | void => {
		if (!pending) return;
		return {
			message: {
				customType: guidanceCustomType,
				content: guidance,
				display: false,
			},
		};
	});

	// while pending, allow only ask and block every other tool. the returned
	// reason steers the model back toward the questionnaire.
	pi.on("tool_call", (event: ToolCallEvent): ToolCallResult | void => {
		if (!pending) return;
		if (event.toolName === "ask") return;
		return { block: true, reason: guidance };
	});

	// clear only after a successful ask result. a failed ask keeps the request
	// pending so the agent retries the questionnaire on its next turn.
	pi.on("tool_result", (event: ToolResultEvent) => {
		if (!pending) return;
		if (event.toolName === "ask" && !event.isError) pending = false;
	});

	// if the request is still unanswered at session stop, request one
	// continuation turn that re-injects the guidance. the runtime caps the
	// continuation chain; a satisfied ask clears pending and ends the chain.
	pi.on("session_stop", (_event: SessionStopEvent): SessionStopResult | void => {
		if (!pending) return;
		return { continue: true, additionalContext: guidance };
	});

	// reset pending state for session start/switch/branch.
	pi.on("session_start", reset);
	pi.on("session_switch", reset);
	pi.on("session_branch", reset);
}
