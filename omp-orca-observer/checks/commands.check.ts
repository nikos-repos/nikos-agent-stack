import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { registerCommands } from "../commands.js";
import {
  SNAPSHOT_SCHEMA_VERSION,
  type ChildRow,
  type Grants,
  type ObserverRuntime,
  type ObserverState,
  type Snapshot,
} from "../contract.js";

type Handler = Parameters<ExtensionAPI["registerCommand"]>[1]["handler"];
type CommandContext = Parameters<Handler>[1];
type CliReply = { stdout: string; stderr?: string; exitCode?: number };
type CliPlan = { status: CliReply; list: CliReply; create: CliReply };
type CliCall = { args: string[]; cwd: string };
type SecretFixture = {
  persisted: Record<string, unknown[]>;
  issues: { code: string }[];
  issuedCredentials: string[];
};

function childRow(childId: string): ChildRow {
  const unknown = { known: false, reason: "not observed in this fixture" } as const;
  return {
    childId,
    parentId: "Main",
    rootSession: "root.jsonl",
    kind: "sub",
    agentName: "task",
    modelRole: unknown,
    resolvedModel: unknown,
    registryStatus: "running",
    tombstoned: false,
    outcome: { state: "unknown", reason: "not observed in this fixture" },
    milestones: { responseAt: unknown, acceptedAt: unknown, terminalAt: unknown },
    activity: { sampled: true, lastActivityAt: unknown },
    lineage: {
      repoRoot: unknown,
      cwd: unknown,
      parentWorktree: unknown,
      childWorktree: unknown,
      isolation: unknown,
      branch: unknown,
    },
    completeness: { state: "complete" },
    observedAt: "2026-09-30T00:00:00.000Z",
    grantScope: "none",
  };
}

let harnessNumber = 0;

function harness(cwd: string) {
  const id = ++harnessNumber;
  const clock = { now: Date.parse("2026-09-30T00:00:00.000Z") };
  const issues: { childIds: string[]; ttlMs: number; code: string }[] = [];
  const issuedCredentials: string[] = [];
  const pending = new Map<string, { children: Set<string>; until: number; ttlMs: number }>();
  const credentials = new Map<string, { children: Set<string>; until: number; controller: AbortController }>();
  const revocations: (string[] | "all")[] = [];
  function prune() {
    for (const [code, scope] of pending) {
      if (scope.until <= clock.now) pending.delete(code);
    }
    for (const [credential, scope] of credentials) {
      if (scope.until <= clock.now) {
        scope.controller.abort();
        credentials.delete(credential);
      }
    }
  }
  const grants: Grants = {
    epoch: "fixture-epoch",
    bootstrap(childIds, ttlMs) {
      const code = `fake-code-${id}-${issues.length + 1}`;
      issues.push({ childIds: [...childIds], ttlMs, code });
      const until = clock.now + 60_000;
      pending.set(code, { children: new Set(childIds), until, ttlMs });
      return { code, expiresAt: new Date(until).toISOString() };
    },
    exchange(code) {
      prune();
      const scope = pending.get(code);
      if (!scope) return null;
      pending.delete(code);
      const credential = `fake-credential-${id}-${issuedCredentials.length + 1}`;
      issuedCredentials.push(credential);
      const until = clock.now + scope.ttlMs;
      credentials.set(credential, { children: scope.children, until, controller: new AbortController() });
      return { credential, expiresAt: new Date(until).toISOString() };
    },
    allows(credential, childId) {
      prune();
      const scope = credentials.get(credential);
      return !!scope && (childId === null || scope.children.has(childId));
    },
    signal(credential, childId) {
      return grants.allows(credential, childId) ? credentials.get(credential)!.controller.signal : null;
    },
    revoke(childIds) {
      revocations.push(childIds === "all" ? "all" : [...childIds]);
      for (const [code, scope] of pending) {
        for (const childId of childIds === "all" ? scope.children : childIds) scope.children.delete(childId);
        if (!scope.children.size) pending.delete(code);
      }
      for (const [credential, scope] of credentials) {
        for (const childId of childIds === "all" ? scope.children : childIds) scope.children.delete(childId);
        if (!scope.children.size) {
          scope.controller.abort();
          credentials.delete(credential);
        }
      }
    },
    status() {
      prune();
      const children = new Set<string>();
      for (const scope of [...pending.values(), ...credentials.values()]) {
        for (const childId of scope.children) children.add(childId);
      }
      return { liveCredentials: credentials.size, grantedChildIds: [...children], pendingCodes: pending.size };
    },
    dispose() {
      grants.revoke("all");
    },
  };
  const admitted = new Map<string, string>();
  for (const childId of ["A", "B", "C"]) admitted.set(childId, `${childId}.jsonl`);
  const snapshot: Snapshot = {
    schema: SNAPSHOT_SCHEMA_VERSION,
    epoch: grants.epoch,
    generation: 1,
    observedAt: "2026-09-30T00:00:00.000Z",
    rootSession: { known: true, value: "root.jsonl" },
    inventory: { state: "partial", reason: "fixture inventory is bounded" },
    children: ["A", "B", "C"].map(childRow),
  };
  const state: { value: ObserverState; snapshotAvailable: boolean } = {
    value: { state: "ready" },
    snapshotAvailable: true,
  };
  const serving = { calls: 0, starts: 0, beforeServe: undefined as (() => void) | undefined };
  const observer: ObserverRuntime = {
    coordinator: {
      state: () => state.value,
      snapshot: () => state.snapshotAvailable ? snapshot : null,
      epoch: () => snapshot.epoch,
      recordFact: () => { snapshot.generation++; },
      markDirty: () => { snapshot.generation++; },
      onInvalidate: () => () => { },
      dispose: () => { state.value = { state: "unavailable", reason: "fixture disposed" }; },
    },
    source: {
      collect: limit => ({ rootSession: snapshot.rootSession, inventory: snapshot.inventory, rows: snapshot.children.slice(0, limit) }),
      admittedSessionFile: childId => admitted.get(childId) ?? null,
      dispose: () => { admitted.clear(); },
    },
    outcomes: null,
    grants,
    endpoint: null,
    async serve() {
      serving.calls++;
      serving.beforeServe?.();
      if (!observer.endpoint) {
        serving.starts++;
        observer.endpoint = {
          url: "http://127.0.0.1",
          port: 80,
          close: async () => { observer.endpoint = null; },
        };
      }
      return observer.endpoint;
    },
  };
  const current: { value: ObserverRuntime | null } = { value: observer };
  const notices: { message: string; type?: "info" | "warning" | "error" }[] = [];
  const persisted: Record<string, unknown[]> = {
    sessionJsonl: [], modelContext: [], logs: [], files: [], rpcOutput: [],
  };
  const record = (channel: string) => (...values: unknown[]) => { persisted[channel]!.push(values); };
  const commands: Record<string, Handler> = {};
  const pi = {
    registerCommand: (name: string, options: { handler: Handler }) => { commands[name] = options.handler; },
    sendMessage: record("modelContext"),
    sendUserMessage: record("modelContext"),
    appendEntry: record("sessionJsonl"),
    logger: { info: record("logs"), warn: record("logs"), error: record("logs"), debug: record("logs") },
    exec: record("logs"),
  } as unknown as ExtensionAPI;
  const ctx = {
    mode: "tui",
    hasUI: true,
    cwd,
    agent: { kind: "main", id: "Main", name: "main", depth: 0 } as CommandContext["agent"] | undefined,
    ui: {
      notify(message: string, type?: "info" | "warning" | "error") {
        notices.push({ message, type });
        if (ctx.mode !== "tui" || !ctx.hasUI) persisted.rpcOutput!.push(message);
      },
      setEditorText: record("modelContext"),
      pasteToEditor: record("modelContext"),
      setStatus: record("files"),
      setWidget: record("files"),
    },
    addAdditionalContext: record("modelContext"),
    sessionManager: { appendCustomEntry: record("sessionJsonl"), appendMessage: record("sessionJsonl") },
  } as unknown as CommandContext;
  registerCommands(pi, () => current.value);
  return {
    ctx, observer, current, grants, issues, issuedCredentials, admitted, snapshot, state, serving, notices, persisted, clock, revocations,
    run: async (args: string) => { await commands.observer!(args, ctx); },
    lastMessage: () => notices.at(-1)?.message ?? "",
  };
}

async function main() {
  const directory = await mkdtemp(join(tmpdir(), "observer-commands-"));
  const executable = join(directory, "fake orca");
  const planFile = join(directory, "plan.json");
  const logFile = join(directory, "argv.jsonl");
  const cwd = join(directory, "worktree", "nested");
  const previousCli = process.env.ORCA_CLI_COMMAND;
  const fixtures: SecretFixture[] = [];
  const createHarness = () => {
    const fixture = harness(cwd);
    fixtures.push(fixture);
    return fixture;
  };
  const plan: CliPlan = {
    status: { stdout: JSON.stringify({ ok: true, result: { runtime: { appVersion: "1.4.215" } } }) },
    list: { stdout: JSON.stringify({ ok: true, result: { tabs: [] } }) },
    create: { stdout: JSON.stringify({ ok: true, result: { pageId: "new-viewer-tab" } }) },
  };
  const setPlan = async (change: Partial<CliPlan> = {}) => {
    await writeFile(planFile, JSON.stringify({ ...plan, ...change }));
    await writeFile(logFile, "");
  };
  const calls = async (): Promise<CliCall[]> => {
    const contents = (await readFile(logFile, "utf8")).trim();
    return contents ? contents.split("\n").map(line => JSON.parse(line) as CliCall) : [];
  };
  try {
    await mkdir(cwd, { recursive: true });
    // This is the only executable the check launches; argv contains inert fake codes and is deleted in finally.
    await writeFile(executable, `#!${process.execPath}\n`
      + 'import { appendFileSync, readFileSync } from "node:fs";\n'
      + 'import { dirname, join } from "node:path";\n'
      + 'const directory = dirname(process.argv[1]);\n'
      + 'const args = process.argv.slice(2);\n'
      + 'appendFileSync(join(directory, "argv.jsonl"), JSON.stringify({ args, cwd: process.cwd() }) + "\\n");\n'
      + 'const plan = JSON.parse(readFileSync(join(directory, "plan.json"), "utf8"));\n'
      + 'const key = args[0] === "status" ? "status" : args[0] === "tab" && args[1] === "list" ? "list" : args[0] === "tab" && args[1] === "create" ? "create" : null;\n'
      + 'const reply = key && plan[key];\n'
      + 'if (!reply) { process.stderr.write("unexpected fake CLI command"); process.exitCode = 2; }\n'
      + 'else { if (reply.stderr) process.stderr.write(reply.stderr); process.stdout.write(reply.stdout); process.exitCode = reply.exitCode || 0; }\n');
    await chmod(executable, 0o700);
    process.env.ORCA_CLI_COMMAND = executable;
    await setPlan();

    // Admission is an atomic precondition: neither unknown nor advisor ids can acquire access.
    for (const command of ["grant", "url", "open"]) {
      for (const childId of ["missing", "terra-advisor"]) {
        const fixture = createHarness();
        await fixture.run(`${command} A ${childId}`);
        assert.match(fixture.lastMessage(), new RegExp(`not admitted: ${childId}`));
        assert.equal(fixture.issues.length, 0);
        assert.equal(fixture.serving.calls, 0);
      }
    }
    assert.deepEqual(await calls(), []);

    // Every command rejects a missing publisher, source, or a child session (even depth zero).
    for (const unavailable of ["runtime", "source", "child"] as const) {
      const fixture = createHarness();
      if (unavailable === "runtime") fixture.current.value = null;
      if (unavailable === "source") fixture.observer.source = null;
      if (unavailable === "child") fixture.ctx.agent = { kind: "sub", id: "A", name: "task", depth: 0 };
      for (const command of ["serve", "grant A", "revoke A", "status", "url A", "open A"]) {
        await fixture.run(command);
        assert.match(fixture.lastMessage(), /^observer unavailable: .+/);
      }
      assert.equal(fixture.issues.length, 0);
      assert.equal(fixture.serving.calls, 0);
      assert.deepEqual(fixture.revocations, []);
    }
    const missingAgent = createHarness();
    (missingAgent.ctx as { agent?: unknown }).agent = undefined;
    await missingAgent.run("status");
    assert.equal(missingAgent.lastMessage(), "observer unavailable: this session is not the publisher");
    assert.equal(missingAgent.issues.length, 0);
    assert.deepEqual(missingAgent.revocations, []);

    // The mode check precedes both code creation and CLI probes, including RPC hosts that claim UI.
    for (const mode of ["rpc", "json", "print", "tui"] as const) {
      for (const hasUI of [false, true]) {
        if (mode === "tui" && hasUI) continue;
        const fixture = createHarness();
        fixture.ctx.mode = mode;
        fixture.ctx.hasUI = hasUI;
        for (const command of ["grant A", "url A", "open A"]) {
          await fixture.run(command);
          assert.match(fixture.lastMessage(), /requires interactive tui mode with UI/);
        }
        assert.equal(fixture.issues.length, 0);
        assert.equal(fixture.serving.calls, 0);
      }
    }
    assert.deepEqual(await calls(), []);

    const serving = createHarness();
    await serving.run("status");
    assert.match(serving.lastMessage(), /endpoint: not serving/);
    await serving.run("serve");
    await serving.run("serve");
    assert.equal(serving.serving.calls, 2);
    assert.equal(serving.serving.starts, 1);
    assert.equal(serving.lastMessage(), `observer serving: ${serving.observer.endpoint!.url}`);
    assert.doesNotMatch(serving.lastMessage(), /#code=/);
    assert.equal(serving.issues.length, 0);

    const scopes = createHarness();
    await scopes.run("grant A");
    assert.equal(scopes.issues.at(-1)!.ttlMs, 30 * 60_000);
    assert.equal(scopes.lastMessage(), `${scopes.observer.endpoint!.url}#code=${scopes.issues.at(-1)!.code}`);
    const credential = scopes.grants.exchange(scopes.issues.at(-1)!.code)!;
    await scopes.run("grant B --ttl 480");
    assert.equal(scopes.issues.at(-1)!.ttlMs, 480 * 60_000);
    await scopes.run("status");
    assert.match(scopes.lastMessage(), /observer state: ready/);
    assert.match(scopes.lastMessage(), /epoch: fixture-epoch/);
    assert.match(scopes.lastMessage(), /endpoint: http:\/\/127\.0\.0\.1/);
    assert.match(scopes.lastMessage(), /grants: 2 children, 1 live credentials, 1 pending codes/);
    assert.match(scopes.lastMessage(), /inventory: partial: fixture inventory is bounded/);
    assert.ok(!scopes.lastMessage().includes(credential.credential));
    for (const issue of scopes.issues) assert.ok(!scopes.lastMessage().includes(issue.code));
    await scopes.run("url A");
    assert.deepEqual(scopes.issues.at(-1)!.childIds, ["A"]);
    await scopes.run("url B");
    assert.deepEqual(scopes.issues.at(-1)!.childIds, ["B"]);
    await scopes.run("url all");
    assert.deepEqual(scopes.issues.at(-1)!.childIds, ["A", "B"]);
    await scopes.run("revoke A");
    assert.match(scopes.lastMessage(), /revoked: A/);
    const beforeRevokedUrl = scopes.issues.length;
    await scopes.run("url A");
    assert.match(scopes.lastMessage(), /not approved: A/);
    assert.equal(scopes.issues.length, beforeRevokedUrl);
    await scopes.run("url B");
    assert.deepEqual(scopes.issues.at(-1)!.childIds, ["B"]);
    await scopes.run("revoke all");
    assert.equal(scopes.revocations.at(-1), "all");
    assert.deepEqual(scopes.grants.status().grantedChildIds, []);
    const beforeEmptyAll = scopes.issues.length;
    await scopes.run("url all");
    assert.match(scopes.lastMessage(), /no admitted, approved children selected/);
    assert.equal(scopes.issues.length, beforeEmptyAll);

    const all = createHarness();
    all.admitted.delete("C");
    await all.run("grant all");
    assert.deepEqual(all.issues.at(-1)!.childIds, ["A", "B"]);
    all.admitted.delete("B");
    await all.run("url all");
    assert.deepEqual(all.issues.at(-1)!.childIds, ["A"]);
    const beforeInvalid = all.issues.length;
    for (const invalid of ["grant A --ttl 481", "grant A --ttl 0", "grant A --ttl garbage", "grant A --ttl", "grant all A", "url A --ttl 1", "grant"]) {
      await all.run(invalid);
      assert.equal(all.issues.length, beforeInvalid);
    }
    await all.run("grant A --ttl 0.5");
    assert.equal(all.issues.at(-1)!.ttlMs, 30_000);

    const expired = createHarness();
    await expired.run("grant A");
    expired.clock.now += 60_000;
    await expired.run("url A");
    assert.match(expired.lastMessage(), /not approved: A/);
    assert.equal(expired.issues.length, 1);

    const unavailableState = createHarness();
    unavailableState.state.value = { state: "unavailable", reason: "native inventory unavailable" };
    await unavailableState.run("status");
    assert.match(unavailableState.lastMessage(), /observer state: unavailable: native inventory unavailable/);
    await unavailableState.run("grant A");
    assert.match(unavailableState.lastMessage(), /^observer unavailable: native inventory unavailable/);
    assert.equal(unavailableState.issues.length, 0);
    unavailableState.state.value = { state: "ready" };
    unavailableState.state.snapshotAvailable = false;
    await unavailableState.run("grant all");
    assert.match(unavailableState.lastMessage(), /^observer unavailable: current snapshot is unavailable/);
    assert.equal(unavailableState.issues.length, 0);

    // Awaiting endpoint startup cannot revive a revoked scope or issue against a replaced publisher/UI.
    for (const change of ["revoked", "unadmitted", "publisher", "ui"] as const) {
      const fixture = createHarness();
      await fixture.run("grant A");
      fixture.observer.endpoint = null;
      fixture.serving.beforeServe = () => {
        if (change === "revoked") fixture.grants.revoke(["A"]);
        if (change === "unadmitted") fixture.admitted.delete("A");
        if (change === "publisher") fixture.current.value = null;
        if (change === "ui") fixture.ctx.hasUI = false;
      };
      await fixture.run("url A");
      assert.equal(fixture.issues.length, 1);
      assert.match(fixture.lastMessage(), /not approved: A|not admitted: A|publisher changed|requires interactive tui/);
    }

    const staleServe = createHarness();
    staleServe.observer.serve = async () => {
      staleServe.current.value = null;
      return { url: "http://127.0.0.1", port: 80, close: async () => { } };
    };
    await staleServe.run("serve");
    assert.match(staleServe.lastMessage(), /^observer unavailable: publisher changed/);
    assert.doesNotMatch(staleServe.lastMessage(), /observer serving/);
    assert.equal(staleServe.notices.at(-1)!.type, "error");

    const revokedNamed = createHarness();
    await revokedNamed.run("grant A");
    await revokedNamed.run("revoke A Z");
    assert.match(revokedNamed.lastMessage(), /revoked: A/);
    assert.doesNotMatch(revokedNamed.lastMessage(), /\bZ\b/);
    assert.deepEqual(revokedNamed.revocations.at(-1), ["A"]);

    // Missing, malformed, or too-old stock status cannot reach tab create or issue an open code.
    for (const version of [undefined, "garbage", "1.4.204", "1.4.205-beta.1"]) {
      await setPlan({ status: { stdout: JSON.stringify({ ok: true, result: { runtime: { appVersion: version } } }) } });
      const fixture = createHarness();
      await fixture.run("grant A");
      await fixture.run("open A");
      assert.match(fixture.lastMessage(), /missing appVersion|unparseable: garbage|below 1\.4\.205/);
      assert.match(fixture.lastMessage(), /Use \/observer url/);
      assert.equal(fixture.issues.length, 1);
      assert.deepEqual((await calls()).map(call => call.args), [["status", "--json"]]);
      await fixture.run("url A");
      assert.equal(fixture.issues.length, 2);
      assert.deepEqual(fixture.issues.at(-1)!.childIds, ["A"]);
    }
    await setPlan({ status: { stdout: "not-json" } });
    const malformedStatus = createHarness();
    await malformedStatus.run("grant A");
    await malformedStatus.run("open A");
    assert.match(malformedStatus.lastMessage(), /returned unparseable JSON/);
    assert.equal(malformedStatus.issues.length, 1);
    assert.deepEqual((await calls()).map(call => call.args), [["status", "--json"]]);

    for (const list of [
      { stdout: "", stderr: "No Orca-managed worktree contains the current directory", exitCode: 1 },
      { stdout: JSON.stringify({ ok: false, error: { message: "worktree selector denied" } }) },
    ]) {
      await setPlan({ list });
      const fixture = createHarness();
      await fixture.run("grant A");
      await fixture.run("open A");
      assert.match(fixture.lastMessage(), /No Orca-managed worktree|worktree selector denied/);
      assert.equal(fixture.issues.length, 1);
      assert.deepEqual((await calls()).map(call => call.args), [
        ["status", "--json"], ["tab", "list", "--worktree", "current", "--json"],
      ]);
    }

    await setPlan();
    const missingCli = createHarness();
    await missingCli.run("grant A");
    process.env.ORCA_CLI_COMMAND = join(directory, "missing-fake-cli");
    await missingCli.run("open A");
    assert.match(missingCli.lastMessage(), /ENOENT|not found/i);
    assert.equal(missingCli.issues.length, 1);
    assert.deepEqual(await calls(), []);
    process.env.ORCA_CLI_COMMAND = executable;

    // Exercise real execFile: every call uses the session cwd and opening creates a new tab with a fresh, exact scope.
    for (const version of ["1.4.205", "1.4.215", "1.4.215+build.1", "2.0.0"]) {
      await setPlan({ status: { stdout: JSON.stringify({ ok: true, result: { runtime: { appVersion: version } } }) } });
      const fixture = createHarness();
      await fixture.run("grant A");
      await fixture.run("grant B");
      const firstCode = fixture.issues[0]!.code;
      await fixture.run("open A");
      assert.deepEqual(fixture.issues.at(-1)!.childIds, ["A"]);
      assert.equal(fixture.issues.length, 3);
      assert.notEqual(fixture.issues.at(-1)!.code, firstCode);
      const actual = await calls();
      assert.deepEqual(actual.map(call => call.args), [
        ["status", "--json"],
        ["tab", "list", "--worktree", "current", "--json"],
        ["tab", "create", "--url", `${fixture.observer.endpoint!.url}#code=${fixture.issues.at(-1)!.code}`, "--worktree", "current", "--json"],
      ]);
      for (const call of actual) {
        assert.equal(call.cwd, cwd);
        assert.ok(!call.args.some(arg => arg === "--page" || arg === "--page-id" || arg === "--pageId" || arg === "new-viewer-tab"));
      }
      assert.match(fixture.lastMessage(), /"pageId":"new-viewer-tab"/);
      assert.match(fixture.lastMessage(), /browser history retains the full URL, including its fragment/);
      assert.match(fixture.lastMessage(), /spent when the page loads and exchanges it/);
      assert.match(fixture.lastMessage(), /expires 60 s after issue/);
      assert.match(fixture.lastMessage(), /Never reuse it/);
    }

    await setPlan({ create: { stdout: "", stderr: "tab creation denied", exitCode: 1 } });
    const failedCreate = createHarness();
    await failedCreate.run("grant A");
    await failedCreate.run("open A");
    assert.match(failedCreate.lastMessage(), /tab creation denied/);
    assert.match(failedCreate.lastMessage(), /browser history retains the full URL/);
    assert.match(failedCreate.lastMessage(), /issue a fresh bootstrap URL/);
    assert.equal(failedCreate.issues.length, 2);

    // Persisted session/model/log/file/RPC sinks are distinct from TUI notify and never receive a code or credential.
    for (const fixture of fixtures) {
      const persisted = JSON.stringify(fixture.persisted);
      for (const issue of fixture.issues) assert.ok(!persisted.includes(issue.code), `bootstrap code leaked in fixture ${issue.code}`);
      for (const credential of fixture.issuedCredentials) assert.ok(!persisted.includes(credential), "credential leaked");
    }
  } finally {
    if (previousCli === undefined) delete process.env.ORCA_CLI_COMMAND;
    else process.env.ORCA_CLI_COMMAND = previousCli;
    await rm(directory, { recursive: true, force: true });
  }
  await assert.rejects(stat(directory), { code: "ENOENT" });
  console.log("commands check passed");
}

await main();
