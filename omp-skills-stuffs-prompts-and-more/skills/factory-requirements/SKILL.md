---
name: factory-requirements
description: "Prepare matching, traceable Markdown and HTML requirements for an admitted factory checkpoint, with owners, observable acceptance, and gate handoff."
argument-hint: "[path to .factory/brief.md or .factory/recon.md]"
---

# factory requirements

turn `.factory/brief.md` and `.factory/recon.md` into one document a stranger could build from. every stable-id row names an owner, an observable proof or acceptance signal, and the evidence that supports it.

after the owning root records the thesis decision, this artifact is the authority. a later phase that contradicts it must change it through the requirements gate, not route around it. Provenance is explicit: record the source locator, its as-of date, and what remains unknown; do not turn an absent fact into an invented requirement.

## machine entry and direct handoff

when no machine envelope is supplied, return the canonical handoff `/omnipotence factory.new-project` with the original project root and entry before reading any file or writing any path. when an envelope is supplied, validate and match `projectRoot`, `rootRunId`, `effectKey`, `expectedStateSha256`, `expectedPhase`, `contractFingerprint`, and `payload` as the first operation; a malformed, stale, or mismatched envelope returns a typed blocker before any read or write.

the owning root keeps user questions and product-gate decisions in its session. this skill never calls `ask`, never presents or records gate 2, never writes `.factory/state.json` or `.factory/decisions.md`, and never writes a state-owned approval field. after identity validation, it may read phase inputs and produce only the requirements artifacts and result.

one invocation crosses only the requirements checkpoint. declare the frozen machine result fields exactly: `action: "requirements"`, `outcome` (`"complete"`, `"needs-input"`, `"needs-risk-approval"`, or `"blocked"`), `phase: "requirements"`, `status`, the verified `stateSha256`, `artifacts`, optional `inputRequest`, optional `riskRequest`, optional `gate_handoff`, and optional `blocker`; use at most one of `inputRequest` or `blocker`. this phase actually uses `inputRequest`, `blocker`, and `gate_handoff`; it does not use `riskRequest`, `gate_control`, or `wave`. phase skills return `gate_handoff` only; `new-project` adds `gate_control` during gate presentation. return no undeclared field.
every `inputRequest` has only `id` matching `^[a-z0-9][a-z0-9._-]{0,63}$`, integer `attempt`, `question`, `responseSchema`, and `required: true`; the owning root records its response before the next phase attempt. a blocker uses only its allowed class, `summary`, and optional `recommended` resolution.

## boundaries

- synthesize only. every requirement traces to the brief, the recon, or a recorded user decision in-session. do not add a requirement because it is good practice
- each stable-id row names the accountable owner, the observable proof or acceptance signal, and a source locator with an as-of date; if evidence or ownership is unknown, mark it unknown and carry the gap to open questions.
- do not select a stack, a framework, or a library. record the constraint that will force that choice in phase 2
- do not decompose requirements into tasks.
- one honest open question beats one invented answer

- **this skill** writes the *product* requirements sheet. it is intentionally technology-free by design

## 1. resolve the adversarial answer first

read the `thesis` gate record from `.factory/state.json`. it is the sole authoritative gate-1 decision input. use the decision recorded there; do not use `.factory/decisions.md` to determine approval. `.factory/decisions.md` is append-only audit context that retains decision history, is never approval authority, and never grants, proves, or replaces approval.

place the recorded thesis decision and date at the top of the sheet because it is the reason the project exists in this form. if the thesis gate record is missing or not approved, return a typed blocker with class `approval` to `new-project` before writing either artifact; do not ask or infer approval.

if the user pivoted at gate 1, as recorded in the thesis gate record, the brief's thesis is stale. rewrite the thesis line first and say what changed.
if `.factory/recon.md` records `evidence: local-only`, accept it as a valid recon report. do not stop because external evidence is unavailable; surface the limitation in project context and the sources block, and carry any decision it blocks into open questions.

## 2. write each section against its own test

use `reference/requirements-template.md` in this skill's directory as the skeleton.

Before synthesizing, load only the brief, recon, thesis gate record, and the specific linked references needed to support a claim. Reuse evidence only when its source locator, as-of date, and input fingerprint still match this run; otherwise re-check it. Do not load broad repository context or fill gaps from memory. Maintain a small evidence ledger while writing: claim, source locator, as-of date, owner, observable proof, and unknowns.

every section has a test. a section that fails its test is not finished. The test also checks that its rows have an owner and an observable proof or acceptance signal where the section describes a deliverable, plus a source/as-of entry or an explicit unknown.

| section                     | test                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| project context             | a reader who has never heard the idea can restate what it is from this section alone |
| goals                       | each goal names a change in the world, not a feature                                 |
| non-goals                   | each is something a reasonable reader would otherwise assume is in scope             |
| success criteria            | each is observable by someone who did not build it, carries a threshold, owner, proof, and source/as-of entry |
| key users and journeys      | each journey is a numbered sequence with a trigger and a terminal state              |
| functional requirements     | each is testable, independently deliverable, names an owner and observable proof, and names no technology |
| non-functional requirements | each carries a number or boundary, owner, observable proof, and source/as-of entry; never an adjective |
| key architecture decisions  | each records the constraint that forces it, not a preference                         |
| data model and flow         | every entity has an owner, lifetime, place it lives, evidence, and an observable flow proof |
| contracts and boundaries    | every boundary states its owner, what crosses it, its observable proof, and what happens when the other side fails |
| security and failure modes  | every failure names its blast radius and its containment                             |
| open questions              | each names who can answer it, what it blocks, the source/as-of gap, and the default |

## 3. requirement identity

give every item a stable id:

| prefix | for                                           |
| ------ | --------------------------------------------- |
| `g-`   | goal                                          |
| `ng-`  | non-goal                                      |
| `sc-`  | success criterion                             |
| `fr-`  | functional requirement                        |
| `nfr-` | non-functional requirement                    |
| `ad-`  | architecture decision forced by a requirement |

an id, once assigned, is never reused for a different thing.

this id chain is what makes an unattended wave traceable back to a human decision. in phase 2 each module declares which ids it owns. in phase 3 each task inherits those ids. at the finish gate every id must trace to a task that passed. an untraceable requirement is a requirement nobody built.

## 4. write the artifact

produce `.factory/requirements.html` as a maintainer-facing document. Each requirement row must retain its owner, observable proof or acceptance signal, source locator, as-of date, and explicit unknowns.

produce `.factory/requirements.md` as an agent-facing document

use the harness html generation capability. self-contained, responsive, print-friendly, accessible contrast, and a visible last-updated timestamp.

make every requirement id an anchor. phase 2 and phase 3 link back to them.

`.factory/requirements.md` is the non-interactive version, matching all requirements exactly. consumed by agents engaging with factory workflow.

## 5. prepare the gate-2 handoff

write both artifacts after synthesis. do not present a product gate, ask for approval, or stop for a gate decision here; return the artifacts, their phase-computed hashes, and compact gate handoff to `new-project`, which alone presents gate 2 and records its state. `factory.guard` re-hashes both files from disk at prepare and its observed values are authoritative.

the user either approves the sheet or supplies their own final draft. a user-supplied draft is the sole source and replaces both generated representations; do not merge it with the generated sheet or carry forward dropped requirements. normalize it once, emit identical requirement content to ".factory/requirements.html" and ".factory/requirements.md", preserve valid ids, assign missing `g-`, `ng-`, `sc-`, `fr-`, `nfr-`, and `ad-` ids, verify unique ids and references, and return both artifact paths with phase-computed lowercase sha256 hashes plus the source locator. The replacement must preserve or explicitly mark unknown owner, proof, source, and as-of fields; do not silently infer them. `factory.guard` re-hashes those bytes at prepare and owns the authoritative hashes. this artifact result does not imply gate 2 approval; `new-project` must obtain or preserve the explicit approval and write the schema-valid gate/state record before phase 2.

return the completion record to `new-project`; do not ask for approval or present any product gate here.

## traceability block

end the document with a sources section that separates five things and never blurs them:

1. **user decisions** — the turn or the file, with the date, owner, and the observable decision consequence
2. **recon evidence** — the URL or local path/reference, its as-of date, and what it established for an online report, or what it established when the report is marked `evidence: local-only`
3. **assumptions** — the default taken and the condition that would overturn it
4. **unresolved** — carried into open questions
5. **unknowns** — the missing source, date, owner, proof, or fact, plus the condition that would resolve it

a requirement with no entry in this block is unattributed and moves to open questions. A source locator without an as-of date is incomplete evidence; an unknown owner or proof remains visible until resolved.
when recon is marked `evidence: local-only`, the evidence limitation must remain visible in the requirements sheet; never invent external sources or stop for a decision that can proceed with an explicit limitation.

## verification

- re-read the written file. open it with `browser` to confirm the layout, the anchors, and no truncated content
- confirm every id is unique, and every id referenced inside the document exists
- confirm every stable-id row names exactly one owner and an observable proof or acceptance signal, and that each evidence entry has a source locator, as-of date, and explicit unknowns when applicable
- confirm no section is empty and no section names a technology
- confirm the structural weakness from recon appears somewhere: as a requirement that closes it, a non-goal that accepts it, or an open question that defers it. a weakness that vanished between recon and requirements was not resolved, it was forgotten
- confirm no requirement or source row gained facts from broad context or memory; reused evidence has a matching input fingerprint and as-of date
- report the path, the requirement count by type, and the open questions that block phase 2

## report completion

upon completion of the section tests and traceability checks, return the frozen one-checkpoint machine result to the owning root:

```json
{
  "action": "requirements",
  "outcome": "complete",
  "phase": "requirements",
  "status": "complete",
  "stateSha256": "<verified lowercase 64-character state hash>",
  "artifacts": [
    {
      "role": "human",
      "path": ".factory/requirements.html",
      "sha256": "<64 lowercase hexadecimal characters>"
    },
    {
      "role": "agent",
      "path": ".factory/requirements.md",
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  ],
  "gate_handoff": {
    "gate": "requirements",
    "presentation": [
      "title: <title>",
      "goals: <goals>",
      "non-goals: <non-goals>",
      "counts by requirement type: <counts>",
      "open-question count: <count>",
      "source/replacement note: <source locator and generated-or-user-supplied replacement>"
    ],
    "warnings": []
  }
}
```

the artifact roles, paths, stable requirement ids, and lowercase sha256 shape stay unchanged. the phase reports its computed hashes, but `factory.guard` re-hashes both named files from disk at prepare and its observed values are authoritative. `needs-input` returns only a typed `inputRequest`; `blocked` returns only a typed `blocker` with its allowed class, summary, and recommended resolution. phase skills return `gate_handoff` only; `new-project` adds `gate_control` during gate presentation. the owning `new-project` action applies state changes with a full schema-valid read-modify-write, preserving every existing field. direct or standalone invocation performs no artifact or state write and returns the canonical root-process handoff instead.
