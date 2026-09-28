import assert from "node:assert/strict";
import type { ExtensionAPI, ExtensionAgentIdentity, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { checkCompat } from "../compat.ts";
import { processCoordinator, startCoordinator } from "../coordinator.ts";
import { SNAPSHOT_MAX_BYTES, type ChildFact, type ChildRow, type OutcomeTracker, type SnapshotSource } from "../contract.ts";
import orcaObserver from "../index.ts";

type Handler = (event: unknown, ctx: ExtensionContext) => void | Promise<void>;
const identity: ExtensionAgentIdentity = { kind: "main", id: "Main", name: "main", depth: 0 };

function makeApi(version: string, handlers = new Map<string, Handler>(), eventBusAvailable = true): ExtensionAPI {
  return {
    pi: {
      VERSION: version,
      AgentRegistry: {
        global: () => ({ list: () => [], get: () => undefined, onChange: () => () => { } }),
      },
      parseSessionContent: () => ({ entries: [], malformedRecords: 0 }),
      logger: { info: () => { } },
    },
    events: eventBusAvailable ? { on: () => () => { } } : {},
    on: (name: string, handler: Handler) => { handlers.set(name, handler); },
    registerCommand: () => { },
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
const originalNow = Date.now;
let tick: () => void = () => { throw new Error("coordinator timer is not scheduled"); };
const timer = { unref() { return this; } };
let now = 1000;
globalThis.setInterval = ((callback: () => void) => {
  tick = callback;
  return timer;
}) as unknown as typeof setInterval;
globalThis.clearInterval = (() => {
  tick = () => { throw new Error("coordinator timer was cleared"); };
}) as typeof clearInterval;
Date.now = () => now;

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
  assert.ok(losses.some(loss => loss.reason === "fact queue overflow"));

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
  const generation = periodic.snapshot()?.generation;
  let periodicInvalidations = 0;
  periodic.onInvalidate(() => { periodicInvalidations++; });
  now += 5000;
  tick();
  assert.equal(periodicInvalidations, 0);
  assert.equal(periodic.snapshot()?.generation, (generation ?? 0) + 1);
  periodic.dispose();
  assert.equal(periodicInvalidations, 1);

  const mainHandlers = new Map<string, Handler>();
  const subHandlers = new Map<string, Handler>();
  const mainCtx = {
    agent: identity,
    sessionManager: { getSessionFile: () => "root-session" },
  } as unknown as ExtensionContext;
  const subCtx = {
    agent: { kind: "sub", id: "child", name: "task", depth: 1 },
    sessionManager: { getSessionFile: () => "child-session" },
  } as unknown as ExtensionContext;
  orcaObserver(makeApi("18.3.5", mainHandlers));
  orcaObserver(makeApi("18.3.5", subHandlers));
  await mainHandlers.get("session_start")!({}, mainCtx);
  const first = processCoordinator();
  assert.ok(first);
  await subHandlers.get("session_start")!({}, subCtx);
  await subHandlers.get("session_shutdown")!({}, subCtx);
  assert.equal(processCoordinator(), first);
  await mainHandlers.get("session_switch")!({}, mainCtx);
  assert.notEqual(processCoordinator()?.epoch(), first.epoch());
  await mainHandlers.get("session_shutdown")!({}, mainCtx);
} finally {
  processCoordinator()?.dispose();
  globalThis.setInterval = originalSetInterval;
  globalThis.clearInterval = originalClearInterval;
  Date.now = originalNow;
}
