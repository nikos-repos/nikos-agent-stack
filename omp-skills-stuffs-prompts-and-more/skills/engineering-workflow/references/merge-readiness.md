# Complete changes with justified machinery

Use the applicable sections when a change crosses consumers, removes a dependency, changes query/cache/resource semantics, adds a mechanism, changes a UI, or resolves review findings. Routine edits need no extra artifact or checklist. Keep reasoning in the existing task, architecture, diff, or proof record. This reference adds no approval authority, schema fields, test quota, or factory gate.

## Account for affected consumers

Before changing shared meaning, identify its authoritative owner and actual consumers. Account for each affected consumer as changed, already compatible with evidence, or intentionally unsupported within the accepted scope. Do not use unsupported as an escape from a required consumer. Follow concrete call/data paths; an exhaustive repository inventory is unnecessary when the boundary is local. Finish the one behavioral concern across its legitimate consumers without bundling unrelated modernization. File or line count is not a completeness or simplicity metric.

In a factory, architecture/taskgraph own shared contracts and task boundaries. A build worker cannot widen ownership or revise a frozen interface to complete a sibling consumer: return the typed blocker to the owning workflow, preserve valid work, and use the existing contract/gate route. The integrator checks the complete concern on the current base after its owned tasks finish.

## Remove a failure dependency before compensating for it

Before adding a catch, retry, cache, or fallback around a failing dependency, establish which facts the operation actually needs. Use the narrower existing reader or owner when it supplies those facts without the unrelated dependency. Prove independence by making the removed dependency unavailable or malformed while exercising the real operation. Where an existing observation boundary permits, assert non-use only when non-use itself protects an observable isolation, privacy, or resource contract; do not mock internal collaborators or add tracing infrastructure merely to count calls.

Do not remove authorization, identity, validation, or recovery evidence the operation genuinely needs. A metadata-only read must still enforce its actual access and consistency contract.

## Preserve the semantics outside the benchmark

For query, index, cache, batching, or pagination changes, identify the relevant membership, ordering, completeness, authorization, fairness, and cursor/invalidation guarantees. Check only the guarantees the actual consumer depends on; do not invent universal fairness requirements. A result cap is not a replacement for complete enumeration unless bounded results are the product contract.

Select the smallest behavior case that crosses the changed boundary: more eligible records than one batch, a subsequent page, invalidation after a meaningful change, or progress for an item beyond the first batch. Compare the relevant result/progress against the contract, not just types or latency. Report the measured scope; a faster collector does not establish a faster application.

## Separate retained facts from active work

For new or changed retained state, name its owner, identity scope, and invalidation condition. Separately identify who owns its producer/subscription/timer/worker/handle and when that resource must stop. Retaining a completed snapshot does not justify leaving its producer running. Preserve data/cursor consistency and do not restore abandoned loading state as completed state. Prevent obsolete work from overwriting a successor where that lifetime race is reachable; do not add generation tokens without a demonstrated need.

Inspect the side effects of an operation when correctness depends on them. A details reader may change sampling history; a successful probe may establish less than the consumer's actual readiness requirement. Test the relevant distinction instead of relying on the operation's name or exit code.

## Add variation at the existing decision owner

Before adding a mechanism, establish its present job:

- State/cache: why existing authoritative state is insufficient, who owns it, and when it becomes invalid.
- Helper/abstraction: the meaningful operation, present invariant, actual duplication, or real boundary it clarifies.
- Retry/fallback: the reachable supported failure, intended recovery, termination, and external-effect policy.
- Dependency/option: the current requirement the existing stack cannot reasonably satisfy.

Prefer extending the existing decision point when sufficient. These are reasoning prompts, not required tables, numeric thresholds, or bans on new files, one-caller helpers, state, comments, or abstraction. Two objects can correctly represent two different lifetimes. Hoist reusable computation only when its inputs and scope are invariant; never share request- or identity-specific state just to save allocations.

## Compare exact reuse and lifetime guarantees

Before replacing a helper or dependency with a platform facility, identify the exact guarantee supplied and the residual behavior to preserve. Count adapter, migration, transitive-dependency and maintenance obligations; a shorter caller can hide a larger replacement burden. For a broad audit or complete contract retirement, use [simplify-codebase](../../simplify-codebase/SKILL.md).

Compute derived state from authoritative inputs when there is no distinct persistence, lifetime, performance or user-edit contract. Distinguish borrowed data within one owner from owned data crossing async work, wire or storage. Collapse lifecycle mechanisms only when owner, transition, failure window and guarantee coincide. A small reachable-transition table can expose cancellation, partial publication, callbacks after termination or double cleanup; do not add one when it changes no decision.

Preserve no-op referential identity where consumers use unchanged identity as a signal, transformations before projection, serialization/coercion, ordering, and meaningful values in the actual type domain. Use reuse, quality and efficiency as applicable lenses, not fixed reviewer counts, line thresholds, file-splitting rules or test-count goals. Retain required safety/recovery behavior and adequate regression proof.

## Preserve product continuity

For a fix or port, preserve the existing information hierarchy, controls, vocabulary, dependencies, and interaction model unless the request or a demonstrated defect requires a change. Added UI content must serve a requested capability or concrete existing usability need. Necessary accessibility and error feedback remain valid. Exercise a representative populated, recovery, or permission-limited state when relevant; a successful build does not prove the UI journey. Use one term per domain concept and remove redundant contextual prefixes where meaning stays clear. Names should expose real domain distinctions; preserve precise technical vocabulary. Comments should explain otherwise hidden constraints rather than narrate statements or the editing session.

## Review the diagnosis and remedy separately

For a review finding, establish its reachable trigger and violated contract. Then independently check that the proposed remedy restores that contract without silently changing accepted input, authorization, ordering, or recovery semantics. Rejecting invalid input and coercing it into another value are different decisions. Preserve supported defect findings even when the suggested fix is wrong; distinguish unsupported findings from optional improvements.

Before acceptance, inspect the final diff for obsolete indexes, options, helpers, retained state, and tests introduced by an abandoned approach. Remove only machinery that is no longer needed; retain compatibility/recovery evidence and unrelated user work. Recheck affected behavior on the final integrated revision. A merge, worker report, or old test result is not current proof.

## Evidence and enforcement

Use existing lint/tests/harness receipts for deterministic facts, behavioral checks for semantic invariants, and source-grounded judgment for architecture/product choices. Add a detector only for a demonstrated recurring pattern with a reliable detection boundary and tested false-positive cases; no generic elegance score or new gate is implied.

The originating [shared research session](https://chatgpt.com/share/6a9cb9b9-3b88-83ea-bf15-d605a0a4e819) proposes these heuristics; it does not recover a model's training methodology or demonstrate improvement in this harness. It reports an incomplete three-transcript audit and no executed repository tests. Three linked primary changes were also inspected during integration planning:

- [Metadata command isolation](https://github.com/pingdotgg/t3code/commit/6365919f2e5bcfb4fa4020b95e19af26ae40979f): source and unreadable-history fixtures show a narrower read dependency.
- [Polling correction](https://github.com/pingdotgg/lawn/pull/47/commits/a11a73d59180d96d3efc23510ba48600ee7d96dd): a concrete reference for checking progress/order beyond a single batch.
- [Unused stream teardown](https://github.com/pingdotgg/t3code/commit/d7cf8aaa8d4fbcbdd523b4f4bc86fda5c47b4a70): a concrete reference for separating retained information from active observation.

These are examples, not repository-specific policies to copy. No linked tests or benchmarks were executed by this integration. Retire or narrow a heuristic if representative local evidence shows needless burden or conflicting behavior; the engineering-workflow maintainer owns this reference.

Further semantic refinements adapt [bholmesdev simplify](https://github.com/bholmesdev/skills/blob/44da67bd1896cdafced6f60573b62ae71d18ef2a/skills/simplify/SKILL.md), Compound's [reuse](https://github.com/EveryInc/compound-engineering-plugin/blob/57e409e5c8c2c472106bd7d87ac72b724b70826b/skills/ce-simplify-code/references/personas/code-reuse-reviewer.md), [quality](https://github.com/EveryInc/compound-engineering-plugin/blob/57e409e5c8c2c472106bd7d87ac72b724b70826b/skills/ce-simplify-code/references/personas/code-quality-reviewer.md), and [efficiency](https://github.com/EveryInc/compound-engineering-plugin/blob/57e409e5c8c2c472106bd7d87ac72b724b70826b/skills/ce-simplify-code/references/personas/efficiency-reviewer.md) lenses, and [tt-a1i lifecycle analysis](https://github.com/tt-a1i/simplify-codebase/blob/5da55efcb52db690e7406f06f827a23b15da2706/references/boundaries-and-lifecycle.md).

For an adoption decision, use the existing v3 E1 route: compare the preceding candidate with this addition on unseen tasks from the same frozen starting state and comparable total budgets. Count all attempts, accepted integrated outcomes, missed consumers, substantive review corrections, and human corrective time. Hold other treatment differences constant and report uncertainty. No pilot or performance gain is claimed by authoring this reference.
