import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { randomUUID } from "node:crypto";
import { dirname, resolve as resolvePath } from "node:path";
import { isRecord, isText, parseJsonObject } from "./predicates.js";

export const FRUSTRATION_PATH = process.env.OMP_GATE_FRUSTRATIONS ||
  resolvePath(homedir(), ".omp/gate-checker/frustrations.jsonl");
const FIXED_TYPES = ["tooling", "environment", "requirements", "workflow", "test", "dependency", "performance", "other", "none"];
const FIXED_SEVERITIES = ["low", "medium", "high", "blocker"];

const nonempty = (value) => isText(value) && value.trim().length > 0;
const timestamp = (value) => nonempty(value) && Number.isFinite(Date.parse(value));

export function loadTaxonomy(repoRoot) {
  const types = [...FIXED_TYPES];
  const severities = [...FIXED_SEVERITIES];
  if (isText(repoRoot) && repoRoot) {
    try {
      const data = existsSync(resolvePath(repoRoot, ".omp/gates-frustrations.json"))
        ? parseJsonObject(readFileSync(resolvePath(repoRoot, ".omp/gates-frustrations.json"), "utf8"))
        : null;
      for (const [key, values] of [["types", types], ["severities", severities]]) {
        if (!data || !Array.isArray(data[key])) continue;
        for (const value of data[key]) if (nonempty(value) && !values.includes(value)) values.push(value);
      }
    } catch {}
  }
  return { types, severities };
}

function validEvidence(evidence) {
  if (!isRecord(evidence)) return false;
  if (evidence.kind === "gate") return nonempty(evidence.event_id) && nonempty(evidence.rule);
  if (evidence.kind === "snapshot") return nonempty(evidence.path) &&
    Number.isInteger(evidence.line) && evidence.line > 0 && nonempty(evidence.digest) && nonempty(evidence.claim);
  return evidence.kind === "command" && nonempty(evidence.command) &&
    Number.isInteger(evidence.exit_code) && isText(evidence.output);
}

function taxonomyRoot(record, repoRoot) {
  return nonempty(repoRoot) ? repoRoot : isRecord(record) && nonempty(record.repo_root)
    ? record.repo_root : undefined;
}

function validStoredRecord(record, repoRoot) {
  if (!isRecord(record) || !timestamp(record.ts) || !nonempty(record.request_id) ||
      !nonempty(record.agent_id) || !nonempty(record.session_file) || !nonempty(record.session_id) ||
      !nonempty(record.primary_goal) || !nonempty(record.complaint) || !nonempty(record.type) ||
      !nonempty(record.severity) || !Array.isArray(record.evidence) || !record.evidence.length)
    return false;
  if (record.source !== undefined && record.source !== "agent" && record.source !== "auto") return false;
  const [evidence] = record.evidence;
  if (record.type === "none" && (record.complaint !== "none" || record.severity !== "low" ||
      record.evidence.length !== 1 || !isRecord(evidence) || evidence.kind !== "gate" || evidence.rule !== "clean_turn"))
    return false;
  const taxonomy = loadTaxonomy(repoRoot);
  return taxonomy.types.includes(record.type) && taxonomy.severities.includes(record.severity) &&
    record.evidence.every(validEvidence);
}

export function validateRecord(input, options = {}) {
  try {
    if (!isRecord(input)) return { ok: false, error: "record must be an object" };
    const session_file = nonempty(options.sessionFile) ? options.sessionFile : null;
    if (!session_file) return { ok: false, error: "session_file is required" };
    const session_id = nonempty(options.sessionId) ? options.sessionId : null;
    if (!session_id) return { ok: false, error: "session_id is required" };
    const agent_id = input.agent_id;
    const primary_goal = input.primary_goal;
    const complaint = input.complaint;
    const type = input.type;
    const severity = input.severity;
    const evidence = type === "none"
      ? [{ kind: "gate", event_id: randomUUID(), rule: "clean_turn" }]
      : input.evidence;
    if (!nonempty(agent_id)) return { ok: false, error: "agent_id is required" };
    if (!nonempty(primary_goal)) return { ok: false, error: "primary_goal is required" };
    if (!nonempty(complaint)) return { ok: false, error: "complaint is required" };
    if (!nonempty(type)) return { ok: false, error: "type is required" };
    if (!nonempty(severity)) return { ok: false, error: "severity is required" };
    const repoRoot = taxonomyRoot(input, options.repoRoot);
    const taxonomy = loadTaxonomy(repoRoot);
    if (!taxonomy.types.includes(type)) return { ok: false, error: `type "${type}" is not in the taxonomy` };
    if (!taxonomy.severities.includes(severity)) return { ok: false, error: `severity "${severity}" is not in the taxonomy` };
    if (type === "none" && complaint !== "none") return { ok: false, error: 'type "none" requires complaint "none"' };
    if (type === "none" && severity !== "low") return { ok: false, error: 'type "none" requires severity "low"' };
    if (!Array.isArray(evidence) || !evidence.length)
      return { ok: false, error: "at least one evidence entry is required" };
    if (!evidence.every(validEvidence)) return { ok: false, error: "invalid evidence entry" };
    const request_id = nonempty(options.requestId) ? options.requestId : null;
    if (!request_id) return { ok: false, error: "request_id is required" };
    const ts = input.ts === undefined ? new Date().toISOString() : input.ts;
    if (!timestamp(ts)) return { ok: false, error: "ts must be a valid timestamp" };
    const record = { ts, request_id, session_file, session_id, agent_id, primary_goal, complaint, type, severity, evidence,
      source: options.source === "auto" ? "auto" : "agent" };
    if (nonempty(repoRoot)) record.repo_root = repoRoot;
    if (isText(options.cwd)) record.cwd = options.cwd;
    return validStoredRecord(record, repoRoot)
      ? { ok: true, record }
      : { ok: false, error: "record is incomplete" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function appendRecord(record, path = FRUSTRATION_PATH, options = {}) {
  try {
    const repoRoot = taxonomyRoot(record, options.repoRoot);
    if (!validStoredRecord(record, repoRoot)) return { ok: false, error: "record must be complete and validated" };
    const parent = dirname(path);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    appendFileSync(path, `${JSON.stringify(record)}\n`, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function readRecords(path = FRUSTRATION_PATH, options = {}) {
  try {
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8").split("\n").filter(Boolean).map(parseJsonObject)
      .filter((record) => isRecord(record) && validStoredRecord(record, taxonomyRoot(record, options.repoRoot)));
  } catch {
    return [];
  }
}

export function missingIdentities(records, identities, repoRoot) {
  const covered = new Set(records.filter((record) => validStoredRecord(record, taxonomyRoot(record, repoRoot)))
    .map((record) => record.session_file));
  const missing = [];
  for (const identity of identities) {
    const agent_id = isText(identity) ? identity : isRecord(identity) ? identity.agent_id : null;
    const session_file = isText(identity) || !isRecord(identity) ? null : identity.session_file;
    if (isText(agent_id) && (!isText(session_file) || !session_file || !covered.has(session_file))) missing.push(agent_id);
  }
  return missing;
}

export function automaticGateRecord(fields) {
  const record = {
    ts: new Date().toISOString(),
    request_id: fields.request_id,
    agent_id: isText(fields.agent_id) ? fields.agent_id : "main",
    session_file: fields.session_file,
    session_id: fields.session_id,
    primary_goal: isText(fields.primary_goal) ? fields.primary_goal : "complete the active request",
    complaint: fields.detail,
    type: "workflow",
    severity: fields.blocking ? "high" : "medium",
    evidence: [{ kind: "gate", event_id: isText(fields.event_id) && fields.event_id ? fields.event_id : randomUUID(), rule: fields.rule }],
    source: "auto",
  };
  if (isText(fields.repo_root)) record.repo_root = fields.repo_root;
  if (isText(fields.cwd)) record.cwd = fields.cwd;
  return record;
}
