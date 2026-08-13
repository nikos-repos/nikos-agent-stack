/**
 * @module gate-checker/ledger
 * @description append-only jsonl record of every gate fire and its outcome.
 *
 * the gates block work, so they need a measured precision. without this, tuning
 * is blind. the metric that matters most is the cap-hit rate: a real defect is
 * fixed within a retry or two, so a chain that burns every continuation and
 * still fails is almost always the gate being wrong, not the agent.
 *
 * never throws. a broken ledger must not break the agent.
 *
 * @typedef {"inline_flag"|"gate_eval"|"chain_end"|"no_git"|"process_shape"} LedgerEvent
 */

import { appendFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve as resolvePath, dirname } from "path";
import { homedir } from "os";

// OMP_GATE_LEDGER redirects the ledger. wiring-check.ts sets it so a test run
// cannot pollute the real tuning data — `os.homedir()` does not follow a
// process.env.HOME assigned at runtime, so overriding HOME is not enough.
export const LEDGER_PATH =
  process.env.OMP_GATE_LEDGER ||
  resolvePath(homedir(), ".omp/gate-checker/ledger.jsonl");

/**
 * @param {LedgerEvent} event
 * @param {Record<string, unknown>} fields
 * @param {string} [path]
 */
export function append(event, fields, path = LEDGER_PATH) {
  try {
    const dir = dirname(path);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(
      path,
      JSON.stringify({ ts: new Date().toISOString(), event, ...fields }) + "\n",
      "utf-8",
    );
  } catch {
    // ledger is diagnostic only — never let it break the run
  }
}

/**
 * @param {string} [path]
 * @returns {Array<Record<string, unknown>>}
 */
export function read(path = LEDGER_PATH) {
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
      .filter((r) => r !== null);
  } catch {
    return [];
  }
}

/**
 * aggregates the ledger into the numbers that drive tuning decisions.
 *
 * `capHitRate` is the headline: high means the gates are too strict, because
 * the agent could not satisfy them even given every retry.
 *
 * @param {Array<Record<string, unknown>>} records
 */
export function summarize(records) {
  /** @type {Record<string, number>} */
  const byRule = {};
  /** @type {Record<string, number>} */
  const inlineByRule = {};
  let chains = 0;
  let capHits = 0;
  let resolved = 0;
  let releasedWithFailures = 0;
  /** @type {Record<string, number>} */
  const releasedByReason = {};
  let continuations = 0;
  let inlineFlags = 0;
  let no_git_runs = 0;

  // "a process should have run" — requests that were bounded, verified,
  // code-changing units of work. `shapeMissRate` by reason tells you whether
  // the thresholds are wrong or the workload is simply not that shape.
  let shapeRequests = 0;
  let shapeMatched = 0;
  /** @type {Record<string, number>} */
  const shapeMissBy = {};

  for (const r of records) {
    if (r.event === "gate_eval") {
      for (const rule of /** @type {string[]} */ (r.rules ?? [])) {
        byRule[rule] = (byRule[rule] ?? 0) + 1;
      }
      if (r.forced) continuations++;
    } else if (r.event === "inline_flag") {
      inlineFlags++;
      const rule = String(r.rule ?? "unknown");
      inlineByRule[rule] = (inlineByRule[rule] ?? 0) + 1;
    } else if (r.event === "chain_end") {
      chains++;
      if (r.outcome === "resolved") {
        resolved++;
      } else if (
        r.outcome === "released_with_failures" ||
        r.outcome === "cap_reached" ||
        r.outcome === "stalemate"
      ) {
        releasedWithFailures++;
        const reason = String(
          r.release_reason ??
          (r.outcome === "cap_reached" ? "continuation_cap" : r.outcome),
        );
        releasedByReason[reason] = (releasedByReason[reason] ?? 0) + 1;
        if (reason === "continuation_cap") capHits++;
      }
    } else if (r.event === "no_git" || r.event === "degraded") {
      no_git_runs++;
    } else if (r.event === "process_shape") {
      shapeRequests++;
      if (r.matched) shapeMatched++;
      else {
        const reason = String(r.reason ?? "unknown");
        shapeMissBy[reason] = (shapeMissBy[reason] ?? 0) + 1;
      }
    }
  }

  return {
    chains,
    resolved,
    capHits,
    capHitRate: chains > 0 ? capHits / chains : 0,
    continuations,
    releasedWithFailures,
    releasedByReason,
    inlineFlags,
    no_git_runs,
    byRule,
    inlineByRule,
    shapeRequests,
    shapeMatched,
    shapeMatchRate: shapeRequests > 0 ? shapeMatched / shapeRequests : 0,
    shapeMissBy,
  };
}
