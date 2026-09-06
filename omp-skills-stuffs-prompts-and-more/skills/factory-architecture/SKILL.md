---
name: factory-architecture
description: "Prepare the admitted factory architecture, risky seams, frozen interfaces, research evidence, and matching Markdown and HTML gate artifacts."
argument-hint: "[path to .factory/requirements.md]"
---

# factory architecture

decide what this is built out of, how it is cut into modules, and which seams freeze before anybody writes code. Before adding a dependency or boundary, identify the smallest risky seam and the observation that would falsify it.

this skill writes the tech-specification for the factory workflow. It loads only the approved requirements, the verified state gate, and the linked evidence needed for the current decision. Reuse evidence only when its source locator, as-of date, and input fingerprint still match; otherwise re-check it. Keep source, as-of, owner, proof, and unknowns visible in the architecture record.

When a decision changes shared meaning, failure dependencies, query semantics, resource lifetime, or UI behavior, read the applicable [merge-readiness guidance](../engineering-workflow/references/merge-readiness.md). Identify the existing decision owner and affected consumers in the architecture's existing module/contract evidence. Justify new mechanisms by a present requirement, and distinguish retained state from active producers. Carry the relevant preserved invariant and falsifier into the existing architecture/task fields; do not add machine fields or another approval gate.

## machine entry and direct handoff

when no machine envelope is supplied, return the canonical handoff `/omnipotence factory.new-project` with the original project root and entry before reading any file or writing any path. when an envelope is supplied, validate and match `projectRoot`, `rootRunId`, `effectKey`, `expectedStateSha256`, `expectedPhase`, `contractFingerprint`, and `payload` as the first operation; a malformed, stale, or mismatched envelope returns a typed blocker before any read or write.

the active root owns user questions and product-gate decisions. this skill never calls `ask`, never presents or records gate 3, never writes `.factory/state.json` or `.factory/decisions.md`, and never claims approval from an artifact's presence. after identity validation, it may read phase inputs and produce only the architecture artifacts and result. Phase workers write only product artifacts and their result; the owning `new-project` root is the sole `.factory/state.json` and `.factory/decisions.md` authority.

the approved `.factory/requirements.md` is the only input. after identity validation, require a schema-valid ".factory/state.json" whose `requirements` gate decision is `approved`, whose `artifacts.requirements.html` and `artifacts.requirements.md` hashes match the on-disk files, and whose two artifact records have `approved: true`. if any condition fails, stop before phase 2 and return to `new-project` for normalization, hash presentation, and explicit gate 2; never infer approval from either file being present.

do not re-open product scope. if a requirement is wrong, return a typed blocker to `new-project` for gate-2 revision rather than designing around it.

one invocation crosses only the architecture checkpoint. declare the frozen machine result fields exactly: `action: "architecture"`, `outcome` (`"complete"`, `"needs-input"`, `"needs-risk-approval"`, or `"blocked"`), `phase: "architecture"`, `status`, the verified `stateSha256`, `artifacts`, optional `inputRequest`, optional `riskRequest`, optional `gate_handoff`, and optional `blocker`; use at most one of `inputRequest` or `blocker`. this phase actually uses `inputRequest`, `riskRequest`, `blocker`, and `gate_handoff`; it does not use `gate_control` or `wave`. `riskRequest` is used only by the section 4 module research fan-out, and only with `actionKind: "public-research"`. a retry with changed approval or parameters uses the next deterministic attempt key. phase skills return `gate_handoff` only; `new-project` adds `gate_control` during gate presentation. return no undeclared field.
every `inputRequest` has only `id` matching `^[a-z0-9][a-z0-9._-]{0,63}$`, integer `attempt`, `question`, `responseSchema`, and `required: true`; the owning root records its response before the next phase attempt. a blocker uses only its allowed class, `summary`, and optional `recommended` resolution.

## boundaries

- do not create, update, comment on, label, or otherwise interact with issues, projects, or any tracker. everything this skill produces is a local file
- return a typed `inputRequest` to the owning root only when an unresolved choice would change the stack, a module boundary, a frozen contract, or an acceptance check. anything smaller is an assumption — record it as one and keep going. never call `ask` or hold a background interaction open.
- load context on demand: the requirements artifact, verified gate/hash inputs, and only the specific linked evidence needed for the current claim. Maintain a compact evidence ledger with source locator, as-of date, input fingerprint, owner, observable proof, and unknowns; do not infer missing facts from broad repository context or memory.
- do not claim a decision, constraint, or source that was not observed. an assumption is written down as an assumption
- this skill produces a specification. it promises no registration, no publication, and no implementation, and it writes no implementation code
- write the artifact after analysis. the destination is fixed by the pipeline; do not ask for approval or present a product gate here.

## 1. rank the drivers

not every requirement shapes the system. rank the ones that do, and say which requirement id forces each.

- the primary journey and its latency expectation
- the deployment and update model
- offline, realtime, native, browser, mobile, or hardware constraints
- data volume, consistency, retention, and recovery
- trust boundaries, secret handling, abuse exposure, compliance
- integration protocols and ecosystem constraints
- the delivery deadline and who operates this
- the measurable reliability and performance targets

separate a requirement from a preference. a preference with no `fr-` or `nfr-` behind it does not rank.

return a typed blocker if a top-ranked driver depends on an unresolved open question. that is a gate 2 problem, not an architecture problem; do not design around it.

## 2. challenge the shape

someone usually picked a shape already — in the brief, in the requirements, or in the user's head. name it, then try to beat it.

Before comparing candidates, name the smallest risky seam, the least complex implementation that could cross it, and the falsifier that would make that seam unsafe. Put that seam and falsifier in section 4 or the applicable experiment subsection before adding services, dependencies, or additional module boundaries.

always produce two candidates minimum:

- **candidate a** — the pre-selected shape, or the obvious one
- **candidate b** — a materially different shape that delivers the same requirements

different means a **different failure profile**, not a different framework in the same category. a native app versus a service is different. react versus vue is not.

score both against the ranked drivers, not against taste:

| axis               | question                                        |
| ------------------ | ----------------------------------------------- |
| requirement fit    | which `fr-` does each one make hard             |
| non-functional fit | which `nfr-` number does each one miss outright |
| debt at month six  | which one is holding back the fifth feature     |
| failure isolation  | when one part dies, how much still works        |
| dependency surface | how many third-party things must stay alive     |
| reversal cost      | what it costs to leave this shape later         |

give each candidate a **falsification condition**: the observation that would prove this shape wrong. a shape you cannot imagine being wrong has not been examined. Record the evidence source, as-of date, owner, observable check, and unknowns for each condition; a missing measurement stays an open question.

recommend one in a single paragraph, naming the requirement ids that decided it.

if the recommendation differs from what the user pre-selected, **say so in the first line of the document** and include it first in the `gate_handoff` warnings/presentation for `new-project` to present at gate 3. do not silently adopt the user's pick and do not silently override it; architecture never presents or holds a gate.

do not challenge for novelty. recommend the inherited shape when it still wins, and say why it won against **candidate b**

## 3. select the stack

pick the stack that leaves the least technical debt, not the one that starts fastest. debt is work you will do later that a different choice now would have avoided.

default preference order. any `nfr-` that contradicts it wins, in writing, with the id:

1. **rust** where the requirements involve a long-lived binary, correctness under concurrency, a data path, or distribution as a single artifact. the compiler removes a class of bug that would otherwise become a test suite
   - desktop with a rendered ui and no browser runtime: **gpui**
   - desktop that needs web rendering or an existing web ui: **tauri**
   - cli or service: rust standard tooling, no framework unless a requirement forces one
2. **the platform's native capability** before any dependency. a native input type, a database constraint, a filesystem primitive, or an os service beats a library that wraps it
3. **an established library** where it removes real complexity, is maintained, and its absence means writing the same thing worse. recon already found these — use its `capabilities already solved` table
4. **anything else** only with a written reason tied to a requirement id

this order is the project owner's stated preference, so it is the default and not a tiebreaker. overturning it is allowed and cheap; overturning it silently is not.

reuse one runtime and one data store wherever they hold. add a service, a queue, a cache, a framework, or a second database only when a named requirement forces it.

record every dependency:

| dependency | what it does | what it replaces | when it is abandoned | removal cost |
| ---------- | ------------ | ---------------- | -------------------- | ------------ |

a dependency with no removal path is an architecture decision, not a convenience. record it as an `ad-`.

## 4. slice the deep modules

a deep module is a small interface over substantial behaviour. the interface is what other modules must understand. the behavior is what they no longer have to.

state for each module:

- **name and one-line responsibility** — one sentence, no "and"
- **interface** — the exact exported symbols, their signatures, and their error type. this is the seam, and it is short
- **hidden** — what a caller never needs to know: the storage format, the retry policy, the concurrency model, the third-party client
- **owns** — the requirement ids it satisfies
- **depends on** — other modules, by interface only, never by internal
- **failure domain** — what breaks when this fails, and what keeps working
- **proof** — the one real execution that shows this module works in isolation

### module implementation research

the modules are named. **how each one is best implemented is a research question, and it is the last point in the workflow where the answer is still cheap** — after this section the contracts freeze, and after gate 4 the answer costs a re-cut task graph.

dispatch one read-only worker per module that still has a real implementation choice, as **one immutable batch `task` call**, not one after another. Read `reference/module-research-contract.md` once and construct the complete batch payload before dispatch: include the full shared context, every eligible module assignment in document order, each complete assignment cell, the selected stack and input artifact references, and the sole strict `outputSchema` unchanged. Do not omit a required research row, rewrite the shared contract separately for each worker, or adapt the schema in prose. Use only actual native task fields; retain the supplied context/assignments in existing attempt evidence rather than adding a factory result field.

**skip a module the stack and its interface already determine.** a module that transcribes a fixed signature over the standard library has nothing to research, and a worker sent to research it returns a restatement of the interface. research the modules where a real choice remains: an algorithm, a storage format, a protocol adapter, a concurrency model, a rendering seam. Keep every skipped module in the architecture's module table with its reason and the evidence that made implementation deterministic. Skipped modules receive no worker or invented native status field.

### research needs a source the model does not already contain*

this fan-out reaches the network, and it asks first.

- the online path requires an exact recorded `public_research: yes` answer from discovery **and** its own native disclosure confirmation. a recon approval does not satisfy it: an earlier approval never authorizes a later external action, and this request has a different scope
- before any public request, return `outcome: "needs-risk-approval"` with exactly one `riskRequest`, `actionKind: "public-research"`, whose `target` is the dependency and prior-art surface, and whose `parameters` carry the module list and the selected stack that are about to leave the machine. wait for the owning session's approval on that exact request
- denial produces no network effect and no finding. an acknowledged or unknown outcome is uncertain and is never resent automatically

**when the recorded answer is exactly `no`, do not dispatch this fan-out at all.** skip it, record one open question per module that would have been researched, and say in the document that the implementation approach was chosen without external evidence.

findings are evidence, not decisions:

- the recommendation and its `kind` inform the module's implementation. **you still decide.** a worker that names a dependency has not selected it
- an `existing-dependency` recommendation adds a row to the section 3 dependency table, with its removal cost taken verbatim from the finding
- `not_covered` entries become section 11 open questions or section 5 containment rows, and are never dropped silently
- provenance is attributed under repository evidence in the sources section, like every other observed source
- **a finding that overturns the stack returns to section 3 and is recorded there with the requirement id that decides it.** overturning the section 3 preference order is allowed and cheap; overturning it silently is not

this fan-out never designs an interface, never chooses an error type, and never reopens product scope. a finding that would change a requirement is a gate 2 problem and returns a typed blocker, exactly as a driver conflict does.

## 5. contain failure

design it the way an airplane is designed. a failed landing gear does not stop the engines.

for each module name:

- **degraded mode** — what the system does when this module is unavailable, in user-visible terms. "the app exits" is a valid answer when it is the correct one
- **containment** — the boundary that stops this failure from becoming another module's failure

pick containment from real mechanisms, not from intention:

| mechanism                                            | use when                                      |
| ---------------------------------------------------- | --------------------------------------------- |
| an error type that does not carry the internal cause | the caller must not depend on why it failed   |
| a process or task boundary                           | the failure can corrupt in-memory state       |
| a timeout and a bounded queue                        | the dependency can be slow rather than absent |
| an idempotent command                                | a retry must be safe                          |
| a durable outbox or write-ahead record               | data loss is possible on a partial write      |
| a circuit breaker or kill switch                     | an external integration can fail continuously |
| graceful degradation                                 | the feature is not on the critical path       |

two rules that catch most mistakes:

- **no shared mutable global.** two modules that both write the same global are one module with two names
- **redundancy must remove a named single point of failure.** duplicating a component without naming the failure it survives and the way you will verify that is cost with no benefit

there should be at most one module whose failure takes down everything, and the document names it as the single point of failure.

## 6. name the contract freeze set

this section is what makes phase 3 parallel. it is the most valuable thing in this document.

a **frozen contract** is a file that declares a seam two or more modules depend on: a trait, an interface, a type, a schema, an error enum, a wire format.

for each one record:

| contract | path | declares | owner module | consumers |
| -------- | ---- | -------- | ------------ | --------- |

the rule that follows from this:

> **wave 0 writes every frozen contract into the repository as a declaration, before any implementation task starts.**

not a signature in a prompt — a real file, in the real repository, that the real compiler accepts. declaration only: signatures, types, traits, error enums. no function bodies. where the language requires a body, return the typed not-ready error you declared — never a marker token.

that one rule is why a consumer and its provider can live in the same wave. the consumer does not need its provider's code. it needs its provider's contract, and after wave 0 the contract is on disk, type-checked, and identical for everybody.

a contract you leave for the agents to negotiate is the real source of merge pain. concurrent edits to the same file are not.

## 7. set the test cadence

decide once, for this project, and record it. `factory-build` enforces it per task; it does not choose it.

| question                       | how to decide                                                                                                                                                                      |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| the runner                     | the stack's standard one. never introduce a second                                                                                                                                 |
| which modules get tests at all | any module that owns a `must` requirement, crosses a trust boundary, or handles money, auth, or persisted data. pure internal helpers do not                                       |
| the observable seam per module | the module interface from section 4, never an internal                                                                                                                             |
| what proves a ui requirement   | rendered state through `browser` or the framework's harness, not a unit assertion                                                                                                  |
| what proves a data requirement | a round trip through the real format, not a mock                                                                                                                                   |
| what may be mocked             | only what sits at an external boundary. never an internal collaborator                                                                                                             |
| the integration check per wave | define exactly one `waves[].integration_check` command; it is the sole executable integration command for that wave, and no global cadence integration command exists              |
| the finish smoke run           | the merged-tree `factory-waves` finish gate owns the real product entry point, the primary journey, and one critical failure path; task and architecture cadence do not execute it |

then assign every module a **cadence class**:

| class                | meaning                                                                | use for                                                                                                                                    |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `experiment-only`    | probe it, no durable tests yet                                         | throwaway spikes and the first vertical slice                                                                                              |
| `module-complete`    | the default. risk-based tests after the module reaches its threshold   | ordinary modules                                                                                                                           |
| `characterize-first` | write the characterization evidence before changing anything           | changes to existing behaviour that can corrupt data, weaken a security boundary, alter money, migrate state, or break a published protocol |
| `integration-gate`   | cross-module checks after every producer and consumer is complete      | seams that only exist once two modules meet                                                                                                |
| `release-gate`       | the full task-owned required suite only; it does not run product smoke | task completion before the merged-tree `factory-waves` finish gate                                                                         |

record the reason each class was chosen. test count is never a target.

## 8. prepare the gate-3 handoff

write the artifacts after analysis. do not present a product gate, ask for approval, or stop for a gate decision here; return the artifacts, their phase-computed hashes, and compact gate handoff to `new-project`, which alone presents gate 3 and records its state. `factory.guard` re-hashes both files from disk at prepare and its observed values are authoritative.

if the recommendation overturns a stack the user already named, include that conflict first in the gate handoff presentation.

## 9. emit the artifacts

invoke native OMP `html-spec-planning` capability and `write` to create one self-contained `.factory/architecture.html`+`.factory/architecture.md` at the pipeline destination. use `edit` for targeted revisions to an artifact that already exists; do not rewrite a whole file to change a paragraph.

the html file is responsive, semantic, print-friendly, readable at accessible contrast, and carries a visible last-updated timestamp. inline css and js only, and only where they earn their place. for maintainer consumption only. The phase reports lowercase SHA-256 hashes for both artifacts; `factory.guard` re-hashes the named files from disk and its observed values remain authoritative.

the md file is the agent-facing static & non-interative version which contains the exact architecture spec delivered cleanly.

use `reference/architecture-template.md` in this skill's directory as the exact section skeleton and content contract for both outputs. it also contains every per-section acceptance test; apply each test to `.factory/architecture.html` and `.factory/architecture.md`.

for the module dependency graph, call `html-svg-diagrams` directly with the section 6 module table as evidence. render the graph inline in `.factory/architecture.html`, and emit the matching static edge list in `.factory/architecture.md`; the html graph and md edge list must describe the same graph.

## 10. return the gate-3 handoff

return the completion record to `new-project`; do not ask for approval or present any product gate here.

## verification

re-read the written file with `read`. open it with `browser` when available and confirm the title, every required section, a readable layout, and no broken visible content.

- every `fr-` and `nfr-` is owned by **exactly one** module. an unowned requirement is a missing module; a requirement owned twice is an unclear seam
- every module has a written deletion-test result
- every module names a degraded mode
- every module has a cadence class with a reason
- the dependency graph is acyclic. a cycle means two modules are one module
- every frozen contract names an owner and at least one consumer. a contract with no consumer is not a contract, it is an internal
- every assumption is marked as an assumption, and no decision is attributed to a source that was not observed
- every researched module records which approach was adopted; where the adopted approach differs from the worker's recommendation, the reason is written down. a module dispatched for research whose finding changed nothing is recorded as such, not omitted
- every skipped module is present in the architecture module table with its reason; every dispatched module has the full shared context, complete assignment row, unchanged output-schema contract, and evidence reference
- the artifact is local, and no tracker was touched
- report the path, the module count, the frozen contract count, the single point of failure if there is one, any requirement not yet owned, and every open question

## report completion

upon completion of the section tests and architecture analysis, return the frozen one-checkpoint machine result to the owning root:

```json
{
  "action": "architecture",
  "outcome": "complete",
  "phase": "architecture",
  "status": "complete",
  "stateSha256": "<verified lowercase 64-character state hash>",
  "artifacts": [
    {
      "role": "human",
      "path": ".factory/architecture.html",
      "sha256": "<64 lowercase hexadecimal characters>"
    },
    {
      "role": "agent",
      "path": ".factory/architecture.md",
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  ],
  "gate_handoff": {
    "gate": "architecture",
    "presentation": [
      "title: <title>",
      "measurable goals: <goals and thresholds>",
      "recommended shape plus preselected-stack conflict: <recommended shape; conflict or none>",
      "module summary: <module summary>",
      "frozen contracts: <frozen contracts>",
      "primary-journey acceptance checks: <acceptance checks>",
      "risks/open questions: <risks and open questions>"
    ],
    "warnings": []
  }
}
```

the artifact roles, paths, dual-hash shape, module contracts, and gate-handoff presentation remain unchanged. the phase reports its computed hashes, but `factory.guard` re-hashes both named files from disk at prepare and its observed values are authoritative. `needs-input` returns only a typed `inputRequest`; `blocked` returns only a typed `blocker` with its allowed class, summary, and recommended resolution. phase skills return `gate_handoff` only; `new-project` adds `gate_control` during gate presentation. the owning `new-project` action applies state changes with a full schema-valid read-modify-write, preserving every existing field. direct or standalone invocation performs no artifact or state write and returns the canonical root-process handoff instead.
