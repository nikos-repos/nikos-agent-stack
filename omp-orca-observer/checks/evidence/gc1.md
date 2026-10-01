# gc1 — Orca reachability, viewer, and coexistence

## Contract, recovery, and isolation

- Binding slice: `docs/maintainers/omp-orca-bridge-slices/gc1-orca-reachability-viewer.md`, sha256 `539445cdba6db706018f34bb96d5dc647189521aa76701b050c448f3e151e065`.
- Worker: GateGc1; implement mode; exclusive repository write boundary: this evidence file. The file was absent at dispatch (`glob` reported it missing); the exact recovery baseline is absence. No production changes, commits, installs, tunnel, or real omp home/session access.
- Start: `2026-10-01T05:31:56Z`. All temporary paths below use `<tmp>`; the profile has a separate disposable root, home, XDG directories, and workspace.
- Niko-only actions use `ask_niko`, one concrete step per call. `/observer open` is never run by the worker.
- Orchestrator authority: compose `nested.json` with two additional distinct siblings in-memory, start the existing harness `startStub`, and change only disposable `models.yml` to its URL; embed the exact scenario and digest. Read-only persisted-state inspection is restricted to this gate endpoint and `#code=` under `$ORCA_USER_DATA_PATH`, with codes recorded only by an 8-hex sha256 prefix.
- v05: **deferred: scheduled by the orchestrator after the other phase-c gates**. Quitting Orca would terminate the current orchestration; no restart attempted.

## Runtime prerequisites

Exact first Orca command: `"$ORCA_CLI_COMMAND" skills get orca-cli`. The selected executable from `printenv ORCA_CLI_COMMAND` was `orca-ide`. Guide first lines:

```text
---
name: orca-cli
description: >-
  Operate Orca-managed worktrees, folder contexts, terminals, repos, automations, artifacts,
  skill sharing, worktree comments, and Orca's embedded browser through the `orca` CLI. Use
```

Browser reference loaded with `"$ORCA_CLI_COMMAND" skills get orca-cli --reference references/browser.md`.

`"$ORCA_CLI_COMMAND" status --json` (exit 0):

```json
{"ok":true,"result":{"target":{"kind":"local"},"app":{"running":true,"desktopWindowStatus":"available"},"runtime":{"state":"ready","reachable":true,"connectionState":"connected","appVersion":"1.4.217"},"graph":{"state":"ready"}}}
```

The installed omp version was recorded by the disposable profile's `run(["--version"])`: exit 0, stdout `omp/18.4.6\n`, stderr empty. Both installed versions satisfy their floors (`omp ≥ 18.3.5`, `Orca ≥ 1.4.205`). Pinned Orca CLI, shell-injection, and browser-history source excerpts were read from `local://orca-v1.4.215.md`; pinned omp v18.3.5 extension contexts/events were read from `local://omp-extensions-v18.3.5.md`. No claim of runtime behavior is based only on these sources.

## Source baseline

```text
f76ef841a29a8efe5a9c841fb0b8f33d08d317645341f680d529c7536de5245b  contract.ts
5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9  commands.ts
c23255f7b2c553ccc6ddb2aed4cee71a32af91d2d2a2c02756a015d122be0b41  transport.ts
0310aa399458debbaf9daa5878ccfa91876f0341ce10881bd770e394e12734cb  viewer/index.html
4d9b3ce0319f5b8efa8b2d3d1c3d6b07449b4c937ca35135577b16e2799d572b  checks/harness/profile.ts
c121b1871cfe9a8ea94e980feb3ded0ad68543d20d9c272d57c0b3bd26ffbc6d  checks/harness/stub-provider.ts
```

Digests above are relative to `omp-orca-observer/` and came from `sha256sum` before the run. `ncm list` on the evidence directory reported zero applicable contracts. Production source is read-only for this gate.

## Exact throwaway sources and setup run

The following sources were written only under `<tmp>`. Invocation: `bun <tmp>/gate.ts "$PWD"`; long-lived owner readiness: `GC1_READY`. Normalized accepted startup output:

```jsonl
{"event":"scenario","sha256":"d95021380f3bd7fb41d0f3ba08db3e045fbfc7e3ae289a83485baf411256eb61","siblings":3,"nested":1}
{"event":"omp-version","exitCode":0,"stdout":"omp/18.4.6\n","stderr":""}
{"event":"setup","workspace":"<profile>/workspace","launcher":"<tmp>/launch.sh","root":"<profile>"}
```

`gate.ts`, sha256 `bc97564855c3fd5aeaec7866ce85db1cd5f6ff8dc53a024d9b446c981fbe6bf6`:

```ts
import { createHash } from "node:crypto";
import { chmod, readFile, rm, writeFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { stripVTControlCharacters } from "node:util";

const repository = resolve(process.argv[2]);
const outer = dirname(fileURLToPath(import.meta.url));
// The disposable script receives the repository root at runtime, so its module URLs are runtime-selected.
const { create } = await import(pathToFileURL(join(repository, "omp-orca-observer/checks/harness/profile.ts")).href);
const { startStub } = await import(pathToFileURL(join(repository, "omp-orca-observer/checks/harness/stub-provider.ts")).href);
const profile = await create("nested", { orcaTerminal: true });
const scenario = JSON.parse(await readFile(join(repository, "omp-orca-observer/checks/harness/scenarios/nested.json"), "utf8"));
scenario.name = "gc1-three-siblings-nested";
for (const name of ["sibling-a", "sibling-b"]) {
  scenario.turns.main[0].calls[0].args.tasks.push({ name, agent: "blocking", task: `HARNESS_AGENT=child/${name} finish.`, solutionSpace: "Reply briefly." });
  scenario.turns[`child/${name}`] = [{ text: `${name} distinct transcript`, calls: [{ tool: "yield", args: { type: "result" } }] }];
}
const scenarioBytes = JSON.stringify(scenario, null, 2) + "\n";
await writeFile(join(outer, "scenario.json"), scenarioBytes);
const stub = await startStub({ scenario, capture: join(outer, "scenario-captures.jsonl") });
const config = join(profile.home, ".omp/profiles/nested/agent");
const models = await readFile(join(config, "models.yml"), "utf8");
await writeFile(join(config, "models.yml"), models.replace(profile.stubUrl, stub.url));
await writeFile(join(outer, "profile.json"), JSON.stringify({ name: "nested", root: profile.root, home: profile.home, workspace: profile.workspace }, null, 2) + "\n");
await writeFile(join(outer, "launch.sh"), '#!/bin/sh\nexec python3 "$(dirname "$0")/driver.py" "$@"\n');
await chmod(join(outer, "launch.sh"), 0o700);
await writeFile(join(outer, "orca-low"), '#!/bin/sh\nprintf \'%s\\n\' \'{"ok":true,"result":{"runtime":{"appVersion":"1.4.204"}}}\'\n');
await chmod(join(outer, "orca-low"), 0o700);
const say = (value: unknown) => console.log(JSON.stringify(value).replaceAll(profile.root, "<profile>").replaceAll(outer, "<tmp>").replaceAll(repository, "$PWD"));
say({ event: "scenario", sha256: createHash("sha256").update(scenarioBytes).digest("hex"), siblings: 3, nested: 1 });
say({ event: "omp-version", ...await profile.run(["--version"]) });
say({ event: "setup", workspace: profile.workspace, launcher: join(outer, "launch.sh"), root: profile.root });
console.log("GC1_READY");
let tornDown = false;
async function teardown() {
  if (tornDown) return;
  tornDown = true;
  try {
    const pid = Number(await readFile(join(outer, "omp.pid"), "utf8"));
    process.kill(pid, "SIGCONT");
    process.kill(pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ESRCH" && (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await stub.stop();
  await profile.teardown();
  for (const name of ["launch.sh", "driver.py", "orca-low", "profile.json", "scenario.json", "omp.pid", "gate.ts"]) {
    await rm(join(outer, name), { force: true });
  }
  say({ event: "teardown", profileRemoved: !(await Bun.file(join(config, "models.yml")).exists()), wrappersRemoved: true });
}
const lines = createInterface({ input: process.stdin, crlfDelay: Infinity });
try {
  for await (const line of lines) {
    const [action, ...args] = line.trim().split(/\s+/);
    if (action === "state") {
      for (const label of ["normal", "low"]) {
        const path = join(outer, `${label}-launch.json`);
        if (await Bun.file(path).exists()) say({ event: "launch", label, ...JSON.parse(await readFile(path, "utf8")) });
        const log = Bun.file(join(outer, `${label}-tui.raw`));
        if (await log.exists()) {
          const raw = await log.text();
          const text = stripVTControlCharacters(raw).replaceAll("\r", "\n");
          await writeFile(join(outer, `${label}-tui.txt`), text);
          say({
            event: "tui", label, rawSha256: createHash("sha256").update(new Uint8Array(await log.arrayBuffer())).digest("hex"), bytes: log.size,
            notifications: text.split("\n").map(line => line.trim()).filter(line => /http:\/\/127\.0\.0\.1:|observer |below 1\.4\.205|root complete|sibling-[ab] distinct|parent complete|leaf complete|Error|error|grants:|endpoint:|inventory:|epoch:/.test(line))
          });
        }
      }
      if (await Bun.file(join(outer, "scenario-captures.jsonl")).exists()) {
        const captures = (await readFile(join(outer, "scenario-captures.jsonl"), "utf8")).trim().split("\n").map(line => JSON.parse(line));
        say({ event: "stub-captures", captures });
      }
    } else if (action === "signal") {
      const pid = Number(await readFile(join(outer, "omp.pid"), "utf8"));
      const signal = args[0];
      if (!["SIGSTOP", "SIGCONT", "SIGTERM"].includes(signal)) throw new Error("Unsupported gate signal");
      process.kill(pid, signal as NodeJS.Signals);
      say({ event: "signal", pid, signal, at: new Date().toISOString() });
    } else if (action === "spent") {
      const url = new URL(args[0]);
      const code = new URLSearchParams(url.hash.slice(1)).get("code");
      if (!code) throw new Error("No recorded bootstrap code");
      const route = new URL("/v1/session", url.origin);
      const response = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code }) });
      say({ event: "spent", url: `${url.origin}/#code=<code sha256:${createHash("sha256").update(code).digest("hex").slice(0, 8)}>`, status: response.status, body: await response.text() });
    } else if (action === "stop") {
      break;
    } else {
      say({ event: "unknown-action", action });
    }
  }
} finally {
  lines.close();
  await teardown();
}
```

`driver.py`, sha256 `4747a3b28412a875aa2d9f61ac289a3ac0ccecc0ae73ee013c57ec86390da959`:

```python
import fcntl
import json
import os
import pathlib
import pty
import select
import signal
import struct
import sys
import termios
import tty

outer = pathlib.Path(__file__).parent
state = json.loads((outer / "profile.json").read_text())
env = {key: value for key, value in os.environ.items()
       if key in ("PATH", "TERM", "LANG", "WSLENV") or key.startswith("ORCA_")}
root = pathlib.Path(state["root"])
env.update(HOME=state["home"], TMPDIR=str(root / "tmp"),
           XDG_CONFIG_HOME=str(root / "config"), XDG_CACHE_HOME=str(root / "cache"),
           XDG_DATA_HOME=str(root / "data"), XDG_STATE_HOME=str(root / "state"))
label = "low" if "--low" in sys.argv else "normal"
if label == "low":
    env["ORCA_CLI_COMMAND"] = str(outer / "orca-low")
log = open(outer / (label + "-tui.raw"), "ab", buffering=0)
pid, master = pty.fork()
if pid == 0:
    os.chdir(state["workspace"])
    fcntl.ioctl(0, termios.TIOCSWINSZ, struct.pack("HHHH", 60, 420, 0, 0))
    os.execvpe("omp", ["omp", "--profile", state["name"]], env)
(outer / "omp.pid").write_text(str(pid))
(outer / (label + "-launch.json")).write_text(json.dumps({
    "pid": pid, "argv": ["omp", "--profile", state["name"]],
    "cwd": state["workspace"], "environmentKeys": sorted(env),
    "statusExtensionVariablePresent": bool(env.get("ORCA_OMP_STATUS_EXTENSION")),
    "terminal": {"rows": 60, "columns": 420}
}, indent=2) + "\n")
previous = termios.tcgetattr(0) if os.isatty(0) else None
try:
    if previous is not None:
        tty.setraw(0)
    while True:
        readable, _, _ = select.select([0, master], [], [])
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            log.write(data)
            os.write(1, data)
        if 0 in readable:
            data = os.read(0, 65536)
            if not data:
                os.kill(pid, signal.SIGTERM)
                break
            os.write(master, data)
finally:
    if previous is not None:
        termios.tcsetattr(0, termios.TCSADRAIN, previous)
    log.close()
    os.close(master)
    _, status = os.waitpid(pid, 0)
    (outer / (label + "-exit.json")).write_text(json.dumps({"status": status}) + "\n")
```

`launch.sh`, sha256 `ac5eb2231ecea8e64154bd22422ccfa0364348f380cc2933ce5a9abd74cee09c`:

```sh
#!/bin/sh
exec python3 "$(dirname "$0")/driver.py" "$@"
```

`orca-low`, sha256 `7e43ea17493e180d6b66dee21c9bc15cc16cd95a22aabff044f4b9b8bdbf6a97`:

```sh
#!/bin/sh
printf '%s\n' '{"ok":true,"result":{"runtime":{"appVersion":"1.4.204"}}}'
```

`scenario.json`, sha256 `d95021380f3bd7fb41d0f3ba08db3e045fbfc7e3ae289a83485baf411256eb61`:

```json
{
  "name": "gc1-three-siblings-nested",
  "setup": [
    "create('nested')",
    "run HARNESS_AGENT=main and await both nested children"
  ],
  "settings": {
    "async": {
      "enabled": false
    },
    "task": {
      "maxRecursionDepth": 3
    }
  },
  "agents": [
    "blocking: spawns '*' permits nested task children"
  ],
  "expected": [
    "parent task child has root as parent",
    "grandchild task child has parent child id as parent and the same root session"
  ],
  "turns": {
    "main": [
      {
        "calls": [
          {
            "tool": "task",
            "args": {
              "context": "Nested parent",
              "tasks": [
                {
                  "name": "nested-parent",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/parent spawn the leaf.",
                  "solutionSpace": "Return a nested child result."
                },
                {
                  "name": "sibling-a",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/sibling-a finish.",
                  "solutionSpace": "Reply briefly."
                },
                {
                  "name": "sibling-b",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/sibling-b finish.",
                  "solutionSpace": "Reply briefly."
                }
              ]
            }
          }
        ]
      },
      {
        "text": "root complete"
      }
    ],
    "child/parent": [
      {
        "calls": [
          {
            "tool": "task",
            "args": {
              "context": "Nested leaf",
              "tasks": [
                {
                  "name": "nested-leaf",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/parent/leaf finish.",
                  "solutionSpace": "Reply briefly."
                }
              ]
            }
          }
        ]
      },
      {
        "text": "parent complete",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ],
    "child/parent/leaf": [
      {
        "text": "leaf complete",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ],
    "child/sibling-a": [
      {
        "text": "sibling-a distinct transcript",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ],
    "child/sibling-b": [
      {
        "text": "sibling-b distinct transcript",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ]
  }
}
```

## Manual registration prerequisite

Two `ask_niko` calls requested the same concrete repository-registration command, normalized here as:

```sh
"$ORCA_CLI_COMMAND" repo add --path <profile>/workspace --json
```

Niko first replied “you have my permission to execute this operation on your own”, then “i created the gates and i am overriding the gates to give you permission to execute the command. my instructions supersede the gate”. No command was executed on the strength of permission alone; the worker requested a bounded contract extension from the orchestrator.

## continuation (2026-10-01)

### Recovery, source state, and repo-add deviation

- Worker: ContinueGc1, implement mode, evidence-only continuation; exclusive repository write boundary remains `omp-orca-observer/checks/evidence/gc1.md`. Earlier results are retained verbatim.
- Binding slice sha256 for this continuation: `fa1bf1d18e66659cef565f81fac2e6aed0a4a9edf89901097e7d99355f24361d`; its newest resolved notes authorize reuse, phase-batched Niko steps, and teardown.
- Exact before-image copied to `<tmp>/gc1-before.md` before editing; `sha256sum` returned `878248aef8eedf09e20efbec9f08fbc24da88f93041c71c19c8c316ebfe63167` for both the evidence baseline and copy. `ncm list` returned `0 contracts apply to 1 paths`.
- Reused the running `gc1-profile-owner` (ready), disposable profile/workspace, composed-scenario stub, launcher, and driver. The exact script/scenario hashes still match the setup section. No new profile was created.
- Repo-add deviation: the previous worker executed the authorized `"$ORCA_CLI_COMMAND" repo add --path <profile>/workspace --json`. **Its output was never captured before that run's cap; it is unavailable and is not reconstructed here.** Registered repo id: `ef02f9b1-47e5-4d1e-9ba3-6c4814d29961`.
- Orchestrator-supplied confirmation (2026-10-01), not re-executed by this worker: `"$ORCA_CLI_COMMAND" repo list --json`, filtered to the registered id and normalized by the orchestrator:

```json
{"ok": true, "matched": [{"id": "ef02f9b1-47e5-4d1e-9ba3-6c4814d29961", "path": "\\\\wsl.localhost\\Ubuntu\\tmp\\<profile-root>\\workspace", "displayName": "workspace", "kind": "git"}]}
```

Current read-only production source digests (`sha256sum`, paths relative to `omp-orca-observer/`):

```text
f76ef841a29a8efe5a9c841fb0b8f33d08d317645341f680d529c7536de5245b  contract.ts
5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9  commands.ts
6894e7c73881939cfb93441e5b6d6facb0ef02f68015324d42f6ec7765a6fe20  transport.ts
0310aa399458debbaf9daa5878ccfa91876f0341ce10881bd770e394e12734cb  viewer/index.html
```

First Orca command in this continuation: `"$ORCA_CLI_COMMAND" skills get orca-cli`; first lines:

```text
---
name: orca-cli
description: >-
  Operate Orca-managed worktrees, folder contexts, terminals, repos, automations, artifacts,
  skill sharing, worktree comments, and Orca's embedded browser through the `orca` CLI. Use
```

The browser reference was loaded using `skills get orca-cli --reference references/browser.md`. `status --json` returned exit 0, `ok: true`, `desktopWindowStatus: "available"`, `runtime.state: "ready"`, `reachable: true`, `connectionState: "connected"`, `appVersion: "1.4.217"`. The installed omp version remains the owner's recorded `omp/18.4.6`.

### v06 — baseline before Niko opens the viewer

Command: `"$ORCA_CLI_COMMAND" tab list --worktree current --json`, cwd `<profile>/workspace`; exit 0:

```json
{"ok":true,"result":{"tabs":[]}}
```

No existing browser URL was present in this session worktree. `/observer open` will be typed only by Niko.

## halted (2026-10-01, orchestrator)

The continuation-2 worker hit the 60-minute cap waiting on a relayed `ask_niko`. Niko then launched the staged session directly (`/tmp/omp-orca-gc1-PSFqtr/launch.sh` in an orca terminal in repo `ef02f9b1-…`) and typed the scenario prompt. The session ran on a **live model**, not the stub: the disposable profile's `config.yml` had been rewritten by omp's first-run setup (`setupVersion: 2`, `modelRoles.default: openai-codex/gpt-6.1-sol`) and its `agent.db` held one `openai-codex` credential. The launcher had forwarded all `ORCA_*` variables, including `ORCA_OMP_SOURCE_AGENT_DIR` and `ORCA_OMP_FRESH_CONFIG`. The live model ran `read .`, `printenv` (its output included `ORCA_AGENT_HOOK_TOKEN`), `read ..` and a glob of the disposable home. The stub received only two `/v1/models` reads and one `aux` request. The orchestrator killed the session, the owner process and the stub, and deleted the profile root and the staging directory.

No v06, v04, v12 or v05 (orca restart) criterion was observed. Gate isolation was breached, so nothing from this session is evidence.

## final matrix (2026-10-01)

| criterion | result |
|---|---|
| v06 reachability | NOT RUN (halted: isolation breach) |
| v04 viewer in orca | NOT RUN (halted: isolation breach) |
| v12 orca coexistence | NOT RUN (halted: isolation breach) |
| v05 orca restart | NOT RUN |

## unverified

- every gc1 criterion.

## correction (2026-10-01, orchestrator)

**correction (2026-10-01): the incident cause above is not supported.** neither omp 18.3.5 (`node_modules/@oh-my-pi/`) nor the installed 18.4.6 (`$HOME/node_modules/@oh-my-pi/pi-coding-agent`) references `ORCA_OMP_SOURCE_AGENT_DIR` or `ORCA_OMP_FRESH_CONFIG`; the pinned orca wrapper uses only `ORCA_OMP_STATUS_EXTENSION`. most likely cause: the harness profile is not marked setup-complete, so an interactive tui shows omp's first-run setup; completing it (between 08:26 and 08:30) wrote `setupVersion: 2`, a real `openai-codex` credential and `modelRoles.default: openai-codex/gpt-6.1-sol`. gc2 and gc3 had already hit that setup screen in pty runs. the forwarded `ORCA_*` allowlist is what put `ORCA_AGENT_HOOK_TOKEN` into the env that `printenv` exposed. whether the credential came from a login is niko's to confirm.

## re-run after 06da7f2 (2026-10-01)

### Baseline and versions

This re-run supersedes the halted run's verdicts, not its historical record. Results below are the orchestrator's verified observations in `<tmp>/FACTS.md`; the evidence worker did not rerun the gate or its tests. `<tmp>` denotes the staging directory; `<profile>` denotes the disposable harness root; `$PWD` denotes the repository.

- Baseline HEAD: `578d199` (`06da7f2` plus two approved questionnaire commits outside the observer). Before the run, the orchestrator recorded exit 0 for `bun run typecheck`, all ten `checks/*.check.ts`, and `timeout 300 bun checks/harness.check.ts`.
- Installed omp: `profile.run(["--version"])` returned `omp/18.4.6`; sessions B, C, L and v12 used `18.4.9` after Niko updated omp during A. Orca `appVersion` remained `1.4.217`; both satisfy the floors.
- Orchestration ran in plain WSL, outside Orca, with `ORCA_CLI_COMMAND` unset, selecting `orca-ide`. Order deviation: minimal-env `orca-ide status --json` (exit 0, `appVersion: 1.4.217`) preceded `orca-ide skills get orca-cli` (exit 0; first lines `---`, `name: orca-cli`, `description: >-`). The browser reference was loaded with `orca-ide skills get orca-cli --reference references/browser.md` (exit 0).
- Production digests recorded in FACTS (prefix/suffix only, not reconstructed): `contract.ts f76ef841…5245b`; `commands.ts 5791cad2…8abe9`; `transport.ts 6894e7c7…a6fe20`; `auth.ts fa9e97e6…7c8008`; `viewer/index.html 0310aa39…2734cb`; `checks/harness/profile.ts 07889b23…89ec5`; `checks/harness/stub-provider.ts c121b187…bc6d`; `scenarios/nested.json 346983f3…0827` (relative to `omp-orca-observer/`).

### Isolation

- Fresh `create("nested", { orcaTerminal: true })`; disposable HOME/TMPDIR/XDG and workspace. Owner command (run with cwd `<tmp>`): `env -i PATH="$PATH" TERM="$TERM" LANG="$LANG" HOME=<tmp>/owner-home bun <tmp>/gate.ts "$PWD"` (no `ORCA_*`). Startup reported scenario digest `d95021380f3bd7fb41d0f3ba08db3e045fbfc7e3ae289a83485baf411256eb61`, three siblings plus one nested child, `omp/18.4.6`, setup, then `GC1_READY`.
- `curl -fsS --unix-socket <tmp>/owner.sock http://owner/assert` checked `assertStubOnly()` immediately before prompts/launches (17+ logged checks): `ok: true`, `setupVersion: 2`, all modelRoles `stub/*`. The returned `stubUrl` is stale after restubs; it is not the assertion itself.
- `/proc/<pid>/environ` names: A/B/C exactly `HOME LANG PATH TERM TMPDIR XDG_CACHE_HOME XDG_CONFIG_HOME XDG_DATA_HOME XDG_STATE_HOME`; L additionally `ORCA_CLI_COMMAND=<tmp>/orca-low`. `agent.db` auth_credentials rows stayed 0 for A/B/C/L/v12. v12 intentionally retained the managed-status hook variables and profile HOME/TMPDIR/XDG, as shown in its source and launch receipt.
- No provider request occurred before the first prompt on omp 18.4.6/18.4.9. The owner approved verifying capture just after it: A produced 12 requests, models `{scripted, aux}`, agents `{main, child/parent, child/sibling-a, child/sibling-b, child/parent/leaf}`, all 200.
- Egress residual: before prompting, A held eight TLS connections to public :443 hosts (including registry-address-range, Google and Cloudflare IPs); C held two. No credential/secret was in the process environment. Update/catalog fetching is an inference, not an identified cause; this was not network isolation proof.
- Stub turn positions are process-local. B replayed consumed A turns and received `409 Unscripted turn`. Fresh same-scenario stubs were started with `env -i PATH="$PATH" HOME=<tmp>/owner-home bun $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario <tmp>/scenario.json --capture <tmp>/captures.jsonl`; only disposable models.yml baseUrl changed (`restub.log`: stub2 19:55:08Z, stub3 20:50:47Z, stub4 21:00:03Z). Totals: 56 requests; scripted 200 ×28, aux 200 ×22, scripted 409 ×6. The six 409s include B's prompts/third main request, C's mistyped launcher prompt, and main requests at A/v12 SIGTERM, neither persisted in session jsonl ([INFERENCE] native session-end processing; the observer issues no model calls).
- Leak scans: disposable sessions had no `N-DEV`, owner-name instruction markers, `$HOME`, `RULES.md`, `ORCA_AGENT_HOOK`, `Mnemopi` or `User Instructions`; repository-name hits were only the observer customType. After v12, the hook token value occurred in zero files under `<profile>` and `<tmp>`.
- Terminal-control deviation: from L onward the owner authorized terminal operation (“you have my full permission”). The orchestrator typed `/observer grant|open|url` in L via tmux outside Orca, and in v12 via `orca-ide terminal create/send/show/list/close`, beyond the slice's original CLI allowlist. One authorized `orca-ide repo add --path <profile>/workspace --json` registered repo `09a629ff-fab2-477a-9c94-a3bcde965e04` (`repo-add.json`). No remote tunnel.

### Throwaway sources

Original-byte digests below were computed with `sha256sum`. Sources are verbatim except the explicitly authorized staging-path substitution in `v12.sh` and `orca-view.sh`; those also carry embedded-byte digests. Invocation forms inferred directly from source are marked as such rather than claimed as execution receipts.

`<tmp>/gate.ts` — sha256 of exact original bytes: `1665e01effa77b8f6feeb8c9c185c831d694a3a4c9c0f28696158218a0938003`.

Recorded owner invocation (run with cwd `<tmp>`): `env -i PATH="$PATH" TERM="$TERM" LANG="$LANG" HOME=<tmp>/owner-home bun <tmp>/gate.ts "$PWD"`.

```ts
import { createHash } from "node:crypto";
import { appendFile, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repository = resolve(process.argv[2]);
const outer = dirname(fileURLToPath(import.meta.url));
// The repository argument selects the module location at runtime, so static imports cannot resolve it.
const { create } = await import(pathToFileURL(join(repository, "omp-orca-observer/checks/harness/profile.ts")).href);
const { startStub } = await import(pathToFileURL(join(repository, "omp-orca-observer/checks/harness/stub-provider.ts")).href);
const profile = await create("nested", { orcaTerminal: true });

const scenario = JSON.parse(await readFile(join(repository, "omp-orca-observer/checks/harness/scenarios/nested.json"), "utf8"));
scenario.name = "gc1-three-siblings-nested";
for (const name of ["sibling-a", "sibling-b"]) {
  scenario.turns.main[0].calls[0].args.tasks.push({ name, agent: "blocking", task: `HARNESS_AGENT=child/${name} finish.`, solutionSpace: "Reply briefly." });
  scenario.turns[`child/${name}`] = [{ text: `${name} distinct transcript`, calls: [{ tool: "yield", args: { type: "result" } }] }];
}
const scenarioBytes = JSON.stringify(scenario, null, 2) + "\n";
await writeFile(join(outer, "scenario.json"), scenarioBytes);
const captures = join(outer, "captures.jsonl");
const stub = await startStub({ scenario, capture: captures });
const config = join(profile.home, ".omp", "profiles", "nested", "agent");
const modelsPath = join(config, "models.yml");
const models = await readFile(modelsPath, "utf8");
if (models.split(profile.stubUrl).length !== 2) throw new Error("Expected exactly one original stub URL in models.yml");
await writeFile(modelsPath, models.replace(profile.stubUrl, stub.url));

// Mirror create() rather than inheriting the launcher terminal's environment.
const env: Record<string, string> = {};
for (const key of ["PATH", "TERM", "LANG"]) {
  const value = process.env[key];
  if (value) env[key] = value;
}
env.HOME = profile.home;
env.TMPDIR = join(profile.root, "tmp");
env.XDG_CONFIG_HOME = join(profile.root, "config");
env.XDG_CACHE_HOME = join(profile.root, "cache");
env.XDG_DATA_HOME = join(profile.root, "data");
env.XDG_STATE_HOME = join(profile.root, "state");
for (const key of ["ORCA_CLI_COMMAND", "ORCA_WSL_CLI_DIR", "WSLENV"]) {
  const value = process.env[key];
  if (value !== undefined) env[key] = value;
}
await writeFile(join(outer, "env.json"), JSON.stringify(env, null, 2) + "\n");
await writeFile(join(outer, "profile.json"), JSON.stringify({ name: "nested", root: profile.root, home: profile.home, workspace: profile.workspace }, null, 2) + "\n");

const pidPath = join(outer, "omp.pid");
const socketPath = join(outer, "owner.sock");
async function readPid(): Promise<number> {
  const pid = Number(await readFile(pidPath, "utf8"));
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("Invalid omp pid");
  return pid;
}

// HTTP teardown and owner signals share one resource-removal operation.
let teardownPromise: Promise<{ profileRemoved: boolean }> | undefined;
function teardown(): Promise<{ profileRemoved: boolean }> {
  return teardownPromise ??= (async () => {
    if (await Bun.file(pidPath).exists()) {
      const pid = await readPid();
      for (const signal of ["SIGCONT", "SIGTERM"] as const) {
        try {
          process.kill(pid, signal);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ESRCH") throw error;
        }
      }
    }
    await stub.stop();
    await profile.teardown();
    return { profileRemoved: !(await Bun.file(modelsPath).exists()) };
  })();
}

let exitScheduled = false;
function exitAfterResponse(): void {
  if (exitScheduled) return;
  exitScheduled = true;
  setTimeout(async () => {
    await server.stop(true);
    await rm(socketPath, { force: true });
    process.exit(0);
  }, 100);
}

const server = Bun.serve({
  unix: socketPath,
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    try {
      if (request.method === "GET" && url.pathname === "/assert") {
        let result: Record<string, unknown>;
        let status = 200;
        try {
          await profile.assertStubOnly();
          const settings = Bun.YAML.parse(await readFile(join(config, "config.yml"), "utf8")) as {
            setupVersion?: number;
            modelRoles?: Record<string, unknown>;
          };
          result = { ok: true, setupVersion: settings.setupVersion, modelRoles: settings.modelRoles, stubUrl: stub.url };
        } catch (error) {
          status = 500;
          result = { ok: false, error: error instanceof Error ? error.message : String(error) };
        }
        await appendFile(join(outer, "assert.log"), JSON.stringify({ at: new Date().toISOString(), ...result }) + "\n");
        return Response.json(result, { status });
      }
      if (request.method === "GET" && url.pathname === "/captures") {
        let text = "";
        try {
          text = await readFile(captures, "utf8");
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        const rows = text.split("\n").filter(line => line.trim()).map(line => JSON.parse(line) as {
          model: string | null; agent: string | null; path: string; status: number;
        });
        return Response.json({
          count: rows.length,
          models: [...new Set(rows.map(row => row.model).filter(model => model !== null))],
          agents: [...new Set(rows.map(row => row.agent).filter(agent => agent !== null))],
          paths: [...new Set(rows.map(row => row.path))],
          statuses: [...new Set(rows.map(row => row.status))],
        });
      }
      if (request.method === "POST" && url.pathname === "/signal") {
        const sig = url.searchParams.get("sig");
        if (sig !== "STOP" && sig !== "CONT") return Response.json({ error: "Only STOP or CONT is allowed" }, { status: 400 });
        const signal = sig === "STOP" ? "SIGSTOP" : "SIGCONT";
        const pid = await readPid();
        process.kill(pid, signal);
        return Response.json({ pid, signal, at: new Date().toISOString() });
      }
      if (request.method === "POST" && url.pathname === "/spent") {
        const bootstrap = new URL(await request.text());
        const code = new URLSearchParams(bootstrap.hash.slice(1)).get("code");
        if (!code) return Response.json({ error: "Bootstrap code is missing" }, { status: 400 });
        const redacted = `<code sha256:${createHash("sha256").update(code).digest("hex").slice(0, 8)}>`;
        const response = await fetch(new URL("/v1/session", bootstrap.origin), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ code }),
        });
        return Response.json({
          url: `${bootstrap.origin}/#code=${redacted}`,
          status: response.status,
          body: (await response.text()).replaceAll(code, redacted),
        });
      }
      if (request.method === "POST" && url.pathname === "/teardown") {
        const result = await teardown();
        exitAfterResponse();
        return Response.json(result);
      }
      return new Response("Not found", { status: 404 });
    } catch (error) {
      // Fetch errors can carry the submitted URL; never expose bootstrap material.
      const message = url.pathname === "/spent" ? "Spent-code probe failed" : error instanceof Error ? error.message : String(error);
      return Response.json({ ok: false, error: message }, { status: 500 });
    }
  },
});

for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.on(signal, () => {
    void teardown().then(exitAfterResponse, () => {
      console.error("Owner teardown failed");
      process.exit(1);
    });
  });
}

function printStartup(value: unknown): void {
  console.log(JSON.stringify(value).replaceAll(profile.root, "<profile>").replaceAll(outer, "<tmp>").replaceAll(repository, "$PWD"));
}
printStartup({ event: "scenario", sha256: createHash("sha256").update(scenarioBytes).digest("hex"), siblings: 3, nested: 1 });
printStartup({ event: "omp-version", ...await profile.run(["--version"]) });
printStartup({ event: "setup", workspace: profile.workspace, root: profile.root });
console.log("GC1_READY");
```

`<tmp>/launch.sh` — sha256 of exact original bytes: `dcd7bc04dbea39e7dc2fea40efe0d720af1b512f737807697ce9bd88ef28243a`.

Invocations: `<tmp>/launch.sh` (A/B/C), `<tmp>/launch.sh --low` (L).

```sh
#!/usr/bin/env bash
set -euo pipefail

dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
if [[ $# -eq 0 ]]; then
  mode=normal
elif [[ $# -eq 1 && $1 == --low ]]; then
  mode=low
else
  printf 'usage: %s [--low]\n' "$0" >&2
  exit 2
fi

if ! assertion=$(curl -fsS --unix-socket "$dir/owner.sock" http://owner/assert) || [[ "$assertion" != *'"ok":true'* ]]; then
  printf 'refusing to start: assertStubOnly failed\n%s\n' "$assertion" >&2
  exit 1
fi
printf '%s\n' "$assertion"
workspace=$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["workspace"])' "$dir/profile.json")
cd -- "$workspace"
exec script -qfe -a "$dir/$mode-tui.raw" -c "python3 '$dir/exec.py' $mode"
```

`<tmp>/exec.py` — sha256 of exact original bytes: `77042c5320107a83713e4e631272076bd2384876abce45b36b5d361ec71a5a95`.

Invocation from launch.sh: `python3 <tmp>/exec.py normal` or `python3 <tmp>/exec.py low`, under `script -qfe -a <tmp>/<mode>-tui.raw`.

```python
#!/usr/bin/env python3
import json
import os
from pathlib import Path
import sys


directory = Path(__file__).resolve().parent
if len(sys.argv) != 2 or sys.argv[1] not in {"normal", "low"}:
    print("usage: exec.py normal|low", file=sys.stderr)
    sys.exit(2)
mode = sys.argv[1]
with (directory / "env.json").open(encoding="utf-8") as file:
    env = json.load(file)
with (directory / "profile.json").open(encoding="utf-8") as file:
    profile = json.load(file)
low = mode == "low"
if low:
    env["ORCA_CLI_COMMAND"] = str(directory / "orca-low")
if Path.cwd().resolve() != Path(profile["workspace"]).resolve():
    print("refusing to start: cwd is not the harness workspace", file=sys.stderr)
    sys.exit(1)

pid = os.getpid()
argv = ["omp", "--profile", "nested"]
launch = {"pid": pid, "argv": argv, "cwd": os.getcwd(), "envKeys": sorted(env), "low": low}
(directory / f"{mode}-launch.json").write_text(json.dumps(launch, indent=2) + "\n", encoding="utf-8")
(directory / "omp.pid").write_text(str(pid), encoding="utf-8")
os.execvpe("omp", argv, env)
```

`<tmp>/orca-low` — sha256 of exact original bytes: `d7b3b42ca7ae4f31da276fa64c9895bb143da41f07b0c150c20f579bac667b8a`.

Invocation: `<tmp>/orca-low status --json` through L's `ORCA_CLI_COMMAND`; receipt `orca-low.calls`.

```sh
#!/bin/sh
printf '%s\n' "$*" >> "$(dirname "$0")/orca-low.calls"
printf '%s\n' '{"ok":true,"result":{"runtime":{"appVersion":"1.4.204"}}}'
exit 0
```

`<tmp>/v12.sh` — sha256 of exact original bytes: `335f081358e405ee3ed5c4290ec1df067550d4e8a018a7aac5eca577d08da0c7`.

Only substitution: the staging directory path → `<tmp>`. Embedded-byte sha256: `126959a497a219342f890ae98ddef32a33f414f178f3af8a494b78aad0c929e0`.

Invocation: `source <tmp>/v12.sh` in the managed workspace terminal.

```sh
#!/usr/bin/env bash
(
  # Scratch variables must not inherit an export attribute from the caller.
  export -n g assertion workspace key exports || return 1
  g=<tmp>
  if ! declare -F omp >/dev/null || ! declare -F __orca_omp >/dev/null || [[ -z ${ORCA_OMP_STATUS_EXTENSION:-} || ! -f ${ORCA_OMP_STATUS_EXTENSION:-} ]]; then
    printf '%s\n' 'refusing to start: source this in an Orca terminal with the omp wrapper and status extension' >&2
    return 1
  fi
  if ! assertion=$(curl -fsS --unix-socket "$g/owner.sock" http://owner/assert) || [[ "$assertion" != *'"ok":true'* ]]; then
    printf 'refusing to start: assertStubOnly failed\n%s\n' "$assertion" >&2
    return 1
  fi
  printf '%s\n' "$assertion"
  if ! declare -f omp __orca_omp __orca_omp_invoke __orca_omp_should_skip_extension __orca_omp_cwd_is_usable > "$g/v12-wrapper.sh"; then
    printf '%s\n' 'refusing to start: wrapper function capture failed' >&2
    return 1
  fi
  workspace=$(python3 -c 'import json, sys; print(json.load(open(sys.argv[1], encoding="utf-8"))["workspace"])' "$g/profile.json") || return 1
  cd -- "$workspace" || return 1

  for key in $(compgen -e); do
    case "$key" in
      PATH|TERM|LANG|ORCA_CLI_COMMAND|ORCA_WSL_CLI_DIR|WSLENV|ORCA_OMP_STATUS_EXTENSION|ORCA_AGENT_HOOK_PORT|ORCA_AGENT_HOOK_TOKEN|ORCA_AGENT_HOOK_ENDPOINT|ORCA_AGENT_HOOK_ENV|ORCA_AGENT_HOOK_VERSION|ORCA_AGENT_LAUNCH_TOKEN|ORCA_PANE_KEY|ORCA_TAB_ID|ORCA_WORKTREE_ID|WSL_DISTRO_NAME) ;;
      *)
        if ! unset "$key"; then
          printf 'refusing to start: cannot unset exported variable %s\n' "$key" >&2
          return 1
        fi
        ;;
    esac
  done
  exports=$(python3 -c 'import json, shlex, sys; env = json.load(open(sys.argv[1], encoding="utf-8")); keys = ["HOME", "TMPDIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME", "XDG_DATA_HOME", "XDG_STATE_HOME"]; print("\n".join("export " + key + "=" + shlex.quote(env[key]) for key in keys))' "$g/env.json") || return 1
  eval "$exports" || return 1
  if ! compgen -e | python3 -c 'import json, os, sys; names = sorted(sys.stdin.read().splitlines()); output = {"envKeys": names, "cwd": os.getcwd()}; file = open(sys.argv[1], "w", encoding="utf-8"); json.dump(output, file, indent=2); file.write("\n"); file.close()' "$g/v12-launch.json"; then
    printf '%s\n' 'refusing to start: launch metadata write failed' >&2
    return 1
  fi
  script -qfe -a "$g/v12-tui.raw" -c "bash --noprofile --norc -c '. \"$g/v12-wrapper.sh\"; omp --profile nested'"
)
```

`<tmp>/v12-wrapper.sh` — sha256 of raw and embedded bytes: `e48020a203d26fde763d4eae3109b4d8716849aab16e2216665623b7d6399be7` (no path normalization required).

Invocation from `v12.sh`: `script -qfe -a <tmp>/v12-tui.raw -c "bash --noprofile --norc -c '. \"<tmp>/v12-wrapper.sh\"; omp --profile nested'"`.

```sh
omp () 
{ 
    __orca_omp "$@"
}
__orca_omp () 
{ 
    local __orca_use_extension=1;
    __orca_omp_should_skip_extension "${1:-}" && __orca_use_extension=0;
    if ! __orca_omp_cwd_is_usable; then
        local __orca_logical_cwd="${PWD:-${ORCA_WORKTREE_PATH:-${ORCA_ROOT_PATH:-}}}";
        ( if [[ -z "$__orca_logical_cwd" ]]; then
            printf 'Orca: OMP cannot start because no terminal working directory is available. Open a new terminal in an existing directory.\n' 1>&2;
            return 1;
        fi;
        if ! builtin cd -P -- "$__orca_logical_cwd" 2> /dev/null; then
            printf 'Orca: OMP cannot access the terminal working directory "%s". Open a new terminal in an existing directory.\n' "$__orca_logical_cwd" 1>&2;
            return 1;
        fi;
        __orca_omp_invoke "$__orca_use_extension" "$@" );
    else
        __orca_omp_invoke "$__orca_use_extension" "$@";
    fi
}
__orca_omp_invoke () 
{ 
    local __orca_use_extension="$1";
    shift;
    if [[ $__orca_use_extension -eq 1 && -n "${ORCA_OMP_STATUS_EXTENSION:-}" && -f "${ORCA_OMP_STATUS_EXTENSION}" ]]; then
        if [[ "${1:-}" == "launch" ]]; then
            shift;
            command omp launch --extension "${ORCA_OMP_STATUS_EXTENSION}" "$@";
        else
            command omp --extension "${ORCA_OMP_STATUS_EXTENSION}" "$@";
        fi;
    else
        command omp "$@";
    fi
}
__orca_omp_should_skip_extension () 
{ 
    case "${1:-}" in 
        'help' | '--help' | '-h' | '--version' | '-v')
            return 0
        ;;
        '__complete' | 'acp' | 'agents' | 'auth-broker' | 'auth-gateway' | 'bench' | 'commit' | 'completions' | 'config' | 'dry-balance' | 'gallery' | 'grep' | 'grievances' | 'install' | 'join' | 'models' | 'plugin' | 'read' | 'say' | 'search' | 'setup' | 'shell' | 'ssh' | 'stats' | 'tiny-models' | 'token' | 'ttsr' | 'update' | 'usage' | 'worktree' | 'q' | 'wt')
            return 0
        ;;
    esac;
    return 1
}
__orca_omp_cwd_is_usable () 
{ 
    local __orca_physical_cwd;
    [[ -x . ]] || return 1;
    if [[ -n "${PWD:-}" && -d "${PWD:-}" ]]; then
        [[ "${PWD}" -ef . ]];
    else
        __orca_physical_cwd="$(builtin pwd -P 2> /dev/null)" || return 1;
        [[ -d "$__orca_physical_cwd" && "$__orca_physical_cwd" -ef . ]];
    fi
}
```

`<tmp>/watch-codes.py` — sha256 of exact original bytes: `3b3b727df2d26bc9e563a6473e9018fd3188e8f4da99736867d1b98db0b15222`.

Invocation: `python3 <tmp>/watch-codes.py normal-tui.raw`. Its stdout was not retained; the accepted output is the `control.jsonl` rows already embedded in the receipts archive.

```python
#!/usr/bin/env python3
"""Throwaway gc1 control: post each code printed by `/observer url` twice to the observer via the owner socket."""
import hashlib, json, re, socket, sys, time
from pathlib import Path

d = Path(__file__).resolve().parent
log = d / sys.argv[1]
ansi = re.compile(r'\x1b\[[0-9;?<>=]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(\x07|\x1b\\)|\x1b[@-_]')
url_re = re.compile(r'http://127\.0\.0\.1:\d+/#code=[A-Za-z0-9_\-]{43}(?![A-Za-z0-9_\-])')
seen = set(url_re.findall(ansi.sub('', log.read_bytes().decode('utf-8', 'replace'))))

def spent(url):
    s = socket.socket(socket.AF_UNIX); s.connect(str(d / 'owner.sock'))
    body = url.encode()
    s.sendall(b'POST /spent HTTP/1.1\r\nHost: owner\r\nContent-Length: %d\r\nConnection: close\r\n\r\n' % len(body) + body)
    raw = b''
    while chunk := s.recv(65536): raw += chunk
    s.close()
    return json.loads(raw.split(b'\r\n\r\n', 1)[1])

print(json.dumps({"event": "watching", "preexisting": len(seen)}), flush=True)
while True:
    text = ansi.sub('', log.read_bytes().decode('utf-8', 'replace'))
    for match in url_re.finditer(text):
        url = match.group(0)
        if url in seen: continue
        commands = re.findall(r'/observer (grant|url|open)\b', text[:match.start()])
        if not commands or commands[-1] != 'url': continue
        seen.add(url)
        tag = hashlib.sha256(url.split('code=')[1].encode()).hexdigest()[:8]
        first, second = spent(url), spent(url)
        row = {"event": "control", "code": f"<code sha256:{tag}>", "first": first["status"], "second": second["status"], "at": time.strftime('%H:%M:%S')}
        print(json.dumps(row), flush=True)
        with open(d / 'control.jsonl', 'a') as f: f.write(json.dumps(row) + '\n')
    time.sleep(0.3)
```

`<tmp>/orca-view.sh` — sha256 of exact original bytes: `62e1921227e49c6d424b6b4a99aa33bae13744300dacbad9f460b11ef3758166`.

Only substitution: the staging directory path → `<tmp>`. Embedded-byte sha256: `81f763af347cc4a8228464d5aff96a0e7bae3a0955d17b32a06ab0d5199c9b6d`.

Invocations evidenced by matching `tabs-<label>.json` and `snap-<label>.json` receipts: `<tmp>/orca-view.sh C-open`; `<tmp>/orca-view.sh C-after-new`; `<tmp>/orca-view.sh R-open`; `<tmp>/orca-view.sh R-after-restart`; `<tmp>/orca-view.sh R-restored-42091`; `<tmp>/orca-view.sh R-fresh-open`; `<tmp>/orca-view.sh L-before`; `<tmp>/orca-view.sh R-restored`. Its stdout was not retained; per-label `tabs-<label>.json` and `snap-<label>.json` receipts are in the archive. The `shot-<label>.json`/PNG screenshot receipts were also produced but are excluded from the archive.

```sh
#!/usr/bin/env bash
# Throwaway gc1 helper: read-only orca captures with retries. usage: orca-view.sh <label>
set -uo pipefail
T=<tmp>
label=$1
cd "$(python3 -c 'import json;print(json.load(open("'$T'/profile.json"))["workspace"])')"
orca-ide tab list --worktree current --json > "$T/tabs-$label.json"
python3 -c 'import json,sys;print("tabs",[(t["index"],t["browserPageId"][:8],t["url"],t["active"]) for t in json.load(open(sys.argv[1]))["result"]["tabs"]])' "$T/tabs-$label.json"
for attempt in 1 2 3; do
  orca-ide snapshot --worktree current --json > "$T/snap-$label.json" && break
  echo "snapshot attempt $attempt failed"
done
python3 - "$T/snap-$label.json" <<'EOF'
import json, sys
d = json.load(open(sys.argv[1]))
if not d.get("ok"): print("snapshot", d.get("error")); raise SystemExit
s = d["result"]["snapshot"]
print("page", d["result"].get("browserPageId", "")[:8])
lines = [l for l in s.splitlines() if "StaticText" in l or "heading" in l]
for l in lines[:6]: print(l.strip())
k = s.find('Child transcript'); k2 = s.find('Transcript:')
print('transcript region:', s[max(k, k2):max(k, k2) + 300].replace('\n', ' | ') if max(k, k2) >= 0 else 'none')
EOF
for attempt in 1 2 3; do
  orca-ide screenshot --worktree current --json > "$T/shot-$label.json" && break
  echo "screenshot attempt $attempt failed"
done
python3 -c 'import json,base64,sys;d=json.load(open(sys.argv[1]));open(sys.argv[2],"wb").write(base64.b64decode(d["result"]["data"])) if d.get("ok") else print("screenshot",d.get("error"))' "$T/shot-$label.json" "$T/shot-$label.png"
```

`<tmp>/scenario.json` — sha256 of exact original bytes: `d95021380f3bd7fb41d0f3ba08db3e045fbfc7e3ae289a83485baf411256eb61`.

Scenario consumption: composed by gate.ts, passed to `startStub({ scenario, capture })`; reused by the recorded restub command. This is nested.json plus the two sibling task items shown in gate.ts.

```json
{
  "name": "gc1-three-siblings-nested",
  "setup": [
    "create('nested')",
    "run HARNESS_AGENT=main and await both nested children"
  ],
  "settings": {
    "async": {
      "enabled": false
    },
    "task": {
      "maxRecursionDepth": 3
    }
  },
  "agents": [
    "blocking: spawns '*' permits nested task children"
  ],
  "expected": [
    "parent task child has root as parent",
    "grandchild task child has parent child id as parent and the same root session"
  ],
  "turns": {
    "main": [
      {
        "calls": [
          {
            "tool": "task",
            "args": {
              "context": "Nested parent",
              "tasks": [
                {
                  "name": "nested-parent",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/parent spawn the leaf.",
                  "solutionSpace": "Return a nested child result."
                },
                {
                  "name": "sibling-a",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/sibling-a finish.",
                  "solutionSpace": "Reply briefly."
                },
                {
                  "name": "sibling-b",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/sibling-b finish.",
                  "solutionSpace": "Reply briefly."
                }
              ]
            }
          }
        ]
      },
      {
        "text": "root complete"
      }
    ],
    "child/parent": [
      {
        "calls": [
          {
            "tool": "task",
            "args": {
              "context": "Nested leaf",
              "tasks": [
                {
                  "name": "nested-leaf",
                  "agent": "blocking",
                  "task": "HARNESS_AGENT=child/parent/leaf finish.",
                  "solutionSpace": "Reply briefly."
                }
              ]
            }
          }
        ]
      },
      {
        "text": "parent complete",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ],
    "child/parent/leaf": [
      {
        "text": "leaf complete",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ],
    "child/sibling-a": [
      {
        "text": "sibling-a distinct transcript",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ],
    "child/sibling-b": [
      {
        "text": "sibling-b distinct transcript",
        "calls": [
          {
            "tool": "yield",
            "args": {
              "type": "result"
            }
          }
        ]
      }
    ]
  }
}
```

### receipts archive

Normalized text-only receipts; source JSON structure and snapshot text are retained. Windows/UNC profile paths and encoded profile-session filenames use `<profile>`; other paths use the prescribed placeholders. Redacted receipt values: none; no selected receipt contained a bootstrap-code or credential value.

Excluded by policy: all `*.raw` TUI logs, `shot-*.json`/PNG screenshots, `captures.jsonl`, `histcopy/`, `env.json`, and `profile.json` (raw/session/capture/state/environment material or image payloads). Other files outside the requested receipt allowlist are not archived.

| normalized file name | sha256 of normalized bytes | bytes |
|---|---|---:|
| receipts/R-status-after.txt | `27e40e8df28ec7425d28f5edd921ac76025cb11a95b72d2f0b5fd68f6f5678ba` | 257 |
| receipts/R-status-before.txt | `b4c1a20a3440c0d7896979c7b7737d050a6ae8c892bd36aec9a9a8511e43b8be` | 243 |
| receipts/assert.log | `7f71bcc81a9bda19a4c6825742ca486f4a5b094926ee0083c54b2a34c3f5af67` | 4880 |
| receipts/control.jsonl | `f30b7ba20e56c42606723530341f7ec9402169168d6969d6452ad836c7ab25e5` | 204 |
| receipts/low-launch.json | `51d20d6ea0ba95af8c8deced243f4d1bedbf776a4d69979aafac42f7dad78d3f` | 319 |
| receipts/normal-launch.json | `b0de3d87221e86fd1a6e8439ced9741446e57e8d9810d3ec3fde0bce348b75e9` | 296 |
| receipts/orca-low.calls | `ff8957c4c5c5ce5563da1229dfcf962d8d43cd08a501239ec33563bfab67797f` | 14 |
| receipts/repo-add.json | `7eedef8f9296a6073654320c7e75454657370fde3d5553711a6a0da671e0a73d` | 762 |
| receipts/restub.log | `2deaba6290f2f43ab26799179a8005ca6d29ad6fb081baa8d247263f2a77e5f1` | 338 |
| receipts/signals.jsonl | `b29e4506035907f4e589778b6cc88db28b9e0a9dd48522ba8ec0da0af75721cf` | 415 |
| receipts/snap-1.json | `a376c2e3403c4a70128ae50c538217be5346b2dc4b6ff41a06f5b0b37b01d3cd` | 12875 |
| receipts/snap-2-sibling-a.json | `82fb0d3092aaaaddbe1a1427663bcf6904c48e0fef633f3220fbdd009d905641` | 12906 |
| receipts/snap-3.json | `71f756e21f147d42560714c41b201c5cd2e1e8f48bb254e167be9d1004dbcf73` | 12906 |
| receipts/snap-4.json | `0e5dfb95b887bacd7140bb2b041de74290ef94616c71f996be8e11d5e128673e` | 231 |
| receipts/snap-5-unreachable.json | `0e5dfb95b887bacd7140bb2b041de74290ef94616c71f996be8e11d5e128673e` | 231 |
| receipts/snap-C-after-new.json | `2d7b7c0bcc10c97b11350518aca3e02e0ef2758065b612ace0d4e66c9c57ba13` | 12963 |
| receipts/snap-C-open.json | `0855e785bb87df60096fb78c5b1b7357e526ad6eb667e39485de5d639e729083` | 12875 |
| receipts/snap-C-revoked.json | `89a5176a3f2fe2d83eb64d70b6093c8863dfc3c6bbeba1d257d084b5c237159a` | 1301 |
| receipts/snap-L-before.json | `2f7d08e8616665dfab174620b27592c58d8404dee1617a3c969df30a26066dc6` | 12963 |
| receipts/snap-R-after-restart.json | `c1cfb4c86e8cbc2635f8a1e6156a286ac3f2e471131b63b5be3e1aeb32228fd7` | 313 |
| receipts/snap-R-fresh-full.json | `1d4372e0337ee124acdddece644500704550b2ee7cad7743cb0eaee3b3239e28` | 12929 |
| receipts/snap-R-fresh-open.json | `6b2709cc8ed2c0dc00a24d079413afd68e9707b07eda894b942a17bdf9d79d51` | 12929 |
| receipts/snap-R-open.json | `b2b16537e91be3484431b5924eb2e9202448b4f32bc727490781a5135410711d` | 12874 |
| receipts/snap-R-restored-42091.json | `ba2932587f68d2bf35fff344379bce9953752502fb944143fc00d37a1a7e7e1c` | 313 |
| receipts/snap-R-restored-77fb.json | `c3b4c8d443bc652972c8a0727856b4ba3a3c4ed8f9b4b5297be3f8619edf3d41` | 1307 |
| receipts/snap-R-restored.json | `6e14144845153642a11a2f895ba273965816ce6e661ef5a67244cd1f912f40b8` | 313 |
| receipts/tabs-0-baseline.json | `a4bc76fb7b7ebbf73a4219c6e5fb0ffddf622d763d053e593942fd4cea713583` | 173 |
| receipts/tabs-1-after-open.json | `1cd755e23f85a0cbf24632eb8e77c19ac6cece280ee3d1651e817ccc8e791632` | 596 |
| receipts/tabs-2-before-reopen.json | `c69e359d9a02a855b1d27dc40ee889da4fb7e9e465c795681812d31f125e83e6` | 596 |
| receipts/tabs-3-after-reopen.json | `b33c4094c32e3aa517a18cbb1accd31ea7166382d7ce474b4f51e05d98f70f2c` | 596 |
| receipts/tabs-4-before-open3.json | `4efeea4af6af410898c97cad3409e5ceb46f422589be83e341020748bc2a7dac` | 596 |
| receipts/tabs-C-after-new.json | `45e4c1f899a3b90f851678aed594bb764aff810073483dbcb3f6202ea81b67cc` | 1436 |
| receipts/tabs-C-hidden.json | `98bcb50cc33e2e96e4ebd94e384e7aa032119bd2229fe3b37f15240f1d63fa75` | 1436 |
| receipts/tabs-C-open.json | `eb254c6c325d496e802f118a89c1d2c8ad74ce06082792945bbb34b667dd009f` | 1016 |
| receipts/tabs-L-after.json | `4f5753dec24874d44985643d94d1736e51f0cd6bf0d24bf2523d4791f3f656a0` | 1436 |
| receipts/tabs-L-before.json | `4a9d5558dda81154aff2fada610fab2bb4af323f03b558f8aa4d1c14c5250dfa` | 1436 |
| receipts/tabs-R-after-restart.json | `2d9f5053503629b850da8b26ea0f2a2958aaf6db8394898a4be4cccf8ce14a4a` | 556 |
| receipts/tabs-R-fresh-open.json | `cde4ce651b74bb22196810d5682711bb14613011fc6499a3ab73c763cab03cfa` | 1568 |
| receipts/tabs-R-open.json | `ad0f5dcf0ee5f9f84b27748c6becd5aac76927399cb5da233c8afb7bf9444164` | 1856 |
| receipts/tabs-R-restored-42091.json | `85847aa1a07bedbebd7dcb7835ef3062fd9875d8718c2982ee13e8f8f06500d6` | 1148 |
| receipts/tabs-R-restored.json | `e3187f5ab3f8057cf31112cddf93e464d0a16215f4a84c4834ce04655374b9b3` | 728 |
| receipts/v06-host.txt | `ff8b691312a568c20ca9218ba1d1f2777b43a136720768c77ab9107173f895a5` | 373 |
| receipts/v12-launch.json | `cbaf97c3b23546cbeadc7ebd677deda4fe4d69188c41f9536b85497dfde060f4` | 533 |
| receipts/v12-show-0.json | `a158e637672ba231585124c04cea0e104fb8aa51e01b11c2b19926285d6f8e88` | 1266 |
| receipts/v12-show-1.json | `0a22e0e134330f1ffabdaf2c98b87102ae8a03837c5f9b49d73e9f67b963f21e` | 1281 |
| receipts/v12-terminal-create.json | `7b7bb4c4573984d51afa01343283ea29c43ea12956cf38fffa89ed924e0d49fc` | 742 |

Archive sha256 (decoded gzip bytes): `03f69822f8e5d2988bfa2e123152d676a4b81880032c00358e7b5ce440c386f6`.

Build command (cwd `<tmp>`):

```sh
tar --sort=name --mtime='@0' --owner=0 --group=0 --numeric-owner -cf - -C evidence-build receipts | gzip -n -9 | base64 -w 120
```

Exact decode/list command, with the fenced payload supplied on stdin:

```sh
base64 -d | gzip -dc | tar -tvf -
```

```base64
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
0NDQ0NDQ0NCeYP8D/AS3PQD4AgA=
```

### Results per criterion

#### v06 — reachability: PASS

Session A ran in Windows Terminal outside Orca; the owner typed `/observer grant all` then `/observer open all`. `orca-ide tab list --worktree current --json` changed from `{"tabs":[]}` to one loaded tab at `http://127.0.0.1:38055/`, title `omp task children`, `loadError: null` (`tabs-0-baseline.json`, `tabs-1-after-open.json`). `orca-ide snapshot --worktree current --json` showed inventory complete, sibling-a, sibling-b, nested-parent and nested-parent.nested-leaf, parent nested-parent, resolved model stub/scripted (`snap-1.json`). No tunnel was tested.

Host probe form: `curl -H 'Host: <host>' http://127.0.0.1:38055/`; normalized accepted output (`v06-host.txt`):

```text
GET / Host: 127.0.0.1:38055 -> 200
GET / Host: localhost:38055 -> 200
GET / Host: evil -> 421
GET / Host: evil:38055 -> 421
GET / Host: 127.0.0.1 -> 421
GET / Host: localhost -> 421
GET / Host: [::1]:38055 -> 421
GET / Host: LOCALHOST:38055 -> 421
GET /v1/snapshot no credential -> 401
GET / via localhost url -> 200
HTTP/1.1 405 Method Not Allowed
Cache-Control: no-store
```

#### v04 — viewer in Orca

- **New tab; existing URLs unchanged: PASS.** C re-tested after the owner accidentally closed A's first tab. `orca-ide tab list --worktree current --json`: before `[7e23b238 → :38055/]`; after `/observer open all`, `[7e23b238 → :38055/ (unchanged, inactive), d011cfa6 → :39517/ (active)]`; another open produced three tabs without changing earlier URLs (`tabs-4-before-open3.json`, `tabs-C-open.json`, `tabs-C-after-new.json`).
- **No composer/send/stop/revive/resume: PASS.** Snapshot roles were heading, region, list, article, DescriptionList and per-child selection buttons only (`snap-1.json`, `snap-C-open.json`).
- **Distinct sibling transcripts: PASS.** Owner-supplied narrow-pane screenshots showed sibling-a session `01a0f8c2-242b-7774-bf9d-8cf1bba17965` and sibling-b `01a0f8c2-242f-702b-b404-b29c0cebc9a1`, with different model_change/session_init ids.
- **Process end → unreachable: PASS (state transition). Timing: NOT VERIFIED — the end state was observed, not its onset; source: viewer polls every 2 s (`viewer/index.html:621`) and marks a request stale after a 10 s timeout (`viewer/index.html:354-357`).** A SIGTERM at 19:46:21Z; endpoint curl returned 000/refused; the owner confirmed `unavailable(unreachable)` in the open tab, declining a screenshot.
- **`/new` → unreachable: PASS (state transition). Timing: NOT VERIFIED — the end state was observed, not its onset; source: viewer polls every 2 s (`viewer/index.html:621`) and marks a request stale after a 10 s timeout (`viewer/index.html:354-357`).** C `/new`; curl :39517 returned 000; `orca-ide snapshot --page 83e7b7e5-f55e-4357-a0d2-4bf8af583fd4 --json` showed `unavailable(unreachable)` and “Last snapshot received 124 s ago” (`snap-C-after-new.json`).
- **`/observer revoke all` → access ended: PASS.** C's d011cfa6 tab was live beforehand (“Last snapshot received 0 s ago”, Generation 292). After revoke, `orca-ide snapshot --page d011cfa6-864c-4123-85c4-21dfb16abc5e --json` showed `unavailable(access ended)` and “No compatible snapshot received” (`snap-C-revoked.json`). A's unexplained access-ended state is not revoke evidence.
- **Hung response → stale: PASS (state transition). Timing: NOT VERIFIED — the end state was observed, not its onset; source: viewer polls every 2 s (`viewer/index.html:621`) and marks a request stale after a 10 s timeout (`viewer/index.html:354-357`).** Owner `/signal` sent SIGSTOP at 19:34:36.698Z and SIGCONT at 19:36:54.694Z (`signals.jsonl`). Owner-supplied screenshot showed “stale (no response within 10 s)” and “Last snapshot received 104 s ago”. util-linux `script` also stopped; bash backgrounded the launcher, and `fg` did not repaint the TUI. A was subsequently ended.
- **Narrow pane usable: PASS.** Owner-supplied screenshots at approximately 340 px width showed readable, wrapped transcripts.
- **Orca 1.4.204 refusal; no new tab: PASS.** L used `<tmp>/launch.sh --low`; root completed with three succeeded, then `/observer grant all` and `/observer open all` returned `Error: orca appVersion 1.4.204 is below 1.4.205` and `Use /observer url to issue a bootstrap URL.` `orca-low.calls` contains exactly `status --json`; real before/after tab lists were identical, three tabs (`tabs-L-before.json`, `tabs-L-after.json`).
- **URL-persistence residual: NOT REPRODUCED; recorded-code 401 not applicable as written.** Read-only copies of `$ORCA_USER_DATA_PATH/profiles/local-default/profile-state.db{,-wal}` showed workspaceSession tabs/history storing `http://127.0.0.1:38055/` (history normalized without trailing slash), without fragment. DB/WAL byte scan: zero `38055/#code=` occurrences, 21 plain URL hits in WAL. Recursive read-only scan excluding caches also found no such fragment; `Partitions/orca-browser/Session Storage/000003.log` held only the origin namespace key. [INFERENCE] viewer `history.replaceState` may precede Orca persistence. The post-quit v05 rescan likewise found no persisted code. No persisted code was available to post. Discriminating control: `/observer url all` → owner `/spent` twice gave `<code sha256:bb39e6f9>` 200/401 at 14:32:04 local and `<code sha256:6d1fa342>` 200/401 at 15:37:24 local (`control.jsonl`); v12 `<code sha256:3bb9c127>` also gave 200/401. Correction: `<code sha256:20ada5b5>` came from grant, was never loaded, and its later 401 was >60 s expiry, not spending; `open` never prints the URL put into its tab.

#### v12 — coexistence (option a, owner-approved): PASS

`orca-ide terminal create --worktree current --title gc1-v12 --json` created the workspace terminal; `source <tmp>/v12.sh` was sent with `terminal send`. The script checked the omp wrapper/status extension and assertStubOnly, captured the wrapper functions in `<tmp>/v12-wrapper.sh` (sha256 `e48020a203d26fde763d4eae3109b4d8716849aab16e2216665623b7d6399be7`; embedded verbatim above). Process argv was `omp --extension $HOME/.omp/agent/extensions/orca-agent-status.ts --profile nested` (pid 2875245).

The TUI showed “Harness scripted model” twice and no openai/codex/login/setup/error; main plus four children ran with 200s. Terminal title changed from `π > workspace` to `OMP > Harness auxiliary reply` (`v12-show-0.json`, `v12-show-1.json`); the owner confirmed the OMP agent-status indicator. Observer `/observer grant all`, `/observer status` showed state ready, `http://127.0.0.1:45127/`, inventory complete and `grants: 4 children, 0 live credentials, 1 pending codes`; grant exchange returned 200 then 401. SIGTERM at 21:06:18Z, terminal close succeeded, hook token scan found zero files. The wrapper and observer both operated in this session.

#### v05 — Orca restart: PASS

- **Restart preparation.** R ran outside Orca under `tmux -L gc1 new-session -d -s R -x 400 -y 60 "<tmp>/launch.sh"`, with orchestrator typing under Niko's authorization. Fresh stub5 (`restub.log`, 21:12Z), exact harness environment names, assertStubOnly ok, zero auth rows; root completed with 12 requests, all 200.
- **Before quit.** `/observer status`: state ready, epoch `362fb2a2-eaf2-4911-94b6-d9280aca45ac`, endpoint `http://127.0.0.1:42091/`, four granted children, one live credential, zero pending codes, inventory complete (`R-status-before.txt`). omp pid 2891578; Orca pid 24820/runtimeId `d57c6b08-fe7c-4606-bcf5-f3458b23ba53`. Tab 77fb4004 was live, “Last snapshot received 0 s ago”, Generation 64 (`tabs-R-open.json`, `snap-R-open.json`). Niko quit Orca completely and relaunched it.
- **Restored access: PASS.** Orca pid became 27580/runtimeId `31e479ff-1d7a-461a-90ae-55415fe3c874`, appVersion 1.4.217; omp pid remained 2891578 (etime 38:09), same epoch, endpoint GET / 200, inventory complete, zero granted children/live credentials (`R-status-after.txt`). Read-only profile-state inspection showed all four fragment-free viewer URLs (:38055/, :39517/ ×2, :42091/). Lazy restoration initially exposed only the active tab to CLI; after Niko clicked :42091, `orca-ide snapshot --page 77fb4004-59ba-449e-b6e4-ea18c1613ac2 --json` showed `unavailable(access not granted)` and “No compatible snapshot received” (`snap-R-restored-77fb.json`). The page-memory credential did not survive restart.
- **Post-quit persistence rescan.** Read-only recursive grep of `$ORCA_USER_DATA_PATH`, excluding caches, for `127.0.0.1:(38055|39517|42091|45127)/?#code=` found no file. Plain URLs appeared only in Session Storage log, orca-data.json (+ sqlite-export), profile-state.db/-wal and backups. URL-code persistence remains **not reproduced**, including after quit.
- **Fresh open and unaffected observer/native children: PASS.** `/observer grant all`, `/observer open all` returned `observer open: {"ok":true,"result":{"browserPageId":"6144ae30-…"}}` with the new runtimeId. Tab 6144ae30 at :42091/ was live (“Last snapshot received 0 s ago”), same epoch and root session, Generation 551; sibling-a, sibling-b, nested-parent and nested-parent.nested-leaf remained present (`tabs-R-fresh-open.json`, `snap-R-fresh-open.json`, `snap-R-fresh-full.json`).

### Screenshots (kept in `<tmp>`, never committed)

`shot-1-viewer.png`, `shot-3-sibling.png`, `shot-C-open.png`, `shot-C-after-new.png`. Niko-supplied pastes described in FACTS: distinct sibling transcripts in the narrow pane, readable approximately 340 px layout, and the stale banner after SIGSTOP. FACTS supplies no filenames for those pastes. The ended-process observation has no screenshot (Niko's choice).

### Open items

- **Unexplained session-A credential loss:** approximately 15–20 minutes after open, without revoke, `/observer status` showed `0 children, 0 live credentials, 0 pending codes`; viewer showed `unavailable(access ended)`. Hidden-tab throttling was falsified in C: seven minutes hidden while Orca stayed visible retained one live credential. Minimized/occluded window remains an untested candidate, not an explanation.
- **URL-persistence residual not reproduced:** no recorded fragment on Orca 1.4.217; recorded-code 401 cannot be claimed. The completed post-quit rescan found no persisted code either.
- **Orca CLI snapshot flakiness/view divergence:** `runtime_unavailable` often occurred after approximately 30 s, with retries succeeding; one CLI snapshot showed “Select a child” while the visible UI showed a selected transcript.
- **`/spent` echoed a credential once:** the v12 response exposed the exchanged credential in the orchestrator console, not the code. It idle-expired unused after 60 s and is not embedded in evidence.
- **Stub replay 409s:** six scripted 409s are disclosed above; fresh stubs reset scenario turn positions. Session-end request origin is an inference.
- **Owner assert stubUrl stale:** informational URL remains the original stub's after restubs; assertStubOnly itself was called.
- **omp updated mid-run by Niko:** A began on 18.4.6; after the update (cli.js mtime 14:24:16 local), B/C/L/v12 used 18.4.9. This is not a single-version run.

### Result table

| criterion | result |
|---|---|
| v06 reachability | PASS |
| v04 new tab / existing URLs | PASS |
| v04 read-only controls | PASS |
| v04 distinct siblings | PASS |
| v04 process end / new / revoke / stale | PASS (states); timing NOT VERIFIED |
| v04 narrow pane | PASS |
| v04 1.4.204 refusal | PASS |
| v04 URL persistence | residual NOT REPRODUCED; recorded-code 401 not applicable as written |
| v12 coexistence (option a) | PASS |
| v05 restart | PASS |
