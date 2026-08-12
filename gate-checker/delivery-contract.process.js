/**
 * @process processes/delivery-contract
 * @description structurally enforces the delivery contract through gated phases.
 *              composes the six shared gate tasks from gates.js — any other
 *              process can import those gates directly without using this process.
 *
 * gate order: understand → changes → verify → commit → artifacts → cutover
 *
 * @inputs {
 *   task: string,
 *   files: string[],
 *   testCommand?: string,     // default: "npm test"
 *   cwd?: string,             // default: "."
 *   markersFile?: string,      // extra markers file; defaults to <cwd>/.omp/gates-markers.txt
 *   mustHaves?: {             // optional goal-backward verification
 *     artifacts?: string[]    // declared files that must exist after implementation
 *   }
 * }
 * @outputs { success: boolean, phase: string, failures?: string[] }
 * @graph
 *   domains: [domain:software-engineering]
 *   workflows: [workflow:feature-development, workflow:code-review]
 *   topics: [topic:test-driven-development, topic:code-quality]
 */

import { defineTask } from "@a5c-ai/babysitter-sdk";
import {
  understandGate,
  changesGate,
  verifyGate,
  commitGate,
  artifactsGate,
  cutoverGate,
} from "./gates.js";

// ── helper: resolve the pre-work HEAD ───────────────────────────────────────

const headRefTask = defineTask(
  "delivery-contract.head-ref",
  (args) => ({
    kind: "shell",
    title: "Resolve baseline HEAD",
    command: "git rev-parse HEAD",
    expectedExitCode: 0,
    cwd: args.cwd || ".",
  }),
);

// ── agent tasks (reasoning work) ────────────────────────────────────────────

const understandTask = defineTask(
  "delivery-contract.understand",
  async ({ task, files }, ctx) => {
    return ctx.agent({
      title: "Understand affected code",
      prompt: [
        "Read every file below. Trace the flow end-to-end.",
        "For each file, note what it does, how it connects to the others,",
        "and what the change needs to touch.",
        "",
        `Task: ${task}`,
        `Files: ${files.join(", ")}`,
        "",
        "Do NOT start implementing. Understanding only.",
        'Return JSON: { understood: boolean, notes: string }.',
      ].join("\n"),
    });
  },
  { kind: "agent", title: "Understand phase" },
);

const implementTask = defineTask(
  "delivery-contract.implement",
  async ({ task, files, notes }, ctx) => {
    return ctx.agent({
      title: "Implement the change",
      prompt: [
        "Implement the following task using edit/write tools.",
        "Make the minimal correct change. Fix at the root cause, not the symptom.",
        "Do not add abstractions, retries, or scope not requested.",
        "",
        `Task: ${task}`,
        `Files to modify: ${files.join(", ")}`,
        `Context: ${notes ?? "(no notes from understand phase)"}`,
        "",
        'Return JSON: { implemented: boolean, changedFiles: string[] }.',
      ].join("\n"),
    });
  },
  { kind: "agent", title: "Implement phase" },
);

const analyzeFailureTask = defineTask(
  "delivery-contract.analyze-failure",
  async ({ testCommand, testOutput, task }, ctx) => {
    return ctx.agent({
      title: "Analyze test failure",
      prompt: [
        "The verification gate failed. Analyze the failure and suggest a fix.",
        "Do NOT make the fix — just diagnose.",
        "",
        `Task: ${task}`,
        `Command: ${testCommand}`,
        `Output:\n${testOutput}`,
        "",
        'Return JSON: { diagnosis: string, suggestedFix: string }.',
      ].join("\n"),
    });
  },
  { kind: "agent", title: "Failure analysis" },
);

// ── process entry point ─────────────────────────────────────────────────────

export async function process(inputs, ctx) {
  const {
    task,
    files = [],
    testCommand = "npm test",
    cwd = ".",
    markersFile,
    mustHaves,
  } = inputs;

  const failures = [];
  const MAX_IMPL_RETRIES = 3;
  const MAX_VERIFY_RETRIES = 3;

  // Pin the pre-work commit so the cutover gate scans everything this process
  // added. Its "HEAD~1" default only covers the last commit, and the
  // implement/verify retry loops can produce several.
  let baseRef;
  try {
    const head = await ctx.task(headRefTask, { cwd });
    baseRef = String(head?.stdout ?? head?.output ?? "").trim() || undefined;
  } catch {
    // not a git repo, or no commits yet — cutoverGate falls back on its own
  }

  // phase 1: understand
  const understanding = await ctx.task(understandTask, { task, files });
  try {
    await ctx.task(understandGate, { files, cwd });
  } catch {
    failures.push("understand-gate: one or more planned files do not exist");
    return { success: false, phase: "understand", failures };
  }

  // phase 2: implement (with retry loop)
  let implResult;
  for (let attempt = 0; attempt < MAX_IMPL_RETRIES; attempt++) {
    implResult = await ctx.task(implementTask, {
      task,
      files,
      notes: understanding?.notes,
    });

    try {
      await ctx.task(changesGate, { cwd });
      break;
    } catch {
      if (attempt === MAX_IMPL_RETRIES - 1) {
        failures.push(
          "changes-gate: no files changed after implementation — agent did not make edits",
        );
        return { success: false, phase: "implement", failures };
      }
    }
  }

  // phase 3: verify (with retry loop)
  for (let attempt = 0; attempt < MAX_VERIFY_RETRIES; attempt++) {
    try {
      await ctx.task(verifyGate, { testCommand, cwd });
      break;
    } catch (err) {
      const testOutput = String(err?.stdout ?? err?.message ?? "");
      if (attempt === MAX_VERIFY_RETRIES - 1) {
        failures.push(
          `verify-gate: ${testCommand} failed after ${MAX_VERIFY_RETRIES} attempts`,
        );
        return { success: false, phase: "verify", failures };
      }
      await ctx.task(analyzeFailureTask, {
        testCommand,
        testOutput,
        task,
      });
      await ctx.task(implementTask, {
        task,
        files,
        notes: `Fix test failure: ${testOutput.slice(0, 500)}`,
      });
    }
  }

  // phase 4: commit — working tree must be clean (atomic commit discipline)
  try {
    await ctx.task(commitGate, { cwd });
  } catch {
    failures.push(
      "commit-gate: working tree is not clean — commit all changes before proceeding",
    );
    return { success: false, phase: "commit", failures };
  }

  // phase 5: artifacts — declared must_haves must exist (optional)
  if (mustHaves?.artifacts && mustHaves.artifacts.length > 0) {
    try {
      await ctx.task(artifactsGate, { artifacts: mustHaves.artifacts, cwd });
    } catch {
      failures.push(
        `artifacts-gate: one or more declared artifacts do not exist: ${mustHaves.artifacts.join(", ")}`,
      );
      return { success: false, phase: "artifacts", failures };
    }
  }

  // phase 6: deliver — clean cutover (no forbidden markers)
  try {
    await ctx.task(cutoverGate, { cwd, markersFile, baseRef });
  } catch {
    failures.push(
      "cutover-gate: changed files contain forbidden markers (stubs, TODOs, placeholders)",
    );
    return { success: false, phase: "deliver", failures };
  }

  return {
    success: true,
    phase: "delivered",
    changedFiles: implResult?.changedFiles ?? [],
  };
}
