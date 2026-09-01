import { execFileSync } from "node:child_process";
import {
  chmodSync,
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
const agentRoot = temp("gates-wiring-agent-");
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
  inspectlease,
  releaselease,
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
const zod = {
  object: () => schema,
  string: () => schema,
  array: () => schema,
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
    const taskInput = { task: "inspect the change" };
    const routed = await probe.handlers.tool_call({
      toolName: "task",
      toolCallId: "task-1",
      input: taskInput,
    }, probe.context);
    assert(routed.input.task.includes("changed-files"), "task calls must receive the gate contract");
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
    const routed = await probe.handlers.tool_call({
      toolName: "bash",
      toolCallId: "bash-1",
      input: { command: "git commit -m test" },
    }, probe.context);
    assert(routed.input.command.includes(commitScript), "commit calls must route through the installed script");
    assert(routed.input.command.includes("--no-push"), "commit routing must remain local");
    assert(routed.input.command.includes("'test'"), "commit routing must preserve unquoted messages");
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
    assert(heartbeatlease(lease) === true, "mutation lease heartbeat must renew");
    assert(releaselease(lease) === true, "mutation lease must release its owner");
    assert(inspectlease({ cwd }).status === "free", "released mutation lease must be free");
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
