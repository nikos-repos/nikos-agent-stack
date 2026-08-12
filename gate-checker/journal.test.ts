import { expect, test } from "bun:test";
import { reducejournal } from "./journal.js";

test("journal reconstructs an active continuation chain", () => {
  const state = reducejournal([
    {
      version: 1,
      kind: "request_start",
      request_id: "request-1",
      repo_root: "/repo",
      baseline_sha: "abc",
      baseline_dirty: ["src/old.ts"],
      policy_fingerprint: "policy-1",
    },
    {
      version: 1,
      kind: "continuation",
      request_id: "request-1",
      continuation: 2,
      failure_hash: "failure-1",
    },
    {
      version: 1,
      kind: "verify",
      request_id: "request-1",
      verify_id: "verify-1",
      outcome: "passed",
    },
  ]);

  expect(state).toEqual(expect.objectContaining({
    status: "active",
    request_id: "request-1",
    continuation: 2,
    failure_hash: "failure-1",
    verify_ids: ["verify-1"],
  }));
  expect(state.baseline_dirty).toEqual(["src/old.ts"]);
});

test("journal terminal events close the active request", () => {
  const state = reducejournal([
    {
      version: 1,
      kind: "request_start",
      request_id: "request-2",
      repo_root: "/repo",
      baseline_sha: "abc",
      baseline_dirty: [],
      policy_fingerprint: "policy-1",
    },
    {
      version: 1,
      kind: "terminal",
      request_id: "request-2",
      outcome: "passed",
    },
  ]);

  expect(state.status).toBe("terminal");
  expect(state.outcome).toBe("passed");
});

test("malformed event sequences require recovery", () => {
  const state = reducejournal([{
    version: 1,
    kind: "continuation",
    request_id: "missing",
    continuation: 1,
    failure_hash: "failure",
  }]);

  expect(state.status).toBe("recovery_required");
});
