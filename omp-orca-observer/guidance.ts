import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const guidanceCustomType = "nikos-agent-stack.omp-orca-observer.guidance";
const guidance = "Use native task to create subagents; Orca orchestration, handoffs, or agent launches happen only when the user explicitly asks for them. Never resume an omp child from Orca's session history while its parent session is live. The bridge needs no agent action, and you never handle observer credentials.";

/**
 * @cc [label:product] observer-guidance-committed-delivery
 * Main sessions receive guidance once per session file, only while active.
 * Preparation may be retried or cancelled; only an accepted message or restored
 * branch proves delivery. Registered hooks remain harmless after teardown.
 */
export function registerGuidance(pi: ExtensionAPI, active: () => boolean): void {
  const delivered = new Set<string | undefined>();

  pi.on("before_agent_start", (_event, ctx) => {
    if (!active() || ctx.agent.kind !== "main" || delivered.has(ctx.sessionManager.getSessionFile())) return;
    return {
      message: {
        customType: guidanceCustomType,
        content: guidance,
        display: false,
      },
    };
  });

  pi.on("message_start", (event, ctx) => {
    if (ctx.agent.kind === "main" && event.message.role === "custom" && event.message.customType === guidanceCustomType) {
      delivered.add(ctx.sessionManager.getSessionFile());
    }
  });

  const scanRestoredBranch = (_event: unknown, ctx: ExtensionContext) => {
    if (ctx.agent.kind !== "main") return;
    if (ctx.sessionManager.getBranch().some((entry) => entry.type === "custom_message" && entry.customType === guidanceCustomType)) {
      delivered.add(ctx.sessionManager.getSessionFile());
    }
  };
  pi.on("session_start", scanRestoredBranch);
  pi.on("session_switch", scanRestoredBranch);
  pi.on("session_branch", scanRestoredBranch);
}
