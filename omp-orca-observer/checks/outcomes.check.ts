import assert from "node:assert/strict";
import type { ChildFact } from "../contract";
import { createOutcomeTracker } from "../outcomes";

function fact(
  childId: string,
  status: ChildFact["status"],
  spawnCallId: string | null = "shared-call",
  at = "2026-09-30T00:00:00.000Z",
): ChildFact {
  return { kind: "lifecycle", childId, sessionFile: null, spawnCallId, status, at };
}

const tracker = createOutcomeTracker();
assert.deepEqual(tracker.outcome("untracked"), { state: "unknown", reason: "no lifecycle evidence" });
tracker.record(fact("child", "started"));
assert.deepEqual(tracker.outcome("child"), {
  state: "started", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});
tracker.record(fact("child", "completed", "shared-call", "2026-09-30T00:01:00.000Z"));
const completed = tracker.outcome("child");
assert.deepEqual(completed, {
  state: "completed", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:01:00.000Z",
});
tracker.record(fact("child", "completed", "different-call", "2026-09-30T00:02:00.000Z"));
assert.deepEqual(tracker.outcome("child"), {
  state: "completed", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:01:00.000Z",
});
tracker.record(fact("child", "started"));
assert.deepEqual(tracker.outcome("child"), {
  state: "started", generation: 2,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});

// Native frames cannot distinguish a late terminal from the new run's terminal.
for (const order of [["failed", "completed"], ["completed", "failed"]] as const) {
  const ambiguous = createOutcomeTracker();
  ambiguous.record(fact("child", "started"));
  ambiguous.record(fact("child", "completed"));
  ambiguous.record(fact("child", "started"));
  ambiguous.record(fact("child", order[0]));
  assert.deepEqual(ambiguous.outcome("child"), {
    state: order[0], generation: 2,
    spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
  });
  ambiguous.record(fact("child", order[1]));
  assert.deepEqual(ambiguous.outcome("child"), { state: "unknown", reason: "ambiguous terminal evidence" });
  for (const status of ["completed", "failed", "aborted"] as const) {
    ambiguous.record(fact("child", status));
    assert.deepEqual(ambiguous.outcome("child"), { state: "unknown", reason: "ambiguous terminal evidence" });
  }
  ambiguous.record(fact("child", "started", "different-call"));
  ambiguous.record(fact("child", "aborted", null));
  assert.deepEqual(ambiguous.outcome("child"), {
    state: "aborted", generation: 3,
    spawnCallId: { known: false, reason: "no spawn call id" }, at: "2026-09-30T00:00:00.000Z",
  });
}

for (const status of ["completed", "failed", "aborted"] as const) {
  const terminals = createOutcomeTracker();
  terminals.record(fact("child", status));
  assert.deepEqual(terminals.outcome("child"), { state: "unknown", reason: "terminal without observed start" });
  terminals.record(fact("child", "completed"));
  assert.deepEqual(terminals.outcome("child"), { state: "unknown", reason: "terminal without observed start" });
  terminals.record(fact("child", "started", null));
  assert.deepEqual(terminals.outcome("child"), {
    state: "started", generation: 1,
    spawnCallId: { known: false, reason: "no spawn call id" }, at: "2026-09-30T00:00:00.000Z",
  });
  terminals.record(fact("child", status));
  const terminal = terminals.outcome("child");
  assert.deepEqual(terminal, {
    state: status, generation: 1,
    spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
  });
  terminals.record(fact("child", status, null, "2026-09-30T00:03:00.000Z"));
  assert.deepEqual(terminals.outcome("child"), {
    state: status, generation: 1,
    spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
  });
}

const replay = createOutcomeTracker();
replay.record(fact("child", "started", null, "2000-01-01T00:00:00.000Z"));
assert.equal(replay.outcome("child").state, "started");
replay.record(fact("child", "started", null, "2000-01-01T00:00:00.000Z"));
assert.deepEqual(replay.outcome("child"), {
  state: "started", generation: 2,
  spawnCallId: { known: false, reason: "no spawn call id" }, at: "2000-01-01T00:00:00.000Z",
});

const loss = createOutcomeTracker();
loss.record(fact("affected", "started"));
loss.record(fact("affected", "completed"));
loss.record(fact("other", "started"));
const other = loss.outcome("other");
loss.evidenceLost("child evidence lost", "affected");
assert.deepEqual(loss.outcome("affected"), { state: "unknown", reason: "child evidence lost" });
assert.deepEqual(loss.outcome("other"), other);
for (const status of ["completed", "failed", "aborted"] as const) {
  loss.record(fact("affected", status));
  assert.deepEqual(loss.outcome("affected"), { state: "unknown", reason: "child evidence lost" });
}
loss.record(fact("affected", "started"));
loss.record(fact("affected", "completed"));
assert.deepEqual(loss.outcome("affected"), {
  state: "completed", generation: 2,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});
loss.evidenceLost("global evidence lost");
for (const childId of ["affected", "other"]) {
  loss.record(fact(childId, "completed"));
  assert.deepEqual(loss.outcome(childId), { state: "unknown", reason: "global evidence lost" });
}
loss.record(fact("affected", "started"));
loss.record(fact("affected", "failed"));
assert.deepEqual(loss.outcome("affected"), {
  state: "failed", generation: 3,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});
assert.deepEqual(loss.outcome("other"), { state: "unknown", reason: "global evidence lost" });
loss.record(fact("other", "started"));
loss.record(fact("other", "aborted"));
assert.deepEqual(loss.outcome("other"), {
  state: "aborted", generation: 2,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});
loss.evidenceLost("loss before start", "");
loss.record(fact("", "completed"));
assert.deepEqual(loss.outcome(""), { state: "unknown", reason: "loss before start" });
assert.equal(loss.outcome("other").state, "aborted");
loss.record(fact("", "started"));
loss.record(fact("", "completed"));
assert.deepEqual(loss.outcome(""), {
  state: "completed", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});

loss.forget("affected");
assert.deepEqual(loss.outcome("affected"), { state: "unknown", reason: "no lifecycle evidence" });
assert.equal(loss.outcome("other").state, "aborted");
loss.record(fact("affected", "completed"));
assert.deepEqual(loss.outcome("affected"), { state: "unknown", reason: "terminal without observed start" });
loss.record(fact("affected", "started"));
assert.deepEqual(loss.outcome("affected"), {
  state: "started", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});
loss.clear();
for (const childId of ["affected", "other", ""]) {
  assert.deepEqual(loss.outcome(childId), { state: "unknown", reason: "no lifecycle evidence" });
}
loss.record(fact("other", "started"));
assert.deepEqual(loss.outcome("other"), {
  state: "started", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});

const capacity = createOutcomeTracker();
for (let i = 0; i < 4_096; i++) capacity.record(fact(`child-${i}`, "started"));
assert.equal(capacity.outcome("child-0").state, "started");
assert.equal(capacity.outcome("child-4095").state, "started");
capacity.record(fact("extra", "started"));
assert.deepEqual(capacity.outcome("child-1"), { state: "unknown", reason: "evicted" });
assert.equal(capacity.outcome("child-0").state, "started");
capacity.record(fact("child-2", "completed"));
capacity.record(fact("extra-2", "started"));
assert.deepEqual(capacity.outcome("child-3"), { state: "unknown", reason: "evicted" });
assert.equal(capacity.outcome("child-2").state, "completed");
capacity.evidenceLost("loss refreshes recency", "child-4");
capacity.evidenceLost("new child loss", "new-child");
assert.deepEqual(capacity.outcome("child-5"), { state: "unknown", reason: "evicted" });
assert.deepEqual(capacity.outcome("child-4"), { state: "unknown", reason: "loss refreshes recency" });
assert.deepEqual(capacity.outcome("new-child"), { state: "unknown", reason: "new child loss" });
capacity.forget("child-1");
assert.deepEqual(capacity.outcome("child-1"), { state: "unknown", reason: "no lifecycle evidence" });
capacity.record(fact("child-3", "completed"));
assert.deepEqual(capacity.outcome("child-3"), { state: "unknown", reason: "terminal without observed start" });
capacity.record(fact("child-3", "started"));
assert.deepEqual(capacity.outcome("child-3"), {
  state: "started", generation: 1,
  spawnCallId: { known: true, value: "shared-call" }, at: "2026-09-30T00:00:00.000Z",
});
capacity.clear();
for (const childId of ["child-0", "child-3", "child-5", "new-child"]) {
  assert.deepEqual(capacity.outcome(childId), { state: "unknown", reason: "no lifecycle evidence" });
}

// Eviction history is bounded too: older ids stay unknown, but lose the eviction reason.
const history = createOutcomeTracker();
for (let i = 0; i < 8_193; i++) history.record(fact(`child-${i}`, "started"));
assert.deepEqual(history.outcome("child-0"), { state: "unknown", reason: "no lifecycle evidence" });
assert.deepEqual(history.outcome("child-1"), { state: "unknown", reason: "evicted" });
assert.deepEqual(history.outcome("never-seen"), { state: "unknown", reason: "no lifecycle evidence" });
assert.equal(history.outcome("child-4097").state, "started");
assert.equal(history.outcome("child-8192").state, "started");


