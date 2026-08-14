#!/usr/bin/env bun
/**
 * @module gate-checker/gate-cli
 * @description command-line surface over the shared predicates, so an audit run
 *              outside a session applies the same code as the extension instead
 *              of a parallel `grep '^+'` pipeline that drifts from it.
 *
 * commands:
 *   advisor install
 *       merge the packaged terra profile into the user watchdog configuration.
 *
 *   cutover [--base <ref>] [--cwd <dir>] [--markers <file>]
 *       exit 0 when no forbidden marker appears in lines added since <ref>.
 *       exit 1 (with the offending lines on stdout) otherwise.
 *
 *   stats [--json] [--ledger <path>]
 *       summarize the gate ledger. `capHitRate` is the headline number: a high
 *       rate means the gates are too strict, because the agent could not
 *       satisfy them even given every retry.
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_FORBIDDEN_MARKERS,
  loadForbiddenMarkers,
  checkAddedLines,
} from "./predicates.js";
import { read, summarize, LEDGER_PATH } from "./ledger.js";
import { resolvescope } from "./scope.js";
import { auditscope } from "./risks.js";
import { installadvisor } from "../advisor/install.js";

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

/** @param {string[]} command @param {string} cwd @returns {string} */
function git(command, cwd) {
  try {
    return execFileSync("git", command, {
      cwd,
      encoding: "utf-8",
      timeout: 10000,
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch {
    return "";
  }
}

/** @param {Record<string, string | boolean>} args */
function cutover(args) {
  const cwd = String(args.cwd ?? ".");
  let base = String(args.base ?? "HEAD~1");

  if (!git(["rev-parse", "--verify", `${base}^{commit}`], cwd).trim()) {
    base = git(["rev-list", "--max-parents=0", "HEAD"], cwd)
      .trim()
      .split("\n")[0];
  }
  if (!base) {
    console.error("cutover gate: no git baseline is available");
    return 2;
  }

  let scope;
  try {
    scope = resolvescope({
      kind: "request",
      cwd,
      baseline_sha: base,
      baseline_dirty: new Set(),
    });
  } catch (error) {
    console.error(`cutover gate: ${String(error)}`);
    return 2;
  }
  const added = new Map(Object.entries(scope.added));

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
function audit(args) {
  const cwd = String(args.cwd ?? ".");
  const kind = String(args.kind ?? "uncommitted");
  const options = { kind, cwd };
  if (typeof args.folder === "string") options.folder = args.folder;
  if (kind === "request") {
    if (typeof args.base !== "string") {
      console.error("audit: request scope requires --base <ref>");
      return 2;
    }
    options.baseline_sha = args.base;
    options.baseline_dirty = new Set();
  } else if (kind === "base") {
    if (typeof args.base !== "string") {
      console.error("audit: base scope requires --base <ref>");
      return 2;
    }
    options.base_ref = args.base;
  } else if (kind === "commit") {
    if (typeof args.commit !== "string") {
      console.error("audit: commit scope requires --commit <ref>");
      return 2;
    }
    options.commit_ref = args.commit;
  } else if (kind !== "uncommitted") {
    console.error(`audit: unknown scope kind \"${kind}\"`);
    return 2;
  }
  try {
    const scope = resolvescope(options);

    const risk = auditscope(scope);
    const output = {
      ...scope,
      risk_outcome: risk.outcome,
      risks: risk.findings,
    };
    if (args.json) {
      console.log(JSON.stringify(output, null, 2));
    } else {
      console.log(`gate audit: ${scope.kind} (${scope.files.length} files)`);
      console.log(`  digest  ${scope.digest}`);
      for (const file of scope.files) {
        console.log(`  ${file.type.padEnd(12)} ${file.path}`);
      }
      for (const finding of risk.findings) {
        console.log(
          `  advisory     ${finding.id} ${finding.evidence.path}` +
          `${finding.evidence.line ? `:${finding.evidence.line}` : ""}`,
        );
      }
    }
    return 0;
  } catch (error) {
    console.error(`audit: ${String(error)}`);
    return 2;
  }
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
  console.log(
    `  chains           ${s.chains}  (resolved ${s.resolved}, released with failures ${s.releasedWithFailures})`,
  );
  console.log(`  cap-hit rate     ${(s.capHitRate * 100).toFixed(1)}%  <- high means gates too strict`);
  console.log(`  forced retries   ${s.continuations}`);
  const releases = Object.entries(s.releasedByReason).sort((a, b) => b[1] - a[1]);
  for (const [reason, count] of releases) {
    console.log(`  released         ${String(count).padStart(5)}  ${reason}`);
  }
  console.log(`  inline flags     ${s.inlineFlags}  <- caught early, no retry needed`);
  console.log(`  low: no git runs ${s.no_git_runs}`);

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


/** @param {string[]} argv */
function advisor(argv) {
  if (argv[0] !== "install") {
    console.error(`advisor: unknown subcommand "${argv[0] ?? ""}"`);
    console.error("usage: gate-cli.js advisor install");
    return 2;
  }
  if (argv.length !== 1) {
    console.error("advisor install: unexpected arguments");
    return 2;
  }
  try {
    const file = installadvisor();
    console.log(`advisor install: installed terra at ${file}`);
    console.log("start a new omp session to activate terra");
    return 0;
  } catch (error) {
    console.error(
      `advisor install: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 2;
  }
}

const [, , command, ...rest] = process.argv;
const args = parseArgs(rest);

let code = 0;
if (command === "advisor") {
  code = advisor(rest);
} else if (command === "cutover") {
  code = cutover(args);
} else if (command === "audit") {
  code = audit(args);
} else if (command === "stats") {
  code = stats(args);
} else {
  console.log("usage: gate-cli.js <advisor|audit|cutover|stats> [options]");
  console.log("  advisor install");
  console.log("  audit   [--kind uncommitted|request|base|commit] [--base <ref>]");
  console.log("          [--commit <ref>] [--folder <path>] [--cwd <dir>] [--json]");
  console.log("  cutover [--base <ref>] [--cwd <dir>] [--markers <file>]");
  console.log("  stats   [--json] [--ledger <path>]");
  code = command ? 2 : 0;
}
process.exit(code);
