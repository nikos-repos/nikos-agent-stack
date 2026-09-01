// end-to-end probe: does the delivery gate actually fire from session_stop?
// unit checks cover the predicates; this covers the WIRING.
//
// note: every mutation happens BETWEEN agent_start and session_stop. a file
// dirtied before agent_start lands in baselineDirty and is subtracted from the
// diff by design, which is not the scenario under test.
import { execSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync, symlinkSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";
import { acquirelease, inspectlease, releaselease } from "./lease.js";

const home = mkdtempSync(resolve(tmpdir(), "probe-home-"));
process.env.OMP_GATE_LEDGER = resolve(home, "ledger.jsonl"); // keep the real tuning data untouched
process.env.OMP_GATE_FRUSTRATIONS = resolve(home, "frustrations.jsonl"); // keep the real scratchpad untouched
// isolate the dial too: a real /gates-engage config must not change what this
// check measures, and this check must not overwrite the real one
process.env.OMP_GATE_CONFIG = resolve(home, "config.json");
// delivery gates stay enabled while operation cases control the mutation lease
// explicitly so each case owns its bracket and cleanup.
process.env.OMP_DELIVERY_GATES = "1";
process.env.OMP_GATE_MUTATION_LEASE = "off";
const probeVerifyCmd = "test -f verified.txt";
process.env.OMP_VERIFY_CMD = probeVerifyCmd;

const writeProbeConfig = (level: string, verifyCmd?: string) => {
  const config: { level: string; verifyCmd?: string } = { level };
  if (verifyCmd) config.verifyCmd = verifyCmd;
  writeFileSync(
    process.env.OMP_GATE_CONFIG!,
    JSON.stringify(config, null, 2) + "\n",
  );
};

const gateChecker = (await import("./index.ts")).default;
const askQuestionnaire = (await import("../ask-questionnaire/index.ts")).default;
const { resetQuestionnaireStop } = await import("../ask-questionnaire/stop-decision.ts");

const repo = mkdtempSync(resolve(tmpdir(), "probe-repo-"));
const git = (c: string) => execSync(c, { cwd: repo, encoding: "utf-8", stdio: "pipe" });
git("git init -q .");
git("git config user.email t@t.t && git config user.name t");
execSync("mkdir -p src", { cwd: repo });
writeFileSync(resolve(repo, "src/a.txt"), "one\n");
git("git add -A && git commit -q -m init");

type H = (e: unknown, c: unknown) => unknown;
type Cmd = (args: string, c: unknown) => Promise<void>;
type RegisteredTool = {
  name: string;
  label?: string;
  description?: string;
  parameters?: unknown;
  approval?: string;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal: unknown,
    onUpdate: unknown,
    context: unknown,
  ) => Promise<unknown>;
};
type Harness = {
  recordFrustration?: RegisteredTool;
  interrogate?: RegisteredTool;
  wrappers: Record<string, RegisteredTool>;
  events: Record<string, (payload: unknown) => void>;
};
const harnesses = new WeakMap<Record<string, H>, Harness>();
const commands: Record<string, Cmd> = {};
const sessionEntries: Array<{ customType: string; data: Record<string, unknown> }> = [];
const schema = { describe() { return this; }, min() { return this; }, optional() { return this; } };
const zod = {
  object: (_shape: unknown) => schema,
  string: () => schema,
  array: (_item: unknown) => schema,
  union: (_items: unknown[]) => schema,
  number: () => schema,
  literal: (_value: string) => schema,
};
const mkHandlers = () => {
  const h: Record<string, H> = {};
  const harness: Harness = { wrappers: {}, events: {} };
  harnesses.set(h, harness);
  gateChecker({
    zod,
    on: (n: string, f: H) => { h[n] = f; },
    registerCommand: (n: string, o: { handler: Cmd }) => { commands[n] = o.handler; },
    getAllTools: () => [
      { name: "write", description: "native write", parameters: schema, sourceInfo: { source: "builtin" } },
      { name: "edit", description: "native edit", parameters: schema, sourceInfo: { source: "builtin" } },
      { name: "bash", description: "native bash", parameters: schema, sourceInfo: { source: "builtin" } },
    ],
    registerTool: (tool: unknown) => {
      if (
        tool &&
        typeof tool === "object" &&
        "name" in tool &&
        "execute" in tool &&
        typeof tool.execute === "function"
      ) {
        if (tool.name === "record_frustration") harness.recordFrustration = tool as RegisteredTool;
        if (tool.name === "interrogate") harness.interrogate = tool as RegisteredTool;
        if (tool.name === "write" || tool.name === "edit" || tool.name === "bash") {
          harness.wrappers[tool.name] = tool as RegisteredTool;
        }
      }
    },
    events: {
      on: (channel: string, handler: (payload: unknown) => void) => {
        harness.events[channel] = handler;
      },
    },
    appendEntry: (customType: string, data: Record<string, unknown>) => {
      sessionEntries.push({ customType, data });
    },
  } as never);
  return h;
};
const handlers = mkHandlers();

const mainSessionFile = resolve(home, "main-session.json");
const mainSessionId = "main-session";
const mainSession = {
  getSessionFile: () => mainSessionFile,
  getSessionId: () => mainSessionId,
};
let assistantText = "updated `src/a.txt` as requested.";
const nativeCalls: Array<{ params: unknown; options: unknown }> = [];
const invokeNative = async (params: unknown, options: unknown) => {
  nativeCalls.push({ params, options });
  return { content: [], details: undefined };
};
const ctx = {
  cwd: repo,
  hasUI: false,
  sessionManager: {
    getBranch: () => [{ type: "message", message: { role: "assistant", content: assistantText } }],
    ...mainSession,
  },
  invokeTool: invokeNative,
  ui: { setStatus: () => {}, notify: () => {} },
};

const subagentContext = (sessionFile: string, sessionId: string) => ({
  ...ctx,
  sessionManager: {
    ...ctx.sessionManager,
    getSessionFile: () => sessionFile,
    getSessionId: () => sessionId,
  },
});
let frustrationCalls = 0;
const recordFrustration = async (
  h: Record<string, H>,
  context: unknown,
  agentId: string,
  suppliedRecord: Record<string, unknown> = {},
) => {
  const tool = harnesses.get(h)?.recordFrustration;
  if (!tool) throw new Error("record_frustration was not registered");
  const result = await tool.execute(
    `frustration-${++frustrationCalls}`,
    {
      ...suppliedRecord,
      agent_id: agentId,
      primary_goal: "exercise the gate wiring",
      complaint: "simulated request completed",
      type: "workflow",
      severity: "low",
      evidence: [{
        kind: "command",
        command: "wiring-check",
        exit_code: 0,
        output: "simulated",
      }],
    },
    undefined,
    undefined,
    context,
  );
  if (
    result !== null &&
    typeof result === "object" &&
    "isError" in result &&
    result.isError === true
  ) {
    throw new Error(`record_frustration failed for ${agentId}`);
  }
};
const start = async (
  h: Record<string, H>,
  context: unknown,
  record = true,
) => {
  await h.agent_start!({}, context);
  if (record) await recordFrustration(h, context, "main");
};
const emit = (h: Record<string, H>, channel: string, payload: unknown) => {
  const listener = harnesses.get(h)?.events[channel];
  if (!listener) throw new Error(`missing ${channel} listener`);
  listener(payload);
};
// the interrogation is required once per changed generation whenever a day-one
// fact fires (a new file, a manifest change). it is keyed on the tree state at
// call time, so a compliant turn answers it after the change lands and before
// the stop — exactly where a real agent would.
const interrogate = async (h: Record<string, H>, context: unknown) => {
  const tool = harnesses.get(h)?.interrogate;
  if (!tool) throw new Error("interrogate was not registered");
  await tool.execute(
    "interrogate-1",
    {
      unnecessary: "nothing; this is the minimum change that satisfies the request",
      deleted: "nothing this turn",
      simplified: "nothing this turn",
    },
    undefined,
    undefined,
    context,
  );
};
let n = 0;
let lastNotice = "";
const run = async (h: Record<string, H>, label: string, work: () => void) => {
  await start(h, ctx);
  work();
  await h.tool_call!({ toolName: "write", input: { path: "src/a.txt" } }, ctx);
  await interrogate(h, ctx);
  const r = (await h.session_stop!({}, ctx)) as
    | { continue?: boolean; additionalContext?: string }
    | undefined;
  const rules = [...(r?.additionalContext ?? "").matchAll(/\d+\. \S+\/(\w+)/g)].map((m) => m[1]);
  console.log(`${label}\n  continue=${!!r?.continue}  rules=[${rules.join(", ")}]`);
  return r;
};
const expect = (cond: boolean, msg: string) => {
  if (!cond) { console.log(`  ✗ ${msg}`); n++; } else console.log(`  ✓ ${msg}`);
};

// case 1: agent edited, did not commit, verify command fails -> both gates fire
const c1 = await run(handlers, "1. dirty + failing verify", () =>
  writeFileSync(resolve(repo, "src/a.txt"), "two\n"));
expect(c1?.continue === true, "forces continuation");
expect(c1?.additionalContext?.includes("verify_failed") ?? false, "verify gate fired");
expect(c1?.additionalContext?.includes("uncommitted_changes") ?? false, "commit gate fired");

// case 2: verify now passes, tree still dirty -> only the commit gate fires
const c2 = await run(handlers, "2. dirty + passing verify", () =>
  writeFileSync(resolve(repo, "verified.txt"), "ok\n"));
expect(!(c2?.additionalContext?.includes("verify_failed") ?? true), "verify gate passed");
expect(c2?.additionalContext?.includes("uncommitted_changes") ?? false, "commit gate fired");

// case 3: work committed + verify passes -> agent is released
const c3 = await run(handlers, "3. committed + passing verify", () =>
  git("git add src && git commit -q -m work"));
expect(c3 === undefined, "agent released: " + JSON.stringify(c3));
const journalKinds = sessionEntries
  .filter((entry) => entry.customType === "omp.gate-checker.journal")
  .map((entry) => entry.data.kind);
expect(journalKinds.includes("request_start"), "journal captured the request baseline");
expect(journalKinds.includes("verify"), "journal captured verification");
expect(journalKinds.includes("terminal"), "journal captured the terminal outcome");

// case 4: a compliant read-only session is never asked to test or commit
const h4 = mkHandlers();
assistantText = "i read the file. no changes needed.";
await start(h4, ctx);
await h4.tool_call!({ toolName: "read", input: { path: "src/a.txt" } }, ctx);
const c4 = await h4.session_stop!({}, ctx);
console.log("4. read-only session");
expect(c4 === undefined, "compliant read-only session is not blocked");

// case 5: low leaves delivery findings advisory once scratchpad coverage exists
// the mandatory scratchpad record remains blocking at low
delete process.env.OMP_DELIVERY_GATES;
process.env.OMP_GATES_LEVEL = "low";
const h5 = mkHandlers();
assistantText = "updated `src/a.txt`.";
const c5 = await run(h5, "5. low + dirty + failing verify", () => {
  rmSync(resolve(repo, "verified.txt"));
  writeFileSync(resolve(repo, "src/a.txt"), "three\n");
});
expect(c5 === undefined, "low leaves compliant dirty delivery work unblocked: " + JSON.stringify(c5));


// case 6: the "a process should have run" record reaches the ledger.
// the detector is pure and unit-checked; what this covers is that session_stop
// actually writes it, once per ENDED request and not once per continuation.
const { read } = await import("./ledger.js");

const shapes = read(process.env.OMP_GATE_LEDGER!).filter(
  (r) => r.event === "process_shape",
);
console.log("6. process-shape records");
expect(shapes.length > 0, `ledger received records (${shapes.length})`);
expect(
  shapes.every((r) =>
    r.outcome === "gates_clean" || r.outcome === "released_with_failures"
  ),
  "every record marks an ENDED request, never a forced continuation",
);
// case 3 committed one file and the verify gate proved the suite passes, so it
// IS process-shaped. This is the fix for the earlier skew: the gate runs the
// test command itself, and `ranTestRunner` could not see that, so verified work
// used to be recorded as "no-test-run".
const c3shape = shapes.find((r) => r.outcome === "gates_clean");
expect(c3shape?.matched === true, `a verified bounded change is process-shaped (${c3shape?.reason})`);
expect(c3shape?.testRan === true, "the delivery verify run counts as a test run");

// cases 7-11 exercise the default level, where the manifest severity is
// diff-derived and citation failures block
process.env.OMP_GATES_LEVEL = "medium";
writeFileSync(resolve(repo, "verified.txt"), "ok\n");

// ── subagent + loop regressions, driven through the real hooks ──────────────
//
// each case below protects one subagent or continuation-loop invariant.

const MO = "<changed-files>";
const MC = "</changed-files>";
let subagentSequence = 0;
// load after env setup so frustrations.js uses the isolated scratchpad path.
const { readRecords } = await import("./frustrations.js");

// drives one full request: agent_start -> subagent reports -> session_stop.
const runSub = async (
  h: Record<string, H>,
  parentText: string,
  reports: string[],
  reportIds: string[] = [],
  recordSubagents = true,
  childSetups: Array<{
    serverSessionFile?: string;
    serverSessionId?: string;
    suppliedRecord?: Record<string, unknown>;
  }> = [],
) => {
  assistantText = parentText;
  await start(h, ctx);
  await h.tool_call!(
    { toolName: "task", input: { task: "review the change" } },
    ctx,
  );
  await h.tool_call!({ toolName: "write", input: { path: "src/a.txt" } }, ctx);
  writeFileSync(resolve(repo, "src/a.txt"), `sub ${Math.random()}\n`);
  for (const [index, text] of reports.entries()) {
    const id = reportIds[index] ?? `subagent-${++subagentSequence}`;
    const sessionFile = resolve(home, `${id}.json`);
    const sessionId = `${id}-session`;
    const setup = childSetups[index];
    const childSessionFile = setup?.serverSessionFile ?? sessionFile;
    const childSessionId = setup?.serverSessionId ?? sessionId;
    const toolCallId = `task-${id}`;
    const child = mkHandlers();
    const childContext = subagentContext(childSessionFile, childSessionId);
    await child.agent_start!({}, childContext);
    if (recordSubagents)
      await recordFrustration(child, childContext, id, setup?.suppliedRecord);
    emit(h, "task:subagent:lifecycle", {
      id,
      agent: "subagent",
      status: "completed",
      sessionFile,
      parentToolCallId: toolCallId,
    });
    await h.tool_result!(
      {
        toolName: "task",
        toolCallId,
        input: {},
        content: [{ type: "text", text }],
        details: {
          results: [{ id, agent: "subagent", exitCode: 0, output: text, sessionFile }],
        },
        isError: false,
      },
      ctx,
    );
  }
  const r = (await h.session_stop!({}, ctx)) as
    | { continue?: boolean; additionalContext?: string }
    | undefined;
  return {
    r,
    rules: [...(r?.additionalContext ?? "").matchAll(/\d+\. \S+\/(\w+)/g)].map((m) => m[1]),
  };
};

// a parent record cannot cover a child: the child has its own server session identity.
{
  process.env.OMP_GATES_LEVEL = "low";
  const h = mkHandlers();
  const { r, rules } = await runSub(
    h,
    "the reviewer subagent reported back",
    [JSON.stringify({ review: "ok", changed: [] })],
    ["unrecorded-child"],
    false,
  );
  process.env.OMP_GATES_LEVEL = "medium";
  console.log("5b. missing child frustration record");
  expect(
    r?.continue === true && rules.includes("missing_frustration_record"),
    "low blocks a missing child frustration record",
  );
}

// child records have child-local request ids, but coverage binds to session_file.
{
  process.env.OMP_GATES_LEVEL = "low";
  const h = mkHandlers();
  const id = "child-local-session";
  const { r } = await runSub(
    h,
    "the reviewer subagent reported back",
    [JSON.stringify({ review: "ok", changed: [] })],
    [id],
  );
  const records = readRecords(process.env.OMP_GATE_FRUSTRATIONS!);
  const child = records.find((record) => record.agent_id === id);
  const main = records.filter((record) => record.session_file === mainSessionFile).pop();
  process.env.OMP_GATES_LEVEL = "medium";
  console.log("5c. child session coverage");
  expect(r === undefined, "parent accepts a record from the child server session");
  expect(
    child?.session_file === resolve(home, `${id}.json`) &&
      child?.session_id === `${id}-session`,
    "child record keeps its server session identity",
  );
  expect(
    typeof child?.request_id === "string" &&
      typeof main?.request_id === "string" &&
      child.request_id !== main.request_id,
    "child-local request id does not affect parent coverage",
  );
}

// native task provenance must match the trusted child session, not the agent id.
{
  process.env.OMP_GATES_LEVEL = "low";
  const h = mkHandlers();
  const id = "identity-bound-child";
  const expectedSessionFile = resolve(home, `${id}.json`);
  const serverSessionFile = resolve(home, `${id}-server.json`);
  const serverSessionId = `${id}-server-session`;
  const { r, rules } = await runSub(
    h,
    "the reviewer subagent reported back",
    [JSON.stringify({ review: "ok", changed: [] })],
    [id],
    true,
    [{
      serverSessionFile,
      serverSessionId,
      suppliedRecord: {
        request_id: "agent-selected-request",
        session_file: expectedSessionFile,
        session_id: `${id}-session`,
      },
    }],
  );
  const child = readRecords(process.env.OMP_GATE_FRUSTRATIONS!).find((record) => record.agent_id === id);
  process.env.OMP_GATES_LEVEL = "medium";
  console.log("5d. server-bound child identity");
  expect(
    child?.session_file === serverSessionFile &&
      child?.session_id === serverSessionId,
    "server ignores caller-supplied child session identity",
  );
  expect(
    child?.request_id !== "agent-selected-request",
    "server ignores caller-supplied child request id",
  );
  expect(
    r?.continue === true && rules.includes("missing_frustration_record"),
    "parent rejects a record outside native task session provenance",
  );
}

// manifest fixtures: only the last report is a real failure.
console.log("7. subagent manifest fixtures");
for (const [label, report, shouldBlock] of [
  ["json changed: []", JSON.stringify({ review: "ok", changed: [] }), false],
  ["json embedded token", JSON.stringify({ verdict: "ok", manifest: `${MO}\n${MC}` }), false],
  ["prose literal block", `reviewed it.\n${MO}\n${MC}`, false],
  // no manifest, but the report contradicts nothing -> warn, not block
  ["no manifest, corroborated", "reviewed it. looks correct.", false],
  // no manifest AND a claim the diff denies -> block
  ["no manifest, contradicted", "I updated `src/ghost.ts` for you", true],
] as Array<[string, string, boolean]>) {
  const h = mkHandlers();
  const { r, rules } = await runSub(h, "the reviewer subagent reported back", [report]);
  const blocked = rules.includes("subagent_missing_manifest");
  expect(
    blocked === shouldBlock,
    `${label}: ${shouldBlock ? "blocks" : "passes"} (continue=${!!r?.continue})`,
  );
}

// a read-only reviewer with no manifest warns; it does not block.
{
  const h = mkHandlers();
  const { r } = await runSub(h, "the reviewer subagent reported back", ["looks correct to me"]);
  console.log("8. severity");
  expect(r === undefined, "corroborated missing manifest does NOT force a continuation");
}

// a parent that verified the work itself is not judged for the report.
{
  const h = mkHandlers();
  const { r } = await runSub(h, "i ran the tests myself; all green.", ["no manifest here"]);
  console.log("9. reliance");
  expect(r === undefined, "parent citing no subagent is released");
}

// a retry must not grow the failure count.
{
  const h = mkHandlers();
  const parent = "the reviewer subagent claimed `src/ghost.ts` was updated";
  const bad = "I updated `src/ghost.ts` for you";
  const a = await runSub(h, parent, [bad], ["retry-subagent"]);
  const b = await runSub(h, parent, [bad, "I updated `src/ghost2.ts` too"], ["retry-subagent", "new-subagent"]);
  console.log("10. retry does not grow the failure count");
  expect(a.r?.continue === true, `turn 1 blocks (rules=${a.rules.join(",")})`);
  expect(
    b.rules.filter((x) => x === "subagent_missing_manifest").length <= 1,
    `turn 2 reports at most the NEW subagent (rules=${b.rules.join(",")})`,
  );
}

// identical blocking failures twice in a row release the agent. use the
// parent's fabricated claim because repeated subagent reports are deduplicated
// before they reach the stalemate path.
{
  const h = mkHandlers();
  const parent = "i modified `src/ghost.ts` as requested";
  const first = await runSub(h, parent, []);
  const second = await runSub(h, parent, []);
  console.log("11. released with failures");
  expect(first.r?.continue === true, "first identical failure forces a continuation");
  expect(second.r === undefined, "second identical failure releases instead of looping");
  const stale = read(process.env.OMP_GATE_LEDGER!).filter(
    (x) =>
      x.event === "chain_end" &&
      x.outcome === "released_with_failures" &&
      x.release_reason === "stalemate",
  );
  expect(stale.length > 0, `ledger records the failed release (${stale.length})`);
}

// ── the dial, through the real command handlers ────────────────────────────
{
  console.log("12. /gates-engage and /gates-disable");
  const notify = (m: string) => { lastNotice = m; };
  const cmdCtx = { cwd: repo, hasUI: true, ui: { notify, setStatus: () => {} } };
  mkHandlers();

  await commands["gates-engage"]!("", cmdCtx);
  expect(lastNotice.includes("gates:"), "no argument reports the current level");
  for (const level of ["low", "medium", "high"]) {
    await commands["gates-engage"]!(level, cmdCtx);
    expect(lastNotice.includes(level.toUpperCase()), `${level} accepts one argument`);
    expect(
      JSON.parse(readFileSync(process.env.OMP_GATE_CONFIG!, "utf-8")).verifyCmd === probeVerifyCmd,
      `${level} preserves the configured verification command`,
    );
  }

  const beforeTrailing = readFileSync(process.env.OMP_GATE_CONFIG!, "utf-8");
  await commands["gates-engage"]!("high trailing text", cmdCtx);
  expect(
    lastNotice.includes("trailing text") &&
      lastNotice.includes("OMP_VERIFY_CMD") &&
      lastNotice.includes("persisted config"),
    "trailing text names the verification command sources",
  );
  expect(
    readFileSync(process.env.OMP_GATE_CONFIG!, "utf-8") === beforeTrailing,
    "trailing text changes no config",
  );
  await commands["gates-engage"]!("paranoid", cmdCtx);
  expect(lastNotice.includes("unknown level"), "an unknown level is rejected");
  expect(
    JSON.parse(readFileSync(process.env.OMP_GATE_CONFIG!, "utf-8")).level === "high",
    "a rejected level changes nothing",
  );

  delete process.env.OMP_VERIFY_CMD;
  writeProbeConfig("high");
  mkHandlers();
  await commands["gates-engage"]!("", cmdCtx);
  expect(lastNotice.includes("no verify command set"), "high reports no configured verifier");

  process.env.OMP_VERIFY_CMD = probeVerifyCmd;
  writeProbeConfig("high", probeVerifyCmd);
  const rearmed = mkHandlers();

  // the level must take effect in THIS session, with no restart
  await commands["gates-disable"]!("", cmdCtx);
  expect(lastNotice.includes("gates: OFF"), "disable reports off");
  const off = await runSub(rearmed, "i modified `src/ghost.ts` as requested", []);
  expect(off.r === undefined, "a disabled gate does not block a fabricated claim");

  await commands["gates-engage"]!("medium", cmdCtx);
  const on = await runSub(rearmed, "i modified `src/ghost.ts` as requested", []);
  expect(on.r?.continue === true, "re-engaging restores blocking in the same session");
}

// ── the workflow that motivated the dial: work outside any git repo ─────────
{
  console.log("13. non-git work");
  const loose = mkdtempSync(resolve(tmpdir(), "probe-nogit-"));
  const looseCtx = {
    cwd: loose,
    hasUI: false,
    sessionManager: {
      getBranch: () => [
        { type: "message", message: { role: "assistant", content: "wrote the script." } },
      ],
      ...mainSession,
    },
    ui: { setStatus: () => {}, notify: () => {} },
  };
  // set the level the way you would: through the command. it writes the config
  // file, which outranks the env var — a fresh handler set picks it up.
  await commands["gates-engage"]!("low", { cwd: loose, hasUI: true, ui: { notify: () => {}, setStatus: () => {} } });
  const h = mkHandlers();
  await start(h, looseCtx);
  // tool_call fires BEFORE the write in a real session — that ordering is what
  // lets no-git mode snapshot the pre-write state
  await h.tool_call!({ toolName: "write", input: { path: "s.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s.sh"), "#!/bin/sh\n# TODO: implement\n");
  const r = await h.session_stop!({}, looseCtx);
  expect(r === undefined, "low never blocks outside a repo, even with a fresh stub");

  await commands["gates-engage"]!("medium", { cwd: loose, hasUI: true, ui: { notify: () => {}, setStatus: () => {} } });
  const h2 = mkHandlers();
  await start(h2, looseCtx);
  await h2.tool_call!({ toolName: "write", input: { path: "s2.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s2.sh"), "#!/bin/sh\n# TODO: implement\n");
  const r2 = (await h2.session_stop!({}, looseCtx)) as { additionalContext?: string } | undefined;
  expect(
    r2?.additionalContext?.includes("forbidden_marker") ?? false,
    "medium still catches a fresh stub outside a repo",
  );
  expect(
    !(r2?.additionalContext?.includes("uncommitted_changes") ?? true),
    "no repo means no commit demand, at any level",
  );
  // the verify gate needs a configured command, not a repo — a lot of real work
  // has one and not the other. this probe config is isolated from user settings.
  writeProbeConfig("medium", `test -f ${resolve(loose, "built.txt")}`);
  const h3 = mkHandlers();
  await start(h3, looseCtx);
  await h3.tool_call!({ toolName: "write", input: { path: "s3.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s3.sh"), "#!/bin/sh\necho ok\n");
  const r3 = (await h3.session_stop!({}, looseCtx)) as { additionalContext?: string } | undefined;
  expect(
    r3?.additionalContext?.includes("verify_failed") ?? false,
    "the verify gate runs outside a repo",
  );
  writeFileSync(resolve(loose, "built.txt"), "ok\n");
  const h4b = mkHandlers();
  await start(h4b, looseCtx);
  await h4b.tool_call!({ toolName: "write", input: { path: "s4.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s4.sh"), "#!/bin/sh\necho ok\n");
  await interrogate(h4b, looseCtx);
  const r4 = await h4b.session_stop!({}, looseCtx);
  expect(r4 === undefined, "and clears once the command passes");

  const claimCtx = {
    ...looseCtx,
    sessionManager: {
      getBranch: () => [
        {
          type: "message",
          message: { role: "assistant", content: "i modified `src/claimed.ts`." },
        },
      ],
      ...mainSession,
    },
  };
  execSync("mkdir -p src", { cwd: loose });
  writeFileSync(resolve(loose, "src/claimed.ts"), "unchanged\n");
  const claimHandlers = mkHandlers();
  await start(claimHandlers, claimCtx);
  await claimHandlers.tool_call!(
    { toolName: "write", input: { path: "src/claimed.ts" } },
    claimCtx,
  );
  const claimResult = (await claimHandlers.session_stop!({}, claimCtx)) as
    | { additionalContext?: string }
    | undefined;
  expect(
    claimResult?.additionalContext?.includes("fabricated_modification") ?? false,
    "a relative no-git write keeps relative citation coverage",
  );
  const honestCtx = {
    ...looseCtx,
    sessionManager: {
      getBranch: () => [
        {
          type: "message",
          message: { role: "assistant", content: "i modified `src/honest.ts`." },
        },
      ],
      ...mainSession,
    },
  };
  writeFileSync(resolve(loose, "src/honest.ts"), "before\n");
  const honestHandlers = mkHandlers();
  await start(honestHandlers, honestCtx);
  await honestHandlers.tool_call!(
    { toolName: "write", input: { path: "src/honest.ts" } },
    honestCtx,
  );
  writeFileSync(resolve(loose, "src/honest.ts"), "after\n");
  const honestResult = (await honestHandlers.session_stop!({}, honestCtx)) as
    | { additionalContext?: string }
    | undefined;
  expect(
    !(honestResult?.additionalContext?.includes("fabricated_modification") ?? false),
    "an honest relative no-git modification remains grounded",
  );


  rmSync(loose, { recursive: true, force: true });
}

// ── requests started outside git bind before repository effects ─────────────
{
  console.log("14. automatic repository binding");
  const paths: string[] = [];
  const makeRepo = () => {
    const target = mkdtempSync(resolve(tmpdir(), "probe-bind-repo-"));
    paths.push(target);
    const git = (command: string) =>
      execSync(command, { cwd: target, encoding: "utf-8", stdio: "pipe" });
    git("git init -q .");
    git("git config user.email t@t.t && git config user.name t");
    writeFileSync(resolve(target, "tracked.txt"), "before\n");
    git("git add -A && git commit -q -m init");
    return { target, git };
  };
  const makeLoose = (assistant: string, statuses: string[] = []) => {
    const cwd = mkdtempSync(resolve(tmpdir(), "probe-bind-loose-"));
    paths.push(cwd);
    return {
      cwd,
      hasUI: false,
      sessionManager: {
        getBranch: () => [
          { type: "message", message: { role: "assistant", content: assistant } },
        ],
        ...mainSession,
      },
      ui: { setStatus: (_key: string, text: string) => statuses.push(text), notify: () => {} },
    };
  };

  const cwdRepo = makeRepo();
  const cwdStatuses: string[] = [];
  const cwdCtx = makeLoose("updated `tracked.txt`.", cwdStatuses);
  writeProbeConfig("high", `test "$(pwd)" = ${cwdRepo.target}`);
  const cwdHandlers = mkHandlers();
  const journalStart = sessionEntries.length;
  await cwdHandlers.session_start!({}, cwdCtx);
  expect(
    cwdStatuses.at(-1)?.includes("low: no git") ?? false,
    "session startup shows the no-git capability label",
  );
  await start(cwdHandlers, cwdCtx);
  expect(
    cwdStatuses.at(-1)?.includes("low: no git") ?? false,
    "no-git status uses the low capability label",
  );
  await cwdHandlers.tool_call!(
    { toolName: "bash", input: { cwd: cwdRepo.target, command: "printf after > tracked.txt" } },
    cwdCtx,
  );
  expect(
    !(cwdStatuses.at(-1)?.includes("low: no git") ?? true),
    "repository binding restores normal arming status",
  );
  writeFileSync(resolve(cwdRepo.target, "tracked.txt"), "after\n");
  const cwdResult = (await cwdHandlers.session_stop!({}, cwdCtx)) as
    | { additionalContext?: string }
    | undefined;
  expect(
    cwdResult?.additionalContext?.includes("uncommitted_changes") ?? false,
    "an explicit tool working directory binds git scope before mutation",
  );
  expect(
    sessionEntries.slice(journalStart).some(
      (entry) =>
        entry.customType === "omp.gate-checker.journal" &&
        entry.data.kind === "repository_bound" &&
        entry.data.repo_root === cwdRepo.target,
    ),
    "repository binding is journaled",
  );

  const pathRepo = makeRepo();
  writeFileSync(resolve(pathRepo.target, "ignored.txt"), "// TODO: implement\n");
  const pathCtx = makeLoose("wrote `new.ts`.");
  writeProbeConfig("medium", "true");
  const pathHandlers = mkHandlers();
  await start(pathHandlers, pathCtx);
  const newPath = resolve(pathRepo.target, "new.ts");
  await pathHandlers.tool_call!({ toolName: "write", input: { path: newPath } }, pathCtx);
  writeFileSync(newPath, "// TODO: implement\n");
  const pathResult = (await pathHandlers.session_stop!({}, pathCtx)) as
    | { additionalContext?: string }
    | undefined;
  expect(
    pathResult?.additionalContext?.includes("forbidden_marker") ?? false,
    "an absolute file path binds before write and keeps dirty baseline exclusion",
  );
  expect(
    !(pathResult?.additionalContext?.includes("ignored.txt") ?? true),
    "a file dirty before repository discovery stays excluded",
  );
  const mixedRepo = makeRepo();
  const mixedExternal = mkdtempSync(resolve(tmpdir(), "probe-bind-external-"));
  paths.push(mixedExternal);
  const mixedCtx = makeLoose("wrote `loose.ts`.");
  const mixedHandlers = mkHandlers();
  await start(mixedHandlers, mixedCtx);
  await mixedHandlers.tool_call!(
    { toolName: "write", input: { cwd: mixedExternal, path: "loose.ts" } },
    mixedCtx,
  );
  writeFileSync(resolve(mixedExternal, "loose.ts"), "// TODO: implement\n");
  await mixedHandlers.tool_call!(
    { toolName: "read", input: { path: resolve(mixedRepo.target, "tracked.txt") } },
    mixedCtx,
  );
  const mixedResult = (await mixedHandlers.session_stop!({}, mixedCtx)) as
    | { additionalContext?: string }
    | undefined;
  expect(
    mixedResult?.additionalContext?.includes("forbidden_marker") ?? false,
    "binding retains no-git evidence collected earlier in the request",
  );

  const firstRepo = makeRepo();
  const secondRepo = makeRepo();
  const singleCtx = makeLoose("read repository files.");
  const singleHandlers = mkHandlers();
  const warningStart = sessionEntries.length;
  await start(singleHandlers, singleCtx);
  await singleHandlers.tool_call!(
    { toolName: "read", input: { path: resolve(firstRepo.target, "tracked.txt") } },
    singleCtx,
  );
  await singleHandlers.tool_call!(
    { toolName: "read", input: { path: resolve(secondRepo.target, "tracked.txt") } },
    singleCtx,
  );
  expect(
    sessionEntries.slice(warningStart).some(
      (entry) =>
        entry.customType === "omp.gate-checker.repository-limit" &&
        entry.data.authoritative_root === firstRepo.target &&
        entry.data.ignored_root === secondRepo.target,
    ),
    "a second repository reports the first-repository limitation",
  );

  for (const path of paths) rmSync(path, { recursive: true, force: true });
}

console.log("14. operation lease classifier and lifecycle");
process.env.OMP_GATE_MUTATION_LEASE = "1";
writeProbeConfig("medium", "true");
const leaseRepo = mkdtempSync(resolve(tmpdir(), "probe-operation-repo-"));
const leaseGit = (command: string) =>
  execSync(command, { cwd: leaseRepo, encoding: "utf-8", stdio: "pipe" });
leaseGit("git init -q .");
leaseGit("git config user.email t@t.t && git config user.name t");
writeFileSync(resolve(leaseRepo, "tracked.txt"), "before\n");
leaseGit("git add -A && git commit -q -m init");
const leaseOutside = mkdtempSync(resolve(tmpdir(), "probe-operation-outside-"));
symlinkSync(leaseOutside, resolve(leaseRepo, "escape"));
const asyncSnapshots = new Map<string, {
  running: Array<{ id: string; status: string }>;
  recent: Array<{ id: string; status: string }>;
}>();
const operationContext = (id: string) => ({
  cwd: leaseRepo,
  hasUI: false,
  sessionManager: {
    getBranch: () => [
      { type: "message", message: { role: "assistant", content: "operation complete." } },
    ],
    getSessionFile: () => resolve(home, `${id}.json`),
    getSessionId: () => id,
  },
  invokeTool: invokeNative,
  getAsyncJobSnapshot: () => asyncSnapshots.get(id) ?? null,
  ui: { setStatus: () => {}, notify: () => {} },
});
const leaseStatus = () => inspectlease({ cwd: leaseRepo });
const leaseFree = () => leaseStatus().status === "free" && leaseStatus().exists === false;
const leaseBefore = async (
  h: Record<string, H>,
  id: string,
  toolName: string,
  input: Record<string, unknown>,
  context: unknown,
) => {
  await h.tool_call!({ toolName, toolCallId: id, input }, context);
  const wrapper = harnesses.get(h)?.wrappers[toolName];
  if (!wrapper) return undefined;
  try {
    return await wrapper.execute(id, input, undefined, undefined, context);
  } catch (error) {
    return {
      block: true,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
};
const leaseResult = async (
  h: Record<string, H>,
  id: string,
  toolName: string,
  context: unknown,
  isError = false,
  details: unknown = undefined,
  input: Record<string, unknown> = {},
) => h.tool_result!(
  { toolName, toolCallId: id, input, content: [], details, isError },
  context,
);

const scopeCases: Array<{
  label: string;
  toolName: string;
  input: Record<string, unknown>;
}> = [
  { label: "task", toolName: "task", input: { task: "inspect" } },
  { label: "local uri", toolName: "write", input: { path: "local://artifact.txt" } },
  { label: "xd uri", toolName: "edit", input: { path: "xd://artifact.txt" } },
  { label: "outside path", toolName: "write", input: { path: resolve(leaseOutside, "outside.txt") } },
  { label: "symlink escape", toolName: "write", input: { path: "escape/new.txt" } },
];
for (const [index, item] of scopeCases.entries()) {
  const h = mkHandlers();
  const context = operationContext(`scope-${index}`);
  await start(h, context, false);
  const outcome = (await leaseBefore(h, `scope-${index}`, item.toolName, item.input, context)) as
    | { block?: boolean }
    | undefined;
  expect(outcome?.block !== true, `${item.label} does not block`);
  expect(leaseFree(), `${item.label} acquires no lease`);
}

const foregroundCases = [
  { label: "foreground success", isError: false },
  { label: "foreground error", isError: true },
];
for (const [index, item] of foregroundCases.entries()) {
  const h = mkHandlers();
  const context = operationContext(`foreground-${index}`);
  await start(h, context, false);
  const call = `foreground-${index}`;
  const outcome = (await leaseBefore(h, call, "write", { path: "tracked.txt" }, context)) as
    | { block?: boolean }
    | undefined;
  expect(outcome?.block !== true, `${item.label} acquires`);
  expect(leaseStatus().status === "held", `${item.label} owns while executing`);
  await leaseResult(h, call, "write", context, item.isError, undefined, { path: "tracked.txt" });
  expect(leaseFree(), `${item.label} releases on terminal result`);
}

const asyncStates = [
  { state: "completed", isError: false },
  { state: "failed", isError: true },
  { state: "cancelled", isError: false },
];
for (const [index, { state, isError }] of asyncStates.entries()) {
  const h = mkHandlers();
  const context = operationContext(`async-${index}`);
  await start(h, context, false);
  const call = `async-${index}`;
  const outcome = (await leaseBefore(h, call, "bash", { command: "printf running" }, context)) as
    | { block?: boolean }
    | undefined;
  expect(outcome?.block !== true, `async ${state} acquires`);
  await leaseResult(h, call, "bash", context, isError, { async: { state: "running" } });
  expect(leaseStatus().status === "held", `async ${state} stays owned while running`);
  await h.agent_end!({ willContinue: false }, context);
  expect(leaseStatus().status === "held", `async ${state} stays owned after normal agent end`);
  await h.agent_start!({}, context);
  expect(leaseStatus().status === "held", `async ${state} survives the next agent start`);
  await recordFrustration(h, context, "main");
  if (h.session_stop) {
    await h.session_stop!({}, context);
    expect(leaseStatus().status === "held", `async ${state} survives terminal journal`);
  }
  await h.tool_execution_update!(
    {
      type: "tool_execution_update",
      toolCallId: call,
      toolName: "bash",
      args: { command: "printf running" },
      partialResult: {
        content: [],
        details: { async: { state } },
        isError,
      },
    },
    context,
  );
  expect(leaseFree(), `async ${state} terminal update clears the physical holder`);
}
const asyncPoll = mkHandlers();
const asyncPollContext = operationContext("async-poll");
const asyncPollJobId = "job-async-poll";
asyncSnapshots.set("async-poll", {
  running: [{ id: asyncPollJobId, status: "running" }],
  recent: [],
});
await start(asyncPoll, asyncPollContext, false);
const asyncPollCall = "async-poll-call";
await leaseBefore(asyncPoll, asyncPollCall, "bash", { command: "printf running" }, asyncPollContext);
await leaseResult(
  asyncPoll,
  asyncPollCall,
  "bash",
  asyncPollContext,
  false,
  { async: { state: "running", jobId: asyncPollJobId, type: "bash" } },
  { command: "printf running" },
);
expect(leaseStatus().status === "held", "async snapshot poll keeps a running job owned");
asyncSnapshots.set("async-poll", {
  running: [],
  recent: [{ id: asyncPollJobId, status: "completed" }],
});
const { promise: asyncPollWait, resolve: resolveAsyncPollWait } = Promise.withResolvers<void>();
setTimeout(resolveAsyncPollWait, 75);
await asyncPollWait;
expect(leaseFree(), "async snapshot poll releases after the matching job completes");

const asyncWaitHolder = mkHandlers();
const asyncWaitHolderContext = operationContext("async-wait-holder");
await start(asyncWaitHolder, asyncWaitHolderContext, false);
const asyncWaitHolderCall = (await leaseBefore(
  asyncWaitHolder,
  "async-wait-holder-call",
  "write",
  { path: "tracked.txt" },
  asyncWaitHolderContext,
)) as { block?: boolean } | undefined;
expect(asyncWaitHolderCall?.block !== true, "the async wait holder acquires");

const asyncWaiter = mkHandlers();
const asyncWaiterContext = operationContext("async-waiter");
await start(asyncWaiter, asyncWaiterContext, false);
process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS = "100";
let asyncWaitHolderReleased = false;
let asyncWaitHolderResult: Promise<void>;
asyncWaitHolderResult = new Promise<void>((resolvePromise, rejectPromise) => {
  setTimeout(() => {
    leaseResult(asyncWaitHolder, "async-wait-holder-call", "write", asyncWaitHolderContext)
      .then(() => {
        asyncWaitHolderReleased = true;
        resolvePromise();
      })
      .catch(rejectPromise);
  }, 0);
});
const asyncWaiterCall = (await leaseBefore(
  asyncWaiter,
  "async-waiter-call",
  "write",
  { path: "tracked.txt" },
  asyncWaiterContext,
)) as { block?: boolean } | undefined;
await asyncWaitHolderResult;
expect(asyncWaitHolderReleased, "the holder result releases during waiter backoff");
expect(asyncWaiterCall?.block !== true, "the waiter acquires after holder result");
expect(leaseStatus().status === "held", "the waiter owns after asynchronous acquisition");
await leaseResult(asyncWaiter, "async-waiter-call", "write", asyncWaiterContext);
expect(leaseFree(), "the asynchronous waiter releases the physical lease");
delete process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS;

const holder = mkHandlers();
const holderContext = operationContext("retry-holder");
await start(holder, holderContext, false);
const holderCall = (await leaseBefore(
  holder,
  "retry-holder-call",
  "write",
  { path: "tracked.txt" },
  holderContext,
)) as { block?: boolean } | undefined;
expect(holderCall?.block !== true, "retry holder acquires");
const waiter = mkHandlers();
const waiterContext = operationContext("retry-waiter");
await start(waiter, waiterContext, false);
process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS = "0";
const timedOut = (await leaseBefore(
  waiter,
  "retry-waiter-call",
  "write",
  { path: "tracked.txt" },
  waiterContext,
)) as { block?: boolean } | undefined;
expect(timedOut?.block === true, "a timed-out call is blocked locally");
await leaseResult(holder, "retry-holder-call", "write", holderContext);
const retried = (await leaseBefore(
  waiter,
  "retry-waiter-retry",
  "write",
  { path: "tracked.txt" },
  waiterContext,
)) as { block?: boolean } | undefined;
expect(retried?.block !== true, "a later retry acquires after release");
await leaseResult(waiter, "retry-waiter-retry", "write", waiterContext);
const retryStop = (await waiter.session_stop!({}, waiterContext)) as
  | { additionalContext?: string }
  | undefined;
expect(
  !(retryStop?.additionalContext?.includes("mutation_lease_conflict") ?? false),
  "a timed-out operation never poisons request completion",
);
delete process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS;

const abort = mkHandlers();
const abortContext = operationContext("abort");
await start(abort, abortContext, false);
await leaseBefore(abort, "abort-call", "edit", { path: "tracked.txt" }, abortContext);
await abort.agent_end!({ willContinue: false }, abortContext);
expect(leaseFree(), "terminal agent abort releases the operation");

const yielded = mkHandlers();
const yieldedContext = operationContext("yielded");
await start(yielded, yieldedContext, false);
await leaseBefore(yielded, "yielded-call", "edit", { path: "tracked.txt" }, yieldedContext);
await yielded.agent_end!({ willContinue: false }, yieldedContext);
expect(leaseFree(), "a yielded child releases before its sibling");
const sibling = mkHandlers();
const siblingContext = operationContext("sibling");
await start(sibling, siblingContext, false);
const siblingCall = (await leaseBefore(
  sibling,
  "sibling-call",
  "edit",
  { path: "tracked.txt" },
  siblingContext,
)) as { block?: boolean } | undefined;
expect(siblingCall?.block !== true, "the next sibling can acquire");
await leaseResult(sibling, "sibling-call", "edit", siblingContext);

const shutdown = mkHandlers();
const shutdownContext = operationContext("shutdown");
await start(shutdown, shutdownContext, false);
await leaseBefore(shutdown, "shutdown-call", "write", { path: "tracked.txt" }, shutdownContext);
await shutdown.session_shutdown!({}, shutdownContext);
expect(leaseFree(), "session shutdown releases leftovers");

const restored = mkHandlers();
const restoredContext = operationContext("restored");
await start(restored, restoredContext, false);
await leaseBefore(restored, "restored-call", "write", { path: "tracked.txt" }, restoredContext);
await restored.session_tree!({}, restoredContext);
expect(leaseFree(), "journal restore releases leftovers");

const lifecycle = mkHandlers();
const lifecycleContext = operationContext("lifecycle-parent");
await start(lifecycle, lifecycleContext, false);
await lifecycle.tool_call!(
  { toolName: "read", toolCallId: "lifecycle-read", input: { path: "tracked.txt" } },
  lifecycleContext,
);
const childSessionFile = resolve(home, "lifecycle-child.json");
const staleLifecycle = (status: string) => acquirelease({
  cwd: leaseRepo,
  owner_id: `owner-${status}`,
  request_id: `request-${status}`,
  session_id: `session-${status}`,
  session_file: childSessionFile,
  agent_id: "lifecycle-child",
  tool_call_id: `call-${status}`,
  tool_name: "write",
  target: "tracked.txt",
  acquisition_wait_ms: 0,
  now: 0,
});
for (const status of ["completed", "failed", "aborted"]) {
  const stale = staleLifecycle(status);
  expect(stale.acquired === true, `child ${status} seeds a stale operation`);
  emit(lifecycle, "task:subagent:lifecycle", {
    id: `child-${status}`,
    status,
    sessionFile: childSessionFile,
  });
  expect(leaseFree(), `child ${status} lifecycle reconciles stale ownership`);
}
const fresh = acquirelease({
  cwd: leaseRepo,
  owner_id: "owner-fresh",
  request_id: "request-fresh",
  session_id: "session-fresh",
  session_file: childSessionFile,
  agent_id: "lifecycle-child",
  tool_call_id: "call-fresh",
  tool_name: "write",
  target: "tracked.txt",
  acquisition_wait_ms: 0,
  now: Date.now(),
});
emit(lifecycle, "task:subagent:lifecycle", {
  id: "child-fresh",
  status: "completed",
  sessionFile: childSessionFile,
});
expect(leaseStatus().status === "held", "fresh child heartbeat is not reclaimed");
releaselease(fresh);
expect(leaseFree(), "fresh child cleanup remains fenced");

console.log("14b. incident-shaped lease wave");
const incidentMain = mkHandlers();
const incidentMainContext = operationContext("incident-main");
const incidentFree = (label: string) => {
  const status = inspectlease({ cwd: leaseRepo });
  const free = status.status === "free" && status.exists === false;
  expect(free, `${label} leaves no holder`);
  return free;
};
const incidentRows = [
  { kind: "foreground", id: "incident-main-foreground", command: "printf foreground" },
  {
    kind: "scout",
    id: "incident-scout-1",
    task: "read the repository",
    artifact: "local://incident-scout-1.txt",
  },
  {
    kind: "scout",
    id: "incident-scout-2",
    task: "read the repository",
    artifact: "local://incident-scout-2.txt",
  },
  {
    kind: "scout",
    id: "incident-scout-3",
    task: "read the repository",
    artifact: "local://incident-scout-3.txt",
  },
  {
    kind: "scout",
    id: "incident-scout-4",
    task: "read the repository",
    artifact: "local://incident-scout-4.txt",
  },
  {
    kind: "writer",
    id: "incident-writer-1",
    task: "edit the first repository file",
    path: "incident-writer-1.txt",
  },
  {
    kind: "writer",
    id: "incident-writer-2",
    task: "edit the second repository file",
    path: "incident-writer-2.txt",
  },
  {
    kind: "writer",
    id: "incident-writer-3",
    task: "edit the third repository file",
    path: "incident-writer-3.txt",
  },
  {
    kind: "writer",
    id: "incident-writer-4",
    task: "edit the fourth repository file",
    path: "incident-writer-4.txt",
  },
  {
    kind: "abort",
    id: "incident-aborted-writer",
    task: "edit then abort",
    path: "incident-aborted-writer.txt",
  },
  { kind: "background", id: "incident-background", command: "printf background" },
] as const;
let incidentWritersCompleted = 0;
let previousWriterYielded = false;
await start(incidentMain, incidentMainContext, false);
for (const row of incidentRows) {
  if (row.kind === "foreground") {
    const call = (await leaseBefore(
      incidentMain,
      row.id,
      "bash",
      { command: row.command },
      incidentMainContext,
    )) as { block?: boolean } | undefined;
    expect(call?.block !== true, "main foreground bash acquires");
    expect(leaseStatus().status === "held", "main foreground bash owns while running");
    await leaseResult(
      incidentMain,
      row.id,
      "bash",
      incidentMainContext,
      false,
      undefined,
      { command: row.command },
    );
    incidentFree("main foreground bash result");
    continue;
  }
  if (row.kind === "background") {
    const call = (await leaseBefore(
      incidentMain,
      row.id,
      "bash",
      { command: row.command },
      incidentMainContext,
    )) as { block?: boolean } | undefined;
    expect(call?.block !== true, "background bash acquires");
    await leaseResult(
      incidentMain,
      row.id,
      "bash",
      incidentMainContext,
      false,
      { async: { state: "running" } },
      { command: row.command },
    );
    expect(leaseStatus().status === "held", "background bash stays owned while running");
    await incidentMain.tool_execution_update!(
      {
        type: "tool_execution_update",
        toolCallId: row.id,
        toolName: "bash",
        args: { command: row.command },
        partialResult: {
          content: [],
          details: { async: { state: "completed" } },
          isError: false,
        },
      },
      incidentMainContext,
    );
    incidentFree("background bash completed update");
    continue;
  }

  const taskCall = `${row.id}-task`;
  const taskInput = { task: row.task };
  const task = (await leaseBefore(
    incidentMain,
    taskCall,
    "task",
    taskInput,
    incidentMainContext,
  )) as { block?: boolean } | undefined;
  expect(task?.block !== true, `${row.id} task spawn stays unleased`);
  incidentFree(`${row.id} task spawn`);

  const child = mkHandlers();
  const childContext = operationContext(row.id);
  await start(child, childContext, false);
  if (row.kind === "scout") {
    const readCall = `${row.id}-read`;
    const read = (await leaseBefore(
      child,
      readCall,
      "read",
      { path: "tracked.txt" },
      childContext,
    )) as { block?: boolean } | undefined;
    expect(read?.block !== true, `${row.id} stays read-only`);
    await leaseResult(child, readCall, "read", childContext, false, undefined, {
      path: "tracked.txt",
    });
    incidentFree(`${row.id} read result`);

    const artifactCall = `${row.id}-artifact`;
    const artifact = (await leaseBefore(
      child,
      artifactCall,
      "write",
      { path: row.artifact },
      childContext,
    )) as { block?: boolean } | undefined;
    expect(artifact?.block !== true, `${row.id} writes a local artifact`);
    incidentFree(`${row.id} local artifact`);
    await leaseResult(child, artifactCall, "write", childContext, false, undefined, {
      path: row.artifact,
    });
    incidentFree(`${row.id} local artifact result`);
    await child.agent_end!({ willContinue: false }, childContext);
  } else if (row.kind === "writer") {
    const call = (await leaseBefore(
      child,
      row.id,
      "edit",
      { path: row.path },
      childContext,
    )) as { block?: boolean } | undefined;
    expect(
      call?.block !== true,
      previousWriterYielded
        ? `${row.id} edits after its sibling yields`
        : `${row.id} acquires`,
    );
    expect(leaseStatus().status === "held", `${row.id} owns while editing`);
    await leaseResult(child, row.id, "edit", childContext, false, undefined, {
      path: row.path,
    });
    const released = incidentFree(`${row.id} edit result`);
    await child.agent_end!({ willContinue: false }, childContext);
    const yielded = incidentFree(`${row.id} yield`);
    if (call?.block !== true && released && yielded) incidentWritersCompleted++;
    previousWriterYielded = true;
  } else {
    const call = (await leaseBefore(
      child,
      row.id,
      "edit",
      { path: row.path },
      childContext,
    )) as { block?: boolean } | undefined;
    expect(call?.block !== true, "aborted writer acquires");
    expect(leaseStatus().status === "held", "aborted writer owns while editing");
    await child.agent_end!({ willContinue: false }, childContext);
    incidentFree("aborted writer");
  }
  await leaseResult(
    incidentMain,
    taskCall,
    "task",
    incidentMainContext,
    false,
    undefined,
    taskInput,
  );
}
expect(incidentWritersCompleted === 4, "all four writers complete");
await recordFrustration(incidentMain, incidentMainContext, "main");
const incidentStop = (await incidentMain.session_stop!({}, incidentMainContext)) as
  | { continue?: boolean; additionalContext?: string }
  | undefined;
expect(
  incidentStop === undefined || incidentStop.continue !== true,
  "incident main stop finishes cleanly",
);
expect(
  !(incidentStop?.additionalContext?.includes("mutation_lease_conflict") ?? false),
  "incident main stop has no mutation_lease_conflict",
);
incidentFree("incident main stop");
rmSync(leaseRepo, { recursive: true, force: true });
rmSync(leaseOutside, { recursive: true, force: true });
process.env.OMP_GATE_MUTATION_LEASE = "off";

console.log("15. journal recovery");
writeProbeConfig("medium", "true");
const recovery = mkHandlers();
const recoveryCtx = {
  ...ctx,
  sessionManager: {
    getBranch: () => [
      {
        type: "custom",
        customType: "omp.gate-checker.journal",
        data: { version: 1, kind: "request_start" },
      },
      { type: "message", message: { role: "assistant", content: "need input." } },
    ],
    ...mainSession,
  },
};
await recovery.session_start!({}, recoveryCtx);
await start(recovery, recoveryCtx);
await recovery.tool_call!({ toolName: "ask", input: {} }, recoveryCtx);
const recoveryResult = (await recovery.session_stop!({}, recoveryCtx)) as
  | { continue?: boolean; additionalContext?: string }
  | undefined;
expect(
  recoveryResult?.continue === true &&
    recoveryResult.additionalContext?.includes("recovery_required") === true,
  "a user question cannot clear required journal recovery",
);

// ── the engagement dial must reach the tool_call handler ───────────────────
//
// `off` promises that nothing is checked and nothing is recorded. the handler
// used to bind a repository, rewrite a commit, and inject the subagent nudge
// regardless of level. the loose cwd matters: with a git cwd, agent_start has
// already captured a baseline and the binding path would not run at all.
{
	console.log("16. a disabled gate performs no tool-call side effects");
	const loose = mkdtempSync(resolve(tmpdir(), "probe-off-loose-"));
	const bound = mkdtempSync(resolve(tmpdir(), "probe-off-repo-"));
	const boundGit = (c: string) => execSync(c, { cwd: bound, encoding: "utf-8", stdio: "pipe" });
	boundGit("git init -q .");
	boundGit("git config user.email t@t.t && git config user.name t");
	writeFileSync(resolve(bound, "tracked.txt"), "before\n");
	boundGit("git add -A && git commit -q -m init");

	const offCtx = {
		cwd: loose,
		hasUI: false,
		sessionManager: {
			getBranch: () => [{ type: "message", message: { role: "assistant", content: "done." } }],
			...mainSession,
		},
		ui: { setStatus: () => {}, notify: () => {} },
	};
	await commands["gates-disable"]!("", {
		cwd: loose,
		hasUI: true,
		ui: { notify: () => {}, setStatus: () => {} },
	});
	const off = mkHandlers();
	const offStart = sessionEntries.length;
	await start(off, offCtx, false);

	const offTask = (await off.tool_call!(
		{ toolName: "task", input: { task: "review the change" } },
		offCtx,
	)) as { input?: { task?: string } } | undefined;
	expect(offTask === undefined, "a disabled gate does not inject the subagent nudge");

	await off.tool_call!(
		{ toolName: "bash", input: { cwd: bound, command: "printf after > tracked.txt" } },
		offCtx,
	);
	expect(
		!sessionEntries
			.slice(offStart)
			.some(
				(entry) =>
					entry.customType === "omp.gate-checker.journal" &&
					entry.data.kind === "repository_bound",
			),
		"a disabled gate does not bind a repository from tool context",
	);

	const offResult = await off.session_stop!({}, offCtx);
	expect(offResult === undefined, "a disabled gate does not enforce the scratchpad");

	rmSync(loose, { recursive: true, force: true });
	rmSync(bound, { recursive: true, force: true });
}

// ── both extensions in one session ─────────────────────────────────────────
//
// the questionnaire no longer sniffs input text: a phase declares an interview
// through `questionnaire_open`. while one is open, only read-only tools and the
// declaration itself are admitted. the gate is the single session_stop owner and
// its completion proof outranks the interview, so a request that scaffolds new
// code is judged whether or not an interview is still pending.
{
	console.log("17. questionnaire and gate checker together");
	writeProbeConfig("medium", "true");
	resetQuestionnaireStop();
	let questionnaireOpen: RegisteredTool | undefined;
	const quizHandlers = () => {
		const h: Record<string, H> = {};
		askQuestionnaire({
			zod,
			on: (name: string, f: H) => { h[name] = f; },
			registerTool: (tool: unknown) => {
				if (
					tool &&
					typeof tool === "object" &&
					"name" in tool &&
					tool.name === "questionnaire_open" &&
					"execute" in tool &&
					typeof tool.execute === "function"
				) {
					questionnaireOpen = tool as RegisteredTool;
				}
			},
		} as never);
		return h;
	};

	const quiz = quizHandlers();
	const call = async (toolName: string, id: string) =>
		(await quiz.tool_call!({ toolName, toolCallId: id, input: {} }, ctx)) as
			{ block?: boolean; reason?: string } | undefined;

	// nothing declared: an ordinary coding turn arms nothing.
	expect((await call("write", "0"))?.block !== true, "no declaration arms nothing");

	const reason = "settle the log-triage cli scope before any file is written";
	await questionnaireOpen!.execute("q1", { owner: "factory-discovery", reason }, undefined, undefined, ctx);

	expect((await call("read", "1"))?.block !== true, "a pending questionnaire still admits read");
	expect(
		(await call("questionnaire_open", "2"))?.block !== true,
		"a pending questionnaire still admits its own declaration tool",
	);
	const blockedWrite = await call("write", "3");
	expect(blockedWrite?.block === true, "a pending questionnaire refuses write");
	expect(blockedWrite?.reason === reason, "the refusal states the declared reason");

	// precedence: the gate's completion proof outranks a pending interview.
	const contested = mkHandlers();
	assistantText = "scaffolded the cli.";
	await start(contested, ctx);
	await contested.tool_call!({ toolName: "write", input: { path: "src/scaffold.ts" } }, ctx);
	writeFileSync(resolve(repo, "src/scaffold.ts"), ["// TODO:", " implement\n"].join(""));
	const contestedStop = (await contested.session_stop!({}, ctx)) as { additionalContext?: string } | undefined;
	expect(
		contestedStop?.additionalContext?.includes("forbidden_marker") ?? false,
		"the completion gate outranks a pending questionnaire",
	);

	// a successful ask clears the interview, and the gate still judges the change.
	await quiz.tool_result!({ toolName: "ask", toolCallId: "4", isError: false }, ctx);
	expect((await call("write", "5"))?.block !== true, "a successful ask clears the questionnaire");

	const gate = mkHandlers();
	await start(gate, ctx);
	await gate.tool_call!({ toolName: "ask", input: {} }, ctx);
	await gate.tool_call!({ toolName: "write", input: { path: "src/scaffold2.ts" } }, ctx);
	writeFileSync(resolve(repo, "src/scaffold2.ts"), ["// TODO:", " implement\n"].join(""));
	const both = (await gate.session_stop!({}, ctx)) as { additionalContext?: string } | undefined;
	expect(
		both?.additionalContext?.includes("forbidden_marker") ?? false,
		"a questionnaire ask does not disarm the completion gate on a changed request",
	);
}

// the skip itself is still right when the request genuinely changed nothing.
{
	console.log("18. a user question still releases a request that changed nothing");
	const gate = mkHandlers();
	assistantText = "answered the question. no changes needed.";
	await start(gate, ctx);
	await gate.tool_call!({ toolName: "ask", input: {} }, ctx);
	const askOnly = await gate.session_stop!({}, ctx);
	expect(askOnly === undefined, "an ask with no file changes still skips the gates");
}

rmSync(repo, { recursive: true, force: true });
rmSync(home, { recursive: true, force: true });
console.log(n === 0 ? "\nprobe: all wiring checks passed" : `\nprobe: ${n} FAILED`);
process.exit(n === 0 ? 0 : 1);
