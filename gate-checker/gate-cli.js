#!/usr/bin/env bun
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { loadForbiddenMarkers, checkAddedLines, isText } from "./predicates.js";
import { append as appendledger, read, summarize, LEDGER_PATH } from "./ledger.js";
import { FRUSTRATION_PATH, readRecords } from "./frustrations.js";
import { resolvescope } from "./scope.js";
import { auditscope } from "./risks.js";
import { installadvisor } from "../advisor/install.js";
import { formatleasestatus, inspectlease, releaselease, releasestalelease } from "./lease.js";

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) { out[key] = next; i++; }
    else out[key] = true;
  }
  return out;
}
function git(command, cwd) {
  try { return execFileSync("git", command, { cwd, encoding: "utf8", timeout: 10_000, maxBuffer: 64 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] }); }
  catch { return ""; }
}
function cutover(args) {
  const cwd = String(args.cwd ?? ".");
  let base = String(args.base ?? "HEAD~1");
  if (!git(["rev-parse", "--verify", `${base}^{commit}`], cwd).trim()) base = git(["rev-list", "--max-parents=0", "HEAD"], cwd).trim().split("\n")[0];
  if (!base) { console.error("cutover gate: no git baseline is available"); return 2; }
  let scope;
  try { scope = resolvescope({ kind: "request", cwd, baseline_sha: base, baseline_dirty: new Set() }); }
  catch (error) { console.error(`cutover gate: ${String(error)}`); return 2; }
  const markerPath = isText(args.markers) && existsSync(args.markers) ? args.markers : null;
  const failures = checkAddedLines(new Map(Object.entries(scope.added)), loadForbiddenMarkers(cwd, markerPath));
  if (!failures.length) { console.log("cutover gate: clean (no forbidden markers in added lines)"); return 0; }
  console.log(`cutover gate: ${failures.length} forbidden marker(s) added`);
  for (const failure of failures) console.log(`  ${failure.detail}`);
  return 1;
}
function audit(args) {
  const cwd = String(args.cwd ?? ".");
  const kind = String(args.kind ?? "uncommitted");
  const options = { kind, cwd };
  if (isText(args.folder)) options.folder = args.folder;
  if (kind === "request" || kind === "base") {
    if (!isText(args.base)) { console.error(`audit: ${kind} scope requires --base <ref>`); return 2; }
    if (kind === "request") { options.baseline_sha = args.base; options.baseline_dirty = new Set(); }
    else options.base_ref = args.base;
  } else if (kind === "commit") {
    if (!isText(args.commit)) { console.error("audit: commit scope requires --commit <ref>"); return 2; }
    options.commit_ref = args.commit;
  } else if (kind !== "uncommitted") {
    console.error(`audit: unknown scope kind "${kind}"`); return 2;
  }
  try {
    const scope = resolvescope(options);
    const risk = auditscope(scope);
    const output = { ...scope, risk_outcome: risk.outcome, risks: risk.findings };
    if (args.json) console.log(JSON.stringify(output, null, 2));
    else {
      console.log(`gate audit: ${scope.kind} (${scope.files.length} files)`);
      console.log(`  digest  ${scope.digest}`);
      for (const file of scope.files) console.log(`  ${file.type.padEnd(12)} ${file.path}`);
      for (const finding of risk.findings)
        console.log(`  advisory     ${finding.id} ${finding.evidence.path}${finding.evidence.line ? `:${finding.evidence.line}` : ""}`);
    }
    return 0;
  } catch (error) { console.error(`audit: ${String(error)}`); return 2; }
}
function stats(args) {
  const path = isText(args.ledger) ? args.ledger : LEDGER_PATH;
  const records = read(path);
  const summary = summarize(records);
  const scratch = readRecords(FRUSTRATION_PATH);
  const bytype = Object.create(null);
  const bysource = { agent: 0, auto: 0, legacy: 0 };
  for (const record of scratch) {
    bytype[record.type] = (bytype[record.type] || 0) + 1;
    const source = record.source === "agent" || record.source === "auto" ? record.source : "legacy";
    bysource[source]++;
  }
  const cleanundererrors = records.filter((record) => record.event === "clean_under_errors").length;
  const printfrustrations = () => {
    console.log(`  frustrations     ${scratch.length}  (agent ${bysource.agent}, auto ${bysource.auto}, legacy ${bysource.legacy})`);
    const types = Object.entries(bytype).sort((left, right) => right[1] - left[1]);
    if (types.length) {
      console.log("  frustration types:");
      for (const [type, count] of types) console.log(`    ${String(count).padStart(5)}  ${type}`);
    }
  };
  if (args.json) {
    console.log(JSON.stringify({ ledger: path, records: records.length, ...summary, clean_under_errors: cleanundererrors,
      frustrations: { records: scratch.length, byType: bytype, bySource: bysource } }, null, 2));
    return 0;
  }
  console.log(`gate-checker ledger: ${path}`);
  console.log(`  records          ${records.length}`);
  if (!records.length) {
    console.log("  (no gate activity recorded yet)");
    console.log(`  clean under errors ${cleanundererrors}`);
    printfrustrations();
    return 0;
  }
  console.log(`  chains           ${summary.chains}  (resolved ${summary.resolved}, released with failures ${summary.releasedWithFailures})`);
  console.log(`  cap-hit rate     ${(summary.capHitRate * 100).toFixed(1)}%  <- high means gates too strict`);
  console.log(`  forced retries   ${summary.continuations}`);
  for (const [reason, count] of Object.entries(summary.releasedByReason).sort((left, right) => right[1] - left[1])) console.log(`  released         ${String(count).padStart(5)}  ${reason}`);
  console.log(`  inline flags     ${summary.inlineFlags}  <- caught early, no retry needed`);
  console.log(`  low: no git runs ${summary.no_git_runs}`);
  console.log(`  clean under errors ${cleanundererrors}`);
  if (summary.shapeRequests > 0) {
    console.log(`  process-shaped  ${summary.shapeMatched}/${summary.shapeRequests} requests  (${(summary.shapeMatchRate * 100).toFixed(1)}%)  <- "a process should have run"`);
    const misses = Object.entries(summary.shapeMissBy).sort((left, right) => right[1] - left[1]);
    if (misses.length) {
      console.log("  not process-shaped because:");
      for (const [reason, count] of misses) console.log(`    ${String(count).padStart(5)}  ${reason}`);
    }
  }
  for (const [title, values] of [["fires by rule:", summary.byRule], ["inline flags by rule:", summary.inlineByRule]]) {
    const entries = Object.entries(values).sort((left, right) => right[1] - left[1]);
    if (!entries.length) continue;
    console.log(`  ${title}`);
    for (const [rule, count] of entries) console.log(`    ${String(count).padStart(5)}  ${rule}`);
  }
  printfrustrations();
  return 0;
}
function hasarg(args, name) { return Object.prototype.hasOwnProperty.call(args, name); }
const validarg = (value) => isText(value) && value.trim().length > 0;
function leasecwd(args) {
  if (hasarg(args, "cwd") && !isText(args.cwd)) throw new Error("lease: --cwd requires a path");
  return String(args.cwd ?? ".");
}
function leasefields(record) {
  return { path: record.path, token: record.token, repo_root: record.repo_root, common_dir: record.common_dir, owner_id: record.owner_id, request_id: record.request_id, session_id: record.session_id, session_file: record.session_file, agent_id: record.agent_id, tool_call_id: record.tool_call_id, tool_name: record.tool_name, target: record.target, fence: record.fence, pid: record.pid, acquired_at: record.acquired_at, heartbeat_at: record.heartbeat_at };
}
function appendmanualrelease(record, mode, reason) { appendledger("lease_manual_release", { ...leasefields(record), mode, reason }); }
function leaseusage() {
  console.error("usage: nikos-gates lease status [--cwd <path>] [--json]");
  console.error("       nikos-gates lease release [--cwd <path>] --stale-only");
  console.error("       nikos-gates lease release [--cwd <path>] --force --owner-id <id> --tool-call-id <id> --reason <text>");
}
function leasestatus(args) {
  if (hasarg(args, "stale-only") || hasarg(args, "force") || hasarg(args, "owner-id") || hasarg(args, "tool-call-id") || hasarg(args, "reason") || (hasarg(args, "json") && args.json !== true)) return null;
  const cwd = leasecwd(args);
  const status = inspectlease({ cwd });
  if (args.json === true) console.log(JSON.stringify(status, null, 2)); else console.log(formatleasestatus(status, { cwd }));
  return 0;
}
function leaserelease(args) {
  const staleonly = args["stale-only"] === true;
  const force = args.force === true;
  if ((hasarg(args, "stale-only") && !staleonly) || (hasarg(args, "force") && !force) || staleonly === force || hasarg(args, "json")) return null;
  if (staleonly && (hasarg(args, "owner-id") || hasarg(args, "tool-call-id") || hasarg(args, "reason"))) return null;
  if (force && (!validarg(args["owner-id"]) || !validarg(args["tool-call-id"]) || !validarg(args.reason))) return null;
  const cwd = leasecwd(args);
  const status = inspectlease({ cwd });
  if (status.status !== "held" || status.valid !== true || !status.record) {
    console.error(`lease release: ${staleonly ? "stale-only" : "force"} refused`);
    console.error(formatleasestatus(status, { cwd }));
    return 1;
  }
  const record = status.record;
  if (staleonly) {
    if (status.stale !== true) { console.error("lease release: stale-only refused; heartbeat is fresh"); console.error(formatleasestatus(status, { cwd })); return 1; }
    if (!releasestalelease(record, { cwd })) { console.error("lease release: stale-only refused; holder changed"); console.error(formatleasestatus(inspectlease({ cwd }), { cwd })); return 1; }
    appendmanualrelease(record, "stale-only", "stale heartbeat");
    console.log("lease release: released stale lease");
    return 0;
  }
  if (record.owner_id !== args["owner-id"] || record.tool_call_id !== args["tool-call-id"]) {
    console.error("lease release: force refused; identity mismatch"); console.error(formatleasestatus(status, { cwd })); return 1;
  }
  if (!releaselease(record, { cwd })) { console.error("lease release: force refused; holder changed"); console.error(formatleasestatus(inspectlease({ cwd }), { cwd })); return 1; }
  appendmanualrelease(record, "force", args.reason.trim());
  console.log("lease release: released lease");
  return 0;
}
function lease(argv) {
  const subcommand = argv[0];
  const args = parseArgs(argv.slice(1));
  try {
    if (subcommand === "status") { const result = leasestatus(args); if (result !== null) return result; }
    if (subcommand === "release") { const result = leaserelease(args); if (result !== null) return result; }
  } catch (error) { console.error(`lease ${subcommand ?? ""}: ${String(error)}`); return 2; }
  leaseusage();
  return 2;
}
function advisor(argv) {
  if (argv[0] !== "install") { console.error(`advisor: unknown subcommand "${argv[0] ?? ""}"`); console.error("usage: gate-cli.js advisor install"); return 2; }
  if (argv.length !== 1) { console.error("advisor install: unexpected arguments"); return 2; }
  try {
    const file = installadvisor();
    console.log(`advisor install: installed terra at ${file}`);
    console.log("start a new omp session to activate terra");
    return 0;
  } catch (error) { console.error(`advisor install: ${error instanceof Error ? error.message : String(error)}`); return 2; }
}
const [, , command, ...rest] = process.argv;
const args = parseArgs(rest);
let code = 0;
if (command === "advisor") code = advisor(rest);
else if (command === "cutover") code = cutover(args);
else if (command === "audit") code = audit(args);
else if (command === "stats") code = stats(args);
else if (command === "lease") code = lease(rest);
else {
  console.log("usage: gate-cli.js <advisor|audit|cutover|stats|lease> [options]");
  console.log("  advisor install");
  console.log("  audit   [--kind uncommitted|request|base|commit] [--base <ref>]");
  console.log("          [--commit <ref>] [--folder <path>] [--cwd <dir>] [--json]");
  console.log("  cutover [--base <ref>] [--cwd <dir>] [--markers <file>]");
  console.log("  stats   [--json] [--ledger <path>]");
  console.log("  lease   status [--cwd <path>] [--json]");
  console.log("          release [--cwd <path>] --stale-only");
  console.log("          release [--cwd <path>] --force --owner-id <id> --tool-call-id <id> --reason <text>");
  code = command ? 2 : 0;
}
process.exit(code);
