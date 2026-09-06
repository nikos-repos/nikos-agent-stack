---
name: factory-recon
description: "Research the admitted factory thesis through its complete online track contract or supplied offline evidence, then hand sourced findings to the thesis gate."
argument-hint: "[path to .factory/brief.md]"
---

# factory recon

Treat prior art as bounded evidence for the approved thesis. Find adjacent shapes, record what each buys and where it fails, then identify one structural weakness that could invalidate this product. Do not turn a large search into a success signal: the report is complete only when the exact track contract, citation rules, hole test, weakness, adversarial question, and source checks are satisfied.

the active root supplies the recorded discovery response, matching brief fields, and research approval inputs for this checkpoint.

## machine entry and direct handoff

this skill runs only as the `recon` action inside an active `factory.step` effect. when the machine envelope is absent, return the canonical handoff `/omnipotence factory.new-project` with the original project root and entry supplied to the owning root before reading the brief or any other project file. when an envelope is supplied, require and match `projectRoot`, `rootRunId`, `effectKey`, `expectedStateSha256`, `expectedPhase`, `contractFingerprint`, and `payload`; reject a malformed, stale, or mismatched identity as a typed blocker before reading the brief, dispatching a worker, or writing a report.

the owning root keeps questions, approvals, and risk actions in its session. this skill never calls `ask`, never presents or records a product gate, never approves a public effect, and never writes `.factory/state.json` or another state file. a direct or unbound invocation creates no `.factory/recon.md` or other factory path and returns the canonical handoff.

one invocation crosses only the recon checkpoint. return the frozen machine result fields exactly: `action: "recon"`, `outcome` (`"complete"`, `"needs-risk-approval"`, or `"blocked"`), `phase: "recon"`, `status`, the verified `stateSha256`, `artifacts`, and at most one typed `riskRequest` or `blocker`. return no `gate_control`, `wave`, or undeclared field. a retry with changed approval or parameters uses the next deterministic attempt key.

read the exact recorded discovery response and the matching brief fields from the active root payload/state snapshot. do not infer approval from a file's presence, a product-gate decision, `.factory/decisions.md`, or a previous run.

After the active root/effect identity has been verified, read `.factory/brief.md`. Its `open for research` list is the assignment and its `weakness hypothesis` is the thing you are trying to confirm or kill. Read only the brief, the recorded discovery evidence needed to interpret it, and the exact local contract/reference slices needed for this checkpoint. Reuse a prior report or source claim only when the named bytes, source URL, activity/publish date, and recorded as-of basis still match; otherwise mark the claim stale or unknown and re-open the source. Do not load whole project history or unrelated repositories into the shared context.

the online path requires an exact recorded `public_research: yes` answer and separate native disclosure confirmation. when either is absent, do not start online research; use the offline decline path only when the recorded answer is exactly `no`.

## offline mode

when the recorded discovery answer is exactly `public_research: no`, run recon in offline mode instead of the online fan-out. if no exact `yes` or `no` is recorded, return a typed blocker and do not choose a mode. do not spawn network scouts or any network or public-research tasks in offline mode. inspect only the user repositories and supplied files listed in the recorded offline evidence scope. preserve the brief's weakness hypothesis verbatim in the report, derive exactly one gate-1 adversarial question from the brief's assumptions, and mark the report `evidence: local-only`. local evidence may use repository paths and supplied-file references; do not require network urls or apply network citation rules. state that the evidence is limited to local sources in the verdict and sources sections.

## the citation rule for online mode

when the recorded discovery answer is exactly `public_research: yes` and the native disclosure confirmation is present, a finding with no resolvable link does not exist. drop it silently. do not report it as a hunch, an impression, or "commonly".

this applies to repository names, article claims, benchmark numbers, and download counts alike. a subagent that returns an uncited claim has returned nothing.

**a search-result snippet is a lead, not evidence.** open the page. cite the repository file, the documentation page, or the post that actually supports the claim.

these url and public-source rules apply only to the online path. offline mode uses local evidence as described above.

## online fan-out

before any public request, verify the exact recorded approval and disclosure confirmation again. if approval is `yes` but disclosure confirmation is absent, return `outcome: "needs-risk-approval"` with exactly one `riskRequest`:

```json
{
  "id": "public-research",
  "actionKind": "public-research",
  "target": "github repositories, public product pages, and public technical writing",
  "parameters": {
    "briefPath": ".factory/brief.md",
    "scope": [
      "github repositories",
      "public product pages",
      "public technical writing"
    ]
  },
  "reason": "public recon sends the approved idea and search scope outside the local project"
}
```

the owning omp session must approve or deny this exact request. denial produces no network mutation or report; approval permits only the declared public-research effect. an unknown outcome is uncertain and is never resent automatically.

When both checks are present, read `reference/track-contract.md` once and freeze it as the exact online batch contract for this attempt.

Issue one non-interactive `task` call in batch shape containing the complete immutable shared context, every track row in the reference (`repo-recon`, `product-recon`, `library-recon`, and `failure-recon`) in that order, each row's exact `agent`, `effort`, and full assignment, and the reference's sole `outputSchema` unchanged with `schemaMode: strict`. Pass the same shared context and contract bytes to every row; do not elide a row, paraphrase an assignment, add a track, reconstruct the schema, or compact the payload in prose. Do not run tracks one after another. Workers are read-only and may not ask users, approve risk, write factory files, or perform network actions outside their declared research assignment. A missing, altered, or partial row is a typed contract defect, not a reason to silently narrow recon.

three searches with the same vocabulary is one search. vary the words: the user's term, the academic term, and the term a competitor uses in marketing.

**do not count a fork, a mirror, a template copy, or a second repository from the same product as a separate analogue** unless its architecture actually differs.

## find the structural weakness

look for one weakness that could invalidate the product. a missing feature is not a weakness; a reason the product cannot matter is.

consider these classes; report only those the evidence supports:

| class            | the question                                                          |
| ---------------- | --------------------------------------------------------------------- |
| rarity           | is the pain too rare, or already absorbed by a cheaper habit          |
| incentive split  | do the buyer and the user want different things                       |
| access           | is the required data, distribution, or integration actually reachable |
| trust            | does privacy, abuse exposure, or regulation block adoption            |
| coordination     | does the workflow add more coordination than it removes               |
| reliability cost | does the operational cost grow faster than the product value          |
| absorption       | can a platform owner ship this as a feature next quarter              |

state the strongest one you found, **plus two things that make it actionable**:

- **falsification condition** — what would have to be true for this weakness to be wrong
- **cheapest experiment** — the smallest real thing the user could do this week to find out

a weakness without a falsification condition is an opinion. a weakness without a cheap experiment is a reason to give up rather than a reason to check.

## archetypes

group the findings into at most 5 archetypes; fewer is normal, one is a valid answer. an archetype is a **shape of solution**, not a category of product. name it after what it does structurally: "single binary, local state, no daemon" rather than "cli tools".

record for each:

- representative projects, with resolvable urls, activity or publication dates, and an as-of basis
- what its shape buys the user
- the hole it leaves open, with the evidence that the hole is real
- **ship effort** and **extend effort**, scored independently
- unknowns that remain after reading the cited source; an unknown is not a claim

| score | ship effort                                           | extend effort                                                                                    |
| ----- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| 1     | days. one module, no infrastructure                   | stable seams. the fifth feature costs about what the first did                                   |
| 2     | weeks. several modules, ordinary infrastructure       | deliberate contracts needed. the fifth feature costs more but not much more                      |
| 3     | months. specialised expertise or major infrastructure | high coupling, migration risk, or operational burden. the fifth feature threatens the first four |

score the two axes independently and give one line of evidence for each. **never average them.** they mean opposite things:

- `1 / 3` is a trap: fast to demo, expensive forever
- `3 / 1` is a real investment: slow to start, cheap to grow
- name which one the brief is currently pointed at

## holes

list the holes the brief's idea would actually close.

a hole qualifies only when it appears in **at least two independent sources**, or in one source with direct evidence such as an open issue with sustained activity. a hole nobody complains about is not a hole; it is a preference.

**if the brief closes no hole that survives this test, say so in the first line of the report.** that is the most valuable output this skill can produce and it must not be buried.

## the adversarial question

produce exactly one. return it in the recon artifact for `new-project` to present at gate 1, before anything is specified; this skill does not present the gate.

build it this way: take the thesis sentence, find the clause that must be true for the project to be worth anything, and point the strongest contrary evidence directly at that clause.

a strong question:

- attacks the load-bearing assumption, not a feature choice
- is answerable, so the user can actually resolve it
- changes whether the project gets built, not just how
- cites the recon evidence that provoked it, or the brief assumptions in offline mode

a weak question asks about scope, priority, or naming. those belong at gate 2.

state the question, then the evidence, then the specific thing the user should look at to answer it. do not soften it and do not answer it yourself.

## write the report

write `.factory/recon.md`:
for offline mode, add `evidence: local-only` near the title, preserve the brief's weakness hypothesis verbatim before the verdict, and replace url columns and placeholders with local paths and line ranges.

```markdown
# recon: <name>

## verdict
<one paragraph. does this close a real hole, and which archetype should it take>

## archetypes
### <archetype name>
- projects: <name> (<url>, active/published <date>, as-of <date or unknown>), ...
- buys: <what the shape gives the user>
- leaves open: <hole> — evidence: <url>
- ship effort: <1|2|3> — <one line>
- extend effort: <1|2|3> — <one line>
- unknowns: <what the sources do not establish>

## holes this project would close
| hole | evidence 1 | evidence 2 | closes it fully |
|---|---|---|---|

## capabilities already solved
| capability | library | language | does not cover | source |
|---|---|---|---|---|

## known failure modes in this space
| failure | seen at | why it happened |
|---|---|---|

## the structural weakness
**statement:** <the weakness>
**class:** <rarity | incentive split | access | trust | coordination | reliability cost | absorption>
**evidence:** <urls>
**falsified if:** <what would have to be true>
**cheapest experiment:** <what the user can run this week>
**brief's own hypothesis:** confirmed | replaced | not found

## adversarial question
> <the question>

**evidence:** <what recon found that provokes it>
**to answer it, look at:** <the specific thing the user should check>

## sources
| id | url | type | what it establishes |
|---|---|---|---|

## dropped
<online claims removed for lack of a resolvable source; in offline mode, list claims removed for lack of local provenance>
```

## verification

when research is approved, run:

- open every url in the report. a 404 is a dropped claim, not a footnote
- confirm every cited repository qualifies, after removing forks and mirrors
- confirm every archetype carries both scores and both justifications
- confirm the weakness carries a falsification condition and a cheap experiment
- confirm the adversarial question attacks an assumption and not a feature
- report the path and verdict line; the guard derives archetype and surviving-hole counts from the records in `recon.md`

when research is not approved, run:

- confirm every source reference resolves to a user repository or supplied file and line range
- confirm `evidence: local-only` appears in the verdict and sources sections
- confirm the brief's weakness hypothesis is preserved verbatim
- confirm the adversarial question derives from the brief's assumptions and is answerable at gate 1

## report completion

upon completion of the selected online or offline path and its exit checks, return the frozen one-checkpoint machine result to the owning root:

```json
{
  "action": "recon",
  "outcome": "complete",
  "phase": "recon",
  "status": "complete",
  "stateSha256": "<verified lowercase 64-character state hash>",
  "artifacts": [
    {
      "role": "primary",
      "path": ".factory/recon.md",
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  ]
}
```

the artifact role, path, and lowercase sha256 shape stay unchanged. the phase reports its computed hash, but `factory.guard` re-hashes the named bytes from disk at prepare and its observed value is authoritative; never call the phase's claim verified. `needs-risk-approval` returns only the exact typed `riskRequest`; `blocked` returns only the typed `blocker` with its allowed class, summary, and recommended resolution. do not add a gate or a standalone state-write result.

an artifacts entry has `role` (`primary`, `human`, or `agent`), `path`, and the phase-computed lowercase 64-character `sha256`; `factory.guard` supplies the authoritative prepare-time hash after reading the file bytes. requirements and architecture return both `human` and `agent` entries. the owning `new-project` action applies any state change with a full schema-valid read-modify-write, preserving every existing field. direct or standalone invocation performs no artifact or state write and returns the canonical root-process handoff instead.
