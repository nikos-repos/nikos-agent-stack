// ============================================================================
// gate-checker — deterministic post-turn gate system for omp
// ============================================================================
// enforces two delivery-contract rules with machine-checkable post-conditions:
//   1. citation grounding — modification/test claims must match git diff
//   2. completion — changed files must not contain stubs/placeholders
//
// enforcement mechanism: the session_stop hook. before the agent yields, the
// gate runs. on failure it returns { continue: true, additionalContext } which
// forces the agent to keep working (runtime caps at 8 continuations).
//
// git awareness:
//   - agent_start captures HEAD baseline + dirty-file set (once per request)
//   - session_stop diffs baseline..now (covers committed AND uncommitted changes)
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
//   - enforces git-pushing skill standards deterministically at initiation
//
// staged enforcement:
//   - tool_result flags a forbidden marker the moment write/edit introduces it,
//     while the agent still has context — cheap fix, no full-response retry
//   - session_stop is the backstop for anything not caught inline
//
// every fire is appended to ~/.omp/gate-checker/ledger.jsonl (see ledger.js);
// `bun run gate-cli.js stats` summarizes it.
//
// install: lives at ~/.omp/agent/extensions/gate-checker/index.ts
//          auto-discovered by omp on startup — no fork, no config needed.
// optional: <cwd>/.omp/gates-markers.txt — one forbidden marker per line, # for comments
// ============================================================================

import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { existsSync, mkdtempSync, writeFileSync, rmSync, statSync } from "fs";
import { execSync } from "child_process";
import { dirname, isAbsolute, relative, resolve as resolvePath, sep } from "path";
import { homedir, tmpdir } from "os";
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
import { acquirelease, releaselease } from "./lease.js";

type GateLevel = "off" | "low" | "medium" | "high";
type RuleMode = "off" | "warn" | "block" | "auto";
interface GatePolicy {
  level: GateLevel;
  enabled: boolean;
  inline: boolean;
  completion: RuleMode;
  citation: RuleMode;
  snapshot: RuleMode;
  manifest: RuleMode;
  subagentClaim: RuleMode;
  verify: RuleMode;
  commit: RuleMode;
}

type AddedLine = { line: number; text: string };
type AddedMap = Map<string, AddedLine[]>;

// --- commit script path (resolved once at module load) ----------------------

const COMMIT_SCRIPT_PATH = resolvePath(
  homedir(),
  ".omp/agent/skills/git-pushing/scripts/smart_commit.sh",
);

// --- event shapes -----------------------------------------------------------

interface ToolCallEvent {
  toolName: string;
  toolCallId: string;
  input: Record<string, unknown>;
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
  };
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

interface GateFailure {
  gate: "citation" | "completion" | "verify" | "commit" | "journal" | "risk" | "lease";
  rule: string;
  detail: string;
  // "block" forces a continuation. "warn" is surfaced and recorded but never
  // stops the agent — for rules about how work was REPORTED, when the diff
  // already corroborates the work itself. A reporting-format rule must not
  // block delivery of tested, committed code.
  //
  // ponytail: optional, absent means "block". Every rule that can stop an agent
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

interface TurnEvidence {
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
  // content at FIRST touch, keyed by the path as the agent wrote it. null means
  // the file did not exist yet. only populated during no-git operation.
  preTouch: Map<string, string | null>;
  warnedRepoRoots: Set<string>;
  // content hashes of subagent reports already adjudicated in this request, so
  // a forced continuation cannot re-report the same subagent.
  judgedSubagents: Set<string>;
  // the delivery verify gate ran the configured command and it passed. That is
  // evidence a test claim is true, and it is what `ranTestRunner` cannot see:
  // the gate runs the command itself, not through the bash tool.
  verifyPassed: boolean;
  // markers already reported inline at tool_result, so session_stop does not
  // bill the agent twice for the same line.
  flaggedInline: Set<string>;
}

function freshEvidence(): TurnEvidence {
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
    verifyPassed: false,
    flaggedInline: new Set(),
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

function extractSnapshotRefs(
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

function extractModClaims(text: string): string[] {
  const paths: string[] = [];
  let m: RegExpExecArray | null;
  MOD_CLAIM_RE.lastIndex = 0;
  while ((m = MOD_CLAIM_RE.exec(text)) !== null) {
    paths.push(m[1]);
  }
  return [...new Set(paths)];
}

function claimsTestSuccess(text: string): boolean {
  return TEST_PASS_RE.test(text) || ALL_PASS_RE.test(text);
}

function ranTestRunner(ev: TurnEvidence): boolean {
  if (ev.verifyPassed) return true;
  return ev.bashCommands.some(
    (c) => TEST_RUNNER_RE.test(c.cmd) && !c.isError,
  );
}


// --- citation gate ----------------------------------------------------------

// Does the parent's final text lean on a subagent's report?
//
// The subagent rules exist to stop the parent repeating claims it did not
// verify. If the parent never refers to the delegated work, there is nothing to
// repeat — and the parent's OWN claims stay fully covered by
// `fabricated_modification`, `fabricated_test_result`, and the completion gate,
// none of which care who made the edit.
const SUBAGENT_REFERENCE_RE =
  /\b(sub-?agents?|reviewers?|review(?:ed|s)?\s+(?:by|agent)|delegat(?:e|ed|ion)|spawned\s+agents?|per\s+the\s+review|according\s+to\s+the\s+(?:review|agent)|the\s+agent\s+(?:reported|found|said|confirmed)|its?\s+report)\b/i;

function reliesOnSubagents(assistantText: string): boolean {
  return SUBAGENT_REFERENCE_RE.test(assistantText);
}

function checkCitations(
  assistantText: string,
  subagents: Array<SubagentEvidence | string>,
  changedFiles: Set<string>,
  ev: TurnEvidence,
  hasGit: boolean,
  cwd = ".",
  // Paths this run can actually adjudicate. null = authoritative for every path
  // (git diff sees all changes, however they were made). a set = no-git mode,
  // where only files we snapshotted at first touch are provable — a file edited
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

  // 3. subagent manifest + claims vs the diff
  //
  // Two gates guard this loop, both added after a run in which a manifest-less
  // subagent trapped the agent for six continuations:
  //
  //   reliance — the rule exists to stop the parent REPEATING unverified
  //     subagent claims. A parent that cites nothing repeats nothing. The
  //     failure text has always offered "verify its work yourself" as a
  //     resolution; until now the code ignored it, so obeying the instruction
  //     changed nothing.
  //
  //   already judged — evidence survives a forced continuation by design (the
  //     baseline latch), so without this every retry re-reported the same
  //     subagent AND any newly spawned one. The failure count grew 1 → 2 → 3 as
  //     the agent tried to comply. A gate that punishes the fix inverts itself.
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
      // Severity depends on whether the diff contradicts the subagent. A
      // read-only reviewer that changed nothing and claimed nothing is a
      // reporting-format issue, not a defect — it must not block delivery of
      // verified, committed work. A subagent whose claims disagree with the
      // diff is a different matter entirely.
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
// The predicate itself is checkAddedLines() in predicates.js — shared verbatim
// with the inline tool_result gate and the gate-cli cutover command. Only the
// way the added-line set is DERIVED differs: git diff when a repo exists,
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
  return [...new Set([declaredCwd, inputPath, existingDirectory(cwd)].filter(
    (candidate): candidate is string => candidate !== null,
  ))];
}

function isInside(root: string, path: string): boolean {
  const rel = relative(root, path);
  return rel === "" ||
    (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel));
}

// Derives the added-line set for a single write/edit call, so the inline gate
// judges exactly what this call introduced — never the rest of the file.
//
//  - edit  → `details.diff` is a unified diff (hunk headers, no `+++` line),
//            so real line numbers survive.
//  - write → replaces the file wholesale, so every line is authored now.
function inlineAdditions(
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

// --- commit routing (deterministic enforcement of git-pushing standards) ----

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

// --- direct smart_commit.sh invocation (fix 7) ------------------------------
//
// Commit routing used to intercept `git commit` only. An agent that read the
// git-pushing skill instead ran the script by the RELATIVE path the skill
// documents, which does not resolve from a project directory: exit 127, a
// filesystem hunt that burned a 300-second bash timeout, and a user
// interjection to supply the real path. The direct call also skipped the
// `--no-push` the rewrite adds, so it then failed against a repo with no
// remote.
//
// Any invocation naming the script now gets the absolute path and --no-push.
// The optional quote group matters: `\S*` alone swallows a surrounding quote,
// so an already-correct `bash '<abs>/smart_commit.sh'` compared unequal to the
// absolute path and got rewritten into `''<abs>''`.
// The leading boundary matters: without it `my_smart_commit.sh` matched and got
// rewritten into the real script.
const SMART_COMMIT_RE = /(['"]?)(?<![\w.-])((?:[^\s'"]*\/)?smart_commit\.sh)\1/;

function rewriteSmartCommit(command: string, scriptPath: string): string | null {
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

function rewriteGitCommit(command: string, scriptPath: string): string | null {
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

// --- delivery gates (verify + commit), armed by env var ---------------------
//
// The citation and completion gates already answer "did the work happen and is
// it finished?". The two questions they cannot answer are `verify` (do the
// tests pass?) and `commit` (is the work checkpointed?). This runs those two
// inline, so one always-on layer covers the whole delivery contract.
//
// Armed by env var, not by config file, so the trigger is the act of launching
// the omp-dev session — no heuristic decides whether the regime applies.
//
//   OMP_DELIVERY_GATES=1        arm both gates
//   OMP_VERIFY_CMD="bun test"   test command; UNSET = verify gate stays off
//
// Deliberately NOT defaulted to "npm test": guessing a test command in a repo
// that has none turns every session into a 6-retry block on a command that was
// never going to pass. An absent command means the user did not ask for the
// verify gate.

// Re-grades every failure through the engagement level, and drops the ones the
// level switches off. Applying the dial HERE, on the finished failure list,
// keeps predicates.js free of levels — gate-cli.js imports the same predicates
// and has no dial of its own.
function applyPolicy(failures: GateFailure[], policy: GatePolicy): GateFailure[] {
  const out: GateFailure[] = [];
  for (const f of failures) {
    const family = RULE_FAMILY[f.rule] as keyof GatePolicy | undefined;
    // An unmapped rule is a rule added without a policy entry. It stays at its
    // own severity rather than silently disappearing — a new rule must never
    // become invisible by omission.
    const mode = family ? (policy[family] as RuleMode) : "auto";
    if (mode === "off") continue;
    if (mode === "auto") out.push(f);
    else out.push({ ...f, severity: mode });
  }
  return out;
}

// PASS results only, keyed on the tree state. A forced continuation caused by
// some OTHER gate then does not re-run a suite that already went green.
//
// A FAILURE is never cached, and that asymmetry is the whole point. Any cache
// key is narrower than what a test command can actually read — an untracked
// fixture, a generated artifact, a gitignored `.env`. Reusing a stale failure
// therefore risks a gate the agent cannot clear by any edit, which is the exact
// trap this stack must not contain. Re-running a failing suite costs time;
// caching its failure costs the agent the whole request.
interface VerifyCache {
  key: string;
}

// `--untracked-files=normal`: a new file the agent just wrote is part of the
// state the test command sees, so it must move the key.
// A key that can never equal another. `Date.now()` alone collides inside the
// same millisecond, which would let the cache reuse a verdict for a state we
// explicitly could not measure.
let unknownStateSeq = 0;
const unknownState = (): string => `unknown:${Date.now()}:${unknownStateSeq++}`;

function treeStateKey(
  cwd: string,
  hasGit: boolean,
  touched: Map<string, string | null>,
): string {
  if (hasGit) {
    try {
      const out = execSync(
        "git rev-parse HEAD 2>/dev/null; git status --porcelain 2>/dev/null",
        { cwd, encoding: "utf-8", timeout: 5000, maxBuffer: 8 * 1024 * 1024 },
      );
      if (out.trim()) return hashContent(out);
    } catch {}
    return unknownState(); // never reuse a cached verdict for an unreadable tree
  }
  // No repo: key on the CURRENT content of every file this request touched.
  // Without this the key was a timestamp, so the suite re-ran on every
  // continuation — the exact repeated cost the cache exists to avoid.
  const parts: string[] = [];
  for (const rel of [...touched.keys()].sort()) {
    const abs = isAbsolute(rel) ? rel : resolvePath(cwd, rel);
    parts.push(`${rel}:${hashContent(readSnapshot(abs) ?? "")}`);
  }
  return parts.length > 0 ? hashContent(parts.join("\n")) : unknownState();
}

function runVerifyGate(cwd: string, cmd: string): GateFailure | null {
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

function runCommitGate(cwd: string): GateFailure | null {
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
// Measures how often a request was a bounded, verified, code-changing unit of
// work, WITHOUT changing how any request is handled. Measuring before acting is
// how this stack avoids the false-positive class it already shipped six times:
// an unmeasured gate is a guess.
//
// `bun run gate-cli.js stats` is the only consumer. The upper file bound is the
// honest part: a 40-file sweep is not a delivery unit, it is a migration.

const PROCESS_SHAPE_MAX_FILES = 8;

interface ProcessShape {
  matched: boolean;
  changed: number;
  testRan: boolean;
  // why it did not match — the near-miss reasons are what tell you whether the
  // threshold is wrong or the workload simply is not process-shaped
  reason: "no-changes" | "too-broad" | "no-test-run" | null;
}

function processShape(ev: TurnEvidence, changedCount: number): ProcessShape {
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

function formatFailures(failures: GateFailure[]): string {
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

// --- task-input injection nudge ---------------------------------------------

// The manifest requirement is stated FIRST and in full, because it is the only
// rule whose violation the subagent cannot talk its way around: an empty
// manifest is a valid answer, so there is no incentive to omit it.
const GATE_NUDGE =
  "[GATE CHECKER] your report MUST end with this exact block, listing every " +
  "file you changed, one path per line:\n" +
  `${MANIFEST_OPEN}\n` +
  "path/to/file.ts\n" +
  `${MANIFEST_CLOSE}\n` +
  "If you changed no files, emit the block empty — that is a valid answer. " +
  "The listed paths are checked against the real diff, so list exactly what " +
  "you changed: no more, no less.\n" +
  // A subagent bound to an output schema cannot emit free prose, so the block
  // alone was unreachable for it. Naming the JSON form here means the nudge
  // states something every subagent can actually do.
  `If your output is JSON, put the same list in a \`${MANIFEST_JSON_KEYS.join("\`/\`")}\` ` +
  "field instead — an empty array is the valid answer for a read-only task.\n\n" +
  "Also: (1) do not leave forbidden markers (TODO: implement, FIXME:, " +
  "NotImplementedError, stub/placeholder comments) in lines you add; " +
  "(2) do not claim test results you did not produce — the bash log is " +
  "checked; (3) if you commit, use the git-pushing skill script, not raw " +
  "git commit.\n\n";

// --- factory ----------------------------------------------------------------

// Dropped from 6 after a run that spent six forced continuations, four extra
// subagent spawns, and 39 messages on work that was already complete and
// correct. With the no-progress abort in place this is a second line of
// defense, not the primary one.
const MAX_CONTINUATIONS = 3;

export default function gateChecker(pi: ExtensionAPI): void {
  let evidence = freshEvidence();
  let continuationCount = 0;
  const commitRoutingEnabled = existsSync(COMMIT_SCRIPT_PATH);
  let config = loadConfig();
  let policy = policyFor(config.level) as GatePolicy;
  let verifyCache: VerifyCache | null = null;
  // blocking-failure fingerprint of the previous continuation (see fix 1)
  let lastBlockingKey: string | null = null;
  let requestId: string | null = null;
  let journalRecovery: string | null = null;
  const leaseOwnerId = randomUUID();
  const leaseEnabled = !["", "0", "false", "off"].includes(
    String(process.env.OMP_GATE_MUTATION_LEASE ?? "").trim().toLowerCase(),
  );
  let activeLease: Record<string, unknown> | null = null;
  let leaseConflict: Record<string, unknown> | null = null;

  const ensurelease = (cwd: string): void => {
    if (!leaseEnabled || !policy.enabled || !requestId || activeLease) return;
    const result = acquirelease({
      cwd,
      owner_id: leaseOwnerId,
      request_id: requestId,
    }) as Record<string, unknown>;
    if (result.acquired) {
      activeLease = result;
      leaseConflict = null;
    } else {
      leaseConflict = result;
    }
  };

  const policyfingerprint = (): string =>
    hashContent(`${config.level}\n${config.verifyCmd ?? ""}`);
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
      ensurelease(baseline.repo_root);
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
    const branch = ctx.sessionManager?.getBranch?.() ?? [];
    const state = journalfrombranch(branch);
    if (state.status !== "active") {
      if (activeLease) releaselease(activeLease);
      activeLease = null;
      leaseConflict = null;
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
    const current = capturebaseline(String(ctx.cwd ?? "."));
    if (
      state.policy_fingerprint !== policyfingerprint() ||
      (current.repo_root && current.repo_root !== state.repo_root) ||
      state.baseline_sha === null
    ) {
      if (activeLease) releaselease(activeLease);
      activeLease = null;
      leaseConflict = null;
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
    evidence = freshEvidence();
    journalRecovery = null;
    evidence.hadToolCalls = true;
    evidence.baselineSha = state.baseline_sha;
    evidence.baselineSnapshots = state.baseline_snapshots;
    evidence.baselineDirty = new Set(state.baseline_dirty);
    evidence.repoRoot = state.repo_root;
    ensurelease(state.repo_root);
  };
  const terminaljournal = (
    outcome: string,
    fields: Record<string, unknown> = {},
  ): void => {
    appendjournal("terminal", { outcome, ...fields });
    if (activeLease) releaselease(activeLease);
    activeLease = null;
    leaseConflict = null;
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
    recordprovenance(provenancefromlifecycle(payload) as SubagentEvidence | null);
  });

  const armingStatus = (): string => {
    if (!policy.enabled) return "gate: off";
    const bits = [`gate: ${config.level}`];
    if (policy.verify !== "off" && config.verifyCmd) bits.push(`verify: ${config.verifyCmd}`);
    if (policy.commit === "block") bits.push("commit required");
    return bits.join(" · ");
  };

  // Show the arming state the moment the session opens, BEFORE the first prompt
  // costs anything. Every other handler fires per request, so until this existed
  // the status bar stayed empty at startup and there was no way to tell an
  // unarmed session from an armed one except by spending a turn.
  pi.on("session_start", (_event: unknown, ctx: ExtensionContext) => {
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
    if (activeLease) releaselease(activeLease);
    activeLease = null;
  });

  // --- commands -------------------------------------------------------------
  // The level takes effect immediately, in this session, and persists to
  // CONFIG_PATH so the next session starts the same way. No restart.

  const applyLevel = (
    level: GateLevel,
    verifyCmd: string | null,
    ctx: ExtensionCommandContext,
  ): string => {
    const saved = saveConfig(level, verifyCmd);
    config = { level, verifyCmd, source: "config" };
    policy = policyFor(level) as GatePolicy;
    // A level change invalidates a cached verify verdict: the same tree can be
    // acceptable at one level and not at another.
    verifyCache = null;
    lastBlockingKey = null;
    try {
      ctx?.ui?.setStatus?.("gate", armingStatus());
    } catch {}
    const body = describeLevel(level, verifyCmd);
    return saved.ok
      ? `${body}\n\nsaved to ${CONFIG_PATH}`
      : `${body}\n\n⚠ active for this session only — could not write ${CONFIG_PATH}: ${saved.error}`;
  };

  pi.registerCommand("gates-engage", {
    description: "set the gate engagement level: low | medium | high [verify command]",
    getArgumentCompletions: (prefix: string) =>
      ["low", "medium", "high"]
        .filter((l) => l.startsWith(prefix.trim().toLowerCase()))
        .map((l) => ({ value: l, label: l })),
    handler: async (args: string, ctx: ExtensionCommandContext): Promise<void> => {
      const parts = args.trim().split(/\s+/).filter(Boolean);
      const level = String(parts[0] ?? "").toLowerCase() as GateLevel;
      // A verify command may contain spaces, so everything after the level is it.
      const cmd = parts.slice(1).join(" ").trim() || config.verifyCmd;

      if (!parts.length) {
        // No argument is a question, not a mistake — report the current state.
        ctx?.ui?.notify?.(
          `${describeLevel(config.level, config.verifyCmd)}\n\n` +
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
      ctx?.ui?.notify?.(applyLevel(level, cmd, ctx), "info");
    },
  });

  pi.registerCommand("gates-disable", {
    description: "turn every gate off (re-enable with /gates-engage medium)",
    handler: async (_args: string, ctx: ExtensionCommandContext): Promise<void> => {
      ctx?.ui?.notify?.(applyLevel("off", config.verifyCmd, ctx), "warning");
    },
  });

  // Reset the ledger + capture the git baseline once per user request.
  //
  // `agent_start` (not `turn_start`) is the right seam: `turn_start` fires for
  // every LLM turn, but `session_stop` only fires when the whole run settles.
  // Re-baselining per turn meant files edited in turn 1 were "already dirty" by
  // turn 3, got subtracted from the diff, and every honest claim about them was
  // reported as fabricated — a false-positive block on any multi-turn task.
  // It also wiped the bash/snapshot ledgers that later turns cite.
  //
  // A forced continuation re-enters through `agent_start` too, so the baseline
  // is latched while a continuation chain is open (continuationCount > 0);
  // otherwise the retry would measure only the retry's own edits and the cap
  // would never advance.
  pi.on("agent_start", (_event: unknown, ctx: ExtensionContext) => {
    const cwd = String(ctx?.cwd ?? ".");
    if (requestId || continuationCount > 0) {
      if (evidence.repoRoot) ensurelease(evidence.repoRoot);
      return;
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
      policy_fingerprint: policyfingerprint(),
    });
    if (baseline.repo_root) ensurelease(baseline.repo_root);

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
    const { toolName, input } = event;

    bindrepository(input, ctx);

    reportrepositorylimit(input, ctx);
    if (leaseConflict) {
      let isolated = input?.isolated === true;
      if (toolName === "task" && Array.isArray(input?.tasks)) {
        isolated = input.tasks.length > 0 && input.tasks.every(
          (item) =>
            Boolean(item) &&
            typeof item === "object" &&
            "isolated" in item &&
            item.isolated === true,
        );
      }
      const mutating = toolName === "write" || toolName === "edit" ||
        toolName === "bash" || (toolName === "task" && !isolated);
      if (mutating) {
        let owner = "another gate-aware session";
        const conflict = leaseConflict.conflict;
        if (
          conflict &&
          typeof conflict === "object" &&
          "owner_id" in conflict &&
          typeof conflict.owner_id === "string"
        ) owner = conflict.owner_id;
        return {
          block: true,
          reason: `mutation lease held by ${owner}; retry after that session releases it`,
        };
      }
    }

    if (toolName === "ask") evidence.askedUser = true;

    if ((toolName === "write" || toolName === "edit") && input?.path) {
      const relPath = String(input.path);
      evidence.filesTouched.add(relPath);

      // Snapshot before mutation when git cannot cover the path. This retains
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
      if (input.tasks && Array.isArray(input.tasks)) {
        const context = String(input.context ?? "");
        return { input: { ...input, context: GATE_NUDGE + context } };
      }
      const task = String(input.task ?? "");
      return { input: { ...input, task: GATE_NUDGE + task } };
    }
  });

  pi.on("tool_result", async (event: ToolResultEvent, ctx: ExtensionContext): Promise<ToolResultEventResult | void> => {
    const { toolName, content, isError, input, details } = event;

    // capture snapshot tags from read/edit results
    if (toolName === "read" || toolName === "edit") {
      const text = extractText(content);
      const refs = extractSnapshotRefs(text);
      for (const r of refs) evidence.snapshotTags.add(r.tag);
    }

    // --- inline completion gate ---------------------------------------------
    // Flag a forbidden marker the moment write/edit introduces it. session_stop
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

  // run gates before the agent yields — the enforcement point
  pi.on("session_stop", async (_event: unknown, ctx: ExtensionContext): Promise<SessionStopResult | void> => {
    // Any path that does not return `{ continue: true }` ends the continuation
    // chain, so it must clear the counter that latches the baseline.
    if (!policy.enabled) {
      terminaljournal("skipped_disabled");
      return void (continuationCount = 0);
    }
    if (!evidence.hadToolCalls && !journalRecovery) {
      terminaljournal("skipped_no_tools");
      return void (continuationCount = 0);
    }
    if (evidence.askedUser && !journalRecovery) {
      terminaljournal("skipped_user_question");
      return void (continuationCount = 0);
    }

    const cwd = String(ctx?.cwd ?? ".");
    const assistantText = getLastAssistantText(ctx) ?? "";
    if (!assistantText && !journalRecovery) {
      terminaljournal("skipped_no_assistant_text");
      return void (continuationCount = 0);
    }

    const hasGit = evidence.baselineSha !== null;
    const markers = loadForbiddenMarkers(evidence.repoRoot ?? cwd);

    const failures: GateFailure[] = [];
    const gitCwd = evidence.repoRoot ?? cwd;
    if (leaseConflict) {
      failures.push({
        gate: "lease",
        rule: "mutation_lease_conflict",
        detail:
          "another gate-aware session holds the repository mutation lease. " +
          "wait for it to finish, then retry without bypassing the native tools.",
      });
    }
    if (journalRecovery) {
      failures.push({
        gate: "journal",
        rule: "recovery_required",
        detail: journalRecovery,
      });
    }

    // --- derive what this request changed ------------------------------------
    // Hoisted out of the gates so the delivery gates can run FIRST. Ordering
    // matters: `fabricated_test_result` fires when the agent claims tests pass
    // without evidence, and the verify gate IS that evidence. Running the
    // citation gate first flagged a true claim as a fabrication.
    let changedFiles = new Set<string>();
    let added: AddedMap = new Map();
    let watched: Set<string> | null = null;
    // git present but unreadable (corrupt index, permissions, a ref that will
    // not resolve). Judging nothing is the only honest verdict: an empty
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

    // --- delivery gates: verify + commit -------------------------------------
    // Change-gated, so a read-only or exploratory request is never asked to
    // pass tests or commit.
    if (policy.enabled && canAdjudicate && changedCount > 0) {
      // The verify gate does NOT need git — running a test suite is unrelated
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
          // A passing verify run IS evidence that the tests pass, so a claim to
          // that effect is grounded. Recorded before the citation gate reads it.
          //
          // Assigned, never OR-ed: evidence survives a forced continuation by
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
      }

      // The commit gate genuinely needs git, and stays off below "high":
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
    // Re-grade everything through the dial before anything acts on severity.
    const graded = applyPolicy(failures, policy);

    // --- severity partition (fix 5) ------------------------------------------
    // Only blocking failures can force a continuation. Warnings are surfaced
    // and recorded, then the agent yields — a rule about how work was REPORTED
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

    // --- no-progress abort (fix 1) -------------------------------------------
    // If a forced continuation produced exactly the same blocking failures as
    // the one before it, the agent cannot clear them. Forcing again spends a
    // full response, and any subagent the retry spawns, to reproduce the same
    // text. This is the universal safety net: it ends the loop for every rule,
    // including rules not yet written.
    //
    // Real defects change the failure text as the agent works. Byte-identical
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
      // Only worth a chain_end record if a chain was actually open — a clean
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

    continuationCount++;
    const rules = blocking.map((f) => f.rule);
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
      // A cap hit is the headline false-positive signal: a real defect gets
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
      // The chain ends here: the agent yields to the user despite the failures.
      // Reset so the next request re-baselines at `agent_start` — otherwise the
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
  });
}

// --- self-check (run: bun run index.ts) -------------------------------------

if (import.meta.main) {
  let pass = 0;
  let fail = 0;
  function check(name: string, cond: boolean) {
    if (cond) {
      pass++;
    } else {
      fail++;
      console.error(`  FAIL: ${name}`);
    }
  }

  // extractSnapshotRefs
  const refs = extractSnapshotRefs("edited [foo.ts#A1B2] and [bar.py#C3D4]");
  check("extracts two snapshot refs", refs.length === 2);
  check("tag is uppercased", refs[0].tag === "A1B2");

  // extractModClaims
  const mods = extractModClaims(
    "I updated `src/foo.ts` and changed `lib/bar.py`",
  );
  check("extracts two mod claims", mods.length === 2);
  check("first claim is foo.ts", mods[0] === "src/foo.ts");

  // claimsTestSuccess
  check("detects 'tests passed'", claimsTestSuccess("all tests passed successfully"));
  check("detects 'suite passes'", claimsTestSuccess("the test suite passes"));
  check("ignores unrelated text", !claimsTestSuccess("the function returns a value"));

  // ranTestRunner
  const ev = freshEvidence();
  ev.bashCommands.push({ cmd: "npm test", isError: false });
  check("detects npm test", ranTestRunner(ev));
  ev.bashCommands.push({ cmd: "pytest -xvs", isError: false });
  check("detects pytest", ranTestRunner(ev));
  const evNoTest = freshEvidence();
  evNoTest.bashCommands.push({ cmd: "echo hello", isError: false });
  check("no false positive on echo", !ranTestRunner(evNoTest));

  // checkAddedLines — real stubs caught (shared predicate, both layers)
  const hits = checkAddedLines(
    contentToAdded("f.py", "line1\n// FIXME: broken\ndef foo():\n    pass  # stub\n"),
    DEFAULT_FORBIDDEN_MARKERS,
  );
  check("finds FIXME:", hits.some((h) => h.detail.includes('"fixme:"')));
  check("finds pass stub", hits.some((h) => h.detail.includes('"pass  # "')));
  check(
    "correct line for FIXME",
    hits.some((h) => h.detail.includes('"fixme:"') && h.detail.includes("line 2")),
  );

  // checkAddedLines — false-positive guard: legitimate code NOT flagged
  const legitCode = [
    'test("stub server returns 200", () => {',
    'const stub = sinon.stub();',
    'const noop = () => {};',
    'const PLACEHOLDER_USER_ID = "user";',
  ];
  for (const line of legitCode) {
    const falseHits = checkAddedLines(
      contentToAdded("f.ts", line),
      DEFAULT_FORBIDDEN_MARKERS,
    );
    check(
      `no false positive: ${line.substring(0, 40)}`,
      falseHits.length === 0,
    );
  }

  // ranTestRunner — bun/node --test coverage
  {
    const evBun = freshEvidence();
    evBun.bashCommands.push({ cmd: "bun test", isError: false });
    check("detects bun test", ranTestRunner(evBun));
    const evNode = freshEvidence();
    evNode.bashCommands.push({ cmd: "node --test", isError: false });
    check("detects node --test", ranTestRunner(evNode));
    const evBunRun = freshEvidence();
    evBunRun.bashCommands.push({ cmd: "bun run test", isError: false });
    check("detects bun run test", ranTestRunner(evBunRun));
  }

  // citation gate — fabricated modification (parent)
  {
    const changed = new Set(["src/real.ts"]);
    const evCite = freshEvidence();
    const citeFailures = checkCitations(
      "I modified `src/fake.ts` and updated `src/real.ts`",
      [],
      changed,
      evCite,
      true,
    );
    check(
      "flags fabricated mod",
      citeFailures.some(
        (f) => f.rule === "fabricated_modification" && f.detail.includes("src/fake.ts"),
      ),
    );
    check(
      "does not flag real mod",
      !citeFailures.some((f) => f.detail.includes("src/real.ts")),
    );
  }

  // citation gate — non-file backtick tokens NOT flagged (bug 1 fix)
  {
    const changed = new Set();
    const evNonFile = freshEvidence();
    const nonFileFailures = checkCitations(
      "I replaced `var` with `let` and refactored `handleError`",
      [],
      changed,
      evNonFile,
      true,
    );
    check(
      "non-file token 'var' not flagged",
      !nonFileFailures.some((f) => f.detail.includes("var")),
    );
    check(
      "non-file token 'handleError' not flagged",
      !nonFileFailures.some((f) => f.detail.includes("handleError")),
    );
  }

  // citation gate — no git: skip mod claims
  {
    const evNoGit = freshEvidence();
    const noGitFailures = checkCitations(
      "I modified `src/fake.ts`",
      [],
      new Set(),
      evNoGit,
      false,
    );
    check(
      "no-git: does not flag mod claims",
      !noGitFailures.some((f) => f.rule === "fabricated_modification"),
    );
  }

  // citation gate — fabricated test result
  {
    const evTest = freshEvidence();
    const testFailures = checkCitations("all tests passed", [], new Set(), evTest, true);
    check(
      "flags fabricated test claim",
      testFailures.some((f) => f.rule === "fabricated_test_result"),
    );
  }

  // citation gate — real test result passes
  {
    const evReal = freshEvidence();
    evReal.bashCommands.push({ cmd: "npm test", isError: false });
    check(
      "real test claim passes",
      checkCitations("all tests passed", [], new Set(), evReal, true).length === 0,
    );
  }

  // citation gate — subagent fabricated modification
  {
    const changed = new Set(["src/real.ts"]);
    const evSub = freshEvidence();
    const subFailures = checkCitations(
      "the reviewer subagent reported its findings",
      ["I updated `src/fake.ts` and all tests passed"],
      changed,
      evSub,
      true,
    );
    check(
      "flags subagent fabricated mod",
      subFailures.some((f) => f.rule === "subagent_fabricated_modification"),
    );
    check(
      "flags subagent unverified test",
      subFailures.some((f) => f.rule === "subagent_unverified_test"),
    );
  }

  // citation gate — subagent real claims
  {
    const changed = new Set(["src/auth.ts"]);
    const evSubOk = freshEvidence();
    evSubOk.bashCommands.push({ cmd: "npm test", isError: false });
    const subOkFailures = checkCitations(
      "the reviewer subagent reported its findings",
      ["I updated `src/auth.ts` and all tests passed"],
      changed,
      evSubOk,
      true,
    );
    check(
      "subagent real mod passes",
      !subOkFailures.some((f) => f.rule === "subagent_fabricated_modification"),
    );
    check(
      "subagent verified test passes",
      !subOkFailures.some((f) => f.rule === "subagent_unverified_test"),
    );
  }

  // formatFailures
  const formatted = formatFailures([
    { gate: "completion", rule: "forbidden_marker", detail: "test detail" },
  ]);
  check("formatted output has header", formatted.includes("[GATE CHECKER"));
  check("formatted output has detail", formatted.includes("test detail"));

  // GATE_NUDGE
  check("gate nudge is non-empty", GATE_NUDGE.length > 0);
  check("gate nudge mentions markers", GATE_NUDGE.includes("forbidden markers"));
  check("gate nudge mentions commit script", GATE_NUDGE.includes("git-pushing"));

  // --- commit routing (addition 5) ---

  // simple commit with message
  {
    const result = rewriteGitCommit(
      'git commit -m "feat: add auth"',
      "/path/to/smart_commit.sh",
    );
    check("rewrites simple commit", result !== null);
    check("rewrite uses script", result?.includes("smart_commit.sh") ?? false);
    check("rewrite includes message", result?.includes("feat: add auth") ?? false);
    check("rewrite uses --no-push", result?.includes("--no-push") ?? false);
  }

  // git add && git commit → removes git add, keeps script
  {
    const result = rewriteGitCommit(
      'git add . && git commit -m "fix: bug"',
      "/path/to/smart_commit.sh",
    );
    check("compound add+commit rewrites", result !== null && result.includes("smart_commit.sh"));
    check("compound removes git add", !result?.includes("git add"));
    check("compound includes message", result?.includes("fix: bug") ?? false);
  }

  // compound with trailing command → preserves trailing
  {
    const result = rewriteGitCommit(
      'git commit -m "test: add tests" && npm run build',
      "/path/to/smart_commit.sh",
    );
    check("preserves trailing command", result?.includes("npm run build") ?? false);
    check("rewrites commit portion", result?.includes("smart_commit.sh") ?? false);
  }

  // commit with single quotes
  {
    const result = rewriteGitCommit(
      "git commit -m 'docs: update readme'",
      "/path/to/smart_commit.sh",
    );
    check("handles single-quoted message", result?.includes("docs: update readme") ?? false);
  }

  // commit without message → script auto-generates
  {
    const result = rewriteGitCommit("git commit", "/path/to/smart_commit.sh");
    check("no-message commit rewrites", result !== null && result.includes("smart_commit.sh"));
    check(
      "no-message rewrite omits message arg",
      result === "bash '/path/to/smart_commit.sh' --no-push",
    );
  }

  // not a git commit → returns null
  check("non-commit returns null", rewriteGitCommit("npm test", "/p/s.sh") === null);
  check("git status returns null", rewriteGitCommit("git status", "/p/s.sh") === null);

  // commit-tree and --amend → not matched
  check("commit-tree not matched", rewriteGitCommit("git commit-tree HEAD", "/p/s.sh") === null);
  check(
    "--amend not matched",
    rewriteGitCommit('git commit --amend -m "fix"', "/p/s.sh") === null,
  );

  // message with apostrophe → safely escaped
  {
    const result = rewriteGitCommit(
      'git commit -m "fix: handle user\'s input"',
      "/path/to/smart_commit.sh",
    );
    check("apostrophe in message handled", result !== null && result.includes("--no-push"));
  }

  // bug 2 fix: echo/sed/grep containing 'git commit' → not matched
  check("echo git commit not matched", rewriteGitCommit('echo "git commit"', "/p/s.sh") === null);
  check("grep git commit not matched", rewriteGitCommit('grep "git commit" log.txt', "/p/s.sh") === null);
  check("sed git commit not matched", rewriteGitCommit('sed "s/git commit/x/g"', "/p/s.sh") === null);

  // bug 4 fix: semicolon inside quoted message → handled correctly
  {
    const result = rewriteGitCommit(
      'git commit -m "fix: handle a; b; c"',
      "/path/to/smart_commit.sh",
    );
    check(
      "semicolon in message: full message preserved",
      result?.includes("handle a; b; c") ?? false,
    );
    check(
      "semicolon in message: no broken trailing",
      !result?.includes('c"') || result?.includes("handle a; b; c"),
    );
  }

  // bug 1 fix: non-file mod claims not extracted
  {
    const nonFile = extractModClaims("I replaced `var` with `let` and changed `MAX_RETRIES`");
    check("non-file 'var' not extracted", !nonFile.includes("var"));
    check("non-file 'MAX_RETRIES' not extracted", !nonFile.includes("MAX_RETRIES"));
    const realFiles = extractModClaims("I updated `src/foo.ts` and `lib/bar.py`");
    check("real file still extracted", realFiles.includes("src/foo.ts"));
  }

  // regression: commit rewrite must actually invoke the script. a prior edit
  // dropped `parts.push(scriptCall)`, so every rewrite returned "" and the
  // falsy check in the tool_call handler silently disabled commit routing.
  {
    const r = rewriteGitCommit('git commit -m "feat: x"', "/s/smart_commit.sh");
    check("rewrite is non-empty", (r?.length ?? 0) > 0);
    check("rewrite invokes the script", r?.includes("smart_commit.sh") ?? false);
  }

  // regression: completion gate must judge only ADDED lines. a pre-existing
  // marker on an untouched line used to block the agent in a loop it could
  // not escape without editing unrelated code.
  {
    const diff = [
      "diff --git a/src/legacy.py b/src/legacy.py",
      "--- a/src/legacy.py",
      "+++ b/src/legacy.py",
      "@@ -3,0 +4,2 @@",
      "+def g():",
      "+    return 2",
    ].join("\n");
    const added = new Map<string, Array<{ line: number; text: string }>>();
    parseDiffAdditions(diff, added);
    check("diff parsed to one file", added.size === 1);
    check("added lines captured", (added.get("src/legacy.py")?.length ?? 0) === 2);
    check(
      "added line numbers are new-file numbers",
      added.get("src/legacy.py")?.[0]?.line === 4,
    );
    check(
      "pre-existing marker not flagged",
      checkAddedLines(added, DEFAULT_FORBIDDEN_MARKERS).length === 0,
    );

    const withMarker = new Map<string, Array<{ line: number; text: string }>>();
    parseDiffAdditions(
      [
        "--- a/src/new.py",
        "+++ b/src/new.py",
        "@@ -0,0 +1,1 @@",
        "+    # TODO: implement later",
      ].join("\n"),
      withMarker,
    );
    check(
      "newly added marker still flagged",
      checkAddedLines(withMarker, DEFAULT_FORBIDDEN_MARKERS).length === 1,
    );
  }

  // regression: git reports repo-root-relative paths, but the agent writes
  // cwd-relative ones. running omp from a subdirectory used to mark every
  // honest claim fabricated.
  {
    const changed = new Set(["src/sub/a.txt"]);
    const fromRoot = makeClaimMatcher(changed, "/repo", "/repo");
    check("root cwd: claim matches", fromRoot("src/sub/a.txt"));
    const fromSub = makeClaimMatcher(changed, "/repo", "/repo/src");
    check("subdir cwd: cwd-relative claim matches", fromSub("sub/a.txt"));
    check("subdir cwd: root-relative claim still matches", fromSub("src/sub/a.txt"));
    check("subdir cwd: absolute claim matches", fromSub("/repo/src/sub/a.txt"));
    check("unrelated claim still rejected", !fromSub("other/z.txt"));
    // no repo root keeps the plain string comparison
    check("no repo root: plain compare", makeClaimMatcher(changed, null, "/x")("src/sub/a.txt"));
  }

  // --- subagent manifest (the anti-reward-hacking contract) -----------------
  {
    const ok = extractManifest(
      `Did the work.\n${MANIFEST_OPEN}\nsrc/a.ts\n- \`src/b.ts\`\n${MANIFEST_CLOSE}\n`,
    );
    check("manifest parsed", ok !== null && ok.length === 2);
    check("manifest strips bullets/backticks", ok?.[1] === "src/b.ts");

    const empty = extractManifest(`Nothing to change.\n${MANIFEST_OPEN}\n${MANIFEST_CLOSE}`);
    check("empty manifest is valid, not missing", empty !== null && empty.length === 0);
    check(
      "'none' is treated as empty",
      extractManifest(`${MANIFEST_OPEN}\nnone\n${MANIFEST_CLOSE}`)?.length === 0,
    );
    check("missing manifest returns null", extractManifest("I updated some files.") === null);
    check(
      "unterminated manifest returns null",
      extractManifest(`${MANIFEST_OPEN}\nsrc/a.ts`) === null,
    );

    // vague prose used to pass the citation gate entirely — now it fails
    const ev = freshEvidence();
    const vague = checkCitations(
      "per the review, done",
      ["I updated the relevant files."],
      new Set(),
      ev,
      true,
    );
    check(
      "vague subagent report now fails",
      vague.some((f) => f.rule === "subagent_missing_manifest"),
    );

    // a manifest naming a file the diff does not contain is caught
    const lying = checkCitations(
      "per the review, done",
      [`${MANIFEST_OPEN}\nsrc/ghost.ts\n${MANIFEST_CLOSE}`],
      new Set(["src/real.ts"]),
      ev,
      true,
    );
    check(
      "manifest mismatch caught",
      lying.some((f) => f.rule === "subagent_manifest_mismatch"),
    );

    // an honest manifest passes clean
    const honest = checkCitations(
      "per the review, done",
      [`${MANIFEST_OPEN}\nsrc/real.ts\n${MANIFEST_CLOSE}`],
      new Set(["src/real.ts"]),
      ev,
      true,
    );
    check("honest manifest passes", honest.length === 0);

    // read-only subagent: empty manifest, no changes, no failure
    const readOnly = checkCitations(
      "done",
      [`Found it in the parser.\n${MANIFEST_OPEN}\n${MANIFEST_CLOSE}`],
      new Set(),
      ev,
      true,
    );
    check("read-only subagent passes with empty manifest", readOnly.length === 0);
  }

  // --- inline completion gate (fires at tool_result, not session_stop) ------
  {
    // edit: details.diff is a unified diff with no `+++` line
    const diff = ["@@ -10,0 +11,2 @@", "+def g():", "+    # TODO: implement", ""].join("\n");
    const added = inlineAdditions("edit", "src/x.py", {}, { diff });
    check("edit diff parsed with fallback path", added?.has("src/x.py") ?? false);
    check(
      "inline gate flags the marker the edit introduced",
      checkAddedLines(added ?? new Map(), DEFAULT_FORBIDDEN_MARKERS).length === 1,
    );
    check(
      "inline line number comes from the hunk header",
      checkAddedLines(added ?? new Map(), DEFAULT_FORBIDDEN_MARKERS)[0]?.detail.includes(
        "line 12",
      ),
    );

    // write: whole content is authored now
    const w = inlineAdditions("write", "src/y.ts", { content: "const a = 1;\n// stub\n" }, {});
    check(
      "write content scanned",
      checkAddedLines(w ?? new Map(), DEFAULT_FORBIDDEN_MARKERS).length === 1,
    );
    const clean = inlineAdditions("write", "src/z.ts", { content: "const a = 1;\n" }, {});
    check(
      "clean write not flagged",
      checkAddedLines(clean ?? new Map(), DEFAULT_FORBIDDEN_MARKERS).length === 0,
    );
    check("no path yields no additions", inlineAdditions("write", "", {}, {}) === null);
  }

  // --- no-git mode: content hashing replaces the whole-file scan ------------
  {
    const before = "def a():\n    # TODO: implement\n    pass\n";
    const afterClean = before + "\ndef b():\n    return 1\n";
    // a pre-existing marker in an untouched line must NOT be reported
    check(
      "no git: pre-existing marker not flagged",
      checkAddedLines(
        diffByLineSet("m.py", before, afterClean),
        DEFAULT_FORBIDDEN_MARKERS,
      ).length === 0,
    );
    // but a newly added one is
    check(
      "no git: newly added marker flagged",
      checkAddedLines(
        diffByLineSet("m.py", before, before + "\n// stub\n"),
        DEFAULT_FORBIDDEN_MARKERS,
      ).length === 1,
    );
    check(
      "no git: duplicate marker addition is flagged",
      checkAddedLines(
        diffByLineSet("m.py", before, `${before}${before.split("\n")[1]}\n`),
        DEFAULT_FORBIDDEN_MARKERS,
      ).length === 1,
    );
    check(
      "no git: identical content yields no additions",
      diffByLineSet("m.py", before, before).size === 0,
    );
    check("hash is stable", hashContent("abc") === hashContent("abc"));
    check("hash distinguishes content", hashContent("abc") !== hashContent("abd"));
  }

  const tmpCfg = resolvePath(mkdtempSync(resolvePath(tmpdir(), "gate-cfg-")), "config.json");

  // --- delivery gates (verify + commit) -------------------------------------
  {
    // arming, now via the engagement dial
    check("default level is medium", loadConfig({}, tmpCfg).level === "medium");
    check(
      "OMP_GATES_LEVEL selects a level",
      loadConfig({ OMP_GATES_LEVEL: "low" }, tmpCfg).level === "low",
    );
    check(
      "an unknown OMP_GATES_LEVEL falls back to the default",
      loadConfig({ OMP_GATES_LEVEL: "paranoid" }, tmpCfg).level === "medium",
    );
    // the old env var armed verify + commit, which is exactly what high does
    check(
      "legacy OMP_DELIVERY_GATES maps to high",
      loadConfig({ OMP_DELIVERY_GATES: "1" }, tmpCfg).level === "high",
    );
    check(
      "OMP_DELIVERY_GATES=0 does not arm",
      loadConfig({ OMP_DELIVERY_GATES: "0" }, tmpCfg).level === "medium",
    );
    // an absent verify command must NOT become "npm test" — guessing turns a
    // repo with no test runner into a permanent retry block
    check("verify command is null when unset", loadConfig({}, tmpCfg).verifyCmd === null);
    check(
      "verify command read from env",
      loadConfig({ OMP_VERIFY_CMD: "bun test" }, tmpCfg).verifyCmd === "bun test",
    );

    // predicates, against a real throwaway repo
    const tmp = mkdtempSync(resolvePath(tmpdir(), "gate-delivery-"));
    const git = (c: string) =>
      execSync(c, { cwd: tmp, encoding: "utf-8", stdio: "pipe" });
    git("git init -q .");
    git("git config user.email t@t.t && git config user.name t");
    writeFileSync(resolvePath(tmp, "a.txt"), "one\n");
    git("git add -A && git commit -q -m init");

    check("commit gate passes on a clean tree", runCommitGate(tmp) === null);
    writeFileSync(resolvePath(tmp, "a.txt"), "two\n");
    check("commit gate fails on a dirty tree", runCommitGate(tmp)?.rule === "uncommitted_changes");
    // untracked files must not block: the diffs the rest of the stack reads do
    // not report them either, so blocking here would be unfixable-by-committing
    git("git checkout -- a.txt");
    writeFileSync(resolvePath(tmp, "scratch.log"), "noise\n");
    check("commit gate ignores untracked files", runCommitGate(tmp) === null);

    check("verify gate passes on exit 0", runVerifyGate(tmp, "true") === null);
    const vf = runVerifyGate(tmp, "echo boom >&2; exit 1");
    check("verify gate fails on non-zero exit", vf?.rule === "verify_failed");
    check("verify failure carries the output", vf?.detail.includes("boom") ?? false);

    // the cache key must move whenever the tree moves, or a retry could reuse a
    // stale verdict and the agent would never clear the gate
    const none = new Map<string, string | null>();
    const k1 = treeStateKey(tmp, true, none);
    check("tree state key is stable when nothing changes", treeStateKey(tmp, true, none) === k1);
    writeFileSync(resolvePath(tmp, "a.txt"), "three\n");
    check("tree state key moves when a tracked file changes", treeStateKey(tmp, true, none) !== k1);
    // untracked files count: a test command reads the whole tree, not just the
    // index, so a new fixture file must invalidate the cached verdict
    const k2 = treeStateKey(tmp, true, none);
    writeFileSync(resolvePath(tmp, "fixture.json"), "{}\n");
    check("tree state key moves when an untracked file appears", treeStateKey(tmp, true, none) !== k2);

    // no repo: the key comes from the touched files, so the verify cache still
    // works and the suite does not re-run on every continuation
    const touched = new Map<string, string | null>([["a.txt", null]]);
    const n1 = treeStateKey(tmp, false, touched);
    check("no-git key is stable when the file is unchanged", treeStateKey(tmp, false, touched) === n1);
    writeFileSync(resolvePath(tmp, "a.txt"), "four\n");
    check("no-git key moves when the file changes", treeStateKey(tmp, false, touched) !== n1);
    check(
      "no-git key with nothing touched never caches",
      treeStateKey(tmp, false, none) !== treeStateKey(tmp, false, none),
    );

    rmSync(tmp, { recursive: true, force: true });
  }

  // --- "a process should have run" detector ---------------------------------
  {
    const ev = (cmds: string[]): TurnEvidence => {
      const e = freshEvidence();
      e.bashCommands = cmds.map((cmd) => ({ cmd, isError: false }));
      return e;
    };
    const withTests = ev(["bun test"]);
    const noTests = ev(["ls -la"]);

    check("shape matches a bounded verified change", processShape(withTests, 3).matched);
    check(
      "shape rejects a request that changed nothing",
      processShape(withTests, 0).reason === "no-changes",
    );
    check(
      "shape rejects a sweep wider than the process can accept",
      processShape(withTests, PROCESS_SHAPE_MAX_FILES + 1).reason === "too-broad",
    );
    check(
      "shape accepts exactly the file bound",
      processShape(withTests, PROCESS_SHAPE_MAX_FILES).matched,
    );
    check(
      "shape rejects an unverified change",
      processShape(noTests, 3).reason === "no-test-run",
    );
    // a failed test run is not a test run — the process verifies, it does not
    // merely invoke
    const failedTests = freshEvidence();
    failedTests.bashCommands = [{ cmd: "bun test", isError: true }];
    check(
      "shape rejects a failed test command",
      processShape(failedTests, 3).reason === "no-test-run",
    );
    check("shape reports the change count", processShape(withTests, 5).changed === 5);
    check("matched shape carries no reason", processShape(withTests, 1).reason === null);

    // aggregation: the rate and the miss breakdown are what drive the phase 3
    // decision, so they must survive the round trip through the ledger
    const s = ledger.summarize([
      { event: "process_shape", matched: true, reason: null },
      { event: "process_shape", matched: false, reason: "no-changes" },
      { event: "process_shape", matched: false, reason: "no-changes" },
      { event: "process_shape", matched: false, reason: "too-broad" },
    ]);
    check("ledger counts shape requests", s.shapeRequests === 4);
    check("ledger counts shape matches", s.shapeMatched === 1);
    check("ledger computes the match rate", s.shapeMatchRate === 0.25);
    check("ledger groups misses by reason", s.shapeMissBy["no-changes"] === 2);
    check("empty ledger yields a zero rate", ledger.summarize([]).shapeMatchRate === 0);
  }

  // --- fix 3: a manifest must be recoverable from a JSON subagent report ----
  {
    check(
      "json array manifest recovered",
      JSON.stringify(extractManifest('{"changed": ["src/a.ts"]}')) === '["src/a.ts"]',
    );
    check(
      "json empty array is a valid empty manifest",
      extractManifest('{"section": {"review": "ok", "changed": []}}')?.length === 0,
    );
    check(
      "json null is a valid empty manifest",
      extractManifest('{"changed": null}')?.length === 0,
    );
    for (const key of MANIFEST_JSON_KEYS) {
      check(
        `json key \`${key}\` accepted`,
        extractManifest(`{"${key}": ["src/a.ts"]}`)?.length === 1,
      );
    }
    // the real shape from the failed run: token embedded in a JSON string value,
    // arriving with escaped newlines
    // built with JSON.stringify so the escaping is the harness's, not mine —
    // this is the exact shape that ended the failed run
    check(
      "token embedded in a json string recovered",
      extractManifest(
        JSON.stringify({
          verdict: "correct",
          manifest: `${MANIFEST_OPEN}\n${MANIFEST_CLOSE}`,
        }),
      )?.length === 0,
    );
    check(
      "token embedded in a json string with paths recovered",
      extractManifest(
        JSON.stringify({ manifest: `${MANIFEST_OPEN}\nsrc/a.ts\n${MANIFEST_CLOSE}` }),
      )?.length === 1,
    );
    check(
      "json wrapped in surrounding text still parsed",
      extractManifest('<output>\n{"changed": ["src/a.ts"]}\n</output>')?.length === 1,
    );
    check(
      "json without any manifest key is still missing",
      extractManifest('{"verdict": "correct", "notes": "looks fine"}') === null,
    );
    check(
      "prose with the literal block still wins",
      extractManifest(`report\n${MANIFEST_OPEN}\nsrc/a.ts\n${MANIFEST_CLOSE}`)?.length === 1,
    );
  }

  // --- fix 4: a report is judged only when the parent leans on it -----------
  {
    const noManifest = ["I reviewed it. Looks correct."];
    const evA = freshEvidence();
    check(
      "parent that cites no subagent is not judged for one",
      checkCitations("i ran the tests myself and they pass", noManifest, new Set(), evA, true)
        .filter((f) => f.rule.startsWith("subagent_")).length === 0,
    );
    const evB = freshEvidence();
    check(
      "parent that cites the reviewer IS judged",
      checkCitations("the reviewer confirmed it", noManifest, new Set(), evB, true)
        .some((f) => f.rule === "subagent_missing_manifest"),
    );
    check("reliance detector: plain prose", reliesOnSubagents("all done") === false);
    check("reliance detector: subagent", reliesOnSubagents("the subagent found a bug"));
    check("reliance detector: review", reliesOnSubagents("per the review, it is correct"));
  }

  // --- fix 2: retrying must not grow the failure count ----------------------
  {
    const ev = freshEvidence();
    const parent = "the reviewer reported back";
    const first = checkCitations(parent, ["report one, no manifest"], new Set(), ev, true);
    check("turn 1 reports the first subagent", first.length === 1);
    // continuation: evidence survives the latch, and the retry spawned another
    const second = checkCitations(
      parent,
      ["report one, no manifest", "report two, no manifest"],
      new Set(),
      ev,
      true,
    );
    check("turn 2 reports only the NEW subagent", second.length === 1);
    const third = checkCitations(
      parent,
      ["report one, no manifest", "report two, no manifest"],
      new Set(),
      ev,
      true,
    );
    check("turn 3 with no new subagent reports nothing", third.length === 0);
  }

  // --- fix 5: severity ------------------------------------------------------
  {
    const ev = freshEvidence();
    // read-only reviewer: no manifest, but claims nothing the diff denies
    const warn = checkCitations("the reviewer says it is correct", ["looks correct to me"], new Set(), ev, true);
    check("corroborated missing manifest is a warning", warn[0]?.severity === "warn");

    const ev2 = freshEvidence();
    // same missing manifest, but the subagent claims a file the diff lacks
    const block = checkCitations(
      "the reviewer says it is correct",
      ["I updated `src/ghost.ts` for you"],
      new Set(["src/real.ts"]),
      ev2,
      true,
    );
    check(
      "contradicted missing manifest blocks",
      block.find((f) => f.rule === "subagent_missing_manifest")?.severity === "block",
    );
    check(
      "every other rule stays blocking by default",
      checkAddedLines(contentToAdded("a.ts", "// stub\n"), DEFAULT_FORBIDDEN_MARKERS)[0]
        ?.severity === undefined,
    );
  }

  // --- fix 6: the cap dropped ----------------------------------------------
  check("continuation cap is 3", MAX_CONTINUATIONS === 3);

  // --- fix 7: direct smart_commit.sh invocations are rewritten --------------
  {
    const SP = "/home/niko/.omp/agent/skills/git-pushing/scripts/smart_commit.sh";
    const rel = rewriteSmartCommit("bash skills/git-pushing/scripts/smart_commit.sh", SP);
    check("relative script path replaced with the absolute one", rel?.includes(`'${SP}'`) ?? false);
    check("--no-push appended to a direct call", rel?.endsWith("--no-push") ?? false);
    const withMsg = rewriteSmartCommit(`bash ./smart_commit.sh "feat: x"`, SP);
    check("message preserved", withMsg?.includes('"feat: x"') ?? false);
    check(
      "existing --no-push not duplicated",
      (rewriteSmartCommit(`bash ${SP} "m" --no-push`, SP) ?? "").split("--no-push").length <= 2,
    );
    check(
      "already-correct call needs no rewrite",
      rewriteSmartCommit(`bash '${SP}' 'm' --no-push`, SP) === null,
    );
    check("unrelated commands untouched", rewriteSmartCommit("ls -la", SP) === null);
  }

  // --- engagement dial ------------------------------------------------------
  {
    const f = (rule: string, severity?: "block" | "warn"): GateFailure => ({
      gate: "citation",
      rule,
      detail: rule,
      ...(severity ? { severity } : {}),
    });
    const all = [
      f("forbidden_marker"),
      f("fabricated_modification"),
      f("ungrounded_snapshot_tag"),
      f("subagent_missing_manifest", "warn"),
      f("subagent_fabricated_modification"),
      f("verify_failed"),
      f("uncommitted_changes"),
    ];
    const grade = (level: GateLevel) =>
      new Map(
        applyPolicy(all, policyFor(level) as GatePolicy).map((x) => [
          x.rule,
          x.severity ?? "block",
        ]),
      );

    // off — nothing survives
    check("off drops every failure", applyPolicy(all, policyFor("off") as GatePolicy).length === 0);
    check("off disables the inline gate", policyFor("off").inline === false);

    // low — intentionally loose: findings are recorded, nothing blocks
    const low = grade("low");
    check("low blocks nothing", [...low.values()].every((v) => v === "warn"));
    check("low still reports markers", low.get("forbidden_marker") === "warn");
    check("low drops the commit gate", low.has("uncommitted_changes") === false);
    check("low drops the manifest rule", low.has("subagent_missing_manifest") === false);
    check("low keeps the inline gate", policyFor("low").inline);

    // medium — the default: real defects block, commit discipline does not
    const med = grade("medium");
    check("medium blocks added stubs", med.get("forbidden_marker") === "block");
    check("medium blocks fabricated claims", med.get("fabricated_modification") === "block");
    check("medium blocks a failing test suite", med.get("verify_failed") === "block");
    // the whole point of the dial: no forced commit outside high
    check("medium does NOT force a commit", med.has("uncommitted_changes") === false);
    check(
      "medium keeps the diff-derived manifest severity",
      med.get("subagent_missing_manifest") === "warn",
    );

    // high — everything blocks
    const high = grade("high");
    check("high blocks every rule", [...high.values()].every((v) => v === "block"));
    check("high forces a commit", high.get("uncommitted_changes") === "block");
    check(
      "high blocks a missing manifest even when corroborated",
      high.get("subagent_missing_manifest") === "block",
    );

    // a rule with no policy entry must not vanish
    check(
      "an unmapped rule survives at its own severity",
      applyPolicy([f("brand_new_rule")], policyFor("low") as GatePolicy).length === 1,
    );

    // runaway protection is never on the dial
    for (const level of LEVELS) {
      check(`${level}: continuation cap unchanged`, MAX_CONTINUATIONS === 3);
    }

    // round trip through a real config file
    check("save writes the level", saveConfig("high", "bun test", tmpCfg).ok);
    const back = loadConfig({}, tmpCfg);
    check("load reads the level back", back.level === "high");
    check("load reads the verify command back", back.verifyCmd === "bun test");
    check("config file beats the env var", loadConfig({ OMP_GATES_LEVEL: "low" }, tmpCfg).level === "high");
    saveConfig("off", undefined, tmpCfg);
    check("disable round-trips", loadConfig({}, tmpCfg).level === "off");
    rmSync(resolvePath(tmpCfg, ".."), { recursive: true, force: true });

    // the description must name what actually changes
    check("describe names the level", describeLevel("high", "bun test").includes("HIGH"));
    check(
      "describe warns when high has no verify command",
      describeLevel("high", null).includes("high expects a verify command"),
    );
    check("describe off is unambiguous", describeLevel("off", null).includes("gates: OFF"));
  }

  // --- review pass: false-positive guards -----------------------------------
  {
    // a verify gate that passed IS evidence for a "tests pass" claim. without
    // this the citation gate flagged a TRUE statement as a fabrication.
    const evV = freshEvidence();
    evV.verifyPassed = true;
    check(
      "a passing verify run grounds a test claim",
      checkCitations("all tests passed", [], new Set(), evV, true).length === 0,
    );
    const evNo = freshEvidence();
    check(
      "an unverified test claim still fails",
      checkCitations("all tests passed", [], new Set(), evNo, true).some(
        (f) => f.rule === "fabricated_test_result",
      ),
    );

    // a non-path string must not become a manifest entry
    check(
      'json `"changed": "yes"` is not a manifest',
      extractManifest('{"changed": "yes"}') === null,
    );
    check(
      'json `"changed": "done reviewing"` is not a manifest',
      extractManifest('{"changed": "done reviewing"}') === null,
    );
    check(
      "json string of real paths still counts",
      extractManifest('{"changed": "src/a.ts\\nsrc/b.ts"}')?.length === 2,
    );
    check(
      "json boolean is not a manifest",
      extractManifest('{"changed": true}') === null,
    );

    // a script whose name merely ENDS with the target must not be rewritten
    {
      const SP = "/home/niko/.omp/agent/skills/git-pushing/scripts/smart_commit.sh";
      check(
        "my_smart_commit.sh is left alone",
        rewriteSmartCommit("bash my_smart_commit.sh", SP) === null,
      );
      check(
        "a real relative path is still rewritten",
        rewriteSmartCommit("bash ./scripts/smart_commit.sh", SP)?.includes(SP) ?? false,
      );
    }

    // the marker list must stay case-insensitive: the house style is lowercase
    // code, and an uppercase-only match would miss every marker written in it
    check(
      "markers match regardless of case",
      checkAddedLines(contentToAdded("a.py", "# TODO: IMPLEMENT\n"), DEFAULT_FORBIDDEN_MARKERS)
        .length === 1,
    );

    // a rule the policy does not know must not vanish silently
    check(
      "policy passes an unknown rule through untouched",
      applyPolicy(
        [{ gate: "citation", rule: "future_rule", detail: "x", severity: "warn" }],
        policyFor("high") as GatePolicy,
      )[0]?.severity === "warn",
    );
  }

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) process.exit(1);
}
