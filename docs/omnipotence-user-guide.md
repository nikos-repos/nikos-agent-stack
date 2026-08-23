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

install or link nikos-agent-stack by using the existing repository instructions. the package registers the omnipotence extension after gate-checker and exposes the `omnipotence` binary.

```sh
omp plugin link .
omnipotence --help
```

gate-checker remains first in extension order. if a delivery gate requests another turn, omnipotence does not schedule the next process effect until that gate passes.

source: `package.json#omp.extensions` and `plugin.test.ts`.

## feature model

omnipotence combines these public capabilities:

- deterministic process replay from sqlite events and projections.
- schema-validated process input and output with semantic process versions and finite turn budgets.
- task, bounded parallel, subprocess, sleep, breakpoint, hook, and halt primitives.
- `babysit`, `call`, `plan`, `yolo`, `forever`, and resume policies on one engine.
- session-bound result ownership, root-tree operation leases, fencing, idempotent posts, and explicit uncertain-effect recovery.
- ordered lifecycle hooks and versioned user and project profile layers.
- hash-verified local blueprints with semantic selection, minimum engine versions, update, rollback, and guarded removal.
- omp commands plus a standalone cli with json output, dry-run mutation previews, doctor, backup, and repair.

source: `omnipotence/api.ts`, `omnipotence/engine.ts`, `omnipotence/store.ts`, and `omnipotence/cli.ts`.

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

source: `omnipotence/contracts.ts` and `omnipotence/engine.ts`.

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

versions install side by side and use semantic ordering, including prereleases. every manifest declares a minimum compatible engine version. incompatible packages fail before installation or activation. active runs retain their pinned blueprint version. rollback changes the active version for new runs. removal refuses while a non-terminal run pins that exact version and validates any replacement before activation. the cli loads active and run-pinned blueprints on each invocation. a running omp session loads them once, so restart that session after install, update, rollback, or removal.

source: `omnipotence/blueprints.ts` and `omnipotence/blueprints.test.ts`.

## lifecycle hooks

hooks can run at `run_start`, `before_advance`, `effect_requested`, `effect_resolved`, `run_blocked`, `run_completed`, `run_failed`, `run_halted`, and `recovery`. selection is versioned and blueprint-aware. each phase runs hooks by priority and stable id with an abort timeout.

resolved-effect hook delivery is recorded durably. if one of these hooks fails after an external result is committed, resume retries the pending delivery without posting the effect again or rerunning completed hook deliveries.

source: `omnipotence/hooks.ts`, `omnipotence/engine.ts`, and `omnipotence/store.ts`.

## start in omp

```text
/omnipotence delivery.review {"request":"review this change"}
```

other native modes use the same engine:

```text
/omnipotence-call delivery.review {"request":"run directly"}
/omnipotence-plan delivery.review {"request":"show the first effect plan"}
/omnipotence-yolo delivery.review {"request":"skip optional breakpoints"}
/omnipotence-forever delivery.review {"request":"run with persistent mode policy"}
```

inspect, resume, or halt the session-bound run:

```text
/omnipotence-status
/omnipotence-resume {"approved":true}
/omnipotence-stop operator requested stop
```

`plan` returns the first pending effect plan without dispatching hooks or effects. `yolo` skips optional breakpoints but never bypasses omp tool approval or point-of-risk confirmation. every mode stores durable sqlite state. `forever` marks the run with the persistent mode policy, but it still uses a finite turn budget and requires explicit extension after that budget is exhausted.

source: `omnipotence/index.ts`, `omnipotence/processes.ts`, and `omnipotence/processes.test.ts`.

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

one session owns one active root run. omp result posts must match that session's active root. each top-level operation claims the owning root lease, so a child operation cannot overlap a root operation. safe session rebinding fences every owned run and requested effect atomically; dispatched or uncertain work blocks rebinding. halt fences and terminates the owned tree child-first. returned operation snapshots are assembled before lease release.

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

source: `omnipotence/store.ts`, `omnipotence/store.test.ts`, and `omnipotence/index.test.ts`.

## remove omnipotence state

uninstalling the plugin does not delete user state. after every run is terminal and the plugin is stopped, the user can remove the omnipotence sqlite file and blueprint directory shown above. this deletion is irreversible unless a backup exists.
