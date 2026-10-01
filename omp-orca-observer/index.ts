import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { checkCompat } from "./compat.ts";
import { processCoordinator, startCoordinator } from "./coordinator.ts";
import type { ChildFact, Endpoint, ObserverRuntime } from "./contract.ts";
import { createOutcomeTracker } from "./outcomes.ts";
import { readPage } from "./reader.ts";
import { createStockSource } from "./stock-source.ts";
import { serve } from "./transport.ts";

type ActiveRuntime = ObserverRuntime & {
  rootSessionFile: string | null;
  close(): Promise<void>;
};

let publisher: symbol | null = null;
let runtime: ActiveRuntime | null = null;
let stopping: Promise<void> | null = null;

function startRuntime(ctx: ExtensionContext, api: ExtensionAPI): void {
  if (runtime) return;
  const rootSessionFile = ctx.sessionManager.getSessionFile() ?? null;
  const outcomes = createOutcomeTracker();
  let viewerSeen = false;
  const source = createStockSource(api, rootSessionFile, outcomes, () => viewerSeen);
  const coordinator = startCoordinator({ source, outcomes, limit: 256 });
  let pendingEndpoint: Promise<Endpoint> | null = null;
  const current: ActiveRuntime = {
    rootSessionFile,
    coordinator,
    source,
    outcomes,
    grants: null,
    endpoint: null,
    serve() {
      if (current.endpoint) return Promise.resolve(current.endpoint);
      if (!pendingEndpoint) {
        pendingEndpoint = serve({
          epoch: coordinator.epoch(),
          snapshot: () => {
            if (!viewerSeen) {
              viewerSeen = true;
              coordinator.markDirty();
            }
            return coordinator.snapshot();
          },
          state: () => coordinator.state(),
          admittedSessionFile: source.admittedSessionFile,
          read: request => readPage(request, api.pi.parseSessionContent),
          grants: null,
          port: 0,
        }).then(endpoint => {
          current.endpoint = endpoint;
          return endpoint;
        }).catch(error => {
          pendingEndpoint = null;
          throw error;
        });
      }
      return pendingEndpoint;
    },
    async close() {
      const endpoint = pendingEndpoint ? await pendingEndpoint.catch(() => null) : current.endpoint;
      if (endpoint) await endpoint.close();
    },
  };
  runtime = current;
  api.pi.logger.info(`omp-orca-observer: publisher epoch=${coordinator.epoch()}`);
}

function stopRuntime(): Promise<void> {
  if (stopping) return stopping;
  const previous = runtime;
  runtime = null;
  if (!previous) return Promise.resolve();
  previous.coordinator.dispose();
  previous.source?.dispose();
  stopping = previous.close().finally(() => {
    stopping = null;
  });
  return stopping;
}

/** Registering the extension never starts observer work; only the elected main session can publish. */
export default function orcaObserver(api: ExtensionAPI): void {
  const instance = Symbol("observer session");
  let bound = false;
  let compatible = false;
  let unsubscribe: (() => void) | null = null;

  api.on("session_start", (_event, ctx) => {
    if (!bound) {
      bound = true;
      const state = checkCompat(api, ctx.agent);
      if (ctx.agent) api.pi.logger.info(`omp-orca-observer: bind kind=${ctx.agent.kind} id=${ctx.agent.id}`);
      if (state.state === "unavailable") {
        api.pi.logger.info(`omp-orca-observer: unavailable ${state.reason}`);
        return;
      }
      compatible = true;
      unsubscribe = api.events.on("task:subagent:lifecycle", (payload: unknown) => {
        if (!payload || typeof payload !== "object") return;
        const event = payload as Record<string, unknown>;
        if (
          typeof event.id !== "string" ||
          (event.status !== "started" && event.status !== "completed" && event.status !== "failed" && event.status !== "aborted")
        ) return;
        const fact: ChildFact = {
          kind: "lifecycle",
          childId: event.id,
          sessionFile: typeof event.sessionFile === "string" ? event.sessionFile : null,
          spawnCallId: typeof event.parentToolCallId === "string" ? event.parentToolCallId : null,
          status: event.status,
          at: new Date().toISOString(),
        };
        processCoordinator()?.recordFact(fact);
      });
    }
    if (compatible && ctx.agent.kind === "main" && (publisher === null || publisher === instance)) {
      publisher = instance;
      startRuntime(ctx, api);
    }
  });

  api.on("session_switch", async (_event, ctx) => {
    if (publisher !== instance || !compatible) return;
    await stopRuntime();
    if (publisher === instance) startRuntime(ctx, api);
  });
  api.on("session_branch", async (_event, ctx) => {
    if (publisher !== instance || !compatible) return;
    await stopRuntime();
    if (publisher === instance) startRuntime(ctx, api);
  });
  api.on("session_shutdown", async () => {
    unsubscribe?.();
    unsubscribe = null;
    if (publisher !== instance) return;
    publisher = null;
    await stopRuntime();
  });

  api.registerCommand("observer", {
    description: "Serve the current session's read-only observer",
    async handler(args, ctx) {
      if (publisher !== instance || !compatible) return;
      if (args.trim() !== "serve") {
        ctx.ui.notify("Usage: /observer serve", "warning");
        return;
      }
      const current = runtime;
      if (!current) return;
      try {
        const endpoint = await current.serve();
        if (publisher === instance && runtime === current) ctx.ui.notify(endpoint.url, "info");
      } catch {
        if (publisher === instance && runtime === current) ctx.ui.notify("Observer endpoint unavailable", "error");
      }
    },
  });
}
