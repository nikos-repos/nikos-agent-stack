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
