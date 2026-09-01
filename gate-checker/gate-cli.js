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
 *       satisfy them even given every retry. also counts `clean_under_errors`
 *       ledger events and summarizes the frustration scratchpad
 *       (OMP_GATE_FRUSTRATIONS) by type and by source: agent, auto, or legacy
 *       when no source is stored.
 */

import { execFileSync } from "child_process";
import { existsSync, readFileSync } from "node:fs";
import {
  DEFAULT_FORBIDDEN_MARKERS,
  loadForbiddenMarkers,
  checkAddedLines,
} from "./predicates.js";
import {
  append as appendledger,
  read,
  summarize,
  LEDGER_PATH,
} from "./ledger.js";
import { FRUSTRATION_PATH, readRecords } from "./frustrations.js";
import { resolvescope } from "./scope.js";
import { auditscope } from "./risks.js";
import { installadvisor } from "../advisor/install.js";
import {
  formatleasestatus,
  inspectlease,
  releaselease,
  releasestalelease,
} from "./lease.js";

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
  const scratch = readRecords(FRUSTRATION_PATH);
  /** @type {Record<string, number>} */
  const bytype = Object.create(null);
  const bysource = { agent: 0, auto: 0, legacy: 0 };
  for (const r of scratch) {
    bytype[r.type] = (bytype[r.type] ?? 0) + 1;
    // a record without a source predates the source field: count it as legacy
    bysource[r.source === "agent" || r.source === "auto" ? r.source : "legacy"]++;
  }
  const cleanundererrors = records.filter((r) => r.event === "clean_under_errors").length;
  // the scratchpad outlives any one ledger, so its summary prints on both the
  // empty- and nonempty-ledger paths
  const printfrustrations = () => {
    console.log(
      `  frustrations     ${scratch.length}  (agent ${bysource.agent}, auto ${bysource.auto}, legacy ${bysource.legacy})`,
    );
    const types = Object.entries(bytype).sort((a, b) => b[1] - a[1]);
    if (types.length > 0) {
      console.log("  frustration types:");
      for (const [type, n] of types) console.log(`    ${String(n).padStart(5)}  ${type}`);
    }
  };

  if (args.json) {
    console.log(
      JSON.stringify(
        {
          ledger: path,
          records: records.length,
          ...s,
          clean_under_errors: cleanundererrors,
          frustrations: { records: scratch.length, byType: bytype, bySource: bysource },
        },
        null,
        2,
      ),
    );
    return 0;
  }

  console.log(`gate-checker ledger: ${path}`);
  console.log(`  records          ${records.length}`);
  if (records.length === 0) {
    console.log("  (no gate activity recorded yet)");
    console.log(`  clean under errors ${cleanundererrors}`);
    printfrustrations();
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
  console.log(`  clean under errors ${cleanundererrors}`);

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

  printfrustrations();
  return 0;
}


function hasarg(args, name) {
  return Object.prototype.hasOwnProperty.call(args, name);
}

function validarg(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function leasecwd(args) {
  if (hasarg(args, "cwd") && typeof args.cwd !== "string")
    throw new Error("lease: --cwd requires a path");
  return String(args.cwd ?? ".");
}

function leasefields(record) {
  return {
    path: record.path,
    token: record.token,
    repo_root: record.repo_root,
    common_dir: record.common_dir,
    owner_id: record.owner_id,
    request_id: record.request_id,
    session_id: record.session_id,
    session_file: record.session_file,
    agent_id: record.agent_id,
    tool_call_id: record.tool_call_id,
    tool_name: record.tool_name,
    target: record.target,
    fence: record.fence,
    pid: record.pid,
    acquired_at: record.acquired_at,
    heartbeat_at: record.heartbeat_at,
  };
}

function appendmanualrelease(record, mode, reason) {
  appendledger("lease_manual_release", {
    ...leasefields(record),
    mode,
    reason,
  });
}

function leaseusage() {
  console.error("usage: nikos-gates lease status [--cwd <path>] [--json]");
  console.error("       nikos-gates lease release [--cwd <path>] --stale-only");
  console.error(
    "       nikos-gates lease release [--cwd <path>] --force" +
      " --owner-id <id> --tool-call-id <id> --reason <text>",
  );
}

function leasestatus(args) {
  if (
    hasarg(args, "stale-only") ||
    hasarg(args, "force") ||
    hasarg(args, "owner-id") ||
    hasarg(args, "tool-call-id") ||
    hasarg(args, "reason") ||
    (hasarg(args, "json") && args.json !== true)
  )
    return null;
  const cwd = leasecwd(args);
  const status = inspectlease({ cwd });
  if (args.json === true) console.log(JSON.stringify(status, null, 2));
  else console.log(formatleasestatus(status, { cwd }));
  return 0;
}

function leaserelease(args) {
  const staleonly = args["stale-only"] === true;
  const force = args.force === true;
  if (
    (hasarg(args, "stale-only") && !staleonly) ||
    (hasarg(args, "force") && !force) ||
    staleonly === force
  )
    return null;
  if (hasarg(args, "json")) return null;
  if (
    staleonly &&
    (hasarg(args, "owner-id") || hasarg(args, "tool-call-id") || hasarg(args, "reason"))
  )
    return null;
  if (
    force &&
    (!validarg(args["owner-id"]) ||
      !validarg(args["tool-call-id"]) ||
      !validarg(args.reason))
  )
    return null;

  const cwd = leasecwd(args);
  const status = inspectlease({ cwd });
  if (status.status !== "held" || status.valid !== true || !status.record) {
    console.error(`lease release: ${staleonly ? "stale-only" : "force"} refused`);
    console.error(formatleasestatus(status, { cwd }));
    return 1;
  }

  const record = status.record;
  if (staleonly) {
    if (status.stale !== true) {
      console.error("lease release: stale-only refused; heartbeat is fresh");
      console.error(formatleasestatus(status, { cwd }));
      return 1;
    }
    if (!releasestalelease(record, { cwd })) {
      console.error("lease release: stale-only refused; holder changed");
      console.error(formatleasestatus(inspectlease({ cwd }), { cwd }));
      return 1;
    }
    appendmanualrelease(record, "stale-only", "stale heartbeat");
    console.log("lease release: released stale lease");
    return 0;
  }

  if (record.owner_id !== args["owner-id"] || record.tool_call_id !== args["tool-call-id"]) {
    console.error("lease release: force refused; identity mismatch");
    console.error(formatleasestatus(status, { cwd }));
    return 1;
  }
  const reason = args.reason.trim();
  if (!releaselease(record, { cwd })) {
    console.error("lease release: force refused; holder changed");
    console.error(formatleasestatus(inspectlease({ cwd }), { cwd }));
    return 1;
  }
  appendmanualrelease(record, "force", reason);
  console.log("lease release: released lease");
  return 0;
}

/** @param {string[]} argv */
function lease(argv) {
  const subcommand = argv[0];
  const args = parseArgs(argv.slice(1));
  try {
    if (subcommand === "status") {
      const result = leasestatus(args);
      if (result !== null) return result;
    } else if (subcommand === "release") {
      const result = leaserelease(args);
      if (result !== null) return result;
    }
  } catch (error) {
    console.error(`lease ${subcommand ?? ""}: ${String(error)}`);
    return 2;
  }
  leaseusage();
  return 2;
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
} else if (command === "lease") {
  code = lease(rest);
} else {
  console.log("usage: gate-cli.js <advisor|audit|cutover|stats|lease> [options]");
  console.log("  advisor install");
  console.log("  audit   [--kind uncommitted|request|base|commit] [--base <ref>]");
  console.log("          [--commit <ref>] [--folder <path>] [--cwd <dir>] [--json]");
  console.log("  cutover [--base <ref>] [--cwd <dir>] [--markers <file>]");
  console.log("  stats   [--json] [--ledger <path>]");
  console.log("  lease   status [--cwd <path>] [--json]");
  console.log("          release [--cwd <path>] --stale-only");
  console.log(
    "          release [--cwd <path>] --force --owner-id <id>" +
      " --tool-call-id <id> --reason <text>",
  );
  code = command ? 2 : 0;
}
process.exit(code);
