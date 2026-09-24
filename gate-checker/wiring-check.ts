import { execFileSync } from "node:child_process";
import {
  chmodSync,
  linkSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const roots = [];
const temp = (prefix) => {
  const path = mkdtempSync(join(tmpdir(), prefix));
  roots.push(path);
  return path;
};
const stateRoot = temp("gates-wiring-state-");
const agentRoot = temp("gates wiring agent-");
const commitScript = join(agentRoot, "skills/git-commit/scripts/smart_commit.sh");
mkdirSync(join(commitScript, ".."), { recursive: true });
writeFileSync(commitScript, "#!/bin/sh\nexit 0\n");
chmodSync(commitScript, 0o755);
process.env.OMP_GATE_CONFIG = join(stateRoot, "config.json");
process.env.OMP_GATE_LEDGER = join(stateRoot, "ledger.jsonl");
process.env.OMP_GATE_FRUSTRATIONS = join(stateRoot, "frustrations.jsonl");
process.env.OMP_GATE_MUTATION_LEASE = "off";
process.env.PI_CODING_AGENT_DIR = agentRoot;
// dynamic imports are required because module-level paths bind after the isolated env above.

const gateChecker = (await import("./index.ts")).default;
const {
  acquirelease,
  heartbeatlease,
  identity,
  inspectlease,
  releaselease,
  releasestalelease,
} = await import("./lease.js");
const {
  installQuestionnaireStop,
  resetQuestionnaireStop,
} = await import("../ask-questionnaire/stop-decision.ts");
const {
  installOmnipotenceStop,
  resetOmnipotenceStop,
} = await import("../omnipotence/stop-decision.ts");

const assert = (condition, message) => {
  if (!condition) throw new Error(`wiring check failed: ${message}`);
};
const git = (cwd, ...args) => execFileSync("git", args, {
  cwd,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}).trim();
const repository = () => {
  const cwd = temp("gates-wiring-repo-");
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

const schema = {
  describe() { return this; },
  min() { return this; },
  optional() { return this; },
  safeParse(value) { return { success: true, data: value }; },
};
// strips unknown keys at every depth, like omp's zod.
const zod = {
  object: (shape) => ({
    ...schema,
    safeParse(value) {
      if (!value || typeof value !== "object") return { success: true, data: value };
      const data = {};
      for (const [key, field] of Object.entries(shape)) if (key in value) data[key] = field.safeParse(value[key]).data;
      return { success: true, data };
    },
  }),
  string: () => schema,
  array: (item) => ({
    ...schema,
    safeParse(value) { return { success: true, data: Array.isArray(value) ? value.map((entry) => item.safeParse(entry).data) : value }; },
  }),
  union: () => schema,
  number: () => schema,
  literal: () => schema,
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
      parameters: schema,
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
const recordClean = async (probe) => probe.tools.record_frustration.execute(
  "friction-1",
  {
    agent_id: "main",
    primary_goal: "run gate wiring check",
    complaint: "none",
    type: "none",
    severity: "low",
    evidence: [],
  },
  undefined,
  undefined,
  probe.context,
);

try {
  // Optional friction coverage must never create a delivery continuation.
  for (const level of ["low", "medium", "high"]) {
    const probe = harness(repository(), level);
    await start(probe);
    await probe.handlers.tool_call({ toolName: "read", toolCallId: "read-optional", input: { path: "src/a.txt" } }, probe.context);
    const first = await finish(probe, "review complete");
    const second = await finish(probe, "review complete");
    assert(first === undefined && second === undefined, `${level}: absent main friction record must not force a continuation`);
    assert(!probe.entries.some((entry) => entry.data.kind === "continuation"), `${level}: friction absence must not create an administrative chain`);
    assert(probe.notices.some((notice) => notice.message.includes("missing_frustration_record")), `${level}: optional coverage warning remains observable`);
  }

  for (const level of ["low", "medium", "high"]) {
    const probe = harness(repository(), level);
    await start(probe);
    const childFile = join(stateRoot, `child-${level}.jsonl`);
    probe.events["task:subagent:lifecycle"]({ id: `child-${level}`, agent: "reviewer", status: "completed", sessionFile: childFile });
    probe.events["task:subagent:event"]({ id: `child-${level}`, event: { type: "message_end", message: { role: "assistant", content: "<changed-files>\n</changed-files>" } } });
    await probe.handlers.tool_call({ toolName: "read", toolCallId: "read-child", input: { path: "src/a.txt" } }, probe.context);
    await recordClean(probe);
    const result = await finish(probe, "review complete");
    assert(result === undefined, `${level}: missing child friction record must remain optional`);
    assert(probe.notices.some((notice) => notice.message.includes("missing_frustration_record")), `${level}: a main record must not satisfy child-session coverage`);
  }

  {
    const probe = harness(repository(), "medium");
    await start(probe);
    await probe.handlers.tool_call({ toolName: "ask", toolCallId: "ask-optional", input: {} }, probe.context);
    const result = await finish(probe, "waiting for the user's answer");
    assert(result === undefined, "no-change question must release without a friction record");
    assert(probe.entries.some((entry) => entry.data.kind === "terminal" && entry.data.outcome === "skipped_user_question"), "optional friction must not prevent the ordinary user-question skip");
  }

  {
    const probe = harness(repository(), "medium");
    probe.session.branch = [{ type: "custom", customType: "omp.gate-checker.journal", data: { invalid: true } }];
    await probe.handlers.session_start({}, probe.context);
    await probe.handlers.tool_call({ toolName: "ask", toolCallId: "ask-recovery", input: {} }, probe.context);
    const result = await finish(probe, "waiting for the user's answer");
    assert(result?.additionalContext.includes("recovery_required"), "optional friction must not bypass real journal recovery after a user question");
  }

  {
    const probe = harness(repository(), "medium", "false");
    await start(probe);
    const childFile = join(stateRoot, "missing-mixed-child.jsonl");
    probe.events["task:subagent:lifecycle"]({ id: "missing-mixed-child", agent: "reviewer", status: "completed", sessionFile: childFile });
    await writeChange(probe, "two\n");
    const result = await finish(probe, "updated the file");
    assert(result?.additionalContext.includes("verify_failed"), "missing optional coverage must not release failed verification");
    assert(!result.additionalContext.includes("missing_frustration_record"), "optional friction must not enter substantive continuation instructions");
    const records = readFileSync(process.env.OMP_GATE_FRUSTRATIONS, "utf8").trim().split("\n").map((line) => JSON.parse(line));
    const automatic = records.find((record) => record.session_file === probe.session.file && record.source === "auto" && record.evidence.some((item) => item.rule === "verify_failed"));
    assert(automatic?.session_id === probe.session.id && automatic.request_id, "automatic material failure must preserve native session/request identity");
    assert(!records.some((record) => record.session_file === childFile), "automatic main failure must not manufacture child coverage");
  }

  {
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
  }

  {
    const { policyFor } = await import("./config.js");
    for (const level of ["low", "medium", "high"]) {
      const modes = policyFor(level);
      assert(modes.scratchpad === "warn", `${level}: optional scratchpad policy must warn`);
      assert(modes.runtime === (level === "low" ? "warn" : "block"), `${level}: runtime integrity policy must remain unchanged`);
      assert(modes.citation === (level === "low" ? "warn" : "block"), `${level}: claim evidence policy must remain unchanged`);
      assert(modes.verify === (level === "low" ? "warn" : "block"), `${level}: substantive verification policy must remain unchanged`);
    }
    assert(policyFor("off").scratchpad === "off", "disabled friction policy must remain off");
    const probe = harness(repository(), "medium");
    await start(probe);
    const routed = await probe.handlers.tool_call({ toolName: "task", toolCallId: "optional-task", input: { task: "review" } }, probe.context);
    assert(routed.input.task.includes("friction capture is optional"), "child instructions must describe friction capture as optional");
    assert(routed.input.task.includes("changed-files"), "optional friction must preserve child claim/manifest guidance");
  }

  {
    const probe = harness(repository(), "high", "false");
    await start(probe);
    await writeChange(probe, "two\n");
    const result = await finish(probe, "updated the file");
    assert(result?.continue === true, "high must block failed verification and dirty tracked work");
    assert(result.additionalContext.includes("verify_failed"), "high must report verify_failed");
    assert(result.additionalContext.includes("uncommitted_changes"), "high must report dirty tracked work");
  }

  {
    const probe = harness(repository(), "medium", "true");
    await start(probe);
    await writeChange(probe, "two\n");
    await recordClean(probe);
    const result = await finish(probe, "updated the file");
    assert(result === undefined, "medium must release verified uncommitted work");
    assert(probe.entries.some((entry) => entry.data.kind === "request_start"), "journal must record request_start");
    assert(probe.entries.some((entry) => entry.data.kind === "verify"), "journal must record verification");
    assert(probe.entries.some((entry) => entry.data.kind === "terminal"), "journal must record terminal outcome");
  }

  {
    const probe = harness(repository(), "low", "false");
    await start(probe);
    await writeChange(probe, "two\n");
    const result = await finish(probe, "updated the file");
    assert(result === undefined, "low must warn instead of blocking failed delivery gates");
    assert(probe.notices.some((notice) => notice.message.includes("warning")), "low must surface warnings");
  }

  {
    const probe = harness(repository(), "off");
    await start(probe);
    const result = await finish(probe, "modified `src/missing.ts`");
    assert(result === undefined, "off must skip fabricated-claim enforcement");
  }

  {
    const probe = harness(repository(), "medium", "true");
    await start(probe);
    await writeChange(probe, "two\n");
    const taskInput = { agent: "reviewer", isolated: true, task: "inspect the change" };
    const routed = await probe.handlers.tool_call({
      toolName: "task",
      toolCallId: "task-1",
      input: taskInput,
    }, probe.context);
    assert(routed.input.task.includes("changed-files"), "task calls must receive the gate contract");
    assert(routed.input.agent === "reviewer" && routed.input.isolated === true, "the revised task input must keep unmodeled native arguments");
    await probe.handlers.tool_result({
      toolName: "task",
      toolCallId: "task-1",
      input: taskInput,
      content: [{ type: "text", text: "changed `src/missing.ts`\n<changed-files>\nsrc/missing.ts\n</changed-files>" }],
      isError: false,
    }, probe.context);
    const result = await finish(probe, "the subagent reported its change");
    assert(result?.additionalContext.includes("subagent_manifest_mismatch"), "subagent manifests must match the request diff");
  }

  {
    const cwd = temp("gates-wiring-no-git-");
    mkdirSync(join(cwd, "src"));
    writeFileSync(join(cwd, "src/a.ts"), "export const value = 1;\n");
    const probe = harness(cwd, "medium", "true");
    await start(probe);
    await writeChange(probe, `export const value = 2;\n// ${"TO" + "DO"}: implement\n`, "write-1", "src/a.ts");
    const result = await finish(probe, "updated the file");
    assert(result?.additionalContext.includes("forbidden_marker"), "no-git first-touch snapshots must catch added markers");
    assert(probe.statuses.some((status) => status.text.includes("low: no git")), "no-git mode must be visible");
  }

  {
    const probe = harness(repository(), "medium", "true");
    await start(probe);
    const commitPath = "src/committed file.txt";
    writeFileSync(join(probe.cwd, commitPath), "commit selected\n");
    writeFileSync(join(probe.cwd, "src/unselected.txt"), "leave unstaged\n");
    writeFileSync(commitScript, "#!/bin/sh\nexec git commit -q -m \"$1\"\n");
    const routed = await probe.handlers.tool_call({
      toolName: "bash",
      toolCallId: "bash-1",
      input: { command: `git add -- '${commitPath}' && git commit -m 'scoped message' && test -f '${commitPath}'` },
    }, probe.context);
    execFileSync("sh", ["-c", routed.input.command], { cwd: probe.cwd, stdio: "pipe" });
    assert(git(probe.cwd, "show", "--format=", "--name-only", "HEAD") === commitPath, "commit routing must preserve explicit staging scope");
    assert(git(probe.cwd, "log", "-1", "--format=%s") === "scoped message", "commit routing must preserve the message");

    writeFileSync(commitScript, "#!/bin/sh\nwhile [ \"$#\" -gt 0 ] && [ \"$1\" != \"--\" ]; do shift; done\nshift\ngit add -- \"$@\"\n");
    const selectedPath = "src/selected file.txt";
    writeFileSync(join(probe.cwd, selectedPath), "selected\n");
    writeFileSync(join(probe.cwd, "src/unselected.txt"), "leave unstaged\n");
    const scoped = await probe.handlers.tool_call({
      toolName: "bash",
      toolCallId: "bash-scoped",
      input: { command: `bash '${commitScript}' --stage-only --whole-paths -- '${selectedPath}'` },
    }, probe.context);
    execFileSync("sh", ["-c", scoped.input.command], { cwd: probe.cwd, stdio: "pipe" });
    assert(git(probe.cwd, "diff", "--cached", "--name-only") === selectedPath, "scoped commit routing must stage only the selected path");
  }

  {
    const probe = harness(repository(), "medium");
    await start(probe);
    await probe.handlers.tool_call({
      toolName: "ask",
      toolCallId: "ask-1",
      input: {},
    }, probe.context);
    await recordClean(probe);
    const result = await finish(probe, "waiting for the user's answer");
    assert(result === undefined, "a recorded no-change user question must release");
  }

  {
    const cwd = repository();
    const lease = acquirelease({
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
    const stale = acquirelease({
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
    const successor = acquirelease({
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
    const paused = acquirelease({
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
    const recovered = acquirelease({
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
  }

  {
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
  }
  {
    resetQuestionnaireStop();
    resetOmnipotenceStop();
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
    resetOmnipotenceStop();
  }
  {
    resetQuestionnaireStop();
    resetOmnipotenceStop();
    installQuestionnaireStop(() => ({ continue: true, additionalContext: "questionnaire" }));
    installOmnipotenceStop(() => ({ continue: true, additionalContext: "omnipotence" }));
    const probe = harness(repository(), "off");
    await start(probe);
    const questionnaire = await finish(probe, "waiting");
    assert(questionnaire.additionalContext === "questionnaire", "questionnaire must precede omnipotence");
    resetQuestionnaireStop();
    const omnipotence = await finish(probe, "waiting");
    assert(omnipotence.additionalContext === "omnipotence", "omnipotence must run after questionnaire");
    resetOmnipotenceStop();
  }

  const ledger = readFileSync(process.env.OMP_GATE_LEDGER, "utf8");
  assert(ledger.includes("gate_eval"), "wiring scenarios must write gate telemetry");
  console.log("gate wiring: all checks passed");
} finally {
  resetQuestionnaireStop();
  resetOmnipotenceStop();
  for (const root of roots.reverse()) rmSync(root, { recursive: true, force: true });
}
