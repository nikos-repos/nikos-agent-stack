# omnipotence command reference

This reference describes the local standalone CLI. Verify the installed binary with omnipotence --version before relying on a version-specific command. The binary is one-shot: one invocation opens the store, performs one operation, prints one result, closes the store, and exits. It does not schedule hidden turns or provide a daemon. Use the omp extension for session-bound continuation.

Sources:

- <stack-source>/omnipotence/cli.ts
- <stack-source>/omnipotence/index.ts
- <stack-source>/docs/omnipotence-user-guide.md

Source locators: `<stack-source>` is the inspected checkout or installed package matching the active version; `<selected-blueprint-root>` is the source of the registered blueprint selected for the run. Resolve both from the release inventory and native registration, not from an assumed home directory. `<historical-home>` denotes a dated audit location only.

## global behavior

State defaults to $OMNIPOTENCE_DB or ~/.omp/nikos-agent-stack/omnipotence.sqlite. The blueprint root defaults to $OMNIPOTENCE_BLUEPRINTS or ~/.omp/nikos-agent-stack/blueprints.

Global flags are:

- --json
- --dry-run
- --help
- --version

The parser rejects an unknown flag for the selected command. No undocumented --detach, --timeout, --resume, --daemon, or --watch flag exists. --force is valid only for session bind. The only command-specific flags are the ones listed below.

With no command or with --help, print usage and exit 0. --version prints 1.0.0 and exits 0. In JSON mode, successful output is exactly one line shaped as:

~~~json
{"ok":true,"data":...}
~~~

Human success output is pretty JSON on stdout. In JSON mode, a caught error is exactly one line shaped as:

~~~json
{"ok":false,"error":{"code":"...","message":"..."}}
~~~

Without --json, a caught error is one plain message on stderr. Read both the output envelope and exit code.

| condition | exit |
| --- | ---: |
| successful operation, including a completed/failed/halted run result | 0 |
| usage or validation error | 2 |
| blocked result, stale fence, uncertain effect, state conflict, lease conflict, or terminal conflict | 3 |
| other operational error | 1 |
| unhealthy doctor report or missing database | 3 |

The doctor command reports a missing database as data with ok false and returns 3. A run may be failed or halted while the CLI operation itself succeeds; exit 0 does not mean accepted delivery.

## exact command grammar

~~~text
omnipotence run start <process-id> [--mode babysit|plan|yolo|forever] [--input JSON] [--profile JSON] [--process-version VERSION] [--session SESSION-ID]
omnipotence run status <run-id>
omnipotence run events <run-id>
omnipotence run resume <run-id> [--input JSON]
omnipotence run halt <run-id> [--reason TEXT]
omnipotence run list

omnipotence effect list <run-id>
omnipotence effect show <run-id> <effect-id>
omnipotence effect post <run-id> <effect-id> [--root ROOT-RUN-ID] --fence FENCE --input-hash SHA256 --status ok|error|uncertain|cancelled [--value JSON] [--error JSON]
omnipotence effect resolve-uncertain <run-id> <effect-id> [--root ROOT-RUN-ID] --fence FENCE --input-hash SHA256 --decision confirm|fail|retry [--value JSON] [--error JSON]

omnipotence session status <session-id>
omnipotence session bind <session-id> <run-id> [--force]
omnipotence session unbind <session-id>

omnipotence process list
omnipotence process show <process-id>
omnipotence process validate <process-id>
omnipotence process plan <process-id> [--input JSON]

omnipotence profile show user
omnipotence profile show project [--root PROJECT-ROOT]
omnipotence profile write user|project [--root PROJECT-ROOT] --input JSON
omnipotence profile merge user|project [--root PROJECT-ROOT] --input JSON
omnipotence profile render user|project [--root PROJECT-ROOT]

omnipotence blueprint list
omnipotence blueprint inspect <source-path>
omnipotence blueprint install <source-path>
omnipotence blueprint update <source-path>
omnipotence blueprint rollback <name>
omnipotence blueprint remove <name> <version>

omnipotence hook list
omnipotence hook inspect <hook-id>
omnipotence hook probe <hook-id> [--input JSON]

omnipotence doctor
omnipotence repair
~~~

JSON arguments must be valid JSON text. The CLI does not accept plain prose where JSON is required.

## run commands

run start defaults to babysit mode, input {}, profile { "schema": 1 }, and no session binding. It resolves the active process unless --process-version is supplied, validates input, snapshots the effective profile, stores the resolved process/blueprint pin, and starts one run. --dry-run returns the planned start without writing.

run status, events, and list read the durable store. run resume accepts a breakpoint response in --input. run halt defaults to halted by user and halts the owned child tree. Halted is terminal; a later resume returns the terminal result and does not revive the run. Do not describe the status-line word paused as resumable halted state.

process show and process validate emit the registered process id/version, maxturns, input schema, and output schema. process validate resolves the process; it does not itself execute a candidate input. process plan validates the supplied input and starts a persisted sessionless plan run that evaluates to its first requested effect/breakpoint. With --dry-run it only resolves the registered process and validates input, returning action process_plan; it neither creates a run nor evaluates the first effect. An uninstalled draft cannot be selected by either form.

The public mode names are babysit, plan, yolo, and forever. In finite modes, the engine blocks when turns is greater than maxturns; resume after a turn-budget block may extend the stored budget. Forever retains maxturns for replay data but does not enforce or extend it, does not loop after the process returns, and does not provide a daemon, spend limit, or retention policy.

## effect commands and unknown outcomes

effect list and effect show read one run's effect records. effect post requires the exact current fence and lowercase 64-character input hash. status is one of ok, error, uncertain, or cancelled. An identical committed post is idempotent; a conflicting result fails.

When dispatch may have happened but its outcome is unknown, post uncertain and stop. Resolve it with the exact current identity:

- confirm records a successful result;
- fail records an error result;
- retry raises the fence and requests the uncertain effect again, so use it only after evidence or exact approval accepts duplicate risk.

Never resend an acknowledged or unknown external action merely to recreate a receipt. Re-read effect show immediately before post or resolve. --root defaults to the effect run id; provide the root for a child effect.

## sessions and profiles

A session owns at most one active root run. session status reads the binding. session bind changes ownership; --force is recovery-only and must not replace a live owner without inspecting both run trees. session unbind detaches the active run. Ownership changes fail closed when uncertain or dispatched work prevents safe rebinding.

Profile documents use schema 1 and fields instructions, tools, processes, metadata. Effective context merges process defaults, saved user profile, saved project profile, and the run patch. Profiles guide process context; they do not authorize tools or bypass omp approval.

## blueprints

inspect, install, and update take a local source path, not an installed name. --dry-run with install or update returns the install plan without copying or changing state. list reads installed versions and active versions. rollback activates a prior compatible version. remove requires name and version and refuses a version pinned by a non-terminal run.

Installation copies manifest-declared files only, verifies lowercase SHA-256 values, rejects path escape and invalid manifests, and does not run installer scripts. Active runs keep their original version. Restart the omp session after install, update, rollback, or removal so the extension reloads active blueprints.

## hooks

hook list and inspect show active id, version, phase, priority, and timeout. hook probe invokes a selected active hook; use --dry-run first when supported by the operation. Hook phases are run_start, before_advance, effect_requested, effect_resolved, run_blocked, run_completed, run_failed, run_halted, and recovery.

## health and mutation boundaries

doctor is read-only and checks the database and installed blueprint records. repair is recovery-changing: --dry-run reports the database path; repair creates a backup, rebuilds projections, and verifies the result. Do not use repair to resolve an uncertain external effect.

For external publication, push, credential use, remote creation, destructive cleanup, restart archival, blueprint removal, repair, session force-binding, halt, or uncertain retry, verify the applicable authority for the exact operation and target. Reuse existing authorization for that scope; ask only for missing authority or a new material risk decision. Preserve any response and identity binding explicitly required by the admitted process. CLI output, screen text, or a process result never grants that authorization.
