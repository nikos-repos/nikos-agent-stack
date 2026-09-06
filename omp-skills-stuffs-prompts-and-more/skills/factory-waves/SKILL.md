---
name: factory-waves
description: "Execute an admitted factory repository, wave, or finish checkpoint with prescribed workspaces, independent acceptance, integration, and recovery."
argument-hint: "[repository | wave:<index> | finish]"
---

# factory waves

turn `.factory/tasks.json` into merged, evidenced commits.

start only with an approved requirements sheet, an approved architecture, an approved task graph, and an approved wave 0. do not change a frozen contract or the scope. return a blocker to the parent instead.

At integration, reconcile the architecture/task contracts' affected-consumer accounting against the actual merged changes: every required consumer must use the accepted meaning or have concrete compatibility evidence. Do not treat an unresolved required consumer as an optional exclusion. Verify the relevant combined behavior on the current base through the existing integration/finish route. Use [merge readiness](../engineering-workflow/references/merge-readiness.md) when that change involves query, isolation, lifetime, or product-continuity semantics; retain the v1 barrier, per-module ownership, and six acceptance checks.

## entry guard

`factory-waves` is an internal checkpoint worker, not a standalone workflow. if no machine envelope is supplied, return the canonical root-process handoff `/omnipotence factory.new-project` with the original root input (`projectRoot`, `entry`, and optional `factorySkillsRoot`) before reading any artifact or project file. this launcher response creates no factory path, state, worktree, dispatch, merge, or product process.

when an envelope is supplied, its first operation is validating the complete active-root identity: `action`, `projectRoot`, `rootRunId`, `effectKey`, `expectedStateSha256`, `expectedPhase`, `contractFingerprint`, and `payload`. a missing, malformed, stale, or mismatched active envelope returns the frozen step result with `outcome: "blocked"`, `status: "blocked"`, and a typed `blocker` using an allowed blocker class and nonempty summary before reading or writing factory artifacts, creating a worktree, dispatching a task, merging a branch, or launching the product.

the owning `new-project` machine-step supplies the identity fields and payload. validate the active root, effect identity, absolute trusted paths, expected state hash, pinned contract fingerprint, and repository preconditions before crossing a checkpoint. these guard checks remain outside persisted task verdicts. the envelope action and payload must match the selected checkpoint: `repository` uses action `repository`, `wave:<index>` uses action `wave` with the matching active wave, and `finish` uses action `finish`; reject any mode/action/index mismatch before checkpoint work.
only a native-active, guard-verified root effect may supply the envelope. `factory-waves` never creates initial factory state; only the owning `new-project` `bootstrap` action may create it.

## Controller, source, and attempt continuity

The existing factory.step controller effect owns this checkpoint under the active root identity. Its installed native route may delegate the machine-action payload through context.task and then invoke factory.guard; that delegated controller effect is still the root-owned action. This skill never presents a product gate, approves a risk, or writes .factory/state.json. new-project remains the workflow state authority, and ordinary task workers never write factory state.

Source selection is inherited from the original persisted run input and its explicit immutable factorySkillsRoot, same-root committed preflight contractFingerprint, and matching blueprint, process, guard, and gatekeeper identities. factorySkillsRoot fingerprints the supplied bytes; it does not override native session skill loading, and native task subagents have no per-task skill-pinning override. Before reading source-dependent artifacts or dispatching a task, prove through the owning root/step path that the session or installation actually selects the matching bytes for the controller and workers. Missing, changed, mismatched, or ambiguous source binding or unproved effective loading blocks changed-source adoption. Do not invent a resolver or copy a fingerprint from another root. If an old run omitted an explicit root and the binding cannot be recovered, keep the unchanged installation and drain or reconcile it before activation, or use the supported halted/new-root boundary after residual effects are reconciled.

v1 uses the prescribed task worktree and branch from tasks.json: one project-relative .worktrees entry and one stable task id/branch per task. Verify the actual native job, attempt generation, workspace, source, and task identity before dispatch and acceptance; a configured path or display row is not an allocation receipt. Do not create a second worktree when the native job already owns the prescribed workspace, and do not invent a workspace or native receipt. Any alternative capacity or isolation policy remains a separately justified F2 change and does not alter the closed v1 schema here.


accept exactly one checkpoint mode per invocation:

- `repository` owns the local repository checkpoint and uses `repository/init` (or its declared attempt form).
- `wave:<index>` owns one whole wave, including its internal parallel dispatch, barrier, gatekeeping, integration, and review, and uses `wave/<index>` (or its declared attempt form).
- `finish` owns finish verification and uses `finish/verify` (or its declared attempt form).

reject any other mode, including a path-based standalone run or a request to process more than one checkpoint. return the result to `new-project`; do not write `.factory/state.json` here.

## point-of-risk actions

before remote creation, push, publication, visibility change, credential use, worktree cleanup, or restart move, return a `riskRequest` with the exact `id`, `actionKind`, `target`, `parameters`, and `reason`. this includes `visibility-change`, even though it has no state enum. wait for native approval in the owning omp session before executing the action or calling the tool. a background worker cannot approve or execute it. denial proves no mutation. an acknowledged or unknown external outcome remains uncertain: it may already have mutated, must never be resent automatically, and requires explicit `confirm`, `fail`, or `retry` recovery after evidence review.

for `repo-create`, `push`, and `worktree-cleanup`, preserve the matching authoritative state gate when one exists. `publish`, `visibility-change`, `credential-use`, and `restart-move` have no invented state enum; retain their owning-session audit record. `none` means no dedicated state enum, never optional approval.

## 1. the repository checkpoint


inspect the target directory and its git state first.

for a new local repository, use filesystem APIs and argument vectors, never a shell script:

```
run(["git", "init"])
ensure_directory(".worktrees")
append_missing_gitignore_rules(".gitignore", [".factory/", ".factory-archive/", ".worktrees/"])
run(["git", "add", "--", ".gitignore"])
run(["git", "commit", "-m", "chore: initialize repository"])
```
`ensure_directory` creates only a missing directory and rejects symlinks, dangling components, and non-directory entries.
for an existing repository, apply the same `ensure_directory` check to `project_root/.worktrees` before any worktree checkpoint.

`run` receives an argument vector and executes it without a shell. `append_missing_gitignore_rules` reads and writes the file directly; it never interpolates a rule into shell source.

the empty/planning base commit stages only `.gitignore` and gives every worktree a base. it contains no factory metadata.

factory metadata is maintainer-local and never enters git history. keep `.factory/`, `.factory-archive/`, and `.worktrees/` ignored; never `git add` or force-add `.factory` content. state, results, tasks, requirements, architecture, and probe logs remain local.

**the remote is a point-of-risk action.** the harness `github` tool has no repository-creation operation, so this runs through an argument-vector `gh` process. before it runs, prepare a `riskRequest` in the owning omp session with one exact approved action:

- `actionKind: "repo-create"`
- `target: "<owner>/<name>"`
- `parameters`: the exact `owner`, `name`, `visibility`, `source_directory`, `remote_name`, and `push: false`
- `reason`: why this remote is required

validate every approved value before constructing the argv:

- `owner` matches `^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})$`; `name` matches `^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$`; neither contains `/`, `\`, whitespace, a leading `-`, or a control character.
- `visibility` is exactly one of `public` or `private`.
- `remote_name` passes `git check-ref-format` semantics as `refs/remotes/<remote_name>`, has no leading `-`, and has no control character.
- `source_directory` is an existing absolute directory under the project root. resolve the project root and source directory without following a symlink, reject any symlink or dangling component, and require the resolved source path to remain contained by the resolved project root.
- `push` is exactly `false`; every other approved scalar also rejects a leading `-` and control characters before process launch.

return the `riskRequest` and wait for the exact native approval. build one argv with separate entries: `["gh", "repo", "create", owner + "/" + name, visibility_flag, "--source", source_directory, "--remote", remote_name]`, where `visibility_flag` is `--public` or `--private`. execute that argv directly, never through a shell. before invoking `gh`, compare every argv entry with the approved owner, name, visibility, source directory, remote name, and `push: false`; any missing, extra, or mismatched parameter returns a typed `blocker` and performs no remote action. approved parameters never become shell source text.

do not pass `--push` in the same approval. pushing is its own point-of-risk approval at the finish checkpoint.
 
the remote command is intentionally shown as data, not shell syntax:

```
run(["gh", "repo", "create", owner + "/" + name, visibility_flag, "--source", source_directory, "--remote", remote_name])
```

## 2. preflight

validate `.factory/tasks.json` against `skill://factory-taskgraph/reference/tasks.schema.json` before touching anything:

- every task id unique, and matching `^[0-9]{2}-[a-z0-9-]+$`
- the dependency graph is acyclic and every `consumes` id exists
- every task has exactly one route, one worktree, and one branch
- every declared hotspot has exactly one resolution owner, in a later wave
- every task has observable acceptance criteria and an experiment with a `falsified_by`
- no task requires an agent to invent a public contract

**reject a task that makes an agent invent a contract or an acceptance criterion.** that is a taskgraph defect and it fails the whole wave, not one task.

also confirm the harness is configured for this: run `doctor.sh` from the pack root, or check `task.maxConcurrency`, `task.enableEffort`, and `async.enabled` by hand. a wave designed twelve wide that runs four at a time is not broken, but the user should know before it starts.

## 3. named worktrees

one worktree per task id, named after the task id:

```
run(["git", "worktree", "add", "-b", branch, worktree_path, base_ref])
```

validate `base_ref` and `branch` before constructing the argv: apply `git check-ref-format` semantics, reject an empty or option-like value (including any value beginning with `-`), and reject control characters. validate `branch` with branch semantics and `base_ref` with ref semantics; do not accept path traversal, a backslash, a trailing dot, or a component that git would reject. perform those checks through separate argv entries such as `["git", "check-ref-format", "--branch", branch]` and `["git", "check-ref-format", base_ref]`; pass each value as its own argv entry, never as shell text.

create a worktree only when its wave becomes ready.

before creating, resolve `project_root` and `project_root/.worktrees` as existing directories with no symlink or dangling component. resolve `worktree_path` from the task id, require it to be inside the project `.worktrees` directory, and reject any symlink, dangling component, or path that escapes that directory. verify the branch does not already exist with unrelated work, and no two tasks share a worktree. all path and task-id values reject leading dashes and control characters.

the first commit must include the `.worktrees/` rule; section 1 adds it with the other maintainer metadata rules.

**why explicit worktrees and not `isolated: true`.** the harness has native task isolation, and it is faster on a large repository because it can use a copy-on-write backend. it names its directories `t<hex-digest>`, derived from a hash of the repo root and the task id, and that naming is not configurable. it also requires `task.isolation.mode` to be set to something other than `none`, and on a default install it is `none`, which means the `isolated` field does not even appear in the task schema.

explicit worktrees cost one `git worktree add` per task and give you: the required directory name, a real branch per task id, a tree you can `cd` into and inspect while the agent is still running, and a failed attempt that survives for diagnosis.

neither approach enforces file ownership — an isolated agent can still edit another task's file inside its own copy. ownership is enforced in section 6, after the fact, against the changed-file manifest. that check is the real control, and it works the same either way.

use native isolation instead only when `git worktree add` is measurably slow on the repository. the tradeoff is the directory name.

## 4. wave checkpoint: dispatch

**one `task` call per wave. batch shape. every task in one `tasks[]` array.**

never serialise a batch to avoid file overlap. concurrent edits auto-resolve, the wave contract already fixes the interfaces, and the hotspots are already declared with an owner.

one `wave:<index>` effect owns the complete internal batch dispatch. do not split routing, task result schemas, or merge logic into omnipotence, and do not start a second checkpoint while this effect is unresolved.

### the shared context

```
# Goal
<the wave goal, in requirement ids>

# Constraints
work only inside your assigned worktree path. every read, write, command, and commit happens there.
implement only your assigned task id. do not edit a file another task id owns.
do not run project-wide tests, formatters, or linters. the orchestrator runs those at wave end.
follow skill://factory-build: contract, falsifier, draft, probe, freeze, prove.
write the probe log before you write any test.
do not ask the user anything. return a typed blocker instead.
do not spawn subagents. do not push. do not touch the remote.
implement only the global non-goals: never touch what a `global_non_goals` entry forbids.
escalate rather than change any signature under # Contract.

# Contract
<every shared signature from tasks.json, verbatim>
```

### each item

| field          | value                                                                |
| -------------- | -------------------------------------------------------------------- |
| `name`         | the task id, exactly                                                 |
| `agent`        | `route.agent` from the task record                                   |
| `effort`       | `route.effort` from the task record                                  |
| `task`         | the task record rendered as `# Target` / `# Change` / `# Acceptance` |
| `outputSchema` | `$defs.agent_result` from `factory-waves/reference/result.schema.json`, with strict mode |
| `schemaMode`   | `strict`                                                             |

pass `.factory/requirements.md` and `.factory/architecture.md` by `local://` uri. never inline them; they are large and every agent would pay for them.

also carry the root `global_non_goals` array and the task's own record into every implementer and reviewer dispatch. a non-goal is a boundary, not a suggestion.

### the result contract

read `factory-waves/reference/result.schema.json` and set `outputSchema` to its `$defs.agent_result` node. use `schemaMode: strict`; do not copy or inline the schema here.

a result with no changed-file manifest is a failed result regardless of what it claims.

## 5. wave checkpoint: hold the barrier

**this step is not optional and it is easy to miss.**

`async.enabled` is true on this machine, so a batch `task` call returns **immediately** with a list of spawned agent ids and job ids. it does not return results. the results arrive later, as separate injections.

if you go straight to the acceptance gate, you will gate on nothing.

after dispatching, block on the wave:

```
hub  op: "wait"  ids: [<every job id from the dispatch>]  timeoutMs: 0
```

`wait` returns when a job settles **or** when the poll window elapses, so it can come back with tasks still running. loop until every watched job appears under `## Completed`. an all-running snapshot is flagged useless — call `wait` again.

while waiting: a failed job lands `failed` but the agent stays interrogable. read `history://<id>` for its transcript and `agent://<id>` for its full output.

the dispatch and barrier are one wave effect. wait until every spawned job settles before running the acceptance gate; an all-running snapshot is not a barrier result.

built-in ceilings that bound a runaway wave, so a hung agent cannot block the barrier forever:

| setting                  | effect                                      |
| ------------------------ | ------------------------------------------- |
| `task.maxRuntimeMs`      | wall-clock kill per task, 1 hour by default |
| `task.softRequestBudget` | request budget per task, 200 by default     |
| `task.maxConcurrency`    | how many of the wave actually run at once   |

## 6. the acceptance gate

dispatch exactly one `factory-gatekeeper` for each settled job, and require that task record's `roles.reviewer` to equal `factory-gatekeeper`, the sole pinned acceptance-gate agent, before normalizing that job into one gate input. a returned agent result is passed unchanged only when it is complete and schema-valid. a settled failure with no result, or with a malformed result, is synthesized as one strict failed agent result for its task record, with the expected probe-log path, `status: "failed"`, `changed_files: []`, `acceptance_results: []`, `commands_run: []`, and machine-supplied `tests_written: 0`, a nonempty `tests_omitted` reason, an empty `commit`, and `blocker: {type: "resultless-failure", reason: "<settled failure or malformed result reason>", details: "<job evidence>"}`. pass the normalized input, its task record, the project root, and `factory-waves/reference/result.schema.json` to the one gatekeeper. never skip a resultless job or dispatch a competing gatekeeper.


the `factory-gatekeeper` agent alone executes the six checks, owns their order, and writes the one strict result record to `<project>/.factory/results/<task-id>.json`, validated against `factory-waves/reference/result.schema.json`. this skill only dispatches it, normalizes its input, and holds the barrier: require that persisted result file for every settled task, including resultless failures, before any branch integration, review, or base-ref update. the persisted `checks` array is exactly the six verdict fields of the result schema, once each; never invent another check name or verdict property, and keep frozen-contract, repository-precondition, integration, review, and resume checks outside the persisted verdict fields. the schema's optional `contributing_factors` is diagnostic evidence recorded beside the verdict; it is neither a check nor a verdict property, and it never selects the failure route. missing or contradictory evidence fails the task.


classify every failure before responding:

for a contract defect, use the contract-defect routing test in the failure table below; do not route by where the defect surfaced.

| class              | response                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| task defect        | re-dispatch the same task id, same worktree, one tier up, failure report appended                                                                                                                                            |
| contract defect    | apply the contract-defect routing test: if the approved architecture contract is correct but the tasks or wave copied or instantiated it incorrectly (transcription defect), return to factory-taskgraph and re-cut the affected tasks/waves; if the approved architecture contract is wrong or incomplete (design defect), return to gate 3 and invalidate only its dependents |
| environment defect | fix the environment in the orchestrator, then re-dispatch unchanged                                                                                                                           |
| external blocker   | escalate to the user with the exact missing input and a recommended option                                                                                                                  |

never spawn a second agent for the same task id as a competing attempt. one task id, one owner, always.
**one class routes the failure; it is rarely the only condition that produced it.** the table above stays single-valued because routing must be deterministic. alongside it, the gatekeeper records every other condition it can evidence in the persisted `contributing_factors`, using the same vocabulary without authority: an ambiguous contract, a tier below the work, or a missing environment prerequisite. a factor with no observation behind it is not recorded.

read the persisted `contributing_factors` before a task-defect re-dispatch and append them to the raised-tier failure report. a second attempt that changes only the model repeats the first attempt with more budget: when a contract or environment factor is recorded, resolve that factor first and route by the table above, which may send the failure to taskgraph or gate 3 instead of one tier up.

a task defect may be re-dispatched once, for the same task id and worktree, at one tier higher. if that raised-tier attempt fails, stop the task and report the failure; never vary agents again or create a competing task attempt.


### retry and unresolved attempts

An agent timeout, wrapper failure, parent disconnect, or late result is not native terminal proof. Before re-dispatching the same task id and prescribed worktree, require an exact native terminal or cancellation receipt, settled cleanup and workspace release, and reconciled external effects. Reject late results from an older attempt generation.

If that evidence is unavailable, keep the attempt quarantined in existing task, run, result, and handoff evidence with its owner, native job/lifetime, source and attempt generation, workspace, and unresolved cleanup/effect status. Quarantine has no automatic expiry; it cannot be reused, integrated, or treated as successful cleanup. An isolated retry is unavailable unless evidence shows the old attempt cannot write the new scope or repeat an external action. Do not create a competing task id or hide the unresolved attempt in a prose receipt.
## 7. integrate

when every result in a wave passes the acceptance gate:

do not merge or advance `base_ref` until every settled task has a persisted passing result file. do not advance `base_ref` until the current wave's `integration_check` succeeds.

1. merge task branches into `base_ref` **in dependency order**
2. **the orchestrator resolves every conflict, against the wave `# Contract`.** the contract is the authority. never ask two agents to renegotiate: they cannot talk to each other, which is why the contract was fixed in the first place
3. a declared hotspot is resolved by its named resolution owner and by nobody else. record what was resolved and why
4. run exactly the current wave's `integration_check` on the merged tree; it is the sole executable integration command for the wave. do not read or execute a project-level integration command from `cadence`
5. run exactly the reviewer set declared by the current `tasks.json` wave's `review` field (`reviewer`, `security-reviewer`, `both`, or `none`). when that field is absent, use the standing rule unchanged: `reviewer` always, and add `security-reviewer` when any wave task is `t4`. `security-reviewer` is equally mandatory when any task in the wave declares a `trust_boundary`, whatever its tier — **a trust boundary is a property of the merged tree, not of a task record, and three `t2` modules can each pass their own gate and still meet at an exposed seam.** when security review runs, record the wave's `security_reason` with the review result
6. update `base_ref` to the merged commit, so the next wave branches from finished work
7. return the wave completion record to new-project; new-project writes the wave record into `.factory/state.json`

return exactly one `wave` record to `new-project` using the state-schema field names without renaming, dropping, or adding fields:

```ts
interface waverecord {
  index: number;
  status: "pending" | "dispatched" | "accepted" | "integrated" | "failed";
  task_ids: string[];
  dispatched_at?: string;
  merge_commit?: string;
  integration_result?: string;
  review_result?: string;
  conflicts_resolved?: string[];
}
```

include `dispatched_at`, `merge_commit`, `integration_result`, `review_result`, and `conflicts_resolved` only when each field exists, and preserve their values verbatim. `new-project` is the sole writer of the matching `.factory/state.json` wave record.

if integration exposes a contract defect, use the contract-defect routing test in the failure table above. **do not patch every caller around a broken shared seam** — that converts one bad contract into `n` bad workarounds.

## 8. finish checkpoint

after the last build wave:

run this section only for the `finish` checkpoint after the final integrated wave. finish owns the one merged-product smoke run; task agents and wave checkpoints never launch the product-level entry point.

run the project-level suite at the `release-gate` cadence and run security, migration, accessibility, or performance evidence where a requirement demands it. The installed finish consumer requires exactly five structured, nonempty records on every project: release, smoke, primary journey, critical failure, and traceability. A release record is required even when the approved requirements sheet names no release surface. Write exactly those five records and return exactly those five `artifacts` entries in the listed array order through the existing channel to `new-project`; if release evidence is unavailable or invalid, return a typed contract blocker. Do not omit release.json, invent evidence, or claim that a skip passes.

- `{ "role": "agent", "path": ".factory/evidence/finish/release.json", "sha256": "<lowercase 64-character hash>" }` — always required; include the release-gate command, observed result, and merged commit
- `{ "role": "agent", "path": ".factory/evidence/finish/smoke.json", "sha256": "<lowercase 64-character hash>" }`
- `{ "role": "agent", "path": ".factory/evidence/finish/primary-journey.json", "sha256": "<lowercase 64-character hash>" }`
- `{ "role": "agent", "path": ".factory/evidence/finish/critical-failure.json", "sha256": "<lowercase 64-character hash>" }`
- `{ "role": "agent", "path": ".factory/evidence/finish/traceability.json", "sha256": "<lowercase 64-character hash>" }`

the `artifacts` array uses only the frozen `role`, `path`, and phase-computed `sha256` fields. `factory.guard` re-hashes every named finish artifact from bytes on disk at prepare and its observed value is authoritative. it contains no extra finish artifact, path, or field. each referenced file carries its fixed kind and `result: "pass"`:

- `.factory/evidence/finish/release.json` (`kind: "release"`): release-gate command, observed result, and merged commit — always required; missing or invalid evidence blocks completion
- `.factory/evidence/finish/smoke.json` (`kind: "smoke"`): the one real `cadence.smoke_command` invocation and observed output
- `.factory/evidence/finish/primary-journey.json` (`kind: "primary-journey"`): the observed primary journey steps and result
- `.factory/evidence/finish/critical-failure.json` (`kind: "critical-failure"`): one critical failure path, expected failure, and observed result
- `.factory/evidence/finish/traceability.json` (`kind: "fr-nfr-traceability"`): every `fr-` and `nfr-` id mapped to a task with a passing persisted result

each record has nonempty command or observation evidence, and only traceability contains the requirement-to-task mapping. `new-project` consumes this exact five-entry contract — release, smoke, primary journey, critical failure, and traceability — and validates that every fixed path is readable, hash-matches the guard-observed artifact entry, appears exactly once, uses the expected kind, and contains complete evidence. any missing, extra, duplicate, malformed, contradictory, or incomplete record or path blocks with a typed blocker; it never ignores extra evidence, returns completion, or writes complete state.

the merged-tree finish gate owns the one real smoke run. launch the real product entry point once with `cadence.smoke_command`, then observe the primary journey and one critical failure path. task agents do not launch the product-level entry point. confirm unresolved risks and deferred work explicitly.

### the closing postmortem

**this section adds no finish evidence record.** the finish artifact contract above stays exactly five entries — release, smoke, primary journey, critical failure, and traceability — with exactly the frozen `role`, `path`, and `sha256` fields. the phase may report computed hashes, but `factory.guard` re-hashes the bytes at prepare and its observed values are authoritative. the postmortem is maintainer-local, is written under the ignored `.factory/` path, is never returned in `artifacts`, and never blocks or gates completion. a missing or unwritable postmortem is reported, not a blocker.

the run already produced this evidence and currently discards it. write `.factory/postmortem.md` from what is on disk. read nothing that is not already there, and dispatch no agent to produce it.

**failure corpus.** read every `.factory/results/<task-id>.json` whose `verdict` is `fail`. for each: the task id, its route tier, its `failure_class`, any `contributing_factors`, whether a raised-tier re-dispatch rescued it, and the path of its retained worktree. a worktree kept for a reproduction nobody opens is storage, not evidence.

**rulings candidates.** read `.factory/decisions.md` and list the contract decisions `new-project` recorded there from `factory-taskgraph`'s section 2 — the decisions the architecture did not make, made once under dispatch pressure. each is a candidate to be answered once in the architecture template or this skill pack rather than again on the next project of the same shape.

```markdown
# postmortem: <project>

## failure corpus
| task id | tier | failure class | contributing factors | rescued at | worktree |
|---|---|---|---|---|---|

## rulings candidates
| decision | made at | would belong in | recurs when |
|---|---|---|---|

## not promoted
<candidates deliberately left as one-off decisions, and why>
```

**a candidate is a proposal, not a rule.** this file grants no authority, amends no skill, and is never read as approval. a maintainer promotes an entry by editing the pack; nothing here promotes itself. do not import a ruling from another project into this file: the precedent worth keeping is the one this run actually produced.

only after `new-project` validates every required finish record may this checkpoint return completion evidence. then, and only then, return a fresh `riskRequest` for pushing. show the remote and branch; derive any commit and changed-file counts from git rather than accepting model-reported numbers; do not push until the owning omp session approves the exact action.

## 9. worktree cleanup

worktrees are cheap and evidence is not. keep them by default.

remove one only when all three hold: its branch is merged, its task is `integrated`, and the user approved the removal.

**always keep a failed worktree.** it holds the only reproduction you have.

cleanup is a point-of-risk action. before removing a worktree or pruning metadata, return `riskRequest.actionKind: "worktree-cleanup"` with the exact target and parameters and wait for owning-session approval. never clean a failed worktree.

cleanup uses separate argv entries and no shell interpolation:

```
run(["git", "-C", project_root, "worktree", "remove", worktree_path])
run(["git", "-C", project_root, "worktree", "prune"])
```

use `--` for git commands that support it when a path follows options (for example, `["git", "add", "--", ".gitignore"]` above). do not insert an unsupported separator; validate and resolve every path before launch instead.

## resume

resume admission belongs to the root: only `new-project` admits a resumed run, validates its state, and picks the boundary. this section is wave-local recovery inside an admitted run.

on `resume`:
before interpreting state or results, recover the original persisted run input and source binding through the owning root. Require explicit factorySkillsRoot, same-root preflight fingerprint, matching source bytes and process/guard/gatekeeper/blueprint identities, plus proof that the owning session or installation actually selects those bytes for the controller and workers; factorySkillsRoot is only a fingerprint and does not override native session skill loading. If effective loading cannot be proved, retain unchanged-source operation and drain or reconcile old runs, or use the supported halted/new-root boundary after residual effects are reconciled. State-only resume after source selection changes is unsupported.

1. read `.factory/state.json`, re-hash every recorded artifact, and require the current `.factory/tasks.json` hash to match the authoritative task-graph artifact before interpreting any result.
2. read `.factory/results/` and validate every candidate result against the authoritative `persisted_result` schema with undeclared fields rejected. require either a strict passing record with `verdict: "pass"`, `failure_class: null`, and exactly one passing check for each of the six names `identity`, `ownership`, `probe-log`, `acceptance`, `budget`, and `cadence`, or a strict failed record with `verdict: "fail"` and its schema-required non-null `failure_class`. only the passing form becomes accepted; the failed form remains unaccepted and follows failure routing.
3. bind each result to the current task graph: the result file must be exactly `.factory/results/<task-id>.json`, its `task_id` must match the filename, and that id must match exactly one task record in the current `.factory/tasks.json`. a missing, duplicate, stale, malformed, task-id-mismatched, or graph-mismatched record is a blocker before dispatch. a schema-valid `verdict: "fail"` record remains unaccepted and follows the failure routing; no non-pass result can be accepted or skip its task.
4. reconcile `git worktree list` against `tasks.json`: an orphan worktree with no valid passing result is a task that died mid-flight.
5. re-dispatch only tasks that have no accepted result, and never re-run a valid accepted task or an integrated wave.

resume is an active-root recovery path, not a standalone entry mode. reconcile the committed effect with `.factory/state.json` before dispatch. accepted tasks and integrated waves are terminal for dispatch: return their existing validated evidence or wave record and never re-run them. only a task without an accepted result may be dispatched, and only a wave without an integrated record may be integrated.

if restart requires moving or archiving worktree or factory data, stop and return `riskRequest.actionKind: "restart-move"` before mutation.

## verification

before reporting the run complete:

- one accepted result per implemented task id
- one commit per task branch, and no unmerged required branch
- no dirty worktree
- every acceptance criterion has evidence, and every evidence line names a command that was actually run in this session
- the smoke run was observed, not inferred

the `repository`, `wave:<index>`, and `finish` checkpoints each return their result to `new-project`; no checkpoint writes product state directly.

## report completion

the active root receives the completion result through `new-project`, so this skill does not emit a standalone completion record or perform a standalone schema-valid state write. for a completed wave, return the frozen step output with its `wave` property containing only the exact `wave` record above. for `finish`, return the five validated finish evidence artifact entries and completion status through the existing step output; `new-project` alone decides and records product completion.

an artifacts entry has `role` (`primary`, `human`, or `agent`), `path`, and a phase-computed lowercase 64-character `sha256`; `factory.guard` re-hashes the named bytes at prepare and supplies the authoritative value. requirements and architecture return both `human` and `agent` entries. during an orchestrated run, return the record to `new-project` and do not read or write `<project>/.factory/state.json`. `new-project` is the only writer and applies the record with a full schema-valid read-modify-write, preserving every existing field.


