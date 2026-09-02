# gates plugin user guide

> deterministic delivery checks for omp sessions

## contents

- [what the plugin does](#what-the-plugin-does)
- [installation](#installation)
- [quick start](#quick-start)
- [engagement levels](#engagement-levels)
- [automatic extension behavior](#automatic-extension-behavior)
  - [interrogate tool](#interrogate-tool)
  - [request journal](#request-journal)
  - [session-stop decision order](#session-stop-decision-order)
- [gate rule reference](#gate-rule-reference)
- [advisory risk rules](#advisory-risk-rules)
- [configuration](#configuration)
- [custom forbidden markers](#custom-forbidden-markers)
- [git and no-git behavior](#git-and-no-git-behavior)
- [verification command behavior](#verification-command-behavior)
- [complexity command behavior](#complexity-command-behavior)
- [commit routing](#commit-routing)
- [subagent contract](#subagent-contract)
- [scratchpad records](#scratchpad-records)
- [command-line tools](#command-line-tools)
- [repository scopes and audit](#repository-scopes-and-audit)
- [telemetry and tuning](#telemetry-and-tuning)
- [troubleshooting](#troubleshooting)

## what the plugin does

this installation has one enforcement layer: the `nikos-agent-stack` plugin declares `./gate-checker/index.ts` in `package.json#omp.extensions`. omp loads that entry from the installed plugin at startup. the extension collects request evidence, warns during edits, checks the final response, runs an optional verification command, and can require a clean tracked working tree.

the extension and the `gate-cli.js` command-line surface both use `predicates.js` for added-line parsing, forbidden-marker checks, path matching, manifests, and the clean-tree predicate. this avoids two gate implementations with different results.

the plugin manager owns the installed files. no procedure in this guide requires manual file placement in an omp runtime directory.

sources: [package manifest](../package.json), [extension entry point](../gate-checker/index.ts), [shared predicates](../gate-checker/predicates.js)

## installation

the stack installs through the native omp plugin manager. the plugin name is
`nikos-agent-stack`. all actions use `omp plugin <action> [target]`.

bun `>=1.2.22` is required. the extensions run as typescript through bun, and the command-line interface uses the bun shebang.

### install

```sh
omp plugin install nikos-agent-stack
```

`--scope user` is the default and installs for every project. use
`--scope project` to bind the plugin to the current project only.

### link a local checkout

use a link when you develop the stack or run a local revision:

```sh
omp plugin link .
```

run this from the `nikos-agent-stack` repository root. the link points omp at
the working tree, so later source edits need no reinstall.

### verify the installation

```sh
omp plugin list
omp plugin doctor
```

`list` shows the plugin, its version, and its enabled state. `doctor` reports discovery and load problems, and `doctor --fix` repairs the ones it can. restart omp after installation or repair because extension discovery occurs at startup.

### update

```sh
omp plugin install nikos-agent-stack@latest
```

the update reinstalls the plugin at the newest published version. a linked
checkout does not need this command. update its source instead.

### enable or disable without removal

```sh
omp plugin disable nikos-agent-stack
omp plugin enable nikos-agent-stack
```

a disabled plugin stays installed and loads no extension. this is not the same
as `/gates-disable`, which keeps the extension loaded and turns off its rules.

### remove

```sh
omp plugin uninstall nikos-agent-stack
```

removal deletes the installed package. persisted configuration, ledger, and
scratchpad data remain available to later installations.

### after any install, link, update, or removal

restart omp. extension discovery occurs at startup.

installed state, versions, and enablement live in
`~/.omp/plugins/omp-plugins.lock.json`. the plugin manager owns that file. do
not edit installed plugin files by hand; change the source and link it, or
install the corrected revision.

source: [declared extension entries and package contents](../package.json)

## quick start

### inspect the current state

```text
/gates-engage
```

with no argument, this command prints the active level, the marker, claim, manifest, subagent, snapshot, verification, complexity, commit, runtime, and runaway status lines, plus the configuration source. it prints no separate lines for the inline notice, scratchpad coverage, `no-absolute-home-path`, missing interrogation, or advisory risk; see [engagement levels](#engagement-levels) for those modes.

### use the normal coding profile

```text
/gates-engage medium
```

medium blocks unfinished added lines, home paths left after a `no-absolute-home-path` interruption, unsupported file or test claims, contradicted subagent reports, missing interrogation, missing test evidence, failing verification, runtime or scope recovery failures, and missing scratchpad coverage. it does not require a commit.

### use strict delivery checks

```text
/gates-engage high
```

high blocks the completion, citation, snapshot, manifest, subagent-claim, verification, commit, scratchpad, and runtime families. a configured complexity command stays warning-only at every level, and scope risk findings stay advisory at every level. it blocks a failing configured verification command, but it does not invent a verifier. configure verification with `OMP_VERIFY_CMD` before a session or with `verifyCmd` in persisted configuration; trailing command text is rejected.

### use warnings only

```text
/gates-engage low
```

low keeps delivery findings advisory, but a missing scratchpad record still forces a continuation.

### disable gate checks

```text
/gates-disable
```

`/gates-disable` stops enforcement and scratchpad checks. the extension still opens a `request_start` journal entry and a terminal journal entry for each request, and still records a `no_git` ledger entry when the working directory is not a git repository.

slash level changes apply in the current session and persist for later sessions. direct edits to persisted configuration are not reloaded by a live slash call: restart omp before a slash level change after an edit, or set the relevant `OMP_*` environment before the session.

### update the running plugin

```sh
omp plugin install nikos-agent-stack@latest
```

the manifest `files` list selects the complete runtime file set. test files are
excluded. restart omp after an update because extension discovery occurs at
startup. see [installation](#installation) for install, link, enable, disable,
and removal.

source: [command registration and live policy updates](../gate-checker/index.ts), [level descriptions](../gate-checker/config.js), [runtime file allowlist](../package.json)

## engagement levels

| rule family | off | low | medium | high |
|---|---:|---:|---:|---:|
| inline marker notice after `write` or `edit` | off | on | on | on |
| forbidden markers in added lines | off | warn | block | block |
| absolute home path left in an added line after a `no-absolute-home-path` interruption | off | warn | block | block |
| missing interrogate call for a changed generation (`missing_interrogation`) | off | warn | block | block |
| parent file and test claims | off | warn | block | block |
| snapshot tag references | off | off | warn | block |
| missing subagent manifest | off | off | auto | block |
| subagent claims against the diff | off | warn | block | block |
| configured verification command | off | warn | block | block |
| configured complexity command on changed paths (`complexity_failed`) | off | warn | warn | warn |
| clean tracked working tree | off | off | off | block |
| scratchpad record for every active identity | off | block | block | block |
| session-stop runtime findings, such as journal recovery or an unreadable scope | off | warn | block | block |
| telemetry | off | on | on | on |
| stalemate release and continuation cap | not applicable | on | on | on |

medium and high emit blocking `no_test_run` when files changed, no verification command is configured, and no passing test runner was observed. scope risk findings (`risk.*`) stay advisory at every enabled level. the cooperative mutation lease acts before a mutation-capable operation, not at session stop: a live lease conflict blocks that operation at every enabled level, independent of this warning and block matrix.

`auto` means:

- warn when the subagent omitted a manifest but its report does not contradict the observed diff.
- block when the manifest is absent and a claimed changed file is not in the observed diff.

warnings appear in the user interface and ledger, but they never force another model turn. blocking failures can force a continuation.

source: [policy matrix and rule mapping](../gate-checker/config.js), [policy application and severity handling](../gate-checker/index.ts)

## automatic extension behavior

### lifecycle

```text
session start
  -> show active gate state
agent start
  -> capture request baseline
  -> detect git or show low: no git
tool call
  -> bind the first repository exposed by cwd or path
  -> record touched files
  -> route commit commands
tool result
  -> collect read and edit snapshot tags
  -> report newly added forbidden markers
  -> collect bash and subagent evidence
session stop
  -> derive changed files and added lines
  -> run configured verification and commit gates
  -> check claims, manifests, snapshots, and markers
  -> check scratchpad identity coverage and write automatic gate records
  -> warn, release, or force a continuation
```

source: [extension hooks](../gate-checker/index.ts)

### inline marker feedback

successful `write` and `edit` results receive an inline notice when that call adds a forbidden marker. the check examines only text introduced by the current tool call. the final session check remains a backstop for bash edits and subagent edits.

source: [inline additions and tool-result hook](../gate-checker/index.ts), [completion predicate](../gate-checker/predicates.js)

### interrogate tool

the extension registers an `interrogate` tool with write approval and three required string fields: `unnecessary`, `deleted`, and `simplified`. while gates are enabled and the request changed files, one call is required when the generation adds a file, renames a file, creates an untracked file, or changes a dependency manifest or lockfile. a missing call warns at low and blocks at medium and high with rule `missing_interrogation`. the answer is recorded against the generation fingerprint, so a later changed generation needs a new call.

source: [interrogate tool and trigger checks](../gate-checker/index.ts)

### final response enforcement

at session stop, the plugin partitions findings into warnings and blocks:

- warnings are recorded and shown, then the response is released.
- blocks return `continue: true` with deterministic failure details, so the agent must continue work.
- an identical blocking result after one forced continuation is a stalemate. the plugin releases the response and records the outcome.
- the plugin allows at most three forced continuations. unresolved failures then release for manual review.

source: [session-stop enforcement and runaway protection](../gate-checker/index.ts)

### session-stop decision order

gate-checker registers the package's only `session_stop` handler. it evaluates the gate completion decision first, then the ask-questionnaire decision, then the omnipotence decision, through independent write-once slots. the first decision that qualifies wins, so stop precedence does not depend on extension load order.

source: [session-stop handler registration](../gate-checker/index.ts), [write-once stop slots](../stop-slot.ts)

### when final enforcement is skipped

final checks do not run when:

- the active level is off.
- the request made no tool calls, has no final assistant text, and has no journal recovery.
- no final assistant text exists, the request did not use the user-question tool, changed no file, had no tool error, and no journal recovery exists.
- the request used the user-question tool, changed no file, has no journal recovery, and every active agent session has a valid scratchpad record.

a `write` or `edit`, or any failed tool call, keeps the final checks running even with no final assistant text.

verification and commit checks also require at least one observed changed file. read-only work is not required to run tests or create a commit.

source: [session-stop early returns and change gate](../gate-checker/index.ts)

### request journal

the extension writes `omp.gate-checker.journal` custom session entries for request start, repository binding, verification, continuation, and terminal outcome. it reconstructs active request state after session start, branch, and tree navigation. a malformed, overlapping, stale, or policy-incompatible journal closes as `recovery_required` instead of guessing the request state.

terminal outcomes are `passed`, `passed_with_warnings`, or `released_with_failures`. an unresolved release carries `stalemate` or `continuation_cap`; disabled and non-work-bearing requests carry an explicit skip reason. a release with unresolved findings is never reported as a pass. request start and terminal bookkeeping still close the request when the engagement level is off, although delivery checks and gate telemetry are disabled.

source: [journal reducer](../gate-checker/journal.js), [journal lifecycle](../gate-checker/index.ts)

## gate rule reference

| rule id | condition | resolution |
|---|---|---|
| `forbidden_marker` | an added line contains a default or project marker | implement the behavior or remove the marker |
| `no-absolute-home-path` | an added line still carries an absolute home path after an interruption | remove the absolute home path from the added line |
| `missing_interrogation` | the changed generation has no interrogate call | call `interrogate` for this generation |
| `fabricated_modification` | the final response claims a backticked file changed, but the observed diff does not contain it | change the file or remove the claim |
| `fabricated_test_result` | the final response claims tests passed without a successful recognized test-runner call or configured verification run | run the tests or remove the claim |
| `ungrounded_snapshot_tag` | the response cites a four-hex read or edit snapshot tag that this request did not receive | use a current tool result or remove the tag |
| `subagent_missing_manifest` | a referenced subagent report has no literal or json changed-file manifest | add the manifest or verify the work without relying on the report |
| `subagent_manifest_mismatch` | a manifest lists a file outside the observed diff | correct the manifest or the work |
| `subagent_fabricated_modification` | subagent prose claims a file changed outside the observed diff | verify and correct the report |
| `subagent_unverified_test` | a subagent claims tests passed without parent-session test evidence | run the tests in the parent session |
| `verify_failed` | the configured verification command exits nonzero or times out | fix the failure; do not weaken the check |
| `no_test_run` | medium or high changed files with no configured verifier and no observed passing test runner | run the project test command or set a verify command |
| `complexity_failed` | the configured complexity command failed on the changed paths | warning only |
| `uncommitted_changes` | high mode finds tracked unstaged or staged changes | commit the logical unit or lower the engagement level |
| `missing_frustration_record` | an active main or subagent server session has no valid scratchpad record | call `record_frustration` for that session |
| `recovery_required` | the request journal is malformed, stale, or policy-incompatible | start a fresh request |
| `scope_unavailable` | git is present but the repository scope could not be resolved | repair the repository, then retry |

advisory `risk.*` ids — `risk.auth_permissions`, `risk.dependencies`, `risk.migration`, `risk.public_contract`, `risk.file_deletion`, `risk.rename`, `risk.mode_change`, `risk.binary`, `risk.submodule`, `risk.destructive_operation` — are listed under [advisory risk rules](#advisory-risk-rules).

file-claim detection targets modification verbs followed by a backticked path that contains a slash and file extension. test-claim detection recognizes common statements such as “tests passed” and common runners for node, python, rust, go, ruby, java, and deno.

sources: [rule mapping](../gate-checker/config.js), [claim and snapshot checks](../gate-checker/index.ts), [marker predicate](../gate-checker/predicates.js), [scratchpad validation](../gate-checker/frustrations.js)

## advisory risk rules

the request audit reports advisory findings when changed paths match authentication or permissions, dependency manifests or lockfiles, migrations or schemas, or public contract surfaces. it also reports tracked deletion, rename, mode change, binary content, submodule changes, and added destructive commands such as `drop table`, `truncate table`, `delete from`, or `rm -rf`.

these findings use stable `risk.*` ids and remain advisory at every enabled engagement level. no finding means that no deterministic rule matched; it does not prove that the change is safe.

source: [advisory risk rules](../gate-checker/risks.js), [risk integration](../gate-checker/index.ts)

## configuration

### persisted configuration

by default, slash commands write:

```text
~/.omp/gate-checker/config.json
```

format:

```json
{
  "level": "medium",
  "verifyCmd": "bun test"
}
```

set `verifyCmd` to the verification command your project uses.

set `complexityCmd` to the project complexity command. when a request changed files, the configured command runs against those paths and produces warning-only `complexity_failed` findings.

### configuration precedence

1. the persisted configuration file.
2. `OMP_GATES_LEVEL`.
3. `OMP_DELIVERY_GATES`, which maps any enabled value to high.
4. the default level, medium.

`OMP_VERIFY_CMD` supplies a verification command when the persisted configuration does not contain one.

`OMP_COMPLEXITY_CMD` supplies a complexity command when the persisted configuration does not contain one.

### environment variables

| variable | purpose |
|---|---|
| `OMP_GATES_LEVEL` | selects `off`, `low`, `medium`, or `high` when no persisted config takes precedence |
| `OMP_VERIFY_CMD` | sets the verification command when the config file does not set one |
| `OMP_COMPLEXITY_CMD` | sets the complexity command when the config file does not set one |
| `OMP_DELIVERY_GATES` | maps an enabled value to high |
| `OMP_GATE_CONFIG` | redirects the persisted configuration file |
| `OMP_GATE_LEDGER` | redirects the telemetry ledger |
| `OMP_GATE_FRUSTRATIONS` | redirects the scratchpad record file |
| `OMP_GATE_MUTATION_LEASE` | enables the mutation lease at startup by default; set it to `0`, `false`, or `off` to disable it at startup |
| `OMP_GATE_MUTATION_LEASE_WAIT_MS` | sets how long a mutation-capable tool waits for a cooperative lease; the default is 5000 ms and negative values become zero |

shell examples:

```sh
export OMP_GATES_LEVEL=medium
export OMP_VERIFY_CMD='bun test'
omp
```

because the persisted file has higher precedence, remove or edit it before an environment-only override can change the level. slash commands preserve the in-memory verification and complexity commands. after editing the persisted file, restart omp before any slash level change; a live slash call does not reload disk and can rewrite the stale verifier. alternatively, set the relevant `OMP_*` environment before the session, subject to persisted-config precedence. `/gates-disable` also preserves the verifier for later re-engagement.

source: [configuration loading, saving, and precedence](../gate-checker/config.js), [slash command behavior](../gate-checker/index.ts)

## custom forbidden markers

create this file in the repository or working directory:

```text
.omp/gates-markers.txt
```

format:

```text
# project-specific unfinished-work markers
temporary implementation
replace before release
```

rules:

- one marker per line.
- blank lines are ignored.
- lines beginning with `#` are comments.
- custom markers extend the defaults; they do not replace them.
- matching is case-insensitive.
- checks apply only to added lines in code files: `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.py`, `.rs`, `.go`, `.java`, `.rb`, `.sh`, `.c`, `.h`, `.cpp`, `.cs`, `.swift`, and `.kt`.

an added marker in markdown, html, or any other path produces no completion finding. the inline notice, the final check, and the cutover command share this predicate.

### default markers

<ul>
  <li><code>todo: implem&#101;nt</code></li>
  <li><code>fixm&#101;:</code></li>
  <li><code>not implem&#101;nted</code></li>
  <li><code>not yet implem&#101;nted</code></li>
  <li><code>// stu&#98;</code></li>
  <li><code># stu&#98;</code></li>
  <li><code>/* stu&#98;</code></li>
  <li><code>def stu&#98;(</code></li>
  <li><code>pass&nbsp;#&nbsp;</code></li>
  <li><code>unimplem&#101;nted!()</code></li>
  <li><code>notimplem&#101;ntederror</code></li>
  <li><code>raise notimplem&#101;ntederror</code></li>
  <li><code>// placehold&#101;r</code></li>
  <li><code>/* placehold&#101;r</code></li>
  <li><code># placehold&#101;r</code></li>
  <li><code>// noo&#112;</code></li>
  <li><code># noo&#112;</code></li>
  <li><code>coming soo&#110;</code></li>
</ul>

broad words such as bare `stub`, `placeholder`, `noop`, and `fixme` are not defaults because they can occur in legitimate identifiers or calls.

source: [marker list and loading](../gate-checker/predicates.js)

### absolute home-path rule

the extension reads path conditions from `<agent-dir>/rules/no-absolute-home-path.md`, where `<agent-dir>` is `PI_CODING_AGENT_DIR` when set and `~/.omp/agent` otherwise. it reads the `condition` list from yaml front matter. when that file is absent, malformed, or has no usable condition, the built-in conditions match user-specific linux `/home/...`, macos `/Users/...`, and windows `Users` paths.

when native TTSR reports the `no-absolute-home-path` rule during the request, the final check applies these conditions to added lines. a remaining match warns at low and blocks at medium and high. use a relative path, an environment variable, or configuration instead of writing a machine-specific home path into source.

source: [home-path conditions and matching](../gate-checker/predicates.js), [rule application](../gate-checker/index.ts)

## git and no-git behavior

### git mode

at agent start, the extension captures:

- the current commit.
- the repository root.
- the staged, unstaged, and non-ignored untracked paths, including both endpoints of a rename.

at session stop, it combines:

- committed changes since the baseline commit.
- current unstaged changes.
- current staged changes.

baseline dirt that never changes stays out of the request. a baseline-dirty path returns to the request as soon as its content or existence changes after the request started. tracked deletions and new untracked files are inside the request scope.

source: [baseline and diff derivation](../gate-checker/index.ts), [request scope](../gate-checker/scope.js)

### low: no git

when git is unavailable, the extension:

- shows `gate: <policy> · low: no git`.
- snapshots a file before its first `write` or `edit` call.
- compares the first-touch snapshot with final content.
- judges only watched paths.
- uses a 2 mib snapshot-reader limit.
- still runs a configured verification command.
- does not run the commit gate.

before each tool effect, the extension checks an explicit tool working directory,
an explicit file path, and the current harness working directory. the first
repository found becomes authoritative for the request. its commit, dirty paths,
snapshots, root, lease, verification directory, and commit policy apply as if the
request started there. earlier no-git evidence stays in the final scope.

a request never binds to a second repository. when later tool activity points to
another repository, the extension records `omp.gate-checker.repository-limit`
with the authoritative and ignored roots.

limitations:

- a file changed only through bash or an unobserved external process is not watched unless the tool exposes its repository through `cwd`.
- a deleted, unreadable, or oversized final file cannot produce an added-line comparison.
- line-set comparison can identify newly present text but is less exact than a git hunk.
- one request has one authoritative repository.

source: [no-git diff and repository binding](../gate-checker/index.ts), [snapshot implementation](../gate-checker/predicates.js)

## verification command behavior

when changed files exist and a verification command is configured, the extension runs it in the repository root, or the current working directory in no-git mode.

behavior:

- timeout: 15 minutes.
- output buffer: 32 mib.
- standard input: closed.
- nonzero exit or timeout produces `verify_failed` with the last 20 output lines.
- only passing results are cached.
- the cache key changes with the git tree state, including untracked status, or with watched-file content in no-git mode.
- failed results always run again after a continuation.
- a passing configured run counts as evidence for a final “tests passed” claim.

the plugin does not guess a default extension-level test command. when medium or high has changed files and no `verifyCmd`, the extension emits blocking `no_test_run` unless the parent session already observed a passing recognized test runner.

source: [verification execution and cache](../gate-checker/index.ts), [level display](../gate-checker/config.js)

## complexity command behavior

when changed files exist and a complexity command is configured, the extension appends every changed path as a shell-quoted argument and runs the command in the repository root, or the current working directory in no-git mode.

the command has the same 15-minute timeout, 32 mib output buffer, and closed standard input as verification. a json array of linter reports is reduced to its messages; other output uses the last 20 lines. reported findings, a nonzero exit, a timeout, or an execution error produce warning-only `complexity_failed`. the complexity command never forces a continuation at any engagement level.

source: [complexity execution and output parsing](../gate-checker/index.ts), [level policy](../gate-checker/config.js)

## commit routing

the canonical agent directory is `PI_CODING_AGENT_DIR` when set, otherwise
`~/.omp/agent`. when this script exists:

```text
<agent-dir>/skills/git-commit/scripts/smart_commit.sh
```

the extension resolves this script path once at module load, and rewrites supported bash commit commands before execution.

### routed forms

- a non-amend `git commit` at a shell command boundary.
- a direct invocation whose executable name is exactly `smart_commit.sh`.

### rewrite behavior

- uses the absolute installed script path.
- adds `--no-push` when absent.
- preserves a parsed short or long message argument.
- lets the script create a message when none is supplied.
- preserves shell commands before and after the commit segment.
- removes a redundant leading `git add` because the script stages changes.
- leaves `git commit --amend` unchanged.
- rewrites a quoted or unquoted token or path that ends in `smart_commit.sh`.
- leaves a prefixed name such as `my_smart_commit.sh` alone.
- leaves an already absolute path that already carries `--no-push` unchanged.

routing creates a local commit only. it does not publish or push.

source: [commit routing implementation](../gate-checker/index.ts)

## subagent contract

before every `task` call, the extension injects instructions that require a changed-file manifest and truthful test and modification claims. scratchpad coverage uses server-bound session files, not task-input correlation.

### prose report form

```text
<changed-files>
src/example.ts
test/example.test.ts
</changed-files>
```

for read-only work, use an empty block:

```text
<changed-files>
</changed-files>
```

### json report form

```json
{
  "verdict": "pass",
  "changed_files": []
}
```

accepted manifest keys are `changed`, `changedFiles`, `changed_files`, and `manifest`. `null` and an empty array both mean that the subagent changed no files.

subagent adjudication starts only when the parent response refers to delegated or reviewed work. if the parent does not rely on a subagent report, parent claims and the actual diff still receive normal checks. each report is judged once per request, including across forced continuations.

the extension reads native `task` result details and lifecycle events. it records the agent id, task call id, terminal status, duration, model, session file, result artifact, patch, branch metadata, and structured changed-file manifest when the native result provides them. a text manifest remains the fallback. the extension does not register or replace `task`.

source: [subagent injection and citation checks](../gate-checker/index.ts), [manifest parser](../gate-checker/predicates.js)

## scratchpad records

at `low`, `medium`, and `high`, every active agent session must have one valid record. `off` performs no scratchpad check or write. a missing session record blocks at every enabled level.

### storage and required caller fields

normal storage is append-only jsonl:

```text
~/.omp/gate-checker/frustrations.jsonl
```

set `OMP_GATE_FRUSTRATIONS` before the session to relocate it. call the native `record_frustration` tool with:

| field | requirement |
|---|---|
| `agent_id` | nonempty assigned main or subagent id |
| `primary_goal` | nonempty assigned goal |
| `complaint` | nonempty description of friction, or exactly `none` for type `none` |
| `type` | one accepted taxonomy type |
| `severity` | one accepted taxonomy severity; type `none` requires `low` |
| `evidence` | valid `gate`, `snapshot`, or `command` evidence for real friction; may be empty for type `none` |

the server derives `session_file` and `session_id` from each active session and assigns `request_id` as server-local diagnostic metadata. `session_file` is the authoritative coverage key for main and subagents, and child session files arrive through native task provenance. `request_id` never participates in cross-session coverage. caller input cannot select or override these fields or `source`. the extension stores tool records with `source: "agent"` and automatic gate records with `source: "auto"`. stats classify every other source value as `legacy`.

### taxonomy

fixed types are `tooling`, `environment`, `requirements`, `workflow`, `test`, `dependency`, `performance`, `other`, and `none`. fixed severities are `low`, `medium`, `high`, and `blocker`.

a project can add, but cannot remove, values in `.omp/gates-frustrations.json`:

```json
{
  "types": ["domain"],
  "severities": ["notice"]
}
```

the extension loads this file from the git repository root. without a git root, it resolves it from `ctx.cwd`, the active request working directory.

### clean self-certification

a friction-free session still needs coverage. submit:

```json
{
  "agent_id": "main",
  "primary_goal": "complete the active request",
  "complaint": "none",
  "type": "none",
  "severity": "low",
  "evidence": []
}
```

for type `none`, the extension ignores caller evidence and injects exactly one trusted `clean_turn` gate entry. stored validation enforces complaint `none`, severity `low`, and that trusted evidence shape.

if a `none` record follows any failed tool result or a continuation forced by another blocking rule, the record remains valid and the ledger receives `clean_under_errors`. this event is telemetry only; it never re-prompts the agent. a continuation caused only by `missing_frustration_record` does not count as friction.

### automatic gate records

the extension writes a machine-authored record for every applied warning or blocking outcome except `missing_frustration_record`. that failure stays unsatisfied until an agent writes a valid record, so the coverage rule cannot satisfy itself. every active identity still needs its own record. its gate evidence names the exact rule and event, and `source` is `auto`. it satisfies main-session coverage in that same `session_stop`, but never a child session because each child has a different server session identity. an agent can append a separate `source: "agent"` record with its own perspective.

source: [scratchpad tool and identity coverage](../gate-checker/index.ts), [record validation and taxonomy](../gate-checker/frustrations.js), [level policy](../gate-checker/config.js)

## command-line tools

`omp plugin install` and `omp plugin link` register omp extensions only. they do
not install shell commands.

to install the published shell commands, run:

```sh
bun add --global nikos-agent-stack
```

to register shell commands from a local checkout, run `bun link` from the
repository root:

```sh
bun link
```

prepend the bun global bin directory to your path in the current shell before
running the bare commands:

```sh
export PATH="$(bun pm bin -g):$PATH"
```

both installations provide `nikos-gates` and `omnipotence`. run them from any
directory:

```sh
nikos-gates <command>
omnipotence --help
```

supported `nikos-gates` commands are `advisor install`, `audit`, `cutover`, `lease`, and `stats`. an
unknown command prints the usage summary. the extension also registers the `/advisor-install`
slash command, which takes no arguments. see the [advisor role user guide](advisor-role-user-guide.md)
for what terra does.

from a repository checkout, `bun run gate-checker/gate-cli.js <command>` runs
the same interface without a global install or link.

### cutover

```sh
nikos-gates cutover \
  --cwd . \
  --base @~1 \
  --markers .omp/gates-markers.txt
```

options:

| option | default | meaning |
|---|---|---|
| `--cwd <dir>` | `.` | repository to inspect |
| `--base <ref>` | `HEAD~1` | baseline for committed additions |
| `--markers <file>` | project marker file | explicit extra-marker file |

cutover scans:

- committed additions between the base and the current commit.
- unstaged additions.
- staged additions.
- non-ignored untracked files, with their whole content read as added lines.

cutover resolves the request scope for these paths. if the base does not resolve, cutover falls back to the root commit. the explicit marker file still extends the default marker list.

exit codes:

- `0`: no forbidden marker found.
- `1`: findings printed to standard output.
- `2`: unknown command.

source: [cutover cli](../gate-checker/gate-cli.js)

### stats

human-readable report:

```sh
nikos-gates stats
```

json report:

```sh
nikos-gates stats --json
```

alternate ledger:

```sh
nikos-gates stats \
  --ledger /path/to/ledger.jsonl
```

stats include record count, continuation chains, resolved chains, cap hits, cap-hit rate, forced retries, inline flags, low: no git runs, process-shape rate, miss reasons, counts by rule, `clean_under_errors`, and frustration counts by type and source (`agent`, `auto`, or `legacy`). `--json` returns the ledger path, record count, every ledger summary field, `clean_under_errors`, and a nested `frustrations` object with its record count, `byType`, and `bySource` maps.

source: [stats cli](../gate-checker/gate-cli.js), [ledger aggregation](../gate-checker/ledger.js), [scratchpad reader](../gate-checker/frustrations.js)

### lease

inspect a cooperative worktree operation lease:

```sh
nikos-gates lease status [--cwd path] [--json]
```

the text result identifies the holder's agent, session, request, tool call and name, target, pid, age, heartbeat age, fence, relation, and a safe status command. an unproven relation is reported as `unknown`.

recover a lease without deleting lease directories:

```sh
nikos-gates lease release [--cwd path] --stale-only
nikos-gates lease release [--cwd path] --force \
  --owner-id id --tool-call-id id --reason text
```

`--stale-only` uses the heartbeat stale policy and needs no owner or tool-call identity. `--force` requires the exact current owner id, tool-call id, and a reason; it refuses an identity mismatch. an agent must obtain direct user authorization before it uses `--force`. each successful manual release records `lease_manual_release` in the existing ledger.

the extension lease is enabled at startup by default and applies only while gates are enabled. it uses the canonical git common directory plus the worktree root, so linked worktrees do not share one operation slot. after validation and provider or user approval, it acquires the lease immediately before one mutation-capable operation. approval waits, `task`, read-only tools, and targets outside the bound worktree hold no lease.

the default acquisition wait is 5000 ms. polling uses a 50 ms interval with up to 5 ms jitter. the holder writes a heartbeat every 2000 ms, and a heartbeat becomes stale after 30000 ms. dead maintenance claimants become recoverable after a 2000 ms grace. maintenance uses an atomic winner record, exact identity rereads, and a monotonically increasing fence so a stale owner cannot renew or release a successor.

a matching terminal event releases the lease. background bash remains owned until terminal async state, a matching job snapshot, cancellation, or stale recovery. `/gates-lease status`, `/gates-lease on`, and `/gates-lease off` inspect or change only the current session. `off` refuses while this gate instance tracks an active operation and otherwise releases only its idle lease. external editors and processes that do not use gate-aware native tools remain outside this cooperative guarantee.

source: [lease cli](../gate-checker/gate-cli.js), [lease records and recovery](../gate-checker/lease.js), [ledger](../gate-checker/ledger.js)

## repository scopes and audit

the scope engine provides four read-only repository views:

- `request`: committed, staged, unstaged, and non-ignored untracked changes since a captured baseline. unchanged baseline dirt stays out.
- `uncommitted`: current staged, unstaged, and non-ignored untracked changes.
- `base`: the merge base of a supplied reference through the current commit.
- `commit`: one resolved commit against its parent.

every result includes resolved commit identifiers, normalized file states, added lines, and a sha-256 scope digest. file states include additions, modifications, deletions, renames, copies, modes, binaries, and submodules when git reports them.

run an audit without changing the repository:

```sh
nikos-gates audit --kind uncommitted [--folder path] [--cwd path] [--json]
nikos-gates audit --kind request --base <baseline> [--folder path] [--json]
nikos-gates audit --kind base --base <ref> [--folder path] [--json]
nikos-gates audit --kind commit --commit <ref> [--folder path] [--json]
```

`uncommitted` is the default kind. `request` and `base` require `--base`; `commit` requires `--commit`. `--folder` limits the immutable scope. audit prints changed files and advisory risks; `--json` returns the complete scope and risk data. audit never fetches, checks out, writes, commits, changes approval, or starts an agent. invalid kinds, missing required references, and scope errors return exit code `2`.

source: [scope resolver](../gate-checker/scope.js), [audit cli](../gate-checker/gate-cli.js), [advisory risks](../gate-checker/risks.js)

## telemetry and tuning

### ledger

normal path:

```text
~/.omp/gate-checker/ledger.jsonl
```

the ledger is append-only and best-effort. a write or parse failure does not block the agent.

record types:

| event | purpose |
|---|---|
| `inline_flag` | records a marker found immediately after a write or edit |
| `gate_eval` | records warning, blocking, and verification outcomes |
| `clean_under_errors` | records a valid `none` claim after machine-visible friction; never blocks |
| `chain_end` | records resolved, stalemate, or cap-reached continuation chains |
| `no_git` | records no-git operation |
| `process_shape` | records whether the request matched the structured-process workload |
| `lease_manual_release` | records a successful stale-only or authorized force release |

### tuning signals

- **cap-hit rate:** fraction of continuation chains that exhausted the cap.
- **forced retries:** total blocking continuations.
- **inline flags:** marker issues found early without a full response retry.
- **clean under errors:** valid `none` records filed after failed tools or non-record blocking continuations.
- **low: no git runs:** requests that started without git evidence, recorded as `no_git_runs`.
- **process-shape rate:** bounded changed requests with test evidence.
- **rule counts:** frequent rules show where users or predicates need attention.

process-shape records classify nonmatches as `no-changes`, `too-broad`, or `no-test-run`. the metric measures possible process use; it does not activate the process.

source: [ledger writer and aggregation](../gate-checker/ledger.js), [process-shape recording](../gate-checker/index.ts)

## troubleshooting

### the gate commands do not appear

confirm that the plugin is installed and enabled:

```sh
omp plugin list
omp plugin doctor
```

if the plugin is present but disabled, run
`omp plugin enable nikos-agent-stack`. if `list` does not show it, install or
link it again. restart omp after any of these actions, because extension
discovery occurs at startup.

source: [declared extension entries](../package.json)

### the nikos-gates command is not found

install the shell commands with `bun add --global nikos-agent-stack`, or run
`bun link` from a repository checkout. ensure the directory reported by
`bun pm bin -g` is on your path. from a checkout, use
`bun run gate-checker/gate-cli.js <command>` as the direct fallback.

source: [declared executable](../package.json), [cli entry point](../gate-checker/gate-cli.js)

### a level change does not take effect

slash level changes apply live, but they use configuration loaded when the extension started. if you edit the persisted file, restart omp before a slash level change. or set the relevant `OMP_*` environment before the session, subject to persisted-config precedence. a live slash call never reloads disk.

source: [configuration precedence](../gate-checker/config.js)

### high says verification is off

high does not invent a test command. with changed files and no `verifyCmd`, medium and high emit blocking `no_test_run` unless the parent session already observed a passing recognized test runner. set `OMP_VERIFY_CMD` before starting omp when the persisted config has no verifier, or edit `verifyCmd` in the persisted configuration, restart omp, then run:

```text
/gates-engage high
```
source: [high-level description](../gate-checker/config.js), [no-test-run check](../gate-checker/index.ts)

### a test-success statement is rejected

run a recognized test runner through the parent `bash` tool, or configure the verification command. a test run reported only by a subagent is not parent-session evidence.

source: [test evidence checks](../gate-checker/index.ts)

### a subagent manifest fails

check all of these conditions:

- the report ends with a complete `<changed-files>` block or uses a supported json key.
- every listed path exists in the request diff.
- a read-only report uses an empty manifest.
- the parent independently runs tests before repeating test-success claims.

source: [manifest and subagent claim checks](../gate-checker/index.ts), [manifest parser](../gate-checker/predicates.js)

### a pre-existing marker blocks delivery

normal git mode checks added lines only. if an untouched pre-existing marker appears in a finding, confirm that the baseline was captured before the request and that the file was not rewritten wholesale. `write` treats the complete replacement body as authored by that call for inline feedback.

source: [added-line derivation](../gate-checker/index.ts), [whole-file write handling](../gate-checker/predicates.js)

### a response is released with unresolved failures

inspect the status and ledger. the plugin releases when:

- the exact blocking failure repeats after a forced continuation, which records `stalemate`.
- changing blocking failures exceed three forced continuations, which records `continuation_cap`.

source: [runaway protection](../gate-checker/index.ts)

### high blocks on a dirty tree

commit all tracked staged and unstaged changes. untracked files do not fail the commit gate. if the request must not create a commit, use medium instead of high.

source: [commit policy](../gate-checker/config.js), [clean-tree predicate](../gate-checker/predicates.js)

### commit routing does not occur

confirm that `smart_commit.sh` exists under `PI_CODING_AGENT_DIR` when set, otherwise under `~/.omp/agent/skills/git-commit/scripts/`. routing is disabled when the script is absent, and when the active level is off. amend commits are intentionally not rewritten.

source: [commit routing activation](../gate-checker/index.ts)

### the plugin reports low: no git

the current tool context does not identify a git repository. the plugin still
watches `write` and `edit` paths and runs verification. the first later tool call
with a repository `cwd` or path binds that repository automatically. until then,
the plugin cannot prove changes made outside watched hooks or enforce commits.

source: [baseline and automatic repository binding](../gate-checker/index.ts)
