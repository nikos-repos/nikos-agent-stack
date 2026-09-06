# requirements sheet template

the section skeleton for `.factory/requirements.html`. render as html; this file is the content contract, not the markup.

every requirement-bearing table keeps `owner`, an observable `proof` or `acceptance` column, and a `source / as-of` column. Reuse stable evidence ids linked to canonical source records instead of copying their metadata into every row; keep accountability and acceptance visible. Mark unknown ownership, proof, or source explicitly. An unavailable historical date may be `unknown`; block only claims whose correctness depends on missing freshness evidence, and carry material gaps to open questions.

---

## 0. recorded decision: the adversarial question

> **question:** \<the question from recon\>
> **user answer:** \<verbatim\>
> **date:** \<yyyy-mm-dd\>
> **consequence:** \<what this answer changed about the project\>

if the user pivoted, add: **thesis before**, **thesis after**.

---

## 1. project context

what exists today, who is underserved, and what evidence says so. name the archetype chosen from recon and the reason. three paragraphs at most.

state the structural weakness recon found and how this document handles it: closed by a requirement, accepted as a non-goal, or deferred as an open question.

## 2. goals

each goal is a change in the world.

| id | owner | goal | why it matters | proof / decision | source / as-of |
|---|---|---|---|---|---|
| g-1 | | | | | |

## 3. non-goals

each is something a reasonable reader would otherwise assume is in scope.

| id | owner | not doing | why not | revisit when | source / as-of |
|---|---|---|---|---|---|
| ng-1 | | | | | |

## 4. success criteria

observable by someone who did not build it. every row carries a threshold.

| id | owner | signal | measured how | threshold | proof / evidence | source / as-of | ties to |
|---|---|---|---|---|---|---|---|
| sc-1 | | | | | | | g-1 |

## 5. key users and journeys

For automation of an existing workflow, tie the journey to a supplied or observed case. Record the authoritative system of record, handoff/approval owner, exception path and frequency when known, terminal outcome, active effort versus elapsed waiting, and baseline evidence. Distinguish measured facts from assumptions. Select a bounded real-workflow or shadow comparison when needed to validate the first release; do not invent a baseline or require new interviews for an already-defined technical task.

### user: \<name\>
- owner: who is accountable for this journey
- context: when and where they are
- motivation: what makes them start
- alternative: what they do today instead
- proof: the observable terminal state and evidence source / as-of date

### journey: \<name\>
1. trigger: \<what starts it\>
2. \<step\>
3. \<step\>
4. terminal state: \<what is true at the end\>

owner: \<accountable owner\>
proof / evidence: \<observable proof, source locator, and as-of date\>
failure branch: \<what happens when step n fails, and what the user sees\>

## 6. functional requirements

testable, independently deliverable, technology-free.

| id | owner | requirement | acceptance signal | proof / evidence | priority | source / as-of |
|---|---|---|---|---|---|---|
| fr-1 | | | | | must / should / could | |

## 7. non-functional requirements

each carries a number or a boundary. reject adjectives.

| id | owner | dimension | requirement | measured how | proof / evidence | source / as-of |
|---|---|---|---|---|---|---|
| nfr-1 | | latency / throughput / footprint / availability / portability / accessibility / privacy | | | | |

## 8. key architecture decisions

decisions forced by requirements, recorded before a stack exists. phase 2 honours each one or explicitly overturns it.

| id | owner | decision | forced by | alternative rejected | cost of reversal | proof / evidence | source / as-of |
|---|---|---|---|---|---|---|---|
| ad-1 | | | fr-n, nfr-n | | low / medium / irreversible | | |

## 9. data model and flow

### entities

| entity | owner | lifetime | lives where | sensitive | proof / evidence | source / as-of |
|---|---|---|---|---|---|---|

### flow

for each journey: origin, transformations, resting places, exits. name every point where data leaves the user's control. Add the accountable owner, observable flow proof, source locator, as-of date, and unknowns for each boundary.

## 10. contracts and boundaries

| boundary | owner | what crosses it | direction | proof / evidence | when the other side fails | versioning | source / as-of |
|---|---|---|---|---|---|---|---|

a boundary with no defined failure behaviour is an outage waiting for a name.

## 11. security and failure modes

| failure | owner | trigger | blast radius | containment | detection / proof | source / as-of |
|---|---|---|---|---|---|---|---|

include at minimum:

- invalid input at every trust boundary
- loss of the persistence layer
- an external dependency being unavailable
- a partially completed operation

phase 3 filters this table per module and turns each row into a task's `failure_modes`, which sets that task's test budget. a failure mode missing here is a test that never gets written.

## 12. open questions

| question | owner | blocks | who can answer | default if unanswered | source / as-of gap |
|---|---|---|---|---|---|


## 13. sources and attribution

Every evidence entry records an exact source locator, the as-of date, the claim it supports, the accountable owner, the observable proof, and any unknowns. Use a source revision or inspection time when available; explicitly mark an unavailable date as unknown. Recheck freshness when it affects the claim, without blocking unrelated requirements solely for a missing historical timestamp.

### user decisions
- \<decision\> — \<turn or file\>, \<date\>

### recon evidence
- \<claim\> — \<url or local path/reference\> — as-of: \<yyyy-mm-dd\> — establishes: \<what\> — proof: \<how observed\> — unknowns: \<what remains\>

### assumptions
- \<assumption\> — owner: \<owner\> — default because \<reason\> — source/as-of: \<locator, date\> — proof: \<observable check\> — overturn if \<condition\> — unknowns: \<what remains\>

### unresolved
- carried to open questions: \<ids\> — owner: \<owner\> — source/as-of gap: \<locator and date, or unknown\> — proof needed: \<observable check\>
