# omnipotence user guide

omnipotence is a durable workflow engine for omp. it runs one versioned process, records every run state and effect in sqlite, and resumes work from that state. a run can finish, fail, halt, wait for a person, or block until an operator repairs a condition.

source: [package.json](../package.json), [api.ts](../omnipotence/api.ts), [engine.ts](../omnipotence/engine.ts), and [store.ts](../omnipotence/store.ts).

## requirements and install

you need:

- omp with plugin support and a session id.
- bun `>=1.2.22`.
- no babysitter package or runtime dependency.

the package provides the standalone `omnipotence` command, the `nikos-agent-stack/omnipotence` authoring api, and the omp extension. git is not a runtime or installation requirement.

published install:

```sh
omp plugin install nikos-agent-stack
```

this installs the omp extensions. to use the standalone command, also install the published package:

```sh
bun add --global nikos-agent-stack
export PATH="$(bun pm bin -g):$PATH"
omnipotence --help
```

local checkout install:

```sh
omp plugin link .
bun link
PATH="$(bun pm bin -g):$PATH" omnipotence --help
```

`omp plugin link .` registers extensions. `bun link` registers the shell commands. the extension order puts gate-checker before omnipotence. when a gate asks for another turn, omnipotence does not schedule the next process effect until the gate passes.

there is no standalone command that registers process code. author process and hook modules with the api, package them in a blueprint, and install the blueprint. the extension and cli load active blueprints and versions pinned by non-terminal runs.

source: [package.json](../package.json), [index.ts](../omnipotence/index.ts), and [cli.ts](../omnipotence/cli.ts).

## product model

a process has a lowercase id, a semantic version, input and output schemas, a deterministic run function, and a turn budget. a run stores the selected process version, source hash, blueprint version, profile snapshot, input, output, status, turns, and effects. replay calls the pinned process and checks that its source still matches.

run statuses are `created`, `running`, `waiting_effect`, `waiting_for_user`, `blocked`, `completed`, `failed`, and `halted`. the omp status line maps them to `working`, `your turn`, `blocked`, `done`, `failed`, or `paused`.

effect kinds are `task`, `parallel`, `subprocess`, `sleep`, `breakpoint`, and `hook`. effect statuses are `requested`, `resolved_ok`, `resolved_error`, `uncertain`, and `cancelled`.

the public modes are `babysit`, `plan`, `yolo`, and `forever`. `resume` is an internal policy used when continuing a stored run.

the process context exposes:

- `runid`: the current run id.
- `profile`: the effective profile snapshot.
- `parent`: `null` for a root run, or a parent record with `runid`, `effectkey`, `processid`, `processversion`, `blueprintname`, and `blueprintversion`.
- `task`, `parallel`, `subprocess`, `sleep`, `breakpoint`, `hook`, and `halt` methods.

source: [contracts.ts](../omnipotence/contracts.ts) and [status.ts](../omnipotence/status.ts).

## authoring api

import the supported subpath:

```ts
import { defineprocess } from "nikos-agent-stack/omnipotence";
```

the runtime exports are `defineprocess`, `definehook`, `assertvalid`, `jsonvalueof`, and `stablejson`. the type exports are `effectkind`, `jsonschema`, `jsonvalue`, `parallelrequest`, `processcontext`, `processparent`, `hookphase`, and `hookresult`. internal module exports are not part of the public api.

example process:

```ts
import { defineprocess } from "nikos-agent-stack/omnipotence";

export default defineprocess<{ request: string }, { accepted: boolean }>({
	id: "delivery.review",
	version: "1.0.0",
	maxturns: 32,
	input: {
		type: "object",
		required: ["request"],
		additionalproperties: false,
		properties: { request: { type: "string", min: 1 } },
	},
	output: {
		type: "object",
		required: ["accepted"],
		additionalproperties: false,
		properties: { accepted: { type: "boolean" } },
	},
	async run(ctx, input) {
		return ctx.task("review", { request: input.request });
	},
});
```

`defineprocess` validates the id, version, schemas, optional blueprint identity, `maxturns`, run function, profile defaults, and optional lowercase sha-256 `sourcehash`. the id uses lowercase dotted segments. each segment starts with a letter and then accepts lowercase letters, digits, and hyphens. versions use semantic version form with an optional lowercase prerelease. `maxturns` defaults to `64` and accepts integers from `1` to `10000`. the returned definition is immutable.

schemas use only `type`, `enum`, `min`, `max`, `pattern`, `items`, `properties`, `required`, and `additionalproperties`. types are `null`, `boolean`, `number`, `integer`, `string`, `array`, and `object`. schema types in an array must be unique and non-empty. `min` and `max` are non-negative finite numbers, and `min` cannot exceed `max`. `assertvalid` throws a validation error at the first failing path.

`jsonvalueof` accepts null, strings, booleans, finite numbers, dense arrays, and plain objects. it rejects cycles, sparse arrays, class instances, non-finite numbers, and other values. it sorts object keys for stable storage. use it for process output, effect values, hook input and output, and halt payloads. `stablejson` returns the normalized deterministic json string.

if a process source changes after a run is stored, replay blocks the run with `process source changed during replay`. a declared `sourcehash` must be a lowercase 64-character sha-256 value and is part of the process identity.

source: [api.ts](../omnipotence/api.ts) and [contracts.ts](../omnipotence/contracts.ts).

## process primitives and effects

each effect has a stable lowercase key. a repeated key reuses its stored effect only when its kind and normalized input are identical. a changed kind or input fails replay. effect keys are at most 128 characters and use lowercase letters, digits, `.`, `_`, `/`, and `-`.

- `ctx.task(key, input, label?)` requests one external task. the process pauses until a result is posted.
- `ctx.parallel(key, requests, maxconcurrency?)` requests independent task effects named `key/request.key`. duplicate request keys fail. the default concurrency is the request count, with a minimum of one. the engine creates requests incrementally up to the limit and waits for all results.
- `ctx.subprocess(key, processid, input)` runs a child process from the same pinned blueprint when the parent has one. the child version and blueprint identity are stored. the child id is deterministic from the parent run, effect key, process id, version, and input. the parent waits for the child and cannot complete while the child is blocked, failed, or halted.
- `ctx.sleep(key, until)` validates an iso timestamp, stores the normalized deadline, and resolves internally with `null` at or after the deadline. future deadlines put the run in `waiting_effect`.
- `ctx.breakpoint(key, input)` requests a person decision unless the active mode auto-approves this optional breakpoint. an input object with `required: true` always remains a breakpoint in executing modes that do not auto-approve optional breakpoints.
- `ctx.hook(key, hookid, input)` selects and pins one registered hook version and blueprint. the hook runs in the process and returns json output. replay rejects changed hook input or a hook outside the run blueprint.
- `ctx.halt(reason, payload?)` stops the process intentionally. the run becomes `halted` with the reason and normalized payload.

an external effect result uses `ok`, `error`, `uncertain`, or `cancelled`. `ok` returns its value to the process. `error` and `cancelled` raise an effect execution error. `uncertain` blocks the run until an explicit recovery decision.

source: [contracts.ts](../omnipotence/contracts.ts), [engine.ts](../omnipotence/engine.ts), and [store.ts](../omnipotence/store.ts).

## local blueprints

create `omnipotence.blueprint.json` beside the files that it declares. the manifest accepts only these top-level fields: `schema`, `name`, `version`, `engine`, `processes`, `hooks`, `files`, `config`, `profile`, and `migrations`.

```json
{
	"schema": 1,
	"name": "delivery-pack",
	"version": "1.0.0",
	"engine": ">=1.0.0",
	"processes": [{ "id": "delivery.review", "entry": "processes/review.ts" }],
	"hooks": [],
	"files": {
		"processes/review.ts": "0000000000000000000000000000000000000000000000000000000000000000"
	},
	"config": {},
	"migrations": []
}
```

the file digest must match the exact file bytes. the example digest is only a valid sha-256 shape; replace it with the digest for your file. `name` is a lowercase dotted identifier. `version` is semantic. `engine` must match `>=major.minor.patch` and must not exceed the current engine version. `processes` and `hooks` are required arrays. each entry has `id` and `entry`, with optional string `export` that defaults to `default`; ids must be unique in each group. every entry path must appear in `files`. `config` and `profile` are objects, and `migrations` is an array of objects with `from` and object `patch` fields.

blueprint install accepts a local path only. it rejects urls, absolute manifest file paths, traversal, files that resolve outside the package root, and non-regular files. a symlink is allowed only when its resolved regular file remains inside the package root. only declared files and the manifest are copied. installer scripts do not run. every declared file is checked with sha-256, and the registry content hash covers the manifest and file hashes.

use:

```sh
omnipotence --dry-run blueprint install ./delivery-pack
omnipotence blueprint install ./delivery-pack
omnipotence blueprint update ./delivery-pack
omnipotence blueprint inspect ./delivery-pack
omnipotence blueprint list
omnipotence blueprint rollback delivery-pack
omnipotence blueprint remove delivery-pack 1.0.0
```

`inspect` and `--dry-run` validate and return an install plan without copying or changing state. `update` uses the same content checks and install path as `install`; when an active version exists, its config is merged and a matching `migrations` patch is applied. versions install side by side. rollback activates the previous semantic version. removing an active version activates the highest remaining version after compatibility checks. removal refuses when a non-terminal run pins a process from that exact blueprint version.

the loader verifies installed file hashes and the registry content hash before loading. it loads active versions and versions pinned by non-terminal runs. the cli loads blueprint modules only for `process`, `hook`, `run start`, `run resume`, `effect post`, and `effect resolve-uncertain`. status, event, halt, list, session, profile, blueprint, doctor, and repair commands do not load modules. a running omp session loads them once; restart that session after install, update, rollback, or removal.

source: [blueprints.ts](../omnipotence/blueprints.ts), [loader.ts](../omnipotence/loader.ts), and [cli.ts](../omnipotence/cli.ts).

## lifecycle hooks

hooks run in these phases: `run_start`, `before_advance`, `effect_requested`, `effect_resolved`, `run_blocked`, `run_completed`, `run_failed`, `run_halted`, and `recovery`.

`definehook` validates a lowercase id, semantic version, phase, optional blueprint identity, integer priority, timeout, and run function. priority defaults to `100`. priority accepts `-10000` through `10000`. timeout accepts `1` through `60000` milliseconds. hooks in one phase run sequentially by priority, then id. each hook receives normalized json input and an abort signal. a timeout aborts the hook and reports a hook dispatch error.

selection is active, versioned, and blueprint-aware. process hook effects store the selected hook version. `effect_resolved` delivery is durable for every resolved effect, including internally resolved sleep, hook, and subprocess effects. completed deliveries are skipped. a failed delivery stays pending and resume retries it without posting the effect again or rerunning completed deliveries.

failure boundaries are explicit:

- a `run_start` hook failure changes the run to `failed`.
- `before_advance`, `effect_requested`, process-hook, recovery, and `effect_resolved` failures block the affected root run.
- `run_blocked`, `run_completed`, `run_failed`, and `run_halted` are safe terminal or block notifications. a failure in one records `hook_failed` and does not replace the run result.

source: [hooks.ts](../omnipotence/hooks.ts) and [engine.ts](../omnipotence/engine.ts).

## omp slash commands

the extension requires an omp session id. command input is one process id followed by optional json. line breaks in a pasted json value are collapsed before parsing. invalid json or a missing process id is an error.

```text
/omnipotence <process-id> [json-input]
/omnipotence-plan <process-id> [json-input]
/omnipotence-yolo <process-id> [json-input]
/omnipotence-forever <process-id> [json-input]
/factory [--preview] [--fresh] [target-or-idea]
/omnipotence-resume [json-response]
/omnipotence-status
/omnipotence-stop [reason]
```

`/omnipotence_result` is an omp tool, not a slash command. it requires `rootrunid`, `runid`, `effectid`, `fence`, `inputhash`, and `status`. `status` is `ok`, `error`, `uncertain`, or `cancelled`. `value` and `error` are optional json fields. the root run must match the active run in the current session. the tool checks ownership, fence, input hash, and result consistency, then returns a json result.

when a process requests an external effect, the extension claims it and sends a hidden next-turn message. the message contains the run id, effective profile, effect id, fence, input hash, key, kind, and input. perform the effect with normal omp tools and approvals, then call `omnipotence_result` with the exact values. a failed hidden-turn send or acknowledgement blocks the run and does not guess that the effect ran.

the gate-checker extension remains ahead of omnipotence. the next effect is not scheduled while a delivery gate requests another turn. `sleep` uses an internal timer. `breakpoint` waits for `/omnipotence-resume` input when it is pending. yolo does not bypass normal omp tool approval or point-of-risk confirmation.

source: [index.ts](../omnipotence/index.ts) and [stop-decision.ts](../omnipotence/stop-decision.ts).

## execution modes

| mode | process execution | optional breakpoint | required breakpoint | budget and lifetime |
| --- | --- | --- | --- | --- |
| `babysit` | executes the process | waits for your answer | waits for your answer | finite `maxturns`; one supervised run |
| `plan` | executes until the first effect request in a plan context | auto-approves and continues planning | returns a planned breakpoint effect | finite value is stored; the plan ends as a completed persisted run |
| `yolo` | executes the process | auto-approves | waits for your answer | finite `maxturns`; approvals outside process breakpoints still apply |
| `forever` | executes the process | auto-approves | waits for your answer | persistent; does not enforce or extend `maxturns` |

in finite modes, the next advance blocks when `turns` is greater than `maxturns`. `resume` after a turn-budget block extends the stored budget enough to continue. `forever` keeps its configured `maxturns` value for replay data but never uses it as a block or extension condition. subprocess children inherit the parent mode policy.

plan mode does not dispatch process hooks or effects. it reports the first requested effect, or the process output when no effect is needed. a plan breakpoint with `required: true` is reported instead of waiting for a person. in executing modes, only optional breakpoints are auto-approved by yolo and forever; required breakpoints remain waits.

host shutdown stops in-memory timers and closes sqlite. it does not restart a process daemon. the next session lifecycle event reopens state, re-arms durable sleeps, and reviews effect dispatch state.

source: [processes.ts](../omnipotence/processes.ts) and [engine.ts](../omnipotence/engine.ts).

## factory workflow

`/factory` starts or continues the `factory.new-project` process. that process must be supplied by an active blueprint.

target resolution uses the current omp working directory and follows this order:

1. an existing file becomes a `spec` entry and uses its parent directory.
2. an existing directory becomes the project root. `.factory/state.json` selects `resume`.
3. otherwise the first existing file from `final-plan.md`, `plan.md`, `spec.md`, or `requirements.md` becomes a `spec` entry.
4. one markdown file becomes a `spec` entry.
5. a non-path argument becomes a `rough-idea` entry.

an explicit path beginning with `~`, `/`, `./`, or `../` must exist. a missing explicit path reports an error instead of falling back to the current directory. with no target and no plan or state file, the command asks for an idea.

`--preview` starts a plan-mode run. without it, the factory uses babysit mode. `--fresh` skips the newest non-terminal root run whose input `projectRoot` matches the selected root and starts a new run. the old run remains stored. without `--fresh`, a blocked matching run is not resumed; the command reports its reason and tells you to use `--fresh`. an active matching run is resumed and can be rebound to the current session.

source: [factory.ts](../omnipotence/factory.ts), [index.ts](../omnipotence/index.ts), and [store.ts](../omnipotence/store.ts).

## standalone cli

the `omnipotence` binary is one-shot. each invocation opens sqlite, performs one operation, prints a result, and closes the store. it does not provide autonomous hidden-turn scheduling; use the omp extension and `/omnipotence-forever` for session-bound continuation.

commands:

```text
run start|status|events|resume|halt|list
effect list|show|post|resolve-uncertain
session status|bind|unbind
process list|show|validate|plan
profile show|write|merge|render
blueprint list|inspect|install|update|rollback|remove
hook list|inspect|probe
doctor
repair
```

global flags are `--json`, `--dry-run`, `--help`, and `--version`. unknown flags are rejected for the selected command. `--help` or no command prints usage. `--version` prints `1.0.0`.

state defaults to `~/.omp/nikos-agent-stack/omnipotence.sqlite`. set `OMNIPOTENCE_DB` to override it. the blueprint install root defaults to `~/.omp/nikos-agent-stack/blueprints`; set `OMNIPOTENCE_BLUEPRINTS` to override it. the store creates the database directory for writable commands.

### run commands

```sh
omnipotence run start <process-id> [--mode babysit|plan|yolo|forever] [--input JSON] [--profile JSON] [--process-version VERSION] [--session SESSION-ID]
omnipotence run status <run-id>
omnipotence run events <run-id>
omnipotence run resume <run-id> [--input JSON]
omnipotence run halt <run-id> [--reason TEXT]
omnipotence run list
```

`run start` defaults to mode `babysit`, input `{}`, profile `{ "schema": 1 }`, and no session binding. without `--process-version`, it resolves the active process version; with the flag, it resolves that requested version. in both cases, the run stores the resolved version. `run resume --input` supplies a breakpoint response. `run halt` defaults to `halted by user` and halts the owned child tree.

`process show` and `process validate` print the registered definition identity, `maxturns`, input schema, and output schema. `process plan <process-id> [--input JSON]` validates input and starts a persisted plan-mode run unless `--dry-run` is used.

### effect commands

```sh
omnipotence effect list <run-id>
omnipotence effect show <run-id> <effect-id>
omnipotence effect post <run-id> <effect-id> --root ROOT-RUN-ID --fence FENCE --input-hash SHA256 --status ok|error|uncertain|cancelled [--value JSON] [--error JSON]
omnipotence effect resolve-uncertain <run-id> <effect-id> --root ROOT-RUN-ID --fence FENCE --input-hash SHA256 --decision confirm|fail|retry [--value JSON] [--error JSON]
```

`--root` defaults to the effect run id. the fence must match the current effect and the input hash must be a lowercase 64-character sha-256 value. duplicate identical posts are idempotent. a different result conflicts. an uncertain effect rejects normal posts and requires `resolve-uncertain`. `confirm` resolves it as success, `fail` resolves it as an error, and `retry` raises the run fence, clears requested sibling dispatch markers, and requests the uncertain effect again.

`effect post` and `effect resolve-uncertain` advance the root run after the store commit. `--root` is required for a child effect when the default would not identify the root. ownership, fence, hash, effect state, and hook delivery checks can block the run or return an error.

### session, profile, blueprint, and hook commands

```sh
omnipotence session status <session-id>
omnipotence session bind <session-id> <run-id> [--force]
omnipotence session unbind <session-id>

omnipotence profile show user
omnipotence profile show project [--root PROJECT-ROOT]
omnipotence profile write user --input JSON
omnipotence profile write project --root PROJECT-ROOT --input JSON
omnipotence profile merge user --input JSON
omnipotence profile merge project --root PROJECT-ROOT --input JSON
omnipotence profile render user

omnipotence hook list
omnipotence hook inspect <hook-id>
omnipotence hook probe <hook-id> [--input JSON]
```

`session`, `profile`, `blueprint`, and `hook` actions are one operation each. the full profile and blueprint behavior is described below. `hook probe` dispatches the selected active hook and returns its normalized output.

source: [cli.ts](../omnipotence/cli.ts), [engine.ts](../omnipotence/engine.ts), and [store.ts](../omnipotence/store.ts).

## cli output, json, and errors

without `--json`, success output is human-formatted json on stdout. errors are one plain message on stderr. with `--json`, a successful command emits exactly one line with this envelope:

```json
{ "ok": true, "data": "..." }
```

an error caught by the cli emits:

```json
{ "ok": false, "error": { "code": "...", "message": "..." } }
```

`--json` applies to output envelopes only. it does not turn non-json errors into stdout text when the flag is absent. a doctor call for a missing database emits its report as normal command data with `ok: false` inside the report and returns exit code `3`.

exit codes are:

| condition | code |
| --- | ---: |
| success, including a completed, failed, or halted run result | `0` |
| usage or validation error | `2` |
| blocked result, stale fence, uncertain effect, state conflict, active lease, or terminal-state conflict | `3` |
| operational error | `1` |
| unhealthy doctor report or missing database | `3` |

the cli reports a blocked `run start`, `run resume`, or effect operation in its success-shaped data result, then returns `3`. automation must read both the envelope and the exit code.

source: [cli.ts](../omnipotence/cli.ts).

## profiles

profile documents use schema `1` and accept only `schema`, `instructions`, `tools`, `processes`, and `metadata`. `schema` must be `1`. `instructions` is a string array. `tools`, `processes`, and `metadata` are objects. user profiles use an empty project root. project profiles require a root, and the service normalizes it to an absolute path.

the effective profile merges, in order:

1. process `profiledefaults` or `{ "schema": 1 }`.
2. the saved user profile.
3. the saved project profile for the current root.
4. the run profile patch.

merge uses json merge patch: objects merge recursively, arrays and scalars replace, and `null` removes an object field. every saved write creates a numbered profile record and a source hash. a run stores the selected user and project profile version numbers and the complete effective profile, so later profile writes do not change that run.

profiles guide process context only. they do not authorize tools or bypass omp approval.

source: [profiles.ts](../omnipotence/profiles.ts) and [store.ts](../omnipotence/store.ts).

## persistence, sessions, and ownership

the state database uses sqlite schema version `8`. writable opens use wal journaling, full synchronous mode, a 5000 ms busy timeout, and recursive parent-directory creation. tables store runs, sessions, append-only events, effects, profiles, saved profile versions, and blueprints.

each run has one session binding at most. terminal runs auto-unbind. `session bind` refuses a terminal target or an occupied session unless `--force` is used. force binding fences the occupied run, detaches and halts it, then binds the target. `session unbind` detaches the active run. ownership changes fence the owned root and child runs and clear dispatch markers only for requested effects that have not been dispatched.

session rebinding and unbinding fail closed when an owned run has an uncertain effect or a requested effect with a dispatch intent or dispatch timestamp. this prevents a second session from guessing whether external work ran.

every engine operation claims the root run with a lease. the default lease ttl is `300000` milliseconds and the allowed range is `1` through `3600000` milliseconds. a live unexpired lease owned by another engine returns a conflict. an expired lease can be taken over only when the previous owner is no longer alive. the lease epoch and run fence are checked on every effect operation. stale posts are rejected.

source: [store.ts](../omnipotence/store.ts) and [engine.ts](../omnipotence/engine.ts).

## recovery and uncertain effects

the extension reviews the active session on `session_start`, `session_switch`, and `session_branch`. it re-arms requested sleeps, leaves breakpoints for a person, and schedules undispatched external effects. a requested effect with `dispatchingat` but no `dispatchedat` has an unknown scheduling result and becomes `uncertain`. a dispatched effect after session restart also becomes `uncertain`. neither case is resent automatically.

resume behavior is explicit:

- a run with an uncertain effect must use `effect resolve-uncertain` before resume.
- a run waiting for a breakpoint needs one response. multiple pending breakpoints or a missing response is an error.
- a blocked run retries pending durable hook deliveries. if the block reason is a finite turn budget, resume extends the budget and continues.
- `confirm` stores a successful result and optional value. `fail` stores an error result and optional error. `retry` increments the fence, re-fences requested siblings, clears the uncertain value or error, and waits for a new result.

all recovery decisions check root ownership, current run and effect fences, and the exact effect input hash. stale or mismatched values fail without changing the effect. source drift, hook failures, dispatch failures, and unresolved uncertainty remain fail-closed blocks.

source: [index.ts](../omnipotence/index.ts), [engine.ts](../omnipotence/engine.ts), and [store.ts](../omnipotence/store.ts).

## doctor and repair

`omnipotence doctor` opens the database read-only and checks sqlite integrity, schema version, event hash chains, run and effect projections, session bindings, profile hashes and saved versions, and installed blueprint manifests, files, and registry hashes. it combines database and blueprint issues in one report.

when an older supported database opens for writing, the store verifies its events and projections and makes a timestamped backup before upgrading. a newer schema is rejected. a failed verification blocks the open instead of changing state.

`omnipotence --dry-run repair` reports the database path without writing. `omnipotence repair` first creates a timestamped `.backup-<time>` copy, verifies event rows, rebuilds run and effect projections from events, rebuilds session bindings, restores current profiles from saved profile versions, appends a repair event, and runs doctor again. repair does not copy or repair blueprint files; they live under the separate blueprint root.

source: [store.ts](../omnipotence/store.ts) and [cli.ts](../omnipotence/cli.ts).

## removal and limits

blueprint removal is `omnipotence blueprint remove <name> <version>` and is guarded by active process pins. removing a blueprint does not remove sqlite state. uninstalling the omp plugin also does not remove the database or blueprint directory. after all runs are terminal and the plugin is stopped, remove those paths only when you have a backup. state deletion is irreversible.

public limits:

| item | limit |
| --- | --- |
| process and hook id | lowercase dotted identifier; each segment starts with a letter and uses lowercase letters, digits, or `-` |
| semantic version | numeric `major.minor.patch` with an optional lowercase prerelease |
| `maxturns` | default `64`; integer `1` through `10000` |
| effect key | lowercase stable key; maximum 128 characters; allowed `.`, `_`, `/`, and `-` |
| `parallel` `maxconcurrency` | default request count; integer `1` through `64`; duplicate request keys fail |
| hook priority | default `100`; integer `-10000` through `10000` |
| hook timeout | integer `1` through `60000` milliseconds |
| lease ttl | default `300000`; integer `1` through `3600000` milliseconds |
| sleep timer delay | one timer delay is capped at `2147483647` milliseconds; longer deadlines use repeated timers |
| json values | finite numbers, dense arrays, plain objects, no cycles |
| blueprint files | local, declared, package-root-contained regular files with lowercase sha-256 digests |
| blueprint engine | manifest must use `>=major.minor.patch` and pass the current engine version |

the system does not provide a daemon, automatic external-effect retry, or a way to bypass omp approvals. one session owns one active run. process source, effect input, fence, blueprint hash, and hook selection are part of durable replay state.

source: [contracts.ts](../omnipotence/contracts.ts), [index.ts](../omnipotence/index.ts), [store.ts](../omnipotence/store.ts), and [blueprints.ts](../omnipotence/blueprints.ts).
