import { afterEach as aftereach, expect, test } from "bun:test";
import { execFileSync as execfilesync, spawnSync as spawnsync } from "node:child_process";
import {
  existsSync as existssync,
  mkdirSync as mkdirsync,
  mkdtempSync as mkdtempsync,
  readFileSync as readfilesync,
  rmSync as rmsync,
  writeFileSync as writefilesync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import gatechecker from "./index.ts";
import { acquirelease, inspectlease, releaselease } from "./lease.js";

const repos: string[] = [];

aftereach(() => {
  for (const repo of repos.splice(0)) rmsync(repo, { recursive: true, force: true });
});

function repo() {
  const cwd = mkdtempsync(join(tmpdir(), "gate-cli-audit-"));
  repos.push(cwd);
  const git = (...args: string[]) => execfilesync("git", args, { cwd, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "test");
  mkdirsync(join(cwd, "src"));
  writefilesync(join(cwd, "src/a.txt"), "one\n");
  git("add", ".");
  git("commit", "-q", "-m", "initial");
  return cwd;
}

function holder(cwd: string, overrides: Record<string, unknown> = {}) {
  return acquirelease({
    cwd,
    owner_id: "owner-cli",
    request_id: "request-cli",
    session_id: "session-cli",
    session_file: "session-cli.jsonl",
    agent_id: "agent-cli",
    tool_call_id: "call-cli",
    tool_name: "edit",
    target: "src/a.txt",
    pid: process.pid,
    acquisition_wait_ms: 0,
    poll_jitter_ms: 0,
    ...overrides,
  });
}

function runlease(cwd: string, ...args: string[]) {
  return spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "lease", ...args, "--cwd", cwd],
    { encoding: "utf8" },
  );
}

test("audit prints a deterministic uncommitted scope without exposing a model tool", () => {
  const cwd = repo();
  writefilesync(join(cwd, "src/a.txt"), "two\n");
  const result = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "audit", "--kind", "uncommitted", "--cwd", cwd, "--json"],
    { encoding: "utf8" },
  );

  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.kind).toBe("uncommitted");
  expect(output.files.map((file) => file.path)).toEqual(["src/a.txt"]);
  expect(output.digest).toMatch(/^[a-f0-9]{64}$/);
});

test("stats use no-git names and retain historical counts", () => {
  const cwd = mkdtempsync(join(tmpdir(), "gate-cli-stats-"));
  repos.push(cwd);
  const ledger = join(cwd, "ledger.jsonl");
  writefilesync(
    ledger,
    '{"event":"degraded"}\n{"event":"no_git"}\n',
  );

  const json = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "stats", "--ledger", ledger, "--json"],
    { encoding: "utf8" },
  );
  expect(json.status).toBe(0);
  expect(JSON.parse(json.stdout).no_git_runs).toBe(2);

  const text = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "stats", "--ledger", ledger],
    { encoding: "utf8" },
  );
  expect(text.status).toBe(0);
  expect(text.stdout).toContain("low: no git runs 2");
  expect(text.stdout).not.toContain("degraded runs");
});

test("stats report frustration types, sources, and clean-under-errors events", () => {
  const cwd = mkdtempsync(join(tmpdir(), "gate-cli-stats2-"));
  repos.push(cwd);
  const ledger = join(cwd, "ledger.jsonl");
  writefilesync(
    ledger,
    '{"event":"no_git"}\n{"event":"clean_under_errors","rule":"clean_turn"}\n',
  );
  const scratch = join(cwd, "frustrations.jsonl");
  // exercise a valid taxonomy type that is also an object prototype key
  mkdirsync(join(cwd, ".omp"));
  writefilesync(join(cwd, ".omp", "gates-frustrations.json"), '{"types":["__proto__"]}');
  const record = (over: Record<string, unknown>) =>
    JSON.stringify({
      ts: "2026-08-14T00:00:00.000Z",
      request_id: "r1",
      agent_id: "a1",
      session_file: join(cwd, "session.jsonl"),
      session_id: "s1",
      primary_goal: "ship the rework",
      ...over,
    });
  writefilesync(
    scratch,
    [
      record({
        type: "tooling",
        severity: "medium",
        complaint: "slow tool",
        source: "agent",
        evidence: [{ kind: "command", command: "make", exit_code: 1, output: "fail" }],
      }),
      record({
        type: "none",
        severity: "low",
        complaint: "none",
        source: "auto",
        repo_root: cwd,
        evidence: [{ kind: "gate", event_id: "6f96e5b9-1c2d-4e8a-9f3b-7d5c0a8e2b14", rule: "clean_turn" }],
      }),
      record({
        type: "environment",
        severity: "low",
        complaint: "flaky network",
        evidence: [{ kind: "snapshot", path: "log", line: 1, digest: "d0", claim: "timeout" }],
      }),
      record({
        type: "__proto__",
        severity: "low",
        complaint: "prototype-like taxonomy key",
        source: "agent",
        repo_root: cwd,
        evidence: [{ kind: "command", command: "true", exit_code: 0, output: "" }],
      }),
    ].join("\n") + "\n",
  );
  const env = { ...process.env, OMP_GATE_FRUSTRATIONS: scratch };

  const json = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "stats", "--ledger", ledger, "--json"],
    { encoding: "utf8", env },
  );
  expect(json.status).toBe(0);
  const output = JSON.parse(json.stdout);
  expect(output.clean_under_errors).toBe(1);
  expect(output.frustrations.records).toBe(4);
  expect(output.frustrations.byType).toEqual(
    JSON.parse('{"tooling":1,"none":1,"environment":1,"__proto__":1}'),
  );
  expect(output.frustrations.bySource).toEqual({ agent: 2, auto: 1, legacy: 1 });

  const text = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "stats", "--ledger", ledger],
    { encoding: "utf8", env },
  );
  expect(text.status).toBe(0);
  expect(text.stdout).toContain("clean under errors 1");
  expect(text.stdout).toContain("frustrations     4  (agent 2, auto 1, legacy 1)");
  expect(text.stdout).toContain("frustration types:");
  expect(text.stdout).toContain("1  none");
});

test("stats still print the frustration summary when the ledger is empty", () => {
  const cwd = mkdtempsync(join(tmpdir(), "gate-cli-stats3-"));
  repos.push(cwd);
  const ledger = join(cwd, "ledger.jsonl");
  writefilesync(ledger, "");
  const scratch = join(cwd, "frustrations.jsonl");
  writefilesync(
    scratch,
    JSON.stringify({
      ts: "2026-08-14T00:00:00.000Z",
      request_id: "r1",
      agent_id: "a1",
      session_file: join(cwd, "session.jsonl"),
      session_id: "s1",
      primary_goal: "ship the rework",
      complaint: "none",
      type: "none",
      severity: "low",
      source: "agent",
      evidence: [{ kind: "gate", event_id: "e1", rule: "clean_turn" }],
    }) + "\n",
  );
  const env = { ...process.env, OMP_GATE_FRUSTRATIONS: scratch };

  const text = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "stats", "--ledger", ledger],
    { encoding: "utf8", env },
  );
  expect(text.status).toBe(0);
  expect(text.stdout).toContain("no gate activity recorded yet");
  expect(text.stdout).toContain("clean under errors 0");
  expect(text.stdout).toContain("frustrations     1  (agent 1, auto 0, legacy 0)");
  expect(text.stdout).toContain("1  none");
});

test("lease status prints rich holder metadata", () => {
  const root = repo();
  const cwd = join(root, "dir with spaces");
  mkdirsync(cwd);
  const lease = holder(cwd);
  const result = runlease(cwd, "status");

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("agent: agent-cli");
  expect(result.stdout).toContain("session: session-cli");
  expect(result.stdout).toContain("request: request-cli");
  expect(result.stdout).toContain("tool name: edit");
  expect(result.stdout).toContain("target: src/a.txt");
  expect(result.stdout).toContain("tool call: call-cli");
  expect(result.stdout).toContain(`pid: ${process.pid}`);
  expect(result.stdout).toContain("age: ");
  expect(result.stdout).toContain("heartbeat age: ");
  expect(result.stdout).toContain("fence: 1");
  expect(result.stdout).toContain("relation: unknown");
  expect(result.stdout).toContain(`inspect with: nikos-gates lease status --cwd '${cwd}'`);
  expect(releaselease(lease)).toBe(true);
});

test("lease status json exposes the current holder record", () => {
  const cwd = repo();
  const lease = holder(cwd);
  const result = runlease(cwd, "status", "--json");

  expect(result.status).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    status: "held",
    valid: true,
    record: {
      owner_id: "owner-cli",
      request_id: "request-cli",
      session_id: "session-cli",
      session_file: "session-cli.jsonl",
      agent_id: "agent-cli",
      tool_call_id: "call-cli",
      tool_name: "edit",
      target: "src/a.txt",
      pid: process.pid,
    },
  });
  expect(releaselease(lease)).toBe(true);
});

test("lease stale-only refuses a fresh heartbeat", () => {
  const cwd = repo();
  const lease = holder(cwd);
  const result = runlease(cwd, "release", "--stale-only");

  expect(result.status).toBe(1);
  expect(result.stderr).toContain("heartbeat is fresh");
  expect(inspectlease({ cwd }).status).toBe("held");
  expect(releaselease(lease)).toBe(true);
});

test("lease stale-only releases stale holders and records the manual release", () => {
  const cwd = repo();
  const lease = holder(cwd);
  const leasefile = join(lease.path, "lease.json");
  const record = JSON.parse(readfilesync(leasefile, "utf8"));
  record.acquired_at = 0;
  record.heartbeat_at = 0;
  writefilesync(leasefile, `${JSON.stringify(record)}\n`);
  const ledger = join(cwd, "manual-release.jsonl");
  const result = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "lease", "release", "--stale-only", "--cwd", cwd],
    { encoding: "utf8", env: { ...process.env, OMP_GATE_LEDGER: ledger } },
  );

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("released stale lease");
  expect(existssync(lease.path)).toBe(false);
  expect(inspectlease({ cwd }).status).toBe("free");
  expect(JSON.parse(readfilesync(ledger, "utf8"))).toMatchObject({
    event: "lease_manual_release",
    mode: "stale-only",
    reason: "stale heartbeat",
    owner_id: "owner-cli",
    tool_call_id: "call-cli",
  });
});

test("lease force requires a reason and exact holder identity", () => {
  const cwd = repo();
  const lease = holder(cwd);
  const missingreason = runlease(
    cwd,
    "release",
    "--force",
    "--owner-id",
    "owner-cli",
    "--tool-call-id",
    "call-cli",
  );
  expect(missingreason.status).toBe(2);
  expect(existssync(lease.path)).toBe(true);

  const mismatch = runlease(
    cwd,
    "release",
    "--force",
    "--owner-id",
    "wrong-owner",
    "--tool-call-id",
    "call-cli",
    "--reason",
    "operator authorization",
  );
  expect(mismatch.status).toBe(1);
  expect(mismatch.stderr).toContain("identity mismatch");
  expect(existssync(lease.path)).toBe(true);
  expect(releaselease(lease)).toBe(true);
});

test("lease force removes the physical holder and records the reason", () => {
  const cwd = repo();
  const lease = holder(cwd);
  const ledger = join(cwd, "manual-force.jsonl");
  const result = spawnsync(
    "bun",
    [
      "run",
      join(import.meta.dir, "gate-cli.js"),
      "lease",
      "release",
      "--cwd",
      cwd,
      "--force",
      "--owner-id",
      "owner-cli",
      "--tool-call-id",
      "call-cli",
      "--reason",
      "operator authorization",
    ],
    { encoding: "utf8", env: { ...process.env, OMP_GATE_LEDGER: ledger } },
  );

  expect(result.status).toBe(0);
  expect(result.stdout).toContain("released lease");
  expect(existssync(lease.path)).toBe(false);
  expect(JSON.parse(readfilesync(ledger, "utf8"))).toMatchObject({
    event: "lease_manual_release",
    mode: "force",
    reason: "operator authorization",
    owner_id: "owner-cli",
    tool_call_id: "call-cli",
  });
});


function agentdir() {
  const cwd = mkdtempsync(join(tmpdir(), "gate-cli-advisor-"));
  repos.push(cwd);
  return cwd;
}


function install(agent: string, ...args: string[]) {
  return spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "advisor", ...args],
    {
      encoding: "utf8",
      env: {
        ...process.env,
        omp_agent_dir: join(agent, "legacy"),
        PI_CODING_AGENT_DIR: agent,
      },
    },
  );
}

const watchdogfile = "WATCHDOG.yml";
const watchdogyaml = "WATCHDOG.yaml";
const packagedterra = Bun.YAML.parse(
  readfilesync(join(import.meta.dir, "..", "advisor", watchdogfile), "utf8"),
).advisors[0];

test("advisor install creates a native terra watchdog", () => {
  const root = agentdir();
  const agent = join(root, "agent");
  expect(existssync(agent)).toBe(false);

  const result = install(agent, "install");

  expect(result.status).toBe(0);
  expect(existssync(join(agent, watchdogfile))).toBe(true);
  expect(
    Bun.YAML.parse(readfilesync(join(agent, watchdogfile), "utf8")).advisors,
  ).toEqual([packagedterra]);
  expect(result.stdout).toContain("start a new omp session");
});

test("advisor install preserves existing instructions and unrelated advisors", () => {
  const agent = agentdir();
  const security = { name: "security", model: "openai/gpt-5", tools: ["read"] };
  writefilesync(
    join(agent, watchdogfile),
    Bun.YAML.stringify({
      instructions: "keep this shared instruction",
      advisors: [security],
    }),
  );

  const result = install(agent, "install");
  const config = Bun.YAML.parse(readfilesync(join(agent, watchdogfile), "utf8"));

  expect(result.status).toBe(0);
  expect(config.instructions).toBe("keep this shared instruction");
  expect(config.advisors).toEqual([security, packagedterra]);
});

test("advisor install replaces terra by normalized name", () => {
  const agent = agentdir();
  const security = { name: "security", model: "openai/gpt-5" };
  writefilesync(
    join(agent, watchdogfile),
    Bun.YAML.stringify({
      advisors: [
        { name: " terra! ", model: "old-model", enabled: false },
        security,
      ],
    }),
  );

  const result = install(agent, "install");
  const config = Bun.YAML.parse(readfilesync(join(agent, watchdogfile), "utf8"));

  expect(result.status).toBe(0);
  expect(config.advisors).toEqual([security, packagedterra]);
});

test("advisor install is idempotent", () => {
  const agent = agentdir();

  expect(install(agent, "install").status).toBe(0);
  const first = readfilesync(join(agent, watchdogfile), "utf8");
  expect(install(agent, "install").status).toBe(0);

  expect(readfilesync(join(agent, watchdogfile), "utf8")).toBe(first);
  expect(Bun.YAML.parse(first).advisors).toEqual([packagedterra]);
});
test("advisor install updates an existing WATCHDOG.yaml", () => {
  const agent = agentdir();
  const security = { name: "security", model: "openai/gpt-5" };
  writefilesync(
    join(agent, watchdogyaml),
    Bun.YAML.stringify({ advisors: [security] }),
  );

  const result = install(agent, "install");

  expect(result.status).toBe(0);
  expect(existssync(join(agent, watchdogfile))).toBe(false);
  expect(
    Bun.YAML.parse(readfilesync(join(agent, watchdogyaml), "utf8")).advisors,
  ).toEqual([security, packagedterra]);
});

test("advisor install prefers WATCHDOG.yml over WATCHDOG.yaml", () => {
  const agent = agentdir();
  const ymlsecurity = { name: "yml security" };
  const yamlbefore = "advisors:\n  - name: yaml security\n";
  writefilesync(
    join(agent, watchdogfile),
    Bun.YAML.stringify({ advisors: [ymlsecurity] }),
  );
  writefilesync(join(agent, watchdogyaml), yamlbefore);

  const result = install(agent, "install");

  expect(result.status).toBe(0);
  expect(
    Bun.YAML.parse(readfilesync(join(agent, watchdogfile), "utf8")).advisors,
  ).toEqual([ymlsecurity, packagedterra]);
  expect(readfilesync(join(agent, watchdogyaml), "utf8")).toBe(yamlbefore);
});
test("advisor install keeps an invalid WATCHDOG.yaml unchanged", () => {
  const agent = agentdir();
  const before = "advisors: security\n";
  writefilesync(join(agent, watchdogyaml), before);

  const result = install(agent, "install");

  expect(result.status).toBe(2);
  expect(existssync(join(agent, watchdogfile))).toBe(false);
  expect(readfilesync(join(agent, watchdogyaml), "utf8")).toBe(before);
});



const invalidwatchdogs: Array<[string, string]> = [
  ["invalid yaml", "advisors: ["],
  ["a non-mapping document", "- name: security\n"],
  ["non-string instructions", "instructions: []\nadvisors: []\n"],
  ["a non-list advisors field", "advisors: security\n"],
  ["a non-mapping advisor entry", "advisors:\n  - security\n"],
  ["a missing advisor name", "advisors:\n  - model: openai/gpt-5\n"],
  ["a non-string advisor model", "advisors:\n  - name: security\n    model: false\n"],
  ["non-string advisor instructions", "advisors:\n  - name: security\n    instructions: []\n"],
  ["a non-list advisor tools field", "advisors:\n  - name: security\n    tools: read\n"],
  ["a non-string advisor tool", "advisors:\n  - name: security\n    tools: [read, false]\n"],
  ["a non-boolean advisor enabled field", "advisors:\n  - name: security\n    enabled: \"false\"\n"],
];

for (const [label, before] of invalidwatchdogs) {
  test(`advisor install keeps ${label} unchanged`, () => {
    const agent = agentdir();
    writefilesync(join(agent, watchdogfile), before);

    const result = install(agent, "install");

    expect(result.status).toBe(2);
    expect(readfilesync(join(agent, watchdogfile), "utf8")).toBe(before);
  });
}

test("advisor rejects unknown subcommands", () => {
  const agent = agentdir();
  const result = install(agent, "remove");

  expect(result.status).toBe(2);
  expect(existssync(join(agent, watchdogfile))).toBe(false);
  expect(result.stderr).toContain("unknown subcommand");
});

type advisorcommand = {
  handler: (args: string, ctx: unknown) => Promise<void>;
};

const advisorschema = {
  describe() {
    return this;
  },
  min() {
    return this;
  },
  optional() {
    return this;
  },
};

const advisorzod = {
  object: (_shape: unknown) => advisorschema,
  string: () => advisorschema,
  array: (_item: unknown) => advisorschema,
  union: (_items: unknown[]) => advisorschema,
  number: () => advisorschema,
  literal: (_value: string) => advisorschema,
};

function registeredadvisorcommand() {
  const commands = new Map<string, advisorcommand>();
  gatechecker({
    zod: advisorzod,
    on: () => {},
    registerCommand: (name: string, command: advisorcommand) => {
      commands.set(name, command);
    },
    registerTool: () => {},
    events: { on: () => {} },
    appendEntry: () => {},
  } as never);
  const command = commands.get("advisor-install");
  if (!command) throw new Error("advisor-install was not registered");
  return command;
}

test("advisor-install registers and notifies after setup", async () => {
  const agent = agentdir();
  const original = process.env.PI_CODING_AGENT_DIR;
  const notifications: Array<{ message: string; level: string }> = [];
  process.env.PI_CODING_AGENT_DIR = agent;
  try {
    await registeredadvisorcommand().handler("", {
      ui: {
        notify: (message: string, level: string) => {
          notifications.push({ message, level });
        },
      },
    });
  } finally {
    if (original === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = original;
  }

  expect(existssync(join(agent, watchdogfile))).toBe(true);
  expect(notifications).toEqual([
    {
      message:
        `advisor install: installed terra at ${join(agent, watchdogfile)}\n` +
        "start a new omp session to activate terra",
      level: "info",
    },
  ]);
});
