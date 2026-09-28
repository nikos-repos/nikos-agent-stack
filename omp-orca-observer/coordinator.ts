import { randomUUID } from "node:crypto";
import {
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  type ChildFact,
  type Coordinator,
  type ObserverState,
  type OutcomeTracker,
  type Snapshot,
  type SnapshotSource,
} from "./contract.ts";

type Options = {
  source: SnapshotSource | null;
  outcomes: OutcomeTracker | null;
  limit: number;
};
type PendingFact = { fact: ChildFact; ticks: number };

const FACT_QUEUE_LIMIT = 1024;
const TICK_MS = 250;
const FORCE_REBUILD_MS = 5000;
let active: Coordinator | null = null;

/** The current process coordinator is absent after its publisher disposes it. */
export function processCoordinator(): Coordinator | null {
  return active;
}

/** One publisher owns a coordinator per process until disposal; callbacks only enqueue work. */
export function startCoordinator(options: Options): Coordinator {
  if (active) return active;

  const epoch = randomUUID();
  const queue = new Array<PendingFact | undefined>(FACT_QUEUE_LIMIT);
  const listeners = new Set<() => void>();
  let head = 0;
  let length = 0;
  let dirty = true;
  let lastBuild = 0;
  let generation = 0;
  let snapshot: Snapshot | null = null;
  let state: ObserverState = { state: "ready" };
  let disposed = false;

  function enqueue(pending: PendingFact): void {
    if (length === FACT_QUEUE_LIMIT) {
      queue[head] = pending;
      head = (head + 1) % FACT_QUEUE_LIMIT;
      options.outcomes?.evidenceLost("fact queue overflow");
      dirty = true;
      return;
    }
    queue[(head + length) % FACT_QUEUE_LIMIT] = pending;
    length++;
  }

  function invalidate(): void {
    for (const listener of listeners) listener();
  }

  function rebuild(now: number): void {
    const observedAt = new Date(now).toISOString();
    const result = options.source?.collect(options.limit);
    const children = result ? result.rows.slice(0, options.limit) : [];
    const next: Snapshot = {
      schema: SNAPSHOT_SCHEMA_VERSION,
      epoch,
      generation: ++generation,
      observedAt,
      rootSession: result?.rootSession ?? { known: false, reason: "no source" },
      inventory: result?.inventory ?? { state: "unknown", reason: "no source" },
      children,
    };
    let bytes = Buffer.byteLength(JSON.stringify(next));
    if (bytes > SNAPSHOT_MAX_BYTES) {
      next.inventory = { state: "partial", reason: "snapshot byte cap" };
      bytes = Buffer.byteLength(JSON.stringify(next));
      while (bytes > SNAPSHOT_MAX_BYTES && children.length > 0) {
        const removed = children.pop()!;
        bytes -= Buffer.byteLength(JSON.stringify(removed));
        if (children.length > 0) bytes--; // the comma preceding the removed row
      }
    }
    snapshot = next;
    lastBuild = now;
    dirty = false;
  }

  function tick(): void {
    if (disposed || state.state !== "ready") return;
    try {
      // The queue is bounded, so every pending fact gets one attempt per tick.
      const work = length;
      for (let i = 0; i < work; i++) {
        const pending = queue[head]!;
        queue[head] = undefined;
        head = (head + 1) % FACT_QUEUE_LIMIT;
        length--;
        const admitted = options.source?.admittedSessionFile(pending.fact.childId) ?? null;
        if (admitted !== null && pending.fact.sessionFile === admitted) {
          options.outcomes?.record(pending.fact);
          dirty = true;
        } else if (admitted === null) {
          if (++pending.ticks === 2) {
            options.outcomes?.evidenceLost("unattributed lifecycle fact", pending.fact.childId);
            dirty = true;
          } else {
            enqueue(pending);
          }
        }
        // A different admitted file identifies an older incarnation or root.
      }
      const now = Date.now();
      if (dirty || now - lastBuild >= FORCE_REBUILD_MS) rebuild(now);
    } catch {
      // An observer failure must not escape the timer into native execution.
      state = { state: "unavailable", reason: "coordinator source failed" };
      snapshot = null;
      clearInterval(timer);
      invalidate();
    }
  }

  const timer = setInterval(tick, TICK_MS);
  timer.unref();
  const coordinator: Coordinator = {
    state: () => state,
    recordFact(fact) {
      if (!disposed && state.state === "ready") enqueue({ fact, ticks: 0 });
    },
    markDirty() {
      if (!disposed && state.state === "ready") dirty = true;
    },
    snapshot: () => snapshot,
    epoch: () => epoch,
    onInvalidate(listener) {
      if (disposed) {
        listener();
        return () => { };
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      clearInterval(timer);
      active = null;
      state = { state: "unavailable", reason: "disposed" };
      snapshot = null;
      invalidate();
      listeners.clear();
    },
  };
  active = coordinator;
  return coordinator;
}
