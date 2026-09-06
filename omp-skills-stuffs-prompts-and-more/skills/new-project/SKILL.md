---
name: new-project
description: "Run the admitted factory from a product idea, specification, or retained run through four product gates and verified delivery. Own workflow admission, state transitions, and source-bound recovery."
argument-hint: "[rough idea, path to a spec, or 'resume']"
---

# new project

drive one rough idea to a working repository through an orchestrated `factory.new-project` root run and one-checkpoint `factory.step` actions.

this skill is the orchestrator. it does not interview, research, architect, decompose, or write product code directly. it owns:

1. the launcher guard and root entry
2. the four product gates
3. the durable factory state and its schema-valid writes
4. the escalation and point-of-risk approval rules

direct `/new-project` input is launcher-only, including user-supplied machine-shaped fields. the native guard is the sole authority boundary: it must prove an active `factory.new-project` root effect identity before machine-step mode or any factory action is allowed. return the canonical command:

`/omnipotence factory.new-project`

the launcher creates no `.factory` path, writes no factory file, asks no product gate, moves no restart data, and dispatches no phase skill. do not continue an interrupted legacy run directly; enroll it with `entry.kind: "resume"` through the canonical root process.

after the native guard proves that active root effect identity, a supplied machine envelope with missing or mismatched identity, stale state, untrusted roots, source drift, or invalid action data returns a typed blocker before mutation. without that proof, even machine-shaped fields are launcher input, not a machine envelope, and return the canonical command.

the root process allows `babysit` and `yolo`, with every product decision at a required breakpoint. `plan` is a non-executing first-effect preview. reject `forever` at run start before any factory mutation or task dispatch.

## pre-admission route and context handoff

Before `bootstrap` or resume admission, select the smallest sufficient route from the supplied objective and evidence. Use ordinary native OMP or engineering-workflow work for a routine, understood change. Use the full factory route only when the work needs its multi-phase artifacts, closed contracts, product gates, and durable recovery. Once a run is admitted as a factory, route selection cannot exempt it from those phases or gates. Record the route, owner, project and source revision, writable scope, expected artifact, acceptance proof, limits, escalation path, and material unknowns in the root's existing handoff/evidence record, using only fields permitted by its closed input schema; do not infer them from a child summary.

Before admission, identify how the existing five mandatory finish records can be obtained with the available environment, owner, and authority. Surface a missing required release or other finish capability through the existing handoff/blocker route; do not waive a record or fabricate proof. Distinguish the factory release evidence from deployed health, and include actual operation only when the authorized task requires it. This adds no input field, product gate, or finish record.

Every phase handoff names the exact input and source basis, owner and next consumer, immutable contract and exit checks, output artifact paths and hashes, unresolved blockers or effects, and freshness. Compact context only after that contract and its exit checks are complete. A summary may point to the authoritative artifact and coordinates, but it cannot replace required fields, rows, probes, approvals, or native receipts. On resume, recover the original persisted input and current authority/source evidence before acting; chat history, display cards, and missing summaries never select a source or grant approval.

## root and machine contracts
the canonical root input is:

```ts
type factoryentrykind =
  | "rough-idea"
  | "spec"
  | "final-requirements"
  | "resume"
  | "restart";

interface factoryrootinput {
  projectRoot: string;
  entry: {
    kind: factoryentrykind;
    value?: string;
  };
  factorySkillsRoot?: string;
}
```

`projectRoot` and `factorySkillsRoot` must be absolute trusted roots. when omitted, `factorySkillsRoot` defaults to the skills directory under the native agent directory (`PI_CODING_AGENT_DIR` when set, otherwise `.omp/agent` under the native home directory). factory state, results, artifacts, worktrees, and product paths must remain inside `projectRoot`; the supplied skill and schema files being fingerprinted must remain inside `factorySkillsRoot`. reject symlink or traversal escape from either root. rough ideas, specs, and final requirements require absent factory state. `resume` and `restart` require existing schema-valid factory state.
For a new source adoption, the owning run input must carry an explicit immutable absolute `factorySkillsRoot`. That root identifies and fingerprints the supplied bytes; it does not by itself override native skill loading. Native task subagents inherit the skills discovered or provided by their session, and there is no per-task skill-pinning override. The installation default is a current-installation baseline only; it is not evidence that an old run is bound to that source. Before changed-source adoption, prove that the owning session or installation actually selects the matching source bytes for every controller and worker that needs them, or retain unchanged-source operation and drain or reconcile old runs. The engine run id retains the original input and its same-root committed preflight evidence. A changed-source resume cannot use state.json alone.

the root returns:

```ts
interface factoryrootoutput {
  status: "complete";
  projectRoot: string;
  factoryStateSha256: string;
  completedGate?: "thesis" | "requirements" | "architecture" | "wave-0";
  completedWave?: number;
  summary: string;
}
```

internal machine mode accepts exactly one action per invocation:

```ts
type factorystepaction =
  | "bootstrap"
  | "discovery"
  | "recon"
  | "requirements"
  | "architecture"
  | "taskgraph"
  | "gate-present"
  | "gate-record"
  | "repository"
  | "wave"
  | "finish"
  | "restart-prepare"
  | "verify";

interface factorystepinput {
  action: factorystepaction;
  projectRoot: string;
  rootRunId: string;
  effectKey: string;
  expectedStateSha256: string | null;
  expectedPhase:
    | "discovery"
    | "recon"
    | "thesis"
    | "requirements"
    | "architecture"
    | "taskgraph"
    | "execution"
    | "finish";
  contractFingerprint: string;
  payload: jsonvalue;
}
```

the launcher guard runs before machine parsing. only after the native guard proves an active `factory.new-project` root effect identity does machine mode require an active `rootRunId`, `effectKey`, `expectedStateSha256`, and `contractFingerprint`; a machine envelope with missing or mismatched identity, stale state hashes, untrusted roots, invalid action data, or source-fingerprint drift returns a typed blocker before mutation. pin the active factory skill and schema hashes in the first committed `contractFingerprint`; that pinned skills-and-schemas hash is the single definition of the source fingerprint, and a changed pinned source blocks dispatch.
`expectedStateSha256` may be null only for `bootstrap` when state is absent; every existing-state action requires the exact current hash.

the typed machine result is:

```ts
interface artifactevidence {
  role: "primary" | "human" | "agent";
  path: string;
  sha256: string;
}

interface inputrequest {
  id: string;
  attempt: number;
  question: string;
  responseSchema: jsonschema;
  required: true;
}

interface riskrequest {
  id: string;
  actionKind:
    | "public-research"
    | "repo-create"
    | "push"
    | "publish"
    | "visibility-change"
    | "credential-use"
    | "worktree-cleanup"
    | "restart-move";
  target: string;
  parameters: jsonvalue;
  reason: string;
}

interface factorystepoutput {
  action: factorystepaction;
  outcome: "complete" | "needs-input" | "needs-risk-approval" | "blocked";
  phase: factorystepinput["expectedPhase"];
  status: "active" | "awaiting-approval" | "blocked" | "cancelled" | "complete";
  stateSha256: string;
  artifacts: artifactevidence[];
  inputRequest?: inputrequest;
  riskRequest?: riskrequest;
  gate_handoff?: {
    gate: "thesis" | "requirements" | "architecture" | "wave-0";
    presentation: string[];
    warnings: string[];
  };
  gate_control?: {
    gate: "thesis" | "requirements" | "architecture" | "wave-0";
    checkedArtifacts: artifactevidence[];
    allowedDecisions: ("approved" | "rejected" | "revised" | "stopped" | "pivoted")[];
    invalidationBoundary: factorystepinput["expectedPhase"][];
    dispatch_preview?: jsonvalue;
  };
  wave?: {
    index: number;
    status: "pending" | "dispatched" | "accepted" | "integrated" | "failed";
    task_ids: string[];
    dispatched_at?: string;
    merge_commit?: string;
    integration_result?: string;
    review_result?: string;
    conflicts_resolved?: string[];
  };
  blocker?: {
    class: "task-defect" | "contract-defect" | "environment" | "external" | "product-choice" | "approval";
    summary: string;
    recommended?: string;
  };
}
```

every object rejects undeclared fields and every sha256 is 64 lowercase hexadecimal characters. The owning root effect validates one factory.step controller action at a time. The installed native route may delegate that validated machine-action payload through context.task before factory.guard checks the result; this delegated controller effect remains under the owning root identity and expected state hash. Ordinary phase workers are not controllers, cannot present gates, cannot approve risk, and cannot write factory state.

### machine actions

`bootstrap` is the sole state-creation action. for a rough idea or spec, require absent factory state and create the initial schema-valid `.factory/` and `.factory/results/` directories and `.factory/state.json` through `new-project`. for a final-requirements entry, the same single `bootstrap` machine action also reads the supplied source, normalizes it exactly once, validates ids and references, writes both requirement artifacts, and creates the awaiting gate-2 state; it does not ask a gate or invoke a phase. for `resume` and `restart` admission, require existing schema-valid state and block a missing state before any action. after an approved restart move archives the old state, the restarted run may enter a fresh `bootstrap` action with absent state. no other action creates the state directory or state file.

prepare actions for the ordinary phase route invoke one existing phase skill, verify its completion record, and have `factory.guard` re-hash every returned artifact from bytes on disk at prepare before the existing full schema-valid state read-modify-write preserves every existing field and returns the exact new state hash. phase skills own phase artifacts but never write `.factory/state.json`. the final-requirements route has no separate `requirements` prepare action.
`verify` is the existing machine action and the sole writer for artifact-drift invalidation. `factory.guard` remains read-only: on resume preflight, an in-root declared artifact whose bytes no longer match its recorded sha256 produces typed drift evidence; the guard does not write state, rewrite an artifact, or dispatch a phase. a path, traversal, or symlink escape is a typed blocker, never drift evidence and never an invalidation.

the root must not dispatch downstream work while drift evidence is pending. it invokes `verify` with that guard evidence, the exact prior `expectedStateSha256`, the exact `previousState` snapshot of the current schema-valid state, the pinned same-root preflight fingerprint, and the frozen effect key `phase/<affected-phase>/attempt/<n>`. `previousState` is payload-only evidence, not a new state or action field. `verify` validates the evidence against the current in-root regular file and recorded artifact, rejects stale state or mismatched observed bytes, then performs one full schema-valid state read-modify-write through `new-project`. after the write, re-read the state and prove `preserve-upstream`: every unrelated field and every upstream approval is byte-identical to `previousState`; also prove `reset-only-downstream`: only the drifted artifact, its fixed downstream artifact records, product-gate decisions at and below the boundary, dependent wave records, and downstream execution state changed. a failed post-write proof blocks completion. `verify` creates no product artifact or other product file, returns the new state hash, and the root then restarts at the earliest invalidated boundary.

the fixed drift boundaries are:

| drifted declared artifact | earliest rerun boundary | affected product gate | reset or rerun scope |
| --- | --- | --- | --- |
| `.factory/brief.md` | `recon` | `thesis` | brief, recon, thesis, requirements, architecture, tasks, wave-0, and execution |
| `.factory/recon.md` | `recon` | `thesis` | recon, thesis, requirements, architecture, tasks, wave-0, and execution |
| `.factory/requirements.html` or `.factory/requirements.md` | `requirements` | `requirements` | both requirements artifacts, requirements, architecture, tasks, wave-0, and execution |
| `.factory/architecture.html` or `.factory/architecture.md` | `architecture` | `architecture` | both architecture artifacts, architecture, tasks, wave-0, and execution |
| `.factory/tasks.json` | `taskgraph` | `wave-0` | tasks, wave-0, and execution |

the boundary names are the restart phase, not new schema values or actions. `verify` removes or resets only product-gate records at and below that boundary and downstream wave or risk state; it retains all upstream gate approvals. a malformed, out-of-root, symlinked, or ambiguous report blocks without a state write.

the source fingerprint is the hash returned by the same-root committed preflight and carried by the active run. It fingerprints the supplied source bytes and is not a native per-task loader override. Before adoption, verify effective session or installation source selection; if the loaded bytes cannot be proved, retain unchanged-source operation and drain or reconcile old runs. do not add a state field or use a fingerprint persisted by another root.

the `verify` action is also used for the existing finish verification path; artifact-drift invalidation is its only state-writing drift path.

the `finish` machine action is the finish-evidence consumer. before it writes any state, calls completion, or returns `outcome: "complete"`, consume the `factory-waves` result through the existing `factorystepoutput.artifacts` field. require the result itself to have `action: "finish"`, `phase: "finish"`, `outcome: "complete"`, and `status: "complete"`. require exactly five entries, in the fixed array order and paths below — release, smoke, primary journey, critical failure, and traceability — with no extra fields and only the frozen `role`, `path`, and `sha256` fields in each entry; every role must be `"agent"`. duplicate, missing, extra, or inapplicable entries are blockers. A missing or invalid release record is a typed contract blocker even when the approved requirements sheet names no release surface; never omit it, invent evidence, or treat a skip as pass.

- `.factory/evidence/finish/release.json` — `kind: "release"` (always required; release-gate command, observed result, and merged commit)
- `.factory/evidence/finish/smoke.json` — `kind: "smoke"`
- `.factory/evidence/finish/primary-journey.json` — `kind: "primary-journey"`
- `.factory/evidence/finish/critical-failure.json` — `kind: "critical-failure"`
- `.factory/evidence/finish/traceability.json` — `kind: "fr-nfr-traceability"`

for every entry, validate the frozen artifact-entry shape and role enum, resolve the project-relative path inside the trusted `projectRoot`, require a readable regular file, recompute its sha256 from the file bytes, and compare it with the returned lowercase 64-character `sha256`. parse the file as one structured json record, reject malformed json or undeclared record fields, require its path's fixed `kind` and `result: "pass"`, and require nonempty command or observation evidence. release evidence must include the release-gate command, observed result, and merged commit; smoke evidence must include exactly one real `cadence.smoke_command` invocation and observed output; primary-journey evidence must include the observed journey steps and result; critical-failure evidence must include one failure path, expected failure, and observed result. traceability must contain a complete mapping for every `fr-` and `nfr-` requirement to a task whose persisted result is `verdict: "pass"`; no other record may contain that mapping. reject evidence that is failed, incomplete, contradictory to `result: "pass"` or to the persisted task result, unreadable, hash-mismatched, malformed, duplicated, missing, or extra. return `outcome: "blocked"`, `status: "blocked"`, and a typed `blocker` with `class: "contract-defect"` for every rejection; do not perform a state write, and never write `status: "complete"` on this path.

only after every required record passes those checks may `new-project` perform its existing full schema-valid state read-modify-write and return completion. preserve the existing state schema and every existing field; `new-project` remains the sole `.factory/state.json` writer and does not add a finish-specific state or `factorystepoutput` field.

`gate-present` returns `gate_handoff` and `gate_control` without asking the user or recording a decision. include ordered artifact paths and hashes, `presentation`, `warnings`, allowed state decisions, the invalidation boundary, and (for wave-0) the verbatim `dispatch_preview`. do not derive, normalize, merge, or rebuild that preview; confirm that every frozen architecture contract appears in a wave-0 task.

`gate-record` requires the exact prior state hash and exact breakpoint response. validate the closed gate labels before dispatching a record or writing any file. an invalid label leaves `.factory` and `.factory/state.json` byte-identical, appends no audit note, and uses the next deterministic breakpoint attempt key `gate/<gate>/decision/<n+1>`; never reuse the invalid attempt key. for a valid response, map it to the closed state enum before branching, append an audit note containing the exact response label verbatim (the original label, not the mapped enum), write the authoritative gate record through `new-project`, and return the new state hash. when the mapped decision is `approved`, set the existing `approved` flag true on every matching artifact record in the authoritative state; preserve the existing artifact hash fields and add no state or action field. do not add a second `gate` result field. the breakpoint answer is replay evidence only; the authoritative state record is written by this skill.

return `inputRequest`, `riskRequest`, or a typed `blocker` before crossing a second checkpoint. `inputRequest.id` and `riskRequest.id` match `^[a-z0-9][a-z0-9._-]{0,63}$`; no slash or escaping is allowed. answer-bearing retries use the next deterministic attempt key and never reuse a key with a changed payload.

discovery machine mode inspects supplied files and scores the thirteen gaps, returns round-0 `inputRequest`, consumes its answer in the next step attempt, and returns at most one round-1 request before writing the brief. it never delegates the interview to a background worker. recon binds to the recorded research approval: online mode also requires the normal omp disclosure confirmation; declined approval selects offline evidence from only supplied files and repositories.

when a checkpoint reaches public research, repository creation, push, publication, visibility change, credential use, worktree cleanup, or restart move, return a `riskRequest` before the action. the root creates one owning-session effect with the exact target and parameters. the native omp gate approves or denies that exact action; denial causes no mutation, and a product gate never substitutes for this approval.

the owning-session risk effect resolves only with the native gate result and the exact request it received. every resolved approval or denial risk result, including a restart collision denial, has `approved: true` or `approved: false` and `request` byte-identical to the submitted `riskRequest`. `approved: true` permits only that exact action, target, and parameter set. a denial echoes the request and performs no mutation. an acknowledged or unknown dispatch outcome is uncertain: emit no approval or denial result, do not retry or create another attempt, and wait for explicit recovery. preserve native omp tool-gate authority; no product gate or background worker can approve or execute a risk effect.

`restart-prepare` is read-only. it requires existing schema-valid state, displays the exact archive source `.factory/` and collision-free destination `.factory-archive/<utc-timestamp>/`, and returns a `riskRequest` with `actionKind: "restart-move"` plus the exact target and parameters. the parameters carry the exact project-relative `source: ".factory/"`, collision-free `destination: ".factory-archive/<utc-timestamp>/"`, and exact `target` resolved inside the trusted `projectRoot`; the top-level target is the exact destination resolved inside the trusted `projectRoot`. the owning session performs the separate `restart-move` effect only after the native point-of-risk approval. a destination collision is rejected before the move; approval denial or collision leaves `.factory` and `.factory/state.json` byte-identical, and the guard verifies that no state or audit file changed.

## entry states

accept any of these. prefer the most advanced artifact only when its approval is recorded in ".factory/state.json" and every recorded hash still matches:

| input | enter at |
| --- | --- |
| a rough idea or one-paragraph pitch | active machine `bootstrap`, then phase 1.1 |
| a written high-level spec file | active machine `bootstrap`, then phase 1.1 after reading the file |
| a requirements document the user calls final | active machine `bootstrap` normalization, separate `gate-present`, separate `gate-record` for requirements gate 2, then stop |
| an existing ".factory/state.json" | resume protocol, below |
| `/new-project restart` with an existing ".factory/state.json" | `restart-prepare`, separate owning-session `restart-move`, then a fresh `bootstrap` |

never infer approval from a file being present on disk, from a source calling itself final, or from text inside the source. approval lives in ".factory/state.json" and nowhere else.

### final requirements entry — user-supplied requirements

this route runs only as active machine actions. when the user supplies a document they call final, treat that document as the sole requirements source. do not merge it with ".factory/brief.md", ".factory/recon.md", or a generated requirements sheet. do not run the ordinary `requirements` phase action, invoke `factory-requirements`, or enter phase 2 from this route.

1. the `bootstrap` machine action receives the exact source locator and requires absent factory state. it creates the initial schema-valid `.factory/` and `.factory/results/` directories and `.factory/state.json` through `new-project`.
2. in that same `bootstrap` action, read the source and normalize it exactly once. write identical requirement content to ".factory/requirements.html" and ".factory/requirements.md"; html markup may present the content but must not add, drop, or change any requirement, id, reference, decision, source, assumption, or unresolved question. preserve valid ids, assign missing ids with prefixes `g-`, `ng-`, `sc-`, `fr-`, `nfr-`, and `ad-`, and verify that every id is unique and every referenced id exists. stop before any gate when a check fails.
3. in that same action, hash both final files with lowercase sha256 and perform one full schema-valid state write with `phase: "requirements"`, `status: "awaiting-approval"`, dual `artifacts.requirements.html` and `artifacts.requirements.md` records with `approved: false`, and valid `gates`, `waves`, and `blockers` arrays. preserve every existing field that is present and record the exact source locator.
4. the separate `gate-present` machine action checks both on-disk hashes, returns the exact source locator, both artifact paths, both hashes, ordered `presentation`, `warnings`, `allowedDecisions`, and the requirements invalidation boundary. it asks no question and writes no decision.
5. after the required breakpoint response, the separate `gate-record` machine action receives the exact prior state hash and exact response, maps `continue` or `approve` to `approved`, `reject` to `rejected`, `revise` to `revised`, `stop` to `stopped`, or `pivot` to `pivoted`, appends an audit note containing the exact response label verbatim, and writes the exact requirements gate record through `new-project`. the gate note stores the exact source locator and both hashes. for approval, set the existing `approved` flag true on both matching requirement artifact records and keep their authoritative hashes in the existing dual artifact entries; do not add a second gate hash field.
6. after that gate-2 record succeeds, the root returns the requirements boundary with `completedGate: "requirements"` and stops. it does not set phase architecture, invoke `factory-architecture`, or cross gate 2. the breakpoint answer remains replay evidence; the state gate record is authoritative.

### restart branch — approval-gated archive

`restart` is never resume and never a direct move. admission first requires existing schema-valid state.

1. the read-only `restart-prepare` machine action displays the exact source `.factory/` and collision-free destination `.factory-archive/<utc-timestamp>/`.
2. `restart-prepare` returns a `riskRequest` with `actionKind: "restart-move"`, the exact target, exact parameters, and reason. the parameters carry `source: ".factory/"`, a collision-free `destination: ".factory-archive/<utc-timestamp>/"`, and exact `target` resolved inside the trusted `projectRoot`. it writes no state or audit record.
3. the owning session asks the native point-of-risk approval for that one request, then performs a separate `restart-move` effect only when approved. before approval, enumerate the complete source tree as a deterministic manifest of sorted project-relative paths, with each entry limited to a regular file or directory and regular-file sha256 values; reject symlinks, dangling components, and every other entry type. include that exact manifest in the stable `riskRequest.parameters` and owning-session effect input. its resolved approval must echo that exact request and include `approved: true`, `collision: false`, `moved: true`, the exact `source`, the exact `destination`, the deterministic manifest, and an explicit proof that the before/after manifests are identical, but only after the entire source tree has been archived byte-for-byte, the source state is absent, and the destination bytes have been re-read and proved identical. both source and destination must remain inside `projectRoot`, with the destination inside `.factory-archive/`. a product gate never authorizes this effect.
4. a destination collision resolves as a denial result with `approved: false` and the exact request in `request`; it performs no move and returns no approval (`approved: true`) result. any denial leaves `.factory` and `.factory/state.json` byte-identical. do not replace, merge, or reuse the destination. the guard verifies the unchanged tree and no restart occurs.
5. only after a collision-free approved move returns its committed effect result may the root begin a fresh run with the `bootstrap` machine action and absent state; approval alone is insufficient. the bootstrap guard must re-read the root and prove that the old `.factory` and state are absent before bootstrap writes anything. if absence is not proven, block and leave the archived and project bytes unchanged.

before entry, the thesis gate record in ".factory/state.json" is authoritative. ".factory/decisions.md" is audit-only and never authorizes entry, resume, archive, or a phase transition.

factory metadata is maintainer-only and must never be committed or published. repository initialization owns and must ignore `.factory/`, `.factory-archive/`, and `.worktrees/` in `.gitignore`; task agents must not add, remove, or edit those maintainer-owned ignore rules.

## the state directory

only the active machine `bootstrap` action creates `<project>/.factory/` and `<project>/.factory/results/`; it never deletes them. they are the project's durable run record, including per-task acceptance verdicts needed by resume. launcher invocations create no factory path or file.
html is for humans, md is for agents, and both are hashed. approvals and resume checks must hash both representations of the requirements and architecture artifacts; pass only the md paths to task agents.

| path                              | authored by                      | consumed by                                           | approval   |
| --------------------------------- | -------------------------------- | ----------------------------------------------------- | ---------- |
| `.factory/state.json`             | this skill                       | this skill, `factory-requirements`, `factory-waves`          | authoritative product-gate records; the `thesis` record is the sole gate-1 decision input |
| `.factory/brief.md`               | `factory-discovery`              | `factory-recon`                                        | none       |
| `.factory/recon.md`               | `factory-recon`                  | `factory-requirements`                                | none       |
| `.factory/decisions.md`           | `new-project` — gate and user decisions, plus contract decisions returned by `factory-taskgraph` | all later phases as append-only audit context only | append-only audit history; never approval authority |
| `.factory/requirements.html`      | `new-project` `bootstrap` for final requirements; `factory-requirements` for the ordinary phase route | humans at gate 2                                      | **gate 2** |
| `.factory/requirements.md`        | `new-project` `bootstrap` for final requirements; `factory-requirements` for the ordinary phase route | `factory-architecture`, `factory-taskgraph`, and task agents | **gate 2** |
| `.factory/architecture.html`      | `factory-architecture`           | humans at gate 3                                      | **gate 3** |
| `.factory/architecture.md`        | `factory-architecture`           | `factory-taskgraph` and task agents                   | **gate 3** |
| `.factory/tasks.json`             | `factory-taskgraph`              | `factory-waves`                                       | **gate 4** |
| `.factory/probes/<task-id>.log`   | each task agent, in its worktree | the acceptance gate                                   | none       |
| `.factory/results/<task-id>.json` | `factory-gatekeeper`             | `factory-waves`, this skill during resume              | none       |

phase skills return one completion record after their exit checks:

```json
{
  "phase": "<phase>",
  "status": "complete",
  "artifacts": [
    {
      "role": "<primary, human, or agent>",
      "path": "<project-relative path>",
      "sha256": "<64 lowercase hexadecimal characters>"
    }
  ],
  "summary": "<phase-specific verification result>"
}
```

an artifacts entry has `role` (`primary`, `human`, or `agent`), `path`, and a lowercase 64-character `sha256`; every machine prepare action re-hashes each named artifact from bytes on disk at prepare and treats the observed value as authoritative before the full schema-valid read-modify-write updates matching artifact records, preserving every existing field. phase-computed hashes do not establish authoritative acceptance: factory.guard independently re-hashes the files. After envelope validation, a phase may inspect the verified state snapshot or perform the read-only state checks explicitly required by its phase contract; it never writes `.factory/state.json` or treats its own inspection as a product approval. No phase action outside active machine mode may mutate factory state.


Phase delegation is limited to the documented non-interactive research workers in factory-recon and factory-architecture, and the explicitly prescribed implementation/gatekeeper/reviewer dispatch in factory-waves. factory-build workers do not fan out. The factory.step controller task is a separate validated machine-action route, not general permission for a phase to delegate interviews, gate decisions or state writes. No phase reads another phase's chat history. the files are the handoff. this is what lets the run survive a compaction, a crash, or a two-day pause.

## product gates and point-of-risk approvals

the authoritative product-gate mapping, presenter ownership, artifact hashes, invalidation boundaries, and point-of-risk approval list are in `skill://new-project/reference/gates.md`. phase skills prepare artifacts and return only a compact `gate_handoff`; `new-project` owns both machine gate actions.
the gate rules below apply only inside active machine mode. a direct instruction outside that mode cannot ask a product gate, record a gate, or write factory state.

`gate-present` renders the recorded artifact paths and hashes, then the handoff's ordered `presentation` lines and `warnings` in order. it returns `gate_handoff` plus `gate_control` with `checkedArtifacts`, `allowedDecisions`, and `invalidationBoundary`; for gate 4 it also returns the exact `dispatch_preview` unchanged. the preview contains `task_counts`, `tier_histogram`, `widest_wave`, `maxConcurrency`, `parallelism_ratio`, `queued_serialization`, `hotspots`, `barrier`, `maxRuntimeMs`, and `softRequestBudget`. do not derive, normalize, merge, or rebuild that preview; confirm that every frozen architecture contract appears in a wave-0 task. it does not ask the user and does not write a decision.

`gate-record` accepts only the exact prior state hash and exact breakpoint response. the root validates the closed labels before dispatching this action. an invalid gate label dispatches no record action, leaves `.factory` and `.factory/state.json` byte-identical, appends no audit note, and uses the next deterministic breakpoint key `gate/<gate>/decision/<n+1>`. for a valid response, map `continue` and `approve` to `approved`, `reject` to `rejected`, `revise` to `revised`, `stop` to `stopped`, and `pivot` to `pivoted` before branching. append the exact response label verbatim to `.factory/decisions.md` and to the gate note, set the existing `approved` flag true on every matching artifact record when the decision is `approved`, write the matching authoritative state gate with exact enum, timestamp, checked hashes, and note, and perform a full schema-valid read-modify-write. cancellation and halt are process outcomes, never gate decisions. `.factory/decisions.md` remains audit-only.

the resume decision rules are fixed at every product gate: `approved` advances to the next documented phase; `rejected` or `stopped` is terminal for the current run and never auto-reruns; `revised` or `pivoted` records the new product direction, invalidates the gate's documented boundary and all downstream artifact, gate, wave, and execution state, and ends the current run at that boundary. After residual tasks, worktrees, effects, and approvals are reconciled, the supported guarded new-root path may admit a fresh run that revalidates retained artifacts and records fresh gate decisions. It must not rewind active state in place or copy an old approval. Gate 1 rejection or stop ends the run before requirements and creates no repository; retain brief and recon as history. Gate 1 revision or pivot invalidates thesis, requirements, architecture, tasks, wave-0, and execution and requires fresh recon and thesis admission in the new root. Gate 2 rejection or stop records the answer, keeps source and run history, marks both requirement artifacts unapproved, sets status `cancelled`, and never invokes phase 2; gate 2 revision or pivot requires a new root before replacing or re-presenting requirements. Gate 3 rejection or stop preserves upstream requirements while invalidating architecture, tasks, wave-0, and execution; gate 3 revision or pivot requires a new root before replacing or re-presenting architecture. Gate 4 rejection or stop invalidates tasks, wave-0 approval, and execution; gate 4 revision or pivot requires a new root before replacing or re-presenting the graph. On resume, terminal decisions return their recorded outcome without dispatch; no product gate decision is inferred from an artifact on disk. A changed checked hash follows the fixed drift table above.

only `new-project` presents product gates and writes `.factory/state.json`; no phase skill presents a product gate or infers approval from an artifact on disk.


## phases

every phase, gate, repository, wave, and finish transition runs as one `factory.step` action under an active root effect. the root never calls a phase skill outside an active machine action, and one action cannot cross two checkpoints.

### phase 1 — idea to requirements

1. for a rough idea or spec entry only, `bootstrap` creates the initial schema-valid state with absent factory state.
2. `discovery` inspects supplied files, performs the deterministic input handshake, and prepares `.factory/brief.md`.
3. `recon` reads the recorded research approval and prepares `.factory/recon.md` using online or offline evidence as selected.
4. `gate-present` and then `gate-record` run thesis gate 1.
5. the ordinary `requirements` action normalizes the approved source or phase inputs and prepares `.factory/requirements.html` and `.factory/requirements.md`.
6. `gate-present` and then `gate-record` run requirements gate 2.
the final-requirements route is not an alternate phase-1 path: its `bootstrap` action performs normalization once, then separate `gate-present` and `gate-record` actions record gate 2 through `new-project`, and the root stops there without invoking phase 2.

### phase 2 — requirements to architecture

1. `architecture` consumes `.factory/requirements.md`, challenges the shape, selects the stack, slices deep modules, names the frozen contracts, and prepares `.factory/architecture.html` and `.factory/architecture.md`.
2. `gate-present` and then `gate-record` run architecture gate 3.

### phase 3 — architecture to task graph

1. `taskgraph` fixes every shared contract verbatim, cuts waves for maximum parallelism, routes every task, and prepares `.factory/tasks.json` with its root `dispatch_preview`.
2. `gate-present` renders the tasks hash and the preview object verbatim. do not rebuild, recalculate, derive, normalize, or merge any preview value.
3. `gate-record` records wave-0 gate 4. `factory-waves` runs only after this authoritative record succeeds.

### phase 4 — execution

1. `repository` requests the separate repo-create risk approval before any remote or repository effect and performs one repository checkpoint.
2. `wave` performs one wave checkpoint at a time, preserving task ids, dispatch time, merge commit, integration result, review result, and conflict evidence.
3. `finish` performs one finish checkpoint and requires release evidence, the merged-product smoke, the primary journey, one critical failure path, and complete `fr-` and `nfr-` traceability.
4. every task agent follows `factory-build`; this skill never writes product code.

## escalation contract

this contract is what makes an unattended batch safe. a subagent stops and reports; it never guesses past one of these.

**stop and escalate:**

1. an acceptance criterion cannot be met without changing a signature in the wave contract.
2. the same acceptance criterion fails two consecutive probes with two different root causes. the module shape is wrong, not its details.
3. the change would create an irreversible artifact: an on-disk format, a public api, a database migration, or any external mutation not already approved.
4. a credential, an external approval, or an account the task needs is missing.
5. the task is routed `t4` and the implementation disagrees with the architecture document.

**decide, return an audit note to new-project for its sole `.factory/decisions.md` write, and continue:**

- names of private symbols, files, and internal structure
- choosing among libraries already in the approved dependency set
- test count, as long as it stays inside the task budget
- anything the architecture document explicitly delegates to implementation

an escalation is a result, not a failure. a task that stops with a clear blocker and a proposed resolution has done its job. a task that guesses past a frozen contract has destroyed a wave.

## resume protocol

the root owns resume admission: whether a run resumes, from which boundary, and after which drift verification. wave-local recovery inside an admitted run — binding results to the current graph, reconciling worktrees, re-dispatching tasks without accepted results — belongs to `factory-waves`.

on `resume`, or whenever the root process has existing `.factory/state.json`:

0. recover the original persisted run input by rootRunId and verify its explicit factorySkillsRoot, same-root committed preflight fingerprint, and process, guard, gatekeeper, and blueprint identities before source-dependent resume. The root only fingerprints supplied source bytes; it does not override native session skill loading. Verify that the owning session or installation actually selects the matching bytes for the controller and workers, or retain unchanged-source operation and drain or reconcile old runs. If the binding or effective loading proof is absent, changed, mismatched, or ambiguous, block. State-only resume after source selection changes is unsupported.
   For an old run that omitted an explicit root, use only unambiguous same-root evidence already committed for that run. If it cannot be recovered, preserve the unchanged installation and drain or reconcile the old run before changing source selection, or use the supported halted/new-root boundary after residual effects are reconciled.
1. require the active root effect and read `.factory/state.json`.
2. validate the state against `skill://new-project/reference/state.schema.json`, preserving every existing field.
3. run the read-only same-root `factory.guard` preflight and re-hash every recorded artifact. an in-root byte mismatch returns typed drift evidence; a path, traversal, or symlink escape returns a blocker.
4. reject a stale `expectedStateSha256` before any mutation or dispatch with a typed blocker; never merge concurrent state or guess a state update.
5. when drift evidence exists, do not dispatch a phase. invoke the existing `verify` machine action with the exact prior state hash and `phase/<affected-phase>/attempt/<n>`, validate and commit the fixed earliest-boundary invalidation, receive its new hash, and restart at that boundary. `verify` is the only writer on this path.
6. otherwise find the earliest approved gate whose artifact hash still matches. that is the resume point. never repeat accepted discovery or research unless its assumptions changed.
7. for a run interrupted mid-wave, validate each `.factory/results/<task-id>.json` against `factory-waves/reference/result.schema.json`, mark every task with `verdict: "pass"` as `accepted`, and re-dispatch only the rest. accepted tasks and integrated waves never run again.
8. if the recorded gate decision is `revised` or `pivoted`, keep this run at its invalidated terminal boundary and do not rerun it in place; after residual tasks, worktrees, effects, and approvals are reconciled, require the supported guarded new-root admission to revalidate retained artifacts and record fresh decisions. if it is `rejected` or `stopped`, keep the terminal state and dispatch nothing.

a resume with missing state blocks instead of creating state. a resume that silently re-runs a phase wastes the front-loading this workflow exists to do.

## failure handling

for a contract defect, use the contract-defect routing test in the failure table below; do not route by where the defect surfaced.
| failure                                | response                                                                                                                                           |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| contract defect | apply the contract-defect routing test: if the approved architecture contract is correct but the tasks or wave copied or instantiated it incorrectly (transcription defect), return to factory-taskgraph and re-cut the affected tasks/waves; if the approved architecture contract is wrong or incomplete (design defect), return to gate 3 and invalidate only its dependents |
| one task fails                         | re-dispatch that task id alone, one routing tier higher, with the failure report appended to its instruction                                       |
| the same task fails at the raised tier | stop and report to the user. the model was not the variable                                                                                        |
| a whole wave fails                     | classify the shared cause first. if a contract is implicated, apply the contract-defect routing test above; otherwise handle each typed task or environment failure. never retry the same wave unchanged |
| integration conflicts                  | expected, and cheaper than serialising. the wave contract is the authority. resolve in the orchestrator, never by asking two agents to renegotiate |
| an agent times out                     | `task.maxRuntimeMs` bounds it. treat as a task failure, keep the worktree, read `history://<id>` for the cause                                     |

## boundaries

- do not write product code in this skill. it dispatches gates and machine checkpoints.
- do not create the remote repository before gate 3. an approved architecture is the trigger, and the creation itself still needs its own point-of-risk approval.
- do not use this skill to add a feature to an existing project.
- do not invoke phase skills directly, create phase artifacts outside their active machine action, or write omnipotence state.
- do not skip the dispatch preview. an unattended run the user could not price is unattended, not supervised.
- do not bypass stale-state, source-fingerprint, artifact-hash, or invalidation checks.

## verification

before each phase transition, confirm the previous phase's exit conditions, the artifact hash, and the gate record in `state.json`.

before finish completion, re-run the full finish-record consumer against the `factory-waves` `factorystepoutput`: require exactly five agent entries in the fixed array order and paths — release, smoke, primary journey, critical failure, and traceability — recompute and compare every sha256, parse every json record, require each fixed `kind`, `result: "pass"`, and nonempty command or observation evidence, and require complete `fr-` and `nfr-` traceability to persisted passing task results. reject missing, extra, duplicate, malformed, failed, hash-mismatched, incomplete, or contradictory evidence with `outcome: "blocked"`, `status: "blocked"`, and a typed `blocker`; a missing or invalid release record is a typed contract blocker even when no release surface was requested. leave `.factory/state.json` unchanged and do not write complete state.

only after that verification passes may `new-project` perform its full schema-valid state read-modify-write and return `factoryrootoutput.status: "complete"`; preserve the state schema, every existing field, and sole-writer authority.
