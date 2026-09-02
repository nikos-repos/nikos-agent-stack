import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  linkSync, mkdirSync, readFileSync, realpathSync, readdirSync, renameSync,
  rmSync, statSync, writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { isFunction, isRecord, isText, parseJsonObject } from "./predicates.js";

const default_poll_interval_ms = 50;
const default_poll_jitter_ms = 5;
const default_acquisition_wait_ms = 5_000;
const default_heartbeat_interval_ms = 2_000;
const default_stale_heartbeat_ms = 30_000;
const default_dead_pid_grace_ms = 2_000;
const sleep_signal = new Int32Array(new SharedArrayBuffer(4));

function git(cwd, args) {
  return execFileSync("git", args, { cwd, encoding: "utf8", timeout: 5_000, stdio: ["ignore", "pipe", "pipe"] }).trim();
}
export function identity(cwd = ".") {
  const root = isText(cwd) && cwd ? cwd : ".";
  const repo_root = realpathSync(git(root, ["rev-parse", "--show-toplevel"]));
  const raw = git(root, ["rev-parse", "--git-common-dir"]);
  const common_dir = realpathSync(raw.startsWith("/") ? raw : resolve(root, raw));
  const key = createHash("sha256").update(`${common_dir}\n${repo_root}`).digest("hex").slice(0, 24);
  return { repo_root, common_dir, key };
}
function optionsOf(input) {
  if (isText(input)) return { cwd: input };
  return isRecord(input) ? input : {};
}
const nonempty = (value) => isText(value) && value.trim().length > 0;
function optionNumber(options, names, fallback) {
  for (const name of names) if (Number.isFinite(options[name])) return Number(options[name]);
  return fallback;
}
function clockOf(options) {
  if (isFunction(options.clock)) return options.clock;
  if (Number.isFinite(options.now)) return () => Number(options.now);
  return () => Date.now();
}
function nowOf(options) {
  const now = Number(clockOf(options)());
  if (!Number.isFinite(now)) throw new Error("lease clock must return a finite number");
  return now;
}
const staleMs = (options) => Math.max(0, optionNumber(options, ["stale_heartbeat_ms", "stale_ms"], default_stale_heartbeat_ms));
const waitMs = (options) => Math.max(0, optionNumber(options, ["acquisition_wait_ms", "wait_ms"], default_acquisition_wait_ms));
const pollMs = (options) => Math.max(1, optionNumber(options, ["poll_interval_ms", "poll_ms"], default_poll_interval_ms));
const jitterMs = (options) => Math.max(0, optionNumber(options, ["poll_jitter_ms", "jitter_ms"], default_poll_jitter_ms));
export const heartbeatintervalms = (options = {}) => Math.max(1, optionNumber(options, ["heartbeat_interval_ms", "heartbeat_ms"], default_heartbeat_interval_ms));
const deadGraceMs = (options) => Math.max(0, optionNumber(options, ["dead_pid_grace_ms"], default_dead_pid_grace_ms));
function sleepSync(options, milliseconds) {
  const delay = Math.max(0, Math.round(milliseconds));
  if (isFunction(options.sleep)) { options.sleep(delay); return; }
  if (delay) Atomics.wait(sleep_signal, 0, 0, delay);
}
async function sleepAsync(options, milliseconds) {
  const delay = Math.max(0, Math.round(milliseconds));
  if (isFunction(options.sleep)) { await options.sleep(delay); return; }
  if (delay) await new Promise((done) => setTimeout(done, delay));
}
function nextDelay(options) {
  const random = isFunction(options.random) ? options.random : Math.random;
  const sample = Number(random());
  const bounded = Number.isFinite(sample) ? Math.min(1, Math.max(0, sample)) : 0.5;
  return Math.max(1, Math.round(pollMs(options) + (bounded * 2 - 1) * jitterMs(options)));
}
function processAlive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return String(error?.code ?? "").toLowerCase() === "eperm"; }
}
function leasePaths(scope) {
  const parent = join(scope.common_dir, "omp-gates", "leases");
  const path = join(parent, scope.key);
  const data_path = join(path, "lease.json");
  return { parent, path, data_path, initialization_path: join(path, "lease.init"), claims_path: `${data_path}.claims`, fence_path: join(parent, `${scope.key}.fence`) };
}
function requiredString(options, name) {
  if (!nonempty(options[name])) throw new Error(`lease ${name} is required`);
  return options[name];
}
function operationMetadata(options) {
  const pid = options.pid === undefined ? process.pid : Number(options.pid);
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error("lease pid must be a positive integer");
  const agent_id = options.agent_id === undefined ? null : options.agent_id;
  if (agent_id !== null && !nonempty(agent_id)) throw new Error("lease agent_id must be a non-empty string or null");
  const target = options.target === undefined || options.target === null ? null : options.target;
  if (target !== null && !nonempty(target)) throw new Error("lease target must be a non-empty string or null");
  return {
    owner_id: requiredString(options, "owner_id"), request_id: requiredString(options, "request_id"),
    session_id: requiredString(options, "session_id"), session_file: requiredString(options, "session_file"),
    agent_id, tool_call_id: requiredString(options, "tool_call_id"), tool_name: requiredString(options, "tool_name"), target, pid,
  };
}
function invalidLease(reason, kind = "malformed") {
  return { ok: false, kind, legacy: kind === "legacy", reason, error: reason };
}
export function validatelease(record) {
  if (!isRecord(record)) return invalidLease("lease record must be an object");
  if (!Object.prototype.hasOwnProperty.call(record, "schema")) return invalidLease("legacy v1 lease record has no schema", "legacy");
  if (record.schema !== 2) return invalidLease("lease record schema must be 2");
  if (record.acquired !== true) return invalidLease("lease record acquired must be true");
  if (record.scope !== "worktree") return invalidLease("lease record scope must be worktree");
  for (const field of ["repo_root", "common_dir", "path", "token", "owner_id", "request_id", "session_id", "session_file", "tool_call_id", "tool_name"])
    if (!nonempty(record[field])) return invalidLease(`lease record ${field} is required`);
  if (record.agent_id !== null && !nonempty(record.agent_id)) return invalidLease("lease record agent_id must be a non-empty string or null");
  if (record.target !== null && !nonempty(record.target)) return invalidLease("lease record target must be a non-empty string or null");
  if (!Number.isSafeInteger(record.fence) || record.fence < 1) return invalidLease("lease record fence must be a positive integer");
  if (!Number.isSafeInteger(record.pid) || record.pid < 1) return invalidLease("lease record pid must be a positive integer");
  if (!Number.isFinite(record.acquired_at)) return invalidLease("lease record acquired_at must be finite");
  if (!Number.isFinite(record.heartbeat_at)) return invalidLease("lease record heartbeat_at must be finite");
  if (record.heartbeat_at < record.acquired_at) return invalidLease("lease record heartbeat_at cannot precede acquired_at");
  return { ok: true, kind: "v2", legacy: false, record };
}
function readRecord(data_path) {
  let source;
  try { source = readFileSync(data_path, "utf8"); }
  catch (error) {
    if (String(error?.code ?? "").toLowerCase() === "enoent") return { kind: "missing", record: null, validation: null };
    throw error;
  }
  let record;
  try { record = JSON.parse(source); }
  catch (error) { return { kind: "malformed", record: null, validation: invalidLease(`lease record json is malformed: ${error.message}`) }; }
  const validation = validatelease(record);
  return { kind: validation.ok ? "v2" : validation.kind, record, validation };
}
function readInitialization(path) {
  try {
    const record = parseJsonObject(readFileSync(path, "utf8"));
    return record;
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (["enoent", "eisdir", "enotdir"].includes(code)) return null;
    throw error;
  }
}
function validInitialization(record) {
  return isRecord(record) && nonempty(record.token) && Number.isSafeInteger(record.pid) && record.pid > 0 && Number.isFinite(record.claimed_at);
}
function sameInitialization(current, expected) {
  return validInitialization(current) && validInitialization(expected) && current.pid === expected.pid && current.claimed_at === expected.claimed_at && current.token === expected.token;
}
const identityFields = ["schema", "acquired", "scope", "repo_root", "common_dir", "path", "token", "fence", "owner_id", "request_id", "session_id", "session_file", "agent_id", "tool_call_id", "tool_name", "target", "pid", "acquired_at"];
function sameIdentity(current, expected) {
  if (!isRecord(current) || !isRecord(expected)) return false;
  return identityFields.every((field) => current[field] === expected[field]);
}
function displayStatus(value) { return value === null || value === undefined || value === "" ? "unknown" : String(value); }
function formatAge(value, suffix = "") { return Number.isFinite(value) ? `${Math.max(0, Number(value) / 1_000).toFixed(1)}s${suffix}` : "unknown"; }
function shellQuote(value) { return `'${String(value).replace(/'/g, "'\\''")}'`; }

export function formatleasestatus(status, options = {}) {
  const cwd = options.cwd === undefined ? "." : shellQuote(options.cwd);
  const inspect = `inspect with: nikos-gates lease status --cwd ${cwd}`;
  if (!isRecord(status)) return `lease status unavailable; ${inspect}`;
  const state = status.status ?? status.kind;
  if (state === "free" || status.exists === false) return `worktree mutation lease is free; ${inspect}`;
  if (state === "legacy") return `legacy v1 lease record at ${displayStatus(status.data_path)}; ${inspect}; do not delete it`;
  if (state === "malformed") return `malformed v2 lease record at ${displayStatus(status.data_path)}; ${inspect}; do not delete it`;
  if (state === "initializing") return `worktree mutation lease is initializing; ${inspect}`;
  if (state !== "held" && status.acquired !== true) return `worktree mutation lease status ${displayStatus(state)}; ${inspect}`;
  const record = isRecord(status.record) ? status.record : isRecord(status.conflict) ? status.conflict : status;
  const waited = Number.isFinite(options.waited_ms) ? Math.max(0, Number(options.waited_ms)) : null;
  const title = waited === null ? "worktree mutation lease is held" : `worktree mutation busy after ${formatAge(waited)}`;
  const relation = nonempty(options.relation) ? options.relation : "unknown";
  return [title, `agent: ${displayStatus(record.agent_id)}`, `session: ${displayStatus(record.session_id)}`, `request: ${displayStatus(record.request_id)}`, `tool name: ${displayStatus(record.tool_name)}`, `target: ${displayStatus(record.target)}`, `tool call: ${displayStatus(record.tool_call_id)}`, `pid: ${displayStatus(record.pid)}`, `age: ${formatAge(status.age_ms)}`, `heartbeat age: ${formatAge(status.heartbeat_age_ms, " ago")}`, `fence: ${displayStatus(record.fence)}`, `relation: ${relation}`, inspect].join("\n");
}
function scopeEquals(record, scope, paths) { return isRecord(record) && record.repo_root === scope.repo_root && record.common_dir === scope.common_dir && record.path === paths.path; }
function freeStatus(scope, paths, dead_pid_grace_ms) {
  return { acquired: false, exists: false, status: "free", kind: "missing", valid: false, stale: false, heartbeat_stale: false, path: paths.path, data_path: paths.data_path, initialization_path: paths.initialization_path, fence_path: paths.fence_path, repo_root: scope.repo_root, common_dir: scope.common_dir, key: scope.key, record: null, validation: null, age_ms: null, heartbeat_age_ms: null, pid_alive: false, dead_pid_grace_ms, diagnostic: null };
}
export function inspectlease(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const paths = leasePaths(scope);
  const now = nowOf(options);
  const dead_pid_grace_ms = deadGraceMs(options);
  const stale_ms = staleMs(options);
  let directory = false;
  try { directory = statSync(paths.path).isDirectory(); }
  catch (error) { if (String(error?.code ?? "").toLowerCase() !== "enoent") throw error; }
  if (!directory) return freeStatus(scope, paths, dead_pid_grace_ms);
  const stored = readRecord(paths.data_path);
  let status = stored.kind;
  let record = stored.record;
  let validation = stored.validation;
  if (stored.kind === "missing") { status = "initializing"; record = readInitialization(paths.initialization_path); validation = null; }
  else if (stored.kind === "v2" && !scopeEquals(record, scope, paths)) { status = "malformed"; validation = invalidLease("lease record repository identity does not match its directory"); }
  if (status !== "v2") {
    const initialized = status === "initializing" && validInitialization(record);
    const age_ms = initialized ? Math.max(0, now - record.claimed_at) : null;
    const pid_alive = initialized ? processAlive(record.pid) : false;
    const stale = initialized && age_ms >= dead_pid_grace_ms && !pid_alive;
    const result = { acquired: false, exists: true, status, kind: status, valid: false, stale, heartbeat_stale: false, path: paths.path, data_path: paths.data_path, initialization_path: paths.initialization_path, fence_path: paths.fence_path, repo_root: scope.repo_root, common_dir: scope.common_dir, key: scope.key, record, validation, age_ms, heartbeat_age_ms: null, pid_alive, dead_pid_grace_ms, pid: initialized ? record.pid : null, claimed_at: initialized ? record.claimed_at : null, diagnostic: null };
    result.diagnostic = formatleasestatus(result, { cwd: options.cwd });
    return result;
  }
  const age_ms = Math.max(0, now - record.acquired_at);
  const heartbeat_age_ms = Math.max(0, now - record.heartbeat_at);
  const stale = heartbeat_age_ms >= stale_ms;
  const result = { acquired: true, exists: true, status: "held", kind: "v2", valid: true, stale, heartbeat_stale: stale, path: paths.path, data_path: paths.data_path, initialization_path: paths.initialization_path, fence_path: paths.fence_path, repo_root: scope.repo_root, common_dir: scope.common_dir, key: scope.key, record, validation, age_ms, heartbeat_age_ms, pid_alive: processAlive(record.pid), dead_pid_grace_ms, fence: record.fence, owner_id: record.owner_id, request_id: record.request_id, session_id: record.session_id, session_file: record.session_file, agent_id: record.agent_id, tool_call_id: record.tool_call_id, tool_name: record.tool_name, target: record.target, pid: record.pid, acquired_at: record.acquired_at, heartbeat_at: record.heartbeat_at, diagnostic: null };
  result.diagnostic = formatleasestatus(result, { cwd: options.cwd });
  return result;
}
function nextFence(parent, key, token) {
  const path = join(parent, `${key}.fence`);
  let source = "";
  try { source = readFileSync(path, "utf8").trim(); }
  catch (error) { if (String(error?.code ?? "").toLowerCase() !== "enoent") throw error; }
  const previous = source ? Number(source) : 0;
  if (!Number.isSafeInteger(previous) || previous < 0) throw new Error("lease fence file is malformed");
  const fence = previous + 1;
  if (!Number.isSafeInteger(fence)) throw new Error("lease fence exhausted");
  const temporary = `${path}.${token}.tmp`;
  try { writeFileSync(temporary, `${fence}\n`, "utf8"); renameSync(temporary, path); }
  catch (error) { try { rmSync(temporary, { force: true }); } catch {} throw error; }
  return fence;
}
function writeLease(path, record, suffix) {
  const temporary = `${path}.${suffix}.${process.pid}.${randomUUID()}.tmp`;
  try { writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8"); renameSync(temporary, path); }
  catch (error) { try { rmSync(temporary, { force: true }); } catch {} throw error; }
}
function publishInitialization(options, paths, now) {
  const token = randomUUID();
  const temporary = `${paths.path}.${process.pid}.${token}.tmp`;
  const pid = options.pid === undefined ? process.pid : Number(options.pid);
  try {
    mkdirSync(temporary);
    writeFileSync(join(temporary, "lease.init"), `${JSON.stringify({ pid, claimed_at: now, token })}\n`, "utf8");
    renameSync(temporary, paths.path);
    return { pid, claimed_at: now, token };
  } catch (error) {
    try { rmSync(temporary, { recursive: true, force: true }); } catch {}
    const code = String(error?.code ?? "").toLowerCase();
    if (code === "eexist" || code === "enotempty") return null;
    throw error;
  }
}
function acquireRecord(options, scope, paths, now, initialization) {
  const claimed = claimInitialization({ record: initialization }, scope, options);
  if (!claimed) return null;
  try {
    const current = readInitialization(paths.initialization_path);
    const stored = readRecord(paths.data_path);
    if (!claimOwned(claimed)
      || stored.kind !== "missing"
      || !sameInitialization(current, initialization)) return null;
    const metadata = operationMetadata(options);
    const fence = nextFence(paths.parent, scope.key, initialization.token);
    const record = { schema: 2, acquired: true, scope: "worktree", repo_root: scope.repo_root, common_dir: scope.common_dir, path: paths.path, token: initialization.token, fence, ...metadata, acquired_at: now, heartbeat_at: now };
    writeLease(paths.data_path, record, "acquire");
    rmSync(paths.initialization_path, { force: true });
    return record;
  } catch (error) {
    const current = readInitialization(paths.initialization_path);
    const stored = readRecord(paths.data_path);
    if (claimOwned(claimed)
      && stored.kind === "missing"
      && sameInitialization(current, initialization)) {
      rmSync(paths.path, { recursive: true, force: true });
    }
    throw error;
  } finally {
    releaseClaim(claimed);
  }
}
function conflictResult(options, scope, paths, status, waited_ms = 0) {
  const metadata = operationMetadata(options);
  const diagnostic = formatleasestatus(status, { waited_ms, cwd: options.cwd });
  return { acquired: false, recovered: false, path: paths.path, token: null, fence: null, owner_id: metadata.owner_id, request_id: metadata.request_id, session_id: metadata.session_id, session_file: metadata.session_file, agent_id: metadata.agent_id, tool_call_id: metadata.tool_call_id, tool_name: metadata.tool_name, target: metadata.target, pid: metadata.pid, repo_root: scope.repo_root, common_dir: scope.common_dir, conflict: status.record, status: status.status, valid: status.valid, stale: status.stale, age_ms: status.age_ms, heartbeat_age_ms: status.heartbeat_age_ms, pid_alive: status.pid_alive, claimed_at: status.claimed_at ?? null, dead_pid_grace_ms: status.dead_pid_grace_ms, diagnostic, error: diagnostic, retryable: ["held", "free", "initializing"].includes(status.status), timed_out: false, waited_ms };
}
export function tryacquirelease(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const paths = leasePaths(scope);
  operationMetadata(options);
  const now = nowOf(options);
  mkdirSync(paths.parent, { recursive: true });
  const initialization = publishInitialization(options, paths, now);
  if (!initialization) return conflictResult(options, scope, paths, inspectlease({ ...options, scope }));
  const record = acquireRecord(options, scope, paths, now, initialization);
  if (record) return { ...record, recovered: false };
  return conflictResult(options, scope, paths, inspectlease({ ...options, scope }));
}
function timeoutResult(result, waited_ms, cwd) {
  const diagnostic = formatleasestatus(result, { waited_ms, cwd });
  return { ...result, timed_out: true, retryable: false, waited_ms, diagnostic, error: diagnostic };
}
function recoverable(status, scope, options) {
  if (!status.stale || !status.conflict) return false;
  return status.status === "initializing"
    ? reclaimInitialization({ record: status.conflict }, scope, options)
    : releasestalelease(status.conflict, { ...options, scope });
}
export function acquirelease(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const wait_ms = waitMs(options);
  let waited_ms = 0;
  let recovered = false;
  for (;;) {
    const result = tryacquirelease({ ...options, scope });
    if (result.acquired) return { ...result, recovered: recovered || result.recovered };
    if (result.status === "legacy" || result.status === "malformed") return { ...result, waited_ms };
    if (recoverable(result, scope, options)) { recovered = true; continue; }
    if (waited_ms >= wait_ms) return timeoutResult(result, waited_ms, options.cwd);
    const delay = Math.min(nextDelay(options), wait_ms - waited_ms);
    if (delay <= 0) return timeoutResult(result, waited_ms, options.cwd);
    sleepSync(options, delay);
    waited_ms += delay;
  }
}
export async function acquireleaseasync(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const wait_ms = waitMs(options);
  let waited_ms = 0;
  let recovered = false;
  for (;;) {
    const result = tryacquirelease({ ...options, scope });
    if (result.acquired) return { ...result, recovered: recovered || result.recovered };
    if (result.status === "legacy" || result.status === "malformed") return { ...result, waited_ms };
    if (recoverable(result, scope, options)) { recovered = true; continue; }
    if (waited_ms >= wait_ms) return timeoutResult(result, waited_ms, options.cwd);
    const delay = Math.min(nextDelay(options), wait_ms - waited_ms);
    if (delay <= 0) return timeoutResult(result, waited_ms, options.cwd);
    await sleepAsync(options, delay);
    waited_ms += delay;
  }
}
function readClaim(path) {
  try {
    return parseJsonObject(readFileSync(path, "utf8"));
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (["enoent", "eisdir", "enotdir"].includes(code)) return null;
    throw error;
  }
}

function validClaim(record) {
  return isRecord(record)
    && nonempty(record.token)
    && Number.isSafeInteger(record.pid)
    && record.pid > 0
    && Number.isFinite(record.claimed_at);
}

function sameClaim(current, expected) {
  return validClaim(current)
    && validClaim(expected)
    && current.token === expected.token
    && current.pid === expected.pid
    && current.claimed_at === expected.claimed_at;
}

function publishClaim(claimsPath, options, token, claimedAt) {
  const claimPath = join(claimsPath, token);
  const temporary = join(claimsPath, `.${token}.${process.pid}.${randomUUID()}.tmp`);
  const record = {
    token,
    pid: Number.isSafeInteger(options.pid) && options.pid > 0 ? options.pid : process.pid,
    claimed_at: claimedAt,
  };
  try {
    try {
      mkdirSync(claimsPath);
    } catch (error) {
      if (String(error?.code ?? "").toLowerCase() !== "eexist") throw error;
    }
    writeFileSync(temporary, `${JSON.stringify(record)}\n`, "utf8");
    linkSync(temporary, claimPath);
    return { claimPath, record };
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (code === "eexist") return null;
    if (["enoent", "enotdir"].includes(code)) return false;
    throw error;
  } finally {
    try { rmSync(temporary, { force: true }); } catch {}
  }
}

function candidateFiles(claimsPath) {
  let names;
  try {
    names = readdirSync(claimsPath);
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (["enoent", "enotdir"].includes(code)) return [];
    throw error;
  }
  return names
    .filter((name) => !name.startsWith(".") && !name.endsWith(".tmp"))
    .sort()
    .map((name) => {
      const claimPath = join(claimsPath, name);
      return { claimPath, record: readClaim(claimPath) };
    })
    .filter((claim) => validClaim(claim.record));
}

function reclaimableClaim(record, now, options) {
  if (!validClaim(record)) return false;
  const age = Math.max(0, now - record.claimed_at);
  return age >= deadGraceMs(options) && !processAlive(record.pid);
}

function claimOwned(claim) {
  return sameClaim(readClaim(claim.claimPath), claim.record);
}

function releaseClaim(claim) {
  if (!claimOwned(claim)) return false;
  rmSync(claim.claimPath, { force: true });
  return true;
}

function reclaimDeadClaim(claim, now, options) {
  const current = readClaim(claim.claimPath);
  if (!current) return true;
  if (!sameClaim(current, claim.record) || !reclaimableClaim(current, now, options)) {
    return false;
  }
  const reread = readClaim(claim.claimPath);
  if (!reread) return true;
  if (!sameClaim(reread, current) || !reclaimableClaim(reread, now, options)) {
    return false;
  }
  rmSync(claim.claimPath, { force: true });
  return true;
}

function electClaim(claim, now, options) {
  for (const contender of candidateFiles(claim.claimsPath)) {
    if (contender.claimPath === claim.claimPath) continue;
    if (!reclaimableClaim(contender.record, now, options)) return false;
    if (!reclaimDeadClaim(contender, now, options)) return false;
  }
  return claimOwned(claim);
}

function rereadClaimedLease(claim, expected) {
  if (!claimOwned(claim)) return null;
  const stored = readRecord(claim.dataPath);
  if (stored.kind !== "v2" || !stored.validation?.ok) return null;
  return sameIdentity(stored.record, expected) ? stored.record : null;
}

function claimCurrentLease(lease, input = {}) {
  if (!isRecord(lease) || lease.acquired !== true || !nonempty(lease.path)) return null;
  const options = optionsOf(input);
  const dataPath = join(lease.path, "lease.json");
  const claimsPath = `${dataPath}.claims`;
  for (;;) {
    const token = randomUUID();
    const claimedAt = nowOf(options);
    const published = publishClaim(claimsPath, options, token, claimedAt);
    if (published === false) return null;
    if (published === null) continue;
    const claim = {
      dataPath,
      claimsPath,
      claimPath: published.claimPath,
      record: published.record,
    };
    try {
      if (!electClaim(claim, claimedAt, options)) {
        releaseClaim(claim);
        return null;
      }
      const current = rereadClaimedLease(claim, lease);
      if (!current) {
        releaseClaim(claim);
        return null;
      }
      return { ...claim, current };
    } catch (error) {
      releaseClaim(claim);
      throw error;
    }
  }
}

function claimInitialization(status, scope, options) {
  const expected = status.record;
  if (!validInitialization(expected)) return null;
  const paths = leasePaths(scope);
  for (;;) {
    const token = randomUUID();
    const claimedAt = nowOf(options);
    const published = publishClaim(paths.claims_path, options, token, claimedAt);
    if (published === false) return null;
    if (published === null) continue;
    const claim = {
      dataPath: paths.data_path,
      claimsPath: paths.claims_path,
      claimPath: published.claimPath,
      record: published.record,
    };
    try {
      if (!electClaim(claim, claimedAt, options)) {
        releaseClaim(claim);
        return null;
      }
      const current = readInitialization(paths.initialization_path);
      const stored = readRecord(paths.data_path);
      if (stored.kind !== "missing" || !sameInitialization(current, expected)) {
        releaseClaim(claim);
        return null;
      }
      return { ...claim, current };
    } catch (error) {
      releaseClaim(claim);
      throw error;
    }
  }
}

function reclaimInitialization(status, scope, options) {
  const claimed = claimInitialization(status, scope, options);
  if (!claimed) return false;
  const paths = leasePaths(scope);
  try {
    const current = readInitialization(paths.initialization_path);
    const stored = readRecord(paths.data_path);
    const now = nowOf(options);
    const age = Math.max(0, now - current.claimed_at);
    if (!claimOwned(claimed)
      || stored.kind !== "missing"
      || !sameInitialization(current, claimed.current)
      || age < deadGraceMs(options)
      || processAlive(current.pid)) return false;
    rmSync(paths.path, { recursive: true, force: true });
    return true;
  } finally {
    releaseClaim(claimed);
  }
}

export function heartbeatlease(lease, input = {}) {
  const options = optionsOf(input);
  const claimed = claimCurrentLease(lease, options);
  if (!claimed) return false;
  try {
    const current = rereadClaimedLease(claimed, lease);
    if (!current) return false;
    const heartbeat_at = Math.max(current.heartbeat_at, nowOf(options));
    writeLease(claimed.dataPath, { ...current, heartbeat_at }, "heartbeat");
    lease.heartbeat_at = heartbeat_at;
    return true;
  } finally {
    releaseClaim(claimed);
  }
}

export function releaselease(lease, input = {}) {
  const claimed = claimCurrentLease(lease, optionsOf(input));
  if (!claimed) return false;
  try {
    const current = rereadClaimedLease(claimed, lease);
    if (!current) return false;
    rmSync(current.path, { recursive: true, force: true });
    return true;
  } finally {
    releaseClaim(claimed);
  }
}

export function releasestalelease(input = {}, timing = {}) {
  let lease;
  let options;
  if (isRecord(input) && input.acquired === true && input.path) {
    lease = input;
    options = optionsOf(timing);
  } else {
    options = optionsOf(input);
    const status = inspectlease(options);
    if (status.status !== "held" || status.stale !== true || !status.record) return false;
    lease = status.record;
  }
  const claimed = claimCurrentLease(lease, options);
  if (!claimed) return false;
  try {
    const current = rereadClaimedLease(claimed, lease);
    if (!current) return false;
    if (Math.max(0, nowOf(options) - current.heartbeat_at) < staleMs(options)) return false;
    rmSync(current.path, { recursive: true, force: true });
    return true;
  } finally {
    releaseClaim(claimed);
  }
}
