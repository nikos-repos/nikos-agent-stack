import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import { randomUUID } from "node:crypto";
import { existsSync, realpathSync, statSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve as resolvePath } from "node:path";
import type { ToolDetails, ToolInput } from "./index.ts";
import * as ledger from "./ledger.js";
import {
  acquirelease,
  formatleasestatus,
  heartbeatintervalms,
  heartbeatlease,
  inspectlease,
  leasefields,
  releaselease,
  releasestalelease,
} from "./lease.js";
import { isInside } from "./predicates.js";

// the cooperative worktree lease around mutation-capable native tools: which calls take a lease, how long
// they hold it, and the /gates-lease command. lease.js owns the on-disk records and arbitration.

type LeaseRecord = {
  path?: string;
  token?: string;
  owner_id?: string;
  request_id?: string;
  session_id?: string;
  session_file?: string;
  agent_id?: string | null;
  tool_call_id?: string;
  tool_name?: string;
  target?: string | null;
  fence?: number;
  repo_root?: string;
  acquired?: boolean;
  recovered?: boolean;
  record?: LeaseRecord | null;
  waited_ms?: number;
  timed_out?: boolean;
  error?: string;
};
type LeaseScope = { cwd: string; target: string | null };
type ActiveOperation = {
  lease: LeaseRecord;
  timer: ReturnType<typeof setInterval>;
  pollTimer?: ReturnType<typeof setInterval>;
  asyncJobId: string | null;
  toolName: string;
  target: string | null;
  backgroundRunning: boolean;
};
type LeaseStatus = { status?: string; stale?: boolean; record?: LeaseRecord | null };
// a mutation-capable call the lease may cover.
type OperationCall = { toolName: string; toolCallId: string; input: ToolInput; sessionId?: string };
type ToolResultNotice = { toolName: string; toolCallId: string; isError: boolean; details?: ToolDetails };
function absolutePathPreserving(base: string, child: string): string {
  if (isAbsolute(child)) return child;
  return `${(isAbsolute(base) ? base : resolvePath(base)).replace(/\/+$/, "")}/${child}`;
}
function canonicalPath(path: string): string | null {
  let candidate = isAbsolute(path) ? path : resolvePath(path);
  const missing: string[] = [];
  while (!existsSync(candidate)) {
    const parent = dirname(candidate);
    if (parent === candidate) return null;
    missing.unshift(candidate.slice(parent.length + 1));
    candidate = parent;
  }
  try {
    return resolvePath(realpathSync(candidate), ...missing);
  } catch {
    return null;
  }
}
function isInternalUri(value: string): boolean {
  const trimmed = value.trim();
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed) && !/^[A-Za-z]:[\\/]/.test(trimmed);
}
function effectiveLeaseInput(toolName: string, input: ToolInput): ToolInput {
  if (toolName !== "edit" || input.path || input.paths) return input;
  const patch = input.input ?? input._input ?? "";
  if (!patch) return input;
  const paths: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const match = /^\s*\[([^#\r\n]+)#[0-9a-f]{4}\]\s*$/i.exec(line);
    if (!match) continue;
    const path = match[1].trim().replace(/^(?:'([^']*)'|"([^"]*)")$/, "$1$2");
    if (path) paths.push(path);
  }
  if (!paths.length) return input;
  return paths.length === 1 ? { ...input, path: paths[0], paths } : { ...input, paths };
}
function leaseScope(event: OperationCall, context: ExtensionContext, repoRoot: string | null): LeaseScope | null {
  if (!repoRoot) return null;
  const root = canonicalPath(repoRoot);
  if (!root) return null;
  const input = effectiveLeaseInput(event.toolName, event.input);
  const contextCwd = context.cwd || ".";
  if (event.toolName === "task") return null;
  if (event.toolName === "write" || event.toolName === "edit") {
    const declaredPaths = event.toolName === "edit" && input.paths ? input.paths : [input.path];
    if (input.cwd && isInternalUri(input.cwd)) return null;
    const declaredCwd = input.cwd ? absolutePathPreserving(contextCwd, input.cwd) : contextCwd;
    const targets: string[] = [];
    for (const declaredPath of declaredPaths) {
      if (
        !declaredPath ||
        isInternalUri(declaredPath) ||
        /^[A-Za-z]:[\\/]/.test(declaredPath) ||
        declaredPath.startsWith("\\\\")
      )
        continue;
      const target = canonicalPath(absolutePathPreserving(declaredCwd, declaredPath));
      if (target && isInside(root, target)) targets.push(target);
    }
    if (!targets.length) return null;
    return { cwd: root, target: targets.length === 1 ? relative(root, targets[0]) || "." : null };
  }
  if (event.toolName !== "bash") return null;
  const declaredCwd = input.cwd || contextCwd;
  if (isInternalUri(declaredCwd) || /^[A-Za-z]:[\\/]/.test(declaredCwd) || declaredCwd.startsWith("\\\\")) return null;
  const cwd = canonicalPath(absolutePathPreserving(contextCwd, declaredCwd));
  return cwd && isInside(root, cwd) ? { cwd, target: null } : null;
}
function operationAgentId(sessionFile: string | null | undefined, sessionId?: string | null): string | null {
  if (!sessionFile || !existsSync(sessionFile)) return null;
  const name = basename(sessionFile);
  const suffix = name.match(/\.(?:jsonl?|ndjson)$/i)?.[0] ?? "";
  const stem = suffix ? name.slice(0, -suffix.length) : name;
  if (!stem) return null;
  if (suffix && existsSync(`${dirname(sessionFile)}${suffix}`)) return stem;
  return stem === "main" || (sessionId && (stem === sessionId || stem.endsWith(`_${sessionId}`))) ? "main" : null;
}
function materializedSessionFile(value: string | null | undefined): string | null {
  if (!value?.trim() || !existsSync(value)) return null;
  try {
    const resolved = resolvePath(realpathSync(value));
    return statSync(resolved).isFile() ? resolved : null;
  } catch {
    return null;
  }
}
function materializedParentSessionFile(sessionFile: string): string | null {
  const suffix = basename(sessionFile).match(/\.(?:jsonl?|ndjson)$/i)?.[0];
  return suffix ? materializedSessionFile(`${dirname(sessionFile)}${suffix}`) : null;
}
function sessionDescendsFrom(child: string, ancestor: string): boolean {
  let parent = materializedParentSessionFile(child);
  while (parent) {
    if (parent === ancestor) return true;
    parent = materializedParentSessionFile(parent);
  }
  return false;
}
function resolveLeaseRelation(
  currentSessionFile: string | null | undefined,
  holderSessionFile: string | null | undefined,
): "same" | "parent" | "child" | "sibling" | "unknown" {
  const current = materializedSessionFile(currentSessionFile);
  const holder = materializedSessionFile(holderSessionFile);
  if (!current || !holder) return "unknown";
  if (current === holder) return "same";
  if (sessionDescendsFrom(current, holder)) return "parent";
  if (sessionDescendsFrom(holder, current)) return "child";
  const currentParent = materializedParentSessionFile(current);
  const holderParent = materializedParentSessionFile(holder);
  return currentParent && holderParent && currentParent === holderParent ? "sibling" : "unknown";
}
function asyncState(details?: ToolDetails): string | null {
  return details?.async?.state?.trim().toLowerCase() ?? null;
}
function asyncJobId(details?: ToolDetails): string | null {
  const id = details?.async?.jobId?.trim();
  return id || null;
}

export type MutationLease = {
  // returns the block reason when a lease conflict stops the call, or null when it may run.
  onToolCall(event: OperationCall, context: ExtensionContext): Promise<string | null>;
  onToolResult(event: ToolResultNotice, context: ExtensionContext): void;
  onExecutionUpdate(toolCallId: string, details: ToolDetails | undefined): void;
  releaseAll(reason: string): void;
  releaseOrphaned(reason: string): void;
  releaseStaleSession(repoRoot: string | null, sessionFile: string | null | undefined, reason: string): void;
};

// the gate supplies only whether it is enabled, the active request, and the bound repository.
export function createMutationLease(
  pi: ExtensionAPI,
  gate: { enabled(): boolean; requestId(): string | null; repoRoot(): string | null },
): MutationLease {
  const leaseOwnerId = randomUUID();
  let leaseEnabled = !["0", "false", "off"].includes(
    (process.env.OMP_GATE_MUTATION_LEASE ?? "")
      .trim()
      .toLowerCase(),
  );
  const activeOperations = new Map<string, ActiveOperation>();
  const releaseOperation = (toolCallId: string, reason: string): boolean => {
    const operation = activeOperations.get(toolCallId);
    if (!operation) return false;
    activeOperations.delete(toolCallId);
    clearInterval(operation.timer);
    if (operation.pollTimer) clearInterval(operation.pollTimer);
    if ([...activeOperations.values()].some((other) => other.lease === operation.lease)) return false;
    let released = false;
    try {
      released = releaselease(operation.lease);
    } catch {}
    ledger.append("lease_released", { ...leasefields(operation.lease), reason, released });
    return released;
  };
  const releaseAllOperations = (reason: string): void => {
    for (const id of activeOperations.keys()) releaseOperation(id, reason);
  };
  const releaseOrphanedOperations = (reason: string): void => {
    for (const [id, operation] of activeOperations) if (!operation.backgroundRunning) releaseOperation(id, reason);
  };
  const pollAsyncOperation = (toolCallId: string, operation: ActiveOperation, context: ExtensionContext): void => {
    if (operation.pollTimer || !operation.asyncJobId) return;
    const poll = (): void => {
      if (activeOperations.get(toolCallId) !== operation) return;
      let snapshot: ReturnType<ExtensionContext["getAsyncJobSnapshot"]> = null;
      try {
        snapshot = context.getAsyncJobSnapshot() ?? null;
      } catch {
        return;
      }
      if (!snapshot) return;
      const running = snapshot.running.find((job) => job.id === operation.asyncJobId);
      if (running?.status.trim().toLowerCase() === "running") return;
      const recent = snapshot.recent.find((job) => job.id === operation.asyncJobId);
      const status = recent?.status.trim().toLowerCase() ?? "";
      releaseOperation(toolCallId, status && status !== "running" ? `async_${status}` : "async_completed");
    };
    operation.pollTimer = setInterval(poll, 50);
    operation.pollTimer.unref();
    poll();
  };
  const releaseStaleSessionLease = (
    repoRoot: string | null,
    sessionFile: string | null | undefined,
    reason: string,
  ): void => {
    if (!repoRoot || !sessionFile) return;
    try {
      const status: LeaseStatus = inspectlease({ cwd: repoRoot });
      const record = status.record;
      if (status.status !== "held" || status.stale !== true || !record || record.session_file !== sessionFile) return;
      ledger.append("lease_heartbeat_stale", { ...leasefields(record), reason, ts: Date.now() });
      const released = releasestalelease(record, { cwd: repoRoot });
      ledger.append("lease_released", { ...leasefields(record), reason, released });
      if (released) ledger.append("lease_recovered", { ...leasefields(record), reason, ts: Date.now() });
    } catch {}
  };
  const acquireOperation = async (
    event: OperationCall,
    context: ExtensionContext,
    scope: LeaseScope,
  ): Promise<string | null> => {
    if (!leaseEnabled || !gate.enabled() || !event.toolCallId || activeOperations.has(event.toolCallId)) return null;
    const sessionId = event.sessionId ?? context.sessionManager.getSessionId();
    const sessionFile = context.sessionManager.getSessionFile() ?? null;
    if (!sessionId || !sessionFile) return "mutation lease requires the active session id and session file";
    const metadata = {
      cwd: scope.cwd,
      owner_id: leaseOwnerId,
      request_id: gate.requestId() ?? randomUUID(),
      session_id: sessionId,
      session_file: sessionFile,
      agent_id: operationAgentId(sessionFile, sessionId),
      tool_call_id: event.toolCallId,
      tool_name: event.toolName,
      target: scope.target,
    };
    const waitMs = Number(process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS);
    const acquisitionOptions = Number.isFinite(waitMs)
      ? { ...metadata, acquisition_wait_ms: Math.max(0, waitMs) }
      : metadata;
    // every call of one turn reaches tool_call before any of them runs, so a call that overlaps
    // a foreground operation of this turn shares its lease instead of waiting on itself. a running
    // background bash is not shared: later calls still wait for it, as they did before.
    const shared = [...activeOperations.values()].find((operation) => !operation.backgroundRunning)?.lease;
    let result: LeaseRecord;
    if (shared) result = shared;
    else {
      ledger.append("lease_wait_started", { ...metadata, ts: Date.now() });
      try {
        result = await acquirelease(acquisitionOptions);
      } catch (error) {
        return `mutation lease could not be acquired: ${error instanceof Error ? error.message : String(error)}`;
      }
      if (result.acquired !== true) {
        const holder = result.record?.session_file ?? null;
        let reason = "";
        try {
          reason = formatleasestatus(result, {
            waited_ms: result.waited_ms ?? 0,
            relation: resolveLeaseRelation(sessionFile, holder),
            cwd: scope.cwd,
          });
        } catch {}
        if (!reason) reason = result.error ?? "mutation lease is unavailable";
        if (result.timed_out === true) ledger.append("lease_wait_timed_out", { ...metadata, reason, ts: Date.now() });
        return reason;
      }
    }
    const timer = setInterval(() => {
      const operation = activeOperations.get(event.toolCallId);
      if (!operation || operation.lease !== result) return;
      try {
        if (heartbeatlease(result)) return;
        let stale = false;
        try {
          stale = inspectlease({ cwd: result.repo_root ?? scope.cwd }).stale;
        } catch {}
        if (stale) ledger.append("lease_heartbeat_stale", { ...leasefields(result), ts: Date.now() });
        releaseOperation(event.toolCallId, stale ? "heartbeat_stale" : "heartbeat_lost");
      } catch {}
    }, heartbeatintervalms);
    timer.unref();
    activeOperations.set(event.toolCallId, {
      lease: result,
      timer,
      asyncJobId: null,
      toolName: event.toolName,
      target: scope.target,
      backgroundRunning: false,
    });
    if (shared) return null;
    ledger.append("lease_acquired", { ...leasefields(result), recovered: result.recovered, ts: Date.now() });
    if (result.recovered === true) ledger.append("lease_recovered", { ...leasefields(result), ts: Date.now() });
    return null;
  };
  const leaseStatusReport = (context: ExtensionContext): string => {
    const cwd = gate.repoRoot() ?? context.cwd;
    const lines = [
      `mutation lease enabled: ${leaseEnabled ? "on" : "off"}`,
      `owned active operations: ${activeOperations.size}`,
    ];
    for (const [id, operation] of activeOperations)
      lines.push(`  tool call: ${id} · tool name: ${operation.toolName} · target: ${operation.target ?? "unknown"}`);
    let status: LeaseStatus | null = null;
    try {
      status = inspectlease({ cwd });
    } catch {}
    if (!status) return `${lines.join("\n")}\ncurrent holder: unknown`;
    const record = status.record;
    let formatted = "";
    try {
      formatted = formatleasestatus(status, {
        relation: resolveLeaseRelation(context.sessionManager.getSessionFile(), record?.session_file),
        cwd,
      });
    } catch {}
    lines.push(`current holder: ${formatted || "unknown"}`);
    return lines.join("\n");
  };
  pi.registerCommand("gates-lease", {
    description: "show or change the mutation lease for this session",
    getArgumentCompletions: (prefix: string) =>
      ["status", "on", "off"]
        .filter((value) => value.startsWith(prefix.trim().toLowerCase()))
        .map((value) => ({ value, label: value })),
    handler: async (args: string, context: ExtensionContext): Promise<void> => {
      const command = args.trim().toLowerCase() || "status";
      if (command === "status") {
        context.ui.notify(leaseStatusReport(context), "info");
        return;
      }
      if (command === "on") {
        leaseEnabled = true;
        context.ui.notify(leaseStatusReport(context), "info");
        return;
      }
      if (command !== "off") {
        context.ui.notify("usage: /gates-lease status|on|off", "error");
        return;
      }
      if (activeOperations.size) {
        context.ui.notify("cannot disable mutation lease while an operation is active", "error");
        return;
      }
      const cwd = gate.repoRoot() ?? context.cwd;
      try {
        const status: LeaseStatus = inspectlease({ cwd });
        const record = status.record;
        if (status.status === "held" && record?.owner_id === leaseOwnerId) {
          const released = releaselease(record, { cwd });
          if (!released) {
            context.ui.notify("cannot disable mutation lease: current lease could not be released", "error");
            return;
          }
          ledger.append("lease_manual_release", { ...leasefields(record), mode: "off", ts: Date.now() });
        }
        leaseEnabled = false;
        context.ui.notify(leaseStatusReport(context), "info");
      } catch (error) {
        context.ui.notify(
          `cannot disable mutation lease: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }
    },
  });

  return {
    async onToolCall(event, context) {
      const scope = leaseScope(event, context, gate.repoRoot());
      return scope ? acquireOperation(event, context, scope) : null;
    },
    onToolResult(event, context) {
      const operation = activeOperations.get(event.toolCallId);
      if (!operation) return;
      if (event.toolName === "bash" && asyncState(event.details) === "running") {
        operation.backgroundRunning = true;
        operation.asyncJobId = asyncJobId(event.details);
        pollAsyncOperation(event.toolCallId, operation, context);
      } else releaseOperation(event.toolCallId, event.isError ? "tool_error" : "tool_result");
    },
    onExecutionUpdate(toolCallId, details) {
      const state = asyncState(details);
      if (state === "completed" || state === "failed" || state === "cancelled")
        releaseOperation(toolCallId, `async_${state}`);
    },
    releaseAll: releaseAllOperations,
    releaseOrphaned: releaseOrphanedOperations,
    releaseStaleSession: releaseStaleSessionLease,
  };
}
