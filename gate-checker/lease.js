import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  linkSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

const default_poll_interval_ms = 50;
const default_poll_jitter_ms = 5;
const default_acquisition_wait_ms = 5_000;
const default_heartbeat_interval_ms = 2_000;
const default_stale_heartbeat_ms = 30_000;
const default_dead_pid_grace_ms = 2_000;
const sleepsignal = new Int32Array(new SharedArrayBuffer(4));

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 5_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

export function identity(cwd = ".") {
  const root = String(cwd || ".");
  const repo_root = realpathSync(git(root, ["rev-parse", "--show-toplevel"]));
  const common_raw = git(root, ["rev-parse", "--git-common-dir"]);
  const common_dir = realpathSync(
    common_raw.startsWith("/") ? common_raw : resolve(root, common_raw),
  );
  const key = createHash("sha256")
    .update(`${common_dir}\n${repo_root}`)
    .digest("hex")
    .slice(0, 24);
  return { repo_root, common_dir, key };
}

function normaliseoptions(input) {
  if (typeof input === "string") return { cwd: input };
  if (input && typeof input === "object" && !Array.isArray(input)) return input;
  return {};
}

function nonemptystring(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function optionnumber(options, names, fallback) {
  for (const name of names) {
    if (Number.isFinite(options[name])) return Number(options[name]);
  }
  return fallback;
}

function clockfor(options) {
  if (typeof options.clock === "function") return options.clock;
  if (Number.isFinite(options.now)) return () => Number(options.now);
  return () => Date.now();
}

function nowfor(options) {
  const now = Number(clockfor(options)());
  if (!Number.isFinite(now)) throw new Error("lease clock must return a finite number");
  return now;
}

function staleheartbeatms(options) {
  return Math.max(
    0,
    optionnumber(
      options,
      ["stale_heartbeat_ms", "stale_ms"],
      default_stale_heartbeat_ms,
    ),
  );
}

function acquisitionwaitms(options) {
  return Math.max(
    0,
    optionnumber(
      options,
      ["acquisition_wait_ms", "wait_ms"],
      default_acquisition_wait_ms,
    ),
  );
}

function pollintervalms(options) {
  return Math.max(
    1,
    optionnumber(options, ["poll_interval_ms", "poll_ms"], default_poll_interval_ms),
  );
}

function polljitterms(options) {
  return Math.max(
    0,
    optionnumber(options, ["poll_jitter_ms", "jitter_ms"], default_poll_jitter_ms),
  );
}

function heartbeatintervalms(options) {
  return Math.max(
    1,
    optionnumber(
      options,
      ["heartbeat_interval_ms", "heartbeat_ms"],
      default_heartbeat_interval_ms,
    ),
  );
}

function deadpidgracems(options) {
  return Math.max(
    0,
    optionnumber(options, ["dead_pid_grace_ms"], default_dead_pid_grace_ms),
  );
}

function sleepfor(options, milliseconds) {
  const delay = Math.max(0, Math.round(milliseconds));
  if (typeof options.sleep === "function") {
    options.sleep(delay);
    return;
  }
  if (delay > 0) Atomics.wait(sleepsignal, 0, 0, delay);
}
async function sleepforasync(options, milliseconds) {
  const delay = Math.max(0, Math.round(milliseconds));
  if (typeof options.sleep === "function") {
    await options.sleep(delay);
    return;
  }
  if (delay > 0) await new Promise((resolve) => setTimeout(resolve, delay));
}


function nextdelay(options) {
  const random = typeof options.random === "function" ? options.random : Math.random;
  const sample = Number(random());
  const bounded = Number.isFinite(sample) ? Math.min(1, Math.max(0, sample)) : 0.5;
  const jitter = (bounded * 2 - 1) * polljitterms(options);
  return Math.max(1, Math.round(pollintervalms(options) + jitter));
}

function processalive(pid) {
  if (!Number.isSafeInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return String(error?.code ?? "").toLowerCase() === "eperm";
  }
}

function leasepaths(scope) {
  const parent = join(scope.common_dir, "omp-gates", "leases");
  const path = join(parent, scope.key);
  return {
    parent,
    path,
    data_path: join(path, "lease.json"),
    initialization_path: join(path, "lease.init"),
    claims_path: join(path, "lease.json.claims"),
    fence_path: join(parent, `${scope.key}.fence`),
  };
}

function requiredstring(options, name) {
  const value = options[name];
  if (!nonemptystring(value)) throw new Error(`lease ${name} is required`);
  return value;
}

function operationmetadata(options) {
  const pid = options.pid === undefined ? process.pid : Number(options.pid);
  if (!Number.isSafeInteger(pid) || pid < 1) throw new Error("lease pid must be a positive integer");

  const agent_id = options.agent_id === undefined ? null : options.agent_id;
  if (agent_id !== null && !nonemptystring(agent_id))
    throw new Error("lease agent_id must be a non-empty string or null");

  const target = options.target === undefined || options.target === null ? null : options.target;
  if (target !== null && !nonemptystring(target))
    throw new Error("lease target must be a non-empty string or null");

  return {
    owner_id: requiredstring(options, "owner_id"),
    request_id: requiredstring(options, "request_id"),
    session_id: requiredstring(options, "session_id"),
    session_file: requiredstring(options, "session_file"),
    agent_id,
    tool_call_id: requiredstring(options, "tool_call_id"),
    tool_name: requiredstring(options, "tool_name"),
    target,
    pid,
  };
}

function invalidlease(reason, kind = "malformed") {
  return {
    ok: false,
    kind,
    legacy: kind === "legacy",
    reason,
    error: reason,
  };
}

export function validatelease(record) {
  if (!record || typeof record !== "object" || Array.isArray(record))
    return invalidlease("lease record must be an object");
  if (!Object.prototype.hasOwnProperty.call(record, "schema"))
    return invalidlease("legacy v1 lease record has no schema", "legacy");
  if (record.schema !== 2) return invalidlease("lease record schema must be 2");
  if (record.acquired !== true) return invalidlease("lease record acquired must be true");
  if (record.scope !== "worktree") return invalidlease("lease record scope must be worktree");

  for (const field of [
    "repo_root",
    "common_dir",
    "path",
    "token",
    "owner_id",
    "request_id",
    "session_id",
    "session_file",
    "tool_call_id",
    "tool_name",
  ]) {
    if (!nonemptystring(record[field])) return invalidlease(`lease record ${field} is required`);
  }

  if (record.agent_id !== null && !nonemptystring(record.agent_id))
    return invalidlease("lease record agent_id must be a non-empty string or null");
  if (record.target !== null && !nonemptystring(record.target))
    return invalidlease("lease record target must be a non-empty string or null");
  if (!Number.isSafeInteger(record.fence) || record.fence < 1)
    return invalidlease("lease record fence must be a positive integer");
  if (!Number.isSafeInteger(record.pid) || record.pid < 1)
    return invalidlease("lease record pid must be a positive integer");
  if (!Number.isFinite(record.acquired_at))
    return invalidlease("lease record acquired_at must be finite");
  if (!Number.isFinite(record.heartbeat_at))
    return invalidlease("lease record heartbeat_at must be finite");
  if (record.heartbeat_at < record.acquired_at)
    return invalidlease("lease record heartbeat_at cannot precede acquired_at");

  return { ok: true, kind: "v2", legacy: false, record };
}

function readrecord(data_path) {
  let source;
  try {
    source = readFileSync(data_path, "utf8");
  } catch (error) {
    if (String(error?.code ?? "").toLowerCase() === "enoent")
      return { kind: "missing", record: null, validation: null };
    throw error;
  }

  let record;
  try {
    record = JSON.parse(source);
  } catch (error) {
    return {
      kind: "malformed",
      record: null,
      validation: invalidlease(`lease record json is malformed: ${error.message}`),
    };
  }
  const validation = validatelease(record);
  return {
    kind: validation.ok ? "v2" : validation.kind,
    record,
    validation,
  };
}
function readinitialization(initialization_path) {
  let source;
  try {
    source = readFileSync(initialization_path, "utf8");
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (code === "enoent" || code === "eisdir" || code === "enotdir") return null;
    throw error;
  }
  try {
    const record = JSON.parse(source);
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    return record;
  } catch {
    return null;
  }
}

function validinitialization(record) {
  return Boolean(
    record &&
      typeof record === "object" &&
      !Array.isArray(record) &&
      nonemptystring(record.token) &&
      Number.isSafeInteger(record.pid) &&
      record.pid > 0 &&
      Number.isFinite(record.claimed_at),
  );
}

function sameinitialization(current, expected) {
  return (
    validinitialization(current) &&
    validinitialization(expected) &&
    current.pid === expected.pid &&
    current.claimed_at === expected.claimed_at &&
    current.token === expected.token
  );
}

function sameidentity(current, expected) {
  return (
    Boolean(current && expected) &&
    current.schema === expected.schema &&
    current.acquired === expected.acquired &&
    current.scope === expected.scope &&
    current.repo_root === expected.repo_root &&
    current.common_dir === expected.common_dir &&
    current.path === expected.path &&
    current.token === expected.token &&
    current.fence === expected.fence &&
    current.owner_id === expected.owner_id &&
    current.request_id === expected.request_id &&
    current.session_id === expected.session_id &&
    current.session_file === expected.session_file &&
    current.agent_id === expected.agent_id &&
    current.tool_call_id === expected.tool_call_id &&
    current.tool_name === expected.tool_name &&
    current.target === expected.target &&
    current.pid === expected.pid &&
    current.acquired_at === expected.acquired_at
  );
}

function displaystatusvalue(value) {
  return value === null || value === undefined || value === "" ? "unknown" : String(value);
}

function formatstatusage(value, suffix = "") {
  if (!Number.isFinite(value)) return "unknown";
  return `${(Math.max(0, Number(value)) / 1_000).toFixed(1)}s${suffix}`;
}

function shellquote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

export function formatleasestatus(status, options = {}) {
  const cwd = options.cwd === undefined ? "." : shellquote(options.cwd);
  const action = `nikos-gates lease status --cwd ${cwd}`;
  const inspect = `inspect with: ${action}`;
  if (!status || typeof status !== "object" || Array.isArray(status))
    return `lease status unavailable; ${inspect}`;

  const state = status.status ?? status.kind;
  if (state === "free" || status.exists === false)
    return `worktree mutation lease is free; ${inspect}`;
  if (state === "legacy")
    return `legacy v1 lease record at ${displaystatusvalue(status.data_path)}; ${inspect}; do not delete it`;
  if (state === "malformed")
    return `malformed v2 lease record at ${displaystatusvalue(status.data_path)}; ${inspect}; do not delete it`;
  if (state === "initializing")
    return `worktree mutation lease is initializing; ${inspect}`;
  if (state !== "held" && status.acquired !== true)
    return `worktree mutation lease status ${displaystatusvalue(state)}; ${inspect}`;

  const record =
    status.record && typeof status.record === "object" && !Array.isArray(status.record)
      ? status.record
      : status.conflict &&
          typeof status.conflict === "object" &&
          !Array.isArray(status.conflict)
        ? status.conflict
        : status;
  const waited_ms = Number.isFinite(options.waited_ms)
    ? Math.max(0, Number(options.waited_ms))
    : null;
  const title =
    waited_ms === null
      ? "worktree mutation lease is held"
      : `worktree mutation busy after ${formatstatusage(waited_ms)}`;
  const relation = nonemptystring(options.relation) ? options.relation : "unknown";
  return [
    title,
    `agent: ${displaystatusvalue(record.agent_id)}`,
    `session: ${displaystatusvalue(record.session_id)}`,
    `request: ${displaystatusvalue(record.request_id)}`,
    `tool name: ${displaystatusvalue(record.tool_name)}`,
    `target: ${displaystatusvalue(record.target)}`,
    `tool call: ${displaystatusvalue(record.tool_call_id)}`,
    `pid: ${displaystatusvalue(record.pid)}`,
    `age: ${formatstatusage(status.age_ms)}`,
    `heartbeat age: ${formatstatusage(status.heartbeat_age_ms, " ago")}`,
    `fence: ${displaystatusvalue(record.fence)}`,
    `relation: ${relation}`,
    inspect,
  ].join("\n");
}


function scopeequals(record, scope, paths) {
  return (
    record.repo_root === scope.repo_root &&
    record.common_dir === scope.common_dir &&
    record.path === paths.path
  );
}

export function inspectlease(input = {}) {
  const options = normaliseoptions(input);
  const scope = options.scope || identity(options.cwd || ".");
  const paths = leasepaths(scope);
  const now = nowfor(options);
  const stale_ms = staleheartbeatms(options);
  const dead_pid_grace_ms = deadpidgracems(options);

  let directory;
  try {
    directory = statSync(paths.path).isDirectory();
  } catch (error) {
    if (String(error?.code ?? "").toLowerCase() === "enoent") directory = false;
    else throw error;
  }

  if (!directory) {
    return {
      acquired: false,
      exists: false,
      status: "free",
      kind: "missing",
      valid: false,
      stale: false,
      heartbeat_stale: false,
      path: paths.path,
      data_path: paths.data_path,
      initialization_path: paths.initialization_path,
      fence_path: paths.fence_path,
      repo_root: scope.repo_root,
      common_dir: scope.common_dir,
      key: scope.key,
      record: null,
      validation: null,
      age_ms: null,
      heartbeat_age_ms: null,
      pid_alive: false,
      dead_pid_grace_ms,
      diagnostic: null,
    };
  }

  const stored = readrecord(paths.data_path);
  let status = stored.kind;
  let record = stored.record;
  let validation = stored.validation;
  if (stored.kind === "missing") {
    status = "initializing";
    record = readinitialization(paths.initialization_path);
    validation = null;
  } else if (stored.kind === "v2" && !scopeequals(record, scope, paths)) {
    status = "malformed";
    validation = invalidlease("lease record repository identity does not match its directory");
  }

  if (status !== "v2") {
    const initialized = status === "initializing" && validinitialization(record);
    const age_ms = initialized ? Math.max(0, now - record.claimed_at) : null;
    const pid_alive = initialized ? processalive(record.pid) : false;
    const stale = initialized && age_ms >= dead_pid_grace_ms && !pid_alive;
    const result = {
      acquired: false,
      exists: true,
      status,
      kind: status,
      valid: false,
      stale,
      heartbeat_stale: false,
      path: paths.path,
      data_path: paths.data_path,
      initialization_path: paths.initialization_path,
      fence_path: paths.fence_path,
      repo_root: scope.repo_root,
      common_dir: scope.common_dir,
      key: scope.key,
      record,
      validation,
      age_ms,
      heartbeat_age_ms: null,
      pid_alive,
      dead_pid_grace_ms,
      pid: initialized ? record.pid : null,
      claimed_at: initialized ? record.claimed_at : null,
      diagnostic: null,
    };
    result.diagnostic = formatleasestatus(result, { cwd: options.cwd });
    return result;
  }

  const age_ms = Math.max(0, now - record.acquired_at);
  const heartbeat_age_ms = Math.max(0, now - record.heartbeat_at);
  const stale = heartbeat_age_ms >= stale_ms;
  const result = {
    acquired: true,
    exists: true,
    status: "held",
    kind: "v2",
    valid: true,
    stale,
    heartbeat_stale: stale,
    path: paths.path,
    data_path: paths.data_path,
    initialization_path: paths.initialization_path,
    fence_path: paths.fence_path,
    repo_root: scope.repo_root,
    common_dir: scope.common_dir,
    key: scope.key,
    record,
    validation,
    age_ms,
    heartbeat_age_ms,
    pid_alive: processalive(record.pid),
    dead_pid_grace_ms,
    fence: record.fence,
    owner_id: record.owner_id,
    request_id: record.request_id,
    session_id: record.session_id,
    session_file: record.session_file,
    agent_id: record.agent_id,
    tool_call_id: record.tool_call_id,
    tool_name: record.tool_name,
    target: record.target,
    pid: record.pid,
    acquired_at: record.acquired_at,
    heartbeat_at: record.heartbeat_at,
    diagnostic: null,
  };
  result.diagnostic = formatleasestatus(result, { cwd: options.cwd });
  return result;
}

function nextfence(parent, key, token) {
  const path = join(parent, `${key}.fence`);
  const source = readFileSync(path, { encoding: "utf8", flag: "a+" }).trim();
  const previous = source === "" ? 0 : Number(source);
  if (!Number.isSafeInteger(previous) || previous < 0)
    throw new Error("lease fence file is malformed");
  const fence = previous + 1;
  if (!Number.isSafeInteger(fence)) throw new Error("lease fence exhausted");
  const temporary = `${path}.${token}.tmp`;
  try {
    writeFileSync(temporary, `${fence}\n`, "utf8");
    renameSync(temporary, path);
  } catch (error) {
    try {
      rmSync(temporary, { force: true });
    } catch {}
    throw error;
  }
  return fence;
}

function writelease(data_path, record, suffix) {
  const temporary = `${data_path}.${suffix}.${process.pid}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, "utf8");
    renameSync(temporary, data_path);
  } catch (error) {
    try {
      rmSync(temporary, { force: true });
    } catch {}
    throw error;
  }
}

function publishinitialization(options, paths, now) {
  const token = randomUUID();
  const temporary = `${paths.path}.${process.pid}.${token}.tmp`;
  const pid = options.pid === undefined ? process.pid : Number(options.pid);
  const record = { pid, claimed_at: now, token };
  let renaming = false;
  try {
    mkdirSync(temporary);
    writeFileSync(
      join(temporary, "lease.init"),
      `${JSON.stringify(record)}\n`,
      "utf8",
    );
    renaming = true;
    renameSync(temporary, paths.path);
    return record;
  } catch (error) {
    try {
      rmSync(temporary, { recursive: true, force: true });
    } catch {}
    const code = String(error?.code ?? "").toLowerCase();
    if (renaming && (code === "eexist" || code === "enotempty")) return null;
    throw error;
  }
}

function removeownedinitialization(paths, expected) {
  const current = readinitialization(paths.initialization_path);
  const stored = readrecord(paths.data_path);
  if (stored.kind !== "missing" || !sameinitialization(current, expected)) return;
  rmSync(paths.path, { recursive: true, force: true });
}

function acquiredrecord(options, scope, paths, now) {
  const metadata = operationmetadata(options);
  const token = randomUUID();
  const fence = nextfence(paths.parent, scope.key, token);
  const record = {
    schema: 2,
    acquired: true,
    scope: "worktree",
    repo_root: scope.repo_root,
    common_dir: scope.common_dir,
    path: paths.path,
    token,
    fence,
    ...metadata,
    acquired_at: now,
    heartbeat_at: now,
  };
  writelease(paths.data_path, record, "acquire");
  rmSync(paths.initialization_path, { force: true });
  return record;
}

function conflictresult(options, scope, paths, status, waited_ms = 0) {
  const metadata = operationmetadata(options);
  const diagnostic = formatleasestatus(status, { waited_ms, cwd: options.cwd });
  return {
    acquired: false,
    recovered: false,
    path: paths.path,
    token: null,
    fence: null,
    owner_id: metadata.owner_id,
    request_id: metadata.request_id,
    session_id: metadata.session_id,
    session_file: metadata.session_file,
    agent_id: metadata.agent_id,
    tool_call_id: metadata.tool_call_id,
    tool_name: metadata.tool_name,
    target: metadata.target,
    pid: metadata.pid,
    repo_root: scope.repo_root,
    common_dir: scope.common_dir,
    conflict: status.record,
    status: status.status,
    valid: status.valid,
    stale: status.stale,
    age_ms: status.age_ms,
    heartbeat_age_ms: status.heartbeat_age_ms,
    pid_alive: status.pid_alive,
    claimed_at: status.claimed_at ?? null,
    dead_pid_grace_ms: status.dead_pid_grace_ms,
    diagnostic,
    error: diagnostic,
    retryable:
      status.status === "held" || status.status === "free" || status.status === "initializing",
    timed_out: false,
    waited_ms,
  };
}
export function tryacquirelease(input = {}) {
  const options = normaliseoptions(input);
  const scope = options.scope || identity(options.cwd || ".");
  const paths = leasepaths(scope);
  operationmetadata(options);
  const now = nowfor(options);
  mkdirSync(paths.parent, { recursive: true });

  const initialization = publishinitialization(options, paths, now);
  if (initialization) {
    try {
      const record = acquiredrecord(options, scope, paths, now);
      return { ...record, recovered: false };
    } catch (error) {
      try {
        removeownedinitialization(paths, initialization);
      } catch {}
      throw error;
    }
  }
  const status = inspectlease({ ...options, scope });
  return conflictresult(options, scope, paths, status);
}

function timeoutresult(result, waited_ms, cwd) {
  const diagnostic = formatleasestatus(result, { waited_ms, cwd });
  return {
    ...result,
    timed_out: true,
    retryable: false,
    waited_ms,
    diagnostic,
    error: diagnostic,
  };
}

export function acquirelease(input = {}) {
  const options = normaliseoptions(input);
  const scope = options.scope || identity(options.cwd || ".");
  const wait_ms = acquisitionwaitms(options);
  let waited_ms = 0;
  let recovered = false;

  for (;;) {
    const result = tryacquirelease({ ...options, scope });
    if (result.acquired) return { ...result, recovered: recovered || result.recovered };
    if (result.status === "legacy" || result.status === "malformed")
      return { ...result, waited_ms };

    if (result.stale && result.conflict) {
      const released =
        result.status === "initializing"
          ? reclaiminitialization({ record: result.conflict }, scope, options)
          : releasestalelease(result.conflict, { ...options, scope });
      if (released) {
        recovered = true;
        continue;
      }
    }

    if (waited_ms >= wait_ms) return timeoutresult(result, waited_ms, options.cwd);
    const delay = Math.min(nextdelay(options), wait_ms - waited_ms);
    if (delay <= 0) return timeoutresult(result, waited_ms, options.cwd);
    sleepfor(options, delay);
    waited_ms += delay;
  }
}
export async function acquireleaseasync(input = {}) {
  const options = normaliseoptions(input);
  const scope = options.scope || identity(options.cwd || ".");
  const wait_ms = acquisitionwaitms(options);
  let waited_ms = 0;
  let recovered = false;

  for (;;) {
    const result = tryacquirelease({ ...options, scope });
    if (result.acquired) return { ...result, recovered: recovered || result.recovered };
    if (result.status === "legacy" || result.status === "malformed")
      return { ...result, waited_ms };

    if (result.stale && result.conflict) {
      const released =
        result.status === "initializing"
          ? reclaiminitialization({ record: result.conflict }, scope, options)
          : releasestalelease(result.conflict, { ...options, scope });
      if (released) {
        recovered = true;
        continue;
      }
    }

    if (waited_ms >= wait_ms) return timeoutresult(result, waited_ms, options.cwd);
    const delay = Math.min(nextdelay(options), wait_ms - waited_ms);
    if (delay <= 0) return timeoutresult(result, waited_ms, options.cwd);
    await sleepforasync(options, delay);
    waited_ms += delay;
  }
}


function readclaim(claim_path) {
  let source;
  try {
    source = readFileSync(claim_path, "utf8");
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (code === "enoent" || code === "eisdir" || code === "enotdir") return null;
    throw error;
  }
  try {
    const record = JSON.parse(source);
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    return record;
  } catch {
    return null;
  }
}

function validclaim(record) {
  return Boolean(
    record &&
      typeof record === "object" &&
      !Array.isArray(record) &&
      nonemptystring(record.token) &&
      Number.isSafeInteger(record.pid) &&
      record.pid > 0 &&
      Number.isFinite(record.claimed_at),
  );
}

function sameclaim(current, expected) {
  return (
    validclaim(current) &&
    validclaim(expected) &&
    current.token === expected.token &&
    current.pid === expected.pid &&
    current.claimed_at === expected.claimed_at
  );
}

function claimpid(options) {
  const pid = options.pid === undefined ? process.pid : Number(options.pid);
  return Number.isSafeInteger(pid) && pid > 0 ? pid : process.pid;
}

function publishclaim(claims_path, options, claim_token, claimed_at) {
  const candidate_path = join(claims_path, claim_token);
  const temporary = join(
    claims_path,
    `.${claim_token}.${process.pid}.${randomUUID()}.tmp`,
  );
  const record = { token: claim_token, pid: claimpid(options), claimed_at };
  try {
    try {
      mkdirSync(claims_path);
    } catch (error) {
      if (String(error?.code ?? "").toLowerCase() !== "eexist") throw error;
    }
    writeFileSync(temporary, `${JSON.stringify(record)}\n`, "utf8");
    linkSync(temporary, candidate_path);
    return { candidate_path, record };
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (code === "eexist") return null;
    if (code === "enoent" || code === "enotdir") return false;
    throw error;
  } finally {
    try {
      rmSync(temporary, { force: true });
    } catch {}
  }
}

function candidatefiles(claims_path) {
  let names;
  try {
    names = readdirSync(claims_path);
  } catch (error) {
    const code = String(error?.code ?? "").toLowerCase();
    if (code === "enoent" || code === "enotdir") return [];
    throw error;
  }
  return names
    .filter((name) => !name.startsWith(".") && !name.endsWith(".tmp"))
    .sort()
    .map((name) => {
      const claim_path = join(claims_path, name);
      return { claim_path, record: readclaim(claim_path) };
    })
    .filter((claim) => validclaim(claim.record));
}

function reclaimableclaim(record, now, options) {
  return (
    validclaim(record) &&
    Math.max(0, now - record.claimed_at) >= deadpidgracems(options) &&
    !processalive(record.pid)
  );
}

function claimowned(claim) {
  return sameclaim(readclaim(claim.claim_path), claim.record);
}

function releaseclaim(claim) {
  if (!claimowned(claim)) return false;
  rmSync(claim.claim_path, { force: true });
  return true;
}

function reclaimdeadclaim(claim, now, options) {
  const current = readclaim(claim.claim_path);
  if (!current) return true;
  if (!sameclaim(current, claim.record) || !reclaimableclaim(current, now, options))
    return false;
  const reread = readclaim(claim.claim_path);
  if (!reread) return true;
  if (!sameclaim(reread, current) || !reclaimableclaim(reread, now, options))
    return false;
  rmSync(claim.claim_path, { force: true });
  return true;
}

function electclaim(claim, now, options) {
  for (const contender of candidatefiles(claim.claims_path)) {
    if (contender.claim_path === claim.claim_path) continue;
    if (!reclaimableclaim(contender.record, now, options)) return false;
    if (!reclaimdeadclaim(contender, now, options)) return false;
  }
  return claimowned(claim);
}

function rereadclaimedlease(claim, expected) {
  if (!claimowned(claim)) return null;
  const stored = readrecord(claim.data_path);
  if (stored.kind !== "v2" || !stored.validation?.ok || !sameidentity(stored.record, expected))
    return null;
  return stored.record;
}

function claimcurrentlease(lease, input = {}) {
  if (!lease || lease.acquired !== true || !nonemptystring(lease.path)) return null;
  const options = normaliseoptions(input);
  const data_path = join(lease.path, "lease.json");
  const claims_path = `${data_path}.claims`;

  for (;;) {
    const claim_token = randomUUID();
    const claimed_at = nowfor(options);
    const published = publishclaim(claims_path, options, claim_token, claimed_at);
    if (published === false) return null;
    if (published === null) continue;

    const claim = {
      data_path,
      claims_path,
      claim_path: published.candidate_path,
      claim_token,
      record: published.record,
    };
    if (!electclaim(claim, claimed_at, options)) {
      releaseclaim(claim);
      return null;
    }
    const current = rereadclaimedlease(claim, lease);
    if (!current) {
      releaseclaim(claim);
      return null;
    }
    return { ...claim, current };
  }
}

function claiminitialization(status, scope, options) {
  const expected = status.record;
  if (!validinitialization(expected)) return null;
  const paths = leasepaths(scope);

  for (;;) {
    const claim_token = randomUUID();
    const claimed_at = nowfor(options);
    const published = publishclaim(paths.claims_path, options, claim_token, claimed_at);
    if (published === false) return null;
    if (published === null) continue;

    const claim = {
      data_path: paths.data_path,
      claims_path: paths.claims_path,
      claim_path: published.candidate_path,
      claim_token,
      record: published.record,
    };
    if (!electclaim(claim, claimed_at, options)) {
      releaseclaim(claim);
      return null;
    }

    const current = readinitialization(paths.initialization_path);
    const stored = readrecord(paths.data_path);
    const now = nowfor(options);
    if (
      stored.kind !== "missing" ||
      !sameinitialization(current, expected) ||
      Math.max(0, now - current.claimed_at) < deadpidgracems(options) ||
      processalive(current.pid)
    ) {
      releaseclaim(claim);
      return null;
    }
    return { ...claim, current };
  }
}

function reclaiminitialization(status, scope, options) {
  const claimed = claiminitialization(status, scope, options);
  if (!claimed) return false;
  const paths = leasepaths(scope);
  let removed = false;
  try {
    const current = readinitialization(paths.initialization_path);
    const stored = readrecord(paths.data_path);
    const now = nowfor(options);
    if (
      !claimowned(claimed) ||
      stored.kind !== "missing" ||
      !sameinitialization(current, claimed.current) ||
      Math.max(0, now - current.claimed_at) < deadpidgracems(options) ||
      processalive(current.pid)
    )
      return false;
    rmSync(paths.path, { recursive: true, force: true });
    removed = true;
    return true;
  } finally {
    if (!removed) releaseclaim(claimed);
  }
}

export function heartbeatlease(lease, input = {}) {
  if (!lease || lease.acquired !== true) return false;
  const options = normaliseoptions(input);
  const claimed = claimcurrentlease(lease, options);
  if (!claimed) return false;

  let replaced = false;
  try {
    const current = rereadclaimedlease(claimed, lease);
    if (!current) return false;
    const now = nowfor(options);
    const heartbeat_at = Math.max(current.heartbeat_at, now);
    const renewed = { ...current, heartbeat_at };
    writelease(claimed.data_path, renewed, "heartbeat");
    replaced = true;
    releaseclaim(claimed);
    if (typeof lease === "object") lease.heartbeat_at = heartbeat_at;
    return true;
  } finally {
    if (!replaced) releaseclaim(claimed);
  }
}

export function releaselease(lease, input = {}) {
  if (!lease || lease.acquired !== true) return false;
  const options = normaliseoptions(input);
  const claimed = claimcurrentlease(lease, options);
  if (!claimed) return false;

  let removed = false;
  try {
    const current = rereadclaimedlease(claimed, lease);
    if (!current) return false;
    rmSync(current.path, { recursive: true, force: true });
    removed = true;
    return true;
  } finally {
    if (!removed) releaseclaim(claimed);
  }
}

export function releasestalelease(input = {}, timing = {}) {
  let lease;
  let options;
  if (input && typeof input === "object" && input.acquired === true && input.path) {
    lease = input;
    options = normaliseoptions(timing);
  } else {
    options = normaliseoptions(input);
    const status = inspectlease(options);
    if (status.status !== "held" || !status.stale || !status.record) return false;
    lease = status.record;
  }

  const claimed = claimcurrentlease(lease, options);
  if (!claimed) return false;

  let removed = false;
  try {
    const current = rereadclaimedlease(claimed, lease);
    if (!current) return false;
    const heartbeat_age_ms = Math.max(0, nowfor(options) - current.heartbeat_at);
    if (heartbeat_age_ms < staleheartbeatms(options)) return false;
    rmSync(current.path, { recursive: true, force: true });
    removed = true;
    return true;
  } finally {
    if (!removed) releaseclaim(claimed);
  }
}


export { heartbeatintervalms };
