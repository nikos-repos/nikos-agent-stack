/**
 * @module gate-checker/config
 * @description The engagement dial. One place decides how hard every gate bites,
 *              so a level change cannot leave one rule out of step with the rest.
 *
 * Set it with `/gates-engage low|medium|high`, clear it with `/gates-disable`.
 *
 * Why a dial exists at all: the gates were built assuming a git repo and a
 * commit at the end of every unit of work. A lot of real work is neither —
 * exploratory sessions, edits outside any repo, one-off scripts. Forcing a
 * commit there is not enforcement, it is an obstacle, and an agent that cannot
 * satisfy a gate burns retries until the cap.
 *
 * Two things are NOT on the dial and never will be: the no-progress abort and
 * the continuation cap. Those exist to stop runaway loops, and a level that
 * disabled them would re-create the failure the dial is meant to prevent.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve as resolvePath, dirname } from "path";
import { homedir } from "os";

/** @typedef {"off" | "low" | "medium" | "high"} GateLevel */
/** @typedef {"off" | "warn" | "block" | "auto"} RuleMode */

/** @type {GateLevel[]} */
export const LEVELS = ["off", "low", "medium", "high"];

/** @type {GateLevel} */
export const DEFAULT_LEVEL = "medium";

export const CONFIG_PATH =
  process.env.OMP_GATE_CONFIG ||
  resolvePath(homedir(), ".omp/gate-checker/config.json");

/**
 * @typedef {object} GatePolicy
 * @property {GateLevel} level
 * @property {boolean}  enabled       Any gate at all.
 * @property {boolean}  inline        Flag a marker at tool_result, while the agent is still in the file.
 * @property {RuleMode} completion    Forbidden markers in ADDED lines.
 * @property {RuleMode} citation      Parent claims about files and test results.
 * @property {RuleMode} snapshot      Snapshot-tag references.
 * @property {RuleMode} manifest      Subagent manifest. "auto" keeps the diff-derived severity.
 * @property {RuleMode} subagentClaim Subagent claims checked against the diff.
 * @property {RuleMode} verify        Test command must pass. Needs a configured command.
 * @property {RuleMode} commit        Working tree must be committed. Needs git.
 * @property {RuleMode} runtime       Gate integrity itself: lease conflict, journal recovery, unreadable scope.
 */

/**
 * The dial.
 *
 * low    — intentionally loose. Nothing blocks. Findings are surfaced and
 *          recorded so the ledger still learns, but the agent is never stopped.
 *          For non-git work, exploration, and anything outside a project.
 *
 * medium — the default, and the right setting for most coding work. Real
 *          defects block: an unimplemented stub in a line you just added, a
 *          claim the diff denies, a failing test suite. Commit discipline stays
 *          OFF, because forcing a commit at the end of every turn is the single
 *          most disruptive rule and it is wrong outside a repo.
 *
 * high   — elevated security requirements. Everything blocks, including the
 *          commit gate and the subagent manifest regardless of corroboration.
 *          Use it when the work must be attributable and checkpointed.
 *
 * @param {GateLevel} level
 * @returns {GatePolicy}
 */
export function policyFor(level) {
  switch (level) {
    case "off":
      return {
        level, enabled: false, inline: false,
        completion: "off", citation: "off", snapshot: "off",
        manifest: "off", subagentClaim: "off", verify: "off", commit: "off",
        runtime: "off",
      };
    case "low":
      return {
        level, enabled: true, inline: true,
        completion: "warn", citation: "warn", snapshot: "off",
        manifest: "off", subagentClaim: "warn", verify: "warn", commit: "off",
        runtime: "warn",
      };
    case "high":
      return {
        level, enabled: true, inline: true,
        completion: "block", citation: "block", snapshot: "block",
        manifest: "block", subagentClaim: "block", verify: "block", commit: "block",
        runtime: "block",
      };
    case "medium":
    default:
      return {
        level: "medium", enabled: true, inline: true,
        completion: "block", citation: "block", snapshot: "warn",
        manifest: "auto", subagentClaim: "block", verify: "block", commit: "off",
        runtime: "block",
      };
  }
}

/** Which policy field governs a rule. @type {Record<string, keyof GatePolicy>} */
export const RULE_FAMILY = {
  forbidden_marker: "completion",
  fabricated_modification: "citation",
  fabricated_test_result: "citation",
  ungrounded_snapshot_tag: "snapshot",
  subagent_missing_manifest: "manifest",
  subagent_manifest_mismatch: "subagentClaim",
  subagent_fabricated_modification: "subagentClaim",
  subagent_unverified_test: "subagentClaim",
  verify_failed: "verify",
  uncommitted_changes: "commit",
  mutation_lease_conflict: "runtime",
  recovery_required: "runtime",
  scope_unavailable: "runtime",
};

/**
 * Reads the persisted level.
 *
 * Precedence: config file (written by /gates-engage) > OMP_GATES_LEVEL >
 * legacy OMP_DELIVERY_GATES (which armed verify + commit, so it maps to high)
 * > medium.
 *
 * @param {Record<string, string | undefined>} [env]
 * @param {string} [configPath]
 * @returns {{ level: GateLevel, verifyCmd: string | null, source: string }}
 */
export function loadConfig(env = process.env, configPath = CONFIG_PATH) {
  const cmdFromEnv = String(env.OMP_VERIFY_CMD ?? "").trim() || null;

  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8"));
      const level = LEVELS.includes(raw?.level) ? raw.level : DEFAULT_LEVEL;
      const verifyCmd =
        typeof raw?.verifyCmd === "string" && raw.verifyCmd.trim()
          ? raw.verifyCmd.trim()
          : cmdFromEnv;
      return { level, verifyCmd, source: "config" };
    } catch {
      // a corrupt config must not disarm the gates silently
    }
  }

  const envLevel = String(env.OMP_GATES_LEVEL ?? "").trim().toLowerCase();
  if (LEVELS.includes(/** @type {GateLevel} */ (envLevel))) {
    return { level: /** @type {GateLevel} */ (envLevel), verifyCmd: cmdFromEnv, source: "OMP_GATES_LEVEL" };
  }

  const legacy = String(env.OMP_DELIVERY_GATES ?? "").trim().toLowerCase();
  if (legacy && legacy !== "0" && legacy !== "false" && legacy !== "off") {
    return { level: "high", verifyCmd: cmdFromEnv, source: "OMP_DELIVERY_GATES" };
  }

  return { level: DEFAULT_LEVEL, verifyCmd: cmdFromEnv, source: "default" };
}

/**
 * @param {GateLevel} level
 * @param {string | null} [verifyCmd]
 * @param {string} [configPath]
 * @returns {{ ok: boolean, error?: string }}
 */
export function saveConfig(level, verifyCmd, configPath = CONFIG_PATH) {
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    /** @type {Record<string, unknown>} */
    const body = { level };
    if (verifyCmd) body.verifyCmd = verifyCmd;
    writeFileSync(configPath, JSON.stringify(body, null, 2) + "\n", "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * Human-readable summary of what a level actually does. Shown by the commands,
 * so the dial is never a number whose meaning you have to remember.
 *
 * @param {GateLevel} level
 * @param {string | null} verifyCmd
 * @returns {string}
 */
export function describeLevel(level, verifyCmd) {
  const p = policyFor(level);
  if (!p.enabled) {
    return [
      "gates: OFF",
      "  nothing is checked and nothing is recorded.",
      "  re-enable with /gates-engage medium",
    ].join("\n");
  }
  const mark = (mode) => (mode === "block" ? "blocks" : mode === "warn" ? "warns" : mode === "auto" ? "warns or blocks by diff" : "off");
  const lines = [
    `gates: ${level.toUpperCase()}`,
    `  stubs / TODOs in added lines    ${mark(p.completion)}`,
    `  claims not matching the diff    ${mark(p.citation)}`,
    `  subagent manifest               ${mark(p.manifest)}`,
    `  subagent claims vs diff         ${mark(p.subagentClaim)}`,
    `  snapshot tag references         ${mark(p.snapshot)}`,
    `  test suite must pass            ${verifyCmd ? mark(p.verify) : "off (no verify command set)"}`,
    `  work must be committed          ${mark(p.commit)}`,
    `  gate integrity failures         ${mark(p.runtime)}`,
    "  runaway protection              always on (stalemate abort + cap 3)",
  ];
  if (level === "high" && !verifyCmd) {
    lines.push("", "  note: high expects a verify command. set one with:");
    lines.push("        /gates-engage high <test command>");
  }
  return lines.join("\n");
}
