// end-to-end probe: does the delivery gate actually fire from session_stop?
// unit checks cover the predicates; this covers the WIRING.
//
// note: every mutation happens BETWEEN agent_start and session_stop. a file
// dirtied before agent_start lands in baselineDirty and is subtracted from the
// diff by design, which is not the scenario under test.
import { execSync } from "child_process";
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { resolve } from "path";

const home = mkdtempSync(resolve(tmpdir(), "probe-home-"));
process.env.OMP_GATE_LEDGER = resolve(home, "ledger.jsonl"); // keep the real tuning data untouched
// isolate the dial too: a real /gates-engage config must not change what this
// check measures, and this check must not overwrite the real one
process.env.OMP_GATE_CONFIG = resolve(home, "config.json");
process.env.OMP_DELIVERY_GATES = "1";
process.env.OMP_VERIFY_CMD = "test -f verified.txt";

const gateChecker = (await import("./index.ts")).default;
const askQuestionnaire = (await import("../ask-questionnaire/index.ts")).default;

const repo = mkdtempSync(resolve(tmpdir(), "probe-repo-"));
const git = (c: string) => execSync(c, { cwd: repo, encoding: "utf-8", stdio: "pipe" });
git("git init -q .");
git("git config user.email t@t.t && git config user.name t");
execSync("mkdir -p src", { cwd: repo });
writeFileSync(resolve(repo, "src/a.txt"), "one\n");
git("git add -A && git commit -q -m init");

type H = (e: unknown, c: unknown) => unknown;
type Cmd = (args: string, c: unknown) => Promise<void>;
const commands: Record<string, Cmd> = {};
const sessionEntries: Array<{ customType: string; data: Record<string, unknown> }> = [];
const mkHandlers = () => {
  const h: Record<string, H> = {};
  gateChecker({
    on: (n: string, f: H) => { h[n] = f; },
    registerCommand: (n: string, o: { handler: Cmd }) => { commands[n] = o.handler; },
    appendEntry: (customType: string, data: Record<string, unknown>) => {
      sessionEntries.push({ customType, data });
    },
  } as never);
  return h;
};
const handlers = mkHandlers();

let assistantText = "updated `src/a.txt` as requested.";
const ctx = {
  cwd: repo,
  hasUI: false,
  sessionManager: {
    getBranch: () => [{ type: "message", message: { role: "assistant", content: assistantText } }],
  },
  ui: { setStatus: () => {}, notify: () => {} },
};

let n = 0;
let lastNotice = "";
const run = async (h: Record<string, H>, label: string, work: () => void) => {
  await h.agent_start!({}, ctx);
  work();
  await h.tool_call!({ toolName: "write", input: { path: "src/a.txt" } }, ctx);
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

// case 4: read-only session -> never asked to test or commit
const h4 = mkHandlers();
assistantText = "i read the file. no changes needed.";
await h4.agent_start!({}, ctx);
await h4.tool_call!({ toolName: "read", input: { path: "src/a.txt" } }, ctx);
const c4 = await h4.session_stop!({}, ctx);
console.log("4. read-only session");
expect(c4 === undefined, "read-only session not blocked");

// case 5: disarmed -> the same dirty state passes untouched
// "low" is the disarmed equivalent under the dial: nothing blocks
delete process.env.OMP_DELIVERY_GATES;
process.env.OMP_GATES_LEVEL = "low";
const h5 = mkHandlers();
assistantText = "updated `src/a.txt`.";
const c5 = await run(h5, "5. disarmed + dirty + failing verify", () => {
  rmSync(resolve(repo, "verified.txt"));
  writeFileSync(resolve(repo, "src/a.txt"), "three\n");
});
expect(c5 === undefined, "disarmed gates do not block: " + JSON.stringify(c5));

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

// drives one full request: agent_start -> subagent reports -> session_stop.
const runSub = async (
  h: Record<string, H>,
  parentText: string,
  reports: string[],
) => {
  assistantText = parentText;
  await h.agent_start!({}, ctx);
  await h.tool_call!({ toolName: "write", input: { path: "src/a.txt" } }, ctx);
  writeFileSync(resolve(repo, "src/a.txt"), `sub ${Math.random()}\n`);
  for (const text of reports) {
    await h.tool_result!(
      { toolName: "task", input: {}, content: [{ type: "text", text }], isError: false },
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
  const a = await runSub(h, parent, [bad]);
  const b = await runSub(h, parent, [bad, "I updated `src/ghost2.ts` too"]);
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
  const h = mkHandlers();
  await commands["gates-engage"]!("high bun test", cmdCtx);
  expect(lastNotice.includes("HIGH"), "engage high");
  expect(
    JSON.parse(readFileSync(process.env.OMP_GATE_CONFIG!, "utf-8")).verifyCmd === "bun test",
    "a multi-word verify command persists",
  );
  await commands["gates-engage"]!("paranoid", cmdCtx);
  expect(lastNotice.includes("unknown level"), "an unknown level is rejected");
  expect(
    JSON.parse(readFileSync(process.env.OMP_GATE_CONFIG!, "utf-8")).level === "high",
    "a rejected level changes nothing",
  );

  // the level must take effect in THIS session, with no restart
  await commands["gates-disable"]!("", cmdCtx);
  expect(lastNotice.includes("gates: OFF"), "disable reports off");
  const off = await runSub(h, "i modified `src/ghost.ts` as requested", []);
  expect(off.r === undefined, "a disabled gate does not block a fabricated claim");

  await commands["gates-engage"]!("medium", cmdCtx);
  const on = await runSub(h, "i modified `src/ghost.ts` as requested", []);
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
    },
    ui: { setStatus: () => {}, notify: () => {} },
  };
  // set the level the way you would: through the command. it writes the config
  // file, which outranks the env var — a fresh handler set picks it up.
  await commands["gates-engage"]!("low", { cwd: loose, hasUI: true, ui: { notify: () => {}, setStatus: () => {} } });
  const h = mkHandlers();
  await h.agent_start!({}, looseCtx);
  // tool_call fires BEFORE the write in a real session — that ordering is what
  // lets no-git mode snapshot the pre-write state
  await h.tool_call!({ toolName: "write", input: { path: "s.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s.sh"), "#!/bin/sh\n# TODO: implement\n");
  const r = await h.session_stop!({}, looseCtx);
  expect(r === undefined, "low never blocks outside a repo, even with a fresh stub");

  await commands["gates-engage"]!("medium", { cwd: loose, hasUI: true, ui: { notify: () => {}, setStatus: () => {} } });
  const h2 = mkHandlers();
  await h2.agent_start!({}, looseCtx);
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
  // the verify gate needs a test command, not a repo — a lot of real work has
  // one and not the other
  await commands["gates-engage"]!("medium test -f " + resolve(loose, "built.txt"), {
    cwd: loose, hasUI: true, ui: { notify: () => {}, setStatus: () => {} },
  });
  const h3 = mkHandlers();
  await h3.agent_start!({}, looseCtx);
  await h3.tool_call!({ toolName: "write", input: { path: "s3.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s3.sh"), "#!/bin/sh\necho ok\n");
  const r3 = (await h3.session_stop!({}, looseCtx)) as { additionalContext?: string } | undefined;
  expect(
    r3?.additionalContext?.includes("verify_failed") ?? false,
    "the verify gate runs outside a repo",
  );
  writeFileSync(resolve(loose, "built.txt"), "ok\n");
  const h4b = mkHandlers();
  await h4b.agent_start!({}, looseCtx);
  await h4b.tool_call!({ toolName: "write", input: { path: "s4.sh" } }, looseCtx);
  writeFileSync(resolve(loose, "s4.sh"), "#!/bin/sh\necho ok\n");
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
    },
  };
  execSync("mkdir -p src", { cwd: loose });
  writeFileSync(resolve(loose, "src/claimed.ts"), "unchanged\n");
  const claimHandlers = mkHandlers();
  await claimHandlers.agent_start!({}, claimCtx);
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
    },
  };
  writeFileSync(resolve(loose, "src/honest.ts"), "before\n");
  const honestHandlers = mkHandlers();
  await honestHandlers.agent_start!({}, honestCtx);
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
      },
      ui: { setStatus: (_key: string, text: string) => statuses.push(text), notify: () => {} },
    };
  };

  const cwdRepo = makeRepo();
  const cwdStatuses: string[] = [];
  const cwdCtx = makeLoose("updated `tracked.txt`.", cwdStatuses);
  await commands["gates-engage"]!(`high test "$(pwd)" = ${cwdRepo.target}`, {
    cwd: cwdCtx.cwd,
    hasUI: true,
    ui: { notify: () => {}, setStatus: () => {} },
  });
  const cwdHandlers = mkHandlers();
  const journalStart = sessionEntries.length;
  await cwdHandlers.session_start!({}, cwdCtx);
  expect(
    cwdStatuses.at(-1)?.includes("low: no git") ?? false,
    "session startup shows the no-git capability label",
  );
  await cwdHandlers.agent_start!({}, cwdCtx);
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
  await commands["gates-engage"]!("medium true", {
    cwd: pathCtx.cwd,
    hasUI: true,
    ui: { notify: () => {}, setStatus: () => {} },
  });
  const pathHandlers = mkHandlers();
  await pathHandlers.agent_start!({}, pathCtx);
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
  await mixedHandlers.agent_start!({}, mixedCtx);
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
  await singleHandlers.agent_start!({}, singleCtx);
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

console.log("14. cooperative mutation lease");
process.env.OMP_GATE_MUTATION_LEASE = "1";
const leaseOwner = mkHandlers();
const leaseWaiter = mkHandlers();
await leaseOwner.agent_start!({}, ctx);
await leaseWaiter.agent_start!({}, ctx);
const blockedLease = (await leaseWaiter.tool_call!(
  { toolName: "write", input: { path: "src/leased.txt" } },
  ctx,
)) as { block?: boolean } | undefined;
expect(blockedLease?.block === true, "a second session cannot use native mutation tools");
const blockedBash = (await leaseWaiter.tool_call!(
  { toolName: "bash", input: { command: "git status --short" } },
  ctx,
)) as { block?: boolean } | undefined;
expect(blockedBash?.block === true, "a conflicting session cannot bypass the lease through bash");
const isolatedTask = (await leaseWaiter.tool_call!(
  {
    toolName: "task",
    input: {
      tasks: [{ task: "inspect", isolated: true }],
      context: "read only",
    },
  },
  ctx,
)) as { block?: boolean } | undefined;
expect(isolatedTask?.block !== true, "isolated task work does not need the shared lease");
await leaseOwner.session_tree!({}, ctx);
await leaseWaiter.agent_start!({}, ctx);
const retriedLease = (await leaseWaiter.tool_call!(
  { toolName: "write", input: { path: "src/leased.txt" } },
  ctx,
)) as { block?: boolean } | undefined;
expect(retriedLease?.block !== true, "branch navigation releases the prior worktree lease");
await leaseWaiter.session_shutdown!({}, ctx);
delete process.env.OMP_GATE_MUTATION_LEASE;

console.log("15. journal recovery");
await commands["gates-engage"]!(
  "medium true",
  { cwd: repo, hasUI: true, ui: { notify: () => {}, setStatus: () => {} } },
);
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
  },
};
await recovery.session_start!({}, recoveryCtx);
await recovery.agent_start!({}, recoveryCtx);
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
	await off.agent_start!({}, offCtx);

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

	rmSync(loose, { recursive: true, force: true });
	rmSync(bound, { recursive: true, force: true });
}

// ── both extensions in one session ─────────────────────────────────────────
//
// the questionnaire forces an `ask` before any other tool on a new-project
// request. the gate checker treats an `ask` as "the agent stopped to ask the
// user" and used to skip every gate for the request — so the requests that
// scaffold new code were exactly the ones that went unchecked.
{
	console.log("17. questionnaire and gate checker together");
	await commands["gates-engage"]!("medium true", {
		cwd: repo,
		hasUI: true,
		ui: { notify: () => {}, setStatus: () => {} },
	});
	const quizHandlers = () => {
		const h: Record<string, H> = {};
		askQuestionnaire({
			on: (name: string, f: H) => { h[name] = f; },
			getActiveTools: () => ["ask", "write", "bash", "task"],
		} as never);
		return h;
	};

	const gate = mkHandlers();
	const quiz = quizHandlers();

	await quiz.input!(
		{ type: "input", text: "create a new cli tool for log triage", source: "interactive" },
		ctx,
	);
	const blockedWrite = (await quiz.tool_call!(
		{ toolName: "write", toolCallId: "1", input: {} },
		ctx,
	)) as { block?: boolean } | undefined;
	expect(blockedWrite?.block === true, "the questionnaire blocks work before the ask");

	await gate.agent_start!({}, ctx);
	await gate.tool_call!({ toolName: "ask", input: {} }, ctx);
	await quiz.tool_result!({ toolName: "ask", toolCallId: "1", isError: false }, ctx);

	assistantText = "scaffolded the cli.";
	await gate.tool_call!({ toolName: "write", input: { path: "src/scaffold.ts" } }, ctx);
	writeFileSync(resolve(repo, "src/scaffold.ts"), ["// TODO:", " implement\n"].join(""));
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
	await gate.agent_start!({}, ctx);
	await gate.tool_call!({ toolName: "ask", input: {} }, ctx);
	const askOnly = await gate.session_stop!({}, ctx);
	expect(askOnly === undefined, "an ask with no file changes still skips the gates");
}

rmSync(repo, { recursive: true, force: true });
rmSync(home, { recursive: true, force: true });
console.log(n === 0 ? "\nprobe: all wiring checks passed" : `\nprobe: ${n} FAILED`);
process.exit(n === 0 ? 0 : 1);
