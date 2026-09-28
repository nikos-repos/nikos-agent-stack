import assert from "node:assert/strict";
import { networkInterfaces } from "node:os";
import {
  ROUTES,
  SCHEMA_HEADER,
  SNAPSHOT_SCHEMA_VERSION,
  type ReadResult,
  type ServeOptions,
  type Snapshot,
} from "../contract.ts";
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
let available = true;
let beganRead!: () => void;
let observedAbort!: () => void;
const readBegan = new Promise<void>(resolve => { beganRead = resolve; });
const readAborted = new Promise<void>(resolve => { observedAbort = resolve; });
const options: ServeOptions = {
  epoch: snapshot.epoch,
  port: 0,
  grants: null,
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

async function within(promise: Promise<void>): Promise<void> {
  let cancelTimeout!: () => void;
  const expired = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out waiting for client abort propagation")), 2000);
    cancelTimeout = () => clearTimeout(timer);
  });
  try {
    await Promise.race([promise, expired]);
  } finally {
    cancelTimeout();
  }
}

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

  async function request(path: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(new URL(path, endpoint.url), init);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get(SCHEMA_HEADER), String(SNAPSHOT_SCHEMA_VERSION));
    for (const name of response.headers.keys()) {
      assert.ok(!name.toLowerCase().startsWith("access-control-"), `CORS response header: ${name}`);
    }
    return response;
  }

  await request(ROUTES.viewer);
  await request(ROUTES.snapshot);
  available = false;
  await request(ROUTES.snapshot);
  assert.equal((await request(ROUTES.viewer, { headers: { Host: "example.invalid" } })).status, 421);
  assert.equal((await request(ROUTES.snapshot, { method: "POST" })).status, 405);
  assert.equal((await request("/v1/children/unknown/page")).status, 404);

  const client = new AbortController();
  const pending = fetch(new URL("/v1/children/known/page", endpoint.url), { signal: client.signal });
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
  if (!closed) await endpoint.close();
}
