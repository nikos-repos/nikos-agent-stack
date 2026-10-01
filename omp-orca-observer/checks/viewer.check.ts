import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import {
  ROUTES,
  SCHEMA_HEADER,
  SNAPSHOT_SCHEMA_VERSION,
  type ChildRow,
  type ReadResult,
  type Snapshot,
} from "../contract";

const html = readFileSync(new URL("../viewer/index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(scripts.length, 1, "the page has one inline script");
const script = scripts[0]![1]!;
assert.doesNotMatch(html, /<(?:script\b[^>]*\bsrc\s*=|link\b|iframe\b|img\b|form\b|input\b|textarea\b|select\b)/i, "no external assets or action controls");
assert.doesNotMatch(script, /\b(?:localStorage|sessionStorage|indexedDB)\b|\bcookie\b/i, "no persistent storage API is referenced");

class FakeElement {
  readonly childNodes: FakeElement[] = [];
  readonly attributes = new Map<string, string>();
  readonly classes = new Set<string>();
  readonly listeners = new Map<string, Array<() => unknown>>();
  readonly classList = {
    add: (name: string) => { this.classes.add(name); },
    remove: (name: string) => { this.classes.delete(name); },
    contains: (name: string) => this.classes.has(name),
  };
  parentNode: FakeElement | null = null;
  hidden = false;
  disabled = false;
  type = "";
  id = "";
  private text = "";

  constructor(readonly tagName: string, private readonly document: FakeDocument) { }

  get textContent(): string {
    return this.text + this.childNodes.map(child => child.textContent).join("");
  }

  set textContent(value: string) {
    this.replaceChildren();
    this.text = String(value);
  }

  get innerHTML(): never {
    throw new Error("the viewer must not use innerHTML");
  }

  set innerHTML(_value: string) {
    this.document.dynamicHtmlWrites++;
    throw new Error("dynamic data must use textContent");
  }

  get className(): string {
    return [...this.classes].join(" ");
  }

  set className(value: string) {
    this.classes.clear();
    for (const name of value.split(/\s+/)) if (name) this.classes.add(name);
  }

  append(...nodes: Array<FakeElement | string>): void {
    for (const node of nodes) {
      const child = typeof node === "string" ? this.document.createElement("#text") : node;
      if (typeof node === "string") child.textContent = node;
      if (child.parentNode) {
        const siblings = child.parentNode.childNodes;
        siblings.splice(siblings.indexOf(child), 1);
      }
      child.parentNode = this;
      this.childNodes.push(child);
    }
  }

  replaceChildren(...nodes: Array<FakeElement | string>): void {
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes.length = 0;
    this.text = "";
    this.append(...nodes);
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
    if (name === "id") this.id = value;
    if (name === "class") this.className = value;
    if (name === "type") this.type = value;
    if (name === "hidden") this.hidden = true;
    if (name === "disabled") this.disabled = true;
  }

  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }

  addEventListener(name: string, listener: () => unknown): void {
    if (!this.listeners.has(name)) this.listeners.set(name, []);
    this.listeners.get(name)!.push(listener);
  }

  async click(): Promise<void> {
    if (this.hidden || this.disabled) return;
    for (const listener of this.listeners.get("click") ?? []) listener();
    await flush();
  }

  descendants(): FakeElement[] {
    return [this, ...this.childNodes.flatMap(child => child.descendants())];
  }
}

class FakeDocument {
  readonly body = this.createElement("body");
  dynamicHtmlWrites = 0;

  constructor() {
    const source = html.split("<body>")[1]?.split("<script>")[0];
    assert.ok(source, "the actual page body supplies the DOM fixture");
    const stack = [this.body];
    for (const match of source.matchAll(/<[^>]+>|[^<]+/g)) {
      const value = match[0];
      if (value.startsWith("</")) {
        stack.pop();
      } else if (value.startsWith("<")) {
        const tag = /^<([\w-]+)/.exec(value)?.[1];
        assert.ok(tag);
        const node = this.createElement(tag);
        for (const attribute of value.matchAll(/\s([\w-]+)(?:="([^"]*)")?/g)) {
          node.setAttribute(attribute[1]!, attribute[2] ?? "");
        }
        stack[stack.length - 1]!.append(node);
        if (!["br", "hr", "meta", "link", "input", "img"].includes(tag)) stack.push(node);
      } else {
        stack[stack.length - 1]!.append(value);
      }
    }
  }

  createElement(tag: string): FakeElement {
    return new FakeElement(tag.toLowerCase(), this);
  }

  getElementById(id: string): FakeElement | null {
    return this.body.descendants().find(node => node.id === id) ?? null;
  }

  get cookie(): never {
    throw new Error("the viewer must not access cookies");
  }

  set cookie(_value: string) {
    throw new Error("the viewer must not write cookies");
  }
}

async function flush(): Promise<void> {
  for (let turn = 0; turn < 30; turn++) await Promise.resolve();
}

class FakeClock {
  now = 0;
  private nextId = 1;
  readonly timers = new Map<number, { at: number; interval: number | null; callback: () => void }>();

  setTimeout = (callback: () => void, delay: number): number => this.schedule(callback, delay, null);
  setInterval = (callback: () => void, delay: number): number => this.schedule(callback, delay, delay);
  clear = (id: number | null | undefined): void => { if (id !== null && id !== undefined) this.timers.delete(id); };

  private schedule(callback: () => void, delay: number, interval: number | null): number {
    const id = this.nextId++;
    this.timers.set(id, { at: this.now + delay, interval, callback });
    return id;
  }

  async advance(ms: number): Promise<void> {
    const target = this.now + ms;
    while (true) {
      const next = [...this.timers].filter(([, timer]) => timer.at <= target)
        .sort((left, right) => left[1].at - right[1].at || left[0] - right[0])[0];
      if (!next) break;
      const [id, timer] = next;
      this.now = timer.at;
      if (timer.interval === null) this.timers.delete(id);
      else timer.at += timer.interval;
      timer.callback();
      await flush();
    }
    this.now = target;
    await flush();
  }
}

class FakeResponse {
  readonly ok: boolean;
  jsonReads = 0;
  readonly headers: { get: (name: string) => string | null };

  constructor(readonly status: number, private readonly body: unknown, schema: string | null = String(SNAPSHOT_SCHEMA_VERSION)) {
    this.ok = status >= 200 && status < 300;
    this.headers = { get: name => name.toLowerCase() === SCHEMA_HEADER ? schema : null };
  }

  async json(): Promise<unknown> {
    this.jsonReads++;
    return typeof this.body === "function" ? this.body() : this.body;
  }
}

type PendingResponse = { promise: Promise<FakeResponse>; resolve: (response: FakeResponse) => void };
type Reply = FakeResponse | Error | PendingResponse;
type FetchOptions = {
  method?: string;
  cache?: string;
  credentials?: string;
  headers?: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};
type FetchCall = { url: string; options: FetchOptions; hash: string; at: number };

/**
 * @cc [label:architecture] viewer-check-isolation
 * This harness has no network or real-time effects. It proves script behavior, not browser layout at phone width.
 */
class Harness {
  readonly document = new FakeDocument();
  readonly clock = new FakeClock();
  readonly calls: FetchCall[] = [];
  readonly historyCalls: string[] = [];
  readonly location: { pathname: string; search: string; hash: string };
  readonly snapshots: Reply[];
  readonly pages: Reply[];
  readonly session: Reply;

  constructor(options: { hash?: string; snapshots?: Reply[]; pages?: Reply[]; session?: Reply } = {}) {
    this.location = { pathname: "/", search: "", hash: options.hash ?? "#code=bootstrap%2Fsecret" };
    this.snapshots = options.snapshots ?? [];
    this.pages = options.pages ?? [];
    this.session = options.session ?? new FakeResponse(200, { credential: "viewer-credential", expiresAt: "2099-01-01T00:00:00Z" });
  }

  private fetch = (url: string, options: FetchOptions = {}): Promise<FakeResponse> => {
    this.calls.push({ url, options, hash: this.location.hash, at: this.clock.now });
    let reply: Reply;
    if (url === ROUTES.session) reply = this.session;
    else if (url === ROUTES.snapshot) reply = this.snapshots.shift() ?? Promise.withResolvers<FakeResponse>();
    else if (url.startsWith("/v1/children/")) reply = this.pages.shift() ?? Promise.withResolvers<FakeResponse>();
    else throw new Error(`unexpected endpoint: ${url}`);
    const { promise, resolve, reject } = Promise.withResolvers<FakeResponse>();
    const abort = () => reject(new Error("request aborted"));
    const done = (response: FakeResponse) => {
      options.signal?.removeEventListener("abort", abort);
      resolve(response);
    };
    const failed = (error: unknown) => {
      options.signal?.removeEventListener("abort", abort);
      reject(error);
    };
    if (options.signal?.aborted) {
      abort();
      return promise;
    }
    options.signal?.addEventListener("abort", abort, { once: true });
    if (reply instanceof Error) failed(reply);
    else if (reply instanceof FakeResponse) done(reply);
    else void reply.promise.then(done, failed);
    return promise;
  };

  async boot(): Promise<void> {
    const context: Record<string, unknown> = {
      document: this.document,
      location: this.location,
      history: {
        replaceState: (_state: unknown, _title: string, url: string) => {
          this.historyCalls.push(url);
          const parsed = new URL(url, "http://observer.invalid");
          this.location.pathname = parsed.pathname;
          this.location.search = parsed.search;
          this.location.hash = parsed.hash;
        },
      },
      fetch: this.fetch,
      performance: { now: () => this.clock.now },
      setTimeout: this.clock.setTimeout,
      clearTimeout: this.clock.clear,
      setInterval: this.clock.setInterval,
      clearInterval: this.clock.clear,
      URLSearchParams,
      AbortController,
      Date: { now: () => { throw new Error("staleness must use the page's receive clock"); } },
    };
    for (const name of ["localStorage", "sessionStorage", "indexedDB"]) {
      Object.defineProperty(context, name, { get: () => { throw new Error(`forbidden storage API: ${name}`); } });
    }
    runInNewContext(script, context, { filename: "observer-viewer-inline.js" });
    await flush();
  }

  node(id: string): FakeElement {
    const node = this.document.getElementById(id);
    assert.ok(node, `page contains #${id}`);
    return node;
  }

  callsTo(route: string): FetchCall[] {
    return this.calls.filter(call => call.url === route);
  }

  pageCalls(): FetchCall[] {
    return this.calls.filter(call => call.url.startsWith("/v1/children/"));
  }

  childButton(id: string): FakeElement {
    const button = this.node("children").descendants()
      .find(node => node.tagName === "button" && node.textContent.endsWith(` — ${id}`));
    assert.ok(button, `granted child ${id} is selectable`);
    return button;
  }

  banner(text: string): void {
    assert.equal(this.node("status").hidden, false);
    assert.equal(this.node("status").textContent, text);
  }
}

const value = (text: string) => ({ known: true as const, value: text });
const unknown = (reason: string) => ({ known: false as const, reason });

function child(childId = "child-a", overrides: Partial<ChildRow> = {}): ChildRow {
  return {
    childId,
    parentId: "root-parent",
    rootSession: "root-session-a",
    kind: "sub",
    agentName: `Agent ${childId}`,
    modelRole: value("implementer"),
    resolvedModel: value("provider/model-a"),
    registryStatus: "idle",
    tombstoned: false,
    outcome: { state: "unknown", reason: "no lifecycle evidence" },
    milestones: { responseAt: value("2099-01-01"), acceptedAt: unknown("not accepted"), terminalAt: unknown("not terminal") },
    activity: { sampled: true, lastActivityAt: unknown("no activity timestamp") },
    lineage: {
      repoRoot: value("repo"), cwd: value("repo/work"), parentWorktree: value("parent-worktree"),
      childWorktree: value("child-worktree"), isolation: unknown("isolation not reported"), branch: value("feature/viewer"),
    },
    completeness: { state: "partial", reason: "sampled registry" },
    observedAt: "1900-01-01T00:00:00Z",
    grantScope: "granted",
    ...overrides,
  };
}

function snapshot(children: ChildRow[] = [child()], overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    schema: SNAPSHOT_SCHEMA_VERSION,
    epoch: "epoch-a",
    generation: 4,
    observedAt: "1900-01-01T00:00:00Z",
    rootSession: value("root-session-a"),
    inventory: { state: "complete" },
    children,
    ...overrides,
  };
}

function page(entries: unknown[], overrides: Partial<Extract<ReadResult, { kind: "page" }>> = {}): ReadResult {
  return {
    kind: "page", mode: "entries", entries, bytesBase64: null, malformed: 0,
    reset: false, atEnd: false, token: "next/+? token", ...overrides,
  };
}

const response = (body: unknown) => new FakeResponse(200, body);

async function assertStopped(harness: Harness, banner: string): Promise<void> {
  harness.banner(banner);
  assert.equal(harness.node("children").textContent, "");
  assert.equal(harness.node("entries").textContent, "");
  assert.equal(harness.node("load-more").hidden, true);
  assert.equal(harness.clock.timers.size, 0, "terminal states stop polling and age timers");
  const requests = harness.calls.length;
  await harness.clock.advance(30000);
  assert.equal(harness.calls.length, requests, "terminal states cannot issue later requests");
}

async function checkBootstrap(): Promise<void> {
  const missing = new Harness({ hash: "" });
  await missing.boot();
  await assertStopped(missing, "unavailable(access not granted)");
  assert.equal(missing.calls.length, 0, "no bootstrap means no exchange or polling");

  for (const session of [new FakeResponse(401, {}), new Error("connection refused"), response({ credential: "" })]) {
    const failed = new Harness({ session });
    await failed.boot();
    assert.equal(failed.location.hash, "");
    assert.equal(failed.callsTo(ROUTES.session).length, 1);
    assert.equal(failed.callsTo(ROUTES.snapshot).length, 0);
    await assertStopped(failed, "unavailable(access not granted)");
  }


  for (const session of [new FakeResponse(200, { credential: "unused" }, "2"), new FakeResponse(200, { credential: "unused" }, null)]) {
    const incompatible = new Harness({ session });
    await incompatible.boot();
    await assertStopped(incompatible, "unavailable(incompatible)");
    assert.equal(session.jsonReads, 0, "incompatible exchange bodies are never read");
    assert.equal(incompatible.callsTo(ROUTES.snapshot).length, 0, "incompatible exchanges never request a snapshot");
  }
  const waiting = Promise.withResolvers<FakeResponse>();
  const harness = new Harness({ snapshots: [waiting] });
  await harness.boot();
  assert.deepEqual(harness.historyCalls, ["/"]);
  assert.equal(harness.location.hash, "", "the fragment is cleared after exchange");
  const exchange = harness.callsTo(ROUTES.session)[0]!;
  assert.equal(exchange.hash, "", "the code is removed before it can be exchanged");
  assert.equal(exchange.options.method, "POST");
  assert.deepEqual(JSON.parse(exchange.options.body!), { code: "bootstrap/secret" });
  assert.equal(harness.pageCalls().length, 0, "no transcript before a snapshot arrives");
  await harness.node("load-more").click();
  assert.equal(harness.pageCalls().length, 0);
  waiting.resolve(response(snapshot()));
  await flush();
  assert.equal(harness.node("status").hidden, true);
  assert.equal(harness.node("age").textContent, "Last snapshot received 0 s ago", "server timestamps never determine freshness");
  assert.equal(harness.document.body.textContent.includes("viewer-credential"), false);
  assert.equal(harness.location.hash.includes("viewer-credential"), false);
  for (const call of harness.calls) {
    assert.equal(call.options.credentials, "omit");
    assert.equal(call.options.cache, "no-store");
    if (call.url !== ROUTES.session) assert.equal(call.options.headers?.Authorization, "Bearer viewer-credential");
  }
}

async function checkRenderingAndPaging(): Promise<void> {
  const longId = `child/${"long segment ?#% Ω ".repeat(40)}`;
  const parent = child("parent-child", {
    tombstoned: true,
    outcome: { state: "completed", generation: 2, spawnCallId: unknown("call unavailable"), at: "2099-03-01" },
  });
  const nested = child(longId, {
    parentId: parent.childId,
    agentName: "<img src=x onerror=bad()>",
    modelRole: unknown("model role not reported"),
    resolvedModel: unknown("resolved model not reported"),
    lineage: {
      ...parent.lineage,
      parentWorktree: { value: "parent-worktree", known: true },
      childWorktree: { value: "child-worktree", known: true },
    },
  });
  const otherRoot = child("other-root", {
    rootSession: "root-session-b",
    lineage: { ...parent.lineage, parentWorktree: unknown("parent worktree missing"), childWorktree: unknown("child worktree missing") },
    completeness: { state: "unknown", reason: "header unavailable" },
  });
  const hidden = child("not-granted", { grantScope: "none", agentName: "must not be shown" });
  const compact = { type: "tool-result", value: { answer: 42 } };
  const harness = new Harness({
    snapshots: [response(snapshot([parent, nested, otherRoot, hidden])), response(snapshot([parent, nested, otherRoot, hidden], { generation: 5 }))],
    pages: [
      response(page([
        { type: "message", message: { role: "assistant", content: [{ type: "text", text: "<script>literal text</script>" }, { type: "text", text: "second text" }, { type: "image", data: "not text" }] } },
        { role: "user", content: "hello viewer" },
        { role: "system", text: "direct text field" },
        compact,
      ], { malformed: 1 })),
      response(page([{ role: "assistant", content: "replacement transcript" }], { reset: true, token: "after-reset" })),
      response({ kind: "record_too_large", start: 1024, end: null, scannedTo: 4096, reset: false, token: "after-scan" } satisfies ReadResult),
      response({ kind: "record_too_large", start: 4096, end: 9999, scannedTo: 9999, reset: false, token: "after-large" } satisfies ReadResult),
      response({ kind: "unavailable", reason: "unreadable" } satisfies ReadResult),
      response(page([{ role: "assistant", content: "last entry" }], { atEnd: true, token: "end" })),
    ],
  });
  await harness.boot();
  const tree = harness.node("children");
  for (const text of [
    "Root session: root-session-a", "Root session: root-session-b", "Worktree: parent-worktree → child-worktree",
    "unknown(parent worktree missing)", "unknown(child worktree missing)", "Model role", "implementer", "Resolved model", "provider/model-a",
    "unknown(model role not reported)", "unknown(resolved model not reported)", longId, "idle — hard-killed (tombstone)",
    "completed · generation 2", "unknown(call unavailable)", "unknown(no lifecycle evidence)", "responseAt", "acceptedAt", "terminalAt",
    "unknown(not accepted)", "unknown(not terminal)", "Activity (sampled)", "unknown(no activity timestamp)",
    "repoRoot", "cwd", "parentWorktree", "childWorktree", "isolation", "branch", "feature/viewer", "unknown(isolation not reported)",
    "partial(sampled registry)", "unknown(header unavailable)", "<img src=x onerror=bad()>",
  ]) assert.ok(tree.textContent.includes(text), `row renders ${text}`);
  assert.equal(tree.textContent.includes("must not be shown"), false, "only granted rows render");
  const nestedButton = harness.childButton(longId);
  let ancestor = nestedButton.parentNode;
  let underParent = false;
  while (ancestor && ancestor !== tree) {
    if (ancestor.tagName === "li" && ancestor.childNodes[0]?.textContent.includes(`Agent ${parent.childId}`)) underParent = true;
    ancestor = ancestor.parentNode;
  }
  assert.equal(underParent, true, "parent and child are nested within their root/worktree group");
  assert.equal(harness.pageCalls().length, 0, "rendering rows does not read transcripts");
  await nestedButton.click();
  const first = harness.pageCalls()[0]!;
  assert.equal(first.url.split("?")[0], ROUTES.page.replace(":childId", encodeURIComponent(longId)), "long child ids occupy one encoded path segment");
  const query = new URL(first.url, "http://observer.invalid").searchParams;
  assert.equal(query.get("mode"), "entries");
  assert.equal(query.get("token"), "");
  assert.equal(first.options.headers?.Authorization, "Bearer viewer-credential");
  const transcript = harness.node("entries");
  for (const text of ["assistant", "user", "system", "<script>literal text</script>", "second text", "hello viewer", "direct text field", JSON.stringify(compact)]) {
    assert.ok(transcript.textContent.includes(text), `transcript renders ${text}`);
  }
  assert.ok(harness.node("transcript-status").textContent.includes("Malformed records: 1"));
  assert.equal(harness.document.dynamicHtmlWrites, 0, "no innerHTML receives dynamic data");
  assert.equal(transcript.descendants().some(node => node.tagName === "script" || node.tagName === "img"), false, "markup stays literal text");
  assert.equal(nestedButton.getAttribute("aria-pressed"), "true");
  await harness.node("load-more").click();
  assert.equal(new URL(harness.pageCalls()[1]!.url, "http://observer.invalid").searchParams.get("token"), "next/+? token", "load more uses the returned token");
  assert.equal(transcript.textContent.includes("hello viewer"), false, "reset discards earlier entries");
  assert.ok(transcript.textContent.includes("replacement transcript"));
  assert.ok(harness.node("transcript-status").textContent.includes("Transcript reset"));
  await harness.node("load-more").click();
  assert.ok(transcript.textContent.includes("bytes 1024–unknown(record end beyond bounded scan); scanned through 4096"));
  assert.equal(new URL(harness.pageCalls()[2]!.url, "http://observer.invalid").searchParams.get("token"), "after-reset");
  await harness.node("load-more").click();
  assert.ok(transcript.textContent.includes("bytes 4096–9999; scanned through 9999"), "record_too_large displays its byte extent");
  await harness.node("load-more").click();
  assert.equal(harness.node("transcript-status").textContent, "unavailable(unreadable)");
  await harness.clock.advance(2000);
  assert.equal(harness.callsTo(ROUTES.snapshot).length, 2, "transcript unavailability does not stop snapshot polling");
  await harness.node("load-more").click();
  assert.equal(harness.node("load-more").hidden, true, "the final page offers no further load");
  assert.ok(transcript.textContent.includes("last entry"));
  for (const button of harness.document.body.descendants().filter(node => node.tagName === "button")) {
    assert.ok(button.id === "load-more" || button.classList.contains("select-child"), "only child selection and load more are controls");
  }
}

async function checkStates(): Promise<void> {
  for (const reply of [new FakeResponse(401, {}), new FakeResponse(200, { children: [{ agentName: "must never render" }] }, "2"), new FakeResponse(200, {}, null)]) {
    const harness = new Harness({ snapshots: [response(snapshot()), reply], pages: [response(page([{ role: "assistant", content: "old transcript" }]))] });
    await harness.boot();
    await harness.childButton("child-a").click();
    assert.ok(harness.node("entries").textContent.includes("old transcript"));
    await harness.clock.advance(2000);
    await assertStopped(harness, reply.status === 401 ? "unavailable(access ended)" : "unavailable(incompatible)");
    assert.equal(reply.jsonReads, 0, "terminal HTTP states never consume the response body");
  }

  for (const reply of [new FakeResponse(401, {}), new FakeResponse(200, { entries: ["must never render"] }, "2")]) {
    const harness = new Harness({ snapshots: [response(snapshot())], pages: [reply] });
    await harness.boot();
    await harness.childButton("child-a").click();
    await assertStopped(harness, reply.status === 401 ? "unavailable(access ended)" : "unavailable(incompatible)");
    assert.equal(reply.jsonReads, 0);
  }

  for (const [reply, reason] of [
    [new FakeResponse(503, { state: { state: "unavailable", reason: "root session ended" } }), "root session ended"],
    [new Error("connection refused"), "unreachable"],
    [new Error("connection reset"), "unreachable"],
  ] as const) {
    const harness = new Harness({ snapshots: [response(snapshot()), reply, response(snapshot([child("recovered")], { generation: 5 }))] });
    await harness.boot();
    const lastTree = harness.node("children").textContent;
    await harness.clock.advance(2000);
    harness.banner(`unavailable(${reason})`);
    assert.equal(harness.node("children").textContent, lastTree, "unavailable states keep the last tree immediately");
    assert.equal(harness.node("view").classList.contains("dimmed"), true);
    await harness.clock.advance(2000);
    assert.equal(harness.callsTo(ROUTES.snapshot).length, 3, "503 and network errors continue polling");
    assert.equal(harness.node("status").hidden, true);
    assert.equal(harness.node("view").classList.contains("dimmed"), false);
    assert.ok(harness.node("children").textContent.includes("recovered"));
  }
}

async function checkDeadlines(): Promise<void> {
  const pending = Promise.withResolvers<FakeResponse>();
  const harness = new Harness({ snapshots: [response(snapshot()), pending, response(snapshot([child("after-timeout")], { generation: 5 }))] });
  await harness.boot();
  const lastTree = harness.node("children").textContent;
  await harness.clock.advance(2000);
  await harness.clock.advance(10000);
  harness.banner("stale (no response within 10 s)");
  assert.equal(harness.node("children").textContent, lastTree, "a ten-second no-response request keeps the last tree");
  assert.equal(harness.callsTo(ROUTES.snapshot)[1]!.options.signal?.aborted, true, "the deadline releases the hung poll");
  await harness.clock.advance(2000);
  assert.equal(harness.callsTo(ROUTES.snapshot).length, 3, "polling continues after the local deadline");
  assert.ok(harness.node("children").textContent.includes("after-timeout"));
  pending.resolve(response(snapshot([child("late body")], { generation: 99 })));
  await flush();
  assert.equal(harness.node("children").textContent.includes("late body"), false, "an aborted fetch cannot overwrite a newer receive");

  const firstPending = Promise.withResolvers<FakeResponse>();
  const first = new Harness({ snapshots: [firstPending, response(snapshot())] });
  await first.boot();
  await first.clock.advance(9999);
  assert.equal(first.node("status").textContent.includes("stale"), false);
  await first.clock.advance(1);
  first.banner("stale (no response within 10 s)");
  assert.equal(first.pageCalls().length, 0, "a timed-out first snapshot grants no transcript access");
  await first.clock.advance(2000);
  assert.equal(first.callsTo(ROUTES.snapshot).length, 2);
  assert.equal(first.node("status").hidden, true);

  const body = Promise.withResolvers<unknown>();
  const bodyPending = new Harness({ snapshots: [new FakeResponse(503, () => body.promise), response(snapshot())] });
  await bodyPending.boot();
  await bodyPending.clock.advance(10000);
  bodyPending.banner("stale (no response within 10 s)");
  await bodyPending.clock.advance(2000);
  assert.equal(bodyPending.callsTo(ROUTES.snapshot).length, 2, "body consumption cannot pin the polling guard");
  body.resolve({ state: { state: "unavailable", reason: "obsolete timed-out state" } });
  await flush();

  const awaitingSnapshot = Promise.withResolvers<FakeResponse>();
  const incompleteEpoch = snapshot([child("partial epoch")], {
    epoch: "epoch-b", generation: 0, inventory: { state: "partial", reason: "new epoch is partial" },
  });
  const epochTimeout = new Harness({ snapshots: [response(snapshot()), response(incompleteEpoch), awaitingSnapshot] });
  await epochTimeout.boot();
  await epochTimeout.clock.advance(4000);
  epochTimeout.banner("unavailable(new epoch is partial)");
  await epochTimeout.clock.advance(10000);
  epochTimeout.banner("unavailable(new epoch is partial)");
  assert.equal(bodyPending.node("status").hidden, true, "a late timed-out body cannot overwrite the recovered state");
}

async function checkOrderingAndSelection(): Promise<void> {
  const original = child();
  const changed = child("child-a", { agentName: "updated same epoch" });
  const partial = snapshot([child("other epoch partial")], { epoch: "epoch-b", generation: 0, inventory: { state: "partial", reason: "new inventory incomplete" } });
  const invalid = { ...snapshot([child("bad row")], { epoch: "epoch-b", generation: 0 }), children: [{ childId: "bad row" }] };
  const harness = new Harness({
    snapshots: [
      response(snapshot([original])),
      response({ epoch: "epoch-a", generation: 3, children: "discarded malformed older body" }),
      response(snapshot([child("same-generation must not render")])),
      response(snapshot([changed], { generation: 5 })),
      response(partial),
      response({ epoch: "epoch-a", generation: 4, children: "obsolete epoch while replacement is incomplete" }),
      response(invalid),
      response(snapshot([child("new epoch child")], { epoch: "epoch-b", generation: 0 })),
    ],
    pages: [response(page([{ role: "assistant", content: "keep until epoch replacement" }]))],
  });
  await harness.boot();
  await harness.childButton("child-a").click();
  const oldTree = harness.node("children").textContent;
  for (let receive = 0; receive < 2; receive++) {
    await harness.clock.advance(2000);
    assert.equal(harness.node("children").textContent, oldTree, "same-epoch lower or equal generations cannot replace the accepted snapshot");
    assert.equal(harness.node("age").textContent, "Last snapshot received 0 s ago", "discarded generations still count as successful receives");
    assert.equal(harness.node("status").hidden, true);
    assert.ok(harness.node("entries").textContent.includes("keep until epoch replacement"));
  }
  await harness.clock.advance(2000);
  assert.ok(harness.node("children").textContent.includes("updated same epoch"));
  assert.ok(harness.node("entries").textContent.includes("keep until epoch replacement"));
  const updatedTree = harness.node("children").textContent;
  await harness.clock.advance(2000);
  harness.banner("unavailable(new inventory incomplete)");
  assert.equal(harness.node("children").textContent, updatedTree);
  assert.ok(harness.node("entries").textContent.includes("keep until epoch replacement"));
  await harness.clock.advance(2000);
  harness.banner("unavailable(new inventory incomplete)");
  assert.equal(harness.node("children").textContent, updatedTree, "old-epoch receives cannot clear an incomplete epoch transition");
  assert.equal(harness.node("age").textContent, "Last snapshot received 0 s ago");
  await harness.clock.advance(2000);
  harness.banner("unavailable(invalid snapshot)");
  assert.equal(harness.node("children").textContent, updatedTree);
  await harness.clock.advance(2000);
  assert.ok(harness.node("children").textContent.includes("new epoch child"));
  assert.equal(harness.node("children").textContent.includes("updated same epoch"), false);
  assert.equal(harness.node("entries").textContent, "", "a complete new epoch clears the open transcript");
  assert.equal(harness.node("transcript-title").textContent, "Child transcript");
  assert.equal(harness.pageCalls().length, 1, "epoch replacement does not request a transcript automatically");

  const lateUnavailable = Promise.withResolvers<unknown>();
  const pendingPageB = Promise.withResolvers<FakeResponse>();
  const pendingPageC = Promise.withResolvers<FakeResponse>();
  const selection = new Harness({
    snapshots: [
      response(snapshot([child("first"), child("second"), child("third")])),
      response(snapshot([child("first")], { generation: 5 })),
    ],
    pages: [
      new FakeResponse(503, () => lateUnavailable.promise),
      pendingPageB,
      pendingPageC,
    ],
  });
  await selection.boot();
  await selection.childButton("first").click();
  const firstPage = selection.pageCalls()[0]!;
  await selection.childButton("second").click();
  const secondPage = selection.pageCalls()[1]!;
  assert.equal(firstPage.options.signal?.aborted, true, "changing selection aborts the first page request");
  assert.equal(secondPage.options.signal?.aborted, false, "the second page request remains active until superseded");
  const bannerBeforeLateResponse = selection.node("status").textContent;
  lateUnavailable.resolve({ state: { state: "unavailable", reason: "late obsolete failure" } });
  await flush();
  assert.equal(selection.node("status").textContent, bannerBeforeLateResponse, "a late superseded 503 cannot change the banner");
  assert.equal(selection.node("status").hidden, true);
  await selection.childButton("third").click();
  const thirdPage = selection.pageCalls()[2]!;
  assert.equal(secondPage.options.signal?.aborted, true, "changing selection aborts the second page request");
  assert.equal(thirdPage.options.signal?.aborted, false, "the current page request remains active");
  await selection.clock.advance(2000);
  assert.equal(selection.node("entries").textContent, "", "removing a granted selected child clears its transcript");
  assert.equal(selection.node("load-more").hidden, true);

  const notFound = new Harness({
    snapshots: [response(snapshot())],
    pages: [new FakeResponse(404, () => { throw new Error("plain-text 404 is not JSON"); })],
  });
  await notFound.boot();
  await notFound.childButton("child-a").click();
  notFound.banner("unavailable(http 404)");
  const incompleteFirst = new Harness({ snapshots: [response(partial), response(snapshot([child("admitted")], { epoch: "epoch-b", generation: 1 }))] });
  await incompleteFirst.boot();
  incompleteFirst.banner("unavailable(new inventory incomplete)");
  assert.equal(incompleteFirst.node("children").textContent, "");
  assert.equal(incompleteFirst.pageCalls().length, 0);
  await incompleteFirst.clock.advance(2000);
  assert.ok(incompleteFirst.node("children").textContent.includes("admitted"));
}

await checkBootstrap();
await checkRenderingAndPaging();
await checkStates();
await checkDeadlines();
await checkOrderingAndSelection();
console.log("viewer checks passed");
