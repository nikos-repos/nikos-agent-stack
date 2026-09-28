import {
  PAGE_MAX_BYTES,
  ROUTES,
  SCHEMA_HEADER,
  SNAPSHOT_SCHEMA_VERSION,
  type Endpoint,
  type ServeOptions,
} from "./contract.ts";

/** Starts a loopback-only, read-only endpoint and closes its in-flight reads on shutdown. */
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

  async function handle(request: Request): Promise<Response> {
    try {
      const host = request.headers.get("host");
      if (host !== numericHost && host !== localHost) {
        return new Response("Misdirected Request", { status: 421, headers });
      }

      const url = new URL(request.url);
      const path = url.pathname;
      if (request.method === "POST" && path === ROUTES.session) {
        return new Response("Not Found", { status: 404, headers });
      }
      if (request.method !== "GET") {
        return new Response("Method Not Allowed", { status: 405, headers });
      }
      if (path === ROUTES.viewer) {
        return new Response(viewer, { headers: viewerHeaders });
      }
      if (path === ROUTES.snapshot) {
        const snapshot = options.snapshot();
        return snapshot === null
          ? Response.json({ state: options.state() }, { status: 503, headers })
          : Response.json(snapshot, { headers });
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
        const sessionFile = options.admittedSessionFile(childId);
        if (sessionFile === null) {
          return new Response("Not Found", { status: 404, headers });
        }
        const mode = url.searchParams.get("mode") ?? "entries";
        if (mode !== "entries" && mode !== "bytes") {
          return new Response("Invalid page mode", { status: 400, headers });
        }
        return Response.json(await options.read({
          childId,
          sessionFile,
          epoch: options.epoch,
          token: url.searchParams.get("token"),
          mode,
          maxBytes: PAGE_MAX_BYTES,
          signal: AbortSignal.any([request.signal, shutdown.signal]),
        }), { headers });
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
  return {
    port,
    url: `http://${numericHost}/`,
    async close() {
      shutdown.abort();
      await server.stop(true);
    },
  };
}
