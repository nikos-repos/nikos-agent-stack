import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { startStub, type Scenario } from "./stub-provider.ts";

type HarnessProcess = Pick<ReturnType<typeof Bun.spawn>, "kill" | "exited"> & {
  stdin: NonNullable<Exclude<ReturnType<typeof Bun.spawn>["stdin"], number>>;
  stdout: NonNullable<Exclude<ReturnType<typeof Bun.spawn>["stdout"], number>>;
  stderr: NonNullable<Exclude<ReturnType<typeof Bun.spawn>["stderr"], number>>;
};
const active = new Map<string, { root: string; stop(): Promise<void>; running: Set<HarnessProcess> }>();

/** A profile uses only its disposable home, XDG roots, workspace, and local stub. */
export type HarnessProfile = {
  root: string;
  home: string;
  workspace: string;
  capture: string;
  stubUrl: string;
  run(args: string[], options?: { cwd: string }): Promise<{ exitCode: number; stdout: string; stderr: string }>;
  spawn(args: string[], options?: { cwd: string }): HarnessProcess;
  teardown(): Promise<void>;
};

/** Creates a disposable profile; only explicit Orca-terminal gates inherit routing variables. */
export async function create(name: string, options: { orcaTerminal?: boolean } = {}): Promise<HarnessProfile> {
  if (!/^[A-Za-z0-9_-]+$/.test(name) || active.has(name)) throw new Error("Invalid or active harness profile name");
  const root = await mkdtemp(join(tmpdir(), "omp-orca-harness-"));
  const home = join(root, "home");
  const workspace = join(root, "workspace");
  const config = join(home, ".omp", "profiles", name, "agent");
  const capture = join(root, "captures.jsonl");
  let stop: (() => Promise<void>) | undefined;
  const running = new Set<HarnessProcess>();
  try {
    for (const dir of [home, workspace, config, join(config, "agents"),
      ...["config", "cache", "data", "state", "tmp"].map(part => join(root, part))]) {
      await mkdir(dir, { recursive: true });
    }
    const source = fileURLToPath(new URL("../../", import.meta.url));
    const scenarioFile = fileURLToPath(new URL(`./scenarios/${name}.json`, import.meta.url));
    const scenario = JSON.parse(await readFile(scenarioFile, "utf8")) as Scenario;
    const stub = await startStub({ scenario, capture });
    stop = stub.stop;
    await writeFile(join(config, "models.yml"), `providers:\n  stub:\n    baseUrl: ${stub.url}\n    api: openai-completions\n    auth: none\n    models:\n      - id: scripted\n        name: Harness scripted model\n        api: openai-completions\n        reasoning: false\n        input: [text]\n        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }\n        contextWindow: 128000\n        maxTokens: 4096\n      - id: aux\n        name: Harness auxiliary model\n        api: openai-completions\n        reasoning: false\n        input: [text]\n        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }\n        contextWindow: 128000\n        maxTokens: 4096\n      - id: advisor\n        name: Harness advisor model\n        api: openai-completions\n        reasoning: false\n        input: [text]\n        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }\n        contextWindow: 128000\n        maxTokens: 4096\n`);
    const settings = {
      ...scenario.settings,
      modelRoles: {
        default: "stub/scripted",
        task: "stub/scripted",
        tiny: "stub/aux",
        commit: "stub/aux",
        smol: "stub/aux",
        advisor: "stub/advisor"
      },
      enabledModels: ["stub/scripted", "stub/aux", "stub/advisor"],
      // Keyless local discovery can expose cloud-billed models through a local endpoint.
      disabledProviders: ["local", "web", "ollama", "llama.cpp", "apple", "lm-studio"],
      providers: { cacheWarming: "off" },
      task: { batch: true, ...(scenario.settings.task as Record<string, unknown> | undefined) },
    };
    await writeFile(join(config, "config.yml"), `${JSON.stringify(settings, null, 2)}\n`);
    await writeFile(join(config, "agents", "blocking.md"), "---\nname: blocking\ndescription: Inline harness child\nmodel: stub/scripted\nblocking: true\nspawns: '*'\n---\nComplete the harness assignment.\n");
    await writeFile(join(config, "agents", "restricted.md"), "---\nname: restricted\ndescription: Read-only harness child\nmodel: stub/scripted\ntools: [read]\nblocking: true\n---\nRead-only harness assignment.\n");
    await writeFile(join(config, "agents", "advisor.md"), "---\nname: advisor\ndescription: Harness advisor child\nmodel: stub/scripted\nadvisor: true\nblocking: true\n---\nAdvise on the harness assignment.\n");
    const env: Record<string, string> = {};
    for (const key of ["PATH", "TERM", "LANG"]) {
      if (process.env[key]) env[key] = process.env[key];
    }
    env.HOME = home;
    env.TMPDIR = join(root, "tmp");
    env.XDG_CONFIG_HOME = join(root, "config");
    env.XDG_CACHE_HOME = join(root, "cache");
    env.XDG_DATA_HOME = join(root, "data");
    env.XDG_STATE_HOME = join(root, "state");
    if (options.orcaTerminal === true) {
      for (const [key, value] of Object.entries(process.env)) {
        if ((key.startsWith("ORCA_") || key === "WSLENV") && value !== undefined) env[key] = value;
      }
    }
    function spawn(args: string[], options?: { cwd: string }): HarnessProcess {
      const cwd = resolve(options?.cwd ?? workspace);
      if (cwd !== root && !cwd.startsWith(`${root}${sep}`)) throw new Error("Harness cwd must be disposable");
      const proc = Bun.spawn(["omp", "--profile", name, ...args], {
        cwd, env, stdin: "pipe", stdout: "pipe", stderr: "pipe",
      });
      if (
        !proc.stdin || typeof proc.stdin === "number"
        || !proc.stdout || typeof proc.stdout === "number"
        || !proc.stderr || typeof proc.stderr === "number"
      ) {
        proc.kill();
        throw new Error("Harness process pipes were not created");
      }
      const child: HarnessProcess = {
        stdin: proc.stdin, stdout: proc.stdout, stderr: proc.stderr,
        kill: () => proc.kill(), exited: proc.exited,
      };
      running.add(child);
      void child.exited.then(
        () => running.delete(child),
        () => running.delete(child),
      );
      return child;
    }
    async function run(args: string[], options?: { cwd: string }): Promise<{ exitCode: number; stdout: string; stderr: string }> {
      const proc = spawn(args, options);
      proc.stdin.end();
      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
      ]);
      return { exitCode, stdout, stderr };
    }
    const git = Bun.spawn(["git", "init", "-q", workspace], { cwd: root, env, stdout: "pipe", stderr: "pipe" });
    const gitError = await new Response(git.stderr).text();
    if (await git.exited !== 0) throw new Error(`Disposable git init failed: ${gitError}`);
    const linked = await run(["plugin", "link", source]);
    if (linked.exitCode !== 0) throw new Error(`Disposable plugin link failed: ${linked.stderr}`);
    active.set(name, { root, stop: stub.stop, running });
    return {
      root, home, workspace, capture, stubUrl: stub.url, run, spawn,
      async teardown() { await teardown(name); }
    };
  } catch (error) {
    for (const proc of running) proc.kill();
    await Promise.all([...running].map(proc => proc.exited));
    await stop?.();
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

/** Removes every resource created by a named harness profile. */
export async function teardown(name: string): Promise<void> {
  const profile = active.get(name);
  if (!profile) throw new Error("Unknown harness profile");
  active.delete(name);
  for (const proc of profile.running) proc.kill();
  await Promise.all([...profile.running].map(proc => proc.exited));
  await profile.stop();
  await rm(profile.root, { recursive: true, force: true });
}
