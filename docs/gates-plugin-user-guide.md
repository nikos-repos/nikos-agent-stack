# gates plugin user guide

> deterministic delivery checks for omp sessions and babysitter processes

## contents

- [what the plugin does](#what-the-plugin-does)
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
- [babysitter gates](#babysitter-gates)
- [delivery-contract process](#delivery-contract-process)
- [telemetry and tuning](#telemetry-and-tuning)
- [troubleshooting](#troubleshooting)
- [verification and development](#verification-and-development)
- [source map](#source-map)

## what the plugin does

this installation has two related enforcement layers:

1. **automatic omp extension:** omp discovers `agent/extensions/gate-checker/index.ts` at startup. the extension collects request evidence, warns during edits, checks the final response, runs an optional verification command, and can require a clean tracked working tree.
2. **composable babysitter gates:** `gates.js` exports six deterministic tasks. `delivery-contract.process.js` combines them with understand, implement, retry, and failure-analysis phases.

both layers use `predicates.js` for added-line parsing, forbidden-marker checks, path matching, manifests, and the clean-tree predicate. this avoids two gate implementations with different results.

sources: [extension entry point](../gate-checker/index.ts), [shared predicates](../gate-checker/predicates.js), [babysitter gates](../gate-checker/gates.js), [delivery process](../gate-checker/delivery-contract.process.js)

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

source: [command registration and live policy updates](../gate-checker/index.ts), [level descriptions](../gate-checker/config.js)

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
  -> detect git or enter degraded mode
tool call
  -> record touched files
  -> route commit commands
  -> inject subagent rules
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

### degraded no-git mode

when git is unavailable, the extension:

- shows a degraded-mode status.
- snapshots a file before its first `write` or `edit` call.
- compares the first-touch snapshot with final content.
- judges only watched paths.
- uses a 2 mib snapshot-reader limit.
- still runs a configured verification command.
- does not run the commit gate.

limitations:

- a file changed only through bash or an unobserved external process is not watched.
- a deleted, unreadable, or oversized final file cannot produce an added-line comparison.
- line-set comparison can identify newly present text but is less exact than a git hunk.

source: [degraded diff and request hooks](../gate-checker/index.ts), [snapshot implementation](../gate-checker/predicates.js)

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

run the cli from any directory:

```sh
bun run ~/.omp/agent/extensions/gate-checker/gate-cli.js <command>
```

### cutover

```sh
bun run ~/.omp/agent/extensions/gate-checker/gate-cli.js cutover \
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
bun run ~/.omp/agent/extensions/gate-checker/gate-cli.js stats
```

json report:

```sh
bun run ~/.omp/agent/extensions/gate-checker/gate-cli.js stats --json
```

alternate ledger:

```sh
bun run ~/.omp/agent/extensions/gate-checker/gate-cli.js stats \
  --ledger /path/to/ledger.jsonl
```

stats include record count, continuation chains, resolved chains, cap hits, cap-hit rate, forced retries, inline flags, degraded runs, process-shape rate, miss reasons, and counts by rule.

source: [stats cli](../gate-checker/gate-cli.js), [ledger aggregation](../gate-checker/ledger.js)

## babysitter gates

`gates.js` exports six standalone deterministic tasks. another process can import one gate or call the full sequence helper.

| order | export | task id | pass condition |
|---:|---|---|---|
| 1 | `understand_gate` | `delivery-gate.understand` | every planned file exists, or its parent directory exists for a new file |
| 2 | `changes_gate` | `delivery-gate.changes` | current staged or unstaged added, copied, modified, or renamed paths are nonempty |
| 3 | `verify_gate` | `delivery-gate.verify` | the supplied command exits zero; default is `npm test` |
| 4 | `commit_gate` | `delivery-gate.commit` | no tracked staged or unstaged changes remain; untracked files are ignored |
| 5 | `artifacts_gate` | `delivery-gate.artifacts` | every declared artifact exists as a file; this gate is optional |
| 6 | `cutover_gate` | `delivery-gate.cutover` | no default or custom forbidden marker occurs in added lines since the base |

note: the real javascript export names use camel case: <code>understand&#71;ate</code>, <code>changes&#71;ate</code>, <code>verify&#71;ate</code>, <code>commit&#71;ate</code>, <code>artifacts&#71;ate</code>, and <code>cutover&#71;ate</code>.

### full sequence helper

<code>run&#68;elivery&#71;ates</code> runs the gates in the listed order and stops at the first unresolved failure. it retries only the verification gate.

configuration fields:

| field | default | purpose |
|---|---|---|
| `files` | `[]` | planned changed or created paths |
| <code>test&#67;ommand</code> | `npm test` | verification shell command |
| `cwd` | `.` | working directory |
| <code>markers&#70;ile</code> | project default | extra marker file |
| `artifacts` | none | optional required files |
| <code>max&#82;etries</code> | `3` | verification attempts |
| <code>base&#82;ef</code> | <code>&#72;&#69;&#65;&#68;~1</code> | cutover baseline |

source: [standalone gates and helper](../gate-checker/gates.js)

## delivery-contract process

`delivery-contract.process.js` provides a complete structured process over the six gates.

### inputs

| input | required | default | purpose |
|---|---:|---|---|
| `task` | yes | none | requested implementation |
| `files` | yes | `[]` | planned affected paths |
| <code>test&#67;ommand</code> | no | `npm test` | verification command |
| `cwd` | no | `.` | working directory |
| <code>markers&#70;ile</code> | no | project default | extra marker file |
| <code>must&#72;aves.artifacts</code> | no | none | required output files |

### process flow

1. capture the pre-work commit for later cutover comparison.
2. ask an agent to read and explain all planned files without editing.
3. check that each planned path or its parent is reachable.
4. ask an agent to implement the minimal root-cause change.
5. retry implementation up to three times if no staged or unstaged change appears.
6. run verification up to three times.
7. after a failed verification attempt, ask an agent to analyze the failure, then ask an implementation agent to fix it.
8. require a clean tracked working tree.
9. require optional declared artifacts.
10. reject forbidden markers in additions since the pre-work commit.

successful output contains `success: true`, `phase: delivered`, and the implementation report’s changed-file list. failure output identifies the failed phase and failure messages.

this process is available for explicit babysitter use. the automatic extension does not route requests into it. instead, telemetry records whether a completed request had a compatible shape: one to eight changed files plus test evidence.

source: [delivery process](../gate-checker/delivery-contract.process.js), [process-shape detector](../gate-checker/index.ts)

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
| `degraded` | records no-git operation |
| `process_shape` | records whether the request matched the structured-process workload |

### tuning signals

- **cap-hit rate:** fraction of continuation chains that exhausted the cap.
- **forced retries:** total blocking continuations.
- **inline flags:** marker issues found early without a full response retry.
- **degraded runs:** requests without git evidence.
- **process-shape rate:** bounded changed requests with test evidence.
- **rule counts:** frequent rules show where users or predicates need attention.

process-shape records classify nonmatches as `no-changes`, `too-broad`, or `no-test-run`. the metric measures possible process use; it does not activate the process.

source: [ledger writer and aggregation](../gate-checker/ledger.js), [process-shape recording](../gate-checker/index.ts)

## troubleshooting

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

### the plugin reports degraded mode

git baseline capture failed or the working directory is not a repository. the plugin can still watch `write` and `edit` paths and run verification, but it cannot prove changes made outside those hooks or enforce commits.

source: [baseline and degraded mode](../gate-checker/index.ts)

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
bun run gate-checker/gate-cli.js audit --kind uncommitted --json
bun run gate-checker/gate-cli.js audit --kind base --base origin/main --json
bun run gate-checker/gate-cli.js audit --kind commit --commit @ --json
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

run every focused test, the embedded predicate checks, and the end-to-end wiring probe:

```sh
bun run test
```

use isolated configuration and ledger paths when running `index.ts` directly so persisted user policy does not alter its fixtures.

## source map

| file | responsibility |
|---|---|
| [index.ts](../gate-checker/index.ts) | auto-discovered extension, hooks, evidence, enforcement, native task provenance, journal integration, advisory risks, and lease integration |
| [scope.js](../gate-checker/scope.js) | canonical immutable git scopes and request baseline capture |
| [provenance.js](../gate-checker/provenance.js) | native task result and lifecycle normalization |
| [journal.js](../gate-checker/journal.js) | versioned session journal reducer and branch reconstruction |
| [risks.js](../gate-checker/risks.js) | deterministic advisory diff rules |
| [lease.js](../gate-checker/lease.js) | opt-in cooperative worktree mutation lease |
| [config.js](../gate-checker/config.js) | engagement levels, rule-family mapping, persistence, precedence, and status text |
| [predicates.js](../gate-checker/predicates.js) | shared markers, diff parsing, completion checks, path matching, manifests, clean-tree command, and snapshots |
| [gate-cli.js](../gate-checker/gate-cli.js) | scope audit, cutover, and stats command-line interface |
| [ledger.js](../gate-checker/ledger.js) | append-only events, explicit release metrics, safe reading, and aggregation |
| [gates.js](../gate-checker/gates.js) | six standalone babysitter tasks and the full gate-sequence helper |
| [delivery-contract.process.js](../gate-checker/delivery-contract.process.js) | structured understand, implement, verify, commit, artifact, and cutover process |
| [wiring-check.ts](../gate-checker/wiring-check.ts) | isolated end-to-end extension probe |
