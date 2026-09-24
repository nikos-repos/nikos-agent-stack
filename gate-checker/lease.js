import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  linkSync, mkdirSync, readFileSync, realpathSync, readdirSync, renameSync,
  rmSync, statSync, writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { isRecord, isText, nonempty, parseJsonObject, shellQuote } from "./predicates.js";

const poll_interval_ms = 50;
const poll_jitter_ms = 5;
const default_acquisition_wait_ms = 5_000;
const default_stale_heartbeat_ms = 30_000;
const default_dead_pid_grace_ms = 2_000;
export const heartbeatintervalms = 2_000;

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
  return isRecord(input) ? input : {};
}
function optionNumber(options, name, fallback) {
  return Number.isFinite(options[name]) ? Number(options[name]) : fallback;
}
// `now` is the test clock; production reads Date.now().
function nowOf(options) {
  return Number.isFinite(options.now) ? Number(options.now) : Date.now();
}
const staleMs = (options) => Math.max(0, optionNumber(options, "stale_heartbeat_ms", default_stale_heartbeat_ms));
const waitMs = (options) => Math.max(0, optionNumber(options, "acquisition_wait_ms", default_acquisition_wait_ms));
const deadGraceMs = (options) => Math.max(0, optionNumber(options, "dead_pid_grace_ms", default_dead_pid_grace_ms));
function nextDelay() {
  return Math.max(1, Math.round(poll_interval_ms + (Math.random() * 2 - 1) * poll_jitter_ms));
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
  const pid = process.pid;
  const agent_id = options.agent_id ?? null;
  if (agent_id !== null && !nonempty(agent_id)) throw new Error("lease agent_id must be a non-empty string or null");
  const target = options.target ?? null;
  if (target !== null && !nonempty(target)) throw new Error("lease target must be a non-empty string or null");
  return {
    owner_id: requiredString(options, "owner_id"), request_id: requiredString(options, "request_id"),
    session_id: requiredString(options, "session_id"), session_file: requiredString(options, "session_file"),
    agent_id, tool_call_id: requiredString(options, "tool_call_id"), tool_name: requiredString(options, "tool_name"), target, pid,
  };
}
function invalidLease(reason) {
  return { ok: false, kind: "malformed", reason, error: reason };
}
function validatelease(record) {
  if (!isRecord(record)) return invalidLease("lease record must be an object");
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
  return { ok: true, kind: "v2", record };
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
// the initialization marker and election claims share one {token, pid, claimed_at} shape.
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
  return isRecord(record) && nonempty(record.token) && Number.isSafeInteger(record.pid) && record.pid > 0 && Number.isFinite(record.claimed_at);
}
function sameClaim(current, expected) {
  return validClaim(current) && validClaim(expected) && current.token === expected.token && current.pid === expected.pid && current.claimed_at === expected.claimed_at;
}
const identityFields = ["schema", "acquired", "scope", "repo_root", "common_dir", "path", "token", "fence", "owner_id", "request_id", "session_id", "session_file", "agent_id", "tool_call_id", "tool_name", "target", "pid", "acquired_at"];
function sameIdentity(current, expected) {
  if (!isRecord(current) || !isRecord(expected)) return false;
  return identityFields.every((field) => current[field] === expected[field]);
}
function displayStatus(value) { return value === null || value === undefined || value === "" ? "unknown" : String(value); }
function formatAge(value, suffix = "") { return Number.isFinite(value) ? `${Math.max(0, Number(value) / 1_000).toFixed(1)}s${suffix}` : "unknown"; }

// the identity and timing fields every lease ledger event carries.
export function leasefields(record) {
  return { path: record.path, token: record.token, repo_root: record.repo_root, common_dir: record.common_dir, owner_id: record.owner_id, request_id: record.request_id, session_id: record.session_id, session_file: record.session_file, agent_id: record.agent_id, tool_call_id: record.tool_call_id, tool_name: record.tool_name, target: record.target, fence: record.fence, pid: record.pid, acquired_at: record.acquired_at, heartbeat_at: record.heartbeat_at };
}

export function formatleasestatus(status, options = {}) {
  const cwd = options.cwd === undefined ? "." : shellQuote(options.cwd);
  const inspect = `inspect with: nikos-gates lease status --cwd ${cwd}`;
  if (status.status === "free") return `worktree mutation lease is free; ${inspect}`;
  if (status.status === "malformed") return `malformed lease record at ${displayStatus(status.data_path)}; ${inspect}; do not delete it`;
  if (status.status === "initializing") return `worktree mutation lease is initializing; ${inspect}`;
  const record = status.record;
  const waited = Number.isFinite(options.waited_ms) ? Math.max(0, Number(options.waited_ms)) : null;
  const title = waited === null ? "worktree mutation lease is held" : `worktree mutation busy after ${formatAge(waited)}`;
  const relation = nonempty(options.relation) ? options.relation : "unknown";
  return [title, `agent: ${displayStatus(record.agent_id)}`, `session: ${displayStatus(record.session_id)}`, `request: ${displayStatus(record.request_id)}`, `tool name: ${displayStatus(record.tool_name)}`, `target: ${displayStatus(record.target)}`, `tool call: ${displayStatus(record.tool_call_id)}`, `pid: ${displayStatus(record.pid)}`, `age: ${formatAge(status.age_ms)}`, `heartbeat age: ${formatAge(status.heartbeat_age_ms, " ago")}`, `fence: ${displayStatus(record.fence)}`, `relation: ${relation}`, inspect].join("\n");
}
function scopeEquals(record, scope, paths) { return isRecord(record) && record.repo_root === scope.repo_root && record.common_dir === scope.common_dir && record.path === paths.path; }
// one status shape: the state, whether it is stale, the record behind it, and what a caller needs to explain it.
export function inspectlease(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const paths = leasePaths(scope);
  const now = nowOf(options);
  const base = { status: "free", stale: false, record: null, reason: null, data_path: paths.data_path, age_ms: null, heartbeat_age_ms: null, pid_alive: false };
  let directory = false;
  try { directory = statSync(paths.path).isDirectory(); }
  catch (error) { if (String(error?.code ?? "").toLowerCase() !== "enoent") throw error; }
  if (!directory) return base;
  const stored = readRecord(paths.data_path);
  if (stored.kind === "missing") {
    const record = readClaim(paths.initialization_path);
    if (!validClaim(record)) return { ...base, status: "initializing", record };
    const age_ms = Math.max(0, now - record.claimed_at);
    const pid_alive = processAlive(record.pid);
    return { ...base, status: "initializing", record, age_ms, pid_alive, stale: age_ms >= deadGraceMs(options) && !pid_alive };
  }
  if (stored.kind !== "v2" || !scopeEquals(stored.record, scope, paths)) {
    const reason = stored.kind === "v2" ? "lease record repository identity does not match its directory" : stored.validation?.reason ?? null;
    return { ...base, status: "malformed", record: stored.record, reason };
  }
  const record = stored.record;
  const heartbeat_age_ms = Math.max(0, now - record.heartbeat_at);
  return { ...base, status: "held", record, age_ms: Math.max(0, now - record.acquired_at), heartbeat_age_ms, pid_alive: processAlive(record.pid), stale: heartbeat_age_ms >= staleMs(options) };
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
function publishInitialization(paths, now) {
  const token = randomUUID();
  const temporary = `${paths.path}.${process.pid}.${token}.tmp`;
  const pid = process.pid;
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
  const claimed = claimInitialization(initialization, paths, options);
  if (!claimed) return null;
  try {
    const current = readClaim(paths.initialization_path);
    const stored = readRecord(paths.data_path);
    if (!claimOwned(claimed)
      || stored.kind !== "missing"
      || !sameClaim(current, initialization)) return null;
    const metadata = operationMetadata(options);
    const fence = nextFence(paths.parent, scope.key, initialization.token);
    const record = { schema: 2, acquired: true, scope: "worktree", repo_root: scope.repo_root, common_dir: scope.common_dir, path: paths.path, token: initialization.token, fence, ...metadata, acquired_at: now, heartbeat_at: now };
    writeLease(paths.data_path, record, "acquire");
    rmSync(paths.initialization_path, { force: true });
    return record;
  } catch (error) {
    const current = readClaim(paths.initialization_path);
    const stored = readRecord(paths.data_path);
    if (claimOwned(claimed)
      && stored.kind === "missing"
      && sameClaim(current, initialization)) {
      rmSync(paths.path, { recursive: true, force: true });
    }
    throw error;
  } finally {
    releaseClaim(claimed);
  }
}
// a failed acquisition is the observed status plus how long the caller waited.
function conflictResult(status, cwd, waited_ms = 0, timed_out = false) {
  return { ...status, acquired: false, waited_ms, timed_out, error: formatleasestatus(status, { waited_ms, cwd }) };
}
function tryacquirelease(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const paths = leasePaths(scope);
  operationMetadata(options);
  const now = nowOf(options);
  mkdirSync(paths.parent, { recursive: true });
  const initialization = publishInitialization(paths, now);
  if (!initialization) return conflictResult(inspectlease({ ...options, scope }), options.cwd);
  const record = acquireRecord(options, scope, paths, now, initialization);
  if (record) return { ...record, recovered: false };
  return conflictResult(inspectlease({ ...options, scope }), options.cwd);
}
function recoverable(status, scope, options) {
  if (!status.stale || !status.record) return false;
  return status.status === "initializing"
    ? reclaimInitialization(status.record, scope, options)
    : releasestalelease(status.record, { ...options, scope });
}
export async function acquirelease(input = {}) {
  const options = optionsOf(input);
  const scope = options.scope || identity(options.cwd || ".");
  const wait_ms = waitMs(options);
  let waited_ms = 0;
  let recovered = false;
  for (;;) {
    const result = tryacquirelease({ ...options, scope });
    if (result.acquired) return { ...result, recovered: recovered || result.recovered };
    if (result.status === "malformed") return { ...result, waited_ms };
    if (recoverable(result, scope, options)) { recovered = true; continue; }
    if (waited_ms >= wait_ms) return conflictResult(result, options.cwd, waited_ms, true);
    const delay = Math.min(nextDelay(), wait_ms - waited_ms);
    if (delay <= 0) return conflictResult(result, options.cwd, waited_ms, true);
    await new Promise((done) => setTimeout(done, delay));
    waited_ms += delay;
  }
}
function publishClaim(claimsPath, token, claimedAt) {
  const claimPath = join(claimsPath, token);
  const temporary = join(claimsPath, `.${token}.${process.pid}.${randomUUID()}.tmp`);
  const record = { token, pid: process.pid, claimed_at: claimedAt };
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
  return claim.won === true
    && sameClaim(readClaim(claim.claimPath), claim.record)
    && sameClaim(readClaim(claim.winnerPath), claim.record);
}

function releaseClaim(claim) {
  let released = false;
  if (claim.won === true && sameClaim(readClaim(claim.winnerPath), claim.record)) {
    rmSync(claim.winnerPath, { force: true });
    released = true;
  }
  if (sameClaim(readClaim(claim.claimPath), claim.record)) {
    rmSync(claim.claimPath, { force: true });
    released = true;
  }
  return released;
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

function reclaimDeadWinner(claim, winner, now, options) {
  if (!reclaimableClaim(winner, now, options)) return false;
  const reread = readClaim(claim.winnerPath);
  if (!sameClaim(reread, winner) || !reclaimableClaim(reread, now, options)) {
    return false;
  }
  rmSync(claim.winnerPath, { force: true });
  const candidate = {
    claimPath: join(claim.claimsPath, winner.token),
    record: winner,
  };
  reclaimDeadClaim(candidate, now, options);
  return true;
}

function cleanDeadCandidates(claim, now, options) {
  for (const contender of candidateFiles(claim.claimsPath)) {
    if (contender.claimPath === claim.claimPath) continue;
    if (reclaimableClaim(contender.record, now, options)) {
      reclaimDeadClaim(contender, now, options);
    }
  }
}

function electClaim(claim, now, options) {
  claim.winnerPath = join(claim.claimsPath, ".winner");
  for (;;) {
    try {
      linkSync(claim.claimPath, claim.winnerPath);
      claim.won = true;
      cleanDeadCandidates(claim, now, options);
      return claimOwned(claim);
    } catch (error) {
      const code = String(error?.code ?? "").toLowerCase();
      if (["enoent", "enotdir"].includes(code)) return false;
      if (code !== "eexist") throw error;
    }
    const winner = readClaim(claim.winnerPath);
    if (sameClaim(winner, claim.record)) {
      claim.won = true;
      return claimOwned(claim);
    }
    if (!winner || !reclaimDeadWinner(claim, winner, now, options)) return false;
  }
}

function rereadClaimedLease(claim, expected) {
  if (!claimOwned(claim)) return null;
  const stored = readRecord(claim.dataPath);
  if (stored.kind !== "v2" || !stored.validation?.ok) return null;
  return sameIdentity(stored.record, expected) ? stored.record : null;
}

// publish a claim, win the election, then verify the guarded state; the verified value rides on the claim.
function claimWith(dataPath, options, verify) {
  const claimsPath = `${dataPath}.claims`;
  for (;;) {
    const claimedAt = nowOf(options);
    const published = publishClaim(claimsPath, randomUUID(), claimedAt);
    if (published === false) return null;
    if (published === null) continue;
    const claim = { dataPath, claimsPath, claimPath: published.claimPath, record: published.record };
    try {
      const current = electClaim(claim, claimedAt, options) ? verify(claim) : null;
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

function claimCurrentLease(lease, options) {
  if (!isRecord(lease) || lease.acquired !== true || !nonempty(lease.path)) return null;
  return claimWith(join(lease.path, "lease.json"), options, (claim) => rereadClaimedLease(claim, lease));
}

function claimInitialization(expected, paths, options) {
  if (!validClaim(expected)) return null;
  return claimWith(paths.data_path, options, () => {
    const current = readClaim(paths.initialization_path);
    return readRecord(paths.data_path).kind === "missing" && sameClaim(current, expected) ? current : null;
  });
}

function reclaimInitialization(expected, scope, options) {
  const paths = leasePaths(scope);
  const claimed = claimInitialization(expected, paths, options);
  if (!claimed) return false;
  try {
    const current = readClaim(paths.initialization_path);
    const stored = readRecord(paths.data_path);
    const now = nowOf(options);
    const age = Math.max(0, now - current.claimed_at);
    if (!claimOwned(claimed)
      || stored.kind !== "missing"
      || !sameClaim(current, claimed.current)
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
