import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve as resolvePath } from "node:path";
import { isText, parseJsonObject } from "./predicates.js";

export const LEVELS = ["off", "low", "medium", "high"];
export const DEFAULT_LEVEL = "medium";
export const CONFIG_PATH = process.env.OMP_GATE_CONFIG ||
  resolvePath(homedir(), ".omp/gate-checker/config.json");

/** @typedef {"off" | "warn" | "block" | "auto"} Mode */
/**
 * @typedef {{ enabled: boolean, inline: boolean, completion: Mode, citation: Mode, snapshot: Mode, manifest: Mode,
 *   subagentClaim: Mode, verify: Mode, complexity: Mode, commit: Mode, runtime: Mode }} LevelPolicy
 */
/** @type {Record<string, LevelPolicy>} */
const policy_table = {
  off: {
    enabled: false, inline: false,
    completion: "off", citation: "off", snapshot: "off", manifest: "off",
    subagentClaim: "off", verify: "off", complexity: "off", commit: "off", runtime: "off",
  },
  low: {
    enabled: true, inline: true,
    completion: "warn", citation: "warn", snapshot: "off", manifest: "off",
    subagentClaim: "warn", verify: "warn", complexity: "warn", commit: "off", runtime: "warn",
  },
  medium: {
    enabled: true, inline: true,
    completion: "block", citation: "block", snapshot: "warn", manifest: "auto",
    subagentClaim: "block", verify: "block", complexity: "warn", commit: "off", runtime: "block",
  },
  high: {
    enabled: true, inline: true,
    completion: "block", citation: "block", snapshot: "block", manifest: "block",
    subagentClaim: "block", verify: "block", complexity: "warn", commit: "block", runtime: "block",
  },
};

export function policyFor(level) {
  const selected = LEVELS.includes(level) ? level : DEFAULT_LEVEL;
  return { level: selected, ...policy_table[selected] };
}

/** @type {Record<string, "completion" | "citation" | "snapshot" | "manifest" | "subagentClaim" | "verify" | "complexity" | "commit" | "runtime">} */
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
  "no-absolute-home-path": "completion",
  missing_interrogation: "completion",
};

function environmentCommand(env, key) {
  const value = String(env[key] ?? "").trim();
  return value || null;
}

export function loadConfig(env = process.env, configPath = CONFIG_PATH) {
  const verifyFromEnv = environmentCommand(env, "OMP_VERIFY_CMD");
  const complexityFromEnv = environmentCommand(env, "OMP_COMPLEXITY_CMD");
  if (existsSync(configPath)) {
    try {
      const raw = parseJsonObject(readFileSync(configPath, "utf8"));
      if (raw) {
        const level = LEVELS.includes(raw.level) ? raw.level : DEFAULT_LEVEL;
        const verifyCmd = isText(raw.verifyCmd) && raw.verifyCmd.trim()
          ? raw.verifyCmd.trim() : verifyFromEnv;
        const complexityCmd = isText(raw.complexityCmd) && raw.complexityCmd.trim()
          ? raw.complexityCmd.trim() : complexityFromEnv;
        return { level, verifyCmd, complexityCmd, source: "config" };
      }
    } catch {}
  }
  const envLevel = String(env.OMP_GATES_LEVEL ?? "").trim().toLowerCase();
  if (LEVELS.includes(envLevel))
    return { level: envLevel, verifyCmd: verifyFromEnv, complexityCmd: complexityFromEnv, source: "OMP_GATES_LEVEL" };
  const legacy = String(env.OMP_DELIVERY_GATES ?? "").trim().toLowerCase();
  if (legacy && !["0", "false", "off"].includes(legacy))
    return { level: "high", verifyCmd: verifyFromEnv, complexityCmd: complexityFromEnv, source: "OMP_DELIVERY_GATES" };
  return { level: DEFAULT_LEVEL, verifyCmd: verifyFromEnv, complexityCmd: complexityFromEnv, source: "default" };
}

export function saveConfig(level, verifyCmd, complexityCmd, configPath = CONFIG_PATH) {
  try {
    mkdirSync(dirname(configPath), { recursive: true });
    const body = { level };
    if (isText(verifyCmd) && verifyCmd) body.verifyCmd = verifyCmd;
    if (isText(complexityCmd) && complexityCmd) body.complexityCmd = complexityCmd;
    writeFileSync(configPath, `${JSON.stringify(body, null, 2)}\n`, "utf8");
    return { ok: true };
  } catch (error) {
    return { ok: false, error: String(error) };
  }
}

function modeText(mode) {
  return mode === "block" ? "blocks" : mode === "warn" ? "warns" :
    mode === "auto" ? "warns or blocks by diff" : "off";
}

export function describeLevel(level, verifyCmd, complexityCmd) {
  const policy = policyFor(level);
  if (!policy.enabled)
    return ["gates: OFF", "  nothing is checked; the request journal still opens and closes each request.",
      "  re-enable with /gates-engage medium"].join("\n");
  const lines = [
    `gates: ${level.toUpperCase()}`,
    `  stubs / TODOs in added lines    ${modeText(policy.completion)}`,
    `  claims not matching the diff    ${modeText(policy.citation)}`,
    `  subagent manifest               ${modeText(policy.manifest)}`,
    `  subagent claims vs diff         ${modeText(policy.subagentClaim)}`,
    `  snapshot tag references         ${modeText(policy.snapshot)}`,
    `  test suite must pass            ${verifyCmd ? modeText(policy.verify)
      : policy.verify === "block" ? "blocks without an observed passing test run (no verify command set)"
      : "off (no verify command set)"}`,
    `  complexity linter               ${complexityCmd ? `warn (${complexityCmd})` : "unmeasured (no complexity command set)"}`,
    `  work must be committed          ${modeText(policy.commit)}`,
    `  gate integrity failures         ${modeText(policy.runtime)}`,
    "  runaway protection              always on (stalemate abort + cap 3)",
  ];
  return lines.join("\n");
}
