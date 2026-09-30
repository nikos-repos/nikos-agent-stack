/**
 * Readers can reject incompatible snapshot shapes before consuming their contents.
 * @cc [label:product] schema-v1-frozen
 * Frozen by Niko on 2026-09-30: this version, SCHEMA_HEADER, ROUTES, SNAPSHOT_MAX_BYTES, PAGE_MAX_BYTES and the
 * Snapshot, ChildRow, Known, Completeness, RunOutcome, RunMilestones, Lineage and ReadResult shapes. Any change
 * to them needs Niko and a new version; the in-process interfaces below stay editable.
 */
export const SNAPSHOT_SCHEMA_VERSION = 1;

/** Compatibility checks use this as the minimum supported omp version. */
export const OMP_FLOOR = "18.3.5";

/** The minimum Orca version `/observer open` accepts. */
export const ORCA_FLOOR = "1.4.205";

/** One page reads at most this many native transcript bytes, before any encoding or envelope. */
export const PAGE_MAX_BYTES = 262_144;

/** Snapshot responses must stay within this byte budget. */
export const SNAPSHOT_MAX_BYTES = 1_048_576;

/** The child id placeholder represents exactly one URL-encoded path segment. */
export const ROUTES = {
  viewer: "/",
  session: "/v1/session",
  snapshot: "/v1/snapshot",
  page: "/v1/children/:childId/page",
} as const;

/** Clients can identify the schema version using this response header. */
export const SCHEMA_HEADER = "x-observer-schema";

/** Unknown values carry a reason rather than a guessed value. */
export type Known<T> = { known: true; value: T } | { known: false; reason: string };

/** Incomplete observations explain why their inventory cannot be trusted as complete. */
export type Completeness =
  | { state: "complete" }
  | { state: "partial" | "unknown" | "unavailable"; reason: string };

/** Unavailable observation carries an explanation instead of silently degrading. */
export type ObserverState = { state: "ready" } | { state: "unavailable"; reason: string };

/** Registry status alone never proves a run outcome. */
export type RegistryStatus = "running" | "idle" | "parked" | "aborted";

/** This epoch's generation is the observer's started-fact count, not a native run id; missing, lost, or conflicting evidence is unknown, never success. */
export type RunOutcome =
  | { state: "unknown"; reason: string }
  | {
    state: "started" | "completed" | "failed" | "aborted";
    generation: number;
    spawnCallId: Known<string>;
    at: string;
  };

/** ISO timing comes from AgentRunLifecycle and never substitutes for an outcome. */
export type RunMilestones = {
  responseAt: Known<string>;
  acceptedAt: Known<string>;
  terminalAt: Known<string>;
};

/** Missing lineage evidence remains explicitly unknown to consumers. */
export type Lineage = {
  repoRoot: Known<string>;
  cwd: Known<string>;
  parentWorktree: Known<string>;
  childWorktree: Known<string>;
  isolation: Known<string>;
  branch: Known<string>;
};

/** Activity is sampled from the registry, never forwarded as an instance fact. */
export type ChildRow = {
  childId: string;
  parentId: string;
  rootSession: string;
  kind: "sub";
  agentName: string;
  modelRole: Known<string>;
  resolvedModel: Known<string>;
  registryStatus: RegistryStatus;
  tombstoned: boolean;
  outcome: RunOutcome;
  milestones: RunMilestones;
  activity: { sampled: true; lastActivityAt: Known<string> };
  lineage: Lineage;
  completeness: Completeness;
  observedAt: string;
  grantScope: "none" | "granted";
};

/** Consumers can use the epoch and generation to distinguish successive observations. */
export type Snapshot = {
  schema: typeof SNAPSHOT_SCHEMA_VERSION;
  epoch: string;
  generation: number;
  observedAt: string;
  rootSession: Known<string>;
  inventory: Completeness;
  children: ChildRow[];
};

/** Only primitive lifecycle evidence crosses instances; spawnCallId is parentToolCallId, reused by follow-up runs and never a run id. */
export type ChildFact = {
  kind: "lifecycle";
  childId: string;
  sessionFile: string | null;
  spawnCallId: string | null;
  status: "started" | "completed" | "failed" | "aborted";
  at: string;
};

/** Inventory completeness explains whether omitted child rows are authoritative. */
export type SourceResult = {
  rootSession: Known<string>;
  inventory: Completeness;
  rows: ChildRow[];
};

/** The admitted current native session file also identifies the child's current incarnation. */
export type SnapshotSource = {
  collect(limit: number): SourceResult;
  admittedSessionFile(childId: string): string | null;
  dispose(): void;
};

/** Losing evidence without a child id invalidates every child's outcome. */
export type OutcomeTracker = {
  record(fact: ChildFact): void;
  evidenceLost(reason: string, childId?: string): void;
  outcome(childId: string): RunOutcome;
  forget(childId: string): void;
  clear(): void;
};

/** Callers select their desired page representation before requesting data. */
export type PageMode = "entries" | "bytes";

/** The host's api.pi.parseSessionContent supplies the malformed-record count. */
export type ParseSessionContent = (content: string) => {
  entries: unknown[];
  malformedRecords: number;
};

/** A token issued for another child or epoch is a mismatch. */
export type ReadRequest = {
  childId: string;
  sessionFile: string;
  epoch: string;
  token: string | null;
  mode: PageMode;
  maxBytes: number;
  signal: AbortSignal;
};

/** `reset` means the continuation restarted from byte zero and earlier pages are void; a record end of null lies beyond the bounded scan, and its token continues that scan. */
export type ReadResult =
  | {
    kind: "page";
    mode: PageMode;
    entries: unknown[] | null;
    bytesBase64: string | null;
    malformed: number;
    reset: boolean;
    atEnd: boolean;
    token: string;
  }
  | {
    kind: "record_too_large";
    start: number;
    end: number | null;
    reset: boolean;
    scannedTo: number;
    token: string;
  }
  | { kind: "unavailable"; reason: "missing" | "stale" | "cancelled" | "unreadable" };

/** One grant store belongs to one epoch; its child signal aborts when that child leaves scope or the credential ends. */
export type Grants = {
  epoch: string;
  bootstrap(childIds: string[], ttlMs: number): { code: string; expiresAt: string };
  exchange(code: string): { credential: string; expiresAt: string } | null;
  allows(credential: string, childId: string | null): boolean;
  signal(credential: string, childId: string | null): AbortSignal | null;
  revoke(childIds: string[] | "all"): void;
  status(): { liveCredentials: number; grantedChildIds: string[]; pendingCodes: number };
  dispose(): void;
};

/** Grants may be null only until wave C2 migrates all callers; port zero requests an ephemeral port. */
export type ServeOptions = {
  epoch: string;
  snapshot(): Snapshot | null;
  state(): ObserverState;
  admittedSessionFile(childId: string): string | null;
  read(request: ReadRequest): Promise<ReadResult>;
  grants: Grants | null;
  port: number;
};

/** The URL is the resolved origin with the actual port, never a port-zero placeholder. */
export type Endpoint = { url: string; port: number; close(): Promise<void> };

/** Registry and bus callbacks may only call recordFact or markDirty, and both return immediately. */
export type Coordinator = {
  state(): ObserverState;
  recordFact(fact: ChildFact): void;
  markDirty(): void;
  snapshot(): Snapshot | null;
  epoch(): string;
  onInvalidate(listener: () => void): () => void;
  dispose(): void;
};

/** Publisher process handles can leave grants null only until the same wave-C2 migration. */
export type ObserverRuntime = {
  coordinator: Coordinator;
  source: SnapshotSource | null;
  outcomes: OutcomeTracker | null;
  grants: Grants | null;
  endpoint: Endpoint | null;
  serve(): Promise<Endpoint>;
};

/**
 * Module entry points implemented by other slices:
 *
 * | module | export |
 * |---|---|
 * | `compat.ts` | `checkCompat(pi: ExtensionAPI, agent: ExtensionAgentIdentity | undefined): ObserverState` |
 * | `coordinator.ts` | `processCoordinator(): Coordinator | null` and `startCoordinator(options: { source: SnapshotSource | null; outcomes: OutcomeTracker | null; limit: number }): Coordinator` |
 * | `reader.ts` | `readPage(request: ReadRequest, parse: ParseSessionContent): Promise<ReadResult>` |
 * | `transport.ts` | `serve(options: ServeOptions): Promise<Endpoint>` |
 * | `outcomes.ts` | `createOutcomeTracker(): OutcomeTracker` |
 * | `stock-source.ts` | `createStockSource(pi: ExtensionAPI, rootSessionFile: string | null, outcomes: OutcomeTracker): SnapshotSource` |
 * | `auth.ts` | `createGrants(now: () => number, epoch: string): Grants` |
 * | `commands.ts` | `registerCommands(pi: ExtensionAPI, runtime: () => ObserverRuntime | null): void` |
 * | `guidance.ts` | `registerGuidance(pi: ExtensionAPI, active: () => boolean): void` — injects nothing while `active()` is false (host hooks cannot be unregistered, so teardown flips `active`). |
 */
