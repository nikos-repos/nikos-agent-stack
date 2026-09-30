# ga — phase-a gate evidence

## Verdict and scope

- a0: PASS. Installed omp is 18.4.4; installed Orca is 1.4.217. Both exceed their floors; neither has an upper bound.
- v01: PASS under Main's explicit loader-cache clarification below. The original strict FD comparison failed and remains recorded as an isolation incident, not erased or silently accepted.
- v15: PASS. The prescribed command exited 0; an additional disposable observing run produced all four observations and zero native registrations.
- Evidence only: no production source, checks, settings, schema, or live observer session was changed. No source-repository commit or push was performed. The schema freeze below is a proposal, not an approval or applied freeze.

Commands ran from the repository root unless the harness selected its disposable workspace. `read("...")` denotes the `functions.read` tool with that exact path/selector, not a shell command. `<tmp>` replaces temporary roots/script locations; `$HOME` replaces the original home; `$PWD` replaces the repository invocation root. `/proc/<pid>/statm` and `/dev/pts/<tty>` replace process/terminal-specific paths. Output excerpts otherwise preserve emitted text. PID, epoch, inode, timestamp, and digest values are observations, not fixed configuration.

The assigned slice fingerprint was:

```text
e7c76e21fb0c697b4a21ea90fa25f4a9c08fcb45d851b187278cfb21830c1fa4  docs/maintainers/omp-orca-bridge-slices/ga-phase-a-gates.md
```

`ga.md` was absent before this work (`glob omp-orca-observer/checks/evidence/ga.md` returned `Path not found`). The recovery receipt records that absent before-image. No existing repository content was deleted.

### Bounded clarifications supplied by Main

1. `xd://github` was not mounted for this worker. Main supplied the pinned excerpts in `local://ga-github-reads.md` and explicitly authorized reading/citing that artifact instead. No other GitHub fetch was performed by this worker.
2. Main authorized reading `node_modules/@oh-my-pi/pi-coding-agent/package.json` to identify the dev dependency: the inspected output includes `"version": "18.3.5"`.
3. After the first measuring run opened cache FDs outside the disposable home, Main authorized inspecting `legacy-pi-compat.ts:564-592` and `pi-utils/src/dirs.ts` at the captured-home/cache-path declarations. These show loader-owned SQLite/WAL initialization and a home captured at module load.
4. Main required a new measuring process with disposable HOME/TMPDIR/XDG values supplied to `Bun.spawn` at process start. Its explicit criterion permits only the loader's `legacy-pi-extension-cache.db`, `-wal`, `-shm` and their containing directory under `<tmp>`; any other FD/file delta or factory timer/server call fails. This clarification was used only in evidence/throwaway scripts; the orchestrator later folded these clarifications into the slice's resolved-during-build notes.

## a0 — three required outputs

Before the status command, the exact command `$ORCA_CLI_COMMAND skills get orca-cli` exited 0. Its first lines were:

```text
---
name: orca-cli
description: >-
  Operate Orca-managed worktrees, folder contexts, terminals, repos, automations, artifacts,
  skill sharing, worktree comments, and Orca's embedded browser through the `orca` CLI. Use
  when the user says "$orca-cli", "Orca worktree", "child worktree", "spawn codex/claude in a
```

The session-selected executable was used for the only other Orca command, `status`; no bare Orca executable was invoked.

### `omp --version`

Exit 0; full output:

```text
omp/18.4.4
```

PASS: 18.4.4 >= 18.3.5.

### `sha256sum "$(command -v omp)"`

Exit 0; full output, home path normalized:

```text
24c830fceb0bd6884bf5bf2c7a2b7407bc23fafe655e924c695ef9be308e46f3  $HOME/.bun/bin/omp
```

### `$ORCA_CLI_COMMAND status --json`

Exit 0; full output:

```json
{
  "id": "local-status",
  "ok": true,
  "result": {
    "target": {
      "kind": "local"
    },
    "app": {
      "running": true,
      "pid": 24608,
      "desktopWindowStatus": "available"
    },
    "runtime": {
      "state": "ready",
      "reachable": true,
      "connectionState": "connected",
      "runtimeId": "b1896c12-b413-48a1-9159-d91b4fccebe3",
      "appVersion": "1.4.217",
      "remoteUpdateSupport": {
        "installMode": "interactive",
        "automatic": true,
        "reason": "available"
      },
      "capabilities": [
        "agentSession.create.tab-id.v1",
        "git.antigravity-configured-model.v1",
        "files.pathsExist",
        "runtime.status.compat.v1",
        "runtime.environments.v1",
        "remote-runtime.shared-control.v1",
        "orchestration.federation.v1",
        "orchestration.federation-control-mail.v1",
        "orchestration.federation-lifecycle-settlement.v1",
        "orchestration.worker-stop-verdict.v1",
        "orchestration.worker-launch-preferences.v1",
        "orchestration.federation-structured-read.v1",
        "orchestration.federation-fleet-snapshot.v1",
        "orchestration.federation-release-archive.v1",
        "orchestration.contract.v1",
        "browser.screencast.v1",
        "browser.tab-create-known-id.v1",
        "browser.clientHost.v1",
        "browser.clientHost.pageMetadata.v1",
        "browser.clientHost.automation.v1",
        "browser.clientHost.fileChannel.v1",
        "network.browserTunnel.v1",
        "network.browserTunnel.executionHosts.v1",
        "terminal.binary-stream.v1",
        "terminal.multiplex.v1",
        "workspace-ports.v1",
        "mobile.tasks.v1",
        "project-host-setup.v1",
        "task-source-context.v1",
        "workspace-run-context.v1",
        "worktree.linked-work-item-context.v1",
        "worktree.github-pr-suppression.v1",
        "folder-workspace.path-status.v1",
        "linear.issue-attribute-filter.v1",
        "jira.user-fields.v1",
        "aiVault.v1",
        "aiVault.session-titles.v1",
        "terminal.query-reply-input.v1",
        "terminal.prompt-delivery.v1",
        "terminal.paired-parking.v1",
        "terminal.quick-commands.v1",
        "worktree.create-idempotency.v1",
        "worktree.archive-failure-blocking.v1",
        "terminal.create-idempotency.v2",
        "terminal.create-shell-selection.v1",
        "session-tabs.close-intent.v1",
        "session-tabs.authoritative-inventory.v1",
        "session-tabs.split-group-placement.v1",
        "agent-session.session-boundary.v1",
        "updater.remote-control.v1",
        "agent-session.host-authority.v1",
        "agent-session.omp-resume-path.v1",
        "agent-session.keyboard.v1",
        "agent-session.structured.v1",
        "agent-session.pending-send-result.v1",
        "agent-session.structured.hold.v1",
        "agent-session.structured.reveal.v1",
        "agent-session.structured.resume-history.v1",
        "agent-session.status-feed.v1",
        "agent-session.turn-completion.v1",
        "agent-session.rewind.v1",
        "agent-session.conversation-outline.v1",
        "agent-session.background-task-stop.v1",
        "agent-session.prompt-cancel.v1",
        "agent-session.question-answers.v1",
        "agent-session.turn-item.v1",
        "agent-session.background-task-row-stop.v1",
        "agent-session.kimi-resume.v1",
        "agent-session.opencode2-resume.v1",
        "agent-session.muse-resume.v1",
        "agent-session.zcode-resume.v1",
        "files.mutation-ownership.v1",
        "github.markPRReadyForReview",
        "gitlab.updateMR.readyForReview.v1",
        "worktree.visibility-defaults.v1",
        "worktree.visibility-source-defaults.v1",
        "accounts.import-host-credentials.v1",
        "accounts.codex-reset-credit.v1",
        "skills.install.v1",
        "skills.install.bundle.v1",
        "skills.install-cancel.v1",
        "skills.install-progress.v1",
        "skills.install-result.v2",
        "skills.upload.v1",
        "skills.manage.v1",
        "skills.install-providers.v1",
        "skills.delete.v1",
        "automation.list-host-scope.v1",
        "automation.owner-fencing.v1",
        "automation.create-idempotency.v1",
        "notifications.remote-push.v1",
        "agent.launch.v2",
        "agent.launch.replay.v1",
        "agent.launch.replay-required.v1",
        "browser.identity.v1",
        "browser.certificate-trust.v1",
        "mobileWeb.bundle.v1"
      ]
    },
    "graph": {
      "state": "ready"
    }
  },
  "_meta": {
    "runtimeId": "b1896c12-b413-48a1-9159-d91b4fccebe3"
  }
}
```

PASS: 1.4.217 >= 1.4.205. `running: true` also establishes that this check did not test shutting down the desktop app.

The status command was captured a second time for complete-output transcription; it returned the same version and runtime id. No failed version-floor check was retried.

## v01 — criteria

| Criterion | Result | Exact command / read | Verbatim output excerpt / evidence |
|---|---|---|---|
| Native registry citation | PASS | `read("node_modules/@oh-my-pi/pi-coding-agent/src/registry/agent-registry.ts:70-95")`; `read("node_modules/@oh-my-pi/pi-coding-agent/package.json:1-65")` | `export interface AgentRef {`; `sessionFile: string \| null;`; `\| { type: "registered"; ref: AgentRef }`; `"version": "18.3.5"` |
| Native reader citation | PASS | `read("node_modules/@oh-my-pi/pi-coding-agent/src/session/session-loader.ts:90")` | `export function parseSessionContent(content: string): SessionLoadResult {` |
| Native scope citation | PASS | `read("node_modules/@oh-my-pi/pi-coding-agent/src/registry/persisted-agents.ts:487-501")` | `return file === root \|\| file.startsWith(`${artifactRoot}${path.sep}`);`; `if (ref.status !== "parked" \|\| !rootSessionFile \|\| !ref.sessionFile) return true;` |
| Package loopback-bind citation | PASS | `read("omp-orca-observer/transport.ts:1-260")`; `bun omp-orca-observer/checks/transport.check.ts` | `const server = Bun.serve({ hostname: "127.0.0.1", port: options.port, fetch: handle });`; check exit 0, empty output |
| Orca `tab create` citation | PASS (supplied pinned read) | `read("local://ga-github-reads.md:1-240")` | `190\|orca tab create --url http://localhost:3000 --worktree active --json` |
| Embedded-browser loopback-URL citation | PASS (supplied pinned read) | `read("local://ga-github-reads.md:1-240")` | `286\|  const localDevAddress = classifySchemeLessLocalDevAddress(trimmed)`; `308\|    return parsed.protocol === 'http:' \|\|` |
| Auth gap recorded | PASS (gap, not auth proof) | `read("omp-orca-observer/index.ts:1-260")`; `read("omp-orca-observer/contract.ts:1-260")` | `grants: null,`; auth is intentionally absent in phase a; v11 is not run here |
| Windows-to-WSL gap recorded | PASS (gap, not reachability proof) | `read("docs/maintainers/omp-orca-bridge-slices/ga-phase-a-gates.md:1-260")` | `windows-to-wsl reachability is proven later by v06.`; v06 is not run here |
| Disposable plugin link | PASS (link only) | `bun <tmp>/ga-probes.ts one-child`; inner harness command: `omp --profile one-child plugin link "$PWD/omp-orca-observer"` | `link.exit=0`; `✔ Linked omp-orca-observer from $PWD/omp-orca-observer` |
| Separate install validation and inert factory | PASS with Main's loader-owned-cache exemption; original strict comparison FAIL is retained | `bun <tmp>/ga-install-isolated.ts`; child calls `loadExtensions(["$PWD/omp-orca-observer/index.ts"], "<tmp>/workspace")` | `fds.added:` `19 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db`; `20 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db-wal`; `21 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db-shm`; `files.added:` `home/.omp/cache/`; `home/.omp/cache/legacy-pi-extension-cache.db 4096 bytes`; `home/.omp/cache/legacy-pi-extension-cache.db-shm 32768 bytes`; `home/.omp/cache/legacy-pi-extension-cache.db-wal 61832 bytes`; `loader-owned-cache-only=true`; `install-validation=PASS`; `child.exit=0` |
| Exactly one publisher per tested main process | PASS | `bun <tmp>/ga-probes.ts one-child`; `bun <tmp>/ga-probes.ts nested`; `bun <tmp>/ga-probes.ts restricted` | `publisherCount=1 mainBinds=1 subBinds=1`; `publisherCount=1 mainBinds=1 subBinds=2`; `publisherCount=1 mainBinds=1 subBinds=1` respectively; each `publisherProcesses` contains one process log with count 1 |
| One child stays inert | PASS | `bun <tmp>/ga-probes.ts one-child` | `"message":"omp-orca-observer: bind kind=sub id=child-one"`; `publisherCount=1 mainBinds=1 subBinds=1` |
| Nested children stay inert | PASS | `bun <tmp>/ga-probes.ts nested` | `"message":"omp-orca-observer: bind kind=sub id=nested-parent"`; `"message":"omp-orca-observer: bind kind=sub id=nested-parent.nested-leaf"`; `publisherCount=1 mainBinds=1 subBinds=2` |
| Restricted child stays inert | PASS | `bun <tmp>/ga-probes.ts restricted` | `"message":"omp-orca-observer: bind kind=sub id=restricted-child"`; `publisherCount=1 mainBinds=1 subBinds=1` |

### Versioned contract citations and explicit gaps

- Native source: `AgentRef` supplies identity, kind, status, session-file identity and optional lifecycle metadata; the event union includes registered/status/metadata/removed. This does not infer success from registry status. Citation: omp dev dependency v18.3.5, `registry/agent-registry.ts:70-95`.
- Reader: the package's page reader uses the host's native parser entry point, exercised by the synthetic v15 observation. Citation: omp dev dependency v18.3.5, `session/session-loader.ts:90`; `checks/harness/v15.ts:3,68,104`.
- Scope: the native roster helper filters parked refs by the current root's artifact subtree when root/session-file information exists; its early return explicitly does not enforce that filter for all statuses or missing inputs. No phase-a native inventory integration is claimed. Citation: omp dev dependency v18.3.5, `registry/persisted-agents.ts:487-501`.
- Transport: this package binds only IPv4 loopback and passes `PAGE_MAX_BYTES` to the reader; the transport check exercised loopback access and rejection of non-loopback interfaces. Citation: schema-v1 phase-a source, `transport.ts:67-74,83-98`, SHA-256 `3f51b670b584ebb9a2ad21b9f587fef616de000c122ec0efd86c161d187f7571`.
- Orca tab creation: documentation shows `tab create --url` targeting the embedded browser, not a separate browser or desktop UI. Citation: Orca v1.4.215, `docs/site/content/docs/cli/reference.mdx:169-190`, supplied pinned artifact `local://ga-github-reads.md:3-11`, https://raw.githubusercontent.com/stablyai/orca/v1.4.215/docs/site/content/docs/cli/reference.mdx.
- Loopback URLs: the supplied normalizer excerpt returns classified local-development addresses and accepts explicit HTTP/HTTPS URLs, which includes an explicit numeric-loopback HTTP URL. This is URL-policy evidence, not Windows-to-WSL/browser reachability proof. Citation: Orca v1.4.215, `src/shared/browser-url.ts:276-309`, supplied pinned artifact `local://ga-github-reads.md:13-39`, https://raw.githubusercontent.com/stablyai/orca/v1.4.215/src/shared/browser-url.ts.
- Installer distinction: `PluginManager.link` creates a symlink; install validation separately invokes `loadExtensions(loadable, this.#cwd)`. Citation: omp v18.3.5, `extensibility/plugins/manager.ts:397-420,814-845`, `extensibility/extensions/loader.ts:485`; pinned installer documentation at https://raw.githubusercontent.com/can1357/oh-my-pi/v18.3.5/docs/plugin-manager-installer-plumbing.md, supplied artifact `local://ga-github-reads.md:41-52`.
- Auth: `grants: null` is intentional in phase a and is not a production authorization guarantee. Recorded gap: v11 remains unverified.
- Windows-to-WSL reachability: documentation accepting a URL is not network-path evidence. Recorded gap: v06 remains unverified.

The supplied installer-document excerpt is:

```text
Validate declared extension entries (`#validateInstalledExtensions`): each manifest `extensions` entry must resolve on disk, import to a factory function, and initialize successfully against a throwaway registration surface. On failure, roll back the install — restore the previous `plugins/package.json`, remove the freshly installed package, and restore any prior version from a backup taken before `bun install` — then abort.

`link` supports local plugin development by symlinking a local package into `~/.omp/plugins/node_modules/<pkg.name>`.
```

### Full probe outputs

#### `bun <tmp>/ga-probes.ts one-child` — exit 0

```text
scenario=one-child
harness.cwd=<tmp>/workspace
command=omp --profile one-child plugin link "$PWD/omp-orca-observer"
link.exit=0
link.stdout:
✔ Linked omp-orca-observer from $PWD/omp-orca-observer

link.stderr:

command=omp --profile one-child -p "HARNESS_AGENT=main complete the harness assignment"
probe.exit=0
probe.stdout:
main complete

probe.stderr:
Working...

log=<tmp>/home/.omp/profiles/one-child/logs/omp.2026-09-30.1847213.log
{"timestamp":"2026-09-30T12:31:53.835-05:00","level":"info","pid":1847213,"message":"omp-orca-observer: bind kind=main id=Main"}
{"timestamp":"2026-09-30T12:31:53.835-05:00","level":"info","pid":1847213,"message":"omp-orca-observer: publisher epoch=ea5174f9-f63d-4420-83cf-19a260674f77"}
{"timestamp":"2026-09-30T12:31:54.092-05:00","level":"info","pid":1847213,"message":"omp-orca-observer: bind kind=sub id=child-one"}
publisherProcesses=["omp.2026-09-30.1847213.log: 1"]
publisherCount=1 mainBinds=1 subBinds=1
probe.one-child=PASS
```

#### `bun <tmp>/ga-probes.ts nested` — exit 0

```text
scenario=nested
harness.cwd=<tmp>/workspace
command=omp --profile nested plugin link "$PWD/omp-orca-observer"
link.exit=0
link.stdout:
✔ Linked omp-orca-observer from $PWD/omp-orca-observer

link.stderr:

command=omp --profile nested -p "HARNESS_AGENT=main complete the harness assignment"
probe.exit=0
probe.stdout:
root complete

probe.stderr:
Working...

log=<tmp>/home/.omp/profiles/nested/logs/omp.2026-09-30.1847209.log
{"timestamp":"2026-09-30T12:31:53.835-05:00","level":"info","pid":1847209,"message":"omp-orca-observer: bind kind=main id=Main"}
{"timestamp":"2026-09-30T12:31:53.836-05:00","level":"info","pid":1847209,"message":"omp-orca-observer: publisher epoch=eba1842b-b82a-46b6-896a-9b95fc5ec576"}
{"timestamp":"2026-09-30T12:31:54.106-05:00","level":"info","pid":1847209,"message":"omp-orca-observer: bind kind=sub id=nested-parent"}
{"timestamp":"2026-09-30T12:31:54.646-05:00","level":"info","pid":1847209,"message":"omp-orca-observer: bind kind=sub id=nested-parent.nested-leaf"}
publisherProcesses=["omp.2026-09-30.1847209.log: 1"]
publisherCount=1 mainBinds=1 subBinds=2
probe.nested=PASS
```

#### `bun <tmp>/ga-probes.ts restricted` — exit 0

```text
scenario=restricted
harness.cwd=<tmp>/workspace
command=omp --profile restricted plugin link "$PWD/omp-orca-observer"
link.exit=0
link.stdout:
✔ Linked omp-orca-observer from $PWD/omp-orca-observer

link.stderr:

command=omp --profile restricted -p "HARNESS_AGENT=main complete the harness assignment"
probe.exit=0
probe.stdout:
main complete

probe.stderr:
Working...

log=<tmp>/home/.omp/profiles/restricted/logs/omp.2026-09-30.1847214.log
{"timestamp":"2026-09-30T12:31:53.835-05:00","level":"info","pid":1847214,"message":"omp-orca-observer: bind kind=main id=Main"}
{"timestamp":"2026-09-30T12:31:53.835-05:00","level":"info","pid":1847214,"message":"omp-orca-observer: publisher epoch=e75f8c8c-d930-43fd-aaee-a5901d9c2f42"}
{"timestamp":"2026-09-30T12:31:54.092-05:00","level":"info","pid":1847214,"message":"omp-orca-observer: bind kind=sub id=restricted-child"}
publisherProcesses=["omp.2026-09-30.1847214.log: 1"]
publisherCount=1 mainBinds=1 subBinds=1
probe.restricted=PASS
```

## v15 — criteria and observation

| Criterion | Result | Exact command | Verbatim output excerpt |
|---|---|---|---|
| Prescribed thin-slice command exits 0 | PASS | `bun omp-orca-observer/checks/harness/v15.ts` | Empty stdout/stderr; exit 0. Full command output is recorded below. |
| Synthetic child row served over HTTP | PASS | `bun <tmp>/ga-v15-isolated.ts`, which imports the unchanged `checks/harness/v15.ts` | `http.snapshot={"epoch":"f7ee490a-499f-43bd-9cd2-0f9b1710cb39","childId":"synthetic-child","status":200}` |
| Bounded synthetic-transcript page <= 256 KiB | PASS | `bun <tmp>/ga-v15-isolated.ts` | `transcript.reads=[{"offset":0,"length":498},{"offset":0,"length":498}]`; `maxTranscriptReadLength=498 limit=262144` |
| Restart reconciliation: new epoch, old token resets | PASS | `bun <tmp>/ga-v15-isolated.ts` | `http.snapshot={"epoch":"b09c4041-8865-4708-9ff5-4523f996fcae","childId":"synthetic-child","status":200}`; `http.page={"status":200,"reset":true,"entries":3}`; `restart.newEpoch=true oldTokenReset=true` |
| Absent-Orca behavior: no Orca access | PASS within the CLI/environment-absent observation | `bun <tmp>/ga-v15-isolated.ts` | `child.PATH=<tmp>/tmp (empty; no Orca CLI)`; `subprocessCalls=[]`; `orcaCliAbsent=true orcaEnvironmentAbsent=true`; HTTP destinations are only the observer's numeric-loopback routes |
| Synthetic records never become native children | PASS | `bun <tmp>/ga-v15-isolated.ts` | `nativeRegistrations=0`; the script also asserted unchanged native registry ids |

The observing child uses the harness's disposable roots at process start. Its PATH is an empty disposable directory and it inherits no ORCA variables. It observes, rather than replaces, actual HTTP responses, file-handle reads, native registry events, and subprocess APIs. It imports the unchanged v15 script; no synthetic child is registered.

### `bun <tmp>/ga-v15-isolated.ts` — exit 0, full output

```text
child.PATH=<tmp>/tmp (empty; no Orca CLI)
child.environment.keys=["HOME","LANG","PATH","TERM","TMPDIR","XDG_CACHE_HOME","XDG_CONFIG_HOME","XDG_DATA_HOME","XDG_STATE_HOME"]
child.stdout:
http.snapshot={"epoch":"f7ee490a-499f-43bd-9cd2-0f9b1710cb39","childId":"synthetic-child","status":200}
http.page={"status":200,"reset":false,"entries":3}
http.snapshot={"epoch":"b09c4041-8865-4708-9ff5-4523f996fcae","childId":"synthetic-child","status":200}
http.page={"status":200,"reset":true,"entries":3}
transcript.reads=[{"offset":0,"length":498},{"offset":0,"length":498}]
maxTranscriptReadLength=498 limit=262144
restart.newEpoch=true oldTokenReset=true
subprocessCalls=[]
http.destinations=["http://127.0.0.1/v1/snapshot","http://127.0.0.1/v1/children/synthetic-child/page","http://127.0.0.1/v1/snapshot","http://127.0.0.1/v1/children/synthetic-child/page"]
nativeRegistrations=0
orcaCliAbsent=true orcaEnvironmentAbsent=true
v15.observations=PASS

child.stderr:

child.exit=0
```

## Required check outputs

Each command below passed, exit 0. Both output streams were empty. `(no output)` is the shell tool's display marker, not text emitted by the program. These are the complete outputs; no diagnostics were omitted. These were the assigned scoped checks, not a project-wide suite/build/lint/formatter.

### `bun omp-orca-observer/checks/contract.check.ts`

```text
(no output)
```

### `bun omp-orca-observer/checks/core.check.ts`

```text
(no output)
```

### `bun omp-orca-observer/checks/reader.check.ts`

```text
(no output)
```

### `bun omp-orca-observer/checks/transport.check.ts`

```text
(no output)
```

### `timeout 300 bun omp-orca-observer/checks/harness.check.ts`

```text
(no output)
```

### `bun omp-orca-observer/checks/harness/v15.ts`

```text
(no output)
```

## What stays unverified

- v11 authorization/security and v06 Windows-to-WSL reachability remain explicit gaps. Phase-a HTTP serving intentionally has no auth.
- No Orca tab was created, no embedded-browser surface was exercised, and no live omp observer endpoint was started. Orca was used only for `skills get` and `status`.
- The absence observation removes the Orca CLI and routing environment from the measuring child; it does not stop the already-running desktop app or provide system-wide native-syscall tracing.
- Native source/outcome wiring is not exercised by synthetic v15: the inspected phase-a `index.ts:20-23` deliberately starts with `source: null` and `outcomes: null`. No claim of a native-child HTTP inventory is made.
- A real registry/package-manager install and rollback were not run. Evidence separates symlink linking from the installer's actual `loadExtensions` registration validation.
- Installed-binary smoke coverage is omp 18.4.4/Orca 1.4.217; the inspected dev source and parser are omp 18.3.5. This does not claim a second smoke run of the exact floor binaries.
- Factory resource evidence covers the load call, setTimeout/setInterval/Bun.serve hooks, persistent FD deltas and disposable filesystem listings. The loader's own parse-cache files are explicitly attributed, not hidden. Arbitrary transient native resources are not system-call traced.
- The out-of-profile cache files from run 1 were not inspected, removed, reset, or otherwise touched after the incident. Their prior existence/content and any resulting content changes remain unverified.
- The pinned GitHub excerpts were supplied by Main and inspected locally; this worker did not independently re-fetch the remote originals because its GitHub tool was unavailable and further fetching was prohibited.

## Slice gaps found during the run (since resolved in the slice)

1. Process-start HOME/XDG isolation and loader-owned cache attribution: resolved-during-build note, gate spec line 44.
2. Version/attribution source reads: resolved-during-build read list, gate spec line 14.
3. Orca normalizer excerpt through explicit HTTP/HTTPS acceptance: resolved-during-build read list, gate spec line 16, and note, gate spec line 43.
4. v15 observation wrapper and absent-Orca boundary: resolved-during-build note, gate spec line 45.
5. Supplied pinned GitHub reads when the tool is unavailable: resolved-during-build note, gate spec line 43.
6. Disposable git-fixture commit boundary: resolved-during-build note, gate spec line 46.
7. Ephemeral supporting-script retention and output normalization: resolved-during-build note, gate spec line 47.

## Proposed schema-v1 freeze — not applied

Proposal for review: freeze the current schema-v1 snapshot wire shape after reviewing this evidence and the clarification/incident above, not during this gate.

- Preserve `Snapshot`, `ChildRow`, `Known`, `Completeness`, `RunOutcome`, and milestone/lineage fields as declared in the inspected `contract.ts`; missing evidence stays explicit unknown/unavailable, and registry status/activity never becomes inferred outcome success.
- Preserve `/v1/snapshot`, the encoded one-segment child-page route, `x-observer-schema: 1`, the 1-MiB snapshot budget and 256-KiB native transcript-page budget. Epoch and continuation reset semantics must remain observable across restarts.
- Treat a future incompatible wire-shape change as requiring a schema-version change. Do not imply that a snapshot-shape freeze proves native inventory integration, auth, browser operation, or WSL reachability.

Basis: `contract.ts:1-219` (SHA-256 `6a256c2892913f141717ac72638784910f5f803953b785f5188dc511d1b5c3a5`), passing required checks, and the observed synthetic HTTP/restart/read path above. No ADR was created: this slice records evidence and a proposal, not a durable approved architecture decision.

## Install-validation runs

Bootstrap note: an optional dev-version `createRequire(...).resolve("@oh-my-pi/pi-coding-agent")` probe failed before `loadExtensions` with `Cannot find module '@oh-my-pi/pi-coding-agent' from '$PWD/omp-orca-observer/index.ts'` (exit 1); Main authorized deleting that unnecessary script-only probe and reading the package manifest instead. It is not counted as a product criterion failure.

### Run 1: script isolation defect — `bun <tmp>/ga-install-validation.ts`, exit 1

The original strict FD assertion failed. The loader opened `$HOME/.omp/cache/legacy-pi-extension-cache.db`, `-wal`, and `-shm` outside the disposable profile despite the script changing HOME/XDG in-process. This is an isolation incident; those paths were not touched afterward. This run was not accepted as a pass.

The complete output and reproducing script are retained in the appendices below. The script is historical incident evidence, not the recommended command to repeat against a live home.

### Run 2: process-start isolation — `bun <tmp>/ga-install-isolated.ts`, exit 0

The measuring child inherited only HOME, LANG, PATH, TERM, TMPDIR and XDG roots from the disposable harness environment. Its only measured deltas were three loader-owned database FDs/files and the cache directory, all under `<tmp>`. No file/FD removal, observer server call, or timer call was observed.

Command: `bun <tmp>/ga-install-isolated.ts` from the repository root. Exit status: `0`. Normalized output:

```text
child.environment.keys=["HOME","LANG","PATH","TERM","TMPDIR","XDG_CACHE_HOME","XDG_CONFIG_HOME","XDG_DATA_HOME","XDG_STATE_HOME"]
child.stdout:
command=loadExtensions(["$PWD/omp-orca-observer/index.ts"], "<tmp>/workspace")
loadExtensions.errors=[]
loadExtensions.extensions=1
timerCalls={"setTimeout":0,"setInterval":0}
Bun.serveCalls=0
fds.before:
0 -> /dev/null
1 -> socket:[10325961]
2 -> socket:[10325963]
3 -> /dev/urandom
4 -> anon_inode:[eventpoll]
5 -> anon_inode:[timerfd]
6 -> anon_inode:[eventfd]
7 -> anon_inode:[timerfd]
8 -> anon_inode:[timerfd]
9 -> /dev/urandom
10 -> /proc/<pid>/statm
11 -> socket:[10325963]
12 -> anon_inode:[eventpoll]
13 -> anon_inode:[eventfd]
14 -> anon_inode:[eventpoll]
15 -> socket:[10322481]
16 -> socket:[10322482]
17 -> socket:[10322481]
18 -> socket:[10325961]
fds.after:
0 -> /dev/null
1 -> socket:[10325961]
2 -> socket:[10325963]
3 -> /dev/urandom
4 -> anon_inode:[eventpoll]
5 -> anon_inode:[timerfd]
6 -> anon_inode:[eventfd]
7 -> anon_inode:[timerfd]
8 -> anon_inode:[timerfd]
9 -> /dev/urandom
10 -> /proc/<pid>/statm
11 -> socket:[10325963]
12 -> anon_inode:[eventpoll]
13 -> anon_inode:[eventfd]
14 -> anon_inode:[eventpoll]
15 -> socket:[10322481]
16 -> socket:[10322482]
17 -> socket:[10322481]
18 -> socket:[10325961]
19 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db
20 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db-wal
21 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db-shm
files.before: 143 lines, sha256=ab0a119a22f346f1ab10c0cef444cf32a279a05c35deca87367c25b57dbb15f0 (normalized; hash includes trailing newline)
files.after: 147 lines, sha256=9d79aa4cce0c1cdfa1de64d74cec2de0aca99f8817b736eebcc01359ddaa0fac (normalized; hash includes trailing newline)
fds.added:
19 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db
20 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db-wal
21 -> <tmp>/home/.omp/cache/legacy-pi-extension-cache.db-shm
fds.removed:

files.added:
home/.omp/cache/
home/.omp/cache/legacy-pi-extension-cache.db 4096 bytes
home/.omp/cache/legacy-pi-extension-cache.db-shm 32768 bytes
home/.omp/cache/legacy-pi-extension-cache.db-wal 61832 bytes
files.removed:

loader-owned-cache-only=true
install-validation=PASS

child.stderr:

child.exit=0
```

The source attribution was independently inspected after Main's grant:

```text
legacy-pi-compat.ts:567  const cachePath = getLegacyPiExtensionCacheDbPath();
legacy-pi-compat.ts:584  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
legacy-pi-compat.ts:585  const db = new Database(cachePath, { create: true });
legacy-pi-compat.ts:592  db.run("PRAGMA journal_mode=WAL");
dirs.ts:385  const RESOLVER_HOME = os.homedir();
dirs.ts:683  return dirs.rootSubdir(path.join("cache", "legacy-pi-extension-cache.db"), "cache");
```

Citation: omp dev dependency v18.3.5, `node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/plugins/legacy-pi-compat.ts:564-592` (SHA-256 `8aee84d6aa5e1a72cb430e4e18a667d51fb2a43d60cccbe9056dc2511c3e3a36`); authorized resolver source `node_modules/@oh-my-pi/pi-utils/src/dirs.ts:381-395,681-684` (SHA-256 `213c835c197bd101e5b4f77893c5f9aa76e86b43b8d44d85c154df1a46eb8ac8`).

## Appendix A — run 1 complete output

Command: `bun <tmp>/ga-install-validation.ts`. Exit 1. Paths only are normalized as described above. The native postmortem handlers emitted the same assertion seven times; one copy is retained below and six duplicates are collapsed.

```text
loadExtensions.errors=[]
loadExtensions.extensions=1
timerCalls={"setTimeout":0,"setInterval":0}
Bun.serveCalls=0
fds.before:
0 -> /dev/null
1 -> pipe:[10306782]
2 -> pipe:[10306782]
3 -> /dev/urandom
4 -> anon_inode:[eventpoll]
5 -> /dev/urandom
6 -> anon_inode:[timerfd]
7 -> anon_inode:[eventfd]
8 -> anon_inode:[timerfd]
9 -> anon_inode:[timerfd]
10 -> /dev/urandom
11 -> /proc/<pid>/statm
12 -> pipe:[10306782]
13 -> socket:[10283895]
14 -> anon_inode:[eventpoll]
15 -> anon_inode:[eventfd]
16 -> anon_inode:[eventpoll]
17 -> socket:[10271486]
18 -> socket:[10271487]
19 -> socket:[10271486]
20 -> pipe:[10306782]
132 -> /dev/pts/<tty>
134 -> /dev/pts/<tty>
fds.after:
0 -> /dev/null
1 -> pipe:[10306782]
2 -> pipe:[10306782]
3 -> /dev/urandom
4 -> anon_inode:[eventpoll]
5 -> /dev/urandom
6 -> anon_inode:[timerfd]
7 -> anon_inode:[eventfd]
8 -> anon_inode:[timerfd]
9 -> anon_inode:[timerfd]
10 -> /dev/urandom
11 -> /proc/<pid>/statm
12 -> pipe:[10306782]
13 -> socket:[10283895]
14 -> anon_inode:[eventpoll]
15 -> anon_inode:[eventfd]
16 -> anon_inode:[eventpoll]
17 -> socket:[10271486]
18 -> socket:[10271487]
19 -> socket:[10271486]
20 -> pipe:[10306782]
21 -> $HOME/.omp/cache/legacy-pi-extension-cache.db
22 -> $HOME/.omp/cache/legacy-pi-extension-cache.db-wal
23 -> $HOME/.omp/cache/legacy-pi-extension-cache.db-shm
132 -> /dev/pts/<tty>
134 -> /dev/pts/<tty>
files.before:
cache/
config/
data/
home/
home/.omp/
home/.omp/natives/
home/.omp/natives/18.4.4/
home/.omp/natives/18.4.4/pi_natives.linux-x64-baseline.node 190174736 bytes sha256=7dd455fbbf8dff899426c6dd40532c63e0f6ded8292fb7456390918c92519849
home/.omp/natives/18.4.4/pi_natives.linux-x64-modern.node 189992464 bytes sha256=c2aec4f2c92b52321f91e655e97ac4dc655f7e30e60bc011dfc977754226d629
home/.omp/profiles/
home/.omp/profiles/one-child/
home/.omp/profiles/one-child/agent/
home/.omp/profiles/one-child/agent/agents/
home/.omp/profiles/one-child/agent/agents/advisor.md 141 bytes sha256=137b2c09723aafcaba85168738b4d57177fd0d8e565c02ba38273253f1abec20
home/.omp/profiles/one-child/agent/agents/blocking.md 138 bytes sha256=5118ef17be65fa7e33bf977b627d91c183df7f51d2844d8bd0debb1021736205
home/.omp/profiles/one-child/agent/agents/restricted.md 142 bytes sha256=47ea9e3363fa9260a9a301b970725d7503cf4878eb332fd82c3a00687f4116da
home/.omp/profiles/one-child/agent/config.yml 509 bytes sha256=fcd1117a13cd7f68da1346fbb355c43919cae3046ddb7c0c91da2f77e3bb24cb
home/.omp/profiles/one-child/agent/models.yml 881 bytes sha256=3a2f0895bc24e39eee119de89c8bcd323688e439ab2e0b162757f733a4bebdb3
home/.omp/profiles/one-child/logs/
home/.omp/profiles/one-child/logs/.omp.1843684-audit.json 475 bytes sha256=36ac17f518894143c5d13ef0120cae90f189bfeee19f9bc2e04ff5f64c7d6925
home/.omp/profiles/one-child/logs/omp.2026-09-30.1843684.log 156 bytes sha256=b8eb26d67906247ece9740342c52e7201cbf2d747124bac7502554ac9e04fb74
home/.omp/profiles/one-child/plugins/
home/.omp/profiles/one-child/plugins/node_modules/
home/.omp/profiles/one-child/plugins/node_modules/omp-orca-observer -> $PWD/omp-orca-observer
home/.omp/profiles/one-child/plugins/omp-plugins.lock.json 126 bytes sha256=1aa2bbd5e7a0ec37797fe23fa0c8c6c368e43bfd4262dead39b340fc8d566410
state/
tmp/
workspace/
workspace/.git/
workspace/.git/HEAD 23 bytes sha256=f6f2b945f6c411b02ba3da9c7ace88dcf71b6af65ba2e0d89aa82900042b5a10
workspace/.git/branches/
workspace/.git/config 92 bytes sha256=cfe7ba1238c9a78be7535d7c63bcaf5a4d5011d46b07c9b45d3bbf7d6c312dfe
workspace/.git/description 73 bytes sha256=85ab6c163d43a17ea9cf7788308bca1466f1b0a8d1cc92e26e9bf63da4062aee
workspace/.git/hooks/
workspace/.git/hooks/applypatch-msg.sample 478 bytes sha256=0223497a0b8b033aa58a3a521b8629869386cf7ab0e2f101963d328aa62193f7
workspace/.git/hooks/commit-msg.sample 896 bytes sha256=1f74d5e9292979b573ebd59741d46cb93ff391acdd083d340b94370753d92437
workspace/.git/hooks/fsmonitor-watchman.sample 4726 bytes sha256=e0549964e93897b519bd8e333c037e51fff0f88ba13e086a331592bf801fa1d0
workspace/.git/hooks/post-update.sample 189 bytes sha256=81765af2daef323061dcbc5e61fc16481cb74b3bac9ad8a174b186523586f6c5
workspace/.git/hooks/pre-applypatch.sample 424 bytes sha256=e15c5b469ea3e0a695bea6f2c82bcf8e62821074939ddd85b77e0007ff165475
workspace/.git/hooks/pre-commit.sample 1643 bytes sha256=f9af7d95eb1231ecf2eba9770fedfa8d4797a12b02d7240e98d568201251244a
workspace/.git/hooks/pre-merge-commit.sample 416 bytes sha256=d3825a70337940ebbd0a5c072984e13245920cdf8898bd225c8d27a6dfc9cb53
workspace/.git/hooks/pre-push.sample 1374 bytes sha256=ecce9c7e04d3f5dd9d8ada81753dd1d549a9634b26770042b58dda00217d086a
workspace/.git/hooks/pre-rebase.sample 4898 bytes sha256=4febce867790052338076f4e66cc47efb14879d18097d1d61c8261859eaaa7b3
workspace/.git/hooks/pre-receive.sample 544 bytes sha256=a4c3d2b9c7bb3fd8d1441c31bd4ee71a595d66b44fcf49ddb310252320169989
workspace/.git/hooks/prepare-commit-msg.sample 1492 bytes sha256=e9ddcaa4189fddd25ed97fc8c789eca7b6ca16390b2392ae3276f0c8e1aa4619
workspace/.git/hooks/push-to-checkout.sample 2783 bytes sha256=a53d0741798b287c6dd7afa64aee473f305e65d3f49463bb9d7408ec3b12bf5f
workspace/.git/hooks/sendemail-validate.sample 2308 bytes sha256=44ebfc923dc5466bc009602f0ecf067b9c65459abfe8868ddc49b78e6ced7a92
workspace/.git/hooks/update.sample 3650 bytes sha256=8d5f2fa83e103cf08b57eaa67521df9194f45cbdbcb37da52ad586097a14d106
workspace/.git/info/
workspace/.git/info/exclude 240 bytes sha256=6671fe83b7a07c8932ee89164d1f2793b2318058eb8b98dc5c06ee0a5a3b0ec1
workspace/.git/objects/
workspace/.git/objects/info/
workspace/.git/objects/pack/
workspace/.git/refs/
workspace/.git/refs/heads/
workspace/.git/refs/tags/
files.after:
cache/
config/
data/
home/
home/.omp/
home/.omp/natives/
home/.omp/natives/18.4.4/
home/.omp/natives/18.4.4/pi_natives.linux-x64-baseline.node 190174736 bytes sha256=7dd455fbbf8dff899426c6dd40532c63e0f6ded8292fb7456390918c92519849
home/.omp/natives/18.4.4/pi_natives.linux-x64-modern.node 189992464 bytes sha256=c2aec4f2c92b52321f91e655e97ac4dc655f7e30e60bc011dfc977754226d629
home/.omp/profiles/
home/.omp/profiles/one-child/
home/.omp/profiles/one-child/agent/
home/.omp/profiles/one-child/agent/agents/
home/.omp/profiles/one-child/agent/agents/advisor.md 141 bytes sha256=137b2c09723aafcaba85168738b4d57177fd0d8e565c02ba38273253f1abec20
home/.omp/profiles/one-child/agent/agents/blocking.md 138 bytes sha256=5118ef17be65fa7e33bf977b627d91c183df7f51d2844d8bd0debb1021736205
home/.omp/profiles/one-child/agent/agents/restricted.md 142 bytes sha256=47ea9e3363fa9260a9a301b970725d7503cf4878eb332fd82c3a00687f4116da
home/.omp/profiles/one-child/agent/config.yml 509 bytes sha256=fcd1117a13cd7f68da1346fbb355c43919cae3046ddb7c0c91da2f77e3bb24cb
home/.omp/profiles/one-child/agent/models.yml 881 bytes sha256=3a2f0895bc24e39eee119de89c8bcd323688e439ab2e0b162757f733a4bebdb3
home/.omp/profiles/one-child/logs/
home/.omp/profiles/one-child/logs/.omp.1843684-audit.json 475 bytes sha256=36ac17f518894143c5d13ef0120cae90f189bfeee19f9bc2e04ff5f64c7d6925
home/.omp/profiles/one-child/logs/omp.2026-09-30.1843684.log 156 bytes sha256=b8eb26d67906247ece9740342c52e7201cbf2d747124bac7502554ac9e04fb74
home/.omp/profiles/one-child/plugins/
home/.omp/profiles/one-child/plugins/node_modules/
home/.omp/profiles/one-child/plugins/node_modules/omp-orca-observer -> $PWD/omp-orca-observer
home/.omp/profiles/one-child/plugins/omp-plugins.lock.json 126 bytes sha256=1aa2bbd5e7a0ec37797fe23fa0c8c6c368e43bfd4262dead39b340fc8d566410
state/
tmp/
workspace/
workspace/.git/
workspace/.git/HEAD 23 bytes sha256=f6f2b945f6c411b02ba3da9c7ace88dcf71b6af65ba2e0d89aa82900042b5a10
workspace/.git/branches/
workspace/.git/config 92 bytes sha256=cfe7ba1238c9a78be7535d7c63bcaf5a4d5011d46b07c9b45d3bbf7d6c312dfe
workspace/.git/description 73 bytes sha256=85ab6c163d43a17ea9cf7788308bca1466f1b0a8d1cc92e26e9bf63da4062aee
workspace/.git/hooks/
workspace/.git/hooks/applypatch-msg.sample 478 bytes sha256=0223497a0b8b033aa58a3a521b8629869386cf7ab0e2f101963d328aa62193f7
workspace/.git/hooks/commit-msg.sample 896 bytes sha256=1f74d5e9292979b573ebd59741d46cb93ff391acdd083d340b94370753d92437
workspace/.git/hooks/fsmonitor-watchman.sample 4726 bytes sha256=e0549964e93897b519bd8e333c037e51fff0f88ba13e086a331592bf801fa1d0
workspace/.git/hooks/post-update.sample 189 bytes sha256=81765af2daef323061dcbc5e61fc16481cb74b3bac9ad8a174b186523586f6c5
workspace/.git/hooks/pre-applypatch.sample 424 bytes sha256=e15c5b469ea3e0a695bea6f2c82bcf8e62821074939ddd85b77e0007ff165475
workspace/.git/hooks/pre-commit.sample 1643 bytes sha256=f9af7d95eb1231ecf2eba9770fedfa8d4797a12b02d7240e98d568201251244a
workspace/.git/hooks/pre-merge-commit.sample 416 bytes sha256=d3825a70337940ebbd0a5c072984e13245920cdf8898bd225c8d27a6dfc9cb53
workspace/.git/hooks/pre-push.sample 1374 bytes sha256=ecce9c7e04d3f5dd9d8ada81753dd1d549a9634b26770042b58dda00217d086a
workspace/.git/hooks/pre-rebase.sample 4898 bytes sha256=4febce867790052338076f4e66cc47efb14879d18097d1d61c8261859eaaa7b3
workspace/.git/hooks/pre-receive.sample 544 bytes sha256=a4c3d2b9c7bb3fd8d1441c31bd4ee71a595d66b44fcf49ddb310252320169989
workspace/.git/hooks/prepare-commit-msg.sample 1492 bytes sha256=e9ddcaa4189fddd25ed97fc8c789eca7b6ca16390b2392ae3276f0c8e1aa4619
workspace/.git/hooks/push-to-checkout.sample 2783 bytes sha256=a53d0741798b287c6dd7afa64aee473f305e65d3f49463bb9d7408ec3b12bf5f
workspace/.git/hooks/sendemail-validate.sample 2308 bytes sha256=44ebfc923dc5466bc009602f0ecf067b9c65459abfe8868ddc49b78e6ced7a92
workspace/.git/hooks/update.sample 3650 bytes sha256=8d5f2fa83e103cf08b57eaa67521df9194f45cbdbcb37da52ad586097a14d106
workspace/.git/info/
workspace/.git/info/exclude 240 bytes sha256=6671fe83b7a07c8932ee89164d1f2793b2318058eb8b98dc5c06ee0a5a3b0ec1
workspace/.git/objects/
workspace/.git/objects/info/
workspace/.git/objects/pack/
workspace/.git/refs/
workspace/.git/refs/heads/
workspace/.git/refs/tags/
fds.unchanged=false
files.unchanged=true

[Uncaught Exception] AssertionError: Expected values to be strictly deep-equal:
+ actual - expected
... Skipped lines

  [
    '0 -> /dev/null',
    '1 -> pipe:[10306782]',
    '2 -> pipe:[10306782]',
    '3 -> /dev/urandom',
...
    '20 -> pipe:[10306782]',
+   '21 -> $HOME/.omp/cache/legacy-pi-extension-cache.db',
+   '22 -> $HOME/.omp/cache/legacy-pi-extension-cache.db-wal',
+   '23 -> $HOME/.omp/cache/legacy-pi-extension-cache.db-shm',
    '132 -> /dev/pts/<tty>',
    '134 -> /dev/pts/<tty>'
  ]

    at <tmp>/ga-install-validation.ts:105:10
    at processTicksAndRejections (native:7:39)
 (the native postmortem handlers emitted this identical assertion 7 times in total; 6 duplicates collapsed)
```
## Supporting scripts

Copy all six scripts below into one `<tmp>` directory and run from the repository root:

```sh
bun <tmp>/ga-probes.ts one-child
bun <tmp>/ga-probes.ts nested
bun <tmp>/ga-probes.ts restricted
bun <tmp>/ga-install-isolated.ts
bun <tmp>/ga-v15-isolated.ts
```

`ga-install-validation.ts` is historical incident evidence, NOT to be run: it writes into the live `$HOME/.omp/cache`.

### `ga-probes.ts`

```ts
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// The disposable harness lives in the repository selected at runtime.
const repo = process.cwd();
const originalHome = process.env.HOME ?? "";
const scenario = process.argv[2];
assert.ok(scenario === "one-child" || scenario === "nested" || scenario === "restricted");
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create(scenario);
const safe = (text: string): string => text.replaceAll(profile.root, "<tmp>")
  .replaceAll(repo, "$PWD").replaceAll(originalHome || "\0", "$HOME");
try {
  console.log(`scenario=${scenario}`);
  console.log(`harness.cwd=${safe(profile.workspace)}`);
  console.log(`command=omp --profile ${scenario} plugin link "$PWD/omp-orca-observer"`);
  const linked = await profile.run(["plugin", "link", join(repo, "omp-orca-observer")]);
  console.log(`link.exit=${linked.exitCode}`);
  console.log("link.stdout:");
  console.log(safe(linked.stdout));
  console.log("link.stderr:");
  console.log(safe(linked.stderr));
  assert.equal(linked.exitCode, 0);
  const prompt = "HARNESS_AGENT=main complete the harness assignment";
  console.log(`command=omp --profile ${scenario} -p ${JSON.stringify(prompt)}`);
  const result = await profile.run(["-p", prompt]);
  console.log(`probe.exit=${result.exitCode}`);
  console.log("probe.stdout:");
  console.log(safe(result.stdout));
  console.log("probe.stderr:");
  console.log(safe(result.stderr));
  const logDirectory = join(profile.home, ".omp", "profiles", scenario, "logs");
  const logs = readdirSync(logDirectory).filter(name => name.endsWith(".log")).sort();
  let publisherCount = 0;
  let mainBinds = 0;
  let subBinds = 0;
  const publisherProcesses: string[] = [];
  for (const name of logs) {
    const lines = readFileSync(join(logDirectory, name), "utf8").split("\n")
      .filter(line => line.includes("omp-orca-observer:"));
    if (lines.length === 0) continue;
    console.log(`log=${safe(join(logDirectory, name))}`);
    console.log(lines.join("\n"));
    const count = lines.filter(line => line.includes("omp-orca-observer: publisher epoch=")).length;
    if (count > 0) publisherProcesses.push(`${name}: ${count}`);
    publisherCount += count;
    mainBinds += lines.filter(line => line.includes("omp-orca-observer: bind kind=main")).length;
    subBinds += lines.filter(line => line.includes("omp-orca-observer: bind kind=sub")).length;
  }
  console.log(`publisherProcesses=${JSON.stringify(publisherProcesses)}`);
  console.log(`publisherCount=${publisherCount} mainBinds=${mainBinds} subBinds=${subBinds}`);
  assert.equal(result.exitCode, 0);
  assert.equal(publisherProcesses.length, 1);
  assert.equal(publisherCount, 1);
  assert.equal(mainBinds, 1);
  assert.equal(subBinds, scenario === "nested" ? 2 : 1);
  console.log(`probe.${scenario}=PASS`);
} finally {
  await profile.teardown();
}
```

### `ga-install-validation.ts` — historical incident evidence only

```ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, readlinkSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

// Module-loading boundary: the repository is runtime-selected, and the dev SDK
// must load after disposable environment isolation rather than during static imports.
const repo = process.cwd();
const originalHome = process.env.HOME ?? "";
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create("one-child");
function safe(text: string): string {
  return text.replaceAll(profile.root, "<tmp>").replaceAll(repo, "$PWD")
    .replaceAll(originalHome || "\0", "$HOME");
}
function files(directory: string, relative = ""): string[] {
  const result: string[] = [];
  for (const name of readdirSync(join(directory, relative)).sort()) {
    const path = join(relative, name);
    const full = join(directory, path);
    const info = lstatSync(full);
    if (info.isSymbolicLink()) result.push(`${path} -> ${safe(readlinkSync(full))}`);
    else if (info.isDirectory()) {
      result.push(`${path}/`);
      result.push(...files(directory, path));
    } else result.push(`${path} ${info.size} bytes sha256=${createHash("sha256").update(readFileSync(full)).digest("hex")}`);
  }
  return result;
}
function fds(): string[] {
  const result: string[] = [];
  for (const fd of readdirSync("/proc/self/fd").sort((a, b) => Number(a) - Number(b))) {
    try {
      result.push(`${fd} -> ${safe(readlinkSync(`/proc/self/fd/${fd}`))}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return result;
}
try {
  const keep = Object.fromEntries(["PATH", "TERM", "LANG"].flatMap(key => process.env[key] ? [[key, process.env[key]]] : []));
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, keep, {
    HOME: profile.home,
    TMPDIR: join(profile.root, "tmp"),
    XDG_CONFIG_HOME: join(profile.root, "config"),
    XDG_CACHE_HOME: join(profile.root, "cache"),
    XDG_DATA_HOME: join(profile.root, "data"),
    XDG_STATE_HOME: join(profile.root, "state"),
  });
  process.chdir(profile.workspace);
  const { loadExtensions } = await import(pathToFileURL(join(repo,
    "node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts")).href);
  const beforeFiles = files(profile.root);
  const beforeFds = fds();
  const originalTimeout = globalThis.setTimeout;
  const originalInterval = globalThis.setInterval;
  const originalServe = Bun.serve;
  let timeoutCalls = 0;
  let intervalCalls = 0;
  let serveCalls = 0;
  globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
    timeoutCalls++;
    return originalTimeout(...args);
  }) as typeof setTimeout;
  globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
    intervalCalls++;
    return originalInterval(...args);
  }) as typeof setInterval;
  Bun.serve = ((...args: Parameters<typeof Bun.serve>) => {
    serveCalls++;
    return originalServe(...args);
  }) as typeof Bun.serve;
  let loaded;
  try {
    loaded = await loadExtensions([resolve(repo, "omp-orca-observer/index.ts")], profile.workspace);
  } finally {
    globalThis.setTimeout = originalTimeout;
    globalThis.setInterval = originalInterval;
    Bun.serve = originalServe;
  }
  const afterFds = fds();
  const afterFiles = files(profile.root);
  console.log(`loadExtensions.errors=${safe(JSON.stringify(loaded.errors))}`);
  console.log(`loadExtensions.extensions=${loaded.extensions.length}`);
  console.log(`timerCalls=${JSON.stringify({ setTimeout: timeoutCalls, setInterval: intervalCalls })}`);
  console.log(`Bun.serveCalls=${serveCalls}`);
  console.log("fds.before:");
  console.log(beforeFds.join("\n"));
  console.log("fds.after:");
  console.log(afterFds.join("\n"));
  console.log("files.before:");
  console.log(beforeFiles.join("\n"));
  console.log("files.after:");
  console.log(afterFiles.join("\n"));
  console.log(`fds.unchanged=${JSON.stringify(beforeFds) === JSON.stringify(afterFds)}`);
  console.log(`files.unchanged=${JSON.stringify(beforeFiles) === JSON.stringify(afterFiles)}`);
  assert.deepEqual(loaded.errors, []);
  assert.equal(loaded.extensions.length, 1);
  assert.equal(timeoutCalls, 0);
  assert.equal(intervalCalls, 0);
  assert.equal(serveCalls, 0);
  assert.deepEqual(afterFds, beforeFds);
  assert.deepEqual(afterFiles, beforeFiles);
  console.log("install-validation=PASS");
} finally {
  await profile.teardown();
}
```

### `ga-install-isolated.ts`

```ts
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// The harness is selected by the repository passed through the invocation cwd.
const repo = process.cwd();
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create("one-child");
try {
  const env: Record<string, string> = {};
  for (const key of ["PATH", "TERM", "LANG"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    HOME: profile.home,
    TMPDIR: join(profile.root, "tmp"),
    XDG_CONFIG_HOME: join(profile.root, "config"),
    XDG_CACHE_HOME: join(profile.root, "cache"),
    XDG_DATA_HOME: join(profile.root, "data"),
    XDG_STATE_HOME: join(profile.root, "state"),
  });
  console.log(`child.environment.keys=${JSON.stringify(Object.keys(env).sort())}`);
  const child = Bun.spawn([process.execPath, join(dirname(process.argv[1]!), "ga-install-measure.ts"), repo, profile.root], {
    cwd: profile.workspace, env, stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  console.log("child.stdout:");
  console.log(stdout);
  console.log("child.stderr:");
  console.log(stderr);
  console.log(`child.exit=${exitCode}`);
  assert.equal(exitCode, 0);
} finally {
  await profile.teardown();
}
```

### `ga-install-measure.ts`

```ts
import assert from "node:assert/strict";
import { lstatSync, readdirSync, readlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// The loader is runtime-selected and must import after process-start isolation.
const [repo, root] = process.argv.slice(2);
assert.ok(repo && root);
assert.equal(process.env.HOME, join(root, "home"));
assert.equal(process.cwd(), join(root, "workspace"));
const safe = (text: string): string => text.replaceAll(root, "<tmp>").replaceAll(repo, "$PWD");
const { loadExtensions } = await import(pathToFileURL(join(repo,
  "node_modules/@oh-my-pi/pi-coding-agent/src/extensibility/extensions/loader.ts")).href);
function files(directory: string, prefix = ""): string[] {
  const result: string[] = [];
  for (const name of readdirSync(join(directory, prefix)).sort()) {
    const path = join(prefix, name);
    const full = join(directory, path);
    const info = lstatSync(full);
    if (info.isSymbolicLink()) result.push(`${path} -> ${safe(readlinkSync(full))}`);
    else if (info.isDirectory()) {
      result.push(`${path}/`);
      result.push(...files(directory, path));
    } else result.push(`${path} ${info.size} bytes`);
  }
  return result;
}
function fds(): string[] {
  const result: string[] = [];
  for (const fd of readdirSync("/proc/self/fd").sort((a, b) => Number(a) - Number(b))) {
    try {
      result.push(`${fd} -> ${safe(readlinkSync(`/proc/self/fd/${fd}`))}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return result;
}
const beforeFiles = files(root);
const beforeFds = fds();
const originalTimeout = globalThis.setTimeout;
const originalInterval = globalThis.setInterval;
const originalServe = Bun.serve;
let timeoutCalls = 0;
let intervalCalls = 0;
let serveCalls = 0;
globalThis.setTimeout = ((...args: Parameters<typeof setTimeout>) => {
  timeoutCalls++;
  return originalTimeout(...args);
}) as typeof setTimeout;
globalThis.setInterval = ((...args: Parameters<typeof setInterval>) => {
  intervalCalls++;
  return originalInterval(...args);
}) as typeof setInterval;
Bun.serve = ((...args: Parameters<typeof Bun.serve>) => {
  serveCalls++;
  return originalServe(...args);
}) as typeof Bun.serve;
let loaded;
try {
  loaded = await loadExtensions([join(repo, "omp-orca-observer/index.ts")], process.cwd());
} finally {
  globalThis.setTimeout = originalTimeout;
  globalThis.setInterval = originalInterval;
  Bun.serve = originalServe;
}
const afterFds = fds();
const afterFiles = files(root);
const addedFds = afterFds.filter(fd => !beforeFds.includes(fd));
const removedFds = beforeFds.filter(fd => !afterFds.includes(fd));
const addedFiles = afterFiles.filter(file => !beforeFiles.includes(file));
const removedFiles = beforeFiles.filter(file => !afterFiles.includes(file));
console.log("command=loadExtensions([\"$PWD/omp-orca-observer/index.ts\"], \"<tmp>/workspace\")");
console.log(`loadExtensions.errors=${safe(JSON.stringify(loaded.errors))}`);
console.log(`loadExtensions.extensions=${loaded.extensions.length}`);
console.log(`timerCalls=${JSON.stringify({ setTimeout: timeoutCalls, setInterval: intervalCalls })}`);
console.log(`Bun.serveCalls=${serveCalls}`);
for (const [label, values] of [["fds.before", beforeFds], ["fds.after", afterFds],
["files.before", beforeFiles], ["files.after", afterFiles], ["fds.added", addedFds],
["fds.removed", removedFds], ["files.added", addedFiles], ["files.removed", removedFiles]] as const) {
  console.log(`${label}:`);
  console.log(values.join("\n"));
}
const cachePattern = /^<tmp>\/.*\/cache\/legacy-pi-extension-cache\.db(?:-wal|-shm)?$/;
const cachePaths = addedFds.map(fd => fd.slice(fd.indexOf(" -> ") + 4));
assert.ok(cachePaths.every(path => cachePattern.test(path)));
const allowedFiles = new Set<string>();
for (const path of cachePaths) {
  const file = path.slice("<tmp>/".length);
  allowedFiles.add(file);
  let parent = dirname(file);
  while (parent !== ".") {
    allowedFiles.add(`${parent}/`);
    parent = dirname(parent);
  }
}
assert.deepEqual(loaded.errors, []);
assert.equal(loaded.extensions.length, 1);
assert.equal(timeoutCalls, 0);
assert.equal(intervalCalls, 0);
assert.equal(serveCalls, 0);
assert.deepEqual(removedFds, []);
assert.deepEqual(removedFiles, []);
assert.ok(addedFiles.every(file => allowedFiles.has(file.replace(/ \d+ bytes$/, ""))));
console.log("loader-owned-cache-only=true");
console.log("install-validation=PASS");
```

### `ga-v15-isolated.ts`

```ts
import assert from "node:assert/strict";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

// The disposable harness is located in the repository selected at runtime.
const repo = process.cwd();
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create("one-child");
try {
  const env: Record<string, string> = { PATH: join(profile.root, "tmp") };
  for (const key of ["TERM", "LANG"]) {
    if (process.env[key]) env[key] = process.env[key];
  }
  Object.assign(env, {
    HOME: profile.home,
    TMPDIR: join(profile.root, "tmp"),
    XDG_CONFIG_HOME: join(profile.root, "config"),
    XDG_CACHE_HOME: join(profile.root, "cache"),
    XDG_DATA_HOME: join(profile.root, "data"),
    XDG_STATE_HOME: join(profile.root, "state"),
  });
  console.log("child.PATH=<tmp>/tmp (empty; no Orca CLI)");
  console.log(`child.environment.keys=${JSON.stringify(Object.keys(env).sort())}`);
  const child = Bun.spawn([process.execPath, join(dirname(process.argv[1]!), "ga-v15-observe.ts"), repo, profile.root], {
    cwd: profile.workspace, env, stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
  ]);
  console.log("child.stdout:");
  console.log(stdout);
  console.log("child.stderr:");
  console.log(stderr);
  console.log(`child.exit=${exitCode}`);
  assert.equal(exitCode, 0);
} finally {
  await profile.teardown();
}
```

### `ga-v15-observe.ts`

```ts
import assert from "node:assert/strict";
import childProcess from "node:child_process";
import { syncBuiltinESMExports } from "node:module";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// The repository is runtime-selected, and module loading is observed in isolation.
const [repo, root] = process.argv.slice(2);
assert.ok(repo && root);
assert.equal(process.env.PATH, join(root, "tmp"));
assert.equal(Object.keys(process.env).some(key => key.startsWith("ORCA_")), false);
const spawned: string[] = [];
const originalSpawn = Bun.spawn;
const originalSpawnSync = Bun.spawnSync;
Bun.spawn = ((...args: Parameters<typeof Bun.spawn>) => {
  spawned.push("Bun.spawn");
  return originalSpawn(...args);
}) as typeof Bun.spawn;
Bun.spawnSync = ((...args: Parameters<typeof Bun.spawnSync>) => {
  spawned.push("Bun.spawnSync");
  return originalSpawnSync(...args);
}) as typeof Bun.spawnSync;
const childFunctions = ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const;
type ChildLauncher = (...args: unknown[]) => unknown;
// Stdlib launchers have different overloads; this observer forwards arguments unchanged.
const launchers = childProcess as unknown as Record<typeof childFunctions[number], ChildLauncher>;
const originals = new Map<typeof childFunctions[number], ChildLauncher>();
for (const name of childFunctions) {
  const original = launchers[name];
  originals.set(name, original);
  launchers[name] = (...args: unknown[]) => {
    spawned.push(`node:child_process.${name}`);
    return original(...args);
  };
}
syncBuiltinESMExports();
const { reads } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/fs-probe.ts")).href);
const sdk = await import(pathToFileURL(join(repo, "node_modules/@oh-my-pi/pi-coding-agent/src/index.ts")).href);
const registry = sdk.AgentRegistry.global();
const beforeIds = registry.list().map((ref: { id: string }) => ref.id).sort();
let nativeRegistrations = 0;
const unsubscribe = registry.onChange((event: { type: string }) => {
  if (event.type === "registered") nativeRegistrations++;
});
const originalFetch = globalThis.fetch;
const requests: string[] = [];
const snapshots: Array<{ epoch: string; childId: string; status: number }> = [];
const pages: Array<{ reset: boolean; status: number; token: string; requestToken: string | null; entries: number }> = [];
globalThis.fetch = (async (...args: Parameters<typeof fetch>) => {
  const input = args[0];
  const url = new URL(input instanceof Request ? input.url : String(input));
  requests.push(`${url.protocol}//${url.hostname}${url.pathname}`);
  const response = await originalFetch(...args);
  const data: unknown = await response.clone().json();
  assert.ok(data && typeof data === "object");
  if (url.pathname === "/v1/snapshot") {
    assert.ok("epoch" in data && typeof data.epoch === "string");
    assert.ok("children" in data && Array.isArray(data.children));
    const children: unknown[] = data.children;
    const child = children[0];
    assert.ok(child && typeof child === "object" && "childId" in child && typeof child.childId === "string");
    snapshots.push({ epoch: data.epoch, childId: child.childId, status: response.status });
    console.log(`http.snapshot=${JSON.stringify(snapshots.at(-1))}`);
  } else {
    assert.ok("reset" in data && typeof data.reset === "boolean");
    assert.ok("token" in data && typeof data.token === "string");
    assert.ok("entries" in data && Array.isArray(data.entries));
    pages.push({
      reset: data.reset, status: response.status, token: data.token,
      requestToken: url.searchParams.get("token"), entries: data.entries.length
    });
    console.log(`http.page=${JSON.stringify({ status: response.status, reset: data.reset, entries: data.entries.length })}`);
  }
  return response;
}) as typeof fetch;
try {
  await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/v15.ts")).href);
  const fixtureReads = reads.filter((read: { path: string }) => read.path === join(repo, "omp-orca-observer/checks/harness/fixtures/small.jsonl"));
  console.log(`transcript.reads=${JSON.stringify(fixtureReads.map(({ offset, length }: { offset: number | null; length: number | null }) => ({ offset, length })))}`);
  assert.ok(fixtureReads.length > 0);
  assert.ok(fixtureReads.every(({ length }: { length: number | null }) => length !== null && length <= 262_144));
  console.log(`maxTranscriptReadLength=${Math.max(...fixtureReads.map((read: { length: number }) => read.length))} limit=262144`);
  assert.equal(snapshots.length, 2);
  assert.ok(snapshots.every(snapshot => snapshot.status === 200 && snapshot.childId === "synthetic-child"));
  assert.notEqual(snapshots[0]!.epoch, snapshots[1]!.epoch);
  assert.equal(pages.length, 2);
  assert.equal(pages[1]!.requestToken, pages[0]!.token);
  assert.equal(pages[1]!.reset, true);
  console.log("restart.newEpoch=true oldTokenReset=true");
  assert.ok(requests.every(url => url.startsWith("http://127.0.0.1/v1/")));
  assert.deepEqual(spawned, []);
  console.log(`subprocessCalls=${JSON.stringify(spawned)}`);
  console.log(`http.destinations=${JSON.stringify(requests)}`);
  assert.deepEqual(registry.list().map((ref: { id: string }) => ref.id).sort(), beforeIds);
  assert.equal(nativeRegistrations, 0);
  console.log(`nativeRegistrations=${nativeRegistrations}`);
  console.log("orcaCliAbsent=true orcaEnvironmentAbsent=true");
  console.log("v15.observations=PASS");
} finally {
  unsubscribe();
  globalThis.fetch = originalFetch;
  Bun.spawn = originalSpawn;
  Bun.spawnSync = originalSpawnSync;
  for (const [name, original] of originals) launchers[name] = original;
  syncBuiltinESMExports();
}
```
