# nikos agent stack

an official omp plugin that adds deterministic delivery gates, a batched new-project questionnaire, and a native passive terra advisor to an omp installation.

the plugin ships three parts:

| part | kind | what it adds |
|---|---|---|
| gate checker | omp extension | deterministic post-turn delivery checks, commands, and a command-line audit surface |
| ask questionnaire | omp extension | forces one batched questionnaire through the native `ask` tool when a request starts a new project |
| terra advisor | native omp advisor | a read-only passive watchdog that sends source-backed notes through omp's advisor system |

## requirements

- an omp installation with plugin support and the `omp plugin` command.
- bun `>=1.2.22`. the extensions run as typescript through bun, and the command-line tools use the bun shebang.
- git, for full gate coverage. without a repository the gate checker stays active in a reduced mode (see [behavior boundaries](#behavior-boundaries)).
- no omp source checkout. the plugin uses documented plugin extension points and native advisor configuration only.

## install

published install:

```sh
omp plugin install nikos-agent-stack
```

then start an omp session and run the installed plugin setup command:

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
```

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

```sh
omp plugin install nikos-agent-stack@latest
```

then run `/advisor-install` in an omp session and restart the session.

## remove

```sh
omp plugin uninstall nikos-agent-stack
```

uninstall removes the plugin, but it does not remove the user `WATCHDOG.yml` or `WATCHDOG.yaml` file or its terra entry. `/advisor-install` updates that entry; `/advisor on` and `/advisor status` only control or report the native advisor. manually remove the terra entry from the user watchdog configuration while preserving its top-level instructions and other advisors. persisted gate state stays on disk at `~/.omp/gate-checker/`; delete that directory to remove the level, ledger, and journal as well.

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
```

| level | behavior |
|---|---|
| `low` | delivery findings warn, but a missing scratchpad record blocks. for exploration and non-git work. |
| `medium` | default. completion, citation, subagent-claim, verify, gate-integrity, and scratchpad failures block. the commit gate stays off. |
| `high` | every rule blocks, including the commit gate, subagent manifest, and scratchpad coverage. |
| `off` | all checks and recording stop. set with `/gates-disable`. |

slash level changes take effect in the running session and persist to `~/.omp/gate-checker/config.json`. direct config edits are loaded only when omp starts: restart omp before using `/gates-engage` after an external edit, or set the relevant `OMP_*` environment before the session. precedence is the config file, then `OMP_GATES_LEVEL`, then the default `medium`. `OMP_VERIFY_CMD` supplies a verification command when the config file has none. `OMP_GATE_CONFIG`, `OMP_GATE_LEDGER`, and `OMP_GATE_FRUSTRATIONS` relocate persisted paths.

`/gates-engage` accepts no arguments for status or exactly one level, and it preserves the in-memory verification command. set that command with `OMP_VERIFY_CMD` before the session or edit `verifyCmd`, restart omp, then use `/gates-engage`. a live slash call does not reload disk.

a repository can add its own forbidden markers in `.omp/gates-markers.txt`, one marker per line, `#` for comments.

### frustration scratchpad

enabled sessions append records to `~/.omp/gate-checker/frustrations.jsonl`, or the path in `OMP_GATE_FRUSTRATIONS`. call the native `record_frustration` tool with `agent_id`, `primary_goal`, `complaint`, `type`, `severity`, and nonempty `evidence`.

the server derives `session_file` and `session_id` from the active session and assigns `request_id` as server-local diagnostic metadata. `session_file` is the authoritative coverage key for main and subagents, and each child session file comes from native task provenance. `request_id` never participates in cross-session coverage. caller input cannot select or override these fields. fixed types are `tooling`, `environment`, `requirements`, `workflow`, `test`, `dependency`, `performance`, and `other`; fixed severities are `low`, `medium`, `high`, and `blocker`. a project can extend both lists in `.omp/gates-frustrations.json`.

the extension writes machine-authored scratchpad records for warning and blocking gate outcomes. those records satisfy main-session coverage in the same stop, never a child session. a missing active agent session blocks at every enabled level.

command-line audits use the same predicates as the extension:

```sh
bun run gate-checker/gate-cli.js audit --kind uncommitted --cwd . --json
bun run gate-checker/gate-cli.js cutover --base HEAD~1 --cwd .
bun run gate-checker/gate-cli.js stats --json
```

audit scopes:

- `request`: changes since a captured request baseline.
- `uncommitted`: staged, unstaged, and untracked changes.
- `base`: changes from a supplied merge base through the current commit.
- `commit`: changes introduced by one commit.

the [gates plugin user guide](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/gates-plugin-user-guide.md) covers configuration, rule reference, git and no-git behavior, commit routing, and troubleshooting.

## questionnaire

the questionnaire extension is a policy around the native omp `ask` tool. omp already supplies the questionnaire ui and transport; the extension only gates the agent loop around it.

it does four things:

1. detects a direct new-project request in user input, when the native `ask` tool is active.
2. injects concise batched-questionnaire guidance before the model call.
3. blocks every non-`ask` tool while the request is pending.
4. clears the pending request only after a successful, non-error `ask` result, and asks for one continuation turn at session stop while the request is unanswered.

the [ask questionnaire user guide](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/ask-questionnaire-user-guide.md) covers detection, policy transitions, and limitations.

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
- detection covers direct new-project phrasing in user input only. input from an extension never arms it, indirect phrasing is not detected, and nothing arms while the `ask` tool is inactive.
- while pending, non-`ask` tools are blocked; a failed `ask` keeps the request pending.
- pending state resets on session start, switch, and branch.

terra advisor:

- `/advisor-install` preserves top-level instructions and non-terra advisors, replaces or adds terra by normalized name, validates the native watchdog schema, and writes atomically in `PI_CODING_AGENT_DIR` when set, otherwise `~/.omp/agent`, to `WATCHDOG.yml` or an existing `WATCHDOG.yaml` when no `.yml` file exists. `nikos-gates advisor install` provides the same setup for direct package use.
- terra is read-only. omp routes its passive notes, handles concern and blocker interruption, and renders the advisor ui.
- evidence fields in a terra note are required by its instructions, not by omp's `note` and `severity` schema.
- plugin uninstall leaves the user watchdog entry until the user removes it manually.

## development

```sh
bun run test
```

this runs the gate-checker and questionnaire unit tests, the packaged-surface test, and the end-to-end wiring probe. the exact command is in [`package.json`](package.json).

## repository map

| path | purpose |
|---|---|
| [`package.json`](package.json) | plugin manifest: extension entry points, exports, binary, and packaged files |
| [`plugin.test.ts`](plugin.test.ts) | asserts the packaged public surface |
| [`gate-checker/index.ts`](gate-checker/index.ts) | gate extension: lifecycle hooks, evidence capture, enforcement, and commands |
| [`gate-checker/config.js`](gate-checker/config.js) | engagement dial, level policies, and persisted configuration |
| [`gate-checker/frustrations.js`](gate-checker/frustrations.js) | validated scratchpad records, identity coverage, taxonomy, and automatic gate records |
| [`gate-checker/predicates.js`](gate-checker/predicates.js) | shared deterministic gate predicates |
| [`gate-checker/scope.js`](gate-checker/scope.js) | canonical repository scopes and baseline capture |
| [`gate-checker/risks.js`](gate-checker/risks.js) | change-risk classification for audited scopes |
| [`gate-checker/provenance.js`](gate-checker/provenance.js) | subagent manifest and claim extraction |
| [`gate-checker/ledger.js`](gate-checker/ledger.js) | append-only record of every gate fire and outcome |
| [`gate-checker/journal.js`](gate-checker/journal.js) | request journal and recovery state |
| [`gate-checker/lease.js`](gate-checker/lease.js) | repository mutation lease |
| [`gate-checker/gate-cli.js`](gate-checker/gate-cli.js) | cutover, audit, telemetry, and advisor setup command-line interface |
| [`gate-checker/wiring-check.ts`](gate-checker/wiring-check.ts) | end-to-end probe that the gate fires from `session_stop` |
| [`ask-questionnaire/index.ts`](ask-questionnaire/index.ts) | questionnaire extension around the native `ask` tool |
| [`advisor/WATCHDOG.yml`](advisor/WATCHDOG.yml) | native terra advisor watchdog configuration and prompt-enforced evidence rules |
| [`docs/gates-plugin-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/gates-plugin-user-guide.md) | complete gate user and operator guide |
| [`docs/ask-questionnaire-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/ask-questionnaire-user-guide.md) | questionnaire detection, policy, and limitations |
| [`docs/advisor-role-user-guide.md`](https://github.com/nikos-repos/nikos-agent-stack/blob/main/docs/advisor-role-user-guide.md) | advisor setup, passive behavior, evidence-note rules, and limitations |
