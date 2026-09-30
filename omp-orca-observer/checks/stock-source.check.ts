import assert from "node:assert/strict";
import fs, { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { AgentRef, ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { ChildFact, OutcomeTracker, RunOutcome, SnapshotSource } from "../contract.ts";
import { startCoordinator } from "../coordinator.ts";
import { createStockSource } from "../stock-source.ts";

class FakeOutcomes implements OutcomeTracker {
  values = new Map<string, RunOutcome>();
  forgotten: string[] = [];
  calls = { record: 0, evidenceLost: 0, outcome: 0, forget: 0, clear: 0 };

  record(_fact: ChildFact): void {
    this.calls.record++;
  }

  evidenceLost(_reason: string, _childId?: string): void {
    this.calls.evidenceLost++;
  }

  outcome(childId: string): RunOutcome {
    this.calls.outcome++;
    return this.values.get(childId) ?? { state: "unknown", reason: "no evidence" };
  }

  forget(childId: string): void {
    this.calls.forget++;
    this.forgotten.push(childId);
    this.values.delete(childId);
  }

  clear(): void {
    this.calls.clear++;
    this.values.clear();
  }
}

class FakeRegistry {
  calls = { global: 0, list: 0, get: 0, onChange: 0, unsubscribe: 0 };
  listeners = new Set<() => void>();

  constructor(public refs: AgentRef[]) { }

  list(): AgentRef[] {
    this.calls.list++;
    return [...this.refs];
  }

  get(id: string): AgentRef | undefined {
    this.calls.get++;
    return this.refs.find(ref => ref.id === id);
  }

  onChange(listener: () => void): () => void {
    this.calls.onChange++;
    this.listeners.add(listener);
    return () => {
      this.calls.unsubscribe++;
      this.listeners.delete(listener);
    };
  }

  change(): void {
    for (const listener of this.listeners) listener();
  }
}

const directory = mkdtempSync(join(tmpdir(), "observer-stock-source-check-"));
const sources: SnapshotSource[] = [];

function fixture(name: string) {
  const root = join(directory, `${name}.jsonl`);
  const artifacts = join(directory, name);
  writeFileSync(root, "{}\n");
  mkdirSync(artifacts);
  return {
    root,
    artifacts,
    transcript(name: string): string {
      const file = join(artifacts, name);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, "{}\n");
      return file;
    },
  };
}

function child(id: string, sessionFile: string | null, changes: Partial<AgentRef> = {}): AgentRef {
  return {
    id,
    displayName: `agent-${id}`,
    kind: "sub",
    parentId: "Main",
    status: "running",
    session: null,
    sessionFile,
    createdAt: 1000,
    lastActivity: 2000,
    ...changes,
  };
}

function harness(root: string | null, refs: AgentRef[] = []) {
  const registry = new FakeRegistry(refs);
  const outcomes = new FakeOutcomes();
  const pi = {
    pi: {
      MAIN_AGENT_ID: "Main",
      AgentRegistry: {
        global() {
          registry.calls.global++;
          return registry;
        },
      },
    },
  } as unknown as ExtensionAPI;
  const source = createStockSource(pi, root, outcomes);
  sources.push(source);
  assert.deepEqual(registry.calls, { global: 1, list: 0, get: 0, onChange: 1, unsubscribe: 0 });
  return { source, registry, outcomes };
}

function evidence(state: "started" | "completed" | "failed" | "aborted"): RunOutcome {
  return { state, generation: 7, spawnCallId: { known: true, value: "spawn-7" }, at: "2026-09-30T00:00:00.000Z" };
}

try {
  // Status never exempts an old tree, and every ancestor must independently be admitted.
  const scope = fixture("scope");
  const parentFile = scope.transcript("parent.jsonl");
  const nestedFile = scope.transcript("parent/nested.jsonl");
  const blockedFile = scope.transcript("blocked.jsonl");
  const advisorFile = scope.transcript("__advisor.review.jsonl");
  const h = harness(scope.root, [
    child("old-parked", join(directory, "old-tree", "parked.jsonl"), { status: "parked" }),
    child("old-running", join(directory, "old-tree", "running.jsonl")),
    child("another-main", scope.transcript("another-main.jsonl"), { kind: "main" }),
    child("root-as-child", scope.root),
    child("advisor", advisorFile, { kind: "advisor" }),
    child("nested", nestedFile, { parentId: "parent" }),
    child("parent", parentFile, { status: "parked" }),
    child("blocked", blockedFile, { parentId: "old-running" }),
  ]);
  const scoped = h.source.collect(256);
  assert.deepEqual(scoped.rows.map(row => row.childId), ["nested", "parent"]);
  assert.equal(scoped.inventory.state, "unavailable");
  assert.equal(scoped.rows[0]!.parentId, "parent");
  assert.equal(scoped.rows[0]!.rootSession, scope.root);
  assert.equal(scoped.rows[0]!.kind, "sub");
  assert.equal(scoped.rows[0]!.agentName, "agent-nested");
  assert.equal(scoped.rows[1]!.registryStatus, "parked");
  for (const id of ["old-parked", "old-running", "another-main", "root-as-child", "advisor", "blocked", "absent"]) {
    assert.equal(h.source.admittedSessionFile(id), null, id);
  }
  assert.equal(h.source.admittedSessionFile("nested"), nestedFile);
  assert.equal(h.source.admittedSessionFile("parent"), parentFile);

  const noRoot = harness(null, [child("unscoped", parentFile)]);
  assert.deepEqual(noRoot.source.collect(256), {
    rootSession: { known: false, reason: "no root session file" },
    inventory: { state: "unavailable", reason: "no root session file" },
    rows: [],
  });
  assert.equal(noRoot.source.admittedSessionFile("unscoped"), null);

  // Incomplete persisted metadata stays visible by filename; no hydration is attempted.
  const restoration = fixture("restoration");
  const restoredParent = restoration.transcript("parent.jsonl");
  const restoredNested = restoration.transcript("parent/nested.jsonl");
  const incomplete = restoration.transcript("incomplete-metadata.jsonl");
  restoration.transcript("ignored.bak.jsonl");
  restoration.transcript("ignored.jsonl.bak");
  restoration.transcript("__advisor.jsonl");
  restoration.transcript("parent/__advisor.named.jsonl");
  const restoring = harness(restoration.root);
  const emptyRegistry = restoring.source.collect(256);
  assert.equal(emptyRegistry.inventory.state, "unknown");
  assert.match(emptyRegistry.inventory.reason, /^registry not fully restored: 0 of 3;/);
  assert.match(emptyRegistry.inventory.reason, /incomplete-metadata\.jsonl/);
  assert.match(emptyRegistry.inventory.reason, /parent[/\\]nested\.jsonl/);
  restoring.registry.refs = [child("parent", restoredParent)];
  const partiallyRestored = restoring.source.collect(256);
  assert.equal(partiallyRestored.inventory.state, "unknown");
  assert.match(partiallyRestored.inventory.reason, /^registry not fully restored: 1 of 3;/);
  assert.match(partiallyRestored.inventory.reason, /incomplete-metadata\.jsonl/);
  restoring.registry.refs.push(child("nested", restoredNested, { parentId: "parent" }), child("incomplete", incomplete));
  assert.deepEqual(restoring.source.collect(256).inventory, { state: "complete" });
  const noChildren = fixture("no-children");
  assert.deepEqual(harness(noChildren.root).source.collect(256).inventory, { state: "complete" });
  rmSync(noChildren.artifacts, { recursive: true });
  assert.deepEqual(harness(noChildren.root).source.collect(256).inventory, { state: "complete" });

  const capped = fixture("capped");
  const capRefs = ["third", "first", "second"].map(id => child(id, capped.transcript(`${id}.jsonl`)));
  const cap = harness(capped.root, capRefs);
  const limited = cap.source.collect(2);
  assert.deepEqual(limited.rows.map(row => row.childId), ["third", "first"]);
  assert.deepEqual(limited.inventory, { state: "partial", reason: "cap 2 of 3" });
  assert.equal(cap.source.admittedSessionFile("second"), capRefs[2]!.sessionFile);
  assert.equal(cap.registry.calls.list, 1);

  const facts = fixture("facts");
  const absentFile = facts.transcript("absent-facts.jsonl");
  writeFileSync(`${absentFile}.tombstone`, "killed\n");
  const missingFacts = harness(facts.root, [child("absent-facts", absentFile, { status: "aborted" })]);
  const unknownRow = missingFacts.source.collect(256).rows[0]!;
  assert.equal(unknownRow.registryStatus, "aborted");
  assert.equal(unknownRow.tombstoned, true);
  assert.deepEqual(unknownRow.modelRole, { known: false, reason: "model role not recorded" });
  assert.deepEqual(unknownRow.resolvedModel, { known: false, reason: "resolved model not recorded" });
  for (const milestone of Object.values(unknownRow.milestones)) {
    assert.deepEqual(milestone, { known: false, reason: "not recorded" });
  }
  for (const field of Object.values(unknownRow.lineage)) assert.equal(field.known, false);
  assert.deepEqual(unknownRow.activity, { sampled: true, lastActivityAt: { known: true, value: "1970-01-01T00:00:02.000Z" } });
  assert.equal(unknownRow.grantScope, "none");

  const native = fixture("native-facts");
  const nativeFile = native.transcript("native.jsonl");
  const cwd = join(directory, "native-cwd");
  let liveReads = 0;
  const session = {
    get servingModel() {
      liveReads++;
      return { selector: "live/served" };
    },
    sessionManager: {
      getCwd() {
        liveReads++;
        return cwd;
      },
    },
  } as unknown as NonNullable<AgentRef["session"]>;
  const nativeRef = child("native", nativeFile, {
    session,
    history: { modelRole: "native-role", resolvedModel: "history/served", branchName: "native-branch" },
    lifecycle: { responseAt: 0, acceptedAt: 1000, terminalAt: 2000 },
    lastActivity: 3000,
  });
  const live = harness(native.root, [nativeRef]);
  const nativeRow = live.source.collect(256).rows[0]!;
  assert.deepEqual(nativeRow.modelRole, { known: true, value: "native-role" });
  assert.deepEqual(nativeRow.resolvedModel, { known: true, value: "history/served" });
  assert.deepEqual(nativeRow.lineage.cwd, { known: true, value: cwd });
  assert.deepEqual(nativeRow.lineage.branch, { known: true, value: "native-branch" });
  assert.deepEqual(nativeRow.milestones, {
    responseAt: { known: true, value: "1970-01-01T00:00:00.000Z" },
    acceptedAt: { known: true, value: "1970-01-01T00:00:01.000Z" },
    terminalAt: { known: true, value: "1970-01-01T00:00:02.000Z" },
  });
  assert.equal(nativeRow.tombstoned, false);
  live.registry.refs = [{ ...nativeRef, history: undefined }];
  const liveOnly = live.source.collect(256).rows[0]!;
  assert.deepEqual(liveOnly.resolvedModel, { known: true, value: "live/served" });
  assert.deepEqual(liveOnly.modelRole, { known: false, reason: "model role not recorded" });

  const conflict = fixture("conflict");
  const conflictRef = child("conflict", conflict.transcript("conflict.jsonl"));
  const outcome = harness(conflict.root, [conflictRef]);
  outcome.outcomes.values.set("conflict", evidence("completed"));
  assert.deepEqual(outcome.source.collect(256).rows[0]!.outcome, { state: "unknown", reason: "conflicting evidence" });
  assert.equal(outcome.registry.refs[0]!.status, "running");
  outcome.registry.refs = [{ ...conflictRef, status: "idle" }];
  outcome.outcomes.values.set("conflict", evidence("started"));
  assert.deepEqual(outcome.source.collect(256).rows[0]!.outcome, { state: "unknown", reason: "conflicting evidence" });
  assert.equal(outcome.registry.refs[0]!.status, "idle");
  outcome.registry.refs = [conflictRef];
  assert.deepEqual(outcome.source.collect(256).rows[0]!.outcome, evidence("started"));
  outcome.registry.refs = [{ ...conflictRef, status: "parked" }];
  outcome.outcomes.values.set("conflict", evidence("failed"));
  assert.deepEqual(outcome.source.collect(256).rows[0]!.outcome, evidence("failed"));

  const replacement = fixture("replacement");
  const firstFile = replacement.transcript("first.jsonl");
  const nextFile = replacement.transcript("next.jsonl");
  const initialRef = child("same-id", firstFile, { status: "idle" });
  const incarnation = harness(replacement.root, [initialRef]);
  incarnation.outcomes.values.set("same-id", evidence("completed"));
  assert.deepEqual(incarnation.source.collect(256).rows[0]!.outcome, evidence("completed"));
  assert.deepEqual(incarnation.outcomes.forgotten, []);
  incarnation.registry.refs = [{ ...initialRef, createdAt: initialRef.createdAt + 1 }];
  assert.deepEqual(incarnation.source.collect(256).rows[0]!.outcome, { state: "unknown", reason: "no evidence" });
  assert.deepEqual(incarnation.outcomes.forgotten, ["same-id"]);
  incarnation.outcomes.values.set("same-id", evidence("completed"));
  incarnation.registry.refs = [{ ...incarnation.registry.refs[0]!, sessionFile: nextFile }];
  assert.equal(incarnation.source.admittedSessionFile("same-id"), nextFile);
  assert.deepEqual(incarnation.outcomes.forgotten, ["same-id"]);
  assert.deepEqual(incarnation.source.collect(256).rows[0]!.outcome, { state: "unknown", reason: "no evidence" });
  assert.deepEqual(incarnation.outcomes.forgotten, ["same-id", "same-id"]);
  incarnation.outcomes.values.set("same-id", evidence("completed"));
  assert.deepEqual(incarnation.source.collect(256).rows[0]!.outcome, evidence("completed"));
  assert.equal(incarnation.outcomes.calls.forget, 2);

  const invalid = fixture("invalid");
  const missingFile = harness(invalid.root, [child("no-file", null)]);
  assert.deepEqual(missingFile.source.collect(256).inventory, { state: "unavailable", reason: "no session file: no-file" });
  assert.equal(missingFile.source.admittedSessionFile("no-file"), null);
  const orphan = harness(invalid.root, [child("orphan", invalid.transcript("orphan.jsonl"), { parentId: "missing-parent" })]);
  assert.deepEqual(orphan.source.collect(256).inventory, { state: "unavailable", reason: "broken parent chain: orphan" });
  assert.equal(orphan.source.admittedSessionFile("orphan"), null);
  const cycle = harness(invalid.root, [
    child("cycle-a", invalid.transcript("cycle-a.jsonl"), { parentId: "cycle-b" }),
    child("cycle-b", invalid.transcript("cycle-b.jsonl"), { parentId: "cycle-a" }),
  ]);
  assert.equal(cycle.source.collect(256).inventory.state, "unavailable");
  assert.equal(cycle.source.admittedSessionFile("cycle-a"), null);

  // A real directory-walk exception must not silently produce an empty complete inventory.
  const interruptedRoot = join(directory, "interrupted.jsonl");
  writeFileSync(interruptedRoot, "{}\n");
  writeFileSync(join(directory, "interrupted"), "not a directory\n");
  assert.equal(harness(interruptedRoot).source.collect(256).inventory.state, "partial");
  const bounded = fixture("bounded");
  for (let i = 0; i < 8193; i++) bounded.transcript(`unrestored-${i}.jsonl`);
  assert.equal(harness(bounded.root).source.collect(256).inventory.state, "partial");

  // Exercise the actual process coordinator; callbacks must not collect, read refs, or consume evidence.
  const coordinator = startCoordinator({ source: live.source, outcomes: live.outcomes, limit: 256 });
  const statSync = fs.statSync;
  const opendirSync = fs.opendirSync;
  try {
    let filesystemCalls = 0;
    fs.statSync = () => {
      filesystemCalls++;
      throw new Error("filesystem stat during registry callback");
    };
    fs.opendirSync = () => {
      filesystemCalls++;
      throw new Error("filesystem enumeration during registry callback");
    };
    assert.equal(live.source.collect(256).inventory.state, "partial");
    assert.equal(filesystemCalls, 1);
    filesystemCalls = 0;
    let dirtyMarks = 0;
    const markDirty = coordinator.markDirty;
    coordinator.markDirty = () => {
      dirtyMarks++;
      markDirty();
    };
    const before = { registry: { ...live.registry.calls }, outcomes: { ...live.outcomes.calls }, liveReads };
    live.registry.change();
    assert.equal(dirtyMarks, 1);
    assert.deepEqual({ registry: { ...live.registry.calls }, outcomes: { ...live.outcomes.calls }, liveReads }, before);
    assert.equal(filesystemCalls, 0);
    assert.equal(live.registry.listeners.size, 1);
    assert.equal(live.registry.calls.onChange, 1);
    live.source.dispose();
    assert.equal(live.registry.listeners.size, 0);
    assert.equal(live.registry.calls.unsubscribe, 1);
    live.registry.change();
    live.source.dispose();
    assert.equal(dirtyMarks, 1);
    assert.equal(live.registry.calls.unsubscribe, 1);
    assert.equal(live.source.admittedSessionFile("native"), null);
  } finally {
    fs.statSync = statSync;
    fs.opendirSync = opendirSync;
    coordinator.dispose();
  }
} finally {
  for (const source of sources) source.dispose();
  rmSync(directory, { recursive: true, force: true });
}
