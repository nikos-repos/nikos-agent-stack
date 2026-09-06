---
name: factory-taskgraph
description: "Convert an approved factory architecture into the closed task graph, fixed contracts, dependency waves, routes, ownership, and exact wave-0 preview."
argument-hint: "[path to .factory/architecture.md]"
---

# factory taskgraph

cut the approved architecture into task records that many subagents execute at once in individual worktrees.

optimise for parallelism first. a merge conflict costs minutes. a serialised dependency chain costs hours. take the conflict.

For a shared behavioral change, use the architecture's consumer accounting to assign every required producer and consumer to its existing per-module task. Record unchanged compatibility evidence and accepted exclusions in permitted contract prose. Include the affected ordering, completeness, isolation, or lifetime invariant in the existing acceptance/falsifier fields when relevant. The [merge-readiness reference](../engineering-workflow/references/merge-readiness.md) supplies conditional examples; it does not permit cross-module tasks, new schema fields, or speculative dependencies.

## machine entry and direct handoff

when no machine envelope is supplied, return the canonical handoff `/omnipotence factory.new-project` with the original project root and entry before reading any file or writing any path. when an envelope is supplied, validate and match `projectRoot`, `rootRunId`, `effectKey`, `expectedStateSha256`, `expectedPhase`, `contractFingerprint`, and `payload` as the first operation; a malformed, stale, or mismatched envelope returns a typed blocker before any read or write.

the owning root keeps user questions and product-gate decisions in its session. this skill never calls `ask`, never presents or records gate 4, never writes `.factory/state.json`, and never writes a state-owned approval field. after identity validation, it may read phase inputs and produce only `.factory/tasks.json` and the result.

one invocation crosses only the taskgraph checkpoint. declare the frozen machine result fields exactly: `action: "taskgraph"`, `outcome` (`"complete"`, `"needs-input"`, `"needs-risk-approval"`, or `"blocked"`), `phase: "taskgraph"`, `status`, the verified `stateSha256`, `artifacts`, optional `inputRequest`, optional `riskRequest`, optional `gate_handoff`, and optional `blocker`; use at most one of `inputRequest` or `blocker`. this phase actually uses `inputRequest`, `blocker`, and `gate_handoff`; it does not use `riskRequest`, `gate_control`, or `wave`. phase skills return `gate_handoff` only; `new-project` adds `gate_control` during gate presentation. return no undeclared field.
every `inputRequest` has only `id` matching `^[a-z0-9][a-z0-9._-]{0,63}$`, integer `attempt`, `question`, `responseSchema`, and `required: true`; the owning root records its response before the next phase attempt. a blocker uses only its allowed class, `summary`, and optional `recommended` resolution.

## Source continuity and handoff

This phase is a designated machine action invoked by the validated factory.step controller. The owning root remains accountable for task selection, gate response, state transition, and recovery. This skill never presents a gate, approves a risk, writes .factory/state.json, or turns a worker report into state authority. A designated controller effect may execute this machine action through the installed native context.task route; ordinary task workers are not controllers.

Carry the original run input, explicit factorySkillsRoot when source adoption is selected, same-root committed preflight contractFingerprint, and process, guard, gatekeeper, and blueprint identities through the active envelope. factorySkillsRoot fingerprints the supplied bytes; it does not override native session skill loading, and native task subagents have no per-task skill-pinning override. Prove that the owning session or installation actually selects the matching source bytes for the controller and workers before changed-source adoption. If the source binding or effective loading proof is missing, changed, mismatched, or ambiguous, return a typed blocker before reading or writing the graph. Do not invent a resolver, fingerprint, native receipt, or historical root. State-only recovery after source selection changes is unsupported.

The taskgraph handoff is compact only after the complete approved architecture contract, every module boundary, every shared signature, every acceptance and falsifier, and every wave-0 coverage check are fixed. A summary may point to those exact files and coordinates, but it cannot replace required task fields or contract text. The full contract is passed to factory-waves through the existing task and wave fields.

Task records describe intended scope and the prescribed v1 worktree and branch; they do not prove native allocation or a running attempt. factory-waves must bind actual job, attempt generation, workspace, source, and task identity before dispatch or acceptance. Never guess an allocation, invent a receipt, reuse a task id, or create a competing attempt. If an earlier attempt is unresolved, leave it pending or blocked for wave recovery and do not encode a second attempt in the closed v1 graph schema.


## why contracts must be fixed here

subagents in one wave **cannot talk to each other**. they are independent sessions with independent context. they get one shared `context` block at spawn and nothing after that.

so any interface you do not fix before dispatch gets decided `n` times, independently, by `n` agents who will each pick something reasonable and different.

that — not concurrent edits to the same file — is the real source of merge pain. the harness resolves overlapping edits. it cannot resolve two agents who invented two different error enums.

everything below follows from this.

## 1. one or more tasks per module boundary

start from the module table in `.factory/architecture.md`. each architecture module maps to one or more tasks; the default is one task per module.

split a module into more than one task only when each resulting task owns a distinct, independently verifiable behaviour. every split task sets a non-empty `split_reason` describing why the module needs multiple tasks. never merge two modules into one task, and no task may span modules.

each task gets a stable id: `<nn>-<module-slug>`, for example `03-token-store`.

the id is the subagent name, the branch name, and the probe log filename. it never changes and it is never reused.

## 2. write the contracts, verbatim

for every interface more than one task touches, write the exact text now: the symbols, their types, their error type, and their module path.

that text goes two places, unchanged:

1. into the wave `# Contract` block, so every agent reads the same words
2. into the **wave 0 declaration file**, so every agent compiles against the same declaration

if fixing a contract needs a decision the architecture does not make, make it here and return it in your result to the owning root. `new-project`, the sole `.factory/decisions.md` writer, appends it there as append-only audit context. do not defer it into a task. a deferred contract decision is the failure mode this entire section exists to prevent.

## 3. wave 0 is the contract wave

wave 0 does one thing: it puts the repository into a state where every later task can compile.

it contains:

- the repository skeleton: manifest, module directories, entry point, formatter and linter config
- every frozen contract from the architecture, as **declarations only**: signatures, types, traits, error enums. no function bodies. where the language requires a body, return the typed not-ready error you declared — never a marker token.
- shared types, error enums, and schemas
- the build command, proven to succeed on the declarations

wave 0 is deliberately narrow and it is the only wave that is allowed to be small. it is usually one or two tasks, routed high, because everything downstream inherits its mistakes.

after wave 0 commits to the base ref, every build task branches from a tree where its dependencies already exist as types. that is what makes a consumer and its provider share a wave.

## 4. cut the build waves for maximum parallelism

place a task in the earliest wave where every contract it consumes already exists on disk.

**a task needs its dependency's contract, not its dependency's code.** after wave 0, that is nearly always satisfied. expect wave 1 to be very large. that is the point.

only these force a later wave:

- the task must read code that does not exist yet in order to know what to write
- the task changes a contract another task consumes
- the task's acceptance check needs another task's runtime behaviour

these do **not** force a later wave:

- two tasks edit the same file — declare a hotspot instead, see below
- a task calls another task's function — the declaration compiles
- a task "feels dependent" — score it against the three rules above

do not shrink a wave to avoid a small merge risk. cap a wave only for scheduling: `task.maxConcurrency` decides how many run at once, and the harness queues the rest without changing any id.
the cadence object keeps the project runner and finish smoke command. each wave record must carry exactly one `integration_check` command; it is the sole executable integration command for that wave. never emit `cadence.integration_command`.

## 5. declare the merge hotspots

some files genuinely need more than one writer: a module registry, a route table, a dependency manifest, a top-level `mod.rs` or `index.ts`.

do not serialise those tasks. declare the file:

| path | writers | resolution owner | reason |
| ---- | ------- | ---------------- | ------ |

exactly one task id owns the final resolution, and it is an integration task in a later wave. every writer knows it may be overwritten there, and no writer negotiates with another writer.

a hotspot with two owners is not declared, it is a fight.

## 6. route every task

routing is two-dimensional. read `reference/routing.md` for the full rubric and the machine binding.

- **shape** decides the agent family: research, build, ui, review, security
- **score** decides the strength inside that family: three axes, first-match tier rules

score three axes per build task, then read the tier off the ordered rules. do not route on intuition and do not route everything to the strongest model — a `t4` route on a leaf module starves the genuine `t4` task of budget and wall clock.

### the trust-boundary trigger

tier answers how much breaks if one task is wrong. it does not answer whether the merged wave exposes a boundary, because **a trust boundary is a property of the system, not of a task record.**

set `trust_boundary` on a task when its `target.files` implement a row of the requirements contracts-and-boundaries table, or when its `failure_modes` carry a trust-boundary row from the requirements security table. name the boundary; do not invent one that the requirements do not declare.

then set the wave's `review` from two independent triggers, either sufficient on its own:

| trigger | review |
| --- | --- |
| the wave contains any `t4` task | `security-reviewer` |
| any task in the wave declares a `trust_boundary` | `security-reviewer` |
| neither | `reviewer` |

record `security_reason` with the exact t4 task ids, the exact declared boundaries, or both. a `t2` module that validates an external payload is not a `t4` task and never becomes one — that is the point. the tier is right about reversibility; it was never a claim about exposure.

emit the whole decision so a reviewer can audit the routing and not only the code:

```json
"route": {
  "shape": "build",
  "tier": "t2",
  "agent": "factory-fast",
  "effort": "hi",
  "fallback_agent": "glm-high",
  "ambiguity": 1,
  "blast": 1,
  "reversibility": 0,
  "rationale": "contract fixes the interface; one consumer; pure code",
  "escalate_to": "t3"
}
```

`escalate_to` is exactly one tier higher. it is the route a failed re-dispatch uses.

## 7. write the task record

each entry in `.factory/tasks.json`, validated against `reference/tasks.schema.json`:

```json
{
  "id": "03-token-store",
  "wave": 1,
  "kind": "build",
  "module": "token-store",
  "owns": ["fr-4", "fr-5", "nfr-2"],
  "target": {
    "files": ["src/token/store.rs"],
    "non_goals": ["src/token/refresh.rs is owned by 04-token-refresh"]
  },
  "interface": "pub fn get(&self, k: &Key) -> Result<Token, StoreError>\npub fn put(&mut self, k: Key, t: Token) -> Result<(), StoreError>",
  "consumes": ["01-contracts"],
  "acceptance": [
    "put then get returns the stored token",
    "get on an absent key returns StoreError::Missing, not a panic",
    "a store file truncated mid-write is reported as StoreError::Corrupt and the previous value survives"
  ],
  "failure_modes": ["truncated write", "concurrent put from two handles"],
  "experiment": {
    "input": "a fresh store file plus one put of Key(\"a\")",
    "action": "cargo run --example probe_store",
    "expected": "get returns Ok(Token{v:\"xyz\"})",
    "falsified_by": "get returns Err, or the process panics"
  },
  "cadence": "module-complete",
  "test_budget": 5,
  "worktree": ".worktrees/03-token-store",
  "branch": "task/03-token-store",
  "roles": {
    "implementer": "factory-fast",
    "reviewer": "factory-gatekeeper"
  },
  "route": {
    "shape": "build",
    "tier": "t2",
    "agent": "factory-fast",
    "effort": "hi",
    "fallback_agent": "glm-high",
    "ambiguity": 1,
    "blast": 1,
    "reversibility": 0,
    "rationale": "contract fixes the interface; one consumer; pure code",
    "escalate_to": "t3"
  },
  "status": "pending"
}
```

the rules that make a task executable by an agent with **no project context**:

- `target.files` names exact paths. not globs, not directories
- `target.non_goals` names the neighbouring files another task owns, and says which task id owns them
- `interface` is the verbatim block from step 2. the agent implements it; the agent does not design it
- every `acceptance` entry is observable from outside the module and states a concrete input and a concrete expected result. "handles errors correctly" is not an acceptance criterion
- `experiment` names the falsifying observation before any code exists. an experiment that cannot fail proves nothing
- `failure_modes` comes from the requirements security table, filtered to this module
- `trust_boundary` is set only when the requirements declare the boundary this task sits on. it is absent on most tasks, costs no test budget, and changes the wave's review rather than the task's tier
- `test_budget` equals `len(acceptance) + len(failure_modes)`. this is the ceiling `factory-build` enforces
- `cadence` is the module's class from the architecture document
- `roles.implementer` is the routed build agent; `roles.reviewer` is always `factory-gatekeeper`, the sole pinned acceptance-gate agent. the two must differ, and gate 4 rejects any other reviewer
- root `protected_files` names exact repository-relative paths no task may allowlist in `target.files`. there is no exemption class: a file that legitimately needs more than one writer is a declared hotspot, and a file nobody may touch is protected
- root `global_non_goals` carries the approved requirements' non-goal ids and statements verbatim; factory-waves passes them into every implementer and reviewer dispatch

**a task whose fields you cannot fill in is a task that is not cut small enough.** split it.

## 8. build and report the dispatch preview

gate 4 is a real decision, so return the numbers for `new-project` to present. taskgraph is the sole preview producer. after the final waves, hotspots, and task records are complete, calculate these values once, validate the root `dispatch_preview` verbatim against `reference/tasks.schema.json`, write it to `.factory/tasks.json`, and return `gate_handoff.presentation` as `string[]` containing the exact canonical serialization of that unchanged preview object (including the `dispatch_preview:` label). do not ask `new-project` or another skill to derive, rebuild, normalize, merge, or parse any preview value. `new-project` must preserve the same unchanged object in `gate_control.dispatch_preview`. the object must contain exactly `task_counts`, `tier_histogram`, `widest_wave`, `maxConcurrency`, `parallelism_ratio`, `queued_serialization`, `hotspots`, `barrier`, `maxRuntimeMs`, and `softRequestBudget`.

| field                 | value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| `task_counts`         | total tasks and per-wave task counts                                                    |
| `tier_histogram`      | counts for `t1`, `t2`, `t3`, and `t4`                                                  |
| `widest_wave`         | the widest wave index and its task count                                                |
| maxConcurrency | the live task.maxConcurrency value and how many tasks can run concurrently; validate the closed v1 minimum of 4 before reporting the preview |
| `parallelism_ratio`   | widest-wave task count divided by total task count                                      |
| `queued_serialization` | queued task count and the exact semantics for tasks beyond live concurrency             |
| `hotspots`            | each declared hotspot path and its resolution owner                                     |
| `barrier`             | the wave barrier semantics, including wait-for-all-results before acceptance/integration |
| `maxRuntimeMs`         | the live per-task wall-clock ceiling                                                    |
| `softRequestBudget`    | the live per-task request ceiling                                                       |

a run the user could not price before it started is not unattended. it is unsupervised. return the root `dispatch_preview` object unchanged through `new-project`'s `gate_control.dispatch_preview`; in this phase's result, report the exact canonical serialization in the `gate_handoff.presentation` string array. this is a report of the object already written, not a second computation. also return the exact wave-0 frozen-contract coverage: every frozen architecture contract and the task id that writes it. missing coverage blocks completion.

## verification

- every architecture module maps to one or more tasks, and every build task belongs to exactly one module
- a module with one task omits `split_reason`; a module with more than one task has a non-empty `split_reason` on every task for that module, and each split task has independently verifiable acceptance behaviours
- every task's `roles.reviewer` equals `factory-gatekeeper`, differs from `roles.implementer`, and both are nonempty
- no `target.files` path appears in root `protected_files`
- root `protected_files` and `global_non_goals` are present, and every `target.files` path is repository-relative (no `..`, no absolute path, no glob character, no leading `-`, no control character)
- every task belongs to exactly one architecture module; no task spans modules
- every `fr-` and `nfr-` appears in exactly one task's `owns`
- every id in `consumes` exists, and sits in the same wave or an earlier one
- no two tasks list the same path in `target.files` unless that path is a declared hotspot
- every declared hotspot has exactly one resolution owner, and that owner is an integration task in a later wave
- every frozen contract from the architecture appears in a wave 0 task
- every task has a route block with all three axis scores present
- every wave whose `review` selects `security-reviewer` carries a `security_reason` naming the t4 task ids or the declared trust boundaries that triggered it
- `dispatch_preview` is calculated once from the final task graph, written at the root of `.factory/tasks.json`, and reported verbatim; no other skill produces or recomputes it
- report the wave count, the task count per wave, the parallelism ratio, and any task that could not be routed

## report completion


upon completion of the schema checks and final graph analysis, return the frozen one-checkpoint machine result to the owning root:

```json
{
  "action": "taskgraph",
  "outcome": "complete",
  "phase": "taskgraph",
  "status": "complete",
  "stateSha256": "<verified lowercase 64-character state hash>",
  "artifacts": [
    {
      "role": "primary",
      "path": ".factory/tasks.json",
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  ],
  "gate_handoff": {
    "gate": "wave-0",
    "presentation": [
      "title: <title>",
      "dispatch_preview: <the exact canonical serialization of the object already written at .factory/tasks.json>",
      "frozen-contract coverage: <every architecture contract and its wave-0 task id>"
    ],
    "warnings": []
  }
}
```

the task artifact role, path, schema, stable task ids, frozen contract text, and sha256 shape stay unchanged. the phase reports its computed hash, but `factory.guard` re-hashes the named `.factory/tasks.json` bytes from disk at prepare and its observed value is authoritative. `needs-input` returns only a typed `inputRequest`; `blocked` returns only a typed `blocker` with its allowed class, summary, and recommended resolution. phase skills return `gate_handoff` only; `new-project` adds `gate_control` during gate presentation. the owning `new-project` action applies state changes with a full schema-valid read-modify-write, preserving every existing field. direct or standalone invocation performs no task, audit, artifact, or state write and returns the canonical root-process handoff instead.
