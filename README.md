# nikos agent stack

an official omp plugin that adds deterministic delivery gates, a native durable orchestration engine, a policy gate for native questionnaires, and a passive terra advisor to an omp installation.

the plugin ships four parts:

| part              | kind                  | what it adds                                                                                       |
| ----------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| gate checker      | omp extension         | deterministic post-turn delivery checks, commands, and a command-line audit surface                |
| omnipotence       | omp extension and cli | starts one versioned process and advances it through hidden turns with sqlite recovery             |
| ask questionnaire | omp extension         | keeps an explicitly declared questionnaire open until the native `ask` tool returns successfully   |
| terra advisor     | native omp advisor    | a read-only passive watchdog that sends source-backed notes through omp's advisor system           |

## requirements

- an omp installation with plugin support and the `omp plugin` command.
- bun `>=1.2.22`. the extensions run as typescript through bun, and the command-line tools use the bun shebang.
- git, for full gate coverage. without a repository the gate checker stays active in a reduced mode (see [behavior boundaries](#behavior-boundaries)).
- no omp source checkout. the plugin uses documented plugin extension points and native advisor configuration only.
- no babysitter runtime. omnipotence uses omp, bun's built-in sqlite api, and node-compatible standard modules.

## install

published install:

```sh
omp plugin install nikos-agent-stack
```

this registers omp extensions only. if you need the `nikos-gates` or `omnipotence` shell commands, also install the published package globally:

```sh
bun add --global nikos-agent-stack
export PATH="$(bun pm bin -g):$PATH"
```

after installation, start an omp session. `𓂀` appears in the status line while the omnipotence extension is running.

in that session, run the installed plugin setup command:

```text
/advisor-install
```

restart the session, then use the native advisor commands:

```text
/advisor on
/advisor status
```

local development install, from a clone of this repository:

```sh
omp plugin link .
bun link
PATH="$(bun pm bin -g):$PATH" omnipotence --help
```

`omp plugin link .` registers omp extensions only. `bun link` registers shell commands from this checkout. the verification command prepends bun's global bin directory to `path` for this invocation, so it works even when that directory was not already on `path`.

then start an omp session and run `/advisor-install`.

the setup command merges terra into the user watchdog configuration. no manual file copying and no changes to omp itself are needed. `nikos-gates advisor install` remains available for direct package use outside omp.

## start the advisor

after `/advisor-install`, restart omp:

```text
/advisor on
/advisor status
```

`/advisor-install` updates the watchdog configuration. `/advisor on` enables native passive monitoring and `/advisor status` reports native advisor state. omp owns advisor routing, concern and blocker interruption, and the advisor ui.

## update

the existing omp command updates the omp extensions:

```sh
omp plugin install nikos-agent-stack@latest
```

if you installed `nikos-gates` or `omnipotence` globally with bun, update those global cli shims separately:

```sh
bun add --global nikos-agent-stack@latest
```

then run `/advisor-install` in an omp session and restart the session.

## remove

```sh
omp plugin uninstall nikos-agent-stack
```

uninstall removes the plugin, but it does not remove the user `WATCHDOG.yml` or `WATCHDOG.yaml` file or its terra entry. `/advisor-install` updates that entry; `/advisor on` and `/advisor status` only control or report the native advisor. manually remove the terra entry from the user watchdog configuration while preserving its top-level instructions and other advisors. persisted gate state stays at `~/.omp/gate-checker/`. omnipotence state stays at `~/.omp/nikos-agent-stack/omnipotence.sqlite`, with local blueprints beside it. delete these paths only after every run is terminal and a required backup exists.

## omnipotence

omnipotence is a native durable workflow engine for omp. it runs one schema-validated, versioned process as a replayable sequence of committed effects instead of forwarding prompts to a separate orchestrator.

features:

- **deterministic process runtime** — stable process ids, semantic versions, input and output schemas, finite turn budgets for finite modes, replay-compatible retained budgets for forever runs, source-drift detection, and replay from committed state.
- **effect primitives** — tasks, bounded parallel groups, pinned subprocesses, durable sleep, user breakpoints, registered hooks, and intentional halt.
- **native execution modes** — `babysit`, `plan`, `yolo`, and `forever` use one engine with mode-specific execution and breakpoint policy.
- **durable recovery** — sqlite events and projections, idempotent result posts, input hashes, lease epochs, fencing, explicit uncertain-effect resolution, doctor, backup, and repair.
- **tree and session safety** — session-bound result ownership, atomic start reservation, root-tree operation leases, complete-tree re-fencing, child-first halt, and lease-consistent result snapshots.
- **hooks and profiles** — ordered lifecycle hooks with timeouts and retryable resolved-effect delivery, plus versioned user and project profiles merged through json merge patch.
- **local blueprints** — hash-verified local packages, side-by-side semantic versions, minimum engine checks, pinned active runs, including forever runs, update, rollback, and guarded removal.
- **operator surfaces** — omp commands and a standalone cli with human or json output, dry-run support for mutations, process planning, run and effect inspection, session controls, and recovery commands.

install a local blueprint, then start one process:

```sh
omnipotence --dry-run blueprint install ./delivery-pack
omnipotence blueprint install ./delivery-pack
```

```text
/omnipotence delivery.review {\"request\":\"review this change\"}
/omnipotence-status
```

gate-checker remains the first `session_stop` handler. after a gate accepts the turn, omnipotence schedules the next committed effect through omp's hidden next-turn api. a blocked active run reports its current block reason at session stop until the condition is resolved; sessions without an active run receive no omnipotence block.

`/omnipotence-forever` starts one unbounded native orchestration run. its policy auto-approves optional process breakpoints but still waits at required breakpoints for `/omnipotence-resume`; normal omp tool approval and point-of-risk confirmation remain. the run does not enforce or extend its retained `maxturns` value; finite modes enforce their configured budgets. `/omnipotence-stop` ends it explicitly. host shutdown pauses durable work and recovery resumes it for the owning session; this is not a daemon and does not automatically restart a process after it returns. recovery schedules requested external work only when both dispatch timestamps are null. acknowledged or unknown outcomes are never resent, remain uncertain, and fail closed until resolved. the standalone cli is one-shot and cannot provide autonomous hidden-turn scheduling. active forever runs pin their blueprint version, and durable replay state grows with each committed cycle.

see the [omnipotence user guide](docs/omnipotence-user-guide.md) for process and blueprint authoring, modes, hooks, profiles, commands, state, recovery, and safety.

## gates

the gate checker turns delivery claims into machine-checkable post-conditions. it captures a baseline at agent start, diffs it at session stop, and reports or blocks on findings.

rule families:

- `completion`: forbidden stub or placeholder markers in added lines.
- `citation`: modification and test-result claims that the diff denies.
- `snapshot`: snapshot-tag references without grounding.
- `manifest`: a subagent that returns no `<changed-files>` manifest.
- `subagentClaim`: subagent claims checked against the diff.
- `verify`: the configured verification command must pass.
- `commit`: the working tree must be committed.
- `scratchpad`: each active agent session needs one validated frustration record.

engagement levels:

```text
/gates-engage
/gates-engage low
/gates-engage medium
/gates-engage high
/gates-disable
/gates-lease status
/gates-lease on
/gates-lease off
```

`/gates-lease` reports or changes only the current session's cooperative worktree operation lease. it needs no restart. `on` enables and `off` disables the lease live for the current session; neither changes startup behavior. `off` refuses while the session tracks an active operation and releases only this instance's idle lease.


| level    | behavior                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `low`    | delivery findings warn, but a missing scratchpad record blocks. for exploration and non-git work.                                |
| `medium` | default. completion, citation, subagent-claim, verification, runtime-integrity, interrogation, repeated home-path, and scratchpad failures block. the commit gate stays off. |
| `high`   | medium policy plus blocking snapshot, manifest, and commit checks. complexity findings remain warnings.                              |
| `off`    | delivery checks, scratchpad enforcement, and gate outcome telemetry stop. request journal bookkeeping and the no-git diagnostic can still close and describe the active request. set with `/gates-disable`. |

slash level changes take effect in the running session and persist to `~/.omp/gate-checker/config.json`. direct config edits are loaded only when omp starts: restart omp before using `/gates-engage` after an external edit, or set the relevant `OMP_*` environment before the session. precedence is the config file, then `OMP_GATES_LEVEL`, then `OMP_DELIVERY_GATES`: any nonempty value except `0`, `false`, or `off` selects `high`; those three values and an unset variable fall through to the default `medium`. `OMP_VERIFY_CMD` and `OMP_COMPLEXITY_CMD` supply commands when the config file has none. `OMP_GATE_CONFIG`, `OMP_GATE_LEDGER`, and `OMP_GATE_FRUSTRATIONS` relocate persisted paths. the mutation lease is enabled at startup by default; set `OMP_GATE_MUTATION_LEASE` before startup to `0`, `false`, or `off` to disable it. `OMP_GATE_MUTATION_LEASE_WAIT_MS` sets its acquisition wait. unset and all other lease-enable values enable it. other delivery gates remain independent.

`/gates-engage` accepts no arguments for status or exactly one level, and it preserves the in-memory verification command. set that command with `OMP_VERIFY_CMD` before the session or edit `verifyCmd`, restart omp, then use `/gates-engage`. a live slash call does not reload disk.

a repository can add its own forbidden markers in `.omp/gates-markers.txt`, one marker per line, `#` for comments.

### frustration scratchpad

enabled sessions append records to `~/.omp/gate-checker/frustrations.jsonl`, or the path in `OMP_GATE_FRUSTRATIONS`. call the native `record_frustration` tool with `agent_id`, `primary_goal`, `complaint`, `type`, `severity`, and `evidence`.

the server derives `session_file` and `session_id` from the active session and assigns `request_id` as server-local diagnostic metadata. `session_file` is the authoritative coverage key for main and subagents, and each child session file comes from native task provenance. caller input cannot override these fields or the server-controlled `source`: tool records use `agent`, automatic gate records use `auto`, and older records without the field appear as `legacy` in stats.

fixed types are `tooling`, `environment`, `requirements`, `workflow`, `test`, `dependency`, `performance`, `other`, and `none`; fixed severities are `low`, `medium`, `high`, and `blocker`. a project can extend both lists in `.omp/gates-frustrations.json`. real friction needs nonempty `gate`, `snapshot`, or `command` evidence. a friction-free session uses `type: "none"`, `complaint: "none"`, `severity: "low"`, and may send an empty evidence array; the extension discards caller evidence and injects one trusted `clean_turn` gate entry.

the extension writes machine-authored scratchpad records for warning and blocking gate outcomes. those records satisfy main-session coverage in the same stop, never a child session. an agent may append its own perspective. a missing active agent session blocks at every enabled level. if an agent files `none` after a failed tool result or a continuation forced by another blocking rule, the extension writes the non-blocking `clean_under_errors` telemetry event. the missing-record continuation itself does not count as friction.

command-line gate commands use the same predicates as the extension:

```sh
bun run gate-checker/gate-cli.js audit --kind uncommitted --cwd . --json
bun run gate-checker/gate-cli.js cutover --base HEAD~1 --cwd .
bun run gate-checker/gate-cli.js stats --json
bun run gate-checker/gate-cli.js lease status [--cwd path] [--json]
bun run gate-checker/gate-cli.js lease release [--cwd path] --stale-only
```

`stats` reports frustration counts by type and source (`agent`, `auto`, or `legacy`) and the number of `clean_under_errors` events, in both text and json output. the [gates plugin user guide](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/gates-plugin-user-guide.md) documents authorized force release.

audit scopes:

- `request`: changes since a captured request baseline.
- `uncommitted`: staged, unstaged, and untracked changes.
- `base`: changes from a supplied merge base through the current commit.
- `commit`: changes introduced by one commit.

the [gates plugin user guide](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/gates-plugin-user-guide.md) covers configuration, rule reference, git and no-git behavior, commit routing, and troubleshooting.

## questionnaire

the questionnaire extension is a policy around the native omp `ask` tool. omp already supplies the questionnaire ui and transport; the extension only gates the agent loop around it.

it does four things:

1. exposes `questionnaire_open` so a skill or workflow can declare one pending questionnaire with an owner and reason.
2. injects that reason as hidden guidance before each model turn while the questionnaire is pending.
3. allows repository inspection and the native `ask` tool, but blocks tools outside its fixed allowlist.
4. clears the pending request only after a successful, non-error `ask` result, and asks for one continuation turn at session stop while the questionnaire is unanswered.

the [ask questionnaire user guide](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/ask-questionnaire-user-guide.md) covers declaration, the native ask experience, policy transitions, settings, and limits.

## terra advisor

terra is a native passive advisor configured by [`advisor/WATCHDOG.yml`](advisor/WATCHDOG.yml). after `/advisor on`, omp monitors the session and routes terra notes through its native advisor flow.

- terra uses `read`, `grep`, and `glob` only. it cannot edit, write, or run commands.
- terra advises only when inspected source establishes a current decision, an explicit criterion, and a concrete path by which the candidate violates that criterion or remains materially unverified. otherwise it stays silent.
- terra never claims approval, gate, or handoff authority.
- omp owns native advisor routing, concern and blocker interruption, and the advisor ui.
- omp machine-enforces only `note` and `severity`. terra's instructions require `path`, `line`, `claim`, and a read-snapshot digest inside each note; those evidence fields are prompt-enforced, not schema-enforced.

the [advisor role user guide](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/advisor-role-user-guide.md) covers setup, passive behavior, evidence notes, and limitations.

## behavior boundaries

gates:

- enforcement runs at `session_stop`; inline marker feedback runs at `tool_result`. at level `off` the `tool_call` handler does nothing at all.
- a no-tool request skips final checks only when it also has no final assistant text and no journal recovery.
- a request that asked the user is released only when it changed no file, has no journal recovery, and every active agent session has a scratchpad record.
- a continuation chain is capped by the runtime, and a no-progress chain aborts. neither is on the engagement dial.
- files already dirty at agent start are subtracted from the request diff by design.
- without git, the gate checker falls back to first-touch content hashing. the changed-file and added-line sets stay complete, but the commit gate cannot apply.
- a broken ledger or journal never breaks the session.

questionnaire:

- it does not mutate the core tool queue, does not force a tool selection, and does not replace or patch the `ask` ui.
- only a successful `questionnaire_open` tool call arms the policy. the extension does not inspect request text or infer that a questionnaire is needed.
- while pending, `read`, `grep`, `glob`, `lsp`, `ast_grep`, `inspect_image`, `ask`, and `questionnaire_open` remain available. every other tool is blocked, and a failed `ask` keeps the request pending.
- pending state resets on session start, switch, and branch.

terra advisor:

- `/advisor-install` preserves top-level instructions and non-terra advisors, replaces or adds terra by normalized name, validates the native watchdog schema, and writes atomically in `PI_CODING_AGENT_DIR` when set, otherwise `~/.omp/agent`, to `WATCHDOG.yml` or an existing `WATCHDOG.yaml` when no `.yml` file exists. `nikos-gates advisor install` provides the same setup for direct package use.
- terra is read-only. omp routes its passive notes, handles concern and blocker interruption, and renders the advisor ui.
- evidence fields in a terra note are required by its instructions, not by omp's `note` and `severity` schema.
- plugin uninstall leaves the user watchdog entry until the user removes it manually.

## repository map

| path                                                                                                                                      | purpose                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [`package.json`](package.json)                                                                                                            | plugin manifest: extension entry points, exports, binary, and packaged files          |
| [`plugin.test.ts`](plugin.test.ts)                                                                                                        | asserts the packaged public surface                                                   |
| [`gate-checker/index.ts`](gate-checker/index.ts)                                                                                          | gate extension: lifecycle hooks, evidence capture, enforcement, and commands          |
| [`gate-checker/config.js`](gate-checker/config.js)                                                                                        | engagement dial, level policies, and persisted configuration                          |
| [`gate-checker/frustrations.js`](gate-checker/frustrations.js)                                                                            | validated scratchpad records, identity coverage, taxonomy, and automatic gate records |
| [`gate-checker/predicates.js`](gate-checker/predicates.js)                                                                                | shared deterministic gate predicates                                                  |
| [`gate-checker/scope.js`](gate-checker/scope.js)                                                                                          | canonical repository scopes and baseline capture                                      |
| [`gate-checker/risks.js`](gate-checker/risks.js)                                                                                          | change-risk classification for audited scopes                                         |
| [`gate-checker/provenance.js`](gate-checker/provenance.js)                                                                                | subagent manifest and claim extraction                                                |
| [`gate-checker/ledger.js`](gate-checker/ledger.js)                                                                                        | append-only record of every gate fire and outcome                                     |
| [`gate-checker/journal.js`](gate-checker/journal.js)                                                                                      | request journal and recovery state                                                    |
| [`gate-checker/lease.js`](gate-checker/lease.js)                                                                                          | cooperative worktree operation lease                                                   |
| [`gate-checker/gate-cli.js`](gate-checker/gate-cli.js)                                                                                    | cutover, audit, telemetry, advisor setup, and lease recovery command-line interface   |
| [`gate-checker/wiring-check.ts`](gate-checker/wiring-check.ts)                                                                            | end-to-end probe that the gate fires from `session_stop`                              |
| [`omnipotence/index.ts`](omnipotence/index.ts)                                                                                            | native omp commands, result tool, session recovery, and hidden-turn scheduling        |
| [`omnipotence/engine.ts`](omnipotence/engine.ts)                                                                                          | deterministic process replay, effects, subprocesses, modes, and terminal behavior     |
| [`omnipotence/store.ts`](omnipotence/store.ts)                                                                                            | sqlite event record, projections, fencing, profiles, blueprints, doctor, and repair   |
| [`omnipotence/cli.ts`](omnipotence/cli.ts)                                                                                                | public `omnipotence` command-line interface                                           |
| [`ask-questionnaire/index.ts`](ask-questionnaire/index.ts)                                                                                | questionnaire extension around the native `ask` tool                                  |
| [`advisor/WATCHDOG.yml`](advisor/WATCHDOG.yml)                                                                                            | native terra advisor watchdog configuration and prompt-enforced evidence rules        |
| [`docs/gates-plugin-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/gates-plugin-user-guide.md)           | complete gate user and operator guide                                                 |
| [`docs/ask-questionnaire-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/ask-questionnaire-user-guide.md) | questionnaire declaration, native ask behavior, policy, settings, and limits                            |
| [`docs/advisor-role-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/advisor-role-user-guide.md)           | advisor setup, passive behavior, evidence-note rules, and limitations                 |
| [`docs/omnipotence-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/omnipotence-user-guide.md)             | native process, blueprint, cli, state, recovery, and safety guide                                    |
