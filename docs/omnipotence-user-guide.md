# omnipotence user guide

omnipotence is the native orchestration unit in nikos-agent-stack. a user starts one process. the omp extension then advances the active run at session boundaries until it completes, fails, halts, waits for user input, or enters a blocked recovery state.

implementation sources: `orchestration/index.ts`, `orchestration/engine.ts`, and `orchestration/store.ts`.

## requirements

- omp with plugin support.
- bun `>=1.2.22`.
- git for the existing nikos-agent-stack package workflow.
- no babysitter package or runtime dependency.

source: `package.json#engines`, `package.json#omp.extensions`, and `package.json#bin`.

## install

install or link nikos-agent-stack by using the existing repository instructions. the package registers the orchestration extension after gate-checker and exposes the `omnipotence` binary.

```sh
omp plugin link .
omnipotence --help
```

gate-checker remains first in extension order. if a delivery gate requests another turn, orchestration does not schedule the next process effect until that gate passes.

source: `package.json#omp.extensions` and `plugin.test.ts`.

## create a process

process code uses the native package api. every process declares a stable id, semantic version, finite turn budget, input schema, output schema, and deterministic function. side effects cross the process context.

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
- `hook` calls one trusted in-process hook.
- `halt` ends intentionally without a success result.

source: `orchestration/contracts.ts` and `orchestration/engine.ts`.

## package a local blueprint

create `omnipotence.blueprint.json` beside the declared files. every file needs a sha-256 value. blueprint installation accepts local paths only, copies declared files only, rejects escaping paths and symlinks, and does not run installer scripts.

```json
{
  "schema": 1,
  "name": "delivery-pack",
  "version": "1.0.0",
  "engine": ">=1.0.0",
  "processes": [
    { "id": "delivery.review", "entry": "processes/review.ts" }
  ],
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

versions install side by side. active runs retain their blueprint version. rollback changes the active version for new runs. removal refuses while a non-terminal run pins that exact blueprint version. the cli loads active blueprints on each invocation. a running omp session loads them once, so restart that session after install, update, rollback, or removal.

source: `orchestration/blueprints.ts` and `orchestration/blueprints.test.ts`.

## start in omp

```text
/omnipotence delivery.review {"request":"review this change"}
```

other native modes use the same engine:

```text
/omnipotence-call delivery.review {"request":"run directly"}
/omnipotence-plan delivery.review {"request":"show the first effect plan"}
/omnipotence-yolo delivery.review {"request":"skip optional breakpoints"}
/omnipotence-forever delivery.review {"request":"keep durable state across sessions"}
```

inspect, resume, or halt the session-bound run:

```text
/omnipotence-status
/omnipotence-resume {"approved":true}
/omnipotence-stop operator requested stop
```

`yolo` never bypasses omp tool approval or point-of-risk confirmation. `forever` uses a finite turn budget and requires explicit extension after the budget is exhausted.

source: `orchestration/index.ts`, `orchestration/processes.ts`, and `orchestration/processes.test.ts`.

## use the cli

common commands:

```sh
omnipotence run list --json
omnipotence run status <run-id> --json
omnipotence run events <run-id> --json
omnipotence effect list <run-id> --json
omnipotence session status <session-id> --json
omnipotence process list --json
omnipotence profile show user --json
omnipotence hook list --json
omnipotence doctor --json
```

all mutating commands accept `--dry-run`. all commands accept `--json`. successful json uses `{"ok":true,"data":...}`. errors use `{"ok":false,"error":{"code":"...","message":"..."}}`.

source: `orchestration/cli.ts` and `orchestration/cli.test.ts`.

## profiles

profiles are versioned json documents. supported top-level fields are `schema`, `instructions`, `tools`, `processes`, and `metadata`.

precedence is process defaults, user profile, project profile, then explicit run input. merge behavior follows json merge patch: objects merge, arrays and scalars replace, and null removes a field.

```sh
omnipotence profile write user --input '{"schema":1,"instructions":["be concise"]}'
omnipotence profile show user --json
omnipotence profile render user --json
```

profiles guide model context. they do not authorize tools, credentials, or external mutations.

source: `orchestration/profiles.ts` and `orchestration/profiles.test.ts`.

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


run state, events, effects, session bindings, profile versions, and blueprint registry data use sqlite. effects carry a stable key, input hash, and fencing epoch. duplicate identical result posts are idempotent. stale or conflicting posts fail closed.

if a session restarts after an effect dispatch, omnipotence marks the effect uncertain. it does not retry an uncertain external mutation. resolve it explicitly:

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

source: `orchestration/store.ts`, `orchestration/store.test.ts`, and `orchestration/index.test.ts`.

## migrate from the separate babysitter extension

1. finish or halt active babysitter runs.
2. port process behavior to `defineprocess`; no old api or cli compatibility layer exists.
3. package the native process and hooks as a local blueprint.
4. install and test the blueprint with `omnipotence --dry-run blueprint install` and `omnipotence process validate <process-id>`.
5. start one native run and verify status, events, restart recovery, and gate order.
6. after validation, remove the separate babysitter plugin by using the exact installed package name shown by the omp plugin list command.

nikos-agent-stack does not import babysitter state, profiles, blueprints, prompt wrappers, or shell hooks automatically.

source: `.factory/recon.md`.

## remove omnipotence state

uninstalling the plugin does not delete user state. after every run is terminal and the plugin is stopped, the user can remove the omnipotence sqlite file and blueprint directory shown above. this deletion is irreversible unless a backup exists.
