/**
 * @module delivery-gates
 * @description composable delivery-contract gate tasks for babysitter processes.
 *              each gate is a standalone defineTask that any process can import
 *              and dispatch with ctx.task(). gates use shell commands with
 *              expectedExitCode: 0 — the babysitter runtime blocks the phase
 *              transition until the gate passes.
 *
 * pattern follows library/processes/shared/deterministic-quality-gate.js:
 * standalone tasks + a convenience sequence function.
 *
 * usage:
 *   import {
 *     understandGate, changesGate, verifyGate,
 *     commitGate, artifactsGate, cutoverGate,
 *   } from './gates.js';
 *
 *   await ctx.task(understandGate, { files: ['src/a.ts'], cwd: '.' });
 *   await ctx.task(changesGate, { cwd: '.' });
 *   await ctx.task(verifyGate, { testCommand: 'npm test', cwd: '.' });
 *   await ctx.task(commitGate, { cwd: '.' });
 *   await ctx.task(artifactsGate, { artifacts: ['src/a.ts'], cwd: '.' });
 *   await ctx.task(cutoverGate, { cwd: '.' });
 */

import { defineTask } from "@a5c-ai/babysitter-sdk";
import { fileURLToPath } from "url";
import { dirname, resolve as resolvePath } from "path";
import { COMMIT_CLEAN_CMD } from "./predicates.js";

// The marker list and the added-line logic used to be duplicated here — a
// second copy in a second language that drifted from index.ts. Both now route
// through predicates.js; the shell gates reach it via gate-cli.js so there is
// exactly one implementation of every predicate in the stack.
const HERE = dirname(fileURLToPath(import.meta.url));
const GATE_CLI = resolvePath(HERE, "gate-cli.js");

function shellEscape(str) {
  return str.replace(/'/g, "'\\''");
}

// ── gate 1: understand — planned files exist on disk ────────────────────────

// A planned file is valid if it exists OR its parent directory does — a task
// that CREATES a file names a path that is not on disk yet. Requiring `test -f`
// on every planned file aborted every new-file task at phase 1 before any work
// began. The directory check still catches typo'd paths.
export const understandGate = defineTask(
  "delivery-gate.understand",
  (args) => ({
    kind: "shell",
    title: "Understand gate: planned paths are reachable",
    command:
      (args.files || [])
        .map((f) => {
          const e = shellEscape(f);
          return `{ test -f '${e}' || test -d "$(dirname '${e}')"; }`;
        })
        .join(" && ") || "true",
    expectedExitCode: 0,
    cwd: args.cwd || ".",
  }),
);

// ── gate 2: changes — git diff is non-empty ─────────────────────────────────

export const changesGate = defineTask(
  "delivery-gate.changes",
  (args = {}) => ({
    kind: "shell",
    title: "Changes gate: files actually modified",
    command:
      'changed=$(git diff --name-only --diff-filter=ACMR 2>/dev/null; git diff --cached --name-only --diff-filter=ACMR 2>/dev/null); [ -n "$changed" ]',
    expectedExitCode: 0,
    // without this the gate silently ran in the default directory, so a
    // caller-supplied cwd was ignored and the wrong repo was inspected.
    cwd: args.cwd || ".",
  }),
);

// ── gate 3: verify — test command passes ────────────────────────────────────

export const verifyGate = defineTask(
  "delivery-gate.verify",
  (args) => ({
    kind: "shell",
    title: `Verify gate: ${args.testCommand || "npm test"}`,
    command: args.testCommand || "npm test",
    expectedExitCode: 0,
    cwd: args.cwd || ".",
  }),
);

// ── gate 4: commit — working tree clean (all changes committed) ─────────────
// enforces the atomic-commit pattern: one logical change = one commit.
// the agent must commit before this gate passes. uses --no-push semantics:
// the gate checks checkpoint existence, not publication.

// `--untracked-files=no`: an untracked build artifact, log, or scratch file is
// not an uncommitted *change*, but it made this gate unpassable — the agent
// could not proceed without deleting or committing unrelated files.
export const commitGate = defineTask(
  "delivery-gate.commit",
  (args) => ({
    kind: "shell",
    title: "Commit gate: no uncommitted tracked changes",
    command: `[ -z "$(${COMMIT_CLEAN_CMD})" ]`,
    expectedExitCode: 0,
    cwd: args.cwd || ".",
  }),
);

// ── gate 5: artifacts — declared must_have artifacts exist ──────────────────
// optional gate: fires only when mustHaves.artifacts is provided.
// implements the goal-backward verification pattern from workflow-coordination.

export const artifactsGate = defineTask(
  "delivery-gate.artifacts",
  (args) => ({
    kind: "shell",
    title: `Artifacts gate: ${(args.artifacts || []).length} declared files exist`,
    command:
      (args.artifacts || [])
        .map((f) => `test -f '${shellEscape(f)}'`)
        .join(" && ") || "true",
    expectedExitCode: 0,
    cwd: args.cwd || ".",
  }),
);

// ── gate 6: cutover — no forbidden markers in changed files ─────────────────

// This gate previously inspected `git diff` (the working tree) but runs AFTER
// commitGate, which requires a clean tree — so it always saw zero changed files
// and passed unconditionally. It was dead code: Layer 2 had no working
// completion check at all.
//
// It now delegates to gate-cli.js, which diffs against `baseRef` (the state
// before this unit of work) and scans only ADDED lines through the same
// checkAddedLines() that Layer 1 uses — so a pre-existing marker on an
// untouched line cannot block the phase, and the two layers cannot disagree.
export const cutoverGate = defineTask(
  "delivery-gate.cutover",
  (args) => {
    const cwd = args.cwd || ".";
    const parts = [
      `bun run '${shellEscape(GATE_CLI)}' cutover`,
      `--cwd '${shellEscape(cwd)}'`,
      `--base '${shellEscape(args.baseRef || "HEAD~1")}'`,
    ];
    if (args.markersFile) {
      parts.push(`--markers '${shellEscape(args.markersFile)}'`);
    }
    return {
      kind: "shell",
      title: "Cutover gate: no forbidden markers in added lines",
      command: parts.join(" "),
      expectedExitCode: 0,
      cwd,
    };
  },
);

// ── convenience: run all gates in sequence ──────────────────────────────────

/**
 * @typedef {object} DeliveryGateConfig
 * @property {string[]} files          - Files the change should touch.
 * @property {string}   [testCommand]  - Test runner command (default: "npm test").
 * @property {string}   [cwd]          - Working directory (default: ".").
 * @property {string}   [markersFile]  - Extra forbidden markers, one per line.
 *                                       Defaults to `<cwd>/.omp/gates-markers.txt`
 *                                       when present — the same file Layer 1 reads,
 *                                       so both layers share one marker list.
 * @property {string[]} [artifacts]    - Declared must-have artifacts (optional).
 * @property {number}   [maxRetries]   - Verify retries before failing (default: 3).
 * @property {string}   [baseRef]      - Git ref marking the state before this
 *                                       unit of work (default: "HEAD~1"). The
 *                                       cutover gate scans lines added since it.
 */

/**
 * Runs the full delivery-contract gate sequence. throws on the first gate
 * that fails (babysitter runtime surfaces the shell error).
 *
 * gate order: understand → changes → verify → commit → artifacts → cutover
 *
 * @param {import('@a5c-ai/babysitter-sdk').TaskContext} ctx
 * @param {DeliveryGateConfig} config
 * @returns {Promise<{ phase: string }>}
 */
export async function runDeliveryGates(ctx, config) {
  const {
    files = [],
    testCommand = "npm test",
    cwd = ".",
    markersFile,
    artifacts,
    maxRetries = 3,
    baseRef,
  } = config;

  await ctx.task(understandGate, { files, cwd });
  await ctx.task(changesGate, { cwd });

  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await ctx.task(verifyGate, { testCommand, cwd });
      lastError = null;
      break;
    } catch (err) {
      lastError = err;
      if (attempt === maxRetries - 1) throw err;
    }
  }

  await ctx.task(commitGate, { cwd });

  if (artifacts && artifacts.length > 0) {
    await ctx.task(artifactsGate, { artifacts, cwd });
  }

  await ctx.task(cutoverGate, { cwd, markersFile, baseRef });

  return { phase: "delivered" };
}
