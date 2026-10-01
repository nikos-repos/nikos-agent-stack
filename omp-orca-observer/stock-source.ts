import fs from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import type { AgentRef, ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { ChildRow, Completeness, Known, OutcomeTracker, SnapshotSource } from "./contract.ts";
import { processCoordinator } from "./coordinator.ts";

const WALK_ENTRY_LIMIT = 8192;

function recorded(value: string | undefined, reason: string): Known<string> {
  return value === undefined ? { known: false, reason } : { known: true, value };
}

function timestamp(value: number | undefined): Known<string> {
  return recorded(value === undefined ? undefined : new Date(value).toISOString(), "not recorded");
}

function transcriptInventory(artifactRoot: string, admittedFiles: Set<string>): Completeness {
  const directories = [artifactRoot];
  const missing: string[] = [];
  let visited = 0;
  let transcripts = 0;
  let restored = 0;
  while (directories.length > 0) {
    const directory = directories.pop()!;
    let handle;
    try {
      handle = fs.opendirSync(directory);
    } catch (error) {
      if (directory === artifactRoot && (error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    try {
      for (; ;) {
        let entry;
        try {
          entry = handle.readSync();
        } catch (error) {
          if (directory === artifactRoot && visited === 0 && (error as NodeJS.ErrnoException).code === "ENOENT") break;
          throw error;
        }
        if (!entry) break;
        if (++visited > WALK_ENTRY_LIMIT) {
          return { state: "partial", reason: `transcript walk cap ${WALK_ENTRY_LIMIT}` };
        }
        const file = join(directory, entry.name);
        if (entry.isDirectory()) {
          directories.push(file);
          continue;
        }
        // Native predicate: advisor/transcript-recorder.ts:30-34; it is not an SDK export.
        const advisor = entry.name.startsWith("__advisor.") && entry.name.endsWith(".jsonl");
        if (!entry.isFile() || !entry.name.endsWith(".jsonl") || entry.name.includes(".bak") || advisor) continue;
        transcripts++;
        if (admittedFiles.has(file)) restored++;
        else missing.push(relative(artifactRoot, file));
      }
    } finally {
      handle.closeSync();
    }
  }
  return missing.length === 0 ? { state: "complete" } : {
    state: "unknown",
    reason: `registry not fully restored: ${restored} of ${transcripts}; missing: ${missing.join(", ")}`,
  };
}

/**
 * @cc [label:security] stock-source-native-scope
 * Only native sub refs strictly inside this root's artifact tree, with an entirely admitted
 * ancestry to Main, are readable. Registry callbacks only dirty the process coordinator;
 * Inventory walking belongs to collect; it never triggers restoration or native mutation.
 * Transcript header reads happen only in resolveHeaders(), called by the publisher only while
 * handling an authorized snapshot request; definite results are cached once per incarnation.
 * @cc [label:ceiling] stock-source-copy-and-walk-floor
 * The row limit does not bound AgentRegistry.list(), which copies every ref. A bounded fake-ref
 * probe (10,000 calls per size) measured mean copy costs of 0.08 / 1.20 / 1.88 / 5.26 microseconds
 * for 0 / 33 / 135 / 1,000 refs, excluding row construction and disk I/O. Transcript discovery
 * stops after 8,192 entries and reports partial rather than assuming restoration is complete.
 * until: omp exposes bounded inventory enumeration and an authoritative restoration completion signal.
 */
export type StockSource = SnapshotSource & { resolveHeaders(): void };

export function createStockSource(
  pi: ExtensionAPI,
  rootSessionFile: string | null,
  outcomes: OutcomeTracker,
): StockSource {
  const registry = pi.pi.AgentRegistry.global();
  const mainId = pi.pi.MAIN_AGENT_ID;
  const rootPath = rootSessionFile === null ? null : resolve(rootSessionFile);
  const artifactRoot = rootPath === null ? null : rootPath.replace(/\.jsonl$/, "");
  const artifactPrefix = artifactRoot === null ? null : `${artifactRoot}${sep}`;
  const incarnations = new Map<string, { createdAt: number; sessionFile: string; cwd?: Known<string> }>();
  const pending = new Set<string>();
  function readHeaderCwd(sessionFile: string): Known<string> | undefined {
    let fd: number | undefined;
    try {
      fd = fs.openSync(sessionFile, "r");
      const buffer = Buffer.alloc(4096);
      const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
      const firstNewline = buffer.indexOf(10, 0);
      const firstEnd = firstNewline < 0 ? bytesRead : firstNewline;
      const first = JSON.parse(buffer.toString("utf8", 0, firstEnd));
      const headerStart = first?.type === "title" ? firstNewline + 1 : 0;
      const newline = buffer.indexOf(10, headerStart);
      if (newline < 0 && bytesRead === buffer.length) {
        return { known: false, reason: "session header too large" };
      }
      const header = JSON.parse(buffer.toString("utf8", headerStart, newline < 0 ? bytesRead : newline));
      return header?.type === "session" && typeof header.cwd === "string" && header.cwd.length > 0
        ? { known: true, value: header.cwd }
        : { known: false, reason: "cwd not recorded" };
    } catch {
      return undefined;
    } finally {
      if (fd !== undefined) {
        try {
          fs.closeSync(fd);
        } catch { }
      }
    }
  }
  const unsubscribe = registry.onChange(() => {
    processCoordinator()?.markDirty();
  });
  let disposed = false;

  /** Native scope is a lexical artifact-tree boundary, never a status or cwd guess. */
  function inTree(sessionFile: string): boolean {
    return artifactPrefix !== null && resolve(sessionFile).startsWith(artifactPrefix);
  }

  function admitted(ref: AgentRef, memo: Map<string, boolean>): boolean {
    const cachedRef = memo.get(ref.id);
    if (cachedRef !== undefined) return cachedRef;
    const chain: string[] = [];
    const seen = new Set<string>();
    let current: AgentRef | undefined = ref;
    let result = false;
    while (current) {
      const cached = memo.get(current.id);
      if (cached !== undefined) {
        result = cached;
        break;
      }
      if (current.kind !== "sub" || !current.sessionFile || !inTree(current.sessionFile) || seen.has(current.id)) break;
      seen.add(current.id);
      chain.push(current.id);
      if (current.parentId === mainId) {
        result = true;
        break;
      }
      current = current.parentId === undefined ? undefined : registry.get(current.parentId);
    }
    for (const id of chain) memo.set(id, result);
    return result;
  }

  return {
    resolveHeaders() {
      if (disposed) return;
      let changed = false;
      const memo = new Map<string, boolean>();
      for (const id of pending) {
        const incarnation = incarnations.get(id);
        if (!incarnation || incarnation.cwd !== undefined) continue;
        const ref = registry.get(id);
        if (
          !ref ||
          ref.kind !== "sub" ||
          !ref.sessionFile ||
          ref.createdAt !== incarnation.createdAt ||
          ref.sessionFile !== incarnation.sessionFile ||
          !inTree(ref.sessionFile) ||
          !admitted(ref, memo)
        ) continue;
        const cwd = readHeaderCwd(incarnation.sessionFile);
        if (cwd === undefined) continue;
        incarnation.cwd = cwd;
        changed = true;
      }
      pending.clear();
      if (changed) processCoordinator()?.markDirty();
    },
    collect(limit) {
      pending.clear();
      if (disposed || rootSessionFile === null || artifactRoot === null) {
        return {
          rootSession: recorded(rootSessionFile ?? undefined, "no root session file"),
          inventory: { state: "unavailable", reason: disposed ? "disposed" : "no root session file" },
          rows: [],
        };
      }
      const rows: ChildRow[] = [];
      const memo = new Map<string, boolean>();
      const admittedFiles = new Set<string>();
      const observedAt = new Date().toISOString();
      let inventory: Completeness = { state: "complete" };
      let count = 0;
      try {
        // Native list copies the full registry before this observer can apply its row cap.
        const refs = registry.list();
        for (const ref of refs) {
          if (ref.kind !== "sub") continue;
          if (!ref.sessionFile) {
            inventory = { state: "unavailable", reason: `no session file: ${ref.id}` };
            continue;
          }
          if (!inTree(ref.sessionFile)) continue;
          if (!admitted(ref, memo)) {
            inventory = { state: "unavailable", reason: `broken parent chain: ${ref.id}` };
            continue;
          }
          admittedFiles.add(resolve(ref.sessionFile));
          count++;
          const previous = incarnations.get(ref.id);
          if (!previous || previous.createdAt !== ref.createdAt || previous.sessionFile !== ref.sessionFile) {
            if (previous) outcomes.forget(ref.id);
            incarnations.set(ref.id, { createdAt: ref.createdAt, sessionFile: ref.sessionFile });
          }
          if (rows.length >= limit) continue;
          const incarnation = incarnations.get(ref.id)!;
          const liveCwd = ref.session?.sessionManager.getCwd();
          let cwd = recorded(liveCwd, "cwd not recorded");
          if (liveCwd === undefined) {
            if (incarnation.cwd !== undefined) {
              cwd = incarnation.cwd;
            } else {
              pending.add(ref.id);
              cwd = { known: false, reason: "cwd not recorded" };
            }
          }
          let tombstoned = false;
          try {
            fs.statSync(`${ref.sessionFile}.tombstone`);
            tombstoned = true;
          } catch (error) {
            const code = (error as NodeJS.ErrnoException).code;
            if (code !== "ENOENT" && code !== "ENOTDIR") throw error;
          }
          const outcome = outcomes.outcome(ref.id);
          const conflicting = outcome.state !== "unknown" &&
            ((outcome.state === "started") !== (ref.status === "running"));
          rows.push({
            childId: ref.id,
            parentId: ref.parentId!,
            rootSession: rootSessionFile,
            kind: "sub",
            agentName: ref.displayName,
            modelRole: recorded(ref.history?.modelRole, "model role not recorded"),
            resolvedModel: recorded(ref.history?.resolvedModel ?? ref.session?.servingModel?.selector, "resolved model not recorded"),
            registryStatus: ref.status,
            tombstoned,
            outcome: conflicting ? { state: "unknown", reason: "conflicting evidence" } : outcome,
            milestones: {
              responseAt: timestamp(ref.lifecycle?.responseAt),
              acceptedAt: timestamp(ref.lifecycle?.acceptedAt),
              terminalAt: timestamp(ref.lifecycle?.terminalAt),
            },
            activity: { sampled: true, lastActivityAt: timestamp(ref.lastActivity) },
            lineage: {
              repoRoot: { known: false, reason: "repository root not recorded" },
              cwd,
              parentWorktree: { known: false, reason: "parent worktree not recorded" },
              childWorktree: { known: false, reason: "child worktree not recorded" },
              isolation: { known: false, reason: "isolation not recorded" },
              branch: recorded(ref.history?.branchName, "branch not recorded"),
            },
            completeness: { state: "unknown", reason: "native registry does not record full lineage" },
            observedAt,
            grantScope: "none",
          });
        }
        const diskInventory = transcriptInventory(artifactRoot, admittedFiles);
        if (inventory.state !== "unavailable") {
          inventory = count > limit ? { state: "partial", reason: `cap ${limit} of ${count}` } : diskInventory;
        }
      } catch (error) {
        inventory = { state: "partial", reason: `collection interrupted: ${error instanceof Error ? error.message : String(error)}` };
      }
      return { rootSession: { known: true, value: rootSessionFile }, inventory, rows };
    },
    admittedSessionFile(childId) {
      if (disposed || artifactRoot === null) return null;
      const ref = registry.get(childId);
      return ref && admitted(ref, new Map()) ? ref.sessionFile : null;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      incarnations.clear();
      pending.clear();
    },
  };
}
