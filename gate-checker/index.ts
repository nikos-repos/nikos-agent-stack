// ============================================================================
// gate-checker — deterministic post-turn gate system for omp
// ============================================================================
// enforces the current rule families with machine-checkable post-conditions:
// citation grounding (modification/test claims must match the diff), completion
// (changed files must not contain stubs or placeholders), snapshot tags,
// subagent manifests and claims, verify, and commit. declared through
// package.json#omp.extensions; the session_stop hook is the enforcement point.
//
// on failure it returns { continue: true, additionalContext } which forces the
// agent to keep working (runtime caps at 8 continuations).
//
// git awareness:
//   - agent_start captures head baseline + dirty-file set (once per request)
//   - session_stop diffs baseline..now (covers committed and uncommitted changes)
//   - no git repo → low: no git: first-touch content hashing supplies the same
//     changed-file set and added-line set, so enforcement stays full
//
// sub-agent coverage:
//   - completion gate scans git diff (agent-agnostic, covers subagent edits)
//   - every subagent must return a <changed-files> manifest; a missing manifest
//     is itself a gate failure, so vagueness is not an escape hatch
//   - task-input injection prepends gate instructions to every spawned subagent
//
// commit routing:
//   - tool_call intercepts raw `git commit` and rewrites to smart_commit.sh
//   - enforces git-commit skill standards deterministically at initiation
//
// staged enforcement:
//   - tool_result flags a forbidden marker the moment write/edit introduces it,
//     while the agent still has context — cheap fix, no full-response retry
//   - session_stop is the backstop for anything not caught inline
//
// every fire is appended to ~/.omp/gate-checker/ledger.jsonl (see ledger.js);
// `bun run gate-cli.js stats` summarizes it.
// optional: <cwd>/.omp/gates-markers.txt — one forbidden marker per line, # for comments
// ============================================================================

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { existsSync, realpathSync, statSync } from "fs";
import { execSync } from "child_process";
import { basename, dirname, isAbsolute, join, relative, resolve as resolvePath, sep } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";
import {
  DEFAULT_FORBIDDEN_MARKERS,
  loadForbiddenMarkers,
  parseDiffAdditions,
  contentToAdded,
  diffByLineSet,
  checkAddedLines,
  normalizePath,
  makeClaimMatcher,
  extractManifest,
  hashContent,
  readSnapshot,
  COMMIT_CLEAN_CMD,
  MANIFEST_OPEN,
  MANIFEST_CLOSE,
  MANIFEST_JSON_KEYS,
  homePathConditions,
} from "./predicates.js";
import * as ledger from "./ledger.js";
import {
  LEVELS,
  policyFor,
  loadConfig,
  saveConfig,
  describeLevel,
  RULE_FAMILY,
  CONFIG_PATH,
} from "./config.js";
import { capturebaseline, resolvescope } from "./scope.js";
import {
  mergeprovenance,
  provenancefromdetails,
  provenancefromevent,
  provenancefromlifecycle,
} from "./provenance.js";
import { journal_type, journalfrombranch, journal_version } from "./journal.js";
import { auditscope } from "./risks.js";
import {
  acquireleaseasync,
  formatleasestatus,
  heartbeatintervalms,
  heartbeatlease,
  inspectlease,
  releaselease,
  releasestalelease,
} from "./lease.js";
import {
  validateRecord as validateFrustration,
  appendRecord as appendFrustration,
  readRecords as readFrustrations,
  missingIdentities,
  automaticGateRecord,
} from "./frustrations.js";
import { installadvisor } from "../advisor/install.js";
import { questionnaireStop } from "../ask-questionnaire/stop-decision.ts";
import { omnipotenceStop } from "../omnipotence/stop-decision.ts";

export type GateLevel = "off" | "low" | "medium" | "high";
type RuleMode = "off" | "warn" | "block" | "auto";
export interface GatePolicy {
  level: GateLevel;
  enabled: boolean;
  inline: boolean;
  completion: RuleMode;
  citation: RuleMode;
  snapshot: RuleMode;
  manifest: RuleMode;
  verify: RuleMode;
  complexity: RuleMode;
  commit: RuleMode;
  scratchpad: RuleMode;
  runtime: RuleMode;
}

type AddedLine = { line: number; text: string };
type InterrogationAnswers = {
  unnecessary: string;
  deleted: string;
  simplified: string;
};
type AddedMap = Map<string, AddedLine[]>;

// --- commit script path (resolved once at module load) ----------------------

const COMMIT_SCRIPT_PATH = resolvePath(
  process.env.PI_CODING_AGENT_DIR || join(homedir(), ".omp", "agent"),
  "skills/git-commit/scripts/smart_commit.sh",
);

// --- event shapes -----------------------------------------------------------

interface LeaseEventInput {
  toolName: string;
  toolCallId: string;
  input?: Record<string, unknown>;
  sessionId?: string;
}

interface ToolCallEvent extends LeaseEventInput {
  input: Record<string, unknown>;
}

interface AsyncJobSnapshotItem {
  id: string;
  status?: string;
}

interface AsyncJobSnapshot {
  running?: AsyncJobSnapshotItem[];
  recent?: AsyncJobSnapshotItem[];
}

interface LeaseScope {
  cwd: string;
  target: string | null;
}

interface HeartbeatTimer {
  unref?: () => void;
}

interface ActiveOperation {
  lease: Record<string, unknown>;
  timer: HeartbeatTimer;
  pollTimer?: HeartbeatTimer;
  asyncJobId: string | null;
  toolName: string;
  target: string | null;
  backgroundRunning: boolean;
}

interface ToolResultEvent {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
  content: unknown;
  details: unknown;
  isError: boolean;
}

interface ExtensionCommandContext extends ExtensionContext {}

interface ExtensionContext {
  cwd: string;
  hasUI: boolean;
  sessionManager?: {
    getBranch?(): unknown[];
    getSessionFile?(): string | undefined;
    getSessionId?(): string;
  };
  getAsyncJobSnapshot?(): AsyncJobSnapshot | null;
  invokeTool?(
    params: Record<string, unknown>,
    options?: { signal?: AbortSignal; onUpdate?: unknown },
  ): Promise<unknown>;
  ui?: {
    notify?(message: string, type?: string): void;
    setStatus?(key: string, text: string): void;
  };
}

interface SessionStopResult {
  continue?: boolean;
  additionalContext?: string;
  decision?: "block";
  reason?: string;
}

interface ToolCallResult {
  block?: boolean;
  reason?: string;
  input?: Record<string, unknown>;
}

interface ToolResultEventResult {
  content?: Array<{ type: "text"; text: string }>;
  details?: unknown;
  isError?: boolean;
}

export interface GateFailure {
  gate: "citation" | "completion" | "verify" | "commit" | "journal" | "risk";
  rule: string;
  detail: string;
  // "block" forces a continuation. "warn" is surfaced and recorded but never
  // stops the agent — for rules about how work was reported, when the diff
  // already corroborates the work itself. a reporting-format rule must not
  // block delivery of tested, committed code.
  //
  // ponytail: optional, absent means "block". every rule that can stop an agent
  // stays blocking unless it opts out, so a new rule cannot become advisory by
  // omission.
  severity?: "block" | "warn";
}

interface SubagentEvidence {
  task_call_id: string | null;
  id: string;
  agent: string | null;
  status: string;
  exit_code: number | null;
  error: string | null;
  duration_ms: number | null;
  model: string | null;
  session_file: string | null;
  output_path: string | null;
  patch_path: string | null;
  branch_name: string | null;
  branch_base_sha: string | null;
  report: string;
  manifest: string[] | null;
  manifest_source: string | null;
}

export interface TurnEvidence {
  hadToolCalls: boolean;
  askedUser: boolean;
  filesTouched: Set<string>;
  snapshotTags: Set<string>;
  bashCommands: Array<{ cmd: string; isError: boolean }>;
  subagents: SubagentEvidence[];
  baselineSha: string | null;
  baselineDirty: Set<string>;
  baselineSnapshots: Record<string, unknown>;
  // git reports paths relative to the repo root, which is not always ctx.cwd.
  repoRoot: string | null;
  // content at first touch, keyed by the path as the agent wrote it. null means
  // the file did not exist yet. only populated during no-git operation.
  preTouch: Map<string, string | null>;
  warnedRepoRoots: Set<string>;
  // content hashes of subagent reports already adjudicated in this request, so
  // a forced continuation cannot re-report the same subagent.
  judgedSubagents: Set<string>;
  // the delivery verify gate ran the configured command and it passed. that is
  // evidence a test claim is true, and it is what `ranTestRunner` cannot see:
  // the gate runs the command itself, not through the bash tool.
  verifyPassed: boolean;
  // TTSR rules that interrupted generation during this request.
  ttsrHits: Set<string>;
  // markers already reported inline at tool_result, so session_stop does not
  // bill the agent twice for the same line.
  flaggedInline: Set<string>;
  // any tool result errored during this request, bash or otherwise. a clean
  // "none" claim against an errored request is a stats signal, not a failure.
  hadtoolerror: boolean;
  // answers recorded against the content hash of each interrogated generation.
  interrogations: Map<string, InterrogationAnswers>;
  // a continuation was forced by a blocking failure other than the
  // missing-record rule itself, so the gate's own coverage loop cannot
  // masquerade as agent friction.
  hadblockingfailure: boolean;
}

export function freshEvidence(): TurnEvidence {
  return {
    hadToolCalls: false,
    askedUser: false,
    filesTouched: new Set(),
    snapshotTags: new Set(),
    bashCommands: [],
    subagents: [],
    baselineSha: null,
    baselineDirty: new Set(),
    baselineSnapshots: {},
    repoRoot: null,
    preTouch: new Map(),
    warnedRepoRoots: new Set(),
    judgedSubagents: new Set(),
    ttsrHits: new Set(),
    verifyPassed: false,
    flaggedInline: new Set(),
    interrogations: new Map(),
    hadtoolerror: false,
    hadblockingfailure: false,
  };
}

// --- text extraction --------------------------------------------------------

function extractText(content: unknown): string {
  if (!Array.isArray(content)) return String(content ?? "");
  return content
    .filter((c): c is Record<string, unknown> => c?.type === "text")
    .map((c) => String(c.text ?? ""))
    .join("\n");
}

// --- reference extraction (pure, testable) ----------------------------------

const SNAPSHOT_TAG_RE = /\[([^\]]+?)#([0-9A-Fa-f]{4})\]/g;

const TEST_PASS_RE =
  /\b(?:tests?|specs?|suite)\s+(?:pass(?:ed|es)?|succeed(?:ed|s)?|are\s+(?:green|passing))\b/i;
const ALL_PASS_RE = /\b(?:all|every)\s+(?:tests?|specs?)\s+pass\b/i;

const TEST_RUNNER_RE =
  /(?:npm\s+(?:test|run\s+test)|npx\s+(?:jest|vitest|mocha|playwright)|yarn\s+test|pnpm\s+(?:test|run\s+test)|pytest|python\s+-m\s+(?:pytest|unittest)|cargo\s+test|go\s+test|bun\s+(?:test|run\s+test)|bunx\s+(?:playwright|vitest)|node\s+--test|tsx\s+--test|jest|vitest|mocha|rspec|bundle\s+exec\s+(?:rspec|minitest)|deno\s+test|gradle\s+test|mvn\s+test)/i;

// requires the backtick token to contain a slash or a dot+extension to qualify
// as a file path. prevents false positives like "replaced `var` with `let`".
const MOD_CLAIM_RE =
  /(?:modif(?:ied|y)|updated?|changed?|edited?|added?\s+to|fixed?\s+in|refactored?|rewrote?|replaced?|removed?\s+(?:from|in)|deleted?\s+(?:from|in))\s+`([a-zA-Z0-9_./~-]+[/][a-zA-Z0-9_./~-]+\.[a-zA-Z]{1,8})`/gi;

export function extractSnapshotRefs(
  text: string,
): Array<{ path: string; tag: string }> {
  const refs: Array<{ path: string; tag: string }> = [];
  let m: RegExpExecArray | null;
  SNAPSHOT_TAG_RE.lastIndex = 0;
  while ((m = SNAPSHOT_TAG_RE.exec(text)) !== null) {
    refs.push({ path: m[1], tag: m[2].toUpperCase() });
  }
  return refs;
}

export function extractModClaims(text: string): string[] {
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  MOD_CLAIM_RE.lastIndex = 0;
  while ((m = MOD_CLAIM_RE.exec(text)) !== null) {
    paths.push(m[1]);
  }
  return [...new Set(paths)];
}

export function claimsTestSuccess(text: string): boolean {
  return TEST_PASS_RE.test(text) || ALL_PASS_RE.test(text);
}

export function ranTestRunner(ev: TurnEvidence): boolean {
  if (ev.verifyPassed) return true;
  return ev.bashCommands.some(
    (c) => TEST_RUNNER_RE.test(c.cmd) && !c.isError,
  );
}


// --- citation gate ----------------------------------------------------------

// only when the parent leans on a subagent's report do the subagent rules apply;
// its own claims stay covered by `fabricated_modification`,
// `fabricated_test_result`, and the completion gate, none of which care who
// made the edit.
const SUBAGENT_REFERENCE_RE =
  /\b(sub-?agents?|reviewers?|review(?:ed|s)?\s+(?:by|agent)|delegat(?:e|ed|ion)|spawned\s+agents?|per\s+the\s+review|according\s+to\s+the\s+(?:review|agent)|the\s+agent\s+(?:reported|found|said|confirmed)|its?\s+report)\b/i;

export function reliesOnSubagents(assistantText: string): boolean {
  return SUBAGENT_REFERENCE_RE.test(assistantText);
}

export function checkCitations(
  assistantText: string,
  subagents: Array<SubagentEvidence | string>,
  changedFiles: Set<string>,
  ev: TurnEvidence,
  hasGit: boolean,
  cwd = ".",
  // paths this run can actually adjudicate. null = authoritative for every path
  // (git diff sees all changes, however they were made). a set = no-git mode,
  // where only files snapshotted at first touch are provable — a file edited
  // via `sed -i` was never watched, so silence is the only honest verdict.
  watched: Set<string> | null = null,
): GateFailure[] {
  const failures: GateFailure[] = [];
  const isChanged = makeClaimMatcher(changedFiles, ev.repoRoot, cwd);
  const canJudge = (claim: string): boolean =>
    watched === null || watched.has(normalizePath(claim));

  // 1. parent text mod claims vs the diff
  if (hasGit || watched !== null) {
    for (const claimed of extractModClaims(assistantText)) {
      if (canJudge(claimed) && !isChanged(claimed)) {
        failures.push({
          gate: "citation",
          rule: "fabricated_modification",
          detail: `assistant text claims modification of \`${claimed}\` but git diff does not include this file. either make the change or remove the claim.`,
        });
      }
    }
  }

  // 2. parent text test claims vs bash ledger
  if (claimsTestSuccess(assistantText) && !ranTestRunner(ev)) {
    failures.push({
      gate: "citation",
      rule: "fabricated_test_result",
      detail:
        'assistant text claims tests passed but no test-runner command was executed this turn. run the tests or remove the claim.',
    });
  }

  // 3. subagent manifest + claims vs the diff. each subagent is judged once per
  // request: evidence survives a forced continuation, so the dedupe stops the
  // same report being re-billed on every retry.
  const relies = reliesOnSubagents(assistantText);
  for (let i = 0; i < subagents.length; i++) {
    const raw = subagents[i];
    const subagent = typeof raw === "string"
      ? { id: `legacy:${i}`, report: raw, manifest: extractManifest(raw) }
      : raw;
    const text = subagent.report;
    if (!relies || !text) continue;
    const seen = hashContent(`${subagent.id}\n${text}`);
    if (ev.judgedSubagents.has(seen)) continue;
    ev.judgedSubagents.add(seen);

    // native structured output is authoritative when present. the literal or
    // json report parser remains as a compatibility fallback.
    const manifest = subagent.manifest ?? extractManifest(text);
    if (manifest === null) {
      // severity follows the diff: a read-only reviewer that changed nothing is
      // a reporting-format issue (warn), while a claim the diff denies is a
      // defect (block).
      const contradicts =
        (hasGit || watched !== null) &&
        extractModClaims(text).some((c) => canJudge(c) && !isChanged(c));
      failures.push({
        gate: "citation",
        rule: "subagent_missing_manifest",
        severity: contradicts ? "block" : "warn",
        detail: `subagent #${i + 1} returned no manifest. it must report the files it changed — either the ${MANIFEST_OPEN}…${MANIFEST_CLOSE} block, or a JSON \`${MANIFEST_JSON_KEYS.join("\`/\`")}\` field (empty if it changed none). verify its work yourself before repeating its claims.`,
      });
    } else if (hasGit || watched !== null) {
      for (const claimed of manifest) {
        if (canJudge(claimed) && !isChanged(claimed)) {
          failures.push({
            gate: "citation",
            rule: "subagent_manifest_mismatch",
            detail: `subagent #${i + 1} listed \`${claimed}\` in its manifest but the diff does not include that file.`,
          });
        }
      }
    }

    if (hasGit || watched !== null) {
      for (const claimed of extractModClaims(text)) {
        if (canJudge(claimed) && !isChanged(claimed)) {
          failures.push({
            gate: "citation",
            rule: "subagent_fabricated_modification",
            detail: `subagent #${i + 1} claimed modification of \`${claimed}\` but the diff does not include this file.`,
          });
        }
      }
    }

    if (claimsTestSuccess(text) && !ranTestRunner(ev)) {
      failures.push({
        gate: "citation",
        rule: "subagent_unverified_test",
        detail: `subagent #${i + 1} claimed tests passed but no test-runner command was verified in the parent session. run the tests independently before accepting this claim.`,
      });
    }
  }

  // 4. snapshot tag references
  const tagRefs = extractSnapshotRefs(assistantText);
  for (const ref of tagRefs) {
    if (!ev.snapshotTags.has(ref.tag)) {
      failures.push({
        gate: "citation",
        rule: "ungrounded_snapshot_tag",
        detail: `assistant text references snapshot tag [${ref.path}#${ref.tag}] but this tag was not returned by any read/edit tool call this turn.`,
      });
    }
  }

  return failures;
}

// --- completion gate (agent-agnostic) ---------------------------------------
//
// the predicate itself is checkAddedLines() in predicates.js — shared verbatim
// with the inline tool_result gate and the gate-cli cutover command. only the
// way the added-line set is derived differs: git diff when a repo exists,
// first-touch content snapshots when it does not.

// no-git path. snapshots taken at first touch give a real before/after, so this
// is no longer a whole-file scan: a pre-existing marker in an untouched line
// cannot block the agent here either.
function no_git_diff(
  snapshots: Map<string, string | null>,
  cwd: string,
): { changed: Set<string>; added: AddedMap } {
  const changed = new Set<string>();
  const added: AddedMap = new Map();

  for (const [relPath, before] of snapshots) {
    const abs = isAbsolute(relPath) ? relPath : resolvePath(cwd, relPath);
    const after = readSnapshot(abs);
    if (after === null) continue; // deleted, unreadable, or too large

    if (before === null) {
      // file did not exist at first touch — every line is new
      changed.add(relPath);
      for (const [k, v] of contentToAdded(relPath, after)) added.set(k, v);
      continue;
    }

    if (hashContent(before) === hashContent(after)) continue;
    changed.add(relPath);
    for (const [k, v] of diffByLineSet(relPath, before, after)) added.set(k, v);
  }

  return { changed, added };
}

function existingDirectory(path: string): string | null {
  let candidate = path;
  while (!existsSync(candidate)) {
    const parent = dirname(candidate);
    if (parent === candidate) return null;
    candidate = parent;
  }
  try {
    return statSync(candidate).isDirectory() ? candidate : dirname(candidate);
  } catch {
    return null;
  }
}

function repositoryCandidates(
  input: Record<string, unknown>,
  cwd: string,
): string[] {
  const declaredCwd = typeof input.cwd === "string"
    ? existingDirectory(resolvePath(cwd, input.cwd))
    : null;
  const inputPath = typeof input.path === "string"
    ? existingDirectory(
      isAbsolute(input.path)
        ? input.path
        : resolvePath(declaredCwd ?? cwd, input.path),
    )
    : null;
  const inputPaths = Array.isArray(input.paths)
    ? input.paths
      .filter((path): path is string => typeof path === "string")
      .map((path) => existingDirectory(
        isAbsolute(path)
          ? path
          : resolvePath(declaredCwd ?? cwd, path),
      ))
    : [];
  return [...new Set([declaredCwd, inputPath, ...inputPaths, existingDirectory(cwd)].filter(
    (candidate): candidate is string => candidate !== null,
  ))];
}

function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

// derives the added-line set for a single write/edit call, so the inline gate
// judges exactly what this call introduced — never the rest of the file.
//
//  - edit  → `details.diff` is a unified diff (hunk headers, no `+++` line),
//            so real line numbers survive.
//  - write → replaces the file wholesale, so every line is authored now.
export function inlineAdditions(
  toolName: string,
  relPath: string,
  input: Record<string, unknown> | undefined,
  details: unknown,
): AddedMap | null {
  if (!relPath) return null;

  if (toolName === "edit") {
    const diff = (details as Record<string, unknown> | undefined)?.diff;
    if (typeof diff === "string" && diff.length > 0) {
      const added: AddedMap = new Map();
      parseDiffAdditions(diff, added, relPath);
      return added;
    }
    // no diff in details — fall back to the replacement text if present
    const newText = input?.newText;
    if (typeof newText === "string") return contentToAdded(relPath, newText);
    return null;
  }

  const content = input?.content;
  return typeof content === "string" ? contentToAdded(relPath, content) : null;
}

// --- commit routing (deterministic enforcement of git-commit standards) ----

// matches `git commit` as a real command, not inside quotes, echo, sed, or grep.
// requires `git commit` at start of command or after && / ; / | (command boundary).
const COMMIT_BOUNDARY_RE =
  /(?:^|[;&|]\s*|\&\&\s*)git\s+commit\b(?![-_])/;

function extractCommitMessage(command: string): string | null {
  const doubleQ = command.match(/(?:-\w*m|--message)[=\s]*"([^"]*)"/);
  if (doubleQ) return doubleQ[1];
  const singleQ = command.match(/(?:-\w*m|--message)[=\s]*'([^']*)'/);
  if (singleQ) return singleQ[1];
  return null;
}

// --- direct smart_commit.sh invocation -------------------------------------
//
// any invocation naming smart_commit.sh gets the absolute path and --no-push.
// the optional quote group prevents an already-quoted path being re-quoted, and
// the leading boundary prevents a prefixed name like `my_smart_commit.sh`
// matching.
const SMART_COMMIT_RE = /(['"]?)(?<![\w.-])((?:[^\s'"]*\/)?smart_commit\.sh)\1/;

export function rewriteSmartCommit(command: string, scriptPath: string): string | null {
  const m = SMART_COMMIT_RE.exec(command);
  if (!m) return null;
  const safe = scriptPath.replace(/'/g, "'\\''");
  let out = m[2] === scriptPath ? command : command.replace(m[0], `'${safe}'`);
  if (!/--no-push\b/.test(out)) out += " --no-push";
  return out !== command ? out : null;
}

// extracts the full `git commit ...` segment from a command, handling
// quoted messages that may contain semicolons. returns the segment and
// what comes before/after it.
function splitCommitSegment(
  command: string,
): { before: string; commitPart: string; after: string } | null {
  // find "git commit" at a command boundary
  const idx = command.search(/(?:^|[;&|]\s*|\&\&\s*)git\s+commit\b(?![-_])/);
  if (idx === -1) return null;

  const startMatch = command[idx]?.match(/[;&|&]/);
  const segStart = startMatch ? idx + 1 : idx;
  const before = command.slice(0, segStart).replace(/[;&|&\s]+$/, "");

  // scan forward from "git commit" respecting quotes to find the real end
  const commitStart = command.indexOf("git", segStart);
  let i = commitStart + 4; // skip "git "
  let inQuote: string | null = null;
  while (i < command.length) {
    const ch = command[i];
    if (inQuote) {
      if (ch === inQuote) inQuote = null;
    } else if (ch === '"' || ch === "'") {
      inQuote = ch;
    } else if (ch === ";" || ch === "&" || ch === "|") {
      break;
    }
    i++;
  }

  const commitPart = command.slice(commitStart, i).trim();
  const after = command.slice(i).replace(/^[;&|&\s]+/, "").trim();
  return { before, commitPart, after };
}

export function rewriteGitCommit(command: string, scriptPath: string): string | null {
  // skip if no real commit command at a boundary, or if --amend
  if (!COMMIT_BOUNDARY_RE.test(command) || /--amend/.test(command)) return null;

  const split = splitCommitSegment(command);
  if (!split) return null;

  const msg = extractCommitMessage(split.commitPart);
  const safe = (s: string): string => s.replace(/'/g, "'\\''");
  const scriptCall =
    msg !== null
      ? `bash '${safe(scriptPath)}' '${safe(msg)}' --no-push`
      : `bash '${safe(scriptPath)}' --no-push`;

  const parts: string[] = [];
  // smart_commit.sh stages all changes itself (git add .), so drop a
  // bare "git add" from before to avoid redundant staging.
  if (split.before && !/^\s*git\s+add\b/.test(split.before)) {
    parts.push(split.before);
  }
  parts.push(scriptCall);
  if (split.after) parts.push(split.after);
  const result = parts.join(" && ");
  return result !== command ? result : null;
}

// --- session helpers --------------------------------------------------------

function getLastAssistantText(ctx: ExtensionContext): string | null {
  try {
    const branch = (ctx?.sessionManager?.getBranch?.() ?? []) as unknown[];
    for (let i = branch.length - 1; i >= 0; i--) {
      const entry = branch[i] as Record<string, unknown>;
      if (entry?.type === "message" && entry?.message !== undefined) {
        const msg = entry.message as Record<string, unknown>;
        if (msg?.role === "assistant") {
          return extractText(msg.content);
        }
      }
    }
  } catch {
    // session manager unavailable
  }
  return null;
}

export function shouldskipnotools(
  hadtoolcalls: boolean,
  assistanttext: string,
  journalrecovery: string | null,
): boolean {
  return !hadtoolcalls && !assistanttext && !journalrecovery;
}

export function canskipuserquestion(
  askeduser: boolean,
  changedcount: number,
  journalrecovery: string | null,
  missingfrustration: boolean,
): boolean {
  return askeduser && changedcount === 0 && !journalrecovery && !missingfrustration;
}

function absolutePathPreserving(base: string, child: string): string {
  if (isAbsolute(child)) return child;
  const parent = isAbsolute(base) ? base : resolvePath(base);
  return `${parent.replace(/[\/]+$/, "")}/${child}`;
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
  return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed) &&
    !/^[A-Za-z]:[\\/]/.test(trimmed);
}
function effectiveLeaseInput(
  toolName: string,
  input: Record<string, unknown>,
): Record<string, unknown> {
  if (
    toolName !== "edit" ||
    typeof input.path === "string" ||
    Array.isArray(input.paths)
  ) return input;
  const patch = typeof input.input === "string"
    ? input.input
    : typeof input._input === "string"
    ? input._input
    : "";
  if (!patch) return input;
  const paths: string[] = [];
  for (const line of patch.split(/\r?\n/)) {
    const match = /^\s*\[([^#\r\n]+)#[0-9a-f]{4}\]\s*$/i.exec(line);
    if (!match) continue;
    let path = match[1]!.trim();
    if (
      path.length >= 2 &&
      (path[0] === "'" || path[0] === '"') &&
      path.at(-1) === path[0]
    ) path = path.slice(1, -1);
    if (path) paths.push(path);
  }
  if (paths.length === 0) return input;
  return paths.length === 1
    ? { ...input, path: paths[0], paths }
    : { ...input, paths };
}


export function leasescope(
  event: LeaseEventInput,
  context: ExtensionContext,
  repoRoot: string | null,
): LeaseScope | null {
  if (!repoRoot) return null;
  const root = canonicalPath(repoRoot);
  if (!root) return null;
  const toolName = String(event.toolName ?? "");
  const input = effectiveLeaseInput(toolName, event.input ?? {});
  const contextCwd = String(context?.cwd ?? ".");

  if (toolName === "task") return null;
  if (toolName === "write" || toolName === "edit") {
    const declaredPaths: unknown[] = toolName === "edit" && Array.isArray(input.paths)
      ? input.paths
      : [input.path];
    if (typeof input.cwd === "string" && isInternalUri(input.cwd)) return null;
    const declaredCwd = typeof input.cwd === "string"
      ? absolutePathPreserving(contextCwd, input.cwd)
      : contextCwd;
    const insideTargets: string[] = [];
    for (const declaredPath of declaredPaths) {
      if (
        typeof declaredPath !== "string" ||
        !declaredPath ||
        isInternalUri(declaredPath) ||
        /^[A-Za-z]:[\\/]/.test(declaredPath) ||
        /^\\\\/.test(declaredPath)
      ) continue;
      const target = canonicalPath(
        absolutePathPreserving(declaredCwd, declaredPath),
      );
      if (target && isInside(root, target)) insideTargets.push(target);
    }
    if (insideTargets.length === 0) return null;
    return {
      cwd: root,
      target: insideTargets.length === 1
        ? relative(root, insideTargets[0]!) || "."
        : null,
    };
  }
  if (toolName !== "bash") return null;
  const declaredCwd = typeof input.cwd === "string" ? input.cwd : contextCwd;
  if (
    isInternalUri(declaredCwd) ||
    /^[A-Za-z]:[\\/]/.test(declaredCwd) ||
    /^\\\\/.test(declaredCwd)
  ) return null;
  const cwd = canonicalPath(absolutePathPreserving(contextCwd, declaredCwd));
  return cwd && isInside(root, cwd) ? { cwd, target: null } : null;
}
export function operationAgentId(
  sessionFile: string | null | undefined,
  sessionId?: string | null,
): string | null {
  if (!sessionFile || !existsSync(sessionFile)) return null;
  const name = basename(sessionFile);
  const suffix = name.match(/\.(?:jsonl?|ndjson)$/i)?.[0] ?? "";
  const stem = suffix ? name.slice(0, -suffix.length) : name;
  if (!stem) return null;
  if (suffix && existsSync(`${dirname(sessionFile)}${suffix}`)) return stem;
  if (
    stem === "main" ||
    (sessionId && (stem === sessionId || stem.endsWith(`_${sessionId}`)))
  ) return "main";
  return null;
}

type LeaseRelation = "same" | "parent" | "child" | "sibling" | "unknown";

function materializedSessionFile(value: string | null | undefined): string | null {
  if (typeof value !== "string" || !value.trim() || !existsSync(value)) return null;
  try {
    const resolved = resolvePath(realpathSync(value));
    return statSync(resolved).isFile() ? resolved : null;
  } catch {
    return null;
  }
}

function materializedParentSessionFile(sessionFile: string): string | null {
  const suffix = basename(sessionFile).match(/\.(?:jsonl?|ndjson)$/i)?.[0];
  if (!suffix) return null;
  return materializedSessionFile(`${dirname(sessionFile)}${suffix}`);
}

function sessionDescendsFrom(child: string, ancestor: string): boolean {
  let parent = materializedParentSessionFile(child);
  while (parent) {
    if (parent === ancestor) return true;
    parent = materializedParentSessionFile(parent);
  }
  return false;
}

export function resolveLeaseRelation(
  currentSessionFile: string | null | undefined,
  holderSessionFile: string | null | undefined,
): LeaseRelation {
  const current = materializedSessionFile(currentSessionFile);
  const holder = materializedSessionFile(holderSessionFile);
  if (!current || !holder) return "unknown";
  if (current === holder) return "same";
  if (sessionDescendsFrom(current, holder)) return "parent";
  if (sessionDescendsFrom(holder, current)) return "child";

  const currentParent = materializedParentSessionFile(current);
  const holderParent = materializedParentSessionFile(holder);
  return currentParent && holderParent && currentParent === holderParent
    ? "sibling"
    : "unknown";
}

function asyncExecutionState(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const asyncDetails = (details as Record<string, unknown>).async;
  if (!asyncDetails || typeof asyncDetails !== "object") return null;
  const state = (asyncDetails as Record<string, unknown>).state;
  return typeof state === "string" ? state.trim().toLowerCase() : null;
}
function asyncExecutionJobId(details: unknown): string | null {
  if (!details || typeof details !== "object") return null;
  const asyncDetails = (details as Record<string, unknown>).async;
  if (!asyncDetails || typeof asyncDetails !== "object") return null;
  const jobId = (asyncDetails as Record<string, unknown>).jobId;
  return typeof jobId === "string" && jobId.trim() ? jobId.trim() : null;
}


// --- delivery gates (verify + commit), armed by env var ---------------------
//
// the citation and completion gates answer "did the work happen and is it
// finished?". the two questions they cannot answer are `verify` (do the tests
// pass?) and `commit` (is the work checkpointed?). this runs those two inline,
// so one always-on layer covers the whole delivery contract.
//
// armed by env var, not by config file, so the trigger is the act of launching
// the omp-dev session — no heuristic decides whether the regime applies.
//
//   OMP_DELIVERY_GATES=1        arm both gates
//   OMP_VERIFY_CMD               test command; unset = enforced levels require a passing runner
//
// deliberately not defaulted to "npm test": guessing a test command in a repo
// that has none turns every session into a retry loop on a command that was
// never going to pass. an absent command leaves enforced levels to observed
// passing test-runner evidence.

// re-grades every failure through the engagement level, and drops the ones the
// level switches off. applying the dial here, on the finished failure list,
// keeps predicates.js free of levels — gate-cli.js imports the same predicates
// and has no dial of its own.
export function applyPolicy(failures: GateFailure[], policy: GatePolicy): GateFailure[] {
  const out: GateFailure[] = [];
  for (const f of failures) {
    const family = RULE_FAMILY[f.rule] as keyof GatePolicy | undefined;
    // an unmapped rule is a rule added without a policy entry. it stays at its
    // own severity rather than silently disappearing — a new rule must never
    // become invisible by omission.
    const mode = family ? (policy[family] as RuleMode) : "auto";
    if (mode === "off") continue;
    if (mode === "auto") out.push(f);
    else out.push({ ...f, severity: mode });
  }
  return out;
}

// pass results only, keyed on the tree state. a forced continuation caused by
// some other gate then does not re-run a suite that already went green.
//
// a failure is never cached, and that asymmetry is the whole point. any cache
// key is narrower than what a test command can actually read — an untracked
// fixture, a generated artifact, a gitignored `.env`. reusing a stale failure
// therefore risks a gate the agent cannot clear by any edit, which is the exact
// trap this stack must not contain. re-running a failing suite costs time;
// caching its failure costs the agent the whole request.
interface VerifyCache {
  key: string;
}

// content digest of HEAD, the binary diff, and untracked files keeps the
// verify verdict tied to the bytes the test command sees.
// a key that can never equal another. `Date.now()` alone collides inside the
// same millisecond, which would let the cache reuse a verdict for a state we
// explicitly could not measure.
let unknownStateSeq = 0;
const unknownState = (): string => `unknown:${Date.now()}:${unknownStateSeq++}`;

export function treeStateKey(
  cwd: string,
  hasGit: boolean,
  touched: Map<string, string | null>,
): string {
  if (hasGit) {
    try {
      const out = execSync(
        "git rev-parse HEAD 2>/dev/null; git diff HEAD --binary 2>/dev/null; printf '\\0'; git ls-files -o --exclude-standard -z 2>/dev/null",
        { cwd, encoding: "utf-8", timeout: 5000, maxBuffer: 8 * 1024 * 1024 },
      );
      const [gitState, ...rawUntracked] = out.split("\0");
      if (!out.trim() || !gitState.trim()) return unknownState();
      const untracked = rawUntracked
        .filter(Boolean)
        .sort()
        .map((rel) => {
          const abs = isAbsolute(rel) ? rel : resolvePath(cwd, rel);
          return `${rel}:${hashContent(readSnapshot(abs) ?? "")}`;
        });
      return hashContent([gitState, ...untracked].join("\n"));
    } catch {}
    return unknownState(); // never reuse a cached verdict for an unreadable tree
  }
  // no repo: key on the current content of every file this request touched.
  // without this the key was a timestamp, so the suite re-ran on every
  // continuation — the exact repeated cost the cache exists to avoid.
  const parts: string[] = [];
  for (const rel of [...touched.keys()].sort()) {
    const abs = isAbsolute(rel) ? rel : resolvePath(cwd, rel);
    parts.push(`${rel}:${hashContent(readSnapshot(abs) ?? "")}`);
  }
  return parts.length > 0 ? hashContent(parts.join("\n")) : unknownState();
}

export function runVerifyGate(cwd: string, cmd: string): GateFailure | null {
  try {
    execSync(cmd, {
      cwd,
      encoding: "utf-8",
      timeout: 15 * 60 * 1000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return null;
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const out = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() || String(e.message ?? "");
    return {
      gate: "verify",
      rule: "verify_failed",
      detail:
        `\`${cmd}\` exited non-zero. the change is not verified. fix the ` +
        `failure, do not weaken the test.\n   last output:\n   ` +
        out.split("\n").slice(-20).join("\n   "),
    };
  }
}
const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;

function complexityOutput(output: string): string | null {
  const text = output.trim();
  if (!text) return null;
  try {
    const reports = JSON.parse(text) as unknown;
    if (Array.isArray(reports)) {
      const findings: string[] = [];
      for (const report of reports) {
        if (!report || typeof report !== "object") continue;
        const path = "filePath" in report && typeof report.filePath === "string"
          ? report.filePath
          : "file" in report && typeof report.file === "string"
            ? report.file
            : "changed file";
        const messages = "messages" in report && Array.isArray(report.messages)
          ? report.messages
          : [];
        for (const message of messages) {
          if (!message || typeof message !== "object") continue;
          const detail = "message" in message && typeof message.message === "string"
            ? message.message
            : "complexity threshold exceeded";
          const line = "line" in message && typeof message.line === "number"
            ? `:${message.line}`
            : "";
          const score = detail.match(/\bcomplexity(?:\s+of|:)\s+(\d+)/i)?.[1];
          findings.push(`${path}${line}: ${score ? `complexity ${score}; ` : ""}${detail}`);
        }
      }
      return findings.length > 0 ? findings.slice(-20).join("\n") : null;
    }
  } catch {}
  return text.split("\n").slice(-20).join("\n");
}

export function runComplexityGate(
  cwd: string,
  cmd: string,
  changedFiles: Set<string>,
): GateFailure | null {
  const paths = [...changedFiles].sort();
  if (paths.length === 0) return null;
  const command = `${cmd} ${paths.map(shellQuote).join(" ")}`;
  try {
    const output = execSync(command, {
      cwd,
      encoding: "utf-8",
      timeout: 15 * 60 * 1000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const detail = complexityOutput(String(output));
    return detail
      ? {
          gate: "risk",
          rule: "complexity_failed",
          severity: "warn",
          detail: `complexity linter reported findings for changed files:\n   ${detail.replace(/\n/g, "\n   ")}`,
        }
      : null;
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const output = `${e.stdout ?? ""}${e.stderr ?? ""}`.trim() || String(e.message ?? "");
    const detail = complexityOutput(output) ?? "linter failed without output";
    return {
      gate: "risk",
      rule: "complexity_failed",
      severity: "warn",
      detail: `complexity linter could not complete for changed files:\n   ${detail.replace(/\n/g, "\n   ")}`,
    };
  }
}


export function runCommitGate(cwd: string): GateFailure | null {
  try {
    const dirty = execSync(`${COMMIT_CLEAN_CMD} 2>/dev/null`, {
      cwd,
      encoding: "utf-8",
      timeout: 5000,
      maxBuffer: 8 * 1024 * 1024,
    }).trim();
    if (!dirty) return null;
    return {
      gate: "commit",
      rule: "uncommitted_changes",
      detail:
        "the working tree still carries uncommitted changes to tracked files. " +
        "commit this unit of work before yielding (one logical change = one " +
        "commit).\n   " +
        dirty.split("\n").slice(0, 20).join("\n   "),
    };
  } catch {
    return null; // no git — the caller already gates on hasGit, but stay safe
  }
}

// --- "a process should have run" detector -----------------------------------
//
// measures how often a request was a bounded, verified, code-changing unit of
// work, without changing how any request is handled. measuring before acting is
// how this stack avoids the false-positive class it already hit: an unmeasured
// gate is a guess.
//
// `bun run gate-cli.js stats` is the only consumer. the upper file bound is the
// honest part: a 40-file sweep is not a delivery unit, it is a migration.

export const PROCESS_SHAPE_MAX_FILES = 8;

interface ProcessShape {
  matched: boolean;
  changed: number;
  testRan: boolean;
  // why it did not match — the near-miss reasons are what tell you whether the
  // threshold is wrong or the workload simply is not process-shaped
  reason: "no-changes" | "too-broad" | "no-test-run" | null;
}

export function processShape(ev: TurnEvidence, changedCount: number): ProcessShape {
  const testRan = ranTestRunner(ev);
  const base = { changed: changedCount, testRan };
  if (changedCount === 0) return { ...base, matched: false, reason: "no-changes" };
  if (changedCount > PROCESS_SHAPE_MAX_FILES) {
    return { ...base, matched: false, reason: "too-broad" };
  }
  if (!testRan) return { ...base, matched: false, reason: "no-test-run" };
  return { ...base, matched: true, reason: null };
}

// --- failure formatting -----------------------------------------------------

export function formatFailures(failures: GateFailure[]): string {
  const lines = failures.map(
    (f, i) => `${i + 1}. ${f.gate}/${f.rule}\n   ${f.detail}`,
  );
  return (
    "[GATE CHECKER — deterministic post-turn gate]\n\n" +
    "the following machine-checked gates failed:\n\n" +
    lines.join("\n\n") +
    "\n\nthese are deterministic checks, not model judgment. " +
    "fix each failure before yielding. do not repeat the same response."
  );
}

// --- frustration identity coverage -----------------------------------------


/**
 * maps each missing identity to a blocking gate failure. a record counts only
 * when its server-derived session file matches the active session. records
 * remain valid for later requests in the same session. used in session_stop.
 *
 * @param records every record in the shared scratchpad
 * @param identities readable agent labels and their required session files
 * @param repoRoot project taxonomy root
 * @returns {GateFailure[]}
 */
export function checkFrustrations(
  records: Array<Record<string, unknown>>,
  identities: Array<{ agent_id: string; session_file: string | null }>,
  repoRoot?: string,
): GateFailure[] {
  const missing = missingIdentities(records, identities, repoRoot);
  return missing.map((id) => ({
    gate: "journal",
    rule: "missing_frustration_record",
    detail: `identity "${id}" has no frustration record for this session. call record_frustration with your assigned id and goal.`,
  }));
}

// --- task-input injection nudge ---------------------------------------------

// the manifest requirement is stated first and in full, because it is the only
// rule whose violation the subagent cannot talk its way around: an empty
// manifest is a valid answer, so there is no incentive to omit it.
export const GATE_NUDGE =
  "[GATE CHECKER] your report MUST end with this exact block, listing every " +
  "file you changed, one path per line:\n" +
  `${MANIFEST_OPEN}\n` +
  "path/to/file.ts\n" +
  `${MANIFEST_CLOSE}\n` +
  "If you changed no files, emit the block empty — that is a valid answer. " +
  "The listed paths are checked against the real diff, so list exactly what " +
  "you changed: no more, no less.\n" +
  // a subagent bound to an output schema cannot emit free prose, so the block
  // alone was unreachable for it. naming the JSON form here means the nudge
  // states something every subagent can actually do.
  `If your output is JSON, put the same list in a \`${MANIFEST_JSON_KEYS.join("\`/\`")}\` ` +
  "field instead — an empty array is the valid answer for a read-only task.\n\n" +
  "Also: (1) do not leave forbidden markers (TODO: implement, FIXME:, " +
  "NotImplementedError, stub/placeholder comments) in lines you add; " +
  "(2) do not claim test results you did not produce — the bash log is " +
  "checked; (3) if you commit, use the git-commit skill script, not raw " +
  "git commit.\n\n" +
  // every active session and subagent needs a frustration record tied to its
  // server session file. the tool is the identity gate: without it the session
  // has no friction record. papercuts count even when nothing failed, so
  // "none" stays reserved for a genuinely friction-free session.
  "(4) call record_frustration with your assigned id and goal to log any " +
  "friction — papercuts count even when nothing failed: confusing docs, " +
  "dead ends, awkward tool output. use type \"none\" only when the whole " +
  "session was friction-free; it requires complaint \"none\" and severity " +
  "\"low\". every active identity needs one record for its session.\n\n";

// --- factory ----------------------------------------------------------------

// the no-progress abort is the primary defense against a stuck loop; the cap is
// a backstop for the case it misses.
export const MAX_CONTINUATIONS = 3;

export default function gateChecker(pi: ExtensionAPI): void {
  let evidence = freshEvidence();
  let continuationCount = 0;
  const commitRoutingEnabled = existsSync(COMMIT_SCRIPT_PATH);
  let config = loadConfig();
  let policy = policyFor(config.level) as GatePolicy;
  let verifyCache: VerifyCache | null = null;
  // blocking-failure fingerprint of the previous continuation (no-progress abort)
  let lastBlockingKey: string | null = null;
  let requestId: string | null = null;
  let journalRecovery: string | null = null;
  const leaseOwnerId = randomUUID();
  let leaseEnabled = !["0", "false", "off"].includes(
    String(process.env.OMP_GATE_MUTATION_LEASE ?? "").trim().toLowerCase(),
  );
  const activeOperations = new Map<string, ActiveOperation>();
  let builtinWrappersRegistered = false;

  const leaseFields = (lease: Record<string, unknown>): Record<string, unknown> => ({
    path: lease.path,
    token: lease.token,
    owner_id: lease.owner_id,
    request_id: lease.request_id,
    session_id: lease.session_id,
    session_file: lease.session_file,
    agent_id: lease.agent_id,
    tool_call_id: lease.tool_call_id,
    tool_name: lease.tool_name,
    target: lease.target,
    fence: lease.fence,
  });
  const releaseOperation = (toolCallId: string, reason: string): boolean => {
    const operation = activeOperations.get(toolCallId);
    if (!operation) return false;
    activeOperations.delete(toolCallId);
    clearInterval(operation.timer as unknown as number);
    if (operation.pollTimer) clearInterval(operation.pollTimer as unknown as number);
    let released = false;
    try {
      released = Boolean(releaselease(operation.lease));
    } catch {}
    ledger.append("lease_released", {
      ...leaseFields(operation.lease),
      reason,
      released,
    });
    return released;
  };
  const releaseAllOperations = (reason: string): void => {
    for (const toolCallId of [...activeOperations.keys()]) {
      releaseOperation(toolCallId, reason);
    }
  };
  const releaseOrphanedOperations = (reason: string): void => {
    for (const [toolCallId, operation] of activeOperations) {
      if (!operation.backgroundRunning) releaseOperation(toolCallId, reason);
    }
  };
  const asyncPollIntervalMs = 50;
  const pollAsyncOperation = (
    toolCallId: string,
    operation: ActiveOperation,
    context: ExtensionContext,
  ): void => {
    if (operation.pollTimer || typeof context?.getAsyncJobSnapshot !== "function") return;
    const poll = (): void => {
      if (activeOperations.get(toolCallId) !== operation) return;
      let snapshot: AsyncJobSnapshot | null;
      try {
        snapshot = context.getAsyncJobSnapshot?.() ?? null;
      } catch {
        return;
      }
      if (!snapshot || !operation.asyncJobId) return;
      const running = Array.isArray(snapshot.running) ? snapshot.running : [];
      const runningJob = running.find((job) => String(job?.id ?? "") === operation.asyncJobId);
      if (
        runningJob &&
        String(runningJob.status ?? "running").trim().toLowerCase() === "running"
      ) return;
      const recentJob = Array.isArray(snapshot.recent)
        ? snapshot.recent.find((job) => String(job?.id ?? "") === operation.asyncJobId)
        : undefined;
      const status = String(recentJob?.status ?? "").trim().toLowerCase();
      releaseOperation(
        toolCallId,
        status && status !== "running" ? `async_${status}` : "async_completed",
      );
    };
    const timer = setInterval(poll, asyncPollIntervalMs) as unknown as HeartbeatTimer;
    timer.unref?.();
    operation.pollTimer = timer;
    poll();
  };
  const releaseStaleSessionLease = (
    repoRoot: string | null,
    sessionFile: string | null | undefined,
    reason: string,
  ): void => {
    if (!repoRoot || !sessionFile) return;
    try {
      const status = inspectlease({ cwd: repoRoot }) as Record<string, unknown>;
      const record = status.record;
      if (
        status.status !== "held" ||
        status.stale !== true ||
        !record ||
        typeof record !== "object" ||
        (record as Record<string, unknown>).session_file !== sessionFile
      ) return;
      const lease = record as Record<string, unknown>;
      ledger.append("lease_heartbeat_stale", {
        ...leaseFields(lease),
        reason,
        ts: Date.now(),
      });
      const released = Boolean(releasestalelease(lease, { cwd: repoRoot }));
      ledger.append("lease_released", {
        ...leaseFields(lease),
        reason,
        released,
      });
      if (released) {
        ledger.append("lease_recovered", {
          ...leaseFields(lease),
          reason,
          ts: Date.now(),
        });
      }
    } catch {}
  };

  const policyfingerprint = (): string =>
    hashContent(`${config.level}\n${config.verifyCmd ?? ""}\n${config.complexityCmd ?? ""}`);
  const appendjournal = (kind: string, fields: Record<string, unknown> = {}): void => {
    if (!requestId) return;
    try {
      pi.appendEntry(journal_type, {
        version: journal_version,
        kind,
        request_id: requestId,
        ...fields,
        ts: Date.now(),
      });
    } catch {}
  };
  const acquireOperation = async (
    event: LeaseEventInput,
    ctx: ExtensionContext,
    scope: LeaseScope,
  ): Promise<ToolCallResult | void> => {
    if (!leaseEnabled || !policy.enabled) return;
    const toolCallId = String(event.toolCallId ?? "");
    if (!toolCallId || activeOperations.has(toolCallId)) return;
    const sessionId = String(
      event.sessionId ?? ctx?.sessionManager?.getSessionId?.() ?? "",
    );
    const sessionFile = ctx?.sessionManager?.getSessionFile?.() ?? null;
    if (!sessionId || !sessionFile) {
      return {
        block: true,
        reason: "mutation lease requires the active session id and session file",
      };
    }
    const operationRequestId = requestId ?? randomUUID();
    const agentId = operationAgentId(sessionFile, sessionId);
    const metadata = {
      cwd: scope.cwd,
      owner_id: leaseOwnerId,
      request_id: operationRequestId,
      session_id: sessionId,
      session_file: sessionFile,
      agent_id: agentId,
      tool_call_id: toolCallId,
      tool_name: event.toolName,
      target: scope.target,
    };
    const waitMs = Number(process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS);
    const acquisitionOptions = Number.isFinite(waitMs)
      ? { ...metadata, acquisition_wait_ms: Math.max(0, waitMs) }
      : metadata;
    ledger.append("lease_wait_started", {
      ...metadata,
      ts: Date.now(),
    });
    let result: Record<string, unknown>;
    try {
      result = await acquireleaseasync(acquisitionOptions) as Record<string, unknown>;
    } catch (error) {
      const reason = `mutation lease could not be acquired: ${
        error instanceof Error ? error.message : String(error)
      }`;
      return { block: true, reason };
    }
    if (result.acquired !== true) {
      let reason = "";
      try {
        const conflict = result.conflict;
        const holderSessionFile =
          conflict &&
          typeof conflict === "object" &&
          !Array.isArray(conflict) &&
          typeof (conflict as Record<string, unknown>).session_file === "string"
            ? (conflict as Record<string, unknown>).session_file as string
            : null;
        reason = formatleasestatus(result, {
          waited_ms: Number(result.waited_ms ?? 0),
          relation: resolveLeaseRelation(sessionFile, holderSessionFile),
          cwd: scope.cwd,
        });
      } catch {}
      if (!reason) {
        reason = String(
          result.error ?? result.diagnostic ?? "mutation lease is unavailable",
        );
      }
      if (result.timed_out === true) {
        ledger.append("lease_wait_timed_out", { ...metadata, reason, ts: Date.now() });
      }
      return { block: true, reason };
    }

    const timer = setInterval(() => {
      const operation = activeOperations.get(toolCallId);
      if (!operation || operation.lease !== result) return;
      try {
        if (!heartbeatlease(result)) {
          let stale = false;
          try {
            stale = (inspectlease({ cwd: String(result.repo_root ?? scope.cwd) }) as Record<string, unknown>).stale === true;
          } catch {}
          if (stale) {
            ledger.append("lease_heartbeat_stale", {
              ...leaseFields(result),
              ts: Date.now(),
            });
          }
          releaseOperation(toolCallId, stale ? "heartbeat_stale" : "heartbeat_lost");
        }
      } catch {}
    }, heartbeatintervalms({})) as unknown as HeartbeatTimer;
    timer.unref?.();
    activeOperations.set(toolCallId, {
      lease: result,
      timer,
      asyncJobId: null,
      toolName: event.toolName,
      target: scope.target,
      backgroundRunning: false,
    });
    ledger.append("lease_acquired", {
      ...leaseFields(result),
      recovered: result.recovered,
      ts: Date.now(),
    });
    if (result.recovered === true) {
      ledger.append("lease_recovered", {
        ...leaseFields(result),
        ts: Date.now(),
      });
    }
  };
  const registerBuiltinWrappers = (): void => {
    if (builtinWrappersRegistered) return;
    const getAllTools = (pi as unknown as { getAllTools?: () => unknown }).getAllTools;
    if (typeof getAllTools !== "function") return;
    let configuredTools: unknown;
    try {
      configuredTools = getAllTools.call(pi);
    } catch {
      return;
    }
    if (!Array.isArray(configuredTools)) return;
    let registered = false;
    for (const candidate of configuredTools as Array<Record<string, unknown>>) {
      const name = typeof candidate?.name === "string" ? candidate.name : "";
      if (!["write", "edit", "bash"].includes(name)) continue;
      const sourceInfo = candidate?.sourceInfo;
      if (
        !sourceInfo ||
        typeof sourceInfo !== "object" ||
        (sourceInfo as Record<string, unknown>).source !== "builtin"
      ) continue;
      const description = typeof candidate.description === "string"
        ? candidate.description
        : "";
      if (!description || candidate.parameters === undefined) continue;
      pi.registerTool({
        name,
        label: name,
        description,
        parameters: candidate.parameters as never,
        approval: name === "bash" ? "exec" : "write",
        execute: async (
          toolCallId: string,
          params: Record<string, unknown>,
          signal: AbortSignal | undefined,
          onUpdate: unknown,
          ctx: ExtensionContext,
        ): Promise<unknown> => {
          const event: LeaseEventInput = {
            toolName: name,
            toolCallId,
            input: params,
            sessionId: ctx?.sessionManager?.getSessionId?.(),
          };
          const scope = leasescope(event, ctx, evidence.repoRoot);
          const blocked = scope
            ? await acquireOperation(event, ctx, scope)
            : undefined;
          if (blocked?.block) {
            throw new Error(blocked.reason ?? "mutation lease is unavailable");
          }
          if (typeof ctx?.invokeTool !== "function") {
            throw new Error(`native ${name} tool is unavailable`);
          }
          return ctx.invokeTool(params, { signal, onUpdate });
        },
      } as never);
      registered = true;
    }
    builtinWrappersRegistered = registered;
  };

  const bindrepository = (
    input: Record<string, unknown>,
    ctx: ExtensionContext,
  ): void => {
    if (!requestId || evidence.baselineSha !== null) return;
    const cwd = String(ctx?.cwd ?? ".");
    for (const candidate of repositoryCandidates(input, cwd)) {
      const baseline = capturebaseline(candidate);
      if (baseline.sha === null || baseline.repo_root === null) continue;
      evidence.baselineSha = baseline.sha;
      evidence.baselineDirty = baseline.dirty;
      evidence.baselineSnapshots = baseline.snapshots;
      evidence.repoRoot = baseline.repo_root;
      appendjournal("repository_bound", {
        repo_root: baseline.repo_root,
        baseline_sha: baseline.sha,
        baseline_dirty: [...baseline.dirty].sort(),
        baseline_snapshots: baseline.snapshots,
      });
      try {
        ctx?.ui?.setStatus?.("gate", armingStatus());
      } catch {}
      return;
    }
  };

  const reportrepositorylimit = (
    input: Record<string, unknown>,
    ctx: ExtensionContext,
  ): void => {
    if (
      evidence.repoRoot === null ||
      (typeof input.cwd !== "string" && typeof input.path !== "string")
    ) return;
    const cwd = String(ctx?.cwd ?? ".");
    for (const candidate of repositoryCandidates(input, cwd)) {
      const root = capturebaseline(candidate).repo_root;
      if (
        root === null ||
        root === evidence.repoRoot ||
        evidence.warnedRepoRoots.has(root)
      ) continue;
      evidence.warnedRepoRoots.add(root);
      try {
        pi.appendEntry("omp.gate-checker.repository-limit", {
          authoritative_root: evidence.repoRoot,
          ignored_root: root,
          ts: Date.now(),
        });
      } catch {}
    }
  };
  const restorejournal = (ctx: ExtensionContext): void => {
    releaseAllOperations("journal_restore");
    const cwd = String(ctx?.cwd ?? ".");
    const currentRoot = evidence.repoRoot ?? capturebaseline(cwd).repo_root;
    releaseStaleSessionLease(
      currentRoot,
      ctx?.sessionManager?.getSessionFile?.(),
      "journal_restore_stale",
    );
    const branch = ctx.sessionManager?.getBranch?.() ?? [];
    const state = journalfrombranch(branch);
    if (state.status !== "active") {
      requestId = null;
      continuationCount = 0;
      lastBlockingKey = null;
      journalRecovery = state.status === "recovery_required"
        ? state.reason ?? "gate journal recovery required"
        : null;
      if (journalRecovery) {
        try {
          ctx.ui?.setStatus?.("gate", "⚠ gate journal recovery required");
        } catch {}
      }
      return;
    }
    const current = capturebaseline(cwd);
    if (
      state.policy_fingerprint !== policyfingerprint() ||
      (current.repo_root && current.repo_root !== state.repo_root) ||
      state.baseline_sha === null
    ) {
      requestId = null;
      continuationCount = 0;
      lastBlockingKey = null;
      journalRecovery =
        "the restored request lacks complete adjudication evidence; start a fresh request";
      try {
        ctx.ui?.setStatus?.("gate", "⚠ stale gate journal closed");
      } catch {}
      return;
    }
    requestId = state.request_id;
    continuationCount = state.continuation;
    lastBlockingKey = state.failure_hash;
    const priorInterrogations = evidence.interrogations;
    evidence = freshEvidence();
    for (const [hash, answers] of priorInterrogations) evidence.interrogations.set(hash, answers);
    evidence.hadToolCalls = true;
    evidence.baselineSha = state.baseline_sha;
    evidence.baselineSnapshots = state.baseline_snapshots;
    evidence.baselineDirty = new Set(state.baseline_dirty);
    evidence.repoRoot = state.repo_root;
  };
  const terminaljournal = (
    outcome: string,
    fields: Record<string, unknown> = {},
  ): void => {
    appendjournal("terminal", { outcome, ...fields });
    releaseOrphanedOperations("terminal_journal");
    requestId = null;
    journalRecovery = null;
  };

  const recordprovenance = (record: SubagentEvidence | null): void => {
    if (!record) return;
    evidence.subagents = mergeprovenance(
      evidence.subagents,
      record,
    ) as SubagentEvidence[];
  };
  const events = pi.events as unknown as {
    on?: (channel: string, handler: (payload: unknown) => void) => unknown;
  };
  events?.on?.("task:subagent:event", (payload: unknown) => {
    recordprovenance(provenancefromevent(payload) as SubagentEvidence | null);
  });
  events?.on?.("task:subagent:lifecycle", (payload: unknown) => {
    const record = provenancefromlifecycle(payload) as SubagentEvidence | null;
    recordprovenance(record);
    if (
      record &&
      ["completed", "failed", "aborted"].includes(record.status) &&
      record.session_file
    ) {
      releaseStaleSessionLease(
        evidence.repoRoot,
        record.session_file,
        "child_lifecycle",
      );
    }
  });

  const armingStatus = (): string => {
    if (!policy.enabled) return "gate: off";
    const bits = [`gate: ${config.level}`];
    if (policy.verify !== "off" && config.verifyCmd) bits.push(`verify: ${config.verifyCmd}`);
    if (policy.complexity !== "off" && config.complexityCmd) bits.push(`complexity: ${config.complexityCmd}`);
    if (policy.commit === "block") bits.push("commit required");
    return bits.join(" · ");
  };

  // show the arming state the moment the session opens, before the first prompt
  // costs anything. every other handler fires per request, so until this existed
  // the status bar stayed empty at startup and there was no way to tell an
  // unarmed session from an armed one except by spending a turn.
  pi.on("agent_end", (event: unknown) => {
    const willContinue =
      event &&
      typeof event === "object" &&
      "willContinue" in event &&
      event.willContinue === true;
    if (!willContinue) releaseOrphanedOperations("agent_end");
  });
  pi.on("session_start", (_event: unknown, ctx: ExtensionContext) => {
    registerBuiltinWrappers();
    restorejournal(ctx);
    const status = requestId
      ? `${armingStatus()} · resumed`
      : policy.enabled && capturebaseline(String(ctx?.cwd ?? ".")).sha === null
      ? `${armingStatus()} · low: no git`
      : armingStatus();
    try {
      ctx?.ui?.setStatus?.("gate", status);
    } catch {}
  });
  pi.on("session_branch", (_event: unknown, ctx: ExtensionContext) => {
    restorejournal(ctx);
  });
  pi.on("session_tree", (_event: unknown, ctx: ExtensionContext) => {
    restorejournal(ctx);
  });
  pi.on("session_shutdown", () => {
    releaseAllOperations("session_shutdown");
  });
  pi.on("ttsr_triggered", (event: unknown) => {
    let rules: unknown;
    if (event && typeof event === "object" && "rules" in event) rules = event.rules;
    if (!Array.isArray(rules)) return;
    for (const rule of rules) {
      if (
        rule &&
        typeof rule === "object" &&
        "name" in rule &&
        typeof rule.name === "string"
      ) evidence.ttsrHits.add(rule.name);
    }
  });

  // --- commands -------------------------------------------------------------
  // the level takes effect immediately, in this session, and persists to
  // CONFIG_PATH so the next session starts the same way. no restart.

  const leaseStatusReport = (ctx: ExtensionCommandContext): string => {
    const cwd = evidence.repoRoot ?? String(ctx?.cwd ?? ".");
    const lines = [
      `mutation lease enabled: ${leaseEnabled ? "on" : "off"}`,
      `owned active operations: ${activeOperations.size}`,
    ];
    for (const [toolCallId, operation] of activeOperations) {
      lines.push(
        `  tool call: ${toolCallId} · tool name: ${operation.toolName} · target: ${operation.target ?? "unknown"}`,
      );
    }
    let status: Record<string, unknown> | null = null;
    try {
      status = inspectlease({ cwd }) as Record<string, unknown>;
    } catch {}
    if (!status) {
      lines.push("current holder: unknown");
      return lines.join("\n");
    }
    let formatted = "";
    try {
      const record = status.record;
      const holderSessionFile =
        record &&
        typeof record === "object" &&
        !Array.isArray(record) &&
        typeof (record as Record<string, unknown>).session_file === "string"
          ? (record as Record<string, unknown>).session_file as string
          : null;
      formatted = formatleasestatus(status, {
        relation: resolveLeaseRelation(
          ctx?.sessionManager?.getSessionFile?.() ?? null,
          holderSessionFile,
        ),
        cwd,
      });
    } catch {}
    lines.push(`current holder: ${formatted || String(status.status ?? "unknown")}`);
    return lines.join("\n");
  };

  pi.registerCommand("gates-lease", {
    description: "show or change the mutation lease for this session: status | on | off",
    getArgumentCompletions: (prefix: string) =>
      ["status", "on", "off"]
        .filter((command) => command.startsWith(prefix.trim().toLowerCase()))
        .map((command) => ({ value: command, label: command })),
    handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const parts = args.trim().toLowerCase().split(/\s+/).filter(Boolean);
      const command = parts[0] ?? "";
      if (parts.length !== 1 || !["status", "on", "off"].includes(command)) {
        ctx?.ui?.notify?.("usage: /gates-lease status|on|off", "error");
        return;
      }
      if (command === "status") {
        ctx?.ui?.notify?.(leaseStatusReport(ctx), "info");
        return;
      }
      if (command === "on") {
        leaseEnabled = true;
        ctx?.ui?.notify?.(leaseStatusReport(ctx), "info");
        return;
      }
      if (activeOperations.size > 0) {
        ctx?.ui?.notify?.(
          `cannot disable mutation lease while ${activeOperations.size} active operation(s) are tracked`,
          "error",
        );
        return;
      }
      const cwd = evidence.repoRoot ?? String(ctx?.cwd ?? ".");
      let releaseError: string | null = null;
      try {
        const status = inspectlease({ cwd }) as Record<string, unknown>;
        const record = status.record;
        const ownedRecord =
          !!record &&
          typeof record === "object" &&
          !Array.isArray(record) &&
          (record as Record<string, unknown>).owner_id === leaseOwnerId;
        if (
          status.status !== "free" &&
          ownedRecord &&
          (status.status !== "held" ||
            status.kind !== "v2" ||
            status.valid !== true)
        ) {
          releaseError =
            "cannot disable mutation lease: this instance's lease is not a valid held v2 record and cannot be safely released; retry /gates-lease off or inspect with: nikos-gates lease status --cwd .";
        } else if (
          status.status === "held" &&
          status.kind === "v2" &&
          status.valid === true &&
          ownedRecord
        ) {
          const lease = record as Record<string, unknown>;
          let released = false;
          try {
            released = Boolean(releaselease(lease, { cwd }));
          } catch (error) {
            releaseError = `cannot disable mutation lease: fenced release threw: ${
              error instanceof Error ? error.message : String(error)
            }; retry /gates-lease off or inspect with: nikos-gates lease status --cwd .`;
          }
          if (!released && !releaseError) {
            releaseError =
              "cannot disable mutation lease: this instance's idle lease was not released; retry /gates-lease off or inspect with: nikos-gates lease status --cwd .";
          }
          if (released) {
            ledger.append("lease_manual_release", {
              ...leaseFields(lease),
              reason: "gates-lease off",
              released: true,
              ts: Date.now(),
            });
          }
        }
      } catch (error) {
        releaseError = `cannot disable mutation lease: current lease could not be inspected: ${
          error instanceof Error ? error.message : String(error)
        }; retry /gates-lease off or inspect with: nikos-gates lease status --cwd .`;
      }
      if (releaseError) {
        leaseEnabled = true;
        ctx?.ui?.notify?.(releaseError, "error");
        return;
      }
      leaseEnabled = false;
      ctx?.ui?.notify?.(leaseStatusReport(ctx), "info");
    },
  });

  const applyLevel = (
    level: GateLevel,
    verifyCmd: string | null,
    complexityCmd: string | null,
    ctx: ExtensionCommandContext,
  ): string => {
    const saved = saveConfig(level, verifyCmd, complexityCmd);
    config = { level, verifyCmd, complexityCmd, source: "config" };
    policy = policyFor(level) as GatePolicy;
    // a level change invalidates a cached verify verdict: the same tree can be
    // acceptable at one level and not at another.
    verifyCache = null;
    lastBlockingKey = null;
    try {
      ctx?.ui?.setStatus?.("gate", armingStatus());
    } catch {}
    const body = describeLevel(level, verifyCmd, complexityCmd);
    return saved.ok
      ? `${body}\n\nsaved to ${CONFIG_PATH}`
      : `${body}\n\n⚠ active for this session only — could not write ${CONFIG_PATH}: ${saved.error}`;
  };

  pi.registerCommand("gates-engage", {
    description: "show gate status or set engagement level: low | medium | high",
    getArgumentCompletions: (prefix: string) =>
      ["low", "medium", "high"]
        .filter((l) => l.startsWith(prefix.trim().toLowerCase()))
        .map((l) => ({ value: l, label: l })),
    handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const level = String(parts[0] ?? "").toLowerCase() as GateLevel;

      if (!parts.length) {
        // no argument is a question, not a mistake — report the current state.
        ctx?.ui?.notify?.(
          `${describeLevel(config.level, config.verifyCmd, config.complexityCmd)}\n\n` +
            `source: ${config.source}\nchange with: /gates-engage low|medium|high`,
          "info",
        );
        return;
      }
      if (!LEVELS.includes(level) || level === "off") {
        ctx?.ui?.notify?.(
          `unknown level "${parts[0]}". use low, medium, or high. ` +
            "to turn the gates off entirely use /gates-disable.",
          "error",
        );
        return;
      }
      if (parts.length > 1) {
        ctx?.ui?.notify?.(
          "/gates-engage accepts no arguments for status or exactly one level: low, medium, or high. " +
            "trailing text cannot set a verification command; set OMP_VERIFY_CMD or the persisted config instead.",
          "error",
        );
        return;
      }
      ctx?.ui?.notify?.(applyLevel(level, config.verifyCmd, config.complexityCmd, ctx), "info");
    },
  });

  pi.registerCommand("gates-disable", {
    description: "turn every gate off (re-enable with /gates-engage medium)",
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      ctx?.ui?.notify?.(applyLevel("off", config.verifyCmd, config.complexityCmd, ctx), "warning");
    },
  });
  pi.registerCommand("advisor-install", {
    description: "install or update the bundled terra advisor",
    handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
      if (args.trim()) {
        ctx?.ui?.notify?.("/advisor-install accepts no arguments", "error");
        return;
      }
      try {
        const file = installadvisor();
        ctx?.ui?.notify?.(
          `advisor install: installed terra at ${file}\nstart a new omp session to activate terra`,
          "info",
        );
      } catch (error) {
        ctx?.ui?.notify?.(
          `advisor install: ${error instanceof Error ? error.message : String(error)}`,
          "error",
        );
      }
    },
  });


  // --- record_frustration tool ----------------------------------------------
  // the native essential write-tier tool the agent calls to log friction.
  // returns success or a validation error; never throws.
  pi.registerTool({
    name: "record_frustration",
    label: "record frustration",
    description:
      "log friction from the current session. papercuts count even when " +
      "nothing failed: confusing docs, dead ends, awkward tool output. " +
      "use type \"none\" only when the whole session was friction-free; it " +
      "requires complaint \"none\" and severity \"low\". every active identity " +
      "(main session and each subagent) needs one record for that session. " +
      "append-only jsonl. " +
      "type must be one of: tooling | environment | requirements | workflow | " +
      "test | dependency | performance | other | none.",
    approval: "write",
    parameters: pi.zod.object({
      agent_id: pi.zod.string().describe("your assigned id (e.g. \"main\" or the subagent id)"),
      primary_goal: pi.zod.string().describe("the goal you were assigned for this request"),
      complaint: pi.zod.string().describe("what went wrong or what blocked you; use \"none\" with type \"none\""),
      type: pi.zod.string().describe("friction category, or none for a friction-free session"),
      severity: pi.zod.string().describe("low, medium, high, or blocker; type \"none\" requires low"),
      evidence: pi.zod.array(pi.zod.union([
        pi.zod.object({
          kind: pi.zod.literal("gate"),
          event_id: pi.zod.string(),
          rule: pi.zod.string(),
        }),
        pi.zod.object({
          kind: pi.zod.literal("snapshot"),
          path: pi.zod.string(),
          line: pi.zod.number(),
          digest: pi.zod.string(),
          claim: pi.zod.string(),
        }),
        pi.zod.object({
          kind: pi.zod.literal("command"),
          command: pi.zod.string(),
          exit_code: pi.zod.number(),
          output: pi.zod.string(),
        }),
      ])).describe("always present. at least one entry unless type is \"none\"; for \"none\" pass []"),
    }),
    execute: async (
      _toolCallId: string,
      params: Record<string, unknown>,
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContext,
    ): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: boolean }> => {
      const cwd = String(ctx?.cwd ?? ".");
      const taxonomyRoot = evidence.repoRoot ?? cwd;
      const result = validateFrustration(params, {
        repoRoot: taxonomyRoot,
        requestId: requestId ?? undefined,
        cwd,
        sessionFile: ctx?.sessionManager?.getSessionFile?.(),
        sessionId: ctx?.sessionManager?.getSessionId?.(),
        source: "agent",
      });
      if (!result.ok) {
        return {
          content: [{ type: "text" as const, text: `validation error: ${result.error}` }],
          isError: true,
        };
      }
      const appended = appendFrustration(result.record, undefined, {
        repoRoot: taxonomyRoot,
      });
      if (!appended.ok) {
        return {
          content: [{ type: "text" as const, text: `append error: ${appended.error}` }],
          isError: true,
        };
      }
      // a clean-turn claim against a request with machine-visible errors is a
      // signal, not a failure: the record stands and the agent is never
      // re-prompted — the ledger note lets stats measure optimistic "none".
      // any failed tool result counts, and so does a continuation forced by a
      // real gate failure; the missing-record rule alone never does.
      if (
        params.type === "none" &&
        (evidence.hadtoolerror || evidence.hadblockingfailure)
      ) {
        ledger.append("clean_under_errors", {
          agent_id: params.agent_id,
          request_id: requestId,
        });
      }
      return {
        content: [{ type: "text" as const, text: `recorded frustration for ${params.agent_id}: ${params.complaint}` }],
      };
    },
  });
  pi.registerTool({
    name: "interrogate",
    label: "interrogate the build",
    description: "answer the three first-principles questions against what you just built. required once per changed generation when the gate reports a trigger.",
    approval: "write",
    parameters: pi.zod.object({
      unnecessary: pi.zod.string().describe("what here is unnecessary, overly complicated, or based on weak assumptions"),
      deleted: pi.zod.string().describe("what you deleted entirely. be aggressive"),
      simplified: pi.zod.string().describe("what you simplified once the unnecessary pieces were gone"),
    }),
    execute: async (
      _toolCallId: string,
      params: Record<string, unknown>,
      _signal: AbortSignal | undefined,
      _onUpdate: unknown,
      ctx: ExtensionContext,
    ): Promise<{ content: Array<{ type: "text"; text: string }> }> => {
      const cwd = String(ctx?.cwd ?? ".");
      const generationHash = treeStateKey(
        evidence.repoRoot ?? cwd,
        evidence.baselineSha !== null,
        evidence.preTouch,
      );
      const answers: InterrogationAnswers = {
        unnecessary: String(params.unnecessary ?? ""),
        deleted: String(params.deleted ?? ""),
        simplified: String(params.simplified ?? ""),
      };
      evidence.interrogations.set(generationHash, answers);
      ledger.append("gate_eval", {
        rules: ["interrogate"],
        tree_fingerprint: generationHash,
        ...answers,
        request_id: requestId,
      });
      appendjournal("verify", {
        verify_id: `interrogate:${generationHash}`,
        outcome: "interrogated",
        tree_fingerprint: generationHash,
        ...answers,
      });
      return {
        content: [{ type: "text" as const, text: `interrogation recorded for generation ${generationHash}` }],
      };
    },
  });
  // reset the ledger + capture the git baseline once per user request.
  //
  // `agent_start` (not `turn_start`) is the right seam: `turn_start` fires for
  // every LLM turn, but `session_stop` only fires when the whole run settles.
  // re-baselining per turn meant files edited in turn 1 were "already dirty" by
  // turn 3, got subtracted from the diff, and every honest claim about them was
  // reported as fabricated — a false-positive block on any multi-turn task.
  // it also wiped the bash/snapshot ledgers that later turns cite.
  //
  // a forced continuation re-enters through `agent_start` too, so the baseline
  // is latched while a continuation chain is open (continuationCount > 0);
  // otherwise the retry would measure only the retry's own edits and the cap
  // would never advance.
  pi.on("agent_start", (_event: unknown, ctx: ExtensionContext) => {
    registerBuiltinWrappers();
    const cwd = String(ctx?.cwd ?? ".");
    if (continuationCount > 0) return;
    // a new agent turn with no open continuation means any non-background
    // operation belongs to an abandoned or interrupted request.
    releaseOrphanedOperations("agent_start");
    if (requestId) {
      lastBlockingKey = null;
    }
    evidence = freshEvidence();
    const baseline = capturebaseline(cwd);
    evidence.baselineSha = baseline.sha;
    evidence.baselineDirty = baseline.dirty;
    evidence.repoRoot = baseline.repo_root;
    evidence.baselineSnapshots = baseline.snapshots;
    requestId = randomUUID();
    appendjournal("request_start", {
      repo_root: baseline.repo_root ?? cwd,
      baseline_sha: baseline.sha,
      baseline_dirty: [...baseline.dirty].sort(),
      baseline_snapshots: baseline.snapshots,
    });

    // no git — fall back to first-touch content hashing (see tool_call below)
    if (baseline.sha === null) {
      try {
        ctx?.ui?.setStatus?.("gate", `${armingStatus()} · low: no git`);
      } catch {}
      ledger.append("no_git", { reason: "no-git-repo", cwd });
    }

    // restore the arming state at the start of each request — the previous
    // request ended by overwriting this key with its gate verdict
    if (baseline.sha !== null) {
      try {
        ctx?.ui?.setStatus?.("gate", armingStatus());
      } catch {}
    }
  });

  // accumulate evidence + commit routing + task-input injection
  pi.on("tool_call", async (event: ToolCallEvent, ctx: ExtensionContext): Promise<ToolCallResult | void> => {
    evidence.hadToolCalls = true;
    // `off` means off. without this the handler still bound a repository,
    // rewrote a commit, and prepended the gate nudge after /gates-disable.
    if (!policy.enabled) return;
    const { toolName, input } = event;

    bindrepository(input, ctx);

    reportrepositorylimit(input, ctx);

    if (toolName === "ask") evidence.askedUser = true;

    if ((toolName === "write" || toolName === "edit") && input?.path) {
      const relPath = String(input.path);
      evidence.filesTouched.add(relPath);

      // snapshot before mutation when git cannot cover the path. this retains
      // no-git evidence collected before a repository bind and covers later
      // writes outside the bound repository.
      const cwd = String(ctx?.cwd ?? ".");
      const declaredCwd = typeof input.cwd === "string"
        ? resolvePath(cwd, input.cwd)
        : cwd;
      const abs = isAbsolute(relPath) ? relPath : resolvePath(declaredCwd, relPath);
      const outsideRepository = evidence.repoRoot !== null &&
        !isInside(evidence.repoRoot, abs);
      const evidencePath = isInside(cwd, abs)
        ? normalizePath(relative(cwd, abs))
        : abs;
      if (
        (evidence.baselineSha === null || outsideRepository) &&
        !evidence.preTouch.has(evidencePath)
      ) evidence.preTouch.set(evidencePath, readSnapshot(abs));
    }

    // commit routing: intercept raw git commit, rewrite to smart_commit.sh
    if (commitRoutingEnabled && toolName === "bash") {
      const cmd = String(input?.command ?? "");
      const rewritten =
        rewriteGitCommit(cmd, COMMIT_SCRIPT_PATH) ??
        rewriteSmartCommit(cmd, COMMIT_SCRIPT_PATH);
      if (rewritten) {
        return { input: { ...input, command: rewritten } };
      }
    }

    // task-input injection: prepend gate instructions to every spawned subagent
    if (toolName === "task") {
      const nudge = GATE_NUDGE;
      if (input.tasks && Array.isArray(input.tasks)) {
        const context = String(input.context ?? "");
        return { input: { ...input, context: nudge + context } };
      }
      const task = String(input.task ?? "");
      return { input: { ...input, task: nudge + task } };
    }
  });

  pi.on("tool_result", async (event: ToolResultEvent, ctx: ExtensionContext): Promise<ToolResultEventResult | void> => {
    const { toolName, content, isError, input, details } = event;
    const toolCallId = String(event.toolCallId ?? "");
    const operation = activeOperations.get(toolCallId);
    const asyncRunning =
      toolName === "bash" && asyncExecutionState(details) === "running";
    if (operation && asyncRunning) {
      operation.backgroundRunning = true;
      operation.asyncJobId = asyncExecutionJobId(details);
      if (operation.asyncJobId) pollAsyncOperation(toolCallId, operation, ctx);
    } else if (operation) {
      releaseOperation(toolCallId, isError ? "tool_error" : "tool_result");
    }
    if (isError) evidence.hadtoolerror = true;

    // capture snapshot tags from read/edit results
    if (toolName === "read" || toolName === "edit") {
      const text = extractText(content);
      const refs = extractSnapshotRefs(text);
      for (const r of refs) evidence.snapshotTags.add(r.tag);
    }

    // --- inline completion gate ---------------------------------------------
    // flag a forbidden marker the moment write/edit introduces it. session_stop
    // is minutes and many tool calls later; catching it there forces a full
    // response retry to fix what is, right now, a one-line edit the agent still
    // has full context for. session_stop remains the backstop for anything that
    // slips through (bash-driven edits, markers introduced by a subagent).
    if (policy.inline && (toolName === "write" || toolName === "edit") && !isError) {
      const relPath = String(input?.path ?? "");
      const inline = inlineAdditions(toolName, relPath, input, details);
      if (inline && relPath) {
        const cwd = String(ctx?.cwd ?? ".");
        const markers = loadForbiddenMarkers(evidence.repoRoot ?? cwd);
        const hits = checkAddedLines(inline, markers);
        const fresh = hits.filter((h) => !evidence.flaggedInline.has(h.detail));
        if (fresh.length > 0) {
          for (const h of fresh) {
            evidence.flaggedInline.add(h.detail);
            ledger.append("inline_flag", {
              rule: h.rule,
              path: relPath,
              detail: h.detail,
              tool: toolName,
            });
          }
          return {
            content: [
              ...(Array.isArray(content) ? content : [{ type: "text" as const, text: String(content ?? "") }]),
              {
                type: "text" as const,
                text:
                  "\n[GATE CHECKER — inline]\n" +
                  fresh.map((h) => `  • ${h.detail}`).join("\n") +
                  "\nFix this now, while you are in the file. If left, the " +
                  "completion gate will block the whole response at the end " +
                  "of the turn.",
              },
            ],
          };
        }
      }
    }

    // record bash results for test-claim verification
    if (toolName === "bash") {
      evidence.bashCommands.push({
        cmd: String(input?.command ?? ""),
        isError: Boolean(isError),
      });
    }

    // native task details and lifecycle events are the primary provenance.
    // text-only reports remain compatible with older task implementations.
    if (toolName === "task" && !isError) {
      const records = provenancefromdetails(event.toolCallId, details) as SubagentEvidence[];
      for (const record of records) recordprovenance(record);
      const background = Boolean(
        details &&
        typeof details === "object" &&
        "async" in details &&
        details.async,
      );
      if (records.length === 0 && !background) {
        const report = extractText(content);
        if (report) {
          recordprovenance({
            task_call_id: event.toolCallId,
            id: `legacy:${event.toolCallId}`,
            agent: null,
            status: "completed",
            exit_code: 0,
            error: null,
            duration_ms: null,
            model: null,
            session_file: null,
            output_path: null,
            patch_path: null,
            branch_name: null,
            branch_base_sha: null,
            report,
            manifest: extractManifest(report),
            manifest_source: "report",
          });
        }
      }
    }
  });
  pi.on("tool_execution_update", (event: unknown) => {
    if (!event || typeof event !== "object") return;
    const object = event as Record<string, unknown>;
    const toolCallId = typeof object.toolCallId === "string" ? object.toolCallId : "";
    if (!toolCallId || !object.partialResult || typeof object.partialResult !== "object") return;
    const details = (object.partialResult as Record<string, unknown>).details;
    const state = asyncExecutionState(details);
    if (state === "completed" || state === "failed" || state === "cancelled") {
      releaseOperation(toolCallId, `async_${state}`);
    }
  });

  // run gates before the agent yields — the enforcement point
  const completionDecision = async (event: unknown, ctx: ExtensionContext): Promise<SessionStopResult | void> => {
    // any path that does not return `{ continue: true }` ends the continuation
    // chain, so it must clear the counter that latches the baseline.
    if (!policy.enabled) {
      terminaljournal("skipped_disabled");
      return void (continuationCount = 0);
    }
    const assistantText = getLastAssistantText(ctx) ?? "";
    if (shouldskipnotools(evidence.hadToolCalls, assistantText, journalRecovery)) {
      terminaljournal("skipped_no_tools");
      return void (continuationCount = 0);
    }

    const cwd = String(ctx?.cwd ?? ".");
    const sessionFile = ctx?.sessionManager?.getSessionFile?.();
    const sessionId = ctx?.sessionManager?.getSessionId?.();
    const taxonomyRoot = evidence.repoRoot ?? cwd;
    const mutated = evidence.filesTouched.size > 0 || evidence.hadtoolerror;
    if (!assistantText && !evidence.askedUser && !journalRecovery && !mutated) {
      terminaljournal("skipped_no_assistant_text");
      return void (continuationCount = 0);
    }

    const hasGit = evidence.baselineSha !== null;
    const markers = loadForbiddenMarkers(taxonomyRoot);

    const failures: GateFailure[] = [];
    const gitCwd = evidence.repoRoot ?? cwd;
    if (journalRecovery) {
      failures.push({
        gate: "journal",
        rule: "recovery_required",
        detail: journalRecovery,
      });
    }

    // --- derive what this request changed ------------------------------------
    // hoisted out of the gates so the delivery gates can run first. ordering
    // matters: `fabricated_test_result` fires when the agent claims tests pass
    // without evidence, and the verify gate is that evidence. running the
    // citation gate first flagged a true claim as a fabrication.
    let changedFiles = new Set<string>();
    let added: AddedMap = new Map();
    let watched: Set<string> | null = null;
    let dayOneTrigger = false;
    // git present but unreadable (corrupt index, permissions, a ref that will
    // not resolve). judging nothing is the only honest verdict: an empty
    // changed-file set would report every honest claim as fabricated.
    let canAdjudicate = true;

    if (hasGit) {
      try {
        const scope = resolvescope({
          kind: "request",
          cwd: gitCwd,
          baseline_sha: evidence.baselineSha,
          baseline_dirty: evidence.baselineDirty,
          baseline_snapshots: evidence.baselineSnapshots,
        });
        changedFiles = new Set(scope.files.map((file) => file.path));
        added = new Map(Object.entries(scope.added)) as AddedMap;
        const external = no_git_diff(evidence.preTouch, cwd);
        for (const path of external.changed) changedFiles.add(path);
        for (const [key, line] of external.added) added.set(key, line);
        const risk = auditscope(scope);
        dayOneTrigger =
          scope.files.some((file) =>
            file.type === "added" ||
            file.type === "renamed" ||
            file.type === "untracked"
          ) ||
          risk.findings.some((finding) => finding.id === "risk.dependencies");
        for (const finding of risk.findings) {
          const location = finding.evidence.line
            ? `${finding.evidence.path}:${finding.evidence.line}`
            : finding.evidence.path;
          failures.push({
            gate: "risk",
            rule: finding.id,
            severity: "warn",
            detail: `${location}: ${finding.evidence.detail} (scope ${scope.digest.slice(0, 12)})`,
          });
        }
      } catch (error) {
        canAdjudicate = false;
        failures.push({
          gate: "journal",
          rule: "scope_unavailable",
          detail: `repository scope could not be resolved: ${String(error)}`,
        });
      }
    } else {
      const d = no_git_diff(evidence.preTouch, cwd);
      changedFiles = d.changed;
      added = d.added;
      const noGitRisk = auditscope({
        files: [...changedFiles].map((path) => ({
          path,
          type: evidence.preTouch.get(path) === null ? "added" : "modified",
        })),
        added: Object.fromEntries(added),
      });
      dayOneTrigger =
        [...changedFiles].some((path) => evidence.preTouch.get(path) === null) ||
        noGitRisk.findings.some((finding) => finding.id === "risk.dependencies");
      watched = new Set([...evidence.preTouch.keys()].map(normalizePath));
      try {
        pi.appendEntry("omp.gate-checker.no-git", {
          reason: "no-git-repo",
          watched: evidence.preTouch.size,
          ts: Date.now(),
        });
      } catch {}
    }
    const changedCount = canAdjudicate ? changedFiles.size : 0;
    if (evidence.ttsrHits.has("no-absolute-home-path")) {
      const conditions = homePathConditions();
      for (const [path, lines] of added) {
        for (const { line, text } of lines) {
          if (conditions.some((re) => {
            re.lastIndex = 0;
            return re.test(text);
          })) {
            failures.push({
              gate: "completion",
              rule: "no-absolute-home-path",
              detail: `${path} line ${line}: interrupted once, rewritten with the path still present`,
            });
          }
        }
      }
    }

    if (policy.enabled && canAdjudicate && changedCount > 0 && dayOneTrigger) {
      const generationHash = treeStateKey(gitCwd, hasGit, evidence.preTouch);
      if (
        !evidence.interrogations.has(generationHash)
      ) {
        failures.push({
          gate: "completion",
          rule: "missing_interrogation",
          detail:
            `changed generation ${generationHash} requires one interrogate call; ` +
            "answer all three first-principles questions before yielding.",
        });
      }
    }


    // --- delivery gates: verify + commit -------------------------------------
    // change-gated, so a read-only or exploratory request is never asked to
    // pass tests or commit.
    if (policy.enabled && canAdjudicate && changedCount > 0) {
      // the verify gate does not need git — running a test suite is unrelated
      // to version control, and a lot of real work happens outside a repo.
      if (policy.verify !== "off" && config.verifyCmd) {
        const key = treeStateKey(gitCwd, hasGit, evidence.preTouch);
        if (!verifyCache || verifyCache.key !== key) {
          try {
            ctx?.ui?.setStatus?.("gate", `running verify: ${config.verifyCmd}`);
          } catch {}
          const failure = runVerifyGate(hasGit ? gitCwd : cwd, config.verifyCmd);
          verifyCache = failure ? null : { key };
          if (failure) failures.push(failure);
          // a passing verify run is evidence that the tests pass, so a claim to
          // that effect is grounded. recorded before the citation gate reads it.
          //
          // assigned, never OR-ed: evidence survives a forced continuation by
          // design, so a pass in retry 1 would otherwise keep grounding a test
          // claim in retry 2 after the agent broke the suite again.
          evidence.verifyPassed = !failure;
          appendjournal("verify", {
            verify_id: randomUUID(),
            outcome: failure ? "failed" : "passed",
            tree_fingerprint: key,
          });
          ledger.append("gate_eval", {
            rules: [failure ? "verify_failed" : "verify_passed"],
            cmd: config.verifyCmd,
            cwd: gitCwd,
          });
        } else if (verifyCache) {
          evidence.verifyPassed = true;
        }
      } else if (policy.verify === "block" && !config.verifyCmd && !ranTestRunner(evidence)) {
        failures.push({
          gate: "verify",
          rule: "no_test_run",
          detail: `changed ${changedCount} files, ran no passing test command. run the project's test command, or set gates verifyCmd <cmd>.`,
        });
      }

      if (policy.complexity !== "off" && config.complexityCmd) {
        try {
          ctx?.ui?.setStatus?.("gate", `running complexity: ${config.complexityCmd}`);
        } catch {}
        const complexityFailure = runComplexityGate(gitCwd, config.complexityCmd, changedFiles);
        if (complexityFailure) failures.push(complexityFailure);
      }

      // the commit gate genuinely needs git, and stays off below "high":
      // forcing a commit at the end of every turn is the most disruptive rule
      // in the stack and it is meaningless outside a repo.
      if (policy.commit !== "off" && hasGit) {
        const commitFailure = runCommitGate(gitCwd);
        if (commitFailure) failures.push(commitFailure);
      }
    }

    // --- citation + completion gates ------------------------------------------
    if (canAdjudicate) {
      failures.push(
        ...checkCitations(
          assistantText,
          evidence.subagents,
          changedFiles,
          evidence,
          hasGit,
          cwd,
          watched,
        ),
        ...checkAddedLines(added, markers),
      );
    }

    // record every applied warning or blocking outcome before identity coverage,
    // so an automatic main record satisfies this stop without a retry.
    const records = readFrustrations(undefined, { repoRoot: taxonomyRoot });
    if (requestId) {
      for (const failure of applyPolicy(failures, policy)) {
        const severity = failure.severity ?? "block";
        if (
          failure.rule === "missing_frustration_record" ||
          (severity !== "warn" && severity !== "block")
        ) continue;
        const validated = validateFrustration(
          automaticGateRecord({
            request_id: requestId,
            rule: failure.rule,
            detail: failure.detail,
            blocking: severity === "block",
            repo_root: taxonomyRoot,
            cwd,
            session_file: sessionFile,
            session_id: sessionId,
          }),
          {
            repoRoot: taxonomyRoot,
            requestId,
            cwd,
            sessionFile,
            sessionId,
            source: "auto",
          },
        );
        if (!validated.ok) continue;
        if (
          appendFrustration(validated.record, undefined, {
            repoRoot: taxonomyRoot,
          }).ok
        ) records.push(validated.record);
      }

    }

    // every active session and observed subagent needs a complete record whose
    // server-derived session file matches its native session provenance.
    const identities: Array<{ agent_id: string; session_file: string | null }> = [
      { agent_id: "main", session_file: sessionFile ?? null },
    ];
    for (const sub of evidence.subagents) {
      identities.push({
        agent_id: sub.id || "subagent",
        session_file: sub.session_file,
      });
    }
    failures.push(
      ...checkFrustrations(records, identities, taxonomyRoot),
    );

    // a user question releases only after it changed nothing and every active
    // identity has a frustration record.
    if (
      canskipuserquestion(
        evidence.askedUser,
        changedCount,
        journalRecovery,
        failures.some((failure) => failure.rule === "missing_frustration_record"),
      )
    ) {
      terminaljournal("skipped_user_question");
      return void (continuationCount = 0);
    }
    // --- "a process should have run" -----------------------------------------
    // record process shape only when a request ends, never on a continuation.
    const shape = processShape(evidence, changedCount);
    const recordShape = (
      outcome: "gates_clean" | "released_with_failures",
      release_reason: string | null = null,
    ) =>
      ledger.append("process_shape", {
        ...shape,
        outcome,
        release_reason,
        hasGit,
        subagents: evidence.subagents.length,
        continuations: continuationCount,
        cwd,
      });

    // --- engagement level ----------------------------------------------------
    // re-grade everything through the dial before anything acts on severity.
    const graded = applyPolicy(failures, policy);

    // --- severity partition ---------------------------------------------------
    // only blocking failures can force a continuation. warnings are surfaced
    // and recorded, then the agent yields — a rule about how work was reported
    // must not stop delivery of work the diff and the tests already confirm.
    const blocking = graded.filter((f) => (f.severity ?? "block") === "block");
    const warnings = graded.filter((f) => f.severity === "warn");
    if (warnings.length > 0) {
      ledger.append("gate_eval", {
        rules: warnings.map((f) => f.rule),
        failures: warnings.map((f) => ({ rule: f.rule, detail: f.detail })),
        severity: "warn",
        forced: false,
        hasGit,
        cwd,
      });
      try {
        ctx?.ui?.notify?.(
          `gate checker: ${warnings.length} warning(s) — ${warnings.map((f) => f.rule).join(", ")}`,
          "info",
        );
      } catch {}
    }

    // --- no-progress abort ----------------------------------------------------
    // if a forced continuation produced exactly the same blocking failures as
    // the one before it, the agent cannot clear them. forcing again spends a
    // full response, and any subagent the retry spawns, to reproduce the same
    // text. this is the universal safety net: it ends the loop for every rule,
    // including rules not yet written.
    //
    // real defects change the failure text as the agent works. byte-identical
    // repetition is a mechanical signal, not a judgment call.
    const blockingKey =
      blocking.length === 0
        ? null
        : hashContent(
            blocking
              .map((f) => `${f.rule}::${f.detail}`)
              .sort()
              .join("\n"),
          );

    if (
      blockingKey !== null &&
      continuationCount > 0 &&
      blockingKey === lastBlockingKey
    ) {
      recordShape("released_with_failures", "stalemate");
      try {
        ctx?.ui?.notify?.(
          `gate checker: ${blocking.length} failure(s) unchanged after a retry — releasing. rules: ${[...new Set(blocking.map((f) => f.rule))].join(", ")}`,
          "warning",
        );
        ctx?.ui?.setStatus?.("gate", `⚠ ${blocking.length} failure(s) — released with failures (stalemate)`);
      } catch {}
      ledger.append("chain_end", {
        outcome: "released_with_failures",
        release_reason: "stalemate",
        continuations: continuationCount,
        rules: blocking.map((f) => f.rule),
        failures: blocking.map((f) => ({ rule: f.rule, detail: f.detail })),
        hasGit,
        cwd,
      });
      terminaljournal("released_with_failures", { release_reason: "stalemate" });
      continuationCount = 0;
      lastBlockingKey = null;
      return;
    }
    lastBlockingKey = blockingKey;

    // all blocking gates passed
    if (blocking.length === 0) {
      recordShape("gates_clean");
      try {
        ctx?.ui?.setStatus?.(
          "gate",
          hasGit ? "✓ gates passed" : "✓ gates passed · low: no git",
        );
      } catch {}
      // only worth a chain_end record if a chain was actually open — a clean
      if (continuationCount > 0) {
        ledger.append("chain_end", {
          outcome: "resolved",
          continuations: continuationCount,
          hasGit,
          cwd,
        });
      }
      terminaljournal(warnings.length > 0 ? "passed_with_warnings" : "passed");
      continuationCount = 0;
      lastBlockingKey = null;
      return;
    }

    // latch real friction only: a continuation forced by anything other than
    // the missing-record rule. the record rule is the gate's own coverage loop,
    // not agent friction, so it must not contaminate clean_under_errors.
    if (blocking.some((f) => f.rule !== "missing_frustration_record")) {
      evidence.hadblockingfailure = true;
    }
    const rules = blocking.map((f) => f.rule);
    continuationCount++;
    ledger.append("gate_eval", {
      rules,
      failures: blocking.map((f) => ({ rule: f.rule, detail: f.detail })),
      continuationCount,
      forced: continuationCount <= MAX_CONTINUATIONS,
      hasGit,
      cwd,
      subagents: evidence.subagents.length,
    });
    appendjournal("continuation", {
      continuation: continuationCount,
      failure_hash: blockingKey,
    });

    if (continuationCount > MAX_CONTINUATIONS) {
      recordShape("released_with_failures", "continuation_cap");
      try {
        ctx?.ui?.notify?.(
          `gate checker: ${blocking.length} unresolved failure(s) after ${continuationCount} continuations — review manually`,
          "warning",
        );
        ctx?.ui?.setStatus?.(
          "gate",
          `⚠ ${blocking.length} failures — released with failures (continuation cap)`,
        );
      } catch {}
      try {
        pi.appendEntry("omp.gate-checker.result", {
          failures: blocking,
          continuationCount,
          settled: true,
          ts: Date.now(),
        });
      } catch {}
      // a cap hit is the headline false-positive signal: a real defect gets
      // fixed within a retry or two, so burning every continuation and still
      // failing usually means the gate was wrong, not the agent.
      ledger.append("chain_end", {
        outcome: "released_with_failures",
        release_reason: "continuation_cap",
        continuations: continuationCount,
        rules,
        failures: blocking.map((f) => ({ rule: f.rule, detail: f.detail })),
        hasGit,
        cwd,
      });
      terminaljournal("released_with_failures", {
        release_reason: "continuation_cap",
      });
      // the chain ends here: the agent yields to the user despite the failures.
      // reset so the next request re-baselines at `agent_start` — otherwise the
      // latch would hold a stale baseline for the rest of the session and every
      // later request would trip the cap immediately.
      continuationCount = 0;
      lastBlockingKey = null;
      return;
    }

    try {
      ctx?.ui?.setStatus?.(
        "gate",
        `⚠ ${blocking.length} gate failure(s) — forcing continuation (${continuationCount}/${MAX_CONTINUATIONS})`,
      );
    } catch {}
    try {
      pi.appendEntry("omp.gate-checker.result", {
        failures: blocking,
        continuationCount,
        settled: false,
        ts: Date.now(),
      });
    } catch {}

    return {
      continue: true,
      additionalContext: formatFailures(blocking),
    };
  };
  // the one registered session_stop handler in this package. the harness runner
  // returns on the first qualifying continuation, so precedence is a line of code
  // here rather than a property of module load order.
  pi.on("session_stop", async (event: unknown, ctx: ExtensionContext): Promise<SessionStopResult | void> =>
    (await completionDecision(event, ctx))
    ?? (await questionnaireStop(event, ctx))
    ?? (await omnipotenceStop(event, ctx)),
  );
}
