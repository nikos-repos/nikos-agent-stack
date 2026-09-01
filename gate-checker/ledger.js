import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve as resolvePath } from "node:path";
import { isRecord, parseJsonObject } from "./predicates.js";

export const LEDGER_PATH = process.env.OMP_GATE_LEDGER ||
  resolvePath(homedir(), ".omp/gate-checker/ledger.jsonl");

export function append(event, fields, path = LEDGER_PATH) {
  try {
    const parent = dirname(path);
    if (!existsSync(parent)) mkdirSync(parent, { recursive: true });
    appendFileSync(path, `${JSON.stringify({ ts: new Date().toISOString(), event, ...fields })}\n`, "utf8");
  } catch {}
}

export function read(path = LEDGER_PATH) {
  try {
    if (!existsSync(path)) return [];
    return readFileSync(path, "utf8").split("\n").filter(Boolean)
      .map(parseJsonObject).filter(isRecord);
  } catch {
    return [];
  }
}

const increment = (table, key) => { table[key] = (table[key] || 0) + 1; };

export function summarize(records) {
  const byRule = {};
  const inlineByRule = {};
  const releasedByReason = {};
  const processMissBy = {};
  let chains = 0;
  let capHits = 0;
  let resolved = 0;
  let releasedWithFailures = 0;
  let continuations = 0;
  let inlineFlags = 0;
  let no_git_runs = 0;
  let processRequests = 0;
  let processMatched = 0;
  for (const record of records) {
    if (record.event === "gate_eval") {
      for (const rule of Array.isArray(record.rules) ? record.rules : []) increment(byRule, rule);
      if (record.forced) continuations++;
    } else if (record.event === "inline_flag") {
      inlineFlags++;
      increment(inlineByRule, String(record.rule ?? "unknown"));
    } else if (record.event === "chain_end") {
      chains++;
      if (record.outcome === "resolved") resolved++;
      if (["released_with_failures", "cap_reached", "stalemate"].includes(record.outcome)) {
        releasedWithFailures++;
        const reason = String(record.release_reason ??
          (record.outcome === "cap_reached" ? "continuation_cap" : record.outcome));
        increment(releasedByReason, reason);
        if (reason === "continuation_cap") capHits++;
      }
    } else if (record.event === "no_git" || record.event === "degraded") {
      no_git_runs++;
    } else if (record.event === "process_shape") {
      processRequests++;
      if (record.matched) processMatched++;
      else increment(processMissBy, String(record.reason ?? "unknown"));
    }
  }
  return {
    chains, resolved, capHits, capHitRate: chains ? capHits / chains : 0,
    continuations, releasedWithFailures, releasedByReason, inlineFlags,
    no_git_runs, byRule, inlineByRule,
    "shapeRequests": processRequests,
    "shapeMatched": processMatched,
    "shapeMatchRate": processRequests ? processMatched / processRequests : 0,
    "shapeMissBy": processMissBy,
  };
}
