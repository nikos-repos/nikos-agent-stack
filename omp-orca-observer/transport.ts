import {
  PAGE_MAX_BYTES,
  ROUTES,
  SCHEMA_HEADER,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
  type Endpoint,
  type ReadRequest,
  type ReadResult,
  type ServeOptions,
  type Snapshot,
} from "./contract.ts";

/**
 * @cc [label:security] transport-authorized-reads
 * Snapshot collection and native reads require request-time authorization. The read callback owns its
 * native handle and must close it when the supplied signal aborts.
 * @cc [label:ceiling] transport-request-limit
 * The 16 limit counts concurrent in-flight requests; idle keep-alive sockets are not counted and are closed by Bun.serve's default 10 s idle timeout.
 * until: Bun.serve exposes an open-connection count or connection hook.
 */
export async function serve(options: ServeOptions): Promise<Endpoint> {
  const shutdown = new AbortController();
  const headers = {
    "Cache-Control": "no-store",
    [SCHEMA_HEADER]: String(SNAPSHOT_SCHEMA_VERSION),
  };
  const viewerHeaders = { ...headers, "Content-Type": "text/html; charset=utf-8" };
  const viewer = Bun.file(new URL("./viewer/index.html", import.meta.url));
  const marker = ":childId";
  const markerAt = ROUTES.page.indexOf(marker);
  const pagePrefix = ROUTES.page.slice(0, markerAt);
  const pageSuffix = ROUTES.page.slice(markerAt + marker.length);
  const grants = options.grants;
  const inFlight = new Map<string, Map<string, { controller: AbortController; settled: Promise<void> }>>();
  type Authorization = { credential: string; signal: AbortSignal };

  function readGranted(request: ReadRequest, authorization: Authorization): Promise<ReadResult> | null {
    const { credential } = authorization;
    const reads = inFlight.get(credential) ?? new Map<string, { controller: AbortController; settled: Promise<void> }>();
    const previous = reads.get(request.childId);
    if (!previous && reads.size >= 2) return null;
    previous?.controller.abort();
    const latest = { controller: new AbortController(), settled: Promise.resolve() };
    const signal = AbortSignal.any([request.signal, shutdown.signal, authorization.signal, latest.controller.signal]);
    request.signal = signal;
    reads.set(request.childId, latest);
    inFlight.set(credential, reads);
    const pending = finish();
    latest.settled = pending.then(() => { }, () => { });
    return pending;

    async function finish(): Promise<ReadResult> {
      try {
        if (previous) await previous.settled;
        if (signal.aborted) return { kind: "unavailable", reason: "cancelled" };
        const result = await options.read(request);
        return signal.aborted ? { kind: "unavailable", reason: "cancelled" } : result;
      } catch (error) {
        if (signal.aborted) return { kind: "unavailable", reason: "cancelled" };
        throw error;
      } finally {
        if (reads.get(request.childId) === latest) {
          reads.delete(request.childId);
          if (reads.size === 0) inFlight.delete(credential);
        }
      }
    }
  }
  const access = {
    requestLimit: 16,
    acceptsOrigin: (origin: string | null) =>
      origin === null || origin === numericOrigin || origin === localOrigin,
    async session(request: Request): Promise<Response> {
      const reader = request.body?.getReader();
      if (!reader) return new Response("Unauthorized", { status: 401, headers });
      let body = "";
      let bytes = 0;
      const decoder = new TextDecoder();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          bytes += value.byteLength;
          if (bytes > 1024) {
            await reader.cancel();
            return new Response("Session body too large", { status: 413, headers });
          }
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();
      } finally {
        reader.releaseLock();
      }
      let code: unknown;
      try {
        const parsed: unknown = JSON.parse(body);
        if (typeof parsed === "object" && parsed !== null && "code" in parsed) {
          code = parsed.code;
        }
      } catch {
        return new Response("Unauthorized", { status: 401, headers });
      }
      const session = typeof code === "string" ? grants.exchange(code) : null;
      return session === null
        ? new Response("Unauthorized", { status: 401, headers })
        : Response.json({
          ...session,
          schema: SNAPSHOT_SCHEMA_VERSION,
          epoch: options.epoch,
        }, { headers });
    },
    authorize(request: Request, childId: string | null): Authorization | null {
      const credential = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
      if (!credential || !grants.allows(credential, childId)) return null;
      const signal = grants.signal(credential, childId);
      if (signal === null || signal.aborted) return null;
      return { credential, signal };
    },
    snapshot(snapshot: Snapshot | null, credential: string): Response {
      const body = JSON.stringify(snapshot === null ? { state: options.state() } : {
        ...snapshot,
        children: snapshot.children.filter(child => grants.allows(credential, child.childId))
          .map(child => ({ ...child, grantScope: "granted" })),
      });
      if (Buffer.byteLength(body) > SNAPSHOT_MAX_BYTES) {
        return Response.json({
          state: { state: "unavailable", reason: "snapshot exceeds byte budget" },
        }, { status: 503, headers });
      }
      return new Response(body, {
        status: snapshot === null ? 503 : 200,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    },
    read: readGranted,
  };

  async function handle(request: Request): Promise<Response> {
    try {
      const host = request.headers.get("host");
      if (host !== numericHost && host !== localHost) {
        return new Response("Misdirected Request", { status: 421, headers });
      }
      if (!access.acceptsOrigin(request.headers.get("origin"))) {
        return new Response("Forbidden", { status: 403, headers });
      }
      if (server.pendingRequests > access.requestLimit) {
        return new Response("Too Many Requests", { status: 429, headers });
      }

      const url = new URL(request.url);
      const path = url.pathname;
      if (request.method === "POST" && path === ROUTES.session) {
        return await access.session(request);
      }
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405, headers });
      }
      if (path === ROUTES.viewer) {
        return new Response(viewer, { headers: viewerHeaders });
      }
      if (path === ROUTES.snapshot) {
        const authorization = access.authorize(request, null);
        if (authorization === null) return new Response("Unauthorized", { status: 401, headers });
        return access.snapshot(options.snapshot(), authorization.credential);
      }
      if (path.startsWith(pagePrefix) && path.endsWith(pageSuffix)) {
        const encodedId = path.slice(pagePrefix.length, -pageSuffix.length);
        if (!encodedId || encodedId.includes("/")) {
          return new Response("Not Found", { status: 404, headers });
        }
        let childId: string;
        try {
          childId = decodeURIComponent(encodedId);
        } catch {
          return new Response("Not Found", { status: 404, headers });
        }
        const authorization = access.authorize(request, childId);
        if (authorization === null) return new Response("Unauthorized", { status: 401, headers });
        const sessionFile = options.admittedSessionFile(childId);
        if (sessionFile === null) {
          return new Response("Not Found", { status: 404, headers });
        }
        const mode = url.searchParams.get("mode") ?? "entries";
        if (mode !== "entries" && mode !== "bytes") {
          return new Response("Invalid page mode", { status: 400, headers });
        }
        const pending = access.read({
          childId,
          sessionFile,
          epoch: options.epoch,
          token: url.searchParams.get("token") || null,
          mode,
          maxBytes: PAGE_MAX_BYTES,
          signal: request.signal,
        }, authorization);
        return pending === null
          ? new Response("Too Many Requests", { status: 429, headers })
          : Response.json(await pending, { headers });
      }
      return new Response("Not Found", { status: 404, headers });
    } catch {
      return new Response("Internal Server Error", { status: 500, headers });
    }
  }

  const server = Bun.serve({ hostname: "127.0.0.1", port: options.port, fetch: handle });
  const port = server.port;
  if (port === undefined) {
    await server.stop(true);
    throw new Error("Observer server did not bind to a TCP port");
  }
  const numericHost = `127.0.0.1:${port}`;
  const localHost = `localhost:${port}`;
  const numericOrigin = `http://${numericHost}`;
  const localOrigin = `http://${localHost}`;
  return {
    port,
    url: `${numericOrigin}/`,
    async close() {
      shutdown.abort();
      await server.stop(true);
    },
  };
}
