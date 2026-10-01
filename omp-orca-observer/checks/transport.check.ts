import assert from "node:assert/strict";
import { mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { networkInterfaces, tmpdir } from "node:os";
import { join } from "node:path";
import {
  ROUTES,
  SCHEMA_HEADER,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  type ChildRow,
  type Endpoint,
  type Grants,
  type ReadRequest,
  type ReadResult,
  type ServeOptions,
  type Snapshot,
} from "../contract.ts";
import { readPage } from "../reader.ts";
import { serve } from "../transport.ts";

const snapshot: Snapshot = {
  schema: SNAPSHOT_SCHEMA_VERSION,
  epoch: "check-epoch",
  generation: 0,
  observedAt: "2026-01-01T00:00:00.000Z",
  rootSession: { known: false, reason: "check" },
  inventory: { state: "complete" },
  children: [],
};
const grants = createFakeGrants(snapshot.epoch);
let available = true;
let beganRead!: () => void;
let observedAbort!: () => void;
const readBegan = new Promise<void>(resolve => { beganRead = resolve; });
const readAborted = new Promise<void>(resolve => { observedAbort = resolve; });
const options: ServeOptions = {
  epoch: snapshot.epoch,
  port: 0,
  grants,
  snapshot: () => available ? snapshot : null,
  state: () => available ? { state: "ready" } : { state: "unavailable", reason: "check" },
  admittedSessionFile: childId => childId === "known" ? "./known.jsonl" : null,
  read({ signal }) {
    return new Promise<ReadResult>(resolve => {
      const onAbort = () => {
        observedAbort();
        resolve({ kind: "unavailable", reason: "cancelled" });
      };
      if (signal.aborted) onAbort();
      else signal.addEventListener("abort", onAbort, { once: true });
      beganRead();
    });
  },
};

async function within<T>(promise: Promise<T>): Promise<T> {
  let cancelTimeout!: () => void;
  const expired = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for transport check")), 2000);
    cancelTimeout = () => clearTimeout(timer);
  });
  try {
    return await Promise.race([promise, expired]);
  } finally {
    cancelTimeout();
  }
}

async function request(endpoint: Endpoint, path: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(new URL(path, endpoint.url), init);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get(SCHEMA_HEADER), String(SNAPSHOT_SCHEMA_VERSION));
  for (const name of response.headers.keys()) {
    assert.ok(!name.toLowerCase().startsWith("access-control-"), `CORS response header: ${name}`);
  }
  return response;
}

const pagePath = (childId: string) => ROUTES.page.replace(":childId", encodeURIComponent(childId));

const endpoint = await serve(options);
let closed = false;
try {
  assert.ok(endpoint.port > 0);
  assert.equal(endpoint.url, `http://127.0.0.1:${endpoint.port}/`);
  await assert.rejects(fetch(`http://[::1]:${endpoint.port}/`, { signal: AbortSignal.timeout(1000) }));
  const otherIPv4 = Object.values(networkInterfaces()).flat().find(address => address?.family === "IPv4" && !address.internal);
  if (otherIPv4) {
    await assert.rejects(fetch(`http://${otherIPv4.address}:${endpoint.port}/`, { signal: AbortSignal.timeout(1000) }));
  }

  assert.equal((await request(endpoint, ROUTES.viewer)).status, 200);
  const { code } = grants.bootstrap(["known", "unknown"], 60_000);
  const exchange = await request(endpoint, ROUTES.session, { method: "POST", body: JSON.stringify({ code }) });
  assert.equal(exchange.status, 200);
  const session = await exchange.json() as { credential: string };
  const authorization = { Authorization: `Bearer ${session.credential}` };
  assert.equal((await request(endpoint, ROUTES.snapshot, { headers: authorization })).status, 200);
  available = false;
  assert.equal((await request(endpoint, ROUTES.snapshot, { headers: authorization })).status, 503);
  assert.equal((await request(endpoint, ROUTES.viewer, { headers: { Host: "example.invalid" } })).status, 421);
  assert.equal((await request(endpoint, ROUTES.snapshot, { method: "POST" })).status, 405);
  assert.equal((await request(endpoint, pagePath("unknown"), { headers: authorization })).status, 404);

  const client = new AbortController();
  const pending = fetch(new URL(pagePath("known"), endpoint.url), { headers: authorization, signal: client.signal });
  const rejected = assert.rejects(pending);
  await within(readBegan);
  client.abort();
  await rejected;
  await within(readAborted);

  await endpoint.close();
  closed = true;
  const reused = Bun.serve({ hostname: "127.0.0.1", port: endpoint.port, fetch: () => new Response("ok") });
  try {
    assert.equal(reused.port, endpoint.port);
  } finally {
    await reused.stop(true);
  }
} finally {
  grants.dispose();
  if (!closed) await endpoint.close();
}

function createFakeGrants(epoch: string): Grants {
  const codes = new Map<string, { childIds: string[]; expiresAt: string }>();
  const credentials = new Map<string, { root: AbortController; children: Map<string, AbortController> }>();
  let sequence = 0;
  function revoke(childIds: string[] | "all"): void {
    for (const [credential, scope] of credentials) {
      for (const [childId, signal] of scope.children) {
        if (childIds === "all" || childIds.includes(childId)) {
          scope.children.delete(childId);
          signal.abort();
        }
      }
      if (scope.children.size === 0) {
        scope.root.abort();
        credentials.delete(credential);
      }
    }
    for (const [code, pending] of codes) {
      pending.childIds = childIds === "all" ? [] : pending.childIds.filter(childId => !childIds.includes(childId));
      if (pending.childIds.length === 0) codes.delete(code);
    }
  }
  return {
    epoch,
    bootstrap(childIds, ttlMs) {
      const code = `code-${++sequence}`;
      const expiresAt = new Date(Date.now() + ttlMs).toISOString();
      codes.set(code, { childIds, expiresAt });
      return { code, expiresAt };
    },
    exchange(code) {
      const pending = codes.get(code);
      if (!pending) return null;
      codes.delete(code);
      const credential = `credential-${++sequence}`;
      credentials.set(credential, {
        root: new AbortController(),
        children: new Map(pending.childIds.map(childId => [childId, new AbortController()])),
      });
      return { credential, expiresAt: pending.expiresAt };
    },
    allows(credential, childId) {
      const scope = credentials.get(credential);
      return scope !== undefined && (childId === null || scope.children.has(childId));
    },
    signal(credential, childId) {
      const scope = credentials.get(credential);
      return (childId === null ? scope?.root : scope?.children.get(childId))?.signal ?? null;
    },
    revoke,
    status() {
      const childIds = new Set<string>();
      for (const scope of credentials.values()) {
        for (const childId of scope.children.keys()) childIds.add(childId);
      }
      return { liveCredentials: credentials.size, grantedChildIds: [...childIds].sort(), pendingCodes: codes.size };
    },
    dispose() { revoke("all"); },
  };
}

type Deferred<T> = { promise: Promise<T>; resolve(value: T): void };
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

type HeldRead = {
  began: Deferred<ReadRequest>;
  release: Deferred<void>;
  aborted: Deferred<void>;
  closed: Deferred<void>;
};

async function checkGrants(directory: string): Promise<void> {
  const sessionFile = join(directory, "shared.jsonl");
  const entries = [{ message: "first record" }, { message: "second record" }];
  await writeFile(sessionFile, entries.map(entry => JSON.stringify(entry)).join("\n") + "\n");
  const grants = createFakeGrants(snapshot.epoch);
  const unknown = { known: false, reason: "check" } as const;
  const scopedSnapshot: Snapshot = {
    ...snapshot,
    inventory: { state: "partial", reason: "registry sample incomplete" },
    children: ["A", "B", "C"].map<ChildRow>(childId => ({
      childId,
      parentId: "parent",
      rootSession: "root",
      kind: "sub",
      agentName: childId,
      modelRole: unknown,
      resolvedModel: unknown,
      registryStatus: "running",
      tombstoned: false,
      outcome: { state: "unknown", reason: "check" },
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
      observedAt: snapshot.observedAt,
      grantScope: "none",
    })),
  };
  let currentSnapshot: Snapshot | null = scopedSnapshot;
  let snapshotCalls = 0;
  const held = new Map<string, HeldRead>();
  const closing: Promise<void>[] = [];
  function hold(childId: string): HeldRead {
    const read = {
      began: deferred<ReadRequest>(),
      release: deferred<void>(),
      aborted: deferred<void>(),
      closed: deferred<void>(),
    };
    held.set(childId, read);
    return read;
  }
  const parse = (content: string) => ({
    entries: content.trimEnd().split("\n").map(line => JSON.parse(line)),
    malformedRecords: 0,
  });
  const securedEndpoint = await serve({
    epoch: snapshot.epoch,
    port: 0,
    grants,
    snapshot() { snapshotCalls++; return currentSnapshot; },
    state: () => ({ state: "unavailable", reason: "check" }),
    admittedSessionFile: childId => ["A", "B", "C"].includes(childId) ? sessionFile : null,
    async read(request) {
      const slow = held.get(request.childId);
      if (!slow) return readPage(request, parse);
      held.delete(request.childId);
      const handle = await open(request.sessionFile, "r");
      closing.push(slow.closed.promise);
      const onAbort = () => {
        slow.aborted.resolve();
        slow.release.resolve();
      };
      if (request.signal.aborted) onAbort();
      else request.signal.addEventListener("abort", onAbort, { once: true });
      slow.began.resolve(request);
      try {
        await slow.release.promise;
        return request.signal.aborted ? { kind: "unavailable", reason: "cancelled" } : await readPage(request, parse);
      } finally {
        request.signal.removeEventListener("abort", onAbort);
        try {
          await handle.close();
          assert.equal(handle.fd, -1);
        } finally {
          slow.closed.resolve();
        }
      }
    },
  });
  async function exchange(childIds: string[]): Promise<{ code: string; credential: string }> {
    const { code } = grants.bootstrap(childIds, 60_000);
    const response = await request(securedEndpoint, ROUTES.session, {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    assert.equal(response.status, 200);
    const session: { credential: string; expiresAt: string; schema: number; epoch: string } = await response.json();
    assert.equal(session.schema, SNAPSHOT_SCHEMA_VERSION);
    assert.equal(session.epoch, snapshot.epoch);
    assert.ok(Number.isFinite(Date.parse(session.expiresAt)));
    return { code, credential: session.credential };
  }
  async function page(childId: string, credential: string, token?: string, signal?: AbortSignal): Promise<ReadResult> {
    const path = pagePath(childId) + (token === undefined ? "" : `?token=${encodeURIComponent(token)}`);
    const response = await request(securedEndpoint, path, { headers: { Authorization: `Bearer ${credential}` }, signal });
    assert.equal(response.status, 200);
    return response.json();
  }
  try {
    assert.ok(securedEndpoint.port > 0);
    assert.equal(securedEndpoint.url, `http://127.0.0.1:${securedEndpoint.port}/`);
    assert.equal((await request(securedEndpoint, ROUTES.viewer)).status, 200);
    assert.equal((await request(securedEndpoint, ROUTES.snapshot)).status, 401);
    assert.equal((await request(securedEndpoint, pagePath("A"))).status, 401);
    assert.equal((await request(securedEndpoint, ROUTES.snapshot, { headers: { Origin: "https://example.invalid" } })).status, 403);
    assert.equal((await request(securedEndpoint, ROUTES.snapshot, { headers: { Host: "127.0.0.1:0" } })).status, 421);
    assert.equal((await request(securedEndpoint, ROUTES.session, { method: "POST", body: JSON.stringify({ code: "bad" }) })).status, 401);
    assert.equal((await request(securedEndpoint, ROUTES.session, { method: "POST", body: "{" })).status, 401);
    for (const method of ["PUT", "PATCH", "DELETE", "POST"]) {
      assert.equal((await request(securedEndpoint, ROUTES.snapshot, { method })).status, 405);
    }
    assert.equal(snapshotCalls, 0, "rejected and non-data requests must not collect snapshot headers");

    const one = await exchange(["A"]);
    assert.equal((await request(securedEndpoint, ROUTES.session, { method: "POST", body: JSON.stringify({ code: one.code }) })).status, 401);
    const authorization = { Authorization: `Bearer ${one.credential}` };
    assert.equal((await request(securedEndpoint, ROUTES.snapshot, {
      headers: { ...authorization, Origin: `http://localhost:${securedEndpoint.port + 1}` },
    })).status, 403);
    assert.equal((await request(securedEndpoint, ROUTES.snapshot, { headers: { Authorization: "Bearer bad" } })).status, 401);
    assert.equal((await request(securedEndpoint, pagePath("B"), { headers: authorization })).status, 401);
    assert.equal(snapshotCalls, 0);
    const scopedResponse = await request(securedEndpoint, ROUTES.snapshot, {
      headers: { ...authorization, Host: `127.0.0.1:${securedEndpoint.port}`, Origin: new URL(securedEndpoint.url).origin },
    });
    assert.equal(scopedResponse.status, 200);
    const scoped: Snapshot = await scopedResponse.json();
    assert.deepEqual(scoped.children, [{ ...scopedSnapshot.children[0]!, grantScope: "granted" }]);
    assert.deepEqual(scoped.inventory, scopedSnapshot.inventory);
    assert.equal(scopedSnapshot.children[0]!.grantScope, "none", "serialization must not change the publisher's rows");
    assert.equal(snapshotCalls, 1);
    const localResponse = await request(securedEndpoint, ROUTES.snapshot, {
      headers: { ...authorization, Host: `localhost:${securedEndpoint.port}`, Origin: `http://localhost:${securedEndpoint.port}` },
    });
    assert.equal(localResponse.status, 200);
    await localResponse.arrayBuffer();
    currentSnapshot = null;
    const unavailable = await request(securedEndpoint, ROUTES.snapshot, { headers: authorization });
    assert.equal(unavailable.status, 503);
    await unavailable.arrayBuffer();
    currentSnapshot = {
      ...scopedSnapshot,
      children: [{ ...scopedSnapshot.children[0]!, agentName: "é".repeat(SNAPSHOT_MAX_BYTES / 2) }],
    };
    const oversized = await request(securedEndpoint, ROUTES.snapshot, { headers: authorization });
    assert.equal(oversized.status, 503);
    const bounded = await oversized.arrayBuffer();
    assert.ok(bounded.byteLength <= SNAPSHOT_MAX_BYTES);
    currentSnapshot = scopedSnapshot;

    const limitCode = grants.bootstrap(["A"], 60_000).code;
    const limitBody = JSON.stringify({ code: limitCode });
    assert.equal((await request(securedEndpoint, ROUTES.session, {
      method: "POST", body: limitBody.padEnd(1025, " "),
    })).status, 413);
    const exactLimit = await request(securedEndpoint, ROUTES.session, {
      method: "POST", body: limitBody.padEnd(1024, " "),
    });
    assert.equal(exactLimit.status, 200);
    await exactLimit.arrayBuffer();

    const two = await exchange(["A", "B"]);
    const pageB = await page("B", two.credential, "");
    assert.ok(pageB.kind === "page");
    assert.equal(pageB.reset, false, "the viewer's initial token= must not reset the first page");
    assert.deepEqual(pageB.entries, entries);
    const continuedB = await page("B", two.credential, pageB.token);
    assert.ok(continuedB.kind === "page");
    assert.equal(continuedB.reset, false);
    assert.deepEqual(continuedB.entries, []);
    // Both children admit the same file: this reset must depend on child identity, not a path change.
    const resetA = await page("A", two.credential, pageB.token);
    assert.ok(resetA.kind === "page");
    assert.equal(resetA.reset, true);
    assert.deepEqual(resetA.entries, entries);

    const revokeA = hold("A");
    const keepB = hold("B");
    const revoking = page("A", two.credential);
    const surviving = page("B", two.credential);
    const [requestA, requestB] = await within(Promise.all([revokeA.began.promise, keepB.began.promise]));
    grants.revoke(["A"]);
    assert.deepEqual(await within(revoking), { kind: "unavailable", reason: "cancelled" });
    await within(Promise.all([revokeA.aborted.promise, revokeA.closed.promise]));
    assert.equal(requestA.signal.aborted, true);
    assert.equal(requestB.signal.aborted, false);
    keepB.release.resolve();
    const survived = await within(surviving);
    assert.ok(survived.kind === "page");
    assert.deepEqual(survived.entries, entries);
    await within(keepB.closed.promise);

    const three = await exchange(["A", "B", "C"]);
    const firstA = hold("A");
    const parallelB = hold("B");
    const first = page("A", three.credential);
    const parallel = page("B", three.credential);
    const [firstRequest, parallelRequest] = await within(Promise.all([firstA.began.promise, parallelB.began.promise]));
    assert.equal((await request(securedEndpoint, pagePath("C"), {
      headers: { Authorization: `Bearer ${three.credential}` },
    })).status, 429);
    const other = await exchange(["A"]);
    const otherPage = await page("A", other.credential);
    assert.ok(otherPage.kind === "page");
    assert.deepEqual(otherPage.entries, entries);
    assert.equal(firstRequest.signal.aborted, false, "another credential must not replace this read");
    const latestA = hold("A");
    const latest = page("A", three.credential);
    const latestRequest = await within(latestA.began.promise);
    assert.deepEqual(await within(first), { kind: "unavailable", reason: "cancelled" });
    await within(Promise.all([firstA.aborted.promise, firstA.closed.promise]));
    assert.equal(firstRequest.signal.aborted, true);
    assert.equal(latestRequest.signal.aborted, false);
    assert.equal(parallelRequest.signal.aborted, false);
    assert.equal((await request(securedEndpoint, pagePath("C"), {
      headers: { Authorization: `Bearer ${three.credential}` },
    })).status, 429, "completion of the replaced read must not remove the latest read's slot");
    latestA.release.resolve();
    parallelB.release.resolve();
    const completed = await within(Promise.all([latest, parallel]));
    for (const result of completed) {
      assert.ok(result.kind === "page");
      assert.deepEqual(result.entries, entries);
    }
    await within(Promise.all([latestA.closed.promise, parallelB.closed.promise]));

    const disconnect = hold("C");
    const client = new AbortController();
    const disconnected = page("C", three.credential, undefined, client.signal);
    const rejected = assert.rejects(disconnected);
    await within(disconnect.began.promise);
    client.abort();
    await within(rejected);
    await within(Promise.all([disconnect.aborted.promise, disconnect.closed.promise]));

    const connections: { read: HeldRead; response: Promise<ReadResult> }[] = [];
    for (let index = 0; index < 8; index++) {
      const session = await exchange(["A", "B"]);
      const reads = [hold("A"), hold("B")];
      const responses = [page("A", session.credential), page("B", session.credential)];
      await within(Promise.all(reads.map(read => read.began.promise)));
      for (let child = 0; child < reads.length; child++) {
        connections.push({ read: reads[child]!, response: responses[child]! });
      }
    }
    const beforeExcess = snapshotCalls;
    assert.equal((await request(securedEndpoint, ROUTES.snapshot, {
      headers: { Authorization: `Bearer ${three.credential}` },
    })).status, 429);
    assert.equal(snapshotCalls, beforeExcess, "request ceiling rejection must precede snapshot collection");
    for (const connection of connections) connection.read.release.resolve();
    const drained = await within(Promise.all(connections.map(connection => connection.response)));
    for (const result of drained) {
      assert.ok(result.kind === "page");
      assert.deepEqual(result.entries, entries);
    }
    await within(Promise.all(connections.map(connection => connection.read.closed.promise)));

    const endingA = hold("A");
    const endingB = hold("B");
    const ended = [page("A", three.credential), page("B", three.credential)];
    await within(Promise.all([endingA.began.promise, endingB.began.promise]));
    grants.dispose();
    assert.deepEqual(await within(Promise.all(ended)), [
      { kind: "unavailable", reason: "cancelled" },
      { kind: "unavailable", reason: "cancelled" },
    ]);
    await within(Promise.all([
      endingA.aborted.promise, endingA.closed.promise, endingB.aborted.promise, endingB.closed.promise,
    ]));
    const beforeEnded = snapshotCalls;
    assert.equal((await request(securedEndpoint, ROUTES.snapshot, { headers: { Authorization: `Bearer ${three.credential}` } })).status, 401);
    assert.equal(snapshotCalls, beforeEnded);

    let concurrentReads = 0;
    let peakReads = 0;
    const readCalls: { release: Deferred<void> }[] = [];
    const beganCalls = Array.from({ length: 8 }, () => deferred<void>());
    const serializedGrants = createFakeGrants(snapshot.epoch);
    const serializedEndpoint = await serve({
      epoch: snapshot.epoch,
      port: 0,
      grants: serializedGrants,
      snapshot: () => scopedSnapshot,
      state: () => ({ state: "ready" }),
      admittedSessionFile: () => sessionFile,
      async read(request) {
        const index = readCalls.length;
        const read = { release: deferred<void>() };
        readCalls.push(read);
        beganCalls[index]!.resolve();
        concurrentReads++;
        peakReads = Math.max(peakReads, concurrentReads);
        await read.release.promise;
        concurrentReads--;
        return request.signal.aborted
          ? { kind: "unavailable", reason: "cancelled" }
          : { kind: "unavailable", reason: "missing" };
      },
    });
    try {
      const { code } = serializedGrants.bootstrap(["A", "B"], 60_000);
      const sessionResponse = await request(serializedEndpoint, ROUTES.session, {
        method: "POST",
        body: JSON.stringify({ code }),
      });
      assert.equal(sessionResponse.status, 200);
      const serializedCredential = (await sessionResponse.json() as { credential: string }).credential;
      const serializedPage = (childId: string) => fetch(new URL(pagePath(childId), serializedEndpoint.url), {
        headers: { Authorization: `Bearer ${serializedCredential}` },
      });
      const firstARequest = serializedPage("A");
      await within(beganCalls[0]!.promise);
      const parallelBRequest = serializedPage("B");
      await within(beganCalls[1]!.promise);
      const secondARequest = serializedPage("A");
      const thirdARequest = serializedPage("A");
      const fourthARequest = serializedPage("A");
      await new Promise(resolve => setTimeout(resolve, 20));
      const callsBeforeFirstSettles = readCalls.length;
      readCalls[0]!.release.resolve();
      await within(beganCalls[2]!.promise);
      for (const read of readCalls) read.release.resolve();
      const responses = await within(Promise.all([
        firstARequest, parallelBRequest, secondARequest, thirdARequest, fourthARequest,
      ]));
      for (const response of responses) {
        assert.equal(response.status, 200);
        await response.arrayBuffer();
      }
      assert.deepEqual(
        { callsBeforeFirstSettles, peakReads },
        { callsBeforeFirstSettles: 2, peakReads: 2 },
        "same-child replacements wait for the superseded native read and keep per-credential concurrency at two",
      );
    } finally {
      serializedGrants.dispose();
      await serializedEndpoint.close();
    }
  } finally {
    grants.dispose();
    await securedEndpoint.close();
    await Promise.all(closing);
  }
}

const directory = await mkdtemp(join(tmpdir(), "observer-transport-"));
try {
  await checkGrants(directory);
} finally {
  await rm(directory, { recursive: true, force: true });
}
