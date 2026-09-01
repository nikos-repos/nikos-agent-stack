/**
 * @module gate-checker/config
 * @description the engagement dial. one place decides how hard every gate bites,
 *              so a level change cannot leave one rule out of step with the rest.
 *
 * set it with `/gates-engage low|medium|high`, clear it with `/gates-disable`.
 * configure verification with `OMP_VERIFY_CMD` or `verifyCmd`, and complexity
 * linting with `OMP_COMPLEXITY_CMD` or `complexityCmd`, in persisted config.
 *
 * why a dial exists at all: the gates were built assuming a git repo and a
 * commit at the end of every unit of work. a lot of real work is neither —
 * exploratory sessions, edits outside any repo, one-off scripts. forcing a
 * commit there is not enforcement, it is an obstacle, and an agent that cannot
 * satisfy a gate burns retries until the cap.
 *
 * two things are not on the dial and never will be: the no-progress abort and
 * the continuation cap. those exist to stop runaway loops, and a level that
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
 * @property {boolean}  enabled       any gate at all.
 * @property {boolean}  inline        flag a marker at tool_result, while the agent is still in the file.
 * @property {RuleMode} completion    forbidden markers in added lines.
 * @property {RuleMode} citation      parent claims about files and test results.
 * @property {RuleMode} snapshot      snapshot-tag references.
 * @property {RuleMode} manifest      subagent manifest. "auto" keeps the diff-derived severity.
 * @property {RuleMode} subagentClaim subagent claims checked against the diff.
 * @property {RuleMode} verify        test command must pass. needs a configured command.
 * @property {RuleMode} complexity   project's own linter; always advisory when configured.
 * @property {RuleMode} commit        working tree must be committed. needs git.
 * @property {RuleMode} scratchpad    active sessions must record frustrations.
 * @property {RuleMode} runtime       gate integrity itself: lease conflict, journal recovery, unreadable scope.

/**
 * the dial.
 *
 * low    — intentionally loose. nothing blocks. findings are surfaced and
 *          recorded so the ledger still learns, but the agent is never stopped.
 *          for non-git work, exploration, and anything outside a project.
 *
 * medium — the default, and the right setting for most coding work. real
 *          defects block: an unimplemented stub in a line you just added, a
 *          claim the diff denies, a failing test suite. commit discipline stays
 *          off, because forcing a commit at the end of every turn is the single
 *          most disruptive rule and it is wrong outside a repo.
 *
 * high   — elevated security requirements. everything blocks, including the
 *          commit gate and the subagent manifest regardless of corroboration.
 *          use it when the work must be attributable and checkpointed.
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
        manifest: "off", subagentClaim: "off", verify: "off", complexity: "off", commit: "off",
        scratchpad: "off", runtime: "off",
      };
    case "low":
      return {
        level, enabled: true, inline: true,
        completion: "warn", citation: "warn", snapshot: "off",
        manifest: "off", subagentClaim: "warn", verify: "warn", complexity: "warn", commit: "off",
        scratchpad: "block", runtime: "warn",
      };
    case "high":
      return {
        level, enabled: true, inline: true,
        completion: "block", citation: "block", snapshot: "block",
        manifest: "block", subagentClaim: "block", verify: "block", complexity: "warn", commit: "block",
        scratchpad: "block", runtime: "block",
      };
    case "medium":
    default:
      return {
        level: "medium", enabled: true, inline: true,
        completion: "block", citation: "block", snapshot: "warn",
        manifest: "auto", subagentClaim: "block", verify: "block", complexity: "warn", commit: "off",
        scratchpad: "block", runtime: "block",
      };
  }
}

/** which policy field governs a rule. @type {Record<string, keyof GatePolicy>} */
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
  no_test_run: "verify",
  complexity_failed: "complexity",
  uncommitted_changes: "commit",
  recovery_required: "runtime",
  scope_unavailable: "runtime",
  missing_frustration_record: "scratchpad",
  "no-absolute-home-path": "completion",
  missing_interrogation: "completion",
};

/**
 * reads the persisted level.
 *
 * precedence: config file (written by /gates-engage) > OMP_GATES_LEVEL >
 * legacy OMP_DELIVERY_GATES (which armed verify + commit, so it maps to high)
 * > medium.
 *
 * @param {Record<string, string | undefined>} [env]
 * @param {string} [configPath]
 * @returns {{ level: GateLevel, verifyCmd: string | null, complexityCmd: string | null, source: string }}
 */
export function loadConfig(env = process.env, configPath = CONFIG_PATH) {
  const cmdFromEnv = String(env.OMP_VERIFY_CMD ?? "").trim() || null;
  const complexityFromEnv = String(env.OMP_COMPLEXITY_CMD ?? "").trim() || null;

  if (existsSync(configPath)) {
    try {
      const raw = JSON.parse(readFileSync(configPath, "utf-8"));
      const level = LEVELS.includes(raw?.level) ? raw.level : DEFAULT_LEVEL;
      const verifyCmd =
        typeof raw?.verifyCmd === "string" && raw.verifyCmd.trim()
          ? raw.verifyCmd.trim()
          : cmdFromEnv;
      const complexityCmd =
        typeof raw?.complexityCmd === "string" && raw.complexityCmd.trim()
          ? raw.complexityCmd.trim()
          : complexityFromEnv;
      return { level, verifyCmd, complexityCmd, source: "config" };
    } catch {
      // a corrupt config must not disarm the gates silently
    }
  }

  const envLevel = String(env.OMP_GATES_LEVEL ?? "").trim().toLowerCase();
  if (LEVELS.includes(/** @type {GateLevel} */ (envLevel))) {
    return {
      level: /** @type {GateLevel} */ (envLevel),
      verifyCmd: cmdFromEnv,
      complexityCmd: complexityFromEnv,
      source: "OMP_GATES_LEVEL",
    };
  }

  const legacy = String(env.OMP_DELIVERY_GATES ?? "").trim().toLowerCase();
  if (legacy && legacy !== "0" && legacy !== "false" && legacy !== "off") {
    return {
      level: "high",
      verifyCmd: cmdFromEnv,
      complexityCmd: complexityFromEnv,
      source: "OMP_DELIVERY_GATES",
    };
  }

  return {
    level: DEFAULT_LEVEL,
    verifyCmd: cmdFromEnv,
    complexityCmd: complexityFromEnv,
    source: "default",
  };
}

/**
 * @param {GateLevel} level
 * @param {string | null} [verifyCmd]
 * @param {string | null} [complexityCmd]
 * @param {string} [configPath]
 * @returns {{ ok: boolean, error?: string }}
 */
export function saveConfig(level, verifyCmd, complexityCmd, configPath = CONFIG_PATH) {
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    /** @type {Record<string, unknown>} */
    const body = { level };
    if (verifyCmd) body.verifyCmd = verifyCmd;
    if (complexityCmd) body.complexityCmd = complexityCmd;
    writeFileSync(configPath, JSON.stringify(body, null, 2) + "\n", "utf-8");
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

/**
 * human-readable summary of what a level actually does. shown by the commands,
 * so the dial is never a number whose meaning you have to remember.
 *
 * @param {GateLevel} level
 * @param {string | null} verifyCmd
 * @param {string | null} complexityCmd
 * @returns {string}
 */
export function describeLevel(level, verifyCmd, complexityCmd) {
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
    `  complexity linter               ${complexityCmd ? `warn (${complexityCmd})` : "unmeasured (no complexity command set)"}`,
    `  work must be committed          ${mark(p.commit)}`,
    `  gate integrity failures         ${mark(p.runtime)}`,
    "  runaway protection              always on (stalemate abort + cap 3)",
  ];
  if (level === "high" && !verifyCmd) {
    lines.push("", "  note: high blocks a change with no observed passing test run when no verify command is set.");
  }
  return lines.join("\n");
}
