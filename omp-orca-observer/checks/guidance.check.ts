import assert from "node:assert/strict";
import type { BeforeAgentStartEventResult, ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { registerGuidance } from "../guidance.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => unknown;
type RestoredMessage = {
  type: "custom_message";
  customType: string;
  content: string;
  display: boolean;
};

function harness(kind: "main" | "sub" = "main") {
  const state = {
    active: true,
    file: "session-a.jsonl" as string | undefined,
    branch: [] as RestoredMessage[],
    branchReads: 0,
  };
  const handlers = new Map<string, Handler>();
  const ctx = {
    agent: { kind, id: kind === "main" ? "Main" : "Child", name: kind, depth: 0 },
    sessionManager: {
      getSessionFile: () => state.file,
      getBranch: () => {
        state.branchReads++;
        return state.branch;
      },
    },
  } as unknown as ExtensionContext;
  const pi = {
    on(event: string, handler: Handler) {
      assert.equal(handlers.has(event), false, `duplicate ${event} handler`);
      handlers.set(event, handler);
    },
  } as unknown as ExtensionAPI;
  registerGuidance(pi, () => state.active);
  return {
    state,
    handlers,
    ctx,
    async emit<R = void>(event: { type: string;[key: string]: unknown }, context: ExtensionContext = ctx): Promise<R | undefined> {
      const handler = handlers.get(event.type);
      assert.ok(handler, `missing ${event.type} handler`);
      return await handler(event, context) as R | undefined;
    },
  };
}

const before = { type: "before_agent_start", prompt: "continue", systemPrompt: [] };
const api = harness();
const missingAgent = { ...api.ctx, agent: undefined } as unknown as ExtensionContext;
await api.emit({ type: "session_start" }, missingAgent);
assert.equal(await api.emit({ type: "message_start", message: { role: "custom", customType: "nikos-agent-stack.omp-orca-observer.guidance", content: "guidance" } }, missingAgent), undefined);
assert.equal(await api.emit(before, missingAgent), undefined);
assert.ok((await api.emit<BeforeAgentStartEventResult>(before))?.message, "missing agent does not affect a later main session");
assert.equal(api.handlers.has("context"), false, "guidance must not register a context handler");
await api.emit({ type: "session_start" });
assert.equal(api.state.branchReads, 1, "restored history is scanned at session start");

const first = await api.emit<BeforeAgentStartEventResult>(before);
assert.ok(first?.message, "main sessions receive guidance");
assert.ok(typeof first.message === "object", "guidance uses a structured custom message");
assert.ok(typeof first.message.customType === "string", "guidance has a dedicated custom type");
assert.equal(first.message.display, false, "guidance stays out of the visible transcript");
assert.equal("systemPrompt" in first, false, "guidance does not rewrite policy");
assert.equal("attribution" in first.message, false, "host supplies the default attribution");
const retried = await api.emit<BeforeAgentStartEventResult>(before);
assert.deepEqual(retried, first, "uncommitted preparation can be retried or resumed after cancellation");
assert.equal(api.state.branchReads, 1, "preparation never scans history");

await api.emit({
  type: "message_start",
  message: { role: "custom", customType: "another-extension.guidance", content: "unrelated", display: false, timestamp: 0 },
});
assert.deepEqual(await api.emit<BeforeAgentStartEventResult>(before), first, "other custom messages do not commit guidance");
await api.emit({ type: "message_start", message: { role: "custom", ...first.message, timestamp: 0 } });
assert.equal(await api.emit(before), undefined, "accepted guidance is not returned again");

api.state.file = "session-b.jsonl";
assert.deepEqual(await api.emit<BeforeAgentStartEventResult>(before), first, "a different session file receives guidance");
api.state.file = "session-a.jsonl";
assert.equal(await api.emit(before), undefined, "returning to a delivered session does not reinject guidance");

assert.ok(typeof first.message.content === "string", "guidance is one text paragraph");
const text = first.message.content;
const restored = harness();
restored.state.branch = [
  { type: "custom_message", customType: "another-extension.guidance", content: "unrelated", display: false },
  { type: "custom_message", customType: first.message.customType, content: text, display: false },
];
await restored.emit({ type: "session_start" });
assert.equal(await restored.emit(before), undefined, "a resumed branch with guidance must not receive it again");
assert.equal(restored.state.branchReads, 1, "restored branch is scanned once, not per preparation");
const switched = harness();
switched.state.branch = [{ type: "custom_message", customType: first.message.customType, content: text, display: false }];
await switched.emit({ type: "session_switch", reason: "resume", previousSessionFile: "session-a.jsonl" });
assert.equal(await switched.emit(before), undefined, "a resumed session switch scans the restored branch");
const branched = harness();
branched.state.branch = [{ type: "custom_message", customType: first.message.customType, content: text, display: false }];
await branched.emit({ type: "session_branch", previousSessionFile: "session-a.jsonl" });
assert.equal(await branched.emit(before), undefined, "a session branch scans the restored branch");
restored.state.file = "session-c.jsonl";
restored.state.branch = [{ type: "custom_message", customType: "another-extension.guidance", content: "unrelated", display: false }];
await restored.emit({ type: "session_start" });
assert.deepEqual(await restored.emit<BeforeAgentStartEventResult>(before), first, "unrelated restored messages do not suppress guidance");

const sub = harness("sub");
await sub.emit({ type: "session_start" });
assert.equal(await sub.emit(before), undefined, "even depth-zero subagents never receive guidance");
assert.equal(sub.state.branchReads, 0, "subagents do not scan history for main-session guidance");

const disabled = harness();
disabled.state.active = false;
assert.equal(await disabled.emit(before), undefined, "inactive observer does not inject guidance");
disabled.state.active = true;
assert.ok((await disabled.emit<BeforeAgentStartEventResult>(before))?.message, "inactive preparation does not mark delivery");
disabled.state.active = false;
assert.equal(await disabled.emit(before), undefined, "teardown disables already registered hooks");

assert.match(text, /native\s+task\s+to\s+create\s+subagents/i);
assert.match(text, /Orca\s+orchestration,\s+handoffs,\s+or\s+agent\s+launches.*only.*user\s+explicitly\s+asks/i);
assert.match(text, /never\s+resume\s+an\s+omp\s+child.*Orca's\s+session\s+history.*while\s+its\s+parent\s+session\s+is\s+live/i);
assert.match(text, /bridge\s+needs\s+no\s+agent\s+action/i);
assert.match(text, /never\s+handle\s+observer\s+credentials/i);
assert.ok(text.trim().split(/\s+/).length < 90, "routing paragraph stays below 90 words");
