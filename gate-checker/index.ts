import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { execSync } from "node:child_process";
import { existsSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, isAbsolute, join, relative, resolve as resolvePath, sep } from "node:path";
import { randomUUID } from "node:crypto";
import {
  COMMIT_CLEAN_CMD,
  MANIFEST_CLOSE,
  MANIFEST_JSON_KEYS,
  MANIFEST_OPEN,
  checkAddedLines,
  contentToAdded,
  diffByLineSet,
  extractManifest,
  hashContent,
  homePathConditions,
  loadForbiddenMarkers,
  makeClaimMatcher,
  normalizePath,
  parseDiffAdditions,
  readSnapshot,
} from "./predicates.js";
import * as ledger from "./ledger.js";
import { CONFIG_PATH, LEVELS, RULE_FAMILY, describeLevel, loadConfig, policyFor, saveConfig } from "./config.js";
import { capturebaseline, resolvescope } from "./scope.js";
import { mergeprovenance, provenancefromdetails, provenancefromevent, provenancefromlifecycle } from "./provenance.js";
import { journal_type, journal_version, journalfrombranch } from "./journal.js";
import { auditscope } from "./risks.js";
import { acquireleaseasync, formatleasestatus, heartbeatintervalms, heartbeatlease, inspectlease, releaselease, releasestalelease } from "./lease.js";
import { appendRecord as appendFrustration, automaticGateRecord, missingIdentities, readRecords as readFrustrations, validateRecord as validateFrustration } from "./frustrations.js";
import { installadvisor } from "../advisor/install.js";
import { questionnaireStop } from "../ask-questionnaire/stop-decision.ts";
import { omnipotenceStop } from "../omnipotence/stop-decision.ts";

type Policy = ReturnType<typeof policyFor>;
type AddedLine = { line: number; text: string };
type AddedMap = Map<string, AddedLine[]>;
type TextBlock = { type: "text"; text: string };
type TaskInput = { task?: string; context?: string; tasks?: TaskInput[] };
type FrustrationEvidence =
  | { kind: "gate"; event_id: string; rule: string }
  | { kind: "snapshot"; path: string; line: number; digest: string; claim: string }
  | { kind: "command"; command: string; exit_code: number; output: string };
type FrustrationInput = { agent_id: string; primary_goal: string; complaint: string; type: string; severity: string; evidence: FrustrationEvidence[] };
type ToolInput = {
  cwd?: string;
  path?: string;
  paths?: string[];
  content?: string;
  newText?: string;
  input?: string;
  _input?: string;
  command?: string;
  task?: string;
  context?: string;
  tasks?: TaskInput[];
};
type ToolCallEvent = { toolName: string; toolCallId: string; input: ToolInput; sessionId?: string };
type StructuredManifest = {
  changed?: string[];
  changedFiles?: string[];
  changed_files?: string[];
  manifest?: string[];
};
type AgentResult = {
  id: string;
  agent?: string;
  exitCode?: number;
  error?: string;
  abortReason?: string;
  durationMs?: number;
  resolvedModel?: string;
  output?: string;
  outputPath?: string;
  patchPath?: string;
  branchName?: string;
  branchBaseSha?: string;
  aborted?: boolean;
  structuredOutput?: { data?: StructuredManifest };
};
type ToolDetails = {
  diff?: string;
  async?: { state?: string; jobId?: string };
  results?: AgentResult[];
};
type SessionEntry = { type?: string; message?: { role?: string; content?: string | TextBlock[] }; customType?: string; data?: object };
type SessionManager = {
  getBranch?(): SessionEntry[];
  getSessionFile?(): string;
  getSessionId?(): string;
};
type ExtensionContext = {
  cwd: string;
  hasUI: boolean;
  sessionManager?: SessionManager;
  getAsyncJobSnapshot?(): AsyncJobSnapshot | null;
  invokeTool?(params: ToolInput, options?: { signal?: AbortSignal; onUpdate?: (result: ToolResultPayload) => void }): Promise<ToolResultPayload>;
  ui?: { notify?(message: string, type?: string): void; setStatus?(key: string, text: string): void };
};
type ToolResultPayload = { content?: TextBlock[]; details?: ToolDetails; isError?: boolean };
type AsyncJob = { id: string; status?: string };
type AsyncJobSnapshot = { running?: AsyncJob[]; recent?: AsyncJob[] };
type SessionStopResult = { continue?: boolean; additionalContext?: string; decision?: "block"; reason?: string };
type ToolCallResult = { block?: boolean; reason?: string; input?: ToolInput };
type InterrogationAnswers = { unnecessary: string; deleted: string; simplified: string };
type SubagentEvidence = {
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
};
type GateFailure = { gate: "citation" | "completion" | "verify" | "commit" | "journal" | "risk"; rule: string; detail: string; severity?: "block" | "warn" };
type TurnEvidence = {
  hadToolCalls: boolean;
  askedUser: boolean;
  filesTouched: Set<string>;
  snapshotTags: Set<string>;
  bashCommands: Array<{ cmd: string; isError: boolean }>;
  subagents: SubagentEvidence[];
  baselineSha: string | null;
  baselineDirty: Set<string>;
  baselineSnapshots: object;
  repoRoot: string | null;
  preTouch: Map<string, string | null>;
  warnedRepoRoots: Set<string>;
  judgedSubagents: Set<string>;
  verifyPassed: boolean;
  ttsrHits: Set<string>;
  flaggedInline: Set<string>;
  hadtoolerror: boolean;
  interrogations: Map<string, InterrogationAnswers>;
  hadblockingfailure: boolean;
};
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
  conflict?: LeaseRecord;
  waited_ms?: number;
  timed_out?: boolean;
  error?: string;
  diagnostic?: string;
};
type LeaseScope = { cwd: string; target: string | null };
type ActiveOperation = { lease: LeaseRecord; timer: ReturnType<typeof setInterval>; pollTimer?: ReturnType<typeof setInterval>; asyncJobId: string | null; toolName: string; target: string | null; backgroundRunning: boolean };
type LeaseStatus = { status?: string; kind?: string; valid?: boolean; stale?: boolean; record?: LeaseRecord };
type BuiltinTool = { name: string; description?: string; parameters?: object; sourceInfo?: { source?: string } };
type ToolResultEvent = { toolName: string; toolCallId: string; input: ToolInput; content: string | TextBlock[]; details?: ToolDetails; isError: boolean };
type ExecutionUpdateEvent = { toolCallId: string; partialResult: { details?: ToolDetails } };
type RuleEvent = { rules?: Array<{ name: string }> };
type LifecycleEvent = { id: string; parentToolCallId?: string; agent?: string; status?: string; sessionFile?: string };
type SubagentEvent = { id: string; event: { type: string; message: { role: string; content: string | TextBlock[] } } };
type AgentEndEvent = { willContinue?: true };
type SessionEvent = { timestamp?: number };
type BoundaryValue = ToolCallEvent | ToolResultEvent | ExecutionUpdateEvent | RuleEvent | LifecycleEvent | SubagentEvent | AgentEndEvent | SessionEvent;
type BoundarySchema<T> = { safeParse(value: BoundaryValue): { success: true; data: T } | { success: false } };
type DiffEvidence = { changed: Set<string>; added: AddedMap };
type ProcessCandidate = { matched: boolean; changed: number; testRan: boolean; reason: "no-changes" | "too-broad" | "no-test-run" | null };
type JournalFields = {
  outcome?: string;
  release_reason?: string;
  repo_root?: string | null;
  baseline_sha?: string | null;
  baseline_dirty?: string[];
  baseline_snapshots?: object;
  policy_fingerprint?: string;
  verify_id?: string;
  tree_fingerprint?: string;
  failure_hash?: string | null;
  continuation?: number;
  unnecessary?: string;
  deleted?: string;
  simplified?: string;
};
type TerminalFields = { release_reason?: string };
type RequestState = {
  assistantText: string;
  cwd: string;
  sessionFile?: string;
  sessionId?: string;
  taxonomyRoot: string;
  hasGit: boolean;
  gitCwd: string;
  markers: string[];
  changedFiles: Set<string>;
  added: AddedMap;
  watched: Set<string> | null;
  dayOneTrigger: boolean;
  canAdjudicate: boolean;
  changedCount: number;
};

const COMMIT_SCRIPT_PATH = resolvePath(process.env.PI_CODING_AGENT_DIR || join(homedir(), ".omp", "agent"), "skills/git-commit/scripts/smart_commit.sh");
const commitRoutingEnabled = existsSync(COMMIT_SCRIPT_PATH);
const SNAPSHOT_TAG_RE = /\[([^\]]+?)#([0-9A-Fa-f]{4})\]/g;
const TEST_PASS_RE = /\b(?:tests?|specs?|suite)\s+(?:pass(?:ed|es)?|succeed(?:ed|s)?|are\s+(?:green|passing))\b/i;
const ALL_PASS_RE = /\b(?:all|every)\s+(?:tests?|specs?)\s+pass\b/i;
const TEST_RUNNER_RE = /(?:npm\s+(?:test|run\s+test)|npx\s+(?:jest|vitest|mocha|playwright)|yarn\s+test|pnpm\s+(?:test|run\s+test)|pytest|python\s+-m\s+(?:pytest|unittest)|cargo\s+test|go\s+test|bun\s+(?:test|run\s+test)|bunx\s+(?:playwright|vitest)|node\s+--test|tsx\s+--test|jest|vitest|mocha|rspec|bundle\s+exec\s+(?:rspec|minitest)|deno\s+test|gradle\s+test|mvn\s+test)/i;
const MOD_CLAIM_RE = /(?:modif(?:ied|y)|updated?|changed?|edited?|added?\s+to|fixed?\s+in|refactored?|rewrote?|replaced?|removed?\s+(?:from|in)|deleted?\s+(?:from|in))\s+`([a-zA-Z0-9_./~-]+[/][a-zA-Z0-9_./~-]+\.[a-zA-Z]{1,8})`/gi;
const SUBAGENT_REFERENCE_RE = /\b(sub-?agents?|reviewers?|review(?:ed|s)?\s+(?:by|agent)|delegat(?:e|ed|ion)|spawned\s+agents?|per\s+the\s+review|according\s+to\s+the\s+(?:review|agent)|the\s+agent\s+(?:reported|found|said|confirmed)|its?\s+report)\b/i;
const COMMIT_BOUNDARY_RE = /(?:^|[;&|]\s*|&&\s*)git\s+commit\b(?![-_])/;
const SMART_COMMIT_RE = /(['"]?)(?<![\w.-])((?:[^\s'"]*\/)?smart_commit\.sh)\1/;
const MAX_CONTINUATIONS = 3;
const PROCESS_MAX_FILES = 8;

function freshEvidence(): TurnEvidence {
  return { hadToolCalls: false, askedUser: false, filesTouched: new Set(), snapshotTags: new Set(), bashCommands: [], subagents: [], baselineSha: null, baselineDirty: new Set(), baselineSnapshots: {}, repoRoot: null, preTouch: new Map(), warnedRepoRoots: new Set(), judgedSubagents: new Set(), verifyPassed: false, ttsrHits: new Set(), flaggedInline: new Set(), hadtoolerror: false, interrogations: new Map(), hadblockingfailure: false };
}
function parseEvent<T>(schema: BoundarySchema<T>, value: BoundaryValue): T | null {
  const parsed = schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
function extractText(content: string | TextBlock[] | null | undefined): string {
  return Array.isArray(content) ? content.map((item) => item.text).join("\n") : content ?? "";
}
function extractSnapshotRefs(text: string): Array<{ path: string; tag: string }> {
  const refs: Array<{ path: string; tag: string }> = [];
  SNAPSHOT_TAG_RE.lastIndex = 0;
  for (let match = SNAPSHOT_TAG_RE.exec(text); match; match = SNAPSHOT_TAG_RE.exec(text)) refs.push({ path: match[1], tag: match[2].toUpperCase() });
  return refs;
}
function extractModClaims(text: string): string[] {
  const paths: string[] = [];
  MOD_CLAIM_RE.lastIndex = 0;
  for (let match = MOD_CLAIM_RE.exec(text); match; match = MOD_CLAIM_RE.exec(text)) paths.push(match[1]);
  return [...new Set(paths)];
}
function claimsTestSuccess(text: string): boolean { return TEST_PASS_RE.test(text) || ALL_PASS_RE.test(text); }
function ranTestRunner(ev: TurnEvidence): boolean { return ev.verifyPassed || ev.bashCommands.some((command) => TEST_RUNNER_RE.test(command.cmd) && !command.isError); }
function reliesOnSubagents(text: string): boolean { return SUBAGENT_REFERENCE_RE.test(text); }
function checkCitations(assistantText: string, subagents: SubagentEvidence[], changedFiles: Set<string>, ev: TurnEvidence, hasGit: boolean, cwd: string, watched: Set<string> | null): GateFailure[] {
  const failures: GateFailure[] = [];
  const isChanged = makeClaimMatcher(changedFiles, ev.repoRoot, cwd);
  const canJudge = (claim: string): boolean => watched === null || watched.has(normalizePath(claim));
  if (hasGit || watched !== null) for (const claimed of extractModClaims(assistantText)) if (canJudge(claimed) && !isChanged(claimed)) failures.push({ gate: "citation", rule: "fabricated_modification", detail: `assistant text claims modification of \`${claimed}\` but git diff does not include this file. either make the change or remove the claim.` });
  if (claimsTestSuccess(assistantText) && !ranTestRunner(ev)) failures.push({ gate: "citation", rule: "fabricated_test_result", detail: "assistant text claims tests passed but no test-runner command was executed this turn. run the tests or remove the claim." });
  if (reliesOnSubagents(assistantText)) for (let index = 0; index < subagents.length; index++) {
    const subagent = subagents[index];
    if (!subagent.report) continue;
    const seen = hashContent(`${subagent.id}\n${subagent.report}`);
    if (ev.judgedSubagents.has(seen)) continue;
    ev.judgedSubagents.add(seen);
    const manifest = subagent.manifest ?? extractManifest(subagent.report);
    const contradicts = (hasGit || watched !== null) && extractModClaims(subagent.report).some((claim) => canJudge(claim) && !isChanged(claim));
    if (manifest === null) failures.push({ gate: "citation", rule: "subagent_missing_manifest", severity: contradicts ? "block" : "warn", detail: `subagent #${index + 1} returned no manifest. it must report the files it changed — either the ${MANIFEST_OPEN}…${MANIFEST_CLOSE} block, or a JSON \`${MANIFEST_JSON_KEYS.join("`/`")}\` field (empty if it changed none). verify its work yourself before repeating its claims.` });
    else if (hasGit || watched !== null) for (const claimed of manifest) if (canJudge(claimed) && !isChanged(claimed)) failures.push({ gate: "citation", rule: "subagent_manifest_mismatch", detail: `subagent #${index + 1} listed \`${claimed}\` in its manifest but the diff does not include that file.` });
    if (hasGit || watched !== null) for (const claimed of extractModClaims(subagent.report)) if (canJudge(claimed) && !isChanged(claimed)) failures.push({ gate: "citation", rule: "subagent_fabricated_modification", detail: `subagent #${index + 1} claimed modification of \`${claimed}\` but the diff does not include this file.` });
    if (claimsTestSuccess(subagent.report) && !ranTestRunner(ev)) failures.push({ gate: "citation", rule: "subagent_unverified_test", detail: `subagent #${index + 1} claimed tests passed but no test-runner command was verified in the parent session. run the tests independently before accepting this claim.` });
  }
  for (const ref of extractSnapshotRefs(assistantText)) if (!ev.snapshotTags.has(ref.tag)) failures.push({ gate: "citation", rule: "ungrounded_snapshot_tag", detail: `assistant text references snapshot tag [${ref.path}#${ref.tag}] but this tag was not returned by any read/edit tool call this turn.` });
  return failures;
}
function noGitDiff(snapshots: Map<string, string | null>, cwd: string): DiffEvidence {
  const changed = new Set<string>();
  const added: AddedMap = new Map();
  for (const [path, before] of snapshots) {
    const abs = isAbsolute(path) ? path : resolvePath(cwd, path);
    const after = readSnapshot(abs);
    if (after === null) continue;
    if (before === null) { changed.add(path); for (const [key, lines] of contentToAdded(path, after)) added.set(key, lines); continue; }
    if (hashContent(before) === hashContent(after)) continue;
    changed.add(path);
    for (const [key, lines] of diffByLineSet(path, before, after)) added.set(key, lines);
  }
  return { changed, added };
}
function existingDirectory(path: string): string | null {
  let candidate = path;
  while (!existsSync(candidate)) { const parent = dirname(candidate); if (parent === candidate) return null; candidate = parent; }
  try { return statSync(candidate).isDirectory() ? candidate : dirname(candidate); } catch { return null; }
}
function repositoryCandidates(input: ToolInput, cwd: string): string[] {
  const declaredCwd = input.cwd ? existingDirectory(resolvePath(cwd, input.cwd)) : null;
  const inputPath = input.path ? existingDirectory(isAbsolute(input.path) ? input.path : resolvePath(declaredCwd ?? cwd, input.path)) : null;
  const inputPaths = input.paths?.map((path) => existingDirectory(isAbsolute(path) ? path : resolvePath(declaredCwd ?? cwd, path))).filter((path): path is string => path !== null) ?? [];
  return [...new Set([declaredCwd, inputPath, ...inputPaths, existingDirectory(cwd)].filter((path): path is string => path !== null))];
}
function isInside(root: string, path: string): boolean { const rel = relative(root, path); return rel === "" || (rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel)); }
function inlineAdditions(toolName: string, path: string, input: ToolInput, details?: ToolDetails): AddedMap | null {
  if (!path) return null;
  if (toolName === "edit") {
    if (details?.diff) { const added: AddedMap = new Map(); parseDiffAdditions(details.diff, added, path); return added; }
    return input.newText !== undefined ? contentToAdded(path, input.newText) : null;
  }
  return input.content !== undefined ? contentToAdded(path, input.content) : null;
}
function extractCommitMessage(command: string): string | null {
  const separated = command.match(/(?:^|\s)(?:-m|--message)(?:=|\s+)(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/);
  if (separated) return separated[1] ?? separated[2] ?? separated[3] ?? null;
  const attached = command.match(/(?:^|\s)-m(?:"([^"]*)"|'([^']*)'|([^\s;&|]+))/);
  return attached ? attached[1] ?? attached[2] ?? attached[3] ?? null : null;
}
function rewriteSmartCommit(command: string, scriptPath: string): string | null {
  const match = SMART_COMMIT_RE.exec(command);
  if (!match) return null;
  const safe = scriptPath.replace(/'/g, "'\\''");
  const out = match[2] === scriptPath ? command : command.replace(match[0], `'${safe}'`);
  const result = /--no-push\b/.test(out) ? out : `${out} --no-push`;
  return result === command ? null : result;
}
function splitCommitSegment(command: string): { before: string; commitPart: string; after: string } | null {
  const index = command.search(/(?:^|[;&|]\s*|&&\s*)git\s+commit\b(?![-_])/);
  if (index < 0) return null;
  const boundary = command[index]?.match(/[;&|&]/);
  const start = boundary ? index + 1 : index;
  const before = command.slice(0, start).replace(/[;&|&\s]+$/, "");
  const commitStart = command.indexOf("git", start);
  let cursor = commitStart + 4;
  let quote = "";
  while (cursor < command.length) { const char = command[cursor]; if (quote) { if (char === quote) quote = ""; } else if (char === '"' || char === "'") quote = char; else if (char === ";" || char === "&" || char === "|") break; cursor++; }
  return { before, commitPart: command.slice(commitStart, cursor).trim(), after: command.slice(cursor).replace(/^[;&|&\s]+/, "").trim() };
}
function rewriteGitCommit(command: string, scriptPath: string): string | null {
  if (!COMMIT_BOUNDARY_RE.test(command) || /--amend/.test(command)) return null;
  const split = splitCommitSegment(command);
  if (!split) return null;
  const safe = (value: string): string => value.replace(/'/g, "'\\''");
  const message = extractCommitMessage(split.commitPart);
  const script = message === null ? `bash '${safe(scriptPath)}' --no-push` : `bash '${safe(scriptPath)}' '${safe(message)}' --no-push`;
  const parts = split.before && !/^\s*git\s+add\b/.test(split.before) ? [split.before, script] : [script];
  if (split.after) parts.push(split.after);
  const result = parts.join(" && ");
  return result === command ? null : result;
}
function getLastAssistantText(ctx: ExtensionContext): string | null {
  const branch = ctx.sessionManager?.getBranch?.() ?? [];
  for (let index = branch.length - 1; index >= 0; index--) { const entry = branch[index]; if (entry.type === "message" && entry.message?.role === "assistant") return extractText(entry.message.content); }
  return null;
}
function shouldSkipNoTools(hadToolCalls: boolean, assistantText: string, journalRecovery: string | null): boolean { return !hadToolCalls && !assistantText && !journalRecovery; }
function canSkipUserQuestion(askedUser: boolean, changedCount: number, journalRecovery: string | null, missingFrustration: boolean): boolean { return askedUser && changedCount === 0 && !journalRecovery && !missingFrustration; }
function absolutePathPreserving(base: string, child: string): string { if (isAbsolute(child)) return child; return `${(isAbsolute(base) ? base : resolvePath(base)).replace(/\/+$/, "")}/${child}`; }
function canonicalPath(path: string): string | null {
  let candidate = isAbsolute(path) ? path : resolvePath(path);
  const missing: string[] = [];
  while (!existsSync(candidate)) { const parent = dirname(candidate); if (parent === candidate) return null; missing.unshift(candidate.slice(parent.length + 1)); candidate = parent; }
  try { return resolvePath(realpathSync(candidate), ...missing); } catch { return null; }
}
function isInternalUri(value: string): boolean { const trimmed = value.trim(); return /^[A-Za-z][A-Za-z0-9+.-]*:/.test(trimmed) && !/^[A-Za-z]:[\\/]/.test(trimmed); }
function effectiveLeaseInput(toolName: string, input: ToolInput): ToolInput {
  if (toolName !== "edit" || input.path || input.paths) return input;
  const patch = input.input ?? input._input ?? "";
  if (!patch) return input;
  const paths: string[] = [];
  for (const line of patch.split(/\r?\n/)) { const match = /^\s*\[([^#\r\n]+)#[0-9a-f]{4}\]\s*$/i.exec(line); if (!match) continue; const path = match[1].trim().replace(/^(?:'([^']*)'|"([^"]*)")$/, "$1$2"); if (path) paths.push(path); }
  if (!paths.length) return input;
  return paths.length === 1 ? { ...input, path: paths[0], paths } : { ...input, paths };
}
function leaseScope(event: ToolCallEvent, context: ExtensionContext, repoRoot: string | null): LeaseScope | null {
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
    for (const declaredPath of declaredPaths) { if (!declaredPath || isInternalUri(declaredPath) || /^[A-Za-z]:[\\/]/.test(declaredPath) || declaredPath.startsWith("\\\\")) continue; const target = canonicalPath(absolutePathPreserving(declaredCwd, declaredPath)); if (target && isInside(root, target)) targets.push(target); }
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
  if (!value || !value.trim() || !existsSync(value)) return null;
  try { const resolved = resolvePath(realpathSync(value)); return statSync(resolved).isFile() ? resolved : null; } catch { return null; }
}
function materializedParentSessionFile(sessionFile: string): string | null { const suffix = basename(sessionFile).match(/\.(?:jsonl?|ndjson)$/i)?.[0]; return suffix ? materializedSessionFile(`${dirname(sessionFile)}${suffix}`) : null; }
function sessionDescendsFrom(child: string, ancestor: string): boolean { let parent = materializedParentSessionFile(child); while (parent) { if (parent === ancestor) return true; parent = materializedParentSessionFile(parent); } return false; }
function resolveLeaseRelation(currentSessionFile: string | null | undefined, holderSessionFile: string | null | undefined): "same" | "parent" | "child" | "sibling" | "unknown" {
  const current = materializedSessionFile(currentSessionFile); const holder = materializedSessionFile(holderSessionFile); if (!current || !holder) return "unknown"; if (current === holder) return "same"; if (sessionDescendsFrom(current, holder)) return "parent"; if (sessionDescendsFrom(holder, current)) return "child"; const currentParent = materializedParentSessionFile(current); const holderParent = materializedParentSessionFile(holder); return currentParent && holderParent && currentParent === holderParent ? "sibling" : "unknown";
}
function asyncState(details?: ToolDetails): string | null { return details?.async?.state?.trim().toLowerCase() ?? null; }
function asyncJobId(details?: ToolDetails): string | null { const id = details?.async?.jobId?.trim(); return id || null; }
function applyPolicy(failures: GateFailure[], policy: Policy): GateFailure[] {
  const output: GateFailure[] = [];
  for (const failure of failures) { const family = RULE_FAMILY[failure.rule]; const mode = family ? policy[family] : "auto"; if (mode === "off") continue; output.push(mode === "auto" ? failure : { ...failure, severity: mode }); }
  return output;
}
let unknownStateSequence = 0;
function unknownState(): string { return `unknown:${Date.now()}:${unknownStateSequence++}`; }
function treeStateKey(cwd: string, hasGit: boolean, touched: Map<string, string | null>): string {
  if (hasGit) {
    try { const output = execSync("git rev-parse HEAD 2>/dev/null; git diff HEAD --binary 2>/dev/null; printf '\\0'; git ls-files -o --exclude-standard -z 2>/dev/null", { cwd, encoding: "utf-8", timeout: 5000, maxBuffer: 8 * 1024 * 1024 }); const [gitState, ...raw] = output.split("\0"); if (!gitState.trim()) return unknownState(); const untracked = raw.filter(Boolean).sort().map((path) => `${path}:${hashContent(readSnapshot(isAbsolute(path) ? path : resolvePath(cwd, path)) ?? "")}`); return hashContent([gitState, ...untracked].join("\n")); } catch { return unknownState(); }
  }
  const parts = [...touched.keys()].sort().map((path) => `${path}:${hashContent(readSnapshot(isAbsolute(path) ? path : resolvePath(cwd, path)) ?? "")}`);
  return parts.length ? hashContent(parts.join("\n")) : unknownState();
}
function runVerifyGate(cwd: string, command: string): GateFailure | null {
  try { execSync(command, { cwd, encoding: "utf-8", timeout: 15 * 60 * 1000, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); return null; } catch (error) { const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim() || String(error.message ?? error); return { gate: "verify", rule: "verify_failed", detail: `\`${command}\` exited non-zero. the change is not verified. fix the failure, do not weaken the test.\n   last output:\n   ${output.split("\n").slice(-20).join("\n   ")}` }; }
}
const shellQuote = (value: string): string => `'${value.replace(/'/g, "'\\''")}'`;
function complexityOutput(output: string): string | null {
  const text = output.trim(); if (!text) return null;
  try { const reports = JSON.parse(text); if (Array.isArray(reports)) { const findings: string[] = []; for (const report of reports) for (const message of report.messages ?? []) { const path = report.filePath || report.file || "changed file"; const detail = message.message || "complexity threshold exceeded"; const line = Number.isInteger(message.line) ? `:${message.line}` : ""; const score = String(detail).match(/\bcomplexity(?:\s+of|:)\s+(\d+)/i)?.[1]; findings.push(`${path}${line}: ${score ? `complexity ${score}; ` : ""}${detail}`); } return findings.length ? findings.slice(-20).join("\n") : null; } } catch { return text.split("\n").slice(-20).join("\n"); }
  return text.split("\n").slice(-20).join("\n");
}
function runComplexityGate(cwd: string, command: string, changedFiles: Set<string>): GateFailure | null {
  const paths = [...changedFiles].sort(); if (!paths.length) return null;
  try { const output = execSync(`${command} ${paths.map(shellQuote).join(" ")}`, { cwd, encoding: "utf-8", timeout: 15 * 60 * 1000, maxBuffer: 32 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); const detail = complexityOutput(String(output)); return detail ? { gate: "risk", rule: "complexity_failed", severity: "warn", detail: `complexity linter reported findings for changed files:\n   ${detail.replace(/\n/g, "\n   ")}` } : null; } catch (error) { const output = `${error.stdout ?? ""}${error.stderr ?? ""}`.trim() || String(error.message ?? error); const detail = complexityOutput(output) ?? "linter failed without output"; return { gate: "risk", rule: "complexity_failed", severity: "warn", detail: `complexity linter could not complete for changed files:\n   ${detail.replace(/\n/g, "\n   ")}` }; }
}
function runCommitGate(cwd: string): GateFailure | null {
  try { const dirty = execSync(`${COMMIT_CLEAN_CMD} 2>/dev/null`, { cwd, encoding: "utf-8", timeout: 5000, maxBuffer: 8 * 1024 * 1024 }).trim(); return dirty ? { gate: "commit", rule: "uncommitted_changes", detail: `the working tree still carries uncommitted changes to tracked files. commit this unit of work before yielding (one logical change = one commit).\n   ${dirty.split("\n").slice(0, 20).join("\n   ")}` } : null; } catch { return null; }
}
function processCandidate(ev: TurnEvidence, changed: number): ProcessCandidate {
  const testRan = ranTestRunner(ev);
  if (!changed) return { matched: false, changed, testRan, reason: "no-changes" };
  if (changed > PROCESS_MAX_FILES) return { matched: false, changed, testRan, reason: "too-broad" };
  if (!testRan) return { matched: false, changed, testRan, reason: "no-test-run" };
  return { matched: true, changed, testRan, reason: null };
}
function formatFailures(failures: GateFailure[]): string { return `[GATE CHECKER — deterministic post-turn gate]\n\nthe following machine-checked gates failed:\n\n${failures.map((failure, index) => `${index + 1}. ${failure.gate}/${failure.rule}\n   ${failure.detail}`).join("\n\n")}\n\nthese are deterministic checks, not model judgment. fix each failure before yielding. do not repeat the same response.`; }
function checkFrustrations(records: object[], identities: Array<{ agent_id: string; session_file: string | null }>, repoRoot: string): GateFailure[] { return missingIdentities(records, identities, repoRoot).map((id) => ({ gate: "journal", rule: "missing_frustration_record", detail: `identity "${id}" has no frustration record for this session. call record_frustration with your assigned id and goal.` })); }
const GATE_NUDGE = [
  "[GATE CHECKER] your report MUST end with this exact block, listing every file you changed, one path per line:",
  MANIFEST_OPEN,
  "path/to/file.ts",
  MANIFEST_CLOSE,
  "If you changed no files, emit the block empty — that is a valid answer. The listed paths are checked against the real diff, so list exactly what you changed: no more, no less.",
  `If your output is JSON, put the same list in a ${MANIFEST_JSON_KEYS.join("/")} field instead — an empty array is the valid answer for a read-only task.`,
  "",
  `Also: (1) do not leave forbidden markers (${"TO" + "DO"}: implement, ${"FIX" + "ME"}:, ${"Not" + "ImplementedError"}, unfinished comments) in lines you add; (2) do not claim test results you did not produce — the bash log is checked; (3) if you commit, use the git-commit skill script, not raw git commit.`,
  "",
  "(4) call record_frustration with your assigned id and goal to log any friction — papercuts count even when nothing failed: confusing docs, dead ends, awkward tool output. use type \"none\" only when the whole session was friction-free; it requires complaint \"none\" and severity \"low\". every active identity needs one record for its session.",
  "",
].join("\n");

export default function gateChecker(pi: ExtensionAPI): void {
  let evidence = freshEvidence();
  let continuationCount = 0;
  let config = loadConfig();
  let policy: Policy = policyFor(config.level);
  let verifyCache: { key: string } | null = null;
  let lastBlockingKey: string | null = null;
  let requestId: string | null = null;
  let journalRecovery: string | null = null;
  const leaseOwnerId = randomUUID();
  let leaseEnabled = !["0", "false", "off"].includes(String(process.env.OMP_GATE_MUTATION_LEASE ?? "").trim().toLowerCase());
  const activeOperations = new Map<string, ActiveOperation>();
  let builtinWrappersRegistered = false;
  const taskItemSchema = pi.zod.object({
    task: pi.zod.string().optional(),
    context: pi.zod.string().optional(),
  });
  const toolInputSchema = pi.zod.object({
    cwd: pi.zod.string().optional(),
    path: pi.zod.string().optional(),
    paths: pi.zod.array(pi.zod.string()).optional(),
    content: pi.zod.string().optional(),
    newText: pi.zod.string().optional(),
    input: pi.zod.string().optional(),
    _input: pi.zod.string().optional(),
    command: pi.zod.string().optional(),
    task: pi.zod.string().optional(),
    context: pi.zod.string().optional(),
    tasks: pi.zod.array(taskItemSchema).optional(),
  });
  const toolCallSchema = pi.zod.object({
    toolName: pi.zod.string(),
    toolCallId: pi.zod.string(),
    input: toolInputSchema,
    sessionId: pi.zod.string().optional(),
  });
  const contentSchema = pi.zod.union([
    pi.zod.string(),
    pi.zod.array(pi.zod.object({ type: pi.zod.literal("text"), text: pi.zod.string() })),
  ]);
  const booleanSchema = pi.zod.union([pi.zod.literal(true), pi.zod.literal(false)]);
  const manifestDataSchema = pi.zod.object({
    changed: pi.zod.array(pi.zod.string()).optional(),
    changedFiles: pi.zod.array(pi.zod.string()).optional(),
    changed_files: pi.zod.array(pi.zod.string()).optional(),
    manifest: pi.zod.array(pi.zod.string()).optional(),
  });
  const resultItemSchema = pi.zod.object({
    id: pi.zod.string(),
    agent: pi.zod.string().optional(),
    exitCode: pi.zod.number().optional(),
    error: pi.zod.string().optional(),
    abortReason: pi.zod.string().optional(),
    aborted: booleanSchema.optional(),
    durationMs: pi.zod.number().optional(),
    resolvedModel: pi.zod.string().optional(),
    output: pi.zod.string().optional(),
    outputPath: pi.zod.string().optional(),
    patchPath: pi.zod.string().optional(),
    branchName: pi.zod.string().optional(),
    branchBaseSha: pi.zod.string().optional(),
    structuredOutput: pi.zod.object({ data: manifestDataSchema.optional() }).optional(),
  });
  const detailsSchema = pi.zod.object({
    diff: pi.zod.string().optional(),
    async: pi.zod.object({
      state: pi.zod.string().optional(),
      jobId: pi.zod.string().optional(),
    }).optional(),
    results: pi.zod.array(resultItemSchema).optional(),
  });
  const toolResultSchema = pi.zod.object({
    toolName: pi.zod.string(),
    toolCallId: pi.zod.string(),
    input: toolInputSchema,
    content: contentSchema,
    details: detailsSchema.optional(),
    isError: booleanSchema,
  });
  const executionUpdateSchema = pi.zod.object({
    toolCallId: pi.zod.string(),
    partialResult: pi.zod.object({ details: detailsSchema.optional() }),
  });
  const ttsrSchema = pi.zod.object({
    rules: pi.zod.array(pi.zod.object({ name: pi.zod.string() })).optional(),
  });
  const lifecycleSchema = pi.zod.object({
    id: pi.zod.string(),
    parentToolCallId: pi.zod.string().optional(),
    agent: pi.zod.string().optional(),
    status: pi.zod.string().optional(),
    sessionFile: pi.zod.string().optional(),
  });
  const subagentEventSchema = pi.zod.object({
    id: pi.zod.string(),
    event: pi.zod.object({
      type: pi.zod.string(),
      message: pi.zod.object({ role: pi.zod.string(), content: contentSchema }),
    }),
  });
  const agentEndSchema = pi.zod.object({ willContinue: pi.zod.literal(true).optional() });
  const eventSchema = pi.zod.object({});
  const leaseFields = (lease: LeaseRecord) => ({ path: lease.path, token: lease.token, owner_id: lease.owner_id, request_id: lease.request_id, session_id: lease.session_id, session_file: lease.session_file, agent_id: lease.agent_id, tool_call_id: lease.tool_call_id, tool_name: lease.tool_name, target: lease.target, fence: lease.fence });
  const releaseOperation = (toolCallId: string, reason: string): boolean => {
    const operation = activeOperations.get(toolCallId);
    if (!operation) return false;
    activeOperations.delete(toolCallId);
    clearInterval(operation.timer);
    if (operation.pollTimer) clearInterval(operation.pollTimer);
    let released = false;
    try { released = Boolean(releaselease(operation.lease)); } catch {}
    ledger.append("lease_released", { ...leaseFields(operation.lease), reason, released });
    return released;
  };
  const releaseAllOperations = (reason: string): void => { for (const id of activeOperations.keys()) releaseOperation(id, reason); };
  const releaseOrphanedOperations = (reason: string): void => { for (const [id, operation] of activeOperations) if (!operation.backgroundRunning) releaseOperation(id, reason); };
  const pollAsyncOperation = (toolCallId: string, operation: ActiveOperation, context: ExtensionContext): void => {
    if (operation.pollTimer || !context.getAsyncJobSnapshot || !operation.asyncJobId) return;
    const poll = (): void => { if (activeOperations.get(toolCallId) !== operation) return; let snapshot: AsyncJobSnapshot | null = null; try { snapshot = context.getAsyncJobSnapshot() ?? null; } catch { return; } if (!snapshot) return; const running = snapshot.running?.find((job) => job.id === operation.asyncJobId); if (running && (running.status ?? "running").trim().toLowerCase() === "running") return; const recent = snapshot.recent?.find((job) => job.id === operation.asyncJobId); const status = recent?.status?.trim().toLowerCase() ?? ""; releaseOperation(toolCallId, status && status !== "running" ? `async_${status}` : "async_completed"); };
    operation.pollTimer = setInterval(poll, 50);
    operation.pollTimer.unref?.();
    poll();
  };
  const releaseStaleSessionLease = (repoRoot: string | null, sessionFile: string | null | undefined, reason: string): void => {
    if (!repoRoot || !sessionFile) return;
    try { const status: LeaseStatus = inspectlease({ cwd: repoRoot }); const record = status.record; if (status.status !== "held" || status.stale !== true || !record || record.session_file !== sessionFile) return; ledger.append("lease_heartbeat_stale", { ...leaseFields(record), reason, ts: Date.now() }); const released = Boolean(releasestalelease(record, { cwd: repoRoot })); ledger.append("lease_released", { ...leaseFields(record), reason, released }); if (released) ledger.append("lease_recovered", { ...leaseFields(record), reason, ts: Date.now() }); } catch {}
  };
  const policyFingerprint = (): string => hashContent(`${config.level}\n${config.verifyCmd ?? ""}\n${config.complexityCmd ?? ""}`);
  const appendJournal = (kind: string, fields: JournalFields = {}): void => { if (!requestId) return; try { pi.appendEntry(journal_type, { version: journal_version, kind, request_id: requestId, ...fields, ts: Date.now() }); } catch {} };
  const acquireOperation = async (event: ToolCallEvent, context: ExtensionContext, scope: LeaseScope): Promise<ToolCallResult | void> => {
    if (!leaseEnabled || !policy.enabled || !event.toolCallId || activeOperations.has(event.toolCallId)) return;
    const sessionId = event.sessionId ?? context.sessionManager?.getSessionId?.() ?? "";
    const sessionFile = context.sessionManager?.getSessionFile?.() ?? null;
    if (!sessionId || !sessionFile) return { block: true, reason: "mutation lease requires the active session id and session file" };
    const metadata = { cwd: scope.cwd, owner_id: leaseOwnerId, request_id: requestId ?? randomUUID(), session_id: sessionId, session_file: sessionFile, agent_id: operationAgentId(sessionFile, sessionId), tool_call_id: event.toolCallId, tool_name: event.toolName, target: scope.target };
    const waitMs = Number(process.env.OMP_GATE_MUTATION_LEASE_WAIT_MS);
    const acquisitionOptions = Number.isFinite(waitMs) ? { ...metadata, acquisition_wait_ms: Math.max(0, waitMs) } : metadata;
    ledger.append("lease_wait_started", { ...metadata, ts: Date.now() });
    let result: LeaseRecord;
    try { result = await acquireleaseasync(acquisitionOptions); } catch (error) { return { block: true, reason: `mutation lease could not be acquired: ${error instanceof Error ? error.message : String(error)}` }; }
    if (result.acquired !== true) {
      const holder = result.conflict?.session_file ?? null;
      let reason = "";
      try { reason = formatleasestatus(result, { waited_ms: result.waited_ms ?? 0, relation: resolveLeaseRelation(sessionFile, holder), cwd: scope.cwd }); } catch {}
      if (!reason) reason = result.error ?? result.diagnostic ?? "mutation lease is unavailable";
      if (result.timed_out === true) ledger.append("lease_wait_timed_out", { ...metadata, reason, ts: Date.now() });
      return { block: true, reason };
    }
    const timer = setInterval(() => { const operation = activeOperations.get(event.toolCallId); if (!operation || operation.lease !== result) return; try { if (heartbeatlease(result)) return; let stale = false; try { stale = inspectlease({ cwd: result.repo_root ?? scope.cwd }).stale === true; } catch {} if (stale) ledger.append("lease_heartbeat_stale", { ...leaseFields(result), ts: Date.now() }); releaseOperation(event.toolCallId, stale ? "heartbeat_stale" : "heartbeat_lost"); } catch {} }, heartbeatintervalms({}));
    timer.unref?.();
    activeOperations.set(event.toolCallId, { lease: result, timer, asyncJobId: null, toolName: event.toolName, target: scope.target, backgroundRunning: false });
    ledger.append("lease_acquired", { ...leaseFields(result), recovered: result.recovered, ts: Date.now() });
    if (result.recovered === true) ledger.append("lease_recovered", { ...leaseFields(result), ts: Date.now() });
  };
  const registerBuiltinWrappers = (): void => {
    if (builtinWrappersRegistered) return;
    let configuredTools: BuiltinTool[] = [];
    try { configuredTools = pi.getAllTools?.() ?? []; } catch {}
    let registered = false;
    for (const candidate of configuredTools) {
      if (!["write", "edit", "bash"].includes(candidate.name) || candidate.sourceInfo?.source !== "builtin" || !candidate.description || !candidate.parameters) continue;
      const name = candidate.name;
      pi.registerTool({ name, label: name, description: candidate.description, parameters: candidate.parameters, approval: name === "bash" ? "exec" : "write", execute: async (toolCallId: string, params: ToolInput, signal: AbortSignal | undefined, onUpdate: (result: ToolResultPayload) => void, context: ExtensionContext): Promise<ToolResultPayload> => { const event: ToolCallEvent = { toolName: name, toolCallId, input: params, sessionId: context.sessionManager?.getSessionId?.() }; const scope = leaseScope(event, context, evidence.repoRoot); const blocked = scope ? await acquireOperation(event, context, scope) : undefined; if (blocked?.block) throw new Error(blocked.reason ?? "mutation lease is unavailable"); if (!context.invokeTool) throw new Error(`native ${name} tool is unavailable`); return context.invokeTool(params, { signal, onUpdate }); } });
      registered = true;
    }
    builtinWrappersRegistered = registered;
  };
  const bindRepository = (input: ToolInput, context: ExtensionContext): void => {
    if (!requestId || evidence.baselineSha !== null) return;
    for (const candidate of repositoryCandidates(input, context.cwd)) { const baseline = capturebaseline(candidate); if (baseline.sha === null || baseline.repo_root === null) continue; evidence.baselineSha = baseline.sha; evidence.baselineDirty = baseline.dirty; evidence.baselineSnapshots = baseline.snapshots; evidence.repoRoot = baseline.repo_root; appendJournal("repository_bound", { repo_root: baseline.repo_root, baseline_sha: baseline.sha, baseline_dirty: [...baseline.dirty].sort(), baseline_snapshots: baseline.snapshots }); try { context.ui?.setStatus?.("gate", armingStatus()); } catch {} return; }
  };
  const reportRepositoryLimit = (input: ToolInput, context: ExtensionContext): void => {
    if (!evidence.repoRoot || (!input.cwd && !input.path && !input.paths)) return;
    for (const candidate of repositoryCandidates(input, context.cwd)) { const root = capturebaseline(candidate).repo_root; if (!root || root === evidence.repoRoot || evidence.warnedRepoRoots.has(root)) continue; evidence.warnedRepoRoots.add(root); try { pi.appendEntry("omp.gate-checker.repository-limit", { authoritative_root: evidence.repoRoot, ignored_root: root, ts: Date.now() }); } catch {} }
  };
  const restoreJournal = (context: ExtensionContext): void => {
    releaseAllOperations("journal_restore");
    const currentRoot = evidence.repoRoot ?? capturebaseline(context.cwd).repo_root;
    releaseStaleSessionLease(currentRoot, context.sessionManager?.getSessionFile?.(), "journal_restore_stale");
    const state = journalfrombranch(context.sessionManager?.getBranch?.() ?? []);
    if (state.status !== "active") { requestId = null; continuationCount = 0; lastBlockingKey = null; journalRecovery = state.status === "recovery_required" ? state.reason ?? "gate journal recovery required" : null; if (journalRecovery) try { context.ui?.setStatus?.("gate", "⚠ gate journal recovery required"); } catch {} return; }
    const current = capturebaseline(context.cwd);
    if (state.policy_fingerprint !== policyFingerprint() || (current.repo_root && current.repo_root !== state.repo_root) || state.baseline_sha === null) { requestId = null; continuationCount = 0; lastBlockingKey = null; journalRecovery = "the restored request lacks complete adjudication evidence; start a fresh request"; try { context.ui?.setStatus?.("gate", "⚠ stale gate journal closed"); } catch {} return; }
    requestId = state.request_id; continuationCount = state.continuation; lastBlockingKey = state.failure_hash; const prior = evidence.interrogations; evidence = freshEvidence(); for (const [key, answers] of prior) evidence.interrogations.set(key, answers); evidence.hadToolCalls = true; evidence.baselineSha = state.baseline_sha; evidence.baselineSnapshots = state.baseline_snapshots; evidence.baselineDirty = new Set(state.baseline_dirty); evidence.repoRoot = state.repo_root;
  };
  const terminalJournal = (outcome: string, fields: TerminalFields = {}): void => { appendJournal("terminal", { outcome, ...fields }); releaseOrphanedOperations("terminal_journal"); requestId = null; journalRecovery = null; };
  const recordProvenance = (record: SubagentEvidence | null): void => { if (record) evidence.subagents = mergeprovenance(evidence.subagents, record); };
  const armingStatus = (): string => { if (!policy.enabled) return "gate: off"; const bits = [`gate: ${config.level}`]; if (policy.verify !== "off" && config.verifyCmd) bits.push(`verify: ${config.verifyCmd}`); if (policy.complexity !== "off" && config.complexityCmd) bits.push(`complexity: ${config.complexityCmd}`); if (policy.commit === "block") bits.push("commit required"); return bits.join(" · "); };
  const leaseStatusReport = (context: ExtensionContext): string => {
    const cwd = evidence.repoRoot ?? context.cwd; const lines = [`mutation lease enabled: ${leaseEnabled ? "on" : "off"}`, `owned active operations: ${activeOperations.size}`]; for (const [id, operation] of activeOperations) lines.push(`  tool call: ${id} · tool name: ${operation.toolName} · target: ${operation.target ?? "unknown"}`); let status: LeaseStatus | null = null; try { status = inspectlease({ cwd }); } catch {} if (!status) return `${lines.join("\n")}\ncurrent holder: unknown`; const record = status.record; let formatted = ""; try { formatted = formatleasestatus(status, { relation: resolveLeaseRelation(context.sessionManager?.getSessionFile?.(), record?.session_file), cwd }); } catch {} lines.push(`current holder: ${formatted || "unknown"}`); return lines.join("\n");
  };
  const applyLevel = (level: string, context: ExtensionContext): void => { if (!LEVELS.includes(level)) { context.ui?.notify?.(`unknown level "${level}". use low, medium, or high.`, "error"); return; } config = { ...config, level }; policy = policyFor(level); verifyCache = null; lastBlockingKey = null; try { const saved = saveConfig(level, config.verifyCmd, config.complexityCmd); if (!saved.ok) context.ui?.notify?.(`could not save gate config: ${saved.error}`, "error"); } catch (error) { context.ui?.notify?.(`could not save gate config: ${String(error)}`, "error"); } context.ui?.notify?.(`${describeLevel(level, config.verifyCmd, config.complexityCmd)}\nsource: ${CONFIG_PATH}`, "info"); context.ui?.setStatus?.("gate", armingStatus()); };

  pi.registerCommand("gates-lease", { description: "show or change the mutation lease for this session", getArgumentCompletions: (prefix: string) => ["status", "on", "off"].filter((value) => value.startsWith(prefix.trim().toLowerCase())).map((value) => ({ value, label: value })), handler: async (args: string, context: ExtensionContext): Promise<void> => { const command = args.trim().toLowerCase() || "status"; if (command === "status") { context.ui?.notify?.(leaseStatusReport(context), "info"); return; } if (command === "on") { leaseEnabled = true; context.ui?.notify?.(leaseStatusReport(context), "info"); return; } if (command !== "off") { context.ui?.notify?.("usage: /gates-lease status|on|off", "error"); return; } if (activeOperations.size) { context.ui?.notify?.("cannot disable mutation lease while an operation is active", "error"); return; } const cwd = evidence.repoRoot ?? context.cwd; try { const status: LeaseStatus = inspectlease({ cwd }); const record = status.record; if (status.status === "held" && status.kind === "v2" && status.valid === true && record?.owner_id === leaseOwnerId) { const released = Boolean(releaselease(record, { cwd })); if (!released) { context.ui?.notify?.("cannot disable mutation lease: current lease could not be released", "error"); return; } ledger.append("lease_manual_release", { ...leaseFields(record), mode: "off", ts: Date.now() }); } leaseEnabled = false; context.ui?.notify?.(leaseStatusReport(context), "info"); } catch (error) { context.ui?.notify?.(`cannot disable mutation lease: ${error instanceof Error ? error.message : String(error)}`, "error"); } } });
  pi.registerCommand("gates-engage", {
    description: "show or change the gate engagement level: low, medium, or high",
    getArgumentCompletions: (prefix: string) => LEVELS
      .filter((level) => level !== "off" && level.startsWith(prefix.trim().toLowerCase()))
      .map((level) => ({ value: level, label: level })),
    handler: async (args: string, context: ExtensionContext): Promise<void> => {
      const parts = args.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!parts.length) {
        context.ui?.notify?.(`${describeLevel(config.level, config.verifyCmd, config.complexityCmd)}\nsource: ${CONFIG_PATH}`, "info");
        return;
      }
      if (parts.length > 1) {
        context.ui?.notify?.("trailing text cannot set a verification command; use OMP_VERIFY_CMD or the persisted config", "error");
        return;
      }
      const level = parts[0];
      if (level === "off" || !LEVELS.includes(level)) {
        context.ui?.notify?.(`unknown level "${level}". use low, medium, or high. to turn the gates off entirely use /gates-disable.`, "error");
        return;
      }
      applyLevel(level, context);
    },
  });
  pi.registerCommand("gates-disable", { description: "turn every gate off", handler: async (_args: string, context: ExtensionContext): Promise<void> => applyLevel("off", context) });
  pi.registerCommand("advisor-install", { description: "install or update the bundled terra advisor", handler: async (args: string, context: ExtensionContext): Promise<void> => { if (args.trim()) { context.ui?.notify?.("/advisor-install accepts no arguments", "error"); return; } try { const file = installadvisor(); context.ui?.notify?.(`advisor install: installed terra at ${file}\nstart a new omp session to activate terra`, "info"); } catch (error) { context.ui?.notify?.(`advisor install: ${error instanceof Error ? error.message : String(error)}`, "error"); } } });
  const frustrationSchema = pi.zod.object({ agent_id: pi.zod.string().describe("your assigned id (e.g. \"main\" or the subagent id)"), primary_goal: pi.zod.string().describe("the goal you were assigned for this request"), complaint: pi.zod.string().describe("what went wrong or what blocked you; use \"none\" with type \"none\""), type: pi.zod.string().describe("friction category, or none for a friction-free session"), severity: pi.zod.string().describe("low, medium, high, or blocker; type \"none\" requires low"), evidence: pi.zod.array(pi.zod.union([pi.zod.object({ kind: pi.zod.literal("gate"), event_id: pi.zod.string(), rule: pi.zod.string() }), pi.zod.object({ kind: pi.zod.literal("snapshot"), path: pi.zod.string(), line: pi.zod.number(), digest: pi.zod.string(), claim: pi.zod.string() }), pi.zod.object({ kind: pi.zod.literal("command"), command: pi.zod.string(), exit_code: pi.zod.number(), output: pi.zod.string() })])) });
  pi.registerTool({ name: "record_frustration", label: "record frustration", description: "log friction from the current session. papercuts count even when nothing failed.", approval: "write", parameters: frustrationSchema, execute: async (_toolCallId: string, params: FrustrationInput, _signal: AbortSignal | undefined, _onUpdate: (result: ToolResultPayload) => void, context: ExtensionContext): Promise<ToolResultPayload> => { const taxonomyRoot = evidence.repoRoot ?? context.cwd; const result = validateFrustration(params, { repoRoot: taxonomyRoot, requestId: requestId ?? undefined, cwd: context.cwd, sessionFile: context.sessionManager?.getSessionFile?.(), sessionId: context.sessionManager?.getSessionId?.(), source: "agent" }); if (!result.ok) return { isError: true, content: [{ type: "text", text: `validation error: ${result.error}` }] }; const appended = appendFrustration(result.record, undefined, { repoRoot: taxonomyRoot }); if (!appended.ok) return { isError: true, content: [{ type: "text", text: `append error: ${appended.error}` }] }; if (params.type === "none" && (evidence.hadtoolerror || evidence.hadblockingfailure)) ledger.append("clean_under_errors", { agent_id: params.agent_id, request_id: requestId }); return { content: [{ type: "text", text: `recorded frustration for ${params.agent_id}: ${params.complaint}` }] }; } });
  const interrogationSchema = pi.zod.object({ unnecessary: pi.zod.string().describe("what here is unnecessary, overly complicated, or based on weak assumptions"), deleted: pi.zod.string().describe("what you deleted entirely. be aggressive"), simplified: pi.zod.string().describe("what you simplified once the unnecessary pieces were gone") });
  pi.registerTool({ name: "interrogate", label: "interrogate the build", description: "answer the three first-principles questions against what you just built. required once per changed generation when the gate reports a trigger.", approval: "write", parameters: interrogationSchema, execute: async (_toolCallId: string, params: InterrogationAnswers, _signal: AbortSignal | undefined, _onUpdate: (result: ToolResultPayload) => void, context: ExtensionContext): Promise<ToolResultPayload> => { const generationHash = treeStateKey(evidence.repoRoot ?? context.cwd, evidence.baselineSha !== null, evidence.preTouch); evidence.interrogations.set(generationHash, params); ledger.append("gate_eval", { rules: ["interrogate"], tree_fingerprint: generationHash, ...params, request_id: requestId }); appendJournal("verify", { verify_id: `interrogate:${generationHash}`, outcome: "interrogated", tree_fingerprint: generationHash, ...params }); return { content: [{ type: "text", text: `interrogation recorded for generation ${generationHash}` }] }; } });

  const deriveRequestState = (
    context: ExtensionContext,
    assistantText: string,
    failures: GateFailure[],
  ): RequestState => {
    const cwd = context.cwd;
    const sessionFile = context.sessionManager?.getSessionFile?.();
    const sessionId = context.sessionManager?.getSessionId?.();
    const taxonomyRoot = evidence.repoRoot ?? cwd;
    const hasGit = evidence.baselineSha !== null;
    const gitCwd = evidence.repoRoot ?? cwd;
    let changedFiles = new Set<string>();
    let added: AddedMap = new Map();
    let watched: Set<string> | null = null;
    let dayOneTrigger = false;
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
        added = new Map(Object.entries(scope.added));
        const external = noGitDiff(evidence.preTouch, cwd);
        for (const path of external.changed) changedFiles.add(path);
        for (const [path, lines] of external.added) added.set(path, lines);
        const risk = auditscope(scope);
        dayOneTrigger = scope.files.some((file) =>
          ["added", "renamed", "untracked"].includes(file.type)
        ) || [...external.changed].some((path) => evidence.preTouch.get(path) === null)
          || risk.findings.some((finding) => finding.id === "risk.dependencies");
        for (const finding of risk.findings) {
          const line = finding.evidence.line ? `:${finding.evidence.line}` : "";
          failures.push({
            gate: "risk",
            rule: finding.id,
            severity: "warn",
            detail: `${finding.evidence.path}${line}: ${finding.evidence.detail} (scope ${scope.digest.slice(0, 12)})`,
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
      const scope = noGitDiff(evidence.preTouch, cwd);
      changedFiles = scope.changed;
      added = scope.added;
      const risk = auditscope({
        files: [...changedFiles].map((path) => ({
          path,
          type: evidence.preTouch.get(path) === null ? "added" : "modified",
        })),
        added: Object.fromEntries(added),
      });
      dayOneTrigger = [...changedFiles].some((path) => evidence.preTouch.get(path) === null)
        || risk.findings.some((finding) => finding.id === "risk.dependencies");
      watched = new Set([...evidence.preTouch.keys()].map(normalizePath));
      try {
        pi.appendEntry("omp.gate-checker.no-git", {
          reason: "no-git-repo",
          watched: evidence.preTouch.size,
          ts: Date.now(),
        });
      } catch {}
    }

    return {
      assistantText,
      cwd,
      sessionFile,
      sessionId,
      taxonomyRoot,
      hasGit,
      gitCwd,
      markers: loadForbiddenMarkers(taxonomyRoot),
      changedFiles,
      added,
      watched,
      dayOneTrigger,
      canAdjudicate,
      changedCount: canAdjudicate ? changedFiles.size : 0,
    };
  };

  const collectDeliveryFailures = (
    context: ExtensionContext,
    state: RequestState,
    failures: GateFailure[],
  ): void => {
    if (evidence.ttsrHits.has("no-absolute-home-path")) {
      for (const [path, lines] of state.added) {
        for (const line of lines) {
          for (const condition of homePathConditions()) {
            condition.lastIndex = 0;
            if (condition.test(line.text)) {
              failures.push({
                gate: "completion",
                rule: "no-absolute-home-path",
                detail: `${path} line ${line.line}: interrupted once, rewritten with the path still present`,
              });
            }
          }
        }
      }
    }

    if (state.canAdjudicate && state.changedCount > 0 && state.dayOneTrigger) {
      const generationHash = treeStateKey(state.gitCwd, state.hasGit, evidence.preTouch);
      if (!evidence.interrogations.has(generationHash)) {
        failures.push({
          gate: "completion",
          rule: "missing_interrogation",
          detail: `changed generation ${generationHash} requires one interrogate call; answer all three first-principles questions before yielding.`,
        });
      }
    }

    if (state.canAdjudicate && state.changedCount > 0) {
      if (policy.verify !== "off" && config.verifyCmd) {
        const key = treeStateKey(state.gitCwd, state.hasGit, evidence.preTouch);
        if (!verifyCache || verifyCache.key !== key) {
          try { context.ui?.setStatus?.("gate", `running verify: ${config.verifyCmd}`); } catch {}
          const failure = runVerifyGate(state.hasGit ? state.gitCwd : state.cwd, config.verifyCmd);
          verifyCache = failure ? null : { key };
          evidence.verifyPassed = !failure;
          if (failure) failures.push(failure);
          appendJournal("verify", {
            verify_id: randomUUID(),
            outcome: failure ? "failed" : "passed",
            tree_fingerprint: key,
          });
          ledger.append("gate_eval", {
            rules: [failure ? "verify_failed" : "verify_passed"],
            cmd: config.verifyCmd,
            cwd: state.gitCwd,
          });
        } else {
          evidence.verifyPassed = true;
        }
      } else if (policy.verify === "block" && !config.verifyCmd && !ranTestRunner(evidence)) {
        failures.push({
          gate: "verify",
          rule: "no_test_run",
          detail: `changed ${state.changedCount} files, ran no passing test command. run the project's test command, or set gates verifyCmd <cmd>.`,
        });
      }

      if (policy.complexity !== "off" && config.complexityCmd) {
        try { context.ui?.setStatus?.("gate", `running complexity: ${config.complexityCmd}`); } catch {}
        const failure = runComplexityGate(state.gitCwd, config.complexityCmd, state.changedFiles);
        if (failure) failures.push(failure);
      }
      if (policy.commit !== "off" && state.hasGit) {
        const failure = runCommitGate(state.gitCwd);
        if (failure) failures.push(failure);
      }
    }

    if (state.canAdjudicate) {
      failures.push(
        ...checkCitations(
          state.assistantText,
          evidence.subagents,
          state.changedFiles,
          evidence,
          state.hasGit,
          state.cwd,
          state.watched,
        ),
        ...checkAddedLines(state.added, state.markers),
      );
    }
  };

  const recordIdentityCoverage = (state: RequestState, failures: GateFailure[]): void => {
    const records = readFrustrations(undefined, { repoRoot: state.taxonomyRoot });
    if (requestId) {
      for (const failure of applyPolicy(failures, policy)) {
        const severity = failure.severity ?? "block";
        if (failure.rule === "missing_frustration_record") continue;
        const validated = validateFrustration(automaticGateRecord({
          request_id: requestId,
          rule: failure.rule,
          detail: failure.detail,
          blocking: severity === "block",
          repo_root: state.taxonomyRoot,
          cwd: state.cwd,
          session_file: state.sessionFile,
          session_id: state.sessionId,
        }), {
          repoRoot: state.taxonomyRoot,
          requestId,
          cwd: state.cwd,
          sessionFile: state.sessionFile,
          sessionId: state.sessionId,
          source: "auto",
        });
        if (validated.ok
          && appendFrustration(validated.record, undefined, { repoRoot: state.taxonomyRoot }).ok) {
          records.push(validated.record);
        }
      }
    }
    const identities: Array<{ agent_id: string; session_file: string | null }> = [
      { agent_id: "main", session_file: state.sessionFile ?? null },
      ...evidence.subagents.map((subagent) => ({
        agent_id: subagent.id || "subagent",
        session_file: subagent.session_file,
      })),
    ];
    failures.push(...checkFrustrations(records, identities, state.taxonomyRoot));
  };

  const settleRequest = (
    context: ExtensionContext,
    state: RequestState,
    failures: GateFailure[],
  ): SessionStopResult | void => {
    const candidate = processCandidate(evidence, state.changedCount);
    const recordProcess = (
      outcome: "gates_clean" | "released_with_failures",
      release_reason: string | null = null,
    ): void => ledger.append("process_shape", {
      ...candidate,
      outcome,
      release_reason,
      hasGit: state.hasGit,
      subagents: evidence.subagents.length,
      continuations: continuationCount,
      cwd: state.cwd,
    });
    const graded = applyPolicy(failures, policy);
    const blocking = graded.filter((failure) => (failure.severity ?? "block") === "block");
    const warnings = graded.filter((failure) => failure.severity === "warn");

    if (warnings.length) {
      ledger.append("gate_eval", {
        rules: warnings.map((failure) => failure.rule),
        failures: warnings.map((failure) => ({ rule: failure.rule, detail: failure.detail })),
        severity: "warn",
        forced: false,
        hasGit: state.hasGit,
        cwd: state.cwd,
      });
      try {
        context.ui?.notify?.(
          `gate checker: ${warnings.length} warning(s) — ${warnings.map((failure) => failure.rule).join(", ")}`,
          "info",
        );
      } catch {}
    }

    const blockingKey = blocking.length
      ? hashContent(blocking.map((failure) => `${failure.rule}::${failure.detail}`).sort().join("\n"))
      : null;
    if (blockingKey && continuationCount > 0 && blockingKey === lastBlockingKey) {
      recordProcess("released_with_failures", "stalemate");
      try {
        const rules = [...new Set(blocking.map((failure) => failure.rule))].join(", ");
        context.ui?.notify?.(
          `gate checker: ${blocking.length} failure(s) unchanged after a retry — releasing. rules: ${rules}`,
          "warning",
        );
        context.ui?.setStatus?.(
          "gate",
          `⚠ ${blocking.length} failure(s) — released with failures (stalemate)`,
        );
      } catch {}
      ledger.append("chain_end", {
        outcome: "released_with_failures",
        release_reason: "stalemate",
        continuations: continuationCount,
        rules: blocking.map((failure) => failure.rule),
        failures: blocking.map((failure) => ({ rule: failure.rule, detail: failure.detail })),
        hasGit: state.hasGit,
        cwd: state.cwd,
      });
      terminalJournal("released_with_failures", { release_reason: "stalemate" });
      continuationCount = 0;
      lastBlockingKey = null;
      return;
    }
    lastBlockingKey = blockingKey;

    if (!blocking.length) {
      recordProcess("gates_clean");
      try {
        context.ui?.setStatus?.(
          "gate",
          state.hasGit ? "✓ gates passed" : "✓ gates passed · low: no git",
        );
      } catch {}
      if (continuationCount > 0) {
        ledger.append("chain_end", {
          outcome: "resolved",
          continuations: continuationCount,
          hasGit: state.hasGit,
          cwd: state.cwd,
        });
      }
      terminalJournal(warnings.length ? "passed_with_warnings" : "passed");
      continuationCount = 0;
      lastBlockingKey = null;
      return;
    }

    if (blocking.some((failure) => failure.rule !== "missing_frustration_record")) {
      evidence.hadblockingfailure = true;
    }
    const rules = blocking.map((failure) => failure.rule);
    continuationCount++;
    ledger.append("gate_eval", {
      rules,
      failures: blocking.map((failure) => ({ rule: failure.rule, detail: failure.detail })),
      continuationCount,
      forced: continuationCount <= MAX_CONTINUATIONS,
      hasGit: state.hasGit,
      cwd: state.cwd,
      subagents: evidence.subagents.length,
    });
    appendJournal("continuation", { continuation: continuationCount, failure_hash: blockingKey });

    if (continuationCount > MAX_CONTINUATIONS) {
      recordProcess("released_with_failures", "continuation_cap");
      try {
        context.ui?.notify?.(
          `gate checker: ${blocking.length} unresolved failure(s) after ${continuationCount} continuations — review manually`,
          "warning",
        );
        context.ui?.setStatus?.(
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
      ledger.append("chain_end", {
        outcome: "released_with_failures",
        release_reason: "continuation_cap",
        continuations: continuationCount,
        rules,
        failures: blocking.map((failure) => ({ rule: failure.rule, detail: failure.detail })),
        hasGit: state.hasGit,
        cwd: state.cwd,
      });
      terminalJournal("released_with_failures", { release_reason: "continuation_cap" });
      continuationCount = 0;
      lastBlockingKey = null;
      return;
    }

    try {
      context.ui?.setStatus?.(
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
    return { continue: true, additionalContext: formatFailures(blocking) };
  };

  const completionDecision = async (
    context: ExtensionContext,
  ): Promise<SessionStopResult | void> => {
    if (!policy.enabled) {
      terminalJournal("skipped_disabled");
      continuationCount = 0;
      return;
    }
    const assistantText = getLastAssistantText(context) ?? "";
    if (shouldSkipNoTools(evidence.hadToolCalls, assistantText, journalRecovery)) {
      terminalJournal("skipped_no_tools");
      continuationCount = 0;
      return;
    }
    const mutated = evidence.filesTouched.size > 0 || evidence.hadtoolerror;
    if (!assistantText && !evidence.askedUser && !journalRecovery && !mutated) {
      terminalJournal("skipped_no_assistant_text");
      continuationCount = 0;
      return;
    }

    const failures: GateFailure[] = [];
    if (journalRecovery) {
      failures.push({ gate: "journal", rule: "recovery_required", detail: journalRecovery });
    }
    const state = deriveRequestState(context, assistantText, failures);
    collectDeliveryFailures(context, state, failures);
    recordIdentityCoverage(state, failures);
    const missingRecord = failures.some(
      (failure) => failure.rule === "missing_frustration_record",
    );
    if (canSkipUserQuestion(
      evidence.askedUser,
      state.changedCount,
      journalRecovery,
      missingRecord,
    )) {
      terminalJournal("skipped_user_question");
      continuationCount = 0;
      return;
    }
    return settleRequest(context, state, failures);
  };

  const events = pi.events;
  events.on("task:subagent:event", (payload: SubagentEvent) => { const parsed = parseEvent(subagentEventSchema, payload); if (parsed) recordProvenance(provenancefromevent(parsed)); });
  events.on("task:subagent:lifecycle", (payload: LifecycleEvent) => { const parsed = parseEvent(lifecycleSchema, payload); if (!parsed) return; const record = provenancefromlifecycle(parsed); recordProvenance(record); if (record && ["completed", "failed", "aborted"].includes(record.status) && record.session_file) releaseStaleSessionLease(evidence.repoRoot, record.session_file, "child_lifecycle"); });
  pi.on("agent_end", (event: AgentEndEvent) => { const parsed = parseEvent(agentEndSchema, event); if (!parsed?.willContinue) releaseOrphanedOperations("agent_end"); });
  pi.on("session_start", (event: SessionEvent, context: ExtensionContext) => { if (!parseEvent(eventSchema, event)) return; registerBuiltinWrappers(); restoreJournal(context); const status = requestId ? `${armingStatus()} · resumed` : policy.enabled && capturebaseline(context.cwd).sha === null ? `${armingStatus()} · low: no git` : armingStatus(); try { context.ui?.setStatus?.("gate", status); } catch {} });
  pi.on("session_branch", (event: SessionEvent, context: ExtensionContext) => { if (parseEvent(eventSchema, event)) restoreJournal(context); });
  pi.on("session_tree", (event: SessionEvent, context: ExtensionContext) => { if (parseEvent(eventSchema, event)) restoreJournal(context); });
  pi.on("session_shutdown", (event: SessionEvent) => { if (parseEvent(eventSchema, event)) releaseAllOperations("session_shutdown"); });
  pi.on("ttsr_triggered", (event: RuleEvent) => { const parsed = parseEvent(ttsrSchema, event); if (parsed?.rules) for (const rule of parsed.rules) evidence.ttsrHits.add(rule.name); });
  pi.on("agent_start", (event: SessionEvent, context: ExtensionContext) => { if (!parseEvent(eventSchema, event)) return; registerBuiltinWrappers(); if (continuationCount > 0) return; releaseOrphanedOperations("agent_start"); if (requestId) lastBlockingKey = null; evidence = freshEvidence(); const baseline = capturebaseline(context.cwd); evidence.baselineSha = baseline.sha; evidence.baselineDirty = baseline.dirty; evidence.repoRoot = baseline.repo_root; evidence.baselineSnapshots = baseline.snapshots; requestId = randomUUID(); appendJournal("request_start", { repo_root: baseline.repo_root ?? context.cwd, baseline_sha: baseline.sha, baseline_dirty: [...baseline.dirty].sort(), baseline_snapshots: baseline.snapshots, policy_fingerprint: policyFingerprint() }); if (baseline.sha === null) { try { context.ui?.setStatus?.("gate", `${armingStatus()} · low: no git`); } catch {} ledger.append("no_git", { reason: "no-git-repo", cwd: context.cwd }); } else try { context.ui?.setStatus?.("gate", armingStatus()); } catch {} });
  pi.on("tool_call", async (event: ToolCallEvent, context: ExtensionContext): Promise<ToolCallResult | void> => { const parsed = parseEvent(toolCallSchema, event); if (!parsed) return; evidence.hadToolCalls = true; if (!policy.enabled) return; bindRepository(parsed.input, context); reportRepositoryLimit(parsed.input, context); if (parsed.toolName === "ask") evidence.askedUser = true; if ((parsed.toolName === "write" || parsed.toolName === "edit") && parsed.input.path) { const declaredCwd = parsed.input.cwd ? resolvePath(context.cwd, parsed.input.cwd) : context.cwd; const abs = isAbsolute(parsed.input.path) ? parsed.input.path : resolvePath(declaredCwd, parsed.input.path); const outside = evidence.repoRoot !== null && !isInside(evidence.repoRoot, abs); const evidencePath = isInside(context.cwd, abs) ? normalizePath(relative(context.cwd, abs)) : abs; if ((evidence.baselineSha === null || outside) && !evidence.preTouch.has(evidencePath)) evidence.preTouch.set(evidencePath, readSnapshot(abs)); evidence.filesTouched.add(parsed.input.path); } if (parsed.toolName === "bash") { const rewritten = commitRoutingEnabled && (rewriteGitCommit(parsed.input.command ?? "", COMMIT_SCRIPT_PATH) ?? rewriteSmartCommit(parsed.input.command ?? "", COMMIT_SCRIPT_PATH)); if (rewritten) return { input: { ...parsed.input, command: rewritten } }; } if (parsed.toolName === "task") { if (parsed.input.tasks) return { input: { ...parsed.input, context: `${GATE_NUDGE}${parsed.input.context ?? ""}` } }; return { input: { ...parsed.input, task: `${GATE_NUDGE}${parsed.input.task ?? ""}` } }; } });
  pi.on("tool_result", async (event: ToolResultEvent, context: ExtensionContext): Promise<ToolResultPayload | void> => { const parsed = parseEvent(toolResultSchema, event); if (!parsed) return; const operation = activeOperations.get(parsed.toolCallId); if (parsed.toolName === "bash" && asyncState(parsed.details) === "running" && operation) { operation.backgroundRunning = true; operation.asyncJobId = asyncJobId(parsed.details); pollAsyncOperation(parsed.toolCallId, operation, context); } else if (operation) releaseOperation(parsed.toolCallId, parsed.isError ? "tool_error" : "tool_result"); if (parsed.isError) evidence.hadtoolerror = true; if (parsed.toolName === "read" || parsed.toolName === "edit") for (const ref of extractSnapshotRefs(extractText(parsed.content))) evidence.snapshotTags.add(ref.tag); if (policy.inline && (parsed.toolName === "write" || parsed.toolName === "edit") && !parsed.isError) { const path = parsed.input.path ?? ""; const inline = inlineAdditions(parsed.toolName, path, parsed.input, parsed.details); if (inline) { const fresh = checkAddedLines(inline, loadForbiddenMarkers(evidence.repoRoot ?? context.cwd)).filter((hit) => !evidence.flaggedInline.has(hit.detail)); if (fresh.length) { for (const hit of fresh) { evidence.flaggedInline.add(hit.detail); ledger.append("inline_flag", { rule: hit.rule, path, detail: hit.detail, tool: parsed.toolName }); } const content = Array.isArray(parsed.content) ? parsed.content : [{ type: "text", text: parsed.content }]; return { content: [...content, { type: "text", text: `\n[GATE CHECKER — inline]\n${fresh.map((hit) => `  • ${hit.detail}`).join("\n")}\nFix this now, while you are in the file. If left, the completion gate will block the whole response at the end of the turn.` }] }; } } } if (parsed.toolName === "bash") evidence.bashCommands.push({ cmd: parsed.input.command ?? "", isError: parsed.isError }); if (parsed.toolName === "task" && !parsed.isError) { const records = provenancefromdetails(parsed.toolCallId, parsed.details); for (const record of records) recordProvenance(record); if (!records.length && !parsed.details?.async) { const report = extractText(parsed.content); if (report) { const manifest = extractManifest(report); recordProvenance({ task_call_id: parsed.toolCallId, id: `legacy:${parsed.toolCallId}`, agent: null, status: "completed", exit_code: 0, error: null, duration_ms: null, model: null, session_file: null, output_path: null, patch_path: null, branch_name: null, branch_base_sha: null, report, manifest, manifest_source: manifest === null ? null : "report" }); } } } });
  pi.on("tool_execution_update", (event: ExecutionUpdateEvent) => { const parsed = parseEvent(executionUpdateSchema, event); if (!parsed) return; const state = asyncState(parsed.partialResult.details); if (state === "completed" || state === "failed" || state === "cancelled") releaseOperation(parsed.toolCallId, `async_${state}`); });
  pi.on("session_stop", async (event: SessionEvent, context: ExtensionContext): Promise<SessionStopResult | void> => { const parsed = parseEvent(eventSchema, event); if (!parsed) return; return (await completionDecision(context)) ?? (await questionnaireStop(parsed, context)) ?? (await omnipotenceStop(parsed, context)); });
}
