import { afterAll, afterEach, test } from "bun:test";
import { execFileSync } from "node:child_process";
import { chmodSync, linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
// the same zod omp hands extensions as pi.zod: it strips unknown keys and rejects shapes the schemas do not allow.
import * as zod from "@oh-my-pi/omptype/zod";

// end-to-end probes: each test drives the extension's registered handlers the way omp does and checks the
// observable decision, journal, ledger, or lease state.

const isolatedEnv = ["OMP_GATE_CONFIG", "OMP_GATE_LEDGER", "OMP_GATE_FRUSTRATIONS", "OMP_GATE_MUTATION_LEASE", "PI_CODING_AGENT_DIR"];
const priorEnv = Object.fromEntries(isolatedEnv.map((key) => [key, process.env[key]]));
const roots = [];
const temp = (prefix) => {
  const path = mkdtempSync(join(tmpdir(), prefix));
  roots.push(path);
  return path;
};
const stateRoot = temp("gates-test-state-");
const agentRoot = temp("gates test agent-");
const commitScript = join(agentRoot, "skills/git-commit/scripts/smart_commit.sh");
mkdirSync(join(commitScript, ".."), { recursive: true });
writeFileSync(commitScript, "#!/bin/sh\nexit 0\n");
chmodSync(commitScript, 0o755);
process.env.OMP_GATE_CONFIG = join(stateRoot, "config.json");
process.env.OMP_GATE_LEDGER = join(stateRoot, "ledger.jsonl");
process.env.OMP_GATE_FRUSTRATIONS = join(stateRoot, "frustrations.jsonl");
process.env.OMP_GATE_MUTATION_LEASE = "off";
process.env.PI_CODING_AGENT_DIR = agentRoot;

// module-level paths bind at first import, so import only after the isolated env above.
const gateChecker = (await import("./index.ts")).default;
const { acquirelease, heartbeatlease, identity, inspectlease, releaselease, releasestalelease } = await import("./lease.js");
const { installQuestionnaireStop, resetQuestionnaireStop } = await import("../ask-questionnaire/stop-decision.ts");
const { installOmnipotenceStop, resetOmnipotenceStop } = await import("../omnipotence/stop-decision.ts");
const boundPaths = [
  (await import("./config.js")).CONFIG_PATH,
  (await import("./ledger.js")).LEDGER_PATH,
  (await import("./frustrations.js")).FRUSTRATION_PATH,
];
// another test file that imported these modules first would make this file write to the real ~/.omp state.
if (boundPaths.some((path) => !path.startsWith(stateRoot)))
  throw new Error("gate-checker modules were loaded before this file isolated their paths; run it in its own bun test process");

afterEach(() => {
  resetQuestionnaireStop();
  resetOmnipotenceStop();
});
afterAll(() => {
  for (const root of roots.reverse()) rmSync(root, { recursive: true, force: true });
  for (const [key, value] of Object.entries(priorEnv))
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
});

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const git = (cwd, ...args) => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const repository = () => {
  const cwd = temp("gates-test-repo-");
  git(cwd, "init", "-q");
  git(cwd, "config", "user.email", "test@example.invalid");
  git(cwd, "config", "user.name", "test");
  mkdirSync(join(cwd, "src"));
  writeFileSync(join(cwd, "src/a.txt"), "one\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-q", "-m", "initial");
  return cwd;
};
const config = (level, verifyCmd = null) => {
  const value = { level };
  if (verifyCmd) value.verifyCmd = verifyCmd;
  writeFileSync(process.env.OMP_GATE_CONFIG, `${JSON.stringify(value)}\n`);
};


const harness = (cwd, level, verifyCmd = null, leaseEnabled = false) => {
  process.env.OMP_GATE_MUTATION_LEASE = leaseEnabled ? "on" : "off";
  config(level, verifyCmd);
  const handlers = {};
  const commands = {};
  const tools = {};
  const events = {};
  const entries = [];
  const notices = [];
  const statuses = [];
  const session = {
    branch: [],
    id: `session-${Math.random()}`,
    file: join(stateRoot, `session-${Math.random()}.jsonl`),
  };
  const context = {
    cwd,
    hasUI: true,
    sessionManager: {
      getBranch: () => session.branch,
      getSessionId: () => session.id,
      getSessionFile: () => session.file,
    },
    ui: {
      notify: (message, levelName) => notices.push({ message, level: levelName }),
      setStatus: (key, text) => statuses.push({ key, text }),
    },
    invokeTool: async (params) => {
      if (params.path && params.content) writeFileSync(join(cwd, params.path), params.content);
      return { content: [{ type: "text", text: "invoked" }], isError: false };
    },
  };
  gateChecker({
    zod,
    on: (name, handler) => { handlers[name] = handler; },
    registerCommand: (name, value) => { commands[name] = value.handler; },
    registerTool: (tool) => { tools[tool.name] = tool; },
    getAllTools: () => leaseEnabled ? [{
      name: "write",
      description: "native write",
      parameters: zod.object({ path: zod.string(), content: zod.string() }),
      sourceInfo: { source: "builtin" },
    }] : [],
    events: { on: (name, handler) => { events[name] = handler; } },
    appendEntry: (customType, data) => entries.push({ customType, data }),
  });
  return { cwd, handlers, commands, tools, events, entries, notices, statuses, session, context };
};

const start = async (probe) => {
  await probe.handlers.session_start({}, probe.context);
  await probe.handlers.agent_start({}, probe.context);
};
const finish = async (probe, text) => {
  probe.session.branch = [{ type: "message", message: { role: "assistant", content: text } }];
  return probe.handlers.session_stop({}, probe.context);
};
const writeChange = async (probe, text, id = "write-1", path = "src/a.txt") => {
  const input = { path };
  await probe.handlers.tool_call({ toolName: "write", toolCallId: id, input }, probe.context);
  writeFileSync(join(probe.cwd, path), text);
  await probe.handlers.tool_result({
    toolName: "write",
    toolCallId: id,
    input,
    content: [{ type: "text", text: "written" }],
    isError: false,
  }, probe.context);
};

test("a no-change user question releases as skipped_user_question", async () => {
  const probe = harness(repository(), "medium");
  await start(probe);
  await probe.handlers.tool_call({ toolName: "ask", toolCallId: "ask-optional", input: {} }, probe.context);
  const result = await finish(probe, "waiting for the user's answer");
  assert(result === undefined, "a no-change user question must release");
  assert(probe.entries.some((entry) => entry.data.kind === "terminal" && entry.data.outcome === "skipped_user_question"), "a no-change user question must close as skipped_user_question");
});

test("a user question does not bypass journal recovery", async () => {
  const probe = harness(repository(), "medium");
  probe.session.branch = [{ type: "custom", customType: "omp.gate-checker.journal", data: { invalid: true } }];
  await probe.handlers.session_start({}, probe.context);
  await probe.handlers.tool_call({ toolName: "ask", toolCallId: "ask-recovery", input: {} }, probe.context);
  const result = await finish(probe, "waiting for the user's answer");
  assert(result?.additionalContext.includes("recovery_required"), "a user question must not bypass journal recovery");
});

test("a request left open by a crash does not poison later restores", async () => {
  const probe = harness(repository(), "medium");
  const entry = (data) => ({ type: "custom", customType: "omp.gate-checker.journal", data: { version: 1, repo_root: probe.cwd, baseline_sha: null, baseline_dirty: [], policy_fingerprint: "old", ...data } });
  probe.session.branch = [entry({ kind: "request_start", request_id: "crashed" }), entry({ kind: "request_start", request_id: "later" }), entry({ kind: "terminal", request_id: "later", outcome: "passed" })];
  await start(probe);
  await probe.handlers.tool_call({ toolName: "read", toolCallId: "read-restored", input: { path: "src/a.txt" } }, probe.context);
  assert(await finish(probe, "looked again") === undefined, "a request left open by a crash must not force recovery once a later request closed");
});

test("record_frustration validates records and binds session identity on the server", async () => {
  const probe = harness(repository(), "medium");
  await start(probe);
  const input = { agent_id: "main", primary_goal: "optional capture validation", complaint: "none", type: "none", severity: "low", evidence: [] };
  const invalidClean = await probe.tools.record_frustration.execute("invalid-clean", { ...input, complaint: "actual friction" }, undefined, undefined, probe.context);
  assert(invalidClean.isError === true, "optional records must retain clean-record validation");
  const invalidType = await probe.tools.record_frustration.execute("invalid-type", { ...input, type: "not-in-taxonomy" }, undefined, undefined, probe.context);
  assert(invalidType.isError === true, "optional records must retain taxonomy validation");
  const invalidEvidence = await probe.tools.record_frustration.execute("invalid-evidence", { ...input, type: "tooling", complaint: "fixture error" }, undefined, undefined, probe.context);
  assert(invalidEvidence.isError === true, "real optional friction must still require valid evidence");
  const accepted = await probe.tools.record_frustration.execute("valid-optional", { ...input, session_file: "forged-child.jsonl", session_id: "forged-child", request_id: "forged-request", source: "auto" }, undefined, undefined, probe.context);
  assert(accepted.isError !== true, "valid optional record should be accepted");
  const records = readFileSync(process.env.OMP_GATE_FRUSTRATIONS, "utf8").trim().split("\n").map((line) => JSON.parse(line));
  const stored = records.find((record) => record.primary_goal === input.primary_goal);
  assert(stored?.session_file === probe.session.file && stored.session_id === probe.session.id && stored.source === "agent" && stored.request_id !== "forged-request", "optional record caller must not override server-bound session/request/source identity");
});

test("high blocks failed verification and dirty tracked work", async () => {
  const probe = harness(repository(), "high", "false");
  await start(probe);
  await writeChange(probe, "two\n");
  const result = await finish(probe, "updated the file");
  assert(result?.continue === true, "high must block failed verification and dirty tracked work");
  assert(result.additionalContext.includes("verify_failed"), "high must report verify_failed");
  assert(result.additionalContext.includes("uncommitted_changes"), "high must report dirty tracked work");
});

test("medium releases verified work next to an untracked nested repository", async () => {
  const cwd = repository();
  mkdirSync(join(cwd, "nested"));
  git(join(cwd, "nested"), "init", "-q");
  const probe = harness(cwd, "medium", "true");
  await start(probe);
  await writeChange(probe, "two\n");
  const result = await finish(probe, "updated the file");
  assert(result === undefined, "medium must release verified uncommitted work");
  assert(probe.entries.find((entry) => entry.data.kind === "request_start")?.data.baseline_sha, "an untracked nested repository must not switch the request to no-git mode");
  assert(probe.entries.some((entry) => entry.data.kind === "verify"), "journal must record verification");
  assert(probe.entries.some((entry) => entry.data.kind === "terminal"), "journal must record terminal outcome");
});

test("baseline dirt is journaled as hashes and diffed from the blob store", async () => {
  const cwd = repository();
  writeFileSync(join(cwd, "src/b.ts"), "export const b = 1;\n");
  git(cwd, "add", ".");
  git(cwd, "commit", "-q", "-m", "add b");
  const before = `export const b = 1;\n// ${"FIX" + "ME"}: left before the request\n`;
  writeFileSync(join(cwd, "src/b.ts"), before);
  const probe = harness(cwd, "medium", "true");
  await start(probe);
  const journaled = probe.entries.find((entry) => entry.data.kind === "request_start")?.data.baseline_snapshots["src/b.ts"];
  assert(journaled?.hash && !("content" in journaled), "the journal must carry the baseline hash, never the content");
  writeFileSync(join(cwd, "src/b.ts"), `${before}// ${"TO" + "DO"}: implement\n`);
  const result = await finish(probe, "updated the file");
  assert(result?.additionalContext.includes("src/b.ts` line 3"), "the line added during the request must be judged");
  assert(!result.additionalContext.includes("src/b.ts` line 2"), "baseline dirt must stay out of the request");
});

test("audit reports an untracked nested repository as nested_repo, not binary content", async () => {
  const { resolvescope } = await import("./scope.js");
  const { auditscope } = await import("./risks.js");
  const cwd = repository();
  mkdirSync(join(cwd, "nested"));
  git(join(cwd, "nested"), "init", "-q");
  const scope = resolvescope({ kind: "uncommitted", cwd });
  const ids = auditscope(scope).findings.map((finding) => finding.id);
  assert(scope.files.some((file) => file.type === "nested_repo"), "the nested repository must be typed nested_repo");
  assert(ids.includes("risk.nested_repo") && !ids.includes("risk.binary"), "a nested repository must not be reported as binary content");
});

test("an unchanged large untracked file from before the request does not block scope", async () => {
  const cwd = repository();
  writeFileSync(join(cwd, "notes.txt"), "x".repeat(2 * 1024 * 1024 + 1));
  const probe = harness(cwd, "medium", "true");
  await start(probe);
  await writeChange(probe, "two\n");
  assert(await finish(probe, "updated the file") === undefined, "unchanged baseline dirt must not be read as request content");
});

test("committing after interrogate keeps the interrogation", async () => {
  const probe = harness(repository(), "medium", "true");
  await start(probe);
  await writeChange(probe, "export const value = 1;\n", "write-new", "src/new.ts");
  await probe.tools.interrogate.execute("interrogate-1", { unnecessary: "none", deleted: "none", simplified: "none" }, undefined, undefined, probe.context);
  git(probe.cwd, "add", ".");
  git(probe.cwd, "commit", "-q", "-m", "add new");
  assert(await finish(probe, "added the file and committed it") === undefined, "committing after interrogate must not reopen the interrogation");
});

test("only a runner at a command boundary counts as a test run", async () => {
  const probe = harness(repository(), "medium");
  await start(probe);
  await writeChange(probe, "two\n");
  const bash = (command) => probe.handlers.tool_result({ toolName: "bash", toolCallId: command, input: { command }, content: [{ type: "text", text: "" }], isError: false }, probe.context);
  await bash("grep -rn jest package.json");
  assert((await finish(probe, "updated the file"))?.additionalContext.includes("no_test_run"), "an incidental runner name must not count as a test run");
  await bash("cd src && bun test");
  assert(await finish(probe, "updated the file") === undefined, "a runner at a command boundary must count as a test run");
});

test("low warns instead of blocking and records gate telemetry", async () => {
  const probe = harness(repository(), "low", "false");
  await start(probe);
  await writeChange(probe, "two\n");
  const result = await finish(probe, "updated the file");
  assert(result === undefined, "low must warn instead of blocking failed delivery gates");
  assert(probe.notices.some((notice) => notice.message.includes("warning")), "low must surface warnings");
  assert(readFileSync(process.env.OMP_GATE_LEDGER, "utf8").includes("gate_eval"), "warnings must write gate telemetry");
});

test("off skips fabricated-claim enforcement", async () => {
  const probe = harness(repository(), "off");
  await start(probe);
  const result = await finish(probe, "modified `src/missing.ts`");
  assert(result === undefined, "off must skip fabricated-claim enforcement");
});

test("task calls keep native arguments and subagent manifests must match the diff", async () => {
  const probe = harness(repository(), "medium", "true");
  await start(probe);
  await writeChange(probe, "two\n");
  const taskInput = { agent: "reviewer", isolated: true, task: "inspect the change" };
  const routed = await probe.handlers.tool_call({ toolName: "task", toolCallId: "task-1", input: taskInput }, probe.context);
  assert(routed.input.task.includes("changed-files"), "task calls must receive the gate contract");
  assert(routed.input.agent === "reviewer" && routed.input.isolated === true, "the revised task input must keep unmodeled native arguments");
  await probe.handlers.tool_result({
    toolName: "task",
    toolCallId: "task-1",
    input: taskInput,
    content: [
      { type: "text", text: "changed `src/missing.ts`\n<changed-files>\nsrc/missing.ts\n</changed-files>" },
      { type: "image", data: "aGk=", mimeType: "image/png" },
    ],
    isError: false,
  }, probe.context);
  const result = await finish(probe, "the subagent reported its change");
  assert(result?.additionalContext.includes("subagent_manifest_mismatch"), "subagent manifests must match the request diff");
});

test("no-git first-touch snapshots catch added markers", async () => {
  const cwd = temp("gates-test-no-git-");
  mkdirSync(join(cwd, "src"));
  writeFileSync(join(cwd, "src/a.ts"), "export const value = 1;\n");
  const probe = harness(cwd, "medium", "true");
  await start(probe);
  await writeChange(probe, `export const value = 2;\n// ${"TO" + "DO"}: implement\n`, "write-1", "src/a.ts");
  const result = await finish(probe, "updated the file");
  assert(result?.additionalContext.includes("forbidden_marker"), "no-git first-touch snapshots must catch added markers");
  assert(probe.statuses.some((status) => status.text.includes("low: no git")), "no-git mode must be visible");
});

test("raw git commit is blocked with the exact smart_commit command", async () => {
  const probe = harness(repository(), "medium", "true");
  await start(probe);
  for (const command of ["git diff --cached --quiet || git commit -am 'msg'", "git -C . commit -m msg", "git -c user.name=x commit -m msg", "command git commit -m msg"]) {
    const routed = await probe.handlers.tool_call({ toolName: "bash", toolCallId: "bash-1", input: { command } }, probe.context);
    assert(routed?.block === true && routed.reason.includes(commitScript), `raw git commit must be blocked with the exact smart_commit command: ${command}`);
  }
});

test("the lease protocol recovers dead claimants and stale holders without losing fencing", async () => {
  const cwd = repository();
  const lease = await acquirelease({
    cwd,
    owner_id: "owner-1",
    request_id: "request-1",
    session_id: "session-1",
    session_file: join(stateRoot, "lease-session.jsonl"),
    agent_id: "main",
    tool_call_id: "write-1",
    tool_name: "write",
    target: "src/a.txt",
    acquisition_wait_ms: 0,
  });
  assert(lease.acquired === true, "mutation lease must acquire");
  assert(inspectlease({ cwd }).status === "held", "mutation lease must be inspectable");
  writeFileSync(join(lease.path, "lease.json.claims", "000-dead"), `${JSON.stringify({
    token: "dead-claim",
    pid: 2_147_483_647,
    claimed_at: lease.heartbeat_at,
  })}\n`);
  assert(heartbeatlease(lease, {
    now: lease.heartbeat_at + 3_000,
    dead_pid_grace_ms: 2_000,
  }) === true, "heartbeat must reclaim a dead contender claim");
  assert(releaselease(lease) === true, "mutation lease must release its owner");
  assert(inspectlease({ cwd }).status === "free", "released mutation lease must be free");
  const stale = await acquirelease({
    cwd,
    owner_id: "owner-2",
    request_id: "request-2",
    session_id: "session-2",
    session_file: join(stateRoot, "stale-session.jsonl"),
    agent_id: "main",
    tool_call_id: "write-2",
    tool_name: "write",
    target: "src/a.txt",
    acquisition_wait_ms: 0,
  });
  assert(stale.pid === process.pid, "stale recovery fixture must keep a live holder pid");
  mkdirSync(join(stale.path, ".guard"));
  const staleClaims = join(stale.path, "lease.json.claims");
  const deadWinner = join(staleClaims, "dead-stale-claim");
  writeFileSync(deadWinner, `${JSON.stringify({
    token: "dead-stale-claim",
    pid: 2_147_483_647,
    claimed_at: stale.heartbeat_at,
  })}\n`);
  linkSync(deadWinner, join(staleClaims, ".winner"));
  assert(releasestalelease(stale, {
    now: stale.heartbeat_at + 2_000,
    stale_heartbeat_ms: 1_000,
  }) === true, "expired heartbeat must release even while the holder pid remains live");
  assert(inspectlease({ cwd }).status === "free", "stale recovery must clear the held lease");
  const successor = await acquirelease({
    cwd,
    owner_id: "owner-3",
    request_id: "request-3",
    session_id: "session-3",
    session_file: join(stateRoot, "successor-session.jsonl"),
    agent_id: "main",
    tool_call_id: "write-3",
    tool_name: "write",
    target: "src/a.txt",
    acquisition_wait_ms: 0,
  });
  assert(successor.acquired === true, "successor must acquire after stale recovery");
  assert(releaselease(stale) === false, "stale owner must not release its successor");
  assert(inspectlease({ cwd }).record.token === successor.token, "successor fencing token must remain current");
  assert(releaselease(successor) === true, "successor must release its own lease");
  const scope = identity(cwd);
  const pausedPath = join(scope.common_dir, "omp-gates", "leases", scope.key);
  mkdirSync(pausedPath, { recursive: true });
  writeFileSync(join(pausedPath, "lease.init"), `${JSON.stringify({
    pid: process.pid,
    claimed_at: 0,
    token: "paused-initializer",
  })}\n`);
  const paused = await acquirelease({
    cwd,
    owner_id: "owner-4",
    request_id: "request-4",
    session_id: "session-4",
    session_file: join(stateRoot, "paused-session.jsonl"),
    agent_id: "main",
    tool_call_id: "write-4",
    tool_name: "write",
    target: "src/a.txt",
    acquisition_wait_ms: 0,
    now: 31_000,
  });
  assert(paused.acquired === false && paused.status === "initializing", "live initializer must not be reclaimed by age");
  writeFileSync(join(pausedPath, "lease.init"), `${JSON.stringify({
    pid: 2_147_483_647,
    claimed_at: 0,
    token: "paused-initializer",
  })}\n`);
  const recovered = await acquirelease({
    cwd,
    owner_id: "owner-5",
    request_id: "request-5",
    session_id: "session-5",
    session_file: join(stateRoot, "recovered-session.jsonl"),
    agent_id: "main",
    tool_call_id: "write-5",
    tool_name: "write",
    target: "src/a.txt",
    acquisition_wait_ms: 0,
    now: 31_000,
    dead_pid_grace_ms: 2_000,
  });
  assert(recovered.acquired === true && recovered.recovered === true, "dead initializer must be reclaimed");
  assert(recovered.token !== "paused-initializer", "recovered initializer must publish a new generation token");
  assert(releaselease(recovered) === true, "recovered initializer successor must release");
});

test("the write wrapper holds the lease until the tool result", async () => {
  const cwd = repository();
  const probe = harness(cwd, "medium", "true", true);
  await start(probe);
  const input = { path: "src/a.txt", content: "leased\n" };
  await probe.tools.write.execute("lease-wrapper", input, undefined, undefined, probe.context);
  assert(inspectlease({ cwd }).status === "held", "extension wrapper must hold a lease during mutation");
  await probe.handlers.tool_result({
    toolName: "write",
    toolCallId: "lease-wrapper",
    input,
    content: [{ type: "text", text: "written" }],
    isError: false,
  }, probe.context);
  assert(inspectlease({ cwd }).status === "free", "tool result must release the wrapper lease");
});

test("stop_hook_active reaches the omnipotence stop decision", async () => {
  const seen = [];
  installOmnipotenceStop((event) => {
    seen.push(event.stop_hook_active);
    if (event.stop_hook_active) return;
    return { decision: "block", reason: "pending effect" };
  });
  const probe = harness(repository(), "off");
  const active = await probe.handlers.session_stop({ stop_hook_active: true }, probe.context);
  assert(active === undefined && seen[0] === true, "active stop hook must suppress a repeated omnipotence block");
  const inactive = await probe.handlers.session_stop({ stop_hook_active: false }, probe.context);
  assert(inactive?.decision === "block" && seen[1] === false, "inactive stop hook must retain pending-effect blocking");
  const absent = await probe.handlers.session_stop({}, probe.context);
  assert(absent?.decision === "block" && seen[2] === undefined, "legacy events must retain pending-effect blocking");
});

test("the questionnaire stop decision precedes omnipotence", async () => {
  installQuestionnaireStop(() => ({ continue: true, additionalContext: "questionnaire" }));
  installOmnipotenceStop(() => ({ continue: true, additionalContext: "omnipotence" }));
  const probe = harness(repository(), "off");
  await start(probe);
  const questionnaire = await finish(probe, "waiting");
  assert(questionnaire.additionalContext === "questionnaire", "questionnaire must precede omnipotence");
  resetQuestionnaireStop();
  const omnipotence = await finish(probe, "waiting");
  assert(omnipotence.additionalContext === "omnipotence", "omnipotence must run after questionnaire");
});
