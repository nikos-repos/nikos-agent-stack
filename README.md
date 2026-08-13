# nikos agent stack

an official omp plugin that adds deterministic delivery gates, a batched new-project questionnaire, and a read-only advisor agent to an omp installation.

the plugin ships three parts:

| part | kind | what it adds |
|---|---|---|
| gate checker | omp extension | deterministic post-turn delivery checks, commands, and a command-line audit surface |
| ask questionnaire | omp extension | forces one batched questionnaire through the native `ask` tool when a request starts a new project |
| terra advisor | omp agent | a read-only advisor that returns one source-backed advisory record |

## requirements

- an omp installation with plugin support and the `omp plugin` command.
- bun `>=1.0.0`. the extensions run as typescript through bun, and the command-line tools use the bun shebang.
- git, for full gate coverage. without a repository the gate checker stays active in a reduced mode (see [behavior boundaries](#behavior-boundaries)).
- no omp source checkout. the plugin uses documented plugin extension points and agent discovery only.

## install

published install:

```sh
omp plugin install nikos-agent-stack
```

local development install, from a clone of this repository:

```sh
omp plugin link .
```

both flows register the two extensions and the `terra-advisor` agent. no manual file copying and no changes to omp itself are needed.

## verify the installation

```sh
omp plugin list
omp plugin doctor
```

- `omp plugin list` must show `nikos-agent-stack` as installed and enabled.
- `omp plugin doctor` must report the plugin without unresolved entry points.

inside an omp session, `/gates-engage` with no argument reports the active engagement level and its source. the `terra-advisor` agent appears in the agent list.

## update

```sh
omp plugin install nikos-agent-stack@latest
```

for a linked development install, pull the repository and restart the omp session. the extensions load from the linked path.

## remove

```sh
omp plugin uninstall nikos-agent-stack
```

removal stops both extensions and removes the agent. persisted gate state stays on disk at `~/.omp/gate-checker/`; delete that directory to remove the level, ledger, and journal as well.

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

engagement levels:

```text
/gates-engage low
/gates-engage medium
/gates-engage high bun test
/gates-disable
```

| level | behavior |
|---|---|
| `low` | every finding is a warning. nothing blocks. for exploration and non-git work. |
| `medium` | default. completion, citation, subagent-claim, and verify failures block. the commit gate stays off. |
| `high` | every rule blocks, including the commit gate and the subagent manifest. |
| `off` | all checks and recording stop. set with `/gates-disable`. |

the level takes effect in the running session and persists to `~/.omp/gate-checker/config.json`. precedence is the config file, then `OMP_GATES_LEVEL`, then the default `medium`. `OMP_VERIFY_CMD` supplies a verification command when the config file has none. `OMP_GATE_CONFIG` and `OMP_GATE_LEDGER` relocate the config and ledger paths.

a repository can add its own forbidden markers in `.omp/gates-markers.txt`, one marker per line, `#` for comments.

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

the [gates plugin user guide](docs/gates-plugin-user-guide.md) covers configuration, rule reference, git and no-git behavior, commit routing, and troubleshooting.

## questionnaire

the questionnaire extension is a policy around the native omp `ask` tool. omp already supplies the questionnaire ui and transport; the extension only gates the agent loop around it.

it does four things:

1. detects a direct new-project request in user input.
2. injects concise batched-questionnaire guidance before the model call.
3. blocks every non-`ask` tool while the request is pending.
4. clears the pending request only after a successful, non-error `ask` result, and asks for one continuation turn at session stop while the request is unanswered.

## terra advisor

`terra-advisor` is an installed task agent, not a passive native advisor. it is spawned like any other agent and returns one structured record.

- tools are `read`, `grep`, and `glob` only. it cannot edit, write, or run commands.
- output is a structured object with `advice` and an `evidence` object of `{ path, line, claim, digest }`. the digest is copied verbatim from the read result snapshot header.
- it advises only when inspected source establishes a current decision, an explicit criterion, and a concrete path by which the candidate violates that criterion. otherwise it stays silent.
- it never delegates, and it never claims approval, gate, or handoff authority.

the full profile is [`agents/terra.md`](agents/terra.md).

## behavior boundaries

gates:

- enforcement runs at `session_stop`; inline marker feedback runs at `tool_result`.
- a continuation chain is capped by the runtime, and a no-progress chain aborts. neither is on the engagement dial.
- files already dirty at agent start are subtracted from the request diff by design.
- without git, the gate checker falls back to first-touch content hashing. the changed-file and added-line sets stay complete, but the commit gate cannot apply.
- a broken ledger or journal never breaks the session.

questionnaire:

- it does not mutate the core tool queue, does not force a tool selection, and does not replace or patch the `ask` ui.
- detection covers direct new-project phrasing in user input only. input from an extension never arms it, and indirect phrasing is not detected.
- while pending, non-`ask` tools are blocked; a failed `ask` keeps the request pending.
- pending state resets on session start, switch, and branch.

terra advisor:

- read-only, single record, evidence required. it produces no diffs, no commands, and no approvals.
- with no inspected source to ground a claim, it returns nothing rather than a guess.

## development

```sh
bun run test
```

this runs the gate-checker and questionnaire unit tests, the packaged-surface test, the embedded policy checks in `gate-checker/index.ts`, and the end-to-end wiring probe. the exact command is in [`package.json`](package.json).

## repository map

| path | purpose |
|---|---|
| [`package.json`](package.json) | plugin manifest: extension entry points, exports, binary, and packaged files |
| [`plugin.test.ts`](plugin.test.ts) | asserts the packaged public surface and the terra advisor contract |
| [`gate-checker/index.ts`](gate-checker/index.ts) | gate extension: lifecycle hooks, evidence capture, enforcement, and commands |
| [`gate-checker/config.js`](gate-checker/config.js) | engagement dial, level policies, and persisted configuration |
| [`gate-checker/predicates.js`](gate-checker/predicates.js) | shared deterministic gate predicates |
| [`gate-checker/scope.js`](gate-checker/scope.js) | canonical repository scopes and baseline capture |
| [`gate-checker/risks.js`](gate-checker/risks.js) | change-risk classification for audited scopes |
| [`gate-checker/provenance.js`](gate-checker/provenance.js) | subagent manifest and claim extraction |
| [`gate-checker/ledger.js`](gate-checker/ledger.js) | append-only record of every gate fire and outcome |
| [`gate-checker/journal.js`](gate-checker/journal.js) | request journal and recovery state |
| [`gate-checker/lease.js`](gate-checker/lease.js) | repository mutation lease |
| [`gate-checker/gate-cli.js`](gate-checker/gate-cli.js) | cutover, audit, and telemetry command-line interface |
| [`gate-checker/gates.js`](gate-checker/gates.js) | composable babysitter gate tasks |
| [`gate-checker/delivery-contract.process.js`](gate-checker/delivery-contract.process.js) | gated delivery-contract process built from those tasks |
| [`gate-checker/wiring-check.ts`](gate-checker/wiring-check.ts) | end-to-end probe that the gate fires from `session_stop` |
| [`ask-questionnaire/index.ts`](ask-questionnaire/index.ts) | questionnaire extension around the native `ask` tool |
| [`agents/terra.md`](agents/terra.md) | read-only terra advisor agent profile and output schema |
| [`docs/gates-plugin-user-guide.md`](docs/gates-plugin-user-guide.md) | complete gate user and operator guide |
