import { expect, test } from "bun:test";
import { reducejournal } from "./journal.js";
import { summarize } from "./ledger.js";

test("released failures remain distinct from passed gate chains", () => {
  const summary = summarize([
    { event: "chain_end", outcome: "resolved" },
    {
      event: "chain_end",
      outcome: "released_with_failures",
      release_reason: "continuation_cap",
    },
    {
      event: "chain_end",
      outcome: "released_with_failures",
      release_reason: "stalemate",
    },
  ]);

  expect(summary.chains).toBe(3);
  expect(summary.resolved).toBe(1);
  expect(summary.releasedWithFailures).toBe(2);
  expect(summary.capHits).toBe(1);
});

test("journal retains the release reason without calling it a pass", () => {
  const state = reducejournal([
    {
      version: 1,
      kind: "request_start",
      request_id: "request-3",
      repo_root: "/repo",
      baseline_sha: "abc",
      baseline_dirty: [],
      policy_fingerprint: "policy-1",
    },
    {
      version: 1,
      kind: "terminal",
      request_id: "request-3",
      outcome: "released_with_failures",
      release_reason: "stalemate",
    },
  ]);

  expect(state.outcome).toBe("released_with_failures");
  expect(state.release_reason).toBe("stalemate");
});
