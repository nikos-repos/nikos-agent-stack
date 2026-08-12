#!/usr/bin/env bun
/**
 * @module gate-checker/gate-cli
 * @description Command-line surface over the shared predicates, so Layer 2's
 *              shell gates run the SAME code as Layer 1 instead of a parallel
 *              `grep '^+'` pipeline that drifts from it.
 *
 * Commands:
 *   cutover [--base <ref>] [--cwd <dir>] [--markers <file>]
 *       Exit 0 when no forbidden marker appears in lines added since <ref>.
 *       Exit 1 (with the offending lines on stdout) otherwise.
 *
 *   stats [--json] [--ledger <path>]
 *       Summarize the gate ledger. `capHitRate` is the headline number: a high
 *       rate means the gates are too strict, because the agent could not
 *       satisfy them even given every retry.
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import {
  DEFAULT_FORBIDDEN_MARKERS,
  loadForbiddenMarkers,
  parseDiffAdditions,
  checkAddedLines,
} from "./predicates.js";
import { read, summarize, LEDGER_PATH } from "./ledger.js";

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

/** @param {string} cmd @param {string} cwd @returns {string} */
function sh(cmd, cwd) {
  try {
    return execSync(cmd, {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
      maxBuffer: 64 * 1024 * 1024,
    });
  } catch {
    return "";
  }
}

/** @param {Record<string, string | boolean>} args */
function cutover(args) {
  const cwd = String(args.cwd ?? ".");
  let base = String(args.base ?? "HEAD~1");

  // fall back to the root commit when the ref does not resolve (shallow clone,
  // or a repo with a single commit)
  if (!sh(`git rev-parse --verify ${base} 2>/dev/null`, cwd).trim()) {
    base = sh("git rev-list --max-parents=0 HEAD", cwd).trim().split("\n")[0];
  }

  /** @type {Map<string, Array<{line: number, text: string}>>} */
  const added = new Map();
  if (base) {
    parseDiffAdditions(
      sh(`git diff -U0 --diff-filter=ACMR ${base}..HEAD 2>/dev/null`, cwd),
      added,
    );
  }
  parseDiffAdditions(
    sh("git diff -U0 --diff-filter=ACMR 2>/dev/null", cwd),
    added,
  );
  parseDiffAdditions(
    sh("git diff -U0 --cached --diff-filter=ACMR 2>/dev/null", cwd),
    added,
  );

  let markers = loadForbiddenMarkers(cwd);
  if (typeof args.markers === "string" && existsSync(args.markers)) {
    markers = [
      ...DEFAULT_FORBIDDEN_MARKERS,
      ...readFileSync(args.markers, "utf-8")
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#")),
    ];
  }

  const failures = checkAddedLines(added, markers);
  if (failures.length === 0) {
    console.log("cutover gate: clean (no forbidden markers in added lines)");
    return 0;
  }
  console.log(`cutover gate: ${failures.length} forbidden marker(s) added`);
  for (const f of failures) console.log(`  ${f.detail}`);
  return 1;
}

/** @param {Record<string, string | boolean>} args */
function stats(args) {
  const path = typeof args.ledger === "string" ? args.ledger : LEDGER_PATH;
  const records = read(path);
  const s = summarize(records);

  if (args.json) {
    console.log(JSON.stringify({ ledger: path, records: records.length, ...s }, null, 2));
    return 0;
  }

  console.log(`gate-checker ledger: ${path}`);
  console.log(`  records          ${records.length}`);
  if (records.length === 0) {
    console.log("  (no gate activity recorded yet)");
    return 0;
  }
  console.log(`  chains           ${s.chains}  (resolved ${s.resolved}, cap hit ${s.capHits})`);
  console.log(`  cap-hit rate     ${(s.capHitRate * 100).toFixed(1)}%  <- high means gates too strict`);
  console.log(`  forced retries   ${s.continuations}`);
  console.log(`  inline flags     ${s.inlineFlags}  <- caught early, no retry needed`);
  console.log(`  degraded runs    ${s.degraded}`);

  if (s.shapeRequests > 0) {
    console.log(
      `  process-shaped  ${s.shapeMatched}/${s.shapeRequests} requests  (${(s.shapeMatchRate * 100).toFixed(1)}%)  <- "a process should have run"`,
    );
    const miss = Object.entries(s.shapeMissBy).sort((a, b) => b[1] - a[1]);
    if (miss.length > 0) {
      console.log("  not process-shaped because:");
      for (const [reason, n] of miss) console.log(`    ${String(n).padStart(5)}  ${reason}`);
    }
  }

  const rules = Object.entries(s.byRule).sort((a, b) => b[1] - a[1]);
  if (rules.length > 0) {
    console.log("  fires by rule:");
    for (const [rule, n] of rules) console.log(`    ${String(n).padStart(5)}  ${rule}`);
  }
  const inline = Object.entries(s.inlineByRule).sort((a, b) => b[1] - a[1]);
  if (inline.length > 0) {
    console.log("  inline flags by rule:");
    for (const [rule, n] of inline) console.log(`    ${String(n).padStart(5)}  ${rule}`);
  }
  return 0;
}

const [, , command, ...rest] = process.argv;
const args = parseArgs(rest);

let code = 0;
if (command === "cutover") {
  code = cutover(args);
} else if (command === "stats") {
  code = stats(args);
} else {
  console.log("usage: gate-cli.js <cutover|stats> [options]");
  console.log("  cutover [--base <ref>] [--cwd <dir>] [--markers <file>]");
  console.log("  stats   [--json] [--ledger <path>]");
  code = command ? 2 : 0;
}
process.exit(code);
