# recon: native babysitter orchestration

## verdict

this project closes a real hole only if it stays an omp-native continuation adapter or a focused embedded runtime: the current babysitter omp integration is a prompt bridge, while omp already exposes a supported hidden next-turn scheduler. research does not justify dependency-free parity with the full babysitter sdk; that path would turn an invocation fix into a broad workflow-engine fork.

## archetypes

### host-native stop hook with lightweight state

- projects: claude code `/goal` ([documentation](https://code.claude.com/docs/en/goal), introduced 2026-05), planning-with-files ([repository](https://github.com/othmanadi/planning-with-files), active 2026-08-20), and oh-my-claudecode ([repository](https://github.com/yeachan-heo/oh-my-claudecode), active 2026-08-13).
- buys: one explicit start, host-native continuation, no daemon, and direct access to the current conversation.
- leaves open: re-entry, hard turn caps, and state collision. claude code documents repeated stop-hook entry and an eight-block circuit breaker ([hooks](https://code.claude.com/docs/en/hooks#stop)); planning-with-files reports concurrent sessions completing the wrong shared plan ([issue 50](https://github.com/othmanadi/planning-with-files/issues/50)).
- ship effort: 1 — one extension and one small state record can demonstrate the loop without infrastructure.
- extend effort: 3 — modes, prompts, commands, hooks, and gates tend to duplicate policy; oh-my-claudecode records 41 skills, 294 hook files, 29 command entrypoints, and overlapping gates before consolidation ([issue 3698](https://github.com/yeachan-heo/oh-my-claudecode/issues/3698)).

### embedded event journal with explicit effects

- projects: babysitter sdk 6.0.2 ([repository](https://github.com/a5c-ai/babysitter), current 2026-08-20), langgraph ([repository](https://github.com/langchain-ai/langgraph), active 2026-08-19), and pydantic ai ([repository](https://github.com/pydantic/pydantic-ai), active 2026-08-19).
- buys: replayable state, explicit pending effects, pause and resume, recovery, and named terminal states inside the host process.
- leaves open: durable state does not make external effects exactly once. langgraph reports redispatching live long-running calls ([issue 7417](https://github.com/langchain-ai/langgraph/issues/7417)) and host-dependent duplicate execution after a crash ([issue 8039](https://github.com/langchain-ai/langgraph/issues/8039)); temporal requires application-owned idempotency at every activity boundary ([idempotency](https://docs.temporal.io/activity-definition#idempotency)).
- ship effort: 2 — the journal, replay, lock, transition, effect, and recovery seams require several ordinary local modules.
- extend effort: 2 — stable event and effect contracts contain later modes, but every persisted contract needs migration and replay discipline.
- brief direction: the brief currently points here, composed with omp's native next-turn scheduler.

### standalone local process owner

- projects: iteratr ([repository](https://github.com/mark3labs/iteratr), active 2026-05-04) and aws cli agent orchestrator ([repository](https://github.com/awslabs/cli-agent-orchestrator), active 2026-08-20).
- buys: ownership of worker lifetimes, terminal sessions, independent scheduling, and multi-process durability outside one host conversation.
- leaves open: the wrapper becomes a second compatibility surface. iteratr rejects a provider accepted by its underlying agent cli ([issue 12](https://github.com/mark3labs/iteratr/issues/12)); aws cli agent orchestrator still needs explicit worker discovery, permission, review, and cleanup semantics ([issue 12](https://github.com/awslabs/cli-agent-orchestrator/issues/12)).
- ship effort: 2 — several modules, a local control plane, and ordinary process infrastructure.
- extend effort: 3 — each provider, worker type, permission boundary, and cleanup path increases coordination coupling.

### service-backed durable execution

- projects: temporal ([workflow execution](https://docs.temporal.io/workflow-execution), active 2026-08-07) and hatchet ([repository](https://github.com/hatchet-dev/hatchet), active 2026-08-17).
- buys: durable timers, signals, retries, worker recovery, observability, and horizontal scale.
- leaves open: workflow code must remain replay deterministic, external effects remain at-least-once, and permanent faults can become retry loops. hatchet reports a permanent replay fault treated as transient and retried forever ([issue 2803](https://github.com/hatchet-dev/hatchet/issues/2803)).
- ship effort: 3 — a service, database, workers, deployment, and operations exceed this local plugin's requirements.
- extend effort: 1 — once operated, stable workflow and activity contracts make later workflow features comparatively cheap.

## holes this project would close

| hole | evidence 1 | evidence 2 | closes it fully |
|---|---|---|---|
| native single-start babysitter continuation inside omp | the current omp integration forwards commands to `/skill` prompts ([source](https://github.com/a5c-ai/babysitter/blob/main/plugins/babysitter-unified/per-harness/omp/extensions-index.ts)) | `run:iterate` performs exactly one iteration and leaves effects to an external orchestrator ([published source](https://cdn.jsdelivr.net/npm/@a5c-ai/babysitter-sdk@6.0.2/dist/cli/commands/run%49terate.js)) | yes, if the extension owns scheduling and effect acknowledgment |
| fail-closed behavior for an active run without blocking ordinary turns | sdk runtime hooks log failures and continue ([published source](https://cdn.jsdelivr.net/npm/@a5c-ai/babysitter-sdk@6.0.2/dist/runtime/hooks/runtime.js)) | a split-brain agent platform advanced while authoritative state was stale ([postmortem](https://www.elegantsoftwaresolutions.com/blog/stopped-building-agents-restarted-platform)) | no; omp can defer a hidden turn, so the design must detect and surface that boundary |
| one authoritative, session-scoped run record across resume and cancellation | shared active-plan files let parallel sessions finish the wrong task ([issue 50](https://github.com/othmanadi/planning-with-files/issues/50)) | database and file fallback divergence hid completed work ([postmortem](https://www.elegantsoftwaresolutions.com/blog/stopped-building-agents-restarted-platform)) | yes, if state is namespaced by session and run and has no implicit fallback |

## capabilities already solved

| capability | library or platform | language | does not cover | source |
|---|---|---|---|---|
| one-step process execution, event replay, atomic journal writes, recovery, and run locks | babysitter sdk 6.0.2 | typescript and javascript | a native omp loop, fail-closed hook errors, and exactly-once external effects | [sdk repository](https://github.com/a5c-ai/babysitter), [published `run:iterate`](https://cdn.jsdelivr.net/npm/@a5c-ai/babysitter-sdk@6.0.2/dist/cli/commands/run%49terate.js) |
| hidden next-turn delivery and durable session entries | omp extension api | typescript | guaranteed wake-up in every client and a fail-closed callback when scheduling is deferred | [api source](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/extensions/types.ts#l1305-l1321), [scheduler source](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/session/agent-session.ts#l5928-l5983) |
| deterministic finite-state transitions and serializable snapshots | xstate 5.32.5 | typescript | durable writes, journal recovery, process coordination, and omp lifecycle binding | [repository](https://github.com/statelyai/xstate) |
| crash-safe local transactions and cross-process coordination | sqlite 3.54.0 | c | orchestration states, effect semantics, and turn continuation | [wal source](https://github.com/sqlite/sqlite/blob/master/src/wal.c#l13-l150) |

## known failure modes in this space

| failure | seen at | why it happened |
|---|---|---|
| recursive continuation consumes bounded turns | [claude code hooks](https://code.claude.com/docs/en/hooks#stop) | a blocked stop re-enters the same hook; the platform needs a re-entry bit and a hard circuit breaker |
| background hooks cannot guarantee wake-up or deduplication | [claude code hooks](https://code.claude.com/docs/en/hooks#run-hooks-in-the-background) | asynchronous handlers run after the controlled action, each firing creates a process, and idle results can wait for user input |
| slow work is dispatched twice | [langgraph issue 7417](https://github.com/langchain-ai/langgraph/issues/7417) | a liveness timeout could not distinguish slow from dead work, and no fencing token prevented duplicate effects |
| crash recovery repeats a side effect on some hosts | [langgraph issue 8039](https://github.com/langchain-ai/langgraph/issues/8039) | pending writes and the superseding checkpoint raced instead of committing in one enforced order |
| durable replay still duplicates external effects | [temporal idempotency](https://docs.temporal.io/activity-definition#idempotency) | a worker can finish an activity and crash before reporting completion, so retry executes it again |
| local session state collides across concurrent work | [planning-with-files issue 50](https://github.com/othmanadi/planning-with-files/issues/50) | one active-plan namespace represented several sessions |
| fallback state creates false health | [agent-platform postmortem](https://www.elegantsoftwaresolutions.com/blog/stopped-building-agents-restarted-platform) | database and file state diverged, observability errors were swallowed, and the system advanced instead of blocking |
| a platform owner absorbs a standalone orchestration api | [autogen maintenance notice](https://github.com/microsoft/autogen/commit/027ecf0a379bcc1d09956d46d12d44a3ad9cee14) | microsoft moved new development to a native successor and left autogen in maintenance mode |

## the structural weakness

**statement:** the invocation hole is real, but dependency-free parity with the full babysitter sdk would create a large local fork whose recovery, locking, process, cli, profile, blueprint, and compatibility costs grow faster than the value of fixing invocation. omp already supplies the missing next-turn primitive, so a broad replacement risks solving the wrong layer.

**class:** reliability cost, with secondary platform absorption risk.

**evidence:** babysitter's public sdk spans event storage, replay, locks, process execution, effects, recovery, cli, hooks, profiles, blueprints, sessions, and policies ([repository](https://github.com/a5c-ai/babysitter)); oh-my-claudecode documents the cost of duplicated hook, command, skill, prompt, and gate surfaces ([issue 3698](https://github.com/yeachan-heo/oh-my-claudecode/issues/3698)); omp already exposes native hidden next-turn scheduling ([api source](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/extensions/types.ts#l1305-l1321)).

**falsified if:** one focused dependency-free core can preserve every accepted user-visible mode through the same small transition and effect contract, pass crash and resume checks, and avoid copying the sdk's unrelated cli, mcp, profile, blueprint, observer, and multi-harness surfaces.

**cheapest experiment:** write a disposable native omp adapter that drives one existing sdk run through three turn boundaries with `session_stop` and hidden `nextturn`; after the first step, restart the session, resume once, cancel once, and force a gate failure. the experiment succeeds only if one terminal result appears, no effect runs twice, and gate-checker runs before the next orchestration turn.

**brief's own hypothesis:** replaced. omp source and claude code `/goal` falsify the broad access claim that a supported turn boundary cannot start another turn. the stronger risk is owning a workflow engine when only the host adapter is missing.

## adversarial question

> what observed omp user failure requires a new dependency-free workflow engine, rather than the mit babysitter sdk plus a native `nextturn` adapter?

**evidence:** the sdk already exposes one deterministic iteration and durable replay, the current omp plugin stops at prompt forwarding, and omp now exposes the continuation primitive that the plugin does not use. the remaining evidence warns that custom hooks, commands, state, and recovery multiply maintenance and duplicate-execution risk.

**to answer it, look at:** the three-turn adapter experiment above. if it passes, specify the adapter and keep the sdk boundary. if it fails because the sdk contract itself cannot satisfy crash, resume, cancellation, or active-run blocking, specify only the smallest replacement core proven necessary by that failure.

## sources

| id | url | type | what it establishes |
|---|---|---|---|
| s1 | https://github.com/a5c-ai/babysitter | repository and sdk source | sdk scope, mit license, process runtime, event journal, replay, locks, profiles, blueprints, and cli surface |
| s2 | https://cdn.jsdelivr.net/npm/@a5c-ai/babysitter-sdk@6.0.2/dist/cli/commands/run%49terate.js | published package source | `run:iterate` handles one iteration and delegates effects to an external orchestrator |
| s3 | https://github.com/a5c-ai/babysitter/blob/main/plugins/babysitter-unified/per-harness/omp/extensions-index.ts | public integration source | omp commands forward to skill prompts instead of owning turn continuation |
| s4 | https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/extensions/types.ts#l1305-l1321 | platform api source | hidden next-turn messages can trigger an internal continuation |
| s5 | https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/session/agent-session.ts#l5928-l5983 | platform implementation source | generation deduplication, client deferral, and queued-message behavior after scheduling failure |
| s6 | https://code.claude.com/docs/en/goal | official product documentation | one explicit goal starts a session-scoped turn loop with resume and cancellation |
| s7 | https://code.claude.com/docs/en/hooks#stop | official hook documentation | stop-hook re-entry and the eight-block circuit breaker |
| s8 | https://github.com/othmanadi/planning-with-files/issues/50 | sustained open issue | concurrent sessions collide through shared active-plan state |
| s9 | https://github.com/yeachan-heo/oh-my-claudecode/issues/3698 | architecture issue | hook, skill, command, prompt, and gate sprawl forced consolidation |
| s10 | https://github.com/langchain-ai/langgraph/issues/7417 | sustained open issue | long-running work can be redispatched while the original remains live |
| s11 | https://github.com/langchain-ai/langgraph/issues/8039 | reproducible open bug | checkpoint ordering can duplicate a side effect after crash |
| s12 | https://docs.temporal.io/activity-definition#idempotency | official workflow documentation | replay and retry require application-owned idempotency |
| s13 | https://github.com/mark3labs/iteratr/issues/12 | open compatibility issue | a wrapper can reject a provider accepted by its underlying cli |
| s14 | https://github.com/awslabs/cli-agent-orchestrator/issues/12 | sustained open issue | dynamic worker discovery, permission, review, and cleanup remain coordination problems |
| s15 | https://github.com/hatchet-dev/hatchet/issues/2803 | sustained open issue | a permanent replay fault can enter an infinite retry path |
| s16 | https://www.elegantsoftwaresolutions.com/blog/stopped-building-agents-restarted-platform | first-person postmortem | split state, swallowed errors, shallow liveness, and lost session context caused false progress |
| s17 | https://www.anthropic.com/engineering/multi-agent-research-system | primary engineering writeup | production orchestration needs durable execution, checkpoints, retry, tracing, and coordinated versions; synchronous workers block progress |
| s18 | https://github.com/microsoft/autogen/commit/027ecf0a379bcc1d09956d46d12d44a3ad9cee14 | primary maintenance notice | platform absorption can strand a standalone orchestration api |
| s19 | https://docs.temporal.io/workflow-execution | official workflow documentation | service-backed durable execution persists and resumes workflows |
| s20 | https://github.com/sqlite/sqlite/blob/master/src/wal.c#l13-l150 | platform source | local wal commit, recovery, snapshots, and filesystem limits |
| s21 | https://github.com/pydantic/pydantic-ai/issues/530 | sustained design issue | exact-once graph snapshots under parallel tasks add structure and persistence cost |
| s22 | https://github.com/langchain-ai/langgraph/issues/2538 | sustained open bug | typed state can change shape at a durable node boundary |
| s23 | https://github.com/hatchet-dev/hatchet/releases/tag/v0.101.27 | primary release record | hatchet remained active on 2026-08-17 |
| s24 | https://github.com/awslabs/cli-agent-orchestrator/commits/main | primary commit history | aws cli agent orchestrator remained active on 2026-08-20 |
| s25 | https://github.com/othmanadi/planning-with-files | repository overview | file-backed turn reinjection and stop gating form a lightweight analogue |

## dropped

- download counts, star counts, adoption, revenue, and performance claims were dropped because the opened sources did not establish them.
- causal claims about openai product shutdowns were dropped because deprecation notices establish migration and shutdown, not why the products were deprecated.
- the stale `@a5c-ai/babysitter-sdk` 0.0.187 package found under the omp plugin directory was dropped because the active `babysitter` cli resolves to the separate global 6.0.2 metapackage.
- claims that omp hidden turns are exactly once were dropped. source establishes generation deduplication and queue retention, not durable effect fencing or guaranteed wake-up in every client.
- one provider-compatibility report with no maintainer disposition remains narrow evidence and is not treated as prevalence.
