# babysitter replacement and removal readiness

this is a decision gate, not an uninstall procedure. do not remove `@a5c-ai/babysitter-omp` until every dependency is migrated, retired, or explicitly accepted as lost.

Source locators: `<stack-source>` is the inspected checkout or installed package matching the active version; `<selected-blueprint-root>` is the source of the registered blueprint selected for the run. Resolve both from the release inventory and native registration, not from an assumed home directory. `<historical-home>` denotes a dated audit location only.

## parity boundary

| capability | omnipotence status | replacement / gap |
| --- | --- | --- |
| durable versioned process runtime | replaced | sqlite events/projections, pinned process version, replay, leases, fences |
| interactive run of an installed process | replaced | `/omnipotence <process-id> [json]` |
| generic `/call` from arbitrary prose | partial | omnipotence requires a registered process id; author/install a blueprint first |
| `/plan` | partial | `/omnipotence-plan` plans one installed process and returns at its first unresolved effect; it does not design a process |
| `/yolo` | partial | `/omnipotence-yolo` auto-approves optional breakpoints only; required breakpoints still wait |
| `/resume` | partial | session resume exists, but it does not discover and rank all incomplete runs; use `run list` and inspect manually |
| `/forever` | partial | `/omnipotence-forever` runs a process already designed as a loop; it does not synthesize a loop from prose |
| task effects | replaced | `ctx.task` + `omnipotence_result` |
| bounded parallel tasks | replaced | `ctx.parallel` |
| child processes | replaced | `ctx.subprocess` |
| durable sleep | replaced | `ctx.sleep` |
| user breakpoints | replaced | `ctx.breakpoint` + `/omnipotence-resume` |
| hooks | replaced | versioned hook registry, phases, priorities, timeouts, durable resolved delivery |
| profiles/context layers | replaced | process defaults + user + project + run json merge patch |
| local versioned blueprints | replaced | local path inspect/install/update/rollback/remove; hash verified; pinned active runs |
| run status/events/effects/recovery | replaced | extension commands + standalone cli |
| uncertain external-effect recovery | replaced | exact fence/hash + confirm/fail/retry |
| factory/new-project workflow | replaced | `factory-workflow` blueprint and `factory.new-project` |
| native doctor | partial | validates omnipotence sqlite and local blueprints; not `.a5c` journals, caches, locks, logs, disk, process files, ancestry, or concurrent sessions |
| blueprint lifecycle | partial | local hash-verified paths and versions exist; no marketplace, global/project scope, configure/create wizard, or marketplace migration |
| observer web dashboard | not replaced | use status/events/effect cli; no equivalent visual dashboard |
| cleanup, retrospect, assimilate, onboarding, contrib/help | not replaced | retain babysitter or accept/replace each workflow |
| forbidden-marker gate, mcp, anycli, token/compression, harness install/discovery | not replaced | these installed babysitter surfaces have no omnipotence equivalent |
| babysitter project-install and user-install wizards | not replaced | migrate manually or retain those capabilities |
| existing `.a5c` process definitions and journals | not automatic | port intentionally; preserve as rollback data |

## historical removal audit (2026-08-25)

The earlier audit recorded the blockers below. They are historical leads for a fresh inventory, not a claim about this machine's current runs or removal readiness:

- `<historical-home>/.a5c/runs` contains 18 audited runs: 17 have `run_completed` or `run_failed`, while `01KZM9NR5XP9ZHZ3MY1T3HNJDD` has no terminal journal event. its latest records, journal entries `000031` and `000032`, are `EFFECT_REQUESTED` for `verify-production-guide`.
- `<stack-source>/.a5c/processes/omnipotence-factory-enforcement.js:1` imports `defineTask` from `@a5c-ai/babysitter-sdk`.
- the generic babysitter trigger family still supplies ad-hoc process authoring, incomplete-run discovery, marketplace, observer, cleanup/retrospect, and install workflows that omnipotence does not replace automatically.
- `<historical-home>/.a5c/active/process-library.json` pins an `a5c-ai/babysitter` process-library checkout that must remain available for rollback/recovery until migration is complete.

re-audit these facts before removal; this section records observed state, not a permanent exemption.

## exact regression risks

- `/call`, `/plan`, `/resume`, `/yolo`, `/forever`, `/doctor`, and `/babysitter:*` stop routing when the plugin is removed.
- repointing `/plan` silently changes a full process-design/reuse-audit workflow into a first-effect preview of an already installed process.
- repointing `/yolo` introduces required user stops.
- resume without an active native session loses global incomplete-run discovery and recommendation.
- the unresolved run may become unrecoverable if its sdk, cli, process bytes, or pinned process library are pruned.
- the project `.a5c` process fails to import after sdk removal.
- marketplace, observer, cleanup/history aggregation, retrospect, onboarding, assimilation, forbidden-marker, mcp, anycli, token/compression, and install/discovery workflows disappear unless separately replaced or accepted.

## inventory gate

search active repositories, global skills, agents, ci, shell config, and user docs for:

```text
babysitter
@a5c-ai
.a5c
skill://babysit
/call
/plan
/yolo
/resume
/forever
blueprints:add-marketplace
blueprints:update-marketplace
babysitter blueprints
```

classify every match:

1. runtime dependency — must migrate before removal.
2. historical data — preserve; does not block uninstall.
3. documentation/trigger — update to `omnipotence-cli` or native `/omnipotence*` command.
4. optional babysitter-only capability — user must explicitly accept loss or retain plugin.
5. false positive — record why it is not active.

known plugin-provided trigger skills include `babysit`, `call`, `forever`, `plan`, `resume`, `yolo`, and babysitter `blueprints`. removing the plugin removes those trigger skills. this `omnipotence-cli` skill must be present and trigger-tested first.

## migration gate

for each active babysitter process:

- assign a stable process id and semantic version
- define strict input and output schemas
- translate phases into deterministic process code
- map one agent job → `ctx.task`
- map bounded concurrency → `ctx.parallel`
- map child workflow → `ctx.subprocess`
- map delay/poll cycle → `ctx.sleep`
- map user decision → `ctx.breakpoint`
- map lifecycle extension → versioned `ctx.hook`
- map an intentional terminal stop → `ctx.halt`; represent a resumable wait through the appropriate breakpoint/effect semantics instead
- replace ad-hoc files with durable run/effect events only when they are process state
- define stable unique effect keys; never reuse one key with changed input
- write a canary that proves resume does not repeat a committed external action

copying a babysitter process file into an omnipotence blueprint is not migration. omnipotence blueprints load process/hook modules declared by `omnipotence.blueprint.json`; they do not run installers or interpret `.a5c` process state.

## health gate before removal

run and require success:

```text
omp --version
omp plugin doctor nikos-agent-stack --json
omnipotence --version
omnipotence doctor --json
omnipotence process list --json
omnipotence blueprint list --json
omnipotence hook list --json
omnipotence process validate factory.new-project --json
omnipotence process validate factory.step --json
```

also verify:

- omp's `nikos-agent-stack` plugin realpath points to the intended checkout/package
- the intended compatible `factory-workflow` version is active, and old versions required by active runs remain available
- installed blueprint files match manifest hashes
- `factory.mode-guard` and `factory.guard` are registered
- `roles.reviewer` is mechanically constrained to pinned `factory-gatekeeper`
- one non-destructive process plan validates input
- one explicitly approved canary run completes or reaches the expected required breakpoint
- session restart reloads the omnipotence extension and blueprint

## removal decision

removal is ready only when all are true:

- no active runtime dependency remains on babysitter or `.a5c`
- every required process is migrated and canary-verified
- marketplace, observer, cleanup/retrospect, and install-wizard gaps are accepted or replaced
- the new `omnipotence-cli` skill is installed, linted, and trigger-tested
- factory start, gates, resume, and finish have been exercised through omnipotence
- `.a5c` data is backed up and retained for rollback
- no active babysitter run exists
- the user explicitly approves uninstalling `@a5c-ai/babysitter-omp`

## post-removal verification

restart omp, then verify:

- `omp plugin list --json` no longer lists `@a5c-ai/babysitter-omp`
- `nikos-agent-stack` remains enabled
- `omnipotence-cli` skill remains under `~/.omp/agent/skills`
- `/omnipotence-status` loads
- omnipotence doctor/process/blueprint/hook checks remain green
- factory processes and guards still resolve
- expected babysitter-only skills are gone, and no remaining skill references them as an executable dependency

if a regression appears, reinstall the exact prior babysitter plugin version and restart omp. do not delete `.a5c` or its journals during the same change.

## evidence sources

- omnipotence runtime: `<stack-source>/omnipotence/contracts.ts:53-66`, `engine.ts`, `store.ts`, `hooks.ts`, `profiles.ts`, `blueprints.ts`
- omnipotence operator surfaces: `<stack-source>/omnipotence/cli.ts:35-61,201-571`, `index.ts:352-445`
- historical babysitter removal targets (re-discover before using; not current dependencies): `skill://babysit`, `skill://call`, `skill://forever`, `skill://plan`, `skill://resume`, `skill://yolo`, and `skill://blueprints`
- factory contract: the selected installed factory-workflow blueprint and the maintained new-project/phase contracts, OMP-DEV-USER-GUIDE.md and skills/USER_GUIDE.md. Missing historical factory guide names are not current dependencies.
