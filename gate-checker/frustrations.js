/**
 * @module gate-checker/frustrations
 * @description append-only jsonl scratchpad for every frustration a session or
 * subagent encounters. the gate-checker enforces a record for every active
 * identity, so the tool this module backs is the escape valve the agent uses
 * to satisfy that gate.
 *
 * never throws. a broken scratchpad must not break the agent — mirrors
 * ledger.js.
 *
 * record shape:
 *   { ts, request_id, session_file, session_id, agent_id, primary_goal, complaint, type, severity, evidence[] }
 *
 * evidence variants:
 *   { kind: "gate", event_id, rule }
 *   { kind: "snapshot", path, line, digest, claim }
 *   { kind: "command", command, exit_code, output }
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve as resolvePath, dirname } from "path";
import { homedir } from "os";
import { randomUUID } from "crypto";

// omp_gate_frustrations redirects the scratchpad, same rationale as the ledger
// env var: a test run must not pollute real data.
export const FRUSTRATION_PATH =
  process.env.OMP_GATE_FRUSTRATIONS ||
  resolvePath(homedir(), ".omp/gate-checker/frustrations.jsonl");

const FIXED_TYPES = [
  "tooling",
  "environment",
  "requirements",
  "workflow",
  "test",
  "dependency",
  "performance",
  "other",
];

const FIXED_SEVERITIES = ["low", "medium", "high", "blocker"];

function nonemptystring(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function validtimestamp(value) {
  return nonemptystring(value) && Number.isFinite(Date.parse(value));
}

/**
 * loads the active taxonomy. fixed defaults are always present; a project may
 * extend both lists via `<repo>/.omp/gates-frustrations.json`.
 *
 * @param {string} [repoRoot]
 * @returns {{types: string[], severities: string[]}}
 */
export function loadTaxonomy(repoRoot) {
  const types = [...FIXED_TYPES];
  const severities = [...FIXED_SEVERITIES];
  if (repoRoot) {
    const ext = resolvePath(repoRoot, ".omp/gates-frustrations.json");
    try {
      if (existsSync(ext)) {
        const data = JSON.parse(readFileSync(ext, "utf-8"));
        if (Array.isArray(data.types)) {
          for (const t of data.types) {
            if (nonemptystring(t) && !types.includes(t)) types.push(t);
          }
        }
        if (Array.isArray(data.severities)) {
          for (const s of data.severities) {
            if (nonemptystring(s) && !severities.includes(s)) severities.push(s);
          }
        }
      }
    } catch {
      // a broken extension file must not widen or narrow the taxonomy
    }
  }
  return { types, severities };
}

function validevidence(ev) {
  if (!ev || typeof ev !== "object" || Array.isArray(ev)) return false;
  if (ev.kind === "gate")
    return nonemptystring(ev.event_id) && nonemptystring(ev.rule);
  if (ev.kind === "snapshot")
    return (
      nonemptystring(ev.path) &&
      Number.isInteger(ev.line) &&
      ev.line > 0 &&
      nonemptystring(ev.digest) &&
      nonemptystring(ev.claim)
    );
  if (ev.kind === "command")
    return (
      nonemptystring(ev.command) &&
      Number.isInteger(ev.exit_code) &&
      typeof ev.output === "string"
    );
  return false;
}

function recordtaxonomyroot(record, repoRoot) {
  if (nonemptystring(repoRoot)) return repoRoot;
  return nonemptystring(record?.repo_root) ? record.repo_root : undefined;
}

function validstoredrecord(record, repoRoot) {
  if (!record || typeof record !== "object" || Array.isArray(record)) return false;
  if (
    !validtimestamp(record.ts) ||
    !nonemptystring(record.request_id) ||
    !nonemptystring(record.agent_id) ||
    !nonemptystring(record.session_file) ||
    !nonemptystring(record.session_id) ||
    !nonemptystring(record.primary_goal) ||
    !nonemptystring(record.complaint) ||
    !nonemptystring(record.type) ||
    !nonemptystring(record.severity) ||
    !Array.isArray(record.evidence) ||
    record.evidence.length === 0
  )
    return false;
  const { types, severities } = loadTaxonomy(repoRoot);
  return (
    types.includes(record.type) &&
    severities.includes(record.severity) &&
    record.evidence.every(validevidence)
  );
}

/**
 * validates and normalises a record. injects trusted request and session
 * identity values. invalid input returns
 * { ok: false, error }, never throws.
 *
 * @param {Record<string, unknown>} input
 * @param {{repoRoot?: string, requestId?: string, cwd?: string, sessionFile?: string, sessionId?: string}} [options]
 * @returns {{ok: true, record: Record<string, unknown>} | {ok: false, error: string}}
 */
export function validateRecord(input, options = {}) {
  try {
    if (!input || typeof input !== "object" || Array.isArray(input))
      return { ok: false, error: "record must be an object" };
    const session_file = nonemptystring(options.sessionFile)
      ? options.sessionFile
      : null;
    if (!session_file)
      return { ok: false, error: "session_file is required" };
    const session_id = nonemptystring(options.sessionId)
      ? options.sessionId
      : null;
    if (!session_id)
      return { ok: false, error: "session_id is required" };

    const agent_id = input.agent_id;
    const primary_goal = input.primary_goal;
    const complaint = input.complaint;
    const type = input.type;
    const severity = input.severity;
    const evidence = input.evidence;

    if (!nonemptystring(agent_id))
      return { ok: false, error: "agent_id is required" };
    if (!nonemptystring(primary_goal))
      return { ok: false, error: "primary_goal is required" };
    if (!nonemptystring(complaint))
      return { ok: false, error: "complaint is required" };
    if (!nonemptystring(type))
      return { ok: false, error: "type is required" };
    if (!nonemptystring(severity))
      return { ok: false, error: "severity is required" };

    const repoRoot = recordtaxonomyroot(input, options.repoRoot);
    const { types, severities } = loadTaxonomy(repoRoot);
    if (!types.includes(type))
      return { ok: false, error: `type "${type}" is not in the taxonomy` };
    if (!severities.includes(severity))
      return { ok: false, error: `severity "${severity}" is not in the taxonomy` };

    if (!Array.isArray(evidence) || evidence.length === 0)
      return { ok: false, error: "at least one evidence entry is required" };
    for (const ev of evidence) {
      if (!validevidence(ev))
        return { ok: false, error: "invalid evidence entry" };
    }

    const request_id = nonemptystring(options.requestId)
      ? options.requestId
      : null;
    if (!request_id)
      return { ok: false, error: "request_id is required" };

    const ts = input.ts === undefined ? new Date().toISOString() : input.ts;
    if (!validtimestamp(ts))
      return { ok: false, error: "ts must be a valid timestamp" };

    const record = {
      ts,
      request_id,
      session_file,
      session_id,
      agent_id,
      primary_goal,
      complaint,
      type,
      severity,
      evidence,
    };
    if (nonemptystring(repoRoot)) {
      record.repo_root = repoRoot;
    }
    if (typeof options.cwd === "string") record.cwd = options.cwd;

    if (!validstoredrecord(record, repoRoot))
      return { ok: false, error: "record is incomplete" };
    return { ok: true, record };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/**
 * atomically appends a complete validated record as one jsonl line. raw or
 * invalid input is rejected and never appended. never throws.
 *
 * @param {Record<string, unknown>} record
 * @param {string} [path]
 * @param {{repoRoot?: string}} [options]
 * @returns {{ok: true} | {ok: false, error: string}}
 */
export function appendRecord(record, path = FRUSTRATION_PATH, options = {}) {
  try {
    const repoRoot = recordtaxonomyroot(record, options?.repoRoot);
    if (!validstoredrecord(record, repoRoot))
      return { ok: false, error: "record must be complete and validated" };

    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(path, JSON.stringify(record) + "\n", "utf-8");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) };
  }
}

/**
 * reads every complete record from the jsonl file. corrupt or malformed lines
 * are skipped. never throws.
 *
 * @param {string} [path]
 * @param {{repoRoot?: string}} [options]
 * @returns {Array<Record<string, unknown>>}
 */
export function readRecords(path = FRUSTRATION_PATH, options = {}) {
  try {
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf-8")
      .split("\n")
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter(
        (record) =>
          record !== null &&
          validstoredrecord(
            record,
            recordtaxonomyroot(record, options?.repoRoot),
          ),
      );
  } catch {
    return [];
  }
}

/**
 * given the current session's records and the identities that need a record,
 * returns the readable labels that are missing. only complete records count,
 * and their server-derived session identity must match.
 *
 * @param {Array<Record<string, unknown>>} records
 * @param {Array<string | {agent_id: string, session_file: string | null}>} identities
 * @param {string} [repoRoot]
 * @returns {string[]}
 */
export function missingIdentities(records, identities, repoRoot) {
  const covered = new Set();
  for (const r of records) {
    if (validstoredrecord(r, recordtaxonomyroot(r, repoRoot))) {
      covered.add(r.session_file);
    }
  }
  const missing = [];
  for (const id of identities) {
    const agentId = typeof id === "string" ? id : id?.agent_id;
    const sessionFile = typeof id === "string" ? null : id?.session_file;
    if (
      typeof agentId === "string" &&
      (typeof sessionFile !== "string" || !sessionFile || !covered.has(sessionFile))
    )
      missing.push(agentId);
  }
  return missing;
}

/**
 * builds a machine-authored record for an automatic failed gate. fills
 * complaint from detail, type is always workflow, and severity tracks the
 * blocking flag.
 *
 * @param {{request_id: string, rule: string, detail: string, blocking: boolean, event_id?: string, agent_id?: string, primary_goal?: string, repo_root?: string|null, cwd?: string, session_file?: string, session_id?: string}} fields
 * @returns {Record<string, unknown>}
 */
export function automaticGateRecord(fields) {
  const event_id =
    typeof fields.event_id === "string" && fields.event_id
      ? fields.event_id
      : randomUUID();
  return {
    ts: new Date().toISOString(),
    request_id: fields.request_id,
    agent_id: typeof fields.agent_id === "string" ? fields.agent_id : "main",
    session_file: fields.session_file,
    session_id: fields.session_id,
    primary_goal:
      typeof fields.primary_goal === "string"
        ? fields.primary_goal
        : "complete the active request",
    complaint: fields.detail,
    type: "workflow",
    severity: fields.blocking ? "high" : "medium",
    evidence: [{ kind: "gate", event_id, rule: fields.rule }],
    ...(typeof fields.repo_root === "string" ? { repo_root: fields.repo_root } : {}),
    ...(typeof fields.cwd === "string" ? { cwd: fields.cwd } : {}),
  };
}
