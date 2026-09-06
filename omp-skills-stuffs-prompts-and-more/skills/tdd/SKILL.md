---
name: tdd
description: "Develop observable behavior through test-first work outside an admitted factory. Reuse a suitable existing failing test; admitted factory graph tasks always use factory-build, even with stable interfaces."
argument-hint: "[feature-or-bug]"
---

# Test-Driven Development

Use a red → green → refactor loop to deliver one observable behavior at a time. Invoke this skill directly as `tdd` or apply it automatically when work calls for a test-first feature or bug fix.

## Failure context

When pre-existing failures could obscure a new red test:

1. Establish the relevant baseline with the existing project runner; group observed failures by error class, affected module, and likely shared cause.
2. Repair shared infrastructure prerequisites that block the task's required proof before their dependent API/behavior failures. Work one cluster at a time and re-run its focused tests. Classify unrelated baseline failures without silently expanding scope.
3. Keep the current contract's red-green-refactor loop authoritative: clustering is diagnosis context, never a reason to weaken, skip, or bulk-update behavioral assertions.

## Establish the seam

1. Use `glob`, `grep`, and `read` to find the project's existing test runner, test layout, nearby behavioral tests, and public interface vocabulary. Reuse those conventions; do not introduce a runner, framework, or test style for this change.
2. Choose the smallest public boundary that exposes the requested behavior. Test a public API, command, UI flow, or other observable result—not private methods, internal collaborators, or side channels.
3. State the one observable contract for the next slice. Use an independently known expected value: a worked example, requirement, or fixed literal. If the required public seam is genuinely ambiguous, ask the one material question before writing the test.

## Proof for changed dependencies and semantics

For dependency removal, optimization, cache/pagination, or lifecycle work, read the applicable [merge-readiness cases](../engineering-workflow/references/merge-readiness.md). Choose a contract case that crosses the changed boundary, such as unavailable unrelated history, a later batch/page, meaningful invalidation, or a stale completion. Select only reachable cases that protect the task's observable behavior.

Use public behavior as primary proof. An assertion that a reader was not called is appropriate only at an existing observable boundary when non-use itself protects a named isolation, privacy, or resource contract. It is not permission to mock internal collaborators, bind tests to implementation structure, or add instrumentation solely for call counting.

An admitted factory-build task follows its own probe-before-durable-test sequence, cadence, doubles policy, ceiling, and escalation. This skill does not override that route or add a seventh acceptance check.

## UI seam reconnaissance

For a UI contract, inspect the rendered state before writing an assertion:

1. Start or attach to the application only with its existing project runner, then use OMP `browser` to navigate and wait for the state the user would see.
2. Use `browser` observation to identify accessible controls, text, and state from the rendered UI; take a screenshot only when appearance is itself contractual.
3. Derive the interaction and assertion from that live state, then run the focused UI test through the existing project runner.

Constraint: do not write Playwright or server-lifecycle scripts, guess selectors from source, or use an external connector.

## Integration evaluation

When the contract crosses an external dependency:

1. Use the project's existing runner and its established boundary double: a mock for the dependency's response or an existing recorded fixture for a representative exchange.
2. Assert the observable result and the boundary mapping that matters to it; keep mocks at the external boundary, never for internal collaborators.
3. Name whether evidence is mocked or recorded, and run the focused integration test before progressing to green.

Constraint: do not create a recorder, add a connector, or contact an external system merely to obtain test evidence.

## Verify a changed verifier or substitute

When changing a gate, CI/probe parser, validator, schema check, completion detector, or other acceptance mechanism, exercise its real verdict path with a known-valid case and a representative invalid case it must reject. Select relevant missing/empty, stale, wrong-revision, malformed, swallowed-failure, or spoofed-success input. Command presence, source-string assertions, and exit zero alone do not prove rejection. Risk follows semantics even in a small configuration or Markdown diff.

When substitute fidelity matters, name whether evidence is mocked, recorded, simulated/emulated, or actual-provider execution and which claims it supports. Within available authority and existing infrastructure, compare fixed actions and relevant lifecycle/receipt behavior against the reference before evaluating the policy. Keep expected results independent and calibration cases separate from policy holdouts. Missing live-provider proof stays a limitation or blocker according to acceptance; it does not authorize a new connector or external call. Factory proof and doubles rules still apply.

## Red

1. Use an existing focused failing test for that contract at the chosen seam; update or add one only when needed to express the changed behavior.
2. Run it with the existing project test command or focused runner invocation. It must fail for the missing or incorrect behavior, not because of a syntax error, broken setup, or an unrelated failure.
3. Use `read`, `grep`, `lsp`, `debug`, or `browser` as appropriate to establish why it is red. Correct the test if it does not express the intended observable contract.

## Green

1. Use `edit` or `write` to make the smallest production change that satisfies the test. Follow existing code patterns and avoid speculative behavior for later slices.
2. Do not hard-code test fixtures, branch on test-only inputs, or add behavior that exists only to satisfy the test.
3. Re-run the same focused test and confirm it passes. Add no further test or implementation until the current slice is green.

## Refactor and verify

1. Once green, refactor only when it improves the production code or test clarity without changing the contract. Keep the test at the public seam; do not convert it into an implementation-coupled test.
2. Re-run the focused test after each refactor. Use `lsp` references before changing exported symbols, and use `browser` for UI flows when that is the observable seam.
3. When all requested slices are complete, run the smallest existing verification command that covers the changed contract. Report the command and observed result.

## Guardrails

- Work vertically: one contract, one failing behavioral test, one minimal implementation, then refactor.
- Prefer assertions that would fail after a plausible behavioral regression; avoid tautologies, snapshots derived from implementation logic, and mocks of internal collaborators.
- Keep test names in the project's domain language and describe the user-visible capability.
- Stop when the requested observable contract is covered. Do not add unrequested edge cases, abstractions, or test infrastructure.
