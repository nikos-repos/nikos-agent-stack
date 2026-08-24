# omnipotence user guide

omnipotence is the native durable workflow engine in nikos-agent-stack. a user starts one versioned process. the omp extension advances its committed effects at session boundaries until the run completes, fails, halts, waits for user input, or enters a blocked recovery state.

implementation sources: `omnipotence/index.ts`, `omnipotence/engine.ts`, and `omnipotence/store.ts`.

## requirements

- omp with plugin support.
- bun `>=1.2.22`.
- git for the existing nikos-agent-stack package workflow.
- no babysitter package or runtime dependency.

source: `package.json#engines`, `package.json#omp.extensions`, and `package.json#bin`.

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

local checkout install:

```sh
omp plugin link .
bun link
PATH="$(bun pm bin -g):$PATH" omnipotence --help
```

`omp plugin link .` registers omp extensions only. `bun link` registers shell commands from this checkout. the verification command prepends bun's global bin directory to `path` for this invocation, so it works even when that directory was not already on `path`.

gate-checker remains first in extension order. if a delivery gate requests another turn, omnipotence does not schedule the next process effect until that gate passes.

source: `package.json#omp.extensions` and `plugin.test.ts`.

## feature model

omnipotence combines these public capabilities:

- deterministic process replay from sqlite events and projections.
- schema-validated process input and output with semantic process versions; finite modes enforce finite turn budgets, while `forever` retains its configured budget for replay compatibility without enforcing it.
- task, bounded parallel, subprocess, sleep, breakpoint, hook, and halt primitives.
- `babysit`, `plan`, `yolo`, `forever`, and resume policies on one engine.
- session-bound result ownership, root-tree operation leases, fencing, idempotent posts, and explicit uncertain-effect recovery.
- ordered lifecycle hooks and versioned user and project profile layers.
- hash-verified local blueprints with semantic selection, minimum engine versions, update, rollback, and guarded removal.
- omp commands plus a standalone cli with json output, dry-run mutation previews, doctor, backup, and repair.

source: `omnipotence/api.ts`, `omnipotence/engine.ts`, `omnipotence/store.ts`, and `omnipotence/cli.ts`.

## create a process

process code uses the native package api. every process declares a stable id, semantic version, input schema, output schema, and deterministic function. a process may set a finite `maxturns` budget; finite modes enforce it, while `forever` retains it for replay compatibility and does not block or extend it. side effects cross the process context.

```ts
import { defineprocess } from "nikos-agent-stack/omnipotence";

export default defineprocess({
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

available process primitives:

- `task` requests one agent-owned effect.
- `parallel` requests an explicit group of independent tasks.
- `subprocess` runs a pinned child process and returns its output.
- `sleep` records a deadline and resumes safely.
- `breakpoint` waits for explicit user input.
- `hook` calls one registered in-process hook.
- `halt` ends intentionally without a success result.

source: `omnipotence/contracts.ts` and `omnipotence/engine.ts`.

## package a local blueprint

create `omnipotence.blueprint.json` beside the declared files. every file needs a sha-256 value. blueprint installation accepts local paths only, copies declared files only, rejects escaping paths and symlinks, and does not run installer scripts.

```json
{
	"schema": 1,
	"name": "delivery-pack",
	"version": "1.0.0",
	"engine": ">=1.0.0",
	"processes": [{ "id": "delivery.review", "entry": "processes/review.ts" }],
	"hooks": [],
	"files": {
		"processes/review.ts": "<sha-256>"
	},
	"config": {},
	"migrations": []
}
```

replace `<sha-256>` with the lowercase digest before installation.

```sh
omnipotence --dry-run blueprint install ./delivery-pack
omnipotence blueprint install ./delivery-pack
omnipotence blueprint list
```

versions install side by side and use semantic ordering, including prereleases. every manifest declares a minimum compatible engine version. incompatible packages fail before installation or activation. active runs, including forever runs, retain their pinned blueprint version. rollback changes the active version for new runs. removal refuses while a non-terminal run pins that exact version and validates any replacement before activation. the cli loads active and run-pinned blueprints on each invocation. a running omp session loads them once, so restart that session after install, update, rollback, or removal.

source: `omnipotence/blueprints.ts` and `omnipotence/blueprints.test.ts`.

## lifecycle hooks

hooks can run at `run_start`, `before_advance`, `effect_requested`, `effect_resolved`, `run_blocked`, `run_completed`, `run_failed`, `run_halted`, and `recovery`. selection is versioned and blueprint-aware. each phase runs hooks by priority and stable id with an abort timeout.

resolved-effect hook delivery is recorded durably. if one of these hooks fails after an external result is committed, resume retries the pending delivery without posting the effect again or rerunning completed hook deliveries.

source: `omnipotence/hooks.ts`, `omnipotence/engine.ts`, and `omnipotence/store.ts`.

## use slash commands in omp

omnipotence runs a process. think of a process as a saved recipe. the recipe lists the work, the order of the work, and the places where omnipotence must pause.

### words used in this guide

- a **process** is a saved recipe, such as `delivery.review`.
- a **run** is one use of that recipe.
- an **effect** is one recorded step in the recipe. it can ask an agent to do work, start another process, wait until a time, or call a hook.
- a **breakpoint** is a pause that asks for a decision or more information.
- an **optional breakpoint** is a pause that `yolo` and `forever` modes may pass automatically.
- a **required breakpoint** always waits for a person, including in `yolo` and `forever` modes.

source: `omnipotence/contracts.ts` and `omnipotence/engine.ts`.

### start-command format

the four start commands use the same format:

```text
/<command> <process-id> [json-input]
```

`<process-id>` names the recipe. `[json-input]` supplies the information that the recipe needs. the input must be valid json. when input is not needed, omit it or use `{}`.

```text
/omnipotence delivery.review {"request":"review this change"}
```

source: `omnipotence/index.ts`.

### choose a start command

| what you want                                | command                | mode      |
| -------------------------------------------- | ---------------------- | --------- |
| run normally and pause when the recipe asks  | `/omnipotence`         | `babysit` |
| preview the first step without doing it      | `/omnipotence-plan`    | `plan`    |
| do the work with fewer optional pauses       | `/omnipotence-yolo`    | `yolo`    |
| start one unbounded native orchestration run | `/omnipotence-forever` | `forever` |

### babysit mode

`babysit` is the normal supervised mode. `/omnipotence` starts this mode.

it performs the real work in the process. when the process reaches an optional or required breakpoint, it stops and waits for your answer. use this mode when you want to see every decision point that the process author included.

```text
/omnipotence delivery.review {"request":"review this change"}
```

### plan mode

`plan` mode is a preview. it follows the recipe until it finds the first step that would need an effect, then it reports that step without doing it. it does not dispatch hooks or effects.

use this mode when you want to see what the process will ask for first. it is not a complete preview of every later step.

```text
/omnipotence-plan delivery.review {"request":"show the first effect plan"}
```

### yolo mode

`yolo` mode performs the real work but continues past optional breakpoints automatically. it still stops at every required breakpoint.

`yolo` does not bypass omp tool approval or point-of-risk confirmation. use it only when you trust the process and do not need its optional pauses.

```text
/omnipotence-yolo delivery.review {"request":"skip optional breakpoints"}
```

### forever mode

`/omnipotence-forever` starts one unbounded native orchestration run and binds it to the current omp session. its policy is `{ execute: true, optionalbreakpoints: false, persistent: true }`.

the persistent run ignores its finite `maxturns` budget: the engine retains that value for replay compatibility, but never blocks or extends it for a forever run. finite modes enforce their budgets exactly as before.

subprocess children inherit the forever policy, so child runs ignore their finite `maxturns` budget and use the same breakpoint and recovery rules.

optional process breakpoints auto-approve in forever. required process breakpoints still wait for `/omnipotence-resume`. this changes process breakpoint handling only; normal omp tool approval and point-of-risk confirmation remain required.

host shutdown pauses execution. durable sleep deadlines are re-armed when omp restores the owning session; in-memory timers do not survive host shutdown. this command is not a daemon and does not restart a process automatically. a normal process return completes once; process code owns repetition and must use deterministic, unique effect keys for every cycle. `/omnipotence-stop` ends the run explicitly.

on lifecycle recovery, a requested external effect is scheduled only when both dispatch timestamps are null. an acknowledged or unknown dispatch outcome is never resent; it remains uncertain and requires an explicit operator decision. required breakpoints remain waiting, and hook failures, source drift, and every other non-budget block stay fail-closed.

a forever run pins its selected blueprint version. updates, rollbacks, and removals do not change that run's blueprint. each cycle adds committed effects and replay records to sqlite, so durable replay state grows with the loop.

```text
/omnipotence-forever delivery.review {"request":"run with unbounded turns"}
```

one deterministic loop can use input-derived sleep times and unique keys:

```ts
async run(ctx, input: { start: string; intervalms: number }) {
    const start = Date.parse(input.start);
    for (let cycle = 0; ; cycle += 1) {
        const key = `cycle/${cycle}`;
        await ctx.task(`${key}/work`, { cycle });
        await ctx.sleep(
            `${key}/sleep`,
            new Date(start + (cycle + 1) * input.intervalms).toISOString(),
        );
    }
}
```

use a validated utc `input.start` and fixed `input.intervalms`; each sleep timestamp depends only on input and cycle.

source: `omnipotence/processes.ts`, `omnipotence/engine.ts`, `omnipotence/index.ts`, `omnipotence/store.ts`, `omnipotence/blueprints.ts`, `omnipotence/cli.ts`, `omnipotence/processes.test.ts`, `omnipotence/engine.test.ts`, `omnipotence/index.test.ts`, `omnipotence/store.test.ts`, `omnipotence/blueprints.test.ts`, and `omnipotence/cli.test.ts`.

### inspect, resume, or stop the current run

`/omnipotence-status` shows the active run for the current omp session. it reports `inactive` when this session has no active run.

```text
/omnipotence-status
```

`/omnipotence-resume` continues the active run. when the run is waiting at a breakpoint, add a json answer. when the run is blocked by a retryable hook failure or an exhausted turn budget, call it without an answer. finite modes keep their current budget behavior: a budget block can extend their finite budget. a legacy forever run blocked only by `turn budget … exhausted` resumes automatically during lifecycle recovery without changing `maxturns`; no other forever block resumes automatically.

```text
/omnipotence-resume {"approved":true}
/omnipotence-resume
```

resume refuses to guess when an external action has an uncertain result. resolve that result explicitly with the cli before resuming.

`/omnipotence-stop` halts the active run and its unfinished child processes. add plain text to record why you stopped it. when you omit the text, the reason is `halted by user`.

```text
/omnipotence-stop operator requested stop
```

source: `omnipotence/index.ts` and `omnipotence/engine.ts`.

### safety and stored state

all start modes store durable sqlite state. `yolo` and `forever` never remove normal omp tool approval or point-of-risk confirmation; `forever` auto-approves only optional process breakpoints. the status, resume, and stop commands act only on the active run bound to the current omp session.

source: `omnipotence/index.ts`, `omnipotence/store.ts`, and `omnipotence/engine.ts`.

## use the cli

command families cover:

- `run start|status|events|resume|halt|list`
- `effect list|show|post|resolve-uncertain`
- `session status|bind|unbind`
- `process list|show|validate|plan`
- `profile show|write|merge|render`
- `blueprint list|inspect|install|update|rollback|remove`
- `hook list|inspect|probe`
- `doctor` and `repair`

representative commands:

```sh
omnipotence run start delivery.review --session cli-session --input '{"request":"review this change"}'
omnipotence run status <run-id> --json
omnipotence run events <run-id> --json
omnipotence run halt <run-id> --reason "operator requested stop"
omnipotence effect list <run-id> --json
omnipotence process validate delivery.review --json
omnipotence process plan delivery.review --input '{"request":"preview"}' --json
omnipotence session status <session-id> --json
omnipotence profile show user --json
omnipotence hook list --json
omnipotence doctor --json
```

all mutating commands accept `--dry-run`. all commands accept `--json`. successful json uses `{"ok":true,"data":...}`. errors use `{"ok":false,"error":{"code":"...","message":"..."}}`.

the standalone cli is one-shot. `run start --mode forever` and `run resume` perform one stored-run operation; they do not own autonomous hidden-turn scheduling. use `/omnipotence-forever` in omp for session-bound continuation.

source: `omnipotence/cli.ts` and `omnipotence/cli.test.ts`.

## profiles

profiles are versioned json documents. supported top-level fields are `schema`, `instructions`, `tools`, `processes`, and `metadata`.

precedence is process defaults, user profile, project profile, then explicit run input. merge behavior follows json merge patch: objects merge, arrays and scalars replace, and null removes a field.

```sh
omnipotence profile write user --input '{"schema":1,"instructions":["be concise"]}'
omnipotence profile show user --json
omnipotence profile render user --json
```

profiles guide model context. they do not authorize tools, credentials, or external mutations.

source: `omnipotence/profiles.ts` and `omnipotence/profiles.test.ts`.

## state and recovery

state defaults to:

```text
~/.omp/nikos-agent-stack/omnipotence.sqlite
```

override it for an isolated environment:

```sh
export OMNIPOTENCE_DB=/path/to/omnipotence.sqlite
export OMNIPOTENCE_BLUEPRINTS=/path/to/blueprints
```

run state, events, effects, session bindings, hook deliveries, lease claims, profile versions, and blueprint registry data use sqlite. each effect carries a stable key, input hash, and fence. duplicate identical result posts are idempotent. stale or conflicting posts fail closed.
forever runs append every committed effect and replay event to sqlite, so long-running loops grow durable state instead of discarding old cycles.

one session owns one active root run, including a forever run. omp result posts must match that session's active root. each top-level operation claims the owning root lease, so a child operation cannot overlap a root operation. safe session rebinding fences every owned run and requested effect atomically; dispatched or uncertain work blocks rebinding. halt fences and terminates the owned tree child-first. returned operation snapshots are assembled before lease release.

during lifecycle recovery, requested external work is scheduled only when both dispatch timestamps are null. an acknowledged or unknown dispatch outcome is never resent; it remains uncertain and must be resolved explicitly:

```sh
omnipotence effect resolve-uncertain <run-id> <effect-id> \
  --fence <epoch> --input-hash <sha-256> --decision confirm --value '{"result":"confirmed"}'
```

available decisions are `confirm`, `fail`, and `retry`.

verify without mutation:

```sh
omnipotence doctor --json
```

repair creates a database backup, rebuilds projections from the event record, and verifies the rebuilt state:

```sh
omnipotence --dry-run repair --json
omnipotence repair --json
```

source: `omnipotence/store.ts`, `omnipotence/store.test.ts`, and `omnipotence/index.test.ts`.

## remove omnipotence state

uninstalling the plugin does not delete user state. after every run is terminal and the plugin is stopped, the user can remove the omnipotence sqlite file and blueprint directory shown above. this deletion is irreversible unless a backup exists.
