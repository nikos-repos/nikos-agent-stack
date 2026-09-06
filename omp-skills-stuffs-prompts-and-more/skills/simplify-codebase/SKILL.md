---
name: simplify-codebase
description: Investigate and simplify an existing codebase, or retire a feature, dependency, compatibility path, or contract with consumer and behavior evidence. Use for requested simplification audits or substantive removal work; ordinary cleanup of a current diff stays in engineering-workflow.
---

# Simplify a codebase

Reduce maintenance obligations while preserving the accepted behavior and necessary safety/recovery contracts. Fewer lines, files, dependencies, or tests alone do not establish improvement.

## Establish the scope

Derive two choices from the authorized request: **survey or change**, and **focused or broad**. A survey returns findings without editing. A change request already authorizes its scoped reversible implementation; do not add a new approval ritual. A reachable behavior change outside that scope remains a product decision.

Identify the actual candidate/base, ownership, affected boundaries, retained behavior, and available evidence. Include relevant new/generated files and external or persisted consumers. A factory-owned change retains its frozen interfaces, task scope, gate and wave contracts; return a typed blocker to the owning workflow when a cut needs broader ownership.

## Investigate and decide

Read [investigation and retirement](references/investigation-and-retirement.md) for coverage, consumer proof, counterarguments, and net obligations. Broad audits inspect relevant owner domains before ranking their best cuts; focused work follows the affected consumer/dependency neighborhood. Unknown reachability is not proof of non-use.

For a local semantic replacement, also use the applicable [merge-readiness guidance](../engineering-workflow/references/merge-readiness.md). Keep findings in the existing task or audit artifact. No separate architecture inventory, score, or diagram is mandatory.

## Execute or return findings

For authorized changes, read [execution and recovery](references/execution-and-recovery.md). Complete the justified cut through its consumers and supporting artifacts, preserve unrelated work and historical evidence, and validate the surviving contract. A failed required check may disprove the cut; do not weaken its oracle to finish.

Close each material finding as implemented, retained, consolidated, rejected, superseded, or unresolved with the decisive missing fact. Report inspected scope, blind spots, removed obligations, proof, and residual risk. No safe cut is a valid outcome. When called as a substep, return the scoped result to its owner instead of restarting review or shipping.
