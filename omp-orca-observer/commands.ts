import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { ORCA_FLOOR, type ObserverRuntime } from "./contract.js";

const execute = promisify(execFile);
const DEFAULT_TTL_MINUTES = 30;

async function runOrca(cli: string, args: string[], cwd: string): Promise<unknown> {
  let stdout: string;
  try {
    ({ stdout } = await execute(cli, args, { cwd, encoding: "utf8" }));
  } catch (error) {
    const failure = error as Error & { stderr?: string; stdout?: string };
    const message = failure.stderr?.trim() || failure.stdout?.trim()
      || (error instanceof Error ? error.message : String(error));
    throw new Error(`orca ${args.slice(0, -1).join(" ")} failed: ${message}`);
  }

  let response: unknown;
  try {
    response = JSON.parse(stdout);
  } catch {
    throw new Error(`orca ${args[0]} returned unparseable JSON`);
  }
  if (response !== null && typeof response === "object" && "ok" in response && response.ok === false) {
    const failure = response as { error?: { message?: unknown } };
    const message = typeof failure.error?.message === "string" ? failure.error.message : stdout.trim();
    throw new Error(`orca ${args[0]} failed: ${message}`);
  }
  return response;
}

function requireOrcaVersion(response: unknown): void {
  // Stock v1.4.215 returns the optional version inside result.runtime, not at the top level.
  const version = (response as { result?: { runtime?: { appVersion?: unknown } } } | null)
    ?.result?.runtime?.appVersion;
  if (typeof version !== "string" || !version) {
    throw new Error("orca status is missing appVersion");
  }
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match || !match.slice(1, 4).every(part => Number.isSafeInteger(Number(part)))
    || match[4]?.split(".").some(part => /^0\d+$/.test(part))) {
    throw new Error(`orca appVersion is unparseable: ${version}`);
  }
  const floor = ORCA_FLOOR.split(".").map(Number);
  for (let index = 0; index < 3; index++) {
    const part = Number(match[index + 1]);
    if (part > floor[index]!) return;
    if (part < floor[index]!) throw new Error(`orca appVersion ${version} is below ${ORCA_FLOOR}`);
  }
  if (match[4]) throw new Error(`orca appVersion ${version} is below ${ORCA_FLOOR}`);
}

/** User-initiated commands publish secrets only through stock omp's non-persisted TUI notify surface. */
export function registerCommands(pi: ExtensionAPI, runtime: () => ObserverRuntime | null): void {
  pi.registerCommand("observer", {
    description: "serve, grant, revoke, inspect, or open the read-only child observer",
    handler: async (args, ctx) => {
      if (ctx.agent.kind !== "main") {
        ctx.ui.notify("observer unavailable: this session is not the publisher", "warning");
        return;
      }
      const observer = runtime();
      const source = observer?.source;
      const grants = observer?.grants;
      if (!observer || !source || !grants) {
        const reason = !observer ? "publisher runtime is not active"
          : !source ? "publisher source is unavailable" : "publisher grants are unavailable";
        ctx.ui.notify(`observer unavailable: ${reason}`, "warning");
        return;
      }
      const coordinator = observer.coordinator;
      const epoch = coordinator.epoch();
      const [command, ...tokens] = args.trim().split(/\s+/);
      const secretCommand = command === "grant" || command === "url" || command === "open";

      function requireSecretSurface(): void {
        if (ctx.mode !== "tui" || !ctx.hasUI) {
          throw new Error(`observer ${command} requires interactive tui mode with UI`);
        }
      }

      function requireCurrentPublisher(): void {
        const current = runtime();
        if (ctx.agent.kind !== "main" || !current || current.coordinator !== coordinator
          || current.source !== source || current.grants !== grants || current.coordinator.epoch() !== epoch) {
          throw new Error("observer unavailable: publisher changed while the command was running");
        }
        const state = current.coordinator.state();
        if (state.state === "unavailable") throw new Error(`observer unavailable: ${state.reason}`);
      }

      function selectChildren(selection: string[], approved: boolean): string[] {
        const approvedIds = approved ? new Set(grants!.status().grantedChildIds) : null;
        let childIds = [...new Set(selection)];
        if (childIds.includes("all")) {
          if (childIds.length !== 1) throw new Error("observer: use all without other child ids");
          const snapshot = coordinator.snapshot();
          if (!snapshot) throw new Error("observer unavailable: current snapshot is unavailable");
          childIds = [...new Set(snapshot.children.map(child => child.childId))]
            .filter(id => source!.admittedSessionFile(id) !== null && (!approvedIds || approvedIds.has(id)));
        } else {
          const unadmitted = childIds.filter(id => source!.admittedSessionFile(id) === null);
          if (unadmitted.length) throw new Error(`observer: child ids not admitted: ${unadmitted.join(", ")}`);
          const unapproved = approvedIds ? childIds.filter(id => !approvedIds.has(id)) : [];
          if (unapproved.length) throw new Error(`observer: child ids not approved: ${unapproved.join(", ")}`);
        }
        if (!childIds.length) {
          throw new Error(`observer: no admitted${approved ? ", approved" : ""} children selected`);
        }
        return childIds;
      }

      try {
        if (secretCommand) requireSecretSurface();
        if (command === "status") {
          if (tokens.length) throw new Error("observer: status takes no arguments");
          const snapshot = observer.coordinator.snapshot();
          const state = observer.coordinator.state();
          const status = grants.status();
          const inventory = snapshot?.inventory;
          ctx.ui.notify([
            `observer state: ${state.state}${state.state === "unavailable" ? `: ${state.reason}` : ""}`,
            `epoch: ${observer.coordinator.epoch()}`,
            `endpoint: ${observer.endpoint?.url ?? "not serving"}`,
            `grants: ${status.grantedChildIds.length} children, ${status.liveCredentials} live credentials, ${status.pendingCodes} pending codes`,
            `inventory: ${inventory ? `${inventory.state}${inventory.state !== "complete" ? `: ${inventory.reason}` : ""}` : "unavailable: current snapshot is unavailable"}`,
          ].join("\n"), "info");
          return;
        }
        requireCurrentPublisher();
        if (command === "serve") {
          if (tokens.length) throw new Error("observer: serve takes no arguments");
          const endpoint = await observer.serve();
          requireCurrentPublisher();
          ctx.ui.notify(`observer serving: ${endpoint.url}`, "info");
          return;
        }
        if (command !== "grant" && command !== "revoke" && command !== "url" && command !== "open") {
          throw new Error("usage: /observer serve | grant <childId…|all> [--ttl <minutes>] | revoke <childId…|all> | status | url <childId…|all> | open <childId…|all>");
        }

        let ttlMinutes = DEFAULT_TTL_MINUTES;
        const ttlIndex = tokens.indexOf("--ttl");
        if (ttlIndex !== -1) {
          if (command !== "grant" || ttlIndex !== tokens.length - 2) {
            throw new Error("observer: only grant accepts a trailing --ttl <minutes>");
          }
          ttlMinutes = Number(tokens[ttlIndex + 1]);
          if (!Number.isFinite(ttlMinutes) || ttlMinutes <= 0 || ttlMinutes > 480) {
            throw new Error("observer: ttl must be greater than 0 and at most 480 minutes");
          }
          tokens.splice(ttlIndex, 2);
        }
        if (!tokens.length || tokens.some(token => token.startsWith("--"))) {
          throw new Error(`usage: /observer ${command} <childId…|all>${command === "grant" ? " [--ttl <minutes>]" : ""}`);
        }
        if (tokens.includes("all") && tokens.length !== 1) {
          throw new Error("observer: use all without other child ids");
        }
        if (command === "revoke") {
          const all = tokens[0] === "all";
          const granted = new Set(grants.status().grantedChildIds);
          const childIds = all ? [...granted] : [...new Set(tokens)].filter(id => granted.has(id));
          grants.revoke(all ? "all" : childIds);
          ctx.ui.notify(`observer revoked: ${childIds.join(", ") || "none"}`, "info");
          return;
        }

        const childIds = selectChildren(tokens, command !== "grant");
        const cli = process.env.ORCA_CLI_COMMAND ?? "orca-ide";
        if (command === "open") {
          requireOrcaVersion(await runOrca(cli, ["status", "--json"], ctx.cwd));
          await runOrca(cli, ["tab", "list", "--worktree", "current", "--json"], ctx.cwd);
        }
        const endpoint = observer.endpoint ?? await observer.serve();
        requireCurrentPublisher();
        requireSecretSurface();
        // Recheck the resolved scope after awaits; admission or approval may have been revoked meanwhile.
        const currentIds = selectChildren(childIds, command !== "grant");
        const { code } = grants.bootstrap(currentIds, ttlMinutes * 60_000);
        const bootstrapUrl = `${endpoint.url}#code=${encodeURIComponent(code)}`;
        if (command !== "open") {
          ctx.ui.notify(bootstrapUrl, "info");
          return;
        }

        const residual = "Orca browser history retains the full URL, including its fragment. The single-use code is spent when the page loads and exchanges it; if it never loads, the code remains usable until it expires 60 s after issue. Never reuse it.";
        try {
          const result = await runOrca(cli, ["tab", "create", "--url", bootstrapUrl, "--worktree", "current", "--json"], ctx.cwd);
          requireCurrentPublisher();
          requireSecretSurface();
          ctx.ui.notify(`observer open: ${JSON.stringify(result)}\n${residual}`, "info");
        } catch (error) {
          requireCurrentPublisher();
          if (ctx.mode !== "tui" || !ctx.hasUI) {
            ctx.ui.notify("observer open: secret result withheld because interactive tui UI is no longer available", "warning");
            return;
          }
          const message = error instanceof Error ? error.message : String(error);
          ctx.ui.notify(`observer open: ${message}\n${residual}\nUse /observer url to issue a fresh bootstrap URL.`, "error");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`${message}${command === "open" ? "\nUse /observer url to issue a bootstrap URL." : ""}`, "error");
      }
    },
  });
}
