import assert from "node:assert/strict";
import { createGrants } from "../auth";

{
  let now = 0;
  const grants = createGrants(() => now, "epoch-one");
  assert.equal(grants.epoch, "epoch-one");
  assert.throws(() => grants.bootstrap([], 10_000), /at least one child/);
  const childIds = ["A", "A", "B"];
  const bootstrap = grants.bootstrap(childIds, 10_000);
  childIds.push("C");
  assert.match(bootstrap.code, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(bootstrap.code, "base64url").byteLength, 32);
  assert.equal(bootstrap.expiresAt, new Date(60_000).toISOString());
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: ["A", "B"], pendingCodes: 1 });
  assert.equal(grants.exchange("unknown"), null);
  assert.equal(grants.exchange(`${bootstrap.code.slice(0, -1)}!`), null);
  now = 1_000;
  const session = grants.exchange(bootstrap.code);
  assert.ok(session);
  assert.match(session.credential, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(Buffer.from(session.credential, "base64url").byteLength, 32);
  assert.equal(session.expiresAt, new Date(11_000).toISOString());
  assert.equal(grants.exchange(bootstrap.code), null);
  assert.equal(grants.allows(bootstrap.code, "A"), false);
  assert.equal(grants.allows(session.credential, "A"), true);
  assert.equal(grants.allows(session.credential, "B"), true);
  assert.equal(grants.allows(session.credential, "C"), false);
  assert.equal(grants.allows(session.credential, "a"), false);
  assert.equal(grants.allows(session.credential, null), true);
  assert.equal(grants.allows("unknown", null), false);
  assert.equal(grants.signal("unknown", null), null);
  assert.equal(grants.signal(session.credential, "C"), null);
  assert.deepEqual(grants.status(), { liveCredentials: 1, grantedChildIds: ["A", "B"], pendingCodes: 0 });
  grants.dispose();
}

{
  let now = 0;
  const grants = createGrants(() => now, "code-expiry");
  const expired = grants.bootstrap(["expired"], 1_000);
  now = 60_000;
  assert.equal(grants.exchange(expired.code), null);
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  const lastMoment = grants.bootstrap(["last-moment"], 5);
  now = 119_999;
  const session = grants.exchange(lastMoment.code);
  assert.ok(session);
  assert.equal(session.expiresAt, new Date(120_004).toISOString());
  assert.equal(grants.allows(session.credential, "last-moment"), true);
  now = 120_004;
  assert.equal(grants.allows(session.credential, "last-moment"), false);
  grants.dispose();
}

{
  let now = 0;
  const grants = createGrants(() => now, "revocation");
  const session = grants.exchange(grants.bootstrap(["A", "B"], 120_000).code);
  const other = grants.exchange(grants.bootstrap(["A"], 120_000).code);
  assert.ok(session);
  assert.ok(other);
  const a = grants.signal(session.credential, "A");
  const b = grants.signal(session.credential, "B");
  const snapshot = grants.signal(session.credential, null);
  const otherA = grants.signal(other.credential, "A");
  const otherSnapshot = grants.signal(other.credential, null);
  assert.ok(a && b && snapshot && otherA && otherSnapshot);
  assert.equal(grants.signal(session.credential, "A"), a);
  const pending = grants.bootstrap(["A", "B", "pending"], 120_000);
  const removedPending = grants.bootstrap(["A"], 120_000);
  let observedAtomicRevocation = false;
  a.addEventListener("abort", () => {
    assert.equal(grants.allows(session.credential, "A"), false);
    assert.equal(grants.allows(other.credential, "A"), false);
    assert.equal(grants.exchange(removedPending.code), null);
    observedAtomicRevocation = true;
  });
  grants.revoke(["A"]);
  assert.equal(observedAtomicRevocation, true);
  assert.equal(a.aborted, true);
  assert.equal(otherA.aborted, true);
  assert.equal(otherSnapshot.aborted, true);
  assert.equal(b.aborted, false);
  assert.equal(snapshot.aborted, false);
  assert.equal(grants.allows(session.credential, "A"), false);
  assert.equal(grants.signal(session.credential, "A"), null);
  assert.equal(grants.allows(session.credential, "B"), true);
  assert.equal(grants.allows(session.credential, null), true);
  assert.deepEqual(grants.status(), { liveCredentials: 1, grantedChildIds: ["B", "pending"], pendingCodes: 1 });
  const narrowed = grants.exchange(pending.code);
  assert.ok(narrowed);
  assert.equal(grants.allows(narrowed.credential, "A"), false);
  assert.equal(grants.allows(narrowed.credential, "B"), true);
  grants.revoke(["B"]);
  assert.equal(b.aborted, true);
  assert.equal(snapshot.aborted, true);
  assert.equal(grants.allows(session.credential, null), false);
  assert.deepEqual(grants.status(), { liveCredentials: 1, grantedChildIds: ["pending"], pendingCodes: 0 });
  now = 60_000;
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  grants.dispose();
}

{
  let now = 0;
  const grants = createGrants(() => now, "ttl");
  const session = grants.exchange(grants.bootstrap(["A", "B"], 5_000).code);
  assert.ok(session);
  const signals = ["A", "B", null].map(childId => grants.signal(session.credential, childId));
  for (const signal of signals) assert.ok(signal);
  grants.bootstrap(["pending"], 30_000);
  now = 4_999;
  assert.equal(grants.allows(session.credential, null), true);
  for (const signal of signals) assert.equal(signal!.aborted, false);
  now = 5_000;
  assert.equal(grants.signal(session.credential, null), null);
  for (const signal of signals) assert.equal(signal!.aborted, true);
  assert.equal(grants.allows(session.credential, "A"), false);
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: ["pending"], pendingCodes: 1 });
  now = 60_000;
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  grants.dispose();
}

{
  let now = 0;
  const grants = createGrants(() => now, "idle");
  const session = grants.exchange(grants.bootstrap(["A", "B"], 300_000).code);
  assert.ok(session);
  const signals = ["A", "B", null].map(childId => grants.signal(session.credential, childId));
  for (const signal of signals) assert.ok(signal);
  now = 59_000;
  assert.equal(grants.allows(session.credential, null), true);
  now = 118_999;
  assert.equal(grants.allows(session.credential, "outside-scope"), false);
  assert.equal(grants.signal(session.credential, "A"), signals[0]);
  assert.equal(grants.status().liveCredentials, 1);
  for (const signal of signals) assert.equal(signal!.aborted, false);
  now = 119_000;
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  for (const signal of signals) assert.equal(signal!.aborted, true);
  assert.equal(grants.allows(session.credential, null), false);
  grants.dispose();
}

{
  let now = 0;
  const grants = createGrants(() => now, "never-polled");
  const session = grants.exchange(grants.bootstrap(["A"], 300_000).code);
  assert.ok(session);
  const signal = grants.signal(session.credential, "A");
  assert.ok(signal);
  now = 60_000;
  assert.equal(grants.allows(session.credential, "A"), false);
  assert.equal(signal.aborted, true);
  grants.dispose();
}

{
  const grants = createGrants(() => 0, "teardown");
  const session = grants.exchange(grants.bootstrap(["A", "B"], 120_000).code);
  assert.ok(session);
  const signals = ["A", "B", null].map(childId => grants.signal(session.credential, childId));
  for (const signal of signals) assert.ok(signal);
  const pending = grants.bootstrap(["pending"], 120_000);
  grants.revoke("all");
  for (const signal of signals) assert.equal(signal!.aborted, true);
  assert.equal(grants.exchange(pending.code), null);
  assert.equal(grants.allows(session.credential, null), false);
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  const next = grants.exchange(grants.bootstrap(["next"], 120_000).code);
  assert.ok(next);
  const nextChild = grants.signal(next.credential, "next");
  const nextSnapshot = grants.signal(next.credential, null);
  assert.ok(nextChild && nextSnapshot);
  const nextPending = grants.bootstrap(["pending-again"], 120_000);
  grants.dispose();
  assert.equal(nextChild.aborted, true);
  assert.equal(nextSnapshot.aborted, true);
  assert.equal(grants.exchange(nextPending.code), null);
  assert.equal(grants.allows(next.credential, null), false);
  assert.equal(grants.signal(next.credential, "next"), null);
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  assert.throws(() => grants.bootstrap(["new"], 120_000), /disposed/);
  grants.dispose();
  const nextEpoch = createGrants(() => 0, "new-epoch");
  assert.equal(nextEpoch.exchange(nextPending.code), null);
  assert.equal(nextEpoch.allows(next.credential, null), false);
  nextEpoch.dispose();
}

// A pending code reserves a credential slot: every valid exchange must succeed.
for (const liveCount of [0, 8, 16]) {
  let now = 0;
  const grants = createGrants(() => now, `capacity-${liveCount}`);
  const pending: string[] = [];
  for (let i = 0; i < 16; i++) {
    const bootstrap = grants.bootstrap([`child-${i}`], 1_000);
    if (i < liveCount) assert.ok(grants.exchange(bootstrap.code));
    else pending.push(bootstrap.code);
  }
  assert.equal(grants.status().liveCredentials, liveCount);
  assert.equal(grants.status().pendingCodes, 16 - liveCount);
  assert.throws(() => grants.bootstrap(["overflow"], 1_000), /capacity.*16/);
  for (const code of pending) assert.ok(grants.exchange(code));
  assert.equal(grants.status().liveCredentials, 16);
  assert.equal(grants.status().pendingCodes, 0);
  assert.throws(() => grants.bootstrap(["overflow"], 1_000), /capacity.*16/);
  grants.revoke(["child-0"]);
  const restored = grants.bootstrap(["restored"], 1_000);
  assert.equal(grants.status().liveCredentials, 15);
  assert.equal(grants.status().pendingCodes, 1);
  assert.throws(() => grants.bootstrap(["overflow"], 1_000), /capacity.*16/);
  now = 1_000;
  const afterExpiry = grants.bootstrap(["after-expiry"], 1_000);
  assert.deepEqual(grants.status(), {
    liveCredentials: 0, grantedChildIds: ["restored", "after-expiry"], pendingCodes: 2,
  });
  assert.ok(grants.exchange(restored.code));
  assert.ok(grants.exchange(afterExpiry.code));
  grants.dispose();
}

{
  let now = 0;
  const grants = createGrants(() => now, "pending-capacity");
  const codes: string[] = [];
  for (let i = 0; i < 16; i++) codes.push(grants.bootstrap([`child-${i}`], 120_000).code);
  assert.throws(() => grants.bootstrap(["overflow"], 120_000), /capacity.*16/);
  now = 60_000;
  const replacement = grants.bootstrap(["replacement"], 120_000);
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: ["replacement"], pendingCodes: 1 });
  for (const code of codes) assert.equal(grants.exchange(code), null);
  grants.revoke(["replacement"]);
  assert.equal(grants.exchange(replacement.code), null);
  assert.deepEqual(grants.status(), { liveCredentials: 0, grantedChildIds: [], pendingCodes: 0 });
  grants.dispose();
}
