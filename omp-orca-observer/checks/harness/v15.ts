import assert from "node:assert";
import { fileURLToPath } from "node:url";
import { parseSessionContent } from "@oh-my-pi/pi-coding-agent";
import {
  ROUTES, SCHEMA_HEADER, SNAPSHOT_SCHEMA_VERSION,
  type ChildRow, type Coordinator, type Endpoint, type Grants, type SnapshotSource, type ReadResult
} from "../../contract.ts";
import { createGrants } from "../../auth.ts";
import { processCoordinator, startCoordinator } from "../../coordinator.ts";
import { readPage } from "../../reader.ts";
import { serve } from "../../transport.ts";

const childId = "synthetic-child";
const file = fileURLToPath(new URL("./fixtures/small.jsonl", import.meta.url));
const known = <T>(value: T) => ({ known: true as const, value });

function source(): SnapshotSource {
  let disposed = false;
  return {
    collect() {
      assert.equal(disposed, false);
      const now = new Date().toISOString();
      const row: ChildRow = {
        childId, parentId: "synthetic-root", rootSession: "synthetic-root", kind: "sub",
        agentName: "fixture", modelRole: known("task"), resolvedModel: known("stub/scripted"),
        registryStatus: "idle", tombstoned: false,
        outcome: { state: "completed", generation: 1, spawnCallId: known("synthetic-call"), at: now },
        milestones: { responseAt: known(now), acceptedAt: known(now), terminalAt: known(now) },
        activity: { sampled: true, lastActivityAt: known(now) },
        lineage: {
          repoRoot: { known: false, reason: "synthetic source has no repo" },
          cwd: { known: false, reason: "synthetic source has no cwd" },
          parentWorktree: { known: false, reason: "synthetic source has no worktree" },
          childWorktree: { known: false, reason: "synthetic source has no worktree" },
          isolation: known("none"), branch: { known: false, reason: "synthetic source has no branch" },
        },
        completeness: { state: "complete" }, observedAt: now, grantScope: "none",
      };
      return { rootSession: known("synthetic-root"), inventory: { state: "complete" as const }, rows: [row] };
    },
    admittedSessionFile(id) { return !disposed && id === childId ? file : null; },
    dispose() { disposed = true; },
  };
}

async function snapshotReady(coordinator: Coordinator): Promise<void> {
  coordinator.markDirty();
  let snapshot = coordinator.snapshot();
  for (let attempt = 0; attempt < 100 && !snapshot; attempt++) {
    await Bun.sleep(20);
    snapshot = coordinator.snapshot();
  }
  assert.ok(snapshot, "Synthetic coordinator did not produce a snapshot");
}

async function exchange(endpoint: Endpoint, grants: Grants): Promise<{ Authorization: string }> {
  const { code } = grants.bootstrap([childId], 60_000);
  const response = await fetch(new URL(ROUTES.session, endpoint.url), {
    method: "POST", body: JSON.stringify({ code }),
  });
  assert.equal(response.status, 200);
  const session = await response.json() as { credential: string };
  return { Authorization: `Bearer ${session.credential}` };
}

async function main(): Promise<void> {
  assert.equal(processCoordinator(), null);
  let coordinator: Coordinator | undefined;
  let endpoint: Endpoint | undefined;
  let grants: Grants | undefined;
  try {
    const firstSource = source();
    coordinator = startCoordinator({ source: firstSource, outcomes: null, limit: 8 });
    assert.strictEqual(processCoordinator(), coordinator);
    await snapshotReady(coordinator);
    const initial = coordinator;
    grants = createGrants(Date.now, initial.epoch());
    endpoint = await serve({
      epoch: initial.epoch(), snapshot: () => initial.snapshot(), state: () => initial.state(),
      admittedSessionFile: id => firstSource.admittedSessionFile(id),
      read: request => readPage(request, parseSessionContent), grants, port: 0,
    });
    const authorization = await exchange(endpoint, grants);
    const snapshotResponse = await fetch(new URL(ROUTES.snapshot, endpoint.url), { headers: authorization });
    assert.equal(snapshotResponse.status, 200);
    assert.equal(snapshotResponse.headers.get(SCHEMA_HEADER), String(SNAPSHOT_SCHEMA_VERSION));
    assert.equal(snapshotResponse.headers.get("cache-control"), "no-store");
    const snapshot = await snapshotResponse.json() as { epoch: string; children: ChildRow[] };
    assert.equal(snapshot.epoch, coordinator.epoch());
    assert.equal(snapshot.children.length, 1);
    assert.equal(snapshot.children[0]?.childId, childId);
    assert.equal(Object.hasOwn(snapshot, "orca"), false);
    const pagePath = ROUTES.page.replace(":childId", encodeURIComponent(childId));
    const firstPageResponse = await fetch(new URL(`${pagePath}?mode=entries`, endpoint.url), { headers: authorization });
    assert.equal(firstPageResponse.status, 200);
    const firstPage = await firstPageResponse.json() as ReadResult;
    assert.equal(firstPage.kind, "page");
    if (firstPage.kind !== "page") assert.fail("Expected bounded fixture page");
    assert.equal(firstPage.mode, "entries");
    assert.ok((firstPage.entries?.length ?? 0) > 0);
    assert.ok(firstPage.token);
    assert.equal(firstPage.reset, false);
    const oldToken = firstPage.token;
    await endpoint.close();
    endpoint = undefined;
    grants.dispose();
    grants = undefined;
    coordinator.dispose();
    coordinator = undefined;
    assert.equal(processCoordinator(), null);

    const restartedSource = source();
    coordinator = startCoordinator({ source: restartedSource, outcomes: null, limit: 8 });
    assert.notEqual(coordinator.epoch(), snapshot.epoch);
    await snapshotReady(coordinator);
    const restarted = coordinator;
    grants = createGrants(Date.now, restarted.epoch());
    endpoint = await serve({
      epoch: restarted.epoch(), snapshot: () => restarted.snapshot(), state: () => restarted.state(),
      admittedSessionFile: id => restartedSource.admittedSessionFile(id),
      read: request => readPage(request, parseSessionContent), grants, port: 0,
    });
    const restartedAuthorization = await exchange(endpoint, grants);
    const restartedResponse = await fetch(new URL(ROUTES.snapshot, endpoint.url), { headers: restartedAuthorization });
    assert.equal(restartedResponse.status, 200);
    const newSnapshot = await restartedResponse.json() as { epoch: string; children: ChildRow[] };
    assert.equal(newSnapshot.epoch, restarted.epoch());
    assert.equal(newSnapshot.children[0]?.childId, childId);
    const resetResponse = await fetch(new URL(`${pagePath}?mode=entries&token=${encodeURIComponent(oldToken)}`, endpoint.url), {
      headers: restartedAuthorization,
    });
    assert.equal(resetResponse.status, 200);
    const reset = await resetResponse.json() as ReadResult;
    assert.equal(reset.kind, "page");
    if (reset.kind !== "page") assert.fail("Expected reset page");
    assert.equal(reset.reset, true);
    assert.ok((reset.entries?.length ?? 0) > 0);
  } finally {
    await endpoint?.close();
    grants?.dispose();
    coordinator?.dispose();
  }
  assert.equal(processCoordinator(), null);
}

await main();
