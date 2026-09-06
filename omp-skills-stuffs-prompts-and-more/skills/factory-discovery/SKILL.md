---
name: factory-discovery
description: "Resolve the bounded product gaps of an admitted factory discovery checkpoint and prepare its sourced brief; return questions to the owning root."
argument-hint: "[rough idea or path to a high-level spec]"
---

# factory discovery

Find only the unresolved product decisions that can change the bounded first release. Stop asking after the owning root has supplied the required round-0 answer and any permitted round-1 answer; research answers the remaining research questions. This phase is an evidence-preserving handshake, not a general interview: every reused fact keeps its source, as-of basis, and known unknowns.

## machine entry and direct handoff

this skill runs only as the `discovery` action inside an active `factory.step` effect. when the machine envelope is absent, return the canonical handoff `/omnipotence factory.new-project` with the original project root and entry supplied to the owning root before reading any phase input or project file. when an envelope is supplied, require and match the complete step identity: `projectRoot`, `rootRunId`, `effectKey`, `expectedStateSha256`, `expectedPhase`, `contractFingerprint`, and `payload`; reject a malformed, stale, or mismatched identity as a typed blocker before reading phase inputs or writing an artifact.

the active root owns the checkpoint and the user interaction. this skill never calls `ask`, never presents a product gate, never records a gate decision, and never writes `.factory/state.json` or another factory-state file. a direct or otherwise unbound invocation creates no factory path and returns the canonical handoff.

one invocation crosses only the discovery checkpoint. return the frozen machine result fields exactly: `action: "discovery"`, `outcome` (`"complete"`, `"needs-input"`, or `"blocked"`), `phase: "discovery"`, `status`, the verified `stateSha256`, `artifacts`, and an optional typed `inputRequest` or `blocker`. return no `gate_control`, `wave`, or undeclared field. an input response or retry uses the next deterministic effect attempt; never reuse a resolved key with a changed payload.
every `inputRequest` has only `id` matching `^[a-z0-9][a-z0-9._-]{0,63}$`, integer `attempt`, `question`, `responseSchema`, and `required: true`; the owning root records its response before the next phase attempt.

## boundaries

- do not propose a stack, a schema, or an architecture. that is phase 2.
- do not research prior art. that is `factory-recon`.
- do not estimate effort or timeline.
- do not ask a question whose answer changes nothing about the product.
- do not ask a question already answered by a file the user handed you.

## 1. write the thesis sentence

before anything else, force the idea into one sentence:

> for **\<specific user\>**, **\<product\>** changes **\<current behaviour\>** so that **\<measurable outcome\>**, unlike **\<what they do today\>**.

every clause you had to invent is an assumption. mark it. the count of invented clauses is the size of the interview you are about to run.

a thesis with a vague user ("developers"), a vague outcome ("better"), or no named alternative is not yet a thesis. those three clauses are always `must-ask` when they are missing.

## 2. read what is already decided

Extract from the user's own words and supplied files only:

- **actor** — who uses this
- **trigger** — what makes them open it
- **outcome** — what is true afterwards that was not true before
- **constraint** — anything the user already fixed: platform, language, budget, deadline, offline, privacy

If the user named a repository, a spec file, or a prior artifact, read the named source before asking anything. Build a compact provenance ledger while reading: each retained fact has its exact source turn/file coordinate, an as-of date or source revision (or `unknown` when none is available), and any unresolved ambiguity. A fact copied from a prior artifact is evidence only when that artifact is in the supplied scope and its bytes or recorded hash still match. Never turn a plausible inference into `known`; carry it under `assumed` or `open for research` with the condition that would overturn it.

When automating an existing workflow, extract a representative actual case from supplied evidence: trigger/actor, inputs and sequence, system of record and precedence, handoffs/approval authority, exception path, and terminal outcome. Distinguish active effort from elapsed waiting; retain observed exception frequency and baseline cost when available. Record missing evidence as an assumption or research question, not validated process or market knowledge. Use these facts to distinguish deterministic work, model judgment, and human authority without selecting architecture here. Reuse the existing brief sections and gap taxonomy; this adds no question round, gap id, required interview, or machine field.

Load only the current brief inputs, the gap contract, and the supplied source slices needed for the current decision. Do not pull a whole repository, skill catalogue, or prior phase history into context. On a retry, reuse the immutable ledger only while the input/source hashes and answer attempt are unchanged; otherwise re-read the affected source and mark the old fact stale.

## 3. score the gaps

read `reference/gap-taxonomy.md` as the only gap contract. for all thirteen product gaps, apply each row's `known`, `assumable`, and `must-ask` tests. use only the stable ids in that file.

when a gap is `assumable`, copy its exact default sentence verbatim into the brief's `assumed` section. never infer a `known` fact.

## 4. return the deterministic handshake

Machine discovery never calls `ask`, delegates a question to a worker, or invents a second question channel. The owning root records the answer through the matching `input/discovery/product-choice/<n>` breakpoint, then invokes the next discovery attempt with that recorded response. The phase may reuse an already recorded answer only when its stable id, source/as-of basis, and response-schema version still match; changed evidence invalidates the reuse and returns the affected gap to the deterministic scan.

1. inspect the supplied files and score all thirteen product gaps with `reference/gap-taxonomy.md`, preserving its `known`, `assumable`, `must-ask`, defaults, ids, and priority order.
2. on attempt `0`, return `outcome: "needs-input"` with exactly one typed `inputRequest`: stable id `product-choice`, attempt `0`, `required: true`, the ordered round-0 questions, and a response schema for those questions. include no more than four product gaps plus the reserved `public_research` question.
3. consume the next-attempt response only after the owning root has recorded it. validate it against the returned response schema, record each answer with its stable id and source round, and rescore the thirteen gaps. an invalid response returns a typed blocker and leaves product files unchanged.
4. if unresolved `must-ask` gaps remain, return at most one round-1 `inputRequest` with the same stable id, attempt `1`, and the next three unresolved gaps in taxonomy order. do not call `ask`, reorder ids, or open a third round.
5. after round `1` is answered, write `.factory/brief.md` only when the exit check passes. record any deferred gap as unresolved; never silently treat it as known. if a required product choice is still unresolved, or a user-choice conflict remains, return a typed blocker instead of writing the brief.

the question rules remain fixed:

- use the stable lowercase id from the reference
- 2 to 5 options, each a **distinct real product**, not a rephrasing of the same one
- put the tradeoff in `description` and keep `label` short
- set `recommended` on the option you would ship, and be ready to defend it
- set `multi: true` only when the answers genuinely compose
- never add an "other" option; the runtime adds it

the separate stable `public_research` question and its public scope, explicit yes/no, and offline-source rule are defined in the reference; include it in round 0 when its answer is not already recorded. when two answers conflict, return the conflict in the next owning-session `inputRequest` only when the current attempt is round `0` and the user must choose; otherwise take the narrower reading and record it. after round `1`, return a typed blocker for any conflict requiring user choice and leave product files unchanged; never open a third round.


after the owning root has recorded the final answer response and the exit check passes, write `.factory/brief.md` as the sole discovery artifact. never write `.factory/state.json`, `.factory/decisions.md`, or any approval record here.

```markdown
# brief: <name>

## thesis
for <user>, <product> changes <behaviour> so that <outcome>, unlike <alternative>.

## core loop
<the repeated action, start to finish, in 3 to 6 steps>

## decided
- <fact> — source: user, round <n>, question id <id>; as-of: <answer timestamp or unknown>
- <fact> — source: <file>:<line>; as-of: <file revision/date or unknown>

## assumed
- <assumption> — default chosen because <reason>; source/as-of: <basis or unknown>; overturn if <condition>

## open for research
- <question research can answer without the user> — current unknown: <what is missing and why it matters>

## evidence ledger
- <material fact or unresolved unknown> — source: <turn/file coordinate>; as-of: <date, revision, or unknown>; confidence: direct | unresolved

## weakness hypothesis
<the one thing most likely to make this product not worth building, stated before research, so recon can try to confirm or kill it>

## constraints
- <hard constraint and where it came from>

## non-goals
- <what this explicitly is not>

## research approved
yes | no — <public scope approved, or explicit refusal>

## offline evidence scope
<user repositories and supplied files recon may inspect when research is declined; `none` if no local sources were supplied or `not applicable` when research is approved>

every line under `decided` cites the user turn or the file that produced it. **a line you cannot attribute belongs under `assumed`.** this rule is what keeps the requirements sheet honest three phases later.

the `weakness hypothesis` is your own guess, written before recon runs. recon will either confirm it, replace it with a worse one, or fail to find any weakness at all. all three outcomes are useful; a guess written afterwards is not.

## exit check

finish only when:

- the thesis names one user, one behaviour change, and one measurable outcome
- every `must-ask` gap resolved into `decided` or `assumed`
- nothing under `decided` is your own inference
- research is approved or explicitly declined
- if research is declined, the offline evidence scope is explicit (`none` is valid) and remains separate from the public permission answer
- a researcher could write the recon tracks without guessing what the product is

report the path, the count of open research questions, and the research permission answer.

## report completion

upon completion of the exit check, return the frozen one-checkpoint machine result to the owning root:

```json
{
  "action": "discovery",
  "outcome": "complete",
  "phase": "discovery",
  "status": "complete",
  "stateSha256": "<verified lowercase 64-character state hash>",
  "artifacts": [
    {
      "role": "primary",
      "path": ".factory/brief.md",
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  ]
}
```

the artifact role, path, and lowercase sha256 shape stay unchanged. the phase reports its computed hash, but `factory.guard` re-hashes the named bytes from disk at prepare and its observed value is authoritative; never call the phase's claim verified.

an artifacts entry has `role` (`primary`, `human`, or `agent`), `path`, and the phase-computed lowercase 64-character `sha256`; `factory.guard` supplies the authoritative prepare-time hash after reading the file bytes. requirements and architecture return both `human` and `agent` entries. the owning `new-project` action applies any state change with a full schema-valid read-modify-write, preserving every existing field. direct or standalone invocation performs no artifact or state write and returns the canonical root-process handoff instead.
