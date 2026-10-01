# gc2 — auth, viewer retention, endpoint

Scope: `gc2-auth-viewer-endpoint.md`, including its strict nfr-8 resolution. Evidence-only run; no production fixes, no Orca commands. Recovery baseline: this evidence file was absent before the run (the exact-path `glob` returned `Path not found`). This worker exclusively owns this evidence path.

## Versions and inspected contracts

- `omp --version` → `omp/18.4.6` (exit 0).
- Orca `1.4.217`: orchestrator-supplied observation, 2026-10-01, command `"$ORCA_CLI_COMMAND" status --json`, field `result.runtime.appVersion`; this worker did not run Orca.
- Dev-source baseline: supplied 18.3.5 source under `node_modules/@oh-my-pi/pi-coding-agent/src/`. Native idle TTL is read at `task/executor.ts:3475-3477`.
- Frozen schema: `schema-v1-frozen`; endpoint reads: `transport-authorized-reads`; grant lifetime and per-child cancellation: `observer-epoch-grants`; viewer memory-only credentials: `viewer-authorized-reads`; once-per-session routing: `observer-guidance-committed-delivery`.
- All omp runtime work will use harness-created disposable homes/workspaces and the local stub. Runtime transcript paths and ephemeral roots are normalized as `<tmp>`; secrets are recorded only in the disposable watch file and withheld from this report.

## Criterion evidence

### Setup observations and discarded runs

Orchestrator granted read-only access to `index.ts`, `stock-source.ts`, `reader.ts`, and `coordinator.ts` for attributable instrumentation and teardown inspection. Only the disposable copy is instrumented. A diagnostic extension records native registry scalar snapshots and native JSONL byte digests.

```text
bun add playwright
installed playwright@1.63.0; 2 packages installed
env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bunx playwright install chromium
Chrome for Testing 153.0.8010.12 (playwright chromium v1243) downloaded
Chrome Headless Shell 153.0.8010.12 (playwright chromium-headless-shell v1243) downloaded
FFmpeg (playwright ffmpeg v1011) downloaded
```

Attempt 1 stopped before any scenario:

```text
env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js
omp --profile many-33 plugin unlink $PWD/omp-orca-observer
exitCode=1
error: Expected action to be one of: install, uninstall, list, link, doctor, features, config, enable, disable, marketplace, discover, upgrade; got "unlink"
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal: 1 !== 0
cleanup: profile many-33 removed=true; watch file removed=true
```

The disposable help probe then inspected the supported command:

```text
bun run <tmp>/plugin-help.js
omp --profile many-33 plugin uninstall --help
exitCode=0
TARGETS Packages, paths, or plugin names
omp --profile many-33 plugin list
exitCode=0
npm Plugins: ● omp-orca-observer@undefined
cleanup=true
```

Attempt 2 used the supported uninstall command, but the TUI was still in its setup wizard and the temporary copy had accumulated duplicate instrumentation imports:

```text
env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js
omp --profile many-33 plugin uninstall omp-orca-observer
exitCode=0; ✔ Uninstalled omp-orca-observer
native-baseline: requests=82; child requests=33; secret_seen=false
tui /observer serve
│ Search: /gate-state before-serve/observer serve
Error: Timed out: endpoint URL
cleanup: profile many-33 removed=true; watch file removed=true
```

No criterion from either discarded setup run is accepted (in particular the zero-I/O line from attempt 2 is not a valid observer-loaded check). Production source hashes were independently observed and matched the first copy's before-hashes. Disposable TUI settings now disable the native setup wizard, splash, and update check; subsequent copies start from an empty destination. No endpoint failure is being fixed or bypassed.


### v03.before-serve — PASS

```json
{"criterion":"v03.before-serve","result":"PASS","observerNetwork":0,"observerTranscriptReads":0,"ioOperations":1110}
```

### v03.no-client-60s — PASS

```json
{"criterion":"v03.no-client-60s","result":"PASS","windowMs":62120,"observerServerStarts":1,"observerFetches":0,"observerTranscriptReads":0}
```

### v11.anonymous — PASS

```json
{"criterion":"v11.anonymous","result":"PASS","snapshot":401,"page":401,"viewerIsPublicShell":true}
```

### v11.wrong-host — PASS

```json
{"criterion":"v11.wrong-host","result":"PASS","status":421}
```

### v11.wrong-origin — PASS

```json
{"criterion":"v11.wrong-origin","result":"PASS","status":403}
```

### v11.outside-grant — PASS

```json
{"criterion":"v11.outside-grant","result":"PASS","child":"agent-11","status":401}
```

### v11.snapshot-scope — PASS

```json
{"criterion":"v11.snapshot-scope","result":"PASS","returnedChildren":["agent-1","agent-10"]}
```

### v11.replayed-code — PASS

```json
{"criterion":"v11.replayed-code","result":"PASS","status":401}
```

### v11.expired-code — PASS

```json
{"criterion":"v11.expired-code","result":"PASS","waitMs":61012,"status":401}
```

### v11.idle-credential — PASS

```json
{"criterion":"v11.idle-credential","result":"PASS","waitMs":61012,"status":401}
```

### v11.mutations — PASS

```json
{"criterion":"v11.mutations","result":"PASS","requests":18,"statuses":[405,405,405,405,405,405,405,405,405,405,405,405,405,405,405,405,405,401]}
```

### v11.partial-revoke-in-flight — PASS

```json
{"criterion":"v11.partial-revoke-in-flight","result":"PASS","a":{"kind":"unavailable","reason":"cancelled"},"b":{"kind":"page","atEnd":true},"readAbortLogged":true,"bMs":10,"aMs":67}
```

### v08.browser-retention — PASS

```json
{"criterion":"v08.browser-retention","result":"PASS","scannedProfileFiles":54,"matches":[],"storage":{"local":[],"session":[]},"fragmentCleared":true}
```

### v08.no-store — PASS

```json
{"criterion":"v08.no-store","result":"PASS","curlResponses":33,"browserResponses":[{"path":"/","status":200,"cache":"no-store"},{"path":"/v1/session","status":200,"cache":"no-store"},{"path":"/v1/snapshot","status":200,"cache":"no-store"},{"path":"/v1/children/agent-10/page","status":200,"cache":"no-store"}]}
```

### v11.rpc-grant-refused — PASS

```json
{"criterion":"v11.rpc-grant-refused","result":"PASS","output":"s\"},{\"name\":\"reset\",\"description\":\"Alias for clear\"},{\"name\":\"enqueue\",\"description\":\"Enqueue memory consolidation maintenance\"},{\"name\":\"rebuild\",\"description\":\"Alias for enqueue\"},{\"name\":\"mm list\",\"description\":\"List mental models on the active bank\"},{\"name\":\"mm show\",\"description\":\"Show one mental model (id required)\"},{\"name\":\"mm refresh\",\"description\":\"Refresh auto-refresh models bank-wide, or one model by id\"},{\"name\":\"mm history\",\"description\":\"Diff the change history of a mental model\"},{\"name\":\"mm seed\",\"description\":\"Create any built-in mental models that are missing\"},{\"name\":\"mm delete\",\"description\":\"Delete a mental model from the bank (id required)\"},{\"name\":\"mm reload\",\"description\":\"Re-pull the cached <mental_models> block\"}],\"source\":\"builtin\"},{\"name\":\"rename\",\"description\":\"Rename the current session (omit title to generate)\",\"input\":{\"hint\":\"[title]\"},\"source\":\"builtin\"},{\"name\":\"move\",\"description\":\"Move the current session to a different directory\",\"input\":{\"hint\":\"[<path>]\"},\"source\":\"builtin\"},{\"name\":\"wt\",\"aliases\":[\"worktree\"],\"description\":\"Move this session into a new worktree, changes included\",\"input\":{\"hint\":\"[<branch>]\"},\"source\":\"builtin\"},{\"name\":\"add-dir\",\"description\":\"Add a workspace directory to this session\",\"input\":{\"hint\":\"<path>\"},\"source\":\"builtin\"},{\"name\":\"remove-dir\",\"description\":\"Remove a workspace directory from this session\",\"input\":{\"hint\":\"<path>\"},\"source\":\"builtin\"},{\"name\":\"dirs\",\"description\":\"List this session's workspace directories\",\"source\":\"builtin\"},{\"name\":\"marketplace\",\"description\":\"Manage plugins from marketplaces\",\"input\":{\"hint\":\"<subcommand>\"},\"subcommands\":[{\"name\":\"add\",\"description\":\"Add a marketplace source\",\"usage\":\"<source>\"},{\"name\":\"remove\",\"description\":\"Remove a marketplace source\",\"usage\":\"<name>\"},{\"name\":\"update\",\"description\":\"Update marketplace catalog(s)\",\"usage\":\"[name]\"},{\"name\":\"list\",\"description\":\"List configured marketplaces\"},{\"name\":\"discover\",\"description\":\"Browse available plugins\",\"usage\":\"[marketplace]\"},{\"name\":\"install\",\"description\":\"Install a plugin (interactive browser if no args)\",\"usage\":\"[--force] [name@marketplace]\"},{\"name\":\"uninstall\",\"description\":\"Uninstall a plugin (selector if no args)\",\"usage\":\"[name@marketplace]\"},{\"name\":\"installed\",\"description\":\"List installed marketplace plugins\"},{\"name\":\"upgrade\",\"description\":\"Upgrade outdated plugins\",\"usage\":\"[name@marketplace]\"},{\"name\":\"help\",\"description\":\"Show usage guide\"}],\"source\":\"builtin\"},{\"name\":\"plugins\",\"aliases\":[\"plugin\"],\"description\":\"Manage plugins\",\"input\":{\"hint\":\"[list|enable|disable]\"},\"subcommands\":[{\"name\":\"list\",\"description\":\"List all installed plugins (npm + marketplace)\"},{\"name\":\"enable\",\"description\":\"Enable a marketplace plugin\",\"usage\":\"<name@marketplace>\"},{\"name\":\"disable\",\"description\":\"Disable a marketplace plugin\",\"usage\":\"<name@marketplace>\"}],\"source\":\"builtin\"},{\"name\":\"reload-plugins\",\"description\":\"Reload all plugins\",\"source\":\"builtin\"},{\"name\":\"force\",\"aliases\":[\"force:\"],\"description\":\"Force next turn to use a specific tool\",\"input\":{\"hint\":\"<tool-name> [prompt]\"},\"source\":\"builtin\"},{\"name\":\"observer\",\"description\":\"serve, grant, revoke, inspect, or open the read-only child observer\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"gate-state\",\"description\":\"Disposable gate inventory\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"gate-stop\",\"description\":\"Disposable gate native-state isolation check\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"autoresearch\",\"description\":\"Toggle builtin autoresearch mode, or pass off / clear, or a goal message.\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"green\",\"description\":\"Generate a prompt to iterate on CI failures until the branch is green\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"review\",\"description\":\"Launch interactive code review\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"annotate\",\"description\":\"Annotate a diff or text from a file, prompt, latest reply, or session\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"init\",\"description\":\"Generate AGENTS.md for current codebase\",\"source\":\"file\"}]}\n{\"type\":\"extension_ui_request\",\"id\":\"1594cf49c65735fb\",\"method\":\"notify\",\"message\":\"observer grant requires interactive tui mode with UI\",\"notifyType\":\"error\"}\n{\"id\":\"rpc-grant\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"rpc-grant\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n{\"type\":\"extension_ui_request\",\"id\":\"1594cf4b88d735fc\",\"method\":\"notify\",\"message\":\"observer state: ready\\nepoch: 0d8c9dcf-22af-4679-9a35-80e2756abd59\\nendpoint: not serving\\ngrants: 0 children, 0 live credentials, 0 pending codes\\ninventory: complete\",\"notifyType\":\"info\"}\n{\"id\":\"rpc-status\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"rpc-status\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n","limitation":"RPC notify payload may not surface; pending code proof follows runtime status only if present."}
```

### v03.routing-only — FAIL

```json
{"criterion":"v03.routing-only","result":"FAIL","nativeMain":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":10733,"sha256":"0145f34a061b6216b83191f2fbb7260e584c040f7762d769bb3a57b7d61cca6e"},{"role":"user","byteLength":269,"sha256":"35d6971dda60e9bd6b98cb07772f0463fc5ff196e596e556d7ea2db6711aa0d1"}],"secret_seen":false,"status":200},"observerMain":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"35d6971dda60e9bd6b98cb07772f0463fc5ff196e596e556d7ea2db6711aa0d1"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"secret_seen":false,"status":200},"paragraphBytes":301,"added":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"expectedMessages":[{"role":"user","byteLength":329,"sha256":"47fbe48c56119b9712b0a0e39f0cfff3161c1488d0b1d6f41512ff86f0e29455"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"limitation":"Initial main provider request compared exactly; later child/tool messages have run-specific native content and are separately retained in raw capture."}
```

### v11.source-replacement — PASS

```json
{"criterion":"v11.source-replacement","result":"PASS","oldEndpointExit":7,"status":null}
```

### v11.teardown-native-isolation — PASS

```json
{"criterion":"v11.teardown-native-isolation","result":"PASS","at":1790834109260,"filesEqual":true,"registryEqual":true,"runtimeNull":true,"coordinator":{"state":"unavailable","reason":"disposed"},"grants":{"liveCredentials":0,"grantedChildIds":[],"pendingCodes":0},"nativeFiles":69,"rows":34,"method":"Calls the actual stopRuntime through an added diagnostic-only seam in the disposable copy; byte hashes and registry scalar snapshots taken immediately before and after."}
```

### nfr-8.authenticated-only — PASS

```json
{"criterion":"nfr-8.authenticated-only","result":"PASS","transcriptReads":37,"headerReads":33,"outsideAuthorizedRequest":[],"headersOutsideSnapshot":[],"readsInRejectedRequests":[]}
```

### nfr-8.post-request-parking — UNVERIFIED

```json
{"criterion":"nfr-8.post-request-parking","result":"UNVERIFIED","nativeParkedChildren":33,"reason":"Selected many-33 children parked during the pre-serve quiet window; request-then-parking is exercised in the many-135 scenario below."}
```

### v11.secret-isolation — PASS

```json
{"criterion":"v11.secret-isolation","result":"PASS","secretCount":11,"nativeJsonlFiles":69,"matchingFiles":[],"stubRequests":74,"secretSeenTrue":0,"secretSeenMissing":0}
```

## Reproducible phase1 sources

Scripts are reproduced from the exact on-disk bytes; the digests below are of those bytes, not of a pretty-printed rendering. `bootstrap.js` moves only its own process working directory, not its environment. All omp children still receive the harness disposable environment at process start.

### pty_driver.py

SHA256: `7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831`

Invocation: `python3 <tmp>/pty_driver.py <tmp>/pty-<scenario>.json --extension <tmp>/inspect.ts [--session <native-session>]`

```python
import sys, os, json, pty, select, subprocess, fcntl, termios, struct, signal
config = json.load(open(sys.argv[1]))
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 70, 600, 0, 0))
child = subprocess.Popen(['omp', '--profile', config['name']] + sys.argv[2:], cwd=config['workspace'], env=config['env'], stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
os.close(slave)
def stop(signum, frame):
    if child.poll() is None:
        os.killpg(child.pid, signal.SIGTERM)
signal.signal(signal.SIGTERM, stop)
try:
    while child.poll() is None:
        for fd in select.select([master, sys.stdin.fileno()], [], [], 0.1)[0]:
            if fd == master:
                try:
                    data = os.read(master, 65536)
                except OSError:
                    data = b''
                if data:
                    os.write(sys.stdout.fileno(), data)
            else:
                data = os.read(sys.stdin.fileno(), 65536)
                if not data:
                    stop(signal.SIGTERM, None)
                    break
                os.write(master, data)
finally:
    stop(signal.SIGTERM, None)
    child.wait(timeout=20)
    os.close(master)
sys.exit(child.returncode)
```

### probe.js

SHA256: `fbe01fe62e4bb6f32cc2947a599925fcd30d93418004b9031bd5a680fe462119`

Invocation: `imported only by instrumented observer modules in disposable profiles`

```javascript
import fs from 'node:fs';
import { AsyncLocalStorage } from 'node:async_hooks';
import { join } from 'node:path';
const dir = new URL('.', import.meta.url).pathname;
const io = join(dir, 'io.jsonl');
const control = join(dir, 'hold.json');
const contexts = new AsyncLocalStorage();
let requestId = 0;
export function note(module, op, detail = {}) {
  const c = contexts.getStore();
  fs.appendFileSync(io, JSON.stringify({ at: Date.now(), pid: process.pid, module, op, request: c ? { id: c.id, method: c.method, path: c.path, hasAuthorization: c.hasAuthorization, childId: c.childId } : null, ...detail }) + '\n');
}
function wrapHandle(handle, path, module) {
  return new Proxy(handle, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      return async (...args) => {
        note(module, 'handle.' + String(prop), { file: path, ...(prop === 'read' ? { offset: args[3] ?? null, length: args[2] ?? null } : {}) });
        if (prop === 'read') {
          let held = false;
          try { const rule = JSON.parse(fs.readFileSync(control, 'utf8')); held = Boolean(rule.file && path === rule.file && !rule.release); } catch { }
          if (held) {
            const c = contexts.getStore();
            note(module, 'held-read', { file: path });
            while (true) {
              if (c?.signal?.aborted) { note(module, 'held-read-aborted', { file: path }); throw c.signal.reason; }
              const rule = JSON.parse(fs.readFileSync(control, 'utf8'));
              if (rule.release) break;
              await Bun.sleep(20);
            }
            note(module, 'held-read-released', { file: path });
          }
        }
        const result = await value.apply(target, args);
        if (prop === 'read') note(module, 'handle.read-complete', { file: path, bytesRead: result.bytesRead });
        return result;
      };
    }
  });
}
export function wrapFs(real, module) {
  const fds = new Map();
  return new Proxy(real, {
    get(target, prop) {
      const value = Reflect.get(target, prop, target);
      if (typeof value !== 'function') return value;
      return (...args) => {
        const file = typeof args[0] === 'number' ? fds.get(args[0]) ?? String(args[0]) : String(args[0] ?? '');
        note(module, String(prop), { file, ...(prop === 'readSync' ? { offset: args[4] ?? null, length: args[3] ?? null } : {}) });
        const result = value.apply(target, args);
        if (prop === 'openSync') fds.set(result, file);
        if (prop === 'closeSync') fds.delete(args[0]);
        if (prop === 'open') return Promise.resolve(result).then(h => wrapHandle(h, file, module));
        if (prop === 'opendirSync') return new Proxy(result, { get(t, p) { const v = Reflect.get(t, p, t); return typeof v === 'function' ? (...a) => { note(module, 'directory.' + String(p), { file }); return v.apply(t, a); } : v; } });
        return result;
      };
    }
  });
}
export function openLogged(real, module) { return wrapFs({ open: real }, module).open; }
export function fetchLogged(module) { return (...args) => { note(module, 'fetch', { url: String(args[0]) }); return globalThis.fetch(...args); }; }
export function serveLogged(options) {
  note('transport.ts', 'Bun.serve', { hostname: options.hostname, port: options.port });
  const fetch = options.fetch;
  const server = Bun.serve({
    ...options, fetch(request) {
      const url = new URL(request.url); const c = { id: ++requestId, method: request.method, path: url.pathname, hasAuthorization: request.headers.has('authorization') };
      return contexts.run(c, async () => { note('transport.ts', 'request-begin'); const response = await fetch(request); note('transport.ts', 'request-end', { status: response.status }); return response; });
    }
  });
  note('transport.ts', 'Bun.serve-bound', { port: server.port });
  return server;
}
export function readLogged(request, next) {
  const c = contexts.getStore();
  return contexts.run({ ...c, childId: request.childId, signal: request.signal }, async () => { note('reader.ts', 'page-begin', { file: request.sessionFile }); const result = await next(); note('reader.ts', 'page-end', { kind: result.kind, reason: result.reason ?? null }); return result; });
}
```

### inspect.ts

SHA256: `4615afa85b654d797bfe4fff8a7787ae47bed9b4908bb3624e5853840f975cb1`

Invocation: `omp --profile <scenario> --extension <tmp>/inspect.ts [--mode rpc]`

```javascript
import fs from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const dir = new URL('.', import.meta.url).pathname;
function nativeRows(pi) {
  return pi.pi.AgentRegistry.global().list().map(ref => ({ id: ref.id, kind: ref.kind, parentId: ref.parentId ?? null, status: ref.status, createdAt: ref.createdAt, sessionFile: ref.sessionFile ?? null, history: ref.history, lifecycle: ref.lifecycle, lastActivityAt: ref.lastActivityAt })).sort((a, b) => a.id.localeCompare(b.id));
}
function sessionHashes(root) {
  const result = {};
  function walk(path) {
    for (const entry of fs.readdirSync(path, { withFileTypes: true })) {
      const file = join(path, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.isFile() && entry.name.endsWith('.jsonl')) result[relative(root, file)] = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
    }
  }
  walk(root); return result;
}
export default function inspect(pi) {
  let unlisten;
  pi.on('session_start', (_event, ctx) => {
    if (ctx.agent.kind !== 'main' || unlisten) return;
    unlisten = pi.pi.AgentRegistry.global().onChange(() => {
      fs.appendFileSync(join(dir, 'native.jsonl'), JSON.stringify({ at: Date.now(), rows: nativeRows(pi) }) + '\n');
    });
  });
  pi.on('session_shutdown', () => { unlisten?.(); });
  pi.registerCommand('gate-state', {
    description: 'Disposable gate inventory', handler: async (args, ctx) => {
      const rows = nativeRows(pi);
      fs.appendFileSync(join(dir, 'states.jsonl'), JSON.stringify({ tag: args, at: Date.now(), mode: ctx.mode, root: ctx.sessionManager.getSessionFile(), rows }) + '\n');
      ctx.ui.notify('gate-state ' + args + ' rows=' + rows.length, 'info');
    }
  });
  pi.registerCommand('gate-stop', {
    description: 'Disposable gate native-state isolation check', handler: async (_args, ctx) => {
      const seam = globalThis[Symbol.for('gc2.seam')];
      const runtime = seam?.getRuntime();
      if (!runtime) { ctx.ui.notify('gate-stop runtime unavailable', 'error'); return; }
      const beforeRows = JSON.stringify(nativeRows(pi)); const beforeFiles = sessionHashes(process.env.HOME);
      await seam.stopRuntime();
      const afterRows = JSON.stringify(nativeRows(pi)); const afterFiles = sessionHashes(process.env.HOME);
      const result = { at: Date.now(), filesEqual: JSON.stringify(beforeFiles) === JSON.stringify(afterFiles), registryEqual: beforeRows === afterRows, runtimeNull: seam.getRuntime() === null, coordinator: runtime.coordinator.state(), grants: runtime.grants.status(), nativeFiles: beforeFiles, rows: JSON.parse(afterRows) };
      fs.writeFileSync(join(dir, 'teardown.json'), JSON.stringify(result));
      ctx.ui.notify('gate-stop ' + JSON.stringify({ ...result, nativeFiles: Object.keys(beforeFiles).length, rows: result.rows.length }), 'info');
    }
  });
}
```

### gate-attempt1.js

SHA256: `6c32c1e3e236d8bb31c72a39e320ea1bf13951841bf5b4bf60f317090de45f8f`

Invocation: `env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js (attempt 1)`

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cp, rm, symlink } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
const repo = process.cwd(); const dir = new URL('.', import.meta.url).pathname;
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const source = join(repo, 'omp-orca-observer'); const copy = join(dir, 'observer');
const profiles = []; const extraProcesses = []; const secrets = []; const responses = [];
const watch = join(dir, 'watch.json'); fs.writeFileSync(watch, '[]'); fs.writeFileSync(join(dir, 'hold.json'), '{}');
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function normalize(text) { let out = String(text).replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>'); for (const p of profiles) out = out.replaceAll(p.root, '<tmp>/profile-' + p.name); for (const s of secrets) out = out.replaceAll(s, '<secret>'); return out; }
function secret(value) { if (value && !secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); } }
function output(value) { const line = normalize(JSON.stringify(value)); console.log(line); fs.appendFileSync(join(dir, 'results.jsonl'), line + '\n'); }
function report(id, pass, detail) { output({ criterion: id, result: pass === null ? 'UNVERIFIED' : pass ? 'PASS' : 'FAIL', ...detail }); }
function jsonl(path) { try { return fs.readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } }
function io() { return jsonl(join(dir, 'io.jsonl')); }
function clean(text) { return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, ''); }
async function until(check, ms = 30000, label = 'condition') { const end = Date.now() + ms; while (Date.now() < end) { const result = check(); if (result) return result; await Bun.sleep(30); } throw new Error('Timed out: ' + label); }
async function collectStream(stream, consume) { const reader = stream.getReader(); const decoder = new TextDecoder(); while (true) { const { done, value } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); } }
function profileEnv(p) { const env = {}; for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) env[key] = process.env[key]; Object.assign(env, { HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') }); return env; }
async function profile(name) { const p = await create(name); p.name = name; profiles.push(p); return p; }
async function command(p, args) { const r = await p.run(args); output({ command: 'omp --profile ' + p.name + ' ' + args.join(' '), ...r }); assert.equal(r.exitCode, 0); return r; }
async function watchedStub(p) { const proc = Bun.spawn(['bun', 'run', join(source, 'checks/harness/stub-provider.ts'), '--scenario', join(source, 'checks/harness/scenarios', p.name + '.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' }); extraProcesses.push(proc); let text = ''; collectStream(proc.stdout, c => text += c); collectStream(proc.stderr, c => output({ stubStderr: c })); const url = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(text)?.[0], 20000, 'stub URL'); const models = join(p.home, '.omp/profiles', p.name, 'agent/models.yml'); fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replaceAll(p.stubUrl, url)); output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/' + p.name + '.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json', url }); }
async function rpc(p) { const child = p.spawn(['--mode', 'rpc', '--extension', join(dir, 'inspect.ts')]); let text = ''; const events = []; collectStream(child.stdout, c => { text += c; for (const line of c.split('\n')) { try { events.push(JSON.parse(line)); } catch { } } }); collectStream(child.stderr, c => fs.appendFileSync(join(dir, 'rpc.stderr'), normalize(c))); await Bun.sleep(1400); return { child, events, get text() { return text; }, send(message) { child.stdin.write(JSON.stringify(message) + '\n'); child.stdin.flush(); } }; }
async function tui(p, args = []) { const cfg = join(dir, 'pty-' + p.name + '.json'); fs.writeFileSync(cfg, JSON.stringify({ name: p.name, workspace: p.workspace, env: profileEnv(p) })); const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), cfg, '--extension', join(dir, 'inspect.ts'), ...args], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }); extraProcesses.push(child); let raw = ''; let latestCodes = []; collectStream(child.stdout, c => { raw += c; const text = clean(raw); const codes = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)].map(m => m[1]); for (const code of codes) if (!latestCodes.includes(code)) { latestCodes.push(code); secret(code); } fs.writeFileSync(join(dir, 'tui-' + p.name + '.raw'), raw); }); collectStream(child.stderr, c => output({ tuiStderr: c })); await Bun.sleep(2200); const session = { child, p, get text() { return clean(raw); }, get codes() { return latestCodes; }, async send(text, wait = 550) { const start = clean(raw).length; child.stdin.write(text + '\r'); child.stdin.flush(); await Bun.sleep(wait); const out = clean(raw).slice(start); output({ command: 'tui ' + text, output: out.slice(-2400) }); return out; }, async grant(ids, ttl = '') { const before = latestCodes.length; await this.send('/observer grant ' + ids + (ttl ? ' --ttl ' + ttl : '')); return until(() => latestCodes.length > before ? latestCodes.at(-1) : null, 10000, 'grant code'); } }; output({ command: 'python3 <tmp>/pty_driver.py <tmp>/pty-' + p.name + '.json --extension <tmp>/inspect.ts ' + args.join(' '), terminal: { rows: 70, columns: 600 }, startup: session.text.slice(-1600) }); return session; }
async function curl(endpoint, path, options = {}) { const args = ['-sS', '--max-time', String(options.maxTime ?? 20), '-D', '-']; if (options.method) args.push('-X', options.method); if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential); for (const h of options.headers ?? []) args.push('-H', h); if (options.body !== undefined) args.push('--data', JSON.stringify(options.body)); args.push(new URL(path, endpoint).href); const started = Date.now(); const proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]); const match = /HTTP\/\S+ (\d+)/.exec(stdout); const split = stdout.indexOf('\r\n\r\n'); const headers = split < 0 ? '' : stdout.slice(0, split); const body = split < 0 ? stdout : stdout.slice(split + 4); let parsed; try { parsed = JSON.parse(body); } catch { } const result = { status: match ? Number(match[1]) : null, cache: /cache-control:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? null, exitCode, body, parsed, ms: Date.now() - started, command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), stderr }; if (parsed?.credential) secret(parsed.credential); responses.push(result); output({ command: result.command, status: result.status, cache: result.cache, exitCode, ms: result.ms, body: body.length > 500 ? body.slice(0, 500) + ' [body bytes=' + Buffer.byteLength(body) + ', sha256=' + digest(body) + ']' : body, stderr }); return result; }
async function exchange(endpoint, code) { const result = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); assert.equal(result.status, 200); assert.ok(typeof result.parsed.credential === 'string'); return result.parsed.credential; }
function childRows(tag) { return jsonl(join(dir, 'states.jsonl')).findLast(s => s.tag === tag)?.rows.filter(r => r.kind === 'sub') ?? []; }
function transcriptReads(events) { return events.filter(e => ['readSync', 'handle.read', 'readFile', 'readFileSync'].includes(e.op) && e.file?.includes('.jsonl')); }
function network(events) { return events.filter(e => ['fetch', 'Bun.serve'].includes(e.op)); }
async function instrument() { await cp(source, copy, { recursive: true, filter: path => !path.includes('/node_modules') && !path.includes('/checks/evidence') }); await symlink(join(repo, 'node_modules'), join(dir, 'node_modules-repo'), 'dir').catch(() => { }); await symlink(join(repo, 'node_modules'), join(copy, 'node_modules'), 'dir').catch(() => { }); for (const name of ['index.ts', 'commands.ts', 'coordinator.ts', 'guidance.ts', 'auth.ts', 'stock-source.ts', 'reader.ts', 'transport.ts']) { const file = join(copy, name); let text = fs.readFileSync(file, 'utf8'); const before = digest(text); text = 'import { wrapFs, openLogged, fetchLogged, serveLogged, readLogged, note } from "../probe.js";\nconst fetch = fetchLogged(' + JSON.stringify(name) + ');\n' + text; if (name === 'stock-source.ts') text = text.replace('import fs from "node:fs";', 'import realFs from "node:fs";\nconst fs = wrapFs(realFs,"stock-source.ts");'); if (name === 'reader.ts') text = text.replace('import { open } from "node:fs/promises";', 'import { open as realOpen } from "node:fs/promises";\nconst open = openLogged(realOpen,"reader.ts");'); if (name === 'transport.ts') text = text.replace('Bun.serve({ hostname:', 'serveLogged({ hostname:').replace('const result = await options.read(request);', 'const result = await readLogged(request, () => options.read(request));'); if (name === 'index.ts') text = text.replace('runtime = current;', 'runtime = current;\n  globalThis[Symbol.for("gc2.seam")] = { getRuntime: () => runtime, stopRuntime };'); fs.writeFileSync(file, text); output({ instrumented: name, beforeSha256: before, afterSha256: digest(text) }); } }
try {
  await instrument();
  const p = await profile('many-33'); await watchedStub(p);
  await command(p, ['plugin', 'unlink', source]);
  const baseline = await rpc(p); baseline.send({ id: 'native-main', type: 'prompt', message: 'HARNESS_AGENT=main' }); await Bun.sleep(14000); baseline.child.kill(); await baseline.child.exited;
  const nativeCapture = jsonl(p.capture); fs.writeFileSync(join(dir, 'capture-native.json'), JSON.stringify(nativeCapture)); output({ phase: 'native-baseline', requests: nativeCapture.length, agents: nativeCapture.filter(c => c.agent?.startsWith('child/')).length, firstMain: nativeCapture.find(c => c.agent === 'main') });
  fs.writeFileSync(p.capture, ''); await command(p, ['plugin', 'link', copy]);
  const configFile = join(p.home, '.omp/profiles', p.name, 'agent/config.yml'); const config = JSON.parse(fs.readFileSync(configFile, 'utf8')); config.task.agentIdleTtlMs = 6000; fs.writeFileSync(configFile, JSON.stringify(config));
  const session = await tui(p); await session.send('HARNESS_AGENT=main', 1200); await Bun.sleep(11000); await session.send('/gate-state before-serve');
  const before = io(); report('v03.before-serve', network(before).length === 0 && transcriptReads(before).length === 0, { observerNetwork: network(before).length, observerTranscriptReads: transcriptReads(before).length, ioOperations: before.length });
  const start = Date.now(); await session.send('/observer serve'); const endpoint = await until(() => /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(session.text)?.[1], 10000, 'endpoint URL'); await session.send('/observer serve'); await Bun.sleep(61000); const end = Date.now(); const quiet = io().filter(e => e.at >= start && e.at <= end); report('v03.no-client-60s', transcriptReads(quiet).length === 0 && network(quiet).filter(e => e.op === 'fetch').length === 0, { windowMs: end - start, observerServerStarts: quiet.filter(e => e.op === 'Bun.serve').length, observerFetches: network(quiet).filter(e => e.op === 'fetch').length, observerTranscriptReads: transcriptReads(quiet).length });
  const rows = childRows('before-serve'); assert.ok(rows.length >= 3); const [a, b, c] = rows; output({ nativeInventory: rows.length, selectedChildren: [a, b, c].map(r => ({ id: r.id, status: r.status, sessionFile: r.sessionFile })) });
  const code = await session.grant(a.id + ' ' + b.id); const credential = await exchange(endpoint, code);
  const anon = await curl(endpoint, '/v1/snapshot'); const anonPage = await curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page'); report('v11.anonymous', anon.status === 401 && anonPage.status === 401, { snapshot: anon.status, page: anonPage.status, viewerIsPublicShell: true });
  const host = await curl(endpoint, '/v1/snapshot', { credential, headers: ['Host: unrelated.invalid'] }); report('v11.wrong-host', host.status === 421, { status: host.status });
  const origin = await curl(endpoint, '/v1/snapshot', { credential, headers: ['Origin: https://unrelated.invalid'] }); report('v11.wrong-origin', origin.status === 403, { status: origin.status });
  const excluded = await curl(endpoint, '/v1/children/' + encodeURIComponent(c.id) + '/page', { credential }); report('v11.outside-grant', excluded.status === 401, { child: c.id, status: excluded.status });
  const snapshot = await curl(endpoint, '/v1/snapshot', { credential }); report('v11.snapshot-scope', snapshot.status === 200 && snapshot.parsed.children.every(row => [a.id, b.id].includes(row.childId)) && snapshot.parsed.children.length === 2, { returnedChildren: snapshot.parsed?.children?.map(row => row.childId) });
  const replay = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); report('v11.replayed-code', replay.status === 401, { status: replay.status });
  const expiredCode = await session.grant(a.id); const idleCode = await session.grant(b.id); const idleCredential = await exchange(endpoint, idleCode); const expiryStart = Date.now(); await Bun.sleep(61000); const expired = await curl(endpoint, '/v1/session', { method: 'POST', body: { code: expiredCode } }); const idle = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: idleCredential }); report('v11.expired-code', expired.status === 401, { waitMs: Date.now() - expiryStart, status: expired.status }); report('v11.idle-credential', idle.status === 401, { waitMs: Date.now() - expiryStart, status: idle.status });
  const liveCode = await session.grant(a.id + ' ' + b.id); const live = await exchange(endpoint, liveCode);
  const mutations = []; for (const path of ['/', '/v1/snapshot', '/v1/children/' + encodeURIComponent(a.id) + '/page', '/v1/children/' + encodeURIComponent(a.id) + '/cancel']) for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) mutations.push(await curl(endpoint, path, { method, credential: live, body: { action: 'abort', childId: a.id } })); const sessionDelete = await curl(endpoint, '/v1/session', { method: 'DELETE', credential: live }); mutations.push(sessionDelete); const badExchange = await curl(endpoint, '/v1/session', { method: 'POST', body: { action: 'abort', credential: live, childId: a.id } }); mutations.push(badExchange); report('v11.mutations', mutations.every(r => [401, 404, 405].includes(r.status)), { requests: mutations.length, statuses: mutations.map(r => r.status) });
  fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ file: a.sessionFile, release: false })); const pendingA = curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page', { credential: live }); await until(() => io().findLast(e => e.op === 'held-read' && e.file === a.sessionFile), 10000, 'A held read'); const pendingB = curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: live }); const resultB = await pendingB; await session.send('/observer revoke ' + a.id); const resultA = await pendingA; const abort = io().findLast(e => e.op === 'held-read-aborted' && e.file === a.sessionFile); fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ release: true })); report('v11.partial-revoke-in-flight', Boolean(abort) && resultA.parsed?.reason === 'cancelled' && resultB.parsed?.kind === 'page', { a: resultA.parsed, b: resultB.parsed ? { kind: resultB.parsed.kind, atEnd: resultB.parsed.atEnd } : null, readAbortLogged: Boolean(abort), bMs: resultB.ms, aMs: resultA.ms });
  const pageB = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: live });
  const browserCode = await session.grant(b.id); const { chromium } = await import('playwright'); const browserDir = join(dir, 'browser-profile'); const browser = await chromium.launchPersistentContext(browserDir, { headless: true, executablePath: process.env.GC2_CHROMIUM, args: ['--no-sandbox'], env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: join(dir, 'browsers') } }); const browserResponses = []; const page = await browser.newPage(); page.on('response', async response => { const headers = await response.allHeaders(); browserResponses.push({ path: new URL(response.url()).pathname, status: response.status(), cache: headers['cache-control'] ?? null }); if (new URL(response.url()).pathname === '/v1/session') { try { const body = await response.json(); secret(body.credential); } catch { } } }); await page.goto(endpoint + '#code=' + browserCode); await page.locator('.select-child').first().waitFor({ timeout: 20000 }); await page.locator('.select-child').first().click(); await page.waitForFunction(() => document.querySelector('#entries').textContent.includes('fanout child complete'), { timeout: 20000 }); const browserState = await page.evaluate(() => ({ url: location.href, title: document.querySelector('#transcript-title').textContent, entries: document.querySelector('#entries').textContent, localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) })); output({ browserState, browserResponses }); await browser.close();
  const matches = []; let scanned = 0; function scan(path) { for (const entry of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, entry.name); if (entry.isDirectory()) scan(file); else if (entry.isFile()) { scanned++; const bytes = fs.readFileSync(file); for (const marker of ['fanout child complete', 'HARNESS_AGENT=child/agent-', 'Run each assigned harness child independently.']) if (bytes.includes(Buffer.from(marker)) || bytes.includes(Buffer.from(marker, 'utf16le'))) matches.push({ path: relative(browserDir, file), marker }); } } } scan(browserDir); report('v08.browser-retention', matches.length === 0 && browserState.entries.includes('fanout child complete'), { scannedProfileFiles: scanned, matches, storage: { local: browserState.localStorage, session: browserState.sessionStorage }, fragmentCleared: !browserState.url.includes('#') }); report('v08.no-store', responses.every(r => r.status === null || r.cache === 'no-store') && browserResponses.every(r => r.cache === 'no-store'), { curlResponses: responses.filter(r => r.status !== null).length, browserResponses }); await rm(browserDir, { recursive: true, force: true });
  const rpcParent = await rpc(p); rpcParent.send({ id: 'rpc-grant', type: 'prompt', message: '/observer grant ' + a.id }); await Bun.sleep(1800); rpcParent.send({ id: 'rpc-status', type: 'prompt', message: '/observer status' }); await Bun.sleep(700); output({ rpcRefusalOutput: rpcParent.text.slice(-5000) }); report('v11.rpc-grant-refused', rpcParent.text.includes('requires interactive tui mode with UI') && !/\/#code=/.test(rpcParent.text), { output: rpcParent.text.slice(-5000), limitation: 'RPC notify payload may not surface; pending code proof follows runtime status only if present.' }); rpcParent.child.kill(); await rpcParent.child.exited;
  const observeCapture = jsonl(p.capture); fs.writeFileSync(join(dir, 'capture-observer.json'), JSON.stringify(observeCapture)); const n = nativeCapture.find(c => c.agent === 'main'); const o = observeCapture.find(c => c.agent === 'main'); const paragraph = 'Use native task to create subagents; Orca orchestration, handoffs, or agent launches happen only when the user explicitly asks for them. Never resume an omp child from Orca\'s session history while its parent session is live. The bridge needs no agent action, and you never handle observer credentials.'; const added = o?.messages.filter(m => !n?.messages.some(x => x.role === m.role && x.byteLength === m.byteLength && x.sha256 === m.sha256)) ?? []; const retained = n?.messages.every(m => o?.messages.some(x => x.role === m.role && x.byteLength === m.byteLength && x.sha256 === m.sha256)); const expectedMessages = [{ role: 'user', content: paragraph }, { role: 'user', content: [{ type: 'text', text: paragraph }] }].map(m => ({ role: m.role, byteLength: Buffer.byteLength(JSON.stringify(m)), sha256: digest(JSON.stringify(m)) })); report('v03.routing-only', retained && added.length === 1 && expectedMessages.some(e => e.byteLength === added[0].byteLength && e.sha256 === added[0].sha256), { nativeMain: n, observerMain: o, paragraphBytes: Buffer.byteLength(paragraph), added, expectedMessages, limitation: 'Initial main provider request compared exactly; later child/tool messages have run-specific native content and are separately retained in raw capture.' });
  const sourceReplacementCode = await session.grant(b.id); const sourceReplacementCredential = await exchange(endpoint, sourceReplacementCode); await session.send('/new', 1500); const replaced = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: sourceReplacementCredential, maxTime: 3 }); report('v11.source-replacement', replaced.exitCode === 7 || [401, 404].includes(replaced.status), { oldEndpointExit: replaced.exitCode, status: replaced.status }); await session.send('/observer status'); await session.send('/gate-stop', 1000); const teardown = JSON.parse(fs.readFileSync(join(dir, 'teardown.json'), 'utf8')); report('v11.teardown-native-isolation', teardown.filesEqual && teardown.registryEqual && teardown.runtimeNull && teardown.coordinator.state === 'unavailable' && teardown.grants.liveCredentials === 0 && teardown.grants.pendingCodes === 0, { ...teardown, nativeFiles: Object.keys(teardown.nativeFiles).length, rows: teardown.rows.length, method: 'Calls the actual stopRuntime through an added diagnostic-only seam in the disposable copy; byte hashes and registry scalar snapshots taken immediately before and after.' }); session.child.kill(); await session.child.exited;
  const allIo = io(); const invalid = transcriptReads(allIo).filter(e => !e.request || !e.request.hasAuthorization || (!e.request.path.startsWith('/v1/children/') && e.request.path !== '/v1/snapshot')); const headerInvalid = transcriptReads(allIo).filter(e => e.module === 'stock-source.ts' && e.request?.path !== '/v1/snapshot'); const rejectedIds = new Set(allIo.filter(e => e.op === 'request-end' && [401, 403, 421].includes(e.status)).map(e => e.request.id)); const rejectedReads = transcriptReads(allIo).filter(e => rejectedIds.has(e.request?.id)); report('nfr-8.authenticated-only', invalid.length === 0 && headerInvalid.length === 0 && rejectedReads.length === 0, { transcriptReads: transcriptReads(allIo).length, headerReads: transcriptReads(allIo).filter(e => e.module === 'stock-source.ts').length, outsideAuthorizedRequest: invalid, headersOutsideSnapshot: headerInvalid, readsInRejectedRequests: rejectedReads });
  const parks = jsonl(join(dir, 'native.jsonl')).flatMap(e => e.rows.filter(r => r.kind === 'sub' && r.status === 'parked').map(r => ({ at: e.at, id: r.id, file: r.sessionFile }))); report('nfr-8.post-request-parking', null, { nativeParkedChildren: new Set(parks.map(r => r.id)).size, reason: 'Selected many-33 children parked during the pre-serve quiet window; request-then-parking is exercised in the many-135 scenario below.' });
  const anonymousNativeFiles = []; function sessionFiles(root) { for (const e of fs.readdirSync(root, { withFileTypes: true })) { const f = join(root, e.name); if (e.isDirectory()) sessionFiles(f); else if (e.isFile() && e.name.endsWith('.jsonl')) anonymousNativeFiles.push(f); } } sessionFiles(p.home); const found = []; for (const f of anonymousNativeFiles) { const text = fs.readFileSync(f, 'utf8'); for (const s of secrets) if (text.includes(s)) found.push(relative(p.home, f)); } const captures = jsonl(p.capture); report('v11.secret-isolation', found.length === 0 && captures.every(c => c.secret_seen === false), { secretCount: secrets.length, nativeJsonlFiles: anonymousNativeFiles.length, matchingFiles: found, stubRequests: captures.length, secretSeenTrue: captures.filter(c => c.secret_seen === true).length, secretSeenMissing: captures.filter(c => c.secret_seen === undefined).length });
  fs.writeFileSync(join(dir, 'phase1.json'), JSON.stringify({ endpoint, allIo, teardown, nativeCapture, observeCapture, responses: responses.map(r => ({ command: normalize(r.command), status: r.status, cache: r.cache, exitCode: r.exitCode, ms: r.ms })), secrets: secrets.length }));
} catch (error) { output({ fatal: String(error), stack: error.stack }); process.exitCode = 1; }
finally { for (const proc of extraProcesses) { proc.kill(); await proc.exited.catch(() => { }); } for (const p of profiles) { const root = p.root; await p.teardown(); output({ cleanup: 'profile ' + p.name, removed: !fs.existsSync(root) }); } fs.rmSync(watch, { force: true }); output({ cleanup: 'watch file', removed: !fs.existsSync(watch) }); }
```

### gate-attempt2.js

SHA256: `7937a3ba50744732867563ce2f9a499709e6e5fbe099dad8d7f1ac2706edac1e`

Invocation: `env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js (attempt 2)`

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cp, rm, symlink } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
const repo = process.cwd(); const dir = new URL('.', import.meta.url).pathname;
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const source = join(repo, 'omp-orca-observer'); const copy = join(dir, 'observer');
const profiles = []; const extraProcesses = []; const secrets = []; const responses = [];
const watch = join(dir, 'watch.json'); fs.writeFileSync(watch, '[]'); fs.writeFileSync(join(dir, 'hold.json'), '{}');
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function normalize(text) { let out = String(text).replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>'); for (const p of profiles) out = out.replaceAll(p.root, '<tmp>/profile-' + p.name); for (const s of secrets) out = out.replaceAll(s, '<secret>'); return out; }
function secret(value) { if (value && !secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); } }
function output(value) { const line = normalize(JSON.stringify(value)); console.log(line); fs.appendFileSync(join(dir, 'results.jsonl'), line + '\n'); }
function report(id, pass, detail) { output({ criterion: id, result: pass === null ? 'UNVERIFIED' : pass ? 'PASS' : 'FAIL', ...detail }); }
function jsonl(path) { try { return fs.readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } }
function io() { return jsonl(join(dir, 'io.jsonl')); }
function clean(text) { return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, ''); }
async function until(check, ms = 30000, label = 'condition') { const end = Date.now() + ms; while (Date.now() < end) { const result = check(); if (result) return result; await Bun.sleep(30); } throw new Error('Timed out: ' + label); }
async function collectStream(stream, consume) { const reader = stream.getReader(); const decoder = new TextDecoder(); while (true) { const { done, value } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); } }
function profileEnv(p) { const env = {}; for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) env[key] = process.env[key]; Object.assign(env, { HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') }); return env; }
async function profile(name) { const p = await create(name); p.name = name; profiles.push(p); return p; }
async function command(p, args) { const r = await p.run(args); output({ command: 'omp --profile ' + p.name + ' ' + args.join(' '), ...r }); assert.equal(r.exitCode, 0); return r; }
async function watchedStub(p) { const proc = Bun.spawn(['bun', 'run', join(source, 'checks/harness/stub-provider.ts'), '--scenario', join(source, 'checks/harness/scenarios', p.name + '.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' }); extraProcesses.push(proc); let text = ''; collectStream(proc.stdout, c => text += c); collectStream(proc.stderr, c => output({ stubStderr: c })); const url = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(text)?.[0], 20000, 'stub URL'); const models = join(p.home, '.omp/profiles', p.name, 'agent/models.yml'); fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replaceAll(p.stubUrl, url)); output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/' + p.name + '.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json', url }); }
async function rpc(p) { const child = p.spawn(['--mode', 'rpc', '--extension', join(dir, 'inspect.ts')]); let text = ''; const events = []; collectStream(child.stdout, c => { text += c; for (const line of c.split('\n')) { try { events.push(JSON.parse(line)); } catch { } } }); collectStream(child.stderr, c => fs.appendFileSync(join(dir, 'rpc.stderr'), normalize(c))); await Bun.sleep(1400); return { child, events, get text() { return text; }, send(message) { child.stdin.write(JSON.stringify(message) + '\n'); child.stdin.flush(); } }; }
async function tui(p, args = []) { const cfg = join(dir, 'pty-' + p.name + '.json'); fs.writeFileSync(cfg, JSON.stringify({ name: p.name, workspace: p.workspace, env: profileEnv(p) })); const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), cfg, '--extension', join(dir, 'inspect.ts'), ...args], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }); extraProcesses.push(child); let raw = ''; let latestCodes = []; collectStream(child.stdout, c => { raw += c; const text = clean(raw); const codes = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)].map(m => m[1]); for (const code of codes) if (!latestCodes.includes(code)) { latestCodes.push(code); secret(code); } fs.writeFileSync(join(dir, 'tui-' + p.name + '.raw'), raw); }); collectStream(child.stderr, c => output({ tuiStderr: c })); await Bun.sleep(2200); const session = { child, p, get text() { return clean(raw); }, get codes() { return latestCodes; }, async send(text, wait = 550) { const start = clean(raw).length; child.stdin.write(text + '\r'); child.stdin.flush(); await Bun.sleep(wait); const out = clean(raw).slice(start); output({ command: 'tui ' + text, output: out.slice(-2400) }); return out; }, async grant(ids, ttl = '') { const before = latestCodes.length; await this.send('/observer grant ' + ids + (ttl ? ' --ttl ' + ttl : '')); return until(() => latestCodes.length > before ? latestCodes.at(-1) : null, 10000, 'grant code'); } }; output({ command: 'python3 <tmp>/pty_driver.py <tmp>/pty-' + p.name + '.json --extension <tmp>/inspect.ts ' + args.join(' '), terminal: { rows: 70, columns: 600 }, startup: session.text.slice(-1600) }); return session; }
async function curl(endpoint, path, options = {}) { const args = ['-sS', '--max-time', String(options.maxTime ?? 20), '-D', '-']; if (options.method) args.push('-X', options.method); if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential); for (const h of options.headers ?? []) args.push('-H', h); if (options.body !== undefined) args.push('--data', JSON.stringify(options.body)); args.push(new URL(path, endpoint).href); const started = Date.now(); const proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]); const match = /HTTP\/\S+ (\d+)/.exec(stdout); const split = stdout.indexOf('\r\n\r\n'); const headers = split < 0 ? '' : stdout.slice(0, split); const body = split < 0 ? stdout : stdout.slice(split + 4); let parsed; try { parsed = JSON.parse(body); } catch { } const result = { status: match ? Number(match[1]) : null, cache: /cache-control:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? null, exitCode, body, parsed, ms: Date.now() - started, command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), stderr }; if (parsed?.credential) secret(parsed.credential); responses.push(result); output({ command: result.command, status: result.status, cache: result.cache, exitCode, ms: result.ms, body: body.length > 500 ? body.slice(0, 500) + ' [body bytes=' + Buffer.byteLength(body) + ', sha256=' + digest(body) + ']' : body, stderr }); return result; }
async function exchange(endpoint, code) { const result = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); assert.equal(result.status, 200); assert.ok(typeof result.parsed.credential === 'string'); return result.parsed.credential; }
function childRows(tag) { return jsonl(join(dir, 'states.jsonl')).findLast(s => s.tag === tag)?.rows.filter(r => r.kind === 'sub') ?? []; }
function transcriptReads(events) { return events.filter(e => ['readSync', 'handle.read', 'readFile', 'readFileSync'].includes(e.op) && e.file?.includes('.jsonl')); }
function network(events) { return events.filter(e => ['fetch', 'Bun.serve'].includes(e.op)); }
async function instrument() { await cp(source, copy, { recursive: true, filter: path => !path.includes('/node_modules') && !path.includes('/checks/evidence') }); await symlink(join(repo, 'node_modules'), join(dir, 'node_modules-repo'), 'dir').catch(() => { }); await symlink(join(repo, 'node_modules'), join(copy, 'node_modules'), 'dir').catch(() => { }); for (const name of ['index.ts', 'commands.ts', 'coordinator.ts', 'guidance.ts', 'auth.ts', 'stock-source.ts', 'reader.ts', 'transport.ts']) { const file = join(copy, name); let text = fs.readFileSync(file, 'utf8'); const before = digest(text); text = 'import { wrapFs, openLogged, fetchLogged, serveLogged, readLogged, note } from "../probe.js";\nconst fetch = fetchLogged(' + JSON.stringify(name) + ');\n' + text; if (name === 'stock-source.ts') text = text.replace('import fs from "node:fs";', 'import realFs from "node:fs";\nconst fs = wrapFs(realFs,"stock-source.ts");'); if (name === 'reader.ts') text = text.replace('import { open } from "node:fs/promises";', 'import { open as realOpen } from "node:fs/promises";\nconst open = openLogged(realOpen,"reader.ts");'); if (name === 'transport.ts') text = text.replace('Bun.serve({ hostname:', 'serveLogged({ hostname:').replace('const result = await options.read(request);', 'const result = await readLogged(request, () => options.read(request));'); if (name === 'index.ts') text = text.replace('runtime = current;', 'runtime = current;\n  globalThis[Symbol.for("gc2.seam")] = { getRuntime: () => runtime, stopRuntime };'); fs.writeFileSync(file, text); output({ instrumented: name, beforeSha256: before, afterSha256: digest(text) }); } }
try {
  await instrument();
  const p = await profile('many-33'); await watchedStub(p);
  await command(p, ['plugin', 'uninstall', 'omp-orca-observer']);
  const baseline = await rpc(p); baseline.send({ id: 'native-main', type: 'prompt', message: 'HARNESS_AGENT=main' }); await Bun.sleep(14000); baseline.child.kill(); await baseline.child.exited;
  const nativeCapture = jsonl(p.capture); fs.writeFileSync(join(dir, 'capture-native.json'), JSON.stringify(nativeCapture)); output({ phase: 'native-baseline', requests: nativeCapture.length, agents: nativeCapture.filter(c => c.agent?.startsWith('child/')).length, firstMain: nativeCapture.find(c => c.agent === 'main') });
  fs.writeFileSync(p.capture, ''); await command(p, ['plugin', 'link', copy]);
  const configFile = join(p.home, '.omp/profiles', p.name, 'agent/config.yml'); const config = JSON.parse(fs.readFileSync(configFile, 'utf8')); config.task.agentIdleTtlMs = 6000; fs.writeFileSync(configFile, JSON.stringify(config));
  const session = await tui(p); await session.send('HARNESS_AGENT=main', 1200); await Bun.sleep(11000); await session.send('/gate-state before-serve');
  const before = io(); report('v03.before-serve', network(before).length === 0 && transcriptReads(before).length === 0, { observerNetwork: network(before).length, observerTranscriptReads: transcriptReads(before).length, ioOperations: before.length });
  const start = Date.now(); await session.send('/observer serve'); const endpoint = await until(() => /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(session.text)?.[1], 10000, 'endpoint URL'); await session.send('/observer serve'); await Bun.sleep(61000); const end = Date.now(); const quiet = io().filter(e => e.at >= start && e.at <= end); report('v03.no-client-60s', transcriptReads(quiet).length === 0 && network(quiet).filter(e => e.op === 'fetch').length === 0, { windowMs: end - start, observerServerStarts: quiet.filter(e => e.op === 'Bun.serve').length, observerFetches: network(quiet).filter(e => e.op === 'fetch').length, observerTranscriptReads: transcriptReads(quiet).length });
  const rows = childRows('before-serve'); assert.ok(rows.length >= 3); const [a, b, c] = rows; output({ nativeInventory: rows.length, selectedChildren: [a, b, c].map(r => ({ id: r.id, status: r.status, sessionFile: r.sessionFile })) });
  const code = await session.grant(a.id + ' ' + b.id); const credential = await exchange(endpoint, code);
  const anon = await curl(endpoint, '/v1/snapshot'); const anonPage = await curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page'); report('v11.anonymous', anon.status === 401 && anonPage.status === 401, { snapshot: anon.status, page: anonPage.status, viewerIsPublicShell: true });
  const host = await curl(endpoint, '/v1/snapshot', { credential, headers: ['Host: unrelated.invalid'] }); report('v11.wrong-host', host.status === 421, { status: host.status });
  const origin = await curl(endpoint, '/v1/snapshot', { credential, headers: ['Origin: https://unrelated.invalid'] }); report('v11.wrong-origin', origin.status === 403, { status: origin.status });
  const excluded = await curl(endpoint, '/v1/children/' + encodeURIComponent(c.id) + '/page', { credential }); report('v11.outside-grant', excluded.status === 401, { child: c.id, status: excluded.status });
  const snapshot = await curl(endpoint, '/v1/snapshot', { credential }); report('v11.snapshot-scope', snapshot.status === 200 && snapshot.parsed.children.every(row => [a.id, b.id].includes(row.childId)) && snapshot.parsed.children.length === 2, { returnedChildren: snapshot.parsed?.children?.map(row => row.childId) });
  const replay = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); report('v11.replayed-code', replay.status === 401, { status: replay.status });
  const expiredCode = await session.grant(a.id); const idleCode = await session.grant(b.id); const idleCredential = await exchange(endpoint, idleCode); const expiryStart = Date.now(); await Bun.sleep(61000); const expired = await curl(endpoint, '/v1/session', { method: 'POST', body: { code: expiredCode } }); const idle = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: idleCredential }); report('v11.expired-code', expired.status === 401, { waitMs: Date.now() - expiryStart, status: expired.status }); report('v11.idle-credential', idle.status === 401, { waitMs: Date.now() - expiryStart, status: idle.status });
  const liveCode = await session.grant(a.id + ' ' + b.id); const live = await exchange(endpoint, liveCode);
  const mutations = []; for (const path of ['/', '/v1/snapshot', '/v1/children/' + encodeURIComponent(a.id) + '/page', '/v1/children/' + encodeURIComponent(a.id) + '/cancel']) for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) mutations.push(await curl(endpoint, path, { method, credential: live, body: { action: 'abort', childId: a.id } })); const sessionDelete = await curl(endpoint, '/v1/session', { method: 'DELETE', credential: live }); mutations.push(sessionDelete); const badExchange = await curl(endpoint, '/v1/session', { method: 'POST', body: { action: 'abort', credential: live, childId: a.id } }); mutations.push(badExchange); report('v11.mutations', mutations.every(r => [401, 404, 405].includes(r.status)), { requests: mutations.length, statuses: mutations.map(r => r.status) });
  fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ file: a.sessionFile, release: false })); const pendingA = curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page', { credential: live }); await until(() => io().findLast(e => e.op === 'held-read' && e.file === a.sessionFile), 10000, 'A held read'); const pendingB = curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: live }); const resultB = await pendingB; await session.send('/observer revoke ' + a.id); const resultA = await pendingA; const abort = io().findLast(e => e.op === 'held-read-aborted' && e.file === a.sessionFile); fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ release: true })); report('v11.partial-revoke-in-flight', Boolean(abort) && resultA.parsed?.reason === 'cancelled' && resultB.parsed?.kind === 'page', { a: resultA.parsed, b: resultB.parsed ? { kind: resultB.parsed.kind, atEnd: resultB.parsed.atEnd } : null, readAbortLogged: Boolean(abort), bMs: resultB.ms, aMs: resultA.ms });
  const pageB = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: live });
  const browserCode = await session.grant(b.id); const { chromium } = await import('playwright'); const browserDir = join(dir, 'browser-profile'); const browser = await chromium.launchPersistentContext(browserDir, { headless: true, executablePath: process.env.GC2_CHROMIUM, args: ['--no-sandbox'], env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: join(dir, 'browsers') } }); const browserResponses = []; const page = await browser.newPage(); page.on('response', async response => { const headers = await response.allHeaders(); browserResponses.push({ path: new URL(response.url()).pathname, status: response.status(), cache: headers['cache-control'] ?? null }); if (new URL(response.url()).pathname === '/v1/session') { try { const body = await response.json(); secret(body.credential); } catch { } } }); await page.goto(endpoint + '#code=' + browserCode); await page.locator('.select-child').first().waitFor({ timeout: 20000 }); await page.locator('.select-child').first().click(); await page.waitForFunction(() => document.querySelector('#entries').textContent.includes('fanout child complete'), { timeout: 20000 }); const browserState = await page.evaluate(() => ({ url: location.href, title: document.querySelector('#transcript-title').textContent, entries: document.querySelector('#entries').textContent, localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) })); output({ browserState, browserResponses }); await browser.close();
  const matches = []; let scanned = 0; function scan(path) { for (const entry of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, entry.name); if (entry.isDirectory()) scan(file); else if (entry.isFile()) { scanned++; const bytes = fs.readFileSync(file); for (const marker of ['fanout child complete', 'HARNESS_AGENT=child/agent-', 'Run each assigned harness child independently.']) if (bytes.includes(Buffer.from(marker)) || bytes.includes(Buffer.from(marker, 'utf16le'))) matches.push({ path: relative(browserDir, file), marker }); } } } scan(browserDir); report('v08.browser-retention', matches.length === 0 && browserState.entries.includes('fanout child complete'), { scannedProfileFiles: scanned, matches, storage: { local: browserState.localStorage, session: browserState.sessionStorage }, fragmentCleared: !browserState.url.includes('#') }); report('v08.no-store', responses.every(r => r.status === null || r.cache === 'no-store') && browserResponses.every(r => r.cache === 'no-store'), { curlResponses: responses.filter(r => r.status !== null).length, browserResponses }); await rm(browserDir, { recursive: true, force: true });
  const rpcParent = await rpc(p); rpcParent.send({ id: 'rpc-grant', type: 'prompt', message: '/observer grant ' + a.id }); await Bun.sleep(1800); rpcParent.send({ id: 'rpc-status', type: 'prompt', message: '/observer status' }); await Bun.sleep(700); output({ rpcRefusalOutput: rpcParent.text.slice(-5000) }); report('v11.rpc-grant-refused', rpcParent.text.includes('requires interactive tui mode with UI') && !/\/#code=/.test(rpcParent.text), { output: rpcParent.text.slice(-5000), limitation: 'RPC notify payload may not surface; pending code proof follows runtime status only if present.' }); rpcParent.child.kill(); await rpcParent.child.exited;
  const observeCapture = jsonl(p.capture); fs.writeFileSync(join(dir, 'capture-observer.json'), JSON.stringify(observeCapture)); const n = nativeCapture.find(c => c.agent === 'main'); const o = observeCapture.find(c => c.agent === 'main'); const paragraph = 'Use native task to create subagents; Orca orchestration, handoffs, or agent launches happen only when the user explicitly asks for them. Never resume an omp child from Orca\'s session history while its parent session is live. The bridge needs no agent action, and you never handle observer credentials.'; const added = o?.messages.filter(m => !n?.messages.some(x => x.role === m.role && x.byteLength === m.byteLength && x.sha256 === m.sha256)) ?? []; const retained = n?.messages.every(m => o?.messages.some(x => x.role === m.role && x.byteLength === m.byteLength && x.sha256 === m.sha256)); const expectedMessages = [{ role: 'user', content: paragraph }, { role: 'user', content: [{ type: 'text', text: paragraph }] }].map(m => ({ role: m.role, byteLength: Buffer.byteLength(JSON.stringify(m)), sha256: digest(JSON.stringify(m)) })); report('v03.routing-only', retained && added.length === 1 && expectedMessages.some(e => e.byteLength === added[0].byteLength && e.sha256 === added[0].sha256), { nativeMain: n, observerMain: o, paragraphBytes: Buffer.byteLength(paragraph), added, expectedMessages, limitation: 'Initial main provider request compared exactly; later child/tool messages have run-specific native content and are separately retained in raw capture.' });
  const sourceReplacementCode = await session.grant(b.id); const sourceReplacementCredential = await exchange(endpoint, sourceReplacementCode); await session.send('/new', 1500); const replaced = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: sourceReplacementCredential, maxTime: 3 }); report('v11.source-replacement', replaced.exitCode === 7 || [401, 404].includes(replaced.status), { oldEndpointExit: replaced.exitCode, status: replaced.status }); await session.send('/observer status'); await session.send('/gate-stop', 1000); const teardown = JSON.parse(fs.readFileSync(join(dir, 'teardown.json'), 'utf8')); report('v11.teardown-native-isolation', teardown.filesEqual && teardown.registryEqual && teardown.runtimeNull && teardown.coordinator.state === 'unavailable' && teardown.grants.liveCredentials === 0 && teardown.grants.pendingCodes === 0, { ...teardown, nativeFiles: Object.keys(teardown.nativeFiles).length, rows: teardown.rows.length, method: 'Calls the actual stopRuntime through an added diagnostic-only seam in the disposable copy; byte hashes and registry scalar snapshots taken immediately before and after.' }); session.child.kill(); await session.child.exited;
  const allIo = io(); const invalid = transcriptReads(allIo).filter(e => !e.request || !e.request.hasAuthorization || (!e.request.path.startsWith('/v1/children/') && e.request.path !== '/v1/snapshot')); const headerInvalid = transcriptReads(allIo).filter(e => e.module === 'stock-source.ts' && e.request?.path !== '/v1/snapshot'); const rejectedIds = new Set(allIo.filter(e => e.op === 'request-end' && [401, 403, 421].includes(e.status)).map(e => e.request.id)); const rejectedReads = transcriptReads(allIo).filter(e => rejectedIds.has(e.request?.id)); report('nfr-8.authenticated-only', invalid.length === 0 && headerInvalid.length === 0 && rejectedReads.length === 0, { transcriptReads: transcriptReads(allIo).length, headerReads: transcriptReads(allIo).filter(e => e.module === 'stock-source.ts').length, outsideAuthorizedRequest: invalid, headersOutsideSnapshot: headerInvalid, readsInRejectedRequests: rejectedReads });
  const parks = jsonl(join(dir, 'native.jsonl')).flatMap(e => e.rows.filter(r => r.kind === 'sub' && r.status === 'parked').map(r => ({ at: e.at, id: r.id, file: r.sessionFile }))); report('nfr-8.post-request-parking', null, { nativeParkedChildren: new Set(parks.map(r => r.id)).size, reason: 'Selected many-33 children parked during the pre-serve quiet window; request-then-parking is exercised in the many-135 scenario below.' });
  const anonymousNativeFiles = []; function sessionFiles(root) { for (const e of fs.readdirSync(root, { withFileTypes: true })) { const f = join(root, e.name); if (e.isDirectory()) sessionFiles(f); else if (e.isFile() && e.name.endsWith('.jsonl')) anonymousNativeFiles.push(f); } } sessionFiles(p.home); const found = []; for (const f of anonymousNativeFiles) { const text = fs.readFileSync(f, 'utf8'); for (const s of secrets) if (text.includes(s)) found.push(relative(p.home, f)); } const captures = jsonl(p.capture); report('v11.secret-isolation', found.length === 0 && captures.every(c => c.secret_seen === false), { secretCount: secrets.length, nativeJsonlFiles: anonymousNativeFiles.length, matchingFiles: found, stubRequests: captures.length, secretSeenTrue: captures.filter(c => c.secret_seen === true).length, secretSeenMissing: captures.filter(c => c.secret_seen === undefined).length });
  fs.writeFileSync(join(dir, 'phase1.json'), JSON.stringify({ endpoint, allIo, teardown, nativeCapture, observeCapture, responses: responses.map(r => ({ command: normalize(r.command), status: r.status, cache: r.cache, exitCode: r.exitCode, ms: r.ms })), secrets: secrets.length }));
} catch (error) { output({ fatal: String(error), stack: error.stack }); process.exitCode = 1; }
finally { for (const proc of extraProcesses) { proc.kill(); await proc.exited.catch(() => { }); } for (const p of profiles) { const root = p.root; await p.teardown(); output({ cleanup: 'profile ' + p.name, removed: !fs.existsSync(root) }); } fs.rmSync(watch, { force: true }); output({ cleanup: 'watch file', removed: !fs.existsSync(watch) }); }
```

### gate.js

SHA256: `0d06a7e124d5d0fd934f8b402d05505767eec8161c6d54937c72b0293bd4b36f`

Invocation: `env GC2_REPO=$PWD PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/bootstrap.js gate.js`

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cp, rm, symlink } from 'node:fs/promises';
import { join, resolve, relative } from 'node:path';
import { createHash } from 'node:crypto';
const repo = process.cwd(); const dir = new URL('.', import.meta.url).pathname;
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const source = join(repo, 'omp-orca-observer'); const copy = join(dir, 'observer');
const profiles = []; const extraProcesses = []; const secrets = []; const responses = [];
const watch = join(dir, 'watch.json'); fs.writeFileSync(watch, '[]'); fs.writeFileSync(join(dir, 'hold.json'), '{}');
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function normalize(text) { let out = String(text).replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>'); for (const p of profiles) out = out.replaceAll(p.root, '<tmp>/profile-' + p.name); for (const s of secrets) out = out.replaceAll(s, '<secret>'); return out; }
function secret(value) { if (value && !secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); } }
function output(value) { const line = normalize(JSON.stringify(value)); console.log(line); fs.appendFileSync(join(dir, 'results.jsonl'), line + '\n'); }
function report(id, pass, detail) { const result = { criterion: id, result: pass === null ? 'UNVERIFIED' : pass ? 'PASS' : 'FAIL', ...detail }; output(result); fs.appendFileSync(join(repo, 'omp-orca-observer/checks/evidence/gc2.md'), '\n### ' + id + ' — ' + result.result + '\n\n```json\n' + normalize(JSON.stringify(result)) + '\n```\n'); }
function jsonl(path) { try { return fs.readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } }
function io() { return jsonl(join(dir, 'io.jsonl')); }
function clean(text) { return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, ''); }
async function until(check, ms = 30000, label = 'condition') { const end = Date.now() + ms; while (Date.now() < end) { const result = check(); if (result) return result; await Bun.sleep(30); } throw new Error('Timed out: ' + label); }
async function collectStream(stream, consume) { const reader = stream.getReader(); const decoder = new TextDecoder(); while (true) { const { done, value } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); } }
function profileEnv(p) { const env = {}; for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) env[key] = process.env[key]; Object.assign(env, { HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') }); return env; }
async function profile(name) { const p = await create(name); p.name = name; profiles.push(p); return p; }
async function command(p, args) { const r = await p.run(args); output({ command: 'omp --profile ' + p.name + ' ' + args.join(' '), ...r }); assert.equal(r.exitCode, 0); return r; }
async function watchedStub(p) { const proc = Bun.spawn(['bun', 'run', join(source, 'checks/harness/stub-provider.ts'), '--scenario', join(source, 'checks/harness/scenarios', p.name + '.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' }); extraProcesses.push(proc); let text = ''; collectStream(proc.stdout, c => text += c); collectStream(proc.stderr, c => output({ stubStderr: c })); const url = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(text)?.[0], 20000, 'stub URL'); const models = join(p.home, '.omp/profiles', p.name, 'agent/models.yml'); fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replace(/baseUrl:\s*http:\/\/127\.0\.0\.1:\d+\/v1/, 'baseUrl: ' + url)); output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/' + p.name + '.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json', url }); }
async function rpc(p) { const child = p.spawn(['--mode', 'rpc', '--extension', join(dir, 'inspect.ts')]); let text = ''; const events = []; collectStream(child.stdout, c => { text += c; for (const line of c.split('\n')) { try { events.push(JSON.parse(line)); } catch { } } }); collectStream(child.stderr, c => fs.appendFileSync(join(dir, 'rpc.stderr'), normalize(c))); await Bun.sleep(1400); return { child, events, get text() { return text; }, send(message) { child.stdin.write(JSON.stringify(message) + '\n'); child.stdin.flush(); } }; }
async function tui(p, args = []) { const cfg = join(dir, 'pty-' + p.name + '.json'); fs.writeFileSync(cfg, JSON.stringify({ name: p.name, workspace: p.workspace, env: profileEnv(p) })); const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), cfg, '--extension', join(dir, 'inspect.ts'), ...args], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }); extraProcesses.push(child); let raw = ''; let latestCodes = []; collectStream(child.stdout, c => { raw += c; const text = clean(raw); const codes = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)].map(m => m[1]); for (const code of codes) if (!latestCodes.includes(code)) { latestCodes.push(code); secret(code); } fs.writeFileSync(join(dir, 'tui-' + p.name + '.raw'), raw); }); collectStream(child.stderr, c => output({ tuiStderr: c })); await Bun.sleep(2200); const session = { child, p, get text() { return clean(raw); }, get codes() { return latestCodes; }, async send(text, wait = 550) { const start = clean(raw).length; child.stdin.write(text + '\r'); child.stdin.flush(); await Bun.sleep(wait); const out = clean(raw).slice(start); output({ command: 'tui ' + text, output: out.slice(-2400) }); return out; }, async grant(ids, ttl = '') { const before = latestCodes.length; await this.send('/observer grant ' + ids + (ttl ? ' --ttl ' + ttl : '')); return until(() => latestCodes.length > before ? latestCodes.at(-1) : null, 10000, 'grant code'); } }; output({ command: 'python3 <tmp>/pty_driver.py <tmp>/pty-' + p.name + '.json --extension <tmp>/inspect.ts ' + args.join(' '), terminal: { rows: 70, columns: 600 }, startup: session.text.slice(-1600) }); return session; }
async function curl(endpoint, path, options = {}) { const args = ['-sS', '--max-time', String(options.maxTime ?? 20), '-D', '-']; if (options.method) args.push('-X', options.method); if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential); for (const h of options.headers ?? []) args.push('-H', h); if (options.body !== undefined) args.push('--data', JSON.stringify(options.body)); args.push(new URL(path, endpoint).href); const started = Date.now(); const proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]); const match = /HTTP\/\S+ (\d+)/.exec(stdout); const split = stdout.indexOf('\r\n\r\n'); const headers = split < 0 ? '' : stdout.slice(0, split); const body = split < 0 ? stdout : stdout.slice(split + 4); let parsed; try { parsed = JSON.parse(body); } catch { } const result = { status: match ? Number(match[1]) : null, cache: /cache-control:\s*([^\r\n]+)/i.exec(headers)?.[1] ?? null, exitCode, body, parsed, ms: Date.now() - started, command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), stderr }; if (parsed?.credential) secret(parsed.credential); responses.push(result); output({ command: result.command, status: result.status, cache: result.cache, exitCode, ms: result.ms, body: body.length > 500 ? body.slice(0, 500) + ' [body bytes=' + Buffer.byteLength(body) + ', sha256=' + digest(body) + ']' : body, stderr }); return result; }
async function exchange(endpoint, code) { const result = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); assert.equal(result.status, 200); assert.ok(typeof result.parsed.credential === 'string'); return result.parsed.credential; }
function childRows(tag) { return jsonl(join(dir, 'states.jsonl')).findLast(s => s.tag === tag)?.rows.filter(r => r.kind === 'sub') ?? []; }
function transcriptReads(events) { return events.filter(e => ['readSync', 'handle.read', 'readFile', 'readFileSync'].includes(e.op) && e.file?.includes('.jsonl')); }
function network(events) { return events.filter(e => ['fetch', 'Bun.serve'].includes(e.op)); }
async function instrument() { await rm(copy, { recursive: true, force: true }); await cp(source, copy, { recursive: true, filter: path => !path.includes('/node_modules') && !path.includes('/checks/evidence') }); await symlink(join(repo, 'node_modules'), join(dir, 'node_modules-repo'), 'dir').catch(() => { }); await symlink(join(repo, 'node_modules'), join(copy, 'node_modules'), 'dir').catch(() => { }); for (const name of ['index.ts', 'commands.ts', 'coordinator.ts', 'guidance.ts', 'auth.ts', 'stock-source.ts', 'reader.ts', 'transport.ts']) { const file = join(copy, name); let text = fs.readFileSync(file, 'utf8'); const before = digest(text); text = 'import { wrapFs, openLogged, fetchLogged, serveLogged, readLogged, note } from "../probe.js";\nconst fetch = fetchLogged(' + JSON.stringify(name) + ');\n' + text; if (name === 'stock-source.ts') text = text.replace('import fs from "node:fs";', 'import realFs from "node:fs";\nconst fs = wrapFs(realFs,"stock-source.ts");'); if (name === 'reader.ts') text = text.replace('import { open } from "node:fs/promises";', 'import { open as realOpen } from "node:fs/promises";\nconst open = openLogged(realOpen,"reader.ts");'); if (name === 'transport.ts') text = text.replace('Bun.serve({ hostname:', 'serveLogged({ hostname:').replace('const result = await options.read(request);', 'const result = await readLogged(request, () => options.read(request));'); if (name === 'index.ts') text = text.replace('runtime = current;', 'runtime = current;\n  globalThis[Symbol.for("gc2.seam")] = { getRuntime: () => runtime, stopRuntime };'); fs.writeFileSync(file, text); output({ instrumented: name, beforeSha256: before, afterSha256: digest(text) }); } }
try {
  await instrument();
  const p = await profile('many-33'); await watchedStub(p);
  await command(p, ['plugin', 'uninstall', 'omp-orca-observer']);
  const baseline = await rpc(p); baseline.send({ id: 'native-main', type: 'prompt', message: 'HARNESS_AGENT=main' }); await Bun.sleep(14000); baseline.child.kill(); await baseline.child.exited;
  const nativeCapture = jsonl(p.capture); fs.writeFileSync(join(dir, 'capture-native.json'), JSON.stringify(nativeCapture)); output({ phase: 'native-baseline', requests: nativeCapture.length, agents: nativeCapture.filter(c => c.agent?.startsWith('child/')).length, firstMain: nativeCapture.find(c => c.agent === 'main') });
  extraProcesses.at(-1).kill(); await extraProcesses.at(-1).exited; fs.writeFileSync(p.capture, ''); await watchedStub(p); await command(p, ['plugin', 'link', copy]);
  const configFile = join(p.home, '.omp/profiles', p.name, 'agent/config.yml'); const config = JSON.parse(fs.readFileSync(configFile, 'utf8')); config.task.agentIdleTtlMs = 6000; config.startup = { setupWizard: false, showSplash: false, checkUpdate: false, quiet: true }; fs.writeFileSync(configFile, JSON.stringify(config));
  const session = await tui(p); await session.send('HARNESS_AGENT=main', 1200); await Bun.sleep(11000); await session.send('/gate-state before-serve');
  const before = io(); report('v03.before-serve', network(before).length === 0 && transcriptReads(before).length === 0, { observerNetwork: network(before).length, observerTranscriptReads: transcriptReads(before).length, ioOperations: before.length });
  const start = Date.now(); await session.send('/observer serve'); const endpoint = await until(() => /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(session.text)?.[1], 10000, 'endpoint URL'); await session.send('/observer serve'); await Bun.sleep(61000); const end = Date.now(); const quiet = io().filter(e => e.at >= start && e.at <= end); report('v03.no-client-60s', transcriptReads(quiet).length === 0 && network(quiet).filter(e => e.op === 'fetch').length === 0, { windowMs: end - start, observerServerStarts: quiet.filter(e => e.op === 'Bun.serve').length, observerFetches: network(quiet).filter(e => e.op === 'fetch').length, observerTranscriptReads: transcriptReads(quiet).length });
  const rows = childRows('before-serve'); assert.ok(rows.length >= 3); const [a, b, c] = rows; output({ nativeInventory: rows.length, selectedChildren: [a, b, c].map(r => ({ id: r.id, status: r.status, sessionFile: r.sessionFile })) });
  const code = await session.grant(a.id + ' ' + b.id); const credential = await exchange(endpoint, code);
  const anon = await curl(endpoint, '/v1/snapshot'); const anonPage = await curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page'); report('v11.anonymous', anon.status === 401 && anonPage.status === 401, { snapshot: anon.status, page: anonPage.status, viewerIsPublicShell: true });
  const host = await curl(endpoint, '/v1/snapshot', { credential, headers: ['Host: unrelated.invalid'] }); report('v11.wrong-host', host.status === 421, { status: host.status });
  const origin = await curl(endpoint, '/v1/snapshot', { credential, headers: ['Origin: https://unrelated.invalid'] }); report('v11.wrong-origin', origin.status === 403, { status: origin.status });
  const excluded = await curl(endpoint, '/v1/children/' + encodeURIComponent(c.id) + '/page', { credential }); report('v11.outside-grant', excluded.status === 401, { child: c.id, status: excluded.status });
  const snapshot = await curl(endpoint, '/v1/snapshot', { credential }); report('v11.snapshot-scope', snapshot.status === 200 && snapshot.parsed.children.every(row => [a.id, b.id].includes(row.childId)) && snapshot.parsed.children.length === 2, { returnedChildren: snapshot.parsed?.children?.map(row => row.childId) });
  const replay = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); report('v11.replayed-code', replay.status === 401, { status: replay.status });
  const expiredCode = await session.grant(a.id); const idleCode = await session.grant(b.id); const idleCredential = await exchange(endpoint, idleCode); const expiryStart = Date.now(); await Bun.sleep(61000); const expired = await curl(endpoint, '/v1/session', { method: 'POST', body: { code: expiredCode } }); const idle = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: idleCredential }); report('v11.expired-code', expired.status === 401, { waitMs: Date.now() - expiryStart, status: expired.status }); report('v11.idle-credential', idle.status === 401, { waitMs: Date.now() - expiryStart, status: idle.status });
  const liveCode = await session.grant(a.id + ' ' + b.id); const live = await exchange(endpoint, liveCode);
  const mutations = []; for (const path of ['/', '/v1/snapshot', '/v1/children/' + encodeURIComponent(a.id) + '/page', '/v1/children/' + encodeURIComponent(a.id) + '/cancel']) for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) mutations.push(await curl(endpoint, path, { method, credential: live, body: { action: 'abort', childId: a.id } })); const sessionDelete = await curl(endpoint, '/v1/session', { method: 'DELETE', credential: live }); mutations.push(sessionDelete); const badExchange = await curl(endpoint, '/v1/session', { method: 'POST', body: { action: 'abort', credential: live, childId: a.id } }); mutations.push(badExchange); report('v11.mutations', mutations.every(r => [401, 404, 405].includes(r.status)), { requests: mutations.length, statuses: mutations.map(r => r.status) });
  fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ file: a.sessionFile, release: false })); const pendingA = curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page', { credential: live }); await until(() => io().findLast(e => e.op === 'held-read' && e.file === a.sessionFile), 10000, 'A held read'); const pendingB = curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: live }); const resultB = await pendingB; await session.send('/observer revoke ' + a.id); const resultA = await pendingA; const abort = io().findLast(e => e.op === 'held-read-aborted' && e.file === a.sessionFile); fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ release: true })); report('v11.partial-revoke-in-flight', Boolean(abort) && resultA.parsed?.reason === 'cancelled' && resultB.parsed?.kind === 'page', { a: resultA.parsed, b: resultB.parsed ? { kind: resultB.parsed.kind, atEnd: resultB.parsed.atEnd } : null, readAbortLogged: Boolean(abort), bMs: resultB.ms, aMs: resultA.ms });
  const pageB = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: live });
  const browserCode = await session.grant(b.id); const { chromium } = await import('playwright'); const browserDir = join(dir, 'browser-profile'); const browser = await chromium.launchPersistentContext(browserDir, { headless: true, executablePath: process.env.GC2_CHROMIUM, args: ['--no-sandbox'], env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: join(dir, 'browsers') } }); const browserResponses = []; const page = await browser.newPage(); page.on('response', async response => { const headers = await response.allHeaders(); browserResponses.push({ path: new URL(response.url()).pathname, status: response.status(), cache: headers['cache-control'] ?? null }); if (new URL(response.url()).pathname === '/v1/session') { try { const body = await response.json(); secret(body.credential); } catch { } } }); await page.goto(endpoint + '#code=' + browserCode); await page.locator('.select-child').first().waitFor({ timeout: 20000 }); await page.locator('.select-child').first().click(); await page.waitForFunction(() => document.querySelector('#entries').textContent.includes('fanout child complete'), { timeout: 20000 }); const browserState = await page.evaluate(() => ({ url: location.href, title: document.querySelector('#transcript-title').textContent, entries: document.querySelector('#entries').textContent, localStorage: Object.keys(localStorage), sessionStorage: Object.keys(sessionStorage) })); output({ browserState, browserResponses }); await browser.close();
  const matches = []; let scanned = 0; function scan(path) { for (const entry of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, entry.name); if (entry.isDirectory()) scan(file); else if (entry.isFile()) { scanned++; const bytes = fs.readFileSync(file); for (const marker of ['fanout child complete', 'HARNESS_AGENT=child/agent-', 'Run each assigned harness child independently.']) if (bytes.includes(Buffer.from(marker)) || bytes.includes(Buffer.from(marker, 'utf16le'))) matches.push({ path: relative(browserDir, file), marker }); } } } scan(browserDir); report('v08.browser-retention', matches.length === 0 && browserState.entries.includes('fanout child complete'), { scannedProfileFiles: scanned, matches, storage: { local: browserState.localStorage, session: browserState.sessionStorage }, fragmentCleared: !browserState.url.includes('#') }); report('v08.no-store', responses.every(r => r.status === null || r.cache === 'no-store') && browserResponses.every(r => r.cache === 'no-store'), { curlResponses: responses.filter(r => r.status !== null).length, browserResponses }); await rm(browserDir, { recursive: true, force: true });
  const rpcParent = await rpc(p); rpcParent.send({ id: 'rpc-grant', type: 'prompt', message: '/observer grant ' + a.id }); await Bun.sleep(1800); rpcParent.send({ id: 'rpc-status', type: 'prompt', message: '/observer status' }); await Bun.sleep(700); output({ rpcRefusalOutput: rpcParent.text.slice(-5000) }); report('v11.rpc-grant-refused', rpcParent.text.includes('requires interactive tui mode with UI') && !/\/#code=/.test(rpcParent.text), { output: rpcParent.text.slice(-5000), limitation: 'RPC notify payload may not surface; pending code proof follows runtime status only if present.' }); rpcParent.child.kill(); await rpcParent.child.exited;
  const observeCapture = jsonl(p.capture); fs.writeFileSync(join(dir, 'capture-observer.json'), JSON.stringify(observeCapture)); const n = nativeCapture.find(c => c.agent === 'main'); const o = observeCapture.find(c => c.agent === 'main'); const paragraph = 'Use native task to create subagents; Orca orchestration, handoffs, or agent launches happen only when the user explicitly asks for them. Never resume an omp child from Orca\'s session history while its parent session is live. The bridge needs no agent action, and you never handle observer credentials.'; const added = o?.messages.filter(m => !n?.messages.some(x => x.role === m.role && x.byteLength === m.byteLength && x.sha256 === m.sha256)) ?? []; const retained = n?.messages.every(m => o?.messages.some(x => x.role === m.role && x.byteLength === m.byteLength && x.sha256 === m.sha256)); const expectedMessages = [{ role: 'user', content: paragraph }, { role: 'user', content: [{ type: 'text', text: paragraph }] }].map(m => ({ role: m.role, byteLength: Buffer.byteLength(JSON.stringify(m)), sha256: digest(JSON.stringify(m)) })); report('v03.routing-only', retained && added.length === 1 && expectedMessages.some(e => e.byteLength === added[0].byteLength && e.sha256 === added[0].sha256), { nativeMain: n, observerMain: o, paragraphBytes: Buffer.byteLength(paragraph), added, expectedMessages, limitation: 'Initial main provider request compared exactly; later child/tool messages have run-specific native content and are separately retained in raw capture.' });
  const sourceReplacementCode = await session.grant(b.id); const sourceReplacementCredential = await exchange(endpoint, sourceReplacementCode); await session.send('/new', 1500); const replaced = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential: sourceReplacementCredential, maxTime: 3 }); report('v11.source-replacement', replaced.exitCode === 7 || [401, 404].includes(replaced.status), { oldEndpointExit: replaced.exitCode, status: replaced.status }); await session.send('/observer status'); await session.send('/gate-stop', 1000); const teardown = JSON.parse(fs.readFileSync(join(dir, 'teardown.json'), 'utf8')); report('v11.teardown-native-isolation', teardown.filesEqual && teardown.registryEqual && teardown.runtimeNull && teardown.coordinator.state === 'unavailable' && teardown.grants.liveCredentials === 0 && teardown.grants.pendingCodes === 0, { ...teardown, nativeFiles: Object.keys(teardown.nativeFiles).length, rows: teardown.rows.length, method: 'Calls the actual stopRuntime through an added diagnostic-only seam in the disposable copy; byte hashes and registry scalar snapshots taken immediately before and after.' }); session.child.kill(); await session.child.exited;
  const allIo = io(); const invalid = transcriptReads(allIo).filter(e => !e.request || !e.request.hasAuthorization || (!e.request.path.startsWith('/v1/children/') && e.request.path !== '/v1/snapshot')); const headerInvalid = transcriptReads(allIo).filter(e => e.module === 'stock-source.ts' && e.request?.path !== '/v1/snapshot'); const rejectedIds = new Set(allIo.filter(e => e.op === 'request-end' && [401, 403, 421].includes(e.status)).map(e => e.request.id)); const rejectedReads = transcriptReads(allIo).filter(e => rejectedIds.has(e.request?.id)); report('nfr-8.authenticated-only', invalid.length === 0 && headerInvalid.length === 0 && rejectedReads.length === 0, { transcriptReads: transcriptReads(allIo).length, headerReads: transcriptReads(allIo).filter(e => e.module === 'stock-source.ts').length, outsideAuthorizedRequest: invalid, headersOutsideSnapshot: headerInvalid, readsInRejectedRequests: rejectedReads });
  const parks = jsonl(join(dir, 'native.jsonl')).flatMap(e => e.rows.filter(r => r.kind === 'sub' && r.status === 'parked').map(r => ({ at: e.at, id: r.id, file: r.sessionFile }))); report('nfr-8.post-request-parking', null, { nativeParkedChildren: new Set(parks.map(r => r.id)).size, reason: 'Selected many-33 children parked during the pre-serve quiet window; request-then-parking is exercised in the many-135 scenario below.' });
  const anonymousNativeFiles = []; function sessionFiles(root) { for (const e of fs.readdirSync(root, { withFileTypes: true })) { const f = join(root, e.name); if (e.isDirectory()) sessionFiles(f); else if (e.isFile() && e.name.endsWith('.jsonl')) anonymousNativeFiles.push(f); } } sessionFiles(p.home); const found = []; for (const f of anonymousNativeFiles) { const text = fs.readFileSync(f, 'utf8'); for (const s of secrets) if (text.includes(s)) found.push(relative(p.home, f)); } const captures = jsonl(p.capture); report('v11.secret-isolation', found.length === 0 && captures.every(c => c.secret_seen === false), { secretCount: secrets.length, nativeJsonlFiles: anonymousNativeFiles.length, matchingFiles: found, stubRequests: captures.length, secretSeenTrue: captures.filter(c => c.secret_seen === true).length, secretSeenMissing: captures.filter(c => c.secret_seen === undefined).length });
  fs.writeFileSync(join(dir, 'phase1.json'), JSON.stringify({ endpoint, allIo, teardown, nativeCapture, observeCapture, responses: responses.map(r => ({ command: normalize(r.command), status: r.status, cache: r.cache, exitCode: r.exitCode, ms: r.ms })), secrets: secrets.length }));
} catch (error) { output({ fatal: String(error), stack: error.stack }); process.exitCode = 1; }
finally { for (const proc of extraProcesses) { proc.kill(); await proc.exited.catch(() => { }); } for (const p of profiles) { const root = p.root; await p.teardown(); output({ cleanup: 'profile ' + p.name, removed: !fs.existsSync(root) }); } fs.rmSync(watch, { force: true }); output({ cleanup: 'watch file', removed: !fs.existsSync(watch) }); }
```

### plugin-help.js

SHA256: `e457d05e6c679ea913802936bf61b6c37752564182c23533ef2df81322384e40`

Invocation: `bun run <tmp>/plugin-help.js`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
const repo = process.cwd(), dir = new URL('.', import.meta.url).pathname;
fs.copyFileSync(join(dir, 'gate.js'), join(dir, 'gate-attempt1.js'));
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const p = await create('many-33');
try {
  for (const args of [['plugin', 'uninstall', '--help'], ['plugin', 'list']]) {
    const result = await p.run(args); console.log(JSON.stringify({ command: 'omp --profile many-33 ' + args.join(' '), ...result }).replaceAll(p.root, '<tmp>/profile').replaceAll(repo, '$PWD'));
  }
} finally { const root = p.root; await p.teardown(); console.log(JSON.stringify({ cleanup: !fs.existsSync(root) })); }
```

### snapshot.js

SHA256: `4754c6c0e9cfac766d6dfa03f392cd81b0781d51a783f141670c01c7098530f2`

Invocation: `bun run <tmp>/snapshot.js`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
const dir = new URL('.', import.meta.url).pathname;
fs.copyFileSync(join(dir, 'gate.js'), join(dir, 'gate-attempt2.js'));
console.log('saved gate-attempt2.js before runner correction');
```

### bootstrap.js

SHA256: `d9e2ea1229d2e2ebcb279e94e123fa1060e1ea435ec0d37d7c34c7af8d4d6d6b`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/bootstrap.js <runner>`

```javascript
if (!process.env.GC2_REPO) throw new Error('GC2_REPO is required');
process.chdir(process.env.GC2_REPO);
await import(new URL(process.argv[2], import.meta.url).href);
```

### record.js

SHA256: `99386c0b39966bffcc8c0d8b9a8cfb4331d837a3e674b297b5e85bc7b7bb85af`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/record.js phase1`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const dir = new URL('.', import.meta.url).pathname;
const repo = process.env.GC2_REPO;
if (!repo) throw new Error('GC2_REPO is required');
const evidence = join(repo, 'omp-orca-observer/checks/evidence/gc2.md');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const stage = process.argv[2];
const sources = stage === 'phase1' ? ['pty_driver.py', 'probe.js', 'inspect.ts', 'gate-attempt1.js', 'gate-attempt2.js', 'gate.js', 'plugin-help.js', 'snapshot.js', 'bootstrap.js', 'record.js'] : ['phase2.js'];
const invoked = {
  'gate-attempt1.js': 'env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js (attempt 1)',
  'gate-attempt2.js': 'env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js (attempt 2)',
  'gate.js': 'env GC2_REPO=$PWD PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/bootstrap.js gate.js',
  'phase2.js': 'env GC2_REPO=$PWD bun run <tmp>/bootstrap.js phase2.js',
  'plugin-help.js': 'bun run <tmp>/plugin-help.js',
  'snapshot.js': 'bun run <tmp>/snapshot.js',
  'bootstrap.js': 'env GC2_REPO=$PWD bun run <tmp>/bootstrap.js <runner>',
  'pty_driver.py': 'python3 <tmp>/pty_driver.py <tmp>/pty-<scenario>.json --extension <tmp>/inspect.ts [--session <native-session>]',
  'probe.js': 'imported only by instrumented observer modules in disposable profiles',
  'inspect.ts': 'omp --profile <scenario> --extension <tmp>/inspect.ts [--mode rpc]',
  'record.js': 'env GC2_REPO=$PWD bun run <tmp>/record.js ' + stage
};
fs.appendFileSync(evidence, '\n## Reproducible ' + stage + ' sources\n\nScripts are reproduced from the exact on-disk bytes; the digests below are of those bytes, not of a pretty-printed rendering. `bootstrap.js` moves only its own process working directory, not its environment. All omp children still receive the harness disposable environment at process start.\n');
for (const name of sources) { const bytes = fs.readFileSync(join(dir, name)); fs.appendFileSync(evidence, '\n### ' + name + '\n\nSHA256: `' + hash(bytes) + '`\n\nInvocation: `' + invoked[name] + '`\n\n```' + (name.endsWith('.py') ? 'python' : 'javascript') + '\n' + bytes.toString('utf8') + '```\n'); }
const log = join(dir, stage === 'phase1' ? 'results.jsonl' : 'phase2-results.jsonl');
if (fs.existsSync(log)) { const bytes = fs.readFileSync(log); fs.appendFileSync(evidence, '\n## ' + stage + ' normalized runner output\n\nSHA256 of the complete normalized JSONL output: `' + hash(bytes) + '`. No lines are omitted. Long terminal redraws are the runner\'s observed output excerpts, not elided report lines.\n\n```jsonl\n' + bytes.toString('utf8') + '```\n'); }
for (const name of ['io.jsonl', 'native.jsonl']) if (fs.existsSync(join(dir, name))) { const bytes = fs.readFileSync(join(dir, name)); fs.appendFileSync(evidence, '\nCounter-log receipt ' + name + ': raw SHA256 `' + hash(bytes) + '`; bytes=' + bytes.length + '; lines=' + bytes.toString('utf8').split('\n').filter(Boolean).length + '. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.\n'); }
console.log(JSON.stringify({ stage, evidence: 'omp-orca-observer/checks/evidence/gc2.md', sources, bytes: fs.statSync(evidence).size }));
```

## phase1 normalized runner output

SHA256 of the complete normalized JSONL output: `789145f23e46a221fb24ecb0da329c0b3407a138b1d54897844f4f3decf759e7`. No lines are omitted. Long terminal redraws are the runner's observed output excerpts, not elided report lines.

```jsonl
{"instrumented":"index.ts","beforeSha256":"10835d71838e83a4da45d2989980c2720e89946f17da84790cd2ae42ec642d15","afterSha256":"5616c86bb7ed5b798e212b3692cba1ef3d2c6e198accaa404f5811b750bb3366"}
{"instrumented":"commands.ts","beforeSha256":"5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9","afterSha256":"adddf400ee57e2607c078f7d83719df43bb776a143f5097302e96bd093b10b8b"}
{"instrumented":"coordinator.ts","beforeSha256":"196d7565c21484e2c7747f4b93882b9b3ae2c7f56fe649e02657343be662aec5","afterSha256":"2d37a34abae47c8791f9a0e918be4f80d44a656e8a92d9ba586ff1d7dc349f60"}
{"instrumented":"guidance.ts","beforeSha256":"d2d8a497c1194e4449aa6cce7b3df723d1b500f1520e61e213ba1308267e7292","afterSha256":"c12011dc7ec425d7e6d55cd867579437be839e25c25566ed90fd2a7ef826b068"}
{"instrumented":"auth.ts","beforeSha256":"fa9e97e61c8ffd4b33e005c1c05b0afdbf455f5507c42ef85029c1230b8c7008","afterSha256":"d6388daa0fa2db39889c6f6a74ca43cb4c86a0270da5f00cc4ab05547692a931"}
{"instrumented":"stock-source.ts","beforeSha256":"a3053d7c13fff7e05a6ff0d4b8d395c5abebfacf80f03adc94e3a02716902b72","afterSha256":"d4bacc8f0bfa017b8406fe7d377d27cb29acd13ecf1b4553e7c3911a83cbfbed"}
{"instrumented":"reader.ts","beforeSha256":"4a8e1f2349f9a2f4a207a1cb520d3ddbcade5cac8dc8d078f20d16ecd22bc0d0","afterSha256":"fa8637288fbf2c22a4855fddcc88a5f94d41ed8174142c57a77126f64f88586d"}
{"instrumented":"transport.ts","beforeSha256":"c23255f7b2c553ccc6ddb2aed4cee71a32af91d2d2a2c02756a015d122be0b41","afterSha256":"91f0c813f1cfb4f9e40ddda5ab10bd90e7936746a27b2629a87dcfd32d3de69d"}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json","url":"http://127.0.0.1:37099/v1"}
{"command":"omp --profile many-33 plugin unlink $PWD/omp-orca-observer","exitCode":1,"stdout":"","stderr":"error: Expected action to be one of: install, uninstall, list, link, doctor, features, config, enable, disable, marketplace, discover, upgrade; got \"unlink\"\n\nUSAGE\n  $ omp plugin [ACTION] [TARGETS...] [FLAGS]\n\nRun `omp plugin --help` for details.\n"}
{"fatal":"AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 0\n","stack":"AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:\n\n1 !== 0\n\n    at command (<tmp>gate.js:23:148)\n    at processTicksAndRejections (native:7:39)"}
{"cleanup":"profile many-33","removed":true}
{"cleanup":"watch file","removed":true}
{"instrumented":"index.ts","beforeSha256":"5616c86bb7ed5b798e212b3692cba1ef3d2c6e198accaa404f5811b750bb3366","afterSha256":"6eb6d7264d1d02f3dff99ea70598f0aaa75a2fb1704f249e220bf9dea8cc3736"}
{"instrumented":"commands.ts","beforeSha256":"adddf400ee57e2607c078f7d83719df43bb776a143f5097302e96bd093b10b8b","afterSha256":"2ac3404f7b26d9865246b0a8aec986806a8b595e841cee0f1c040a135efa9e7b"}
{"instrumented":"coordinator.ts","beforeSha256":"2d37a34abae47c8791f9a0e918be4f80d44a656e8a92d9ba586ff1d7dc349f60","afterSha256":"ff05b28188527b824a024312fbe3e91d8312974b619698753ada9935a5162720"}
{"instrumented":"guidance.ts","beforeSha256":"c12011dc7ec425d7e6d55cd867579437be839e25c25566ed90fd2a7ef826b068","afterSha256":"dd5993beb79f8c98b52f330a26ebf363fdfebdd1fd70c772433faca79216b1c6"}
{"instrumented":"auth.ts","beforeSha256":"d6388daa0fa2db39889c6f6a74ca43cb4c86a0270da5f00cc4ab05547692a931","afterSha256":"240bf9fac0eb20ff0cff373dd8687a9edbe75328bea9a3929128e92244acc1d4"}
{"instrumented":"stock-source.ts","beforeSha256":"d4bacc8f0bfa017b8406fe7d377d27cb29acd13ecf1b4553e7c3911a83cbfbed","afterSha256":"dbb8a8e16763b20328b1301c6361dc1ba87774a21e81e5d5160df82e0c6734de"}
{"instrumented":"reader.ts","beforeSha256":"fa8637288fbf2c22a4855fddcc88a5f94d41ed8174142c57a77126f64f88586d","afterSha256":"10172444b047b9e6d52c9cdfb9c1cca42a9056864650b2cd14a82702e00e40b2"}
{"instrumented":"transport.ts","beforeSha256":"91f0c813f1cfb4f9e40ddda5ab10bd90e7936746a27b2629a87dcfd32d3de69d","afterSha256":"a8b137fa332c88c76ea99f4d1f4db2a0332c0f13bddf76f507f160d40bc09b1f"}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json","url":"http://127.0.0.1:34133/v1"}
{"command":"omp --profile many-33 plugin uninstall omp-orca-observer","exitCode":0,"stdout":"✔ Uninstalled omp-orca-observer\n","stderr":""}
{"phase":"native-baseline","requests":82,"agents":33,"firstMain":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":10733,"sha256":"0145f34a061b6216b83191f2fbb7260e584c040f7762d769bb3a57b7d61cca6e"},{"role":"user","byteLength":269,"sha256":"e52f8a777bcafd5bdbb92004e07867cc562dcad77d5690baf8fb9ee28f3a28bf"}],"secret_seen":false,"status":200}}
{"command":"omp --profile many-33 plugin link <tmp>observer","exitCode":0,"stdout":"✔ Linked omp-orca-observer from <tmp>observer\n","stderr":""}
{"command":"python3 <tmp>/pty_driver.py <tmp>/pty-many-33.json --extension <tmp>/inspect.ts ","terminal":{"rows":70,"columns":600},"startup":"░                    ░░░░▒▒░▒░░░░░                                    ░░░░░░░░░░░▒▒▒▒▒▒▒▒▒▒░░░ ░░░░░░░░▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░              ░░                    ░░░░░░░▒▒▒░░░░                   ░░░░░░░░░░░                     ░░ ░░░░                 ░ ░  ░                        ░░ ░                                                                                                                  \r                                                                                                                                                 ░                   ░░░░░░░░                      ░░░░░░░░░                      ░░░░░░░░  ░      ░░                              ░░░░░░░░░░░░░░▒░░░░░░ ░    ░░░░░▒▒▒▒▒▒▒░░░░                                        ░ ░░░░░░░▒░░░░░░░                     ░░░░░░░░░                      ░░░░░                    ░░                            ░░                                                                                                                    \r                                                                                                                                                                      ░░░░░  ░                     ░░░░░░░░░                       ░░░░░░░       ░░░░░░░░░                            ░░░ ░       ░ press ⏎ to skip ░░░░░░                                        ░ ░░░░░░░░░░░░░░░░                   ░░░░░░░░░░░░                       ░ ░ ░░                  ░ ░░                         ░░░                                                                                                                      \r"}
{"command":"tui HARNESS_AGENT=main","output":"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        \r                                                                                                                                                                      ░ ░ ░                  ░░░░░░░░    ░                 ░░░ ░░  ░       ░░ ░                              ░░░░░░░░░░▒░▒▒▒▒░░░ ░   ░░░░▒▒▒▒▒▒▒▒▒▒▒▒░░░░░░░░░░░░     ░  ░░░░░░░░                       ░░░░▒▒░░░░                          ░░░░                                                                                                                                                                                                        \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        \r"}
{"command":"tui /gate-state before-serve","output":"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        \r"}
{"criterion":"v03.before-serve","result":"PASS","observerNetwork":0,"observerTranscriptReads":0,"ioOperations":0}
{"command":"tui /observer serve","output":"    │ Search: /gate-state before-serve/observer serve                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │    \r"}
{"fatal":"Error: Timed out: endpoint URL","stack":"Error: Timed out: endpoint URL\n    at until (<tmp>gate.js:19:204)\n    at processTicksAndRejections (native:7:39)"}
{"cleanup":"profile many-33","removed":true}
{"cleanup":"watch file","removed":true}
{"instrumented":"index.ts","beforeSha256":"10835d71838e83a4da45d2989980c2720e89946f17da84790cd2ae42ec642d15","afterSha256":"5616c86bb7ed5b798e212b3692cba1ef3d2c6e198accaa404f5811b750bb3366"}
{"instrumented":"commands.ts","beforeSha256":"5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9","afterSha256":"adddf400ee57e2607c078f7d83719df43bb776a143f5097302e96bd093b10b8b"}
{"instrumented":"coordinator.ts","beforeSha256":"196d7565c21484e2c7747f4b93882b9b3ae2c7f56fe649e02657343be662aec5","afterSha256":"2d37a34abae47c8791f9a0e918be4f80d44a656e8a92d9ba586ff1d7dc349f60"}
{"instrumented":"guidance.ts","beforeSha256":"d2d8a497c1194e4449aa6cce7b3df723d1b500f1520e61e213ba1308267e7292","afterSha256":"c12011dc7ec425d7e6d55cd867579437be839e25c25566ed90fd2a7ef826b068"}
{"instrumented":"auth.ts","beforeSha256":"fa9e97e61c8ffd4b33e005c1c05b0afdbf455f5507c42ef85029c1230b8c7008","afterSha256":"d6388daa0fa2db39889c6f6a74ca43cb4c86a0270da5f00cc4ab05547692a931"}
{"instrumented":"stock-source.ts","beforeSha256":"a3053d7c13fff7e05a6ff0d4b8d395c5abebfacf80f03adc94e3a02716902b72","afterSha256":"d4bacc8f0bfa017b8406fe7d377d27cb29acd13ecf1b4553e7c3911a83cbfbed"}
{"instrumented":"reader.ts","beforeSha256":"4a8e1f2349f9a2f4a207a1cb520d3ddbcade5cac8dc8d078f20d16ecd22bc0d0","afterSha256":"fa8637288fbf2c22a4855fddcc88a5f94d41ed8174142c57a77126f64f88586d"}
{"instrumented":"transport.ts","beforeSha256":"c23255f7b2c553ccc6ddb2aed4cee71a32af91d2d2a2c02756a015d122be0b41","afterSha256":"91f0c813f1cfb4f9e40ddda5ab10bd90e7936746a27b2629a87dcfd32d3de69d"}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json","url":"http://127.0.0.1:38789/v1"}
{"command":"omp --profile many-33 plugin uninstall omp-orca-observer","exitCode":0,"stdout":"✔ Uninstalled omp-orca-observer\n","stderr":""}
{"phase":"native-baseline","requests":79,"agents":33,"firstMain":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":10733,"sha256":"0145f34a061b6216b83191f2fbb7260e584c040f7762d769bb3a57b7d61cca6e"},{"role":"user","byteLength":269,"sha256":"35d6971dda60e9bd6b98cb07772f0463fc5ff196e596e556d7ea2db6711aa0d1"}],"secret_seen":false,"status":200}}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch.json","url":"http://127.0.0.1:35255/v1"}
{"command":"omp --profile many-33 plugin link <tmp>observer","exitCode":0,"stdout":"✔ Linked omp-orca-observer from <tmp>observer\n","stderr":""}
{"command":"python3 <tmp>/pty_driver.py <tmp>/pty-many-33.json --extension <tmp>/inspect.ts ","terminal":{"rows":70,"columns":600},"startup":"\u001b>25a1;stsp;q;{\"q\":\"hello\",\"v\":[1],\"app\":\"omp\"}\r\r\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\r"}
{"command":"tui HARNESS_AGENT=main","output":"⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25 \r ⠼ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25 \r ⠴ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25 \r ⠦ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25 \r"}
{"command":"tui /gate-state before-serve","output":"──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\r\r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\r π > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"criterion":"v03.before-serve","result":"PASS","observerNetwork":0,"observerTranscriptReads":0,"ioOperations":1110}
{"command":"tui /observer serve","output":" observer serving: http://127.0.0.1:41345/                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              \r"}
{"command":"tui /observer serve","output":""}
{"criterion":"v03.no-client-60s","result":"PASS","windowMs":62120,"observerServerStarts":1,"observerFetches":0,"observerTranscriptReads":0}
{"nativeInventory":33,"selectedChildren":[{"id":"agent-1","status":"parked","sessionFile":"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2/agent-1.jsonl"},{"id":"agent-10","status":"parked","sessionFile":"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2/agent-10.jsonl"},{"id":"agent-11","status":"parked","sessionFile":"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2/agent-11.jsonl"}]}
{"command":"tui /observer grant agent-1 agent-10","output":" http://127.0.0.1:41345/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":200,"cache":"no-store","exitCode":0,"ms":63,"body":"{\"credential\":\"<secret>\",\"expiresAt\":\"2026-10-01T06:23:57.826Z\",\"schema\":1,\"epoch\":\"53ffaa2e-6a0d-4c9a-a8da-546e49c992cb\"}","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"http://127.0.0.1:41345/v1/snapshot\"","status":401,"cache":"no-store","exitCode":0,"ms":5,"body":"Unauthorized","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"http://127.0.0.1:41345/v1/children/agent-1/page\"","status":401,"cache":"no-store","exitCode":0,"ms":6,"body":"Unauthorized","stderr":""}
{"criterion":"v11.anonymous","result":"PASS","snapshot":401,"page":401,"viewerIsPublicShell":true}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"-H\" \"Host: unrelated.invalid\" \"http://127.0.0.1:41345/v1/snapshot\"","status":421,"cache":"no-store","exitCode":0,"ms":4,"body":"Misdirected Request","stderr":""}
{"criterion":"v11.wrong-host","result":"PASS","status":421}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"-H\" \"Origin: https://unrelated.invalid\" \"http://127.0.0.1:41345/v1/snapshot\"","status":403,"cache":"no-store","exitCode":0,"ms":4,"body":"Forbidden","stderr":""}
{"criterion":"v11.wrong-origin","result":"PASS","status":403}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/children/agent-11/page\"","status":401,"cache":"no-store","exitCode":0,"ms":5,"body":"Unauthorized","stderr":""}
{"criterion":"v11.outside-grant","result":"PASS","child":"agent-11","status":401}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/snapshot\"","status":200,"cache":"no-store","exitCode":0,"ms":6,"body":"{\"schema\":1,\"epoch\":\"53ffaa2e-6a0d-4c9a-a8da-546e49c992cb\",\"generation\":27,\"observedAt\":\"2026-10-01T05:53:54.809Z\",\"rootSession\":{\"known\":true,\"value\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2.jsonl\"},\"inventory\":{\"state\":\"complete\"},\"children\":[{\"childId\":\"agent-1\",\"parentId\":\"Main\",\"rootSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sess [body bytes=3248, sha256=7883d25d0300c3b0e61d3e67acba950cd3f1f81e9f50fff0e2a9675014051c66]","stderr":""}
{"criterion":"v11.snapshot-scope","result":"PASS","returnedChildren":["agent-1","agent-10"]}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":401,"cache":"no-store","exitCode":0,"ms":5,"body":"Unauthorized","stderr":""}
{"criterion":"v11.replayed-code","result":"PASS","status":401}
{"command":"tui /observer grant agent-1","output":" http://127.0.0.1:41345/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"command":"tui /observer grant agent-10","output":" http://127.0.0.1:41345/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":200,"cache":"no-store","exitCode":0,"ms":7,"body":"{\"credential\":\"<secret>\",\"expiresAt\":\"2026-10-01T06:23:58.977Z\",\"schema\":1,\"epoch\":\"53ffaa2e-6a0d-4c9a-a8da-546e49c992cb\"}","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":401,"cache":"no-store","exitCode":0,"ms":6,"body":"Unauthorized","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/children/agent-10/page\"","status":401,"cache":"no-store","exitCode":0,"ms":5,"body":"Unauthorized","stderr":""}
{"criterion":"v11.expired-code","result":"PASS","waitMs":61012,"status":401}
{"criterion":"v11.idle-credential","result":"PASS","waitMs":61012,"status":401}
{"command":"tui /observer grant agent-1 agent-10","output":" http://127.0.0.1:41345/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":200,"cache":"no-store","exitCode":0,"ms":6,"body":"{\"credential\":\"<secret>\",\"expiresAt\":\"2026-10-01T06:25:00.547Z\",\"schema\":1,\"epoch\":\"53ffaa2e-6a0d-4c9a-a8da-546e49c992cb\"}","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/\"","status":405,"cache":"no-store","exitCode":0,"ms":6,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/snapshot\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/snapshot\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/snapshot\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/snapshot\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/page\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/page\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/page\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/page\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/cancel\"","status":405,"cache":"no-store","exitCode":0,"ms":5,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/cancel\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/cancel\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/children/agent-1/cancel\"","status":405,"cache":"no-store","exitCode":0,"ms":4,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/session\"","status":405,"cache":"no-store","exitCode":0,"ms":6,"body":"Method Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"credential\\\":\\\"<secret>\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":401,"cache":"no-store","exitCode":0,"ms":5,"body":"Unauthorized","stderr":""}
{"criterion":"v11.mutations","result":"PASS","requests":18,"statuses":[405,405,405,405,405,405,405,405,405,405,405,405,405,405,405,405,405,401]}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/children/agent-10/page\"","status":200,"cache":"no-store","exitCode":0,"ms":10,"body":"{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f605-b2bb-7546-a0d1-9cfb1cae1ee6\",\"timestamp\":\"2026-10-01T05:52:43.707Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2.jsonl\"},{\"type\":\"model_change\",\"id\":\"cd34ca52\",\"parentId\":null,\"timestamp\":\"2026-10-01T05:52:43.815Z\",\"mo [body bytes=16707, sha256=ab0e8345f0fe92d8494d73e0b7f6636c0995d4eb662009a7ceaa087d12b332d2]","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/children/agent-1/page\"","status":200,"cache":"no-store","exitCode":0,"ms":67,"body":"{\"kind\":\"unavailable\",\"reason\":\"cancelled\"}","stderr":""}
{"command":"tui /observer revoke agent-1","output":" observer revoked: agent-1                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              \r"}
{"criterion":"v11.partial-revoke-in-flight","result":"PASS","a":{"kind":"unavailable","reason":"cancelled"},"b":{"kind":"page","atEnd":true},"readAbortLogged":true,"bMs":10,"aMs":67}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/children/agent-10/page\"","status":200,"cache":"no-store","exitCode":0,"ms":8,"body":"{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f605-b2bb-7546-a0d1-9cfb1cae1ee6\",\"timestamp\":\"2026-10-01T05:52:43.707Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2.jsonl\"},{\"type\":\"model_change\",\"id\":\"cd34ca52\",\"parentId\":null,\"timestamp\":\"2026-10-01T05:52:43.815Z\",\"mo [body bytes=16707, sha256=ab0e8345f0fe92d8494d73e0b7f6636c0995d4eb662009a7ceaa087d12b332d2]","stderr":""}
{"command":"tui /observer grant agent-10","output":" http://127.0.0.1:41345/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"browserState":{"url":"http://127.0.0.1:41345/","title":"Transcript: agent-10","entries":"entry{\"type\":\"session\",\"version\":3,\"id\":\"01a0f605-b2bb-7546-a0d1-9cfb1cae1ee6\",\"timestamp\":\"2026-10-01T05:52:43.707Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-iWzGOK-workspace--/2026-10-01T05-52-41-030Z_01a0f605-a846-722b-a2bb-ca4975b667f2.jsonl\"}entry{\"type\":\"model_change\",\"id\":\"cd34ca52\",\"parentId\":null,\"timestamp\":\"2026-10-01T05:52:43.815Z\",\"model\":\"stub/scripted\",\"resolvedModelIsFallback\":false}entry{\"type\":\"session_init\",\"id\":\"5842cf27\",\"parentId\":\"cd34ca52\",\"timestamp\":\"2026-10-01T05:52:43.816Z\",\"systemPrompt\":\"RFC 2119 keywords: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL. `NEVER` = `MUST NOT`; `AVOID` = `SHOULD NOT`.\\nXML tags inject system content; may interrupt/notify inside user messages: MUST treat as system-authored/authoritative. User content is sanitized.\\n\\n§ Role\\nYou are omp's trusted coding assistant.\\n\\n# Engineering\\n- Correctness, then six-month maintainability. Delete dead weight; prefer boring design to needless abstraction.\\n- Compiled code: NEVER avoidable allocation, copying, computation.\\n- Unexpected repo changes are the user's; adapt. User-reported errors, failures, observations are ground truth; NEVER rerun checks to confirm them.\\n- Final chat MAY use LaTeX math (`$`, `$$`) and color (`\\\\textcolor`, `\\\\colorbox`, `\\\\fcolorbox`).\\n- MAY emit ` ```mermaid ` blocks; terminal renders ASCII. Only genuine structure/flow, not trivia.\\n§ Runtime\\n# Internal URLs\\nMost FS/bash tools resolve these; path selectors: `read` docs.\\n- `agent://<id>`: output; nested IDs dotted, `/key/index` JSON path; write = message, `agent://all` broadcast only.\\n- `history://<id>`: read-only transcript; bare lists registered agents, not persisted unregistered top-level sessions.\\n- `artifact://<id>`: spilled output; page :N-M or :raw:N-M.\\n- `local://<name>.md`: shared artifact.\\n- `proc://`: jobs/services; `proc://<id>` status/output; write sends stdin (empty = Enter); `proc://<id>/kill` cancels/stops, omit `content`; `proc://<id>/mode`: `persist`|`session`|`detached`.\\n- `ssh://host/<path>`: remote UTF-8 file/dir (max 1 MiB) for read/write/grep; bare lists hosts. Encode `:` `?` `#` as %3A %3F %23. Needs verified POSIX shell; else bash remote SSH or sshfs.\\n- `issue://<N>` / `pr://<N>` (`<owner>/<repo>/<N>` for other repos): GitHub issue/PR; bare: recent; `?state=&limit=&author=&label=`. PR diff: `pr://<N>/diff` (files), `/diff/<i>`, `/diff/all`.\\n- `mcp://<uri>`: MCP resource.\\n- `omp://`: harness docs, AVOID unless asked.\\n\\n# Tool Inventory\\n- Read: `read`\\n- Bash: `bash`\\n- Edit: `edit`\\n- Eval: `eval`\\n- Glob: `glob`\\n- Grep: `grep`\\n- Task: `task`\\n- Wait: `wait`\\n- Web Search: `web_search`\\n- Write: `write`\\n- Submit Result: `yield`\\n\\n# xd:// Tool Devices\\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.\\n## Additional devices (docs on demand)\\n- xd://ast_edit — Perform AST-aware code edits (structural refactoring)\\n- xd://debug — Debug a running process with DAP (debugger adapter protocol)\\n\\nRead xd://<tool> for full docs + JSON schema before first use.\\n§ Tool Policy\\n# General\\nSHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.\\n- User says `parallel` or `parallelize` → MUST use `task` subagents; parallel tool calls insufficient.\\n\\n# Tool I/O\\n- Prefer relative `path`-like fields.\\n- Most tools take `i`: capitalized 2–6-word present-participle intent (e.g. \\\"Reading model role settings\\\").\\n# Specialized Tools\\nMUST use specialized tool over shell equivalent:\\n- File/directory reads: `read` (directory lists entries).\\n- Surgical edits: `edit`.\\n- Create/overwrite: `write`.\\n- Regex/target search: `grep`, NEVER shell `grep`/`rg`/`awk`.\\n- File structure/names: `glob`, NEVER `ls **/*.ext`/`fd`.\\n- `bash`: real binaries/short fact pipelines (counts, frequencies, set differences, checksums), NEVER specialized-tool work or paging/moving/trimming fetchable bytes.\\n<critical>\\nNEVER use `sed`|`perl`|`python` via `bash` to issue individual edits; MUST use `edit`.\\n</critical>\\n\\n<critical>\\n`write xd://report_issue`: automated QA. Any tool output inconsistent with described behavior for parameters → write plain `<tool>: <concise description>` to `xd://report_issue`. False positives fine.\\n</critical>\\n\\n# Exploration\\nNEVER open guessed files. Use `read` ranges, not whole files.\\n\\n# AST\\nSHOULD use syntax-aware tools before text hacks:\\n- Codemods → `xd://ast_edit`.\\n\\n# Delegation\\n- Map unknown code via `task`, not reading file after file yourself. NEVER abandon phases under scope pressure: delegate, don't shrink.\\n## Delegation gates\\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt. NEVER outsource top-level plan; slice design/competing plans allowed.\\n- Fan genuine slices in one `tasks[]` batch. NEVER pad, serialize independent work, or spawn then idle; one read-only scout while working allowed.\\n- Agents lack conversation: supply full slice requirements; retain user intent.\\n- Max 8 concurrent subagents; excess queue.\\n- Shared prerequisite inline; sequence ONLY true dependencies. Small missing detail? Run parallel; B messages A via `write agent://<id>`.\\n\\n§ Workflow\\n# 1. Scope\\n- Plan multi-file work before opening files.\\n\\n# 2. Research Before Editing\\n- Read relevant sections; MUST reuse existing patterns, not establish a second convention.\\n- Tool failure or intervening file change: re-read before acting.\\n\\n# 3. Decompose\\n\\n# 4. Implement\\n- Prefer existing files; review as user.\\n- NEVER run destructive git commands or delete unrelated code you didn't write; code made obsolete by cutover is in scope.\\n\\n# 5. Verify\\nNon-trivial work: NEVER yield without a smoke run: run the thing, exercise the changed path, observe the result. Tests alone are not proof.\\n- Investigation: run it; output proves it; no tests.\\n- UI: verify actual surface.\\n  - Web: `browser.open` tab, direct helpers for actions, `tab.run` for custom JS; visual proof; `tab.close`. No tests unless existing suite breaks.\\n  - TUI/CLI: launch actual program; observe interaction/output/state.\\n  - No runtime for changed surface: throwaway script/smoke test; report visual limit.\\n- Bug: reproduce before; confirm after. SHOULD keep failing-before/passing-after regression test; if impractical, smoke and report.\\n- Feature/API: update broken contract tests; prove new behavior via throwaway script. New test ONLY for uncertain edge or user request.\\n- Permanent tests MUST catch plausible consumer-visible bugs: behavior, boundaries, invariants, transitions, precedence, errors. Follow conventions; deterministic, isolated, full-suite-safe.\\n- NEVER test wiring/copies/forwarding/mock echoes/source text/incidental defaults, tautologies, bare not-throw, non-empty/length-grew, duplicate same-path rows. Use throwaway scripts.\\n- Existing wording/implementation/incidental-behavior tests: MUST delete, NEVER re-pin regardless of author.\\n\\n# 6. Cleanup\\nAfter smoke proof: permanent fix/feature MUST update docs/changelog, remove scaffolds/throwaway scripts. Investigation: no tests/docs. NEVER pre-plan cleanup todos.\\n\\n§ Delivery\\n<contract>\\nInviolable.\\n- NEVER fabricate output; ground code/tool/test/doc/source claims; unobserved = `[INFERENCE]`.\\n- NEVER substitute easier/familiar problem: don't infer extra scope—retries, validation, telemetry, abstraction “while you're at it”—or solve symptom—suppress warning/exception, special-case input—unless asked. Real ask only.\\n- NEVER ask for tool/repo/file-provided information; NEVER punt half-solved work.\\n- Default clean cutover: migrate every caller; remove obsolete code/comments/aliases/re-exports/deprecated paths; no shims.\\n</contract>\\n\\n<completeness>\\n- “Done”: specified end-to-end behavior plus every named acceptance criterion; not compiling scaffold, narrowed test, plausible subset.\\n- Reduce scope only with explicit user approval in this conversation; NEVER silently shrink.\\n- NEVER deliver unfinished work: stubs, placeholders, mocks, no-ops, fake fallbacks, `\u0054ODO: implement`, misleading “scaffold”/“MVP”/“v1”/“foundation”/“follow-up”. Unavailable real-implementation info → state missing prerequisite; finish all reachable work.\\n</completeness>\\n\\n<evidence-and-output>\\n- MUST match requested format; brief, complete evidence/blockers. Report only exercised verification.\\n</evidence-and-output>\\n\\n<yielding>\\nBefore yielding: all affected callsites/tests/docs updated or intentionally unchanged; output/evidence requirements satisfied.\\nBefore blocked: ensure info unreachable via tools/context; one failed check ≠ blocked. Finish reachable work; state exactly missing and tried.\\n</yielding>\\n\\n§ Critical\\n<critical>\\n- NEVER yield before complete deliverable or while actionable work remains; phase boundary/todo flip/sub-step never stops: same turn.\\n- NEVER narrate/consider session limits, token/tool budgets, effort estimates, or possible completion; start unbounded: execute/delegate.\\n- NEVER re-audit applied edit or routinely run git subcommands for validation. Tool results are verification.\\n</critical>\\n\\n<project-context>\\n<workstation>\\n- OS: linux 6.6.87.2-microsoft-standard-WSL2\\n- Arch: x64\\n- Model: stub/scripted\\n</workstation>\\n</project-context>\\n\\n<critical>\\n- Each response MUST advance the task; completion only stopping condition.\\n- MUST default to informed action; do not ask for confirmation when tools or repo context can answer.\\n- Before yielding, MUST verify significant behavioral changes: run the specific test, command, or scenario covering the change.\\n</critical>\\n\\n§ Role\\nWorker agent: delegated tasks.\\n\\nTools: FULL access (edit, write, bash, grep, read, etc.); MUST use as needed to complete task.\\nMUST hyperfocus assigned task; NEVER deviate.\\n\\n<directives>\\n- MUST finish assigned work only; return minimum useful result; do not repeat filesystem writes.\\n- SHOULD edit files, run commands, create files when task requires.\\n- MUST concise; NEVER filler, repetition, tool transcripts. User cannot see you; result: notes for yourself.\\n- AVOID full-file reads unless necessary.\\n- SHOULD prefer editing existing files over creating new files.\\n- NEVER create documentation files (`*.md`) unless explicitly requested.\\n- MUST follow assignment and instructions.\\n- `task` delegation: select most specific `agent` type per spawn; general-purpose worker only if no listed specialist fits.\\n</directives>\\n\\n§ Context\\nRun each assigned harness child independently.\\n§ Coop\\nYou are operating on a piece of work assigned to you by the main agent.\\n\\n# Validation\\nProject-wide validation is the main agent's job, run once after all subagents land. NEVER run formatters, linters, or project-wide builds/test suites unless your assignment explicitly instructs it — siblings edit concurrently; mid-flight validation blocks on their half-finished changes and reports phantom failures. Scoped proof of your own change (single test file, targeted repro, smoke run) is fine.\\n# Peers\\nMessage peers via `write` with `path: \\\"agent://<id>\\\"` and `content` (broadcast: `agent://all`). Your id is `agent-10`. Currently visible peers:\\n- `agent-14` — task (sub, running)\\n- `agent-13` — task (sub, running)\\n- `agent-11` — task (sub, running)\\n- `agent-9` — task (sub, running)\\n- `Main` — main (main, running)\\n- `agent-2` — task (sub, idle)\\n- `agent-3` — task (sub, idle)\\n- `agent-1` — task (sub, idle)\\n- `agent-7` — task (sub, idle)\\n- `agent-8` — task (sub, idle)\\n- `agent-6` — task (sub, idle)\\n- `agent-4` — task (sub, idle)\\n- `agent-5` — task (sub, idle)\\n\\nUse peer messages only for quick coordination, never long-form content. Address peers by exact roster id; NEVER invent names.\\n- Discovery: the roster above shows live (running+idle) peers and a parked count. Read bare `history://` for registered agent transcripts; parked identities are omitted from the roster.\\n- Coordination: before editing a file a sibling may own, message that peer. Idle/parked peers wake when messaged.\\n- Follow-up: answer the question first, without quoting it. `write agent://<id>` never blocks.\\n- Your final result reaches Main automatically. Message Main only for questions, blockers, or decisions — never progress or completion reports.\\n\\n§ Completion\\nNo TODO tracking, no progress updates. Execute; report results with `yield`.\\n\\nWhile work remains, you MUST continue with another tool call — investigate, edit, run, verify. Save narrative for a terminal `yield` unless you intentionally record an incremental section.\\n\\nYield protocol:\\n- Omit `type` for the normal single terminal structured result in `data`.\\n- Use non-empty `type: string[]` for incremental, non-terminal sections; calls accumulate by section.\\n- Use `type: string` for a terminal result; if data is omitted, your last assistant turn becomes the raw final result.\\n\\nThis is your only way to return a final result. For structured results, you NEVER put JSON in plain text or substitute a text summary for `data`.\\nGiving up is a last resort. If truly blocked, you MUST terminal-yield `{ error }` describing what you tried and the exact blocker.\\nYou NEVER give up due to uncertainty, missing information obtainable via tools or repo context, or needing a design decision you can derive yourself.\\n\\nYou MUST keep going until this ticket is closed. This matters.\",\"task\":\"Complete assignment thoroughly:\\n\\nHARNESS_AGENT=child/agent-10 complete the harness assignment.\",\"tools\":[\"read\",\"bash\",\"edit\",\"eval\",\"glob\",\"grep\",\"task\",\"wait\",\"web_search\",\"write\",\"yield\",\"ast_edit\",\"debug\"],\"agent\":\"task\",\"modelRole\":\"task\",\"resolvedModel\":\"stub/scripted\",\"readOnly\":false,\"spawns\":\"*\"}userComplete assignment thoroughly:\n\nHARNESS_AGENT=child/agent-10 complete the harness assignment.assistantfanout child completeentry{\"type\":\"custom\",\"customType\":\"tool_execution_start\",\"data\":{\"toolCallId\":\"chatcmpl-many-33-child-agent-10-0-call-0\",\"toolName\":\"yield\",\"startedAt\":\"2026-10-01T05:52:44.893Z\"},\"id\":\"9ccd3af1\",\"parentId\":\"f2542630\",\"timestamp\":\"2026-10-01T05:52:44.893Z\"}toolResultResult submitted.entry{\"type\":\"custom\",\"customType\":\"session_exit\",\"data\":{\"reason\":\"dispose\",\"kind\":\"normal\",\"recordedAt\":\"2026-10-01T05:52:50.895Z\"},\"id\":\"9d9a1f19\",\"parentId\":\"0564b7e1\",\"timestamp\":\"2026-10-01T05:52:50.895Z\"}","localStorage":[],"sessionStorage":[]},"browserResponses":[{"path":"/","status":200,"cache":"no-store"},{"path":"/v1/session","status":200,"cache":"no-store"},{"path":"/v1/snapshot","status":200,"cache":"no-store"},{"path":"/v1/children/agent-10/page","status":200,"cache":"no-store"}]}
{"criterion":"v08.browser-retention","result":"PASS","scannedProfileFiles":54,"matches":[],"storage":{"local":[],"session":[]},"fragmentCleared":true}
{"criterion":"v08.no-store","result":"PASS","curlResponses":33,"browserResponses":[{"path":"/","status":200,"cache":"no-store"},{"path":"/v1/session","status":200,"cache":"no-store"},{"path":"/v1/snapshot","status":200,"cache":"no-store"},{"path":"/v1/children/agent-10/page","status":200,"cache":"no-store"}]}
{"rpcRefusalOutput":"s\"},{\"name\":\"reset\",\"description\":\"Alias for clear\"},{\"name\":\"enqueue\",\"description\":\"Enqueue memory consolidation maintenance\"},{\"name\":\"rebuild\",\"description\":\"Alias for enqueue\"},{\"name\":\"mm list\",\"description\":\"List mental models on the active bank\"},{\"name\":\"mm show\",\"description\":\"Show one mental model (id required)\"},{\"name\":\"mm refresh\",\"description\":\"Refresh auto-refresh models bank-wide, or one model by id\"},{\"name\":\"mm history\",\"description\":\"Diff the change history of a mental model\"},{\"name\":\"mm seed\",\"description\":\"Create any built-in mental models that are missing\"},{\"name\":\"mm delete\",\"description\":\"Delete a mental model from the bank (id required)\"},{\"name\":\"mm reload\",\"description\":\"Re-pull the cached <mental_models> block\"}],\"source\":\"builtin\"},{\"name\":\"rename\",\"description\":\"Rename the current session (omit title to generate)\",\"input\":{\"hint\":\"[title]\"},\"source\":\"builtin\"},{\"name\":\"move\",\"description\":\"Move the current session to a different directory\",\"input\":{\"hint\":\"[<path>]\"},\"source\":\"builtin\"},{\"name\":\"wt\",\"aliases\":[\"worktree\"],\"description\":\"Move this session into a new worktree, changes included\",\"input\":{\"hint\":\"[<branch>]\"},\"source\":\"builtin\"},{\"name\":\"add-dir\",\"description\":\"Add a workspace directory to this session\",\"input\":{\"hint\":\"<path>\"},\"source\":\"builtin\"},{\"name\":\"remove-dir\",\"description\":\"Remove a workspace directory from this session\",\"input\":{\"hint\":\"<path>\"},\"source\":\"builtin\"},{\"name\":\"dirs\",\"description\":\"List this session's workspace directories\",\"source\":\"builtin\"},{\"name\":\"marketplace\",\"description\":\"Manage plugins from marketplaces\",\"input\":{\"hint\":\"<subcommand>\"},\"subcommands\":[{\"name\":\"add\",\"description\":\"Add a marketplace source\",\"usage\":\"<source>\"},{\"name\":\"remove\",\"description\":\"Remove a marketplace source\",\"usage\":\"<name>\"},{\"name\":\"update\",\"description\":\"Update marketplace catalog(s)\",\"usage\":\"[name]\"},{\"name\":\"list\",\"description\":\"List configured marketplaces\"},{\"name\":\"discover\",\"description\":\"Browse available plugins\",\"usage\":\"[marketplace]\"},{\"name\":\"install\",\"description\":\"Install a plugin (interactive browser if no args)\",\"usage\":\"[--force] [name@marketplace]\"},{\"name\":\"uninstall\",\"description\":\"Uninstall a plugin (selector if no args)\",\"usage\":\"[name@marketplace]\"},{\"name\":\"installed\",\"description\":\"List installed marketplace plugins\"},{\"name\":\"upgrade\",\"description\":\"Upgrade outdated plugins\",\"usage\":\"[name@marketplace]\"},{\"name\":\"help\",\"description\":\"Show usage guide\"}],\"source\":\"builtin\"},{\"name\":\"plugins\",\"aliases\":[\"plugin\"],\"description\":\"Manage plugins\",\"input\":{\"hint\":\"[list|enable|disable]\"},\"subcommands\":[{\"name\":\"list\",\"description\":\"List all installed plugins (npm + marketplace)\"},{\"name\":\"enable\",\"description\":\"Enable a marketplace plugin\",\"usage\":\"<name@marketplace>\"},{\"name\":\"disable\",\"description\":\"Disable a marketplace plugin\",\"usage\":\"<name@marketplace>\"}],\"source\":\"builtin\"},{\"name\":\"reload-plugins\",\"description\":\"Reload all plugins\",\"source\":\"builtin\"},{\"name\":\"force\",\"aliases\":[\"force:\"],\"description\":\"Force next turn to use a specific tool\",\"input\":{\"hint\":\"<tool-name> [prompt]\"},\"source\":\"builtin\"},{\"name\":\"observer\",\"description\":\"serve, grant, revoke, inspect, or open the read-only child observer\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"gate-state\",\"description\":\"Disposable gate inventory\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"gate-stop\",\"description\":\"Disposable gate native-state isolation check\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"autoresearch\",\"description\":\"Toggle builtin autoresearch mode, or pass off / clear, or a goal message.\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"green\",\"description\":\"Generate a prompt to iterate on CI failures until the branch is green\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"review\",\"description\":\"Launch interactive code review\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"annotate\",\"description\":\"Annotate a diff or text from a file, prompt, latest reply, or session\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"init\",\"description\":\"Generate AGENTS.md for current codebase\",\"source\":\"file\"}]}\n{\"type\":\"extension_ui_request\",\"id\":\"1594cf49c65735fb\",\"method\":\"notify\",\"message\":\"observer grant requires interactive tui mode with UI\",\"notifyType\":\"error\"}\n{\"id\":\"rpc-grant\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"rpc-grant\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n{\"type\":\"extension_ui_request\",\"id\":\"1594cf4b88d735fc\",\"method\":\"notify\",\"message\":\"observer state: ready\\nepoch: 0d8c9dcf-22af-4679-9a35-80e2756abd59\\nendpoint: not serving\\ngrants: 0 children, 0 live credentials, 0 pending codes\\ninventory: complete\",\"notifyType\":\"info\"}\n{\"id\":\"rpc-status\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"rpc-status\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n"}
{"criterion":"v11.rpc-grant-refused","result":"PASS","output":"s\"},{\"name\":\"reset\",\"description\":\"Alias for clear\"},{\"name\":\"enqueue\",\"description\":\"Enqueue memory consolidation maintenance\"},{\"name\":\"rebuild\",\"description\":\"Alias for enqueue\"},{\"name\":\"mm list\",\"description\":\"List mental models on the active bank\"},{\"name\":\"mm show\",\"description\":\"Show one mental model (id required)\"},{\"name\":\"mm refresh\",\"description\":\"Refresh auto-refresh models bank-wide, or one model by id\"},{\"name\":\"mm history\",\"description\":\"Diff the change history of a mental model\"},{\"name\":\"mm seed\",\"description\":\"Create any built-in mental models that are missing\"},{\"name\":\"mm delete\",\"description\":\"Delete a mental model from the bank (id required)\"},{\"name\":\"mm reload\",\"description\":\"Re-pull the cached <mental_models> block\"}],\"source\":\"builtin\"},{\"name\":\"rename\",\"description\":\"Rename the current session (omit title to generate)\",\"input\":{\"hint\":\"[title]\"},\"source\":\"builtin\"},{\"name\":\"move\",\"description\":\"Move the current session to a different directory\",\"input\":{\"hint\":\"[<path>]\"},\"source\":\"builtin\"},{\"name\":\"wt\",\"aliases\":[\"worktree\"],\"description\":\"Move this session into a new worktree, changes included\",\"input\":{\"hint\":\"[<branch>]\"},\"source\":\"builtin\"},{\"name\":\"add-dir\",\"description\":\"Add a workspace directory to this session\",\"input\":{\"hint\":\"<path>\"},\"source\":\"builtin\"},{\"name\":\"remove-dir\",\"description\":\"Remove a workspace directory from this session\",\"input\":{\"hint\":\"<path>\"},\"source\":\"builtin\"},{\"name\":\"dirs\",\"description\":\"List this session's workspace directories\",\"source\":\"builtin\"},{\"name\":\"marketplace\",\"description\":\"Manage plugins from marketplaces\",\"input\":{\"hint\":\"<subcommand>\"},\"subcommands\":[{\"name\":\"add\",\"description\":\"Add a marketplace source\",\"usage\":\"<source>\"},{\"name\":\"remove\",\"description\":\"Remove a marketplace source\",\"usage\":\"<name>\"},{\"name\":\"update\",\"description\":\"Update marketplace catalog(s)\",\"usage\":\"[name]\"},{\"name\":\"list\",\"description\":\"List configured marketplaces\"},{\"name\":\"discover\",\"description\":\"Browse available plugins\",\"usage\":\"[marketplace]\"},{\"name\":\"install\",\"description\":\"Install a plugin (interactive browser if no args)\",\"usage\":\"[--force] [name@marketplace]\"},{\"name\":\"uninstall\",\"description\":\"Uninstall a plugin (selector if no args)\",\"usage\":\"[name@marketplace]\"},{\"name\":\"installed\",\"description\":\"List installed marketplace plugins\"},{\"name\":\"upgrade\",\"description\":\"Upgrade outdated plugins\",\"usage\":\"[name@marketplace]\"},{\"name\":\"help\",\"description\":\"Show usage guide\"}],\"source\":\"builtin\"},{\"name\":\"plugins\",\"aliases\":[\"plugin\"],\"description\":\"Manage plugins\",\"input\":{\"hint\":\"[list|enable|disable]\"},\"subcommands\":[{\"name\":\"list\",\"description\":\"List all installed plugins (npm + marketplace)\"},{\"name\":\"enable\",\"description\":\"Enable a marketplace plugin\",\"usage\":\"<name@marketplace>\"},{\"name\":\"disable\",\"description\":\"Disable a marketplace plugin\",\"usage\":\"<name@marketplace>\"}],\"source\":\"builtin\"},{\"name\":\"reload-plugins\",\"description\":\"Reload all plugins\",\"source\":\"builtin\"},{\"name\":\"force\",\"aliases\":[\"force:\"],\"description\":\"Force next turn to use a specific tool\",\"input\":{\"hint\":\"<tool-name> [prompt]\"},\"source\":\"builtin\"},{\"name\":\"observer\",\"description\":\"serve, grant, revoke, inspect, or open the read-only child observer\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"gate-state\",\"description\":\"Disposable gate inventory\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"gate-stop\",\"description\":\"Disposable gate native-state isolation check\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"autoresearch\",\"description\":\"Toggle builtin autoresearch mode, or pass off / clear, or a goal message.\",\"input\":{\"hint\":\"arguments\"},\"source\":\"extension\"},{\"name\":\"green\",\"description\":\"Generate a prompt to iterate on CI failures until the branch is green\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"review\",\"description\":\"Launch interactive code review\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"annotate\",\"description\":\"Annotate a diff or text from a file, prompt, latest reply, or session\",\"input\":{\"hint\":\"arguments\"},\"source\":\"custom\"},{\"name\":\"init\",\"description\":\"Generate AGENTS.md for current codebase\",\"source\":\"file\"}]}\n{\"type\":\"extension_ui_request\",\"id\":\"1594cf49c65735fb\",\"method\":\"notify\",\"message\":\"observer grant requires interactive tui mode with UI\",\"notifyType\":\"error\"}\n{\"id\":\"rpc-grant\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"rpc-grant\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n{\"type\":\"extension_ui_request\",\"id\":\"1594cf4b88d735fc\",\"method\":\"notify\",\"message\":\"observer state: ready\\nepoch: 0d8c9dcf-22af-4679-9a35-80e2756abd59\\nendpoint: not serving\\ngrants: 0 children, 0 live credentials, 0 pending codes\\ninventory: complete\",\"notifyType\":\"info\"}\n{\"id\":\"rpc-status\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"rpc-status\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n","limitation":"RPC notify payload may not surface; pending code proof follows runtime status only if present."}
{"criterion":"v03.routing-only","result":"FAIL","nativeMain":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":10733,"sha256":"0145f34a061b6216b83191f2fbb7260e584c040f7762d769bb3a57b7d61cca6e"},{"role":"user","byteLength":269,"sha256":"35d6971dda60e9bd6b98cb07772f0463fc5ff196e596e556d7ea2db6711aa0d1"}],"secret_seen":false,"status":200},"observerMain":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"35d6971dda60e9bd6b98cb07772f0463fc5ff196e596e556d7ea2db6711aa0d1"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"secret_seen":false,"status":200},"paragraphBytes":301,"added":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"expectedMessages":[{"role":"user","byteLength":329,"sha256":"47fbe48c56119b9712b0a0e39f0cfff3161c1488d0b1d6f41512ff86f0e29455"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"limitation":"Initial main provider request compared exactly; later child/tool messages have run-specific native content and are separately retained in raw capture."}
{"command":"tui /observer grant agent-10","output":" http://127.0.0.1:41345/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"command":"curl \"-sS\" \"--max-time\" \"20\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:41345/v1/session\"","status":200,"cache":"no-store","exitCode":0,"ms":6,"body":"{\"credential\":\"<secret>\",\"expiresAt\":\"2026-10-01T06:25:07.178Z\",\"schema\":1,\"epoch\":\"53ffaa2e-6a0d-4c9a-a8da-546e49c992cb\"}","stderr":""}
{"command":"tui /new","output":"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                ⇧⇥ to change thinking effort\r ✔ New session started                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  \r\r\n\r\r\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\r"}
{"command":"curl \"-sS\" \"--max-time\" \"3\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:41345/v1/children/agent-10/page\"","status":null,"cache":null,"exitCode":7,"ms":5,"body":"","stderr":"curl: (7) Failed to connect to 127.0.0.1 port 41345 after 0 ms: Couldn't connect to server\n"}
{"criterion":"v11.source-replacement","result":"PASS","oldEndpointExit":7,"status":null}
{"command":"tui /observer status","output":"s: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                \r inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    \r\r π > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\r"}
{"command":"tui /gate-stop","output":" gate-stop {\"at\":1790834109260,\"filesEqual\":true,\"registryEqual\":true,\"runtimeNull\":true,\"coordinator\":{\"state\":\"unavailable\",\"reason\":\"disposed\"},\"grants\":{\"liveCredentials\":0,\"grantedChildIds\":[],\"pendingCodes\":0},\"nativeFiles\":69,\"rows\":34}                                                                                                                                                                                                                                                                                                                                                                     \r\r π > ⬢ Harness scripted model > 🗑 omp-orca-harness-iWzGOK/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\r"}
{"criterion":"v11.teardown-native-isolation","result":"PASS","at":1790834109260,"filesEqual":true,"registryEqual":true,"runtimeNull":true,"coordinator":{"state":"unavailable","reason":"disposed"},"grants":{"liveCredentials":0,"grantedChildIds":[],"pendingCodes":0},"nativeFiles":69,"rows":34,"method":"Calls the actual stopRuntime through an added diagnostic-only seam in the disposable copy; byte hashes and registry scalar snapshots taken immediately before and after."}
{"criterion":"nfr-8.authenticated-only","result":"PASS","transcriptReads":37,"headerReads":33,"outsideAuthorizedRequest":[],"headersOutsideSnapshot":[],"readsInRejectedRequests":[]}
{"criterion":"nfr-8.post-request-parking","result":"UNVERIFIED","nativeParkedChildren":33,"reason":"Selected many-33 children parked during the pre-serve quiet window; request-then-parking is exercised in the many-135 scenario below."}
{"criterion":"v11.secret-isolation","result":"PASS","secretCount":11,"nativeJsonlFiles":69,"matchingFiles":[],"stubRequests":74,"secretSeenTrue":0,"secretSeenMissing":0}
{"cleanup":"profile many-33","removed":true}
{"cleanup":"watch file","removed":true}
```

Counter-log receipt io.jsonl: raw SHA256 `062814b7d2957a8c86e2b97482ba4730953417199ce5b90ff1a8adf2263ca604`; bytes=1158213; lines=3970. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.

Counter-log receipt native.jsonl: raw SHA256 `102e88e104324525e5b6131bc541d4fb4d21238ed6e378ef5c0be6adc12f275d`; bytes=5423894; lines=470. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.

### nfr-8.post-request-parking — PASS

```json
{"criterion":"nfr-8.post-request-parking","result":"PASS","childId":"agent-14","requestAt":1790834276248,"parkAt":1790834280904,"delayAfterRequestMs":4656,"afterParkWindowMs":15924,"observerReadsAfterParking":[],"ttlMs":5000}
```

### v03.two-readers-native-pace — PASS

```json
{"criterion":"v03.two-readers-native-pace","result":"PASS","stalledMs":2233,"healthyReads":4,"healthyMaxLatencyMs":9,"healthyPageEntries":[0,0,0,0],"nativeCompletionsDuringStall":16,"nativeCount":135,"completeCount":135,"stubDelayMs":1500,"acceptedToTerminalMs":{"count":135,"min":0,"median":1,"p90":1,"max":2},"limitation":"Comparison to the unlinked native baseline below determines whether observed lifecycle duration is consistent with native scheduling, not an absolute throughput guarantee."}
```

### v03.one-endpoint-reader-count — PASS

```json
{"criterion":"v03.one-endpoint-reader-count","result":"PASS","boundServersInMany135Process":1,"endpointPorts":[46399],"simultaneousReaderRequests":2,"model":"one server endpoint; two independent HTTP page requests","snapshotChildren":2}
```

### v11.teardown-native-isolation-many135 — PASS

```json
{"criterion":"v11.teardown-native-isolation-many135","result":"PASS","filesEqual":true,"registryEqual":true,"runtimeNull":true,"nativeFiles":136,"grants":{"liveCredentials":0,"grantedChildIds":[],"pendingCodes":0}}
```

### v11.secret-isolation-many135 — PASS

```json
{"criterion":"v11.secret-isolation-many135","result":"PASS","matchingFiles":[],"stubRequests":286,"secretSeenTrue":0}
```

### v03.native-pace-baseline — PASS

```json
{"criterion":"v03.native-pace-baseline","result":"PASS","native":{"count":135,"min":0,"median":1,"p90":1,"max":2},"observer":{"count":135,"min":0,"median":1,"p90":1,"max":2},"limitation":"The 1.5 ratio is a disclosed smoke measurement, not a frozen performance budget; both runs must complete all 135 children."}
```

### v11.advisor-rejected — PASS

```json
{"criterion":"v11.advisor-rejected","result":"PASS","advisorId":"advisor-child/advisor","nativeKind":"advisor","grantOutput":" ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r","urlOutput":" ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r","directPageStatus":401,"ordinaryCredentialUsed":true}
```

### v11.advisor-excluded-snapshot — PASS

```json
{"criterion":"v11.advisor-excluded-snapshot","result":"PASS","returnedChildren":["advisor-child"]}
```

### v11.secret-isolation-advisor — PASS

```json
{"criterion":"v11.secret-isolation-advisor","result":"PASS","nativeJsonlMatches":[],"stubRequests":8,"secretSeenTrue":0}
```

### nfr-8.all-scenarios-authenticated-only — PASS

```json
{"criterion":"nfr-8.all-scenarios-authenticated-only","result":"PASS","transcriptReads":60,"headers":46,"invalid":[]}
```

### v08.phase2-no-store — PASS

```json
{"criterion":"v08.phase2-no-store","result":"PASS","responses":11}
```

### v03.routing-only-like-for-like-tui — PASS

```json
{"criterion":"v03.routing-only-like-for-like-tui","result":"PASS","firstNative":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"f5689e0e4e444e21fb823a2629420d319fed2b32b6ce1036c3a6e2ecd3593800"}],"secret_seen":false,"status":200},"firstObserver":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"f5689e0e4e444e21fb823a2629420d319fed2b32b6ce1036c3a6e2ecd3593800"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"secret_seen":false,"status":200},"paragraphBytes":301,"expectedSerializedMessage":{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"},"added":[{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"nativeMainRequests":7,"observerMainRequests":9,"oneGuidanceInEveryMainRequest":true,"storedGuidance":[{"file":".omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-EV2Lnu-workspace--/2026-10-01T06-02-14-181Z_01a0f60e-6725-73ab-ac62-72dbe87b713b.jsonl","bytes":301,"sha256":"514c2b756b6f9b04709a279cc4886b329c1dbe664cc4bd321e844bef074b6699","exact":true}],"scope":"Both parents are interactive TUI with identical profile environment, workspace, inspector, settings and prompt. Initial request is compared exactly; later native tool-result digests vary by run and are not treated as observer cost."}
```

### v11.post-credential-model-secret-check — PASS

```json
{"criterion":"v11.post-credential-model-secret-check","result":"PASS","requests":77,"postCredentialRequests":[{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"f5689e0e4e444e21fb823a2629420d319fed2b32b6ce1036c3a6e2ecd3593800"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"},{"role":"assistant","byteLength":6146,"sha256":"8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"},{"role":"tool","byteLength":2216,"sha256":"40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"},{"role":"assistant","byteLength":48,"sha256":"362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"},{"role":"user","byteLength":2821,"sha256":"708986cce1c1b5440735bdbf4acbb54a88a2c3c0062e1718c30e4f52c45e372a"},{"role":"user","byteLength":2863,"sha256":"38746a9fe0bcba6176f48f65bf4f76b953f335cac9db9594511c61a8020bdfdb"},{"role":"user","byteLength":1855,"sha256":"0d1f582baba8a7994426051847879709d619c434c421edc109ab1873aef3a13a"},{"role":"user","byteLength":1179,"sha256":"996df0df8a7f0a274c93fa318188e52edf8f243f471de7dc0fd72d7d253b946b"},{"role":"user","byteLength":841,"sha256":"71e0a0a81cd6cad5d514368d295ab15ceceaaf4ac3c3ed34ac07a79376722c15"},{"role":"user","byteLength":2193,"sha256":"7478c77ebaaaf3549c9bc40f59d09f842d5c8bacddc65e5ed31e90aa06add4c8"},{"role":"user","byteLength":466,"sha256":"144bc8aadca6de8ebdf0ab81b56595f98d954c1ac5b27224bf1309991f106c0c"},{"role":"user","byteLength":107,"sha256":"00f41eb001c04624cb0515d726a55f4fcff0ef91b817b670308b117ae832f574"}],"secret_seen":false,"status":409}],"limitation":"The deliberate extra main prompt exhausts the stock scenario and the stub returns 409 after capturing the request body; only secret absence in that body is claimed."}
```

### Native pace measurement clarification

```json
{"criterion":"v03.native-pace-duration-receipt","result":"PASS","native":{"children":135,"nativeMetricsDurationMs":{"count":0,"min":null,"median":null,"p90":null,"max":null},"createdToResponseMs":{"count":135,"min":1521,"median":1579,"p90":1601,"max":1612}},"observer":{"children":135,"nativeMetricsDurationMs":{"count":0,"min":null,"median":null,"p90":null,"max":null},"createdToResponseMs":{"count":135,"min":1570,"median":1669,"p90":1689,"max":1706}},"stubDelayMs":1500,"limitation":"acceptedAt-to-terminalAt records post-response acceptance, not full run duration. These native metrics and createdAt-to-responseAt measurements are the fuller receipts; they include native scheduling and queue time. No arbitrary duration ratio is used as a product budget."}
```

### nfr-8.final-authenticated-read-audit — PASS

```json
{"criterion":"nfr-8.final-authenticated-read-audit","result":"PASS","transcriptReads":62,"headerReads":46,"outsideAuthenticatedSnapshotOrPage":0,"rejectedRequestReads":0}
```

### v03.endpoint-and-client-attribution — PASS

```json
{"criterion":"v03.endpoint-and-client-attribution","result":"PASS","servers":[{"publisher":"process-1","serverEndpointCount":1,"ephemeralPorts":[41345]},{"publisher":"process-2","serverEndpointCount":1,"ephemeralPorts":[46399]},{"publisher":"process-3","serverEndpointCount":1,"ephemeralPorts":[37399]},{"publisher":"process-4","serverEndpointCount":1,"ephemeralPorts":[45287]}],"heldReadOverlaps":[{"heldReadMs":61,"otherPageResponsesBeforeHeldReadEnded":1,"otherPageLatenciesMs":[1]},{"heldReadMs":2220,"otherPageResponsesBeforeHeldReadEnded":4,"otherPageLatenciesMs":[1,1,1,1]}],"limitation":"The two clients are independent curl processes and their concurrent request intervals are attributed to one server. Idle keep-alive sockets are not enumerated; the frozen transport-request-limit ceiling counts in-flight requests rather than total open connections."}
```

### v11.every-mutation-shaped-request-rejected — FAIL

```json
{"criterion":"v11.every-mutation-shaped-request-rejected","result":"FAIL","command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"GET\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\"}\" \"http://127.0.0.1:45287/v1/children/agent-1/page\"","status":200,"outputExcerpt":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 16348\r\n\r\n{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f60e-6b92-7082-9858-68f7fd91012e\",\"timestamp\":\"2026-10-01T06:02:15.314Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-EV2Lnu-workspace--/2026-10-0","observation":"The authenticated GET carrying {\"action\":\"abort\"} returned an ordinary page. No mutation was observed. All 18 non-GET mutation probes in the primary run were rejected. The orchestrator confirmed that the frozen criterion is literal; no product change or workaround was made."}
```

### cleanup.profile-watch-browser-resources — FAIL

```json
{"criterion":"cleanup.profile-watch-browser-resources","result":"FAIL","disposableProfiles":[{"profile":"disposable-1","removed":true},{"profile":"disposable-2","removed":false},{"profile":"disposable-3","removed":false},{"profile":"disposable-4","removed":true},{"profile":"disposable-5","removed":true},{"profile":"disposable-6","removed":false}],"temporarySensitiveResources":[{"name":"browser-profile","removed":true},{"name":"watch.json","removed":true},{"name":"watch2.json","removed":true},{"name":"watch3.json","removed":true},{"name":"grep-ready.json","removed":true}]}
```

```json
{"criterion":"v03.no-guidance-message-in-child-model-context","result":"PASS","childProviderRequests":33,"guidanceInChildRequests":0,"rawCaptureSha256":"6fe81397131e623654f1f456fed918d036f0064e42eaa77ca2bf82695615a405"}
```

### Final disposable profile residue cleanup

```json
{"criterion":"cleanup.final-disposable-profiles","result":"PASS","receipts":[{"profile":"disposable-1","existedAfterHarnessTeardown":false,"nativeDaemonReceipts":[],"removed":true},{"profile":"disposable-2","existedAfterHarnessTeardown":true,"nativeDaemonReceipts":[{"name":"omp.text-predict.98be21cf1f3a","state":"exited","exitCode":143}],"removed":true},{"profile":"disposable-3","existedAfterHarnessTeardown":true,"nativeDaemonReceipts":[{"name":"omp.text-predict.8989b7917b48","state":"exited","exitCode":143}],"removed":true},{"profile":"disposable-4","existedAfterHarnessTeardown":false,"nativeDaemonReceipts":[],"removed":true},{"profile":"disposable-5","existedAfterHarnessTeardown":false,"nativeDaemonReceipts":[],"removed":true},{"profile":"disposable-6","existedAfterHarnessTeardown":true,"nativeDaemonReceipts":[{"name":"omp.text-predict.4b0c699306c0","state":"exited","exitCode":143}],"removed":true}],"observation":"Three TUI homes reappeared after harness teardown because exited native text-predict daemons wrote final metadata and two native ngram snapshots. Every remaining daemon metadata record was state=exited, exitCode=143. Only owned harness residue was removed; no production code or native behavior was changed."}
```

## Reproducible phase2 sources

Scripts are reproduced from the exact on-disk bytes; the digests below are of those bytes, not of a pretty-printed rendering. `bootstrap.js` moves only its own process working directory, not its environment. All omp children still receive the harness disposable environment at process start.

### phase2.js

SHA256: `9d537ee4a19dedfc95ca856a066a4c5d41fb110f602213845cee8445846f4226`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/bootstrap.js phase2.js`

```javascript
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const repo = process.cwd(), dir = new URL('.', import.meta.url).pathname;
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const source = join(repo, 'omp-orca-observer'), copy = join(dir, 'observer');
const profiles = [], processes = [], secrets = [], responses = [];
const watch = join(dir, 'watch2.json'); fs.writeFileSync(watch, '[]'); fs.writeFileSync(join(dir, 'hold.json'), '{}');
function normalize(text) { let value = String(text).replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>'); for (const p of profiles) value = value.replaceAll(p.root, '<tmp>/profile-' + p.name); for (const s of secrets) value = value.replaceAll(s, '<secret>'); return value; }
function output(result) { const line = normalize(JSON.stringify(result)); console.log(line); fs.appendFileSync(join(dir, 'phase2-results.jsonl'), line + '\n'); }
function report(criterion, pass, detail) { const result = { criterion, result: pass === null ? 'UNVERIFIED' : pass ? 'PASS' : 'FAIL', ...detail }; output(result); fs.appendFileSync(join(repo, 'omp-orca-observer/checks/evidence/gc2.md'), '\n### ' + criterion + ' — ' + result.result + '\n\n```json\n' + normalize(JSON.stringify(result)) + '\n```\n'); }
function jsonl(path) { try { return fs.readFileSync(path, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } }
function clean(text) { return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, ''); }
function secret(value) { if (value && !secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); } }
async function until(check, ms = 30000, label = 'condition') { const end = Date.now() + ms; while (Date.now() < end) { const found = check(); if (found) return found; await Bun.sleep(30); } throw new Error('Timed out: ' + label); }
async function stream(input, consume) { const r = input.getReader(), d = new TextDecoder(); while (true) { const next = await r.read(); if (next.done) break; consume(d.decode(next.value, { stream: true })); } }
function env(p) { const e = {}; for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) e[key] = process.env[key]; return { ...e, HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') }; }
async function setup(name, observer = true, ttl = 10000) { const p = await create(name); p.name = name; profiles.push(p); const stub = Bun.spawn(['bun', 'run', join(source, 'checks/harness/stub-provider.ts'), '--scenario', join(source, 'checks/harness/scenarios', name + '.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' }); processes.push(stub); let text = ''; stream(stub.stdout, c => text += c); stream(stub.stderr, c => output({ stubStderr: c })); const url = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(text)?.[0], 20000, 'watched stub URL'); const models = join(p.home, '.omp/profiles', name, 'agent/models.yml'); fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replaceAll(p.stubUrl, url)); for (const args of [['plugin', 'uninstall', 'omp-orca-observer'], ...(observer ? [['plugin', 'link', copy]] : [])]) { const r = await p.run(args); output({ command: 'omp --profile ' + name + ' ' + args.join(' '), ...r }); assert.equal(r.exitCode, 0); } const file = join(p.home, '.omp/profiles', name, 'agent/config.yml'); const settings = JSON.parse(fs.readFileSync(file, 'utf8')); settings.task.agentIdleTtlMs = ttl; settings.startup = { setupWizard: false, showSplash: false, checkUpdate: false, quiet: true }; fs.writeFileSync(file, JSON.stringify(settings)); output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/' + name + '.json --capture <profile>/captures.jsonl --watch <tmp>/watch2.json', stub: url, ttl }); return p; }
async function tui(p, args = []) { const cfg = join(dir, 'pty-' + p.name + '.json'); fs.writeFileSync(cfg, JSON.stringify({ name: p.name, workspace: p.workspace, env: env(p) })); const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), cfg, '--extension', join(dir, 'inspect.ts'), ...args], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }); processes.push(child); let raw = '', codes = []; stream(child.stdout, c => { raw += c; for (const m of clean(raw).matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)) if (!codes.includes(m[1])) { codes.push(m[1]); secret(m[1]); } fs.writeFileSync(join(dir, 'phase2-tui-' + p.name + '.raw'), raw); }); stream(child.stderr, c => output({ stderr: c })); await Bun.sleep(1800); const session = { child, get text() { return clean(raw); }, get codes() { return codes; }, async send(text, wait = 350) { const at = clean(raw).length; child.stdin.write(text + '\r'); child.stdin.flush(); await Bun.sleep(wait); const value = clean(raw).slice(at); output({ command: 'tui ' + text, output: value.slice(-1500) }); return value; }, async grant(ids) { const size = codes.length; await this.send('/observer grant ' + ids); return until(() => codes.length > size ? codes.at(-1) : null, 10000, 'bootstrap code'); } }; output({ command: 'python3 <tmp>/pty_driver.py <tmp>/pty-' + p.name + '.json --extension <tmp>/inspect.ts ' + args.join(' '), terminal: { rows: 70, columns: 600 }, startup: session.text.slice(-1300) }); return session; }
async function curl(endpoint, path, options = {}) { const args = ['-sS', '--max-time', '35', '-D', '-']; if (options.method) args.push('-X', options.method); if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential); if (options.body) args.push('--data', JSON.stringify(options.body)); args.push(new URL(path, endpoint).href); const begin = Date.now(), proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]); const at = stdout.indexOf('\r\n\r\n'), body = at < 0 ? stdout : stdout.slice(at + 4), status = Number(/HTTP\/\S+ (\d+)/.exec(stdout)?.[1] ?? 0); let parsed; try { parsed = JSON.parse(body); } catch { } if (parsed?.credential) secret(parsed.credential); const result = { command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), status, exitCode, cache: /cache-control:\s*([^\r\n]+)/i.exec(stdout)?.[1] ?? null, parsed, ms: Date.now() - begin }; responses.push(result); output({ ...result, parsed: parsed ? { kind: parsed.kind, reason: parsed.reason, atEnd: parsed.atEnd, entries: parsed.entries?.length, credential: parsed.credential, children: parsed.children?.map(c => ({ id: c.childId, status: c.registryStatus })) } : body.slice(0, 500), stderr }); return result; }
async function exchange(endpoint, code) { const r = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } }); assert.equal(r.status, 200); return r.parsed.credential; }
function state(tag) { return jsonl(join(dir, 'states.jsonl')).findLast(e => e.tag === tag); }
function reads(events) { return events.filter(e => ['readSync', 'handle.read', 'readFile', 'readFileSync'].includes(e.op) && e.file?.includes('.jsonl')); }
function io() { return jsonl(join(dir, 'io.jsonl')); }
function durations(rows) { return rows.filter(r => r.kind === 'sub' && r.lifecycle?.acceptedAt && r.lifecycle?.terminalAt).map(r => r.lifecycle.terminalAt - r.lifecycle.acceptedAt).filter(v => v >= 0).sort((a, b) => a - b); }
function summary(values) { return { count: values.length, min: values[0] ?? null, median: values[Math.floor(values.length / 2)] ?? null, p90: values[Math.floor(values.length * .9)] ?? null, max: values.at(-1) ?? null }; }
try {
  const p = await setup('many-135', true, 5000); const s = await tui(p); await s.send('/observer serve'); const endpoint = await until(() => /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(s.text)?.[1], 10000, 'many-135 endpoint'); await s.send('HARNESS_AGENT=main', 1600); await s.send('/gate-state fanout-active'); const active = state('fanout-active'); let rows = active.rows.filter(r => r.kind === 'sub'); if (rows.length < 2) { await Bun.sleep(1500); await s.send('/gate-state fanout-active-later'); rows = state('fanout-active-later').rows.filter(r => r.kind === 'sub'); } assert.ok(rows.length >= 2); const candidates = rows.filter(r => r.status === 'running').sort((a, b) => a.createdAt - b.createdAt); assert.ok(candidates.length >= 2); const [a, b] = candidates.slice(-2); output({ selectedChildren: [a, b], nativeChildrenRegistered: rows.length }); const code = await s.grant(a.id + ' ' + b.id); const credential = await exchange(endpoint, code); const snapshot = await curl(endpoint, '/v1/snapshot', { credential });
  const requestAt = Date.now(); const initialB = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page', { credential }); fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ file: a.sessionFile, release: false })); const stalled = curl(endpoint, '/v1/children/' + encodeURIComponent(a.id) + '/page', { credential }); await until(() => io().findLast(e => e.op === 'held-read' && e.file === a.sessionFile && e.at >= requestAt), 10000, 'stalled reader'); const duringStart = Date.now(); const healthy = []; let token = initialB.parsed?.token ?? ''; for (let n = 0; n < 4; n++) { const r = await curl(endpoint, '/v1/children/' + encodeURIComponent(b.id) + '/page?token=' + encodeURIComponent(token), { credential }); healthy.push(r); token = r.parsed?.token ?? token; await Bun.sleep(450); } await s.send('/gate-state fanout-during-stall'); const during = state('fanout-during-stall'); fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ release: true })); const released = await stalled;
  await until(() => jsonl(join(dir, 'native.jsonl')).findLast(e => e.rows.filter(r => r.kind === 'sub' && r.sessionFile?.startsWith(p.home) && r.lifecycle?.terminalAt).length === 135), 40000, '135 native completions'); await Bun.sleep(6000); await s.send('/gate-state fanout-finished'); const finished = state('fanout-finished'); const nativeEvents = jsonl(join(dir, 'native.jsonl')); const completions = finished.rows.filter(r => r.kind === 'sub' && r.lifecycle?.terminalAt >= duringStart && r.lifecycle?.terminalAt <= during.at); const park = nativeEvents.find(e => e.at > requestAt && e.rows.some(r => r.id === b.id && r.sessionFile === b.sessionFile && r.status === 'parked')); const afterPark = park ? reads(io().filter(e => e.at > park.at && e.at <= finished.at)) : []; report('nfr-8.post-request-parking', Boolean(park) && afterPark.length === 0, { childId: b.id, requestAt, parkAt: park?.at ?? null, delayAfterRequestMs: park ? park.at - requestAt : null, afterParkWindowMs: park ? finished.at - park.at : null, observerReadsAfterParking: afterPark, ttlMs: 5000 });
  const nativeCount = finished.rows.filter(r => r.kind === 'sub').length; const completeCount = finished.rows.filter(r => r.kind === 'sub' && r.lifecycle?.terminalAt).length; const observedPace = durations(finished.rows); report('v03.two-readers-native-pace', healthy.every(r => r.status === 200 && r.parsed?.kind === 'page') && nativeCount === 135 && completeCount === 135 && completions.length > 0, { stalledMs: released.ms, healthyReads: healthy.length, healthyMaxLatencyMs: Math.max(...healthy.map(r => r.ms)), healthyPageEntries: healthy.map(r => r.parsed?.entries?.length ?? 0), nativeCompletionsDuringStall: completions.length, nativeCount, completeCount, stubDelayMs: 1500, acceptedToTerminalMs: summary(observedPace), limitation: 'Comparison to the unlinked native baseline below determines whether observed lifecycle duration is consistent with native scheduling, not an absolute throughput guarantee.' });
  const endpointEvents = io().filter(e => e.pid === io().findLast(e => e.op === 'Bun.serve-bound')?.pid && e.op === 'Bun.serve-bound'); report('v03.one-endpoint-reader-count', endpointEvents.length === 1, { boundServersInMany135Process: endpointEvents.length, endpointPorts: endpointEvents.map(e => e.port), simultaneousReaderRequests: 2, model: 'one server endpoint; two independent HTTP page requests', snapshotChildren: snapshot.parsed?.children?.length });
  await s.send('/gate-stop', 800); const teardown = JSON.parse(fs.readFileSync(join(dir, 'teardown.json'), 'utf8')); report('v11.teardown-native-isolation-many135', teardown.filesEqual && teardown.registryEqual && teardown.runtimeNull && teardown.grants.liveCredentials === 0, { filesEqual: teardown.filesEqual, registryEqual: teardown.registryEqual, runtimeNull: teardown.runtimeNull, nativeFiles: Object.keys(teardown.nativeFiles).length, grants: teardown.grants }); s.child.kill(); await s.child.exited;
  const allSecrets = []; function scanHome(path) { for (const e of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, e.name); if (e.isDirectory()) scanHome(file); else if (e.isFile() && e.name.endsWith('.jsonl')) { const text = fs.readFileSync(file, 'utf8'); for (const secret of secrets) if (text.includes(secret)) allSecrets.push(relative(p.home, file)); } } } scanHome(p.home); const captures = jsonl(p.capture); report('v11.secret-isolation-many135', allSecrets.length === 0 && captures.every(c => c.secret_seen === false), { matchingFiles: allSecrets, stubRequests: captures.length, secretSeenTrue: captures.filter(c => c.secret_seen === true).length }); const root = p.root; await p.teardown(); p.tornDown = true; output({ cleanup: 'many-135 observer profile', removed: !fs.existsSync(root) });
  const native = await setup('many-135', false); const nr = native.spawn(['--mode', 'rpc', '--extension', join(dir, 'inspect.ts')]); processes.push(nr); let nativeOutput = ''; stream(nr.stdout, c => nativeOutput += c); stream(nr.stderr, c => output({ nativeBaselineStderr: c })); await Bun.sleep(1400); nr.stdin.write(JSON.stringify({ type: 'prompt', id: 'main', message: 'HARNESS_AGENT=main' }) + '\n'); nr.stdin.flush(); await Bun.sleep(25000); nr.stdin.write(JSON.stringify({ type: 'prompt', id: 'state', message: '/gate-state native135-baseline' }) + '\n'); nr.stdin.flush(); await Bun.sleep(800); const ns = state('native135-baseline'), nativePace = durations(ns?.rows ?? []); output({ native135Baseline: { rows: ns?.rows?.length, childRows: ns?.rows?.filter(r => r.kind === 'sub').length, acceptedToTerminalMs: summary(nativePace), observer: summary(observedPace) }, rpcOutput: nativeOutput.slice(-1000) }); report('v03.native-pace-baseline', nativePace.length === 135 && observedPace.length === 135 && summary(observedPace).median <= summary(nativePace).median * 1.5, { native: summary(nativePace), observer: summary(observedPace), limitation: 'The 1.5 ratio is a disclosed smoke measurement, not a frozen performance budget; both runs must complete all 135 children.' }); nr.kill(); await nr.exited;
  const advisor = await setup('advisor-present', true, 1000); const first = await tui(advisor); await first.send('HARNESS_AGENT=main', 1400); await Bun.sleep(6000); await first.send('/gate-state advisor-before-restore'); const rootSession = state('advisor-before-restore').root; first.child.kill(); await first.child.exited; const restored = await tui(advisor, ['--session', rootSession]); await restored.send('/gate-state advisor-restored'); const restoredState = state('advisor-restored'); output({ advisorRestored: restoredState }); const advisorRef = restoredState.rows.find(r => r.kind === 'advisor'); const ordinary = restoredState.rows.find(r => r.kind === 'sub'); assert.ok(advisorRef, 'No native advisor ref after restore'); const codeCount = restored.codes.length; const grantOutput = await restored.send('/observer grant ' + advisorRef.id); const urlOutput = await restored.send('/observer url ' + advisorRef.id); await restored.send('/observer serve'); const advisorEndpoint = await until(() => /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(restored.text)?.[1], 10000, 'advisor endpoint'); let advisorCredential; if (ordinary) { const ordinaryCode = await restored.grant(ordinary.id); advisorCredential = await exchange(advisorEndpoint, ordinaryCode); } const advisorPage = await curl(advisorEndpoint, '/v1/children/' + encodeURIComponent(advisorRef.id) + '/page', { credential: advisorCredential }); report('v11.advisor-rejected', grantOutput.includes('child ids not admitted') && urlOutput.includes('child ids not admitted') && advisorPage.status === 401 && restored.codes.length === codeCount + (ordinary ? 1 : 0), { advisorId: advisorRef.id, nativeKind: advisorRef.kind, grantOutput: grantOutput.slice(-1200), urlOutput: urlOutput.slice(-1200), directPageStatus: advisorPage.status, ordinaryCredentialUsed: Boolean(advisorCredential) }); if (advisorCredential) { const approved = await curl(advisorEndpoint, '/v1/snapshot', { credential: advisorCredential }); report('v11.advisor-excluded-snapshot', approved.status === 200 && approved.parsed.children.every(c => c.childId !== advisorRef.id), { returnedChildren: approved.parsed?.children?.map(c => c.childId) }); } restored.child.kill(); await restored.child.exited;
  const advisorCaptures = jsonl(advisor.capture); const advisorSecretFiles = []; function scanAdvisor(path) { for (const e of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, e.name); if (e.isDirectory()) scanAdvisor(file); else if (e.isFile() && e.name.endsWith('.jsonl')) for (const s of secrets) if (fs.readFileSync(file, 'utf8').includes(s)) advisorSecretFiles.push(relative(advisor.home, file)); } } scanAdvisor(advisor.home); report('v11.secret-isolation-advisor', advisorSecretFiles.length === 0 && advisorCaptures.every(c => c.secret_seen === false), { nativeJsonlMatches: advisorSecretFiles, stubRequests: advisorCaptures.length, secretSeenTrue: advisorCaptures.filter(c => c.secret_seen === true).length });
  const all = io(), rejected = new Set(all.filter(e => e.op === 'request-end' && [401, 403, 421].includes(e.status)).map(e => e.pid + ':' + e.request.id)), invalid = reads(all).filter(e => !e.request || !e.request.hasAuthorization || (e.module === 'stock-source.ts' && e.request.path !== '/v1/snapshot') || rejected.has(e.pid + ':' + e.request.id)); report('nfr-8.all-scenarios-authenticated-only', invalid.length === 0, { transcriptReads: reads(all).length, headers: reads(all).filter(e => e.module === 'stock-source.ts').length, invalid }); report('v08.phase2-no-store', responses.every(r => r.status === 0 || r.cache === 'no-store'), { responses: responses.length });
  fs.writeFileSync(join(dir, 'phase2.json'), JSON.stringify({ observedPace, nativePace, responses: responses.map(r => ({ command: normalize(r.command), status: r.status, cache: r.cache, ms: r.ms })), secrets: secrets.length }));
} catch (error) { output({ fatal: String(error), stack: error.stack }); process.exitCode = 1; }
finally { for (const p of processes) { p.kill(); await p.exited.catch(() => { }); } for (const p of profiles) if (!p.tornDown) { const root = p.root; await p.teardown(); output({ cleanup: 'profile ' + p.name, removed: !fs.existsSync(root) }); } fs.rmSync(watch, { force: true }); output({ cleanup: 'watch2', removed: !fs.existsSync(watch) }); fs.writeFileSync(join(dir, 'hold.json'), JSON.stringify({ release: true })); }
```

## phase2-results.jsonl normalized runner output

SHA256 of the complete normalized JSONL output: `f8bdaf3abd5e6f7ad6a5ba5f6e7298460fb2fb79fe0edb00bf64214cff0a1a0e`. No lines are omitted. Long terminal redraws are the runner's observed output excerpts, not elided report lines.

```jsonl
{"command":"omp --profile many-135 plugin uninstall omp-orca-observer","exitCode":0,"stdout":"✔ Uninstalled omp-orca-observer\n","stderr":""}
{"command":"omp --profile many-135 plugin link <tmp>observer","exitCode":0,"stdout":"✔ Linked omp-orca-observer from <tmp>observer\n","stderr":""}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-135.json --capture <profile>/captures.jsonl --watch <tmp>/watch2.json","stub":"http://127.0.0.1:42389/v1","ttl":5000}
{"command":"python3 <tmp>/pty_driver.py <tmp>/pty-many-135.json --extension <tmp>/inspect.ts ","terminal":{"rows":70,"columns":600},"startup":"\u001b>25a1;stsp;q;{\"q\":\"hello\",\"v\":[1],\"app\":\"omp\"}"}
{"command":"tui /observer serve","output":"                                                                                                                                                                                                                                                                                                       \r\r π > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\r"}
{"command":"tui HARNESS_AGENT=main","output":"───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃─────────────────────────────────────────────────────────────────────────128K─◀ 👥 16 < ⚙ 119 \r ⠙ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶────────────────────────────────────────────────────11%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃─────────────────────────────────────────────────────────────────────────128K─◀ 👥 16 < ⚙ 119 \r ⠹ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶────────────────────────────────────────────────────11%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃─────────────────────────────────────────────────────────────────────────128K─◀ 👥 16 < ⚙ 119 \r"}
{"command":"tui /gate-state fanout-active","output":"                                                                                                                                                                                                                                                                                 Harness auxiliary reply\r ⠙ 1s > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶────────────────────────────────────────────────────11%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃─────────────────────────────────────────────────────────────────────────128K─◀ 👥 16 < ⚙ 119 \r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           ←← to see 16 running agents\r"}
{"selectedChildren":[{"id":"agent-1","kind":"sub","parentId":"Main","status":"running","createdAt":1790834274242,"sessionFile":"<tmp>/profile-many-135/home/.omp/profiles/many-135/agent/sessions/--tmp-omp-orca-harness-Wx8e1D-workspace--/2026-10-01T05-57-52-572Z_01a0f60a-693c-7460-bf5b-be2e6c373592/agent-1.jsonl","history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false}},{"id":"agent-14","kind":"sub","parentId":"Main","status":"running","createdAt":1790834274246,"sessionFile":"<tmp>/profile-many-135/home/.omp/profiles/many-135/agent/sessions/--tmp-omp-orca-harness-Wx8e1D-workspace--/2026-10-01T05-57-52-572Z_01a0f60a-693c-7460-bf5b-be2e6c373592/agent-14.jsonl","history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false}}],"nativeChildrenRegistered":16}
{"command":"tui /observer grant agent-1 agent-14","output":"                                                                                                                                                                                                                                                                                 Harness auxiliary reply\r ⠏ 2s > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶──────────────────────────────────────────────────────────12%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃───────────────────────────────────────────────────────────────────────────128K─◀ ⚙ 119 \r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:46399/v1/session\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"credential":"<secret>"},"ms":65,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/snapshot\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"children":[{"id":"agent-1","status":"idle"},{"id":"agent-14","status":"idle"}]},"ms":98,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/children/agent-14/page\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"kind":"page","atEnd":true,"entries":7},"ms":17,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/children/agent-14/page?token=eyJjaGlsZElkIjoiYWdlbnQtMTQiLCJlcG9jaCI6ImU5YzZmY2ViLWYxNDktNDlmOC05ZDE0LWNhOWZhNjlkN2FjYSIsInNlc3Npb25GaWxlIjoiL3RtcC9vbXAtb3JjYS1oYXJuZXNzLVd4OGUxRC9ob21lLy5vbXAvcHJvZmlsZXMvbWFueS0xMzUvYWdlbnQvc2Vzc2lvbnMvLS10bXAtb21wLW9yY2EtaGFybmVzcy1XeDhlMUQtd29ya3NwYWNlLS0vMjAyNi0xMC0wMVQwNS01Ny01Mi01NzJaXzAxYTBmNjBhLTY5M2MtNzQ2MC1iZjViLWJlMmU2YzM3MzU5Mi9hZ2VudC0xNC5qc29ubCIsImlub2RlIjoiMjA5NjUzOSIsInNpemUiOjE2MTg1LCJjdXJzb3IiOjE2MTg1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoxNTgwNiwiZW5kIjoxNjE4NSwic2hhMjU2IjoiNGI4YzJlNGI2MDVkNjNiZDdlNDhmNWI1ZWM5ZjE3NmFjM2FmMGE1NjU5MDhjNTIzMGQ4YzdkYzNhNzY1MzRjNiJ9LCJzY2FuU3RhcnQiOm51bGx9\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"kind":"page","atEnd":true,"entries":0},"ms":9,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/children/agent-14/page?token=eyJjaGlsZElkIjoiYWdlbnQtMTQiLCJlcG9jaCI6ImU5YzZmY2ViLWYxNDktNDlmOC05ZDE0LWNhOWZhNjlkN2FjYSIsInNlc3Npb25GaWxlIjoiL3RtcC9vbXAtb3JjYS1oYXJuZXNzLVd4OGUxRC9ob21lLy5vbXAvcHJvZmlsZXMvbWFueS0xMzUvYWdlbnQvc2Vzc2lvbnMvLS10bXAtb21wLW9yY2EtaGFybmVzcy1XeDhlMUQtd29ya3NwYWNlLS0vMjAyNi0xMC0wMVQwNS01Ny01Mi01NzJaXzAxYTBmNjBhLTY5M2MtNzQ2MC1iZjViLWJlMmU2YzM3MzU5Mi9hZ2VudC0xNC5qc29ubCIsImlub2RlIjoiMjA5NjUzOSIsInNpemUiOjE2MTg1LCJjdXJzb3IiOjE2MTg1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoxNTgwNiwiZW5kIjoxNjE4NSwic2hhMjU2IjoiNGI4YzJlNGI2MDVkNjNiZDdlNDhmNWI1ZWM5ZjE3NmFjM2FmMGE1NjU5MDhjNTIzMGQ4YzdkYzNhNzY1MzRjNiJ9LCJzY2FuU3RhcnQiOm51bGx9\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"kind":"page","atEnd":true,"entries":0},"ms":7,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/children/agent-14/page?token=eyJjaGlsZElkIjoiYWdlbnQtMTQiLCJlcG9jaCI6ImU5YzZmY2ViLWYxNDktNDlmOC05ZDE0LWNhOWZhNjlkN2FjYSIsInNlc3Npb25GaWxlIjoiL3RtcC9vbXAtb3JjYS1oYXJuZXNzLVd4OGUxRC9ob21lLy5vbXAvcHJvZmlsZXMvbWFueS0xMzUvYWdlbnQvc2Vzc2lvbnMvLS10bXAtb21wLW9yY2EtaGFybmVzcy1XeDhlMUQtd29ya3NwYWNlLS0vMjAyNi0xMC0wMVQwNS01Ny01Mi01NzJaXzAxYTBmNjBhLTY5M2MtNzQ2MC1iZjViLWJlMmU2YzM3MzU5Mi9hZ2VudC0xNC5qc29ubCIsImlub2RlIjoiMjA5NjUzOSIsInNpemUiOjE2MTg1LCJjdXJzb3IiOjE2MTg1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoxNTgwNiwiZW5kIjoxNjE4NSwic2hhMjU2IjoiNGI4YzJlNGI2MDVkNjNiZDdlNDhmNWI1ZWM5ZjE3NmFjM2FmMGE1NjU5MDhjNTIzMGQ4YzdkYzNhNzY1MzRjNiJ9LCJzY2FuU3RhcnQiOm51bGx9\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"kind":"page","atEnd":true,"entries":0},"ms":6,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/children/agent-14/page?token=eyJjaGlsZElkIjoiYWdlbnQtMTQiLCJlcG9jaCI6ImU5YzZmY2ViLWYxNDktNDlmOC05ZDE0LWNhOWZhNjlkN2FjYSIsInNlc3Npb25GaWxlIjoiL3RtcC9vbXAtb3JjYS1oYXJuZXNzLVd4OGUxRC9ob21lLy5vbXAvcHJvZmlsZXMvbWFueS0xMzUvYWdlbnQvc2Vzc2lvbnMvLS10bXAtb21wLW9yY2EtaGFybmVzcy1XeDhlMUQtd29ya3NwYWNlLS0vMjAyNi0xMC0wMVQwNS01Ny01Mi01NzJaXzAxYTBmNjBhLTY5M2MtNzQ2MC1iZjViLWJlMmU2YzM3MzU5Mi9hZ2VudC0xNC5qc29ubCIsImlub2RlIjoiMjA5NjUzOSIsInNpemUiOjE2MTg1LCJjdXJzb3IiOjE2MTg1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoxNTgwNiwiZW5kIjoxNjE4NSwic2hhMjU2IjoiNGI4YzJlNGI2MDVkNjNiZDdlNDhmNWI1ZWM5ZjE3NmFjM2FmMGE1NjU5MDhjNTIzMGQ4YzdkYzNhNzY1MzRjNiJ9LCJzY2FuU3RhcnQiOm51bGx9\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"kind":"page","atEnd":true,"entries":0},"ms":6,"stderr":""}
{"command":"tui /gate-state fanout-during-stall","output":"                                                                                                                                                                                                                                                                                 Harness auxiliary reply\r  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\r ⠋ 4s > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶──────────────────────────────────────────────────────────────13%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 16 < ⚙ 87 \r"}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:46399/v1/children/agent-1/page\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"kind":"page","atEnd":true,"entries":7},"ms":2233,"stderr":""}
{"command":"tui /gate-state fanout-finished","output":"                                                                                                                                                                                                                                                                                 Harness auxiliary reply\r π > ⬢ Harness scripted model > 🗑 omp-orca-harness-Wx8e1D/workspace > ⑂ master ▶───────────────────────────────────────────────────────────────────────────────────────────────────19%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"criterion":"nfr-8.post-request-parking","result":"PASS","childId":"agent-14","requestAt":1790834276248,"parkAt":1790834280904,"delayAfterRequestMs":4656,"afterParkWindowMs":15924,"observerReadsAfterParking":[],"ttlMs":5000}
{"criterion":"v03.two-readers-native-pace","result":"PASS","stalledMs":2233,"healthyReads":4,"healthyMaxLatencyMs":9,"healthyPageEntries":[0,0,0,0],"nativeCompletionsDuringStall":16,"nativeCount":135,"completeCount":135,"stubDelayMs":1500,"acceptedToTerminalMs":{"count":135,"min":0,"median":1,"p90":1,"max":2},"limitation":"Comparison to the unlinked native baseline below determines whether observed lifecycle duration is consistent with native scheduling, not an absolute throughput guarantee."}
{"criterion":"v03.one-endpoint-reader-count","result":"PASS","boundServersInMany135Process":1,"endpointPorts":[46399],"simultaneousReaderRequests":2,"model":"one server endpoint; two independent HTTP page requests","snapshotChildren":2}
{"command":"tui /gate-stop","output":" gate-stop {\"at\":1790834339556,\"filesEqual\":true,\"registryEqual\":true,\"runtimeNull\":true,\"coordinator\":{\"state\":\"unavailable\",\"reason\":\"disposed\"},\"grants\":{\"liveCredentials\":0,\"grantedChildIds\":[],\"pendingCodes\":0},\"nativeFiles\":136,\"rows\":136}                                                                                                                                                                                                                                                                                                                                                                   \r"}
{"criterion":"v11.teardown-native-isolation-many135","result":"PASS","filesEqual":true,"registryEqual":true,"runtimeNull":true,"nativeFiles":136,"grants":{"liveCredentials":0,"grantedChildIds":[],"pendingCodes":0}}
{"criterion":"v11.secret-isolation-many135","result":"PASS","matchingFiles":[],"stubRequests":286,"secretSeenTrue":0}
{"cleanup":"many-135 observer profile","removed":true}
{"command":"omp --profile many-135 plugin uninstall omp-orca-observer","exitCode":0,"stdout":"✔ Uninstalled omp-orca-observer\n","stderr":""}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-135.json --capture <profile>/captures.jsonl --watch <tmp>/watch2.json","stub":"http://127.0.0.1:34923/v1","ttl":10000}
{"native135Baseline":{"rows":136,"childRows":135,"acceptedToTerminalMs":{"count":135,"min":0,"median":1,"p90":1,"max":2},"observer":{"count":135,"min":0,"median":1,"p90":1,"max":2}},"rpcOutput":"nt-135\",\"durationMs\":14035},{\"jobId\":\"agent-134\",\"type\":\"task\",\"label\":\"agent-134\",\"durationMs\":14035}]},\"timestamp\":1790834358655},{\"role\":\"assistant\",\"content\":[],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"scripted\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"error\",\"timestamp\":1790834358660,\"errorStatus\":409,\"errorId\":409,\"errorMessage\":\"409 Unscripted turn\",\"duration\":2.600354000001971}],\"isTerminal\":true,\"yielded\":true}\n{\"type\":\"extension_ui_request\",\"id\":\"1594d0426267fae7\",\"method\":\"setWidget\",\"widgetKey\":\"autoresearch\"}\n{\"type\":\"session_settled\"}\n{\"type\":\"extension_ui_request\",\"id\":\"1594d04bc427fae8\",\"method\":\"notify\",\"message\":\"gate-state native135-baseline rows=136\",\"notifyType\":\"info\"}\n{\"id\":\"state\",\"type\":\"response\",\"command\":\"prompt\",\"success\":true}\n{\"type\":\"prompt_result\",\"id\":\"state\",\"agentInvoked\":false,\"status\":\"completed\",\"sessionSettled\":true}\n"}
{"criterion":"v03.native-pace-baseline","result":"PASS","native":{"count":135,"min":0,"median":1,"p90":1,"max":2},"observer":{"count":135,"min":0,"median":1,"p90":1,"max":2},"limitation":"The 1.5 ratio is a disclosed smoke measurement, not a frozen performance budget; both runs must complete all 135 children."}
{"command":"omp --profile advisor-present plugin uninstall omp-orca-observer","exitCode":0,"stdout":"✔ Uninstalled omp-orca-observer\n","stderr":""}
{"command":"omp --profile advisor-present plugin link <tmp>observer","exitCode":0,"stdout":"✔ Linked omp-orca-observer from <tmp>observer\n","stderr":""}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/advisor-present.json --capture <profile>/captures.jsonl --watch <tmp>/watch2.json","stub":"http://127.0.0.1:37123/v1","ttl":1000}
{"command":"python3 <tmp>/pty_driver.py <tmp>/pty-advisor-present.json --extension <tmp>/inspect.ts ","terminal":{"rows":70,"columns":600},"startup":"\u001b>25a1;stsp;q;{\"q\":\"hello\",\"v\":[1],\"app\":\"omp\"}\r\r\n π > ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶──────────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\r"}
{"command":"tui HARNESS_AGENT=main","output":"                                                                                                                                                                                                                                                                                                       \r π > ⬢ Harness scripted model 🙈 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r π > ⬢ Harness scripted model 🙈 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r"}
{"command":"tui /gate-state advisor-before-restore","output":"                                                                                                                                                                                                                                                                                 Harness auxiliary reply\r π > ⬢ Harness scripted model 🙈 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"command":"python3 <tmp>/pty_driver.py <tmp>/pty-advisor-present.json --extension <tmp>/inspect.ts --session <tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844.jsonl","terminal":{"rows":70,"columns":600},"startup":"                                                                    Harness auxiliary reply\r\r\n π > ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"command":"tui /gate-state advisor-restored","output":"                                                                                                                                                                                                                                                                                Harness auxiliary reply\r π > ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"advisorRestored":{"tag":"advisor-restored","at":1790834382446,"mode":"tui","root":"<tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844.jsonl","rows":[{"id":"advisor-child","kind":"sub","parentId":"Main","status":"parked","createdAt":1790834372875,"sessionFile":"<tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844/advisor-child.jsonl","history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"advisor","readOnly":false,"outputPath":"<tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844/advisor-child.md","metrics":{"tokens":0,"requests":1,"tools":1,"cost":0,"durationMs":1081,"durationKind":"span"}}},{"id":"advisor-child/advisor","kind":"advisor","parentId":"advisor-child","status":"parked","createdAt":1790834372949,"sessionFile":"<tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844/advisor-child/__advisor.jsonl","history":{"readOnly":true,"metrics":{"tokens":0,"requests":1,"tools":0,"cost":0,"durationMs":5,"durationKind":"span"},"resolvedModel":"stub/advisor","resolvedModelIsFallback":false}},{"id":"Main","kind":"main","parentId":null,"status":"running","createdAt":1790834381453,"sessionFile":"<tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844.jsonl"},{"id":"Main/advisor","kind":"advisor","parentId":"Main","status":"parked","createdAt":1790834372956,"sessionFile":"<tmp>/profile-advisor-present/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-oc2hA2-workspace--/2026-10-01T05-59-31-954Z_01a0f60b-ed72-746d-b29c-2fcd44747844/__advisor.jsonl","history":{"readOnly":true,"metrics":{"tokens":0,"requests":2,"tools":0,"cost":0,"durationMs":17,"durationKind":"span"},"resolvedModel":"stub/advisor","resolvedModelIsFallback":false}}]}}
{"command":"tui /observer grant advisor-child/advisor","output":"                                                                                                                                                                                                                                                                                Harness auxiliary reply\r π > ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"command":"tui /observer url advisor-child/advisor","output":"                                                                                                                                                                                                                                                                                Harness auxiliary reply\r π > ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"command":"tui /observer serve","output":"                                                                                                                                                                                                                                                                                Harness auxiliary reply\r π > ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r"}
{"command":"tui /observer grant advisor-child","output":" http://127.0.0.1:37399/#code=<secret>                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r"}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:37399/v1/session\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"credential":"<secret>"},"ms":8,"stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:37399/v1/children/advisor-child%2Fadvisor/page\"","status":401,"exitCode":0,"cache":"no-store","parsed":"Unauthorized","ms":5,"stderr":""}
{"criterion":"v11.advisor-rejected","result":"PASS","advisorId":"advisor-child/advisor","nativeKind":"advisor","grantOutput":" ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r","urlOutput":" ⬢ Harness scripted model 👁 > 🗑 omp-orca-harness-oc2hA2/workspace > ⑂ master ▶───────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      \r","directPageStatus":401,"ordinaryCredentialUsed":true}
{"command":"curl \"-sS\" \"--max-time\" \"35\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:37399/v1/snapshot\"","status":200,"exitCode":0,"cache":"no-store","parsed":{"children":[{"id":"advisor-child","status":"parked"}]},"ms":7,"stderr":""}
{"criterion":"v11.advisor-excluded-snapshot","result":"PASS","returnedChildren":["advisor-child"]}
{"criterion":"v11.secret-isolation-advisor","result":"PASS","nativeJsonlMatches":[],"stubRequests":8,"secretSeenTrue":0}
{"criterion":"nfr-8.all-scenarios-authenticated-only","result":"PASS","transcriptReads":60,"headers":46,"invalid":[]}
{"criterion":"v08.phase2-no-store","result":"PASS","responses":11}
{"cleanup":"profile many-135","removed":true}
{"cleanup":"profile advisor-present","removed":true}
{"cleanup":"watch2","removed":true}
```

Counter-log receipt io.jsonl: raw SHA256 `fa4089e00f002999943822c61e58f403b2e9979ec2283bae12d56d4855ce45ec`; bytes=4725758; lines=16137. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.

Counter-log receipt native.jsonl: raw SHA256 `cd45d557f6a23627f939d4ddefb5b93d8ffc15eb0c4802402fe68a260fcf8f70`; bytes=82432567; lines=2387. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.

## Reproducible phase3 sources

Scripts are reproduced from the exact on-disk bytes; the digests below are of those bytes, not of a pretty-printed rendering. `bootstrap.js` moves only its own process working directory, not its environment. All omp children still receive the harness disposable environment at process start.

### phase3.js

SHA256: `4aedde13836367854d0970680e23d230ecad1cfea05b6814fa114a1185445b0f`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/bootstrap.js phase3.js (supervised until grep completed)`

```javascript
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { join, relative } from 'node:path';
import { createHash } from 'node:crypto';
const repo = process.cwd(), dir = new URL('.', import.meta.url).pathname;
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const p = await create('many-33'); const processes = [], secrets = [];
const watch = join(dir, 'watch3.json'); fs.writeFileSync(watch, '[]');
function normalize(text) { let out = String(text).replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>').replaceAll(p.root, '<tmp>/profile-many-33'); for (const s of secrets) out = out.replaceAll(s, '<secret>'); return out; }
function output(result) { const line = normalize(JSON.stringify(result)); console.log(line); fs.appendFileSync(join(dir, 'phase3-results.jsonl'), line + '\n'); }
function report(criterion, pass, detail) { const result = { criterion, result: pass ? 'PASS' : 'FAIL', ...detail }; output(result); fs.appendFileSync(join(repo, 'omp-orca-observer/checks/evidence/gc2.md'), '\n### ' + criterion + ' — ' + result.result + '\n\n```json\n' + normalize(JSON.stringify(result)) + '\n```\n'); }
function digest(bytes) { return createHash('sha256').update(bytes).digest('hex'); }
function jsonl(file) { try { return fs.readFileSync(file, 'utf8').trim().split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch { return []; } }
function clean(text) { return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, ''); }
function secret(value) { if (value && !secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); } }
async function until(check, ms = 30000, label = 'condition') { const end = Date.now() + ms; while (Date.now() < end) { const value = check(); if (value) return value; await Bun.sleep(40); } throw new Error('Timed out: ' + label); }
async function stream(input, consume) { const reader = input.getReader(), decoder = new TextDecoder(); while (true) { const { done, value } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); } }
function environment() { const env = {}; for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) env[key] = process.env[key]; return { ...env, HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') }; }
async function command(args) { const result = await p.run(args); output({ command: 'omp --profile many-33 ' + args.join(' '), ...result }); assert.equal(result.exitCode, 0); }
async function stub() { const proc = Bun.spawn(['bun', 'run', join(repo, 'omp-orca-observer/checks/harness/stub-provider.ts'), '--scenario', join(repo, 'omp-orca-observer/checks/harness/scenarios/many-33.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' }); processes.push(proc); let text = ''; stream(proc.stdout, c => text += c); stream(proc.stderr, c => output({ stubStderr: c })); const url = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(text)?.[0], 10000, 'stub URL'); const models = join(p.home, '.omp/profiles/many-33/agent/models.yml'); fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replace(/baseUrl:\s*http:\/\/127\.0\.0\.1:\d+\/v1/, 'baseUrl: ' + url)); output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch3.json', url }); return proc; }
async function tui() { const file = join(dir, 'pty-routing.json'); fs.writeFileSync(file, JSON.stringify({ name: 'many-33', workspace: p.workspace, env: environment() })); const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), file, '--extension', join(dir, 'inspect.ts')], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' }); processes.push(child); let raw = '', codes = []; stream(child.stdout, c => { raw += c; for (const m of clean(raw).matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)) if (!codes.includes(m[1])) { codes.push(m[1]); secret(m[1]); } }); stream(child.stderr, c => output({ stderr: c })); await Bun.sleep(1800); return { child, get text() { return clean(raw); }, get codes() { return codes; }, async send(text, wait = 450) { const start = clean(raw).length; child.stdin.write(text + '\r'); child.stdin.flush(); await Bun.sleep(wait); const observed = clean(raw).slice(start); const compact = observed.split('\r').map(l => l.trimEnd()).filter(l => l.trim()).join('\n'); output({ command: 'tui ' + text, output: compact }); } }; }
async function curl(endpoint, path, options = {}) { const args = ['-sS', '--max-time', '15', '-D', '-']; if (options.method) args.push('-X', options.method); if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential); if (options.body) args.push('--data', JSON.stringify(options.body)); args.push(new URL(path, endpoint).href); const proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' }); const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]); const status = Number(/HTTP\/\S+ (\d+)/.exec(stdout)?.[1] ?? 0), body = stdout.slice(stdout.indexOf('\r\n\r\n') + 4); let parsed; try { parsed = JSON.parse(body); } catch { } if (parsed?.credential) secret(parsed.credential); output({ command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), status, exitCode, stdout, stderr }); return { status, parsed, stdout }; }
try {
  const configFile = join(p.home, '.omp/profiles/many-33/agent/config.yml'); const config = JSON.parse(fs.readFileSync(configFile, 'utf8')); config.startup = { setupWizard: false, showSplash: false, checkUpdate: false, quiet: true }; config.task.agentIdleTtlMs = 6000; fs.writeFileSync(configFile, JSON.stringify(config));
  await command(['plugin', 'uninstall', 'omp-orca-observer']); let stubProc = await stub(); const native = await tui(); await native.send('HARNESS_AGENT=main', 1000); await Bun.sleep(9000); native.child.kill(); await native.child.exited; const nativeCaptures = jsonl(p.capture); stubProc.kill(); await stubProc.exited; fs.writeFileSync(p.capture, '');
  await command(['plugin', 'link', join(dir, 'observer')]); stubProc = await stub(); const observer = await tui(); await observer.send('HARNESS_AGENT=main', 1000); await Bun.sleep(9000); await observer.send('/gate-state routing-observer'); const observerCaptures = jsonl(p.capture);
  const nativeMain = nativeCaptures.filter(c => c.agent === 'main'), observerMain = observerCaptures.filter(c => c.agent === 'main'); const paragraph = 'Use native task to create subagents; Orca orchestration, handoffs, or agent launches happen only when the user explicitly asks for them. Never resume an omp child from Orca\'s session history while its parent session is live. The bridge needs no agent action, and you never handle observer credentials.'; const expectedSerialized = JSON.stringify({ role: 'user', content: [{ type: 'text', text: paragraph }] }); const expected = { role: 'user', byteLength: Buffer.byteLength(expectedSerialized), sha256: digest(expectedSerialized) }; const firstNative = nativeMain[0], firstObserver = observerMain[0]; const kept = firstNative.messages.every(m => firstObserver.messages.some(o => m.role === o.role && m.byteLength === o.byteLength && m.sha256 === o.sha256)); const added = firstObserver.messages.filter(m => !firstNative.messages.some(n => m.role === n.role && m.byteLength === n.byteLength && m.sha256 === n.sha256)); const once = observerMain.every(c => c.messages.filter(m => m.sha256 === expected.sha256 && m.byteLength === expected.byteLength).length === 1);
  const stored = []; function scan(path) { for (const entry of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, entry.name); if (entry.isDirectory()) scan(file); else if (entry.isFile() && entry.name.endsWith('.jsonl')) for (const row of jsonl(file)) if (row.type === 'custom_message' && row.customType === 'nikos-agent-stack.omp-orca-observer.guidance') stored.push({ file: relative(p.home, file), bytes: Buffer.byteLength(row.content), sha256: digest(row.content), exact: row.content === paragraph }); } } scan(p.home);
  report('v03.routing-only-like-for-like-tui', kept && added.length === 1 && added[0].sha256 === expected.sha256 && once && stored.length === 1 && stored[0].exact, { firstNative, firstObserver, paragraphBytes: Buffer.byteLength(paragraph), expectedSerializedMessage: expected, added, nativeMainRequests: nativeMain.length, observerMainRequests: observerMain.length, oneGuidanceInEveryMainRequest: once, storedGuidance: stored, scope: 'Both parents are interactive TUI with identical profile environment, workspace, inspector, settings and prompt. Initial request is compared exactly; later native tool-result digests vary by run and are not treated as observer cost.' });
  const current = jsonl(join(dir, 'states.jsonl')).findLast(s => s.tag === 'routing-observer'); const child = current.rows.find(r => r.kind === 'sub'); assert.ok(child); await observer.send('/observer grant ' + child.id); await until(() => observer.codes.length, 10000, 'secret code'); const endpoint = await until(() => /http:\/\/127\.0\.0\.1:\d+\//.exec(observer.text)?.[0], 10000, 'bootstrap endpoint'); const exchange = await curl(endpoint, '/v1/session', { method: 'POST', body: { code: observer.codes.at(-1) } }); assert.equal(exchange.status, 200); const credential = exchange.parsed.credential; await curl(endpoint, '/v1/children/' + encodeURIComponent(child.id) + '/page', { credential }); await curl(endpoint, '/missing', { credential }); await curl(endpoint, '/v1/children/' + encodeURIComponent(child.id) + '/page?mode=mutation', { credential }); await curl(endpoint, '/v1/children/' + encodeURIComponent(child.id) + '/page', { credential, method: 'GET', body: { action: 'abort' } });
  const before = jsonl(p.capture).length; await observer.send('HARNESS_AGENT=main post-credential provider-body check', 1200); await until(() => jsonl(p.capture).length > before, 10000, 'post-credential captured request'); const after = jsonl(p.capture); report('v11.post-credential-model-secret-check', after.every(c => c.secret_seen === false), { requests: after.length, postCredentialRequests: after.slice(before), limitation: 'The deliberate extra main prompt exhausts the stock scenario and the stub returns 409 after capturing the request body; only secret absence in that body is claimed.' });
  fs.writeFileSync(join(dir, 'grep-ready.json'), JSON.stringify({ home: p.home, watch, patterns: secrets })); console.log('GC2_GREPS_READY ' + JSON.stringify({ home: p.home, watch }));
  for await (const chunk of Bun.stdin.stream()) { if (new TextDecoder().decode(chunk).includes('finish')) break; }
  observer.child.kill(); await observer.child.exited;
} catch (error) { output({ fatal: String(error), stack: error.stack }); process.exitCode = 1; }
finally { for (const child of processes) { child.kill(); await child.exited.catch(() => { }); } const root = p.root; await p.teardown(); fs.rmSync(watch, { force: true }); fs.rmSync(join(dir, 'grep-ready.json'), { force: true }); output({ cleanup: 'many-33 routing profile and watch3', profileRemoved: !fs.existsSync(root), watchRemoved: !fs.existsSync(watch) }); }
```

### pace.js

SHA256: `c827ab81b8ac80d01c0ccfb0c49fcb1c2d163d52b27b0538555c5acfbf0916f3`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/pace.js`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const dir = new URL('.', import.meta.url).pathname;
const rows = fs.readFileSync(join(dir, 'states.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
function measure(tag) { const state = rows.findLast(r => r.tag === tag); const children = state.rows.filter(r => r.kind === 'sub'); const durations = children.map(r => r.history?.metrics?.durationMs).filter(v => typeof v === 'number').sort((a, b) => a - b); const lifecycle = children.map(r => r.lifecycle?.responseAt - r.createdAt).filter(v => Number.isFinite(v) && v >= 0).sort((a, b) => a - b); const summarize = v => ({ count: v.length, min: v[0] ?? null, median: v[Math.floor(v.length / 2)] ?? null, p90: v[Math.floor(v.length * .9)] ?? null, max: v.at(-1) ?? null }); return { children: children.length, nativeMetricsDurationMs: summarize(durations), createdToResponseMs: summarize(lifecycle) }; }
const observer = measure('fanout-finished'), native = measure('native135-baseline'); assert.equal(observer.children, 135); assert.equal(native.children, 135);
const result = { criterion: 'v03.native-pace-duration-receipt', result: 'PASS', native, observer, stubDelayMs: 1500, limitation: 'acceptedAt-to-terminalAt records post-response acceptance, not full run duration. These native metrics and createdAt-to-responseAt measurements are the fuller receipts; they include native scheduling and queue time. No arbitrary duration ratio is used as a product budget.' };
console.log(JSON.stringify(result)); fs.writeFileSync(join(dir, 'pace-results.jsonl'), JSON.stringify(result) + '\n'); fs.appendFileSync(join(process.env.GC2_REPO, 'omp-orca-observer/checks/evidence/gc2.md'), '\n### Native pace measurement clarification\n\n```json\n' + JSON.stringify(result) + '\n```\n');
```

### audit.js

SHA256: `2f14e160ab6d991df086f8a62fc5bbcd00686df59bfbf75da67679bd105a4cda`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/audit.js`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const dir = new URL('.', import.meta.url).pathname, repo = process.env.GC2_REPO;
const readLines = name => fs.readFileSync(join(dir, name), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
const events = readLines('io.jsonl');
const reads = events.filter(e => ['readSync', 'handle.read', 'readFile', 'readFileSync'].includes(e.op) && e.file?.includes('.jsonl'));
const rejected = new Set(events.filter(e => e.op === 'request-end' && e.status >= 400).map(e => e.pid + ':' + e.request.id));
const invalid = reads.filter(e => !e.request || !e.request.hasAuthorization || (e.module === 'stock-source.ts' && e.request.path !== '/v1/snapshot') || rejected.has(e.pid + ':' + e.request.id));
const publishers = new Map(); for (const e of events.filter(e => e.op === 'Bun.serve-bound')) { const found = publishers.get(e.pid) ?? []; found.push(e.port); publishers.set(e.pid, found); }
const overlaps = []; for (const held of events.filter(e => e.op === 'held-read')) { const aEnd = events.find(e => e.pid === held.pid && e.op === 'request-end' && e.request.id === held.request.id && e.at >= held.at); if (!aEnd) continue; const healthy = events.filter(e => e.pid === held.pid && e.op === 'request-begin' && e.at >= held.at && e.at < aEnd.at && e.request.id !== held.request.id && e.request.path.startsWith('/v1/children/')).map(e => ({ begin: e, end: events.find(end => end.pid === e.pid && end.op === 'request-end' && end.request.id === e.request.id && end.at >= e.at) })).filter(pair => pair.end?.status === 200 && pair.end.at < aEnd.at); overlaps.push({ heldReadMs: aEnd.at - held.at, otherPageResponsesBeforeHeldReadEnded: healthy.length, otherPageLatenciesMs: healthy.map(p => p.end.at - p.begin.at) }); }
const allRoots = new Set(); for (const event of readLines('native.jsonl')) for (const row of event.rows) if (row.sessionFile?.includes('/home/.omp/')) allRoots.add(row.sessionFile.split('/home/.omp/')[0]);
const normalizedRootChecks = [...allRoots].map((root, index) => ({ profile: 'disposable-' + (index + 1), removed: !fs.existsSync(root) }));
const cacheFiles = ['browser-profile', 'watch.json', 'watch2.json', 'watch3.json', 'grep-ready.json'].map(name => ({ name, removed: !fs.existsSync(join(dir, name)) }));
const phase3 = readLines('phase3-results.jsonl'); const mutation = phase3.find(row => row.command?.includes('"GET"') && row.command?.includes('abort'));
const records = [
  { criterion: 'nfr-8.final-authenticated-read-audit', result: invalid.length === 0 ? 'PASS' : 'FAIL', transcriptReads: reads.length, headerReads: reads.filter(e => e.module === 'stock-source.ts').length, outsideAuthenticatedSnapshotOrPage: invalid.length, rejectedRequestReads: reads.filter(e => rejected.has(e.pid + ':' + e.request.id)).length },
  { criterion: 'v03.endpoint-and-client-attribution', result: [...publishers.values()].every(ports => ports.length === 1) && overlaps.every(o => o.otherPageResponsesBeforeHeldReadEnded > 0) ? 'PASS' : 'FAIL', servers: [...publishers.values()].map((ports, index) => ({ publisher: 'process-' + (index + 1), serverEndpointCount: ports.length, ephemeralPorts: ports })), heldReadOverlaps: overlaps, limitation: 'The two clients are independent curl processes and their concurrent request intervals are attributed to one server. Idle keep-alive sockets are not enumerated; the frozen transport-request-limit ceiling counts in-flight requests rather than total open connections.' },
  { criterion: 'v11.every-mutation-shaped-request-rejected', result: mutation?.status === 200 ? 'FAIL' : 'UNVERIFIED', command: mutation?.command, status: mutation?.status, outputExcerpt: mutation?.stdout?.slice(0, 500), observation: 'The authenticated GET carrying {"action":"abort"} returned an ordinary page. No mutation was observed. All 18 non-GET mutation probes in the primary run were rejected. The orchestrator confirmed that the frozen criterion is literal; no product change or workaround was made.' },
  { criterion: 'cleanup.profile-watch-browser-resources', result: normalizedRootChecks.every(c => c.removed) && cacheFiles.every(c => c.removed) ? 'PASS' : 'FAIL', disposableProfiles: normalizedRootChecks, temporarySensitiveResources: cacheFiles }
];
for (const record of records) { const line = JSON.stringify(record); console.log(line); fs.appendFileSync(join(dir, 'audit-results.jsonl'), line + '\n'); fs.appendFileSync(join(repo, 'omp-orca-observer/checks/evidence/gc2.md'), '\n### ' + record.criterion + ' — ' + record.result + '\n\n```json\n' + line + '\n```\n'); }
const captures = JSON.parse(fs.readFileSync(join(dir, 'capture-observer.json'), 'utf8'));
const guidanceDigest = '47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12';
const children = captures.filter(c => c.agent?.startsWith('child/'));
const guidanceInChildRequests = children.filter(c => c.messages.some(m => m.sha256 === guidanceDigest)).length;
const childRecord = { criterion: 'v03.no-guidance-message-in-child-model-context', result: guidanceInChildRequests === 0 ? 'PASS' : 'FAIL', childProviderRequests: children.length, guidanceInChildRequests, rawCaptureSha256: createHash('sha256').update(fs.readFileSync(join(dir, 'capture-observer.json'))).digest('hex') };
console.log(JSON.stringify(childRecord)); fs.appendFileSync(join(dir, 'audit-results.jsonl'), JSON.stringify(childRecord) + '\n'); fs.appendFileSync(join(repo, 'omp-orca-observer/checks/evidence/gc2.md'), '\n```json\n' + JSON.stringify(childRecord) + '\n```\n');
```

### cleanup-profiles.js

SHA256: `249bdf8d37742f8efec0f545c6428e8378d6131224933ae90a2a92e8b844f8ae`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/cleanup-profiles.js`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
const dir = new URL('.', import.meta.url).pathname, repo = process.env.GC2_REPO;
const events = fs.readFileSync(join(dir, 'native.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line));
const roots = new Set(); for (const event of events) for (const row of event.rows) if (row.sessionFile?.includes('/home/.omp/')) roots.add(row.sessionFile.split('/home/.omp/')[0]);
const receipts = [];
for (const [index, root] of [...roots].entries()) {
  if (!root.startsWith(join(tmpdir(), 'omp-orca-harness-'))) throw new Error('Non-harness root in owned receipt');
  const before = fs.existsSync(root), daemons = [];
  if (before) {
    function inspect(path) { for (const entry of fs.readdirSync(path, { withFileTypes: true })) { const file = join(path, entry.name); if (entry.isDirectory()) inspect(file); else if (entry.isFile() && entry.name === 'meta.json') { const meta = JSON.parse(fs.readFileSync(file, 'utf8')); if (meta.daemon) { daemons.push({ name: meta.daemon.name, state: meta.daemon.state, exitCode: meta.daemon.exitCode }); if (meta.daemon.state !== 'exited') throw new Error('Owned native daemon is not exited'); } } } }
    inspect(root); fs.rmSync(root, { recursive: true, force: true });
  }
  receipts.push({ profile: 'disposable-' + (index + 1), existedAfterHarnessTeardown: before, nativeDaemonReceipts: daemons, removed: !fs.existsSync(root) });
}
const result = { criterion: 'cleanup.final-disposable-profiles', result: receipts.every(r => r.removed) ? 'PASS' : 'FAIL', receipts, observation: 'Three TUI homes reappeared after harness teardown because exited native text-predict daemons wrote final metadata and two native ngram snapshots. Every remaining daemon metadata record was state=exited, exitCode=143. Only owned harness residue was removed; no production code or native behavior was changed.' };
console.log(JSON.stringify(result)); fs.writeFileSync(join(dir, 'cleanup-results.jsonl'), JSON.stringify(result) + '\n'); fs.appendFileSync(join(repo, 'omp-orca-observer/checks/evidence/gc2.md'), '\n### Final disposable profile residue cleanup\n\n```json\n' + JSON.stringify(result) + '\n```\n');
```

### record.js

SHA256: `a3fbc8e453b8a3eb79fa29198bbefae60fbbbc65e054a88fcdeb55fa9739bd50`

Invocation: `env GC2_REPO=$PWD bun run <tmp>/record.js phase3`

```javascript
import fs from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const dir = new URL('.', import.meta.url).pathname;
const repo = process.env.GC2_REPO;
if (!repo) throw new Error('GC2_REPO is required');
const evidence = join(repo, 'omp-orca-observer/checks/evidence/gc2.md');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const stage = process.argv[2];
const sources = stage === 'phase1' ? ['pty_driver.py', 'probe.js', 'inspect.ts', 'gate-attempt1.js', 'gate-attempt2.js', 'gate.js', 'plugin-help.js', 'snapshot.js', 'bootstrap.js', 'record.js'] : stage === 'phase2' ? ['phase2.js'] : ['phase3.js', 'pace.js', 'audit.js', 'cleanup-profiles.js', 'record.js'];
const invoked = {
  'gate-attempt1.js': 'env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js (attempt 1)',
  'gate-attempt2.js': 'env PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/gate.js (attempt 2)',
  'gate.js': 'env GC2_REPO=$PWD PLAYWRIGHT_BROWSERS_PATH=<tmp>/browsers bun run <tmp>/bootstrap.js gate.js',
  'phase2.js': 'env GC2_REPO=$PWD bun run <tmp>/bootstrap.js phase2.js',
  'plugin-help.js': 'bun run <tmp>/plugin-help.js',
  'phase3.js': 'env GC2_REPO=$PWD bun run <tmp>/bootstrap.js phase3.js (supervised until grep completed)',
  'pace.js': 'env GC2_REPO=$PWD bun run <tmp>/pace.js',
  'audit.js': 'env GC2_REPO=$PWD bun run <tmp>/audit.js',
  'cleanup-profiles.js': 'env GC2_REPO=$PWD bun run <tmp>/cleanup-profiles.js',
  'snapshot.js': 'bun run <tmp>/snapshot.js',
  'bootstrap.js': 'env GC2_REPO=$PWD bun run <tmp>/bootstrap.js <runner>',
  'pty_driver.py': 'python3 <tmp>/pty_driver.py <tmp>/pty-<scenario>.json --extension <tmp>/inspect.ts [--session <native-session>]',
  'probe.js': 'imported only by instrumented observer modules in disposable profiles',
  'inspect.ts': 'omp --profile <scenario> --extension <tmp>/inspect.ts [--mode rpc]',
  'record.js': 'env GC2_REPO=$PWD bun run <tmp>/record.js ' + stage
};
fs.appendFileSync(evidence, '\n## Reproducible ' + stage + ' sources\n\nScripts are reproduced from the exact on-disk bytes; the digests below are of those bytes, not of a pretty-printed rendering. `bootstrap.js` moves only its own process working directory, not its environment. All omp children still receive the harness disposable environment at process start.\n');
for (const name of sources) { const bytes = fs.readFileSync(join(dir, name)); fs.appendFileSync(evidence, '\n### ' + name + '\n\nSHA256: `' + hash(bytes) + '`\n\nInvocation: `' + invoked[name] + '`\n\n```' + (name.endsWith('.py') ? 'python' : 'javascript') + '\n' + bytes.toString('utf8') + '```\n'); }
const logs = stage === 'phase1' ? ['results.jsonl'] : stage === 'phase2' ? ['phase2-results.jsonl'] : ['phase3-results.jsonl', 'pace-results.jsonl', 'audit-results.jsonl', 'cleanup-results.jsonl'];
for (const name of logs) { const log = join(dir, name); if (fs.existsSync(log)) { const bytes = fs.readFileSync(log); fs.appendFileSync(evidence, '\n## ' + name + ' normalized runner output\n\nSHA256 of the complete normalized JSONL output: `' + hash(bytes) + '`. No lines are omitted. Long terminal redraws are the runner\'s observed output excerpts, not elided report lines.\n\n```jsonl\n' + bytes.toString('utf8') + '```\n'); } }
for (const name of ['io.jsonl', 'native.jsonl']) if (fs.existsSync(join(dir, name))) { const bytes = fs.readFileSync(join(dir, name)); fs.appendFileSync(evidence, '\nCounter-log receipt ' + name + ': raw SHA256 `' + hash(bytes) + '`; bytes=' + bytes.length + '; lines=' + bytes.toString('utf8').split('\n').filter(Boolean).length + '. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.\n'); }
console.log(JSON.stringify({ stage, evidence: 'omp-orca-observer/checks/evidence/gc2.md', sources, bytes: fs.statSync(evidence).size }));
```

## phase3-results.jsonl normalized runner output

SHA256 of the complete normalized JSONL output: `bfabfc52d908f7a4a97ab050565e07e747caaef9fe9827f2653f031af108344e`. No lines are omitted. Long terminal redraws are the runner's observed output excerpts, not elided report lines.

```jsonl
{"command":"omp --profile many-33 plugin uninstall omp-orca-observer","exitCode":0,"stdout":"✔ Uninstalled omp-orca-observer\n","stderr":""}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch3.json","url":"http://127.0.0.1:46085/v1"}
{"command":"tui HARNESS_AGENT=main","output":"\n HARNESS_AGENT=main\n\n  ⎋ Working…\n\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n ⠋ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\n\n HARNESS_AGENT=main\n\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n\n ⠋ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─\n╭─── ⇶ Task ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮\n│ Run each assigned harness child independently.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       │\n├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤\n│ • agent-1: HARNESS_AGENT=child/agent-1 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • agent-2: HARNESS_AGENT=child/agent-2 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • agent-3: HARNESS_AGENT=child/agent-3 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • agent-4: HARNESS_AGENT=child/agent-4 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • … 29 more agents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n ⠙ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶────────────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n╰─\n╭─── ⇶ Task 33 agents ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮\n│ … 29 more agents (8 running · 21 pending) ⟦Ctrl+O: Expand⟧                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-30                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-31                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-32                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-33                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n ⠹ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃───────────────────────────────────────────────────────────────────────────128K─◀ ⚙ 33\n Subagents\n  ├─ • agent-1: Harness auxiliary reply\n  ├─ • agent-2: Harness auxiliary reply\n  └─ • agent-3: Harness auxiliary reply\n  … 5 more — expand\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n ⠸ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ←← to see 8 running agents\n fanout launched\n Subagents\n  ├─ • agent-1: Harness auxiliary reply\n  ├─ • agent-2: Harness auxiliary reply\n  └─ • agent-3: Harness auxiliary reply\n  … 5 more — expand\n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\n ⠸ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ←← to see 8 running agents\n ⠼ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠼ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠴ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠦ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠧ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25"}
{"command":"omp --profile many-33 plugin link <tmp>observer","exitCode":0,"stdout":"✔ Linked omp-orca-observer from <tmp>observer\n","stderr":""}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <profile>/captures.jsonl --watch <tmp>/watch3.json","url":"http://127.0.0.1:41041/v1"}
{"command":"tui HARNESS_AGENT=main","output":"\n HARNESS_AGENT=main\n\n  ⎋ Working…\n\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n ⠋ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          ⇧⇥ to change thinking effort\n\n HARNESS_AGENT=main\n\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n\n ⠋ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─\n╭─── ⇶ Task ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮\n│ Run each assigned harness child independently.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       │\n├──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤\n│ • agent-1: HARNESS_AGENT=child/agent-1 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • agent-2: HARNESS_AGENT=child/agent-2 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • agent-3: HARNESS_AGENT=child/agent-3 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • agent-4: HARNESS_AGENT=child/agent-4 complete the harness assignment.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              │\n│ • … 29 more agents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   │\n╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n ⠋ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶────────────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n╰─\n╭─── ⇶ Task 33 agents ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮\n│ … 29 more agents (8 running · 21 pending) ⟦Ctrl+O: Expand⟧                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-30                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-31                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-32                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n│ • agent-33                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           │\n ⠙ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶──────────────────────────────────7%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃───────────────────────────────────────────────────────────────────────────128K─◀ ⚙ 33\n fanout launched\n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\n ⠹ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ←← to see 8 running agents\n Subagents\n  ├─ • agent-1: Harness auxiliary reply\n  ├─ • agent-2: Harness auxiliary reply\n  └─ • agent-3: Harness auxiliary reply\n  … 5 more — expand\n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\n ⠸ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            ←← to see 8 running agents\n ⠸ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠼ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠴ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25\n ⠦ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────7%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────────────┃──────────────────────────────────────────────────────────────────────────128K─◀ 👥 8 < ⚙ 25"}
{"command":"tui /gate-state routing-observer","output":" gate-state routing-observer rows=34\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n ✘ 409 Unscripted turn\n Dismissed when you send your next message.\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n╰─"}
{"criterion":"v03.routing-only-like-for-like-tui","result":"PASS","firstNative":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"f5689e0e4e444e21fb823a2629420d319fed2b32b6ce1036c3a6e2ecd3593800"}],"secret_seen":false,"status":200},"firstObserver":{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"f5689e0e4e444e21fb823a2629420d319fed2b32b6ce1036c3a6e2ecd3593800"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"secret_seen":false,"status":200},"paragraphBytes":301,"expectedSerializedMessage":{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"},"added":[{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}],"nativeMainRequests":7,"observerMainRequests":9,"oneGuidanceInEveryMainRequest":true,"storedGuidance":[{"file":".omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-EV2Lnu-workspace--/2026-10-01T06-02-14-181Z_01a0f60e-6725-73ab-ac62-72dbe87b713b.jsonl","bytes":301,"sha256":"514c2b756b6f9b04709a279cc4886b329c1dbe664cc4bd321e844bef074b6699","exact":true}],"scope":"Both parents are interactive TUI with identical profile environment, workspace, inspector, settings and prompt. Initial request is compared exactly; later native tool-result digests vary by run and are not treated as observer cost."}
{"command":"tui /observer grant agent-1","output":" http://127.0.0.1:45287/#code=<secret>"}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:45287/v1/session\"","status":200,"exitCode":0,"stdout":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 157\r\n\r\n{\"credential\":\"<secret>\",\"expiresAt\":\"2026-10-01T06:32:26.110Z\",\"schema\":1,\"epoch\":\"6f7719a4-aba0-436e-a70c-805315236021\"}","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:45287/v1/children/agent-1/page\"","status":200,"exitCode":0,"stdout":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 16348\r\n\r\n{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f60e-6b92-7082-9858-68f7fd91012e\",\"timestamp\":\"2026-10-01T06:02:15.314Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-EV2Lnu-workspace--/2026-10-01T06-02-14-181Z_01a0f60e-6725-73ab-ac62-72dbe87b713b.jsonl\"},{\"type\":\"model_change\",\"id\":\"48a46ea9\",\"parentId\":null,\"timestamp\":\"2026-10-01T06:02:15.399Z\",\"model\":\"stub/scripted\",\"resolvedModelIsFallback\":false},{\"type\":\"session_init\",\"id\":\"344507e0\",\"parentId\":\"48a46ea9\",\"timestamp\":\"2026-10-01T06:02:15.400Z\",\"systemPrompt\":\"RFC 2119 keywords: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL. `NEVER` = `MUST NOT`; `AVOID` = `SHOULD NOT`.\\nXML tags inject system content; may interrupt/notify inside user messages: MUST treat as system-authored/authoritative. User content is sanitized.\\n\\n§ Role\\nYou are omp's trusted coding assistant.\\n\\n# Engineering\\n- Correctness, then six-month maintainability. Delete dead weight; prefer boring design to needless abstraction.\\n- Compiled code: NEVER avoidable allocation, copying, computation.\\n- Unexpected repo changes are the user's; adapt. User-reported errors, failures, observations are ground truth; NEVER rerun checks to confirm them.\\n- Final chat MAY use LaTeX math (`$`, `$$`) and color (`\\\\textcolor`, `\\\\colorbox`, `\\\\fcolorbox`).\\n- MAY emit ` ```mermaid ` blocks; terminal renders ASCII. Only genuine structure/flow, not trivia.\\n§ Runtime\\n# Internal URLs\\nMost FS/bash tools resolve these; path selectors: `read` docs.\\n- `agent://<id>`: output; nested IDs dotted, `/key/index` JSON path; write = message, `agent://all` broadcast only.\\n- `history://<id>`: read-only transcript; bare lists registered agents, not persisted unregistered top-level sessions.\\n- `artifact://<id>`: spilled output; page :N-M or :raw:N-M.\\n- `local://<name>.md`: shared artifact.\\n- `proc://`: jobs/services; `proc://<id>` status/output; write sends stdin (empty = Enter); `proc://<id>/kill` cancels/stops, omit `content`; `proc://<id>/mode`: `persist`|`session`|`detached`.\\n- `ssh://host/<path>`: remote UTF-8 file/dir (max 1 MiB) for read/write/grep; bare lists hosts. Encode `:` `?` `#` as %3A %3F %23. Needs verified POSIX shell; else bash remote SSH or sshfs.\\n- `issue://<N>` / `pr://<N>` (`<owner>/<repo>/<N>` for other repos): GitHub issue/PR; bare: recent; `?state=&limit=&author=&label=`. PR diff: `pr://<N>/diff` (files), `/diff/<i>`, `/diff/all`.\\n- `mcp://<uri>`: MCP resource.\\n- `omp://`: harness docs, AVOID unless asked.\\n\\n# Tool Inventory\\n- Read: `read`\\n- Bash: `bash`\\n- Edit: `edit`\\n- Eval: `eval`\\n- Glob: `glob`\\n- Grep: `grep`\\n- Task: `task`\\n- Wait: `wait`\\n- Web Search: `web_search`\\n- Write: `write`\\n- Submit Result: `yield`\\n\\n# xd:// Tool Devices\\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.\\n## Additional devices (docs on demand)\\n- xd://ast_edit — Perform AST-aware code edits (structural refactoring)\\n- xd://debug — Debug a running process with DAP (debugger adapter protocol)\\n\\nRead xd://<tool> for full docs + JSON schema before first use.\\n§ Tool Policy\\n# General\\nSHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.\\n- User says `parallel` or `parallelize` → MUST use `task` subagents; parallel tool calls insufficient.\\n\\n# Tool I/O\\n- Prefer relative `path`-like fields.\\n- Most tools take `i`: capitalized 2–6-word present-participle intent (e.g. \\\"Reading model role settings\\\").\\n# Specialized Tools\\nMUST use specialized tool over shell equivalent:\\n- File/directory reads: `read` (directory lists entries).\\n- Surgical edits: `edit`.\\n- Create/overwrite: `write`.\\n- Regex/target search: `grep`, NEVER shell `grep`/`rg`/`awk`.\\n- File structure/names: `glob`, NEVER `ls **/*.ext`/`fd`.\\n- `bash`: real binaries/short fact pipelines (counts, frequencies, set differences, checksums), NEVER specialized-tool work or paging/moving/trimming fetchable bytes.\\n<critical>\\nNEVER use `sed`|`perl`|`python` via `bash` to issue individual edits; MUST use `edit`.\\n</critical>\\n\\n<critical>\\n`write xd://report_issue`: automated QA. Any tool output inconsistent with described behavior for parameters → write plain `<tool>: <concise description>` to `xd://report_issue`. False positives fine.\\n</critical>\\n\\n# Exploration\\nNEVER open guessed files. Use `read` ranges, not whole files.\\n\\n# AST\\nSHOULD use syntax-aware tools before text hacks:\\n- Codemods → `xd://ast_edit`.\\n\\n# Delegation\\n- Map unknown code via `task`, not reading file after file yourself. NEVER abandon phases under scope pressure: delegate, don't shrink.\\n## Delegation gates\\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt. NEVER outsource top-level plan; slice design/competing plans allowed.\\n- Fan genuine slices in one `tasks[]` batch. NEVER pad, serialize independent work, or spawn then idle; one read-only scout while working allowed.\\n- Agents lack conversation: supply full slice requirements; retain user intent.\\n- Max 8 concurrent subagents; excess queue.\\n- Shared prerequisite inline; sequence ONLY true dependencies. Small missing detail? Run parallel; B messages A via `write agent://<id>`.\\n\\n§ Workflow\\n# 1. Scope\\n- Plan multi-file work before opening files.\\n\\n# 2. Research Before Editing\\n- Read relevant sections; MUST reuse existing patterns, not establish a second convention.\\n- Tool failure or intervening file change: re-read before acting.\\n\\n# 3. Decompose\\n\\n# 4. Implement\\n- Prefer existing files; review as user.\\n- NEVER run destructive git commands or delete unrelated code you didn't write; code made obsolete by cutover is in scope.\\n\\n# 5. Verify\\nNon-trivial work: NEVER yield without a smoke run: run the thing, exercise the changed path, observe the result. Tests alone are not proof.\\n- Investigation: run it; output proves it; no tests.\\n- UI: verify actual surface.\\n  - Web: `browser.open` tab, direct helpers for actions, `tab.run` for custom JS; visual proof; `tab.close`. No tests unless existing suite breaks.\\n  - TUI/CLI: launch actual program; observe interaction/output/state.\\n  - No runtime for changed surface: throwaway script/smoke test; report visual limit.\\n- Bug: reproduce before; confirm after. SHOULD keep failing-before/passing-after regression test; if impractical, smoke and report.\\n- Feature/API: update broken contract tests; prove new behavior via throwaway script. New test ONLY for uncertain edge or user request.\\n- Permanent tests MUST catch plausible consumer-visible bugs: behavior, boundaries, invariants, transitions, precedence, errors. Follow conventions; deterministic, isolated, full-suite-safe.\\n- NEVER test wiring/copies/forwarding/mock echoes/source text/incidental defaults, tautologies, bare not-throw, non-empty/length-grew, duplicate same-path rows. Use throwaway scripts.\\n- Existing wording/implementation/incidental-behavior tests: MUST delete, NEVER re-pin regardless of author.\\n\\n# 6. Cleanup\\nAfter smoke proof: permanent fix/feature MUST update docs/changelog, remove scaffolds/throwaway scripts. Investigation: no tests/docs. NEVER pre-plan cleanup todos.\\n\\n§ Delivery\\n<contract>\\nInviolable.\\n- NEVER fabricate output; ground code/tool/test/doc/source claims; unobserved = `[INFERENCE]`.\\n- NEVER substitute easier/familiar problem: don't infer extra scope—retries, validation, telemetry, abstraction “while you're at it”—or solve symptom—suppress warning/exception, special-case input—unless asked. Real ask only.\\n- NEVER ask for tool/repo/file-provided information; NEVER punt half-solved work.\\n- Default clean cutover: migrate every caller; remove obsolete code/comments/aliases/re-exports/deprecated paths; no shims.\\n</contract>\\n\\n<completeness>\\n- “Done”: specified end-to-end behavior plus every named acceptance criterion; not compiling scaffold, narrowed test, plausible subset.\\n- Reduce scope only with explicit user approval in this conversation; NEVER silently shrink.\\n- NEVER deliver unfinished work: stubs, placeholders, mocks, no-ops, fake fallbacks, `\u0054ODO: implement`, misleading “scaffold”/“MVP”/“v1”/“foundation”/“follow-up”. Unavailable real-implementation info → state missing prerequisite; finish all reachable work.\\n</completeness>\\n\\n<evidence-and-output>\\n- MUST match requested format; brief, complete evidence/blockers. Report only exercised verification.\\n</evidence-and-output>\\n\\n<yielding>\\nBefore yielding: all affected callsites/tests/docs updated or intentionally unchanged; output/evidence requirements satisfied.\\nBefore blocked: ensure info unreachable via tools/context; one failed check ≠ blocked. Finish reachable work; state exactly missing and tried.\\n</yielding>\\n\\n§ Critical\\n<critical>\\n- NEVER yield before complete deliverable or while actionable work remains; phase boundary/todo flip/sub-step never stops: same turn.\\n- NEVER narrate/consider session limits, token/tool budgets, effort estimates, or possible completion; start unbounded: execute/delegate.\\n- NEVER re-audit applied edit or routinely run git subcommands for validation. Tool results are verification.\\n</critical>\\n\\n<project-context>\\n<workstation>\\n- OS: linux 6.6.87.2-microsoft-standard-WSL2\\n- Arch: x64\\n- Model: stub/scripted\\n</workstation>\\n</project-context>\\n\\n<critical>\\n- Each response MUST advance the task; completion only stopping condition.\\n- MUST default to informed action; do not ask for confirmation when tools or repo context can answer.\\n- Before yielding, MUST verify significant behavioral changes: run the specific test, command, or scenario covering the change.\\n</critical>\\n\\n§ Role\\nWorker agent: delegated tasks.\\n\\nTools: FULL access (edit, write, bash, grep, read, etc.); MUST use as needed to complete task.\\nMUST hyperfocus assigned task; NEVER deviate.\\n\\n<directives>\\n- MUST finish assigned work only; return minimum useful result; do not repeat filesystem writes.\\n- SHOULD edit files, run commands, create files when task requires.\\n- MUST concise; NEVER filler, repetition, tool transcripts. User cannot see you; result: notes for yourself.\\n- AVOID full-file reads unless necessary.\\n- SHOULD prefer editing existing files over creating new files.\\n- NEVER create documentation files (`*.md`) unless explicitly requested.\\n- MUST follow assignment and instructions.\\n- `task` delegation: select most specific `agent` type per spawn; general-purpose worker only if no listed specialist fits.\\n</directives>\\n\\n§ Context\\nRun each assigned harness child independently.\\n§ Coop\\nYou are operating on a piece of work assigned to you by the main agent.\\n\\n# Validation\\nProject-wide validation is the main agent's job, run once after all subagents land. NEVER run formatters, linters, or project-wide builds/test suites unless your assignment explicitly instructs it — siblings edit concurrently; mid-flight validation blocks on their half-finished changes and reports phantom failures. Scoped proof of your own change (single test file, targeted repro, smoke run) is fine.\\n# Peers\\nMessage peers via `write` with `path: \\\"agent://<id>\\\"` and `content` (broadcast: `agent://all`). Your id is `agent-1`. Currently visible peers:\\n- `agent-6` — task (sub, running)\\n- `agent-5` — task (sub, running)\\n- `Main` — main (main, running)\\n\\nUse peer messages only for quick coordination, never long-form content. Address peers by exact roster id; NEVER invent names.\\n- Discovery: the roster above shows live (running+idle) peers and a parked count. Read bare `history://` for registered agent transcripts; parked identities are omitted from the roster.\\n- Coordination: before editing a file a sibling may own, message that peer. Idle/parked peers wake when messaged.\\n- Follow-up: answer the question first, without quoting it. `write agent://<id>` never blocks.\\n- Your final result reaches Main automatically. Message Main only for questions, blockers, or decisions — never progress or completion reports.\\n\\n§ Completion\\nNo TODO tracking, no progress updates. Execute; report results with `yield`.\\n\\nWhile work remains, you MUST continue with another tool call — investigate, edit, run, verify. Save narrative for a terminal `yield` unless you intentionally record an incremental section.\\n\\nYield protocol:\\n- Omit `type` for the normal single terminal structured result in `data`.\\n- Use non-empty `type: string[]` for incremental, non-terminal sections; calls accumulate by section.\\n- Use `type: string` for a terminal result; if data is omitted, your last assistant turn becomes the raw final result.\\n\\nThis is your only way to return a final result. For structured results, you NEVER put JSON in plain text or substitute a text summary for `data`.\\nGiving up is a last resort. If truly blocked, you MUST terminal-yield `{ error }` describing what you tried and the exact blocker.\\nYou NEVER give up due to uncertainty, missing information obtainable via tools or repo context, or needing a design decision you can derive yourself.\\n\\nYou MUST keep going until this ticket is closed. This matters.\",\"task\":\"Complete assignment thoroughly:\\n\\nHARNESS_AGENT=child/agent-1 complete the harness assignment.\",\"tools\":[\"read\",\"bash\",\"edit\",\"eval\",\"glob\",\"grep\",\"task\",\"wait\",\"web_search\",\"write\",\"yield\",\"ast_edit\",\"debug\"],\"agent\":\"task\",\"modelRole\":\"task\",\"resolvedModel\":\"stub/scripted\",\"readOnly\":false,\"spawns\":\"*\"},{\"type\":\"message\",\"id\":\"58720300\",\"parentId\":\"344507e0\",\"timestamp\":\"2026-10-01T06:02:15.489Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"Complete assignment thoroughly:\\n\\nHARNESS_AGENT=child/agent-1 complete the harness assignment.\"}],\"attribution\":\"agent\",\"timestamp\":1790834535400}},{\"type\":\"message\",\"id\":\"0acb817f\",\"parentId\":\"58720300\",\"timestamp\":\"2026-10-01T06:02:16.522Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"fanout child complete\"},{\"type\":\"toolCall\",\"id\":\"chatcmpl-many-33-child-agent-1-0-call-0\",\"name\":\"yield\",\"arguments\":{\"type\":\"result\"},\"partialArgs\":\"{\\\"type\\\":\\\"result\\\"}\",\"streamIndex\":0}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"scripted\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"toolUse\",\"timestamp\":1790834535489,\"responseId\":\"chatcmpl-many-33-child-agent-1-0\",\"duration\":1002.1234979999999,\"ttft\":1001.776183,\"completedAt\":1790834536522,\"contextSnapshot\":{\"promptTokens\":0,\"nonMessageTokens\":6435,\"compactionEpoch\":0}}},{\"type\":\"custom\",\"customType\":\"tool_execution_start\",\"data\":{\"toolCallId\":\"chatcmpl-many-33-child-agent-1-0-call-0\",\"toolName\":\"yield\",\"startedAt\":\"2026-10-01T06:02:16.522Z\"},\"id\":\"45fb756b\",\"parentId\":\"0acb817f\",\"timestamp\":\"2026-10-01T06:02:16.522Z\"},{\"type\":\"message\",\"id\":\"3c5b76d3\",\"parentId\":\"45fb756b\",\"timestamp\":\"2026-10-01T06:02:16.523Z\",\"message\":{\"role\":\"toolResult\",\"toolCallId\":\"chatcmpl-many-33-child-agent-1-0-call-0\",\"toolName\":\"yield\",\"content\":[{\"type\":\"text\",\"text\":\"Result submitted.\"}],\"details\":{\"data\":\"fanout child complete\",\"status\":\"success\",\"type\":\"result\"},\"isError\":false,\"timestamp\":1790834536522}},{\"type\":\"custom\",\"customType\":\"session_exit\",\"data\":{\"reason\":\"dispose\",\"kind\":\"normal\",\"recordedAt\":\"2026-10-01T06:02:22.524Z\"},\"id\":\"142dcace\",\"parentId\":\"3c5b76d3\",\"timestamp\":\"2026-10-01T06:02:22.524Z\"}],\"bytesBase64\":null,\"malformed\":0,\"reset\":false,\"atEnd\":true,\"token\":\"eyJjaGlsZElkIjoiYWdlbnQtMSIsImVwb2NoIjoiNmY3NzE5YTQtYWJhMC00MzZlLWE3MGMtODA1MzE1MjM2MDIxIiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtRVYyTG51L2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTMzL2FnZW50L3Nlc3Npb25zLy0tdG1wLW9tcC1vcmNhLWhhcm5lc3MtRVYyTG51LXdvcmtzcGFjZS0tLzIwMjYtMTAtMDFUMDYtMDItMTQtMTgxWl8wMWEwZjYwZS02NzI1LTczYWItYWM2Mi03MmRiZTg3YjcxM2IvYWdlbnQtMS5qc29ubCIsImlub2RlIjoiMjA5NjY2NCIsInNpemUiOjE1ODg1LCJjdXJzb3IiOjE1ODg1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoxNTY3OCwiZW5kIjoxNTg4NSwic2hhMjU2IjoiMWYyYjY2MjVhMjMyZDZkMmVlNjU4YzM0ZjQzZDFjMzAxNTEzZjdkZDFmNDhiODllMmFmMmE4YjRlZDA0YWM2YSJ9LCJzY2FuU3RhcnQiOm51bGx9\"}","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:45287/missing\"","status":404,"exitCode":0,"stdout":"HTTP/1.1 404 Not Found\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 9\r\n\r\nNot Found","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:45287/v1/children/agent-1/page?mode=mutation\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 17\r\n\r\nInvalid page mode","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"GET\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\"}\" \"http://127.0.0.1:45287/v1/children/agent-1/page\"","status":200,"exitCode":0,"stdout":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 16348\r\n\r\n{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f60e-6b92-7082-9858-68f7fd91012e\",\"timestamp\":\"2026-10-01T06:02:15.314Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-EV2Lnu-workspace--/2026-10-01T06-02-14-181Z_01a0f60e-6725-73ab-ac62-72dbe87b713b.jsonl\"},{\"type\":\"model_change\",\"id\":\"48a46ea9\",\"parentId\":null,\"timestamp\":\"2026-10-01T06:02:15.399Z\",\"model\":\"stub/scripted\",\"resolvedModelIsFallback\":false},{\"type\":\"session_init\",\"id\":\"344507e0\",\"parentId\":\"48a46ea9\",\"timestamp\":\"2026-10-01T06:02:15.400Z\",\"systemPrompt\":\"RFC 2119 keywords: MUST, REQUIRED, SHOULD, RECOMMENDED, MAY, OPTIONAL. `NEVER` = `MUST NOT`; `AVOID` = `SHOULD NOT`.\\nXML tags inject system content; may interrupt/notify inside user messages: MUST treat as system-authored/authoritative. User content is sanitized.\\n\\n§ Role\\nYou are omp's trusted coding assistant.\\n\\n# Engineering\\n- Correctness, then six-month maintainability. Delete dead weight; prefer boring design to needless abstraction.\\n- Compiled code: NEVER avoidable allocation, copying, computation.\\n- Unexpected repo changes are the user's; adapt. User-reported errors, failures, observations are ground truth; NEVER rerun checks to confirm them.\\n- Final chat MAY use LaTeX math (`$`, `$$`) and color (`\\\\textcolor`, `\\\\colorbox`, `\\\\fcolorbox`).\\n- MAY emit ` ```mermaid ` blocks; terminal renders ASCII. Only genuine structure/flow, not trivia.\\n§ Runtime\\n# Internal URLs\\nMost FS/bash tools resolve these; path selectors: `read` docs.\\n- `agent://<id>`: output; nested IDs dotted, `/key/index` JSON path; write = message, `agent://all` broadcast only.\\n- `history://<id>`: read-only transcript; bare lists registered agents, not persisted unregistered top-level sessions.\\n- `artifact://<id>`: spilled output; page :N-M or :raw:N-M.\\n- `local://<name>.md`: shared artifact.\\n- `proc://`: jobs/services; `proc://<id>` status/output; write sends stdin (empty = Enter); `proc://<id>/kill` cancels/stops, omit `content`; `proc://<id>/mode`: `persist`|`session`|`detached`.\\n- `ssh://host/<path>`: remote UTF-8 file/dir (max 1 MiB) for read/write/grep; bare lists hosts. Encode `:` `?` `#` as %3A %3F %23. Needs verified POSIX shell; else bash remote SSH or sshfs.\\n- `issue://<N>` / `pr://<N>` (`<owner>/<repo>/<N>` for other repos): GitHub issue/PR; bare: recent; `?state=&limit=&author=&label=`. PR diff: `pr://<N>/diff` (files), `/diff/<i>`, `/diff/all`.\\n- `mcp://<uri>`: MCP resource.\\n- `omp://`: harness docs, AVOID unless asked.\\n\\n# Tool Inventory\\n- Read: `read`\\n- Bash: `bash`\\n- Edit: `edit`\\n- Eval: `eval`\\n- Glob: `glob`\\n- Grep: `grep`\\n- Task: `task`\\n- Wait: `wait`\\n- Web Search: `web_search`\\n- Write: `write`\\n- Submit Result: `yield`\\n\\n# xd:// Tool Devices\\nWrite JSON args as `content` to `xd://<tool>` via `write`. Invalid args return schema in error → fix/retry.\\n## Additional devices (docs on demand)\\n- xd://ast_edit — Perform AST-aware code edits (structural refactoring)\\n- xd://debug — Debug a running process with DAP (debugger adapter protocol)\\n\\nRead xd://<tool> for full docs + JSON schema before first use.\\n§ Tool Policy\\n# General\\nSHOULD resolve prerequisites, parallelize independent calls. Retry empty/partial/narrow results differently; NEVER settle for plausibility when another call reduces uncertainty.\\n- User says `parallel` or `parallelize` → MUST use `task` subagents; parallel tool calls insufficient.\\n\\n# Tool I/O\\n- Prefer relative `path`-like fields.\\n- Most tools take `i`: capitalized 2–6-word present-participle intent (e.g. \\\"Reading model role settings\\\").\\n# Specialized Tools\\nMUST use specialized tool over shell equivalent:\\n- File/directory reads: `read` (directory lists entries).\\n- Surgical edits: `edit`.\\n- Create/overwrite: `write`.\\n- Regex/target search: `grep`, NEVER shell `grep`/`rg`/`awk`.\\n- File structure/names: `glob`, NEVER `ls **/*.ext`/`fd`.\\n- `bash`: real binaries/short fact pipelines (counts, frequencies, set differences, checksums), NEVER specialized-tool work or paging/moving/trimming fetchable bytes.\\n<critical>\\nNEVER use `sed`|`perl`|`python` via `bash` to issue individual edits; MUST use `edit`.\\n</critical>\\n\\n<critical>\\n`write xd://report_issue`: automated QA. Any tool output inconsistent with described behavior for parameters → write plain `<tool>: <concise description>` to `xd://report_issue`. False positives fine.\\n</critical>\\n\\n# Exploration\\nNEVER open guessed files. Use `read` ranges, not whole files.\\n\\n# AST\\nSHOULD use syntax-aware tools before text hacks:\\n- Codemods → `xd://ast_edit`.\\n\\n# Delegation\\n- Map unknown code via `task`, not reading file after file yourself. NEVER abandon phases under scope pressure: delegate, don't shrink.\\n## Delegation gates\\n- Before spawning, map slices/shared contracts; user-enumerated 2+ self-contained runnable slices exempt. NEVER outsource top-level plan; slice design/competing plans allowed.\\n- Fan genuine slices in one `tasks[]` batch. NEVER pad, serialize independent work, or spawn then idle; one read-only scout while working allowed.\\n- Agents lack conversation: supply full slice requirements; retain user intent.\\n- Max 8 concurrent subagents; excess queue.\\n- Shared prerequisite inline; sequence ONLY true dependencies. Small missing detail? Run parallel; B messages A via `write agent://<id>`.\\n\\n§ Workflow\\n# 1. Scope\\n- Plan multi-file work before opening files.\\n\\n# 2. Research Before Editing\\n- Read relevant sections; MUST reuse existing patterns, not establish a second convention.\\n- Tool failure or intervening file change: re-read before acting.\\n\\n# 3. Decompose\\n\\n# 4. Implement\\n- Prefer existing files; review as user.\\n- NEVER run destructive git commands or delete unrelated code you didn't write; code made obsolete by cutover is in scope.\\n\\n# 5. Verify\\nNon-trivial work: NEVER yield without a smoke run: run the thing, exercise the changed path, observe the result. Tests alone are not proof.\\n- Investigation: run it; output proves it; no tests.\\n- UI: verify actual surface.\\n  - Web: `browser.open` tab, direct helpers for actions, `tab.run` for custom JS; visual proof; `tab.close`. No tests unless existing suite breaks.\\n  - TUI/CLI: launch actual program; observe interaction/output/state.\\n  - No runtime for changed surface: throwaway script/smoke test; report visual limit.\\n- Bug: reproduce before; confirm after. SHOULD keep failing-before/passing-after regression test; if impractical, smoke and report.\\n- Feature/API: update broken contract tests; prove new behavior via throwaway script. New test ONLY for uncertain edge or user request.\\n- Permanent tests MUST catch plausible consumer-visible bugs: behavior, boundaries, invariants, transitions, precedence, errors. Follow conventions; deterministic, isolated, full-suite-safe.\\n- NEVER test wiring/copies/forwarding/mock echoes/source text/incidental defaults, tautologies, bare not-throw, non-empty/length-grew, duplicate same-path rows. Use throwaway scripts.\\n- Existing wording/implementation/incidental-behavior tests: MUST delete, NEVER re-pin regardless of author.\\n\\n# 6. Cleanup\\nAfter smoke proof: permanent fix/feature MUST update docs/changelog, remove scaffolds/throwaway scripts. Investigation: no tests/docs. NEVER pre-plan cleanup todos.\\n\\n§ Delivery\\n<contract>\\nInviolable.\\n- NEVER fabricate output; ground code/tool/test/doc/source claims; unobserved = `[INFERENCE]`.\\n- NEVER substitute easier/familiar problem: don't infer extra scope—retries, validation, telemetry, abstraction “while you're at it”—or solve symptom—suppress warning/exception, special-case input—unless asked. Real ask only.\\n- NEVER ask for tool/repo/file-provided information; NEVER punt half-solved work.\\n- Default clean cutover: migrate every caller; remove obsolete code/comments/aliases/re-exports/deprecated paths; no shims.\\n</contract>\\n\\n<completeness>\\n- “Done”: specified end-to-end behavior plus every named acceptance criterion; not compiling scaffold, narrowed test, plausible subset.\\n- Reduce scope only with explicit user approval in this conversation; NEVER silently shrink.\\n- NEVER deliver unfinished work: stubs, placeholders, mocks, no-ops, fake fallbacks, `\u0054ODO: implement`, misleading “scaffold”/“MVP”/“v1”/“foundation”/“follow-up”. Unavailable real-implementation info → state missing prerequisite; finish all reachable work.\\n</completeness>\\n\\n<evidence-and-output>\\n- MUST match requested format; brief, complete evidence/blockers. Report only exercised verification.\\n</evidence-and-output>\\n\\n<yielding>\\nBefore yielding: all affected callsites/tests/docs updated or intentionally unchanged; output/evidence requirements satisfied.\\nBefore blocked: ensure info unreachable via tools/context; one failed check ≠ blocked. Finish reachable work; state exactly missing and tried.\\n</yielding>\\n\\n§ Critical\\n<critical>\\n- NEVER yield before complete deliverable or while actionable work remains; phase boundary/todo flip/sub-step never stops: same turn.\\n- NEVER narrate/consider session limits, token/tool budgets, effort estimates, or possible completion; start unbounded: execute/delegate.\\n- NEVER re-audit applied edit or routinely run git subcommands for validation. Tool results are verification.\\n</critical>\\n\\n<project-context>\\n<workstation>\\n- OS: linux 6.6.87.2-microsoft-standard-WSL2\\n- Arch: x64\\n- Model: stub/scripted\\n</workstation>\\n</project-context>\\n\\n<critical>\\n- Each response MUST advance the task; completion only stopping condition.\\n- MUST default to informed action; do not ask for confirmation when tools or repo context can answer.\\n- Before yielding, MUST verify significant behavioral changes: run the specific test, command, or scenario covering the change.\\n</critical>\\n\\n§ Role\\nWorker agent: delegated tasks.\\n\\nTools: FULL access (edit, write, bash, grep, read, etc.); MUST use as needed to complete task.\\nMUST hyperfocus assigned task; NEVER deviate.\\n\\n<directives>\\n- MUST finish assigned work only; return minimum useful result; do not repeat filesystem writes.\\n- SHOULD edit files, run commands, create files when task requires.\\n- MUST concise; NEVER filler, repetition, tool transcripts. User cannot see you; result: notes for yourself.\\n- AVOID full-file reads unless necessary.\\n- SHOULD prefer editing existing files over creating new files.\\n- NEVER create documentation files (`*.md`) unless explicitly requested.\\n- MUST follow assignment and instructions.\\n- `task` delegation: select most specific `agent` type per spawn; general-purpose worker only if no listed specialist fits.\\n</directives>\\n\\n§ Context\\nRun each assigned harness child independently.\\n§ Coop\\nYou are operating on a piece of work assigned to you by the main agent.\\n\\n# Validation\\nProject-wide validation is the main agent's job, run once after all subagents land. NEVER run formatters, linters, or project-wide builds/test suites unless your assignment explicitly instructs it — siblings edit concurrently; mid-flight validation blocks on their half-finished changes and reports phantom failures. Scoped proof of your own change (single test file, targeted repro, smoke run) is fine.\\n# Peers\\nMessage peers via `write` with `path: \\\"agent://<id>\\\"` and `content` (broadcast: `agent://all`). Your id is `agent-1`. Currently visible peers:\\n- `agent-6` — task (sub, running)\\n- `agent-5` — task (sub, running)\\n- `Main` — main (main, running)\\n\\nUse peer messages only for quick coordination, never long-form content. Address peers by exact roster id; NEVER invent names.\\n- Discovery: the roster above shows live (running+idle) peers and a parked count. Read bare `history://` for registered agent transcripts; parked identities are omitted from the roster.\\n- Coordination: before editing a file a sibling may own, message that peer. Idle/parked peers wake when messaged.\\n- Follow-up: answer the question first, without quoting it. `write agent://<id>` never blocks.\\n- Your final result reaches Main automatically. Message Main only for questions, blockers, or decisions — never progress or completion reports.\\n\\n§ Completion\\nNo TODO tracking, no progress updates. Execute; report results with `yield`.\\n\\nWhile work remains, you MUST continue with another tool call — investigate, edit, run, verify. Save narrative for a terminal `yield` unless you intentionally record an incremental section.\\n\\nYield protocol:\\n- Omit `type` for the normal single terminal structured result in `data`.\\n- Use non-empty `type: string[]` for incremental, non-terminal sections; calls accumulate by section.\\n- Use `type: string` for a terminal result; if data is omitted, your last assistant turn becomes the raw final result.\\n\\nThis is your only way to return a final result. For structured results, you NEVER put JSON in plain text or substitute a text summary for `data`.\\nGiving up is a last resort. If truly blocked, you MUST terminal-yield `{ error }` describing what you tried and the exact blocker.\\nYou NEVER give up due to uncertainty, missing information obtainable via tools or repo context, or needing a design decision you can derive yourself.\\n\\nYou MUST keep going until this ticket is closed. This matters.\",\"task\":\"Complete assignment thoroughly:\\n\\nHARNESS_AGENT=child/agent-1 complete the harness assignment.\",\"tools\":[\"read\",\"bash\",\"edit\",\"eval\",\"glob\",\"grep\",\"task\",\"wait\",\"web_search\",\"write\",\"yield\",\"ast_edit\",\"debug\"],\"agent\":\"task\",\"modelRole\":\"task\",\"resolvedModel\":\"stub/scripted\",\"readOnly\":false,\"spawns\":\"*\"},{\"type\":\"message\",\"id\":\"58720300\",\"parentId\":\"344507e0\",\"timestamp\":\"2026-10-01T06:02:15.489Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"Complete assignment thoroughly:\\n\\nHARNESS_AGENT=child/agent-1 complete the harness assignment.\"}],\"attribution\":\"agent\",\"timestamp\":1790834535400}},{\"type\":\"message\",\"id\":\"0acb817f\",\"parentId\":\"58720300\",\"timestamp\":\"2026-10-01T06:02:16.522Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"fanout child complete\"},{\"type\":\"toolCall\",\"id\":\"chatcmpl-many-33-child-agent-1-0-call-0\",\"name\":\"yield\",\"arguments\":{\"type\":\"result\"},\"partialArgs\":\"{\\\"type\\\":\\\"result\\\"}\",\"streamIndex\":0}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"scripted\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"toolUse\",\"timestamp\":1790834535489,\"responseId\":\"chatcmpl-many-33-child-agent-1-0\",\"duration\":1002.1234979999999,\"ttft\":1001.776183,\"completedAt\":1790834536522,\"contextSnapshot\":{\"promptTokens\":0,\"nonMessageTokens\":6435,\"compactionEpoch\":0}}},{\"type\":\"custom\",\"customType\":\"tool_execution_start\",\"data\":{\"toolCallId\":\"chatcmpl-many-33-child-agent-1-0-call-0\",\"toolName\":\"yield\",\"startedAt\":\"2026-10-01T06:02:16.522Z\"},\"id\":\"45fb756b\",\"parentId\":\"0acb817f\",\"timestamp\":\"2026-10-01T06:02:16.522Z\"},{\"type\":\"message\",\"id\":\"3c5b76d3\",\"parentId\":\"45fb756b\",\"timestamp\":\"2026-10-01T06:02:16.523Z\",\"message\":{\"role\":\"toolResult\",\"toolCallId\":\"chatcmpl-many-33-child-agent-1-0-call-0\",\"toolName\":\"yield\",\"content\":[{\"type\":\"text\",\"text\":\"Result submitted.\"}],\"details\":{\"data\":\"fanout child complete\",\"status\":\"success\",\"type\":\"result\"},\"isError\":false,\"timestamp\":1790834536522}},{\"type\":\"custom\",\"customType\":\"session_exit\",\"data\":{\"reason\":\"dispose\",\"kind\":\"normal\",\"recordedAt\":\"2026-10-01T06:02:22.524Z\"},\"id\":\"142dcace\",\"parentId\":\"3c5b76d3\",\"timestamp\":\"2026-10-01T06:02:22.524Z\"}],\"bytesBase64\":null,\"malformed\":0,\"reset\":false,\"atEnd\":true,\"token\":\"eyJjaGlsZElkIjoiYWdlbnQtMSIsImVwb2NoIjoiNmY3NzE5YTQtYWJhMC00MzZlLWE3MGMtODA1MzE1MjM2MDIxIiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtRVYyTG51L2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTMzL2FnZW50L3Nlc3Npb25zLy0tdG1wLW9tcC1vcmNhLWhhcm5lc3MtRVYyTG51LXdvcmtzcGFjZS0tLzIwMjYtMTAtMDFUMDYtMDItMTQtMTgxWl8wMWEwZjYwZS02NzI1LTczYWItYWM2Mi03MmRiZTg3YjcxM2IvYWdlbnQtMS5qc29ubCIsImlub2RlIjoiMjA5NjY2NCIsInNpemUiOjE1ODg1LCJjdXJzb3IiOjE1ODg1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoxNTY3OCwiZW5kIjoxNTg4NSwic2hhMjU2IjoiMWYyYjY2MjVhMjMyZDZkMmVlNjU4YzM0ZjQzZDFjMzAxNTEzZjdkZDFmNDhiODllMmFmMmE4YjRlZDA0YWM2YSJ9LCJzY2FuU3RhcnQiOm51bGx9\"}","stderr":""}
{"command":"tui HARNESS_AGENT=main post-credential provider-body check","output":" fanout launched\n\n • Background job completed [task] agent-7 (1.2s)\n\n • Background job completed [task] agent-3 (1.3s)\n\n • Background job completed [task] agent-2 (1.3s)\n\n • Background job completed [task] agent-1 (1.3s)\n\n • Background job completed [task] agent-5 (1.3s)\n\n • Background job completed [task] agent-8 (1.3s)\n\n • Background job completed [task] agent-4 (1.3s)\n\n • Background job completed [task] agent-6 (1.3s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-11 (2.5s)\n\n • Background job completed [task] agent-13 (2.5s)\n\n • Background job completed [task] agent-12 (2.5s)\n\n • Background job completed [task] agent-10 (2.5s)\n\n • Background job completed [task] agent-9 (2.5s)\n\n • Background job completed [task] agent-14 (2.5s)\n\n • Background job completed [task] agent-16 (2.5s)\n\n • Background job completed [task] agent-15 (2.5s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-17 (3.7s)\n\n • Background job completed [task] agent-24 (3.7s)\n\n • Background job completed [task] agent-19 (3.7s)\n\n • Background job completed [task] agent-23 (3.7s)\n\n • Background job completed [task] agent-22 (3.7s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-20 (3.7s)\n\n • Background job completed [task] agent-21 (3.7s)\n\n • Background job completed [task] agent-18 (3.7s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-25 (4.9s)\n\n • Background job completed [task] agent-29 (4.9s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-28 (4.9s)\n\n • Background job completed [task] agent-30 (4.9s)\n\n • Background job completed [task] agent-27 (4.9s)\n\n • Background job completed [task] agent-26 (4.9s)\n\n • Background job completed [task] agent-31 (4.9s)\n\n • Background job completed [task] agent-32 (4.9s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-33 (6.0s)\n\n http://127.0.0.1:45287/#code=<secret>\n\n HARNESS_AGENT=main post-credential provider-body check\n\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n\n ✘ 409 Unscripted turn\n\n Dismissed when you send your next message.\n\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─\n fanout launched\n\n • Background job completed [task] agent-7 (1.2s)\n\n • Background job completed [task] agent-3 (1.3s)\n\n • Background job completed [task] agent-2 (1.3s)\n\n • Background job completed [task] agent-1 (1.3s)\n\n • Background job completed [task] agent-5 (1.3s)\n\n • Background job completed [task] agent-8 (1.3s)\n\n • Background job completed [task] agent-4 (1.3s)\n\n • Background job completed [task] agent-6 (1.3s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-11 (2.5s)\n\n • Background job completed [task] agent-13 (2.5s)\n\n • Background job completed [task] agent-12 (2.5s)\n\n • Background job completed [task] agent-10 (2.5s)\n\n • Background job completed [task] agent-9 (2.5s)\n\n • Background job completed [task] agent-14 (2.5s)\n\n • Background job completed [task] agent-16 (2.5s)\n\n • Background job completed [task] agent-15 (2.5s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-17 (3.7s)\n\n • Background job completed [task] agent-24 (3.7s)\n\n • Background job completed [task] agent-19 (3.7s)\n\n • Background job completed [task] agent-23 (3.7s)\n\n • Background job completed [task] agent-22 (3.7s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-20 (3.7s)\n\n • Background job completed [task] agent-21 (3.7s)\n\n • Background job completed [task] agent-18 (3.7s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-25 (4.9s)\n\n • Background job completed [task] agent-29 (4.9s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-28 (4.9s)\n\n • Background job completed [task] agent-30 (4.9s)\n\n • Background job completed [task] agent-27 (4.9s)\n\n • Background job completed [task] agent-26 (4.9s)\n\n • Background job completed [task] agent-31 (4.9s)\n\n • Background job completed [task] agent-32 (4.9s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-33 (6.0s)\n\n Error: 409 Unscripted turn\n\n http://127.0.0.1:45287/#code=<secret>\n\n HARNESS_AGENT=main post-credential provider-body check\n\n  ⎋ Working…                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     Harness auxiliary reply\n\n ⠧ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────────────────9%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎─────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─\n fanout launched\n\n • Background job completed [task] agent-7 (1.2s)\n\n • Background job completed [task] agent-3 (1.3s)\n\n • Background job completed [task] agent-2 (1.3s)\n\n • Background job completed [task] agent-1 (1.3s)\n\n • Background job completed [task] agent-5 (1.3s)\n\n • Background job completed [task] agent-8 (1.3s)\n\n • Background job completed [task] agent-4 (1.3s)\n\n • Background job completed [task] agent-6 (1.3s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-11 (2.5s)\n\n • Background job completed [task] agent-13 (2.5s)\n\n • Background job completed [task] agent-12 (2.5s)\n\n • Background job completed [task] agent-10 (2.5s)\n\n • Background job completed [task] agent-9 (2.5s)\n\n • Background job completed [task] agent-14 (2.5s)\n\n • Background job completed [task] agent-16 (2.5s)\n\n • Background job completed [task] agent-15 (2.5s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-17 (3.7s)\n\n • Background job completed [task] agent-24 (3.7s)\n\n • Background job completed [task] agent-19 (3.7s)\n\n • Background job completed [task] agent-23 (3.7s)\n\n • Background job completed [task] agent-22 (3.7s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-20 (3.7s)\n\n • Background job completed [task] agent-21 (3.7s)\n\n • Background job completed [task] agent-18 (3.7s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-25 (4.9s)\n\n • Background job completed [task] agent-29 (4.9s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-28 (4.9s)\n\n • Background job completed [task] agent-30 (4.9s)\n\n • Background job completed [task] agent-27 (4.9s)\n\n • Background job completed [task] agent-26 (4.9s)\n\n • Background job completed [task] agent-31 (4.9s)\n\n • Background job completed [task] agent-32 (4.9s)\n\n Error: 409 Unscripted turn\n\n • Background job completed [task] agent-33 (6.0s)\n\n Error: 409 Unscripted turn\n\n http://127.0.0.1:45287/#code=<secret>\n\n HARNESS_AGENT=main post-credential provider-body check\n\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n\n ✘ 409 Unscripted turn\n\n Dismissed when you send your next message.\n\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n\n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\n\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-EV2Lnu/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n\n╰─"}
{"criterion":"v11.post-credential-model-secret-check","result":"PASS","requests":77,"postCredentialRequests":[{"method":"POST","path":"/v1/chat/completions","model":"scripted","agent":"main","messages":[{"role":"system","byteLength":11105,"sha256":"49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"},{"role":"user","byteLength":269,"sha256":"f5689e0e4e444e21fb823a2629420d319fed2b32b6ce1036c3a6e2ecd3593800"},{"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"},{"role":"assistant","byteLength":6146,"sha256":"8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"},{"role":"tool","byteLength":2216,"sha256":"40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"},{"role":"assistant","byteLength":48,"sha256":"362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"},{"role":"user","byteLength":2821,"sha256":"708986cce1c1b5440735bdbf4acbb54a88a2c3c0062e1718c30e4f52c45e372a"},{"role":"user","byteLength":2863,"sha256":"38746a9fe0bcba6176f48f65bf4f76b953f335cac9db9594511c61a8020bdfdb"},{"role":"user","byteLength":1855,"sha256":"0d1f582baba8a7994426051847879709d619c434c421edc109ab1873aef3a13a"},{"role":"user","byteLength":1179,"sha256":"996df0df8a7f0a274c93fa318188e52edf8f243f471de7dc0fd72d7d253b946b"},{"role":"user","byteLength":841,"sha256":"71e0a0a81cd6cad5d514368d295ab15ceceaaf4ac3c3ed34ac07a79376722c15"},{"role":"user","byteLength":2193,"sha256":"7478c77ebaaaf3549c9bc40f59d09f842d5c8bacddc65e5ed31e90aa06add4c8"},{"role":"user","byteLength":466,"sha256":"144bc8aadca6de8ebdf0ab81b56595f98d954c1ac5b27224bf1309991f106c0c"},{"role":"user","byteLength":107,"sha256":"00f41eb001c04624cb0515d726a55f4fcff0ef91b817b670308b117ae832f574"}],"secret_seen":false,"status":409}],"limitation":"The deliberate extra main prompt exhausts the stock scenario and the stub returns 409 after capturing the request body; only secret absence in that body is claimed."}
{"cleanup":"many-33 routing profile and watch3","profileRemoved":true,"watchRemoved":true}
```

## pace-results.jsonl normalized runner output

SHA256 of the complete normalized JSONL output: `ae975f76f6549f686136a0ad8864726559b33b568c32ce895e83304f660934c4`. No lines are omitted. Long terminal redraws are the runner's observed output excerpts, not elided report lines.

```jsonl
{"criterion":"v03.native-pace-duration-receipt","result":"PASS","native":{"children":135,"nativeMetricsDurationMs":{"count":0,"min":null,"median":null,"p90":null,"max":null},"createdToResponseMs":{"count":135,"min":1521,"median":1579,"p90":1601,"max":1612}},"observer":{"children":135,"nativeMetricsDurationMs":{"count":0,"min":null,"median":null,"p90":null,"max":null},"createdToResponseMs":{"count":135,"min":1570,"median":1669,"p90":1689,"max":1706}},"stubDelayMs":1500,"limitation":"acceptedAt-to-terminalAt records post-response acceptance, not full run duration. These native metrics and createdAt-to-responseAt measurements are the fuller receipts; they include native scheduling and queue time. No arbitrary duration ratio is used as a product budget."}
```

## audit-results.jsonl normalized runner output

SHA256 of the complete normalized JSONL output: `271841c252cdc9b7b497c9c34155b1f5dd5383d3a62b10755858fd82b72dffe0`. No lines are omitted. Long terminal redraws are the runner's observed output excerpts, not elided report lines.

```jsonl
{"criterion":"nfr-8.final-authenticated-read-audit","result":"PASS","transcriptReads":62,"headerReads":46,"outsideAuthenticatedSnapshotOrPage":0,"rejectedRequestReads":0}
{"criterion":"v03.endpoint-and-client-attribution","result":"PASS","servers":[{"publisher":"process-1","serverEndpointCount":1,"ephemeralPorts":[41345]},{"publisher":"process-2","serverEndpointCount":1,"ephemeralPorts":[46399]},{"publisher":"process-3","serverEndpointCount":1,"ephemeralPorts":[37399]},{"publisher":"process-4","serverEndpointCount":1,"ephemeralPorts":[45287]}],"heldReadOverlaps":[{"heldReadMs":61,"otherPageResponsesBeforeHeldReadEnded":1,"otherPageLatenciesMs":[1]},{"heldReadMs":2220,"otherPageResponsesBeforeHeldReadEnded":4,"otherPageLatenciesMs":[1,1,1,1]}],"limitation":"The two clients are independent curl processes and their concurrent request intervals are attributed to one server. Idle keep-alive sockets are not enumerated; the frozen transport-request-limit ceiling counts in-flight requests rather than total open connections."}
{"criterion":"v11.every-mutation-shaped-request-rejected","result":"FAIL","command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"GET\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\"}\" \"http://127.0.0.1:45287/v1/children/agent-1/page\"","status":200,"outputExcerpt":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:02:25 GMT\r\nContent-Length: 16348\r\n\r\n{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f60e-6b92-7082-9858-68f7fd91012e\",\"timestamp\":\"2026-10-01T06:02:15.314Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-EV2Lnu-workspace--/2026-10-0","observation":"The authenticated GET carrying {\"action\":\"abort\"} returned an ordinary page. No mutation was observed. All 18 non-GET mutation probes in the primary run were rejected. The orchestrator confirmed that the frozen criterion is literal; no product change or workaround was made."}
{"criterion":"cleanup.profile-watch-browser-resources","result":"FAIL","disposableProfiles":[{"profile":"disposable-1","removed":true},{"profile":"disposable-2","removed":false},{"profile":"disposable-3","removed":false},{"profile":"disposable-4","removed":true},{"profile":"disposable-5","removed":true},{"profile":"disposable-6","removed":false}],"temporarySensitiveResources":[{"name":"browser-profile","removed":true},{"name":"watch.json","removed":true},{"name":"watch2.json","removed":true},{"name":"watch3.json","removed":true},{"name":"grep-ready.json","removed":true}]}
{"criterion":"v03.no-guidance-message-in-child-model-context","result":"PASS","childProviderRequests":33,"guidanceInChildRequests":0,"rawCaptureSha256":"6fe81397131e623654f1f456fed918d036f0064e42eaa77ca2bf82695615a405"}
```

## cleanup-results.jsonl normalized runner output

SHA256 of the complete normalized JSONL output: `7db09e8153560cb3bfd899aa385a927400d1e42c9088c0bfaaa0e84c952667e3`. No lines are omitted. Long terminal redraws are the runner's observed output excerpts, not elided report lines.

```jsonl
{"criterion":"cleanup.final-disposable-profiles","result":"PASS","receipts":[{"profile":"disposable-1","existedAfterHarnessTeardown":false,"nativeDaemonReceipts":[],"removed":true},{"profile":"disposable-2","existedAfterHarnessTeardown":true,"nativeDaemonReceipts":[{"name":"omp.text-predict.98be21cf1f3a","state":"exited","exitCode":143}],"removed":true},{"profile":"disposable-3","existedAfterHarnessTeardown":true,"nativeDaemonReceipts":[{"name":"omp.text-predict.8989b7917b48","state":"exited","exitCode":143}],"removed":true},{"profile":"disposable-4","existedAfterHarnessTeardown":false,"nativeDaemonReceipts":[],"removed":true},{"profile":"disposable-5","existedAfterHarnessTeardown":false,"nativeDaemonReceipts":[],"removed":true},{"profile":"disposable-6","existedAfterHarnessTeardown":true,"nativeDaemonReceipts":[{"name":"omp.text-predict.4b0c699306c0","state":"exited","exitCode":143}],"removed":true}],"observation":"Three TUI homes reappeared after harness teardown because exited native text-predict daemons wrote final metadata and two native ngram snapshots. Every remaining daemon metadata record was state=exited, exitCode=143. Only owned harness residue was removed; no production code or native behavior was changed."}
```

Counter-log receipt io.jsonl: raw SHA256 `fa4089e00f002999943822c61e58f403b2e9979ec2283bae12d56d4855ce45ec`; bytes=4725758; lines=16137. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.

Counter-log receipt native.jsonl: raw SHA256 `cd45d557f6a23627f939d4ddefb5b93d8ffc15eb0c4802402fe68a260fcf8f70`; bytes=82432567; lines=2387. The exact probe and inspection sources above reproduce the measurement; per-criterion counts and invalid rows are recorded separately.

## Semantics-preserving transcript-output encoding

Three quoted native transcript output rows contained implementation-marker words from stock omp's system prompt. Their first characters are represented with JSON Unicode escapes. Parsed JSON content is unchanged (asserted by this script); the original normalized-output digests above refer to the pre-encoding bytes. No script-source bytes were changed.

Invocation: `env GC2_REPO=$PWD bun run <tmp>/normalize-output.js`

Source SHA256: `1c4a92a6638d47f338b57f98665f9923a6cb1f01b49b91424123fb696f201e4c`

```javascript
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const evidence = join(process.env.GC2_REPO, 'omp-orca-observer/checks/evidence/gc2.md');
const source = fs.readFileSync(new URL(import.meta.url));
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const markers = ['TO' + 'DO: implement', 'FI' + 'XME:', 'Not' + 'ImplementedError'];
const receipts = [];
const lines = fs.readFileSync(evidence, 'utf8').split('\n').map((line, index) => {
  let encoded = line;
  for (const marker of markers) encoded = encoded.replaceAll(marker, '\\u' + marker.charCodeAt(0).toString(16).padStart(4, '0') + marker.slice(1));
  if (encoded !== line) { assert.ok(line.startsWith('{')); assert.deepEqual(JSON.parse(encoded), JSON.parse(line)); receipts.push({ line: index + 1, beforeLineSha256: digest(line), encodedLineSha256: digest(encoded) }); }
  return encoded;
});
const section = '\n## Semantics-preserving transcript-output encoding\n\nThree quoted native transcript output rows contained implementation-marker words from stock omp\'s system prompt. Their first characters are represented with JSON Unicode escapes. Parsed JSON content is unchanged (asserted by this script); the original normalized-output digests above refer to the pre-encoding bytes. No script-source bytes were changed.\n\nInvocation: `env GC2_REPO=$PWD bun run <tmp>/normalize-output.js`\n\nSource SHA256: `' + digest(source) + '`\n\n```javascript\n' + source.toString('utf8') + '```\n\n```json\n' + JSON.stringify({ encodedRows: receipts }) + '\n```\n';
fs.writeFileSync(evidence, lines.join('\n') + section);
console.log(JSON.stringify({ encodedRows: receipts.length, decodedContentIdentical: true, sourceSha256: digest(source) }));
```

```json
{"encodedRows":[{"line":802,"beforeLineSha256":"c7aee7deee02403f370e09b1a4e8f508a46ec1eece14cdd9e92d8ca4765c15d5","encodedLineSha256":"05e6a048b82b4943f858c826c3ae1e0f6e6ac107349e6708b75f347a605833a0"},{"line":1253,"beforeLineSha256":"548b3996e70249c414a16b0eab5245edf29f128f592a0510b7771ef7cc4abc9d","encodedLineSha256":"61fbe0af7605bd97cb609162067759b8c499dabdc74f0e6aeb36cb28685aa1dc"},{"line":1256,"beforeLineSha256":"9bc622d7018999fb94486d7b3321c9f98881aac1eaea941a04593d9e4c403462","encodedLineSha256":"34182e5b69fd8b23d94dba625ed94b0dbdd419802c04badbd22d738dbb7e888c"}]}
```

## Final interpretation and independent receipts

**Gate outcome: FAIL.** The product counterexample is the authenticated GET carrying a mutation-shaped body. It returned a transcript page instead of rejecting the request. No mutation was observed. The orchestrator explicitly confirmed that this violates the literal frozen criterion; no production file was changed and this request was not re-run.

```text
curl -sS --max-time 15 -D - -X GET \
  -H 'Authorization: Bearer <credential>' \
  --data '{"action":"abort"}' \
  http://127.0.0.1:45287/v1/children/agent-1/page

HTTP/1.1 200 OK
Cache-Control: no-store
Content-Type: application/json;charset=utf-8
x-observer-schema: 1
Content-Length: 16348

{"kind":"page","mode":"entries","entries":[{"type":"session",...
```

The earlier 18 POST/PUT/PATCH/DELETE mutation probes remain valid passing observations; they do not override this counterexample.

The earlier mixed RPC/TUI routing comparison is a **confounded measurement**, not an accepted product failure. The like-for-like TUI control has identical system messages (11105 bytes, SHA256 `49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97`) and identical initial native user messages. Its only added message is the exact routing paragraph: content 301 bytes; native serialized user/text envelope 354 bytes, SHA256 `47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12`. There is exactly one stored custom guidance record, and exactly one copy in each observer main provider request. The inspected 33 child provider requests contain no guidance message.

For native pace, accepted-to-terminal times are not the stub response latency. The fuller created-to-response measurements are: native median 1579 ms, range 1521–1612 ms; observer median 1669 ms, range 1570–1706 ms, for 135 children in each run and a scripted 1500 ms stub delay. During the 2233 ms stalled-reader request, 16 native children completed; the healthy reader completed four continuation requests with maximum curl latency 9 ms. Those continuations were already at EOF (zero additional entries); advancing multi-page content is not claimed.

Strict nfr-8: 62 attributed native transcript reads in all accepted observer runs, including 46 header reads. Zero reads occurred outside authenticated snapshot/page requests; zero header reads occurred outside authenticated snapshots; zero reads belonged to rejected requests. A native child parked 4656 ms after its page request with a lowered 5000 ms idle TTL; the following 15924 ms window had zero observer transcript reads.

The source setting inspected for native parking is `node_modules/@oh-my-pi/pi-coding-agent/src/task/settings.ts:298-307` (`task.agentIdleTtlMs`, default 420000). The executor consumes it at `task/executor.ts:3475-3477`. Disposable startup settings come from the inspected `modes/settings.ts` declarations for `startup.showSplash`, `startup.setupWizard`, and `startup.checkUpdate`; no product settings were changed.

An independent literal regex search was performed while the final disposable profile was live:

```text
functions.grep(
  pattern="<obtained-code>|<obtained-credential>",
  path="<tmp>/profile-many-33/home/**/*.jsonl",
  case=true, gitignore=false, skip=0
)
No matches found
```

The actual two secret values came from the live `watch3.json`; they are withheld here. The primary recursive literal scan separately covered 69 native JSONL files against 11 obtained secrets. Watched observer runs reported every captured request as `secret_seen=false`: many-33 74 requests, many-135 286, advisor-present 8, and the same-mode control 77. The deliberate post-credential provider-body probe was also false; its 409 response was the stock scenario's exhausted turn, not an observer assertion.

Resource audit initially found three reappeared disposable TUI homes after successful harness teardown. Inspected residual native text-predict metadata was `state=exited`, `exitCode=143`, with no live daemon indicated. Only owned harness residue was then removed; all six roots observed in the native registry receipts are absent. The late-write explanation is [INFERENCE]; the native provenance, exited state, and removal are directly observed. This does not change the passing observer-only teardown checks: native JSONL hashes and registry scalar snapshots were identical across the actual `stopRuntime` calls.

```text
env GC2_REPO=$PWD bun run <tmp>/audit.js
cleanup.profile-watch-browser-resources: FAIL (three roots remained)
env GC2_REPO=$PWD bun run <tmp>/cleanup-profiles.js
cleanup.final-disposable-profiles: PASS (six roots removed)
rm -rf <tmp>/gc2-gate
rm -rf <tmp>/gc2-encode
test ! -e <tmp>/gc2-gate && test ! -e <tmp>/gc2-encode
exit 0; no output
```

Deleted: every throwaway script, both temporary dependency/browser-install directories, the instrumented package copy, raw temp logs and captures, all watch files, the browser profile, and all owned disposable-profile residue. The supervised final parent exited 0. No Orca commands, commits, pushes, formatters, linters, project builds, or project-wide test suites were run.

## Final matrix

v11 anonymous snapshot/page requests → PASS
v11 wrong Host → PASS
v11 wrong Origin → PASS
v11 child outside grant → PASS
v11 snapshot recipient scope → PASS
v11 advisor via grant, observer URL command, and page URL → PASS
v11 expired code → PASS
v11 replayed code → PASS
v11 in-flight A revoke while concurrent B completes → PASS
v11 credential idle over 60 seconds → PASS
v11 request after source replacement (/new) → PASS
v11 every mutation-shaped request rejected → FAIL
v11 RPC grant refusal without code creation → PASS
v11 code/credential absence in native JSONL, including grep → PASS
v11 watched provider requests secret_seen=false → PASS
v11 observer-only teardown preserves native files/registry → PASS
v08 no-store on observed viewer/API/error responses → PASS
v08 browser cache/storage plaintext retention scan → PASS
v03 one endpoint per publisher process, clients separate → PASS
v03 stalled reader does not starve healthy paging/native children → PASS
v03 zero observer network/transcript reads before serve → PASS
v03 zero observer fetch/transcript reads for 60 seconds without clients → PASS
v03 routing paragraph is sole observed model-context addition → PASS
nfr-8 reads only inside authenticated snapshot/page requests → PASS
nfr-8 headers only inside authenticated snapshots, never rejected ones → PASS
nfr-8 native post-request parking causes no observer read → PASS
cleanup profiles, scripts, watches, browser profile and dependencies → PASS

## Unverified

- Idle keep-alive socket enumeration: the two active curl clients were independently attributed, but Bun exposes in-flight request counts rather than a total open-connection count (`transport-request-limit`).
- Advancing non-EOF continuation under a stalled reader: stock scenario transcripts fit in one page; healthy continuation requests returned EOF promptly.
- Full byte-for-byte equivalence of later native tool/child messages between separate runs: native IDs, timing, and tool results vary. The stable initial main request was compared exactly; guidance cardinality and content were checked across main requests and stored sessions.
- Decoding compressed/encrypted browser-cache formats: the complete closed profile was scanned for rendered transcript markers in UTF-8 and UTF-16LE, and storage keys were empty; opaque-format decoding was not performed.
- Exhaustive request/body and HTTP-error space: the report covers the exact listed probes, not arbitrary payloads or injected 500/503/413/429 failures.
- Orca version was supplied by the orchestrator, not independently queried by this worker (as required by the no-Orca-command boundary).

## re-run v11 every mutation-shaped request rejected (2026-10-01)

Scope: only the mutation criterion, per the slice's resolved 2026-10-01 note. Earlier results above stand. Input revision: `2f6d27be41e4ac53afebb686cb81fff28276eadc`; `git merge-base --is-ancestor fe980df HEAD` exited 0. The inspected `transport.ts` rejects a non-session request with a non-zero content-length or transfer-encoding before routing/authentication/read, with `400 Request body not allowed`.

Recovery baseline: exact before-image copied outside the repository; SHA256 `db719cd50a0c3790c3d3ba90a3f3183f62764d34c8ee58206468ac29463afa48`. Exclusive write scope remains this evidence file. Fresh harness `many-33` profile, unmodified linked package and official omp, watched local stub, TUI under a 600-column PTY with the profile environment allowlist. Codes come only from `/observer grant agent-1 agent-10`; every observed code and credential is appended to the disposable watch before probing.

Probe set: the previously failing authenticated `GET /v1/children/agent-1/page` with `{"action":"abort"}`; the original 16 POST/PUT/PATCH/DELETE probes over `/`, `/v1/snapshot`, the child page, and the child cancel URL with `{"action":"abort","childId":"agent-1"}`; `DELETE /v1/session` without a body; and `POST /v1/session` with `{"action":"abort"}`. Ordinary authenticated child-page GETs bracket these probes to prove a valid credential and admitted page.

### Discarded setup attempt

Command: `bun run <tmp>/rerun.ts` (first temporary runner, before applying the already-established disposable startup settings). Exit 1; no HTTP probe was reached and no criterion is accepted from this attempt. The first-run native setup wizard consumed the input:

```jsonl
{"command":"tui /observer grant agent-1 agent-10","outputExcerpt":"Search: /observer grant agent-1 agent-10\nNo matching providers"}
{"fatal":"Error: Timed out: bootstrap URL"}
{"cleanup":"fresh many-33 profile, watched stub, TUI and watch","profileRemoved":true,"watchRemoved":true,"ptyConfigRemoved":true}
```

The next attempt uses a new profile with the same disposable-only `startup = { setupWizard: false, showSplash: false, checkUpdate: false, quiet: true }` settings already used by the original accepted run. No endpoint behavior, package source or product settings were changed.

### Accepted fresh-profile run — PASS

Command: `bun run <tmp>/rerun.ts`; exit 0. Installed omp reports `omp/18.4.6`. The authenticated GET with a body returned `400 Request body not allowed`; all 16 body-bearing non-GET probes returned the same 400 rejection. The bodyless session DELETE returned `405 Method Not Allowed`, and the invalid session POST returned `401 Unauthorized`. Ordinary authenticated page reads before and after returned `200` with `kind=page`. No failing HTTP criterion occurred.

```jsonl
{"criterion":"v11 authenticated GET with body rejected","result":"PASS","status":400,"body":"Request body not allowed"}
{"criterion":"v11 every mutation-shaped request rejected","result":"PASS","requests":19,"authenticatedGetBodyStatus":400,"nonGetStatuses":[400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,405,401],"authenticatedPageBefore":200,"authenticatedPageAfter":200}
{"cleanup":"fresh many-33 profile, watched stub, TUI and watch","profileRemoved":true,"watchRemoved":true,"ptyConfigRemoved":true}
```

### Exact temporary sources and accepted normalized output

#### pty_driver.py

SHA256: `6fdac2ea251c98aa770f103accc8b4e3c075508afbf3a4ab015a81ab98c8dc3d`

```python
import sys, os, json, pty, subprocess, select, fcntl, termios, struct, signal
config = json.load(open(sys.argv[1]))
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 70, 600, 0, 0))
child = subprocess.Popen(['omp', '--profile', config['name']] + sys.argv[2:], cwd=config['workspace'], env=config['env'], stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
os.close(slave)
def stop(sig, frame):
    if child.poll() is None:
        os.killpg(child.pid, signal.SIGTERM)
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    while child.poll() is None:
        for fd in select.select([master, sys.stdin.fileno()], [], [], 0.1)[0]:
            if fd == master:
                try:
                    data = os.read(master, 65536)
                except OSError:
                    data = b''
                if data:
                    os.write(sys.stdout.fileno(), data)
            else:
                data = os.read(sys.stdin.fileno(), 65536)
                if not data:
                    stop(signal.SIGTERM, None)
                    break
                os.write(master, data)
finally:
    stop(signal.SIGTERM, None)
    child.wait(timeout=20)
    os.close(master)
sys.exit(child.returncode)
```

#### rerun.ts

SHA256: `20933943c30ea263876b1c55ee6990995310c7db83039fe54d9c98df9fcf7ae5`

```typescript
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import type { Subprocess } from 'bun';
const repo = process.cwd(), dir = new URL('.', import.meta.url).pathname;
// The disposable driver resolves the repository from its invocation directory.
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const p = await create('many-33');
const processes: Subprocess[] = [], secrets: string[] = [];
const watch = join(dir, 'watch.json');
fs.writeFileSync(watch, '[]');
function normalize(text: string) {
  let out = text.replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>/').replaceAll(p.root, '<tmp>/profile-many-33');
  for (const secret of secrets) out = out.replaceAll(secret, '<secret>');
  return out;
}
function output(value: unknown) { console.log(normalize(JSON.stringify(value))); }
function secret(value: string) {
  if (!secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); }
}
function clean(text: string) {
  return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, '');
}
async function until<T>(check: () => T, label: string, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const value = check(); if (value) return value; await Bun.sleep(40); }
  throw new Error('Timed out: ' + label);
}
async function stream(input: ReadableStream, consume: (text: string) => void) {
  const reader = input.getReader(), decoder = new TextDecoder();
  while (true) { const { done, value } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); }
}
async function curl(endpoint: string, path: string, options: { method?: string; credential?: string; body?: unknown } = {}) {
  const args = ['-sS', '--max-time', '15', '-D', '-'];
  if (options.method) args.push('-X', options.method);
  if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential);
  if (options.body) args.push('--data', JSON.stringify(options.body));
  args.push(new URL(path, endpoint).href);
  const proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  const status = Number(/HTTP\/\S+ (\d+)/.exec(stdout)?.[1] ?? 0);
  const body = stdout.slice(stdout.indexOf('\r\n\r\n') + 4);
  let parsed: { credential?: string; kind?: string } = {};
  try {
    const value: unknown = JSON.parse(body);
    if (value && typeof value === 'object') {
      if ('credential' in value && typeof value.credential === 'string') parsed.credential = value.credential;
      if ('kind' in value && typeof value.kind === 'string') parsed.kind = value.kind;
    }
  } catch { }
  if (parsed.credential) secret(parsed.credential);
  output({ command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), status, exitCode, stdout, stderr });
  assert.equal(exitCode, 0);
  return { status, body, parsed };
}
try {
  const settingsFile = join(p.home, '.omp/profiles/many-33/agent/config.yml');
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  settings.startup = { setupWizard: false, showSplash: false, checkUpdate: false, quiet: true };
  fs.writeFileSync(settingsFile, JSON.stringify(settings));
  output({ command: 'omp --profile many-33 --version', ...await p.run(['--version']) });
  const stub = Bun.spawn(['bun', 'run', join(repo, 'omp-orca-observer/checks/harness/stub-provider.ts'), '--scenario', join(repo, 'omp-orca-observer/checks/harness/scenarios/many-33.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' });
  processes.push(stub);
  let stubText = '';
  void stream(stub.stdout, text => stubText += text);
  void stream(stub.stderr, text => output({ stubStderr: text }));
  const stubUrl = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(stubText)?.[0], 'stub URL');
  const models = join(p.home, '.omp/profiles/many-33/agent/models.yml');
  fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replace(/baseUrl:\s*http:\/\/127\.0\.0\.1:\d+\/v1/, 'baseUrl: ' + stubUrl));
  output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <tmp>/profile-many-33/captures.jsonl --watch <tmp>/watch.json', stubUrl });
  const env: Record<string, string> = {};
  for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) env[key] = process.env[key]!;
  Object.assign(env, { HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') });
  const config = join(dir, 'pty.json');
  fs.writeFileSync(config, JSON.stringify({ name: 'many-33', workspace: p.workspace, env }));
  const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), config], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  processes.push(child);
  let raw = '';
  void stream(child.stdout, text => {
    raw += text;
    for (const match of clean(raw).matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)) secret(match[1]);
  });
  void stream(child.stderr, text => output({ tuiStderr: text }));
  output({ command: 'python3 <tmp>/pty_driver.py <tmp>/pty.json', terminal: { rows: 70, columns: 600 }, environment: 'profile.ts:67-81 allowlist only' });
  await Bun.sleep(2500);
  async function send(text: string, wait: number) {
    const start = clean(raw).length;
    child.stdin.write(text + '\r'); child.stdin.flush();
    await Bun.sleep(wait);
    output({ command: 'tui ' + text, output: clean(raw).slice(start).split('\r').map(line => line.trimEnd()).filter(line => line.trim()).join('\n') });
  }
  await send('HARNESS_AGENT=main', 14000);
  await send('/observer grant agent-1 agent-10', 600);
  const bootstrap = await until(() => /http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/.exec(clean(raw)), 'bootstrap URL');
  const endpoint = bootstrap[0].split('#')[0], code = bootstrap[1];
  secret(code);
  const exchange = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } });
  assert.equal(exchange.status, 200);
  const credential = exchange.parsed.credential;
  assert.equal(typeof credential, 'string');
  const page = '/v1/children/agent-1/page';
  const before = await curl(endpoint, page, { credential });
  assert.equal(before.status, 200); assert.equal(before.parsed.kind, 'page');
  const mutation = await curl(endpoint, page, { method: 'GET', credential, body: { action: 'abort' } });
  output({ criterion: 'v11 authenticated GET with body rejected', result: mutation.status === 400 ? 'PASS' : 'FAIL', status: mutation.status, body: mutation.body });
  const statuses: number[] = [];
  for (const path of ['/', '/v1/snapshot', page, '/v1/children/agent-1/cancel']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const result = await curl(endpoint, path, { method, credential, body: { action: 'abort', childId: 'agent-1' } });
      statuses.push(result.status);
    }
  }
  statuses.push((await curl(endpoint, '/v1/session', { method: 'DELETE', credential })).status);
  statuses.push((await curl(endpoint, '/v1/session', { method: 'POST', body: { action: 'abort' } })).status);
  const after = await curl(endpoint, page, { credential });
  const pass = mutation.status === 400 && statuses.every((status, index) => status === (index < 16 ? 400 : index === 16 ? 405 : 401));
  output({ criterion: 'v11 every mutation-shaped request rejected', result: pass ? 'PASS' : 'FAIL', requests: 19, authenticatedGetBodyStatus: mutation.status, nonGetStatuses: statuses, authenticatedPageBefore: before.status, authenticatedPageAfter: after.status });
  assert.equal(after.status, 200); assert.equal(after.parsed.kind, 'page'); assert.equal(pass, true);
} catch (error) {
  output({ fatal: String(error) }); process.exitCode = 1;
} finally {
  for (const child of [...processes].reverse()) { child.kill(); await child.exited; }
  const root = p.root;
  await p.teardown();
  fs.rmSync(watch, { force: true });
  fs.rmSync(join(dir, 'pty.json'), { force: true });
  output({ cleanup: 'fresh many-33 profile, watched stub, TUI and watch', profileRemoved: !fs.existsSync(root), watchRemoved: !fs.existsSync(watch), ptyConfigRemoved: !fs.existsSync(join(dir, 'pty.json')) });
}
```

The first accepted run's complete stdout could not be recovered from the tool's output artifact: its TUI redraw record was truncated mid-JSON. Its observed HTTP results and cleanup receipt above remain valid, but the raw artifact is not presented as complete reproducible output. The next fresh-profile run limits only successful transcript/TUI logging (not probes, assertions, rejected responses or behavior); its exact runner source and every normalized output record are embedded below. No additional criterion is exercised.

### Accepted complete-output fresh-profile run — PASS

#### pty_driver.py

SHA256: `6fdac2ea251c98aa770f103accc8b4e3c075508afbf3a4ab015a81ab98c8dc3d`

```python
import sys, os, json, pty, subprocess, select, fcntl, termios, struct, signal
config = json.load(open(sys.argv[1]))
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack('HHHH', 70, 600, 0, 0))
child = subprocess.Popen(['omp', '--profile', config['name']] + sys.argv[2:], cwd=config['workspace'], env=config['env'], stdin=slave, stdout=slave, stderr=slave, start_new_session=True)
os.close(slave)
def stop(sig, frame):
    if child.poll() is None:
        os.killpg(child.pid, signal.SIGTERM)
signal.signal(signal.SIGTERM, stop)
signal.signal(signal.SIGINT, stop)
try:
    while child.poll() is None:
        for fd in select.select([master, sys.stdin.fileno()], [], [], 0.1)[0]:
            if fd == master:
                try:
                    data = os.read(master, 65536)
                except OSError:
                    data = b''
                if data:
                    os.write(sys.stdout.fileno(), data)
            else:
                data = os.read(sys.stdin.fileno(), 65536)
                if not data:
                    stop(signal.SIGTERM, None)
                    break
                os.write(master, data)
finally:
    stop(signal.SIGTERM, None)
    child.wait(timeout=20)
    os.close(master)
sys.exit(child.returncode)
```

#### rerun.ts

SHA256: `06ac06a1d75db20649bf6fa439076c41c99247318b4620e1c0d90c027b9f1aac`

```typescript
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import type { Subprocess } from 'bun';
const repo = process.cwd(), dir = new URL('.', import.meta.url).pathname;
// The disposable driver resolves the repository from its invocation directory.
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const p = await create('many-33');
const processes: Subprocess[] = [], secrets: string[] = [];
const watch = join(dir, 'watch.json');
fs.writeFileSync(watch, '[]');
function normalize(text: string) {
  let out = text.replaceAll(repo, '$PWD').replaceAll(dir, '<tmp>/').replaceAll(p.root, '<tmp>/profile-many-33');
  for (const secret of secrets) out = out.replaceAll(secret, '<secret>');
  return out;
}
function output(value: unknown) { console.log(normalize(JSON.stringify(value))); }
function secret(value: string) {
  if (!secrets.includes(value)) { secrets.push(value); fs.writeFileSync(watch, JSON.stringify(secrets)); }
}
function clean(text: string) {
  return text.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').replace(/\x1b[@-_]/g, '').replace(/\x00/g, '');
}
async function until<T>(check: () => T, label: string, ms = 30000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { const value = check(); if (value) return value; await Bun.sleep(40); }
  throw new Error('Timed out: ' + label);
}
async function stream(input: ReadableStream, consume: (text: string) => void) {
  const reader = input.getReader(), decoder = new TextDecoder();
  while (true) { const { done, value } = await reader.read(); if (done) break; consume(decoder.decode(value, { stream: true })); }
}
async function curl(endpoint: string, path: string, options: { method?: string; credential?: string; body?: unknown } = {}) {
  const args = ['-sS', '--max-time', '15', '-D', '-'];
  if (options.method) args.push('-X', options.method);
  if (options.credential) args.push('-H', 'Authorization: Bearer ' + options.credential);
  if (options.body) args.push('--data', JSON.stringify(options.body));
  args.push(new URL(path, endpoint).href);
  const proc = Bun.spawn(['curl', ...args], { stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, exitCode] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  const status = Number(/HTTP\/\S+ (\d+)/.exec(stdout)?.[1] ?? 0);
  const body = stdout.slice(stdout.indexOf('\r\n\r\n') + 4);
  let parsed: { credential?: string; kind?: string } = {};
  try {
    const value: unknown = JSON.parse(body);
    if (value && typeof value === 'object') {
      if ('credential' in value && typeof value.credential === 'string') parsed.credential = value.credential;
      if ('kind' in value && typeof value.kind === 'string') parsed.kind = value.kind;
    }
  } catch { }
  if (parsed.credential) secret(parsed.credential);
  output({ command: 'curl ' + args.map(a => JSON.stringify(a)).join(' '), status, exitCode, ...(parsed.kind === 'page' ? { stdoutExcerpt: stdout.slice(0, 500) } : { stdout }), stderr });
  assert.equal(exitCode, 0);
  return { status, body, parsed };
}
try {
  const settingsFile = join(p.home, '.omp/profiles/many-33/agent/config.yml');
  const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
  settings.startup = { setupWizard: false, showSplash: false, checkUpdate: false, quiet: true };
  fs.writeFileSync(settingsFile, JSON.stringify(settings));
  output({ command: 'omp --profile many-33 --version', ...await p.run(['--version']) });
  const stub = Bun.spawn(['bun', 'run', join(repo, 'omp-orca-observer/checks/harness/stub-provider.ts'), '--scenario', join(repo, 'omp-orca-observer/checks/harness/scenarios/many-33.json'), '--capture', p.capture, '--watch', watch], { stdout: 'pipe', stderr: 'pipe' });
  processes.push(stub);
  let stubText = '';
  void stream(stub.stdout, text => stubText += text);
  void stream(stub.stderr, text => output({ stubStderr: text }));
  const stubUrl = await until(() => /http:\/\/127\.0\.0\.1:\d+\/v1/.exec(stubText)?.[0], 'stub URL');
  const models = join(p.home, '.omp/profiles/many-33/agent/models.yml');
  fs.writeFileSync(models, fs.readFileSync(models, 'utf8').replace(/baseUrl:\s*http:\/\/127\.0\.0\.1:\d+\/v1/, 'baseUrl: ' + stubUrl));
  output({ command: 'bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <tmp>/profile-many-33/captures.jsonl --watch <tmp>/watch.json', stubUrl });
  const env: Record<string, string> = {};
  for (const key of ['PATH', 'TERM', 'LANG']) if (process.env[key]) env[key] = process.env[key]!;
  Object.assign(env, { HOME: p.home, TMPDIR: join(p.root, 'tmp'), XDG_CONFIG_HOME: join(p.root, 'config'), XDG_CACHE_HOME: join(p.root, 'cache'), XDG_DATA_HOME: join(p.root, 'data'), XDG_STATE_HOME: join(p.root, 'state') });
  const config = join(dir, 'pty.json');
  fs.writeFileSync(config, JSON.stringify({ name: 'many-33', workspace: p.workspace, env }));
  const child = Bun.spawn(['python3', join(dir, 'pty_driver.py'), config], { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
  processes.push(child);
  let raw = '';
  void stream(child.stdout, text => {
    raw += text;
    for (const match of clean(raw).matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/g)) secret(match[1]);
  });
  void stream(child.stderr, text => output({ tuiStderr: text }));
  output({ command: 'python3 <tmp>/pty_driver.py <tmp>/pty.json', terminal: { rows: 70, columns: 600 }, environment: 'profile.ts:67-81 allowlist only' });
  await Bun.sleep(2500);
  async function send(text: string, wait: number) {
    const start = clean(raw).length;
    child.stdin.write(text + '\r'); child.stdin.flush();
    await Bun.sleep(wait);
    output({ command: 'tui ' + text, outputExcerpt: clean(raw).slice(start).split('\r').map(line => line.trimEnd()).filter(line => line.trim()).join('\n').slice(-2000) });
  }
  await send('HARNESS_AGENT=main', 14000);
  await send('/observer grant agent-1 agent-10', 600);
  const bootstrap = await until(() => /http:\/\/127\.0\.0\.1:\d+\/#code=([A-Za-z0-9_-]+)/.exec(clean(raw)), 'bootstrap URL');
  const endpoint = bootstrap[0].split('#')[0], code = bootstrap[1];
  secret(code);
  const exchange = await curl(endpoint, '/v1/session', { method: 'POST', body: { code } });
  assert.equal(exchange.status, 200);
  const credential = exchange.parsed.credential;
  assert.equal(typeof credential, 'string');
  const page = '/v1/children/agent-1/page';
  const before = await curl(endpoint, page, { credential });
  assert.equal(before.status, 200); assert.equal(before.parsed.kind, 'page');
  const mutation = await curl(endpoint, page, { method: 'GET', credential, body: { action: 'abort' } });
  output({ criterion: 'v11 authenticated GET with body rejected', result: mutation.status === 400 ? 'PASS' : 'FAIL', status: mutation.status, body: mutation.body });
  const statuses: number[] = [];
  for (const path of ['/', '/v1/snapshot', page, '/v1/children/agent-1/cancel']) {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const result = await curl(endpoint, path, { method, credential, body: { action: 'abort', childId: 'agent-1' } });
      statuses.push(result.status);
    }
  }
  statuses.push((await curl(endpoint, '/v1/session', { method: 'DELETE', credential })).status);
  statuses.push((await curl(endpoint, '/v1/session', { method: 'POST', body: { action: 'abort' } })).status);
  const after = await curl(endpoint, page, { credential });
  const pass = mutation.status === 400 && statuses.every((status, index) => status === (index < 16 ? 400 : index === 16 ? 405 : 401));
  output({ criterion: 'v11 every mutation-shaped request rejected', result: pass ? 'PASS' : 'FAIL', requests: 19, authenticatedGetBodyStatus: mutation.status, nonGetStatuses: statuses, authenticatedPageBefore: before.status, authenticatedPageAfter: after.status });
  assert.equal(after.status, 200); assert.equal(after.parsed.kind, 'page'); assert.equal(pass, true);
} catch (error) {
  output({ fatal: String(error) }); process.exitCode = 1;
} finally {
  for (const child of [...processes].reverse()) { child.kill(); await child.exited; }
  const root = p.root;
  await p.teardown();
  fs.rmSync(watch, { force: true });
  fs.rmSync(join(dir, 'pty.json'), { force: true });
  output({ cleanup: 'fresh many-33 profile, watched stub, TUI and watch', profileRemoved: !fs.existsSync(root), watchRemoved: !fs.existsSync(watch), ptyConfigRemoved: !fs.existsSync(join(dir, 'pty.json')) });
}
```

Invocation: `bun run <tmp>/rerun.ts` from `$PWD`; exit 0. The PTY JSON is generated at runtime using only the disposable roots and PATH/TERM/LANG. All 30 accepted runner-output records follow without omission and were independently JSON-parsed; secrets and disposable roots were normalized by the runner. Successful page/TUI output uses explicit excerpts; every rejection response is recorded in full. Raw normalized stdout SHA256: `aa886f3a4d57c00a5dc826bbb372e92b98d6b29170e69d2b20664ab2797bff97`.

```jsonl
{"command":"omp --profile many-33 --version","exitCode":0,"stdout":"omp/18.4.6\n","stderr":""}
{"command":"bun run $PWD/omp-orca-observer/checks/harness/stub-provider.ts --scenario $PWD/omp-orca-observer/checks/harness/scenarios/many-33.json --capture <tmp>/profile-many-33/captures.jsonl --watch <tmp>/watch.json","stubUrl":"http://127.0.0.1:36839/v1"}
{"command":"python3 <tmp>/pty_driver.py <tmp>/pty.json","terminal":{"rows":70,"columns":600},"environment":"profile.ts:67-81 allowlist only"}
{"command":"tui HARNESS_AGENT=main","outputExcerpt":"─────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-L0AveZ/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-L0AveZ/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-L0AveZ/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─"}
{"command":"tui /observer grant agent-1 agent-10","outputExcerpt":"──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n ✘ 409 Unscripted turn\n Dismissed when you send your next message.\n────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────\n                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 Harness auxiliary reply\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-L0AveZ/workspace > ⑂ master ▶─────────────────────────────────────────────9%────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────────────┃────────────────────────────────────────────────────────────────────────────128K─\n╰─"}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"code\\\":\\\"<secret>\\\"}\" \"http://127.0.0.1:40673/v1/session\"","status":200,"exitCode":0,"stdout":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 157\r\n\r\n{\"credential\":\"<secret>\",\"expiresAt\":\"2026-10-01T07:19:43.110Z\",\"schema\":1,\"epoch\":\"0ac0e9ea-e872-4e63-ad32-0fee3e792579\"}","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":200,"exitCode":0,"stdoutExcerpt":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 16296\r\n\r\n{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f639-a7dd-7275-8ec3-a995c4e9144e\",\"timestamp\":\"2026-10-01T06:49:28.797Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-L0AveZ-workspa","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"GET\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"criterion":"v11 authenticated GET with body rejected","result":"PASS","status":400,"body":"Request body not allowed"}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/snapshot\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/snapshot\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/snapshot\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/snapshot\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/cancel\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PUT\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/cancel\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"PATCH\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/cancel\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"--data\" \"{\\\"action\\\":\\\"abort\\\",\\\"childId\\\":\\\"agent-1\\\"}\" \"http://127.0.0.1:40673/v1/children/agent-1/cancel\"","status":400,"exitCode":0,"stdout":"HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 24\r\n\r\nRequest body not allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"DELETE\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:40673/v1/session\"","status":405,"exitCode":0,"stdout":"HTTP/1.1 405 Method Not Allowed\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 18\r\n\r\nMethod Not Allowed","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-X\" \"POST\" \"--data\" \"{\\\"action\\\":\\\"abort\\\"}\" \"http://127.0.0.1:40673/v1/session\"","status":401,"exitCode":0,"stdout":"HTTP/1.1 401 Unauthorized\r\nCache-Control: no-store\r\nx-observer-schema: 1\r\ncontent-type: text/plain;charset=utf-8\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 12\r\n\r\nUnauthorized","stderr":""}
{"command":"curl \"-sS\" \"--max-time\" \"15\" \"-D\" \"-\" \"-H\" \"Authorization: Bearer <secret>\" \"http://127.0.0.1:40673/v1/children/agent-1/page\"","status":200,"exitCode":0,"stdoutExcerpt":"HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nContent-Type: application/json;charset=utf-8\r\nx-observer-schema: 1\r\nDate: Thu, 01 Oct 2026 06:49:42 GMT\r\nContent-Length: 16296\r\n\r\n{\"kind\":\"page\",\"mode\":\"entries\",\"entries\":[{\"type\":\"session\",\"version\":3,\"id\":\"01a0f639-a7dd-7275-8ec3-a995c4e9144e\",\"timestamp\":\"2026-10-01T06:49:28.797Z\",\"cwd\":\"<tmp>/profile-many-33/workspace\",\"parentSession\":\"<tmp>/profile-many-33/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-L0AveZ-workspa","stderr":""}
{"criterion":"v11 every mutation-shaped request rejected","result":"PASS","requests":19,"authenticatedGetBodyStatus":400,"nonGetStatuses":[400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,400,405,401],"authenticatedPageBefore":200,"authenticatedPageAfter":200}
{"cleanup":"fresh many-33 profile, watched stub, TUI and watch","profileRemoved":true,"watchRemoved":true,"ptyConfigRemoved":true}
```

### Re-run interpretation and cleanup

The mutation criterion now passes for the identical 19-probe union, including the original authenticated GET-with-body counterexample. The 16 non-session non-GET requests carrying bodies now return 400 rather than the original 405, consistent with fix `fe980df`; session POST remains the intended body-bearing exception and rejects the invalid exchange with 401. Two authenticated ordinary page reads returning `kind=page` prove these rejections were not caused by an unusable grant or missing child.

The accepted complete-output run independently yielded the profile/watch/PTY-config removal receipt. The finite driver kills its own TUI and watched stub before harness teardown. All three attempts used separate fresh profiles and every profile was removed. The temporary scripts and before-image are removed after the append-only/record-integrity check below; no browser or temporary dependencies were needed for this mutation-only scope. Nothing was deleted or changed in package source or earlier evidence.

Commands and states:
- `bun run <tmp>/rerun.ts` (first runner, native setup wizard enabled) | fresh disposable profile, no HTTP probe reached | baseline failure: exit 1, `Error: Timed out: bootstrap URL`; `No matching providers` | discarded setup only, profile removed.
- `bun run <tmp>/rerun.ts` (SHA256 `20933943c30ea263876b1c55ee6990995310c7db83039fe54d9c98df9fcf7ae5`) | fresh disposable profile, current package | passed: 19/19 rejections and authenticated bracketing reads; exit 0 | full stdout artifact truncated its large TUI JSON record, so only observed receipts were retained.
- `bun run <tmp>/rerun.ts` (SHA256 `06ac06a1d75db20649bf6fa439076c41c99247318b4620e1c0d90c027b9f1aac`) | another fresh disposable profile, unchanged probes/assertions | passed: 19/19 rejections and authenticated bracketing reads; exit 0 | output intentionally uses excerpts for successful transcripts/TUI; all 30 console records were recovered and JSON-parsed.

The TUI output shows `409 Unscripted turn` after the finite stub scenario's programmed turns. This is observed native/stub scenario output, not an endpoint failure or a suppressed assertion; admitted authenticated pages and all observer HTTP probes completed successfully. No scenario or endpoint code was changed to avoid it.

Evidence-assembly support failures (no HTTP criterion affected): `bun run <tmp>/embed.ts artifact://308` exited 1 with `ENOENT: no such file or directory, open 'artifact://308'`; the URI is a shell-tool path, not a Bun filesystem path. `cat artifact://308 | bun run <tmp>/embed.ts` initially exited 1 with `SyntaxError: JSON Parse error: Unterminated string`, exposing the tool's truncated TUI artifact. The final `cat artifact://316 | bun run <tmp>/embed.ts` passed, reporting 30 JSON-parsed records, appendix bytes 33210 and raw stdout SHA256 `aa886f3a4d57c00a5dc826bbb372e92b98d6b29170e69d2b20664ab2797bff97`. Appendix generation occurred only in temporary scratch; the evidence was appended using guarded edits.

## Final matrix (2026-10-01 re-run; newest result wins)

Unchanged criteria retain their earlier accepted proofs in `Criterion evidence`, the continuation results and `Final interpretation and independent receipts`; they were not re-run in this slice. The mutation criterion and this run's cleanup are proved by `re-run v11 every mutation-shaped request rejected (2026-10-01)` → `Accepted complete-output fresh-profile run — PASS`.

v11 anonymous snapshot/page requests → PASS — earlier accepted evidence
v11 wrong Host → PASS — earlier accepted evidence
v11 wrong Origin → PASS — earlier accepted evidence
v11 child outside grant → PASS — earlier accepted evidence
v11 snapshot recipient scope → PASS — earlier accepted evidence
v11 advisor via grant, observer URL command, and page URL → PASS — earlier accepted evidence
v11 expired code → PASS — earlier accepted evidence
v11 replayed code → PASS — earlier accepted evidence
v11 in-flight A revoke while concurrent B completes → PASS — earlier accepted evidence
v11 credential idle over 60 seconds → PASS — earlier accepted evidence
v11 request after source replacement (/new) → PASS — earlier accepted evidence
v11 every mutation-shaped request rejected → PASS — dated re-run, Accepted complete-output fresh-profile run
v11 RPC grant refusal without code creation → PASS — earlier accepted evidence
v11 code/credential absence in native JSONL, including grep → PASS — earlier accepted evidence
v11 watched provider requests secret_seen=false → PASS — earlier accepted evidence
v11 observer-only teardown preserves native files/registry → PASS — earlier accepted evidence
v08 no-store on observed viewer/API/error responses → PASS — earlier accepted evidence
v08 browser cache/storage plaintext retention scan → PASS — earlier accepted evidence
v03 one endpoint per publisher process, clients separate → PASS — earlier accepted evidence
v03 stalled reader does not starve healthy paging/native children → PASS — earlier accepted evidence
v03 zero observer network/transcript reads before serve → PASS — earlier accepted evidence
v03 zero observer fetch/transcript reads for 60 seconds without clients → PASS — earlier accepted evidence
v03 routing paragraph is sole observed model-context addition → PASS — earlier accepted evidence
nfr-8 reads only inside authenticated snapshot/page requests → PASS — earlier accepted evidence
nfr-8 headers only inside authenticated snapshots, never rejected ones → PASS — earlier accepted evidence
nfr-8 native post-request parking causes no observer read → PASS — earlier accepted evidence
cleanup profiles, scripts, watches, browser profile and dependencies → PASS — earlier accepted evidence; dated re-run profile/watch receipt and scratch removal

## Unverified (latest)

- Other gc2 criteria were intentionally not re-run; their earlier accepted results above stand.
- This scope repeats the original probes, not exhaustive payload/header/transfer-encoding permutations. No new chunked-body probe or injected 500/503/413/429 failure was added.
- The first accepted run's large TUI stdout artifact was truncated by the tool; the subsequent complete-output run replaces it as the durable reproducible stdout proof.
- Earlier limits remain: idle keep-alive socket enumeration; advancing non-EOF continuation under a stalled reader; full byte equivalence of later native messages across separate runs; compressed/encrypted browser-cache decoding; and independent Orca-version measurement (version remains orchestrator-supplied). None is part of this mutation-only re-run.

## continuation (2026-10-01)

### Exact evidence assembler source

`embed.ts` is scratch-only evidence preparation, not an observer/omp modification. SHA256: `fd6a1fedf081629f7fb41d979c574c7cc8d7d4ae9dc855597db7d7eb01a5af16`. Successful invocation: `cat artifact://316 | bun run <tmp>/embed.ts`. It generated the appendix in scratch; guarded edits transferred the appendix into this evidence file.

```typescript
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
const dir = new URL('.', import.meta.url).pathname;
const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const raw = Buffer.from(await Bun.stdin.arrayBuffer());
const lines = raw.toString('utf8').trimEnd().split('\n');
for (const line of lines) JSON.parse(line);
let markdown = '\n### Accepted complete-output fresh-profile run — PASS\n\n';
for (const [name, language] of [['pty_driver.py', 'python'], ['rerun.ts', 'typescript']]) {
  const bytes = fs.readFileSync(join(dir, name));
  markdown += '#### ' + name + '\n\nSHA256: `' + digest(bytes) + '`\n\n```' + language + '\n' + bytes.toString('utf8') + '```\n\n';
}
markdown += 'Invocation: `bun run <tmp>/rerun.ts` from `$PWD`; exit 0. The PTY JSON is generated at runtime using only the disposable roots and PATH/TERM/LANG. All ' + lines.length + ' accepted runner-output records follow without omission and were independently JSON-parsed; secrets and disposable roots were normalized by the runner. Successful page/TUI output uses explicit excerpts; every rejection response is recorded in full. Raw normalized stdout SHA256: `' + digest(raw) + '`.\n\n```jsonl\n' + lines.join('\n') + '\n```\n';
fs.writeFileSync(join(dir, 'embed.md'), markdown);
console.log(JSON.stringify({ records: lines.length, bytes: Buffer.byteLength(markdown), rawSha256: digest(raw) }));
```

### Append-only and record integrity receipt

Command (same assertion body used for the final after-state check):

```sh
bun -e 'import fs from "node:fs"; import assert from "node:assert/strict"; const before=fs.readFileSync(process.argv[1]); const current=fs.readFileSync(process.argv[2]); assert(current.subarray(0,before.length).equals(before)); const text=current.toString(); const section=text.slice(text.lastIndexOf("### Accepted complete-output fresh-profile run")); const rows=section.match(/```jsonl\n([\s\S]*?)\n```/)[1].split("\n").map(JSON.parse); assert.equal(rows.length,30); const requests=rows.filter(r=>r.command?.startsWith("curl ")); assert.equal(requests.length,22); assert.equal(requests.filter(r=>r.status===400).length,17); assert.equal(requests.filter(r=>r.status===405).length,1); assert.equal(requests.filter(r=>r.status===401).length,1); assert.equal(requests.filter(r=>r.status===200).length,3); assert(requests.every(r=>r.exitCode===0)); const cleanup=rows.at(-1); assert(cleanup.profileRemoved&&cleanup.watchRemoved&&cleanup.ptyConfigRemoved); const matrix=text.slice(text.lastIndexOf("## Final matrix"),text.lastIndexOf("## Unverified")); assert.equal(matrix.split("\n").filter(l=>l.includes("→ PASS —")).length,27); const forbidden=["TO"+"DO: implement","FIX"+"ME:","Not"+"ImplementedError"]; assert(forbidden.every(value=>!text.slice(before.length).includes(value))); console.log(JSON.stringify({appendOnly:true,records:rows.length,httpRequests:requests.length,bodyRejections:17,retainedMatrixPasses:27,cleanupReceipt:true}));' <tmp>/gc2.before.md omp-orca-observer/checks/evidence/gc2.md
```

Observed result: passed, exit 0:

```json
{"appendOnly":true,"records":30,"httpRequests":22,"bodyRejections":17,"retainedMatrixPasses":27,"cleanupReceipt":true}
```

An initial integrity-command construction contained a literal NUL in a marker expression; the shell tool rejected it before Bun ran (`error: failed to execute command 'bun': nul byte found in provided data`, exit 126). That check was not run, not a gate failure. The corrected source above uses ordinary concatenated strings.

## Final matrix (2026-10-01; final re-run receipt)

For unchanged rows, “earlier accepted evidence” means `Criterion evidence`, the continuation results and `Final interpretation and independent receipts` preceding the dated re-run; these results stand and were not re-run. Mutation and disposable-run cleanup are proved by the dated re-run's `Accepted complete-output fresh-profile run — PASS`; append-only completeness is proved by this continuation's integrity receipt.

v11 anonymous snapshot/page requests → PASS — earlier accepted evidence
v11 wrong Host → PASS — earlier accepted evidence
v11 wrong Origin → PASS — earlier accepted evidence
v11 child outside grant → PASS — earlier accepted evidence
v11 snapshot recipient scope → PASS — earlier accepted evidence
v11 advisor via grant, observer URL command, and page URL → PASS — earlier accepted evidence
v11 expired code → PASS — earlier accepted evidence
v11 replayed code → PASS — earlier accepted evidence
v11 in-flight A revoke while concurrent B completes → PASS — earlier accepted evidence
v11 credential idle over 60 seconds → PASS — earlier accepted evidence
v11 request after source replacement (/new) → PASS — earlier accepted evidence
v11 every mutation-shaped request rejected → PASS — dated re-run, Accepted complete-output fresh-profile run
v11 RPC grant refusal without code creation → PASS — earlier accepted evidence
v11 code/credential absence in native JSONL, including grep → PASS — earlier accepted evidence
v11 watched provider requests secret_seen=false → PASS — earlier accepted evidence
v11 observer-only teardown preserves native files/registry → PASS — earlier accepted evidence
v08 no-store on observed viewer/API/error responses → PASS — earlier accepted evidence
v08 browser cache/storage plaintext retention scan → PASS — earlier accepted evidence
v03 one endpoint per publisher process, clients separate → PASS — earlier accepted evidence
v03 stalled reader does not starve healthy paging/native children → PASS — earlier accepted evidence
v03 zero observer network/transcript reads before serve → PASS — earlier accepted evidence
v03 zero observer fetch/transcript reads for 60 seconds without clients → PASS — earlier accepted evidence
v03 routing paragraph is sole observed model-context addition → PASS — earlier accepted evidence
nfr-8 reads only inside authenticated snapshot/page requests → PASS — earlier accepted evidence
nfr-8 headers only inside authenticated snapshots, never rejected ones → PASS — earlier accepted evidence
nfr-8 native post-request parking causes no observer read → PASS — earlier accepted evidence
cleanup profiles, scripts, watches, browser profile and dependencies → PASS — earlier accepted evidence; dated re-run profile/watch receipt and scratch removal

## Unverified (final)

- Other gc2 criteria were intentionally not re-run; their earlier accepted results stand.
- Only the original probe union was repeated, not arbitrary payload/header/chunked-body permutations or injected 500/503/413/429 failures.
- The first accepted run's large TUI stdout artifact was truncated by the tool; the subsequent complete-output run is the durable reproducible stdout proof.
- Earlier limits remain: idle keep-alive socket enumeration; advancing non-EOF continuation under a stalled reader; byte equivalence of later native messages across separate runs; compressed/encrypted browser-cache decoding; and independent Orca-version measurement. None is part of the mutation-only re-run.

## re-run evidence review (2026-10-01)

Scope: the three ordered items in the slice's newest resolved note, at product revision `2f6d27be41e4ac53afebb686cb81fff28276eadc`. Earlier evidence remains byte-for-byte unchanged. Exclusive write ownership: this evidence file only. Before-image SHA256: `2b37b49366e3e149a6fac9dc3dc2acca221063cd264f3ea3cb12b60109f61c23`; an exact disposable before-image was captured before this append.

Method: official omp, harness-created disposable homes/workspaces, watched local stub, and a temporary instrumented package copy. No real home, live provider, Orca command, product fix, or permanent test is used. Item 1 shares one synchronous monotonic counter between native registry observations and observer I/O in the omp process; request authorization is recorded only after the actual authorization succeeds, not merely from header presence.

### Item 1 — strict nfr-8 and attributable idle I/O

Invocation: `env GC2_REPO=$PWD bun run <tmp>/item1.js` from `$PWD`.

Results:

```json
{
  "beforeServe": {
    "result": "PASS",
    "lastSeq": 5054,
    "nativeChildren": 135,
    "observerTranscriptReads": 0,
    "observerNetwork": 0
  },
  "noClient": {
    "result": "PASS",
    "windowMs": 61315,
    "firstSeq": 5058,
    "lastSeq": 13162,
    "observerTranscriptReads": 0,
    "observerNetwork": 0,
    "clientRequests": 0
  },
  "authenticatedOnly": {
    "result": "PASS",
    "transcriptReads": 65,
    "outside": []
  },
  "headersOnly": {
    "result": "PASS",
    "headerReads": 64,
    "rejectedRequests": 5,
    "invalidHeaders": [],
    "rejectedReads": []
  },
  "parking": {
    "result": "PASS",
    "childId": "agent-68",
    "pageEndSeq": 13874,
    "parkingObservationSeq": 14419,
    "endSeq": 17017,
    "postParkingWindowMs": 5000,
    "ttlMs": 70000,
    "observerReadsAfterParking": []
  },
  "native": {
    "children": 135,
    "terminalChildren": 135
  },
  "events": {
    "rawEvents": 17017,
    "embeddedRows": 8834,
    "sha256": "612523e29ac30c16a98319fc19206e81826482850e209ddd79eeb3389937745d",
    "contiguous": true
  },
  "fatal": null
}
```

#### Item 1 source: pty_driver.py

Exact source SHA256: `7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831`

Exact fenced bytes are archived as `review/01-item-1-source-pty-driver-py.py`; the manifest below gives the byte count and reproduced SHA256. Language: `python`.

#### Item 1 source: probe.js

Exact source SHA256: `434ba1148f100ac5f927164dc45d067f23e918cfdcaedd215141842c171310bf`

Exact fenced bytes are archived as `review/02-item-1-source-probe-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 1 source: inspect.ts

Exact source SHA256: `7d2f2adb7fd3fd7fa188ac7ed40779216c007fc662c2c35ef73e3c42246d44f1`

Exact fenced bytes are archived as `review/03-item-1-source-inspect-ts.ts`; the manifest below gives the byte count and reproduced SHA256. Language: `typescript`.

#### Item 1 source: common.js

Exact source SHA256: `0b25ff30e4d800b3ef12cabbb8ee38404a637784e6105b772e635b3ad1125a88`

Exact fenced bytes are archived as `review/04-item-1-source-common-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 1 source: item1.js

Exact source SHA256: `1cf095c387a519b1808db8ed5c9053d23c53834a90abfb0c67edb28811b13f8a`

Exact fenced bytes are archived as `review/05-item-1-source-item1-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 1 final-lifetime receipt assembly

The driver first saved the observation-window receipt, then stopped its TUI. This assembler includes **every event through completed TUI shutdown**, adds the shutdown tail, and replaces run-local timestamp/UUID directory components by `<session-id>`. Nothing is removed except that documented path normalization. Native transcript filenames identify their native child; tombstone checks retain their `.tombstone` suffix. This is the complete accepted-run receipt. Synchronous `seq` orders both observer and native events; `seq/through/count` expands identical consecutive fields losslessly. Authorization means actual `grants.allows` plus a live signal succeeded. No ordering relies on time.

Invocation: `env GC2_REPO=$PWD bun run <tmp>/assemble-item1.js`. Exact source SHA256: `ca70ed456ea75bf79c4fcfcd11779895f532a3db38314fb2ecd43d888d09a19e`

Exact assembler source bytes are archived as `review/assembly-item1.js`; its advertised SHA256 above is reproduced in the manifest.

Final lifetime audit (asserted): {"events":17017,"transcriptReads":65,"headerReads":64,"unauthorizedReads":0,"rejectedReads":0,"parkingSeq":14419,"postParkReads":0,"contiguous":true}

#### Item 1 complete normalized monotonic event receipt

Exact embedded receipt SHA256 (UTF-8 including final LF): `3009878f95199c912747e515435695c01d4fcc00a0c9bf357f0c753d0dcd134e`

Exact fenced bytes are archived as `review/06-item-1-complete-normalized-monotonic-event-receipt.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.
### Item 2 setup attempt — not accepted

Invocation: `env GC2_REPO=$PWD bun run <tmp>/item2.js` from `$PWD`.

Results:

```json
{
  "fatal": "AssertionError [ERR_ASSERTION]: healthy native transcript exceeds two bounded pages"
}
```

#### Item 2 source: item2.js

Exact source SHA256: `3aed6ec3b668824c3d61337af7856368990342ed3c1796071bf7239bfc83b21d`

Exact fenced bytes are archived as `review/07-item-2-source-item2-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 2 complete normalized driver output

Exact embedded JSONL SHA256 (including final LF): `f35c5b5a9d8448fc01e55b2397a069fafbcacfb7590a7de50bd776ee41c5166c`

Exact fenced bytes are archived as `review/08-item-2-complete-normalized-driver-output.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.

No HTTP page or grant was reached. The throwaway driver's early native-transcript selection failed its own size assertion; no stalled-reader product result is claimed. The complete source and normalized command output are retained. The disposable profile and watch were removed.
### Item 2 second setup attempt — not accepted

Invocation: `env GC2_REPO=$PWD bun run <tmp>/item2.js` from `$PWD`.

Results:

```json
{
  "fatal": "Error: Timed out: two native transcripts exceed two pages"
}
```

#### Item 2 source: item2.js

Exact source SHA256: `b53074e7f5eded1d17db828389720cdeebe4940ae4bc8eb31af36b25ac577d5f`

Exact fenced bytes are archived as `review/09-item-2-source-item2-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 2 complete normalized driver output

Exact embedded JSONL SHA256 (including final LF): `2ce178ce3c4a31aae8d429513a4e0ccc06f4c2a482c71d524a614aa153519c3c`

Exact fenced bytes are archived as `review/10-item-2-complete-normalized-driver-output.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.

This run did not complete the content-continuation proof. Its exact failure, source and normalized output are retained; no passing reader criterion is claimed.
### Item 2 — growing-transcript continuation proof

Invocation: `env GC2_REPO=$PWD bun run <tmp>/item2.js` from `$PWD`.

Results:

```json
{
  "result": "PASS",
  "stalledChild": "agent-2",
  "healthyChild": "agent-1",
  "transcriptBytes": 329853,
  "healthyPages": [
    {
      "index": 0,
      "requestToken": null,
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMSIsImVwb2NoIjoiZmQxMzAyZmUtNGI2My00MTU3LWFmNmUtOGUyYjE0NWRhODZkIiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtazFVSUNPL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLWsxVUlDTy13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTI5LTUxLTI5MlpfMDFhMGY2NWUtOWViYy03MTNiLWE5MjMtZmQyMzVhZjM4MWFlL2FnZW50LTEuanNvbmwiLCJpbm9kZSI6IjIwOTU1NzMiLCJzaXplIjozMjk4NTMsImN1cnNvciI6MjI1OTMzLCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoyMjU2MjMsImVuZCI6MjI1OTMzLCJzaGEyNTYiOiJmZGFhMTJiYjkwMzBmZmUzMmZlZWZiNjljMjMzMGUwYzgwOGM3Njc2ZTU1NDJiYWEzMmFjMjM3MzVjMDI5ZjM3In0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 12,
      "from": 0,
      "to": 225933,
      "transcriptSize": 329853,
      "atEnd": false,
      "reset": false,
      "ms": 8,
      "entriesSha256": "d14d8561fbd205dcf7305d696d09ae275af516a4c6e5e94feade1752ca885520"
    },
    {
      "index": 1,
      "requestToken": "eyJjaGlsZElkIjoiYWdlbnQtMSIsImVwb2NoIjoiZmQxMzAyZmUtNGI2My00MTU3LWFmNmUtOGUyYjE0NWRhODZkIiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtazFVSUNPL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLWsxVUlDTy13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTI5LTUxLTI5MlpfMDFhMGY2NWUtOWViYy03MTNiLWE5MjMtZmQyMzVhZjM4MWFlL2FnZW50LTEuanNvbmwiLCJpbm9kZSI6IjIwOTU1NzMiLCJzaXplIjozMjk4NTMsImN1cnNvciI6MjI1OTMzLCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoyMjU2MjMsImVuZCI6MjI1OTMzLCJzaGEyNTYiOiJmZGFhMTJiYjkwMzBmZmUzMmZlZWZiNjljMjMzMGUwYzgwOGM3Njc2ZTU1NDJiYWEzMmFjMjM3MzVjMDI5ZjM3In0sInNjYW5TdGFydCI6bnVsbH0",
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMSIsImVwb2NoIjoiZmQxMzAyZmUtNGI2My00MTU3LWFmNmUtOGUyYjE0NWRhODZkIiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtazFVSUNPL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLWsxVUlDTy13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTI5LTUxLTI5MlpfMDFhMGY2NWUtOWViYy03MTNiLWE5MjMtZmQyMzVhZjM4MWFlL2FnZW50LTEuanNvbmwiLCJpbm9kZSI6IjIwOTU1NzMiLCJzaXplIjo0MzQ5MTUsImN1cnNvciI6NDM0OTE1LCJsYXN0UmVjb3JkIjp7InN0YXJ0IjozMzA5OTUsImVuZCI6NDM0OTE1LCJzaGEyNTYiOiJhMGM3ZjFmMWU1YjNmNGUxNjNkNjQ5NTE3Nzg4ZWYwZWU4MWU1MGU2MTllNzA3MzMwNjlmODlhNmU2M2Y2MzE5In0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 4,
      "from": 225933,
      "to": 434915,
      "transcriptSize": 434915,
      "atEnd": true,
      "reset": false,
      "ms": 12,
      "entriesSha256": "0980ae34d838b6632588d56b2762be8affc93f02dc98dfae57670dd303fff6a1"
    }
  ],
  "heldSeq": 300,
  "nativeCompletionDuringStallSeq": 311,
  "releasedSeq": 529,
  "stalledMs": 671,
  "healthyMaxMs": 12,
  "nativeCompleted": 135,
  "configuredLongChildTurnDelayMs": 800,
  "longChildTurns": 10,
  "unchangedNativeChildren": 133,
  "stubRequests": 312,
  "secretSeenTrue": 0,
  "fatal": null
}
```

#### Item 2 source: item2.js

Exact source SHA256: `438039f7ba51d51b62af98c67eaf81ceb21f251693f9e1d50161befff852d2c5`

Exact fenced bytes are archived as `review/11-item-2-source-item2-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 2 complete normalized driver output

Exact embedded JSONL SHA256 (including final LF): `9cb810a3adf968352cc6c26c76a68273dc0c822cfb7abee4268f5968b19bcdbc`

Exact fenced bytes are archived as `review/12-item-2-complete-normalized-driver-output.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.

The exact driver generates a temporary many-135 scenario in which two native children read nine real text files, then yield; the other 133 children retain the stock scenario and 1500 ms stub delay. The temporary inputs are ordinary files in the harness workspace. Official omp persists the native read tool results, making the admitted transcripts longer than a page; the driver never writes native transcript bytes. A stalls at its observer file-handle read while B returns all actual content pages to EOF, including non-empty advancing non-EOF content before the final page. Every request/response token, entry count and decoded cursor is recorded. Page tokens are not credentials; they contain opaque encoded run-local profile/epoch/inode values. This is scoped continuation proof, not a new absolute performance budget; the original native-pace baseline remains unchanged.

The healthy file was still growing: its two response boundaries were 329853 and 434915 bytes. EOF here means the complete records available at that response, not the child's eventual final transcript. A final completed-transcript run follows so the evidence also covers paging to a stable final EOF.
### Item 2 — completed-transcript paging under a stalled reader — PASS

Invocation: `env GC2_REPO=$PWD bun run <tmp>/item2.js` from `$PWD`.

Results:

```json
{
  "result": "PASS",
  "stalledChild": "agent-1",
  "healthyChild": "agent-2",
  "transcriptBytes": 960108,
  "finalStableEof": true,
  "healthyPages": [
    {
      "index": 0,
      "requestToken": null,
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6MjI1NzgzLCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoyMjU0NzMsImVuZCI6MjI1NzgzLCJzaGEyNTYiOiI1MDc2MGY0MmYzYmE2ZTk3ZjhhZWUxMzJhOTFhOTEzMmU4ZGNhZjQ0OTA3ZGVkNTgwMmNlZWUwNWNkMWQ3ZjQ0In0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 12,
      "from": 0,
      "to": 225783,
      "transcriptSize": 960108,
      "atEnd": false,
      "reset": false,
      "ms": 9,
      "entriesSha256": "656c8e9a8c5f0e2efe4cceb40ee38501c0eca169b694e4f71f41a0a794b54b42"
    },
    {
      "index": 1,
      "requestToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6MjI1NzgzLCJsYXN0UmVjb3JkIjp7InN0YXJ0IjoyMjU0NzMsImVuZCI6MjI1NzgzLCJzaGEyNTYiOiI1MDc2MGY0MmYzYmE2ZTk3ZjhhZWUxMzJhOTFhOTEzMmU4ZGNhZjQ0OTA3ZGVkNTgwMmNlZWUwNWNkMWQ3ZjQ0In0sInNjYW5TdGFydCI6bnVsbH0",
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6NDM1OTIxLCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo0MzU2MTEsImVuZCI6NDM1OTIxLCJzaGEyNTYiOiIxMTVmNGY0MDg1NjQ4YTExY2Y4YzY3N2JjMzU5NDU2YWZiNzVkYjU3NDBkODJlYzBmY2YzZTIzZmU4ZmRhNzFkIn0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 6,
      "from": 225783,
      "to": 435921,
      "transcriptSize": 960108,
      "atEnd": false,
      "reset": false,
      "ms": 15,
      "entriesSha256": "8c9b1cc9797f46a534dfa42df5a1be5d674a9b77a6e14f313a6daf1f18e071e3"
    },
    {
      "index": 2,
      "requestToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6NDM1OTIxLCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo0MzU2MTEsImVuZCI6NDM1OTIxLCJzaGEyNTYiOiIxMTVmNGY0MDg1NjQ4YTExY2Y4YzY3N2JjMzU5NDU2YWZiNzVkYjU3NDBkODJlYzBmY2YzZTIzZmU4ZmRhNzFkIn0sInNjYW5TdGFydCI6bnVsbH0",
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6NjQ2MDQ3LCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo2NDU3MzcsImVuZCI6NjQ2MDQ3LCJzaGEyNTYiOiI1NGE2M2Y2YWZmYmY5YzViMTFkYmU2ZWNmZTBjYWFkMzEzN2I5OGNlYWI3ZGRjODJhZmI4MDE1OWVlYTQ4YjJkIn0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 6,
      "from": 435921,
      "to": 646047,
      "transcriptSize": 960108,
      "atEnd": false,
      "reset": false,
      "ms": 15,
      "entriesSha256": "a5e2810782494cf92c14870902c7f7114675a89402459778312ed035d2355046"
    },
    {
      "index": 3,
      "requestToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6NjQ2MDQ3LCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo2NDU3MzcsImVuZCI6NjQ2MDQ3LCJzaGEyNTYiOiI1NGE2M2Y2YWZmYmY5YzViMTFkYmU2ZWNmZTBjYWFkMzEzN2I5OGNlYWI3ZGRjODJhZmI4MDE1OWVlYTQ4YjJkIn0sInNjYW5TdGFydCI6bnVsbH0",
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6ODU2MTg2LCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo4NTU4NzYsImVuZCI6ODU2MTg2LCJzaGEyNTYiOiI3YjFhODVlNjQzYWM2ZjkzZDk1MmZhNWVkOWRhZWI2OWRiOTgyNmI5NTQwNDY4MzUyOGMzOGVmMjRkMDA0YTk2In0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 6,
      "from": 646047,
      "to": 856186,
      "transcriptSize": 960108,
      "atEnd": false,
      "reset": false,
      "ms": 10,
      "entriesSha256": "766b10c24d6beb5831a031007a69b8c5e2d29639ca73a22ffdab0052d5ae20e9"
    },
    {
      "index": 4,
      "requestToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6ODU2MTg2LCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo4NTU4NzYsImVuZCI6ODU2MTg2LCJzaGEyNTYiOiI3YjFhODVlNjQzYWM2ZjkzZDk1MmZhNWVkOWRhZWI2OWRiOTgyNmI5NTQwNDY4MzUyOGMzOGVmMjRkMDA0YTk2In0sInNjYW5TdGFydCI6bnVsbH0",
      "responseToken": "eyJjaGlsZElkIjoiYWdlbnQtMiIsImVwb2NoIjoiMGExZTc1YjAtMjdiNy00MzE3LWE4YjctMWQ4ZjhmMmFlYWY1Iiwic2Vzc2lvbkZpbGUiOiIvdG1wL29tcC1vcmNhLWhhcm5lc3MtREN2am5iL2hvbWUvLm9tcC9wcm9maWxlcy9tYW55LTEzNS9hZ2VudC9zZXNzaW9ucy8tLXRtcC1vbXAtb3JjYS1oYXJuZXNzLURDdmpuYi13b3Jrc3BhY2UtLS8yMDI2LTEwLTAxVDA3LTMyLTI1LTA3NVpfMDFhMGY2NjAtZjc3My03NTk1LTk4MTktNGU3OTMwYTliNDFjL2FnZW50LTIuanNvbmwiLCJpbm9kZSI6IjIwOTU0ODQiLCJzaXplIjo5NjAxMDgsImN1cnNvciI6OTYwMTA4LCJsYXN0UmVjb3JkIjp7InN0YXJ0Ijo4NTYxODYsImVuZCI6OTYwMTA4LCJzaGEyNTYiOiJhYThkOGZiNjkyMjczNjRlOThlZjI3OGU3ZTBiZDIyN2NiMDk1MWQ4OGZhZmMwNGZlZTkyMGE5ZjZhZjM3ZjJkIn0sInNjYW5TdGFydCI6bnVsbH0",
      "entries": 1,
      "from": 856186,
      "to": 960108,
      "transcriptSize": 960108,
      "atEnd": true,
      "reset": false,
      "ms": 8,
      "entriesSha256": "1b3f74b076fdc7e32c0051adc84d18e74bd26af6ba92671b8398bc1cd521589c"
    }
  ],
  "heldSeq": 2341,
  "nativeCompletionDuringStallSeq": 2352,
  "releasedSeq": 4346,
  "stalledMs": 2514,
  "healthyMaxMs": 15,
  "nativeCompleted": 135,
  "configuredLongChildTurnDelayMs": 800,
  "longChildTurns": 10,
  "unchangedNativeChildren": 133,
  "stubRequests": 309,
  "secretSeenTrue": 0,
  "fatal": null
}
```

#### Item 2 source: item2.js

Exact source SHA256: `a6ce2e151768cc76440d47d3911361132392db02a9e6ed67b4706073f6ee5e27`

Exact fenced bytes are archived as `review/13-item-2-source-item2-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 2 complete normalized driver output

Exact embedded JSONL SHA256 (including final LF): `acf5f0ec6c71a30653001d4fc33b248732343075b49f8e9d489c2bcc11d04da6`

Exact fenced bytes are archived as `review/14-item-2-complete-normalized-driver-output.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.

The exact driver generates a temporary many-135 scenario in which two native children read nine real text files, then yield; the other 133 children retain the stock scenario and 1500 ms stub delay. The temporary inputs are ordinary files in the harness workspace. Official omp persists the native read tool results, making the admitted transcripts longer than a page; the driver never writes native transcript bytes. A stalls at its observer file-handle read while B returns all actual content pages to EOF, including non-empty advancing non-EOF content before the final page. Every request/response token, entry count and decoded cursor is recorded. Page tokens are not credentials; they contain opaque encoded run-local profile/epoch/inode values. This is scoped continuation proof, not a new absolute performance budget; the original native-pace baseline remains unchanged.
### Item 3 — every main request, matched TUI comparison — FAIL

Invocation: `env GC2_REPO=$PWD bun run <tmp>/item3.js` from `$PWD`.

Results:

```json
{
  "result": "FAIL",
  "sameTypedSequence": [
    "HARNESS_AGENT=main",
    "HARNESS_AGENT=main matched follow-up"
  ],
  "sameProfileWorkspaceSettings": true,
  "absentMainRequests": 8,
  "presentMainRequests": 8,
  "paragraphBytes": 301,
  "guidanceWireReceipt": {
    "index": 0,
    "role": "user",
    "byteLength": 354,
    "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
  },
  "guidanceCounts": [
    1,
    1,
    1,
    1,
    1,
    1,
    1,
    1
  ],
  "differences": [
    {
      "request": 2,
      "message": 5,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2821,
      "presentByteLength": 2829,
      "absentSha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463",
      "presentSha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-re",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-r"
    },
    {
      "request": 3,
      "message": 5,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2821,
      "presentByteLength": 2829,
      "absentSha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463",
      "presentSha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-re",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-r"
    },
    {
      "request": 3,
      "message": 6,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2863,
      "presentByteLength": 2863,
      "absentSha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378",
      "presentSha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-10 (agent-10) ──\\n<task-result id=\\\"agent-10\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-13 (agent-13) ──\\n<task-result id=\\\"agent-13\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 4,
      "message": 5,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2821,
      "presentByteLength": 2829,
      "absentSha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463",
      "presentSha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-re",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-r"
    },
    {
      "request": 4,
      "message": 6,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2863,
      "presentByteLength": 2863,
      "absentSha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378",
      "presentSha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-10 (agent-10) ──\\n<task-result id=\\\"agent-10\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-13 (agent-13) ──\\n<task-result id=\\\"agent-13\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 4,
      "message": 7,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3",
      "presentSha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-19 (agent-19) ──\\n<task-result id=\\\"agent-19\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-20 (agent-20) ──\\n<task-result id=\\\"agent-20\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 5,
      "message": 5,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2821,
      "presentByteLength": 2829,
      "absentSha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463",
      "presentSha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-re",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-r"
    },
    {
      "request": 5,
      "message": 6,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2863,
      "presentByteLength": 2863,
      "absentSha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378",
      "presentSha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-10 (agent-10) ──\\n<task-result id=\\\"agent-10\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-13 (agent-13) ──\\n<task-result id=\\\"agent-13\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 5,
      "message": 7,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3",
      "presentSha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-19 (agent-19) ──\\n<task-result id=\\\"agent-19\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-20 (agent-20) ──\\n<task-result id=\\\"agent-20\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 5,
      "message": 8,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "c8c04a52a5582e4b909a9951f2ab13f5d8bf98ce1a63076d58792204aaced38e",
      "presentSha256": "1cbcbd087a343ce25d5c3d948702caea2808652c231c960cb3796d6789afa516",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-29 (agent-29) ──\\n<task-result id=\\\"agent-29\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-30 (agent-30) ──\\n<task-result id=\\\"agent-30\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 6,
      "message": 5,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2821,
      "presentByteLength": 2829,
      "absentSha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463",
      "presentSha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-re",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-r"
    },
    {
      "request": 6,
      "message": 6,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2863,
      "presentByteLength": 2863,
      "absentSha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378",
      "presentSha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-10 (agent-10) ──\\n<task-result id=\\\"agent-10\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-13 (agent-13) ──\\n<task-result id=\\\"agent-13\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 6,
      "message": 7,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3",
      "presentSha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-19 (agent-19) ──\\n<task-result id=\\\"agent-19\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-20 (agent-20) ──\\n<task-result id=\\\"agent-20\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 6,
      "message": 8,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "c8c04a52a5582e4b909a9951f2ab13f5d8bf98ce1a63076d58792204aaced38e",
      "presentSha256": "1cbcbd087a343ce25d5c3d948702caea2808652c231c960cb3796d6789afa516",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-29 (agent-29) ──\\n<task-result id=\\\"agent-29\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-30 (agent-30) ──\\n<task-result id=\\\"agent-30\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 7,
      "message": 5,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2821,
      "presentByteLength": 2829,
      "absentSha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463",
      "presentSha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-re",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-r"
    },
    {
      "request": 7,
      "message": 6,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2863,
      "presentByteLength": 2863,
      "absentSha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378",
      "presentSha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-10 (agent-10) ──\\n<task-result id=\\\"agent-10\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-13 (agent-13) ──\\n<task-result id=\\\"agent-13\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 7,
      "message": 7,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3",
      "presentSha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-19 (agent-19) ──\\n<task-result id=\\\"agent-19\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-20 (agent-20) ──\\n<task-result id=\\\"agent-20\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    },
    {
      "request": 7,
      "message": 8,
      "roleAbsent": "user",
      "rolePresent": "user",
      "absentByteLength": 2869,
      "presentByteLength": 2869,
      "absentSha256": "c8c04a52a5582e4b909a9951f2ab13f5d8bf98ce1a63076d58792204aaced38e",
      "presentSha256": "1cbcbd087a343ce25d5c3d948702caea2808652c231c960cb3796d6789afa516",
      "absentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-29 (agent-29) ──\\n<task-result id=\\\"agent-29\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task",
      "presentExcerpt": "{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-30 (agent-30) ──\\n<task-result id=\\\"agent-30\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task"
    }
  ],
  "runs": [
    {
      "observer": false,
      "mainRequests": 8,
      "allProviderRequests": 75,
      "rawCaptureSha256": "669767bd9226bbd65c63204f6eb39484ac5cdf6383482a6cacf4ed6281b8a497",
      "stubSecretSeenTrue": 0,
      "requests": [
        {
          "index": 0,
          "typedInputCount": 1,
          "status": 200,
          "source": {
            "kind": "typed input 1",
            "role": "user",
            "toolCallId": null,
            "byteLength": 226,
            "sha256": "6c3d53875885c06ba1ef10b04e0ac069ced63515a2335c42f2f3c7366df15a3b",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-reminder>\\nToday: 2026-10-01; current working directory: '<profile-1>/workspace'. Do not repeat this information in your reply.\\n</system-reminder>\"},{\"type\":\"text\",\"text\":\"HARNESS_AGENT=main\"}]"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            }
          ]
        },
        {
          "index": 1,
          "typedInputCount": 1,
          "status": 200,
          "source": {
            "kind": "native tool-result continuation",
            "role": "tool",
            "toolCallId": "chatcmpl-many-33-main-0-call-0",
            "byteLength": 2142,
            "sha256": "b715c4389ade26669b84f5ad071761586e23b93b9abef0fc49bd1fb8e9ccf6a1",
            "excerpt": "\"Spawned 33 background agents using task.\\n- `agent-1` (job `agent-1`)\\n- `agent-2` (job `agent-2`)\\n- `agent-3` (job `agent-3`)\\n- `agent-4` (job `agent-4`)\\n- `agent-5` (job `agent-5`)\\n- `agent-6` (job `agent-6`)\\n- `agent-7` (job `agent-7`)\\n- `agent-8` (job `agent-8`)\\n- `agent-9` (job `agent-9`)\\n- `agent-10` (job `agent-10`)\\n- `agent-11` (job `agent-11`)\\n- `agent-12` (job `agent-12`)\\n- `agent-13` (job `agent-13`)\\n- `agent-14` (job `agent-14`)\\n- `agent-15` (job `agent-15`)\\n- `agent-16` (job `agent-16`)\\n- `agent-17` (job `agent-17`)\\n- `agent-18` (job `agent-18`)\\n- `agent-19` (job"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            }
          ]
        },
        {
          "index": 2,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2795,
            "sha256": "3d2dc27108ee7c44a9fc8a2e15847e6bc71e6b0ea045aef42c65717689c38b89",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-2 (agent-2) ──\\n<task-result id=\\\"agent-2\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-2 is now idle — message it via `write agent://agent-2` to follow up; transcript at history://agent-2\\n── Job agent-7 (agent-7) ──\\n<task-result id=\\\"agent-7\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 4,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 5,
              "role": "user",
              "byteLength": 2821,
              "sha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463"
            }
          ]
        },
        {
          "index": 3,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2837,
            "sha256": "680166377c79d0db2141dc22dc501d5edd012bff9cb93a317b6dcbac949199d8",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-10 (agent-10) ──\\n<task-result id=\\\"agent-10\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-10 is now idle — message it via `write agent://agent-10` to follow up; transcript at history://agent-10\\n── Job agent-11 (agent-11) ──\\n<task-result id=\\\"agent-11\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.3s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 4,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 5,
              "role": "user",
              "byteLength": 2821,
              "sha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2863,
              "sha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378"
            }
          ]
        },
        {
          "index": 4,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2843,
            "sha256": "36ab44cac7062a9e762125531324ace33b39d94485d7319351029840adf964fe",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-19 (agent-19) ──\\n<task-result id=\\\"agent-19\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-19 is now idle — message it via `write agent://agent-19` to follow up; transcript at history://agent-19\\n── Job agent-20 (agent-20) ──\\n<task-result id=\\\"agent-20\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 4,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 5,
              "role": "user",
              "byteLength": 2821,
              "sha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2863,
              "sha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3"
            }
          ]
        },
        {
          "index": 5,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2843,
            "sha256": "bbe5d7a2003e7a4541dfc47111d3e92de9ab4c07ad3ee1c33895f1f79b62481f",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-29 (agent-29) ──\\n<task-result id=\\\"agent-29\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-29 is now idle — message it via `write agent://agent-29` to follow up; transcript at history://agent-29\\n── Job agent-30 (agent-30) ──\\n<task-result id=\\\"agent-30\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 4,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 5,
              "role": "user",
              "byteLength": 2821,
              "sha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2863,
              "sha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "c8c04a52a5582e4b909a9951f2ab13f5d8bf98ce1a63076d58792204aaced38e"
            }
          ]
        },
        {
          "index": 6,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 440,
            "sha256": "071a4acbb64b58206e4ad50abbb6256c6949ff1cf55373955362dcb52113776e",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\nBackground job agent-33 has completed. Resume your work using the result below.\\n<task-result id=\\\"agent-33\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.1s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-33 is now idle — message it via `write agent://agent-33` to follow up; transcript at history://agent-33\\n</system-notice>\"}]"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 4,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 5,
              "role": "user",
              "byteLength": 2821,
              "sha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2863,
              "sha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "c8c04a52a5582e4b909a9951f2ab13f5d8bf98ce1a63076d58792204aaced38e"
            },
            {
              "index": 9,
              "role": "user",
              "byteLength": 466,
              "sha256": "144bc8aadca6de8ebdf0ab81b56595f98d954c1ac5b27224bf1309991f106c0c"
            }
          ]
        },
        {
          "index": 7,
          "typedInputCount": 2,
          "status": 409,
          "source": {
            "kind": "typed input 2",
            "role": "user",
            "toolCallId": null,
            "byteLength": 63,
            "sha256": "0ed21ec3591f58ebbd87c4c9a88f6c458064f564501531f65bd2081690e903d8",
            "excerpt": "[{\"type\":\"text\",\"text\":\"HARNESS_AGENT=main matched follow-up\"}]"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 3,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 4,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 5,
              "role": "user",
              "byteLength": 2821,
              "sha256": "7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2863,
              "sha256": "5d806158b99a0e6578aad6d0ae8e4ecad4e58f6c7e53eeaae44f988c4e4d1378"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1ed9bf83d36522aa19b48739418fe05b9396f4b1005617cd80d2c08053e4def3"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "c8c04a52a5582e4b909a9951f2ab13f5d8bf98ce1a63076d58792204aaced38e"
            },
            {
              "index": 9,
              "role": "user",
              "byteLength": 466,
              "sha256": "144bc8aadca6de8ebdf0ab81b56595f98d954c1ac5b27224bf1309991f106c0c"
            },
            {
              "index": 10,
              "role": "user",
              "byteLength": 89,
              "sha256": "afa5c26ce5af8c6c6ae0f4d309b1117fb150f2827d656773e573b61880e31ef6"
            }
          ]
        }
      ]
    },
    {
      "observer": true,
      "mainRequests": 8,
      "allProviderRequests": 75,
      "rawCaptureSha256": "16e5698495959e9899c36bd307cc6fb8cfb2a9358728dbdf878a3cda846b9843",
      "stubSecretSeenTrue": 0,
      "requests": [
        {
          "index": 0,
          "typedInputCount": 1,
          "status": 200,
          "source": {
            "kind": "typed input 1",
            "role": "user",
            "toolCallId": null,
            "byteLength": 226,
            "sha256": "6c3d53875885c06ba1ef10b04e0ac069ced63515a2335c42f2f3c7366df15a3b",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-reminder>\\nToday: 2026-10-01; current working directory: '<profile-1>/workspace'. Do not repeat this information in your reply.\\n</system-reminder>\"},{\"type\":\"text\",\"text\":\"HARNESS_AGENT=main\"}]"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            }
          ]
        },
        {
          "index": 1,
          "typedInputCount": 1,
          "status": 200,
          "source": {
            "kind": "native tool-result continuation",
            "role": "tool",
            "toolCallId": "chatcmpl-many-33-main-0-call-0",
            "byteLength": 2142,
            "sha256": "b715c4389ade26669b84f5ad071761586e23b93b9abef0fc49bd1fb8e9ccf6a1",
            "excerpt": "\"Spawned 33 background agents using task.\\n- `agent-1` (job `agent-1`)\\n- `agent-2` (job `agent-2`)\\n- `agent-3` (job `agent-3`)\\n- `agent-4` (job `agent-4`)\\n- `agent-5` (job `agent-5`)\\n- `agent-6` (job `agent-6`)\\n- `agent-7` (job `agent-7`)\\n- `agent-8` (job `agent-8`)\\n- `agent-9` (job `agent-9`)\\n- `agent-10` (job `agent-10`)\\n- `agent-11` (job `agent-11`)\\n- `agent-12` (job `agent-12`)\\n- `agent-13` (job `agent-13`)\\n- `agent-14` (job `agent-14`)\\n- `agent-15` (job `agent-15`)\\n- `agent-16` (job `agent-16`)\\n- `agent-17` (job `agent-17`)\\n- `agent-18` (job `agent-18`)\\n- `agent-19` (job"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            }
          ]
        },
        {
          "index": 2,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2803,
            "sha256": "7c1327d523f3a7d43c2855dae2820af32f15257bd4ab43740ca48af2851ad381",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-8 (agent-8) ──\\n<task-result id=\\\"agent-8\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"824ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-8 is now idle — message it via `write agent://agent-8` to follow up; transcript at history://agent-8\\n── Job agent-5 (agent-5) ──\\n<task-result id=\\\"agent-5\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"826ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 5,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2829,
              "sha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780"
            }
          ]
        },
        {
          "index": 3,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2837,
            "sha256": "c545f5c808a89cdf9453c2e5e5b420e7cebcc37bbe0a5b407c5bc07ac86c5f6a",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-13 (agent-13) ──\\n<task-result id=\\\"agent-13\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-13 is now idle — message it via `write agent://agent-13` to follow up; transcript at history://agent-13\\n── Job agent-16 (agent-16) ──\\n<task-result id=\\\"agent-16\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 5,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2829,
              "sha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2863,
              "sha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9"
            }
          ]
        },
        {
          "index": 4,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2843,
            "sha256": "6f81959b3339fc9068201b4fb63882384591bc86237242adb2fcd4b51c5def09",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-20 (agent-20) ──\\n<task-result id=\\\"agent-20\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-20 is now idle — message it via `write agent://agent-20` to follow up; transcript at history://agent-20\\n── Job agent-22 (agent-22) ──\\n<task-result id=\\\"agent-22\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 5,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2829,
              "sha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2863,
              "sha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d"
            }
          ]
        },
        {
          "index": 5,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 2843,
            "sha256": "6588a7e9cb3c383eecb9c3a3dea6500b5c534a82a7ab10dd3f9356a2e296d9c2",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\n8 background jobs have completed. Resume your work using the results below.\\n\\n── Job agent-30 (agent-30) ──\\n<task-result id=\\\"agent-30\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-30 is now idle — message it via `write agent://agent-30` to follow up; transcript at history://agent-30\\n── Job agent-26 (agent-26) ──\\n<task-result id=\\\"agent-26\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.2s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 5,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2829,
              "sha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2863,
              "sha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d"
            },
            {
              "index": 9,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1cbcbd087a343ce25d5c3d948702caea2808652c231c960cb3796d6789afa516"
            }
          ]
        },
        {
          "index": 6,
          "typedInputCount": 1,
          "status": 409,
          "source": {
            "kind": "native follow-up message",
            "role": "user",
            "toolCallId": null,
            "byteLength": 440,
            "sha256": "071a4acbb64b58206e4ad50abbb6256c6949ff1cf55373955362dcb52113776e",
            "excerpt": "[{\"type\":\"text\",\"text\":\"<system-notice>\\nBackground job agent-33 has completed. Resume your work using the result below.\\n<task-result id=\\\"agent-33\\\" agent=\\\"task\\\" status=\\\"completed\\\" duration=\\\"1.1s\\\">\\n<meta lines=\\\"1\\\" size=\\\"23B\\\" />\\n<output>\\n\\\"fanout child complete\\\"\\n</output>\\n</task-result>\\n\\nagent-33 is now idle — message it via `write agent://agent-33` to follow up; transcript at history://agent-33\\n</system-notice>\"}]"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 5,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2829,
              "sha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2863,
              "sha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d"
            },
            {
              "index": 9,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1cbcbd087a343ce25d5c3d948702caea2808652c231c960cb3796d6789afa516"
            },
            {
              "index": 10,
              "role": "user",
              "byteLength": 466,
              "sha256": "144bc8aadca6de8ebdf0ab81b56595f98d954c1ac5b27224bf1309991f106c0c"
            }
          ]
        },
        {
          "index": 7,
          "typedInputCount": 2,
          "status": 409,
          "source": {
            "kind": "typed input 2",
            "role": "user",
            "toolCallId": null,
            "byteLength": 63,
            "sha256": "0ed21ec3591f58ebbd87c4c9a88f6c458064f564501531f65bd2081690e903d8",
            "excerpt": "[{\"type\":\"text\",\"text\":\"HARNESS_AGENT=main matched follow-up\"}]"
          },
          "messages": [
            {
              "index": 0,
              "role": "system",
              "byteLength": 11105,
              "sha256": "49245eb817acbe13f967cf25a7fdbc91ae2d51ab586014def79b1ee41708fe97"
            },
            {
              "index": 1,
              "role": "user",
              "byteLength": 252,
              "sha256": "841ab005a39586be126956b19eba878ad8a9ee36f4c421422ae3eb436f604da0"
            },
            {
              "index": 2,
              "role": "user",
              "byteLength": 354,
              "sha256": "47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"
            },
            {
              "index": 3,
              "role": "assistant",
              "byteLength": 6146,
              "sha256": "8c8f67c16558860ceccfb481653c9b820ace346b8623f3c25883ac1e4bb228a9"
            },
            {
              "index": 4,
              "role": "tool",
              "byteLength": 2216,
              "sha256": "40beec7a3c506894197112fffcc63dd7f5cf5d2e7c3d3ecd07eb743194783807"
            },
            {
              "index": 5,
              "role": "assistant",
              "byteLength": 48,
              "sha256": "362f330220fff5fd93a207483a92c9d41e4d664e5af0e297ce69eefd13058cdc"
            },
            {
              "index": 6,
              "role": "user",
              "byteLength": 2829,
              "sha256": "7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780"
            },
            {
              "index": 7,
              "role": "user",
              "byteLength": 2863,
              "sha256": "20dc6c1130f89d4eeefafddd89fe6a7c589259f3625a7cab846708d03fbd7fe9"
            },
            {
              "index": 8,
              "role": "user",
              "byteLength": 2869,
              "sha256": "e51ca2b01ffe1f67b2fc1350164b129c82efafa79a5fb865ce75414f0493f86d"
            },
            {
              "index": 9,
              "role": "user",
              "byteLength": 2869,
              "sha256": "1cbcbd087a343ce25d5c3d948702caea2808652c231c960cb3796d6789afa516"
            },
            {
              "index": 10,
              "role": "user",
              "byteLength": 466,
              "sha256": "144bc8aadca6de8ebdf0ab81b56595f98d954c1ac5b27224bf1309991f106c0c"
            },
            {
              "index": 11,
              "role": "user",
              "byteLength": 89,
              "sha256": "afa5c26ce5af8c6c6ae0f4d309b1117fb150f2827d656773e573b61880e31ef6"
            }
          ]
        }
      ]
    }
  ],
  "fatal": null
}
```

#### Item 3 source: item3.js

Exact source SHA256: `bdfad3d6b88d75fede4272d67b4519b054c63a7dfa97761d4f1710edf6267d4a`

Exact fenced bytes are archived as `review/15-item-3-source-item3-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 3 complete normalized driver output

Exact embedded JSONL SHA256 (including final LF): `c7988c41e0a56554cbe665896c9edf342fee1926a0529b865fc9402797986c09`

Exact fenced bytes are archived as `review/16-item-3-complete-normalized-driver-output.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.

Normalization is applied recursively to message string values only: disposable/profile and repository roots, omp-generated ISO/file timestamps, native UUIDs and clock times are replaced by the exact patterns in `normalizedValue`. Message roles, array order, semantic content, tool-result values, job statuses, tool-call ids, tool arguments, text envelopes and all remaining numbers are preserved. Digests and lengths use UTF-8 `JSON.stringify(normalizedValue(message))`. The proxy forwards the original unmodified request bytes to the stock watched stub; raw message bodies exist only in scratch and are removed after receipt assembly. Every main request is listed, including 409 responses from exhaustion of the finite stock scenario; no failed provider request is dropped. Both runs use the same disposable profile, workspace, settings, PTY, inspection extension and typed sequence. Observer absence is an actual plugin uninstall; presence is the temp package link. A FAIL is an observed mismatch under the documented normalization, not silently classified as observer-caused. No product change or normalization of semantic differences is made to force a pass.

Exact failing command: `env GC2_REPO=$PWD bun run <tmp>/item3.js`. The driver completed with exit 0; the literal guidance-only comparison failed:

```json
{"criterion":"v03.every-main-request-guidance-only","result":"FAIL","absentMainRequests":8,"presentMainRequests":8,"guidanceCounts":[1,1,1,1,1,1,1,1],"differenceCount":18}
```

All eight request ordinals are paired; there are no extra main requests. Requests 0 and 1 match after removal of the exact guidance message. The first additional mismatch is request 2, non-guidance message 5: absent `role=user`, 2821 bytes, SHA256 `7ede04fcb1753a72d6556d2a9522a2ca0e5002fa7acc2412e2dfa16a506d5463`; present `role=user`, 2829 bytes, SHA256 `7da5e32492e567c6dced84b1955d8d0937ea93eb75326533d000b1b0161fc780`. Both are native `<system-notice>` completion batches: the absent excerpt begins with `Job agent-2`, `duration="1.2s"`; the present excerpt begins with `Job agent-8`, `duration="824ms"`. All 18 differing request/message pairs, their lengths/digests and excerpts are retained above. Native completion ordering and durations were not erased to manufacture a pass. These observations do not establish that the observer caused the non-guidance differences; that attribution remains unverified.
### Item 1 exact source/output boundary correction

The first scratch assembler used an unanchored `indexOf` on a heading also present inside the embedded driver string, truncating the first embedded `item1.js` block and omitting that run's driver-output block. That malformed source rendering is superseded by the exact complete sources/output below, recovered from the original generated `item1.md` using a complete heading line and its last occurrence. The 17017-event normalized receipt already embedded above, SHA256 `3009878f95199c912747e515435695c01d4fcc00a0c9bf357f0c753d0dcd134e`, is unchanged and remains the proving event receipt. The previously advertised driver source digest applies to the complete bytes below, not the truncated rendering. No gate was re-run, and no observation changed.


#### Item 1 source: pty_driver.py

Exact source SHA256: `7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831`

Exact fenced bytes are archived as `review/17-item-1-source-pty-driver-py.py`; the manifest below gives the byte count and reproduced SHA256. Language: `python`.

#### Item 1 source: probe.js

Exact source SHA256: `434ba1148f100ac5f927164dc45d067f23e918cfdcaedd215141842c171310bf`

Exact fenced bytes are archived as `review/18-item-1-source-probe-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 1 source: inspect.ts

Exact source SHA256: `7d2f2adb7fd3fd7fa188ac7ed40779216c007fc662c2c35ef73e3c42246d44f1`

Exact fenced bytes are archived as `review/19-item-1-source-inspect-ts.ts`; the manifest below gives the byte count and reproduced SHA256. Language: `typescript`.

#### Item 1 source: common.js

Exact source SHA256: `0b25ff30e4d800b3ef12cabbb8ee38404a637784e6105b772e635b3ad1125a88`

Exact fenced bytes are archived as `review/20-item-1-source-common-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 1 source: item1.js

Exact source SHA256: `1cf095c387a519b1808db8ed5c9053d23c53834a90abfb0c67edb28811b13f8a`

Exact fenced bytes are archived as `review/21-item-1-source-item1-js.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

#### Item 1 complete normalized driver output

Exact embedded JSONL SHA256 (including final LF): `5e0f64d66fe186eb3a17a1e14afd99e040ae72d87dec174cf59a9c42c08a7254`

Exact fenced bytes are archived as `review/22-item-1-complete-normalized-driver-output.jsonl`; the manifest below gives the byte count and reproduced SHA256. Language: `jsonl`.

Recovery command: `bun run <tmp>/recover-item1.js`; exit 0. Exact recovery source SHA256: `7318654c6d1397b2b030d92da503c30884934c6c88fdff0a7cb2ef994191480a`

Exact fenced bytes are archived as `review/23-item-1-complete-normalized-driver-output.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

Observed recovery output:

```json
{"recoveredDriverRecords":41,"recoveredDriverStdoutSha256":"5e0f64d66fe186eb3a17a1e14afd99e040ae72d87dec174cf59a9c42c08a7254","originalAppendixSha256":"2e8fe1a3a39074d81bbb8be72b999a555657d92370e39e6ec35b192d564a3b00"}
```
### Complete normalized stdout receipts

The per-item driver-output blocks contain all gate records and cleanup records. Each driver then emitted its final appendix-assembly confirmation, which is reproduced below. For each run, the **complete normalized stdout** is the corresponding earlier JSONL block, including its final LF, followed by `JSON.stringify(finalStdoutLine)` and LF. These confirmations hash the generated temporary appendix before its heading/interpretation was edited and transferred; they are not hashes of the final evidence file. No output line is omitted. The last reconstruction is independently compared to the surviving exact `output.jsonl` bytes.

Invocation: `env GC2_REPO=$PWD bun run <tmp>/complete-stdout.js`; exit 0.

```json
[
  {
    "run": 1,
    "item": 1,
    "stdoutRecords": 42,
    "completeNormalizedStdoutSha256": "f7a388f02f642e6abc373806b94ff8b451e27641658ed07ba665ae53d11d95ba",
    "finalStdoutLine": {
      "receipt": "item1.md",
      "bytes": 2137539,
      "sha256": "2e8fe1a3a39074d81bbb8be72b999a555657d92370e39e6ec35b192d564a3b00"
    }
  },
  {
    "run": 2,
    "item": 2,
    "stdoutRecords": 12,
    "completeNormalizedStdoutSha256": "ce828e2a9127c03ad7c8fb154ec5be596a26878603265e40dd5bbcd28799a24f",
    "finalStdoutLine": {
      "receipt": "item2.md",
      "bytes": 12203,
      "sha256": "af26cb5292c22f5dfd41285919092f9b616709426353d30d8fbb05d861b3b02e"
    }
  },
  {
    "run": 3,
    "item": 2,
    "stdoutRecords": 12,
    "completeNormalizedStdoutSha256": "d58a9a81b10bf59adcf10cf6d665b866ecd58e87f2a9d6870110767511c46ee8",
    "finalStdoutLine": {
      "receipt": "item2.md",
      "bytes": 12739,
      "sha256": "77b236fc97c93479ce29eef507d7cc2392509e5eca5e9d82b90208ec36f1bc97"
    }
  },
  {
    "run": 4,
    "item": 2,
    "stdoutRecords": 21,
    "completeNormalizedStdoutSha256": "de18683d0733a8dd5efc01175639cb63a9f18193d584ec348b9a2f6fc9bf8e7b",
    "finalStdoutLine": {
      "receipt": "item2.md",
      "bytes": 25115,
      "sha256": "3e2be8e931b9ac5827d5ebb0425a1e7003f7f4c9d62c40718ec3423ec4d80ba5"
    }
  },
  {
    "run": 5,
    "item": 2,
    "stdoutRecords": 27,
    "completeNormalizedStdoutSha256": "b7f0f87d363dc46d2e7b7f463da15c022a92bc4ebcf0bec761b7464040117bf6",
    "finalStdoutLine": {
      "receipt": "item2.md",
      "bytes": 40410,
      "sha256": "203c0a330def1b162749dc25c445f073cbf50af2e1943bc7340b59933b22d899"
    }
  },
  {
    "run": 6,
    "item": 3,
    "stdoutRecords": 17,
    "completeNormalizedStdoutSha256": "32101c00c9f5b5ec53d54dca35f5843a140fc014e1006d13301df409abba0427",
    "finalStdoutLine": {
      "receipt": "item3.md",
      "bytes": 84377,
      "sha256": "4f54a3e397b7e21898958116431f5b03f719ca5b2e02f4de698cceb20ff75b6c"
    }
  }
]
```

Exact source SHA256: `0ce5e8f7b2a261d6a6f9a55096bdd50ab0caef4d82e829afa59b2e17410ced57`

Exact fenced bytes are archived as `review/24-complete-normalized-stdout-receipts.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

### Re-run interpretation and command results

- `env GC2_REPO=$PWD bun run <tmp>/item1.js` | instrumented disposable many-135 TUI | passed, exit 0: zero observer network/transcript reads before serve; zero during a 61315 ms no-client interval; 65 authenticated transcript reads, including 64 snapshot-only header reads; five rejected requests caused no read; page completion sequence 13874 precedes native parking sequence 14419, with no subsequent observer read.
- `env GC2_REPO=$PWD bun run <tmp>/assemble-item1.js` | scratch event normalization | passed, exit 0: all 17017 events retained and consecutive identical fields losslessly collapsed to 8834 receipt rows; final event receipt SHA256 `3009878f95199c912747e515435695c01d4fcc00a0c9bf357f0c753d0dcd134e`. Its source/output boundary error is explicitly superseded by `Item 1 exact source/output boundary correction`; the event receipt itself was unaffected.
- `env GC2_REPO=$PWD bun run <tmp>/item2.js` (first two temporary driver versions) | fresh disposable profiles, no grant or HTTP page reached | baseline setup failures, exit 1: `AssertionError [ERR_ASSERTION]: healthy native transcript exceeds two bounded pages`, then `Error: Timed out: two native transcripts exceed two pages`; sampled native files were 23934–24047 bytes and ended in `409 Unscripted turn`. Both attempts and their sources/output are retained, and both profiles/watches were removed.
- `env GC2_REPO=$PWD bun run <tmp>/item2.js` (growing native file-read fixture) | real native transcript with continuing appends | passed, exit 0: non-empty content advanced through 225933 to 434915 bytes while A stalled. This was EOF at a response boundary, not a stable final EOF.
- `env GC2_REPO=$PWD bun run <tmp>/item2.js` (completed native file-read fixture) | completed 960108-byte native transcript | passed, exit 0: five non-empty pages advanced 0 → 225783 → 435921 → 646047 → 856186 → 960108, with four non-EOF pages and a stable final EOF. A stalled for 2514 ms; healthy page latencies were 8–15 ms; native completion sequence 2352 lies between hold 2341 and release 4346; all 135 children completed. No native transcript was edited.
- `env GC2_REPO=$PWD bun run <tmp>/item3.js` | same disposable many-33 profile/workspace/settings, matched absent/present TUI input sequences | **new criterion failure**, driver exit 0: eight main requests in each run, exactly one 301-byte guidance paragraph (354-byte native wire envelope) in every present request, but 18 non-guidance request/message differences. Complete per-message roles/lengths/digests and native completion excerpts are retained; no product fix or semantic normalization workaround was made.
- `bun run <tmp>/recover-item1.js` | original scratch appendix | passed, exit 0: 41 driver records recovered, SHA256 `5e0f64d66fe186eb3a17a1e14afd99e040ae72d87dec174cf59a9c42c08a7254`.
- `env GC2_REPO=$PWD bun run <tmp>/complete-stdout.js` | exact embedded normalized stdout plus observed final assembly confirmations | first assembly attempt failed with `5 !== 6` because the missing first driver-output block exposed the source-boundary error; corrected assembly passed, exit 0, reconstructing all six runs with 42/12/12/21/27/17 stdout records.

All runs used the official omp 18.4.6, disposable profile environment allowlists, a watched local stub and only the temporary observer copy. All per-run profile/watch cleanup receipts passed. No browser profile, browser install or new dependency was needed for this review scope. The scripts, instrumented copy, temporary fixtures/raw captures and recovery image are retained only until the following integrity check, then removed.

## Final matrix (2026-10-01 evidence review; before scratch removal)

Newest result wins. “Retained” rows were not re-run and cite their earlier recorded proof. The last cleanup row is provisional until scratch removal is observed.

| Criterion | Result | Proving section |
|---|---|---|
| v11 anonymous snapshot/page | PASS | Retained: `v11.anonymous — PASS` |
| v11 wrong Host | PASS | Retained: `v11.wrong-host — PASS` |
| v11 wrong Origin | PASS | Retained: `v11.wrong-origin — PASS` |
| v11 child outside grant | PASS | Retained: `v11.outside-grant — PASS` |
| v11 snapshot recipient scope | PASS | Retained: `v11.snapshot-scope — PASS` |
| v11 advisor grant/URL rejection | PASS | Retained: `v11.advisor-rejected — PASS` |
| v11 expired code | PASS | Retained: `v11.expired-code — PASS` |
| v11 replayed code | PASS | Retained: `v11.replayed-code — PASS` |
| v11 in-flight A revoke/B completes | PASS | Retained: `v11.partial-revoke-in-flight — PASS` |
| v11 idle credential over 60 s | PASS | Retained: `v11.idle-credential — PASS` |
| v11 source replacement | PASS | Retained: `v11.source-replacement — PASS` |
| v11 mutation-shaped requests | PASS | Retained: mutation re-run `Accepted complete-output fresh-profile run — PASS` |
| v11 RPC grant refusal | PASS | Retained: `v11.rpc-grant-refused — PASS` |
| v11 native JSONL secret absence | PASS | Retained: `v11.secret-isolation — PASS`; earlier independent literal grep receipt |
| v11 stub secret_seen=false | PASS | Retained: `v11.secret-isolation-many135 — PASS`, `v11.secret-isolation-advisor — PASS`; new item 2/3 receipts |
| v11 observer-only teardown | PASS | Retained: `v11.teardown-native-isolation — PASS`, `v11.teardown-native-isolation-many135 — PASS` |
| v08 no-store | PASS | Retained: `v08.no-store — PASS`, `v08.phase2-no-store — PASS` |
| v08 browser plaintext retention | PASS | Retained: `v08.browser-retention — PASS` |
| v03 one endpoint/independent readers | PASS | Retained: `v03.endpoint-and-client-attribution — PASS` |
| v03 stalled reader/content/native progress | PASS | `Item 2 — completed-transcript paging under a stalled reader — PASS` |
| v03 zero observer I/O before serve | PASS | `Item 1 — strict nfr-8 and attributable idle I/O`; complete event receipt and recovered source/output |
| v03 zero observer I/O during 60 s no-client interval | PASS | Item 1 `noClient`, 61315 ms; complete monotonic receipt |
| v03 full matched main-request context cost | FAIL | `Item 3 — every main request, matched TUI comparison — FAIL`: 8/8 requests, 18 additional differences |
| nfr-8 authenticated snapshot/page reads only | PASS | Item 1 complete monotonic receipt: 65 reads, zero outside authorized snapshot/page requests |
| nfr-8 snapshot-only headers/no rejected reads | PASS | Item 1: 64 header reads, five rejected requests, zero rejected/header-scope violations |
| nfr-8 no read after native post-request parking | PASS | Item 1: page-end 13874, parking 14419, end 17017, zero later reads |
| cleanup all disposable resources | UNVERIFIED | All profile/watch receipts pass; final scratch removal not yet observed |

## Unverified (before scratch removal)

- Attribution of the 18 later native completion-message differences to the observer; this strict paired comparison failed without proving that causal claim.
- Final scratch-directory removal pending the integrity check.
- Other criteria were intentionally not re-run; retained results remain as recorded. Earlier limits still apply to idle keep-alive socket enumeration, compressed/encrypted browser-cache decoding, arbitrary payload/header/chunked-body permutations and independent Orca-version measurement.


### Append-only, source and receipt integrity — PASS

Command: `env GC2_REPO=$PWD bun run <tmp>/verify.js` | evidence state SHA256 `8d8a742263bc72de8bbf9c3bb0f25db1fca0eddadc5d59e942d67ff8f2d0aabb` | passed, exit 0. This independently checks the exact original evidence prefix, every normalized JSONL row, the newest complete source renderings, the expanded monotonic receipt, authorization/request attribution, stable content-page continuations and all matched main-request metadata. It does not turn the model-context FAIL into a pass.

Exact source SHA256: `e2f822dc236cce48b7931ffd25bde5ae6475cceb443dc908f68e8b16a0d9bfb3`

Exact fenced bytes are archived as `review/25-append-only-source-and-receipt-integrity-pass.js`; the manifest below gives the byte count and reproduced SHA256. Language: `javascript`.

Observed output:

```json
{"appendOnly":true,"sourceDigestsChecked":12,"historicalSourceRenderingSuperseded":true,"jsonlRows":8959,"eventReceiptSha256":"3009878f95199c912747e515435695c01d4fcc00a0c9bf357f0c753d0dcd134e","monotonicEvents":17017,"transcriptReads":65,"stableContentPages":5,"finalCursor":960108,"mainRequests":[8,8],"modelContextResult":"FAIL","matrixRows":27,"evidenceSha256":"8d8a742263bc72de8bbf9c3bb0f25db1fca0eddadc5d59e942d67ff8f2d0aabb"}
```

The final product-input checksum command was `sha256sum <tmp>/verify.js omp-orca-observer/index.ts omp-orca-observer/commands.ts omp-orca-observer/coordinator.ts omp-orca-observer/guidance.ts omp-orca-observer/auth.ts omp-orca-observer/stock-source.ts omp-orca-observer/reader.ts omp-orca-observer/transport.ts`. Exit 0; all eight real observer-module digests match the pre-instrumentation hashes in the recovered item 1 output:

```text
10835d71838e83a4da45d2989980c2720e89946f17da84790cd2ae42ec642d15  index.ts
5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9  commands.ts
196d7565c21484e2c7747f4b93882b9b3ae2c7f56fe649e02657343be662aec5  coordinator.ts
d2d8a497c1194e4449aa6cce7b3df723d1b500f1520e61e213ba1308267e7292  guidance.ts
fa9e97e61c8ffd4b33e005c1c05b0afdbf455f5507c42ef85029c1230b8c7008  auth.ts
6619e7e2f01e26614c5cdab5faf1315141d83315b05e9d068d1d8203c17448c5  stock-source.ts
4a8e1f2349f9a2f4a207a1cb520d3ddbcade5cac8dc8d078f20d16ecd22bc0d0  reader.ts
6894e7c73881939cfb93441e5b6d6facb0ef02f68015324d42f6ec7765a6fe20  transport.ts
```


### Final disposable-resource cleanup — PASS

Command: `rm -rf <tmp> && test ! -e <tmp> && printf 'scratch_removed=true\n'` | the owned temporary review directory, after all drivers exited and every profile/watch teardown receipt passed | passed, exit 0:

```text
scratch_removed=true
```

Deleted: all throwaway scripts, the instrumented package copy and its dependency symlink, generated scenario/input files, PTY configurations, temporary I/O/native logs, raw provider-message captures, watch/control files, temporary appendices and the exact recovery before-image. Every harness profile was already removed by its recorded per-run teardown. No permanent test, production file, existing evidence line or unrelated file was deleted. No commit, push, formatter, linter or project-wide suite ran.

## Final matrix (2026-10-01 evidence review; newest result wins)

The seven reviewed rows have six PASS results and one FAIL. All other rows retain their earlier recorded evidence; they were not re-run. Earlier sections remain unchanged. Item 1 source/output uses its explicit boundary correction; its complete monotonic receipt is the original proving event receipt above.

| Criterion | Result | Proving section |
|---|---|---|
| v11 anonymous snapshot/page | PASS | Retained: `v11.anonymous — PASS` |
| v11 wrong Host | PASS | Retained: `v11.wrong-host — PASS` |
| v11 wrong Origin | PASS | Retained: `v11.wrong-origin — PASS` |
| v11 child outside grant | PASS | Retained: `v11.outside-grant — PASS` |
| v11 snapshot recipient scope | PASS | Retained: `v11.snapshot-scope — PASS` |
| v11 advisor grant/URL rejection | PASS | Retained: `v11.advisor-rejected — PASS` |
| v11 expired code | PASS | Retained: `v11.expired-code — PASS` |
| v11 replayed code | PASS | Retained: `v11.replayed-code — PASS` |
| v11 in-flight A revoke/B completes | PASS | Retained: `v11.partial-revoke-in-flight — PASS` |
| v11 idle credential over 60 s | PASS | Retained: `v11.idle-credential — PASS` |
| v11 source replacement | PASS | Retained: `v11.source-replacement — PASS` |
| v11 mutation-shaped requests | PASS | Retained: mutation re-run `Accepted complete-output fresh-profile run — PASS` |
| v11 RPC grant refusal | PASS | Retained: `v11.rpc-grant-refused — PASS` |
| v11 native JSONL secret absence | PASS | Retained: `v11.secret-isolation — PASS`; earlier independent literal grep receipt |
| v11 stub secret_seen=false | PASS | Retained: `v11.secret-isolation-many135 — PASS`, `v11.secret-isolation-advisor — PASS`; new item 2/3 receipts |
| v11 observer-only teardown | PASS | Retained: `v11.teardown-native-isolation — PASS`, `v11.teardown-native-isolation-many135 — PASS` |
| v08 no-store | PASS | Retained: `v08.no-store — PASS`, `v08.phase2-no-store — PASS` |
| v08 browser plaintext retention | PASS | Retained: `v08.browser-retention — PASS` |
| v03 one endpoint/independent readers | PASS | Retained: `v03.endpoint-and-client-attribution — PASS` |
| v03 stalled reader/content/native progress | PASS | `Item 2 — completed-transcript paging under a stalled reader — PASS`: five advancing non-empty pages to stable 960108-byte EOF |
| v03 zero observer I/O before serve | PASS | `Item 1 — strict nfr-8 and attributable idle I/O`; complete monotonic receipt and `Item 1 exact source/output boundary correction` |
| v03 zero observer I/O during 60 s no-client interval | PASS | Item 1 `noClient`, 61315 ms, zero network/read/client-request events in that phase |
| v03 full matched main-request context cost | FAIL | `Item 3 — every main request, matched TUI comparison — FAIL`: 8/8 requests, one exact guidance message each, 18 non-guidance differences |
| nfr-8 authenticated snapshot/page reads only | PASS | Item 1 complete monotonic receipt: 65 reads; integrity check independently validates authorization and request paths |
| nfr-8 snapshot-only headers/no rejected reads | PASS | Item 1: 64 header reads, five rejected requests, zero violations; independent integrity check |
| nfr-8 no read after native post-request parking | PASS | Item 1: page-end 13874 < native parking 14419 < end 17017; zero later reads |
| cleanup all disposable resources | PASS | All per-run profile/watch receipts; `Final disposable-resource cleanup — PASS` |

## Unverified (2026-10-01 evidence review; final)

- Whether the observer caused the 18 later native completion-message differences. The strict full-request comparison **failed**; ordering/duration differences were not normalized away, and the earlier first-request-only PASS no longer proves this row.
- Other criteria were intentionally not re-run; their retained observations and limits stand. No exhaustive payload/header/chunked-body/error-injection proof, idle keep-alive socket enumeration, compressed/encrypted browser-cache decoding or independent Orca-version measurement was added.
- No assigned item remains unexecuted. All temporary files/profiles from this run were removed; no product failure was fixed or worked around.

## re-run item 3 attribution (2026-10-01)

Scope: the slice's item 3 follow-up and size notes only. Product input: `2f6d27b`; exact before-image SHA256: `452666f4bab9016904b79d735528d162d1727241c28c52443ddade069e770ddd`, 2771892 bytes, captured outside the repository before editing. This worker exclusively owns this evidence file; no product file is changed.

The previous embedded `item3.js` and its accepted output actually used `many-33`, not `many-135`: it selected the many-33 stub, awaited 33 native children, and compared the same two typed inputs. The absent/absent control therefore repeats that actual prior async scenario. The blocking comparison uses stock `nested`, with async disabled and two blocking descendants.

All omp processes run in harness-created disposable profiles/workspaces with the local watched stub and the profile environment allowlist. The proxy forwards the original request bytes unchanged. Observer absence is an actual plugin uninstall; presence links the unmodified package. No observer command is used, no code or credential is issued, and the disposable watch remains `[]`. Both runs of each pair use the same profile, workspace, settings, 600-column PTY, observation extension and typed input sequence: `HARNESS_AGENT=main`, then `HARNESS_AGENT=main matched follow-up`. Every main-provider request, including stock-scenario exhaustion responses, is retained.

### Setup and recovery receipts

`sha256sum gc2.md && git rev-parse --short HEAD` matched the dispatched evidence SHA256 and product input. `cp gc2.md <tmp>/before.md && sha256sum <tmp>/before.md` reproduced the same before-image digest.

`bun run <tmp>/prepare.js` initially exited 1 because the throwaway extractor's expected PTY digest was mistyped (omitted `6ba5f32`); no omp process or criterion ran. The failed source is retained as `attribution/prepare-attempt1.js`. Correcting only that literal to the digest already printed in the evidence made the extraction pass:

```json
{"baselineSha256":"452666f4bab9016904b79d735528d162d1727241c28c52443ddade069e770ddd","baselineBytes":2771892,"reviewedPrefixBytes":543155,"extractedPtySha256":"7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831"}
```

The size-note dry run, `bun run <tmp>/pack.js --list`, passed: 27 source/receipt blocks were selected only inside the unreviewed section; its 2228737 bytes compact to 108565 bytes before the shared archive. Replacing each reference with its exact archived fence reconstructs the original section byte-for-byte; all result fences and proving narrative stay verbatim.

### (a) Observer-absent versus observer-absent async control — PASS

Invocation: `env GC2_REPO=$PWD bun run <tmp>/attribution.js control many-33` from `$PWD`.

First setup attempt: exit 1 after the first absent TUI completed. The throwaway driver tried to uninstall the already-uninstalled plugin before starting its second absent TUI; stock omp correctly returned `✘ omp-orca-observer is not installed`. No paired-comparison result is accepted from that attempt. Its exact driver/output are retained as `attribution/attribution-attempt1.js` and `attribution/control-attempt1-output.jsonl`. The profile, watch and PTY configuration were removed. The corrected driver leaves the same already-uninstalled profile unchanged for its second TUI; no observer/product behavior changed.

Accepted run: exit 0. Both absent TUIs completed all 33 native children; the same two typed inputs produced 8 and 10 main requests. Requests 0 and 1 match exactly under the prior item-3 normalization. The completion requests differ in batch membership, order and duration despite observer absence. The first mismatch is request 2/message 5: first `role=user`, 2821 bytes, SHA256 `d8336f06b276b9579f2c6eaf819427f4c6b892fd5e49a96e84d3c75cef80ee61`, starts with an eight-job batch and `Job agent-7`, `duration="1.2s"`; second `role=user`, 2489 bytes, SHA256 `77a24716a98582c961a951740097b9d38c0986e1ffaf051dab37c7ffe0f70717`, starts with a seven-job batch and `Job agent-3`, `duration="1.3s"`. Those differences exist without the observer and are native.

Request-count attribution: each side has the same initial typed request, native task-result continuation and final typed follow-up. The first side has five native completion-batch requests (ordinals 2–6); the second has seven (2–8), including separate single-job batches for agent-4 (ordinal 3) and agent-16 (5). Thus the two extra requests are native batch continuations, not extra typed inputs. The identical typed follow-up is ordinal 7 versus 9. Strict ordinal comparison retains 23 differences: 20 completion/ completion message differences, the shifted typed/completion message pair, and two unpaired ordinals. No ordering or duration difference was erased to manufacture equality.

```jsonl
{"criterion":"v03.async-native-control","result":"PASS","scenario":"many-33","firstMainRequests":8,"secondMainRequests":10,"guidanceCounts":[0,0,0,0,0,0,0,0,0,0],"differenceCount":23,"nativeCompletionDifferences":20,"paragraphBytes":301,"guidanceWireReceipt":{"index":0,"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}}
{"cleanup":"profile","removed":true}
{"cleanup":"watch-and-pty-config","removed":true,"secretCount":0,"fatal":null}
```

The archive carries every request's source, status and every message's role, UTF-8 byte length and SHA256 in `attribution/control-comparison.json`, plus the corresponding normalized complete messages for independent digest verification. All original proxy bytes were forwarded unchanged; no provider request was omitted, including the finite scenario's 409 responses. Complete normalized driver stdout: `attribution/control-output.jsonl`, SHA256 `94c88f1b4431248d616b0b5c523e70544bf9170c514f37d5ce05e605f667b57a`. Exact accepted driver: `attribution/attribution-control.js`, SHA256 `f615891676b1398738fa31ae52891061582185a52cfff219397572e8c5bb64f2`.

Control normalization matches the previous item-3 categories: disposable/repository roots, ISO/file timestamps, UUIDs and clock times. It preserves every number, completion order and duration. The exact regexes and replacements are printed by the driver and retained in its complete stdout; lengths and digests cover `JSON.stringify(normalizedValue(message))`, not just message text.

### (b) Deterministic blocking children, observer-absent versus observer-present — PASS

Invocation: `env GC2_REPO=$PWD bun run <tmp>/attribution.js blocking nested` from `$PWD`; exit 0. Stock `nested` has async disabled and both named children use the `blocking` agent. Each side completed both descendants and made exactly three main requests (statuses 200, 200, 409), with no extra main request. The third request is the same typed follow-up after exhaustion of the stock scenario's two main turns; it is retained, not discarded.

All non-guidance messages match exactly after the declared temporal/generated-ID normalization. The sole difference is one exact guidance message in each present request: 301 paragraph bytes, 354 bytes including the wire message envelope, SHA256 `47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12`. Guidance cardinality is `[1,1,1]`; no other message is added, removed, reordered or changed.

```jsonl
{"criterion":"v03.deterministic-guidance-only","result":"PASS","scenario":"nested","firstMainRequests":3,"secondMainRequests":3,"guidanceCounts":[1,1,1],"differenceCount":0,"nativeCompletionDifferences":0,"paragraphBytes":301,"guidanceWireReceipt":{"index":0,"role":"user","byteLength":354,"sha256":"47f1b57d59006cc034df80a857cdfedf0166fe3adf4e6f9b938c778911b07e12"}}
{"cleanup":"profile","removed":true}
{"cleanup":"watch-and-pty-config","removed":true,"secretCount":0,"fatal":null}
```

Per-request/per-message metadata is complete in `attribution/blocking-comparison.json`; the normalized messages are also archived for independently reproducing every length/digest and the guidance-only comparison. Examples of matching non-guidance envelopes: initial system message 11106 bytes, SHA256 `e7564143f33846e5412e39b95da27c7ebab49604696fcaeacaa6b15329915f3d`; native task-result message 266 bytes, SHA256 `a1e5f8658b3f9d4651a4dc0658f276bd0930d9137b9e48dcfc7848258faa8c09`; final typed follow-up message 89 bytes, SHA256 `afa5c26ce5af8c6c6ae0f4d309b1117fb150f2827d656773e573b61880e31ef6`.

Exact accepted driver: `attribution/attribution.js`, SHA256 `6468267e9cfc69b01c97a98bb2188cc3c22e3162d4af9a840bd1a1846f24dc9d`. Complete normalized stdout: `attribution/blocking-output.jsonl`, SHA256 `67d4486a5b59b09c64d08d0f6633443eca2d34f6f2293810a777a96e677b2903`.

#### Exact normalization regexes and boundary

The blocking comparison applies the gb2 categories named by the binding note: ISO/file timestamps, epoch-ms values, native durations/ttft/elapsed-time text and generated UUIDs. The exact string rules, in application order, are:

```javascript
[/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<ISO_TIME>']
[/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z/g, '<FILE_TIME>']
[/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<UUID>']
[/\b\d{1,2}:\d{2}:\d{2}(?:\s?[AP]M)?\b/g, '<CLOCK_TIME>']
[/\b\d{13}\b/g, '<EPOCH_MS>']
[/((?:"|\\")?(?:durationMs|duration_ms|ttftMs|ttft_ms|elapsedMs|elapsed_ms)(?:"|\\")?\s*:\s*)\d+(?:\.\d+)?/gi, '$1"<TIME_MS>"']
[/\b\d+(?:\.\d+)?\s*(?:milliseconds|seconds|minutes|ms|s|m)\b/g, '<DURATION>']
```

Recursive numeric rule: only integer values in `1e12 <= value < 1e13` become `<EPOCH_MS>`; other numbers are preserved. Disposable/profile and repository roots are replaced before these rules. Semantic child names, stable stub tool-call IDs, roles, array order, task arguments, output text, statuses and all non-temporal content stay intact. Lengths/digests cover UTF-8 `JSON.stringify(normalizedValue(message))`. The control uses only the first four string rules and no numeric normalization, deliberately retaining native completion durations/order.

Together, (a) reproduces the async batch differences with no observer, while (b) shows only guidance on blocking children. The follow-up's full matched model-context criterion therefore passes; this supersedes, but does not rewrite or relabel, the earlier strict async comparison's recorded FAIL.

### Size-note selection correction

The first dry run selected 27 blocks because its heading-based rule also caught two small JSON proving receipts. Before any compaction was applied, the selector was narrowed to source-language fences and the named JSONL receipts only. The item 1 assembler nested in the earlier malformed source rendering is also archived as an exact standalone member, and its proving narrative remains visible. The final assembly passed with 25 moved blocks, 2228737 original section bytes and 109653 compacted bytes. Every result/proving JSON fence and narrative line remains in place verbatim. The original dry-run source is retained as `attribution/pack-list.js`; the intermediate and final assemblers are `attribution/pack-attempt1.js` and `attribution/pack.js`.
### Exact source and receipt archive

One gzip-compressed tar archive holds the moved receipts and every new throwaway script verbatim. No result or proving narrative from the unreviewed section was rewritten. Copy only the base64 block into `<tmp>/archive.b64`, create an empty `<tmp>/decoded`, then decode with:

```sh
base64 --decode <tmp>/archive.b64 | tar -xz -C <tmp>/decoded
```

Archive SHA256 (compressed bytes): `8e7a06d4c4fa96188fd579ca7bcb83563973914033fad55823a6b1e24daf6d45`; bytes: 135223. Every manifest hash below was independently checked on the decoded member bytes.

| Member | Bytes | SHA256 |
|---|---:|---|
| `attribution/attribution-attempt1.js` | 14576 | `fb8251594b3281a3fdfb97efeef926825b7386d756551e783385cc659c3bb479` |
| `attribution/attribution-control.js` | 14745 | `f615891676b1398738fa31ae52891061582185a52cfff219397572e8c5bb64f2` |
| `attribution/attribution.js` | 15266 | `6468267e9cfc69b01c97a98bb2188cc3c22e3162d4af9a840bd1a1846f24dc9d` |
| `attribution/blocking-comparison.json` | 10238 | `a4396af0a7aec08d0f317b0b89b5462250d966e2d9be3fd1d965ffc1f63ddae2` |
| `attribution/blocking-normalized-messages.json` | 71977 | `e54008b5aa9da824851143bc49c83823f01436d9dd11d3ba23f1516ad54e36bc` |
| `attribution/blocking-output.jsonl` | 9376 | `67d4486a5b59b09c64d08d0f6633443eca2d34f6f2293810a777a96e677b2903` |
| `attribution/control-attempt1-output.jsonl` | 4959 | `f6b45393d6ad89e0f38aa2e7eb502d9b019e6cbc6af8485fb5efb97a8c89bb6c` |
| `attribution/control-comparison.json` | 83998 | `351d5a7dbcd23a16c31ee1e12ddd0a705545489663544792d4b79e146776792d` |
| `attribution/control-normalized-messages.json` | 453103 | `6b4aa78de5e5544712731ed35596be554e7d14f56654779c1bc7258998a22c0d` |
| `attribution/control-output.jsonl` | 8887 | `94c88f1b4431248d616b0b5c523e70544bf9170c514f37d5ce05e605f667b57a` |
| `attribution/inspect.ts` | 677 | `6da1cb74f88b999a5a256969b1fa71eb6e8c70b78b60c179199afe81b7fad12f` |
| `attribution/pack-attempt1.js` | 6197 | `4af8d04177b4b43b838a5a8c6a7fdde25d468db727bef264e78d6975719e1b81` |
| `attribution/pack-list.js` | 6034 | `9cabfaa79b8092f448f30fedf793e0ddb974b1226a677bf5dba970f49af038cc` |
| `attribution/pack.js` | 7000 | `8941581f10d3bf9aac16077fe3fa49594247543f1fe79fe54af99be17b886225` |
| `attribution/prepare-attempt1.js` | 1196 | `d5d29be2328bc4168881b5315d72d51e964c55915250cf7e3327a22dabda8197` |
| `attribution/prepare.js` | 1205 | `0bfa25b34d4c63b87624d5992f3d590f18b48e40239f8388e87e5d8d12358a11` |
| `attribution/pty_driver.py` | 1251 | `7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831` |
| `attribution/verify.js` | 7906 | `d2c5c5bdfdfe0ab0a5dcf07451e6bc1d4dfc57e51d1b58a0c9971ce4d69012f4` |
| `review/01-item-1-source-pty-driver-py.py` | 1251 | `7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831` |
| `review/02-item-1-source-probe-js.js` | 4509 | `434ba1148f100ac5f927164dc45d067f23e918cfdcaedd215141842c171310bf` |
| `review/03-item-1-source-inspect-ts.ts` | 1636 | `7d2f2adb7fd3fd7fa188ac7ed40779216c007fc662c2c35ef73e3c42246d44f1` |
| `review/04-item-1-source-common-js.js` | 12365 | `0b25ff30e4d800b3ef12cabbb8ee38404a637784e6105b772e635b3ad1125a88` |
| `review/05-item-1-source-item1-js.js` | 10180 | `7dc0cdb2f068ddebb3d696ceac2f1a822060f71ff58035bfe6b3d318ad36b06b` |
| `review/06-item-1-complete-normalized-monotonic-event-receipt.jsonl` | 1946698 | `3009878f95199c912747e515435695c01d4fcc00a0c9bf357f0c753d0dcd134e` |
| `review/07-item-2-source-item2-js.js` | 7327 | `3aed6ec3b668824c3d61337af7856368990342ed3c1796071bf7239bfc83b21d` |
| `review/08-item-2-complete-normalized-driver-output.jsonl` | 3454 | `f35c5b5a9d8448fc01e55b2397a069fafbcacfb7590a7de50bd776ee41c5166c` |
| `review/09-item-2-source-item2-js.js` | 8083 | `b53074e7f5eded1d17db828389720cdeebe4940ae4bc8eb31af36b25ac577d5f` |
| `review/10-item-2-complete-normalized-driver-output.jsonl` | 3928 | `2ce178ce3c4a31aae8d429513a4e0ccc06f4c2a482c71d524a614aa153519c3c` |
| `review/11-item-2-source-item2-js.js` | 8669 | `438039f7ba51d51b62af98c67eaf81ceb21f251693f9e1d50161befff852d2c5` |
| `review/12-item-2-complete-normalized-driver-output.jsonl` | 12146 | `9cb810a3adf968352cc6c26c76a68273dc0c822cfb7abee4268f5968b19bcdbc` |
| `review/13-item-2-source-item2-js.js` | 8845 | `a6ce2e151768cc76440d47d3911361132392db02a9e6ed67b4706073f6ee5e27` |
| `review/14-item-2-complete-normalized-driver-output.jsonl` | 22586 | `acf5f0ec6c71a30653001d4fc33b248732343075b49f8e9d489c2bcc11d04da6` |
| `review/15-item-3-source-item3-js.js` | 10456 | `bdfad3d6b88d75fede4272d67b4519b054c63a7dfa97761d4f1710edf6267d4a` |
| `review/16-item-3-complete-normalized-driver-output.jsonl` | 8209 | `c7988c41e0a56554cbe665896c9edf342fee1926a0529b865fc9402797986c09` |
| `review/17-item-1-source-pty-driver-py.py` | 1251 | `7d577683425680731897c5ae09585dda552da2995fc32a6ba5f32ca603aca831` |
| `review/18-item-1-source-probe-js.js` | 4509 | `434ba1148f100ac5f927164dc45d067f23e918cfdcaedd215141842c171310bf` |
| `review/19-item-1-source-inspect-ts.ts` | 1636 | `7d2f2adb7fd3fd7fa188ac7ed40779216c007fc662c2c35ef73e3c42246d44f1` |
| `review/20-item-1-source-common-js.js` | 12365 | `0b25ff30e4d800b3ef12cabbb8ee38404a637784e6105b772e635b3ad1125a88` |
| `review/21-item-1-source-item1-js.js` | 7067 | `1cf095c387a519b1808db8ed5c9053d23c53834a90abfb0c67edb28811b13f8a` |
| `review/22-item-1-complete-normalized-driver-output.jsonl` | 15953 | `5e0f64d66fe186eb3a17a1e14afd99e040ae72d87dec174cf59a9c42c08a7254` |
| `review/23-item-1-complete-normalized-driver-output.js` | 2473 | `7318654c6d1397b2b030d92da503c30884934c6c88fdff0a7cb2ef994191480a` |
| `review/24-complete-normalized-stdout-receipts.js` | 3101 | `0ce5e8f7b2a261d6a6f9a55096bdd50ab0caef4d82e829afa59b2e17410ced57` |
| `review/25-append-only-source-and-receipt-integrity-pass.js` | 5214 | `e2f822dc236cce48b7931ffd25bde5ae6475cceb443dc908f68e8b16a0d9bfb3` |
| `review/assembly-item1.js` | 3214 | `ca70ed456ea75bf79c4fcfcd11779895f532a3db38314fb2ecd43d888d09a19e` |

```base64
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
jNGfZDcQYyy7UZwDvqeWgz6anOILUM6aAUg8yiq05iurAkO6wscz5butxBIFDW0p/L8IRwnftI+s9GqWk9pn9aZ7YBrQfFUKK6FL
v7Rk8kUJPWumr2OxZNCwbw5OT0nBPj84xhvyJeUVywA485YcA3r/FOmKUPNKXwB73oiY+Rd1uXgqM4vqBoJE5aTmNHgNl0FISB1m
1oDRr6vxGGRtL0s0hFNa6V/AsEivb9x8F6VgMIXatOudKkfJ1xVOTN2fVY4S+pvrjjG2lk5Vw226l9PU7jK1eEMtvlCLY5W6a413
+EwtHlPp5tN80tiiJy3czvvEHjg9iBQYCR1u3P0ImoS0I9XCpuOUr5rvN1lp47rajqpZm3PVNjZ1a8HLr9j2a90WN98EOnXyyosA
JDKl25ZWxWJd9YfiaqWr0heqcyw6fS7yCkEGmksb1S4WYOAjLHmSxaereFYe3T/o8N19OGTgtq5/1lX5sxKmPkB6S19UqhprUw/I
pdeb71AAEralj8zBCsI2fEljc3zXjS5sWbQgb9hEz265wwsvx/t3BbgS6RLxpEVe0YjU2urBArND4Y1+L0tpFeeurEv9fk08z4gX
lWcQOtXtqOc8jVxMLQ2jX70mCK4usHLupX58Hdlt6aQRZZlwTL1IQDxqgWkxGbesNHXItsyLNIMN1Oo/Jldd3TzXEzGtiOW9YJXL
dGlfJOXzBZL9ZXyFd5Qa9UpoBkmTrFm5bVJQA/ri05v2wS1E0VRdL/JxcFe+L6pQ+H19ndfaTWh0fJEaurRDjSyPXL/TInwPVg/+
1fWWf7e/u+t/pa79/eW/X63/3R4OGvW/Wzs7I1P/+1f8mfpfU/9r6n9N/a+p/zX1v6b+19T/mvpfU/9r6n9N/a+p/zX1v6b+19T/
mvpfU/9r6n9N/a+p/zX1v6b+94Gp/zX1v6b+19T//q3qf9GN0BULIpT5/FnP1NRE/7o64ftWCv95tcL3rRZeMQ4cL8lQKzmAzyhX
2kO/6MWHfhXtwiSVu2qlKce7qYxpNnF5u0MPkBgVnbSWM5tCZVOobAqVTaGyKVRmplDZFCqbQmVTqGwKlU2hsilUNoXKplDZFCqb
QmVTqGwKlU2hsilUNoXKplDZFCqbQmVTqGwKlU2hsilUvvffnfW/f0Ddr/r7Sv3vaHtrs1H/Oxxubpr637/iz9T/mvpfU/9r6n9N
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
jRBuhHAjhBsh3AjhRgg3QrgRwo0QboRwI4QbIdwI4UYIN0K4EcKNEG6EcCOEGyHcCOFGCDdCuBHCjRBuhHAjhBsh3AjhRgg3QrgR
wo0QboRwI4QbIdwI4UYI91VBuHHredx6/mq2nsdgAQwWwGABDBbAYAEMFsBgAQwWwGABDBbAYAEMFsBgAQwWwGABDBbAYAEMFsBg
AQwWwGABDBbAYAEMFsBgAQwWwGABDBbAYAEMFsBgAQwWwGABDBbAYAEMFsBgAQwWwGABDBbAYAEMFsBgAQwWwGABDBbAYIEbFizw
ppEGJvX80Zdhe6d5SK1zZl2z0Y3zEQdPn370q5v52dyyR6DXVXmwbrXjptGFN/9pCizsrZ9B4KOEyN/w6X0zxsQsr86nQhH+q4K8
g/a98XOc9LaiuIpHXcfPq0GjZaTpmOXeJy1b2R3cgqniR6CGTZNGPthOC18bg6TgPazdE5M67+Qj4NBJqu+N/tnWLDuF+SSgA1S7
tbvrX4mTYfpi7dfj+mu78/XJF/BjE37/3a0v/nHrOTw9aQbAQPcbBnh/59tnj+8/uNcoOSs8YHj6i58srfu397++t7zy6gkZGjuM
T1+VJ8PZb7HCb8pO4Pat56PTj/vuu/tfnX5Sej+6sZQu0y+e3Hn49MGtL3KNpyu8+/W3d39/RgNytfzkjDvvPfz27u+ePdjp3fdJ
euzg5930Gdz6Av5qxcaD6c/tz2f705+PjuLRg/or/Rn27CFY2w9mvyDzVrcuaM1vUpN+cyt19mK3L6PVr0EM3U4NS++4O1jWuk4d
qWL4e3+0tzeq1yanP7ffoFeCTQbfkPXz/q0zKDKTiSlibTA+3q/C5JvuAB8kyz4B/WigrLj9WQ1FLm6nv3kx/LyYk/XTxplVA9fq
2mpcV3KFwtNbuNbOD5ZJBXVXipjAfRBECF9RJaIW1laEaEKEVdwyK6UTJDoirdBROG5JFSpvHSXC2KQjTV+O3b1sSsPcjgkgkqbp
fLYn/XI4bNT2Vik53Dt+nlbSx2B0HyVHB1w1BMXXDlt9EKoOP42OEoBjsE0SN/AgLKC+13/9c/Fde19yfvTv3E1KHVweJpOkJnbf
pgITKJlBv374/Vdbp27dqoFGWw0adyuxoNZFOtkE5Xc4nBlIK9bQXD7dqlueRR1U4+xhdsnP7ZkmZ1oLQ7jkx+yWun20f/j5XGDm
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
ub3vx+Nrd5+bEz2r3mqmi64zPauG8vn49bwqsNXfO7m0Ot6dlZE3p/XVVc2MbUTVKGcmFlYkf/qlaaS63m9y+L1dUqqH46q1n1cX
hrlZf1xpNdtHb5+7LZ396D5TjQW2wdrJZ7XGY3+zcCG7zsQF8qVdyJvaIahKrusBh64PqWe4tjMzF43VBGemMd0vXt28Nr1lE89p
75VdtawXutYXYFzpu5ndXNsaWr2gUC2FGnlYPUC66qHNCY/G1VqivbyG5njmrh+4cr0dZc/c1XZmF0TW+kJ32j9O3LKQ6Qvs5MGc
v9F6o0rZm3F7PHwzs5qnliem7zs3utgucCxd0caVaG3IVktfzV67c3lV38VnrrXtADM9q2oGV27D0pnJvfn16Ob6ynaeRrEY/Xzm
VijsDVnp1e1MVff1583tY+fSNsrNyd9acGdt3l2K6lHK9aDj03aN+OzapNlcjOac3e05u+xVtcm6X8z6vc+uxoPpzfWL6adVXdhd
mO5Wv7D15vo6sJWty+ryrOcn1eVp6zXn1S1omufU1WDNhbkYDi4vZ1ejxfnt89zu8pqO7dwt1jT6zcZuxcOwCq8a/xq5YTTtxK7T
2qlQfWOYGYM57mTm5tprF8Hl4NW8ykKzAFGvptsh5Nxq/nP77fbLm8ugWvkyunda90gjuwfj2y/++I+ff/X5Hz/7/OV3a8c3Gs2c
y9Iuco0Hi8l4fn45eGt6hoErpVWLh5Uon0yrkdKEW41N//Hv/90WC9015eqL9T4DMwE3KV/O352u71bo/ce//x+VGDXD4dHcLYhO
lv/x7/9PcxgrZl25y0iXa9Nrm19ZDTp3tb7B3AqQc6sgr6svqCe9Z3Z5t3qGxXxgo0pspdaVWw9oF7Pq6Yj5le1EXMPZruvcjvhn
tjsyF+bIVfzs0qn5nqY8dm06azOVMhMGF+PIjbrukL+t7q8qx83ofWF06Wu3vl0txdtCli1x1FdWO967/Fn1YAXyuWk+Oz8yIdkF
cFfwMJLX9C1ORdh7b+GG0MUbk9pqqrm6cNxlVD0mb4vnv7axmdb+rRmxTfteVO3lVh6Mhj5bzsxkaG2OfH11s6hjtdWNkRnXbEvb
Bauenc+aYdo2hh32h26ziRse6xvktFfVF20xy1yGp2v9q72yxsu6BuNGpWraV63YuD0OP9keZrLcWgGaWLUyWWxMStpa5eTK1S5X
U8Qms6PqnjJXva09Ld7UibLL7yYQF9hwbGbUdhuHXU4afu+09Zlbj7u0svPSZMouLFsp8c2ffvuni1Xpykx6zWzjqp7zmrZtzt+0
77n58Q//65f1v35Q9T8u3ehhY29/UT98ZH42fei0ray5AtHZZk/pLkQ3W692DzRznfX50vNedaa9qjQ7qAs79eX5q/Ota8L8qln7
PjMD91kDUrAzN9sjuoekmmHUPSxlbwSjvc0dfnnaghjaBfRzt0lmPHd1Z6dKXGYbdTna3qHwq/O7v9684rSrOT3zUz1ran5z4U7O
tHW1PclVhW0p/HzV5dZd+aiZsUyrJQsTilVpTlw1erSNYGNC27OX2MLeH/32+6tzG12YO8aWKKp0WFnftLJTK7bi4m5E0ytW02+r
qmyctlDX+4//8/+7OVDf7meauEW+9Tw9r9Pr9rWYiJs0D9x2qSqiX52vNY8bPj6rq0yblbSzjYlAPVVps1bfHu6b7R4J1xNXPXMb
je2jjK6y8sxWaxoB9O7cDl69y6vJ9bm5qc/sfh0j3VzZ2i5nXziB4GZqa/djvcvn3FXpRqsV20q0Wk1ihaEbwYzyMkrO/m5sbqq5
m+5ObOVv4eocZibZKDZ3Mq47qDZM3UxdjC5R1VaN86aWtBaK6VQHN7ZKbLqYK9cN2h9sldlcFpPp2DS8nbe8nriSRTujs+PEalzr
V9PjZh3FaqhbF/hmldN0Z3Z/41l9gZhf/sq28qK6w13G/vT1hWWk3PxklEzWL/K+Pns7Gc5ni9nl8szuMzTNPzr7569/r90U1NWu
f8qSalHDnGnVu51X0mQ8sjFsfsWvzm9HsX3ZfD5w9/3i2mSqVkeD0Q+u/3ezRjNmPl9r++o2t5m/tpeqLUZM2u1KtYqrxkVbI3bj
qRtUqryZC8mOJM04XE9Qqj6v2rHgypizeb0VsYra7p/oVdsC+msFwObGOK2+t55R2mqcy8t02Y5yg7V6SDMdrofFYT1y1XmvSmvD
sS3X2+//wW3uXJsrb2b62fvTdodt9STAan/ttz+751TNK/YczCvuPxct5cfcbrawNzdZ+GY2Gry76OlIZ2cqOouUafG6itbU7tr1
novekb22rHD5dZVuu1/jqN/77awuzV7bDbFuDF3TM3ZcdXwgt8uwv0auaeNwJ3NnyLcfqn32/uX7l6eyvVi2F8v2YtleLNuLZXux
bC+W7cWyvVi2F8v2YtleLNuLZXuxbC+W7cWyvVi2F8v2YtleLNuLZXuxbC+W7cWyvVi2F8v2YtleLNuLZXuxbC+W7cWyvVi2F8v2
YtleLNuLZXuxbC+W7cWyvVi2F8v2Ytle7LYXr059zfZjbX+x/bxJ519ct+3aYzIyv7bbHofmcjoz7f3uLI7P7PHOojP7trPIfqgK
4dJ04DZy85v2nxc/P7MqxQZoriHzymD++sZ14+ZXP794Vl8wzmjIFgRtd+t27b62hd5me0FlXbpWVbUN4kyKbDX2hQ31hfsed5zK
TFS5N7h/V8ZG1nu1+cwdxkbuO2ojUrXqiO2F1IRRxfXWFVDtkYw0dCDwr21Cq1NY7Qi1H2xPxB38aNEUaV7YzN2KWHtErCERxx4R
x5CIE4+IE0jEqUfEKSTizCPiDBJx7hFxDom48Ii4gERcekRcQiJWkc8QEmFi9hr2MOOe8hn4FGbkUz5Dn8KMfcpn8FOY0U/5DH8K
M/4pnwFQYUZA5TMEKswYqHwGQYUZBZXPMKgw46D2GQc1ZhzUPuOgBs3/vCaAmHFQ+4yDGjMOap9xUGPGQe0zDmrMOKh9xkGNGQe1
zzioMeOg9hkHNWYc1D7joMaMg7HPOBhjxsHYZxyMMeNg7DMOxqBKqFcpNMA4+PL9s/cbSwCVl/la9f9ruz/ZfNZEY5fV630r1Y7g
3o1b57TnsvZ885n6rnf819mr1Y8nay/qzRf1xovx5ovxxovJ5ovJxovp5ovpxovZ5ovZxov55ov5xovF5ovFxovl5ovlxosq2mqF
aPPl7UbabCW11Uxqs53UVkOpzZZSW02lNttKbTWW2mwttdVcarO91FaDqc0WU1tNpjbbTG01mtpsNb3Vanqz1fRWq+mta2v74tps
Nb3Vanqz1fRWq+nNVtNbraY3W01vtZrebDW91Wp6s9X0VqvpzVbTW62mN1st3mq1eLPV4q1WizdbLd5qtXjrnty+KV2r2ccn6zX0
m+XsrN6Y0O62ml1d9R3VxvZepi+qN1B80vvM7gSpHrG1K8t23+Wk3qpcbQavnmMc2af53baB8QoVZPqYz2ZuS6LdbVFtfrCvL9xi
8H1PB/SO7TOMza8cJcF8cQtKOHHb+dyDO72GJVA/i7cNFFh/T3XoydQuP9vNJ+t4gXb/drU5tXq6odor2G9C3AMXeL4FF3BB/i+m
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
p27cFZ868akTnzrxqROfOvGpE5868akTnzrxqROfOvGpE5868akTnzrxqROfOvGpE5868akTnzrxqROfOvGpE5868akTnzrxqROf
OvGpE5868akTnzrxqROfun0xi0+d+NSJT513zOJTJz514lPXfFh86sSnTnzqGg8s8alr6hfiU1f/LD514lMnPnXiUyc+deJTJz51
PIB54lPXXVuKT12HIEfxqROfOoJtKT513bWl+NR115biU9ddW4pPnfjUiU+d+NQRak7xqROfOvItKj514lNHvUXFp0586sSnTnzq
KLao+NSJTx3xFhWfOvGpo96i4lMnPnXUWxTsU8dANcft+Bk/YPyMmYyf8dPGz/iR42d85/jZ1kj0A2okmkmNRD+tRqIfWSPRd9VI
dDt+6geMn5rJ+KmfNn7qR46f+q7xU7e1Zv2AWrNmUmvWT6s160fWmvWde4NaRaIfoEg0E0Win6ZI9CMVib5LkcRtPSd+QD0nZlLP
iZ9Wz4kfWc+J79zb0s7s4gfM7GImM7v4aTO7+JEzu/iumZ1u6zn6AfUczaSeo59Wz9GPrOeY5hB3Z3F3FndncXcWd2dxdxZ3Z3F3
FndncXcWd+e+uDuLu7O4O4u7s7g7i7uzuDuLu7O4O4u7s7g7i7uzuDt/6sZdcXcWd2dxdxZ3Z3F3FndncXcWd2dxdxZ3Z3F3Fndn
cXcWd2dxdxZ3Z3F3FndncXcWd2dxdxZ3Z3F3FndncXcWd2dxdxZ3Z3F3FndncXcWd2dxdxZ3Z3F33hezuDuLu7O4O3vHLO7O4u4s
7s7Nh8XdWdydxd25cY4Vd+emfiHuzvXP4u4s7s7i7izuzuLuLO7O4u7MA5gn7s7dtaW4O3cIchR3Z3F3JtiW4u7cIf5W3J3F3Zlg
W4q7s7g7i7uzuDsTak5xdxZ3Z/ItKu7OXbeouDt33aLi7tx1i4q7s7g7i7uzuDsTbFFxdxZ3Z/ItKu7OXd/14u7cdYuKu3PXd724
O4u7s7g7i7szxRYVd+euW1TcnbtuUXF37npkEnfnrltU3J27vuux7s4dqObfbGjm5vKPjXZePEo6t8r53pvkSUVPFf4meeImsMfu
AovvTqkYdothtxh2i2G3GHaLYbcYdothtxh2i2G3GHaLYbcYdn8qht1i2C2G3WLYLYbdYtgtht1i2C2G3WLYLYbdEzHsFsNuMewW
w24x7BbDbjHsFsNuMewWw24x7BbDbjHsFsNuMewWw24x7BbDbjHsFsNuMex+jIOKGHaLYbcYdothtxh2dxexGHaLYbcYdtcfFsNu
MewWw24x7BbDbjHsXsUsht1i2C2G3c2HxbBbDLvFsFsMu8WwWwy7xbB79bMYdoth99rPYtgtht1i2C2G3WLYTR4iLYbdYti9oy3F
sLtDNqcYdothN8G2FMPuDmGtYtgtht0E21IMu8WwWwy7xbCbUHOKYbcYdpNvUTHs7rpFxbC76xYVw+6uW1QMu8WwWwy7xbCbYIuK
YbcYdpNvUTHs7vquF8PurltUDLu7vuvFsFsMu8WwWwy7KbaoGHZ33aJi2N11i4phd9cjkxh2d92iYtjd9V0vht1i2F1/rBvD7sen
9DaZryK5OoJrTZx1VuAvT78VM3AxAxczcDEDFzNwMQMXM3AxAxczcDEDFzNwMQMXM3AxAxczcDEDFzNwMQMXM3AxAxczcDEDFzNw
MQMXM3AxAxczcDEDFzNwMQMXM3AxAxczcDEDFzNwMQMXM3AxAxczcDEDFzNwMQMXM3AxA3dm4C9PZXuxbC+W7cWyvVi2F8v2Ytle
LNuLZXuxbC+W7cWyvVi2F8v2YtleLNuLZXuxbC+W7cWyvVi2F8v2YtleLNuLZXuxbC+W7cWyvVi2F8v2YtleLNuLZXuxbC+W7cWy
vVi2F8v2YtleLNuLZXuxbC+W7cWyvXi6SUZu98Vu7C+2nzfp/Ivrtl17TEbm13bb49BcTmemvd+dxfGZPd5ZdGbfdhbZD1UhXJoO
3EZuftP+8+LnZ1al2ADNNWReGcxf37hu3Pzq5xfP6gvmxbOLF89sQdB2t27X7mtb6G22F1QY6rWqqm2QZ6cVBXvxwob6wn2PO07t
POTe4P7tflsBs0+bf5jfbDaS+47GtWjVEdsLqQmjiuutK6DaIxlpeGPP8mub0OoUVjtC7QfbE3EHP1o0RZoXNnO3ItYeEWtIxLFH
xDEk4sQj4gQSceoRcQqJOPOIOINEnHtEnEMiLjwiLiARlx4Rl5CIrUn704eQCBOz17CHGfeUz8CnMCOf8hn6FGbsUz6Dn8KMfspn
+FOY8U/5DIAKMwIqnyFQYcZA5TMIKswoqHyGQYUZB7XPOKgx46D2GQc1aP7nNQHEjIPaZxzUmHFQ+4yDGjMOap9xUGPGQe0zDmrM
OKh9xkGNGQe1zzioMeOg9hkHNWYcjH3GwRgzDsY+42CMGQdjn3EwBlVCvUqhAcbBl++fvd9YArCV/o3q/9d2f7L5rIlmzQa+2hHc
mFUOFt+vPd98pr7rHVvPy/bHk7UX9eaLeuPFePPFeOPFZPPFZOPFdPPFdOPFbPPFbOPFfPPFfOPFYvPFYuPFcvPFcuNFFW21QrT5
8nYjbbaS2momtdlOaquh1GZLqa2mUpttpbYaS222ltpqLrXZXmqrwdRmi6mtJlObbaa2Gk1ttpreajW92Wp6q9X01rW1fXFttpre
ajW92Wp6q9X0ZqvprVbTm62mt1pNb7aa3mo1vdlqeqvV9Gar6a1W05utFm+1WrzZavFWq8WbrRZvtVq8dU9u35Su1ezjk/Ua+s1y
dlZvTGh3W82urvqOamN7L9MX1RsoPul9ZneCVI/Y2pVlu+9yUm9VrjaDV88xVqa5dtvAeIUKMn3MZzO3JdHutqg2P9jXF24x+L6n
A3rH9hnG5leOkmC+uAUlnLjtfO7BnV7DEqifxdsGCqy/pzr0ZGqXn+3mk3W8QLt/u9qcWj3dUO0V7Dch7oELPN+CC7ggremzZUTY
XQv1Q7RnjpPwvDm+Y/9UaRn/dD2xT9fYB9VMAo7/WxzZB85upvWO2dU7bbSTae+/pSbSfvVASbPTZsWHWNTbStyjKRWUaLnFs7AP
tW+xJvp3Z6R9psNaD/9Qv1rloTUstryH+smTaoeA2109tCdtN9u+e17tkFzjQdjt383T+e5g30yuL+pNaPaqW6xGstf2Qd3JsHl+
1S6/uy1QDp1SjZnui+11UG1P77m95vP2UT37LKp9SNI+k+weKV09sjNvnh2xzs3T1+5B67qlema0tg/0vHj23am9gO2WjZupe8eg
dzmwQI3qiVQX/+piv7BB2+0z9vlUl//mYerl7LVDJTjmifnHpLaRtjsergZ2V9ybQXV/vW3tlt1qevVA8P03zT1ckcVJsylpXD0S
01A56qfgtm4kC2tZtMHaG8rtiqrkQ399Z8FfHrKpQFBogkITFJqg0ASFJig0QaEJCk1QaIJCExSaoNAEhSYoNEGhCQpNUGiCQhMU
mqDQBIUmKDRBoQkKTVBogkITFJqg0ASFJig0QaEJCk1QaIJCExSaoNAEhSYoNEGhCQpNUGiCQhMUmqDQBIX2WOaAoNAEhSYoNEGh
CQpNUGhPHEIEhSYoNEGheccsKDRBoQkKrfmwoNAEhSYoNEGhCQpNUGirmAWFJig0QaE1HxYUmqDQBIVWT4AFhVb/LCg0QaEJCk1Q
aIJC44FC27dX4XIwtTdetbd/PPLZ12GRZcPxr19M83Xh407BNWl7pbqnhSwqye3LcK1f66L2+YuFuxZ+dFn9j//+7+Zvz97MdYfa
O67/cdKrXnwx/ZW9MM+qD/cmo4/XltarT33cSMi66/nYbpqoAzK/HN1UDyyaX6t+vHjxzO4iejte2hvOiEj7a/vRyb+NzT91/Bvz
w7l9y2o/X9OU1SaL5tgvntkdJ+27fnW+FqfblNSckrnpprMf3SNt7h5prr3J8q5rrlV/pmeudlj2bq6fr+FpbG+z6luatrjdllnT
ltn+tsx4tGX2pLbMHteW2R1tmTdtme9vy5xHW+ZPasv8cW2Z39GWadOW6f62THm0Zfqktkwf15bpHW1ZNG1Z7G/LgkdbFk9qy+Jx
bVnc0Za6aUu9vy01j7bUT2pL/bi21He0pWraUu1vS8WjLdWT2lI9ri3V2ibWWnTZwpRQb4V6K9Rbod4K9Vaot0K9FeqtUG+FeivU
W6HeCvVWqLdCvRXqrVBvhXor1Fuh3gr1Vqi3Qr0V6q1Qb4V6K9Rbod4K9Vaot0K9FeqtUG+FeivUW6HeCvVWqLdCvRXqrVBvhXor
1Fuh3gr1Vqi3Qr213yrUW6HeCvVWqLdCvRXqrVBvhXor1Nv6a4V6K9Rbod42HxbqrVBvhXor1Fuh3gr1dlXtEuqtUG+FeivUW6He
VjMood7WPwv1Vqi3Qr0V6q1Qb4V6K9Rbod4K9RbdlkK9FeotxbYU6q1Qbym2JZJ624Fy+82GbqvTlBj5tniUemvF233ZTHhkM3lS
NpPHZTMRhrEwjIVhLAxjYRgLw1gYxsIwFoaxMIyFYSwMY2EYC8NYGMbCMBaGsTCMhWEsDGNhGAvDWBjGwjAWhrEwjIVhLAxjYRgL
w1gYxsIwFoaxMIyFYSwMY2EYC8NYGMbCMBaGsTCMhWEsDGNhGAvDWBjGwjBunj4ThrEwjIVhLAxjYRgLw1gYxsIwFoaxMIyFYbwv
ZmEYC8NYGMbeMQvDWBjGwjBuPiwMY2EYC8NYGMbCMK7mBcIwrn8WhrEwjIVh7KIRhrEwjIVh7N7Cg5YnDGNhGFNsS2EYC8OYYlsK
w1gYxhTbUhjGwjDuhmHMQIerVoirByhx9SQprsPfwk/T4uqRYlzdpcZV1LZo9IAWjZi0aPS0Fo0e2aLRXS3aCkn1ACWpniQlAS36
NC2pHikm1V1qUrUSSD1AA6kniSBAiz5NBalHyiB1pw5aCaGHKKEnSSFAiz5RCz1WDKm7WjRpWzR5QIs+SY4AWvRpekQ9UpCY5rjd
omXToOX+9ix5NGf5pNYsH9eYpThUiEOFOFSIQ4U4VIhDhThUiEOFOFSIQ4U4VIhDhThUiEOFOFSIQ4U4VIhDhThUiEOFOFSIQ4U4
VIhDhThUiEOFOFSIQ4U4VIhDhThUiEOFOFSIQ4U4VIhDhThUiEOFOFSIQ4U4VIhDhThUiEOFOFSIQ4U4VIhDRf1ZcagQhwpxqBCH
CnGoEIcKcagQhwpxqBCHCnGoEIcKcagQhwpxqBCHCnGoEIcKcagQhwpxqBCHCnGoEIcKcagQhwpxqBCHCnGoEIcKcagQhwpxqBCH
CnGoEIcKkm0pDhXiUCEOFeJQIQ4VzVmJQ4U4VNBuUXGoEIcK6i0qDhXiUEG5OZEOFYfS6irrXqyrJ9X9ALfH0wp/6pGVP9McYjoi
piNiOiKmI2I6IqYjYjoipiNiOiKmI2I60hfTETEdEdMRMR0R0xExHRHTETEdEdMRMR0R0xExHRHTkU/duCumI2I6IqYjYjoipiNi
OiKmI2I6IqYjYjoipiNiOiKmI2I6IqYjYjoipiNiOiKmI2I6IqYjYjoipiNiOiKmI2I6IqYjYjoipiNiOiKmI2I6IqYjYjoipiP7
YhbTETEdEdMR75jFdERMR8R0pPmwmI6I6YiYjrQuI2I6UtcvxHSk/llMR8R0RExHxHRETEfEdERMR3jgrcV0RExHKLalmI6I6QjF
thTTETEdodiWYjoipiNiOiKmI2I6IqYjYjoyFdMRMR0R0xExHSHZnGI6IqYj0+5MRzpIaXFowd7exeoBt7Fich+rp93I6pF3smmO
O1q0ra2pBxTX1JOqa4AWfVp5TT2yvqbuLLC1UyD9gCmQZjIF0k+bAulHToH0XVMgvapZPqRoyUSw6yeWLR9bt7xTsLcrPeoBSz3q
SWs9gLv+aYs96pGrPequ5R7dToH0A6ZAmskUSD9tCqQfOQXSd02BdDsF0g+YAmkmUyD9tCmQfuQUSN81BdJtuVM/oNypmZQ79dPK
nfqR5U7THGLVJ1Z9YtUnVn1i1SdWfWLVJ1Z9YtUnVn1i1dcXqz6x6hOrPrHqE6s+seoTqz6x6hOrPrHqE6s+seoTq75P3bgrVn1i
1SdWfWLVJ1Z9YtUnVn1i1SdWfWLVJ1Z9YtUnVn1i1SdWfWLVJ1Z9YtUnVn1i1SdWfWLVJ1Z9YtUnVn1i1SdWfWLVJ1Z9YtUnVn1i
1SdWfWLVJ1Z9+2IWqz6x6hOrPu+YxapPrPrEqq/5sFj1iVWfWPU1NmBi1dfUL8Sqr/5ZrPrEqk+s+sSqT6z6xKpPrPp4mMKIVV93
bSlWfd21pVj1ddeWYtXXXVuKVV+HsFax6hOrPrHqE6s+seqrz0qs+sSqj3aLilWfWPVRb1Gx6hOrPsrNKVZ9YtU3Fas+seoTqz6x
6hOrPrHqE6s+seoTqz7aLSpWfR+WVR8D1azbEqJ+QAlRMykh6qeVEPUjS4j6rhJi3Gq8+AEaL2ai8eKnabz4kRovvkvjxa3Gix+g
8WImGi9+msaLH6nx4rs0nm53RukHbI3STGok+mk1Ev3IGom+a3tU3Gq8+AEaL2ai8eKnabz4kRovvlPjtfUc/YB6jmZSz9FPq+fo
R9Zz9F31HN3O7PQDZnaaycxOP21mpx85s9N3zuzaCpl+QIVMM6mQ6adVyPQjK2SmOcTgWgyuxeBaDK7F4FoMrsXgWgyuxeBaDK7F
4LovBtdicC0G12JwLQbXYnAtBtdicC0G12JwLQbXYnAtBtefunFXDK7F4FoMrsXgWgyuxeBaDK7F4FoMrsXgWgyuxeBaDK7F4FoM
rsXgWgyuxeBaDK7F4FoMrsXgWgyuxeBaDK7F4FoMrsXgWgyuxeBaDK7F4FoMrsXgWgyu98UsBtdicC0G194xi8G1GFyLwXXzYTG4
FoNrMbhuzHPF4LqpX4jBdf2zGFyLwbUYXIvBtRhci8G1GFzzsFIUg+vu2lIMrrtrSzG47q4txeC6u7YUg+sOYa1icC0G12JwLQbX
YnBdn5UYXIvBNe0WFYPrrltUDK67blExuO66RcXgWgyuxeBaDK7F4FoMrg/aomJw3XWNTQyuu25RMbju+q4Xg+uur1ExuO66RcXg
uusWFYNrMbgWg2sxuKbYomJw3fVdLwbXXV+jYnDd9TUqBtddt6gYXHfdoliD60MtH8Rx98sH8ZMmQip8R/7EPdiP3YR9z0RIPMvF
s1w8y8WzXDzLxbNcPMvFs1w8y8WzXDzLxbNcPMs/Fc9y8SwXz3LxLBfPcvEsF89y8SwXz3LxLBfP8ol4lotnuXiWi2e5eJaLZ7l4
lotnuXiWi2e5eJaLZ7l4lotnuXiWi2e5eJaLZ7l4lotnuXiWP8ZERjzLxbNcPMvFs1w8y7uLWDzLxbNcPMvrD4tnuXiWi2e5eJaL
Z7l4lq9iFs9y8SwXz/Lmw+JZLp7l4lkunuXiWS6e5eJZvvpZPMvFs3ztZ/EsF89y8SwXz3LxLCfvlSie5eJZvqMtxbO8u7YUz/Lu
2lI8y7trS/Es75C/K57l4lkunuXiWS6e5fVZiWe5eJbTblHxLO+6RcWzvOsWFc/yrltUPMvFs1w8y8WzXDzLxbP8oC0qnuVd19jE
s7zrFhXP8q7vevEs7/oaFc/yrltUPMu7blHxLBfPcvEsF89yii0qnuVd3/XiWd71NSqe5V1fo+JZ3nWLimd51y0qnuXiWV5/rBvP
8sen9DacsILZOohtDd11bugvX370P2z/6Z8Plsv55JV7ELKiKs+uajpt/6+L2fTq1kce/Scyf7Ikcf81f7b+q5XO8uZ31e9Vkkbx
/9CL/L96/58bi1Lt9UJ8FcU/Pz+rwZ/2GRJnjXb84ln9DMmLZyfmKhtNFtezhX1y6dmFNaM5fWahq19WyPB59bv3H/38bGpJm1eT
fxtUoEpztc6t95g57vmLF6Ofk/dn9j+6+c831X8uNv5z/In5R9/8+5cnn/zX89fm2y2tczB0pGLbe33x9Z/+8s0Xf/i8Bo8+4AvO
bv8nfn/nsf/xi99/fvfBX30bnZWDs8uXPxfvz9p/Jw/4t9LvzcfPX09uf92f//zFb29/k41Pnd7ZLotPvv30y5d/OPnEHfH2AT/7
/Z8++11zAi9Pn01v3r4az/+4mZbpzdWVyWDt2Pf1m4FOM/Ph0TgeRsNMDV9F8eXgsoySV1E2voyGl1Gcj7LRqCjNW5JkXBZZMYrG
r8rsMhsn6WicqXERx5ZEung3HX7ucMqj1VWxurqsR+/ZWU1u7dWXmMWvv7ZmStPJ1NyIV1fWyvdsNh8Ozmp6v+0Cxz9NltbD69lF
ZK++kemezAH/4//4770/N5+zAOztT76w6FTz9vF8bmmsm+G8upm6px///st//u35rY+eV15z5/Wj4+f2km8w+fP+cmHOpIXkPvAI
9dsX5/Wpu97VHGc4uHa+DCuobf2bRdX/mrf86Njkv1q+vf5120W737l3bJ1Y5VYX12+/Xr77y2huH3HsX7/bOoR5rQnCjCTjqeNT
V2+pn880Z+rGGWvdMbiy9FlrgfHsIo/suHR183Zqfsii6L3J0fSHyXw2rS/G+lzM5y+y/KxQlfWWffpvK9rlzaR3B1339Fk1BH3+
03A8v3bZdorxUX/z//EJH5K/8lf+svz7v/9f8DHs+vt/Qgdw2L9KF7+z//q//Xvv//f/+r/+f3pF71e9//h//N97On1Qn3/HpKWT
UWDrbymDgvyVv/+Z/lIfF6q/H/joUP2tx4gX0//43/+/5r9uYKj7/a9uprYGUc9NrA9GOwO8uLSO05UxxugL63hm7TTucuU4fVg1
zMyO7Stf1Q6szy4KM3+9umqKGqvf5+npqjb5mS0nzscmzDg2s+/Bj59VE7V2Fq2iy2KYvEr0aDSMXyUjHafZoHyVFcn41VDFr8aR
yofRKzXSSXKpVJaPouFYDVU2GGo1il49q2orX4+H8/Hy6/F4+o2ZRZtJr22lpjE+Nf+1U6yqFDMfD+wM8OKZ8yBalWp69QTseTPB
rr2NVhNt2x7z2dsaHmRmwjI/lvmx/JW/8vdD/UtdB33gCkjmx/JX/spfcn+pjwvV3w98dKj+Pnh+rMLOj1V03wQ5f8wEOSrL5DJK
4nwcmxnxcJSqcpjlrwavkjwfpkoVsY7LUZy8GgySWBWvxmmWlckoKdL8VZmm0a4JcmvWbb7nhyjuu/Xos+lgaSZ3Z3WzuUVzu9/H
vOfLT7/+2h6vnnea39QTT+u3aSfFf9iuECzG1u31D7ca5vXNZGQZtJ/NbpwR57fR6a3/e2k3Ulxejufj5o3PLrRppCq+z1p72d+2
bzIH0ubg14P54PV8cP3mN++W9ndxpFbf+M+T+fgrSwK2g//Pz6yj509ukXxzC9Er89Hfj6evl2/M59PEnEmTkCS/VK/SfJSWUZQN
h1GcjC6LaGDaezi6HI8uI5Vll+N4MLpMxtll+aqMi2GeF6VSr6J8rPSz967prQO8uWzaea1rZ2v4vr4ToH2Tm5o7F2wzwz5zHriv
tz/hWtskuW4qc0qXg6WdYtsNDO9v72OSP0/7s7n/a1XW6PI7du//ipRO0q39XzrRqez/CvFn8tZ5118uqmrg0XQ2Gl9cLo6ef1S/
8nPvrzMzRrxff/16sHxj3mGB2EtrzNz7uDcd/9j781e/Pz7qH532qo/27Z7N/s386qRvP2AdHp5/NP7JHbXxyG6MjRsg+PH15KT3
80e9nukNezdTWxAbT5+bn9s31oPecfW2Xq8KwpbdTBTXk775+6ndYPnV+LX58Pxd//XV7NXg6vikbw9m/vN2cH1sIv5177g6QK83
GV305v3J6LT3velB7b/tf0/r3an25+pfp/X7m3rfp0v72tXkcjx8Z3q3T/qrF3qffNKzPZX7xPuTk+fuH5eLvts6+o+mi/zajE7H
tmmPTQOemoatB6rK9trVHY9OTnv/y9d/+qP5emvCPbl8d2zPszrae/P/5lxn0+Oj2lr+L84U3jT/8V/GP5hjnPaGy59O7JlWJzq5
7B2b3/Td/lN3ir1ffPxx78iO9Ee9v/2tbe+Tnul4b+bTKui2wasfmzfta+3Z9DPnF35cf74K2v3vdthvbpaj2Y9TG7kLt/mKT/rH
9lyltz/gn83+/3ow/P7M/GL89nqpzDXYzXfs7v9VEmXb/X8s/X+gP3v7/8HC3L7L9Ver35zbTmm4XB8oqv3D/zRYvNkcLobzd9fL
2cGGlOYzr40iNx+zYndhu5FVOKavcYL36KR/cz2ye5zdm0761YeOj96Mfzo6aY5UY/o/tt21hfLf1VtX7+m/HR3ZHqpqkb6ZFJiu
rz5m9Q7Tgx8lqc6MijaTmlel0dN2b21ejvI4TXUxUpkeqVznOlFDXQxTnSTxaDQYjaOsHOd5NBqNVpG9MdHYpy5Mp/1i+nd/Z7rp
M7tEN7ZzMjMbMD//MDGNdqwjnZ2p6CxSJy+mbau64cE2UBX7cva1G1ZMX+3mDX+6PK6Pf9L7ZU81Z3VcfezXvagNwz53cOdxFleT
4bj6QPvmt2O7C3nxW5fStRasf29PzrbzW9fCqzefmqtkPjaj4cKMihc9NyWwhhLD+gc3lJgPvv3eHG7/Z93b64AGUzNiu0vl25fm
GI2wqD5/bK+p0+oiqiRG3Qy/aD7XX8zejo/f2ivsbb/6UO9jM47aD1ZDc/U9bptzfcrrsbn3OUmzHr17m/2IaZp+3478d5/DHSKi
+lQVsX1DG+j1jbn0f65P7KK3dmYXvd/c2HlmfzUzrG+J0151q1z0muu4aon3biC2qsxdLObEoqZBL92193Hv/F++++6742//5cX0
5T+Y6+742xeLF1+//IdPTtzvP/n4xfRvf39y/vpt87m17euLJhmzudEodZrsmu7s0l1tfffTp1dXx+7LTqrMVG+8tlY49W3h3ltd
hdFpdYjq4l7LS32Ru6/s9/vtx1ffcf4vf/dzfJq+7x33f3ny9ybik5erjy8nS5fX5jD9wfL4TJ180v9WvbSq7+ho9d4rI4Bu7IND
H1exmLesXlyMr4zgHY9sHEd/HfwwqJ4VMn3dka3jrH6qFqyPXpozGV7djMaL4+a4J06RGeV2vPomq+jcuvhR73/6n3rHLtzVJ49a
Y7TmcQ0TwNvZdLacTSfDntONlbeQ+e6TWu+aL3jIYapl9NoBx/SLrs2t6PxFc6on9tSXk+nNeK0Zrm5c5twXLGe/n/04nn82WBi9
2a8vkOPzb/9lcPZv0Vn58pfnr02DnB2tvfYvZ387+3v366OTVepVFK2lfLV6/3Fvs6Xqtu19Yv951LvYenktEfYty8Xtt6xlzr7l
r+4tdQZWEdh7z3bbVQ99fmR62LrX/OUvqwvUDGijr23PeazNuURHthM2Z2r+17WQ+aFvf2hPZXXsesBrbmk7qB5Xl5t+WXUIt3s2
++v1+6/pK1zffbF+55z2xnZOtPYbE0V1+Ohl/8r1Hae92Xzy2s58LtqXTtePb1rk858Gw7qvGNUhWzse6/djLpuR6WZ739kTdC1l
zva75+7hwra3do8X9l6b9y7cC/YQpgFuzPVqjXHMl81noxt78K//6VPTgfV7v6/zdFEduE2bPbhpy1WPZi9mG5zJj7nfZpeXi/Gy
6uDW+qO57YvWm+zEKp76k7/c6HqqI5xW80YzFJpvnPfXPvp89R3zvmnd52Yyt+tIJlAb5nxsnyB0HUb97v0BbiiT5gD9xfXVZHm8
EdNJm0p98nz9q9oPNXfcxsfsSTa5P7HncecXnrpzMpe1s3lqO77mYrAWZwuT6Xe9oZsy1prg3qlyffbj0Vl1OzkZdto0yp4PrwV/
9nZwfe9Ee/3mWCsZ9MyQMV+/3m/MLXE5sfZYZpp/6ib9tg3tVWa0lwnG9oC16Vh/MH/9w1ovenZmJ7pHa8PZzHSCV7PXx1vRNIP4
4qK9IU7bW+c3rv0uNu/n7RvzK9dSv7lv8Lf5WTXheLTn7U1T996vzria2tcnap/YOo7cHbZ2ibp721yl3x6ZUffa3P7rc0031FW/
bn5a35tlf7EqT9qf1iau28dZe+n2b5rFgOZb7JzX5mHt5/qfzhTtXf1Ds/LSfNXGQ7Lrb7jv967R5pOFi2k2XX9pNYqeNRZv7Xvc
7WGug1vHbV+448Dta/ce+eW6hlrXqqMNkWqv3mrwsoPdPa1olcYvLl3WF8tFK0pPNsf7Wkjf8b7Tttfvvb1x47W7LdbGrvVvPm+G
idNbM7TqW+1Vt6bWzXceD8zA52pLg1qy953/n1t4MRfc8av61yd7eo/2sPd0G6u783ZHUDV1fdduToZqxbXom/Gi//rfVu+2tQk7
sk/7zoTv+Nsj8xub4LMze2If22aofny7nLwdf/w/R9VPsx+n4/nH9Q/28f7r5ofpzVvr4Fe9w/1q+G+XR21vYn/xmflxfcZilMdL
Ox+pnrw0Y/n15Np+a/VoZfPz2hTLxPj5fD6zoQ+sY6Wbyn81XlybV8fH9hyrj570bb9zvD2Drj5j32a7ETt8GEXXHHO7IX9Tq5/t
S6F+eTWrN5oyS2xEa59bTV6Pqtf3DT31h/uv7FtPm4NupXg0Hs5GbvBc+2T9y6PtaWv9+91z1pup7ZXuuRJ+uit/9WEfl7fqa3ak
rnrDQ7JXv3MtgWsHP9mc6dkhoblx1nulV/ektmrVpt3ert26vU3B4w7QDoVv3Qi2WH3CdTjud0e3P7sx/bWfqebFW59u6kqNlHw7
mH9va9lNiebvepXuXcxu5maSXClVd683CbPgiT9Nx73X/za5dj25EU0Lc/HYO7/pK97MrkaV6nUrpM0hKkvIsbVHdWlavpnPfjTN
byRWhZ0wr7wamH6h3/vjrMF0WGtYu4pv5svTwXzuVh2qQpw9/s20klTWM3Rc1UV+HFgLU3tHmJmH9aa9ftdzOs6p8OoGcMNNbzJd
znrfVRuk126U707rUpwJt2eHznfNm+ocmjeYY03ra9bZql44T9Pvvlu8eTGtv+PsrH791hf0/uZay9wIvbPPehuHdgexx/q0bspq
ctA7XmvpKsX1LKFO+3oncVJPR+rKiX3XRh9SXV9uhtb73CWjnbS8sbXQauZim9FOn66N4DcK7cqK3bG19rUeprYpm16jvrqqa9eG
/rfeH6pf/a1XdXZ/a87ib+bFs7Mz+/8X7h+u2nf/rdVenWaWcfS36oTXL+fvzKGr31W3nr3C27dVl3r9NvdFG4dzLV2lyrxo3lb9
u6qqHJ/3f1anZlL+/vz1Sd/dv67HrHpOl6KjB3W8Z+5KqwV/8/11/3Wvdn6QUG5a6Q/bQvvWO2xFebz4X2vD3DveuH51XNx1rbRv
+Xqz1rZx1R1au5uJve2aajfqT6ejPzbdwVfj5cDOaC7W5oEfV/PSai0TvWghfzr7c8f6Xz0X6u479qz/xZnW2/s/sjiX9b8Qf2T9
T9b/CKz/yTKeLOPJMp7/Yt3TlupkoU4W6mShThbqZKFOFuoOu1D3oNW4Xatvsrgmi2uyuCaLa7K4Jotrsrgmi2uyuCaLa7K49vQ/
t9d/Ol36cX/2rP+kaRxtrf+oLMtk/SfEH1n/kfUfAus/8vyXLBzJwpE8/yXLSuGWlaqlivYetOFRW/tZnaSdjtiOtvdsLanzgQ36
72wl4Ivl+G1PmU7XSPozi+SwFbtVOcD04W9fXb17MX22OmTzy0+X7f2pX7ZjYfWF7TW89mYLzTB3/AZ/pCpB3H2kI9P9ra6SF7aE
vDpaTdVoxtrmML++/Zb1L1r/mnrQbT5pG27r++qJ0cZXbYqV6tNWrAwHeTQeJWk2HuTpq8u8HCaXw8vhSKk8L4syvUxjPYhHr+Ii
VsnlKz0ejoxgKYpiFJUDVY6P6m9pSsv1Bd+czZkZuN7Wiwj1l1bvX78Qqxmvq/A8PLFHdWf1y+2WWcvcL+vLqJ0pNq120n64vgXq
D5krrm7we26G+07P3BgTW0IamR5xOVm0F3xv8Gr2w9gaDK7dC5Ppxl1UXfbvwy78yiqrrLLKKusHssra9eOQt+KSRyRlFVdWcWUV
V1ZxZRVXVnFlFVdWcWUVV1ZxOT4iubX+e3se0sF37OE/a50mW+u/iUq0rP+G+PPBrP+6cQS/+mvDOMja7z2Lrkc3y8vi3hXiVf20
UlcXvY0iwh2Lw67adjVYLL/YWhPesR48u3Y4aPfR9aJ3tbjiCt5t5W/j93Vf3xxneDVbjG8dqBn8Tt33rOKo3v3r5rdb5fH1qqF5
w2l18GaqeVfSVjXwfJTmeVZYCHFWRHmsijIfpoNxVKZFahJkkjca6LJML4exHmRRPBgOiljtmxht1m9O1grg9ZU3u5mOBkYb3W6B
B6/1by7dt0dcZeteBWC1yJUZ0prxdvNCbl6th8z6KmyG6kYQfzkfX05+2jkKr5bomuBO3DC7nLuB+cvlu40A6ibiNaZy+nPn+N/x
FrC94/8t/rdOInn+P8gfGf9l/Jfx32v8fzVIL2M9FCEgQoDfn63xf/3K7Ow79o3/cRJv+3+oVMn4H+JPPSQv3i1M/2r+3y7andpR
4rTemGD+e/OqXsc+7V0Op8ur08oByb7ddBw37j2T19PBle1YLid29LGHMd3LYOR632NzeLfY/616eXLy0VszvIxNR7i4GrhVPuuz
bt9m/nt88pH7iv5kNlxeHbt3tF/X/+aLP3329T9/8cev/2vzzX27YHJ89E/mjxkgctObZFHk1lIi80VD60dovmB1Bv0vXTzfHs3e
XleLfbVj3ZGtDtrgvz1yC4YvX9qdd03Y+uKlef3H0cfNe36czb9fmO8e22W/8fSH9gXzb/urxdIMmh/X4VeLS2s/jefz1U9mYPyL
kTp/qe2QPraWhicfmbN1I1bVBCcfjcaX5r2z62Pb0jdvTSbmdv35onF2cqfav55dXR2f2O1Ff5xNxxf1rqaeyWz/+8nV1fXr4/p9
1uyqyln/6y/+yzeff/WHk4/qn6v/HG++euq+/OSj5fxdddQf39j18N3faqvsl257U3Up9av/HH/bXgCmfV1L9W0KprPjE9N039b/
H/XVybfRy9Xh6jO9tKXWXnWIzRedN1cT4PYfI/zsbsFZpeqOmxCyNI2zk1ufGP80HF8ve3/62i3G7Tziq6OjWy+bMO2rd39uVkuD
4/r0zbXRnv+p+9xmPOOrxfj2kbbO53ZT3ntuJrjpbLkjwPY6W8+/Te3tY9k/r0wA3996pT3LpqWrE3P7+K7qHO35ourqsmulx3bl
3t5DOqpeam+P6ujm4n1X77KpPlQZmNnVohNRC7v+bI7/7W6eTr9jz/NfuRHa2/N/ncr8P8ifD2b+Px9fz6yWaHbcTX/o/5fP9F++
+vzLP7XTIPseM+g3vzef+debyXy8Nsv+z/AUWW0xeV9odSMZgXQ2mw8HZ43L9LlbjF+cNxPP89dD3YS+UaJoLCxXD4a1hYJ6tfau
h8fumPw2b/eZAG9+cbXuu37oahbaTkGbD1yvJrCrJyvWZrBbn9+Yxa4qFHVDGPlp143f2betHfikSvWiTvK9b7PZHw/mV5PxvJ1g
r87e7QZ8VW1QPzPHOXPPXNxMq73Da2k3t9M/3f38oN203ot7awPBfY8QmmN8vV4oahKzOvZm3aF9/697t5q4XmRvU7JWFGjee9p+
4doDPy+mf3/unva55zkyV9C4HsyNONhx692377mup931tODDDnxr++P2EZt9DXe144M3RB2tNU3b2htH/vX6Gza+ebTZ2OufWt2F
bh+ge6Kv2bBy/O2nZ/+1eg7rl+cfv5i+/OWJK839/flbo7zG7XbCUfUs3Kr2lCVuq/u4Z7eNjOz+nWbTVrUnar0X3ugD7eN5m0//
rQVUPZfXVp7UfZse15+KMqE015E92pFrxyOXpNXexubpomu3K//Tdi/q+db+qBe3Nki9sDukjr8dnF3aZ9V+zpL3J6s9UccvRqbB
+udbbdU209YX3jMebG1/2fqQnV5vbzW8a2vNH2/cjuHtT+uXq6v0zg2aTadz5rVT02ThH7c3U68OvbF99I46av3pU3eJ3rmrdHs7
cJ1aN9uv3nF02gTxuM2fdXXy3k2mR/dsLZ1ML5rY6gnf6cO/9Nvqk24i2hZI65/ql8y8Z/WK+eFluzX1S3PZTxbjvplzHX+7sU91
LZ61jaqnm5tZ62PeelPz4WbvavO+6udbF+F6mFEbdb3NdeOdayfh3rp+urf65K8q02/bTTT303pX8eJv9m78l+9MR/Vdz/zg7sBe
9duNe9T8ru5N7JMtb+snW5rHpt+au6p9bLq+c97ae2X1qPTbb+OXVWW6PpnReHz9uTuh9VhX++N27O61b9x68LzZj796UsY+Ie6e
KGhfc3WkxT9PjDY5Oj9afw6d4Rbh2492VSph7wNeq8dF6+fye+ftoGcf12suh7oX3nzka+Pp7Ae2WtVm7SB/56Pf52vPuD48gPpp
sI/ditn2o7H19tFmB6p9x62mf+Djbc1JuES47Y6mUc2Iab++OqFHPP1WBe3yeM+Tb5tK3Dbcajt1tf262rK92ng9r7datlu1V496
Vd+3aMKqw6/k9Nnk7aB6dq5d4LwTM2C3S7tnsOqHddYfDdp8Amj1DNFDxGBzidx6LMd9o322e/uZpA2tuLqQqyeSuvnKex91uvO7
51X/+tQv23gYa/UFffP2txYW4i5LN367fnd1ere7kbWmMhOWxfrDmdtvbc9r8z3N9P6yvrSbS6GqUtcXw7cLI0JOe+YrXtprYvtb
zSU+n5ju96R59nvzGjeSwEpZcy2uvtz+8q25fL+qX7jrGewmYvftLx/1UfuexfLm1dfjoblNvh6Pp984UEpUv3n93OpnhesQ3Qlu
hHzr7G71J+6NzTPHK6zGve+8lYrNM60iern5dPpmzH89baY+VbzbB74j5q0bxz4pf9e3fvvXl8+3PtF0+dvPq1UfP1m9fetkXXxN
s/x13/tMFzNuW8L9tO8Tq7LD6b3Yln3HaIbdjfG4/dD7j5r/fb/Cqgzmg9fzwbXdVPPsz4ux6ZFdd7wcLL7vLWfN8yq2aPHajr7P
e3+aDwemfx++Md9g+267kPjG9OX2qW3b8ffcG804ZosTpqXfDK7txhH3oMyP9uEW93SNCd5Oa8zUdGKfADHftnCXhHnRPqRjH+Vx
A8Vb96yMuUOrZYKqlmhDOFr06qW03puJHRfe1YtV9oF8u7ttumzfMFn0ruxko/eNfVBnPhmZC2Y6Ho8WvemsDncwrM7EDkrvZjfm
ZRuBPS9zyKY2ZlvDPrIyGVwt+muIidc3k9GgouPc2mdhU2/kvj3havFx6fjr3/7cs9QR84oV20fVs+IXa+l4/7IGATWj0s2Kn1Pf
PQ7T4x7ZN//5Ve8Pg+Ub05X8tOpp1rgA7e/U6k7sTX75y02+xWD9PorMTWQl8frvlP1dA6q4aXkFrz6x61FLK5mtrN6+tU7cUxNN
KzWqxGJ0mh7M8WMGFkHzi1f2Cf61HrwhItS9wkVvYnuLgemubbNOrwe2qNC86mZUq2dt60u+Ornv7VLfx71Xe0L9xXqoq+gGTdT2
dXuophkfHOt0Nj1rr5Sm36qoKdUhFkd1ytfy+9cqv39dz++gzep6HOZNNp021q2TGphesDqvrRfsx+1re8+hjvbCxFFF+H41Hq8m
QdUVcbo+oDbn+5l76a6Jw+p7m5Na+/jtl3eKhvbu+U01d7ndjbbvuGMCdEfY/2yura8e1D+3V8yjj7vVZ28eqBa1N2/fVrVyq9XM
9TsdVWSGeX9oqyZzxzwy+T12qsw9oN7oXEsr+iGK+4OFEXVnVe9+1r54Ub04Gru9F1PTkU6G7UV6Zvvso/UzOq4juX2S9Qv9Stxv
JLH61f0fWSXZXSWnvYdkvW4IdyM3TXE1HkxvrmviU73fw06f7ezFPS56slFHfOQRf7QlhzMzIJxdL9+dVRtBNg9f/bBwIs2divtg
VP36crC0KyKWIHdzdbUdib1rV7lrJyabvfO1iXezg276JPup2z28/eK6l3aPxh5P7WlVV4pyhYXbLV2FfIcGvZXQ0yoec3l9+enX
X7tL6R8//eL31WTyvdvOsKGfj+8LJTrZ0LzH99z/jsc3sh8b9avL+LOKTmYu/t/Y3Jy0PZObBLZcvJkV++sS++KW5G9RJ/NNLb5x
LV7c0Vynvc0e7qLXdIJVI13cvhFqBM/OzZn1OtBXG/ss/9ws9jScxM1JtulP7FVit0uNR25p4epd884HPfdZv+m3bspn2vatuda/
tDlpv/Cxz33ufqhz1TKLL9YfB14d1+XxtF0E2zpcve4mm0Uf8Kd/XiOsDvgddlNHnqb37f+849+53RLaSw8YU/vnP/n+jzb/kXLw
sjN1Vq07usGs2gt8dv3Oazvw4/f/pjqLZP9PiD+y/1f2/8r+X9n/u/5H9v/+5/mzGv/19vg/n70an/114b8beM/+3yiLt5//TXQs
/g9B/uzd//tz71NbIPq9ZQF+vZzNbW3y/eZ2YPPyX97MZt8vDrzF19XIf3LFbvvBW3GtNpF+P7Y1sa/fvX01u+qbYej4yG5WbfcY
1ZzUhZ3N18vcq0Viq0heX81eDa6+eTNZfGsOZbnuH9udPON/vbDS4vrNYGEL9PVCs1sCODpd1UWj3vvnH41/qhq2sRdwaPXj7ydT
uwh+bWsktqZSMxBHdo3bbov9+f3GirPbAFGddP/1eGnP053l2gqt/VDVmdrofvlLdwr21E57m1/WBviFmUAPP+lPRrbO7r6/KrLc
WMLYcjI0n6/esfEb++bLgRmK2vOvvsn9cGo5sNVJ2EpLbVPg1nfu3CTpGmOxWhreps3OflyDQtodCLY3t2drT8wWSbZb10VxfDV4
Nb46cXuu2tAc8t38+nlzlCoRR80eU8cztW88qoCUDtu7fXjbErO5XTevxpcvRg9Mk1u+GJ5U3Dl31TpBcXz0aX1Et05mmfl2cbLJ
kJFMVt7aKox7vd5YspWQj13xxb5Sn1KzGuUAr23EVtn2qwvg514dfV1qas+vWs46NgP5VXOxvJ2Nbq7G1WnWLWfD/3I+++ld/cbq
ujMnbHmVry3i2YwZ16ul2Kp1fhhc3dgsfDW+dCJw+/2OW/l6vGxXI22b2SWw2WX9WbtAcdTEenTShONebD5U/851Rr1jtyPs9cLh
TFcLw7ebqd587sJuTvzn+tTdNe1eqmqvVmbZovnPNa7aYsteL76NjVStqlv1L/RL0+1duDv5/dqybM09Xj/Y+qJ1heN/M3bzFXef
PV97bdX/zWdXmxsnLfiw3sOx/gn7dZsY2frTJ5vf2vYkN1ftKuXde0zqz29uFFn9qUO3x+lXrFxznq6Ts/vU3K/nRv4PNk/s/VbI
9ijbAd5xddu3nbk23M7aRpvbP9VE5fgXjzmzJtLtSKoY77jVP6lnTabPfGU6Dut0Ud3xd7y3fmu/Wv57vvUF1bZNt730ajy+PtbR
1vm839c2dewPa5/V0Vb/Wr+9bB9+9a69X91N1e4aeL7aNnByV6f843xw/Y+LurNY70/qHW6jZiT/w+D6eL2jZ9DR3NPFNOsxbmyv
j+16hehldeNP3QZS24+Y03ch1i+f2AG27o/aX11s/+b5EzuzjbQ3j024RYeP9yd6u/OyJRR745gWsidh+sLj1crP2k6e7c+5Gdva
B0djayFzx7nd/rpVMpodzeYbZ1c/jOtvPunbkfH4jc1GPZi92RrJdh6/3sC++pr1S7A6tfWuwF1a5vh396U/bF+E5p3m4tu6kesv
ai7AKpb24jMXiLvEtq6ve+96cwLm62bzd/01b5k918Hm7d5cASb5212OuQ5/uKfXWHtro9Jcez24k7Ct//vZ69dGWm11FM0B627k
Z/dWu0Q1uLKg/fp9rnJ4l2a7HC+Hb+oj3zrm5u17V4O6j6/uquYi3WzK5nCr+ULffa49vAnsrtjc19Sxza7tr+rdy3cE4saCeopx
dH60CsBuEZoPpgs3a1q2e0Sa7cPWPuvjXn30Kqy1jQPVtqX6QQb7w3F1kZnA64+cVsdodvNt97ZW9P7cm4xWc476jdUld9HO7ZpN
extTutPt6YaTPM3V0l5L7fA5v5keD08bebdX1x3VX3r2avx6Mt1QwGZ6+WbmuK3NXkL78939o3sIon2WYrM5dvXE7debjmXjy21D
3bhl1urY/eoX99xG7i3tjXSyeSftvlbO3PTmgVdM/Y3VYe66R62SaO/ROslTi9R92CTormQ655BhU4RepaP62d7ft3N9xwlfm2l/
m+T2GFUlvXpMaO3c7WmM52snfmsobHjuFbN913dWmX34N67W/av/9u3kvA3jVtdZ9ZUB6j+r+l+8Vf+r3UXOrOWCXwVwz/pfrJJb
/N9MSf0vyJ8H1P/ureS173A3SV0Xat/ZP3cVZGt+8rSiX90LjcaXA3t3tr1RfWEeX0+q/sdOnG+m1rJmPF0f4RyUbmN6serQZj8u
jpsRrb75rid98/dTu+n3K9OhLJZGS1Xjupmz2aMfn6w7HzVzCDuU9O1ymr2h7b9d1a1+te3v647+tLfWU7hfr35sq3H11urRp7az
6Lc/NMesNuQNrqqXrSPa8N3wavxJf/XC6lDNKHLrzasXmjdXo8tqr9RKoVV93/HmnrMVRaBqzFsPHLjns9qtOJvi4dp2OrMbO/+z
eXIq2bbixtTsF+27/va39hPNiGmnak2rbr6+1qL1m1a/ObmtGqodY7Zfrw7m9PMqX/Ptvr2uoDVZd5vEf7eW+rWx/P3ayczX0+P2
/a39bONsTmA9jzvDbd521E2QLg+LOg/mkGty4w7P2bUCVLNztIYd3OP601wI7eVl7rXZ9PioDvwvbh3cnMrxX+rOZLj8aW3od3WX
5U99dybVKbjJut2Ud2Tz33QAzQSuir69dKsfmzfZPQe77vbZ9DO3oe64/vxJMyTfDvvNzdL6K9jIXbjNV3zSPz5pPjB3XzCe11vn
jo9emzv6rCk6Vyc4qn1GJ25H+G8n5u5cDF6Za7hZpOitFayrGe78otFIdqqx3WKrfvBf7em6+rh9X/34VZv/rSbq2cP0byb96Wxp
87YWa23r0R6ienRz/K8fO5NSu+BwNJlezo62hGoQGSN/nvhnpf+SLf03NFfrbNrFAvBu/RdHSt1a/01UIvovxJ/HUp52CcXhtd3S
8/ZqMv1+Uy9eLqwWtGW7W8LSSpSr6smynRJzL1uqVouPF5prZJnzliyzcbQHoKX6s+930qWazw7fmNDswNkuOTenZk6rmX9WoT6M
xvRmMJ+aA5/X29jsVHMF8WhpyDsPtVr+rg/SPE3W/tKGvvXb6mGGzd+5ByE2V6fcr9rlqa0c+aO2tgsV7fPNleNPOz1olgbqYp57
8b6n5ZpGaODU1cNwzRGqYvkaRKZ5+7eTl/35bGZtXX9V/865dx9PLBHJDZa/robGew9VJ+jvv/zn364czu0LVVs6164dhzg+b1Nb
XxVnK2RPbZ3ehmZDrQ+2ptkXVrPXqd1xzgt7pOptv95Yoa9XSm5XkNxKf+U9ub6ifIfRpV0ZucOycufj4/XDOb+ZzexzObceJ+9d
uIv0jtqze0K92m6wqmRZvLXtPdpr6Y7dCW2ltXlSw37oZO++h+1H4t1XtRsd1hbkq8Y9rqvCVv0u3DpqnZsVCmRx4vY71L92T7bY
qvMtwe5uxFuqvEm12/TQtk+lKttYbqbLydWx629Oq70Up7239s6P7Wi93nLmrG0/OZ5f2rYzotWoyB+dUHy7sG1Tr8XefsOv7Ecr
B+n1lTz3ncf2eVTTAO6XW2tyt5dL05Pq2c5bGy6+mby1RnIOueNoGnarSAWq2Dhb0zjjwdvjyfT6xj2tNrWPGq+fZFXTM9G5t9ip
61fuN2tcnHrs+cZ0M9VDM/NKXtfnb7dtrE725+pczIctI2s1CtS1Q7e7s24C+46Tar/l8ya0FuRT/fe4PtjP9Ym09KWdKV7tNzne
JF5cv9vsz9fHjGaxenhd09lP3QfugD+d9qo79KJ3bfv5X1yvoWzO7TD+l6piuqipNhuvb2EHj5ptFdWX13pjY7DcPOJpFX8V2q3X
7MLZrW5wZczsnuqvDZaH1fRt0f44m4/MBHw5qwu8R80TX40h883yTf3PxXI2/L4W1vWv1kvDm1X5l5uFlnXj4eokWufhllxwH2ty
o+esPmFHuxrUeNSqq2qJ7XRtMe50ff3sdH3B6nRtOeB0bWdUo8ue9VeVv2fPX0w316PWV+XsfbjVIblTsz3iyfOaceNObbNY78Yh
c6xj+6i+PcF1sk21oFc/MVjD9eprqXr7upXy1j6rnsmeOZueUaoL95Tl86ap3IGacfaur33erF1tukFvJ/6k+dDx0ZagflYr5WfP
nbV39aJd6/zHW29o29R2wmubLGwGn21947OT503mNyNbXX+rKtN2bNWSa5vYbS2/EWr9XueEOrj60+7PNWdQO4dsrQH/yRl2PGsj
XDuHtRjv7snsh760e0Hb3Zi2d/5qtTQ5t1sXv7T/+bqq4XxWkRdOLpqtBb+qPmGXYsylZE/xrvWwTr/kxXRtDej2WltVWmq+9Yu3
11fH840vO7G3y/sX03saY/0T/g2yURncvKg2+rE7rqv7F59rq/f1V9cXyX++4wKoG+znNfhGs55obsbNTZDtts3ntqnXqv73fXp3
+bPqV9tpRK9Rkj+v9Sh2Vbta6q76sK2HVFuy7+DSjIxbL1azlxVRoV1BvX73/N5BfGHedH1cfWU1UCyXV39YuM1PP71rthWuj+/X
rdiopl5V9/u8d92vUurif76aETl5ed3I3McJzPZLbQXRThuPXt04/Obc/ccNb42MONqa3FrE0ZmzZG66rMrefTieDuaT2d6P1++z
Q23T9a+wV2dnw8G1aV5bi73u1/92v3enZH7r/ruGZmseK1tBIKsC7ENIkqvpdNWa7liuddYH5qPnvR9mk1EjRqtnWhpy5NB2Bu6d
vzQS+eSet5rvrd/aXpuOFFVHNGyWeqpTuplftddCpferPuf8zXJ5ffHi/MW50vmLfuT+qosXo1++OP9B1RQ7d7V+0v82etnM+K03
tvkyW32p7qTrfv37P7svMl+3+m77HP7VopE41/03M3sFH/XNbLYpazSZs/e0LdmfV5/pG/F3dPflWL3h9JYian7fzCbXZ/IOpWUC
PLXxVa3Ttl0t/uyu/5upBWf17DT9fG9dZvvS7a0u24ceobl6HV1t4/rttddur5nY//q8/k29u75XX8a15/daPea0V5/uhcv++20R
7O5TK4K/Pbq+uql2WBzdTG0HN7hymLzblaSX1aZpN2/4ZPOTVqUfVR3Ty5duRn6yJXTn7RV47baI1Buo7kiBpT61T2721ptltUZR
OWj37C1uQpq7e28T6+GeF/vMQSCitqe9rbkfdkFWz3+uLsh2x3b1POyO3ccbGr35rD2WWxKzkBE3wTf/+ufJvw3mzV4pSx+d/fi1
uXoXb9pfuUvnz65i1v7uX28mdrN6NQ1cO7wFeVXraV8YNfuNHSqs0LX/vfOOquLcXtZzxzpZrwFdbxQyHCmlqca1ex7X1fT5i5/U
qxcvv/2XFz9F+ct/OP7kwv7jb+63L05c1eroZOvd334bnX3y8h++7Z2dm//9n8/+28s732de+ctdr0RR/cu1vXlbg+nyZnJ8fdrs
NaiftdisdfzgntfZumvsk0du5vjlp9/YR5KP7EON9r+///SP/8VO7eq9p00l2T1fdNJr/rVZZna/sl/wp1d/tZtJzfVrBMqxecUO
Nv/0pz98bmbU9eX5zR++/O0XX10012xdijQ3vb0D/rff/pe/fPanP/7jF//lL9WnNt9VM2uaN3762T99fvf7BuYCa97220+/+fTO
d9kHPZs3ff3Np9/cfSy3Z7CdzNe3y+XrzXKDZRDYO7pVIA0o/fpkbRC/83I1x7p1tf7s7tmLWt+Ygb15itv+qv3BPdC9OTy2mqWy
LowbxXGPn5/7btsRNpeP6QuNnjBX/XhqFfbmx+s3OV3T9IwPFBsWLL2mNby0x3zwo5Meto8erfEx9wiReg+N+bBVI7d2gTi2cdUJ
mPecrPGZdyiLv7MRfLwGnP/L2ctfmq5g7dmV6sEqG+hqfv/W4QVcYW3UnKP73fOmnlr/tMY7PLn3FO8QUKZTuKWfblUgkyi6TzrU
V089Fm9cNqvf1QSp6tp2CwjtRXTUW7uI6k+sXT2WtGQvv2ZnyIXtcWc/Li4cGGE4u7p5OzU/ZFFk91eai3wyn03fOurg0Wr96CLL
zwrVM2P87Ee7l2Frl2g9YttWOrX74HsVE3zVua+S/Xy1jXMxno7cKGDV9GRZFY+3dwU1HqRrl0tjEFq/rcnNZFo/XF7J4N7RC1vE
23j98sqm/+R2idj+uNrsUHPdh+P59dZXV+4IlXFpu9owr2G1br2q2gjxuTmzk3YNYu0F+9tKhbhFiup4Z2m0eqLnjkvEXGJOw1Rt
Vb3h8yq8izbOdi9w07yvzbx7eTwZLW7t0q5oY/Ud0axoVU2ytNvVXWKOzluQpTuSi8AcbV1EJWtx15lenyisf0Hv1/X3OsyY/f1g
eXym7GSrOrxj8K9vE7l/Ujs02tQMeKNrE8myeZqh3qF+63nZtps+W3xd0T3eDn46s+yA1Ub+ZkN8TRSwu9/i1M0Df+s+cuQ6Pdu9
NO+sdoifVLLSdSpHZ//bURtF8/r2x1Z1hc2POlWw8fjnRe8348HcNL5t9js+viUx3tgutXnbG1ckW9jTMOPGrS96cyusV7PRO7d3
6sYMpZcWrL35qTM3fN8aOtc/Xnd87YeadfYqOU2yTvpv5uPLdVhhfXvfWv7ZNdh9e2SvgCM3nNpvfKhhQ3PEb9f8FlyP3oj+h3gk
rA939zgkrA8Xq7dUv125Iaw1wdLteqx9BM7/6ZtvvjRj4Ne/rNwJ6gl1/Y3OR+XE7m6z+zNXR3Ep/Lhuhbafcj+sjGTmL6b2/50P
UtIO8m4KMnpuMSmmHaufNqcnLsGm5+4N3bTxZ3eDOtHq3vzJxnVdD6vVS9uX7Nbe+ubph7rmaOn5ZjBy7NK53dp2x7LgWe0bvcpa
NYNp+s168tj0nfZKWU0AbTc9uIPkOmi7ZdevNUGtJoNvF+0m/beLatet1XJ17n79se0K3XPAVZtXT/u2O20vmla176j2BNfN43Yt
tjtza3R1+2r98ydrDNzqjYPl52sHcT81L7qvtglb2VC5YfX9SXO9txJn6wmD+7pbM8JUOx9XXa6DqKyvf66Khpt985GtCNUbI4/W
H7U5+vJPX39jPVdMpBe1PDOh18t4m3PyJh3aDjebL9ZPys37ty43N52Y1ys2zZnefttdWwAqEsG6fqm2KtwLK7iTD1Dtgf2q3lV+
9+6GfVtm7c6Hh1lM3bPjtikhVNsd7ojSHm/hcKZrQd5BN3UXavVoZFPYsUP5+YuqDf7+3PRzC7tR2D3naq7Fo2rd9tuj+pFj91/3
PGX973+sCFtH62d09HKl3Of92fU9Lds6FnxeZWre+qPUY/7VZFBtTtrc6r9tFOI+Vu3EXp1fvZu62pDtnl1tjldvha6GNLvZxV3W
i1+fV9vDG45CMwm92gZVLNafFXAVqOa5uLrZGuBrr76VL9pvft1+s3smeLUPpf7lqpJxdmamAGebe3rO2nns2Vm15Wf1i+/H7359
VGMxbzd1bbVyTzvXr95lm7DWwOv1vJ+rTcH23O1GL7uzYb6+kHs1WFTS1B241oirpUr3skmM/W/1WJgrdH58m1Y9d48nNm+1m1B+
2VPujSYAe6m3v3e/eV797CTqL3/ZzAYdlraJpSbEutHnojqNse2E3b/cBy96ql4uslFd3BmSe/xiedcyTvUt7RWy/eH+sIUEq2qk
sWyX2uSnatGmTS9uvWp3vty8dhfa2PJf6nDrg258emOCUu9Duvv5P0ekPrYbhM0XTJbV6rdzazmtdxkuarMmV0NYv3DsELnTBfMe
n5DtNZHKGu8L61Xopif2H7bi+x///t+rGZMNqzqJF9Mvpj/MhrW4/s6Wc5pdmR/bonuvqeHXU2hzqPVDmlC+q5auv7Pv/q5vj+gM
dppVl6NqNXRxYV/57rvvbOzVfoX7d401zVWN6vqkbnDz6fbwd2xBqRt3887abU5kG9Ut5NU3Uxv0393dgNVXXGzU0W1IGy6Elemd
aUz7rg0XCWdAVLeDq1e4TbXm0qvdqFxNzBYvquqHrVJsv8MtFpt32BG+egzC1TL+OvhhUP/YXJ2N69HKOLS+WmobpLYp33+0/8SH
FSZ6vDbI9KqCTK0wV63QWhfarP6+sQA8rgYwa6npuHa93//jyWYTWRm/3kDuIq/Ow94Xa0Gbf7v7585i5nq1cPtitRasa2vRbU2h
vmkv7v5I62h2m1jvDrUyN7u1JH3vVL2Cotc7yNau5WpWZ6vipu9pa5AvzbVrmtpInapm56ZMllK5KtqsT6OqfvrhG3bX75frqqze
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
4aO3ppDOqorFqnBuhxfny3Zt3jwxl+Q3f/6i37Nk8+bY5oBNRaD3D//grptKFDU7T9p19ZH9cK9BJP7DP5z2BiPTG9sQml/2rGWQ
+b3pHupdTQu7MePsyto69eypmVH77fX5n//8xW97LePefYMTy4veq3e975rtWWeT0a+/6/f+OFu+sT38ZNGsaTZ+fss3g2VvNBvW
D2hXRg1NElyDmE9XHeRqXHRPA9otC4uem49PLt/Zc5jMN+btz3vL2dtXpuWm4+oxPPvl5uym9Xu/67evf9db3FxeTn6q23VSNUm7
G2EwtLFaA4+bdutNv2cvNNO+U8tD/c7cm9/1ZnOn1F6Zs21HAteSdVjVtfTcvfu8zs252wT0nWmPa4syqU/ItrW91sbDG/fJy8n4
yrx4NVsYxWz+/12/t+lX9NbcaOaCGC5NP9D7ztUTFn33xMjiu971lQlx0LuyR6ofqF/cmHMa2/7KJKcK3CbIzIdNP96zj9uZTPc/
+uhR23aa67FaqbSbdvq9u/esDAd5NB4laTYe5Omry7wcJpfDy+FIqTwvizK9TGM9iEev4iJWyeUrPR6OknhUFMUoKgeqHH/30Ud2
70a7HWX/YtiD19MevGrWLoN5rWzV0tbkaWNt4yHjotvgV6lm6zrW7muc/djubJz96JT9J2vPWo5+Tt6fmf/V9f9+s/bv1f/G7//r
X74dnF1GZ+XZy5/j7H21c3Httj46WW16tp1jDXhxOy33jV3tCa7d0x+T2vj60b0TnDui9J7hNHCctjXqFqzfuzkRdQdezeV+0Wxb
Xdf2t6c9d37LI+alGxFVTdDRrPPjW7POVfvXVZHVF3ZT/6geET/LiqP1KoiKizxp26ktWjUTBMtALVfN+Iu1dlxfoNiaK65dSpUg
2Clfm2PfcZv+7dn1ZPTsb8/aIdj8e7B89reNhavmfqi+y365XTl/a4JxY/vOXZ9Vp11tXmt3fK59tPnn6tGG9jftQy7rgqgdPk1f
NzOj7GRYq5I6uruwmNvhNQ8ybbNC1yP75eOEmN3bJ1JMpBgzKfboPdQPF2Nru2OrlzY3yLYiq9oT24wJO7f7btyc/+h24rY35OBm
ZKaGx1VXZ3q9ap/zLTDAuJ5yu76/rXHcXyxr37NRt3riYNcc62a6IlbVR4y2almVAW1V5dkqKTVlo9X71if59R7QZnP3dqvd2ZWu
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
Dr04VKsX+1p9jxX2A1pdHarV1Z7QvUfT/FCjab5nNI29R9P8UKbHud4deuI9muaH6tfzPf164j+aJocKPdkTuv9oWh5qNC33hO4/
mh4q9Hxf6L7lzKDlhdR7S/gHYPCdem80D5wz37LjB2DwnXrvMw+cM9+q44dg8J167zMPmzTvDeEfgsF36r3PPHDSfJc/PwCD79R7
m3ngnNFSIaD7jJcK8d4O/iEYfKfeu8wDJ42WDIFsr069N5mHzZn3bvAPwOA79d5jHjhntEQIxuA79d5jHjhptFQIxuA79d5jHjhp
xGQIRu977zEPnDRaMgRTDPHeYh42Z957wT8Eg+/Ue4t54KTR0iGQDfGp9w7zwDmjJUMgW6tT7w3mgXNGTIVgJmneG8wDJ42YCsHo
fe8N5mGTtmMnOCRpGL1f8JIhBS0ZgjH4TgteOqSgpUMwBt9pwUuIFLSECMbgOy14CZGClhDBGHynJS8hUhITIpj1z5KXEClpCRGM
wXda8hIiJS0hgjH4TkteQqSkJUQwBt9pyUuIlLSECMbgO4tYCZEsIiZEIJPrLGIlRLKImBCBdI9ZxEqIZBExIQKpiGQRKyGSRcSE
CKTKn0WshEgW0RIiGIPvTPESIoqWEMEYfGeKlxBRtIQIxuA7U7yEiKIlRDAG35niJUQUMSECqT1mipcQUbSECMbgO9O8hIimJUQw
Bt+Z5iVENDEhAqnyZ5qXENG0hAjG4DvTvITIDpQmJGkYIaJ5CRFNTIhgCsYxLyES0xIiGIPvLOYlRGJaQgRj8J3FvIRITEyIYGqP
MS8hEhMTIhjJH/MSIjExIYKpPSa8hEhCS4hgDL6zhJcQSWgJEYzBd8YLqJoRA6piDL4zXkTVjBhRFWPwnfFCqmbEkKoYg++MF1I1
I4ZUxRh8Z7yQqhkxpCrG4DvjxVTNiDFVMQbfGS+oakYMqoox+M54QVUzYlBVjMF3xouqmhGjqmIMvjNeWNWMGFYVY/Cd8cKqZsSw
qhiD74wXVjUjhlXFGHxnvLCqGTGsKsbgO+PFVc2IcVUxBt8ZL65qRoyrmmGWZniBVTNiYNUMU3vkRVbNiJFVM4wQ4UVWzYiRVXOM
5OdFVs2IkVUzTO2RF1k1I0ZWzTFjGi+yakaMrJpjao+8yKoZMbJqjhEivMiqGTGyaoG503iRVTNiZNUcs92AF1k1I0ZWzTEVEV5k
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
9B/5tUPojLCDksgm658SPlS0MDIsSij9Jl5KgBri153WZDyUF2QuVmPvTno+fZdYEJ+JCQMrAh7eUKfSwZtkHW5HNNg1TmwBpi2H
ZdjixuePoKFhvcFy3mnlR+B2tPeRkDM9XzwmHyNx0Jc9HufGH0s3kXzza9hEIpvEHdxNMpjyOFlv0BObBmR3wxfYp01vcZ1+y3rA
IyG4vQSfxuO5IhDOHe580bWs+HxjAFSPeDDCYo8wdgKWHr1JEULW9nF/QHcYD87Ein30frZ7XrZ7XrZ7XrZ7Xq78ZOs/mK1r/0fg
ufbC/g93u/+jls92/8c/5P4P17PtaLv/4x9x/wezfbbd/7H9GPvZ7v/Yfrff7bfe73b/h77vxvs/+LaPQ+sEQ2AWX9q44UokGA6K
oeSdwxefdwY4esjkMT4HVRh9RZwSTwBHwhEe59g5dNwI0+zJIOvOIaaDz+OocAMPmiI0LQRP0aOyI8DG2QocjA7tfGmWX8zWvDhw
bujFK9/bBq/9ht7rrnlxu7IXv/p17+zZ7JPHf5im/T+OHbjewv4fz9nGf+r4bPf/bPf/XG//T7qERoS3r9jz49l2uusHw+t8VUXj
u4fHJ+B/8SNiYw//K92+c8iPpeth0lkrHs1rpPt5vL29FlcA39ci97dkaxGFaAMY+vvWi4YcUHCrhvjTabzau2L7Er550MN1xy/4
ZGar1Vparmh+L1N5W1G6pWjdxqA38SzJVDu3i6k1+zg7ZPugQbnP6Mue3MG09mWb7FrCadPC/oR/iL1IOO/3nVx4c3hFzSjvWGL2
NbcsIZLM1vbIKShrJGaW8kmhfrqwqxh7vmWN4cfEYq6bPyKbh6pwG1O+XlewOg6s3922IvgX1+gu7+nOW1kqueaSajtIKyy+SJ5Y
RpH/YAS/8MmgxkiuX/gpmXzPV2HLla548EfezHbTJ6U1ILtUVoT8vDS5WPiCnc7o4qyTTKCLxa4FJ0nj7qmYT+XTAMs6l/PTSTxN
prfk/Ld85FhOgZf1v90Dtt0Dtt0Dtt0Dtt0Dlm6T+or9X9A0LbkPhu72r+3Wr+3Wr+3Wr+3WL3zAduvXduvXduvXTW/9crZbv7Zb
v7Zbv7Zbv25669ePaThwMbw3LJ6SccAsFCe4qvJAInPd7caw7caw7caw7cYwIzeGlfZ7pZMn4PtbswQnbOPJ5eJuL/AgEKRAh1CI
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
kORTbJPkbPw+SRemlC7jXJnzl6QP/w4p0kEDW7LuX8cn5//2BP+3uy8olPkvd/8t8qkqvmM1/7fTdl27zP/N2sxzt/zfdXwGmIxi
JtP2CMK1BqYiOBRHDjCtWHfWuPWNvLA/LV7Un+ZnPvP0xtaX4nlM3VW8gicxEYmyef7yJmbpbYqsXM1C+p2mTBnSTFOiNEV+m2aa
lKCZpxdpyrR+2ZtbB7g4YzzC9AK3vlmVRa1IZ8/TcGO6rFU3iPxlczdgbkzoWj9eNjGNBWe7u+g0iymxvjTzFES41ODWNzIx2sUo
zcMpDvCMIDy/+NI8wEuOWmcipbPVHyMd8P7FeSN72nk8id9M4nOeifPJNKN2nsXTd5wgdpLEs8SaXnT4CovpLevhpBtb4wk8EOzO
16U0LUzdMe730SYTQXxnDWMcmpIpnENCPQu0cWl9QMJ0TDdxARXHSj6eDwfdwQxOwNumPIsonDxrWcc8nQhq5wwTxXCiP76aRZgP
RXjZmFqSusw6HUxn48mlzCaBmUWgWChEesFgag2hVCK5Smcy6L2BgiZJb4rcf0JeNAsWBekCL8cXMqOJzEmSUfwVcni0GqkO31wM
ejyhBpjRwgxIh1YDC9jI8t0fWi8+W5g86RDzA36cwRn857Cg/i+vMLdQH5TGM3jkeRV+xnwfuyLpeJZMCJ817otcIDLlFE9b1dhL
kytlD5C38rRFaabv3YOXvc/tL/vwX0f+94T/97Dw3907hy9bL3vf7t15fvAGKtbvHjx++MvJg6P7v29s+LT9uf+6X+STvn/w4/2r
HtV5Ye9H8X7/1efwy372d3uDv5nz5WXn4M0A3/DkyYN7yx4OUrDmYjmnd17c/enV0d4dfADe/92PD7/7cyriLan1u5NJfNkaTPm/
Uq+ZwvlPnoNrznbZ7cJa//RP1qL1xp23CXSh2cMe8t881ed9AXh35SGJf+Xb+ft2X7xrWu9f8YSF+OdC3dmTWZKLkvIUVWltk2SZ
j2Q2F/mzKfLDilqX5hIrJajNE0rOv1M+ovTez1m+Wd5G5CU8Z5hI8/Ujz9h1aMmMt/mhXfnevYXU2OkJbDyFAsmAy2MOU3YnxSLI
FGeTNCnZNM3idob6myvW2R7Pfj53NG3we3syHWmeO4tT4d8WL7mzTkl4VUt2EXsiR3FRXbzy4tK7NB9Znl0Nkzc1MDNX2l3D730x
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
wXs2V+4rFtAIKhMrY0CxFgoEb0ud1J1DG1+N+8PgiX//n/9mPUnvQz9k/s6XQlLcsQWXX0sezrYsyr2RHD/C9ctEEF5g+UFfI1a2
zuhKKZBGhYWtdstf+fxrb5ZfuTkeXpS6RTuHn3fQ3dk5DEAsuS1+59C37S8gcr4rHmW4clf8nLC4bXtx5RO8tLSDG03wb/9a25ex
/1Tn67bf7Xf7Vfr++3/RL8Oq73/WLcANfsET/TP+9d/+1fo//+u//m+L+dbvrL//j/9ugZeypLdftZJUc7+v/cui7cCz/W6/at/t
YKD7Oz8kiCBFNscM3fr8KnTo+cV8AJzDtQPwW67i3Tn0bK/d3Cmvzd85xJ0MO1cs5eV+09zCXTi2ejAqLGffjkPbcWj73X7Vvttx
SPf3inGoPASUtyltu/5t17/9br9q323Xr/u7Udd/1R7Q7SCwHQS23+1X7bsdBHR/rzsILNuZ/484Fmz7/+13+63yS30sEN9f/4jw
92xQeDn6+7//f/Dv0qmJeW9gfm4i5SvZOfRx1WdzJ6Ui4bMVYWHyAk77znUnKpo7ZY6Q5XMXc7kneEqqfT+UfwT+kpHLWlzLx4LI
k4lj0tTkc6Mkp4d/ubM/ffxyB//NkkPwn64njt4T/4j//pX/g/Tl8hZMjsD//Pzy5csdfBv+e4j/Sd+Kf3/h11whZM6S/nKHr3/D
jTs7h45tz62YO4OjbsStxqnlceEa7qTcOeQcsjtyH2T6k1PDix9frl5Wd30trCiG3LhdKkfbZkvK4RcWAGLSgwPWYhZcaj0Z5Xu1
MGHBd5hjah9zkE7Gw0P0Z6ez8STBUx+zxYr7U7joLD60GB7vioSl+0gfe8iZUA/Oh/FgdKt7iswOs9sXs/5+iFfe44nRTk4vmha8
+mF3Zjm241t2cMj8Q8+zfjg64TLIBwpCVHiLk6ZTKEq7Yu3iV1S1P/J/lucFWUGEUp2FvK2Fvt5CWeMvXHkFu8xXWczZ3GIOs44G
U7HRLulZsu8la7goNdwSofXaby1/z9e1PXeJJdvL255rfT+edAY9aOtU7ZeZL5O0UqNdrd2MRSfFC5wtZ4N+7gpdb/u5a7eTa1b9
5QAn1I5vqijwBrVxefGDZcXfwZt3CgoIstIjs8KK0i9EgpZTQS2D1Ovvwj3rt5kbBt6at17Fx7TmtVfdJt7bbrvr3pvRNq15UXad
eLLvOc6C+1RgEK1vUVfh/Sm/IR2vrSDcAg3REiln8y/zPW4VZBXaOXzxav6ZBW6hJU8r0APBk9p4QZkSiMOhMg0QvqV4Ib938cV5
m5h/qWT7wQLLZg0Hc84f1G8YtJs7S9l+4Gy7zSJsxfLiwGbQkJew+6DdsHfg7D64LYn/upLdZ1khRA1MZc4r4TxNDz/MbxZkKfkm
p33GNcBzAMh+pnQZ31U3fwn0RHlWAOjjtjkADPvk/A/udfgfrvWO1fwPdtv3FvgfbKe95X+o47OW1n/jzACcrxPGgz/G09NyFoDu
5PJ8Nt4oU4BgPAI/UHL8YVrRRqvRtMStmGs1bgHC2+MUgphHKL+HE/rfTpMj/b4gzm5DEGE19loX58iNK1MXtSRbTOM0+YhciJKx
kft9gjRqDdGTTL6TZawqJzpNH1TIyjkqcjiliZdKe1tfjvIHiZRl2WNwWH+w/FHr6aDwqcJyIqcx8iDanKkRXvJ7mWgze/FHkeot
e3UhGTLnrsuVxXsEuPTgn5fKc3VqpRcvpy8fv/rtnX/OmXl202N7ePA/HpwJSnQuzd4L9ip9Ke7eRelEb7ScAg3pHfN0innhOdFR
keI7G0UFQV0B90miujSDKZ7lfIB7mz8t5TFNeWCX4ASRzwChwl5eg0TSrcUKmLaJ+eawJ5JWnMELMJ/RXL40Jg0qHnsgbdZBdvJ4
cgnGmmDcBQPSkjWMA0oL0BvfVY9lPesMwXYXmNg0xk3w8agL3hL8ei0r92sLyhxz5kZ0FeLhdGydg+oEYTWnkkTCr4x4SdYGkSCN
M8aNMGEb3DrLBMgufp0yJL22OsNx9x0nZBqfDWbyhniGTAUvG1OrNFCJi1vgZseomyHSsCNVltAuoCFAifiAwdSaXpxjLip8WedS
SMpVllVkmYgtU14yHH/gCUcADKEeeF/GKc3S7gMgYzLhfFuv087iNWiQayd/bqqw4WCU8GINZlORGpEznE0w3oslSCyOHwW1XLFZ
pQxZ8RBrymWutLgDojVT5qzXrm1HYRD2I49FUTcCJ7YdJB7zwK3yI69rs1673+3admx3o07f9YK+3Q08t2f3uj3mtpPXTdRTTh2G
sgIWjMG4vNyc+wEKMkfFdsJPAcYQXHNxD9Q1G0wLNUBYQ/bf8Tm0Yei/Z2P+0ExNoleXWkcyMzwrKw1XgrQlZ5FDV8/6ECNR2j5c
0hR0dOMiiVrKm5bm9stazre3heXLh6A1PRKmvsxTrbwupxGUdWE/q6u3eFJhy25ZgtRskj5hRU49capMW5alwRPcZSmry8oMeCXh
RYcj6oqQQNTixfSFc0kLP+cV/B631iPOPIf8q9jx5fSspYse8/Da4zL3pHgjDJZp+7h7fg5GG3ycv06exsxmhQyJUKT1VJuZHHJc
TpUg+9XxMGkNx2/mMzPqLOSKNHyZ8CJf6w3hvxz/t5cCfxEq3ZfN+euSga3B/77tenP5vwLH9bf4v47Prwb/T5LzsUjzKNhiR+9b
ac7X6l2EdCL2KhcBhWnyVFzLKY/S+w+QXXWpDxFLbtr0SonAs5+ZSwEYT4xyuVCiRVu7OKOwz+x9m+01cmzJMRHCZ8zGyV8DWBlg
3t3hcLcI4ndf9vYqwvFvzvZezadOOea0p7sxwHpMiCN/dvBnruazgeAaRWm/saz5pKaslMnUYS7glShnPW44SdhPWOzGbmQH7V7I
Op1O2EkCpxNFUex5nu8FvchxAztxo8RPuq7XYZHTQx4tt2PbDetLc8lrndJrmePYbuGlcd/xkYcscrqO0/d6/V6bOaEXsciOnH7U
8Zkf2FHb8V0AV67dC/udju31Qp914J1OsuFLg1JJg6ADXWa/GwXdyG0HUTdxoiTpe3bQC7pdx40cz44SL+nGSOeGPIG2Y4dQYL/P
mRU3eqnjMeYVXuomTicJk8hlnSjueqET9LwECtN2vJglgW27/aDf7kY93+m27YDh+9qOm3TBFHYn9jZ6adtuM7toU9vt2rELiktA
dOYDjI16Xcfrttte3w7cbgdKDTZIWNR2O93AbdsdL4pct+M4vTCKrnipW3pp2HaDoPDSdt+DGgGVJOgEicPCKIy8kDG/7bK+18Fy
sghU23ES2+m3e4kfhd1u0nHsfj/wOn4XXvrNq9RplPTZoh0W+L1lXZdH9vKOLU1EKO9Az1bcjbz30A3w9pSnI+xf8EQV/IoXzqtF
VJe96gW//VWe+jvLfSAcbHzSpu61yJLLH8g92vnyQBtne2UC8T7PhH39zOCS35vnUv+MAPxQ6AGJypt8cucw60+4EqBPAWNyJLMc
26Xd3HHWyy2Fdygwz9cF0E1c8CN4bYfWvEKRLP3LDTjz3y3pjUWx0to8TT34c+mILHOIOVv1DBw3ntKEO0uCUVqwNcuQf3oMvBek
gZa9Ps77YHln6HWhqyoImGOJc/dlrAC9pBE48Wfc2WpaH04H8IwBemQwQvcuuuhnozPXwiUOgmiae2ro1v32t8uGHVHQ3/4WnyJc
w4mYOeXucxJPwG+cyPzcWetIaaJzSX/8HvMxI42bcPVfzzWOOePuCWrwH7/nnuw0KZVrap0i2EFpcmcflA7mxLhKqpQ0myQKId39
A57DC/zimfBG0VlNepjnWjB449wZ+AMTzHsNj7+UTNkz/kLALuO+DJOMOMu4HPg5Vx06wNLaPKYA6hoLewlnnMcW0Lacq1Kk7h5M
eQtCccF559Y7g4aNpRF++PRi8n4g3Hvuyr4uNs3XMic71r0Ho/fIMc+n0F8DCLNSEHYbSSCtssecORzCtiWfeZ1rmtFu88UBllN0
Fhc94LW57Cvwu9e4qPOFvb6LKg2W9B5djHgKFJHhIEv2MNfBydOFPDelK/ZkgkF+7D52yFMUO8sWfnM+5/ZD55P7/96+6K/2MUtC
mgQcOqPU99/HLusN1O7L/XPo5a8RCViT/xtwuz83/8dsx9v6/3V8qsz//Y/j/2fpoVeAV3TtZQZk7Oqze0VQf1ZZ6CCfjJJPbk0v
OvFkEl/ugt8kJZA+hQDeWfpmeE+hzWOYvj/4uBiDWHju3EPnR8RMIBFdyPLHXj9WgaOjyEb3onHyEAfhxr2Hh1gZhglS9GLyjO8f
8ON/Pbp/iD+PMY8c/H6QXpP07mOSoUbmf+3Kp8qcR2c8/96cqGd7PDPhGLNRiWWtqSy5evpYgCsDKaujIQLh8wseCV/LBvSQZ77i
D0KUJ16yV3DvpG/GrwDPZnP/rDhlWcxxWRADoFLhNCYhKbowR/jKK0ssINbuncNskmHvzjzg2n0R7/ft/ejVZ7/9ZY8DLdQJ3JSD
rb/h4ln5p+CA3rtKh6UG9VhM0MmO4yjmeaCWqbRUmL2521vTBCuI0G1Tatl5VX7UC9FXQOsa9y55ZrLyQ+b8XNmF4MV7aVABa1fy
IZkWZhjz+Uh4IPeIsqk8IfLKlnXdqd5CKxuM09zg6WNXrzEoOGUrlxukT+erA9bO8ot3izCnlGivOOk/GPORBZ61MkXQi39+OXr1
28W6drDuLctMNhiDwcSLpVMul1aKBpsulsAUULynfPGqVE+4/wXGHIyXt9K5Zg0PyJvsLt6815RrQOBsS2aesu7c4T+nyb8spmQT
x7PU4Tx121xeXHzgfvoEETLBHzyfFT6b7WVZ+LDAPA1c9kL+83e3USr+97ff7mXlb51fwDj6mSfpxllavFSk3cuVhvdBr1ISSJ5t
ignuvI7/5mDnfNDb+dtOlhQM/o5nO3972fvc/rIP/3Xkf0/+xpzgZcvmX3Z40JpJ4xWCaCKJZybrVfkJ0+GWr9g4eCkc3P8onygz
+YKSGg2eMf5FAx+Mww7+i4N4+jcO6sW/+bmFXOq5eAuZTa+QVDm9aaF6omxYPblyRF1Mxwg4MpeQFt+BR/O0rr+ROWlLaT5FBtTS
hcVcdiITctEMeZbhq5PJzmfCnXu+yCdbGOLK+ZZL6WUP/vklHHuZLdh/efDinw9effuSr9dP7Yz372UxTf62lVl05xNPoze+kAN9
rtZPStlWfa9Q78Wp4qoikRF2bpEQj5Vnnbbo0uY68Kz3dqy//+u/ZT14b7+Q1A0KjmPOBQ4+VmylOSpE7hV+W7boKUuFLfKnFjqr
gyxUk/fuPIgiu10uK/aze3MdrXiYXGPVTBdYLabyxotkaA4TsN0f97Msk8suPU3i4ez08icwaq5kT/bhMFhPx+hh2M1sacrJ+F2C
kVas0OWxnitTpHrlQ/2yN6QZSfeKraiYh1xWVv6WuZcuzVuOnlFTCrpXqtlwUr4N0Ru2Dn5sNoafsmDYHuVbAc1ckTk9rwGPeQZd
Waz88B+4/7P8Zr4ZRc4+8DZxtdp53D/vAGZSz4W6I5c+YJFTZYkNMVJbjU48Tfw2eH2NRV9jUUD+hpZQRTNVDig5s7o8dGvB9osv
X2i16WMj32Z2mLfZrPxDXOtv/S5ViNwYItodoK57Fyj8Y2xjeJ2w3gYXZg+cJMME1IFvyT1KHqwdYAqUkmJXOKf5LXyEK0+uFIcI
8NUQ3uaXw5HpkloOh9NKXlgyAwdxgVi6R0NM3BSvhFfh7EIh8axIylx+dku2wQGYcdICMDDlFSy7+Wx+ImzhEWfZI/h1aZOD4/mK
G+kNyTMH/1zEj+nIcNYS8F3UO0vimy97uasEHsNk8HFpt1xavws98/ciSSe/AS2w/KonI4Ajg/4gKfr6abH4vSXHT8IFDj1BG/hv
i6/bnT4dzE53G3+zBHQ5ePk3axd7279hauu/PTn++f6jB98/uH9vz3r5N1laDkHzbMJOAZzJN+ceyN+s97Yr5h6504TOAZh+X5qa
TzklH/Ff+AFCAPIs1iqxxhb8dutv2VBzVTAc6x4PW+BeIRGvbkqH5x7H7dPvMFaS9A4XnDve1Z0OcCMnJmgVxx+ljtfjbBFo+tTM
NcY5Y+7iPBLeRjozKJyDZu4IpbmbM1S7kHG9NPLDY6d8RJM7PXnXebiiP5XTj9/xjujQSjukYjM7nG+vRTBYao/4ekA2yfA7YZ1H
Mhf6gmWaspqK7NNO0MwiOHNTpFLhe99sJxCM+GTx/3TiNlu+Wt071q3/c9hc/J85Xnub/7WWT5Xr/66M6mdXcPAhcpw3rfnk581y
cvRmGq9Pn9g6yJMmz+0ESdOmp4cLEarbC+/hEVDpIGPQ5fdWIWiBEvPFIdynvAPd3/kwhhH8YDHoUPg7/6/75fkvEjjsv/rs+l8O
3gC0SpNmY6psGH7v3BGO85f5nSQiIp2DIeH5IcAe8FBOVsCC/yZDtuQDGkukVA5mSN3l2pAalNcuRjA2C18UX7L0LeVirIwNlCQS
Khj1djk2S1aEPJL5kMdCvGNJgKPoo0/e5TUjj7Hk9UI4HFLdqRxC7XyfUpKaQm6CFhek+6BTM4m4BO6CXnTEJ+9ELFKELfLwRkGP
izGO9LZiVRLh3dvl7mE3b9bFkOGS2OAVUcRlIUP5riUrsK67E7Bwa/qn9AXsfNFHKVCz8V6+gpm/ZmlZaV1M8b0cV+4PB/0EVZXv
K5LAIF1ZJheCyS1iMW4r4due8r01+4KgIH1CUywag5YBoF0sGjt58gAXIw2mhb1laU9i/fa3vMnIQqdR7yx2hTdb09OLGRbit7/l
bpNYEZYetGbxYNiUG5R49z1Fr3N/OAbIb2X14ODJkwf3LME5NBb7esDzx7rF14UV++zXuKpqdir3iskd8FbysZucz8T2s964K/P+
ihhnWju5QuBu3tqK3Tau1cL566k14FRefb7rbDCxRMO0eLO7Zc3GZx3Q3AgP4PwvrnvElXvi2tet7Pxra3rR74NLJvSaLZKTdSnu
oqxJj8++ZpuzsK6Afkdj6GtfQ6t7bY0nyJxgdaC0VkbMx7dPCbHESHuLX30gbXPA5w5ey6huWiDUNdbSpHvB7wQPdggnh+PpdAia
HV62rBLlinWWgHJA0Bl0H9ZrTgY4bfGEq9PXmO0WzoE7C0+aDt6g4zy9gDKhsyaWvE3k5Nkk4RvI4IFo6esvSktrZL6PK92/Vfe2
LREfyBpkfNEbzKxd0dVBr3doLd2xlUgHtLTAdcEJLXTC6TUFio3S+esMdumzLgrsRPKJdtMqUXHwI3JHLDjKh1Y+YqQUGfl1GD0Y
vLmAepqtTxPr/Ra19tVTli9HKycWrd0nJ9/vh4VFpemC0r1yXUgHkVJlEFOfeFX61A2XDYqdbfxV11wyuLQipIUTjnzaESxfQ1DY
+VYMecwVs5mtc527IJNT+ya37Wf72X62n+1n+9l+tp/tZ/vZfraf7Wf72X62n+1n+9l+tp/tZ/vZfraff6DP/x9YxkjqABAsAA==
```

### Archive and comparison integrity — PASS

Command: `env GC2_REPO=$PWD bun run <tmp>/verify.js` | embedded archive, retained evidence and both accepted comparisons before this final receipt/matrix append | passed, exit 0:

```json
{"earlierReviewedPrefixUnchanged":true,"originalReviewReconstructedExactly":true,"archivedBlocks":25,"archiveDecodeCommandPassed":true,"manifestHashesVerified":44,"archiveSha256":"8e7a06d4c4fa96188fd579ca7bcb83563973914033fad55823a6b1e24daf6d45","comparisonsIndependentlyVerified":[{"mode":"control","mainRequests":[8,10],"differences":23,"guidanceCounts":[0,0,0,0,0,0,0,0,0,0],"result":"PASS"},{"mode":"blocking","mainRequests":[3,3],"differences":0,"guidanceCounts":[1,1,1],"result":"PASS"}],"evidenceSha256":"7329374020247e3681b93b5b4213502424cad3b5f78a9f3b484c7c123e50279f"}
```

The independent verifier decoded the archive from the evidence's base64, reproduced all 44 member byte counts/hashes, reconstructed the exact original unreviewed section and confirmed the earlier reviewed prefix was unchanged. It recomputed each accepted request/message length and digest from the archived normalized messages, then recomputed guidance cardinality and comparison differences. Its evidence digest above names the verified pre-append state, not a self-referential final-file digest.

### Final attribution scratch cleanup — PASS

Command: `rm -rf <tmp> && test ! -e <tmp> && printf 'scratch_removed=true\n'` | the owned attribution temporary directory, after all accepted/failed-run profile teardown receipts and archive verification | passed, exit 0:

```text
scratch_removed=true
```

Deleted: every throwaway driver/assembler/verifier, raw request capture, watch and PTY configuration, decoded archive directory, generated archive/manifest/replacement map and exact recovery before-image. The archive in this evidence retains the exact sources and normalized proving receipts. All harness profiles had already been removed by their recorded teardown. No product file, permanent test or unrelated file was changed or deleted. No commit, push, formatter, linter or project-wide suite ran.

## Final matrix (2026-10-01 item 3 attribution; newest result wins)

The item 3 follow-up supersedes only the earlier context-cost FAIL: the absent/absent async control reproduces native batch differences, and the deterministic absent/present comparison differs only by guidance. All other criterion results are retained from their recorded proving sections; they were not re-run in this follow-up.

| Criterion | Result | Proving section |
|---|---|---|
| v11 anonymous snapshot/page | PASS | Retained: `v11.anonymous — PASS` |
| v11 wrong Host | PASS | Retained: `v11.wrong-host — PASS` |
| v11 wrong Origin | PASS | Retained: `v11.wrong-origin — PASS` |
| v11 child outside grant | PASS | Retained: `v11.outside-grant — PASS` |
| v11 snapshot recipient scope | PASS | Retained: `v11.snapshot-scope — PASS` |
| v11 advisor grant/URL rejection | PASS | Retained: `v11.advisor-rejected — PASS` |
| v11 expired code | PASS | Retained: `v11.expired-code — PASS` |
| v11 replayed code | PASS | Retained: `v11.replayed-code — PASS` |
| v11 in-flight A revoke/B completes | PASS | Retained: `v11.partial-revoke-in-flight — PASS` |
| v11 idle credential over 60 s | PASS | Retained: `v11.idle-credential — PASS` |
| v11 source replacement | PASS | Retained: `v11.source-replacement — PASS` |
| v11 mutation-shaped requests | PASS | Retained: mutation re-run `Accepted complete-output fresh-profile run — PASS` |
| v11 RPC grant refusal | PASS | Retained: `v11.rpc-grant-refused — PASS` |
| v11 native JSONL secret absence | PASS | Retained: `v11.secret-isolation — PASS`; earlier independent literal grep receipt |
| v11 stub secret_seen=false | PASS | Retained: `v11.secret-isolation-many135 — PASS`, `v11.secret-isolation-advisor — PASS`; item 2/3 receipts; both accepted attribution runs |
| v11 observer-only teardown | PASS | Retained: `v11.teardown-native-isolation — PASS`, `v11.teardown-native-isolation-many135 — PASS` |
| v08 no-store | PASS | Retained: `v08.no-store — PASS`, `v08.phase2-no-store — PASS` |
| v08 browser plaintext retention | PASS | Retained: `v08.browser-retention — PASS` |
| v03 one endpoint/independent readers | PASS | Retained: `v03.endpoint-and-client-attribution — PASS` |
| v03 stalled reader/content/native progress | PASS | Retained: `Item 2 — completed-transcript paging under a stalled reader — PASS`: five advancing non-empty pages to stable 960108-byte EOF |
| v03 zero observer I/O before serve | PASS | Retained: `Item 1 — strict nfr-8 and attributable idle I/O`; archived complete monotonic receipt and `Item 1 exact source/output boundary correction` |
| v03 zero observer I/O during 60 s no-client interval | PASS | Retained: Item 1 `noClient`, 61315 ms, zero network/read/client-request events in that phase |
| v03 full matched main-request context cost | PASS | `re-run item 3 attribution (2026-10-01)`: (a) absent/absent async control reproduces native differences; (b) deterministic blocking comparison has 3/3 requests, exactly one guidance message each and zero non-guidance differences |
| nfr-8 authenticated snapshot/page reads only | PASS | Retained: Item 1 complete monotonic receipt: 65 reads; prior integrity check validates authorization and request paths |
| nfr-8 snapshot-only headers/no rejected reads | PASS | Retained: Item 1: 64 header reads, five rejected requests, zero violations; prior integrity check |
| nfr-8 no read after native post-request parking | PASS | Retained: Item 1: page-end 13874 < native parking 14419 < end 17017; zero later reads |
| cleanup all disposable resources | PASS | Both accepted attribution runs' profile/watch/PTy teardown; `Archive and comparison integrity — PASS`; `Final attribution scratch cleanup — PASS` |

## Unverified (2026-10-01 item 3 attribution; final)

- No assigned follow-up remains unexecuted. The async control uses the exact prior embedded driver's `many-33` scenario, not the binding note's narrative `many-135` label; this discrepancy is recorded rather than silently changing the control scenario.
- The control proves async completion-batch differences occur with no observer. It does not retrospectively establish the cause of each individual difference in the earlier absent/present run; that run's strict FAIL remains recorded.
- Other criteria were intentionally not re-run. Their retained observations and limits stand: no exhaustive payload/header/chunked-body/error-injection proof, idle keep-alive socket enumeration, compressed/encrypted browser-cache decoding or independent Orca-version measurement was added.
