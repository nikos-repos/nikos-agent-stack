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
  // a repo taxonomy extension admits "none" before it is a fixed type
  mkdirsync(join(cwd, ".omp"));
  writefilesync(join(cwd, ".omp", "gates-frustrations.json"), '{"types":["none"]}');
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
  expect(output.frustrations.records).toBe(3);
  expect(output.frustrations.byType).toEqual({ tooling: 1, none: 1, environment: 1 });
  expect(output.frustrations.bySource).toEqual({ agent: 1, auto: 1, legacy: 1 });

  const text = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "stats", "--ledger", ledger],
    { encoding: "utf8", env },
  );
  expect(text.status).toBe(0);
  expect(text.stdout).toContain("clean under errors 1");
  expect(text.stdout).toContain("frustrations     3  (agent 1, auto 1, legacy 1)");
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
  expect(text.stdout).toContain("frustrations     1  (agent 1, auto 0, legacy 0)");
  expect(text.stdout).toContain("1  none");
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
