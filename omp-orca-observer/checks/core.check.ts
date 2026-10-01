import assert from "node:assert/strict";
import { spyOn } from "bun:test";
import type { ExtensionAPI, ExtensionAgentIdentity, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { checkCompat } from "../compat.ts";
import { processCoordinator, startCoordinator } from "../coordinator.ts";
import {
  SNAPSHOT_MAX_BYTES,
  type ChildFact,
  type ChildRow,
  type Endpoint,
  type OutcomeTracker,
  type ServeOptions,
  type SnapshotSource,
} from "../contract.ts";
import orcaObserver from "../index.ts";
import * as transport from "../transport.ts";
import * as commands from "../commands.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => unknown;
type CommandHandler = Parameters<ExtensionAPI["registerCommand"]>[1]["handler"];
const identity: ExtensionAgentIdentity = { kind: "main", id: "Main", name: "main", depth: 0 };
const registryListeners = new Set<() => void>();
const busListeners = new Set<(payload: unknown) => void>();
const mutatingCalls: string[] = [];
const registry = new Proxy({
  list: () => [],
  get: () => undefined,
  onChange(listener: () => void) {
    registryListeners.add(listener);
    return () => { registryListeners.delete(listener); };
  },
}, {
  get(target, property, receiver) {
    if (property in target) return Reflect.get(target, property, receiver);
    return () => { mutatingCalls.push(String(property)); };
  },
  set(_target, property) {
    mutatingCalls.push(String(property));
    return true;
  },
});

function makeApi(
  version: string,
  handlers = new Map<string, Handler>(),
  eventBusAvailable = true,
  commands = new Map<string, CommandHandler>(),
): ExtensionAPI {
  return {
    pi: {
      VERSION: version,
      MAIN_AGENT_ID: identity.id,
      AgentRegistry: {
        global: () => registry,
      },
      parseSessionContent: () => ({ entries: [], malformedRecords: 0 }),
      logger: { info: () => { } },
    },
    events: eventBusAvailable ? {
      on: (_name: string, listener: (payload: unknown) => void) => {
        busListeners.add(listener);
        return () => { busListeners.delete(listener); };
      },
    } : {},
    on: (name: string, handler: Handler) => {
      const previous = handlers.get(name);
      handlers.set(name, previous ? async (event, ctx) => {
        const result = await previous(event, ctx);
        return (await handler(event, ctx)) ?? result;
      } : handler);
    },
    registerCommand: (name: string, command: { handler: CommandHandler }) => { commands.set(name, command.handler); },
  } as unknown as ExtensionAPI;
}

for (const version of ["18.3.4", "garbage"]) {
  assert.equal(checkCompat(makeApi(version), identity).state, "unavailable");
}
for (const version of ["18.3.5", "18.10.0"]) {
  assert.equal(checkCompat(makeApi(version), identity).state, "ready");
}
assert.equal(checkCompat(makeApi("18.3.5", new Map(), false), identity).state, "unavailable");

const originalSetInterval = globalThis.setInterval;
const originalClearInterval = globalThis.clearInterval;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalNow = Date.now;
let tick: () => void = () => { throw new Error("coordinator timer is not scheduled"); };
const timers = new Set<object>();
function scheduleTimer() {
  const timer = { unref() { return this; } };
  timers.add(timer);
  return timer;
}
let now = 1000;
globalThis.setInterval = ((callback: () => void) => {
  tick = callback;
  return scheduleTimer();
}) as unknown as typeof setInterval;
globalThis.clearInterval = ((handle: unknown) => {
  timers.delete(handle as object);
  tick = () => { throw new Error("coordinator timer was cleared"); };
}) as typeof clearInterval;
globalThis.setTimeout = (() => scheduleTimer()) as unknown as typeof setTimeout;
globalThis.clearTimeout = ((handle: unknown) => { timers.delete(handle as object); }) as typeof clearTimeout;
Date.now = () => now;
const endpoints = new Set<Endpoint>();
const served: ServeOptions[] = [];
const mockedServe = spyOn(transport, "serve").mockImplementation(async options => {
  served.push(options);
  const endpoint: Endpoint = {
    url: "http://127.0.0.1/",
    port: 80,
    async close() { endpoints.delete(endpoint); },
  };
  endpoints.add(endpoint);
  return endpoint;
});
const registerCommandsSpy = spyOn(commands, "registerCommands");
let cleanupRuntime: (() => unknown) | undefined;

try {
  const received: ChildFact[] = [];
  const losses: Array<{ reason: string; childId?: string }> = [];
  const outcomes: OutcomeTracker = {
    record: fact => { received.push(fact); },
    evidenceLost: (reason, childId) => { losses.push({ reason, childId }); },
    outcome: () => ({ state: "unknown", reason: "no outcome" }),
    forget: () => { },
    clear: () => { received.length = 0; losses.length = 0; },
  };
  const source: SnapshotSource = {
    collect: () => ({
      rootSession: { known: true, value: "root" },
      inventory: { state: "complete" },
      rows: [],
    }),
    admittedSessionFile: childId => childId === "current" ? "current-session" : null,
    dispose: () => { },
  };
  const coordinator = startCoordinator({ source, outcomes, limit: 10 });
  assert.equal(startCoordinator({ source: null, outcomes: null, limit: 0 }), coordinator);

  const current: ChildFact = {
    kind: "lifecycle", childId: "current", sessionFile: "current-session",
    spawnCallId: "spawn", status: "started", at: "2026-01-01T00:00:00.000Z",
  };
  coordinator.recordFact(current);
  assert.equal(received.length, 0);
  tick();
  assert.deepEqual(received, [current]);

  coordinator.recordFact({ ...current, sessionFile: "previous-session" });
  tick();
  assert.deepEqual(received, [current]);
  assert.equal(losses.length, 0);

  coordinator.recordFact({ ...current, childId: "not-admitted", sessionFile: "unknown-session" });
  tick();
  assert.equal(losses.length, 0);
  tick();
  assert.deepEqual(losses, [{ reason: "unattributed lifecycle fact", childId: "not-admitted" }]);

  for (let i = 0; i < 1025; i++) {
    coordinator.recordFact({ ...current, childId: `queued-${i}` });
  }
  assert.equal(losses.filter(loss => loss.reason === "fact queue overflow").length, 0);
  tick();
  assert.equal(losses.filter(loss => loss.reason === "fact queue overflow").length, 1);

  let invalidations = 0;
  coordinator.onInvalidate(() => { invalidations++; });
  coordinator.dispose();
  assert.equal(invalidations, 1);

  const unknown = { known: false as const, reason: "not observed" };
  const hugeRow: ChildRow = {
    childId: "large", parentId: "Main", rootSession: "root", kind: "sub",
    agentName: "x".repeat(SNAPSHOT_MAX_BYTES), modelRole: unknown, resolvedModel: unknown,
    registryStatus: "running", tombstoned: false, outcome: { state: "unknown", reason: "not observed" },
    milestones: { responseAt: unknown, acceptedAt: unknown, terminalAt: unknown },
    activity: { sampled: true, lastActivityAt: unknown },
    lineage: {
      repoRoot: unknown, cwd: unknown, parentWorktree: unknown, childWorktree: unknown,
      isolation: unknown, branch: unknown,
    },
    completeness: { state: "complete" }, observedAt: "2026-01-01T00:00:00.000Z", grantScope: "none",
  };
  const largeSource: SnapshotSource = {
    collect: () => ({ rootSession: { known: true, value: "root" }, inventory: { state: "complete" }, rows: [hugeRow] }),
    admittedSessionFile: () => null,
    dispose: () => { },
  };
  const periodic = startCoordinator({ source: largeSource, outcomes: null, limit: 1 });
  tick();
  assert.deepEqual(periodic.snapshot()?.inventory, { state: "partial", reason: "snapshot byte cap" });
  assert.deepEqual(periodic.snapshot()?.children, []);
  const trimmedSnapshot = periodic.snapshot();
  assert.ok(trimmedSnapshot);
  assert.ok(Buffer.byteLength(JSON.stringify(trimmedSnapshot)) <= SNAPSHOT_MAX_BYTES);
  const generation = periodic.snapshot()?.generation;
  let periodicInvalidations = 0;
  periodic.onInvalidate(() => { periodicInvalidations++; });
  now += 5000;
  tick();
  assert.equal(periodicInvalidations, 0);
  assert.equal(periodic.snapshot()?.generation, (generation ?? 0) + 1);
  periodic.dispose();
  const rootTooLargeSource: SnapshotSource = {
    collect: () => ({
      rootSession: { known: false, reason: "x".repeat(SNAPSHOT_MAX_BYTES) },
      inventory: { state: "complete" },
      rows: [],
    }),
    admittedSessionFile: () => null,
    dispose: () => { },
  };
  const rootTooLarge = startCoordinator({ source: rootTooLargeSource, outcomes: null, limit: 1 });
  tick();
  assert.equal(rootTooLarge.snapshot(), null);
  assert.equal(rootTooLarge.state().state, "unavailable");
  rootTooLarge.dispose();
  assert.equal(periodicInvalidations, 1);

  const mainHandlers = new Map<string, Handler>();
  const subHandlers = new Map<string, Handler>();
  const mainCommands = new Map<string, CommandHandler>();
  const subCommands = new Map<string, CommandHandler>();
  let sessionFile = "root-session";
  const mainCtx = {
    agent: identity,
    mode: "tui",
    hasUI: true,
    cwd: ".",
    ui: { notify: () => { } },
    sessionManager: { getSessionFile: () => sessionFile, getBranch: () => [] },
  } as unknown as ExtensionContext;
  const commandCtx = mainCtx as Parameters<CommandHandler>[1];
  const subCtx = {
    agent: { kind: "sub", id: "child", name: "task", depth: 1 },
    sessionManager: { getSessionFile: () => "child-session", getBranch: () => [] },
  } as unknown as ExtensionContext;
  orcaObserver(makeApi("18.3.5", mainHandlers, true, mainCommands));
  orcaObserver(makeApi("18.3.5", subHandlers, true, subCommands));
  cleanupRuntime = () => mainHandlers.get("session_shutdown")!({}, mainCtx);
  assert.equal(timers.size, 0, "factory registration must not schedule work");
  assert.equal(registryListeners.size, 0);
  assert.equal(endpoints.size, 0);
  assert.equal(await mainHandlers.get("before_agent_start")!({}, mainCtx), undefined);

  await mainHandlers.get("session_start")!({}, mainCtx);
  const first = processCoordinator();
  assert.ok(first);
  await mainCommands.get("observer")!("serve", commandCtx);
  const firstGrants = served.at(-1)!.grants;
  const firstCredential = firstGrants.exchange(firstGrants.bootstrap(["child"], 60_000).code)!;
  const firstSignal = firstGrants.signal(firstCredential.credential, "child")!;
  assert.equal(firstGrants.allows(firstCredential.credential, "child"), true);
  assert.equal(firstSignal.aborted, false);
  assert.equal(endpoints.size, 1);
  assert.equal(registryListeners.size, 1);
  await subHandlers.get("session_start")!({}, subCtx);
  await subCommands.get("observer")!("revoke all", commandCtx);
  assert.equal(firstGrants.allows(firstCredential.credential, "child"), true, "another instance cannot revoke publisher grants");
  assert.equal(firstSignal.aborted, false);
  assert.equal(endpoints.size, 1);
  await subHandlers.get("session_shutdown")!({}, subCtx);
  assert.equal(processCoordinator(), first);
  assert.equal(registryListeners.size, 1);

  sessionFile = "switched-session";
  await mainHandlers.get("session_switch")!({}, mainCtx);
  const switched = processCoordinator();
  assert.ok(switched);
  assert.notEqual(switched.epoch(), first.epoch());
  assert.equal(endpoints.size, 0);
  await mainCommands.get("observer")!("serve", commandCtx);
  const switchedGrants = served.at(-1)!.grants;
  assert.notEqual(switchedGrants, firstGrants);
  assert.equal(switchedGrants.epoch, switched.epoch());
  assert.equal(firstGrants.allows(firstCredential.credential, "child"), false);
  assert.equal(switchedGrants.allows(firstCredential.credential, "child"), false);
  assert.equal(firstSignal.aborted, true);

  const switchedCredential = switchedGrants.exchange(switchedGrants.bootstrap(["child"], 60_000).code)!;
  const switchedSignal = switchedGrants.signal(switchedCredential.credential, "child")!;
  switched.dispose();
  assert.equal(switchedGrants.allows(switchedCredential.credential, "child"), false, "coordinator invalidation revokes grants");
  assert.equal(switchedSignal.aborted, true);
  sessionFile = "branched-session";
  await mainHandlers.get("session_branch")!({}, mainCtx);
  assert.notEqual(processCoordinator()?.epoch(), switched.epoch());
  assert.equal(endpoints.size, 0);
  await mainCommands.get("observer")!("serve", commandCtx);
  const finalGrants = served.at(-1)!.grants;
  const finalCredential = finalGrants.exchange(finalGrants.bootstrap(["child"], 60_000).code)!;
  const finalSignal = finalGrants.signal(finalCredential.credential, "child")!;
  const pendingCode = finalGrants.bootstrap(["child"], 60_000).code;
  assert.equal(timers.size, 2, "the coordinator and active grants each own a timer");

  await mainHandlers.get("session_shutdown")!({}, mainCtx);
  assert.equal(processCoordinator(), null);
  assert.equal(timers.size, 0);
  assert.equal(registryListeners.size, 0);
  assert.equal(busListeners.size, 0);
  assert.equal(endpoints.size, 0);
  assert.equal(finalGrants.allows(finalCredential.credential, "child"), false);
  assert.equal(finalGrants.exchange(pendingCode), null);
  assert.equal(finalSignal.aborted, true);
  assert.deepEqual(finalGrants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  assert.equal(await mainHandlers.get("before_agent_start")!({}, mainCtx), undefined);
  assert.deepEqual(mutatingCalls, []);

  const raceHandlers = new Map<string, Handler>();
  orcaObserver(makeApi("18.3.5", raceHandlers));
  cleanupRuntime = () => raceHandlers.get("session_shutdown")!({}, mainCtx);
  await raceHandlers.get("session_start")!({}, mainCtx);
  const runtimeOf = registerCommandsSpy.mock.calls.at(-1)![1];
  const old = runtimeOf()!;
  assert.ok(old);
  assert.equal(old.endpoint, null);
  await raceHandlers.get("session_switch")!({}, mainCtx);
  await assert.rejects(old.serve(), /stopping/);
  await raceHandlers.get("session_shutdown")!({}, mainCtx);
  assert.equal(processCoordinator(), null);
  assert.equal(timers.size, 0);
  assert.equal(registryListeners.size, 0);
  assert.equal(busListeners.size, 0);
  assert.equal(endpoints.size, 0);
  assert.deepEqual(mutatingCalls, []);
} finally {
  try {
    await cleanupRuntime?.();
    processCoordinator()?.dispose();
    for (const options of served) options.grants.dispose();
    await Promise.all([...endpoints].map(endpoint => endpoint.close()));
  } finally {
    mockedServe.mockRestore();
    registerCommandsSpy.mockRestore();
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
    Date.now = originalNow;
  }
}
