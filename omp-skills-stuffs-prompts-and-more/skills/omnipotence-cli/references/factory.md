# factory through omnipotence

Factory turns an admitted product idea or approved requirements into a working local repository. The durable process id is factory.new-project. In the omp extension, the public launcher is /factory; factory.step and phase skills are internal workers. Do not call an internal phase or machine step as if it were the public workflow.

Sources:

- <stack-source>/omnipotence/factory.ts
- <stack-source>/omnipotence/index.ts
- <stack-source>/omnipotence/cli.ts
- installed package <selected-blueprint-root>
- revision 03 architecture.md, operator-guide.md, plan.md, requirements.md, and verification.md

The obsolete FACTORY_USER_GUIDE.md and FACTORY_RULE_REGISTRY.md are no longer dependencies of this skill. Read the maintained OMP-DEV-USER-GUIDE.md beside the selected agent prompt, skills/USER_GUIDE.md, new-project and its phase contracts, and the selected installed blueprint/process/guard sources. Resolve actual paths and registration in the target environment; a file or inventory hash is not proof of active loading.

Source locators: `<stack-source>` is the inspected checkout or installed package matching the active version; `<selected-blueprint-root>` is the source of the registered blueprint selected for the run. Resolve both from the release inventory and native registration, not from an assumed home directory. `<historical-home>` denotes a dated audit location only.

## preflight

Read current state before mutation:

~~~text
omnipotence doctor --json
omnipotence blueprint list --json
omnipotence process list --json
omnipotence process validate factory.new-project --json
omnipotence process validate factory.step --json
omnipotence hook list --json
~~~

Require, from observed process/blueprint output:

- active factory-workflow blueprint and the expected process versions;
- factory.new-project as the root process;
- factory.step, factory.mode-guard, and factory.guard only where the installed blueprint declares them;
- an absolute trusted projectRoot;
- an explicit source/skill root and source fingerprint when the admitted process schema supports those fields;
- no active conflicting factory root for the selected project/session.

File presence is not registration, and a manifest is not proof that the running extension loaded those bytes. Inspect active process, hook, blueprint, and source paths.

## public launchers

The actual omp extension command is:

~~~text
/factory [--preview] [--fresh] [target-or-idea]
~~~

Target resolution is source-backed:

1. an existing file becomes a spec entry and uses its parent directory;
2. an existing directory becomes the project root; an existing .factory/state.json selects resume;
3. a project directory's final-plan.md, plan.md, spec.md, or requirements.md becomes a spec entry;
4. one markdown file becomes a spec entry;
5. a non-path argument becomes a rough-idea entry.

An explicit path beginning with ~, /, ./, or ../ must exist. A missing explicit path is an error; it does not silently fall back to the current directory. With no target and no plan or state file, /factory asks for an idea.

--preview starts a plan-mode factory.new-project run. Without it, /factory uses babysit mode. --fresh skips the newest non-terminal root run for the selected project root and starts a new run while retaining the old run. Without --fresh, a blocked matching run is reported rather than resumed; an active matching run may be rebound to the current session and resumed.

The durable process can also be inspected or planned through the one-shot CLI:

~~~text
omnipotence --dry-run process plan factory.new-project --input '{"projectRoot":"/absolute/project/root","entry":{"kind":"rough-idea","value":"<idea>"}}' --json
omnipotence run start factory.new-project --mode babysit --input '{"projectRoot":"/absolute/project/root","entry":{"kind":"rough-idea","value":"<idea>"}}' --session <session-id> --json
~~~

The generic extension also accepts /omnipotence factory.new-project <json> when factory.new-project is registered and the input matches its schema. It does not perform /factory's target resolution. The standalone forms are run start and process plan; do not invent additional flags.

## authority model

- factory.new-project owns workflow admission, all four product gates, .factory/state.json writes, wave-result integration, finish evidence, resume invalidation, and the final result.
- one factory.step invocation advances at most one checkpoint. It validates the machine envelope, dispatches the named worker/controller action, and invokes the read-only guard again. A named new-project controller action may write state within that validated contract; a phase worker may not.
- phase skills prepare artifacts and typed handoffs. They do not present product gates, infer approval, or write factory state.
- factory-waves executes the approved graph and holds the all-results barrier; it does not reopen product design.
- task implementers write only inside their named worktree and task record.
- each task's acceptance reviewer is the pinned factory-gatekeeper.

Never call a phase worker or factory.step directly to establish a gate. A direct phase call lacks the root run/effect identity, expected state hash, phase, source fingerprint, and guard callback that make the mutation safe.

Product gates decide product direction and live in .factory/state.json:

1. thesis
2. requirements
3. architecture
4. wave 0

Map responses exactly: continue or approve to approved; reject to rejected; revise to revised; stop to stopped; pivot to pivoted. A product gate does not authorize unrelated external actions. Reuse existing user authority for its exact operation and target, including requested public research; ask only for missing authority. Where the pinned factory action requires a separate exact risk request/response, return it to the owning session and preserve its mandatory identity binding. Earlier product approval cannot be fabricated into a response.

## ordered workflow

| order | checkpoint | durable output or gate |
| --- | --- | --- |
| 0 | mode guard and guard preflight | allowed mode, source fingerprint, state schema, artifact-drift check |
| 1 | bootstrap | .factory/state.json |
| 2 | discovery | .factory/brief.md; bounded questions |
| 3 | recon | .factory/recon.md; sourced facts and unknowns |
| 4 | gate 1 | thesis gate record |
| 5 | requirements | .factory/requirements.md and .factory/requirements.html plus hashes |
| 6 | gate 2 | approved requirements artifact |
| 7 | architecture | .factory/architecture.md and .factory/architecture.html plus hashes |
| 8 | gate 3 | frozen contracts, modules, and acceptance strategy |
| 9 | taskgraph | .factory/tasks.json with ids, DAG, routes, hotspots, and roles |
| 10 | gate 4 / wave 0 | exact preview and write-allowlist validation |
| 11 | repository | git init, ignores, planning base commit |
| 12 | waves | worktrees, commits, strict results, merge/integration checks |
| 13 | finish | exactly five strict finish evidence records, including real product smoke |
| 14 | verify | task/wave coverage, no source or artifact drift, no unresolved blocker |

The implementation lane retains the fixed factory-build contract: fixed interface and falsifier, real probes before durable tests, exact byte-framed probe log, current budget and criterion-naming extra-test escalation, real entrypoints, and the existing strict result consumers. An advisory high-risk explanation is not a seventh factory check.

## source pins and adoption

For a revision03 or later adoption, preserve active v1 source and approval bytes. Resume must select the original run id, persisted factorySkillsRoot input when present in the process schema, and same-root committed preflight/effect fingerprint. factorySkillsRoot identifies guarded source bytes; it is not an OMP per-task skill-loader override. Native child tasks inherit the parent's discovered/provided skills. Verify that the owning session and its children actually load the selected compatible guidance; if the host cannot isolate old and new guidance, drain/reconcile the unchanged installation before activation. Compare actual loaded guidance, skill precedence, process and guard versions, and native receipts; do not accept a state-only resume after source changes.

If a changed artifact or source is proposed, use the existing guarded admission and approval path. A revised or pivoted run may use its guarded new-root path after reconciliation. Rejected or stopped work is terminal. Missing, drifted, ambiguous, or mismatched source blocks dependent recovery. Observation never updates factory state or passes a gate.

Never invent an operator flag for a source pin. Inspect process validate output and the installed blueprint input schema first. A source path recorded in a document is not a live registry entry.

## mechanical mutation controls

At gate 4:

- target.files are exact repository-relative paths;
- protected files are not allowlisted;
- shared paths name one hotspot, its writers, and one resolution owner;
- root protected_files and global_non_goals are present;
- roles.reviewer equals factory-gatekeeper and differs from implementer.

At each task result:

- changed_files equals the actual git diff against the wave base, except the matching ignored probe log;
- every path belongs to target.files or a declared hotspot naming that task;
- one omitted, phantom, or unowned path rejects the task.

At each merge, the diff stays inside reconciled task manifests and declared hotspots. At finish and resume, recompute artifact hashes and source fingerprints. A stale expected state hash blocks before read/write. Exactly five unique, hash-matched finish records must pass.

The gatekeeper's persisted task result has exactly six checks: identity, ownership, probe-log, acceptance, budget, and cadence. contributing_factors is diagnostic evidence, not a seventh check. Do not make a display, observer, or worker self-report write factory state.

## recovery

For normal continuation inspect:

~~~text
/omnipotence-status
omnipotence run list --json
omnipotence run status <run-id> --json
omnipotence run events <run-id> --json
omnipotence effect list <run-id> --json
~~~

Resume only after validating state schema, artifact hashes, taskgraph hash, source fingerprint, accepted tasks, and integrated waves. Dispatch only tasks without a persisted passing result. Return to the earliest affected boundary: product scope to requirements, architecture to architecture, taskgraph to wave 0, task to the same-task retry route.

Restart requires schema-valid state. restart-prepare is read-only and produces a manifest plus one restart-move risk request. Move .factory to a collision-free .factory-archive timestamp only after exact approval. A denial or collision leaves state byte-identical. Bootstrap only after the move completes.

For an uncertain effect, inspect provider evidence, fence, and input hash. Never resend automatically. Resolve with confirm, fail, or retry; retry needs evidence or exact risk approval when duplicate action remains possible. Preserve old source, attempts, workspaces, and external evidence.

## completion

Report the root run id and mode, project root, authoritative state SHA-256, last approved gate, last integrated wave, task failures/blockers, source fingerprint and artifact drift, the five finish records, real smoke command/observation, and final complete state or exact typed blocker. Do not claim that a process is delivered because it reached CLI exit 0, a worker said done, a gate was approved, or a file exists; inspect the current integrated artifact and independent proof.
