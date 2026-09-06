# architecture document template

the section skeleton and content contract for `.factory/architecture.html` and `.factory/architecture.md`. render the html for maintainers and emit the md as the exact static, agent-facing form. this file defines content, not html markup.

the two outputs contain the same facts in the same fourteen-section order. apply every acceptance test below to both outputs. html may present tables and the module graph visually; md must carry the same information in headings, tables, and a static edge list so taskgraph and task agents never need html. Every decision records its source locator, as-of date, owner, observable proof, and unknowns; reused evidence is valid only when its input fingerprint still matches.

emit sections 0 through 13 in order. omit only the conditional subsections explicitly marked below. the acceptance table is an authoring rubric and is not emitted as an additional artifact section.

---

## 0. framing and problem statement

state the problem being solved, who or what is affected, the evidence from the approved requirements sheet, and the boundary of this architecture work. if the recommendation overturns a stack the user named, put that conflict in the first line.

## 1. goals and measurable success criteria

trace every goal and success criterion to its forcing `fr-` or `nfr-` id. use a table with these columns:

| goal | owner | success signal | measured how | threshold | proof / evidence | source / as-of | requirement id |
|---|---|---|---|---|---|---|---|

## 2. non-goals and out of scope

record boundaries that a reasonable reader might otherwise assume are included. use a table with these columns:

| id | out of scope | why excluded | revisit when |
|---|---|---|---|

## 3. driver ranking

rank only requirements that shape the system. every driver names the requirement id that forces it; an unbacked preference is not a driver. use a table with these columns:

| rank | driver | requirement id | architectural consequence |
|---|---|---|---|

## 4. shape comparison

compare at least two materially different candidates. a material difference changes the failure profile, not only the framework. Before adding a dependency or boundary, name the smallest risky seam, the least complex implementation that could cross it, and the observation that would falsify it. For each candidate record its shape, requirement fit, failure profile, debt at month six, failure isolation, dependency surface, reversal cost, and falsification condition.

score both candidates in a table with these rows:

| axis | candidate a | candidate b | evidence or requirement ids |
|---|---|---|---|
| requirement fit | | | |
| non-functional fit | | | |
| debt at month six | | | |
| failure isolation | | | |
| dependency surface | | | |
| reversal cost | | | |

finish with one recommendation paragraph that names the requirement ids that decided it.

## 5. stack table and dependency table

record the selected runtime, platform, framework, and data store with the reason and forcing requirement ids. use a stack table with these columns:

| choice | role | reason | requirement ids | debt avoided | proof / evidence | source / as-of |
|---|---|---|---|---|---|---|

record every dependency and its removal path:

| dependency | what it does | what it replaces | when it is abandoned | removal cost | source / as-of | unknowns |
|---|---|---|---|---|---|---|---|

reuse one runtime and one data store wherever they hold. an additional service, queue, cache, framework, or database needs a named requirement id.

## 6. module table

name boundaries and modules, not fragile implementation paths. for every module, record one responsibility sentence, the exact interface and error type, hidden behaviour, owned requirement ids, interface-only dependencies, failure domain, and one real isolation proof. also record both theoretical tests and their results.

use a table with these columns:

| module | responsibility | interface and errors | hidden behaviour | owned requirement ids | dependencies | failure domain | proof | research status / evidence | deletion-test result | interface-to-behaviour result |
|---|---|---|---|---|---|---|---|---|---|---|

## 7. module dependency graph

render the module dependency graph as a diagram in html. in md, include a static edge list in the same section. use one node for every module in section 6 and one directed edge for every interface dependency; label external systems only when an applicable integration-boundary subsection exists. the html diagram and md edge list must describe the same graph.

## 8. failure containment

record degraded mode and a real containment mechanism for every module. state the blast radius and name the single point of failure when one exists. use a table with these columns:

| module | degraded mode | containment mechanism | blast radius | single point of failure |
|---|---|---|---|---|

## 9. contract freeze set

list every frozen contract that two or more modules depend on. use a table with these columns:

| contract | path | declares | owner module | consumers |
|---|---|---|---|---|

state the wave 0 rule exactly: wave 0 writes every frozen contract into the repository as a compiling stub before any implementation task starts. the contract is a real file accepted by the real compiler, not a signature left in a prompt.

## 10. test cadence

record the project cadence fields: the runner and the real finish smoke command owned only by the merged-tree `factory-waves` finish gate; task and architecture cadence do not execute product smoke. Every cadence claim has an owner, source/as-of entry, observable proof, and explicit unknowns. decide which modules get tests, the observable seam per module, what proves ui and data requirements, and what may be mocked. define exactly one `waves[].integration_check` command for each wave; it is the sole executable integration command for that wave, and no global cadence integration command exists. assign every module a cadence class and record the reason. include acceptance checks that prove the primary journey.

use these cadence classes:

| class | meaning | use for |
|---|---|---|
| experiment-only | probe it; no durable tests yet | throwaway spikes and the first vertical slice |
| module-complete | the default risk-based test set | ordinary modules after they reach their threshold |
| characterize-first | capture existing behaviour before changing it | changes that can corrupt data, weaken a security boundary, alter money, migrate state, or break a published protocol |
| integration-gate | cross-module checks after each producer and consumer is complete | seams that exist only when two modules meet |
| release-gate | the full task-owned required suite only; it does not run product smoke | task completion before the merged-tree `factory-waves` finish gate |

## 11. risks, mitigations, dependencies, and open questions

use a table with these columns:

| risk or dependency | affected boundary | mitigation or required action | owner | open question or default |
|---|---|---|---|---|

include every unresolved question that could change a driver, shape, stack, module boundary, frozen contract, or acceptance check. record its owner and the default if it remains unanswered.

## 12. sources and decision attribution

separate observed decisions and evidence from assumptions. include these subsections:

### user and project decisions

- decision — source and date

### repository evidence

- claim — exact path, symbol, URL, or reference — as-of: date — establishes: what — owner: who — proof: observable check — unknowns: what remains

### assumptions

- assumption — owner: who — default because: reason — source/as-of: locator and date — proof: observable check — overturn if: condition — unknowns: what remains

### unresolved items

- carried to open questions: ids

## 13. conditional sections

include only the applicable subsections below, in this order. omit each inapplicable subsection silently.

### integration boundary

include when a module talks to an external system. record every field:

| field | value |
|---|---|
| external system | |
| accountable owner | |
| user-approved authorization scope | |
| permitted operation scope | |
| mutation classification | |
| rate-limit behaviour | |
| failure behaviour | |
| rollback or recovery path | |

these fields describe a proposed boundary only. they authorize no credential, grant no external access, and perform no mutation. default to read-only unless a named requirement forces a write.

### smallest measurable experiment

include when a top-ranked driver rests on instructional evidence rather than repository evidence. record every field:

| field | value |
|---|---|
| smallest risky seam | |
| bounded change or observation | |
| success signal | |
| failure signal / falsifier | |
| measurement method | |
| expected learning | |
| decision the result feeds | |
| owner / proof / source / as-of / unknowns | |

keep the experiment inside this artifact; do not create a separate learning artifact.

---

## section acceptance tests (authoring rubric; apply to html and md)

| section | acceptance test |
|---|---|
| framing and problem statement | a reader can state the problem, affected party, evidence, and architecture boundary from this section alone; the first line names any overturned user choice |
| goals and measurable success criteria | every goal has a measurable signal, measurement method, threshold, and forcing `fr-` or `nfr-` id |
| non-goals and out of scope | every entry is a plausible assumption about scope and states why it is excluded and when it may return |
| driver ranking | every ranked driver names a forcing requirement id and an architectural consequence; no preference appears without a requirement id |
| shape comparison | the smallest risky seam and least complex crossing are named before added complexity; both candidates have materially different failure profiles, every scoring axis is filled, each candidate has a falsification condition with source/as-of/proof/unknowns, and the recommendation names deciding requirement ids |
| stack table and dependency table | every stack choice has a reason, requirement ids, owner, proof, and source/as-of; every dependency has a replacement, abandonment condition, removal cost, source/as-of, and unknowns; extra runtimes or stores have a named requirement |
| module table | every module has all table fields, a real isolation proof, a research status/evidence entry including explicit skip reason when applicable, a deletion-test result, and an interface-to-behaviour result; every `fr-` and `nfr-` is owned by exactly one module |
| module dependency graph | every section 6 module appears as a node, every interface dependency appears as an edge, and html and md show the same acyclic graph |
| failure containment | every module has a user-visible degraded mode and mechanism, and the document names the single point of failure when one exists |
| contract freeze set | every frozen contract names a path, owner, and at least one consumer, and the wave 0 rule says the real compiler accepts each contract file before implementation starts |
| test cadence | every module has one cadence class and a reason; every wave names exactly one `waves[].integration_check` as its sole executable integration command; and the section identifies the merged-tree `factory-waves` finish gate's real smoke run for the primary journey and one critical failure path, separately from task cadence |
| risks, mitigations, dependencies, and open questions | every risk or dependency has an affected boundary, mitigation or action, and owner; every open question records an owner and default |
| sources and decision attribution | every decision and claim is attributed to an observed source with locator and as-of date or marked as an assumption; owner, proof, and unknowns are visible, and unresolved ids point to section 11 |
| conditional sections | when integration applies, all boundary fields are present and operations are read-only unless a requirement forces mutation; when an experiment applies, the smallest risky seam, falsifier, owner, proof, source/as-of, and all other experiment fields are present; otherwise each conditional subsection is omitted silently |
