# gates plugin user guide

> deterministic delivery checks for omp sessions

## contents

- [what the plugin does](#what-the-plugin-does)
- [installation](#installation)
- [quick start](#quick-start)
- [engagement levels](#engagement-levels)
- [automatic extension behavior](#automatic-extension-behavior)
- [gate rule reference](#gate-rule-reference)
- [configuration](#configuration)
- [custom forbidden markers](#custom-forbidden-markers)
- [git and no-git behavior](#git-and-no-git-behavior)
- [commit routing](#commit-routing)
- [subagent contract](#subagent-contract)
- [command-line tools](#command-line-tools)
- [telemetry and tuning](#telemetry-and-tuning)
- [troubleshooting](#troubleshooting)
- [verification and development](#verification-and-development)
- [source map](#source-map)

## what the plugin does

this installation has one enforcement layer: the `nikos-agent-stack` plugin declares `./gate-checker/index.ts` in `package.json#omp.extensions`. omp loads that entry from the installed plugin at startup. the extension collects request evidence, warns during edits, checks the final response, runs an optional verification command, and can require a clean tracked working tree.

the extension and the `gate-cli.js` command-line surface both use `predicates.js` for added-line parsing, forbidden-marker checks, path matching, manifests, and the clean-tree predicate. this avoids two gate implementations with different results.

the plugin manager owns the installed files. no procedure in this guide requires manual file placement in an omp runtime directory.

sources: [package manifest](../package.json), [extension entry point](../gate-checker/index.ts), [shared predicates](../gate-checker/predicates.js)

## installation

the stack installs through the native omp plugin manager. the plugin name is
`nikos-agent-stack`. all actions use `omp plugin <action> [target]`.

### install

```sh
omp plugin install nikos-agent-stack
```

`--scope user` is the default and installs for every project. use
`--scope project` to bind the plugin to the current project only.

### link a local checkout

use a link when you develop the stack or run an unpublished revision:

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

`list` shows the plugin, its version, and its enabled state. `doctor` reports
discovery and load problems, and `doctor --fix` repairs the ones it can. from a
repository checkout, `bun run test` checks the package surface and the runtime.
see [verification and development](#verification-and-development).

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

removal deletes the installed package. it does not delete the persisted
configuration or the ledger, so a later install keeps the previous policy and
history.

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

this command shows the active level, each rule mode, the configured verification command, and the configuration source.

### use the normal coding profile

```text
/gates-engage medium
```

medium blocks unfinished added lines, unsupported file or test claims, contradicted subagent reports, and a failing configured verification command. it does not require a commit.

### use strict delivery checks

```text
/gates-engage high bun test
```

high blocks every rule family. the text after `high` becomes the complete verification command, so commands can contain spaces.

### use warnings only

```text
/gates-engage low
```

low keeps inline checks and telemetry, but it does not force a continuation.

### disable all checks and recording

```text
/gates-disable
```

level changes apply in the current session and persist for later sessions. no restart is required.

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
| parent file and test claims | off | warn | block | block |
| snapshot tag references | off | off | warn | block |
| missing subagent manifest | off | off | auto | block |
| subagent claims against the diff | off | warn | block | block |
| configured verification command | off | warn | block | block |
| clean tracked working tree | off | off | off | block |
| telemetry | off | on | on | on |
| stalemate release and continuation cap | on | on | on | on |

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
  -> warn, release, or force a continuation
```

source: [extension hooks](../gate-checker/index.ts)

### inline marker feedback

successful `write` and `edit` results receive an inline notice when that call adds a forbidden marker. the check examines only text introduced by the current tool call. the final session check remains a backstop for bash edits and subagent edits.

source: [inline additions and tool-result hook](../gate-checker/index.ts), [completion predicate](../gate-checker/predicates.js)

### final response enforcement

at session stop, the plugin partitions findings into warnings and blocks:

- warnings are recorded and shown, then the response is released.
- blocks return `continue: true` with deterministic failure details, so the agent must continue work.
- an identical blocking result after one forced continuation is a stalemate. the plugin releases the response and records the outcome.
- the plugin allows at most three forced continuations. unresolved failures then release for manual review.

source: [session-stop enforcement and runaway protection](../gate-checker/index.ts)

### when final enforcement is skipped

final checks do not run when:

- the active level is off.
- the request made no tool calls.
- the request used the user-question tool.
- no final assistant text exists.

verification and commit checks also require at least one observed changed file. read-only work is not required to run tests or create a commit.

source: [session-stop early returns and change gate](../gate-checker/index.ts)

## gate rule reference

| rule id | condition | resolution |
|---|---|---|
| `forbidden_marker` | an added line contains a default or project marker | implement the behavior or remove the marker |
| `fabricated_modification` | the final response claims a backticked file changed, but the observed diff does not contain it | change the file or remove the claim |
| `fabricated_test_result` | the final response claims tests passed without a successful recognized test-runner call or configured verification run | run the tests or remove the claim |
| `ungrounded_snapshot_tag` | the response cites a four-hex read or edit snapshot tag that this request did not receive | use a current tool result or remove the tag |
| `subagent_missing_manifest` | a referenced subagent report has no literal or json changed-file manifest | add the manifest or verify the work without relying on the report |
| `subagent_manifest_mismatch` | a manifest lists a file outside the observed diff | correct the manifest or the work |
| `subagent_fabricated_modification` | subagent prose claims a file changed outside the observed diff | verify and correct the report |
| `subagent_unverified_test` | a subagent claims tests passed without parent-session test evidence | run the tests in the parent session |
| `verify_failed` | the configured verification command exits nonzero or times out | fix the failure; do not weaken the check |
| `uncommitted_changes` | high mode finds tracked unstaged or staged changes | commit the logical unit or lower the engagement level |

file-claim detection targets modification verbs followed by a backticked path that contains a slash and file extension. test-claim detection recognizes common statements such as “tests passed” and common runners for node, python, rust, go, ruby, java, and deno.

sources: [rule mapping](../gate-checker/config.js), [claim and snapshot checks](../gate-checker/index.ts), [marker predicate](../gate-checker/predicates.js)

## configuration

### persisted configuration

by default, slash commands write:

```text
~/.omp/gate-checker/config.json
```

format:

<pre><code>{
  \"level\": \"medium\",
  \"verify&#67;md\": \"bun test\"
}
</code></pre>

### configuration precedence

highest precedence appears first:

1. the persisted configuration file.
2. <code>&#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#83;&#95;&#76;&#69;&#86;&#69;&#76;</code>.
3. legacy <code>&#79;&#77;&#80;&#95;&#68;&#69;&#76;&#73;&#86;&#69;&#82;&#89;&#95;&#71;&#65;&#84;&#69;&#83;</code>, which maps any enabled value to high.
4. the default level, medium.

<code>&#79;&#77;&#80;&#95;&#86;&#69;&#82;&#73;&#70;&#89;&#95;&#67;&#77;&#68;</code> supplies a verification command when the persisted configuration does not contain one.

### environment variables

| variable | purpose |
|---|---|
| <code>&#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#83;&#95;&#76;&#69;&#86;&#69;&#76;</code> | selects `off`, `low`, `medium`, or `high` when no persisted config takes precedence |
| <code>&#79;&#77;&#80;&#95;&#86;&#69;&#82;&#73;&#70;&#89;&#95;&#67;&#77;&#68;</code> | sets the verification command when the config file does not set one |
| <code>&#79;&#77;&#80;&#95;&#68;&#69;&#76;&#73;&#86;&#69;&#82;&#89;&#95;&#71;&#65;&#84;&#69;&#83;</code> | legacy switch; an enabled value maps to high |
| <code>&#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#95;&#67;&#79;&#78;&#70;&#73;&#71;</code> | redirects the persisted configuration file |
| <code>&#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#95;&#76;&#69;&#68;&#71;&#69;&#82;</code> | redirects the telemetry ledger |

html-rendered shell examples:

<pre><code>export &#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#83;&#95;&#76;&#69;&#86;&#69;&#76;=medium
export &#79;&#77;&#80;&#95;&#86;&#69;&#82;&#73;&#70;&#89;&#95;&#67;&#77;&#68;='bun test'
omp
</code></pre>

because the persisted file has higher precedence, remove or edit it before an environment-only override can change the level. a slash command without a new verification command preserves the existing command. `/gates-disable` also preserves it for later re-engagement.

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
- checks apply only to added lines.

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
  <li><code>pass&nbsp;&nbsp;#</code></li>
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

## git and no-git behavior

### git mode

at agent start, the extension captures:

- the current commit.
- the repository root.
- the current unstaged dirty-file set.

at session stop, it combines:

- committed changes since the baseline commit.
- current unstaged changes.
- current staged changes.

it then excludes files that were already unstaged at the baseline. paths come from added, copied, modified, and renamed changes. untracked files and deletions are outside this diff set.

source: [baseline and diff derivation](../gate-checker/index.ts)

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

the plugin does not guess a default extension-level test command. without a configured command, the verification rule is off even at high level.

source: [verification execution and cache](../gate-checker/index.ts), [level display](../gate-checker/config.js)

## commit routing

when this script exists:

```text
~/.omp/agent/skills/git-pushing/scripts/smart_commit.sh
```

the extension rewrites supported bash commit commands before execution.

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
- does not rewrite quoted text or unrelated script names such as `my_smart_commit.sh`.

routing creates a local commit only. it does not publish or push.

source: [commit routing implementation](../gate-checker/index.ts)

## subagent contract

before every `task` call, the extension injects instructions that require a changed-file manifest and truthful test and modification claims.

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

accepted manifest keys are `changed`, <code>changed&#70;iles</code>, `changed_files`, and `manifest`. `null` and an empty array both mean that the subagent changed no files.

subagent adjudication starts only when the parent response refers to delegated or reviewed work. if the parent does not rely on a subagent report, parent claims and the actual diff still receive normal checks. each report is judged once per request, including across forced continuations.

source: [subagent injection and citation checks](../gate-checker/index.ts), [manifest parser](../gate-checker/predicates.js)

## command-line tools

the manifest declares one executable, `nikos-gates`. installing or linking the
plugin publishes it. run it from any directory:

```sh
nikos-gates <command>
```

supported commands are `audit`, `cutover`, and `stats`. an unknown command
prints the usage summary.

if the shell cannot find the name, call the published binary directly:

```sh
~/.omp/plugins/node_modules/.bin/nikos-gates <command>
```

from a repository checkout, `bun run gate-checker/gate-cli.js <command>` runs
the same interface without an installed plugin.

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
| `--base <ref>` | <code>&#72;&#69;&#65;&#68;~1</code> | baseline for committed additions |
| `--markers <file>` | project marker file | explicit extra-marker file |

cutover scans:

- committed additions between the base and the current commit.
- unstaged additions.
- staged additions.

if the base does not resolve, cutover falls back to the root commit. the explicit marker file still extends the default marker list.

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

stats include record count, continuation chains, resolved chains, cap hits, cap-hit rate, forced retries, inline flags, low: no git runs, process-shape rate, miss reasons, and counts by rule. the json field is `no_git_runs`.

source: [stats cli](../gate-checker/gate-cli.js), [ledger aggregation](../gate-checker/ledger.js)

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
| `chain_end` | records resolved, stalemate, or cap-reached continuation chains |
| `no_git` | records no-git operation |
| `process_shape` | records whether the request matched the structured-process workload |

### tuning signals

- **cap-hit rate:** fraction of continuation chains that exhausted the cap.
- **forced retries:** total blocking continuations.
- **inline flags:** marker issues found early without a full response retry.
- **low: no git runs:** requests that started without git evidence. the reader includes legacy no-git records in `no_git_runs`.
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

the executable arrives with the plugin. confirm the installation first, then
call `~/.omp/plugins/node_modules/.bin/nikos-gates` directly, or run
`bun run gate-checker/gate-cli.js` from a repository checkout.

source: [declared executable](../package.json), [cli entry point](../gate-checker/gate-cli.js)

### a level change does not take effect

run `/gates-engage` and inspect the reported source. the persisted file outranks environment variables. use a slash command or update the file selected by <code>&#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#95;&#67;&#79;&#78;&#70;&#73;&#71;</code>.

source: [configuration precedence](../gate-checker/config.js)

### high says verification is off

high does not invent a test command. set one explicitly:

```text
/gates-engage high bun test
```

source: [high-level description](../gate-checker/config.js)

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

### an old marker blocks delivery

normal git mode checks added lines only. if an untouched old marker appears in a finding, confirm that the baseline was captured before the request and that the file was not rewritten wholesale. `write` treats the complete replacement body as authored by that call for inline feedback.

source: [added-line derivation](../gate-checker/index.ts), [whole-file write handling](../gate-checker/predicates.js)

### a response is released with unresolved failures

inspect the status and ledger. the plugin releases when:

- the exact blocking failure repeats after a forced continuation, which records `stalemate`.
- the chain exceeds three forced continuations, which records `cap_reached`.

source: [runaway protection](../gate-checker/index.ts)

### high blocks on a dirty tree

commit all tracked staged and unstaged changes. untracked files do not fail the commit gate. if the request must not create a commit, use medium instead of high.

source: [commit policy](../gate-checker/config.js), [clean-tree predicate](../gate-checker/predicates.js)

### commit routing does not occur

confirm that `~/.omp/agent/skills/git-pushing/scripts/smart_commit.sh` exists. routing is disabled when the script is absent. amend commits are intentionally not rewritten.

source: [commit routing activation](../gate-checker/index.ts)

### the plugin reports low: no git

the current tool context does not identify a git repository. the plugin still
watches `write` and `edit` paths and runs verification. the first later tool call
with a repository `cwd` or path binds that repository automatically. until then,
the plugin cannot prove changes made outside watched hooks or enforce commits.

source: [baseline and automatic repository binding](../gate-checker/index.ts)

## working repository upgrade

the working build adds deterministic repository scopes without changing native omp tool ownership.

### canonical scopes

`scope.js` resolves four immutable scopes:

- `request`: committed, staged, unstaged, and new untracked changes since the request baseline, excluding files already dirty at that baseline.
- `uncommitted`: current staged, unstaged, and untracked changes.
- `base`: the merge base of a supplied ref through the current commit.
- `commit`: one resolved commit against its parent.

each result contains resolved commit identifiers, normalized file states, added lines, and a sha-256 scope digest. records include additions, modifications, deletions, renames, copies, modes, binaries, and submodules when git reports them.

### read-only cli audit

the upgrade does not register a model-facing audit tool. use the cli when an explicit audit is useful:

```sh
nikos-gates audit --kind uncommitted --json
nikos-gates audit --kind base --base origin/main --json
nikos-gates audit --kind commit --commit @ --json
```

optional `--folder <path>` limits the immutable scope. audit never fetches, checks out, mutates, commits, changes approval, or starts an agent.

### native task provenance

the extension consumes native `task` result details and lifecycle events. it records the native agent id, task call id, terminal status, duration, model, session file, result artifact, patch, branch metadata, and structured changed-file manifest. text manifests remain a compatibility fallback.

the adapter never registers or replaces `task`.

### request journal and terminal outcomes

the extension writes versioned `omp.gate-checker.journal` custom session entries. it reconstructs active request state after session start, branch, and tree navigation. malformed, stale, or policy-incompatible state closes as `recovery_required`.

terminal outcomes distinguish:

- `passed`
- `passed_with_warnings`
- `released_with_failures`, with `stalemate` or `continuation_cap`
- explicit skip reasons for disabled and non-work-bearing requests

a release with unresolved findings is never reported as a pass.

### advisory risk rules

scope audits report stable advisory rule ids for:

- migrations and schema changes
- dependency manifests and lockfiles
- authentication and permission paths
- public contracts
- destructive operations
- file deletion and rename
- mode, binary, and submodule changes

these findings remain advisory. no finding means that no deterministic rule matched; it does not prove safety.

### opt-in cooperative mutation lease

set <code>&#79;&#77;&#80;&#95;&#71;&#65;&#84;&#69;&#95;&#77;&#85;&#84;&#65;&#84;&#73;&#79;&#78;&#95;&#76;&#69;&#65;&#83;&#69;=1</code> to coordinate gate-aware sessions that share one git worktree.

the lease uses the canonical git common directory and worktree identity, an exclusive directory, a unique owner token, and a monotonically increasing fence. stale recovery requires both the configured age and a dead owner process. native `write`, `edit`, `bash`, and non-isolated `task` calls are blocked for a conflicting gate-aware session.

the lease cannot exclude external editors or arbitrary processes. it is disabled by default.

## verification and development

the root package manifest, [`package.json`](../package.json), is the single
source for the public surface. it declares:

| manifest field | contents |
|---|---|
| <code>omp.&#101;xtensions</code> | `./gate-checker/index.ts` and `./ask-questionnaire/index.ts`, the entries omp loads |
| `bin` | `nikos-gates`, mapped to `gate-checker/gate-cli.js` |
| `exports` | `./gate-cli`, `./gates`, and <code>./delivery-contract.&#112;rocess</code> for importing processes |
| `files` | the runtime file allowlist the plugin manager installs |

run every focused test, the package-contract test, the embedded predicate checks, and the end-to-end wiring probe from the repository root:

```sh
bun run test
```

the package-contract test asserts the declared extensions, executable, exports,
and file list, and it loads each declared extension entry. a change to the
manifest that this guide describes must keep that test passing.

for local development, link the checkout and confirm discovery:

```sh
omp plugin link .
omp plugin doctor
```

use isolated configuration and ledger paths when running `index.ts` directly so persisted user policy does not alter its fixtures.

## source map

| file | responsibility |
|---|---|
| [package.json](../package.json) | plugin manifest: declared extension entries, `nikos-gates` executable, module exports, and installed file allowlist |
| [plugin.test.ts](../plugin.test.ts) | asserts the declared package surface and loads each declared extension entry |
| [index.ts](../gate-checker/index.ts) | manifest-declared extension, hooks, evidence, enforcement, native task provenance, journal integration, advisory risks, and lease integration |
| [scope.js](../gate-checker/scope.js) | canonical immutable git scopes and request baseline capture |
| [provenance.js](../gate-checker/provenance.js) | native task result and lifecycle normalization |
| [journal.js](../gate-checker/journal.js) | versioned session journal reducer and branch reconstruction |
| [risks.js](../gate-checker/risks.js) | deterministic advisory diff rules |
| [lease.js](../gate-checker/lease.js) | opt-in cooperative worktree mutation lease |
| [config.js](../gate-checker/config.js) | engagement levels, rule-family mapping, persistence, precedence, and status text |
| [predicates.js](../gate-checker/predicates.js) | shared markers, diff parsing, completion checks, path matching, manifests, clean-tree command, and snapshots |
| [gate-cli.js](../gate-checker/gate-cli.js) | scope audit, cutover, and stats command-line interface |
| [ledger.js](../gate-checker/ledger.js) | append-only events, explicit release metrics, safe reading, and aggregation |
| [wiring-check.ts](../gate-checker/wiring-check.ts) | isolated end-to-end extension probe |
