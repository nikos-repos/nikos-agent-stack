---
name: engineering-workflow
description: "Deliver a defined engineering change in an existing repository. Use diagnosing-bugs first for failures with unknown cause; an admitted factory keeps its phase contracts, and new-project owns product/specification work."
argument-hint: "[authorized outcome or requirements]"
---

# Engineering workflow

Turn an authorized, sufficiently defined request into an accepted artifact. A small fix does not require a specification document, task graph, worker or review ceremony. Missing material behavior/acceptance needs a focused question or the existing to-spec skill; ordinary implementation choices stay with the root.

## Select the smallest sufficient route

Extract the intended behavior, affected boundary, actual candidate/base revision, write scope, acceptance and material unknowns. Inspect existing work and proof before planning what remains; include relevant new/generated files omitted by a convenient diff and match PR evidence to the actual PR revision. A paragraph can be the whole plan. Use visible native task tracking for genuine multi-step work when available, without inventing tools or making a tracker another source of authority.

If an existing factory run owns the change, use its current new-project/phase contracts. Do not choose this routine route retrospectively to waive its gates, schemas, batch/barrier or proof rules. Use [session-coordination](../session-coordination/SKILL.md) when multiple roots, effects, handoff or recovery need coordination.

Implement directly when sufficient. Delegate only an independent bounded result whose expected benefit justifies setup, context, proof/review, integration, retries/rework, maintenance/support and human opportunity cost. Use coarse estimates with uncertainty. Choose from actual host model/capability availability; do not prescribe a universal provider or extra reviewer.

For changes to shared meaning, dependencies, queries/caches, resource lifetimes, UI behavior, or review remedies, read the applicable sections of [merge readiness](references/merge-readiness.md). Account for required consumers; seek the least machinery that completes the behavior, not the fewest changed files. Use existing evidence records rather than a new checklist.

Use [simplify-codebase](../simplify-codebase/SKILL.md) for a requested simplification audit or substantive contract retirement. For caller/substep composition or review/repair cycles, read [execution and review](references/execution-and-review.md). A substep returns its scoped result and unresolved claims to its caller; it does not restart an already-owned delivery tail.

## Ground and execute

1. **Inspect the relevant seam.** Use native read/grep and existing tests. Before changing an exported interface, use lsp definitions and references to resolve its callers when that capability is available. If LSP is unavailable or incomplete for the language, record that limit and use scoped search plus build/type and affected-consumer evidence; do not claim a complete caller census from one text match. Load focused guidance only when it changes the next decision; do not copy the full persona, catalogue or transcript into a worker.
2. **Sequence independently verifiable work.** For a multi-step change, identify prerequisites, expected artifacts and proof. Split at real behavior/ownership boundaries; bundle trivial related edits when one proof and owner suffice. A current v1 factory graph still keeps its exact per-module task rule.
3. **Coordinate writes and capacity.** Name the owning root and actual checkout; one root writes a shared integration checkout until an explicit release/handoff. Ready dependencies, resource scope and review/integration reserve govern admission. Native session task caps are not global quotas. Use actual native workspace receipts and preserve cooperative mutation leases/fences.
4. **Make the smallest behavior-preserving change.** For a new/corrected behavior where red → green helps establish the contract, use the existing tdd skill. For an understood reversible edit, use the appropriate existing check without inventing tests that mirror the edit. Invoke diagnosing-bugs for unexplained failures. Retain necessary regression/security/concurrency checks when the changed seam warrants them; current factory proof/escalation rules still apply.
5. **Inspect evidence before marking progress.** Read the actual artifact/diff and executed result for the current input/attempt. Keep failed checks visible. Worker change reports satisfy any required changed-file manifest honestly. Do not infer a pass from a test file, summary, exit zero or released gate.
6. **Integrate and verify the combined result.** Recheck the current base/head and accepted changes; resolve conflicts with the responsible owner. Run affected integration seams and the requested user-visible journey/format/claims checks. Broaden or repeat checks only for a changed candidate, failure or unresolved concern.

External scope and user authority remain explicit. Prior approval persists for its stated operation/target; do not ask again merely because a tool, worker or phase changes. Do not authenticate, mutate, publish, communicate externally or otherwise cross a boundary without applicable authority. Read-only research needed by the authorized task does not automatically require a new approval ceremony.

## Handle findings and interruption

Distinguish wrong required behavior, inadequate proof, material uncertainty, and optional/stale findings using [execution and review](references/execution-and-review.md). Repair the owning cause or missing proof, preserve unaffected valid evidence, and recheck changed dependencies plus integration effects. Required unresolved claims remain incomplete.

When checks fail together, group them by observable signature and likely shared cause; use diagnosing-bugs to establish the cause, fix dependency order, then rerun affected behavior. Do not hide failures to meet a test-count or speed target.

For supplied reviews, use deep-code-review when its normalization method is needed: split compound claims, verify current source/criterion, deduplicate outcomes and resolve incompatible material requests. An unsupported/stale comment is not automatically work; an invalid oracle needs sourced correction and independent recheck. Existing valid failures remain failures.

Parent/wrapper completion does not prove a detached child or late cleanup stopped. Before workspace reuse establish exact native terminal/cancel, settled cleanup/release and reconciled external effects. Keep unknown attempts owned and quarantined in existing evidence. A separate isolated retry may proceed before old cleanup only with proof of noninterference and no duplicated external action, while the old workspace remains quarantined. This never permits early reuse of that workspace or overrides a stricter factory route. Without that proof, continue unrelated work while reconciling. For durable run/effect or questionnaire recovery, use [session-coordination](../session-coordination/SKILL.md) and the relevant native/engine interface.

Before acceptance, inspect the final diff for machinery left by an abandoned approach and remove only what is no longer needed. Evaluate a review's diagnosis and its suggested fix separately; an accurate finding does not justify coercion, fallback, or a new abstraction without checking its semantics. Verify the current integrated revision and preserve the established product interaction model unless the requested behavior changes it.

## Accept and deliver

The owning root accepts the result; a shared branch uses its named integrator. Independent behavioral evidence is always required. Add focused independent review for unfamiliar/shared interfaces, authority, persistence, concurrency, recovery or an explicitly requested review; another model is not a universal gate.

Deliver the actual requested artifact and a self-contained outcome/proof/limitation report. Close material finding counts with their fixed, retained, rejected, or unresolved dispositions; preserve raw evidence between implementation and review, then compress for the user. For authorized shipping, runtime-impacting work, migrations, or required post-release operation, use [release and operations](references/release-and-operations.md). Use git-commit only when commit/push is authorized, preserving its existing workflow. If a final external action lacks authority, finish the reviewable artifact before presenting that specific decision.

A brief explanation of an unfamiliar high-risk assumption or failure is advisory learning unless the authorized task contract names a bounded acceptance criterion with owner/evidence/timebox. It never adds a seventh factory check. Promote verified non-obvious guidance with material future value, an owner and invalidator through [learning and evaluation](../session-coordination/references/learning-and-evaluation.md); do not append a security memo or retrospective after every routine edit.
