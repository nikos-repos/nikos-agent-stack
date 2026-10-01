# GB1 — identity, lineage, and inventory

Dispatch: `gb1-identity-inventory`; input slice `0406`; contracts: `schema-v1-frozen`, `stock-source-native-scope`, `reader-bounded-page`, `reader-admitted-file`. Only this evidence file is owned; source, harness, and scenarios are unchanged.

Recovery baseline: the initial and refreshed reads returned `Path 'omp-orca-observer/checks/evidence/gb1.md' not found`. The file was absent. One initial write was rejected by a sibling's worktree mutation lease; it wrote nothing.

All omp commands execute through `checks/harness/profile.ts` in disposable homes/workspaces with the local stub. No Orca commands, credentials, fixes, formatters, linters, commits, or pushes. Output normalization substitutes `<tmp>` for disposable paths, `$PWD` for the source root, `$HOME` for the host home, and `<port>` for ephemeral loopback ports. Assertions use original values. omp's parse cache inside the disposable home is host activity, not observer activity.

## Installed version and CLI discovery

Invocation: `bun /tmp/gb1-bootstrap.ts`; internally `create('one-child')`, then the following commands, then teardown.

```text
GATE_START 2026-09-30T20:53:48.853Z
COMMAND ["omp","--profile","one-child","--version"]
EXIT 0
STDOUT
omp/18.4.4

STDERR

COMMAND ["omp","--profile","one-child","--help"]
EXIT 0
```

Relevant verbatim help excerpts:

```text
      --mode=<value>                    Output mode: text (default), json, rpc, or rpc-ui
  -r, --resume=<value>                  Resume a session (by ID prefix, path, or picker if omitted)
      --no-lsp                          Disable LSP tools, formatting, and diagnostics
  -e, --extension=<value>               Load an extension file (can be used multiple times)
      --plugin-dir <path>        Load plugin from directory (repeatable)
PROFILE_REMOVED
```

This uses installed 18.4.4 and cites the dispatch-specified dependency source sections (18.3.5); it does not substitute a patched binary.

Bootstrap source (deleted after execution):

```ts
import { join } from 'node:path';
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
console.log('GATE_START', new Date().toISOString());
const profile = await create('one-child');
try {
  for (const args of [['--version'], ['--help']]) {
    const result = await profile.run(args);
    console.log('COMMAND', JSON.stringify(['omp', '--profile', 'one-child', ...args]));
    console.log('EXIT', result.exitCode);
    console.log('STDOUT\n' + result.stdout);
    console.log('STDERR\n' + result.stderr.replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD'));
  }
} finally {
  await profile.teardown();
  console.log('PROFILE_REMOVED');
}
```

## V07.6 — too-small page: FAIL at zero bytes; PASS at positive bounds

Exact command: `bun /tmp/gb1-reader-launch.ts`. It launches the importing script with `Bun.spawn` and the harness's HOME/TMPDIR/XDG_* at process start, before importing any omp module. Native parser and the reader are used; the existing harness filesystem probe records actual read lengths.

Verbatim normalized excerpts:

```text
COMMAND Bun.spawn(["bun", "/tmp/gb1-reader.ts", "$PWD"], { cwd: "<tmp>/workspace", env: harnessDisposableEnv })
FIXTURE {"file":"$PWD/omp-orca-observer/checks/harness/fixtures/small.jsonl","totalBytes":498,"firstRecordBytes":100}
STEP {"maxBytes":16,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":16,"cursor":16,"payloadBytes":0,"reads":[{"offset":0,"length":16}]}
STEP {"maxBytes":16,"step":6,"kind":"record_too_large","start":0,"end":100,"scannedTo":112,"cursor":100,"payloadBytes":0,"reads":[{"offset":96,"length":16}]}
STEP {"maxBytes":16,"step":32,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":488,"length":10}]}
STEP {"maxBytes":16,"step":33,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":16,"pass":true,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"ended":true,"emptyNonEnd":0}
STEP {"maxBytes":1,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":1,"cursor":1,"payloadBytes":0,"reads":[{"offset":0,"length":1}]}
STEP {"maxBytes":1,"step":99,"kind":"record_too_large","start":0,"end":100,"scannedTo":100,"cursor":100,"payloadBytes":0,"reads":[{"offset":99,"length":1}]}
STEP {"maxBytes":1,"step":279,"kind":"record_too_large","start":100,"end":280,"scannedTo":280,"cursor":280,"payloadBytes":0,"reads":[{"offset":279,"length":1}]}
STEP {"maxBytes":1,"step":497,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":497,"length":1}]}
STEP {"maxBytes":1,"step":498,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":1,"pass":true,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"ended":true,"emptyNonEnd":0}
STEP {"maxBytes":0,"step":0,"kind":"page","atEnd":false,"cursor":0,"payloadBytes":0,"reads":[{"offset":0,"length":0}]}
STEP {"maxBytes":0,"step":1,"kind":"page","atEnd":false,"cursor":0,"payloadBytes":0,"reads":[{"offset":0,"length":0}]}
STEP {"maxBytes":0,"step":2,"kind":"page","atEnd":false,"cursor":0,"payloadBytes":0,"reads":[{"offset":0,"length":0}]}
RESULT {"maxBytes":0,"pass":false,"bounded":true,"monotone":false,"oversized":false,"firstEnd":null,"expectedFirstEnd":100,"ended":false,"emptyNonEnd":3}
EXIT 0
PROFILE_REMOVED
```

`maxBytes=0` returns non-terminal empty pages with the same cursor/token rather than explicit bounded `record_too_large` progress. No positive-minimum rule appears in the assigned contract, so the broad criterion fails. If the intended domain is strictly positive integers, the executed 1- and 16-byte cases pass. Three repeated zero-byte steps prove non-progress without running an unbounded loop. Historical full reader output was not preserved; the excerpts above are all that remains. No product fix was attempted in this historical run; the fresh closure reader output below supersedes its result.

## V02.1 / V07.1 — zero and one child: PASS

Exact commands: `bun /tmp/gb1-driver.ts one-child`; `bun /tmp/gb1-check-capture.ts one-child 1`.

The first exploratory driver sampled the initial endpoint at 100 ms (`503`, ready with no snapshot) and later a cached pre-spawn generation. That exploratory sample is not accepted as a completed scenario. The accepted driver waits for the matching native RPC `prompt_result` and the scheduled snapshot collection; it changes no product setting.

Verbatim normalized accepted excerpts:

```text
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":383}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1832}
RPC_COMMAND /gb1 dump
COMPARE one-child {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"260aa3ddaba4254e1847b6bab7b229f91ca3de7b07568c969b6791c71b912d86"},"rowListing":{"lines":1,"sha256":"61bbd0d7aebbedb9b9c92e71c14de1bf8782c7a90b95120194a8b8c0c66f6bd6"},"differences":[]}
PROCESS_EXIT 143
PROFILE_REMOVED one-child
```

Zero-child snapshot: inventory `complete`, `children: []`, schema 1. One-child native/snapshot comparison checks every row field, root/parent scope, lifecycle outcome and generation/call id, native timestamps, sampled activity, known model/cwd values, explicit unknown lineage, grants, and parsed native transcript/header. Registry/snapshot listing hashes above are accompanied by the complete verbatim comparison diff `[]`; assertion source is preserved in the source annex. Process exit 143 is the driver's deliberate post-evidence termination, not a model-run failure.

## Basic scenario batch — observed criterion results

Exact commands:

```sh
bun /tmp/gb1-batch.ts detached eval-agent nested restricted long-labels explicit-long-ids duplicate-labels advisor-present parked aborted tombstoned follow-up same-id-replacement one-child
bun /tmp/gb1-batch.ts many-33 many-135
```

Each driver runs the named native scenario, `/observer serve`, `GET /v1/snapshot`, and `/gb1 dump` in the same disposable process/profile. The full normalized driver outputs and assertion diff for each invocation are preserved in the basic-run annex.

- **V02.1 PASS in the completed identity subcases:** detached, eval-agent, nested, restricted, long-labels, explicit-long-ids, duplicate-labels. Every comparison returned `"pass":true` and `"differences":[]`. Nested parent is `nested-parent`, grandchild is `nested-parent.nested-leaf` with parent `nested-parent`. Eval collisions allocate distinct truncated ids; the explicit native task id retains its full caller-chosen length. Follow-up/replacement initial runs passed field comparisons but do not alone prove their second-run criteria.
- **V07.1 PASS for actual 33/135 inventories:** public endpoint returned 33/135 complete rows in 47,925/195,214 bytes, below 1,048,576 bytes. All row fields matched native registry/transcript facts.
- **V07.2 PASS at exercised source bounds:** `/gb1 cap {"repo":"$PWD","limit":32}` on many-33 returned `{"state":"partial","reason":"cap 32 of 33"}`, 32 rows; limit 128 on many-135 returned `{"state":"partial","reason":"cap 128 of 135"}`, 128 rows. Both emitted `CAP_RESULT {"pass":true}`. This directly exercises production `createStockSource.collect` against real refs with a snapshot-backed outcome view; no product cap changes. >256-child endpoint overflow remains unverified because these scenarios do not reach its configured bound.
- **V07.1 PASS for native aborted/tombstoned refs:** native RPC `abort` returned `success:true`; both caller cancellation and the scenario's wall-clock timeout produced `registryStatus:"aborted"`, a retained native transcript and `tombstoned:true`; both full comparisons passed.
- **V07.1 parked coverage not established by the unaugmented fixture:** `parked-child` was native `idle` when sampled, not `parked`. Its fields/inventory matched, but this sample alone is not accepted for the parked-state subcase.
- **V02.5 FAIL to establish advisor exclusion in the unaugmented fixture:** its task-created `advisor-child` was native `kind:"sub"`, `displayName:"advisor"`; there were zero `kind:"advisor"` refs. The expected-zero check emitted `"pass":false` with the verbatim diff `[{"field":"native.count","actual":1,"expected":0}]`. Including this sub ref matches `stock-source-native-scope`; the fixture/version gap does not justify name-based filtering.
- **V07.3 PASS:** `bun /tmp/gb1-driver.ts one-child faults` injects one throwing ref in the disposable registry-list view. Actual `GET /v1/snapshot` emitted `INTERRUPTED_RESULT {"pass":true,"inventory":{"state":"partial","reason":"collection interrupted: GB1 injected enumeration fault"},"rows":1}`. The override was removed afterward.
- **V07.4 PASS:** replay orders `[0,1]`, `[1,0]`, `[0,1,1]`, `[1,0,1]` emitted respectively native `completed`, `unknown("conflicting evidence")`, `completed`, `completed`; all `REORDER_RESULT` assertions passed. No contradictory terminal status appeared. Generations count received started evidence, not native run ids.

All named driver processes exited deliberately with 143 after capture; every batch driver exited 0 and removed its profile. Criterion failures remain failures even when the evidence driver's exit is 0.

## Completed transition criteria

Commands:

```sh
bun /tmp/gb1-batch.ts follow-up same-id-replacement parked advisor-present new-session fork
bun /tmp/gb1-batch.ts new-session fork
bun /tmp/gb1-driver.ts follow-up late
bun /tmp/gb1-restart.ts resume
bun /tmp/gb1-restart.ts cold-restart
bun /tmp/gb1-restart.ts partial-restore
```

The final transition driver links the throwaway package with `omp --profile <scenario> plugin link /tmp/gb1-probe`; basic runs explicitly loaded the same-process probe using `-e`. Supporting sources, package manifest, invocations and complete normalized outputs are preserved below.

### V02.1 identity / V02.3 follow-up — PASS

The shown live (non-restored) field comparisons match the native registry and child transcripts. Inventory/root scope was also checked for resumed refs and forked/new roots. Native restored cwd fidelity is not covered by comparison PASS records: the cwd preserved in transcripts is lost from rows when `session: null` (GB1-R2, FAIL-open below). Native restoration preserves modelRole/resolvedModel via `ref.history`; the manually re-registered parked probe is synthetic and does not prove native model loss.

```text
FOLLOWUP_FINISHED_RESULT {"inject":false,"pass":true,"first":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-09-30T21:35:42.623Z"},"second":{"state":"completed","generation":2,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-09-30T21:35:43.947Z"}}
FOLLOWUP_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"7f7a0f7dc7754686fbff15090d86c9daf500a825ae2c9537a87aaa8edfb36b00"},"rowListing":{"lines":1,"sha256":"d1d8f09076af7eb5a0ca03fef2936027a5585106650662bd7fb431b9acf3624c"},"differences":[]}
```

Native write-tool `agent://follow-up-child` delivery woke the existing child; it did not spawn a second task. The second lifecycle has generation 2, the original call id, new terminal time, and native second-turn transcript output. The replacement scenario retires the actual ref and requests the same native task name again: installed omp allocates `replacement-2`, not the same id. Its new row matches native facts and old `replacement.jsonl` without a ref makes inventory explicitly `unknown("registry not fully restored: 1 of 2; missing: replacement.jsonl")`. Actual same-id reuse is therefore not exercised by this version's native scenario.

### V02.2 older-root exclusion — PASS

Native RPC `new_session` implements the new-session transition; native main `AgentSession.fork()` implements fork. Both change root and observer epoch; only `after-new` / `fork-child` is admitted. The original real ref is retained/re-registered by the throwaway probe and given each native status using `AgentRegistry.setStatus`, solely to exercise the status-independent scope boundary.

```text
OLD_ROOT_STATUS_RESULT {"status":"idle","nativeStatus":"idle","pass":true,"admittedIds":["after-new"]}
OLD_ROOT_STATUS_RESULT {"status":"running","nativeStatus":"running","pass":true,"admittedIds":["after-new"]}
OLD_ROOT_STATUS_RESULT {"status":"parked","nativeStatus":"parked","pass":true,"admittedIds":["after-new"]}
OLD_ROOT_STATUS_RESULT {"status":"aborted","nativeStatus":"aborted","pass":true,"admittedIds":["after-new"]}
OLD_ROOT_STATUS_RESULT {"status":"idle","nativeStatus":"idle","pass":true,"admittedIds":["fork-child"]}
OLD_ROOT_STATUS_RESULT {"status":"running","nativeStatus":"running","pass":true,"admittedIds":["fork-child"]}
OLD_ROOT_STATUS_RESULT {"status":"parked","nativeStatus":"parked","pass":true,"admittedIds":["fork-child"]}
OLD_ROOT_STATUS_RESULT {"status":"aborted","nativeStatus":"aborted","pass":true,"admittedIds":["fork-child"]}
```

Fork copies an old transcript into its artifact tree without restoring a ref for it; the observer reports `unknown("registry not fully restored: 1 of 2; missing: original-child.jsonl")`, not a fabricated inherited child.

### V02.4 late prior-run terminal — PASS

The accepted extension holds the real child's second provider context before its response, while its native ref is running. A microtask emits exactly one failed lifecycle frame after the genuine second started frame has reached the main bus listeners. The second scripted native outcome is completed. No registry outcome is synthesized.

```text
FOLLOWUP_HELD {"type":"held","id":"follow-up-child","status":"running"}
FOLLOWUP_RUNNING_RESULT {"inject":true,"pass":true,"outcome":{"state":"unknown","reason":"conflicting evidence"},"registryStatus":"running"}
FOLLOWUP_FINISHED_RESULT {"inject":true,"pass":true,"first":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-09-30T21:39:30.827Z"},"second":{"state":"unknown","reason":"ambiguous terminal evidence"}}
INJECTED_FRAME {"type":"late-terminal-injected","frame":{"id":"follow-up-child","agent":"task","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","detached":true,"agentSource":"bundled","status":"failed","sessionFile":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-TTzYTA-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-7482-802c-903aad430544/follow-up-child.jsonl","index":0}}
```

The injected failed status is never published as the second run's outcome.

### V07.1 parked-state inventory — historical synthetic registry probe

The unaugmented parked scenario remained idle. Disposing its live session removes the ref, so this synthetic probe re-registers that same ref with `session:null`, `status:"parked"` through the native registry. No transcript or lifecycle event is fabricated, but the parked ref/history state is manually constructed, not natively restored. `PARKED_COMPARE` returned `pass:true`, one registry/observer row, inventory complete, diff `[]`; `PARKED_RESULT` returned `pass:true`. Its outcome is independently backed by native lifecycle evidence (failed in the yield-less fixture), not guessed from parked status. This probe is excluded from the native field-fidelity verdict. Fresh native-restoration runs below establish actual native parked inventory; autonomous idle-to-park timing remains unverified.

### V07.5 resume/restoration inventory — PASS at observed native checkpoints; V02.1 restored cwd FAIL-open

Fresh native `--resume <root-session-file>` changes the observer epoch. Before native history access, registry refs are absent while 1/3/135 persisted transcripts remain. All observed inventories are `unknown("registry not fully restored: …")`. Native read-tool `agent://<child>` access triggers omp's real bulk registry restoration; it does not create observer-side refs.

```text
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: resume-child.jsonl"},"nativeTranscriptCount":1,"nativeRefCount":0,"missingCount":1,"outcomes":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"},"nativeTranscriptCount":3,"nativeRefCount":0,"missingCount":3,"outcomes":[]}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":1}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":3}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":135}
```

The 135-child missing listing and exact output are in the restart annex. After restoration, transcript coverage and registry-field comparisons pass; this does not prove transcript cwd fidelity (GB1-R2 FAIL-open). Absent outcome evidence remains explicit unknown. No synthesized success on resume. Intermediate 1–134 restored checkpoints were not observed: the first native history read restores the entire set.

### Setup/oracle findings, not product failures

- First `-e` timing probe used `before_agent_start`, which does not hold a native custom-message wake: `bun /tmp/gb1-driver.ts follow-up late` emitted `DRIVER_ERROR Error: Timeout: second native child turn held`. Final accepted probe uses the awaited native `context` hook.
- A synchronous reentrant frame injection can reach observer listeners before the original started frame. That exploratory order is not the requested late-terminal scenario; accepted injection uses `queueMicrotask` after native started delivery.
- `omp --profile one-child plugin link /tmp/gb1-extension.ts` exited 1: `✘ Failed to link: Error: ENOTDIR: not a directory, open '/tmp/gb1-extension.ts/package.json'`. Linking the disposable package directory succeeds.
- `{"type":"fork"}` RPC returned `{"success":false,"error":"Unknown command: fork"}`. The accepted native `AgentSession.fork()` operation succeeds; no product fallback was added.
- An unsupported probe assertion that row `observedAt` could not follow snapshot `observedAt` rejected a 1-ms ordering difference. That incidental ordering assertion was deleted; both independent timestamps are validated as ISO samples. No contract promises ordering between them.
- `PARTIAL_RESTORE_COMPARE` assumed a single native history read would restore exactly one ref. It returned `pass:false` with `[{"field":"native.count","actual":3,"expected":1}]` / `[{"field":"native.count","actual":135,"expected":1}]`. Native bulk restoration and complete matching transcript coverage explain these probe expectation failures; the complete-set comparison and completion criterion pass. The failed output is preserved, not reclassified as a test pass.

## Final criterion matrix and limitations

| Criterion | Result |
|---|---|
| V02.1 every field/native identity and lineage, all named scenarios | PASS only for shown live (non-restored) field comparisons; same-id reuse limitation above |
| V02.1 native restored persisted cwd field fidelity | **PASS** on 2026-09-30 re-run after `ae756c9`: native `one-child` restart/restore, snapshot 2 cwd equals child session header; zero observer transcript reads before GET, one 4 KiB read across three snapshots |
| V02.1 native restored modelRole/resolvedModel fields | PASS in fresh native restoration comparisons: both retained via ref.history; synthetic manual parking is not evidence of native model loss |
| V02.2 older-root children excluded at every registry status | PASS |
| V02.3 follow-up new generation/same spawning call/second outcome | PASS |
| V02.4 late prior-run terminal unknown while running/after terminal | PASS |
| V02.5 advisor-present advisor excluded | PASS on 2026-09-30 re-run: native parked advisors excluded from rows, admission/page routes and restoration counts |
| V07.1 complete 0/1/33/135, nested, parked, aborted, tombstoned inventory | PASS at exercised native/probe-controlled states |
| V07.2 component over-cap partial/counts/bounded rows | PASS: direct production `createStockSource.collect` at caps 32/128 with 33/135 native children |
| V07.2 live-endpoint over-cap partial/counts/bounded rows | **UNVERIFIED** — live endpoint cap 256; no scenario above 256 children, no product change allowed in this gate |
| V07.3 interrupted enumeration partial | PASS |
| V07.4 duplicate/reordered evidence convergence | PASS |
| V07.5 cold/partial restoration unknown until every transcript has a ref | PASS at observed 0/all native checkpoints |
| V07.6 too-small page explicit bounded progress/end | PASS on 2026-09-30 re-run at maxBytes 0, 1 and 16; earlier failure retained below/above |

The following two failure paragraphs are retained historical results from the initial gate. Both are superseded by the dated re-run below; neither remains an acceptance failure.

Remaining acceptance failure command/output: `bun /tmp/gb1-driver.ts advisor-present` with official `--advisor` emitted `ADVISOR_RESULT {"pass":false,"advisorIds":[],"subIds":["advisor-child"]}`. No real native advisor existed to test exclusion; the named task is genuinely a sub ref. Missing rule/prerequisite: how this installed version's harness is authorized to activate/create a real native `kind:"advisor"` ref. No synthetic advisor is accepted as substitute proof.

The zero-byte reader failure is the exact non-progress output under V07.6. Missing domain rule: whether `maxBytes` must be strictly positive. No positive-minimum restriction is in the permitted contract, so zero remains a failure rather than an assumed invalid input.

Not exercised: >256-child public endpoint overflow; native same-id incarnation replacement (native allocator used a suffix); autonomous parking timing; nonzero partial-restoration checkpoints. No product/check/harness changes or fixes were made.
## basic-run annex: preserved sources and normalized output

### Source `/tmp/gb1-driver.ts`

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare } from './gb1-compare.ts';
// The disposable script lives outside the repository; the source root is selected by its invocation cwd.
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const scenario = process.argv[2] ?? 'one-child';
const profile = await create(scenario);
const expectedCounts = {
  'one-child': 1, detached: 1, 'eval-agent': 1, nested: 2, restricted: 1, 'same-id-replacement': 1,
  'long-labels': 2, 'explicit-long-ids': 1, 'duplicate-labels': 2, 'follow-up': 1, 'new-session': 1, resume: 1, fork: 1,
  'advisor-present': 0, 'many-33': 33, 'many-135': 135, parked: 1, aborted: 1, tombstoned: 1, 'cold-restart': 3, 'partial-restore': 135
};
const trace = join(profile.root, 'tmp', 'gb1-events.jsonl');
const output = [];
const emit = (...parts) => {
  const text = parts.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ')
    .replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  output.push(text);
  console.log(text);
};
let processHandle;
let rawOut = '';
let rawErr = '';
const events = [];
const pending = new Map();
let serial = 0;
async function records() {
  try { return (await readFile(trace, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function until(fn, label, timeout = 45000) {
  const end = Date.now() + timeout;
  for (; ;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > end) throw new Error('Timeout: ' + label);
    await Bun.sleep(25);
  }
}
async function request(type, fields = {}) {
  const id = 'gb1-' + ++serial;
  const { promise: result, resolve, reject } = Promise.withResolvers();
  const timer = setTimeout(() => { pending.delete(id); reject(new Error('RPC response timeout: ' + type)); }, 45000);
  pending.set(id, value => { clearTimeout(timer); resolve(value); });
  processHandle.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
  const response = await result;
  if (!response.success) emit('RPC_RESPONSE', response);
  return response;
}
async function command(message) {
  emit('RPC_COMMAND', message);
  const response = await request('prompt', { message });
  if (response.success) await until(() => events.find(event => event.type === 'prompt_result' && event.id === response.id), 'settled prompt ' + message, 180000);
  return response;
}
async function dump() {
  const before = (await records()).filter(item => item.type === 'dump').length;
  await command('/gb1 dump');
  return until(async () => (await records()).filter(item => item.type === 'dump')[before], 'native dump');
}
async function serve() {
  const before = (await records()).length;
  await command('/observer serve');
  const notification = await until(async () => (await records()).slice(before).find(item => item.type === 'notification' && /^http:/.test(item.message)), 'observer URL');
  await Bun.sleep(1200);
  const response = await fetch(new URL('/v1/snapshot', notification.message));
  const text = await response.text();
  emit('GET /v1/snapshot', { status: response.status, schema: response.headers.get('x-observer-schema'), bytes: Buffer.byteLength(text) });
  return { url: notification.message, snapshot: JSON.parse(text) };
}
try {
  const args = ['--mode', 'rpc', '--no-lsp', '--no-title', '--model', 'stub/scripted', '-e', '/tmp/gb1-extension.ts'];
  emit('COMMAND', ['omp', '--profile', scenario, ...args]);
  processHandle = profile.spawn(args);
  const consumeOut = (async () => {
    const reader = processHandle.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (; ;) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      rawOut += text;
      buffer += text;
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        try {
          const value = JSON.parse(line);
          events.push(value);
          if (value.type === 'response') pending.get(value.id)?.(value);
          if (value.type === 'tool_execution_end' && value.isError) emit('TOOL_ERROR', value);
        } catch { if (line) emit('NON_RPC_OUTPUT', line); }
      }
    }
  })();
  const consumeErr = (async () => { rawErr = await new Response(processHandle.stderr).text(); })();
  const ready = await until(async () => (await records()).find(item => item.type === 'ready'), 'main extension ready');
  emit('READY', ready);
  const baseline = await serve();
  emit('ZERO_SNAPSHOT', baseline.snapshot);
  if (scenario === 'aborted') {
    emit('RPC_COMMAND', 'HARNESS_AGENT=main');
    const prompt = await request('prompt', { message: 'HARNESS_AGENT=main' });
    await until(async () => (await records()).some(item => item.type === 'lifecycle' && item.value.status === 'started'), 'running child before cancellation');
    emit('RPC_COMMAND', 'abort');
    emit('ABORT_RESPONSE', await request('abort'));
    await until(() => events.find(event => event.type === 'prompt_result' && event.id === prompt.id), 'cancelled native prompt', 30000);
  } else await command('HARNESS_AGENT=main');
  if (['many-33', 'many-135', 'cold-restart', 'partial-restore', 'detached', 'follow-up', 'resume', 'tombstoned', 'parked'].includes(scenario)) {
    await until(async () => {
      const lifecycle = (await records()).filter(item => item.type === 'lifecycle').map(item => item.value);
      return new Set(lifecycle.filter(fact => fact.status !== 'started').map(fact => fact.id)).size >= expectedCounts[scenario];
    }, 'all native children settled', 180000);
  }
  const observed = await serve();
  const native = await dump();
  emit('COMPARE', scenario, compare(observed.snapshot, native, expectedCounts[scenario]));
  emit('NATIVE_IDENTITIES', native.refs.filter(ref => ref.kind !== 'main').map(ref => ({ id: ref.id, parentId: ref.parentId, kind: ref.kind, displayName: ref.displayName, status: ref.status, tombstoned: ref.tombstoned })));
  if (['follow-up', 'same-id-replacement', 'fork', 'resume', 'cold-restart', 'partial-restore'].includes(scenario)) {
    emit('NATIVE_CAPABILITIES', { registryMethods: native.registryMethods, piExports: native.piExports, contextMethods: native.contextMethods });
  }
  if (['many-33', 'many-135'].includes(scenario)) {
    const limit = scenario === 'many-33' ? 32 : 128;
    await command('/gb1 cap ' + JSON.stringify({ repo: process.cwd(), limit }));
    const cap = (await records()).filter(item => item.type === 'cap').at(-1);
    emit('CAP', cap);
    emit('CAP_RESULT', { pass: cap.inventory.state === 'partial' && cap.rows === limit && cap.inventory.reason === `cap ${limit} of ${expectedCounts[scenario]}` });
  }
  if (scenario === 'one-child' && process.argv[3] === 'faults') {
    const id = observed.snapshot.children[0].childId;
    for (const indices of [[0, 1], [1, 0], [0, 1, 1], [1, 0, 1]]) {
      await command('/gb1 replay ' + JSON.stringify({ id, indices }));
      const replayed = await serve();
      const row = replayed.snapshot.children.find(row => row.childId === id);
      emit('REORDER_RESULT', { indices, pass: row.outcome.state === 'completed' || (row.outcome.state === 'unknown' && row.outcome.reason === 'conflicting evidence'), outcome: row.outcome });
    }
    await command('/gb1 throw');
    const interrupted = await serve();
    emit('INTERRUPTED_RESULT', { pass: interrupted.snapshot.inventory.state === 'partial', inventory: interrupted.snapshot.inventory, rows: interrupted.snapshot.children.length });
    await command('/gb1 unthrow');
  }
  await writeFile('/tmp/gb1-' + scenario + '-capture.json', JSON.stringify({ observed, native, events }, null, 2));
  processHandle.kill();
  emit('PROCESS_EXIT', await processHandle.exited);
  await Promise.all([consumeOut, consumeErr]);
  if (rawErr.trim()) emit('STDERR', rawErr);
} catch (error) {
  emit('DRIVER_ERROR', String(error));
  if (rawOut) emit('RPC_OUTPUT', rawOut);
  if (rawErr) emit('STDERR', rawErr);
  process.exitCode = 1;
} finally {
  if (processHandle) processHandle.kill();
  await profile.teardown();
  emit('PROFILE_REMOVED', scenario);
  await writeFile('/tmp/gb1-' + scenario + '.out', output.join('\n') + '\n');
}

```

### Historical source `/tmp/gb1-compare.ts`
This is the earlier comparator, not the revision used for the later unknown-inventory PASS records. It still requires complete inventory and row-before-snapshot timestamp ordering. The exact comparator source for those earlier records was not preserved. The final comparator and fresh scenario reruns are retained in the review-closure annex below.

```ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';

export function compare(snapshot, native, expectedCount) {
  const differences = [];
  const refs = native.refs;
  const prefix = resolve(native.root.replace(/\.jsonl$/, '')) + sep;
  const admitted = refs.filter(ref => {
    if (ref.kind !== 'sub' || !ref.sessionFile || !resolve(ref.sessionFile).startsWith(prefix)) return false;
    const visited = new Set();
    let current = ref;
    while (current?.kind === 'sub' && current.sessionFile && resolve(current.sessionFile).startsWith(prefix) && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.parentId === 'Main') return true;
      current = refs.find(parent => parent.id === current.parentId);
    }
    return false;
  });
  const check = (label, actual, expected) => {
    try { assert.deepEqual(actual, expected); }
    catch { differences.push({ field: label, actual, expected }); }
  };
  const known = (label, actual, value) => {
    if (value === undefined) {
      check(label + '.known', actual?.known, false);
      if (!actual?.reason) differences.push({ field: label + '.reason', actual, expected: 'nonempty unknown reason' });
    } else check(label, actual, { known: true, value });
  };
  check('schema', snapshot.schema, 1);
  known('rootSession', snapshot.rootSession, native.root);
  check('inventory.state', snapshot.inventory?.state, 'complete');
  check('children.ids', snapshot.children.map(row => row.childId).sort(), admitted.map(ref => ref.id).sort());
  if (expectedCount !== undefined) check('native.count', admitted.length, expectedCount);
  if (!/^[0-9a-f-]{36}$/.test(snapshot.epoch)) differences.push({ field: 'epoch', actual: snapshot.epoch, expected: 'UUID' });
  if (!Number.isInteger(snapshot.generation) || snapshot.generation < 1) differences.push({ field: 'generation', actual: snapshot.generation, expected: 'positive integer' });
  if (!Number.isFinite(Date.parse(snapshot.observedAt))) differences.push({ field: 'observedAt', actual: snapshot.observedAt, expected: 'ISO sample timestamp' });
  for (const row of snapshot.children) {
    const ref = admitted.find(item => item.id === row.childId);
    if (!ref) continue;
    for (const [field, value] of Object.entries({ childId: ref.id, parentId: ref.parentId, rootSession: native.root, kind: 'sub', agentName: ref.displayName, registryStatus: ref.status, tombstoned: ref.tombstoned, grantScope: 'none' })) check(row.childId + '.' + field, row[field], value);
    known(row.childId + '.modelRole', row.modelRole, ref.history?.modelRole);
    known(row.childId + '.resolvedModel', row.resolvedModel, ref.history?.resolvedModel ?? ref.session?.resolvedModel);
    for (const field of ['responseAt', 'acceptedAt', 'terminalAt']) known(row.childId + '.milestones.' + field, row.milestones[field], ref.lifecycle?.[field] === undefined ? undefined : new Date(ref.lifecycle[field]).toISOString());
    check(row.childId + '.activity.sampled', row.activity.sampled, true);
    known(row.childId + '.activity.lastActivityAt', row.activity.lastActivityAt, ref.lastActivity === undefined ? undefined : new Date(ref.lastActivity).toISOString());
    for (const field of ['repoRoot', 'parentWorktree', 'childWorktree', 'isolation']) known(row.childId + '.lineage.' + field, row.lineage[field], undefined);
    known(row.childId + '.lineage.cwd', row.lineage.cwd, ref.session?.cwd);
    known(row.childId + '.lineage.branch', row.lineage.branch, ref.history?.branchName);
    check(row.childId + '.completeness.state', row.completeness.state, 'unknown');
    if (!row.completeness.reason) differences.push({ field: row.childId + '.completeness.reason', actual: row.completeness, expected: 'nonempty native-lineage limitation' });
    if (!Number.isFinite(Date.parse(row.observedAt)) || Date.parse(row.observedAt) > Date.parse(snapshot.observedAt)) differences.push({ field: row.childId + '.observedAt', actual: row.observedAt, expected: 'valid sample not after snapshot' });
    const lifecycle = native.facts.filter(fact => fact.id === row.childId && fact.sessionFile === ref.sessionFile);
    const last = lifecycle.at(-1);
    if (last && row.outcome.state !== 'unknown') {
      check(row.childId + '.outcome.state', row.outcome.state, last.status);
      check(row.childId + '.outcome.generation', row.outcome.generation, lifecycle.filter(fact => fact.status === 'started').length);
      known(row.childId + '.outcome.spawnCallId', row.outcome.spawnCallId, last.parentToolCallId);
      if (Math.abs(Date.parse(row.outcome.at) - Date.parse(last.receivedAt)) > 1000) differences.push({ field: row.childId + '.outcome.at', actual: row.outcome.at, expected: last.receivedAt });
    } else if (row.outcome.state === 'unknown' && !row.outcome.reason) differences.push({ field: row.childId + '.outcome', actual: row.outcome, expected: 'explicit evidence limitation' });
    if (ref.transcript) {
      check(row.childId + '.transcript.invalidHeader', ref.transcript.invalidHeader, false);
      check(row.childId + '.transcript.malformedRecords', ref.transcript.malformedRecords, 0);
      if (ref.session?.cwd) check(row.childId + '.transcript.cwd', ref.transcript.header.cwd, ref.session.cwd);
      if (ref.transcript.header.agentId !== undefined) check(row.childId + '.transcript.agentId', ref.transcript.header.agentId, ref.id);
      if (ref.transcript.header.parentAgentId !== undefined) check(row.childId + '.transcript.parentAgentId', ref.transcript.header.parentAgentId, ref.parentId);
    }
  }
  const normalize = value => JSON.stringify(value).replaceAll(native.root, '<root>').replace(/\/tmp\/omp-orca-harness-[^/]+/g, '<tmp>');
  const nativeListing = admitted.map(ref => ({ id: ref.id, parentId: ref.parentId, displayName: ref.displayName, status: ref.status, history: ref.history, lifecycle: ref.lifecycle, session: ref.session && { cwd: ref.session.cwd, resolvedModel: ref.session.resolvedModel }, transcriptHeader: ref.transcript?.header, tombstoned: ref.tombstoned }));
  const rowListing = snapshot.children;
  return {
    pass: differences.length === 0, expectedCount, nativeChildren: admitted.length, rows: snapshot.children.length,
    advisors: refs.filter(ref => ref.kind === 'advisor').length, inventory: snapshot.inventory,
    nativeListing: { lines: nativeListing.length, sha256: createHash('sha256').update(normalize(nativeListing)).digest('hex') },
    rowListing: { lines: rowListing.length, sha256: createHash('sha256').update(normalize(rowListing)).digest('hex') },
    differences,
  };
}

```

### Source `/tmp/gb1-check-capture.ts`

```ts
import { readFile } from 'node:fs/promises';
import { compare } from './gb1-compare.ts';
const scenario = process.argv[2];
const captured = JSON.parse(await readFile('/tmp/gb1-' + scenario + '-capture.json', 'utf8'));
console.log('COMPARE', scenario, JSON.stringify(compare(captured.observed.snapshot, captured.native, Number(process.argv[3]))));

```

### Source `/tmp/gb1-batch.ts`

```ts
const scenarios = process.argv.slice(2);
for (let offset = 0; offset < scenarios.length; offset += 3) {
  await Promise.all(scenarios.slice(offset, offset + 3).map(async scenario => {
    const command = ['bun', '/tmp/gb1-driver.ts', scenario, ...(scenario === 'one-child' ? ['faults'] : [])];
    const child = Bun.spawn(command, { cwd: process.cwd(), stdout: 'pipe', stderr: 'pipe' });
    const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
    console.log('INVOCATION', command.join(' '));
    console.log(stdout);
    if (stderr) console.log('DRIVER_STDERR', stderr);
    console.log('DRIVER_EXIT', scenario, code);
  }));
}

```

### Source `/tmp/gb1-reader.ts`

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
// Runtime-selected repository imports exercise the dispatch's disposable module-load boundary.
const repo = process.argv[2];
const { reads } = await import(join(repo, 'omp-orca-observer/checks/harness/fs-probe.ts'));
const { readPage } = await import(join(repo, 'omp-orca-observer/reader.ts'));
const { parseSessionContent } = await import(join(repo, 'node_modules/@oh-my-pi/pi-coding-agent/src/session/session-loader.ts'));
const sessionFile = join(repo, 'omp-orca-observer/checks/harness/fixtures/small.jsonl');
const bytes = await readFile(sessionFile);
const firstRecordBytes = bytes.indexOf(10) + 1;
console.log('FIXTURE', JSON.stringify({ file: '$PWD/omp-orca-observer/checks/harness/fixtures/small.jsonl', totalBytes: bytes.length, firstRecordBytes }));
for (const maxBytes of [16, 1, 0]) {
  let token = null;
  let firstEnd = null;
  let ended = false;
  let bounded = true;
  let monotone = true;
  let cursor = 0;
  let oversized = false;
  let emptyNonEnd = 0;
  const limit = maxBytes === 0 ? 3 : bytes.length + 10;
  for (let step = 0; step < limit; step++) {
    const before = reads.length;
    const result = await readPage({ childId: 'native-fixture', sessionFile, epoch: 'gb1', token, mode: 'bytes', maxBytes, signal: new AbortController().signal }, parseSessionContent);
    assert.notEqual(result.kind, 'unavailable');
    const windows = reads.slice(before).filter(read => read.path === sessionFile);
    if (windows.some(read => read.length > maxBytes)) bounded = false;
    const decoded = JSON.parse(Buffer.from(result.token, 'base64url').toString('utf8'));
    if (result.kind === 'record_too_large' && result.end !== null && firstEnd === null) firstEnd = result.end;
    const payloadBytes = result.kind === 'page' ? Buffer.from(result.bytesBase64 ?? '', 'base64').length : 0;
    if (payloadBytes > maxBytes) oversized = true;
    if (decoded.cursor <= cursor && !(result.kind === 'page' && result.atEnd)) monotone = false;
    cursor = decoded.cursor;
    if (result.kind === 'page' && !result.atEnd && payloadBytes === 0) emptyNonEnd++;
    if (maxBytes !== 1 || result.kind === 'page' || result.end !== null || step === 0) {
      console.log('STEP', JSON.stringify({ maxBytes, step, kind: result.kind, start: result.start, end: result.end, scannedTo: result.scannedTo, atEnd: result.atEnd, cursor, payloadBytes, reads: windows.map(read => ({ offset: read.offset, length: read.length })) }));
    }
    token = result.token;
    if (result.kind === 'page' && result.atEnd) { ended = true; break; }
  }
  const pass = bounded && monotone && !oversized && firstEnd === firstRecordBytes && ended && emptyNonEnd === 0;
  console.log('RESULT', JSON.stringify({ maxBytes, pass, bounded, monotone, oversized, firstEnd, expectedFirstEnd: firstRecordBytes, ended, emptyNonEnd }));
}

```

### Source `/tmp/gb1-reader-launch.ts`

```ts
import { join } from 'node:path';
// Runtime-selected source root; no omp module loads in this parent process.
const repo = process.cwd();
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const profile = await create('one-child');
try {
  const env = {
    PATH: process.env.PATH ?? '', HOME: profile.home, TMPDIR: join(profile.root, 'tmp'),
    XDG_CONFIG_HOME: join(profile.root, 'config'), XDG_CACHE_HOME: join(profile.root, 'cache'),
    XDG_DATA_HOME: join(profile.root, 'data'), XDG_STATE_HOME: join(profile.root, 'state'),
  };
  console.log('COMMAND', 'Bun.spawn(["bun", "/tmp/gb1-reader.ts", "$PWD"], { cwd: "<tmp>/workspace", env: harnessDisposableEnv })');
  const child = Bun.spawn(['bun', '/tmp/gb1-reader.ts', repo], { cwd: profile.workspace, env, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  console.log(stdout.replaceAll(repo, '$PWD').replaceAll(profile.root, '<tmp>'));
  if (stderr) console.log('STDERR', stderr.replaceAll(repo, '$PWD').replaceAll(profile.root, '<tmp>'));
  console.log('EXIT', code);
} finally {
  await profile.teardown();
  console.log('PROFILE_REMOVED');
}

```

### Output: `bun /tmp/gb1-driver.ts detached`

```text
COMMAND ["omp","--profile","detached","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/detached/agent/sessions/--tmp-omp-orca-harness-AzWXLK-workspace--/2026-09-30T21-08-13-693Z_01a0f425-80fd-76d7-9ffb-2242119ee850.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":382}
ZERO_SNAPSHOT {"schema":1,"epoch":"e121a782-61df-4d9f-a7c0-c529f64e8221","generation":1,"observedAt":"2026-09-30T21:08:14.058Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/detached/agent/sessions/--tmp-omp-orca-harness-AzWXLK-workspace--/2026-09-30T21-08-13-693Z_01a0f425-80fd-76d7-9ffb-2242119ee850.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1830}
RPC_COMMAND /gb1 dump
COMPARE detached {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"79eeeb5a9c97825bbf9da7f473931f9437cbd274fb9d3a9bfcc7c6d39ea7284f"},"rowListing":{"lines":1,"sha256":"f989f396ca608e0265ebfd40e77f3ee38ebd2a677cbee0ce35d6904156e56cee"},"differences":[]}
NATIVE_IDENTITIES [{"id":"detached-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED detached
```

### Output: `bun /tmp/gb1-driver.ts eval-agent`

```text
COMMAND ["omp","--profile","eval-agent","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/eval-agent/agent/sessions/--tmp-omp-orca-harness-4xdRgF-workspace--/2026-09-30T21-08-13-683Z_01a0f425-80f3-723e-ae71-8d88c82833c1.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":384}
ZERO_SNAPSHOT {"schema":1,"epoch":"eb7fe09e-d438-425a-801a-ef58d5afdb4a","generation":1,"observedAt":"2026-09-30T21:08:14.050Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/eval-agent/agent/sessions/--tmp-omp-orca-harness-4xdRgF-workspace--/2026-09-30T21-08-13-683Z_01a0f425-80f3-723e-ae71-8d88c82833c1.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1821}
RPC_COMMAND /gb1 dump
COMPARE eval-agent {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"0f4db4ff0196247ffd9e81d5e45ee7e3f6c9a06eda16e6d682e6806d0f91ebbe"},"rowListing":{"lines":1,"sha256":"767c4b8d57efef573e9dbef48c8955ec20304501ea8f1f5c3dd50c9e508c19d9"},"differences":[]}
NATIVE_IDENTITIES [{"id":"eval-child","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED eval-agent
```

### Output: `bun /tmp/gb1-driver.ts nested`

```text
COMMAND ["omp","--profile","nested","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/nested/agent/sessions/--tmp-omp-orca-harness-YTx6Zd-workspace--/2026-09-30T21-08-13-664Z_01a0f425-80e0-711d-b59b-e2fbe7fc88c3.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":380}
ZERO_SNAPSHOT {"schema":1,"epoch":"022a6831-f215-451d-95e0-e63164cd479d","generation":1,"observedAt":"2026-09-30T21:08:14.021Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/nested/agent/sessions/--tmp-omp-orca-harness-YTx6Zd-workspace--/2026-09-30T21-08-13-664Z_01a0f425-80e0-711d-b59b-e2fbe7fc88c3.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":3304}
RPC_COMMAND /gb1 dump
COMPARE nested {"pass":true,"expectedCount":2,"nativeChildren":2,"rows":2,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":2,"sha256":"04451c2b8f27817f05328739a84b8573b9d6459898e6a38d3aeba7953e903200"},"rowListing":{"lines":2,"sha256":"fea115f1bcf9da0963d4eb11ee28646e5691d34a790428cf6adaff89d8f5464d"},"differences":[]}
NATIVE_IDENTITIES [{"id":"nested-parent","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false},{"id":"nested-parent.nested-leaf","parentId":"nested-parent","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED nested
```

### Output: `bun /tmp/gb1-driver.ts restricted`

```text
COMMAND ["omp","--profile","restricted","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/restricted/agent/sessions/--tmp-omp-orca-harness-L63Z6o-workspace--/2026-09-30T21-08-20-316Z_01a0f425-9adc-7167-89be-fbf2225b4ead.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":384}
ZERO_SNAPSHOT {"schema":1,"epoch":"f133d301-b1a8-40e0-90ae-d43329dd0f99","generation":1,"observedAt":"2026-09-30T21:08:20.789Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/restricted/agent/sessions/--tmp-omp-orca-harness-L63Z6o-workspace--/2026-09-30T21-08-20-316Z_01a0f425-9adc-7167-89be-fbf2225b4ead.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1844}
RPC_COMMAND /gb1 dump
COMPARE restricted {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"089a84d4e0d4cc2d259dbca17ba9ce6ed5c355bb0c9e99df27f2d868e160c94f"},"rowListing":{"lines":1,"sha256":"9502e188f654cde06e9572009170922a3b1d8a2ea8eddee0f27b64afc2dda543"},"differences":[]}
NATIVE_IDENTITIES [{"id":"restricted-child","parentId":"Main","kind":"sub","displayName":"restricted","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED restricted
```

### Output: `bun /tmp/gb1-driver.ts long-labels`

```text
COMMAND ["omp","--profile","long-labels","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/long-labels/agent/sessions/--tmp-omp-orca-harness-uZiIJe-workspace--/2026-09-30T21-08-20-316Z_01a0f425-9adc-7685-bcf4-adefcf647d6e.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":385}
ZERO_SNAPSHOT {"schema":1,"epoch":"5674b513-435d-4e40-b5e7-2d4ee835f01c","generation":1,"observedAt":"2026-09-30T21:08:20.668Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/long-labels/agent/sessions/--tmp-omp-orca-harness-uZiIJe-workspace--/2026-09-30T21-08-20-316Z_01a0f425-9adc-7685-bcf4-adefcf647d6e.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":3340}
RPC_COMMAND /gb1 dump
COMPARE long-labels {"pass":true,"expectedCount":2,"nativeChildren":2,"rows":2,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":2,"sha256":"4cfc82df76ef75629ed470799d1a5d6323129d145c93310abb1da2471f91bf40"},"rowListing":{"lines":2,"sha256":"2ab42d3c7d7972c75bfc210942bd0a16e3c049396db37ccb2602c6fa185afd5c"},"differences":[]}
NATIVE_IDENTITIES [{"id":"collision-abcdefghijklmnopqrstuvwxyz-0123456789-","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false},{"id":"collision-abcdefghijklmnopqrstuvwxyz-0123456789--2","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED long-labels
```

### Output: `bun /tmp/gb1-driver.ts explicit-long-ids`

```text
COMMAND ["omp","--profile","explicit-long-ids","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/explicit-long-ids/agent/sessions/--tmp-omp-orca-harness-ySxK7u-workspace--/2026-09-30T21-08-20-318Z_01a0f425-9ade-77cc-9c67-3eb5fad6e921.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":391}
ZERO_SNAPSHOT {"schema":1,"epoch":"f93feb99-9c4d-4502-a4a1-94c576e5c065","generation":1,"observedAt":"2026-09-30T21:08:21.047Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/explicit-long-ids/agent/sessions/--tmp-omp-orca-harness-ySxK7u-workspace--/2026-09-30T21-08-20-318Z_01a0f425-9ade-77cc-9c67-3eb5fad6e921.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1915}
RPC_COMMAND /gb1 dump
COMPARE explicit-long-ids {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"785e58f84952c3c7bf64c8ab277a0d9ed9c6db2aa9916601e8c50cf062a407d6"},"rowListing":{"lines":1,"sha256":"49c1934dcd0459e453e2281a3914ff09ba827fc21c3fdd8ab24af0b507976694"},"differences":[]}
NATIVE_IDENTITIES [{"id":"caller-chosen-explicit-id-abcdefghijklmnopqrstuvwxyz-0123456789-long","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED explicit-long-ids
```

### Output: `bun /tmp/gb1-driver.ts duplicate-labels`

```text
COMMAND ["omp","--profile","duplicate-labels","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/duplicate-labels/agent/sessions/--tmp-omp-orca-harness-wGqrCa-workspace--/2026-09-30T21-08-26-034Z_01a0f425-b132-77f4-8f72-f2afa4483462.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":390}
ZERO_SNAPSHOT {"schema":1,"epoch":"fdc51e77-8518-47a1-a221-a7a693984233","generation":1,"observedAt":"2026-09-30T21:08:26.380Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/duplicate-labels/agent/sessions/--tmp-omp-orca-harness-wGqrCa-workspace--/2026-09-30T21-08-26-034Z_01a0f425-b132-77f4-8f72-f2afa4483462.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":3277}
RPC_COMMAND /gb1 dump
COMPARE duplicate-labels {"pass":true,"expectedCount":2,"nativeChildren":2,"rows":2,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":2,"sha256":"e2955aa9361c4d05ab84bb4335fa5f8ec9951bcb2b3f3c23c2fad3de2a8cf9ec"},"rowListing":{"lines":2,"sha256":"dfd7dd93de689c73bd8f616431288baa5c3cc16018ab6f581bbef1ea9fa2e04a"},"differences":[]}
NATIVE_IDENTITIES [{"id":"duplicate","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false},{"id":"duplicate-2","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED duplicate-labels
```

### Output: `bun /tmp/gb1-driver.ts advisor-present`

```text
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-9svupc-workspace--/2026-09-30T21-08-25-872Z_01a0f425-b090-71fe-910a-d216b8aceb4a.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":389}
ZERO_SNAPSHOT {"schema":1,"epoch":"1514a916-9965-40bd-8662-608327e07f96","generation":1,"observedAt":"2026-09-30T21:08:26.223Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-9svupc-workspace--/2026-09-30T21-08-25-872Z_01a0f425-b090-71fe-910a-d216b8aceb4a.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1853}
RPC_COMMAND /gb1 dump
COMPARE advisor-present {"pass":false,"expectedCount":0,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"48dfca9c5d82ab3fc48c09668546ed050dbdbbebba6112fb2e508d1f7e0061c1"},"rowListing":{"lines":1,"sha256":"813bf0e5bf12c9a1ea7a7181984e1f51407a8fa61f17d75071fa64365eb4267b"},"differences":[{"field":"native.count","actual":1,"expected":0}]}
NATIVE_IDENTITIES [{"id":"advisor-child","parentId":"Main","kind":"sub","displayName":"advisor","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED advisor-present
```

### Output: `bun /tmp/gb1-driver.ts parked`

```text
COMMAND ["omp","--profile","parked","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-tL9fs8-workspace--/2026-09-30T21-08-26-032Z_01a0f425-b130-718a-b129-11ac9b7a4458.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":380}
ZERO_SNAPSHOT {"schema":1,"epoch":"817451fc-518d-4927-a213-d5bdaee2554d","generation":1,"observedAt":"2026-09-30T21:08:26.377Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-tL9fs8-workspace--/2026-09-30T21-08-26-032Z_01a0f425-b130-718a-b129-11ac9b7a4458.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1799}
RPC_COMMAND /gb1 dump
COMPARE parked {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"a72f842f16c7e0bd1f3116ae1c6e89ae2d3309df3a1ac21e85d3c3ee451164bc"},"rowListing":{"lines":1,"sha256":"71716b996709be46a075a4e6eaa5c45cf785de6d8b28e778dff45905c942acc6"},"differences":[]}
NATIVE_IDENTITIES [{"id":"parked-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
PROCESS_EXIT 143
PROFILE_REMOVED parked
```

### Output: `bun /tmp/gb1-driver.ts aborted`

```text
COMMAND ["omp","--profile","aborted","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/aborted/agent/sessions/--tmp-omp-orca-harness-57pLNh-workspace--/2026-09-30T21-08-30-943Z_01a0f425-c45f-70c1-9ae5-0a4564dd2a07.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":381}
ZERO_SNAPSHOT {"schema":1,"epoch":"003ce45f-e909-41f6-a331-5733a8ee0347","generation":1,"observedAt":"2026-09-30T21:08:31.291Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/aborted/agent/sessions/--tmp-omp-orca-harness-57pLNh-workspace--/2026-09-30T21-08-30-943Z_01a0f425-c45f-70c1-9ae5-0a4564dd2a07.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND abort
ABORT_RESPONSE {"id":"gb1-3","type":"response","command":"abort","success":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1806}
RPC_COMMAND /gb1 dump
COMPARE aborted {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"48c422094f8a66108aa9af1368421b7d8c382c7f5f841a836cd06b0787b8c642"},"rowListing":{"lines":1,"sha256":"83e479577598e78e01ec6f3a78fc0c1c766d582111b801a019351d244a37805d"},"differences":[]}
NATIVE_IDENTITIES [{"id":"aborted-child","parentId":"Main","kind":"sub","displayName":"blocking","status":"aborted","tombstoned":true}]
PROCESS_EXIT 143
PROFILE_REMOVED aborted
```

### Output: `bun /tmp/gb1-driver.ts tombstoned`

```text
COMMAND ["omp","--profile","tombstoned","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/tombstoned/agent/sessions/--tmp-omp-orca-harness-kI3cq6-workspace--/2026-09-30T21-08-30-941Z_01a0f425-c45d-752f-887c-1e227f9ebf99.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":384}
ZERO_SNAPSHOT {"schema":1,"epoch":"8a0fd1d4-7030-4647-bf05-afe479125e9b","generation":1,"observedAt":"2026-09-30T21:08:31.286Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/tombstoned/agent/sessions/--tmp-omp-orca-harness-kI3cq6-workspace--/2026-09-30T21-08-30-941Z_01a0f425-c45d-752f-887c-1e227f9ebf99.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1813}
RPC_COMMAND /gb1 dump
COMPARE tombstoned {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"df9789d115249915b8a0d00cffa3445d0e5bde8aac3a833ef943720a062b1024"},"rowListing":{"lines":1,"sha256":"ffe6556a7aa6f788f76e8e4ca7a07b91196ea5ff0940a1a75a002cbbb664fbab"},"differences":[]}
NATIVE_IDENTITIES [{"id":"tombstone-child","parentId":"Main","kind":"sub","displayName":"task","status":"aborted","tombstoned":true}]
PROCESS_EXIT 143
PROFILE_REMOVED tombstoned
```

### Output: `bun /tmp/gb1-driver.ts follow-up`

```text
COMMAND ["omp","--profile","follow-up","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-kjL0ol-workspace--/2026-09-30T21-08-30-941Z_01a0f425-c45d-70b0-9107-9285d93fffb1.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":383}
ZERO_SNAPSHOT {"schema":1,"epoch":"99e831c5-5505-4b78-bc62-ba331488354c","generation":1,"observedAt":"2026-09-30T21:08:31.286Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-kjL0ol-workspace--/2026-09-30T21-08-30-941Z_01a0f425-c45d-70b0-9107-9285d93fffb1.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1834}
RPC_COMMAND /gb1 dump
COMPARE follow-up {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"9df51fcd933f4e75c16b40d263c0d28fdf22e617d420039f69a6e5aeae7958bc"},"rowListing":{"lines":1,"sha256":"61e58f95e70d664249d1a8387f3fa71b61b5a6f4da3fd7fb0a59144852d4c019"},"differences":[]}
NATIVE_IDENTITIES [{"id":"follow-up-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"piExports":["ALL_SEGMENT_IDS","ARTIFACT_DEFAULT_HEAD_BYTES","ARTIFACT_DEFAULT_MAX_BYTES","AdvisorConfigOverlayComponent","AgentOutputManager","AgentRegistry","AgentSession","AskTool","AssistantMessageComponent","AstEditTool","AstGrepTool","AuthStorage","BACKGROUND_TAN_DISPATCH_MESSAGE_TYPE","BROWSER_FRAME_ROWS","BUDGET_STOP_GRACE_REQUESTS","BUILTIN_TOOLS","BUNDLED_AGENTS","BashExecutionComponent","BashTool","BorderedLoader","BranchSummaryMessageComponent","CHAT_MODEL_ROLE_IDS","CHECKPOINT_ACTIVE_REMINDER_TYPE","COMPOSER_DEFAULTS","CRITICAL_BASH_PATTERNS","CURRENT_SESSION_VERSION","CheckpointTool","CmuxSocketClient","CollapsedSyntheticMessageComponent","CompactionSummaryMessageComponent","Composer","ComputerSupervisor","Container","ContextNotesTool","CountdownTimer","CustomEditor","CustomMessageComponent","CustomToolAdapter","CustomToolLoader","DEBUG_READONLY_ACTIONS","DEFAULT_CUSTOM_MESSAGE_TYPE","DEFAULT_FILE_LIMIT","DEFAULT_MAX_BYTES","DEFAULT_MAX_COLUMN","DEFAULT_MAX_LINES","DEFAULT_RELAY_URL","DEFAULT_SHIMMER_PALETTE","DebugTool","DynamicBorder","EPHEMERAL_MODEL_CHANGE_ROLE","ESSENTIAL_BUILTIN_TOOL_NAMES","EXTENSION_HANDLER_TIMEOUT_MS","EditTool","EvalTool","ExtensionEditorComponent","ExtensionInputComponent","ExtensionRunner","ExtensionRuntimeNotInitializedError","ExtensionSelectorComponent","ExtensionToolWrapper","FileFormatResult","FileSessionStorage","FindTool","FooterComponent","ForkSourceNotFoundError","GENERIC_ABORT_SENTINEL","GH_COMMAND_TIMEOUT_MS","GithubTool","GlobTool","GoalRuntime","GoalTool","GrepTool","HIDDEN_TOOLS","HandoffSummaryMessageComponent","HookEditorComponent","HookInputComponent","HookMessageComponent","HookSelectorComponent","INTERNAL_DETAILS_FIELDS","INTERRUPTED_THINKING_MESSAGE_TYPE","IdaTool","IndexedSessionStorage","InteractiveMode","KEYBINDINGS","KIND_ROLE_IDS","KeybindingsManager","LIVE_DELEGATION_MESSAGE_TYPE","LSP_LATE_DIAGNOSTIC_MESSAGE_TYPE","LSP_READONLY_ACTIONS","LearnTool","LoginDialogComponent","LogoutAccountSelectorComponent","LspTool","MAIN_AGENT_ID","MODEL_PICKER_COLUMNS","MODEL_ROLE_IDS","MULTI_FILE_PER_FILE_MATCHES","ManageSkillTool","Markdown","MemoryEditTool","MemoryRecallTool","MemoryReflectTool","MemoryRetainTool","MemorySessionStorage","ModelBrowser","ModelHubComponent","ModelPickerComponent","ModelRegistry","NewContextTool","OAuthSelectorComponent","OTHER_OPTION","OutputSink","PINNED_HUD_TOGGLE_ID","PI_LOGO","PREVIEW_PENDING_NOTICE","PREWALK_PLAN_MESSAGE_TYPE","PROPOSE_DEVICE_PATH","PromptDroppedError","QueueModeSelectorComponent","READ_ONLY_TOOL_NAMES","REJECT_DEVICE_PATH","REMOTE_REFRESH_SENTINEL","RESOLVE_DEVICE_PATH","ReadTool","ReadToolGroupComponent","RedisSessionStorage","RegisteredToolAdapter","RewindSelectorComponent","RewindTool","RpcClient","RpcCommandError","SEGMENTS","SESSION_SHUTDOWN_HANDLER_TIMEOUT_MS","SESSION_TITLE_SLOT_BYTES","SESSION_TITLE_SLOT_ENTRY_TYPE","SETTINGS_GATED_BUILTIN_TOOL_NAMES","SHUTDOWN_CONSOLIDATE_BUDGET_MS","SILENT_ABORT_MARKER","SINGLE_FILE_MATCHES","SKILL_PROMPT_MESSAGE_TYPE","SKILL_TOKEN_RE","SNAPSHOT_MAX_BYTES","SOFT_REQUEST_BUDGET","STATUS_LINE_PRESETS","SUBAGENT_WARNING_MISSING_YIELD","SUBAGENT_WARNING_NULL_YIELD","SUBAGENT_WARNING_SCHEMA_OVERRIDDEN","SecurityScanTool","SessionLockError","SessionManager","SessionModelScopeCache","SessionPersistenceIndeterminateError","SessionResolutionError","SessionSelectorComponent","SessionWriteConflictError","Settings","SettingsSelectorComponent","ShowImagesSelectorComponent","Spacer","SqlSessionStorage","SqliteAuthCredentialStore","StatusLineComponent","SubagentHudComponent","TASK_SUBAGENT_EVENT_CHANNEL","TASK_SUBAGENT_LIFECYCLE_CHANNEL","TASK_SUBAGENT_PROGRESS_CHANNEL","TITLE_CHANGE_ENTRY_TYPE","TODO_COMPACT_TERMINAL_ROWS_THRESHOLD","TODO_HUD_STATE_CUSTOM_TYPE","TOP_LEVEL_AGENT","TREE_FILTER_MODES","TailBuffer","TaskTool","Text","Theme","ThemeSelectorComponent","ThinkTool","ThinkingSelectorComponent","TodoReminderComponent","TodoTool","ToolExecutionComponent","TreeSelectorComponent","TtsrNotificationComponent","USER_INTERRUPT_LABEL","USER_TODO_EDIT_CUSTOM_TYPE","UserMessageComponent","VERSION","VIBE_MODE_CONTEXT_MESSAGE_TYPE","VIBE_TOOL_NAMES","VibeKillTool","VibeListTool","VibeSendTool","VibeSpawnTool","VibeWaitTool","WELCOME_LSP_SLOTS","WELCOME_SESSION_SLOTS","WaitTool","WebSearchTool","WelcomeComponent","WriteTool","XDEV_DOCS_PER_DEVICE_CAP","XDEV_DOCS_TOTAL_BUDGET","XDEV_EXTERNAL_DESCRIPTION_CAP","XDEV_KEEP_TOP_LEVEL","XDEV_TRANSPORT_TOOLS","YieldTool","__awaitAutoQaRecordPipelineForTests","__resetAutoQaConsentForTests","__resetAutoQaFlushStateForTests","addFileDeleteFallback","addFileWriteFallback","allowsSkillTokens","appKey","appKeyHint","appendInlineArgsFallback","applyOpsToPhases","applyPatchSchema","applyResolvedSystemPromptInputs","ariaSnapshotBaselineKey","askToolRenderer","assistantTurnDelivered","assistantTurnProducedOutput","attachIrcWakeTurnMonitor","bashExecutionToText","bashPtyViewport","bindPreparedExtensions","bindTheme","boundKeys","buildAriaSnapshotScript","buildBrowserItems","buildBudgetNotice","buildCoordinationAdvisory","buildDirectoryTree","buildGoalToolResponse","buildModelScopeNotification","buildReplanTitleContext","buildResolveReminderMessage","buildSearchAffinity","buildSearchDateQualifier","buildSessionContext","buildSessionModelScope","buildSessionOptions","buildSkillPromptMessage","buildSpecializationAdvisory","buildSystemPrompt","buildWakeRelayBody","buildWorkspaceTree","cleanupEmptyMoveSession","cmuxSnapshotToObservation","collectAriaSnapshotRefs","collectIrcPeerRoster","committedTodoPhases","compactionThresholdSettings","completionBudgetReport","composeSpawnAdvisory","computeEditorMaxHeight","computerApproval","convertToLlm","copySessionArtifacts","createAcpSessionFactory","createAgentSession","createAutoLearnCaptureRunner","createBranchSummaryMessage","createBrowserPrelude","createCompactionSummaryMessage","createComputerPrelude","createCustomMessage","createHandoffSummaryMessageComponent","createHighlightStream","createLspWritethrough","createMCPProxyTools","createSessionManager","createSubagentSettings","createTodoHudStateData","createTools","createVibeTools","createXdevState","customToolToDefinition","dedupeEphemeralReply","defaultLoadModeForToolName","defineRpcClientTool","deleteFileWithFallback","demoteInterruptedThinking","describeSegment","describeSegmentTrack","describeShimmer","describeSubagentHud","detectLanguageId","didSessionMessagesChange","diffAriaSnapshot","discoverAgents","discoverAndLoadCustomTools","discoverAndLoadExtensions","discoverAuthStorage","discoverCommands","discoverContextFiles","discoverCustomTSCommands","discoverCustomToolPaths","discoverExtensionPaths","discoverExtensions","discoverMCPServers","discoverPromptTemplates","discoverSessionExtensionPaths","discoverSkills","discoverSlashCommands","discoverStartupLspServers","dispatchReportIssueDevice","dispatchResolutionDevice","dispatchXdevTool","disposeSessionQuietly","editDescriptionCompact","editorKey","editorKeys","emitSessionShutdownEvent","enableAutoTheme","enforceInlineByteCap","ensureTheme","ensureThemeSync","evalSchema","expandCommand","expandPromptTemplate","extensionToolSourceInfo","extractBracketedImagePastePath","extractBracketedImagePastePaths","extractBracketedPastePaths","extractImagePastePathsFromText","extractImagePathFromText","extractMarkdownOutline","extractPastePathsFromText","extractReadableFromHtml","extractSessionInit","fgOrPlain","filterMarkdownSections","filterSessionsForPicker","finalizeSubagentLifecycle","finalizeSubprocessOutput","findMostRecentNonEmptySession","findMostRecentSession","flushGrievances","flushLspWritethroughBatch","formatBillingSummary","formatDoubleTap","formatHeadTruncationNotice","formatKeyHint","formatKeyHints","formatMiddleElisionMarker","formatRepoRef","formatResultOutputFallback","formatRoleChip","formatSessionDumpText","formatTailTruncationNotice","formatTaskResultSummary","generateId","getActiveSkills","getAgent","getAgentDir","getAvailableSymbolPresets","getAvailableThemes","getAvailableThemesWithPaths","getColorBlindMode","getCommand","getCurrentThemeName","getDefaultPasteImageKeys","getEditStore","getEditorTheme","getEvalDocTopics","getEvalToolDescription","getExperimentalContextSession","getExtensionUISelectOptionLabel","getImageGenTools","getImageGenToolsWithRegistry","getLanguageFromPath","getLatestCompactionEntry","getLatestTodoPhasesFromEntries","getLatestTodoSnapshotIdentity","getLspStatus","getMarkdownTheme","getNativeThemePalette","getNativeThemePaletteKey","getOpenAiRemoteCompactionPayload","getOrFetchIssue","getOrFetchPr","getOrFetchPrDiff","getPreset","getRecentSessions","getResolvedThemeColors","getRestorableSessionModels","getSearchProvider","getSearchTools","getSelectListTheme","getSeparator","getSessionAccentAnsi","getSessionAccentHex","getSettingsListTheme","getSkillSlashCommandName","getSymbolPresetOverride","getSymbolTheme","getThemeByName","getThemeEpoch","getThemeExportColors","getTodoHudVisibility","github","githubIssueJsonWithStateReasonFallback","goalTokenDelta","gradientEscape","gradientLogo","groupedReadUsageCallIds","hasConversationalHistory","hasFileDeleteFallback","hasFileWriteFallback","hasWaitTool","hashlineEditParamsSchema","highlightCode","imageGenSchema","imageGenTool","initTheme","initThemeSync","interruptKey","invalidateConvertToLlmArrayCache","isAssistantMessageLine","isAuthenticated","isAutoQaEnabled","isCustomMessageContent","isEmptyAssistantStop","isEmptyErrorTurn","isEmptySession","isFindEnabled","isLightTheme","isMarkdownPath","isMountableUnderXdev","isNameClaimedByAuthoredSkill","isPermissionDeniedError","isPreviewResolutionToolCall","isProposeToolCall","isReadOnlyAgent","isReportIssueToolCall","isSilentAbort","isTitleContextReply","isTodoPhase","isToolCallEventType","isTranscriptEntry","isUserInterruptAbort","isUserInvokedSkillPrompt","isUserTurnInitiator","isValidSymbolPreset","isValidThemeColor","kNoAuth","keyHint","keyHintPlatform","layoutPinnedHud","listAllSessions","listSessions","listSessionsReadOnly","listXdevTools","loadCliExtensionProviders","loadCustomTools","loadEntriesFromFile","loadEntriesFromFileStream","loadExtensionFromFactory","loadExtensions","loadPromptTemplates","loadSessionExtensions","loadSessionFile","loadSessionMessagesReadOnly","loadSkills","loadSkillsFromDir","logProviderTurnError","logger","logoNode","main","mapWaitUntil","markdownToPhases","mergeDiscoveredModel","mergeSessionRanking","migrateKeybindingsConfigFile","migrateSessionEntries","migrateToCurrentVersion","modelSearchText","nativeDiff","nextActionableTask","noTruncResult","normalizeContinueSessionArgs","normalizeCustomMessagePayload","normalizePremiumRequests","onTerminalAppearanceChange","onThemeChange","openAutoQaDb","parseAriaRefSelector","parsePositiveDecimalInt","parsePrUnifiedDiff","parseSearchDateBound","parseSessionContent","parseSessionEntries","parseSkillInvocation","patchEditEntrySchema","patchEditSchema","phasesToMarkdown","pickWeightedTip","planSaveFileName","planXdevPromptDocs","postProcessAriaSnapshot","powerAssertionOptions","previewTheme","pythonExecutionToText","queueResolveHandler","rankModelItems","rankSessionSearchMatches","rawKeyHint","readArgsCollapseIntoGroup","readArgsHaveTarget","readPipedInput","readQueueChipText","rebuildScopedModelsAfterDiscovery","recoverAskQuestions","recoverOrphanedBackups","refreshAgentDiscovery","registerComputerController","releaseComputerSessionsForOwner","remainingTokens","renderDiff","renderGoalPrompt","renderSegment","renderSegmentTrack","renderSubagentHudLines","renderTrustedObjective","renderWelcomeTip","renderXdevPromptDocs","replaceEditSchema","replaceLlmImagesWithText","reportIssueDeviceUsage","resetActiveSkillsForTests","resetProviderAutoRefreshGuard","resetThinkingSpeedTracker","resetYieldTurnState","resolutionDeviceUsage","resolveAbortLabel","resolveAutoQaConsent","resolveBlobRefsInEntries","resolveBrowserKind","resolveBuiltinToolPlan","resolveCmuxKind","resolveDefaultRepoMemoized","resolveDialect","resolveDispatchDetails","resolveEditToolDescription","resolveEvalBackends","resolveLocalWavPath","resolveMountedXdevExecutable","resolveMountedXdevTool","resolvePrewalkTarget","resolveRelayKind","resolveResumableSession","resolveRoleAssignments","resolveScopedModels","resolveSegmentPalette","resolveSoftRequestBudget","resolveSpeculativeReadTarget","resolveSpeechCandidates","resolveTernKind","resolveTodoMarkdownPath","resolveXdevTool","resolveYieldReportText","restartBrowserForModeChange","routeViewportClick","runRootCommand","runSearchQuery","runSubagentFollowUpTurn","runSubprocess","sanitizeAssistantForReparentedHistory","sanitizeRehydratedOpenAIResponsesAssistantMessage","serializeEval","setActiveSkills","setAutoQaConsentHandler","setAutoThemeMapping","setColorBlindMode","setKeyHintPlatform","setMarkdownMermaidRendering","setNativeSymbolPreset","setShimmerMode","setSymbolPreset","setTheme","setThemeInstance","settings","sharedSpinnerFrame","shimmerEnabled","shimmerSegments","shimmerText","shouldEnterPlanModeOnStartup","shouldRenderAbortReason","sloppyEditSchema","smokeTestComputerWorker","sortModelItems","spawnComputerWorker","splitImageQuestionTarget","startMacOSAppearanceReprobeFallback","statusSegmentPriority","stopSharedSpinnerTicker","stopThemeWatcher","streamTailUpdates","stripImagesFromMessage","stripInternalDetailsFields","submitInteractiveInput","supportsExternalThinking","taskSchema","templateUsesInlineArgPlaceholders","testSetExtensionHandlerTimeoutMs","testSetSessionShutdownHandlerTimeoutMs","theme","themePickerOptions","thinkingDotToken","thinkingLevelWord","toSessionScopedModels","toolRenderName","truncateHead","truncateHeadBytes","truncateLine","truncateLineBytes","truncateMiddle","truncateTail","truncateTailBytes","truncateToVisualLines","ttsTool","userBubbleColor","visitEntriesFromFile","visitEntriesFromFileStream","warmHighlighter","warmupLspServers","watchScopedModelSettings","webSearchCustomTool","webSearchSchema","withFileMutationSession","wrapRegisteredTool","wrapRegisteredTools","wrapShellLineForClientTerminal","wrapSteeringForModel","writeDeviceDispatch","writeFileWithFallback","writeStartupNotice","writethroughNoop","xdevDocs","xdevDocsAll","xdevDocsFor","xdevEntries","xdevListing","z","zod"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
PROCESS_EXIT 143
PROFILE_REMOVED follow-up
```

### Output: `bun /tmp/gb1-driver.ts same-id-replacement`

```text
COMMAND ["omp","--profile","same-id-replacement","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-zE6O0o-workspace--/2026-09-30T21-08-35-625Z_01a0f425-d6a9-7699-ac66-70885407104f.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":393}
ZERO_SNAPSHOT {"schema":1,"epoch":"4110fa37-b4c5-4a5c-8913-1aaf46c0d33d","generation":1,"observedAt":"2026-09-30T21:08:35.998Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-zE6O0o-workspace--/2026-09-30T21-08-35-625Z_01a0f425-d6a9-7699-ac66-70885407104f.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1864}
RPC_COMMAND /gb1 dump
COMPARE same-id-replacement {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"d94dd7f376af556bdedc1804744a59c0513e9bfeac9c74786e21e4f900fa2a24"},"rowListing":{"lines":1,"sha256":"e9052913439b8fdcec0b04d5aa81e26c1220574501829b78dd99d56dd68cb8f5"},"differences":[]}
NATIVE_IDENTITIES [{"id":"replacement","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"piExports":["ALL_SEGMENT_IDS","ARTIFACT_DEFAULT_HEAD_BYTES","ARTIFACT_DEFAULT_MAX_BYTES","AdvisorConfigOverlayComponent","AgentOutputManager","AgentRegistry","AgentSession","AskTool","AssistantMessageComponent","AstEditTool","AstGrepTool","AuthStorage","BACKGROUND_TAN_DISPATCH_MESSAGE_TYPE","BROWSER_FRAME_ROWS","BUDGET_STOP_GRACE_REQUESTS","BUILTIN_TOOLS","BUNDLED_AGENTS","BashExecutionComponent","BashTool","BorderedLoader","BranchSummaryMessageComponent","CHAT_MODEL_ROLE_IDS","CHECKPOINT_ACTIVE_REMINDER_TYPE","COMPOSER_DEFAULTS","CRITICAL_BASH_PATTERNS","CURRENT_SESSION_VERSION","CheckpointTool","CmuxSocketClient","CollapsedSyntheticMessageComponent","CompactionSummaryMessageComponent","Composer","ComputerSupervisor","Container","ContextNotesTool","CountdownTimer","CustomEditor","CustomMessageComponent","CustomToolAdapter","CustomToolLoader","DEBUG_READONLY_ACTIONS","DEFAULT_CUSTOM_MESSAGE_TYPE","DEFAULT_FILE_LIMIT","DEFAULT_MAX_BYTES","DEFAULT_MAX_COLUMN","DEFAULT_MAX_LINES","DEFAULT_RELAY_URL","DEFAULT_SHIMMER_PALETTE","DebugTool","DynamicBorder","EPHEMERAL_MODEL_CHANGE_ROLE","ESSENTIAL_BUILTIN_TOOL_NAMES","EXTENSION_HANDLER_TIMEOUT_MS","EditTool","EvalTool","ExtensionEditorComponent","ExtensionInputComponent","ExtensionRunner","ExtensionRuntimeNotInitializedError","ExtensionSelectorComponent","ExtensionToolWrapper","FileFormatResult","FileSessionStorage","FindTool","FooterComponent","ForkSourceNotFoundError","GENERIC_ABORT_SENTINEL","GH_COMMAND_TIMEOUT_MS","GithubTool","GlobTool","GoalRuntime","GoalTool","GrepTool","HIDDEN_TOOLS","HandoffSummaryMessageComponent","HookEditorComponent","HookInputComponent","HookMessageComponent","HookSelectorComponent","INTERNAL_DETAILS_FIELDS","INTERRUPTED_THINKING_MESSAGE_TYPE","IdaTool","IndexedSessionStorage","InteractiveMode","KEYBINDINGS","KIND_ROLE_IDS","KeybindingsManager","LIVE_DELEGATION_MESSAGE_TYPE","LSP_LATE_DIAGNOSTIC_MESSAGE_TYPE","LSP_READONLY_ACTIONS","LearnTool","LoginDialogComponent","LogoutAccountSelectorComponent","LspTool","MAIN_AGENT_ID","MODEL_PICKER_COLUMNS","MODEL_ROLE_IDS","MULTI_FILE_PER_FILE_MATCHES","ManageSkillTool","Markdown","MemoryEditTool","MemoryRecallTool","MemoryReflectTool","MemoryRetainTool","MemorySessionStorage","ModelBrowser","ModelHubComponent","ModelPickerComponent","ModelRegistry","NewContextTool","OAuthSelectorComponent","OTHER_OPTION","OutputSink","PINNED_HUD_TOGGLE_ID","PI_LOGO","PREVIEW_PENDING_NOTICE","PREWALK_PLAN_MESSAGE_TYPE","PROPOSE_DEVICE_PATH","PromptDroppedError","QueueModeSelectorComponent","READ_ONLY_TOOL_NAMES","REJECT_DEVICE_PATH","REMOTE_REFRESH_SENTINEL","RESOLVE_DEVICE_PATH","ReadTool","ReadToolGroupComponent","RedisSessionStorage","RegisteredToolAdapter","RewindSelectorComponent","RewindTool","RpcClient","RpcCommandError","SEGMENTS","SESSION_SHUTDOWN_HANDLER_TIMEOUT_MS","SESSION_TITLE_SLOT_BYTES","SESSION_TITLE_SLOT_ENTRY_TYPE","SETTINGS_GATED_BUILTIN_TOOL_NAMES","SHUTDOWN_CONSOLIDATE_BUDGET_MS","SILENT_ABORT_MARKER","SINGLE_FILE_MATCHES","SKILL_PROMPT_MESSAGE_TYPE","SKILL_TOKEN_RE","SNAPSHOT_MAX_BYTES","SOFT_REQUEST_BUDGET","STATUS_LINE_PRESETS","SUBAGENT_WARNING_MISSING_YIELD","SUBAGENT_WARNING_NULL_YIELD","SUBAGENT_WARNING_SCHEMA_OVERRIDDEN","SecurityScanTool","SessionLockError","SessionManager","SessionModelScopeCache","SessionPersistenceIndeterminateError","SessionResolutionError","SessionSelectorComponent","SessionWriteConflictError","Settings","SettingsSelectorComponent","ShowImagesSelectorComponent","Spacer","SqlSessionStorage","SqliteAuthCredentialStore","StatusLineComponent","SubagentHudComponent","TASK_SUBAGENT_EVENT_CHANNEL","TASK_SUBAGENT_LIFECYCLE_CHANNEL","TASK_SUBAGENT_PROGRESS_CHANNEL","TITLE_CHANGE_ENTRY_TYPE","TODO_COMPACT_TERMINAL_ROWS_THRESHOLD","TODO_HUD_STATE_CUSTOM_TYPE","TOP_LEVEL_AGENT","TREE_FILTER_MODES","TailBuffer","TaskTool","Text","Theme","ThemeSelectorComponent","ThinkTool","ThinkingSelectorComponent","TodoReminderComponent","TodoTool","ToolExecutionComponent","TreeSelectorComponent","TtsrNotificationComponent","USER_INTERRUPT_LABEL","USER_TODO_EDIT_CUSTOM_TYPE","UserMessageComponent","VERSION","VIBE_MODE_CONTEXT_MESSAGE_TYPE","VIBE_TOOL_NAMES","VibeKillTool","VibeListTool","VibeSendTool","VibeSpawnTool","VibeWaitTool","WELCOME_LSP_SLOTS","WELCOME_SESSION_SLOTS","WaitTool","WebSearchTool","WelcomeComponent","WriteTool","XDEV_DOCS_PER_DEVICE_CAP","XDEV_DOCS_TOTAL_BUDGET","XDEV_EXTERNAL_DESCRIPTION_CAP","XDEV_KEEP_TOP_LEVEL","XDEV_TRANSPORT_TOOLS","YieldTool","__awaitAutoQaRecordPipelineForTests","__resetAutoQaConsentForTests","__resetAutoQaFlushStateForTests","addFileDeleteFallback","addFileWriteFallback","allowsSkillTokens","appKey","appKeyHint","appendInlineArgsFallback","applyOpsToPhases","applyPatchSchema","applyResolvedSystemPromptInputs","ariaSnapshotBaselineKey","askToolRenderer","assistantTurnDelivered","assistantTurnProducedOutput","attachIrcWakeTurnMonitor","bashExecutionToText","bashPtyViewport","bindPreparedExtensions","bindTheme","boundKeys","buildAriaSnapshotScript","buildBrowserItems","buildBudgetNotice","buildCoordinationAdvisory","buildDirectoryTree","buildGoalToolResponse","buildModelScopeNotification","buildReplanTitleContext","buildResolveReminderMessage","buildSearchAffinity","buildSearchDateQualifier","buildSessionContext","buildSessionModelScope","buildSessionOptions","buildSkillPromptMessage","buildSpecializationAdvisory","buildSystemPrompt","buildWakeRelayBody","buildWorkspaceTree","cleanupEmptyMoveSession","cmuxSnapshotToObservation","collectAriaSnapshotRefs","collectIrcPeerRoster","committedTodoPhases","compactionThresholdSettings","completionBudgetReport","composeSpawnAdvisory","computeEditorMaxHeight","computerApproval","convertToLlm","copySessionArtifacts","createAcpSessionFactory","createAgentSession","createAutoLearnCaptureRunner","createBranchSummaryMessage","createBrowserPrelude","createCompactionSummaryMessage","createComputerPrelude","createCustomMessage","createHandoffSummaryMessageComponent","createHighlightStream","createLspWritethrough","createMCPProxyTools","createSessionManager","createSubagentSettings","createTodoHudStateData","createTools","createVibeTools","createXdevState","customToolToDefinition","dedupeEphemeralReply","defaultLoadModeForToolName","defineRpcClientTool","deleteFileWithFallback","demoteInterruptedThinking","describeSegment","describeSegmentTrack","describeShimmer","describeSubagentHud","detectLanguageId","didSessionMessagesChange","diffAriaSnapshot","discoverAgents","discoverAndLoadCustomTools","discoverAndLoadExtensions","discoverAuthStorage","discoverCommands","discoverContextFiles","discoverCustomTSCommands","discoverCustomToolPaths","discoverExtensionPaths","discoverExtensions","discoverMCPServers","discoverPromptTemplates","discoverSessionExtensionPaths","discoverSkills","discoverSlashCommands","discoverStartupLspServers","dispatchReportIssueDevice","dispatchResolutionDevice","dispatchXdevTool","disposeSessionQuietly","editDescriptionCompact","editorKey","editorKeys","emitSessionShutdownEvent","enableAutoTheme","enforceInlineByteCap","ensureTheme","ensureThemeSync","evalSchema","expandCommand","expandPromptTemplate","extensionToolSourceInfo","extractBracketedImagePastePath","extractBracketedImagePastePaths","extractBracketedPastePaths","extractImagePastePathsFromText","extractImagePathFromText","extractMarkdownOutline","extractPastePathsFromText","extractReadableFromHtml","extractSessionInit","fgOrPlain","filterMarkdownSections","filterSessionsForPicker","finalizeSubagentLifecycle","finalizeSubprocessOutput","findMostRecentNonEmptySession","findMostRecentSession","flushGrievances","flushLspWritethroughBatch","formatBillingSummary","formatDoubleTap","formatHeadTruncationNotice","formatKeyHint","formatKeyHints","formatMiddleElisionMarker","formatRepoRef","formatResultOutputFallback","formatRoleChip","formatSessionDumpText","formatTailTruncationNotice","formatTaskResultSummary","generateId","getActiveSkills","getAgent","getAgentDir","getAvailableSymbolPresets","getAvailableThemes","getAvailableThemesWithPaths","getColorBlindMode","getCommand","getCurrentThemeName","getDefaultPasteImageKeys","getEditStore","getEditorTheme","getEvalDocTopics","getEvalToolDescription","getExperimentalContextSession","getExtensionUISelectOptionLabel","getImageGenTools","getImageGenToolsWithRegistry","getLanguageFromPath","getLatestCompactionEntry","getLatestTodoPhasesFromEntries","getLatestTodoSnapshotIdentity","getLspStatus","getMarkdownTheme","getNativeThemePalette","getNativeThemePaletteKey","getOpenAiRemoteCompactionPayload","getOrFetchIssue","getOrFetchPr","getOrFetchPrDiff","getPreset","getRecentSessions","getResolvedThemeColors","getRestorableSessionModels","getSearchProvider","getSearchTools","getSelectListTheme","getSeparator","getSessionAccentAnsi","getSessionAccentHex","getSettingsListTheme","getSkillSlashCommandName","getSymbolPresetOverride","getSymbolTheme","getThemeByName","getThemeEpoch","getThemeExportColors","getTodoHudVisibility","github","githubIssueJsonWithStateReasonFallback","goalTokenDelta","gradientEscape","gradientLogo","groupedReadUsageCallIds","hasConversationalHistory","hasFileDeleteFallback","hasFileWriteFallback","hasWaitTool","hashlineEditParamsSchema","highlightCode","imageGenSchema","imageGenTool","initTheme","initThemeSync","interruptKey","invalidateConvertToLlmArrayCache","isAssistantMessageLine","isAuthenticated","isAutoQaEnabled","isCustomMessageContent","isEmptyAssistantStop","isEmptyErrorTurn","isEmptySession","isFindEnabled","isLightTheme","isMarkdownPath","isMountableUnderXdev","isNameClaimedByAuthoredSkill","isPermissionDeniedError","isPreviewResolutionToolCall","isProposeToolCall","isReadOnlyAgent","isReportIssueToolCall","isSilentAbort","isTitleContextReply","isTodoPhase","isToolCallEventType","isTranscriptEntry","isUserInterruptAbort","isUserInvokedSkillPrompt","isUserTurnInitiator","isValidSymbolPreset","isValidThemeColor","kNoAuth","keyHint","keyHintPlatform","layoutPinnedHud","listAllSessions","listSessions","listSessionsReadOnly","listXdevTools","loadCliExtensionProviders","loadCustomTools","loadEntriesFromFile","loadEntriesFromFileStream","loadExtensionFromFactory","loadExtensions","loadPromptTemplates","loadSessionExtensions","loadSessionFile","loadSessionMessagesReadOnly","loadSkills","loadSkillsFromDir","logProviderTurnError","logger","logoNode","main","mapWaitUntil","markdownToPhases","mergeDiscoveredModel","mergeSessionRanking","migrateKeybindingsConfigFile","migrateSessionEntries","migrateToCurrentVersion","modelSearchText","nativeDiff","nextActionableTask","noTruncResult","normalizeContinueSessionArgs","normalizeCustomMessagePayload","normalizePremiumRequests","onTerminalAppearanceChange","onThemeChange","openAutoQaDb","parseAriaRefSelector","parsePositiveDecimalInt","parsePrUnifiedDiff","parseSearchDateBound","parseSessionContent","parseSessionEntries","parseSkillInvocation","patchEditEntrySchema","patchEditSchema","phasesToMarkdown","pickWeightedTip","planSaveFileName","planXdevPromptDocs","postProcessAriaSnapshot","powerAssertionOptions","previewTheme","pythonExecutionToText","queueResolveHandler","rankModelItems","rankSessionSearchMatches","rawKeyHint","readArgsCollapseIntoGroup","readArgsHaveTarget","readPipedInput","readQueueChipText","rebuildScopedModelsAfterDiscovery","recoverAskQuestions","recoverOrphanedBackups","refreshAgentDiscovery","registerComputerController","releaseComputerSessionsForOwner","remainingTokens","renderDiff","renderGoalPrompt","renderSegment","renderSegmentTrack","renderSubagentHudLines","renderTrustedObjective","renderWelcomeTip","renderXdevPromptDocs","replaceEditSchema","replaceLlmImagesWithText","reportIssueDeviceUsage","resetActiveSkillsForTests","resetProviderAutoRefreshGuard","resetThinkingSpeedTracker","resetYieldTurnState","resolutionDeviceUsage","resolveAbortLabel","resolveAutoQaConsent","resolveBlobRefsInEntries","resolveBrowserKind","resolveBuiltinToolPlan","resolveCmuxKind","resolveDefaultRepoMemoized","resolveDialect","resolveDispatchDetails","resolveEditToolDescription","resolveEvalBackends","resolveLocalWavPath","resolveMountedXdevExecutable","resolveMountedXdevTool","resolvePrewalkTarget","resolveRelayKind","resolveResumableSession","resolveRoleAssignments","resolveScopedModels","resolveSegmentPalette","resolveSoftRequestBudget","resolveSpeculativeReadTarget","resolveSpeechCandidates","resolveTernKind","resolveTodoMarkdownPath","resolveXdevTool","resolveYieldReportText","restartBrowserForModeChange","routeViewportClick","runRootCommand","runSearchQuery","runSubagentFollowUpTurn","runSubprocess","sanitizeAssistantForReparentedHistory","sanitizeRehydratedOpenAIResponsesAssistantMessage","serializeEval","setActiveSkills","setAutoQaConsentHandler","setAutoThemeMapping","setColorBlindMode","setKeyHintPlatform","setMarkdownMermaidRendering","setNativeSymbolPreset","setShimmerMode","setSymbolPreset","setTheme","setThemeInstance","settings","sharedSpinnerFrame","shimmerEnabled","shimmerSegments","shimmerText","shouldEnterPlanModeOnStartup","shouldRenderAbortReason","sloppyEditSchema","smokeTestComputerWorker","sortModelItems","spawnComputerWorker","splitImageQuestionTarget","startMacOSAppearanceReprobeFallback","statusSegmentPriority","stopSharedSpinnerTicker","stopThemeWatcher","streamTailUpdates","stripImagesFromMessage","stripInternalDetailsFields","submitInteractiveInput","supportsExternalThinking","taskSchema","templateUsesInlineArgPlaceholders","testSetExtensionHandlerTimeoutMs","testSetSessionShutdownHandlerTimeoutMs","theme","themePickerOptions","thinkingDotToken","thinkingLevelWord","toSessionScopedModels","toolRenderName","truncateHead","truncateHeadBytes","truncateLine","truncateLineBytes","truncateMiddle","truncateTail","truncateTailBytes","truncateToVisualLines","ttsTool","userBubbleColor","visitEntriesFromFile","visitEntriesFromFileStream","warmHighlighter","warmupLspServers","watchScopedModelSettings","webSearchCustomTool","webSearchSchema","withFileMutationSession","wrapRegisteredTool","wrapRegisteredTools","wrapShellLineForClientTerminal","wrapSteeringForModel","writeDeviceDispatch","writeFileWithFallback","writeStartupNotice","writethroughNoop","xdevDocs","xdevDocsAll","xdevDocsFor","xdevEntries","xdevListing","z","zod"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
PROCESS_EXIT 143
PROFILE_REMOVED same-id-replacement
```

### Output: `bun /tmp/gb1-driver.ts one-child faults`

```text
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-0odNN3-workspace--/2026-09-30T21-08-35-630Z_01a0f425-d6ae-70b0-a085-bdc0a14a4185.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":383}
ZERO_SNAPSHOT {"schema":1,"epoch":"37538c92-e619-4067-a430-792ed825a92e","generation":1,"observedAt":"2026-09-30T21:08:36.000Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-0odNN3-workspace--/2026-09-30T21-08-35-630Z_01a0f425-d6ae-70b0-a085-bdc0a14a4185.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1832}
RPC_COMMAND /gb1 dump
COMPARE one-child {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"6d6df33b85e57ae7c14b1896aee712a1b4cd68c74deb27eedef33bdde54ee19f"},"rowListing":{"lines":1,"sha256":"93d3ff16ff793a54f338425e0b964e0c1c4cdb24d3ba9966288654332f8bb923"},"differences":[]}
NATIVE_IDENTITIES [{"id":"child-one","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
RPC_COMMAND /gb1 replay {"id":"child-one","indices":[0,1]}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1832}
REORDER_RESULT {"indices":[0,1],"pass":true,"outcome":{"state":"completed","generation":2,"spawnCallId":{"known":true,"value":"chatcmpl-one-child-main-0-call-0"},"at":"2026-09-30T21:08:38.455Z"}}
RPC_COMMAND /gb1 replay {"id":"child-one","indices":[1,0]}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1743}
REORDER_RESULT {"indices":[1,0],"pass":true,"outcome":{"state":"unknown","reason":"conflicting evidence"}}
RPC_COMMAND /gb1 replay {"id":"child-one","indices":[0,1,1]}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1832}
REORDER_RESULT {"indices":[0,1,1],"pass":true,"outcome":{"state":"completed","generation":4,"spawnCallId":{"known":true,"value":"chatcmpl-one-child-main-0-call-0"},"at":"2026-09-30T21:08:40.968Z"}}
RPC_COMMAND /gb1 replay {"id":"child-one","indices":[1,0,1]}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1832}
REORDER_RESULT {"indices":[1,0,1],"pass":true,"outcome":{"state":"completed","generation":5,"spawnCallId":{"known":true,"value":"chatcmpl-one-child-main-0-call-0"},"at":"2026-09-30T21:08:42.229Z"}}
RPC_COMMAND /gb1 throw
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1897}
INTERRUPTED_RESULT {"pass":true,"inventory":{"state":"partial","reason":"collection interrupted: GB1 injected enumeration fault"},"rows":1}
RPC_COMMAND /gb1 unthrow
PROCESS_EXIT 143
PROFILE_REMOVED one-child
```

### Output: `bun /tmp/gb1-driver.ts many-33`

```text
COMMAND ["omp","--profile","many-33","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-7PftpR-workspace--/2026-09-30T21-08-13-650Z_01a0f425-80d2-75ce-9007-482bb7a0c115.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":381}
ZERO_SNAPSHOT {"schema":1,"epoch":"91132790-c719-452b-a07a-aac09e596859","generation":1,"observedAt":"2026-09-30T21:08:14.022Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/many-33/agent/sessions/--tmp-omp-orca-harness-7PftpR-workspace--/2026-09-30T21-08-13-650Z_01a0f425-80d2-75ce-9007-482bb7a0c115.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":47925}
RPC_COMMAND /gb1 dump
COMPARE many-33 {"pass":true,"expectedCount":33,"nativeChildren":33,"rows":33,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":33,"sha256":"d9cba8030f7bd8e08004deacc78d6205e9aabc71f9a811494764001007db2afc"},"rowListing":{"lines":33,"sha256":"3d79f79f625d20b8d8a748df163709aab3cd61d5cbf6165a8a58a47404e94551"},"differences":[]}
NATIVE_IDENTITIES [{"id":"agent-1","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-2","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-3","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-4","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-5","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-6","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-7","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-8","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-9","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-10","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-11","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-12","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-13","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-14","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-15","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-16","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-17","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-18","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-20","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-19","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-21","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-22","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-24","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-23","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-26","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-25","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-27","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-28","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-30","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-29","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-31","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-32","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-33","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
RPC_COMMAND /gb1 cap {"repo":"$PWD","limit":32}
CAP {"type":"cap","limit":32,"inventory":{"state":"partial","reason":"cap 32 of 33"},"rows":32,"ids":["agent-1","agent-2","agent-3","agent-4","agent-5","agent-6","agent-7","agent-8","agent-9","agent-10","agent-11","agent-12","agent-13","agent-14","agent-15","agent-16","agent-17","agent-18","agent-20","agent-19","agent-21","agent-22","agent-24","agent-23","agent-26","agent-25","agent-27","agent-28","agent-30","agent-29","agent-31","agent-32"]}
CAP_RESULT {"pass":true}
PROCESS_EXIT 143
PROFILE_REMOVED many-33
```

### Output: `bun /tmp/gb1-driver.ts many-135`

```text
COMMAND ["omp","--profile","many-135","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/many-135/agent/sessions/--tmp-omp-orca-harness-PUxd2U-workspace--/2026-09-30T21-08-13-671Z_01a0f425-80e7-72ed-8ed5-68a1bc39ae6b.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":382}
ZERO_SNAPSHOT {"schema":1,"epoch":"9295f162-292b-41f8-aa9c-385e6a13bbfa","generation":1,"observedAt":"2026-09-30T21:08:14.031Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/many-135/agent/sessions/--tmp-omp-orca-harness-PUxd2U-workspace--/2026-09-30T21-08-13-671Z_01a0f425-80e7-72ed-8ed5-68a1bc39ae6b.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":195214}
RPC_COMMAND /gb1 dump
COMPARE many-135 {"pass":true,"expectedCount":135,"nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"2b61bc31423fadae55b40876818c0600ef67d4adc0ef97514a631d8075e309eb"},"rowListing":{"lines":135,"sha256":"fc64fc0ecee5c767825ddd64083f0d961855aaa001083436e9850ca83a972a88"},"differences":[]}
NATIVE_IDENTITIES [{"id":"agent-1","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-2","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-3","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-4","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-5","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-6","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-7","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-8","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-9","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-10","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-11","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-12","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-13","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-14","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-15","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-16","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-17","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-18","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-19","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-20","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-21","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-22","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-23","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-24","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-25","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-27","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-26","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-28","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-29","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-30","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-31","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-32","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-34","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-33","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-35","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-37","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-36","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-38","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-39","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-40","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-41","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-42","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-43","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-44","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-45","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-46","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-47","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-48","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-49","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-50","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-51","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-52","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-53","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-54","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-55","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-56","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-57","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-59","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-58","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-62","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-63","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-61","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-60","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-64","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-65","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-66","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-67","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-68","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-72","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-69","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-73","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-70","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-71","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-74","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-76","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-75","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-77","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-78","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-79","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-80","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-82","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-81","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-83","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-84","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-85","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-88","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-86","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-87","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-89","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-93","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-95","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-92","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-94","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-91","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-90","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-96","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-98","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-97","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-99","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-100","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-102","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-103","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-101","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-104","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-105","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-107","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-106","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-108","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-110","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-109","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-111","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-112","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-113","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-114","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-115","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-116","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-118","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-121","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-119","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-117","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-120","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-122","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-124","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-125","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-126","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-123","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-127","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-128","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-130","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-129","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-132","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-131","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-134","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-135","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false},{"id":"agent-133","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
RPC_COMMAND /gb1 cap {"repo":"$PWD","limit":128}
CAP {"type":"cap","limit":128,"inventory":{"state":"partial","reason":"cap 128 of 135"},"rows":128,"ids":["agent-1","agent-2","agent-3","agent-4","agent-5","agent-6","agent-7","agent-8","agent-9","agent-10","agent-11","agent-12","agent-13","agent-14","agent-15","agent-16","agent-17","agent-18","agent-19","agent-20","agent-21","agent-22","agent-23","agent-24","agent-25","agent-27","agent-26","agent-28","agent-29","agent-30","agent-31","agent-32","agent-34","agent-33","agent-35","agent-37","agent-36","agent-38","agent-39","agent-40","agent-41","agent-42","agent-43","agent-44","agent-45","agent-46","agent-47","agent-48","agent-49","agent-50","agent-51","agent-52","agent-53","agent-54","agent-55","agent-56","agent-57","agent-59","agent-58","agent-62","agent-63","agent-61","agent-60","agent-64","agent-65","agent-66","agent-67","agent-68","agent-72","agent-69","agent-73","agent-70","agent-71","agent-74","agent-76","agent-75","agent-77","agent-78","agent-79","agent-80","agent-82","agent-81","agent-83","agent-84","agent-85","agent-88","agent-86","agent-87","agent-89","agent-93","agent-95","agent-92","agent-94","agent-91","agent-90","agent-96","agent-98","agent-97","agent-99","agent-100","agent-102","agent-103","agent-101","agent-104","agent-105","agent-107","agent-106","agent-108","agent-110","agent-109","agent-111","agent-112","agent-113","agent-114","agent-115","agent-116","agent-118","agent-121","agent-119","agent-117","agent-120","agent-122","agent-124","agent-125","agent-126","agent-123","agent-127","agent-128"]}
CAP_RESULT {"pass":true}
PROCESS_EXIT 143
PROFILE_REMOVED many-135
```


## Re-run — 2026-09-30, after reader/outcome/harness fixes

Binding input: slice `gb1-identity-inventory.md`, resolved-during-gate rules. Exclusive ownership remains this evidence file. Recovery before-image: `/tmp/gb1-rerun-before.md`, SHA-256 `66c2688b85734eb7666815069a3d646afc4fa184cbd114d95ed083a78e9551dd`. Earlier failures and their outputs are historical and unchanged; the two matrix rows reflect the new runs. No source/check/harness edits, installs, or project-wide checks.

### V07.6 — PASS: maxBytes 0, 1 and 16

Reproduction: copy the retained **adapted** `gb1-rerun-reader.ts` and `gb1-rerun-reader-launch.ts` source blocks below directly to `<tmp>/gb1-rerun-reader.ts` and `<tmp>/gb1-rerun-reader-launch.ts` (substitute `<tmp>` consistently in the launcher), then run `bun <tmp>/gb1-rerun-reader-launch.ts`. Do not run `gb1-rerun-extract.ts`: it regenerates the historical reader and overwrites the adapted reader. The importing child receives harness HOME/TMPDIR/XDG_* at process start, unchanged from the original isolation method. The closure materializer below implements this recipe and additionally logs every STEP.

The adapted probe permits the fixed reader's one-byte minimum scan at requested zero, while still asserting **zero payload bytes** against maxBytes 0. It runs the same finite 508-step ceiling for every case, records all record ends, and asserts actual read windows at most `max(1,maxBytes)`. No assertion assumes an empty page is progress. Every oversized record's continuation reaches its actual newline; the reader contract explicitly allows intermediate `end:null`.

Verbatim normalized excerpts:

```text
COMMAND Bun.spawn(["bun", "/tmp/gb1-rerun-reader.ts", "$PWD"], { cwd: "<tmp>/workspace", env: harnessDisposableEnv })
FIXTURE {"file":"$PWD/omp-orca-observer/checks/harness/fixtures/small.jsonl","totalBytes":498,"firstRecordBytes":100}
STEP {"maxBytes":16,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":16,"cursor":16,"payloadBytes":0,"reads":[{"offset":0,"length":16}]}
STEP {"maxBytes":16,"step":6,"kind":"record_too_large","start":0,"end":100,"scannedTo":112,"cursor":100,"payloadBytes":0,"reads":[{"offset":96,"length":16}]}
STEP {"maxBytes":16,"step":18,"kind":"record_too_large","start":100,"end":280,"scannedTo":292,"cursor":280,"payloadBytes":0,"reads":[{"offset":276,"length":16}]}
STEP {"maxBytes":16,"step":32,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":488,"length":10}]}
STEP {"maxBytes":16,"step":33,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":16,"pass":true,"readBound":16,"maximumRead":16,"steps":34,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"recordEnds":[100,280,498],"expectedEnds":[100,280,498],"allRecordsEnded":true,"ended":true,"emptyNonEnd":0}
STEP {"maxBytes":1,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":1,"cursor":1,"payloadBytes":0,"reads":[{"offset":0,"length":1}]}
STEP {"maxBytes":1,"step":99,"kind":"record_too_large","start":0,"end":100,"scannedTo":100,"cursor":100,"payloadBytes":0,"reads":[{"offset":99,"length":1}]}
STEP {"maxBytes":1,"step":279,"kind":"record_too_large","start":100,"end":280,"scannedTo":280,"cursor":280,"payloadBytes":0,"reads":[{"offset":279,"length":1}]}
STEP {"maxBytes":1,"step":497,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":497,"length":1}]}
STEP {"maxBytes":1,"step":498,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":1,"pass":true,"readBound":1,"maximumRead":1,"steps":499,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"recordEnds":[100,280,498],"expectedEnds":[100,280,498],"allRecordsEnded":true,"ended":true,"emptyNonEnd":0}
STEP {"maxBytes":0,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":1,"cursor":1,"payloadBytes":0,"reads":[{"offset":0,"length":1}]}
STEP {"maxBytes":0,"step":99,"kind":"record_too_large","start":0,"end":100,"scannedTo":100,"cursor":100,"payloadBytes":0,"reads":[{"offset":99,"length":1}]}
STEP {"maxBytes":0,"step":279,"kind":"record_too_large","start":100,"end":280,"scannedTo":280,"cursor":280,"payloadBytes":0,"reads":[{"offset":279,"length":1}]}
STEP {"maxBytes":0,"step":497,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":497,"length":1}]}
STEP {"maxBytes":0,"step":498,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":0,"pass":true,"readBound":1,"maximumRead":1,"steps":499,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"recordEnds":[100,280,498],"expectedEnds":[100,280,498],"allRecordsEnded":true,"ended":true,"emptyNonEnd":0}
EXIT 0
PROFILE_REMOVED
```

Check receipt: `bun /tmp/gb1-rerun-reader-launch.ts | current fixed reader, native parser, 498-byte fixture | passed | newline-terminated fixture; bounds 0/1/16 only`. Full adapted sources are preserved in the re-run source annex.

### V02.5 — PASS: real advisor, native parked refs, excluded everywhere

Exact command: `bun /tmp/gb1-rerun-advisor.ts advisor-present`.

The driver reuses `/tmp/gb1-restart.ts` and `/tmp/gb1-extension.ts`, adapting only disposable copies. It runs fixed `advisor-present`, waits for native child completion and real advisor transcript persistence, resumes the root in a fresh persistent RPC parent, then executes omp's actual read tool for `agent://advisor-child`. This native read restores the registry; no advisor ref or transcript is synthesized. The main advisor and the task child's advisor both respond through `stub/advisor`.

Verbatim normalized excerpts:

```text
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-rerun-extension.ts"]
RPC_COMMAND HARNESS_AGENT=main
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"48e229d01575cceea8e512a161e6126a6cc4aa3370e329abf572d064aa24d256"},"rowListing":{"lines":1,"sha256":"848e3a57d5c4aa0e91f0ab11d4d28853f21fbf22c84ec25802262f342e11e7d4"},"differences":[]}
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-rerun-extension.ts","--resume","<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67.jsonl"]
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
ADVISOR_WALK_BEFORE_RESTORE {"totalTranscriptCount":3,"ordinaryTranscriptCount":1,"advisorTranscriptCount":2,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"}}
RPC_COMMAND /gb1 native-read {"id":"advisor-child"}
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":2,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"b00285508e7f49e3183ee288e022e3054b533cb489bb0a6a9cc444d7dfc232a2"},"rowListing":{"lines":1,"sha256":"ae925d1f1ce6f274ed3ac29c723fec1d7b882333d31c2d722916651fe74686e6"},"differences":[]}
NATIVE_ADVISOR_REFS [{"id":"Main/advisor","kind":"advisor","status":"parked","session":null,"parentId":"Main","sessionFile":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/__advisor.jsonl"},{"id":"advisor-child/advisor","kind":"advisor","status":"parked","session":null,"parentId":"advisor-child","sessionFile":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/advisor-child/__advisor.jsonl"}]
ADVISOR_PAGE_ROUTE {"command":"GET /v1/children/Main%2Fadvisor/page","status":404,"body":"Not Found"}
ADVISOR_PAGE_ROUTE {"command":"GET /v1/children/advisor-child%2Fadvisor/page","status":404,"body":"Not Found"}
RPC_COMMAND /gb1 cap {"repo":"$PWD","limit":256,"ids":["Main/advisor","advisor-child/advisor"]}
ADVISOR_ADMISSION {"type":"cap","limit":256,"inventory":{"state":"complete"},"rows":1,"ids":["advisor-child"],"admissions":[{"id":"Main/advisor","sessionFile":null},{"id":"advisor-child/advisor","sessionFile":null}]}
ADVISOR_RESULT {"pass":true,"advisorIds":["Main/advisor","advisor-child/advisor"],"snapshotIds":["advisor-child"],"inventory":{"state":"complete"},"totalTranscriptCount":3,"ordinaryTranscriptCount":1,"advisorTranscriptCount":2,"pageResponses":[{"id":"Main/advisor","status":404,"body":"Not Found"},{"id":"advisor-child/advisor","status":404,"body":"Not Found"}]}
PROCESS_EXIT 143
PROFILE_REMOVED advisor-present
```

The complete normalized output below also preserves `REAL_ADVISOR_TRANSCRIPTS`: successful stub advisor request metadata and verbatim persisted `__advisor.jsonl` entries including the assistant's `Harness advisor reply`. Before native restoration, all three transcript files exist but the endpoint counts **0 of 1**, not 0 of 3, naming only `advisor-child.jsonl`. After native restoration, both native advisor refs are parked/null-session, neither is a snapshot row, both page routes return `404 Not Found`, direct `admittedSessionFile` checks return null, and inventory is complete with the sole ordinary child. Thus both top-level and nested advisor transcripts are excluded from restoration counts. The command exited 0; its two omp process exits 143 are deliberate post-capture termination.

Check receipt: `bun /tmp/gb1-rerun-advisor.ts advisor-present | fixed scenario + official omp persistent RPC, resume and native read | passed | native restore observed before/all, not intermediate checkpoints`. Both assigned re-run criteria pass; no new failing command/output remains.

## historical source completion annex — preserved 2026-09-30

### Source `/tmp/gb1-driver.ts`

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare } from './gb1-compare.ts';
// The disposable script lives outside the repository; the source root is selected by its invocation cwd.
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const scenario = process.argv[2] ?? 'one-child';
const recordName = scenario + (process.argv[3] === 'late' ? '-late' : '');
const profile = await create(scenario);
const expectedCounts = {
  'one-child': 1, detached: 1, 'eval-agent': 1, nested: 2, restricted: 1, 'same-id-replacement': 1,
  'long-labels': 2, 'explicit-long-ids': 1, 'duplicate-labels': 2, 'follow-up': 1, 'new-session': 1, resume: 1, fork: 1,
  'advisor-present': 1, 'many-33': 33, 'many-135': 135, parked: 1, aborted: 1, tombstoned: 1, 'cold-restart': 3, 'partial-restore': 135
};
const trace = join(profile.root, 'tmp', 'gb1-events.jsonl');
const output = [];
const emit = (...parts) => {
  const text = parts.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ')
    .replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  output.push(text);
  console.log(text);
};
let processHandle;
let rawOut = '';
let rawErr = '';
const events = [];
const pending = new Map();
let serial = 0;
async function records() {
  try { return (await readFile(trace, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function until(fn, label, timeout = 45000) {
  const end = Date.now() + timeout;
  for (; ;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > end) throw new Error('Timeout: ' + label);
    await Bun.sleep(25);
  }
}
async function request(type, fields = {}) {
  const id = 'gb1-' + ++serial;
  const { promise: result, resolve, reject } = Promise.withResolvers();
  const timer = setTimeout(() => { pending.delete(id); reject(new Error('RPC response timeout: ' + type)); }, 45000);
  pending.set(id, value => { clearTimeout(timer); resolve(value); });
  processHandle.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
  const response = await result;
  if (!response.success) emit('RPC_RESPONSE', response);
  return response;
}
async function command(message) {
  emit('RPC_COMMAND', message);
  const response = await request('prompt', { message });
  if (response.success) await until(() => events.find(event => event.type === 'prompt_result' && event.id === response.id), 'settled prompt ' + message, 180000);
  return response;
}
async function dump() {
  const before = (await records()).filter(item => item.type === 'dump').length;
  await command('/gb1 dump');
  return until(async () => (await records()).filter(item => item.type === 'dump')[before], 'native dump');
}
async function serve() {
  const before = (await records()).length;
  await command('/observer serve');
  const notification = await until(async () => (await records()).slice(before).find(item => item.type === 'notification' && /^http:/.test(item.message)), 'observer URL');
  await Bun.sleep(1200);
  const response = await fetch(new URL('/v1/snapshot', notification.message));
  const text = await response.text();
  emit('GET /v1/snapshot', { status: response.status, schema: response.headers.get('x-observer-schema'), bytes: Buffer.byteLength(text) });
  return { url: notification.message, snapshot: JSON.parse(text) };
}
try {
  const linked = await profile.run(['plugin', 'link', '/tmp/gb1-probe']);
  emit('PROBE_LINK', linked);
  if (linked.exitCode !== 0) throw new Error('Disposable probe linking failed');
  const args = ['--mode', 'rpc', '--no-lsp', '--no-title', '--model', 'stub/scripted'];
  if (scenario === 'advisor-present') args.push('--advisor');
  emit('COMMAND', ['omp', '--profile', scenario, ...args]);
  processHandle = profile.spawn(args);
  const consumeOut = (async () => {
    const reader = processHandle.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (; ;) {
      const { value, done } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      rawOut += text;
      buffer += text;
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        try {
          const value = JSON.parse(line);
          events.push(value);
          if (value.type === 'response') pending.get(value.id)?.(value);
          if (value.type === 'tool_execution_end' && value.isError) emit('TOOL_ERROR', value);
        } catch { if (line) emit('NON_RPC_OUTPUT', line); }
      }
    }
  })();
  const consumeErr = (async () => { rawErr = await new Response(processHandle.stderr).text(); })();
  const ready = await until(async () => (await records()).find(item => item.type === 'ready'), 'main extension ready');
  emit('READY', ready);
  const baseline = await serve();
  emit('ZERO_SNAPSHOT', baseline.snapshot);
  if (scenario === 'aborted') {
    emit('RPC_COMMAND', 'HARNESS_AGENT=main');
    const prompt = await request('prompt', { message: 'HARNESS_AGENT=main' });
    await until(async () => (await records()).some(item => item.type === 'lifecycle' && item.value.status === 'started'), 'running child before cancellation');
    emit('RPC_COMMAND', 'abort');
    emit('ABORT_RESPONSE', await request('abort'));
    await until(() => events.find(event => event.type === 'prompt_result' && event.id === prompt.id), 'cancelled native prompt', 30000);
  } else await command('HARNESS_AGENT=main');
  if (['many-33', 'many-135', 'cold-restart', 'partial-restore', 'detached', 'follow-up', 'resume', 'tombstoned', 'parked'].includes(scenario)) {
    await until(async () => {
      const lifecycle = (await records()).filter(item => item.type === 'lifecycle').map(item => item.value);
      return new Set(lifecycle.filter(fact => fact.status !== 'started').map(fact => fact.id)).size >= expectedCounts[scenario];
    }, 'all native children settled', 180000);
  }
  const observed = await serve();
  const native = await dump();
  emit('COMPARE', scenario, compare(observed.snapshot, native, expectedCounts[scenario]));
  emit('NATIVE_IDENTITIES', native.refs.filter(ref => ref.kind !== 'main').map(ref => ({ id: ref.id, parentId: ref.parentId, kind: ref.kind, displayName: ref.displayName, status: ref.status, tombstoned: ref.tombstoned })));
  if (['follow-up', 'same-id-replacement', 'fork', 'resume', 'cold-restart', 'partial-restore'].includes(scenario)) {
    emit('NATIVE_CAPABILITIES', { registryMethods: native.registryMethods, contextMethods: native.contextMethods });
  }
  if (scenario === 'advisor-present') {
    const advisorIds = native.refs.filter(ref => ref.kind === 'advisor').map(ref => ref.id);
    emit('ADVISOR_RESULT', { pass: advisorIds.length > 0 && advisorIds.every(id => !observed.snapshot.children.some(row => row.childId === id)), advisorIds, subIds: observed.snapshot.children.map(row => row.childId) });
  }
  if (scenario === 'parked') {
    await command('/gb1 park ' + JSON.stringify({ id: observed.snapshot.children[0].childId }));
    const parked = await serve();
    const parkedNative = await dump();
    emit('PARKED_COMPARE', compare(parked.snapshot, parkedNative, 1));
    emit('PARKED_RESULT', { pass: parked.snapshot.children[0]?.registryStatus === 'parked', row: parked.snapshot.children[0] });
    const row = parked.snapshot.children[0];
    const ref = parkedNative.refs.find(ref => ref.id === row.childId);
    const recordedCwd = ref.transcript.header.cwd;
    const recordedModel = ref.transcript.metadata.filter(entry => entry.type === 'model_change').at(-1);
    emit('PERSISTED_FACT_RESULT', {
      pass: row.lineage.cwd.known && row.lineage.cwd.value === recordedCwd && row.resolvedModel.known,
      childId: row.childId, snapshotCwd: row.lineage.cwd, nativeSessionHeaderCwd: recordedCwd,
      snapshotResolvedModel: row.resolvedModel, nativeModelChange: recordedModel,
    });
  }
  if (scenario === 'follow-up') {
    const id = observed.snapshot.children[0].childId;
    const first = observed.snapshot.children[0].outcome;
    const inject = process.argv[3] === 'late';
    await command('/gb1 hold ' + JSON.stringify({ id, inject }));
    await command('/gb1 followup ' + JSON.stringify({ id }));
    emit('FOLLOWUP_NATIVE', (await records()).filter(item => item.type === 'followup-result').at(-1));
    if (inject) {
      const held = await until(async () => (await records()).find(item => item.type === 'held' && item.id === id), 'second native context held', 6000);
      emit('FOLLOWUP_HELD', held);
      const running = await serve();
      const runningRow = running.snapshot.children.find(row => row.childId === id);
      emit('FOLLOWUP_RUNNING_RESULT', { inject, pass: runningRow.registryStatus === 'running' && runningRow.outcome.state === 'unknown' && runningRow.outcome.reason === 'conflicting evidence', outcome: runningRow.outcome, registryStatus: runningRow.registryStatus });
    }
    await command('/gb1 release');
    await until(async () => (await records()).filter(item => item.type === 'lifecycle' && item.value.id === id && item.value.status === 'completed').length >= 2, 'second native completion');
    const finished = await serve();
    const finishedNative = await dump();
    const second = finished.snapshot.children.find(row => row.childId === id).outcome;
    emit('FOLLOWUP_FINISHED_RESULT', { inject, pass: inject ? second.state === 'unknown' && second.reason === 'ambiguous terminal evidence' : second.state === 'completed' && second.generation === first.generation + 1 && second.at !== first.at && JSON.stringify(second.spawnCallId) === JSON.stringify(first.spawnCallId), first, second });
    if (!inject) emit('FOLLOWUP_COMPARE', compare(finished.snapshot, finishedNative, 1));
    else emit('INJECTED_FRAME', (await records()).find(item => item.type === 'late-terminal-injected'));
  }
  if (scenario === 'same-id-replacement') {
    const beforeRef = native.refs.find(ref => ref.kind === 'sub');
    await command('/gb1 retire ' + JSON.stringify({ id: beforeRef.id }));
    emit('RETIRE_RESULT', (await records()).find(item => item.type === 'retired'));
    await command('HARNESS_AGENT=main');
    const replacement = await serve();
    const replacementNative = await dump();
    emit('REPLACEMENT_COMPARE', compare(replacement.snapshot, replacementNative, 1));
    emit('REPLACEMENT_RESULT', { before: { id: beforeRef.id, createdAt: beforeRef.createdAt, sessionFile: beforeRef.sessionFile }, after: replacementNative.refs.filter(ref => ref.kind === 'sub').map(ref => ({ id: ref.id, createdAt: ref.createdAt, sessionFile: ref.sessionFile })), outcomes: replacement.snapshot.children.map(row => row.outcome) });
  }
  if (scenario === 'new-session' || scenario === 'fork') {
    const transition = scenario === 'new-session'
      ? await request('new_session')
      : await command('/gb1 fork');
    emit('SESSION_TRANSITION', transition);
    await command('HARNESS_AGENT=main');
    const switched = await serve();
    const switchedNative = await dump();
    emit('SWITCH_COMPARE', compare(switched.snapshot, switchedNative, 1));
    emit('SWITCH_RESULT', { pass: switched.snapshot.epoch !== observed.snapshot.epoch && switchedNative.root !== native.root && switched.snapshot.children.every(row => !observed.snapshot.children.some(old => old.childId === row.childId)), oldIds: observed.snapshot.children.map(row => row.childId), newIds: switched.snapshot.children.map(row => row.childId), oldRoot: native.root, newRoot: switchedNative.root });
    for (const status of ['idle', 'running', 'parked', 'aborted']) {
      await command('/gb1 status ' + JSON.stringify({ id: observed.snapshot.children[0].childId, status }));
      const scoped = await serve();
      const scopeNative = await dump();
      const oldRef = scopeNative.refs.find(ref => ref.id === observed.snapshot.children[0].childId);
      emit('OLD_ROOT_STATUS_RESULT', { status, nativeStatus: oldRef?.status, pass: oldRef?.status === status && scoped.snapshot.children.every(row => row.childId !== oldRef.id), admittedIds: scoped.snapshot.children.map(row => row.childId) });
    }
  }
  if (['many-33', 'many-135'].includes(scenario)) {
    const limit = scenario === 'many-33' ? 32 : 128;
    await command('/gb1 cap ' + JSON.stringify({ repo: process.cwd(), limit }));
    const cap = (await records()).filter(item => item.type === 'cap').at(-1);
    emit('CAP', cap);
    emit('CAP_RESULT', { pass: cap.inventory.state === 'partial' && cap.rows === limit && cap.inventory.reason === `cap ${limit} of ${expectedCounts[scenario]}` });
  }
  if (scenario === 'one-child' && process.argv[3] === 'faults') {
    const id = observed.snapshot.children[0].childId;
    for (const indices of [[0, 1], [1, 0], [0, 1, 1], [1, 0, 1]]) {
      await command('/gb1 replay ' + JSON.stringify({ id, indices }));
      const replayed = await serve();
      const row = replayed.snapshot.children.find(row => row.childId === id);
      emit('REORDER_RESULT', { indices, pass: row.outcome.state === 'completed' || (row.outcome.state === 'unknown' && row.outcome.reason === 'conflicting evidence'), outcome: row.outcome });
    }
    await command('/gb1 throw');
    const interrupted = await serve();
    emit('INTERRUPTED_RESULT', { pass: interrupted.snapshot.inventory.state === 'partial', inventory: interrupted.snapshot.inventory, rows: interrupted.snapshot.children.length });
    await command('/gb1 unthrow');
  }
  await writeFile('/tmp/gb1-' + recordName + '-capture.json', JSON.stringify({ observed, native, events }, null, 2));
  processHandle.kill();
  emit('PROCESS_EXIT', await processHandle.exited);
  await Promise.all([consumeOut, consumeErr]);
  if (rawErr.trim()) emit('STDERR', rawErr);
} catch (error) {
  emit('DRIVER_ERROR', String(error));
  if (rawOut) emit('RPC_OUTPUT', rawOut);
  if (rawErr) emit('STDERR', rawErr);
  process.exitCode = 1;
  emit('FAILURE_TRACE', (await records()).filter(item => !['dump'].includes(item.type)));
} finally {
  if (processHandle) processHandle.kill();
  await profile.teardown();
  emit('PROFILE_REMOVED', scenario);
  await writeFile('/tmp/gb1-' + recordName + '.out', output.join('\n') + '\n');
}

```

### Source `/tmp/gb1-extension.ts`

```ts
import { appendFileSync, existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default function probe(api) {
  const log = (value) => appendFileSync(join(process.env.TMPDIR!, 'gb1-events.jsonl'), JSON.stringify(value) + '\n');
  let main = false;
  const facts = [];
  const registry = api.pi.AgentRegistry.global();
  const savedRefs = new Map();
  let endpointUrl = null;
  let originalList = null;
  let injectedChild = null;
  const holdFile = join(process.env.TMPDIR!, 'gb1-hold.json');
  api.events.on('task:subagent:lifecycle', (value) => {
    facts.push({ ...value, receivedAt: new Date().toISOString() });
    if (main) log({ type: 'lifecycle', value });
    if (main && injectedChild === value.id && value.status === 'started') {
      injectedChild = null;
      const injected = { ...value, status: 'failed' };
      queueMicrotask(() => {
        api.events.emit('task:subagent:lifecycle', injected);
        log({ type: 'late-terminal-injected', frame: injected });
      });
    }
  });
  api.on('context', async (_, ctx) => {
    if (ctx.agent.kind !== 'sub' || !existsSync(holdFile)) return;
    const held = JSON.parse(readFileSync(holdFile, 'utf8'));
    if (held.id !== ctx.agent.id) return;
    log({ type: 'held', id: ctx.agent.id, status: registry.get(ctx.agent.id)?.status });
    const deadline = Date.now() + 20000;
    while (existsSync(holdFile)) {
      if (Date.now() > deadline) throw new Error('GB1 child hold timed out');
      await Bun.sleep(25);
    }
  });
  api.on('session_start', (_, ctx) => {
    main = ctx.agent.kind === 'main';
    if (!main) log({ type: 'child-binding', agent: ctx.agent });
    if (!main) return;
    const notify = ctx.ui.notify.bind(ctx.ui);
    ctx.ui.notify = (message, level) => {
      log({ type: 'notification', message, level });
      if (/^http:/.test(message)) endpointUrl = message;
      return notify(message, level);
    };
    log({ type: 'ready', agent: ctx.agent, root: ctx.sessionManager.getSessionFile() });
  });
  api.on('session_switch', (_, ctx) => { if (main) log({ type: 'switch', root: ctx.sessionManager.getSessionFile() }); });
  api.on('session_branch', (_, ctx) => { if (main) log({ type: 'branch', root: ctx.sessionManager.getSessionFile() }); });
  api.registerCommand('gb1', {
    description: 'Disposable GB1 native registry evidence',
    async handler(args, ctx) {
      const separator = args.indexOf(' ');
      const action = separator < 0 ? args.trim() : args.slice(0, separator);
      const options = separator < 0 ? {} : JSON.parse(args.slice(separator + 1));
      if (action === 'cap') {
        // The source root is a runtime-selected disposable probe input.
        const { createStockSource } = await import(join(options.repo, 'omp-orca-observer/stock-source.ts'));
        const current = await (await fetch(new URL('/v1/snapshot', endpointUrl))).json();
        const outcomes = new Map(current.children.map(row => [row.childId, row.outcome]));
        const source = createStockSource(api, ctx.sessionManager.getSessionFile(), {
          outcome(id) { return outcomes.get(id) ?? { state: 'unknown', reason: 'no snapshot evidence' }; },
          forget(id) { outcomes.delete(id); },
        });
        try {
          const collected = source.collect(options.limit);
          log({ type: 'cap', limit: options.limit, inventory: collected.inventory, rows: collected.rows.length, ids: collected.rows.map(row => row.childId) });
        } finally { source.dispose(); }
        return;
      }
      if (action === 'throw') {
        originalList = registry.list.bind(registry);
        const ref = Object.defineProperty({ id: 'gb1-throw', kind: 'sub' }, 'sessionFile', { get() { throw new Error('GB1 injected enumeration fault'); } });
        registry.list = () => [...originalList(), ref];
        registry.setStatus('Main', 'idle');
        log({ type: 'injected-throw' });
        return;
      }
      if (action === 'unthrow') {
        registry.list = originalList;
        originalList = null;
        registry.setStatus('Main', 'running');
        log({ type: 'removed-throw' });
        return;
      }
      if (action === 'replay') {
        const recorded = facts.filter(fact => fact.id === options.id).slice(0, 2);
        for (const index of options.indices) {
          const { receivedAt, ...fact } = recorded[index];
          api.events.emit('task:subagent:lifecycle', fact);
        }
        log({ type: 'replayed', id: options.id, indices: options.indices });
        return;
      }
      if (action === 'followup') {
        const tool = registry.get('Main').session.getToolByName('write');
        const result = await tool.execute('gb1-native-followup', { path: 'agent://' + options.id, content: 'HARNESS_AGENT=child/followup second native assignment.' });
        log({ type: 'followup-result', result });
        return;
      }
      if (action === 'hold') {
        writeFileSync(holdFile, JSON.stringify({ id: options.id }));
        if (options.inject) injectedChild = options.id;
        log({ type: 'armed-hold', ...options });
        return;
      }
      if (action === 'release') {
        unlinkSync(holdFile);
        log({ type: 'released-hold' });
        return;
      }
      if (action === 'retire') {
        const ref = registry.get(options.id);
        await ref.session?.dispose();
        registry.unregister(options.id, ref);
        log({ type: 'retired', id: options.id, remaining: Boolean(registry.get(options.id)) });
        return;
      }
      if (action === 'park') {
        const ref = registry.get(options.id);
        const session = ref.session;
        await session?.dispose();
        ref.session = null;
        ref.status = 'parked';
        registry.register(ref);
        log({ type: 'parked', id: options.id, status: registry.get(options.id)?.status, liveSession: Boolean(registry.get(options.id)?.session) });
        return;
      }
      if (action === 'status') {
        const ref = registry.get(options.id) ?? savedRefs.get(options.id);
        if (!registry.get(options.id)) registry.register(ref);
        if (options.status === 'parked' || options.status === 'aborted') ref.session = null;
        const result = registry.setStatus(options.id, options.status);
        log({ type: 'set-status', ...options, result });
        return;
      }
      if (action === 'native-read') {
        const tool = registry.get('Main').session.getToolByName('read');
        const result = await tool.execute('gb1-native-restore-read', { path: 'agent://' + options.id });
        log({ type: 'native-read', id: options.id, result, registered: Boolean(registry.get(options.id)) });
        return;
      }
      if (action === 'fork') {
        const result = await registry.get('Main').session.fork();
        log({ type: 'forked', result, root: ctx.sessionManager.getSessionFile() });
        return;
      }
      if (action !== 'dump') throw new Error('Unknown GB1 action: ' + action);
      const refs = registry.list().map(ref => {
        savedRefs.set(ref.id, ref);
        const parsed = ref.kind !== 'main' && ref.sessionFile && existsSync(ref.sessionFile) ? api.pi.parseSessionContent(readFileSync(ref.sessionFile, 'utf8')) : null;
        return {
          id: ref.id, displayName: ref.displayName, kind: ref.kind, parentId: ref.parentId,
          status: ref.status, sessionFile: ref.sessionFile, createdAt: ref.createdAt, lastActivity: ref.lastActivity,
          history: ref.history, lifecycle: ref.lifecycle,
          session: ref.session ? {
            cwd: ref.session.sessionManager.getCwd(), resolvedModel: ref.session.servingModel?.selector,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(ref.session)),
          } : null,
          tombstoned: ref.sessionFile ? existsSync(ref.sessionFile + '.tombstone') : false,
          transcript: parsed ? {
            header: parsed.entries.find(entry => entry.type === 'session'),
            metadata: parsed.entries.filter(entry => entry.type !== 'message' && entry.type !== 'custom'),
            messages: parsed.entries.filter(entry => entry.type === 'message').map(entry => ({
              role: entry.message.role, content: entry.message.content,
            })),
            malformedRecords: parsed.malformedRecords, invalidHeader: parsed.invalidHeader,
          } : null,
        };
      });
      const root = ctx.sessionManager.getSessionFile();
      const transcriptFiles = [];
      const directories = [root.replace(/\.jsonl$/, '')];
      while (directories.length) {
        const directory = directories.pop();
        if (!existsSync(directory)) continue;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const file = join(directory, entry.name);
          if (entry.isDirectory()) directories.push(file);
          else if (entry.isFile() && entry.name.endsWith('.jsonl') && !entry.name.includes('.bak') && !entry.name.startsWith('__advisor.')) transcriptFiles.push(file);
        }
      }
      log({
        type: 'dump', root, refs, facts, transcriptFiles,
        rootEntries: ctx.sessionManager.getEntries().map(entry => ({ id: entry.id, type: entry.type, role: entry.message?.role })),
        registryMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(registry)),
        piExports: Object.keys(api.pi),
        contextMethods: Object.fromEntries(['newSession', 'switchSession', 'fork', 'navigateTree', 'waitForIdle'].map(key => [key, typeof ctx[key]])),
      });
    },
  });
}

```

### Source `/tmp/gb1-restart.ts`

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare } from './gb1-compare.ts';
// This parent imports only the harness from a runtime-selected repository.
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const name = process.argv[2];
const expected = name === 'partial-restore' ? 135 : name === 'cold-restart' ? 3 : 1;
const profile = await create(name);
const file = join(profile.root, 'tmp', 'gb1-events.jsonl');
let child;
let consumer;
let errorConsumer;
const events = [];
const pending = new Map();
const lines = [];
let serial = 0;
const emit = (...values) => {
  const text = values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ').replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  console.log(text); lines.push(text);
};
async function trace() {
  try { return (await readFile(file, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function until(fn, label, timeout = 180000) {
  const end = Date.now() + timeout;
  for (; ;) { const value = await fn(); if (value) return value; if (Date.now() > end) throw new Error('Timeout: ' + label); await Bun.sleep(25); }
}
async function request(type, fields = {}) {
  const id = 'restart-' + ++serial;
  const { promise, resolve, reject } = Promise.withResolvers();
  const timer = setTimeout(() => reject(new Error('RPC timeout: ' + type)), 45000);
  pending.set(id, response => { clearTimeout(timer); resolve(response); });
  child.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
  const response = await promise;
  if (!response.success) throw new Error(JSON.stringify(response));
  return response;
}
async function prompt(message) {
  emit('RPC_COMMAND', message);
  const response = await request('prompt', { message });
  await until(() => events.find(event => event.type === 'prompt_result' && event.id === response.id), 'prompt result');
}
async function start(sessionFile) {
  const before = (await trace()).filter(record => record.type === 'ready').length;
  const args = ['--mode', 'rpc', '--no-lsp', '--no-title', '--model', 'stub/scripted', '-e', '/tmp/gb1-extension.ts', ...(sessionFile ? ['--resume', sessionFile] : [])];
  emit('COMMAND', ['omp', '--profile', name, ...args]);
  child = profile.spawn(args);
  const ownChild = child;
  consumer = (async () => {
    const reader = ownChild.stdout.getReader();
    const decoder = new TextDecoder(); let buffer = '';
    for (; ;) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      while (buffer.includes('\n')) {
        const end = buffer.indexOf('\n'); const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try { const event = JSON.parse(line); events.push(event); if (event.type === 'response') pending.get(event.id)?.(event); if (event.type === 'tool_execution_end' && event.isError) emit('TOOL_ERROR', event); }
        catch { if (line) emit('NON_RPC_OUTPUT', line); }
      }
    }
  })();
  errorConsumer = (async () => { const stderr = await new Response(ownChild.stderr).text(); if (stderr.trim()) emit('STDERR', stderr); })();
  const ready = await until(async () => (await trace()).filter(record => record.type === 'ready')[before], 'new process ready');
  emit('READY', ready);
}
async function stop() {
  child.kill(); emit('PROCESS_EXIT', await child.exited); await Promise.all([consumer, errorConsumer]);
}
async function dump() {
  const before = (await trace()).filter(record => record.type === 'dump').length;
  await prompt('/gb1 dump');
  return (await trace()).filter(record => record.type === 'dump')[before];
}
async function snapshot() {
  const before = (await trace()).length;
  await prompt('/observer serve');
  const notification = await until(async () => (await trace()).slice(before).find(record => record.type === 'notification' && /^http:/.test(record.message)), 'observer endpoint');
  await Bun.sleep(1000);
  const response = await fetch(new URL('/v1/snapshot', notification.message));
  const text = await response.text();
  emit('GET /v1/snapshot', { status: response.status, bytes: Buffer.byteLength(text) });
  return JSON.parse(text);
}
try {
  await start(); await prompt('HARNESS_AGENT=main');
  await until(async () => new Set((await trace()).filter(record => record.type === 'lifecycle' && record.value.status !== 'started').map(record => record.value.id)).size >= expected, 'native children persisted');
  const first = await snapshot(); const firstNative = await dump();
  emit('BEFORE_RESTART_COMPARE', compare(first, firstNative, expected));
  await stop();
  await start(firstNative.root);
  const restored = await snapshot(); const restoredNative = await dump();
  emit('AFTER_RESTART_COMPARE', compare(restored, restoredNative, restoredNative.refs.filter(ref => ref.kind === 'sub').length));
  const missing = restoredNative.transcriptFiles.filter(file => !restoredNative.refs.some(ref => ref.kind === 'sub' && ref.sessionFile === file));
  emit('RESTORE_RESULT', { epochChanged: restored.epoch !== first.epoch, inventory: restored.inventory, nativeTranscriptCount: restoredNative.transcriptFiles.length, nativeRefCount: restoredNative.refs.filter(ref => ref.kind === 'sub').length, missingCount: missing.length, outcomes: restored.children.map(row => ({ id: row.childId, outcome: row.outcome, registryStatus: row.registryStatus })) });
  if (missing.length) {
    const ids = firstNative.refs.filter(ref => ref.kind === 'sub').map(ref => ref.id);
    await prompt('/gb1 native-read ' + JSON.stringify({ id: ids[0] }));
    const read = (await trace()).filter(record => record.type === 'native-read').at(-1);
    emit('NATIVE_RESTORE_READ', read);
    if (read.registered) {
      const partial = await snapshot(); const partialNative = await dump();
      emit('PARTIAL_RESTORE_COMPARE', compare(partial, partialNative, 1));
      for (const id of ids.slice(1)) await prompt('/gb1 native-read ' + JSON.stringify({ id }));
      const complete = await snapshot(); const completeNative = await dump();
      emit('COMPLETE_RESTORE_COMPARE', compare(complete, completeNative, expected));
      emit('COMPLETE_RESTORE_RESULT', { pass: complete.inventory.state === 'complete' && complete.children.length === expected, inventory: complete.inventory, rows: complete.children.length });
    } else emit('RESTORE_LIMITATION', 'Native agent:// read does not restore a registry ref; no authorized native full-restoration operation is specified in the permitted files.');
  }
  await writeFile('/tmp/gb1-' + name + '-restart-capture.json', JSON.stringify({ first, firstNative, restored, restoredNative }, null, 2));
  await stop();
} catch (error) {
  emit('DRIVER_ERROR', String(error)); process.exitCode = 1;
  const records = await trace(); emit('LAST_TRACE', records.filter(record => !['dump', 'lifecycle'].includes(record.type)).slice(-10));
} finally {
  if (child) child.kill(); await profile.teardown(); emit('PROFILE_REMOVED', name);
  await writeFile('/tmp/gb1-' + name + '-restart.out', lines.join('\n') + '\n');
}

```

### Source `/tmp/gb1-bootstrap.ts`

```ts
import { join } from 'node:path';
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
console.log('GATE_START', new Date().toISOString());
const profile = await create('one-child');
try {
  for (const args of [['--version'], ['--help']]) {
    const result = await profile.run(args);
    console.log('COMMAND', JSON.stringify(['omp', '--profile', 'one-child', ...args]));
    console.log('EXIT', result.exitCode);
    console.log('STDOUT\n' + result.stdout);
    console.log('STDERR\n' + result.stderr.replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD'));
  }
} finally {
  await profile.teardown();
  console.log('PROFILE_REMOVED');
}

```

### Source `/tmp/gb1-link.ts`

```ts
import { join } from 'node:path';
// Runtime source root; this parent loads only the harness.
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const profile = await create('one-child');
try {
  for (const args of [['plugin', 'link', '/tmp/gb1-probe'], ['plugin', 'features', 'gb1-native-probe']]) {
    const result = await profile.run(args);
    console.log('COMMAND', JSON.stringify(['omp', '--profile', 'one-child', ...args]));
    console.log('EXIT', result.exitCode);
    console.log('STDOUT', result.stdout.replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD'));
    console.log('STDERR', result.stderr.replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD'));
  }
} finally { await profile.teardown(); console.log('PROFILE_REMOVED'); }

```

### Source `/tmp/gb1-basic-extension.ts`

```ts
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export default function probe(api) {
  const log = (value) => appendFileSync(join(process.env.TMPDIR!, 'gb1-events.jsonl'), JSON.stringify(value) + '\n');
  let main = false;
  const facts = [];
  const registry = api.pi.AgentRegistry.global();
  let endpointUrl = null;
  let originalList = null;
  api.events.on('task:subagent:lifecycle', (value) => {
    facts.push({ ...value, receivedAt: new Date().toISOString() });
    if (main) log({ type: 'lifecycle', value });
  });
  api.on('session_start', (_, ctx) => {
    main = ctx.agent.kind === 'main';
    if (!main) return;
    const notify = ctx.ui.notify.bind(ctx.ui);
    ctx.ui.notify = (message, level) => {
      log({ type: 'notification', message, level });
      if (/^http:/.test(message)) endpointUrl = message;
      return notify(message, level);
    };
    log({ type: 'ready', agent: ctx.agent, root: ctx.sessionManager.getSessionFile() });
  });
  api.on('session_switch', (_, ctx) => { if (main) log({ type: 'switch', root: ctx.sessionManager.getSessionFile() }); });
  api.on('session_branch', (_, ctx) => { if (main) log({ type: 'branch', root: ctx.sessionManager.getSessionFile() }); });
  api.registerCommand('gb1', {
    description: 'Disposable GB1 native registry evidence',
    async handler(args, ctx) {
      const separator = args.indexOf(' ');
      const action = separator < 0 ? args.trim() : args.slice(0, separator);
      const options = separator < 0 ? {} : JSON.parse(args.slice(separator + 1));
      if (action === 'cap') {
        // The source root is a runtime-selected disposable probe input.
        const { createStockSource } = await import(join(options.repo, 'omp-orca-observer/stock-source.ts'));
        const current = await (await fetch(new URL('/v1/snapshot', endpointUrl))).json();
        const outcomes = new Map(current.children.map(row => [row.childId, row.outcome]));
        const source = createStockSource(api, ctx.sessionManager.getSessionFile(), {
          outcome(id) { return outcomes.get(id) ?? { state: 'unknown', reason: 'no snapshot evidence' }; },
          forget(id) { outcomes.delete(id); },
        });
        try {
          const collected = source.collect(options.limit);
          log({ type: 'cap', limit: options.limit, inventory: collected.inventory, rows: collected.rows.length, ids: collected.rows.map(row => row.childId) });
        } finally { source.dispose(); }
        return;
      }
      if (action === 'throw') {
        originalList = registry.list.bind(registry);
        const ref = Object.defineProperty({ id: 'gb1-throw', kind: 'sub' }, 'sessionFile', { get() { throw new Error('GB1 injected enumeration fault'); } });
        registry.list = () => [...originalList(), ref];
        registry.setStatus('Main', 'idle');
        log({ type: 'injected-throw' });
        return;
      }
      if (action === 'unthrow') {
        registry.list = originalList;
        originalList = null;
        registry.setStatus('Main', 'running');
        log({ type: 'removed-throw' });
        return;
      }
      if (action === 'replay') {
        const recorded = facts.filter(fact => fact.id === options.id).slice(0, 2);
        for (const index of options.indices) {
          const { receivedAt, ...fact } = recorded[index];
          api.events.emit('task:subagent:lifecycle', fact);
        }
        log({ type: 'replayed', id: options.id, indices: options.indices });
        return;
      }
      if (action === 'followup') {
        const tool = registry.get('Main').session.getToolByName('write');
        const result = await tool.execute('gb1-native-followup', { path: 'agent://' + options.id, content: 'HARNESS_AGENT=child/followup second native assignment.' });
        log({ type: 'followup-result', result });
        return;
      }
      if (action !== 'dump') throw new Error('Unknown GB1 action: ' + action);
      const refs = registry.list().map(ref => {
        const parsed = ref.kind !== 'main' && ref.sessionFile && existsSync(ref.sessionFile) ? api.pi.parseSessionContent(readFileSync(ref.sessionFile, 'utf8')) : null;
        return {
          id: ref.id, displayName: ref.displayName, kind: ref.kind, parentId: ref.parentId,
          status: ref.status, sessionFile: ref.sessionFile, createdAt: ref.createdAt, lastActivity: ref.lastActivity,
          history: ref.history, lifecycle: ref.lifecycle,
          session: ref.session ? {
            cwd: ref.session.sessionManager.getCwd(), resolvedModel: ref.session.servingModel?.selector,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(ref.session)),
          } : null,
          tombstoned: ref.sessionFile ? existsSync(ref.sessionFile + '.tombstone') : false,
          transcript: parsed ? {
            header: parsed.entries.find(entry => entry.type === 'session'),
            metadata: parsed.entries.filter(entry => entry.type !== 'message' && entry.type !== 'custom'),
            messages: parsed.entries.filter(entry => entry.type === 'message').map(entry => ({
              role: entry.message.role, content: entry.message.content,
            })),
            malformedRecords: parsed.malformedRecords, invalidHeader: parsed.invalidHeader,
          } : null,
        };
      });
      log({
        type: 'dump', root: ctx.sessionManager.getSessionFile(), refs, facts,
        registryMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(registry)),
        piExports: Object.keys(api.pi),
        contextMethods: Object.fromEntries(['newSession', 'switchSession', 'fork', 'navigateTree', 'waitForIdle'].map(key => [key, typeof ctx[key]])),
      });
    },
  });
}

```

### Source `/tmp/gb1-annex.ts`

```ts
import { readFile, writeFile } from 'node:fs/promises';
const phase = process.argv[2] ?? 'basic';
const scenarios = process.argv.slice(3);
const sources = phase === 'basic'
  ? ['gb1-driver.ts', 'gb1-compare.ts', 'gb1-check-capture.ts', 'gb1-batch.ts', 'gb1-reader.ts', 'gb1-reader-launch.ts']
  : ['gb1-driver.ts', 'gb1-extension.ts', 'gb1-compare.ts'];
let result = '\n## ' + phase + '-run annex: preserved sources and normalized output\n\n';
for (const name of sources) {
  result += '### Source `/tmp/' + name + '`\n\n```ts\n' + await readFile('/tmp/' + name, 'utf8') + '\n```\n\n';
}
for (const scenario of scenarios) {
  result += '### Output: `bun /tmp/gb1-driver.ts ' + scenario + (scenario === 'one-child' ? ' faults' : '') + '`\n\n```text\n'
    + await readFile('/tmp/gb1-' + scenario + '.out', 'utf8') + '```\n\n';
}
await writeFile('/tmp/gb1-' + phase + '-annex.md', result);
console.log('ANNEX', '/tmp/gb1-' + phase + '-annex.md', 'lines', result.split('\n').length, 'bytes', Buffer.byteLength(result));

```

### Source `/tmp/gb1-probe/index.ts`

```ts
export { default } from '../gb1-extension.ts';

```

### Source `/tmp/gb1-probe/package.json`

```json
{
  "name": "gb1-native-probe",
  "version": "0.0.0",
  "omp": {
    "extensions": [
      "./index.ts"
    ]
  }
}

```


## rerun source completion annex — preserved 2026-09-30

### Historical source `/tmp/gb1-rerun-extract.ts`
Retained for provenance only, not a reproduction command: it overwrites the adapted reader with the historical reader.

```ts
import { readFile, writeFile } from 'node:fs/promises';
const evidence = await readFile('omp-orca-observer/checks/evidence/gb1.md', 'utf8');
for (const name of ['reader', 'reader-launch']) {
  const marker = '### Source `/tmp/gb1-' + name + '.ts`';
  const start = evidence.indexOf('```ts\n', evidence.indexOf(marker)) + 6;
  const end = evidence.indexOf('\n```', start);
  if (start < 6 || end < start) throw new Error('Missing retained source: ' + name);
  await writeFile('/tmp/gb1-rerun-' + name + '.ts', evidence.slice(start, end).replaceAll('/tmp/gb1-reader.ts', '/tmp/gb1-rerun-reader.ts'));
}

```

### Source `/tmp/gb1-rerun-reader.ts`

```ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
// Runtime-selected repository imports exercise the dispatch's disposable module-load boundary.
const repo = process.argv[2];
const { reads } = await import(join(repo, 'omp-orca-observer/checks/harness/fs-probe.ts'));
const { readPage } = await import(join(repo, 'omp-orca-observer/reader.ts'));
const { parseSessionContent } = await import(join(repo, 'node_modules/@oh-my-pi/pi-coding-agent/src/session/session-loader.ts'));
const sessionFile = join(repo, 'omp-orca-observer/checks/harness/fixtures/small.jsonl');
const bytes = await readFile(sessionFile);
const firstRecordBytes = bytes.indexOf(10) + 1;
const expectedEnds = [...bytes.entries()].filter(([, value]) => value === 10).map(([index]) => index + 1);
console.log('FIXTURE', JSON.stringify({ file: '$PWD/omp-orca-observer/checks/harness/fixtures/small.jsonl', totalBytes: bytes.length, firstRecordBytes }));
for (const maxBytes of [16, 1, 0]) {
  const readBound = Math.max(1, maxBytes);
  const recordEnds = [];
  let maximumRead = 0;
  let steps = 0;
  let token = null;
  let firstEnd = null;
  let ended = false;
  let bounded = true;
  let monotone = true;
  let cursor = 0;
  let oversized = false;
  let emptyNonEnd = 0;
  const limit = bytes.length + 10;
  for (let step = 0; step < limit; step++) {
    const before = reads.length;
    const result = await readPage({ childId: 'native-fixture', sessionFile, epoch: 'gb1', token, mode: 'bytes', maxBytes, signal: new AbortController().signal }, parseSessionContent);
    assert.notEqual(result.kind, 'unavailable');
    steps++;
    const windows = reads.slice(before).filter(read => read.path === sessionFile);
    if (windows.some(read => read.length > readBound)) bounded = false;
    maximumRead = Math.max(maximumRead, ...windows.map(read => read.length ?? 0));
    const decoded = JSON.parse(Buffer.from(result.token, 'base64url').toString('utf8'));
    if (result.kind === 'record_too_large' && result.end !== null && firstEnd === null) firstEnd = result.end;
    if (result.kind === 'record_too_large' && result.end !== null) recordEnds.push(result.end);
    const payloadBytes = result.kind === 'page' ? Buffer.from(result.bytesBase64 ?? '', 'base64').length : 0;
    if (payloadBytes > maxBytes) oversized = true;
    if (decoded.cursor <= cursor && !(result.kind === 'page' && result.atEnd)) monotone = false;
    cursor = decoded.cursor;
    if (result.kind === 'page' && !result.atEnd && payloadBytes === 0) emptyNonEnd++;
    if (maxBytes > 1 || result.kind === 'page' || result.end !== null || step === 0) {
      console.log('STEP', JSON.stringify({ maxBytes, step, kind: result.kind, start: result.start, end: result.end, scannedTo: result.scannedTo, atEnd: result.atEnd, cursor, payloadBytes, reads: windows.map(read => ({ offset: read.offset, length: read.length })) }));
    }
    token = result.token;
    if (result.kind === 'page' && result.atEnd) { ended = true; break; }
  }
  const allRecordsEnded = JSON.stringify(recordEnds) === JSON.stringify(expectedEnds);
  const pass = bounded && monotone && !oversized && firstEnd === firstRecordBytes && allRecordsEnded && ended && emptyNonEnd === 0;
  console.log('RESULT', JSON.stringify({ maxBytes, pass, readBound, maximumRead, steps, bounded, monotone, oversized, firstEnd, expectedFirstEnd: firstRecordBytes, recordEnds, expectedEnds, allRecordsEnded, ended, emptyNonEnd }));
  assert.ok(pass, 'bounded too-small page progress for maxBytes=' + maxBytes);
}

```

### Source `/tmp/gb1-rerun-reader-launch.ts`

```ts
import { join } from 'node:path';
// Runtime-selected source root; no omp module loads in this parent process.
const repo = process.cwd();
const { create } = await import(join(repo, 'omp-orca-observer/checks/harness/profile.ts'));
const profile = await create('one-child');
try {
  const env = {
    PATH: process.env.PATH ?? '', HOME: profile.home, TMPDIR: join(profile.root, 'tmp'),
    XDG_CONFIG_HOME: join(profile.root, 'config'), XDG_CACHE_HOME: join(profile.root, 'cache'),
    XDG_DATA_HOME: join(profile.root, 'data'), XDG_STATE_HOME: join(profile.root, 'state'),
  };
  console.log('COMMAND', 'Bun.spawn(["bun", "/tmp/gb1-rerun-reader.ts", "$PWD"], { cwd: "<tmp>/workspace", env: harnessDisposableEnv })');
  const child = Bun.spawn(['bun', '/tmp/gb1-rerun-reader.ts', repo], { cwd: profile.workspace, env, stdout: 'pipe', stderr: 'pipe' });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  console.log(stdout.replaceAll(repo, '$PWD').replaceAll(profile.root, '<tmp>'));
  if (stderr) console.log('STDERR', stderr.replaceAll(repo, '$PWD').replaceAll(profile.root, '<tmp>'));
  console.log('EXIT', code);
} finally {
  await profile.teardown();
  console.log('PROFILE_REMOVED');
}

```

### Source `/tmp/gb1-rerun-advisor.ts`

```ts
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { compare } from './gb1-compare.ts';
// This parent imports only the harness from a runtime-selected repository.
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const name = process.argv[2];
const expected = 1;
const profile = await create(name);
const file = join(profile.root, 'tmp', 'gb1-events.jsonl');
let child;
let consumer;
let errorConsumer;
const events = [];
const pending = new Map();
const lines = [];
let serial = 0;
let endpointUrl;
const emit = (...values) => {
  const text = values.map(value => typeof value === 'string' ? value : JSON.stringify(value)).join(' ').replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  console.log(text); lines.push(text);
};
async function trace() {
  try { return (await readFile(file, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line)); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function until(fn, label, timeout = 180000) {
  const end = Date.now() + timeout;
  for (; ;) { const value = await fn(); if (value) return value; if (Date.now() > end) throw new Error('Timeout: ' + label); await Bun.sleep(25); }
}
async function request(type, fields = {}) {
  const id = 'restart-' + ++serial;
  const { promise, resolve, reject } = Promise.withResolvers();
  const timer = setTimeout(() => reject(new Error('RPC timeout: ' + type)), 45000);
  pending.set(id, response => { clearTimeout(timer); resolve(response); });
  child.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
  const response = await promise;
  if (!response.success) throw new Error(JSON.stringify(response));
  return response;
}
async function prompt(message) {
  emit('RPC_COMMAND', message);
  const response = await request('prompt', { message });
  await until(() => events.find(event => event.type === 'prompt_result' && event.id === response.id), 'prompt result');
}
async function start(sessionFile) {
  const before = (await trace()).filter(record => record.type === 'ready').length;
  const args = ['--mode', 'rpc', '--no-lsp', '--no-title', '--model', 'stub/scripted', '-e', '/tmp/gb1-rerun-extension.ts', ...(sessionFile ? ['--resume', sessionFile] : [])];
  emit('COMMAND', ['omp', '--profile', name, ...args]);
  child = profile.spawn(args);
  const ownChild = child;
  consumer = (async () => {
    const reader = ownChild.stdout.getReader();
    const decoder = new TextDecoder(); let buffer = '';
    for (; ;) {
      const { value, done } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      while (buffer.includes('\n')) {
        const end = buffer.indexOf('\n'); const line = buffer.slice(0, end); buffer = buffer.slice(end + 1);
        try { const event = JSON.parse(line); events.push(event); if (event.type === 'response') pending.get(event.id)?.(event); if (event.type === 'tool_execution_end' && event.isError) emit('TOOL_ERROR', event); }
        catch { if (line) emit('NON_RPC_OUTPUT', line); }
      }
    }
  })();
  errorConsumer = (async () => { const stderr = await new Response(ownChild.stderr).text(); if (stderr.trim()) emit('STDERR', stderr); })();
  const ready = await until(async () => (await trace()).filter(record => record.type === 'ready')[before], 'new process ready');
  emit('READY', ready);
}
async function stop() {
  child.kill(); emit('PROCESS_EXIT', await child.exited); await Promise.all([consumer, errorConsumer]);
}
async function dump() {
  const before = (await trace()).filter(record => record.type === 'dump').length;
  await prompt('/gb1 dump');
  return (await trace()).filter(record => record.type === 'dump')[before];
}
async function snapshot() {
  const before = (await trace()).length;
  await prompt('/observer serve');
  const notification = await until(async () => (await trace()).slice(before).find(record => record.type === 'notification' && /^http:/.test(record.message)), 'observer endpoint');
  await Bun.sleep(1000);
  endpointUrl = notification.message;
  const response = await fetch(new URL('/v1/snapshot', notification.message));
  const text = await response.text();
  emit('GET /v1/snapshot', { status: response.status, bytes: Buffer.byteLength(text) });
  return JSON.parse(text);
}
try {
  await start(); await prompt('HARNESS_AGENT=main');
  await until(async () => new Set((await trace()).filter(record => record.type === 'lifecycle' && record.value.status !== 'started').map(record => record.value.id)).size >= expected, 'native children persisted');
  await until(async () => {
    await prompt('/gb1 dump');
    const native = (await trace()).filter(record => record.type === 'dump').at(-1);
    return native.advisorTranscriptFiles.length > 0;
  }, 'real advisor transcript persisted');
  const first = await snapshot(); const firstNative = await dump();
  const firstComparison = compare(first, firstNative, expected);
  emit('BEFORE_RESTART_COMPARE', firstComparison);
  assert.ok(firstComparison.pass);
  const captures = (await readFile(profile.capture, 'utf8')).trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const advisorRequests = captures.filter(capture => capture.model === 'advisor');
  const advisorTranscripts = await Promise.all(firstNative.advisorTranscriptFiles.map(async file => ({ file, content: await readFile(file, 'utf8') })));
  emit('REAL_ADVISOR_TRANSCRIPTS', { advisorRequests, transcripts: advisorTranscripts });
  assert.ok(advisorRequests.some(capture => capture.status === 200));
  assert.ok(advisorTranscripts.some(transcript => transcript.content.includes('Harness advisor reply')));
  await stop();
  await start(firstNative.root);
  const restored = await snapshot(); const restoredNative = await dump();
  emit('AFTER_RESTART_COMPARE', compare(restored, restoredNative, restoredNative.refs.filter(ref => ref.kind === 'sub').length));
  const missing = restoredNative.transcriptFiles.filter(file => !restoredNative.refs.some(ref => ref.kind === 'sub' && ref.sessionFile === file));
  emit('RESTORE_RESULT', { epochChanged: restored.epoch !== first.epoch, inventory: restored.inventory, nativeTranscriptCount: restoredNative.transcriptFiles.length, nativeRefCount: restoredNative.refs.filter(ref => ref.kind === 'sub').length, missingCount: missing.length, outcomes: restored.children.map(row => ({ id: row.childId, outcome: row.outcome, registryStatus: row.registryStatus })) });
  const countedTranscripts = restoredNative.transcriptFiles.length;
  emit('ADVISOR_WALK_BEFORE_RESTORE', { totalTranscriptCount: countedTranscripts + restoredNative.advisorTranscriptFiles.length, ordinaryTranscriptCount: countedTranscripts, advisorTranscriptCount: restoredNative.advisorTranscriptFiles.length, inventory: restored.inventory });
  assert.equal(countedTranscripts, 1);
  assert.deepEqual(restored.inventory, { state: 'unknown', reason: 'registry not fully restored: 0 of 1; missing: advisor-child.jsonl' });
  if (missing.length) {
    const ids = firstNative.refs.filter(ref => ref.kind === 'sub').map(ref => ref.id);
    await prompt('/gb1 native-read ' + JSON.stringify({ id: ids[0] }));
    const read = (await trace()).filter(record => record.type === 'native-read').at(-1);
    emit('NATIVE_RESTORE_READ', read);
    if (read.registered) {
      const complete = await snapshot(); const completeNative = await dump();
      const comparison = compare(complete, completeNative, expected);
      emit('COMPLETE_RESTORE_COMPARE', comparison);
      assert.ok(comparison.pass);
      const advisors = completeNative.refs.filter(ref => ref.kind === 'advisor');
      emit('NATIVE_ADVISOR_REFS', advisors.map(ref => ({ id: ref.id, kind: ref.kind, status: ref.status, session: ref.session, parentId: ref.parentId, sessionFile: ref.sessionFile })));
      assert.ok(advisors.length > 0);
      assert.ok(advisors.every(ref => ref.status === 'parked' && ref.session === null));
      assert.ok(advisors.every(ref => completeNative.advisorTranscriptFiles.includes(ref.sessionFile)));
      assert.deepEqual(complete.children.map(row => row.childId), ['advisor-child']);
      assert.deepEqual(complete.inventory, { state: 'complete' });
      const pageResponses = [];
      for (const advisor of advisors) {
        const route = '/v1/children/' + encodeURIComponent(advisor.id) + '/page';
        const response = await fetch(new URL(route, endpointUrl));
        const body = await response.text();
        emit('ADVISOR_PAGE_ROUTE', { command: 'GET ' + route, status: response.status, body });
        assert.equal(response.status, 404);
        pageResponses.push({ id: advisor.id, status: response.status, body });
      }
      await prompt('/gb1 cap ' + JSON.stringify({ repo: process.cwd(), limit: 256, ids: advisors.map(ref => ref.id) }));
      const collected = (await trace()).filter(record => record.type === 'cap').at(-1);
      emit('ADVISOR_ADMISSION', collected);
      assert.ok(collected.admissions.every(admission => admission.sessionFile === null));
      assert.deepEqual(collected.inventory, { state: 'complete' });
      emit('ADVISOR_RESULT', { pass: true, advisorIds: advisors.map(ref => ref.id), snapshotIds: complete.children.map(row => row.childId), inventory: complete.inventory, totalTranscriptCount: completeNative.transcriptFiles.length + completeNative.advisorTranscriptFiles.length, ordinaryTranscriptCount: completeNative.transcriptFiles.length, advisorTranscriptCount: completeNative.advisorTranscriptFiles.length, pageResponses });
      await writeFile('/tmp/gb1-rerun-advisor-capture.json', JSON.stringify({ first, firstNative, restored, restoredNative, complete, completeNative, collected }, null, 2));
    } else throw new Error('Native restore read did not register the child');
  }
  else throw new Error('No missing ordinary transcript to exercise restoration inventory count');
  await stop();
} catch (error) {
  emit('DRIVER_ERROR', String(error)); process.exitCode = 1;
  const records = await trace(); emit('LAST_TRACE', records.filter(record => !['dump', 'lifecycle'].includes(record.type)).slice(-10));
} finally {
  if (child) child.kill(); await profile.teardown(); emit('PROFILE_REMOVED', name);
  await writeFile('/tmp/gb1-rerun-advisor.out', lines.join('\n') + '\n');
}

```

### Source `/tmp/gb1-rerun-extension.ts`

```ts
import { appendFileSync, existsSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export default function probe(api) {
  const log = (value) => appendFileSync(join(process.env.TMPDIR!, 'gb1-events.jsonl'), JSON.stringify(value) + '\n');
  let main = false;
  const facts = [];
  const registry = api.pi.AgentRegistry.global();
  const savedRefs = new Map();
  let endpointUrl = null;
  let originalList = null;
  let injectedChild = null;
  const holdFile = join(process.env.TMPDIR!, 'gb1-hold.json');
  api.events.on('task:subagent:lifecycle', (value) => {
    facts.push({ ...value, receivedAt: new Date().toISOString() });
    if (main) log({ type: 'lifecycle', value });
    if (main && injectedChild === value.id && value.status === 'started') {
      injectedChild = null;
      const injected = { ...value, status: 'failed' };
      queueMicrotask(() => {
        api.events.emit('task:subagent:lifecycle', injected);
        log({ type: 'late-terminal-injected', frame: injected });
      });
    }
  });
  api.on('context', async (_, ctx) => {
    if (ctx.agent.kind !== 'sub' || !existsSync(holdFile)) return;
    const held = JSON.parse(readFileSync(holdFile, 'utf8'));
    if (held.id !== ctx.agent.id) return;
    log({ type: 'held', id: ctx.agent.id, status: registry.get(ctx.agent.id)?.status });
    const deadline = Date.now() + 20000;
    while (existsSync(holdFile)) {
      if (Date.now() > deadline) throw new Error('GB1 child hold timed out');
      await Bun.sleep(25);
    }
  });
  api.on('session_start', (_, ctx) => {
    main = ctx.agent.kind === 'main';
    if (!main) log({ type: 'child-binding', agent: ctx.agent });
    if (!main) return;
    const notify = ctx.ui.notify.bind(ctx.ui);
    ctx.ui.notify = (message, level) => {
      log({ type: 'notification', message, level });
      if (/^http:/.test(message)) endpointUrl = message;
      return notify(message, level);
    };
    log({ type: 'ready', agent: ctx.agent, root: ctx.sessionManager.getSessionFile() });
  });
  api.on('session_switch', (_, ctx) => { if (main) log({ type: 'switch', root: ctx.sessionManager.getSessionFile() }); });
  api.on('session_branch', (_, ctx) => { if (main) log({ type: 'branch', root: ctx.sessionManager.getSessionFile() }); });
  api.registerCommand('gb1', {
    description: 'Disposable GB1 native registry evidence',
    async handler(args, ctx) {
      const separator = args.indexOf(' ');
      const action = separator < 0 ? args.trim() : args.slice(0, separator);
      const options = separator < 0 ? {} : JSON.parse(args.slice(separator + 1));
      if (action === 'cap') {
        // The source root is a runtime-selected disposable probe input.
        const { createStockSource } = await import(join(options.repo, 'omp-orca-observer/stock-source.ts'));
        const current = await (await fetch(new URL('/v1/snapshot', endpointUrl))).json();
        const outcomes = new Map(current.children.map(row => [row.childId, row.outcome]));
        const source = createStockSource(api, ctx.sessionManager.getSessionFile(), {
          outcome(id) { return outcomes.get(id) ?? { state: 'unknown', reason: 'no snapshot evidence' }; },
          forget(id) { outcomes.delete(id); },
        });
        try {
          const collected = source.collect(options.limit);
          log({ type: 'cap', limit: options.limit, inventory: collected.inventory, rows: collected.rows.length, ids: collected.rows.map(row => row.childId), admissions: (options.ids ?? []).map(id => ({ id, sessionFile: source.admittedSessionFile(id) })) });
        } finally { source.dispose(); }
        return;
      }
      if (action === 'throw') {
        originalList = registry.list.bind(registry);
        const ref = Object.defineProperty({ id: 'gb1-throw', kind: 'sub' }, 'sessionFile', { get() { throw new Error('GB1 injected enumeration fault'); } });
        registry.list = () => [...originalList(), ref];
        registry.setStatus('Main', 'idle');
        log({ type: 'injected-throw' });
        return;
      }
      if (action === 'unthrow') {
        registry.list = originalList;
        originalList = null;
        registry.setStatus('Main', 'running');
        log({ type: 'removed-throw' });
        return;
      }
      if (action === 'replay') {
        const recorded = facts.filter(fact => fact.id === options.id).slice(0, 2);
        for (const index of options.indices) {
          const { receivedAt, ...fact } = recorded[index];
          api.events.emit('task:subagent:lifecycle', fact);
        }
        log({ type: 'replayed', id: options.id, indices: options.indices });
        return;
      }
      if (action === 'followup') {
        const tool = registry.get('Main').session.getToolByName('write');
        const result = await tool.execute('gb1-native-followup', { path: 'agent://' + options.id, content: 'HARNESS_AGENT=child/followup second native assignment.' });
        log({ type: 'followup-result', result });
        return;
      }
      if (action === 'hold') {
        writeFileSync(holdFile, JSON.stringify({ id: options.id }));
        if (options.inject) injectedChild = options.id;
        log({ type: 'armed-hold', ...options });
        return;
      }
      if (action === 'release') {
        unlinkSync(holdFile);
        log({ type: 'released-hold' });
        return;
      }
      if (action === 'retire') {
        const ref = registry.get(options.id);
        await ref.session?.dispose();
        registry.unregister(options.id, ref);
        log({ type: 'retired', id: options.id, remaining: Boolean(registry.get(options.id)) });
        return;
      }
      if (action === 'park') {
        const ref = registry.get(options.id);
        const session = ref.session;
        await session?.dispose();
        ref.session = null;
        ref.status = 'parked';
        registry.register(ref);
        log({ type: 'parked', id: options.id, status: registry.get(options.id)?.status, liveSession: Boolean(registry.get(options.id)?.session) });
        return;
      }
      if (action === 'status') {
        const ref = registry.get(options.id) ?? savedRefs.get(options.id);
        if (!registry.get(options.id)) registry.register(ref);
        if (options.status === 'parked' || options.status === 'aborted') ref.session = null;
        const result = registry.setStatus(options.id, options.status);
        log({ type: 'set-status', ...options, result });
        return;
      }
      if (action === 'native-read') {
        const tool = registry.get('Main').session.getToolByName('read');
        const result = await tool.execute('gb1-native-restore-read', { path: 'agent://' + options.id });
        log({ type: 'native-read', id: options.id, result, registered: Boolean(registry.get(options.id)) });
        return;
      }
      if (action === 'fork') {
        const result = await registry.get('Main').session.fork();
        log({ type: 'forked', result, root: ctx.sessionManager.getSessionFile() });
        return;
      }
      if (action !== 'dump') throw new Error('Unknown GB1 action: ' + action);
      const refs = registry.list().map(ref => {
        savedRefs.set(ref.id, ref);
        const parsed = ref.kind !== 'main' && ref.sessionFile && existsSync(ref.sessionFile) ? api.pi.parseSessionContent(readFileSync(ref.sessionFile, 'utf8')) : null;
        return {
          id: ref.id, displayName: ref.displayName, kind: ref.kind, parentId: ref.parentId,
          status: ref.status, sessionFile: ref.sessionFile, createdAt: ref.createdAt, lastActivity: ref.lastActivity,
          history: ref.history, lifecycle: ref.lifecycle,
          session: ref.session ? {
            cwd: ref.session.sessionManager.getCwd(), resolvedModel: ref.session.servingModel?.selector,
            methods: Object.getOwnPropertyNames(Object.getPrototypeOf(ref.session)),
          } : null,
          tombstoned: ref.sessionFile ? existsSync(ref.sessionFile + '.tombstone') : false,
          transcript: parsed ? {
            header: parsed.entries.find(entry => entry.type === 'session'),
            metadata: parsed.entries.filter(entry => entry.type !== 'message' && entry.type !== 'custom'),
            messages: parsed.entries.filter(entry => entry.type === 'message').map(entry => ({
              role: entry.message.role, content: entry.message.content,
            })),
            malformedRecords: parsed.malformedRecords, invalidHeader: parsed.invalidHeader,
          } : null,
        };
      });
      const root = ctx.sessionManager.getSessionFile();
      const transcriptFiles = [];
      const advisorTranscriptFiles = [];
      const directories = [root.replace(/\.jsonl$/, '')];
      while (directories.length) {
        const directory = directories.pop();
        if (!existsSync(directory)) continue;
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
          const file = join(directory, entry.name);
          if (entry.isDirectory()) directories.push(file);
          else if (entry.isFile() && entry.name.endsWith('.jsonl') && !entry.name.includes('.bak') && !entry.name.startsWith('__advisor.')) transcriptFiles.push(file);
          else if (entry.isFile() && entry.name.startsWith('__advisor.') && entry.name.endsWith('.jsonl')) advisorTranscriptFiles.push(file);
        }
      }
      log({
        type: 'dump', root, refs, facts, transcriptFiles, advisorTranscriptFiles,
        rootEntries: ctx.sessionManager.getEntries().map(entry => ({ id: entry.id, type: entry.type, role: entry.message?.role })),
        registryMethods: Object.getOwnPropertyNames(Object.getPrototypeOf(registry)),
        piExports: Object.keys(api.pi),
        contextMethods: Object.fromEntries(['newSession', 'switchSession', 'fork', 'navigateTree', 'waitForIdle'].map(key => [key, typeof ctx[key]])),
      });
    },
  });
}

```

### Source `/tmp/gb1-rerun-annex-builder.ts`

```ts
import { createHash } from 'node:crypto';
import { readFile, readdir, writeFile } from 'node:fs/promises';
const normalize = (text: string) => text.replaceAll(process.cwd(), '$PWD').replaceAll(process.env.HOME ?? '/nonexistent-home', '$HOME').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
const historical = ['gb1-driver.ts', 'gb1-extension.ts', 'gb1-restart.ts', 'gb1-bootstrap.ts', 'gb1-link.ts', 'gb1-basic-extension.ts', 'gb1-annex.ts', 'gb1-probe/index.ts', 'gb1-probe/package.json'];
const rerun = ['gb1-rerun-extract.ts', 'gb1-rerun-reader.ts', 'gb1-rerun-reader-launch.ts', 'gb1-rerun-advisor.ts', 'gb1-rerun-extension.ts', 'gb1-rerun-annex-builder.ts'];
for (const [phase, names] of [['historical', historical], ['rerun', rerun]] as const) {
  let text = '\n## ' + phase + ' source completion annex — preserved 2026-09-30\n\n';
  for (const name of names) {
    text += '### Source `/tmp/' + name + '`\n\n```' + (name.endsWith('.json') ? 'json' : 'ts') + '\n' + normalize(await readFile('/tmp/' + name, 'utf8')) + '\n```\n\n';
  }
  const path = '/tmp/gb1-rerun-' + phase + '-sources.md';
  await writeFile(path, text);
  console.log('ANNEX_CREATED', JSON.stringify({ path, lines: text.split('\n').length, bytes: Buffer.byteLength(text) }));
}
let outputs = '\n## Historical transition/restart outputs and re-run advisor output\n\nThese are preserved outputs, not re-executed criteria. Earlier failures stay failures. Sources above are the final retained transition revisions; the earlier basic sources remain intact. Exact invocations appear in each heading. Output is normalized only for source/home paths and loopback ports.\n\n';
for (const [file, command] of [
  ['follow-up', 'bun /tmp/gb1-driver.ts follow-up'], ['follow-up-late', 'bun /tmp/gb1-driver.ts follow-up late'],
  ['same-id-replacement', 'bun /tmp/gb1-driver.ts same-id-replacement'], ['parked', 'bun /tmp/gb1-driver.ts parked'],
  ['advisor-present', 'bun /tmp/gb1-driver.ts advisor-present'], ['new-session', 'bun /tmp/gb1-driver.ts new-session'],
  ['fork', 'bun /tmp/gb1-driver.ts fork'], ['resume-restart', 'bun /tmp/gb1-restart.ts resume'],
  ['cold-restart-restart', 'bun /tmp/gb1-restart.ts cold-restart'], ['partial-restore-restart', 'bun /tmp/gb1-restart.ts partial-restore'],
  ['rerun-advisor', 'bun /tmp/gb1-rerun-advisor.ts advisor-present'],
]) {
  outputs += '### Output: `' + command + '`\n\n```text\n' + normalize(await readFile('/tmp/gb1-' + file + '.out', 'utf8')) + '```\n\n';
}
outputs += '### Large capture receipts (not embedded)\n\nSHA-256 is of each original captured byte sequence; line count is newline-delimited logical lines, including an unterminated final line. Captures are intentionally not embedded and are deleted after receipt.\n\n| Capture | Lines | SHA-256 |\n|---|---:|---|\n';
for (const name of (await readdir('/tmp')).filter(name => name.startsWith('gb1-') && name.endsWith('-capture.json')).sort()) {
  const bytes = await readFile('/tmp/' + name);
  const text = bytes.toString('utf8');
  const lines = text.split('\n').length - Number(text.endsWith('\n'));
  outputs += '| `/tmp/' + name + '` | ' + lines + ' | `' + createHash('sha256').update(bytes).digest('hex') + '` |\n';
}
await writeFile('/tmp/gb1-rerun-outputs-annex.md', outputs);
console.log('ANNEX_CREATED', JSON.stringify({ path: '/tmp/gb1-rerun-outputs-annex.md', lines: outputs.split('\n').length, bytes: Buffer.byteLength(outputs) }));

```


## Historical transition/restart outputs and re-run advisor output

These are preserved outputs, not re-executed criteria. Earlier failures stay failures. Sources above retain the transition drivers, but the exact comparator revision that produced the later records was not preserved; the earlier basic comparator cannot reproduce their unknown-inventory PASS records. Fresh comparisons with a fully retained final comparator appear in the closure annex below. Output is normalized only for source/home paths and loopback ports.

### Output: `bun /tmp/gb1-driver.ts follow-up`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","follow-up","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-UKxzft-workspace--/2026-09-30T21-35-40-884Z_01a0f43e-a354-72f7-8104-29fb406a5a5d.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":383}
ZERO_SNAPSHOT {"schema":1,"epoch":"50743f08-da39-4937-9187-cfb2617d0922","generation":1,"observedAt":"2026-09-30T21:35:41.275Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-UKxzft-workspace--/2026-09-30T21-35-40-884Z_01a0f43e-a354-72f7-8104-29fb406a5a5d.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1834}
RPC_COMMAND /gb1 dump
COMPARE follow-up {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"2433dd1c5ddf4fe4aab498fff12279e214be48221dc6cc0fa6f0257421df30b2"},"rowListing":{"lines":1,"sha256":"ced2b1081c1a1912d06a916db9181de9fa0815925021166d76ba0f074c2b44ce"},"differences":[]}
NATIVE_IDENTITIES [{"id":"follow-up-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
RPC_COMMAND /gb1 hold {"id":"follow-up-child","inject":false}
RPC_COMMAND /gb1 followup {"id":"follow-up-child"}
FOLLOWUP_NATIVE {"type":"followup-result","result":{"content":[{"type":"text","text":"Delivered to follow-up-child."}],"details":{"message":{"op":"send","from":"Main","to":"follow-up-child","receipts":[{"to":"follow-up-child","outcome":"woken"}]}},"isError":false}}
RPC_COMMAND /gb1 release
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1834}
RPC_COMMAND /gb1 dump
FOLLOWUP_FINISHED_RESULT {"inject":false,"pass":true,"first":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-09-30T21:35:42.623Z"},"second":{"state":"completed","generation":2,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-09-30T21:35:43.947Z"}}
FOLLOWUP_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"7f7a0f7dc7754686fbff15090d86c9daf500a825ae2c9537a87aaa8edfb36b00"},"rowListing":{"lines":1,"sha256":"d1d8f09076af7eb5a0ca03fef2936027a5585106650662bd7fb431b9acf3624c"},"differences":[]}
PROCESS_EXIT 143
PROFILE_REMOVED follow-up
```

### Output: `bun /tmp/gb1-driver.ts follow-up late`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","follow-up","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-TTzYTA-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-7482-802c-903aad430544.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":383}
ZERO_SNAPSHOT {"schema":1,"epoch":"18334c7f-d089-4307-a940-fd7fc57684d7","generation":1,"observedAt":"2026-09-30T21:39:29.595Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-TTzYTA-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-7482-802c-903aad430544.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1834}
RPC_COMMAND /gb1 dump
COMPARE follow-up {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"e7730acd04a6545e489f670f5c91ef1e58f5b68d1c0b626626ed045951b78733"},"rowListing":{"lines":1,"sha256":"04e76ce96d3bf02b0fa922fc60fd1d773b22ba53fcd17dcf72553db5ef75f922"},"differences":[]}
NATIVE_IDENTITIES [{"id":"follow-up-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
RPC_COMMAND /gb1 hold {"id":"follow-up-child","inject":true}
RPC_COMMAND /gb1 followup {"id":"follow-up-child"}
FOLLOWUP_NATIVE {"type":"followup-result","result":{"content":[{"type":"text","text":"Delivered to follow-up-child."}],"details":{"message":{"op":"send","from":"Main","to":"follow-up-child","receipts":[{"to":"follow-up-child","outcome":"woken"}]}},"isError":false}}
FOLLOWUP_HELD {"type":"held","id":"follow-up-child","status":"running"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1718}
FOLLOWUP_RUNNING_RESULT {"inject":true,"pass":true,"outcome":{"state":"unknown","reason":"conflicting evidence"},"registryStatus":"running"}
RPC_COMMAND /gb1 release
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1752}
RPC_COMMAND /gb1 dump
FOLLOWUP_FINISHED_RESULT {"inject":true,"pass":true,"first":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-09-30T21:39:30.827Z"},"second":{"state":"unknown","reason":"ambiguous terminal evidence"}}
INJECTED_FRAME {"type":"late-terminal-injected","frame":{"id":"follow-up-child","agent":"task","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","detached":true,"agentSource":"bundled","status":"failed","sessionFile":"<tmp>/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-TTzYTA-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-7482-802c-903aad430544/follow-up-child.jsonl","index":0}}
PROCESS_EXIT 143
PROFILE_REMOVED follow-up
```

### Output: `bun /tmp/gb1-driver.ts same-id-replacement`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","same-id-replacement","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-uzixqY-workspace--/2026-09-30T21-35-40-863Z_01a0f43e-a33f-76e7-ad41-0225e726a6b5.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":393}
ZERO_SNAPSHOT {"schema":1,"epoch":"f6f5a52a-4ed7-4e0d-9b00-eb5b9c75f663","generation":1,"observedAt":"2026-09-30T21:35:41.236Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-uzixqY-workspace--/2026-09-30T21-35-40-863Z_01a0f43e-a33f-76e7-ad41-0225e726a6b5.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1864}
RPC_COMMAND /gb1 dump
COMPARE same-id-replacement {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"66f58c015cf04e380139ffbfa380292afcf95047b3b3b76393c149cfe8e0c44e"},"rowListing":{"lines":1,"sha256":"755d9982043888285879595cf3a74bd96eedda7347aab168d799096af0419b5e"},"differences":[]}
NATIVE_IDENTITIES [{"id":"replacement","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
RPC_COMMAND /gb1 retire {"id":"replacement"}
RETIRE_RESULT {"type":"retired","id":"replacement","remaining":false}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1940}
RPC_COMMAND /gb1 dump
REPLACEMENT_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 1 of 2; missing: replacement.jsonl"},"nativeListing":{"lines":1,"sha256":"a8e53765f4f54619beb651b6c3099fb4bcc243de52e751cf8bbe3da018d36ec9"},"rowListing":{"lines":1,"sha256":"5fb1165eea41d0f8dad6d9c5f2191bb6a4111ea8f458b40d9921f0534d3b7afe"},"differences":[]}
REPLACEMENT_RESULT {"before":{"id":"replacement","createdAt":1790804142408,"sessionFile":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-uzixqY-workspace--/2026-09-30T21-35-40-863Z_01a0f43e-a33f-76e7-ad41-0225e726a6b5/replacement.jsonl"},"after":[{"id":"replacement-2","createdAt":1790804143871,"sessionFile":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-uzixqY-workspace--/2026-09-30T21-35-40-863Z_01a0f43e-a33f-76e7-ad41-0225e726a6b5/replacement-2.jsonl"}],"outcomes":[{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-same-id-replacement-main-2-call-0"},"at":"2026-09-30T21:35:43.914Z"}]}
PROCESS_EXIT 143
PROFILE_REMOVED same-id-replacement
```

### Output: `bun /tmp/gb1-driver.ts parked`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","parked","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-8fQ9eB-workspace--/2026-09-30T21-46-58-684Z_01a0f448-fafc-70b8-9921-71cd657da658.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":380}
ZERO_SNAPSHOT {"schema":1,"epoch":"0d130122-cd97-4e89-8783-2db69beade94","generation":1,"observedAt":"2026-09-30T21:46:59.014Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-8fQ9eB-workspace--/2026-09-30T21-46-58-684Z_01a0f448-fafc-70b8-9921-71cd657da658.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1799}
RPC_COMMAND /gb1 dump
COMPARE parked {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"302dc5be22b920e24c544f48e033d91844b58ad5d1498534182aed380718df3f"},"rowListing":{"lines":1,"sha256":"28ac288d0403b098601977c62578ef69eeec52a8769b4d03d46eba405c52d10e"},"differences":[]}
NATIVE_IDENTITIES [{"id":"parked-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
RPC_COMMAND /gb1 park {"id":"parked-child"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1797}
RPC_COMMAND /gb1 dump
PARKED_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"4c42f8e13dbd4c1cf74fa53ba948fde2441c7ef300c15b7f92f82c8cba950bb0"},"rowListing":{"lines":1,"sha256":"a82660df2faba9f51e578a585f4c9f1d02a3e3ae349ac4ddcd2e3b4455b8f01d"},"differences":[]}
PARKED_RESULT {"pass":true,"row":{"childId":"parked-child","parentId":"Main","rootSession":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-8fQ9eB-workspace--/2026-09-30T21-46-58-684Z_01a0f448-fafc-70b8-9921-71cd657da658.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":false,"reason":"resolved model not recorded"},"registryStatus":"parked","tombstoned":false,"outcome":{"state":"failed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-parked-main-0-call-0"},"at":"2026-09-30T21:47:00.192Z"},"milestones":{"responseAt":{"known":false,"reason":"not recorded"},"acceptedAt":{"known":false,"reason":"not recorded"},"terminalAt":{"known":true,"value":"2026-09-30T21:47:00.190Z"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-09-30T21:47:00.190Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":false,"reason":"cwd not recorded"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-09-30T21:47:01.461Z","grantScope":"none"}}
PERSISTED_FACT_RESULT {"pass":false,"childId":"parked-child","snapshotCwd":{"known":false,"reason":"cwd not recorded"},"nativeSessionHeaderCwd":"<tmp>/workspace","snapshotResolvedModel":{"known":false,"reason":"resolved model not recorded"},"nativeModelChange":{"type":"model_change","id":"e3a073a8","parentId":null,"timestamp":"2026-09-30T21:47:00.135Z","model":"stub/scripted","resolvedModelIsFallback":false}}
PROCESS_EXIT 143
PROFILE_REMOVED parked
```

### Output: `bun /tmp/gb1-driver.ts advisor-present`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","--advisor"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-IywFhC-workspace--/2026-09-30T21-35-47-482Z_01a0f43e-bd1a-729a-9ed3-597d67979d08.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":389}
ZERO_SNAPSHOT {"schema":1,"epoch":"026a5c89-1467-4210-9554-dd86eb7faa3f","generation":1,"observedAt":"2026-09-30T21:35:47.833Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-IywFhC-workspace--/2026-09-30T21-35-47-482Z_01a0f43e-bd1a-729a-9ed3-597d67979d08.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1853}
RPC_COMMAND /gb1 dump
COMPARE advisor-present {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"74d816b9eb7574d435ad956242079eea203bf2d8126e288c92eb2edf4bfda2ef"},"rowListing":{"lines":1,"sha256":"8af8a71d0fe024193706e91dec87d617e1f4843af1b88ebec33770a502128370"},"differences":[]}
NATIVE_IDENTITIES [{"id":"advisor-child","parentId":"Main","kind":"sub","displayName":"advisor","status":"idle","tombstoned":false}]
ADVISOR_RESULT {"pass":false,"advisorIds":[],"subIds":["advisor-child"]}
PROCESS_EXIT 143
PROFILE_REMOVED advisor-present
```

### Output: `bun /tmp/gb1-driver.ts new-session`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","new-session","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/new-session/agent/sessions/--tmp-omp-orca-harness-L8ak3o-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-716a-bdfa-95da02d03792.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":385}
ZERO_SNAPSHOT {"schema":1,"epoch":"2a6a4161-9fbd-4107-9561-52071f8fe494","generation":1,"observedAt":"2026-09-30T21:39:29.595Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/new-session/agent/sessions/--tmp-omp-orca-harness-L8ak3o-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-716a-bdfa-95da02d03792.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1839}
RPC_COMMAND /gb1 dump
COMPARE new-session {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"8b84e5300887d179622c07a8b933b99f36db576f5ed4f142ab398605dd59a2aa"},"rowListing":{"lines":1,"sha256":"551e808d43411b801c85418be800cf5c7bb272e1646f8f805f5de8359dfbcf92"},"differences":[]}
NATIVE_IDENTITIES [{"id":"before-new","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
SESSION_TRANSITION {"id":"gb1-5","type":"response","command":"new_session","success":true,"data":{"cancelled":false}}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1838}
RPC_COMMAND /gb1 dump
SWITCH_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"382c664a2adfe3afb52bc3143b523d7490a899fef15e4788a78d757a8b9826a8"},"rowListing":{"lines":1,"sha256":"e52a707e8c563d23006727ddef4cdb3ef22b8ea91cfa93c75ec472aa17639f6c"},"differences":[]}
SWITCH_RESULT {"pass":true,"oldIds":["before-new"],"newIds":["after-new"],"oldRoot":"<tmp>/home/.omp/profiles/new-session/agent/sessions/--tmp-omp-orca-harness-L8ak3o-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-716a-bdfa-95da02d03792.jsonl","newRoot":"<tmp>/home/.omp/profiles/new-session/agent/sessions/--tmp-omp-orca-harness-L8ak3o-workspace--/2026-09-30T21-39-32-271Z_01a0f442-2b2f-7012-a748-934493733831.jsonl"}
RPC_COMMAND /gb1 status {"id":"before-new","status":"idle"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1838}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"idle","nativeStatus":"idle","pass":true,"admittedIds":["after-new"]}
RPC_COMMAND /gb1 status {"id":"before-new","status":"running"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1838}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"running","nativeStatus":"running","pass":true,"admittedIds":["after-new"]}
RPC_COMMAND /gb1 status {"id":"before-new","status":"parked"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1838}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"parked","nativeStatus":"parked","pass":true,"admittedIds":["after-new"]}
RPC_COMMAND /gb1 status {"id":"before-new","status":"aborted"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1838}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"aborted","nativeStatus":"aborted","pass":true,"admittedIds":["after-new"]}
PROCESS_EXIT 143
PROFILE_REMOVED new-session
```

### Output: `bun /tmp/gb1-driver.ts fork`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","fork","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-kG6Vdb-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-758f-9947-338a7c374f43.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":378}
ZERO_SNAPSHOT {"schema":1,"epoch":"ffcdf449-da26-4624-b6d8-1192c8c89aa1","generation":1,"observedAt":"2026-09-30T21:39:29.603Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-kG6Vdb-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-758f-9947-338a7c374f43.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1822}
RPC_COMMAND /gb1 dump
COMPARE fork {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"0f253ead05405189849670e559dbe260b8d6b0c189d837463e8493fecaff15f5"},"rowListing":{"lines":1,"sha256":"e3befaa37b551464a45bb2cfec48d1eb4e00f11236cedb5494df6e7e49ee1b25"},"differences":[]}
NATIVE_IDENTITIES [{"id":"original-child","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
RPC_COMMAND /gb1 fork
SESSION_TRANSITION {"id":"gb1-5","type":"response","command":"prompt","success":true}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
SWITCH_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 1 of 2; missing: original-child.jsonl"},"nativeListing":{"lines":1,"sha256":"01845ecf7086ef1da2bd93be3d58075eaa4a6f2f769083e1ac7ad5190e0fa833"},"rowListing":{"lines":1,"sha256":"d4c56d3d63a13811ad19cbedd70ab6ac5fe9e1578a365613464e27fe1d6ba0a1"},"differences":[]}
SWITCH_RESULT {"pass":true,"oldIds":["original-child"],"newIds":["fork-child"],"oldRoot":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-kG6Vdb-workspace--/2026-09-30T21-39-29-224Z_01a0f442-1f48-758f-9947-338a7c374f43.jsonl","newRoot":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-kG6Vdb-workspace--/2026-09-30T21-39-32-148Z_01a0f442-2ab4-7226-8953-f29604ba6ad0.jsonl"}
RPC_COMMAND /gb1 status {"id":"original-child","status":"idle"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"idle","nativeStatus":"idle","pass":true,"admittedIds":["fork-child"]}
RPC_COMMAND /gb1 status {"id":"original-child","status":"running"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"running","nativeStatus":"running","pass":true,"admittedIds":["fork-child"]}
RPC_COMMAND /gb1 status {"id":"original-child","status":"parked"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"parked","nativeStatus":"parked","pass":true,"admittedIds":["fork-child"]}
RPC_COMMAND /gb1 status {"id":"original-child","status":"aborted"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"aborted","nativeStatus":"aborted","pass":true,"admittedIds":["fork-child"]}
PROCESS_EXIT 143
PROFILE_REMOVED fork
```

### Output: `bun /tmp/gb1-restart.ts resume`

```text
COMMAND ["omp","--profile","resume","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-Tg3XkU-workspace--/2026-09-30T21-35-40-562Z_01a0f43e-a212-7592-928b-071e726b1326.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1822}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"9ff2449dbe7327c4ed5d474ffe8524392f7b0e5490af552eaa24e4b914ab2732"},"rowListing":{"lines":1,"sha256":"ef5ca987344cd952f37b99b2d3adcfb8753dc0ac1831d182ef15abb1afd286d3"},"differences":[]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","resume","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts","--resume","<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-Tg3XkU-workspace--/2026-09-30T21-35-40-562Z_01a0f43e-a212-7592-928b-071e726b1326.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-Tg3XkU-workspace--/2026-09-30T21-35-40-562Z_01a0f43e-a212-7592-928b-071e726b1326.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":455}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: resume-child.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: resume-child.jsonl"},"nativeTranscriptCount":1,"nativeRefCount":0,"missingCount":1,"outcomes":[]}
RPC_COMMAND /gb1 native-read {"id":"resume-child"}
NATIVE_RESTORE_READ {"type":"native-read","id":"resume-child","result":{"content":[{"type":"text","text":"\"resumable answer\""}],"details":{"totalLines":1,"displayContent":{"text":"\"resumable answer\"","startLine":1,"lineNumbers":[1]},"fileSize":18,"meta":{"source":{"type":"internal","value":"agent://resume-child"}},"resolvedPath":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-Tg3XkU-workspace--/2026-09-30T21-35-40-562Z_01a0f43e-a212-7592-928b-071e726b1326/resume-child.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1676}
RPC_COMMAND /gb1 dump
PARTIAL_RESTORE_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"5dff668c369f7cb6a2f892e409c4a3263d4ea3f3f60305161b8d3f8fdad0b620"},"rowListing":{"lines":1,"sha256":"28d3b712504d4e6158a8475730fa1a180d0a9433e9d6258a0b25d903bd065eb1"},"differences":[]}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1676}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"5dff668c369f7cb6a2f892e409c4a3263d4ea3f3f60305161b8d3f8fdad0b620"},"rowListing":{"lines":1,"sha256":"28d3b712504d4e6158a8475730fa1a180d0a9433e9d6258a0b25d903bd065eb1"},"differences":[]}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":1}
PROCESS_EXIT 143
PROFILE_REMOVED resume
```

### Output: `bun /tmp/gb1-restart.ts cold-restart`

```text
COMMAND ["omp","--profile","cold-restart","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-82EWky-workspace--/2026-09-30T21-39-28-995Z_01a0f442-1e63-71c0-9046-d44683d04a6c.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":4741}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":3,"nativeChildren":3,"rows":3,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":3,"sha256":"0a6a96bdddf2ceeeff0b7aadfb58a91a3adde563eb58c6358308c1185d0edbda"},"rowListing":{"lines":3,"sha256":"a4bd33183e32e84c983001ef926dd6e81fac1075152931ce589be65608340e93"},"differences":[]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","cold-restart","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts","--resume","<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-82EWky-workspace--/2026-09-30T21-39-28-995Z_01a0f442-1e63-71c0-9046-d44683d04a6c.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-82EWky-workspace--/2026-09-30T21-39-28-995Z_01a0f442-1e63-71c0-9046-d44683d04a6c.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":492}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"},"nativeTranscriptCount":3,"nativeRefCount":0,"missingCount":3,"outcomes":[]}
RPC_COMMAND /gb1 native-read {"id":"restart-1"}
NATIVE_RESTORE_READ {"type":"native-read","id":"restart-1","result":{"content":[{"type":"text","text":"\"persisted child\""}],"details":{"totalLines":1,"displayContent":{"text":"\"persisted child\"","startLine":1,"lineNumbers":[1]},"fileSize":17,"meta":{"source":{"type":"internal","value":"agent://restart-1"}},"resolvedPath":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-82EWky-workspace--/2026-09-30T21-39-28-995Z_01a0f442-1e63-71c0-9046-d44683d04a6c/restart-1.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":4276}
RPC_COMMAND /gb1 dump
PARTIAL_RESTORE_COMPARE {"pass":false,"expectedCount":1,"nativeChildren":3,"rows":3,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":3,"sha256":"568a3822cc0a896a2b695fd3423a06bade5bb0c973fa2adc2ea107c57e10c19c"},"rowListing":{"lines":3,"sha256":"5e0d29da028bb34c807aea59b69f65b74c64cff0e0d8f1a926677e8c57137b9f"},"differences":[{"field":"native.count","actual":3,"expected":1}]}
RPC_COMMAND /gb1 native-read {"id":"restart-2"}
RPC_COMMAND /gb1 native-read {"id":"restart-3"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":4276}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":3,"nativeChildren":3,"rows":3,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":3,"sha256":"568a3822cc0a896a2b695fd3423a06bade5bb0c973fa2adc2ea107c57e10c19c"},"rowListing":{"lines":3,"sha256":"5e0d29da028bb34c807aea59b69f65b74c64cff0e0d8f1a926677e8c57137b9f"},"differences":[]}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":3}
PROCESS_EXIT 143
PROFILE_REMOVED cold-restart
```

### Output: `bun /tmp/gb1-restart.ts partial-restore`

```text
COMMAND ["omp","--profile","partial-restore","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-LVYnxz-workspace--/2026-09-30T21-35-40-556Z_01a0f43e-a20c-72d6-b313-7915e5247d02.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":197381}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":135,"nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"dade5e67b1fdc5e047742f81b615645c8dc4d49e1f98ddc35fcff0eb2165f0fd"},"rowListing":{"lines":135,"sha256":"f51e5b7c733dcfdd77c970225834d0a9fb6a5861e203024a5c7172a278dbc720"},"differences":[]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","partial-restore","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-extension.ts","--resume","<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-LVYnxz-workspace--/2026-09-30T21-35-40-556Z_01a0f43e-a20c-72d6-b313-7915e5247d02.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-LVYnxz-workspace--/2026-09-30T21-35-40-556Z_01a0f43e-a20c-72d6-b313-7915e5247d02.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":2903}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"},"nativeTranscriptCount":135,"nativeRefCount":0,"missingCount":135,"outcomes":[]}
RPC_COMMAND /gb1 native-read {"id":"restore-1"}
NATIVE_RESTORE_READ {"type":"native-read","id":"restore-1","result":{"content":[{"type":"text","text":"\"restored child\""}],"details":{"totalLines":1,"displayContent":{"text":"\"restored child\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://restore-1"}},"resolvedPath":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-LVYnxz-workspace--/2026-09-30T21-35-40-556Z_01a0f43e-a20c-72d6-b313-7915e5247d02/restore-1.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":176212}
RPC_COMMAND /gb1 dump
PARTIAL_RESTORE_COMPARE {"pass":false,"expectedCount":1,"nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"83d0e834aabfd9d19456479ffa281e502805985f48fb694e3bc30be35ceac981"},"rowListing":{"lines":135,"sha256":"49654de5e3daff981ffc470ebc08761ac7ae575d0781ab1f28dc612f16190e4a"},"differences":[{"field":"native.count","actual":135,"expected":1}]}
RPC_COMMAND /gb1 native-read {"id":"restore-2"}
RPC_COMMAND /gb1 native-read {"id":"restore-3"}
RPC_COMMAND /gb1 native-read {"id":"restore-4"}
RPC_COMMAND /gb1 native-read {"id":"restore-5"}
RPC_COMMAND /gb1 native-read {"id":"restore-6"}
RPC_COMMAND /gb1 native-read {"id":"restore-7"}
RPC_COMMAND /gb1 native-read {"id":"restore-8"}
RPC_COMMAND /gb1 native-read {"id":"restore-9"}
RPC_COMMAND /gb1 native-read {"id":"restore-10"}
RPC_COMMAND /gb1 native-read {"id":"restore-11"}
RPC_COMMAND /gb1 native-read {"id":"restore-12"}
RPC_COMMAND /gb1 native-read {"id":"restore-13"}
RPC_COMMAND /gb1 native-read {"id":"restore-14"}
RPC_COMMAND /gb1 native-read {"id":"restore-15"}
RPC_COMMAND /gb1 native-read {"id":"restore-16"}
RPC_COMMAND /gb1 native-read {"id":"restore-18"}
RPC_COMMAND /gb1 native-read {"id":"restore-17"}
RPC_COMMAND /gb1 native-read {"id":"restore-19"}
RPC_COMMAND /gb1 native-read {"id":"restore-20"}
RPC_COMMAND /gb1 native-read {"id":"restore-21"}
RPC_COMMAND /gb1 native-read {"id":"restore-22"}
RPC_COMMAND /gb1 native-read {"id":"restore-23"}
RPC_COMMAND /gb1 native-read {"id":"restore-24"}
RPC_COMMAND /gb1 native-read {"id":"restore-25"}
RPC_COMMAND /gb1 native-read {"id":"restore-26"}
RPC_COMMAND /gb1 native-read {"id":"restore-27"}
RPC_COMMAND /gb1 native-read {"id":"restore-28"}
RPC_COMMAND /gb1 native-read {"id":"restore-29"}
RPC_COMMAND /gb1 native-read {"id":"restore-30"}
RPC_COMMAND /gb1 native-read {"id":"restore-31"}
RPC_COMMAND /gb1 native-read {"id":"restore-32"}
RPC_COMMAND /gb1 native-read {"id":"restore-33"}
RPC_COMMAND /gb1 native-read {"id":"restore-34"}
RPC_COMMAND /gb1 native-read {"id":"restore-36"}
RPC_COMMAND /gb1 native-read {"id":"restore-35"}
RPC_COMMAND /gb1 native-read {"id":"restore-37"}
RPC_COMMAND /gb1 native-read {"id":"restore-38"}
RPC_COMMAND /gb1 native-read {"id":"restore-39"}
RPC_COMMAND /gb1 native-read {"id":"restore-40"}
RPC_COMMAND /gb1 native-read {"id":"restore-41"}
RPC_COMMAND /gb1 native-read {"id":"restore-42"}
RPC_COMMAND /gb1 native-read {"id":"restore-43"}
RPC_COMMAND /gb1 native-read {"id":"restore-46"}
RPC_COMMAND /gb1 native-read {"id":"restore-45"}
RPC_COMMAND /gb1 native-read {"id":"restore-44"}
RPC_COMMAND /gb1 native-read {"id":"restore-47"}
RPC_COMMAND /gb1 native-read {"id":"restore-48"}
RPC_COMMAND /gb1 native-read {"id":"restore-50"}
RPC_COMMAND /gb1 native-read {"id":"restore-49"}
RPC_COMMAND /gb1 native-read {"id":"restore-52"}
RPC_COMMAND /gb1 native-read {"id":"restore-51"}
RPC_COMMAND /gb1 native-read {"id":"restore-53"}
RPC_COMMAND /gb1 native-read {"id":"restore-54"}
RPC_COMMAND /gb1 native-read {"id":"restore-55"}
RPC_COMMAND /gb1 native-read {"id":"restore-56"}
RPC_COMMAND /gb1 native-read {"id":"restore-57"}
RPC_COMMAND /gb1 native-read {"id":"restore-58"}
RPC_COMMAND /gb1 native-read {"id":"restore-59"}
RPC_COMMAND /gb1 native-read {"id":"restore-60"}
RPC_COMMAND /gb1 native-read {"id":"restore-61"}
RPC_COMMAND /gb1 native-read {"id":"restore-62"}
RPC_COMMAND /gb1 native-read {"id":"restore-63"}
RPC_COMMAND /gb1 native-read {"id":"restore-64"}
RPC_COMMAND /gb1 native-read {"id":"restore-65"}
RPC_COMMAND /gb1 native-read {"id":"restore-66"}
RPC_COMMAND /gb1 native-read {"id":"restore-67"}
RPC_COMMAND /gb1 native-read {"id":"restore-68"}
RPC_COMMAND /gb1 native-read {"id":"restore-70"}
RPC_COMMAND /gb1 native-read {"id":"restore-69"}
RPC_COMMAND /gb1 native-read {"id":"restore-71"}
RPC_COMMAND /gb1 native-read {"id":"restore-72"}
RPC_COMMAND /gb1 native-read {"id":"restore-73"}
RPC_COMMAND /gb1 native-read {"id":"restore-74"}
RPC_COMMAND /gb1 native-read {"id":"restore-75"}
RPC_COMMAND /gb1 native-read {"id":"restore-76"}
RPC_COMMAND /gb1 native-read {"id":"restore-77"}
RPC_COMMAND /gb1 native-read {"id":"restore-78"}
RPC_COMMAND /gb1 native-read {"id":"restore-80"}
RPC_COMMAND /gb1 native-read {"id":"restore-79"}
RPC_COMMAND /gb1 native-read {"id":"restore-82"}
RPC_COMMAND /gb1 native-read {"id":"restore-81"}
RPC_COMMAND /gb1 native-read {"id":"restore-84"}
RPC_COMMAND /gb1 native-read {"id":"restore-83"}
RPC_COMMAND /gb1 native-read {"id":"restore-86"}
RPC_COMMAND /gb1 native-read {"id":"restore-85"}
RPC_COMMAND /gb1 native-read {"id":"restore-87"}
RPC_COMMAND /gb1 native-read {"id":"restore-88"}
RPC_COMMAND /gb1 native-read {"id":"restore-89"}
RPC_COMMAND /gb1 native-read {"id":"restore-90"}
RPC_COMMAND /gb1 native-read {"id":"restore-91"}
RPC_COMMAND /gb1 native-read {"id":"restore-92"}
RPC_COMMAND /gb1 native-read {"id":"restore-93"}
RPC_COMMAND /gb1 native-read {"id":"restore-94"}
RPC_COMMAND /gb1 native-read {"id":"restore-96"}
RPC_COMMAND /gb1 native-read {"id":"restore-95"}
RPC_COMMAND /gb1 native-read {"id":"restore-97"}
RPC_COMMAND /gb1 native-read {"id":"restore-98"}
RPC_COMMAND /gb1 native-read {"id":"restore-99"}
RPC_COMMAND /gb1 native-read {"id":"restore-100"}
RPC_COMMAND /gb1 native-read {"id":"restore-101"}
RPC_COMMAND /gb1 native-read {"id":"restore-102"}
RPC_COMMAND /gb1 native-read {"id":"restore-104"}
RPC_COMMAND /gb1 native-read {"id":"restore-105"}
RPC_COMMAND /gb1 native-read {"id":"restore-103"}
RPC_COMMAND /gb1 native-read {"id":"restore-106"}
RPC_COMMAND /gb1 native-read {"id":"restore-107"}
RPC_COMMAND /gb1 native-read {"id":"restore-108"}
RPC_COMMAND /gb1 native-read {"id":"restore-109"}
RPC_COMMAND /gb1 native-read {"id":"restore-110"}
RPC_COMMAND /gb1 native-read {"id":"restore-111"}
RPC_COMMAND /gb1 native-read {"id":"restore-112"}
RPC_COMMAND /gb1 native-read {"id":"restore-113"}
RPC_COMMAND /gb1 native-read {"id":"restore-114"}
RPC_COMMAND /gb1 native-read {"id":"restore-115"}
RPC_COMMAND /gb1 native-read {"id":"restore-116"}
RPC_COMMAND /gb1 native-read {"id":"restore-117"}
RPC_COMMAND /gb1 native-read {"id":"restore-118"}
RPC_COMMAND /gb1 native-read {"id":"restore-119"}
RPC_COMMAND /gb1 native-read {"id":"restore-121"}
RPC_COMMAND /gb1 native-read {"id":"restore-120"}
RPC_COMMAND /gb1 native-read {"id":"restore-123"}
RPC_COMMAND /gb1 native-read {"id":"restore-122"}
RPC_COMMAND /gb1 native-read {"id":"restore-125"}
RPC_COMMAND /gb1 native-read {"id":"restore-124"}
RPC_COMMAND /gb1 native-read {"id":"restore-127"}
RPC_COMMAND /gb1 native-read {"id":"restore-126"}
RPC_COMMAND /gb1 native-read {"id":"restore-128"}
RPC_COMMAND /gb1 native-read {"id":"restore-130"}
RPC_COMMAND /gb1 native-read {"id":"restore-129"}
RPC_COMMAND /gb1 native-read {"id":"restore-131"}
RPC_COMMAND /gb1 native-read {"id":"restore-132"}
RPC_COMMAND /gb1 native-read {"id":"restore-134"}
RPC_COMMAND /gb1 native-read {"id":"restore-133"}
RPC_COMMAND /gb1 native-read {"id":"restore-135"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":176212}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":135,"nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"83d0e834aabfd9d19456479ffa281e502805985f48fb694e3bc30be35ceac981"},"rowListing":{"lines":135,"sha256":"b3d35437774b76b7a81b78d12d6bb8ddeff3e83baf3c4cc3cec96d775932ce57"},"differences":[]}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":135}
PROCESS_EXIT 143
PROFILE_REMOVED partial-restore
```

### Output: `bun /tmp/gb1-rerun-advisor.ts advisor-present`

```text
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-rerun-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /gb1 dump
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1853}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"48e229d01575cceea8e512a161e6126a6cc4aa3370e329abf572d064aa24d256"},"rowListing":{"lines":1,"sha256":"848e3a57d5c4aa0e91f0ab11d4d28853f21fbf22c84ec25802262f342e11e7d4"},"differences":[]}
REAL_ADVISOR_TRANSCRIPTS {"advisorRequests":[{"method":"POST","path":"/v1/chat/completions","model":"advisor","agent":"advisor","messages":[{"role":"system","byteLength":5805,"sha256":"e07589e386b1aeee83d8572d95f6e2621e182c65520210563781adc82a8d39d4"},{"role":"user","byteLength":356,"sha256":"9a44becefbe02b9ad2050ac0312097af356c9b588eb8f82356ae074f13ebb7f5"},{"role":"user","byteLength":172,"sha256":"8b4b3aee3da0c282178e93e15175fd8e66d5488b90ffb306ead1a88463c45da2"}],"status":200},{"method":"POST","path":"/v1/chat/completions","model":"advisor","agent":"advisor","messages":[{"role":"system","byteLength":5805,"sha256":"e07589e386b1aeee83d8572d95f6e2621e182c65520210563781adc82a8d39d4"},{"role":"user","byteLength":304,"sha256":"8fadd60aab39070069e6697d2196bd206e35bb1f6743347a5ccb5e2376f0b42e"},{"role":"user","byteLength":378,"sha256":"708c421b0311bdf8a63d731ed106a25da13e35bf2d696e8d7f483eb213620f07"}],"status":200},{"method":"POST","path":"/v1/chat/completions","model":"advisor","agent":"advisor","messages":[{"role":"system","byteLength":5805,"sha256":"e07589e386b1aeee83d8572d95f6e2621e182c65520210563781adc82a8d39d4"},{"role":"user","byteLength":304,"sha256":"8fadd60aab39070069e6697d2196bd206e35bb1f6743347a5ccb5e2376f0b42e"},{"role":"user","byteLength":378,"sha256":"708c421b0311bdf8a63d731ed106a25da13e35bf2d696e8d7f483eb213620f07"},{"role":"assistant","byteLength":54,"sha256":"b57953579cfd650cf2696b4b4f90d01469499ae6bf91c83ffad26770a0e382f3"},{"role":"user","byteLength":105,"sha256":"17b73b44bcca555404ae9f67869fb850201086770a98001020b975cba84afded"}],"status":200}],"transcripts":[{"file":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/__advisor.jsonl","content":"{\"type\":\"title\",\"v\":1,\"title\":\"\",\"updatedAt\":\"2026-09-30T22:06:14.244Z\",\"pad\":\"                                                                                                                                                                              \"}\n{\"type\":\"session\",\"version\":3,\"id\":\"01a0f45a-9ce4-74aa-a4d3-1af4e3958741\",\"timestamp\":\"2026-09-30T22:06:14.244Z\",\"cwd\":\"<tmp>/workspace\"}\n{\"type\":\"message\",\"id\":\"f0edde72\",\"parentId\":null,\"timestamp\":\"2026-09-30T22:06:14.249Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"### Session update\\n\\n**user**:\\nHARNESS_AGENT=main\\n\"}],\"timestamp\":1790805974242,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"772b271e\",\"parentId\":\"f0edde72\",\"timestamp\":\"2026-09-30T22:06:14.249Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"**agent**:\\n→ task(Ask the advisor) ⇒ ok · 6 lines\\nTool result:\\n```text\\n<task-result id=\\\"advisor-child\\\" agent=\\\"advisor\\\" status=\\\"completed\\\" duration=\\\"284ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"24B\\\" />\\n<output>\\n\\\"advisor recommendation\\\"\\n</output>\\n</task-result>\\n```\\n\\n\\n---\\n\\n[in progress — more steps follow]\"}],\"timestamp\":1790805974242,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"727b2329\",\"parentId\":\"772b271e\",\"timestamp\":\"2026-09-30T22:06:14.250Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Harness advisor reply\"}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"advisor\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"stop\",\"timestamp\":1790805974243,\"responseId\":\"chatcmpl-advisor-present-advisor-2\",\"duration\":5.607473000000027,\"ttft\":5.445299999999861}}\n{\"type\":\"message\",\"id\":\"22274e75\",\"parentId\":\"727b2329\",\"timestamp\":\"2026-09-30T22:06:14.255Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"### Session update\\n\\n**agent**:\\nadvisor complete\\n\"}],\"timestamp\":1790805974252,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"152de69e\",\"parentId\":\"22274e75\",\"timestamp\":\"2026-09-30T22:06:14.256Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Harness advisor reply\"}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"advisor\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"stop\",\"timestamp\":1790805974254,\"responseId\":\"chatcmpl-advisor-present-advisor-3\",\"duration\":1.7183100000002014,\"ttft\":1.5437550000001465}}\n"},{"file":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/advisor-child/__advisor.jsonl","content":"{\"type\":\"title\",\"v\":1,\"title\":\"\",\"updatedAt\":\"2026-09-30T22:06:14.236Z\",\"pad\":\"                                                                                                                                                                              \"}\n{\"type\":\"session\",\"version\":3,\"id\":\"01a0f45a-9cdc-71ba-bf9b-bda34545ec21\",\"timestamp\":\"2026-09-30T22:06:14.236Z\",\"cwd\":\"<tmp>/workspace\"}\n{\"type\":\"message\",\"id\":\"55a10482\",\"parentId\":null,\"timestamp\":\"2026-09-30T22:06:14.237Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"### Session update\\n\\n**user**:\\nComplete assignment thoroughly:\\n\\nHARNESS_AGENT=child/advisor advise.\\n\"}],\"timestamp\":1790805974232,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"0430ca95\",\"parentId\":\"55a10482\",\"timestamp\":\"2026-09-30T22:06:14.237Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"**agent**:\\nadvisor recommendation\\n→ yield(result) ⇒ ok · 1 line\\nTool result:\\n```text\\nResult submitted.\\n```\\n\"}],\"timestamp\":1790805974232,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"0a3e1623\",\"parentId\":\"0430ca95\",\"timestamp\":\"2026-09-30T22:06:14.238Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Harness advisor reply\"}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"advisor\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"stop\",\"timestamp\":1790805974235,\"responseId\":\"chatcmpl-advisor-present-advisor-1\",\"duration\":2.65735299999983,\"ttft\":2.236658999999918}}\n"}]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-rerun-extension.ts","--resume","<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":465}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"},"nativeTranscriptCount":1,"nativeRefCount":0,"missingCount":1,"outcomes":[]}
ADVISOR_WALK_BEFORE_RESTORE {"totalTranscriptCount":3,"ordinaryTranscriptCount":1,"advisorTranscriptCount":2,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"}}
RPC_COMMAND /gb1 native-read {"id":"advisor-child"}
NATIVE_RESTORE_READ {"type":"native-read","id":"advisor-child","result":{"content":[{"type":"text","text":"\"advisor recommendation\""}],"details":{"totalLines":1,"displayContent":{"text":"\"advisor recommendation\"","startLine":1,"lineNumbers":[1]},"fileSize":24,"meta":{"source":{"type":"internal","value":"agent://advisor-child"}},"resolvedPath":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/advisor-child.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1717}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":1,"nativeChildren":1,"rows":1,"advisors":2,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"b00285508e7f49e3183ee288e022e3054b533cb489bb0a6a9cc444d7dfc232a2"},"rowListing":{"lines":1,"sha256":"ae925d1f1ce6f274ed3ac29c723fec1d7b882333d31c2d722916651fe74686e6"},"differences":[]}
NATIVE_ADVISOR_REFS [{"id":"Main/advisor","kind":"advisor","status":"parked","session":null,"parentId":"Main","sessionFile":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/__advisor.jsonl"},{"id":"advisor-child/advisor","kind":"advisor","status":"parked","session":null,"parentId":"advisor-child","sessionFile":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-olcCDl-workspace--/2026-09-30T22-06-13-630Z_01a0f45a-9a7e-74d6-94b7-889ca2d5fa67/advisor-child/__advisor.jsonl"}]
ADVISOR_PAGE_ROUTE {"command":"GET /v1/children/Main%2Fadvisor/page","status":404,"body":"Not Found"}
ADVISOR_PAGE_ROUTE {"command":"GET /v1/children/advisor-child%2Fadvisor/page","status":404,"body":"Not Found"}
RPC_COMMAND /gb1 cap {"repo":"$PWD","limit":256,"ids":["Main/advisor","advisor-child/advisor"]}
ADVISOR_ADMISSION {"type":"cap","limit":256,"inventory":{"state":"complete"},"rows":1,"ids":["advisor-child"],"admissions":[{"id":"Main/advisor","sessionFile":null},{"id":"advisor-child/advisor","sessionFile":null}]}
ADVISOR_RESULT {"pass":true,"advisorIds":["Main/advisor","advisor-child/advisor"],"snapshotIds":["advisor-child"],"inventory":{"state":"complete"},"totalTranscriptCount":3,"ordinaryTranscriptCount":1,"advisorTranscriptCount":2,"pageResponses":[{"id":"Main/advisor","status":404,"body":"Not Found"},{"id":"advisor-child/advisor","status":404,"body":"Not Found"}]}
PROCESS_EXIT 143
PROFILE_REMOVED advisor-present
```

### Large capture receipts (not embedded)

SHA-256 is of each original captured byte sequence; line count is newline-delimited logical lines, including an unterminated final line. Captures are intentionally not embedded and are deleted after receipt.

| Capture | Lines | SHA-256 |
|---|---:|---|
| `/tmp/gb1-aborted-capture.json` | 3252 | `b5bad9d7e201aff1a0bfcf136e8680d45c5398ea40d38c15a4b47450feaf3110` |
| `/tmp/gb1-advisor-present-capture.json` | 4344 | `f02eadb19873a77e61f343a4e194a29293c20fb2af368b42b324afaaa06cda1d` |
| `/tmp/gb1-cold-restart-restart-capture.json` | 3812 | `c2cadc14fae6fe695ca196797f2078c1fc71086f4ac17b0ac69276846ee04b3b` |
| `/tmp/gb1-detached-capture.json` | 3998 | `102fde777bf03b1164f2c42ee497970d2a9ebac0efa9065404b0b2185377ccdd` |
| `/tmp/gb1-duplicate-labels-capture.json` | 5088 | `ef5fecd042a6ac5e79f3feeb37553dad358bf65795848445b17cc6eee950076f` |
| `/tmp/gb1-eval-agent-capture.json` | 4083 | `faf5e5b0ccb8fedded3307a680cc8207200372c297267b1affacac456a599527` |
| `/tmp/gb1-explicit-long-ids-capture.json` | 4236 | `75948741e6620f441c175c78205e868d7ee37f155e866dad0b447b51bc8b0bb6` |
| `/tmp/gb1-follow-up-capture.json` | 4339 | `58e7d6dbb74c7716314304c4375cea1a8e241f106e3a32993cc17d297cd9c1dd` |
| `/tmp/gb1-follow-up-late-capture.json` | 4415 | `539ceed2fff31424be6f6307d063aedbc84ff7ead48856fdf06c05269e61ab9a` |
| `/tmp/gb1-fork-capture.json` | 6209 | `c2080a763d69342aade7e9a236af3af757f80909d886eb957f8a1b244c99564d` |
| `/tmp/gb1-long-labels-capture.json` | 5088 | `c508179ef7a2894f6f01a1383df51e9f771ac1ea7cea08222ba2de945fbbecfa` |
| `/tmp/gb1-many-135-capture.json` | 216680 | `a70b41e0a3eb7774048d4805a2822d9169329cda929d3a2e57042cb31c2f9086` |
| `/tmp/gb1-many-33-capture.json` | 44873 | `e16c4f1ec5581441a50d6f679a8987699d86f07dfb96a19b0c13578b298f9fda` |
| `/tmp/gb1-nested-capture.json` | 6144 | `481456df39223d47909a4ea96ea2de4668aa32bb4b9fb64b0976161a374bc107` |
| `/tmp/gb1-new-session-capture.json` | 7087 | `2451eb30d6235987689faec1dd02ecb0c2e6e7899f856557f361355c656a8c4d` |
| `/tmp/gb1-one-child-capture.json` | 4414 | `e7a4f97a4fb9ba2238155236f2edc735f5dbcb094f1b4383d017bf1160845aaf` |
| `/tmp/gb1-parked-capture.json` | 4082 | `363723f0b8808f2f0434b0076ffe6d93d76892e6f888797ab3f1781b81f13ac5` |
| `/tmp/gb1-partial-restore-restart-capture.json` | 76646 | `fc947e81b04307b44fb130c51bccdbf026242ad414c2c09e90c342c8eea2c35b` |
| `/tmp/gb1-rerun-advisor-capture.json` | 4130 | `bfb70a48f5c37ec47bbcd66f919f91ebc14f4ad20db56836b7598cb818f84bc8` |
| `/tmp/gb1-restricted-capture.json` | 4225 | `33159e4c173bc8a785ce926999d3eee8fea3b0e376054cd8b534a230e98a80a9` |
| `/tmp/gb1-resume-restart-capture.json` | 2694 | `fabeb4f23dd597f694bd8aa1cb4e9434617e2bd9024793bf72f0a42f051ff620` |
| `/tmp/gb1-same-id-replacement-capture.json` | 6019 | `c87a1dd919ca8e4d0f43e194179d5b2a2a280a34ef098703c8c3836924bc8750` |
| `/tmp/gb1-tombstoned-capture.json` | 3652 | `ee9f08289ab41533093e188bd7484ee6133ec376cb66d40b97d521c8226ec029` |

### Source `/tmp/gb1-rerun-evidence-check.ts`

Exact command: `bun /tmp/gb1-rerun-evidence-check.ts`. This checks evidence preservation and annex integrity only, not product behavior.

```ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
const path = 'omp-orca-observer/checks/evidence/gb1.md';
const current = await readFile(path, 'utf8');
const baseline = await readFile('/tmp/gb1-rerun-before.md', 'utf8');
const baselineRows = baseline.split('\n').filter(line => line.startsWith('| V02.5 ') || line.startsWith('| V07.6 '));
let preserved = current;
for (const row of baselineRows) preserved = preserved.replace(new RegExp('^\\| ' + row.split(' | ')[0].slice(2).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ' \\|.*$', 'm'), row);
preserved = preserved.replace('The following two failure paragraphs are retained historical results from the initial gate. Both are superseded by the dated re-run below; neither remains an acceptance failure.\n\n', '');
assert.ok(preserved.startsWith(baseline), 'all earlier evidence preserved except authorized matrix rows');
assert.ok(!current.includes(process.cwd()), 'source root normalized');
assert.ok(!current.includes(process.env.HOME + '/'), 'host home normalized');
const names = ['gb1-driver.ts', 'gb1-extension.ts', 'gb1-restart.ts', 'gb1-bootstrap.ts', 'gb1-link.ts', 'gb1-basic-extension.ts', 'gb1-annex.ts', 'gb1-probe/index.ts', 'gb1-probe/package.json', 'gb1-rerun-extract.ts', 'gb1-rerun-reader.ts', 'gb1-rerun-reader-launch.ts', 'gb1-rerun-advisor.ts', 'gb1-rerun-extension.ts', 'gb1-rerun-annex-builder.ts', 'gb1-rerun-evidence-check.ts'];
for (const name of names) {
  const source = (await readFile('/tmp/' + name, 'utf8')).replaceAll(process.cwd(), '$PWD').replaceAll(process.env.HOME ?? '/nonexistent-home', '$HOME').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  const heading = '### Source `/tmp/' + name + '`';
  const offset = current.lastIndexOf(heading);
  assert.ok(offset >= 0, 'embedded source heading: ' + name);
  const contentStart = current.indexOf('\n', current.indexOf('```', offset)) + 1;
  assert.ok(current.slice(contentStart).startsWith(source), 'verbatim normalized source: ' + name);
}
const outputs = ['follow-up', 'follow-up-late', 'same-id-replacement', 'parked', 'advisor-present', 'new-session', 'fork', 'resume-restart', 'cold-restart-restart', 'partial-restore-restart', 'rerun-advisor'];
for (const name of outputs) {
  const output = (await readFile('/tmp/gb1-' + name + '.out', 'utf8')).replaceAll(process.cwd(), '$PWD').replaceAll(process.env.HOME ?? '/nonexistent-home', '$HOME').replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  assert.ok(current.includes(output), 'complete normalized output: ' + name);
}
const captures = (await readdir('/tmp')).filter(name => name.startsWith('gb1-') && name.endsWith('-capture.json'));
for (const name of captures) {
  const bytes = await readFile('/tmp/' + name);
  const text = bytes.toString('utf8');
  const lines = text.split('\n').length - Number(text.endsWith('\n'));
  const hash = createHash('sha256').update(bytes).digest('hex');
  assert.ok(current.includes('| `/tmp/' + name + '` | ' + lines + ' | `' + hash + '` |'), 'capture receipt: ' + name);
}
assert.equal(current.split('\n').filter(line => /^```/.test(line)).length % 2, 0, 'balanced fenced blocks');
console.log('EVIDENCE_CHECK', JSON.stringify({ passed: true, historicalPrefixPreserved: true, matrixRowsUpdated: 2, sources: names.length, completeOutputs: outputs.length, captureReceipts: captures.length, pathsNormalized: true, fencesBalanced: true }));
```

### Evidence integrity and cleanup receipt

Exact command: `bun /tmp/gb1-rerun-evidence-check.ts`.

```text
EVIDENCE_CHECK {"passed":true,"historicalPrefixPreserved":true,"matrixRowsUpdated":2,"sources":16,"completeOutputs":11,"captureReceipts":23,"pathsNormalized":true,"fencesBalanced":true}
```

This passed against the final annex contents: all earlier evidence preserved except the two authorized matrix updates, every retained source normalized verbatim, eleven complete transition/restart/advisor outputs, and twenty-three original capture digests/counts. Earlier `PERSISTED_FACT_RESULT` and `PARTIAL_RESTORE_COMPARE` failures are retained without re-execution or reclassification.

Cleanup command: `cp /tmp/gb1-rerun-before.md /tmp/observer-gb1-recovery.md && rm -rf /tmp/gb1-*`. Exit 0. The copied before-image is held only for the final owned diff. The subsequent filesystem glob `/tmp/gb1-*` returned `No files found matching pattern`: every old/new gb1 script, extension, package directory, output, capture and intermediate annex is deleted. Harness profiles were independently torn down by their drivers.

Current results: **V02.5 PASS; V07.6 PASS (0/1/16)**. No product, check or harness file changed. Earlier unexercised limitations in the matrix section remain outside this two-criterion re-run.

## Review closure — GB1-R1 through GB1-R5, 2026-09-30

Dispatch: `Gb1Close`, binding slice `gb1-identity-inventory.md`; exclusive write boundary is this file. Recovery before-image: `/tmp/gb1-close-before.md`, SHA-256 `236d69339ffe8c23cf8620398dff3ceeeedeccef473cf02c88a02e8712a216d3`. No product/check/harness edits or Orca commands.

### GB1-R2 — persisted field fidelity: FAIL (open, needs niko's decision)

The inventory/registry comparison PASS does **not** prove full persisted-field fidelity. Native restored refs are parked with `session: null`; snapshot cwd is `{"known":false,"reason":"cwd not recorded"}` while the native transcript header records `"cwd":"<tmp>/workspace"`. `stock-source.ts:189` reads cwd only from the live session, not the transcript. Fresh native restoration retains `modelRole: {"known":true,"value":"task"}` and `resolvedModel: {"known":true,"value":"stub/scripted"}` via `ref.history`: the role matches registry history and the selector matches the transcript model entry. Those model fields PASS; the native restored cwd criterion is **FAIL (open, needs niko's decision)**, not an inferred allowable unknown. No product fix is authorized in this gate.

Exact normalized historical output from `bun /tmp/gb1-driver.ts parked`, **synthetic probe only** (the extension manually disposes the session, sets `session:null` / `status:"parked"` and re-registers the ref without native history; this is not native restoration and is excluded from the native field-fidelity verdict):

```text
PERSISTED_FACT_RESULT {"pass":false,"childId":"parked-child","snapshotCwd":{"known":false,"reason":"cwd not recorded"},"nativeSessionHeaderCwd":"<tmp>/workspace","snapshotResolvedModel":{"known":false,"reason":"resolved model not recorded"},"nativeModelChange":{"type":"model_change","id":"e3a073a8","parentId":null,"timestamp":"2026-09-30T21:47:00.135Z","model":"stub/scripted","resolvedModelIsFallback":false}}
```

The synthetic historical parked row also has `modelRole: {"known":false,"reason":"model role not recorded"}`. Its unknown model fields do not demonstrate native model loss. The fresh native-restoration `RESTORED_FIELD_FACTS` below quote exact snapshot values, `session:null`, transcript headers and `model_change` entries for resume, cold-restart and partial-restore; those records are the field-fidelity verdict's evidence.

### GB1-R3 — cap coverage disposition

Component cap **PASS** only: retained commands `bun /tmp/gb1-driver.ts many-33` and `bun /tmp/gb1-driver.ts many-135` call `/gb1 cap {"repo":"$PWD","limit":32}` and `/gb1 cap {"repo":"$PWD","limit":128}`; their outputs are `{"state":"partial","reason":"cap 32 of 33"}`, 32 rows, and `{"state":"partial","reason":"cap 128 of 135"}`, 128 rows, each with `CAP_RESULT {"pass":true}`.

Live-endpoint over-cap **UNVERIFIED**: `index.ts:24` sets limit 256; the endpoint was exercised with at most 135 children, never above 256. No product change is allowed in this gate.

### GB1-R1/R4/R5 — reproduction and provenance

The historical comparator is explicitly labelled above. Its later revision was deleted with `/tmp`, so the earlier unknown-inventory comparisons (replacement, fork, resume, advisor restoration) cannot be attributed to exact preserved comparator source. Fresh results below supersede those comparison receipts. The final comparator keeps the same registry/live/transcript-header checks, validates each timestamp independently without imposing ordering, takes the inventory expectation explicitly per scenario, and additionally checks restoration counts/missing files independently against the native dump. Its PASS does not dispose of GB1-R2.

The historical reader's full output was not preserved. The prior extractor is historical and must not overwrite the adapted source. Fresh reproduction copies the adapted source directly; its sole reader-probe change is removing output suppression, not changing assertions or product behavior.

### Final comparator source `/tmp/gb1-close/gb1-compare.ts`

```ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { resolve, sep, relative } from 'node:path';

// A comparison PASS covers registry/live fields, not restored transcript field fidelity (GB1-R2).
// Inventory expectations are supplied by the scenario, never inferred from the snapshot.
export function compare(snapshot, native, expectedCount, expectedInventory) {
  assert.ok(['complete', 'unknown'].includes(expectedInventory), 'explicit scenario inventory expectation');
  const differences = [];
  const refs = native.refs;
  const artifactRoot = resolve(native.root.replace(/\.jsonl$/, ''));
  const prefix = artifactRoot + sep;
  const admitted = refs.filter(ref => {
    if (ref.kind !== 'sub' || !ref.sessionFile || !resolve(ref.sessionFile).startsWith(prefix)) return false;
    const visited = new Set();
    let current = ref;
    while (current?.kind === 'sub' && current.sessionFile && resolve(current.sessionFile).startsWith(prefix) && !visited.has(current.id)) {
      visited.add(current.id);
      if (current.parentId === 'Main') return true;
      current = refs.find(parent => parent.id === current.parentId);
    }
    return false;
  });
  const check = (label, actual, expected) => {
    try { assert.deepEqual(actual, expected); }
    catch { differences.push({ field: label, actual, expected }); }
  };
  const known = (label, actual, value) => {
    if (value === undefined) {
      check(label + '.known', actual?.known, false);
      if (!actual?.reason) differences.push({ field: label + '.reason', actual, expected: 'nonempty unknown reason' });
    } else check(label, actual, { known: true, value });
  };
  check('schema', snapshot.schema, 1);
  known('rootSession', snapshot.rootSession, native.root);
  check('inventory.state', snapshot.inventory?.state, expectedInventory);
  const missing = native.transcriptFiles.filter(file => !admitted.some(ref => resolve(ref.sessionFile) === resolve(file))).map(file => relative(artifactRoot, file)).sort();
  if (expectedInventory === 'complete') check('inventory.missingTranscripts', missing, []);
  else {
    const match = /^registry not fully restored: (\d+) of (\d+); missing: (.+)$/.exec(snapshot.inventory?.reason ?? '');
    check('inventory.restoredCount', match ? Number(match[1]) : null, native.transcriptFiles.length - missing.length);
    check('inventory.transcriptCount', match ? Number(match[2]) : null, native.transcriptFiles.length);
    check('inventory.missingTranscripts', match ? match[3].split(', ').sort() : null, missing);
  }
  check('children.ids', snapshot.children.map(row => row.childId).sort(), admitted.map(ref => ref.id).sort());
  if (expectedCount !== undefined) check('native.count', admitted.length, expectedCount);
  if (!/^[0-9a-f-]{36}$/.test(snapshot.epoch)) differences.push({ field: 'epoch', actual: snapshot.epoch, expected: 'UUID' });
  if (!Number.isInteger(snapshot.generation) || snapshot.generation < 1) differences.push({ field: 'generation', actual: snapshot.generation, expected: 'positive integer' });
  if (!Number.isFinite(Date.parse(snapshot.observedAt))) differences.push({ field: 'observedAt', actual: snapshot.observedAt, expected: 'ISO sample timestamp' });
  for (const row of snapshot.children) {
    const ref = admitted.find(item => item.id === row.childId);
    if (!ref) continue;
    for (const [field, value] of Object.entries({ childId: ref.id, parentId: ref.parentId, rootSession: native.root, kind: 'sub', agentName: ref.displayName, registryStatus: ref.status, tombstoned: ref.tombstoned, grantScope: 'none' })) check(row.childId + '.' + field, row[field], value);
    known(row.childId + '.modelRole', row.modelRole, ref.history?.modelRole);
    known(row.childId + '.resolvedModel', row.resolvedModel, ref.history?.resolvedModel ?? ref.session?.resolvedModel);
    for (const field of ['responseAt', 'acceptedAt', 'terminalAt']) known(row.childId + '.milestones.' + field, row.milestones[field], ref.lifecycle?.[field] === undefined ? undefined : new Date(ref.lifecycle[field]).toISOString());
    check(row.childId + '.activity.sampled', row.activity.sampled, true);
    known(row.childId + '.activity.lastActivityAt', row.activity.lastActivityAt, ref.lastActivity === undefined ? undefined : new Date(ref.lastActivity).toISOString());
    for (const field of ['repoRoot', 'parentWorktree', 'childWorktree', 'isolation']) known(row.childId + '.lineage.' + field, row.lineage[field], undefined);
    known(row.childId + '.lineage.cwd', row.lineage.cwd, ref.session?.cwd);
    known(row.childId + '.lineage.branch', row.lineage.branch, ref.history?.branchName);
    check(row.childId + '.completeness.state', row.completeness.state, 'unknown');
    if (!row.completeness.reason) differences.push({ field: row.childId + '.completeness.reason', actual: row.completeness, expected: 'nonempty native-lineage limitation' });
    if (!Number.isFinite(Date.parse(row.observedAt))) differences.push({ field: row.childId + '.observedAt', actual: row.observedAt, expected: 'ISO sample timestamp' });
    const lifecycle = native.facts.filter(fact => fact.id === row.childId && fact.sessionFile === ref.sessionFile);
    const last = lifecycle.at(-1);
    if (last && row.outcome.state !== 'unknown') {
      check(row.childId + '.outcome.state', row.outcome.state, last.status);
      check(row.childId + '.outcome.generation', row.outcome.generation, lifecycle.filter(fact => fact.status === 'started').length);
      known(row.childId + '.outcome.spawnCallId', row.outcome.spawnCallId, last.parentToolCallId);
      if (Math.abs(Date.parse(row.outcome.at) - Date.parse(last.receivedAt)) > 1000) differences.push({ field: row.childId + '.outcome.at', actual: row.outcome.at, expected: last.receivedAt });
    } else if (row.outcome.state === 'unknown' && !row.outcome.reason) differences.push({ field: row.childId + '.outcome', actual: row.outcome, expected: 'explicit evidence limitation' });
    if (ref.transcript) {
      check(row.childId + '.transcript.invalidHeader', ref.transcript.invalidHeader, false);
      check(row.childId + '.transcript.malformedRecords', ref.transcript.malformedRecords, 0);
      if (ref.session?.cwd) check(row.childId + '.transcript.cwd', ref.transcript.header.cwd, ref.session.cwd);
      if (ref.transcript.header.agentId !== undefined) check(row.childId + '.transcript.agentId', ref.transcript.header.agentId, ref.id);
      if (ref.transcript.header.parentAgentId !== undefined) check(row.childId + '.transcript.parentAgentId', ref.transcript.header.parentAgentId, ref.parentId);
    }
  }
  const normalize = value => JSON.stringify(value).replaceAll(native.root, '<root>').replace(/\/tmp\/omp-orca-harness-[^/]+/g, '<tmp>');
  const nativeListing = admitted.map(ref => ({ id: ref.id, parentId: ref.parentId, displayName: ref.displayName, status: ref.status, history: ref.history, lifecycle: ref.lifecycle, session: ref.session && { cwd: ref.session.cwd, resolvedModel: ref.session.resolvedModel }, transcriptHeader: ref.transcript?.header, tombstoned: ref.tombstoned }));
  return {
    pass: differences.length === 0, expectedCount, expectedInventory, nativeChildren: admitted.length, rows: snapshot.children.length,
    advisors: refs.filter(ref => ref.kind === 'advisor').length, inventory: snapshot.inventory,
    nativeListing: { lines: nativeListing.length, sha256: createHash('sha256').update(normalize(nativeListing)).digest('hex') },
    rowListing: { lines: snapshot.children.length, sha256: createHash('sha256').update(normalize(snapshot.children)).digest('hex') },
    differences,
  };
}
```

### Source `/tmp/gb1-close/materialize.ts`

This copies the retained adapted reader directly, never invoking the historical extractor. The unique substitutions below completely specify the closure driver revisions, including explicit scenario inventory expectations and the native bulk-restoration count (one history read restores all refs). Existing probe/driver source blocks are reused, not guessed or recreated.

```ts
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const dir = '/tmp/gb1-close';
await mkdir(dir + '/gb1-probe', { recursive: true });
const evidence = await readFile('omp-orca-observer/checks/evidence/gb1.md', 'utf8');
const names = ['gb1-driver.ts', 'gb1-extension.ts', 'gb1-restart.ts', 'gb1-probe/index.ts', 'gb1-probe/package.json', 'gb1-rerun-reader.ts', 'gb1-rerun-reader-launch.ts', 'gb1-rerun-advisor.ts', 'gb1-rerun-extension.ts'];
for (const name of names) {
  const marker = '### Source `/tmp/' + name + '`';
  const heading = evidence.lastIndexOf(marker);
  assert.ok(heading >= 0, 'retained source ' + name);
  const fence = evidence.indexOf('```', heading);
  const start = evidence.indexOf('\n', fence) + 1;
  const end = evidence.indexOf('\n```', start);
  assert.ok(end > start);
  let source = evidence.slice(start, end).replaceAll('/tmp/gb1-', dir + '/gb1-');
  const changes: [string, string][] = [];
  if (name === 'gb1-driver.ts') changes.push(
    ['compare(observed.snapshot, native, expectedCounts[scenario])', "compare(observed.snapshot, native, expectedCounts[scenario], 'complete')"],
    ['compare(parked.snapshot, parkedNative, 1)', "compare(parked.snapshot, parkedNative, 1, 'complete')"],
    ['compare(finished.snapshot, finishedNative, 1)', "compare(finished.snapshot, finishedNative, 1, 'complete')"],
    ['compare(replacement.snapshot, replacementNative, 1)', "compare(replacement.snapshot, replacementNative, 1, 'unknown')"],
    ['compare(switched.snapshot, switchedNative, 1)', "compare(switched.snapshot, switchedNative, 1, scenario === 'fork' ? 'unknown' : 'complete')"],
  );
  if (name === 'gb1-restart.ts' || name === 'gb1-rerun-advisor.ts') changes.push(
    ['compare(first, firstNative, expected)', "compare(first, firstNative, expected, 'complete')"],
    ["compare(restored, restoredNative, restoredNative.refs.filter(ref => ref.kind === 'sub').length)", "compare(restored, restoredNative, 0, 'unknown')"],
    ['compare(complete, completeNative, expected)', "compare(complete, completeNative, expected, 'complete')"],
  );
  if (name === 'gb1-restart.ts') changes.push(
    ['compare(partial, partialNative, 1)', "compare(partial, partialNative, expected, 'complete')"],
    ["emit('COMPLETE_RESTORE_RESULT',", "const row = complete.children[0];\n      const ref = completeNative.refs.find(ref => ref.id === row.childId);\n      emit('RESTORED_FIELD_FACTS', { restoredCount: complete.children.length, childId: row.childId, status: ref.status, session: ref.session, snapshotCwd: row.lineage.cwd, snapshotModelRole: row.modelRole, snapshotResolvedModel: row.resolvedModel, transcriptHeader: ref.transcript.header, transcriptModelChange: ref.transcript.metadata.filter(entry => entry.type === 'model_change').at(-1) });\n      emit('COMPLETE_RESTORE_RESULT',"],
  );
  if (name === 'gb1-rerun-reader.ts') changes.push(
    ["    if (maxBytes > 1 || result.kind === 'page' || result.end !== null || step === 0) {\n      console.log('STEP', JSON.stringify({ maxBytes, step, kind: result.kind, start: result.start, end: result.end, scannedTo: result.scannedTo, atEnd: result.atEnd, cursor, payloadBytes, reads: windows.map(read => ({ offset: read.offset, length: read.length })) }));\n    }", "    console.log('STEP', JSON.stringify({ maxBytes, step, kind: result.kind, start: result.start, end: result.end, scannedTo: result.scannedTo, atEnd: result.atEnd, cursor, payloadBytes, reads: windows.map(read => ({ offset: read.offset, length: read.length })) }));"],
  );
  for (const [before, after] of changes) {
    assert.equal(source.split(before).length - 1, 1, name + ': unique adaptation ' + before);
    source = source.replace(before, after);
  }
  await writeFile(dir + '/' + name, source + '\n');
  console.log('MATERIALIZED', name);
}
```

Exact setup: copy the two closure source blocks directly to `/tmp/gb1-close/gb1-compare.ts` and `/tmp/gb1-close/materialize.ts`; run `bun /tmp/gb1-close/materialize.ts`. All other sources are generated exclusively from the embedded retained blocks. For another temporary directory, substitute `/tmp/gb1-close` consistently.

```text
MATERIALIZED gb1-driver.ts
MATERIALIZED gb1-extension.ts
MATERIALIZED gb1-restart.ts
MATERIALIZED gb1-probe/index.ts
MATERIALIZED gb1-probe/package.json
MATERIALIZED gb1-rerun-reader.ts
MATERIALIZED gb1-rerun-reader-launch.ts
MATERIALIZED gb1-rerun-advisor.ts
MATERIALIZED gb1-rerun-extension.ts
```

Fresh checkpoint interpretation: the legacy label `PARTIAL_RESTORE_COMPARE` means the snapshot after the **first native history read**, not a nonzero partial registry. Omp bulk-restores all refs in that read (1/3/135 here). The final comparator expects complete inventory and the entire scenario count at that checkpoint; no 1–134-ref checkpoint is claimed.

### Source `/tmp/gb1-close/verify-output.ts`

This throwaway assertion/compaction check consumes only the fresh normalized outputs. To reproduce, save the reader launch's complete stdout as `/tmp/gb1-close/reader-full.out` before running this verifier; the other drivers write their `.out` files themselves. It verifies all comparator receipts, exact native-restored cwd/model facts, record counts and the restricted scan compaction.

```ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const dir = '/tmp/gb1-close';
const runs = [
  ['gb1-resume-restart.out', 'bun /tmp/gb1-close/gb1-restart.ts resume', 4],
  ['gb1-cold-restart-restart.out', 'bun /tmp/gb1-close/gb1-restart.ts cold-restart', 4],
  ['gb1-partial-restore-restart.out', 'bun /tmp/gb1-close/gb1-restart.ts partial-restore', 4],
  ['gb1-same-id-replacement.out', 'bun /tmp/gb1-close/gb1-driver.ts same-id-replacement', 2],
  ['gb1-fork.out', 'bun /tmp/gb1-close/gb1-driver.ts fork', 2],
  ['gb1-parked.out', 'bun /tmp/gb1-close/gb1-driver.ts parked', 2],
  ['gb1-rerun-advisor.out', 'bun /tmp/gb1-close/gb1-rerun-advisor.ts advisor-present', 3],
] as const;
let annex = '## Fresh closure results — complete normalized output\n\nAll parent scripts exited 0; child `PROCESS_EXIT 143` is the deliberate post-capture termination. Comparator PASS is registry/inventory fidelity, not native restored cwd acceptance. Manual parked output is synthetic and excluded from the native verdict.\n\n';
let comparisons = 0;
for (const [file, command, count] of runs) {
  const text = await readFile(dir + '/' + file, 'utf8');
  const lines = text.trim().split('\n');
  assert.ok(!text.includes('DRIVER_ERROR') && !text.includes('TOOL_ERROR'));
  assert.ok(lines.at(-1)?.startsWith('PROFILE_REMOVED'));
  const comparisonLines = lines.filter(line => /^(COMPARE |[A-Z_]+_COMPARE )/.test(line));
  assert.equal(comparisonLines.length, count);
  for (const line of comparisonLines) {
    const result = JSON.parse(line.slice(line.indexOf('{')));
    assert.equal(result.pass, true);
    assert.deepEqual(result.differences, []);
    assert.equal(result.inventory.state, result.expectedInventory);
    comparisons++;
  }
  for (const line of lines.filter(line => line.startsWith('RESTORE_RESULT '))) {
    const result = JSON.parse(line.slice(line.indexOf('{')));
    assert.equal(result.epochChanged, true);
    assert.equal(result.nativeRefCount, 0);
    assert.equal(result.missingCount, result.nativeTranscriptCount);
  }
  for (const line of lines.filter(line => line.startsWith('RESTORED_FIELD_FACTS '))) {
    const result = JSON.parse(line.slice(line.indexOf('{')));
    assert.equal(result.status, 'parked');
    assert.equal(result.session, null);
    assert.deepEqual(result.snapshotCwd, { known: false, reason: 'cwd not recorded' });
    assert.equal(result.transcriptHeader.cwd, '<tmp>/workspace');
    assert.deepEqual(result.snapshotModelRole, { known: true, value: 'task' });
    assert.deepEqual(result.snapshotResolvedModel, { known: true, value: result.transcriptModelChange.model });
  }
  annex += '### Output: `' + command + '`\n\n```text\n' + text + '```\n\n';
}
const reader = await readFile(dir + '/reader-full.out', 'utf8');
const lines = reader.trimEnd().split('\n');
const compact: string[] = [];
let stepCount = 0;
for (let index = 0; index < lines.length; index++) {
  const line = lines[index];
  if (!line.startsWith('STEP ')) { compact.push(line); continue; }
  const first = JSON.parse(line.slice(5));
  if (first.maxBytes === 16 || first.end !== null || first.kind !== 'record_too_large') { compact.push(line); stepCount++; continue; }
  const fixed = { ...first, reads: first.reads.map(read => ({ length: read.length })) };
  delete fixed.step; delete fixed.scannedTo; delete fixed.cursor;
  let lastIndex = index;
  while (lastIndex + 1 < lines.length && lines[lastIndex + 1].startsWith('STEP ')) {
    const next = JSON.parse(lines[lastIndex + 1].slice(5));
    const nextFixed = { ...next, reads: next.reads.map(read => ({ length: read.length })) };
    delete nextFixed.step; delete nextFixed.scannedTo; delete nextFixed.cursor;
    if (JSON.stringify(nextFixed) !== JSON.stringify(fixed)) break;
    assert.equal(next.step, first.step + lastIndex + 1 - index);
    assert.equal(next.scannedTo, next.step + 1);
    assert.equal(next.cursor, next.step + 1);
    assert.deepEqual(next.reads, [{ offset: next.step, length: 1 }]);
    lastIndex++;
  }
  const count = lastIndex - index + 1;
  compact.push('SCAN_RUN ' + JSON.stringify({ maxBytes: first.maxBytes, start: first.start, steps: count, firstStep: first.step, lastStep: first.step + count - 1, omitted: Math.max(0, count - 2), varyingOnly: ['step', 'scannedTo', 'cursor', 'reads.offset'] }));
  compact.push(line);
  if (lastIndex !== index) compact.push(lines[lastIndex]);
  stepCount += count;
  index = lastIndex;
}
assert.equal(stepCount, 34 + 499 + 499);
for (const maxBytes of [16, 1, 0]) {
  const steps = lines.filter(line => line.startsWith('STEP ') && JSON.parse(line.slice(5)).maxBytes === maxBytes);
  assert.equal(steps.length, maxBytes === 16 ? 34 : 499);
  const result = JSON.parse(lines.find(line => line.startsWith('RESULT ') && JSON.parse(line.slice(7)).maxBytes === maxBytes)!.slice(7));
  assert.equal(result.pass, true);
  assert.deepEqual(result.recordEnds, [100, 280, 498]);
}
assert.ok(lines.includes('EXIT 0'));
assert.equal(lines.at(-1), 'PROFILE_REMOVED');
annex += '### GB1-R5 output: `bun /tmp/gb1-close/gb1-rerun-reader-launch.ts`\n\nComplete normalized output: all 34 maxBytes=16 STEP lines are verbatim. For maxBytes 0/1, only intermediate scans differing solely in step/scannedTo/cursor/read offset are collapsed into first/last lines plus counts; each newline-ending and EOF step is verbatim. `SCAN_RUN` lines are compactor annotations, not reader output. Raw normalized reader output SHA-256: `' + createHash('sha256').update(reader).digest('hex') + '`.\n\n```text\n' + compact.join('\n') + '\n```\n\n';
const receipt = { pass: true, comparisonRecords: comparisons, readerStepRecords: stepCount, readerSteps: { '16': 34, '1': 499, '0': 499 }, nativeRestoredCwdVerdict: 'FAIL-open', nativeRestoredModelVerdict: 'PASS', syntheticParkingExcluded: true };
annex += '### Output verification receipt\n\nCommand: `bun /tmp/gb1-close/verify-output.ts`. Source is embedded in the closure annex.\n\n```text\nVERIFY_OUTPUT ' + JSON.stringify(receipt) + '\n```\n';
await writeFile(dir + '/results.md', annex);
console.log('VERIFY_OUTPUT', JSON.stringify(receipt));
```

## Fresh closure results — complete normalized output

All parent scripts exited 0; child `PROCESS_EXIT 143` is the deliberate post-capture termination. Comparator PASS is registry/inventory fidelity, not native restored cwd acceptance. Manual parked output is synthetic and excluded from the native verdict.

### Output: `bun /tmp/gb1-close/gb1-restart.ts resume`

```text
COMMAND ["omp","--profile","resume","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-AqsLTt-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-74d4-84df-be6be1f8bd00.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1822}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"1331808dab8b1a9cb12ef376ec5e2b1e68c3e85d1091539b4e382476beb51082"},"rowListing":{"lines":1,"sha256":"72bddc47e8b2ee41e1d8a7091500dbccec3a5ea132e8c60cdb3b402c5edc5608"},"differences":[]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","resume","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-extension.ts","--resume","<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-AqsLTt-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-74d4-84df-be6be1f8bd00.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-AqsLTt-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-74d4-84df-be6be1f8bd00.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":455}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"expectedInventory":"unknown","nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: resume-child.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: resume-child.jsonl"},"nativeTranscriptCount":1,"nativeRefCount":0,"missingCount":1,"outcomes":[]}
RPC_COMMAND /gb1 native-read {"id":"resume-child"}
NATIVE_RESTORE_READ {"type":"native-read","id":"resume-child","result":{"content":[{"type":"text","text":"\"resumable answer\""}],"details":{"totalLines":1,"displayContent":{"text":"\"resumable answer\"","startLine":1,"lineNumbers":[1]},"fileSize":18,"meta":{"source":{"type":"internal","value":"agent://resume-child"}},"resolvedPath":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-AqsLTt-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-74d4-84df-be6be1f8bd00/resume-child.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1676}
RPC_COMMAND /gb1 dump
PARTIAL_RESTORE_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"5fa0efcb1e57785b8009461986a935da624b60ef0219785c686777fd9a2d686c"},"rowListing":{"lines":1,"sha256":"ae01ab07df4ea3f079a6f419a94d40c82c7e1909b7c5a097ca76ae27aaba09a7"},"differences":[]}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1676}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"5fa0efcb1e57785b8009461986a935da624b60ef0219785c686777fd9a2d686c"},"rowListing":{"lines":1,"sha256":"ae01ab07df4ea3f079a6f419a94d40c82c7e1909b7c5a097ca76ae27aaba09a7"},"differences":[]}
RESTORED_FIELD_FACTS {"restoredCount":1,"childId":"resume-child","status":"parked","session":null,"snapshotCwd":{"known":false,"reason":"cwd not recorded"},"snapshotModelRole":{"known":true,"value":"task"},"snapshotResolvedModel":{"known":true,"value":"stub/scripted"},"transcriptHeader":{"type":"session","version":3,"id":"01a0f474-e44a-743c-a9d3-6eb33ca69ef4","timestamp":"2026-09-30T22:34:56.458Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/resume/agent/sessions/--tmp-omp-orca-harness-AqsLTt-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-74d4-84df-be6be1f8bd00.jsonl"},"transcriptModelChange":{"type":"model_change","id":"8886c692","parentId":null,"timestamp":"2026-09-30T22:34:56.935Z","model":"stub/scripted","resolvedModelIsFallback":false}}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":1}
PROCESS_EXIT 143
PROFILE_REMOVED resume
```

### Output: `bun /tmp/gb1-close/gb1-restart.ts cold-restart`

```text
COMMAND ["omp","--profile","cold-restart","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-MjLPzn-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-77bf-903b-cb92983195b9.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":4741}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":3,"expectedInventory":"complete","nativeChildren":3,"rows":3,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":3,"sha256":"7f252224a3bcde2568a3e96afcaa4b4e0bc68e609549254b3b93ee07407f990e"},"rowListing":{"lines":3,"sha256":"0298b2fc960922eac308abdbbf67868cd9557d5057b531180e49d48a5e4f047f"},"differences":[]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","cold-restart","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-extension.ts","--resume","<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-MjLPzn-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-77bf-903b-cb92983195b9.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-MjLPzn-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-77bf-903b-cb92983195b9.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":492}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"expectedInventory":"unknown","nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"},"nativeTranscriptCount":3,"nativeRefCount":0,"missingCount":3,"outcomes":[]}
RPC_COMMAND /gb1 native-read {"id":"restart-1"}
NATIVE_RESTORE_READ {"type":"native-read","id":"restart-1","result":{"content":[{"type":"text","text":"\"persisted child\""}],"details":{"totalLines":1,"displayContent":{"text":"\"persisted child\"","startLine":1,"lineNumbers":[1]},"fileSize":17,"meta":{"source":{"type":"internal","value":"agent://restart-1"}},"resolvedPath":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-MjLPzn-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-77bf-903b-cb92983195b9/restart-1.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":4276}
RPC_COMMAND /gb1 dump
PARTIAL_RESTORE_COMPARE {"pass":true,"expectedCount":3,"expectedInventory":"complete","nativeChildren":3,"rows":3,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":3,"sha256":"02fc3ed10f9eb3779c6177f555c51ff2c71b38240eab50c1d30153b7649c5df5"},"rowListing":{"lines":3,"sha256":"eb36062d00090443782c286a359991a236dae07716694c84cde959ee55489a34"},"differences":[]}
RPC_COMMAND /gb1 native-read {"id":"restart-2"}
RPC_COMMAND /gb1 native-read {"id":"restart-3"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":4276}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":3,"expectedInventory":"complete","nativeChildren":3,"rows":3,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":3,"sha256":"02fc3ed10f9eb3779c6177f555c51ff2c71b38240eab50c1d30153b7649c5df5"},"rowListing":{"lines":3,"sha256":"eb36062d00090443782c286a359991a236dae07716694c84cde959ee55489a34"},"differences":[]}
RESTORED_FIELD_FACTS {"restoredCount":3,"childId":"restart-1","status":"parked","session":null,"snapshotCwd":{"known":false,"reason":"cwd not recorded"},"snapshotModelRole":{"known":true,"value":"task"},"snapshotResolvedModel":{"known":true,"value":"stub/scripted"},"transcriptHeader":{"type":"session","version":3,"id":"01a0f474-e45d-751f-af5d-b5074a943887","timestamp":"2026-09-30T22:34:56.477Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-MjLPzn-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-77bf-903b-cb92983195b9.jsonl"},"transcriptModelChange":{"type":"model_change","id":"539742ce","parentId":null,"timestamp":"2026-09-30T22:34:56.876Z","model":"stub/scripted","resolvedModelIsFallback":false}}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":3}
PROCESS_EXIT 143
PROFILE_REMOVED cold-restart
```

### Output: `bun /tmp/gb1-close/gb1-restart.ts partial-restore`

```text
COMMAND ["omp","--profile","partial-restore","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-zGrZok-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-7115-b425-5af0188e6799.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":197381}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":135,"expectedInventory":"complete","nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"0301e9fa602e23b99b049f54973f6dd7436c3b8e5a411b1732812b33d3ca1b5e"},"rowListing":{"lines":135,"sha256":"4f7886a17af66005c35bd800b5057bae5bcaf2e3cf833826109026aff806d66d"},"differences":[]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","partial-restore","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-extension.ts","--resume","<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-zGrZok-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-7115-b425-5af0188e6799.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-zGrZok-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-7115-b425-5af0188e6799.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":2903}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"expectedInventory":"unknown","nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"},"nativeTranscriptCount":135,"nativeRefCount":0,"missingCount":135,"outcomes":[]}
RPC_COMMAND /gb1 native-read {"id":"restore-1"}
NATIVE_RESTORE_READ {"type":"native-read","id":"restore-1","result":{"content":[{"type":"text","text":"\"restored child\""}],"details":{"totalLines":1,"displayContent":{"text":"\"restored child\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://restore-1"}},"resolvedPath":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-zGrZok-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-7115-b425-5af0188e6799/restore-1.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":176212}
RPC_COMMAND /gb1 dump
PARTIAL_RESTORE_COMPARE {"pass":true,"expectedCount":135,"expectedInventory":"complete","nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"d2cb337606518965d13a0ba0bccf240e3d9e8d82710d3b957f070730327bdfc5"},"rowListing":{"lines":135,"sha256":"9f41ab8b2babe38b6accee5892313c91d24507373219e695185aa3717e0cd3ec"},"differences":[]}
RPC_COMMAND /gb1 native-read {"id":"restore-2"}
RPC_COMMAND /gb1 native-read {"id":"restore-3"}
RPC_COMMAND /gb1 native-read {"id":"restore-4"}
RPC_COMMAND /gb1 native-read {"id":"restore-5"}
RPC_COMMAND /gb1 native-read {"id":"restore-6"}
RPC_COMMAND /gb1 native-read {"id":"restore-7"}
RPC_COMMAND /gb1 native-read {"id":"restore-8"}
RPC_COMMAND /gb1 native-read {"id":"restore-9"}
RPC_COMMAND /gb1 native-read {"id":"restore-10"}
RPC_COMMAND /gb1 native-read {"id":"restore-11"}
RPC_COMMAND /gb1 native-read {"id":"restore-12"}
RPC_COMMAND /gb1 native-read {"id":"restore-13"}
RPC_COMMAND /gb1 native-read {"id":"restore-14"}
RPC_COMMAND /gb1 native-read {"id":"restore-15"}
RPC_COMMAND /gb1 native-read {"id":"restore-16"}
RPC_COMMAND /gb1 native-read {"id":"restore-17"}
RPC_COMMAND /gb1 native-read {"id":"restore-18"}
RPC_COMMAND /gb1 native-read {"id":"restore-19"}
RPC_COMMAND /gb1 native-read {"id":"restore-20"}
RPC_COMMAND /gb1 native-read {"id":"restore-21"}
RPC_COMMAND /gb1 native-read {"id":"restore-22"}
RPC_COMMAND /gb1 native-read {"id":"restore-23"}
RPC_COMMAND /gb1 native-read {"id":"restore-24"}
RPC_COMMAND /gb1 native-read {"id":"restore-26"}
RPC_COMMAND /gb1 native-read {"id":"restore-25"}
RPC_COMMAND /gb1 native-read {"id":"restore-27"}
RPC_COMMAND /gb1 native-read {"id":"restore-28"}
RPC_COMMAND /gb1 native-read {"id":"restore-29"}
RPC_COMMAND /gb1 native-read {"id":"restore-30"}
RPC_COMMAND /gb1 native-read {"id":"restore-32"}
RPC_COMMAND /gb1 native-read {"id":"restore-31"}
RPC_COMMAND /gb1 native-read {"id":"restore-33"}
RPC_COMMAND /gb1 native-read {"id":"restore-34"}
RPC_COMMAND /gb1 native-read {"id":"restore-35"}
RPC_COMMAND /gb1 native-read {"id":"restore-36"}
RPC_COMMAND /gb1 native-read {"id":"restore-37"}
RPC_COMMAND /gb1 native-read {"id":"restore-38"}
RPC_COMMAND /gb1 native-read {"id":"restore-39"}
RPC_COMMAND /gb1 native-read {"id":"restore-40"}
RPC_COMMAND /gb1 native-read {"id":"restore-41"}
RPC_COMMAND /gb1 native-read {"id":"restore-42"}
RPC_COMMAND /gb1 native-read {"id":"restore-43"}
RPC_COMMAND /gb1 native-read {"id":"restore-44"}
RPC_COMMAND /gb1 native-read {"id":"restore-45"}
RPC_COMMAND /gb1 native-read {"id":"restore-46"}
RPC_COMMAND /gb1 native-read {"id":"restore-47"}
RPC_COMMAND /gb1 native-read {"id":"restore-48"}
RPC_COMMAND /gb1 native-read {"id":"restore-49"}
RPC_COMMAND /gb1 native-read {"id":"restore-50"}
RPC_COMMAND /gb1 native-read {"id":"restore-51"}
RPC_COMMAND /gb1 native-read {"id":"restore-52"}
RPC_COMMAND /gb1 native-read {"id":"restore-53"}
RPC_COMMAND /gb1 native-read {"id":"restore-55"}
RPC_COMMAND /gb1 native-read {"id":"restore-54"}
RPC_COMMAND /gb1 native-read {"id":"restore-56"}
RPC_COMMAND /gb1 native-read {"id":"restore-57"}
RPC_COMMAND /gb1 native-read {"id":"restore-58"}
RPC_COMMAND /gb1 native-read {"id":"restore-60"}
RPC_COMMAND /gb1 native-read {"id":"restore-59"}
RPC_COMMAND /gb1 native-read {"id":"restore-62"}
RPC_COMMAND /gb1 native-read {"id":"restore-61"}
RPC_COMMAND /gb1 native-read {"id":"restore-63"}
RPC_COMMAND /gb1 native-read {"id":"restore-64"}
RPC_COMMAND /gb1 native-read {"id":"restore-65"}
RPC_COMMAND /gb1 native-read {"id":"restore-66"}
RPC_COMMAND /gb1 native-read {"id":"restore-67"}
RPC_COMMAND /gb1 native-read {"id":"restore-68"}
RPC_COMMAND /gb1 native-read {"id":"restore-69"}
RPC_COMMAND /gb1 native-read {"id":"restore-71"}
RPC_COMMAND /gb1 native-read {"id":"restore-70"}
RPC_COMMAND /gb1 native-read {"id":"restore-72"}
RPC_COMMAND /gb1 native-read {"id":"restore-73"}
RPC_COMMAND /gb1 native-read {"id":"restore-74"}
RPC_COMMAND /gb1 native-read {"id":"restore-75"}
RPC_COMMAND /gb1 native-read {"id":"restore-76"}
RPC_COMMAND /gb1 native-read {"id":"restore-77"}
RPC_COMMAND /gb1 native-read {"id":"restore-78"}
RPC_COMMAND /gb1 native-read {"id":"restore-79"}
RPC_COMMAND /gb1 native-read {"id":"restore-80"}
RPC_COMMAND /gb1 native-read {"id":"restore-82"}
RPC_COMMAND /gb1 native-read {"id":"restore-81"}
RPC_COMMAND /gb1 native-read {"id":"restore-84"}
RPC_COMMAND /gb1 native-read {"id":"restore-85"}
RPC_COMMAND /gb1 native-read {"id":"restore-83"}
RPC_COMMAND /gb1 native-read {"id":"restore-86"}
RPC_COMMAND /gb1 native-read {"id":"restore-87"}
RPC_COMMAND /gb1 native-read {"id":"restore-88"}
RPC_COMMAND /gb1 native-read {"id":"restore-89"}
RPC_COMMAND /gb1 native-read {"id":"restore-90"}
RPC_COMMAND /gb1 native-read {"id":"restore-92"}
RPC_COMMAND /gb1 native-read {"id":"restore-91"}
RPC_COMMAND /gb1 native-read {"id":"restore-93"}
RPC_COMMAND /gb1 native-read {"id":"restore-94"}
RPC_COMMAND /gb1 native-read {"id":"restore-95"}
RPC_COMMAND /gb1 native-read {"id":"restore-96"}
RPC_COMMAND /gb1 native-read {"id":"restore-98"}
RPC_COMMAND /gb1 native-read {"id":"restore-97"}
RPC_COMMAND /gb1 native-read {"id":"restore-99"}
RPC_COMMAND /gb1 native-read {"id":"restore-100"}
RPC_COMMAND /gb1 native-read {"id":"restore-101"}
RPC_COMMAND /gb1 native-read {"id":"restore-102"}
RPC_COMMAND /gb1 native-read {"id":"restore-103"}
RPC_COMMAND /gb1 native-read {"id":"restore-104"}
RPC_COMMAND /gb1 native-read {"id":"restore-105"}
RPC_COMMAND /gb1 native-read {"id":"restore-106"}
RPC_COMMAND /gb1 native-read {"id":"restore-107"}
RPC_COMMAND /gb1 native-read {"id":"restore-108"}
RPC_COMMAND /gb1 native-read {"id":"restore-109"}
RPC_COMMAND /gb1 native-read {"id":"restore-111"}
RPC_COMMAND /gb1 native-read {"id":"restore-112"}
RPC_COMMAND /gb1 native-read {"id":"restore-110"}
RPC_COMMAND /gb1 native-read {"id":"restore-113"}
RPC_COMMAND /gb1 native-read {"id":"restore-114"}
RPC_COMMAND /gb1 native-read {"id":"restore-117"}
RPC_COMMAND /gb1 native-read {"id":"restore-116"}
RPC_COMMAND /gb1 native-read {"id":"restore-115"}
RPC_COMMAND /gb1 native-read {"id":"restore-119"}
RPC_COMMAND /gb1 native-read {"id":"restore-118"}
RPC_COMMAND /gb1 native-read {"id":"restore-120"}
RPC_COMMAND /gb1 native-read {"id":"restore-121"}
RPC_COMMAND /gb1 native-read {"id":"restore-122"}
RPC_COMMAND /gb1 native-read {"id":"restore-123"}
RPC_COMMAND /gb1 native-read {"id":"restore-124"}
RPC_COMMAND /gb1 native-read {"id":"restore-125"}
RPC_COMMAND /gb1 native-read {"id":"restore-127"}
RPC_COMMAND /gb1 native-read {"id":"restore-126"}
RPC_COMMAND /gb1 native-read {"id":"restore-128"}
RPC_COMMAND /gb1 native-read {"id":"restore-129"}
RPC_COMMAND /gb1 native-read {"id":"restore-130"}
RPC_COMMAND /gb1 native-read {"id":"restore-132"}
RPC_COMMAND /gb1 native-read {"id":"restore-131"}
RPC_COMMAND /gb1 native-read {"id":"restore-133"}
RPC_COMMAND /gb1 native-read {"id":"restore-134"}
RPC_COMMAND /gb1 native-read {"id":"restore-135"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":176212}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":135,"expectedInventory":"complete","nativeChildren":135,"rows":135,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":135,"sha256":"d2cb337606518965d13a0ba0bccf240e3d9e8d82710d3b957f070730327bdfc5"},"rowListing":{"lines":135,"sha256":"f6825a3615bcadfd852ca3db2b5a9bc4d5f424d4f07fb964526fc53a196f6492"},"differences":[]}
RESTORED_FIELD_FACTS {"restoredCount":135,"childId":"restore-2","status":"parked","session":null,"snapshotCwd":{"known":false,"reason":"cwd not recorded"},"snapshotModelRole":{"known":true,"value":"task"},"snapshotResolvedModel":{"known":true,"value":"stub/scripted"},"transcriptHeader":{"type":"session","version":3,"id":"01a0f474-e504-7384-8764-376081ced8a3","timestamp":"2026-09-30T22:34:56.644Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-zGrZok-workspace--/2026-09-30T22-34-56-050Z_01a0f474-e2b2-7115-b425-5af0188e6799.jsonl"},"transcriptModelChange":{"type":"model_change","id":"09cde311","parentId":null,"timestamp":"2026-09-30T22:34:56.715Z","model":"stub/scripted","resolvedModelIsFallback":false}}
COMPLETE_RESTORE_RESULT {"pass":true,"inventory":{"state":"complete"},"rows":135}
PROCESS_EXIT 143
PROFILE_REMOVED partial-restore
```

### Output: `bun /tmp/gb1-close/gb1-driver.ts same-id-replacement`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-close/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","same-id-replacement","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-L2pc5G-workspace--/2026-09-30T22-34-56-454Z_01a0f474-e446-7245-9ef6-a0c9c4d2a2aa.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":393}
ZERO_SNAPSHOT {"schema":1,"epoch":"83bd7d84-b922-4876-98f9-00c759bde917","generation":1,"observedAt":"2026-09-30T22:34:56.892Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-L2pc5G-workspace--/2026-09-30T22-34-56-454Z_01a0f474-e446-7245-9ef6-a0c9c4d2a2aa.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1864}
RPC_COMMAND /gb1 dump
COMPARE same-id-replacement {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"b3cada6001d7373f342dd23da901ec23b1ec0f8d783a785b424331ea571f7567"},"rowListing":{"lines":1,"sha256":"1bf73dc42b80dde68ad42922876bed903ba5560d89cbe457ab72e4537486610b"},"differences":[]}
NATIVE_IDENTITIES [{"id":"replacement","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
RPC_COMMAND /gb1 retire {"id":"replacement"}
RETIRE_RESULT {"type":"retired","id":"replacement","remaining":false}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1940}
RPC_COMMAND /gb1 dump
REPLACEMENT_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"unknown","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 1 of 2; missing: replacement.jsonl"},"nativeListing":{"lines":1,"sha256":"ebe885ee4a7e8164ec108d1e2a00947dc46ffdab9784e7ff266f57c91a5b8c53"},"rowListing":{"lines":1,"sha256":"9ae1e8fa04aa124f69a819146edf98b8d73094fb625e70b918fb65cf8109f75a"},"differences":[]}
REPLACEMENT_RESULT {"before":{"id":"replacement","createdAt":1790807698149,"sessionFile":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-L2pc5G-workspace--/2026-09-30T22-34-56-454Z_01a0f474-e446-7245-9ef6-a0c9c4d2a2aa/replacement.jsonl"},"after":[{"id":"replacement-2","createdAt":1790807699596,"sessionFile":"<tmp>/home/.omp/profiles/same-id-replacement/agent/sessions/--tmp-omp-orca-harness-L2pc5G-workspace--/2026-09-30T22-34-56-454Z_01a0f474-e446-7245-9ef6-a0c9c4d2a2aa/replacement-2.jsonl"}],"outcomes":[{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-same-id-replacement-main-2-call-0"},"at":"2026-09-30T22:34:59.642Z"}]}
PROCESS_EXIT 143
PROFILE_REMOVED same-id-replacement
```

### Output: `bun /tmp/gb1-close/gb1-driver.ts fork`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-close/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","fork","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-HhhSwl-workspace--/2026-09-30T22-34-56-568Z_01a0f474-e4b8-71d3-a201-7aea26c50520.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":378}
ZERO_SNAPSHOT {"schema":1,"epoch":"b3d9d5df-6c52-420b-8198-8db49d5348f9","generation":1,"observedAt":"2026-09-30T22:34:57.018Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-HhhSwl-workspace--/2026-09-30T22-34-56-568Z_01a0f474-e4b8-71d3-a201-7aea26c50520.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1822}
RPC_COMMAND /gb1 dump
COMPARE fork {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"7eb1e0270f434d7bc51ac9c0b67ba710ef1c1a9d06840f96dc26f14f9d2cf55e"},"rowListing":{"lines":1,"sha256":"f287f77c975d6928cc739463fc2e01f8de31f6fdfa54acadc294496a03ad6d2e"},"differences":[]}
NATIVE_IDENTITIES [{"id":"original-child","parentId":"Main","kind":"sub","displayName":"blocking","status":"idle","tombstoned":false}]
NATIVE_CAPABILITIES {"registryMethods":["constructor","register","registerIfAvailable","setHistory","setStatus","markResultAccepted","staleAcceptedRuns","setActivity","attachSession","detachSession","unregister","get","list","listVisibleTo","isRunning","syncSessionStatus","onChange"],"contextMethods":{"newSession":"function","switchSession":"function","fork":"undefined","navigateTree":"function","waitForIdle":"function"}}
RPC_COMMAND /gb1 fork
SESSION_TRANSITION {"id":"gb1-5","type":"response","command":"prompt","success":true}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
SWITCH_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"unknown","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 1 of 2; missing: original-child.jsonl"},"nativeListing":{"lines":1,"sha256":"b8136891e27f921b8767d6727496d7efa72de0e89e23fda4c9da00bdee8a7e0f"},"rowListing":{"lines":1,"sha256":"bf603f40bce972ed056c52192d458a5242f5a6eb89962388a90a80db95ba5bcc"},"differences":[]}
SWITCH_RESULT {"pass":true,"oldIds":["original-child"],"newIds":["fork-child"],"oldRoot":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-HhhSwl-workspace--/2026-09-30T22-34-56-568Z_01a0f474-e4b8-71d3-a201-7aea26c50520.jsonl","newRoot":"<tmp>/home/.omp/profiles/fork/agent/sessions/--tmp-omp-orca-harness-HhhSwl-workspace--/2026-09-30T22-34-59-746Z_01a0f474-f122-74aa-818a-3eb1342ba19a.jsonl"}
RPC_COMMAND /gb1 status {"id":"original-child","status":"idle"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"idle","nativeStatus":"idle","pass":true,"admittedIds":["fork-child"]}
RPC_COMMAND /gb1 status {"id":"original-child","status":"running"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"running","nativeStatus":"running","pass":true,"admittedIds":["fork-child"]}
RPC_COMMAND /gb1 status {"id":"original-child","status":"parked"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"parked","nativeStatus":"parked","pass":true,"admittedIds":["fork-child"]}
RPC_COMMAND /gb1 status {"id":"original-child","status":"aborted"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1895}
RPC_COMMAND /gb1 dump
OLD_ROOT_STATUS_RESULT {"status":"aborted","nativeStatus":"aborted","pass":true,"admittedIds":["fork-child"]}
PROCESS_EXIT 143
PROFILE_REMOVED fork
```

### Output: `bun /tmp/gb1-close/gb1-driver.ts parked`

```text
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gb1-native-probe from /tmp/gb1-close/gb1-probe\n","stderr":""}
COMMAND ["omp","--profile","parked","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-QanIvQ-workspace--/2026-09-30T22-34-56-569Z_01a0f474-e4b9-7576-862f-537b37c59fbe.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":380}
ZERO_SNAPSHOT {"schema":1,"epoch":"cb9315eb-e3ce-4cc6-a2d2-1c676195ee00","generation":1,"observedAt":"2026-09-30T22:34:57.001Z","rootSession":{"known":true,"value":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-QanIvQ-workspace--/2026-09-30T22-34-56-569Z_01a0f474-e4b9-7576-862f-537b37c59fbe.jsonl"},"inventory":{"state":"complete"},"children":[]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1799}
RPC_COMMAND /gb1 dump
COMPARE parked {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"c566673a2f90ed846e3d92e5d9f44c4bd99eab651e8915924c73ed141049ec4f"},"rowListing":{"lines":1,"sha256":"f22b6467a0b81dd2d93d490b309605674db7a53c43e7528fa5b5921cbc090bc9"},"differences":[]}
NATIVE_IDENTITIES [{"id":"parked-child","parentId":"Main","kind":"sub","displayName":"task","status":"idle","tombstoned":false}]
RPC_COMMAND /gb1 park {"id":"parked-child"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"schema":"1","bytes":1797}
RPC_COMMAND /gb1 dump
PARKED_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"61c525051d7e22fe7aca9faab94381caf219929817ec3f6a247b376d288d57ce"},"rowListing":{"lines":1,"sha256":"ff523feb11398f3fef2d88018c08126548fc76a50d055896137ac5e1ce5e6747"},"differences":[]}
PARKED_RESULT {"pass":true,"row":{"childId":"parked-child","parentId":"Main","rootSession":"<tmp>/home/.omp/profiles/parked/agent/sessions/--tmp-omp-orca-harness-QanIvQ-workspace--/2026-09-30T22-34-56-569Z_01a0f474-e4b9-7576-862f-537b37c59fbe.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":false,"reason":"resolved model not recorded"},"registryStatus":"parked","tombstoned":false,"outcome":{"state":"failed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-parked-main-0-call-0"},"at":"2026-09-30T22:34:58.476Z"},"milestones":{"responseAt":{"known":false,"reason":"not recorded"},"acceptedAt":{"known":false,"reason":"not recorded"},"terminalAt":{"known":true,"value":"2026-09-30T22:34:58.474Z"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-09-30T22:34:58.474Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":false,"reason":"cwd not recorded"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-09-30T22:34:59.774Z","grantScope":"none"}}
PERSISTED_FACT_RESULT {"pass":false,"childId":"parked-child","snapshotCwd":{"known":false,"reason":"cwd not recorded"},"nativeSessionHeaderCwd":"<tmp>/workspace","snapshotResolvedModel":{"known":false,"reason":"resolved model not recorded"},"nativeModelChange":{"type":"model_change","id":"2ccb630b","parentId":null,"timestamp":"2026-09-30T22:34:58.410Z","model":"stub/scripted","resolvedModelIsFallback":false}}
PROCESS_EXIT 143
PROFILE_REMOVED parked
```

### Output: `bun /tmp/gb1-close/gb1-rerun-advisor.ts advisor-present`

```text
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-rerun-extension.ts"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /gb1 dump
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1853}
RPC_COMMAND /gb1 dump
BEFORE_RESTART_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":0,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"f207de1592517376460be08aced1977476e2a03e10da532e0ccdfd793bb36a7a"},"rowListing":{"lines":1,"sha256":"a1a96614faa72a0e5433729c075cf041c3445a4f88bd2b8b3913308d8e7bbf29"},"differences":[]}
REAL_ADVISOR_TRANSCRIPTS {"advisorRequests":[{"method":"POST","path":"/v1/chat/completions","model":"advisor","agent":"advisor","messages":[{"role":"system","byteLength":5805,"sha256":"e07589e386b1aeee83d8572d95f6e2621e182c65520210563781adc82a8d39d4"},{"role":"user","byteLength":356,"sha256":"9ab308fb1a471ebeabcaf4f051d002760186e381bce93f19e06577d1228a1471"},{"role":"user","byteLength":172,"sha256":"8b4b3aee3da0c282178e93e15175fd8e66d5488b90ffb306ead1a88463c45da2"}],"status":200},{"method":"POST","path":"/v1/chat/completions","model":"advisor","agent":"advisor","messages":[{"role":"system","byteLength":5805,"sha256":"e07589e386b1aeee83d8572d95f6e2621e182c65520210563781adc82a8d39d4"},{"role":"user","byteLength":304,"sha256":"beed3f53744d57c528b63c99e236122632f65d67010788586f1f5474f1121a46"},{"role":"user","byteLength":378,"sha256":"f4da760b0970d58bbb3c5e5e65633e4299f2e3ad6623c55ab9ce0998065c6348"}],"status":200},{"method":"POST","path":"/v1/chat/completions","model":"advisor","agent":"advisor","messages":[{"role":"system","byteLength":5805,"sha256":"e07589e386b1aeee83d8572d95f6e2621e182c65520210563781adc82a8d39d4"},{"role":"user","byteLength":304,"sha256":"beed3f53744d57c528b63c99e236122632f65d67010788586f1f5474f1121a46"},{"role":"user","byteLength":378,"sha256":"f4da760b0970d58bbb3c5e5e65633e4299f2e3ad6623c55ab9ce0998065c6348"},{"role":"assistant","byteLength":54,"sha256":"b57953579cfd650cf2696b4b4f90d01469499ae6bf91c83ffad26770a0e382f3"},{"role":"user","byteLength":105,"sha256":"17b73b44bcca555404ae9f67869fb850201086770a98001020b975cba84afded"}],"status":200}],"transcripts":[{"file":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2/__advisor.jsonl","content":"{\"type\":\"title\",\"v\":1,\"title\":\"\",\"updatedAt\":\"2026-09-30T22:34:56.619Z\",\"pad\":\"                                                                                                                                                                              \"}\n{\"type\":\"session\",\"version\":3,\"id\":\"01a0f474-e4eb-707f-a53a-df25f70bff81\",\"timestamp\":\"2026-09-30T22:34:56.619Z\",\"cwd\":\"<tmp>/workspace\"}\n{\"type\":\"message\",\"id\":\"45f083a8\",\"parentId\":null,\"timestamp\":\"2026-09-30T22:34:56.630Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"### Session update\\n\\n**user**:\\nHARNESS_AGENT=main\\n\"}],\"timestamp\":1790807696616,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"bf2f2de3\",\"parentId\":\"45f083a8\",\"timestamp\":\"2026-09-30T22:34:56.630Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"**agent**:\\n→ task(Ask the advisor) ⇒ ok · 6 lines\\nTool result:\\n```text\\n<task-result id=\\\"advisor-child\\\" agent=\\\"advisor\\\" status=\\\"completed\\\" duration=\\\"158ms\\\">\\n<meta lines=\\\"1\\\" size=\\\"24B\\\" />\\n<output>\\n\\\"advisor recommendation\\\"\\n</output>\\n</task-result>\\n```\\n\\n\\n---\\n\\n[in progress — more steps follow]\"}],\"timestamp\":1790807696616,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"38b14ad2\",\"parentId\":\"bf2f2de3\",\"timestamp\":\"2026-09-30T22:34:56.650Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Harness advisor reply\"}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"advisor\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"stop\",\"timestamp\":1790807696618,\"responseId\":\"chatcmpl-advisor-present-advisor-2\",\"duration\":10.887757999999849,\"ttft\":10.618357999999944}}\n{\"type\":\"message\",\"id\":\"c6c07a8a\",\"parentId\":\"38b14ad2\",\"timestamp\":\"2026-09-30T22:34:56.661Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"### Session update\\n\\n**agent**:\\nadvisor complete\\n\"}],\"timestamp\":1790807696654,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"d79953d8\",\"parentId\":\"c6c07a8a\",\"timestamp\":\"2026-09-30T22:34:57.032Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Harness advisor reply\"}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"advisor\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"stop\",\"timestamp\":1790807696660,\"responseId\":\"chatcmpl-advisor-present-advisor-3\",\"duration\":281.7758839999999,\"ttft\":281.5087189999999}}\n"},{"file":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2/advisor-child/__advisor.jsonl","content":"{\"type\":\"title\",\"v\":1,\"title\":\"\",\"updatedAt\":\"2026-09-30T22:34:56.607Z\",\"pad\":\"                                                                                                                                                                              \"}\n{\"type\":\"session\",\"version\":3,\"id\":\"01a0f474-e4df-7793-82df-b9ce5d52a7f9\",\"timestamp\":\"2026-09-30T22:34:56.607Z\",\"cwd\":\"<tmp>/workspace\"}\n{\"type\":\"message\",\"id\":\"dd90bb41\",\"parentId\":null,\"timestamp\":\"2026-09-30T22:34:56.608Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"### Session update\\n\\n**user**:\\nComplete assignment thoroughly:\\n\\nHARNESS_AGENT=child/advisor advise.\\n\"}],\"timestamp\":1790807696599,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"34909894\",\"parentId\":\"dd90bb41\",\"timestamp\":\"2026-09-30T22:34:56.608Z\",\"message\":{\"role\":\"user\",\"content\":[{\"type\":\"text\",\"text\":\"**agent**:\\nadvisor recommendation\\n→ yield(result) ⇒ ok · 1 line\\nTool result:\\n```text\\nResult submitted.\\n```\\n\"}],\"timestamp\":1790807696599,\"synthetic\":true,\"attribution\":\"agent\"}}\n{\"type\":\"message\",\"id\":\"27366cc0\",\"parentId\":\"34909894\",\"timestamp\":\"2026-09-30T22:34:56.610Z\",\"message\":{\"role\":\"assistant\",\"content\":[{\"type\":\"text\",\"text\":\"Harness advisor reply\"}],\"api\":\"openai-completions\",\"provider\":\"stub\",\"model\":\"advisor\",\"usage\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"totalTokens\":0,\"cost\":{\"input\":0,\"output\":0,\"cacheRead\":0,\"cacheWrite\":0,\"total\":0}},\"stopReason\":\"stop\",\"timestamp\":1790807696605,\"responseId\":\"chatcmpl-advisor-present-advisor-1\",\"duration\":4.265476000000035,\"ttft\":3.6642280000000937}}\n"}]}
PROCESS_EXIT 143
COMMAND ["omp","--profile","advisor-present","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-close/gb1-rerun-extension.ts","--resume","<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2.jsonl"]
READY {"type":"ready","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2.jsonl"}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":465}
RPC_COMMAND /gb1 dump
AFTER_RESTART_COMPARE {"pass":true,"expectedCount":0,"expectedInventory":"unknown","nativeChildren":0,"rows":0,"advisors":0,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"},"nativeListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"rowListing":{"lines":0,"sha256":"4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"},"differences":[]}
RESTORE_RESULT {"epochChanged":true,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"},"nativeTranscriptCount":1,"nativeRefCount":0,"missingCount":1,"outcomes":[]}
ADVISOR_WALK_BEFORE_RESTORE {"totalTranscriptCount":3,"ordinaryTranscriptCount":1,"advisorTranscriptCount":2,"inventory":{"state":"unknown","reason":"registry not fully restored: 0 of 1; missing: advisor-child.jsonl"}}
RPC_COMMAND /gb1 native-read {"id":"advisor-child"}
NATIVE_RESTORE_READ {"type":"native-read","id":"advisor-child","result":{"content":[{"type":"text","text":"\"advisor recommendation\""}],"details":{"totalLines":1,"displayContent":{"text":"\"advisor recommendation\"","startLine":1,"lineNumbers":[1]},"fileSize":24,"meta":{"source":{"type":"internal","value":"agent://advisor-child"}},"resolvedPath":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2/advisor-child.md","contentType":"text/markdown"}},"registered":true}
RPC_COMMAND /observer serve
GET /v1/snapshot {"status":200,"bytes":1717}
RPC_COMMAND /gb1 dump
COMPLETE_RESTORE_COMPARE {"pass":true,"expectedCount":1,"expectedInventory":"complete","nativeChildren":1,"rows":1,"advisors":2,"inventory":{"state":"complete"},"nativeListing":{"lines":1,"sha256":"a08650e02cd78587866f7a135bdd14f9e46d29b2cb4908db043ebe51cd5cc904"},"rowListing":{"lines":1,"sha256":"6c5f9abd1f2beebeaa82cb79c0b7df58f3ece9830cb8852ac3390908fe68165a"},"differences":[]}
NATIVE_ADVISOR_REFS [{"id":"Main/advisor","kind":"advisor","status":"parked","session":null,"parentId":"Main","sessionFile":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2/__advisor.jsonl"},{"id":"advisor-child/advisor","kind":"advisor","status":"parked","session":null,"parentId":"advisor-child","sessionFile":"<tmp>/home/.omp/profiles/advisor-present/agent/sessions/--tmp-omp-orca-harness-HzyfbO-workspace--/2026-09-30T22-34-56-089Z_01a0f474-e2d9-74cb-87c4-388e7c86d1c2/advisor-child/__advisor.jsonl"}]
ADVISOR_PAGE_ROUTE {"command":"GET /v1/children/Main%2Fadvisor/page","status":404,"body":"Not Found"}
ADVISOR_PAGE_ROUTE {"command":"GET /v1/children/advisor-child%2Fadvisor/page","status":404,"body":"Not Found"}
RPC_COMMAND /gb1 cap {"repo":"$PWD","limit":256,"ids":["Main/advisor","advisor-child/advisor"]}
ADVISOR_ADMISSION {"type":"cap","limit":256,"inventory":{"state":"complete"},"rows":1,"ids":["advisor-child"],"admissions":[{"id":"Main/advisor","sessionFile":null},{"id":"advisor-child/advisor","sessionFile":null}]}
ADVISOR_RESULT {"pass":true,"advisorIds":["Main/advisor","advisor-child/advisor"],"snapshotIds":["advisor-child"],"inventory":{"state":"complete"},"totalTranscriptCount":3,"ordinaryTranscriptCount":1,"advisorTranscriptCount":2,"pageResponses":[{"id":"Main/advisor","status":404,"body":"Not Found"},{"id":"advisor-child/advisor","status":404,"body":"Not Found"}]}
PROCESS_EXIT 143
PROFILE_REMOVED advisor-present
```

### GB1-R5 output: `bun /tmp/gb1-close/gb1-rerun-reader-launch.ts`

Complete normalized output: all 34 maxBytes=16 STEP lines are verbatim. For maxBytes 0/1, only intermediate scans differing solely in step/scannedTo/cursor/read offset are collapsed into first/last lines plus counts; each newline-ending and EOF step is verbatim. `SCAN_RUN` lines are compactor annotations, not reader output. Raw normalized reader output SHA-256: `a4b467098183a1de541ff6f9b6331a662d729f6bd9c41b4a281ed6c44129360c`.

Orchestrator authorization (2026-09-30): this lossless counter-varying encoding is accepted for the 0/1-byte scan runs; the gb1 reviewer expanded all six ranges to 1,032 STEP records and reproduced the raw-output SHA-256 above.

```text
COMMAND Bun.spawn(["bun", "/tmp/gb1-close/gb1-rerun-reader.ts", "$PWD"], { cwd: "<tmp>/workspace", env: harnessDisposableEnv })
FIXTURE {"file":"$PWD/omp-orca-observer/checks/harness/fixtures/small.jsonl","totalBytes":498,"firstRecordBytes":100}
STEP {"maxBytes":16,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":16,"cursor":16,"payloadBytes":0,"reads":[{"offset":0,"length":16}]}
STEP {"maxBytes":16,"step":1,"kind":"record_too_large","start":0,"end":null,"scannedTo":32,"cursor":32,"payloadBytes":0,"reads":[{"offset":16,"length":16}]}
STEP {"maxBytes":16,"step":2,"kind":"record_too_large","start":0,"end":null,"scannedTo":48,"cursor":48,"payloadBytes":0,"reads":[{"offset":32,"length":16}]}
STEP {"maxBytes":16,"step":3,"kind":"record_too_large","start":0,"end":null,"scannedTo":64,"cursor":64,"payloadBytes":0,"reads":[{"offset":48,"length":16}]}
STEP {"maxBytes":16,"step":4,"kind":"record_too_large","start":0,"end":null,"scannedTo":80,"cursor":80,"payloadBytes":0,"reads":[{"offset":64,"length":16}]}
STEP {"maxBytes":16,"step":5,"kind":"record_too_large","start":0,"end":null,"scannedTo":96,"cursor":96,"payloadBytes":0,"reads":[{"offset":80,"length":16}]}
STEP {"maxBytes":16,"step":6,"kind":"record_too_large","start":0,"end":100,"scannedTo":112,"cursor":100,"payloadBytes":0,"reads":[{"offset":96,"length":16}]}
STEP {"maxBytes":16,"step":7,"kind":"record_too_large","start":100,"end":null,"scannedTo":116,"cursor":116,"payloadBytes":0,"reads":[{"offset":100,"length":16}]}
STEP {"maxBytes":16,"step":8,"kind":"record_too_large","start":100,"end":null,"scannedTo":132,"cursor":132,"payloadBytes":0,"reads":[{"offset":116,"length":16}]}
STEP {"maxBytes":16,"step":9,"kind":"record_too_large","start":100,"end":null,"scannedTo":148,"cursor":148,"payloadBytes":0,"reads":[{"offset":132,"length":16}]}
STEP {"maxBytes":16,"step":10,"kind":"record_too_large","start":100,"end":null,"scannedTo":164,"cursor":164,"payloadBytes":0,"reads":[{"offset":148,"length":16}]}
STEP {"maxBytes":16,"step":11,"kind":"record_too_large","start":100,"end":null,"scannedTo":180,"cursor":180,"payloadBytes":0,"reads":[{"offset":164,"length":16}]}
STEP {"maxBytes":16,"step":12,"kind":"record_too_large","start":100,"end":null,"scannedTo":196,"cursor":196,"payloadBytes":0,"reads":[{"offset":180,"length":16}]}
STEP {"maxBytes":16,"step":13,"kind":"record_too_large","start":100,"end":null,"scannedTo":212,"cursor":212,"payloadBytes":0,"reads":[{"offset":196,"length":16}]}
STEP {"maxBytes":16,"step":14,"kind":"record_too_large","start":100,"end":null,"scannedTo":228,"cursor":228,"payloadBytes":0,"reads":[{"offset":212,"length":16}]}
STEP {"maxBytes":16,"step":15,"kind":"record_too_large","start":100,"end":null,"scannedTo":244,"cursor":244,"payloadBytes":0,"reads":[{"offset":228,"length":16}]}
STEP {"maxBytes":16,"step":16,"kind":"record_too_large","start":100,"end":null,"scannedTo":260,"cursor":260,"payloadBytes":0,"reads":[{"offset":244,"length":16}]}
STEP {"maxBytes":16,"step":17,"kind":"record_too_large","start":100,"end":null,"scannedTo":276,"cursor":276,"payloadBytes":0,"reads":[{"offset":260,"length":16}]}
STEP {"maxBytes":16,"step":18,"kind":"record_too_large","start":100,"end":280,"scannedTo":292,"cursor":280,"payloadBytes":0,"reads":[{"offset":276,"length":16}]}
STEP {"maxBytes":16,"step":19,"kind":"record_too_large","start":280,"end":null,"scannedTo":296,"cursor":296,"payloadBytes":0,"reads":[{"offset":280,"length":16}]}
STEP {"maxBytes":16,"step":20,"kind":"record_too_large","start":280,"end":null,"scannedTo":312,"cursor":312,"payloadBytes":0,"reads":[{"offset":296,"length":16}]}
STEP {"maxBytes":16,"step":21,"kind":"record_too_large","start":280,"end":null,"scannedTo":328,"cursor":328,"payloadBytes":0,"reads":[{"offset":312,"length":16}]}
STEP {"maxBytes":16,"step":22,"kind":"record_too_large","start":280,"end":null,"scannedTo":344,"cursor":344,"payloadBytes":0,"reads":[{"offset":328,"length":16}]}
STEP {"maxBytes":16,"step":23,"kind":"record_too_large","start":280,"end":null,"scannedTo":360,"cursor":360,"payloadBytes":0,"reads":[{"offset":344,"length":16}]}
STEP {"maxBytes":16,"step":24,"kind":"record_too_large","start":280,"end":null,"scannedTo":376,"cursor":376,"payloadBytes":0,"reads":[{"offset":360,"length":16}]}
STEP {"maxBytes":16,"step":25,"kind":"record_too_large","start":280,"end":null,"scannedTo":392,"cursor":392,"payloadBytes":0,"reads":[{"offset":376,"length":16}]}
STEP {"maxBytes":16,"step":26,"kind":"record_too_large","start":280,"end":null,"scannedTo":408,"cursor":408,"payloadBytes":0,"reads":[{"offset":392,"length":16}]}
STEP {"maxBytes":16,"step":27,"kind":"record_too_large","start":280,"end":null,"scannedTo":424,"cursor":424,"payloadBytes":0,"reads":[{"offset":408,"length":16}]}
STEP {"maxBytes":16,"step":28,"kind":"record_too_large","start":280,"end":null,"scannedTo":440,"cursor":440,"payloadBytes":0,"reads":[{"offset":424,"length":16}]}
STEP {"maxBytes":16,"step":29,"kind":"record_too_large","start":280,"end":null,"scannedTo":456,"cursor":456,"payloadBytes":0,"reads":[{"offset":440,"length":16}]}
STEP {"maxBytes":16,"step":30,"kind":"record_too_large","start":280,"end":null,"scannedTo":472,"cursor":472,"payloadBytes":0,"reads":[{"offset":456,"length":16}]}
STEP {"maxBytes":16,"step":31,"kind":"record_too_large","start":280,"end":null,"scannedTo":488,"cursor":488,"payloadBytes":0,"reads":[{"offset":472,"length":16}]}
STEP {"maxBytes":16,"step":32,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":488,"length":10}]}
STEP {"maxBytes":16,"step":33,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":16,"pass":true,"readBound":16,"maximumRead":16,"steps":34,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"recordEnds":[100,280,498],"expectedEnds":[100,280,498],"allRecordsEnded":true,"ended":true,"emptyNonEnd":0}
SCAN_RUN {"maxBytes":1,"start":0,"steps":99,"firstStep":0,"lastStep":98,"omitted":97,"varyingOnly":["step","scannedTo","cursor","reads.offset"]}
STEP {"maxBytes":1,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":1,"cursor":1,"payloadBytes":0,"reads":[{"offset":0,"length":1}]}
STEP {"maxBytes":1,"step":98,"kind":"record_too_large","start":0,"end":null,"scannedTo":99,"cursor":99,"payloadBytes":0,"reads":[{"offset":98,"length":1}]}
STEP {"maxBytes":1,"step":99,"kind":"record_too_large","start":0,"end":100,"scannedTo":100,"cursor":100,"payloadBytes":0,"reads":[{"offset":99,"length":1}]}
SCAN_RUN {"maxBytes":1,"start":100,"steps":179,"firstStep":100,"lastStep":278,"omitted":177,"varyingOnly":["step","scannedTo","cursor","reads.offset"]}
STEP {"maxBytes":1,"step":100,"kind":"record_too_large","start":100,"end":null,"scannedTo":101,"cursor":101,"payloadBytes":0,"reads":[{"offset":100,"length":1}]}
STEP {"maxBytes":1,"step":278,"kind":"record_too_large","start":100,"end":null,"scannedTo":279,"cursor":279,"payloadBytes":0,"reads":[{"offset":278,"length":1}]}
STEP {"maxBytes":1,"step":279,"kind":"record_too_large","start":100,"end":280,"scannedTo":280,"cursor":280,"payloadBytes":0,"reads":[{"offset":279,"length":1}]}
SCAN_RUN {"maxBytes":1,"start":280,"steps":217,"firstStep":280,"lastStep":496,"omitted":215,"varyingOnly":["step","scannedTo","cursor","reads.offset"]}
STEP {"maxBytes":1,"step":280,"kind":"record_too_large","start":280,"end":null,"scannedTo":281,"cursor":281,"payloadBytes":0,"reads":[{"offset":280,"length":1}]}
STEP {"maxBytes":1,"step":496,"kind":"record_too_large","start":280,"end":null,"scannedTo":497,"cursor":497,"payloadBytes":0,"reads":[{"offset":496,"length":1}]}
STEP {"maxBytes":1,"step":497,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":497,"length":1}]}
STEP {"maxBytes":1,"step":498,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":1,"pass":true,"readBound":1,"maximumRead":1,"steps":499,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"recordEnds":[100,280,498],"expectedEnds":[100,280,498],"allRecordsEnded":true,"ended":true,"emptyNonEnd":0}
SCAN_RUN {"maxBytes":0,"start":0,"steps":99,"firstStep":0,"lastStep":98,"omitted":97,"varyingOnly":["step","scannedTo","cursor","reads.offset"]}
STEP {"maxBytes":0,"step":0,"kind":"record_too_large","start":0,"end":null,"scannedTo":1,"cursor":1,"payloadBytes":0,"reads":[{"offset":0,"length":1}]}
STEP {"maxBytes":0,"step":98,"kind":"record_too_large","start":0,"end":null,"scannedTo":99,"cursor":99,"payloadBytes":0,"reads":[{"offset":98,"length":1}]}
STEP {"maxBytes":0,"step":99,"kind":"record_too_large","start":0,"end":100,"scannedTo":100,"cursor":100,"payloadBytes":0,"reads":[{"offset":99,"length":1}]}
SCAN_RUN {"maxBytes":0,"start":100,"steps":179,"firstStep":100,"lastStep":278,"omitted":177,"varyingOnly":["step","scannedTo","cursor","reads.offset"]}
STEP {"maxBytes":0,"step":100,"kind":"record_too_large","start":100,"end":null,"scannedTo":101,"cursor":101,"payloadBytes":0,"reads":[{"offset":100,"length":1}]}
STEP {"maxBytes":0,"step":278,"kind":"record_too_large","start":100,"end":null,"scannedTo":279,"cursor":279,"payloadBytes":0,"reads":[{"offset":278,"length":1}]}
STEP {"maxBytes":0,"step":279,"kind":"record_too_large","start":100,"end":280,"scannedTo":280,"cursor":280,"payloadBytes":0,"reads":[{"offset":279,"length":1}]}
SCAN_RUN {"maxBytes":0,"start":280,"steps":217,"firstStep":280,"lastStep":496,"omitted":215,"varyingOnly":["step","scannedTo","cursor","reads.offset"]}
STEP {"maxBytes":0,"step":280,"kind":"record_too_large","start":280,"end":null,"scannedTo":281,"cursor":281,"payloadBytes":0,"reads":[{"offset":280,"length":1}]}
STEP {"maxBytes":0,"step":496,"kind":"record_too_large","start":280,"end":null,"scannedTo":497,"cursor":497,"payloadBytes":0,"reads":[{"offset":496,"length":1}]}
STEP {"maxBytes":0,"step":497,"kind":"record_too_large","start":280,"end":498,"scannedTo":498,"cursor":498,"payloadBytes":0,"reads":[{"offset":497,"length":1}]}
STEP {"maxBytes":0,"step":498,"kind":"page","atEnd":true,"cursor":498,"payloadBytes":0,"reads":[{"offset":498,"length":0}]}
RESULT {"maxBytes":0,"pass":true,"readBound":1,"maximumRead":1,"steps":499,"bounded":true,"monotone":true,"oversized":false,"firstEnd":100,"expectedFirstEnd":100,"recordEnds":[100,280,498],"expectedEnds":[100,280,498],"allRecordsEnded":true,"ended":true,"emptyNonEnd":0}

EXIT 0
PROFILE_REMOVED
```

### Output verification receipt

Command: `bun /tmp/gb1-close/verify-output.ts`. Source is embedded in the closure annex.

```text
VERIFY_OUTPUT {"pass":true,"comparisonRecords":21,"readerStepRecords":1032,"readerSteps":{"0":499,"1":499,"16":34},"nativeRestoredCwdVerdict":"FAIL-open","nativeRestoredModelVerdict":"PASS","syntheticParkingExcluded":true}
```

## Closure disposition and scoped check receipts

| Finding | Disposition |
|---|---|
| GB1-R1 | Closed: final comparator and exact materializer retained; all seven requested restoration/transition/parking runs freshly recorded, 21 comparison records PASS; historical source loss disclosed |
| GB1-R2 | Evidence gap closed; native restored cwd acceptance **FAIL (open, needs niko's decision)**. Exact snapshot/header/model entries retained; native restored modelRole/resolvedModel PASS via history. Synthetic parking excluded from verdict |
| GB1-R3 | Closed: component cap PASS separated from live-endpoint >256-child **UNVERIFIED** |
| GB1-R4 | Closed: direct adapted-source copy recipe; extractor explicitly historical, not invoked |
| GB1-R5 | Closed: reader launch run once; complete normalized output retained with every 16-byte STEP and lossless permitted scan compaction at 0/1 bytes; historical full-output loss disclosed |

| Command | Tested state | Result | Limitation |
|---|---|---|---|
| `bun /tmp/gb1-close/materialize.ts` | Retained sources and exact closure adaptations | passed | Generates only disposable probe files |
| `bun /tmp/gb1-close/gb1-restart.ts resume` | Live, 0/1 refs after restart, native bulk restore | passed | Registry/inventory comparisons; native cwd acceptance FAIL-open |
| `bun /tmp/gb1-close/gb1-restart.ts cold-restart` | Live, 0/3 refs after restart, native bulk restore | passed | No 1–2-ref checkpoint; native cwd acceptance FAIL-open |
| `bun /tmp/gb1-close/gb1-restart.ts partial-restore` | Live, 0/135 refs after restart, native bulk restore | passed | No 1–134-ref checkpoint; native cwd acceptance FAIL-open |
| `bun /tmp/gb1-close/gb1-driver.ts same-id-replacement` | Native suffix allocation, old transcript missing ref | passed | Native same-id reuse not exercised |
| `bun /tmp/gb1-close/gb1-driver.ts fork` | New root, missing copied old transcript, all old-root statuses | passed | Comparator/identity scope, not full restored cwd fidelity |
| `bun /tmp/gb1-close/gb1-driver.ts parked` | Live row followed by manual session-null re-registration | passed | Synthetic parked state only; persisted unknown model output excluded from native verdict |
| `bun /tmp/gb1-close/gb1-rerun-advisor.ts advisor-present` | Native restart/restoration and real parked advisors | passed | One ordinary child, not endpoint over-cap |
| `bun /tmp/gb1-close/gb1-rerun-reader-launch.ts` | Native parser + fixed reader, maxBytes 16/1/0, 498-byte fixture | passed | Newline-terminated fixture, these three bounds only |
| `bun /tmp/gb1-close/verify-output.ts` | All fresh output and restricted compaction | passed | 21 comparisons, 1,032 original STEP records; no product mutation |
| Live endpoint above 256 children | Not present in an authorized scenario | not run (no scenario above cap) | **UNVERIFIED**; no product change allowed |
| Project-wide builds/tests/formatters/linters | Outside worker assignment | not run (orchestrator-owned) | No installs, fixes, commits or pushes |

Deleted consequential claims: blanket restored field-fidelity PASS and unconditional endpoint-cap PASS. Historical comparator/extractor sources and outputs remain, explicitly labelled historical; no production/support code was deleted.

### Retained-source integrity smoke

Exact command: `bun /tmp/gb1-close/integrity.ts && bun /tmp/gb1-close/verify-reconstructed.ts`. This independently checks the embedded final comparator and materializer against their executed before-cleanup files, recreates the verifier directly from this evidence, and successfully runs that reconstructed verifier. It does not re-run the reader.

### Source `/tmp/gb1-close/integrity.ts`

```ts
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
const evidence = await readFile('omp-orca-observer/checks/evidence/gb1.md', 'utf8');
for (const name of ['gb1-compare.ts', 'materialize.ts', 'verify-output.ts']) {
  const heading = evidence.indexOf('### ' + (name === 'gb1-compare.ts' ? 'Final comparator source' : 'Source') + ' `/tmp/gb1-close/' + name + '`');
  assert.ok(heading >= 0);
  const start = evidence.indexOf('```ts\n', heading) + 6;
  const end = evidence.indexOf('\n```', start);
  assert.ok(start >= 6 && end > start);
  const source = evidence.slice(start, end) + '\n';
  if (name !== 'verify-output.ts') assert.equal(source, await readFile('/tmp/gb1-close/' + name, 'utf8'));
  else await writeFile('/tmp/gb1-close/verify-reconstructed.ts', source);
  console.log('RETAINED_SOURCE', name, createHash('sha256').update(source).digest('hex'));
}
```

```text
RETAINED_SOURCE gb1-compare.ts e61348dfb8106457799b05339095cd71de285a02ec1ff12e724890dc6b9feb11
RETAINED_SOURCE materialize.ts 70cacd3bfdd50bab9dc393078fc31bf37009bfc43ce6ec2bd66bddb1cc3e9857
RETAINED_SOURCE verify-output.ts 859f66ebc04f5249353c399e693fe43d35bca3f4df3d2368a38d9330e0b3c338
VERIFY_OUTPUT {"pass":true,"comparisonRecords":21,"readerStepRecords":1032,"readerSteps":{"0":499,"1":499,"16":34},"nativeRestoredCwdVerdict":"FAIL-open","nativeRestoredModelVerdict":"PASS","syntheticParkingExcluded":true}
```

Check receipt: `bun /tmp/gb1-close/integrity.ts && bun /tmp/gb1-close/verify-reconstructed.ts | embedded versus executed closure source + reconstructed output verifier | passed | exact source fidelity and output assertions, not full product acceptance`.

### Closure integrity and cleanup receipt

The complete owned before/after delta was inspected with `diff -u /tmp/gb1-close-before.md omp-orca-observer/checks/evidence/gb1.md` (exit 1 means differences, not a gate failure). Baseline SHA-256 is recorded above; the delta is retained in this session's tool artifact `artifact://279`. No rollback against HEAD or user work was performed.

`sha256sum omp-orca-observer/stock-source.ts omp-orca-observer/index.ts omp-orca-observer/checks/harness/profile.ts` returned identical values before and after the closure runs:

```text
03e3081fa486a65832228d35fa766eed2c449b601e69723d1ed5d36a646f4555  omp-orca-observer/stock-source.ts
7212c20e2ae12b7e1b09013284664f84b9e08097bbaa00c149cc93153dfe9b44  omp-orca-observer/index.ts
4d9b3ce0319f5b8efa8b2d3d1c3d6b07449b4c937ca35135577b16e2799d572b  omp-orca-observer/checks/harness/profile.ts
```

Exact cleanup command: `rm -rf /tmp/gb1-close /tmp/gb1-close-before.md`, exit 0. The subsequent exact-path glob returned `Path not found: /tmp/gb1-close, /tmp/gb1-close-before.md`. All owned scripts, extensions, package, output/capture files, intermediate annexes and before-image are deleted. Every disposable harness profile was torn down by its driver. Comparator/materializer/verifier source, complete normalized outputs and recovery digest remain embedded here.

**Final disposition:** all five review evidence findings are closed. Native restored cwd fidelity remains **FAIL (open, needs niko's decision)**; native restored model fields PASS through registry history. Live endpoint above 256 children remains **UNVERIFIED**. No product/check/harness fix was made.


## Re-run after cd7fff0 — 2026-09-30

Dispatch `Gb1CwdRegate`; sole criterion is V02.1 native restored-child persisted cwd. Input commit: `cd7fff0d94a5f11099cddf277171a1f723afe201`. Exclusive write ownership is this evidence file; only the named final matrix row is updated, with all historical results and the historical closure ledger unchanged.

Recovery: exact before-image `/tmp/gb1-cwd-regate-before.md`, SHA-256 `66889a50215e65c059b9252ae5f31dad2db8e357c1ca0447eb38fff2a1b52b5b`. Observed input SHA-256: `stock-source.ts` `83fa92432df28276775a8d23cd11b767b5cda68abb4d73df4668e02dc3606a51`; `index.ts` `abdaccc120369925216513fa1fde28a714faa8acc93b6c1eaab2c3735fdac381`; harness `profile.ts` `4d9b3ce0319f5b8efa8b2d3d1c3d6b07449b4c937ca35135577b16e2799d572b`.

Method: the existing `one-child` harness scenario runs under a persistent `profile.spawn(["--mode","rpc",…])` parent and local stub provider. Restart uses native `--resume <root>`; the probe calls the main session's native read tool with `agent://child-one`, without constructing or modifying registry refs. A disposable equivalent of the harness fs probe wraps the synchronous fs calls used by the current stock source; stack attribution selects only `/omp-orca-observer/stock-source.ts`, and `/proc/self/fd` resolves each read's actual transcript path. It records observer opens, bounded reads, and whole-file reads, with no new product behavior. The extension installs the probe during module evaluation, before session-start collection. Driver transcript oracle reads happen in a separate process and cannot count as observer I/O. Exact throwaway sources, invocation and normalized output are retained below after execution.

No source/check/harness edits, native registry mutation, installs, Orca commands, linters, formatters, commits or project-wide checks. Contract inspected: `stock-source-native-scope`; schema boundary `schema-v1-frozen` remains unchanged. `ncm list` found zero contracts applying to this evidence file.

### Initial oracle stop; completed scenario follows

Command `bun /tmp/gb1-cwd-regate.ts` exited 1 before any GET: the physical first line was `type:"title"`, not `type:"session"`. Both pre-viewer checkpoints had empty observer open/read logs. This run is not an acceptance result. The original driver is retained as `/tmp/gb1-cwd-initial.ts` source below (it was invoked under the original `gb1-cwd-regate.ts` name). The completed driver keeps the cwd equality assertion but moves it after all snapshots and read-log receipts; it records both the physical first line and the actual native session header. No transcript, registry or source is altered to manufacture a pass.

### Source `/tmp/gb1-cwd-initial.ts` (initial invocation name: `/tmp/gb1-cwd-regate.ts`)

SHA-256 `61512927760a571b0803de0e4d54151c1bad3ebc95861a4a0588191e8bf0a995`.

```ts
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const profile = await create('one-child');
const eventFile = join(profile.root, 'tmp/gb1-cwd-events.jsonl');
let child, stdoutTask, stderrTask;
let events = [];
let serial = 0;
const pending = new Map();
const output = [];
function emit(label, value) {
  const line = (label + ' ' + (typeof value === 'string' ? value : JSON.stringify(value)))
    .replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD')
    .replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  output.push(line);
  console.log(line);
}
async function trace() {
  try { return (await readFile(eventFile, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function until(fn, label) {
  const deadline = Date.now() + 45000;
  for (; ;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() > deadline) throw new Error('Timeout: ' + label);
    await Bun.sleep(25);
  }
}
async function request(type, fields) {
  const id = 'gb1cwd-' + ++serial;
  const gate = Promise.withResolvers();
  const timer = setTimeout(() => gate.reject(new Error('RPC timeout: ' + type)), 45000);
  pending.set(id, value => { clearTimeout(timer); gate.resolve(value); });
  child.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
  const response = await gate.promise;
  assert.equal(response.success, true, JSON.stringify(response));
  return response;
}
async function prompt(message) {
  emit('RPC_COMMAND', message);
  const response = await request('prompt', { message });
  await until(() => events.some(event => event.type === 'prompt_result' && event.id === response.id), message);
}
async function start(root) {
  const before = (await trace()).filter(event => event.type === 'ready').length;
  events = [];
  const args = ['--mode', 'rpc', '--no-lsp', '--no-title', '--model', 'stub/scripted', '-e', '/tmp/gb1-cwd-extension.ts', ...(root ? ['--resume', root] : [])];
  emit('COMMAND', ['omp', '--profile', 'one-child', ...args]);
  child = profile.spawn(args);
  const current = child;
  stdoutTask = (async () => {
    const reader = current.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (; ;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        let event;
        try { event = JSON.parse(line); } catch { emit('NON_RPC_OUTPUT', line); continue; }
        events.push(event);
        if (event.type === 'response') { pending.get(event.id)?.(event); pending.delete(event.id); }
        if (event.type === 'tool_execution_end' && event.isError) emit('TOOL_ERROR', event);
      }
    }
  })();
  stderrTask = (async () => { const text = await new Response(current.stderr).text(); if (text.trim()) emit('STDERR', text); })();
  const ready = await until(async () => (await trace()).filter(event => event.type === 'ready')[before], 'native session ready');
  emit('READY', ready);
  return ready;
}
async function facts() {
  const before = (await trace()).filter(event => event.type === 'facts').length;
  await prompt('/gb1cwd facts');
  return await until(async () => (await trace()).filter(event => event.type === 'facts')[before], 'native facts');
}
async function stop() {
  child.kill();
  emit('PROCESS_EXIT', await child.exited);
  await Promise.all([stdoutTask, stderrTask]);
  child = null;
}
try {
  const firstReady = await start();
  await prompt('HARNESS_AGENT=main');
  await until(async () => (await trace()).some(event => event.type === 'lifecycle' && event.value.id === 'child-one' && event.value.status === 'completed'), 'completed native child');
  const live = await facts();
  assert.equal(live.refs.length, 1);
  emit('BEFORE_RESTART_NATIVE', live);
  await stop();
  await start(firstReady.root);
  const cold = await facts();
  assert.equal(cold.refs.length, 0);
  emit('COLD_NATIVE', cold);
  const beforeRead = (await trace()).filter(event => event.type === 'native-read').length;
  await prompt('/gb1cwd native-read child-one');
  const restored = await until(async () => (await trace()).filter(event => event.type === 'native-read')[beforeRead], 'native child restoration');
  assert.equal(restored.refs.length, 1);
  assert.equal(restored.refs[0].status, 'parked');
  assert.equal(restored.refs[0].session, null);
  emit('NATIVE_RESTORE_READ', restored);
  await Bun.sleep(1200);
  const preServe = await facts();
  assert.deepEqual(preServe.reads, []);
  assert.deepEqual(preServe.opens, []);
  assert.deepEqual(preServe.wholeFileReads, []);
  emit('BEFORE_SERVE_NO_VIEWER', preServe);
  const notificationCount = (await trace()).filter(event => event.type === 'notification').length;
  await prompt('/observer serve');
  const endpoint = await until(async () => (await trace()).filter(event => event.type === 'notification').slice(notificationCount).find(event => /^http:/.test(event.message)), 'observer endpoint');
  await Bun.sleep(1200);
  const preSnapshot = await facts();
  assert.deepEqual(preSnapshot.reads, []);
  assert.deepEqual(preSnapshot.opens, []);
  assert.deepEqual(preSnapshot.wholeFileReads, []);
  emit('BEFORE_SNAPSHOT_NO_VIEWER', preSnapshot);
  const file = restored.refs[0].sessionFile;
  const text = await readFile(file, 'utf8');
  const header = JSON.parse(text.slice(0, text.indexOf('\n')));
  assert.equal(header.type, 'session');
  assert.equal(header.cwd, profile.workspace);
  emit('TRANSCRIPT_FIRST_LINE', { file, header, oracleProcess: 'driver; not observer' });
  const snapshots = [];
  for (let ordinal = 1; ordinal <= 3; ordinal++) {
    const response = await fetch(new URL('/v1/snapshot', endpoint.message));
    const snapshot = await response.json();
    assert.equal(response.status, 200);
    assert.equal(snapshot.children.length, 1);
    snapshots.push(snapshot);
    emit('GET /v1/snapshot', { ordinal, status: response.status, schema: response.headers.get('x-observer-schema'), inventory: snapshot.inventory, childId: snapshot.children[0].childId, snapshotCwd: snapshot.children[0].lineage.cwd });
    await Bun.sleep(1200);
  }
  assert.deepEqual(snapshots[1].children[0].lineage.cwd, { known: true, value: header.cwd });
  assert.deepEqual(snapshots[2].children[0].lineage.cwd, { known: true, value: header.cwd });
  const after = await facts();
  assert.deepEqual(after.reads, [{ path: file, offset: 0, length: 4096, bytesRead: Math.min(Buffer.byteLength(text), 4096) }]);
  assert.deepEqual(after.opens, [{ path: file, flags: 'r' }]);
  assert.deepEqual(after.wholeFileReads, []);
  assert.equal(after.refs[0].createdAt, restored.refs[0].createdAt);
  emit('AFTER_SNAPSHOTS_READ_LOG', after);
  emit('RESTORED_FIELD_FACTS', { childId: 'child-one', status: after.refs[0].status, session: after.refs[0].session, snapshotCwd: snapshots[1].children[0].lineage.cwd, transcriptHeader: header });
  emit('V02_RESTORED_CWD_RESULT', { pass: true, nativeRestore: true, preSnapshotObserverOpens: 0, preSnapshotObserverReads: 0, acceptedSnapshotOrdinal: 2, observerHeaderReads: after.reads.length, requestedReadBytes: after.reads[0].length, additionalSnapshotUsesCache: true });
  await stop();
} catch (error) {
  emit('DRIVER_ERROR', String(error));
  emit('LAST_TRACE', (await trace()).slice(-8));
  process.exitCode = 1;
} finally {
  if (child) { child.kill(); await child.exited; await Promise.all([stdoutTask, stderrTask]); }
  await profile.teardown();
  emit('PROFILE_REMOVED', 'one-child');
  await writeFile('/tmp/gb1-cwd-regate.out', output.join('\n') + '\n');
}
```

### Initial complete normalized output

Command: `bun /tmp/gb1-cwd-regate.ts`; exit 1. SHA-256 `05d8690a13f6aa3acd3c4395b562c3546204a0202f04588794ed54b86da21d9e`.

```text
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-cwd-extension.ts"]
READY {"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /gb1cwd facts
BEFORE_RESTART_NATIVE {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"idle","session":"live","sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667735,"history":{"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
PROCESS_EXIT 143
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-cwd-extension.ts","--resume","<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl"]
READY {"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl"}
RPC_COMMAND /gb1cwd facts
COLD_NATIVE {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
RPC_COMMAND /gb1cwd native-read child-one
NATIVE_RESTORE_READ {"type":"native-read","id":"child-one","result":{"content":[{"type":"text","text":"\"child complete\""}],"details":{"totalLines":1,"displayContent":{"text":"\"child complete\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://child-one"}},"resolvedPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md","contentType":"text/markdown"}},"refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667708,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}]}
RPC_COMMAND /gb1cwd facts
BEFORE_SERVE_NO_VIEWER {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667708,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
RPC_COMMAND /observer serve
RPC_COMMAND /gb1cwd facts
BEFORE_SNAPSHOT_NO_VIEWER {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667708,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
DRIVER_ERROR AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

'title' !== 'session'

LAST_TRACE [{"type":"lifecycle","value":{"id":"child-one","agent":"blocking","parentToolCallId":"chatcmpl-one-child-main-0-call-0","detached":false,"agentSource":"user","description":"Harness auxiliary reply","status":"completed","sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","index":0}},{"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"idle","session":"live","sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667735,"history":{"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true},{"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl"},{"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[],"reads":[],"opens":[],"wholeFileReads":[],"installed":true},{"type":"native-read","id":"child-one","result":{"content":[{"type":"text","text":"\"child complete\""}],"details":{"totalLines":1,"displayContent":{"text":"\"child complete\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://child-one"}},"resolvedPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md","contentType":"text/markdown"}},"refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667708,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}]},{"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667708,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true},{"type":"notification","message":"http://127.0.0.1:<port>/","level":"info"},{"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.jsonl","createdAt":1790817667708,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-RRsuAf-workspace--/2026-10-01T01-21-07-408Z_01a0f50d-0950-7373-8ea3-3a6d63e2931a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}]
PROFILE_REMOVED one-child
```

### Intervening working-tree run, not a cd7fff0 verdict

The second `bun /tmp/gb1-cwd-regate.ts` run exited 0 and observed known cwd at snapshots 2 and 3. However, after this run HEAD remained `cd7fff0d94a5f11099cddf277171a1f723afe201` while `stock-source.ts` had changed to SHA-256 `cf18b6a334d12514ae9ac4680e22c3b105c60bfc3469a0bce64d99225613b26b` (title-slot fix from another worker). It is therefore an interim working-tree observation, not a stable-input cd7fff0 FAIL or final acceptance PASS. A stable committed re-run follows when the orchestrator provides its commit.

### Source `/tmp/gb1-cwd-regate.ts` (completed driver; also used for stable re-run)

SHA-256 `99f77a2a783798cdeb3ad2291a69b1d14e706cf05026feec87ad057bd7575828`.

```ts
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const { create } = await import(join(process.cwd(), 'omp-orca-observer/checks/harness/profile.ts'));
const profile = await create('one-child');
const eventFile = join(profile.root, 'tmp/gb1-cwd-events.jsonl');
let child, stdoutTask, stderrTask;
let events = [];
let serial = 0;
const pending = new Map();
const output = [];
function emit(label, value) {
  const line = (label + ' ' + (typeof value === 'string' ? value : JSON.stringify(value)))
    .replaceAll(profile.root, '<tmp>').replaceAll(process.cwd(), '$PWD')
    .replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:<port>');
  output.push(line);
  console.log(line);
}
async function trace() {
  try { return (await readFile(eventFile, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}
async function until(fn, label) {
  const deadline = Date.now() + 45000;
  for (; ;) {
    const result = await fn();
    if (result) return result;
    if (Date.now() > deadline) throw new Error('Timeout: ' + label);
    await Bun.sleep(25);
  }
}
async function request(type, fields) {
  const id = 'gb1cwd-' + ++serial;
  const gate = Promise.withResolvers();
  const timer = setTimeout(() => gate.reject(new Error('RPC timeout: ' + type)), 45000);
  pending.set(id, value => { clearTimeout(timer); gate.resolve(value); });
  child.stdin.write(JSON.stringify({ id, type, ...fields }) + '\n');
  const response = await gate.promise;
  assert.equal(response.success, true, JSON.stringify(response));
  return response;
}
async function prompt(message) {
  emit('RPC_COMMAND', message);
  const response = await request('prompt', { message });
  await until(() => events.some(event => event.type === 'prompt_result' && event.id === response.id), message);
}
async function start(root) {
  const before = (await trace()).filter(event => event.type === 'ready').length;
  events = [];
  const args = ['--mode', 'rpc', '--no-lsp', '--no-title', '--model', 'stub/scripted', '-e', '/tmp/gb1-cwd-extension.ts', ...(root ? ['--resume', root] : [])];
  emit('COMMAND', ['omp', '--profile', 'one-child', ...args]);
  child = profile.spawn(args);
  const current = child;
  stdoutTask = (async () => {
    const reader = current.stdout.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    for (; ;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      while (buffer.includes('\n')) {
        const index = buffer.indexOf('\n');
        const line = buffer.slice(0, index); buffer = buffer.slice(index + 1);
        let event;
        try { event = JSON.parse(line); } catch { emit('NON_RPC_OUTPUT', line); continue; }
        events.push(event);
        if (event.type === 'response') { pending.get(event.id)?.(event); pending.delete(event.id); }
        if (event.type === 'tool_execution_end' && event.isError) emit('TOOL_ERROR', event);
      }
    }
  })();
  stderrTask = (async () => { const text = await new Response(current.stderr).text(); if (text.trim()) emit('STDERR', text); })();
  const ready = await until(async () => (await trace()).filter(event => event.type === 'ready')[before], 'native session ready');
  emit('READY', ready);
  return ready;
}
async function facts() {
  const before = (await trace()).filter(event => event.type === 'facts').length;
  await prompt('/gb1cwd facts');
  return await until(async () => (await trace()).filter(event => event.type === 'facts')[before], 'native facts');
}
async function stop() {
  child.kill();
  emit('PROCESS_EXIT', await child.exited);
  await Promise.all([stdoutTask, stderrTask]);
  child = null;
}
try {
  const firstReady = await start();
  await prompt('HARNESS_AGENT=main');
  await until(async () => (await trace()).some(event => event.type === 'lifecycle' && event.value.id === 'child-one' && event.value.status === 'completed'), 'completed native child');
  const live = await facts();
  assert.equal(live.refs.length, 1);
  emit('BEFORE_RESTART_NATIVE', live);
  await stop();
  await start(firstReady.root);
  const cold = await facts();
  assert.equal(cold.refs.length, 0);
  emit('COLD_NATIVE', cold);
  const beforeRead = (await trace()).filter(event => event.type === 'native-read').length;
  await prompt('/gb1cwd native-read child-one');
  const restored = await until(async () => (await trace()).filter(event => event.type === 'native-read')[beforeRead], 'native child restoration');
  assert.equal(restored.refs.length, 1);
  assert.equal(restored.refs[0].status, 'parked');
  assert.equal(restored.refs[0].session, null);
  emit('NATIVE_RESTORE_READ', restored);
  await Bun.sleep(1200);
  const preServe = await facts();
  assert.deepEqual(preServe.reads, []);
  assert.deepEqual(preServe.opens, []);
  assert.deepEqual(preServe.wholeFileReads, []);
  emit('BEFORE_SERVE_NO_VIEWER', preServe);
  const notificationCount = (await trace()).filter(event => event.type === 'notification').length;
  await prompt('/observer serve');
  const endpoint = await until(async () => (await trace()).filter(event => event.type === 'notification').slice(notificationCount).find(event => /^http:/.test(event.message)), 'observer endpoint');
  await Bun.sleep(1200);
  const preSnapshot = await facts();
  assert.deepEqual(preSnapshot.reads, []);
  assert.deepEqual(preSnapshot.opens, []);
  assert.deepEqual(preSnapshot.wholeFileReads, []);
  emit('BEFORE_SNAPSHOT_NO_VIEWER', preSnapshot);
  const file = restored.refs[0].sessionFile;
  const text = await readFile(file, 'utf8');
  const firstLine = JSON.parse(text.slice(0, text.indexOf('\n')));
  const header = text.trim().split('\n').map(line => JSON.parse(line)).find(entry => entry.type === 'session');
  assert.equal(header?.type, 'session');
  assert.equal(header.cwd, profile.workspace);
  emit('TRANSCRIPT_FIRST_TWO_PHYSICAL_LINES', { file, lines: text.split('\n').slice(0, 2), firstLine, sessionHeader: header, oracleProcess: 'driver; not observer' });
  const snapshots = [];
  for (let ordinal = 1; ordinal <= 3; ordinal++) {
    const response = await fetch(new URL('/v1/snapshot', endpoint.message));
    const snapshot = await response.json();
    assert.equal(response.status, 200);
    assert.equal(snapshot.children.length, 1);
    snapshots.push(snapshot);
    emit('GET /v1/snapshot', { ordinal, status: response.status, schema: response.headers.get('x-observer-schema'), inventory: snapshot.inventory, childId: snapshot.children[0].childId, snapshotCwd: snapshot.children[0].lineage.cwd });
    await Bun.sleep(1200);
  }
  const after = await facts();
  assert.deepEqual(after.reads, [{ path: file, offset: 0, length: 4096, bytesRead: Math.min(Buffer.byteLength(text), 4096) }]);
  assert.deepEqual(after.opens, [{ path: file, flags: 'r' }]);
  assert.deepEqual(after.wholeFileReads, []);
  assert.equal(after.refs[0].createdAt, restored.refs[0].createdAt);
  emit('AFTER_SNAPSHOTS_READ_LOG', after);
  emit('RESTORED_FIELD_FACTS', { childId: 'child-one', status: after.refs[0].status, session: after.refs[0].session, snapshotCwd: snapshots[1].children[0].lineage.cwd, transcriptHeader: header });
  const pass = snapshots[1].children[0].lineage.cwd.known === true && snapshots[1].children[0].lineage.cwd.value === header.cwd;
  emit('V02_RESTORED_CWD_RESULT', { pass, nativeRestore: true, firstPhysicalLineType: firstLine.type, preSnapshotObserverOpens: 0, preSnapshotObserverReads: 0, comparedSnapshotOrdinal: 2, observerHeaderReads: after.reads.length, requestedReadBytes: after.reads[0].length, additionalSnapshotUsesCache: true });
  assert.deepEqual(snapshots[1].children[0].lineage.cwd, { known: true, value: header.cwd });
  assert.deepEqual(snapshots[2].children[0].lineage.cwd, { known: true, value: header.cwd });
  await stop();
} catch (error) {
  emit('DRIVER_ERROR', String(error));
  emit('LAST_TRACE', (await trace()).slice(-8));
  process.exitCode = 1;
} finally {
  if (child) { child.kill(); await child.exited; await Promise.all([stdoutTask, stderrTask]); }
  await profile.teardown();
  emit('PROFILE_REMOVED', 'one-child');
  await writeFile('/tmp/gb1-cwd-regate.out', output.join('\n') + '\n');
}
```

### Interim complete normalized output

Command: `bun /tmp/gb1-cwd-regate.ts`; exit 0. SHA-256 `e3f67ba3c795d95a85a334bce1ab66b8a3c92e91e9fc6466d75389e22438e4ab`.

```text
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-cwd-extension.ts"]
READY {"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /gb1cwd facts
BEFORE_RESTART_NATIVE {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"idle","session":"live","sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","createdAt":1790817779867,"history":{"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
PROCESS_EXIT 143
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-cwd-extension.ts","--resume","<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl"]
READY {"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl"}
RPC_COMMAND /gb1cwd facts
COLD_NATIVE {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl","refs":[],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
RPC_COMMAND /gb1cwd native-read child-one
NATIVE_RESTORE_READ {"type":"native-read","id":"child-one","result":{"content":[{"type":"text","text":"\"child complete\""}],"details":{"totalLines":1,"displayContent":{"text":"\"child complete\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://child-one"}},"resolvedPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.md","contentType":"text/markdown"}},"refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","createdAt":1790817779794,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.md"}}]}
RPC_COMMAND /gb1cwd facts
BEFORE_SERVE_NO_VIEWER {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","createdAt":1790817779794,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
RPC_COMMAND /observer serve
RPC_COMMAND /gb1cwd facts
BEFORE_SNAPSHOT_NO_VIEWER {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","createdAt":1790817779794,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
TRANSCRIPT_FIRST_TWO_PHYSICAL_LINES {"file":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","lines":["{\"type\":\"title\",\"v\":1,\"title\":\"\",\"updatedAt\":\"2026-10-01T01:22:59.794Z\",\"pad\":\"                                                                                                                                                                              \"}","{\"type\":\"session\",\"version\":3,\"id\":\"01a0f50e-c052-7242-b1b0-9409add81255\",\"timestamp\":\"2026-10-01T01:22:59.794Z\",\"cwd\":\"<tmp>/workspace\",\"parentSession\":\"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl\"}"],"firstLine":{"type":"title","v":1,"title":"","updatedAt":"2026-10-01T01:22:59.794Z","pad":"                                                                                                                                                                              "},"sessionHeader":{"type":"session","version":3,"id":"01a0f50e-c052-7242-b1b0-9409add81255","timestamp":"2026-10-01T01:22:59.794Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl"},"oracleProcess":"driver; not observer"}
GET /v1/snapshot {"ordinal":1,"status":200,"schema":"1","inventory":{"state":"complete"},"childId":"child-one","snapshotCwd":{"known":false,"reason":"cwd not recorded"}}
GET /v1/snapshot {"ordinal":2,"status":200,"schema":"1","inventory":{"state":"complete"},"childId":"child-one","snapshotCwd":{"known":true,"value":"<tmp>/workspace"}}
GET /v1/snapshot {"ordinal":3,"status":200,"schema":"1","inventory":{"state":"complete"},"childId":"child-one","snapshotCwd":{"known":true,"value":"<tmp>/workspace"}}
RPC_COMMAND /gb1cwd facts
AFTER_SNAPSHOTS_READ_LOG {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","createdAt":1790817779794,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.md"}}],"reads":[{"path":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","offset":0,"length":4096,"bytesRead":4096}],"opens":[{"path":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4/child-one.jsonl","flags":"r"}],"wholeFileReads":[],"installed":true}
RESTORED_FIELD_FACTS {"childId":"child-one","status":"parked","session":null,"snapshotCwd":{"known":true,"value":"<tmp>/workspace"},"transcriptHeader":{"type":"session","version":3,"id":"01a0f50e-c052-7242-b1b0-9409add81255","timestamp":"2026-10-01T01:22:59.794Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-L4mjMM-workspace--/2026-10-01T01-22-59-626Z_01a0f50e-bfaa-776a-aef8-5b0625f8b0b4.jsonl"}}
V02_RESTORED_CWD_RESULT {"pass":true,"nativeRestore":true,"firstPhysicalLineType":"title","preSnapshotObserverOpens":0,"preSnapshotObserverReads":0,"comparedSnapshotOrdinal":2,"observerHeaderReads":1,"requestedReadBytes":4096,"additionalSnapshotUsesCache":true}
PROCESS_EXIT 143
PROFILE_REMOVED one-child
```

### Source `/tmp/gb1-cwd-extension.ts` (all three runs)

SHA-256 `4763faacf2d778838a98ef03bae8a29a3af0f56419d16758686839afb4f6dc1e`. Loaded with native `-e`, exclusively inside disposable harness profiles.

```ts
import fs from 'node:fs';
import { join } from 'node:path';

const key = Symbol.for('gb1-cwd-read-probe');
const state = globalThis[key] ??= { reads: [], opens: [], wholeFileReads: [], installed: false };
if (!state.installed) {
  state.installed = true;
  const observer = () => new Error().stack?.includes('/omp-orca-observer/stock-source.ts') === true;
  const open = fs.openSync;
  const read = fs.readSync;
  const readFile = fs.readFileSync;
  fs.openSync = function(path, ...args) {
    if (observer()) state.opens.push({ path: String(path), flags: args[0] });
    return open.call(fs, path, ...args);
  };
  fs.readSync = function(fd, buffer, offset, length, position) {
    const attributable = observer();
    const path = attributable ? fs.readlinkSync(`/proc/self/fd/${fd}`) : null;
    const bytesRead = read.call(fs, fd, buffer, offset, length, position);
    if (attributable) state.reads.push({ path, offset: position, length, bytesRead });
    return bytesRead;
  };
  fs.readFileSync = function(path, ...args) {
    if (observer()) state.wholeFileReads.push({ path: String(path) });
    return readFile.call(fs, path, ...args);
  };
}

export default function probe(api) {
  const log = value => fs.appendFileSync(join(process.env.TMPDIR!, 'gb1-cwd-events.jsonl'), JSON.stringify(value) + '\n');
  const registry = api.pi.AgentRegistry.global();
  let main = false;
  const refs = () => registry.list().filter(ref => ref.kind === 'sub').map(ref => ({
    id: ref.id, parentId: ref.parentId, status: ref.status, session: ref.session ? 'live' : null,
    sessionFile: ref.sessionFile, createdAt: ref.createdAt, history: ref.history,
  }));
  api.on('session_start', (_, ctx) => {
    main = ctx.agent.kind === 'main';
    if (!main) return;
    const notify = ctx.ui.notify.bind(ctx.ui);
    ctx.ui.notify = (message, level) => {
      log({ type: 'notification', message, level });
      return notify(message, level);
    };
    log({ type: 'ready', root: ctx.sessionManager.getSessionFile() });
  });
  api.events.on('task:subagent:lifecycle', value => {
    if (main) log({ type: 'lifecycle', value });
  });
  api.registerCommand('gb1cwd', {
    description: 'Disposable native restoration and observer-attributable read evidence',
    async handler(args, ctx) {
      if (args.startsWith('native-read ')) {
        const id = args.slice('native-read '.length);
        const tool = registry.get('Main').session.getToolByName('read');
        const result = await tool.execute('gb1-cwd-native-restore', { path: 'agent://' + id });
        log({ type: 'native-read', id, result, refs: refs() });
      } else if (args === 'facts') {
        log({ type: 'facts', root: ctx.sessionManager.getSessionFile(), refs: refs(), ...state });
      } else throw new Error('Unknown disposable probe command');
    },
  });
}
```

### Stable committed re-run after ae756c9 — PASS

Exact command:

```sh
git rev-parse HEAD && sha256sum omp-orca-observer/stock-source.ts && bun /tmp/gb1-cwd-regate.ts && sha256sum omp-orca-observer/stock-source.ts /tmp/gb1-cwd-regate.ts /tmp/gb1-cwd-regate.out
```

Exit 0. Before-run HEAD: `ae756c91129ce34d8b7a484b7da806e7f0324743`. Before/after source SHA-256: `cf18b6a334d12514ae9ac4680e22c3b105c60bfc3469a0bce64d99225613b26b`. Driver SHA-256: `99f77a2a783798cdeb3ad2291a69b1d14e706cf05026feec87ad057bd7575828`. Complete normalized driver stdout SHA-256: `4a0e4fa8436066dc86922866694e30497aec7a364fb66a70b6cd1959c0ae8dd3`.

The native restored ref is parked with `session:null`. Before `/observer serve` and again after serve but before any GET, observer opens/reads/whole-file reads are all empty. Snapshot 1 returns the previous collection's unknown cwd; snapshot 2 and snapshot 3 both return `{"known":true,"value":"<tmp>/workspace"}`, equal to the native session header. Only one observer-attributable transcript open and one offset-0 read requesting/returning 4096 bytes occur across all three snapshots; no whole-file reads. The child incarnation remains unchanged.

The exact first two physical lines below establish the title-slot boundary: physical line 1 is `type:"title"`; the first session header is physical line 2, with cwd recorded. The orchestrator authorized the native leading-title-slot correction in `ae756c9`; acceptance compares cwd with this first session header, not with the title record. Initial physical-first-line assumption failure and the uncommitted interim run remain explicitly separate above.

```text
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-cwd-extension.ts"]
READY {"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl"}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /gb1cwd facts
BEFORE_RESTART_NATIVE {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"idle","session":"live","sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","createdAt":1790817959586,"history":{"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
PROCESS_EXIT 143
COMMAND ["omp","--profile","one-child","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted","-e","/tmp/gb1-cwd-extension.ts","--resume","<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl"]
READY {"type":"ready","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl"}
RPC_COMMAND /gb1cwd facts
COLD_NATIVE {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl","refs":[],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
RPC_COMMAND /gb1cwd native-read child-one
NATIVE_RESTORE_READ {"type":"native-read","id":"child-one","result":{"content":[{"type":"text","text":"\"child complete\""}],"details":{"totalLines":1,"displayContent":{"text":"\"child complete\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://child-one"}},"resolvedPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.md","contentType":"text/markdown"}},"refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","createdAt":1790817959551,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.md"}}]}
RPC_COMMAND /gb1cwd facts
BEFORE_SERVE_NO_VIEWER {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","createdAt":1790817959551,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
RPC_COMMAND /observer serve
RPC_COMMAND /gb1cwd facts
BEFORE_SNAPSHOT_NO_VIEWER {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","createdAt":1790817959551,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.md"}}],"reads":[],"opens":[],"wholeFileReads":[],"installed":true}
TRANSCRIPT_FIRST_TWO_PHYSICAL_LINES {"file":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","lines":["{\"type\":\"title\",\"v\":1,\"title\":\"\",\"updatedAt\":\"2026-10-01T01:25:59.551Z\",\"pad\":\"                                                                                                                                                                              \"}","{\"type\":\"session\",\"version\":3,\"id\":\"01a0f511-7e7f-7325-85e1-da46e721afbb\",\"timestamp\":\"2026-10-01T01:25:59.551Z\",\"cwd\":\"<tmp>/workspace\",\"parentSession\":\"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl\"}"],"firstLine":{"type":"title","v":1,"title":"","updatedAt":"2026-10-01T01:25:59.551Z","pad":"                                                                                                                                                                              "},"sessionHeader":{"type":"session","version":3,"id":"01a0f511-7e7f-7325-85e1-da46e721afbb","timestamp":"2026-10-01T01:25:59.551Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl"},"oracleProcess":"driver; not observer"}
GET /v1/snapshot {"ordinal":1,"status":200,"schema":"1","inventory":{"state":"complete"},"childId":"child-one","snapshotCwd":{"known":false,"reason":"cwd not recorded"}}
GET /v1/snapshot {"ordinal":2,"status":200,"schema":"1","inventory":{"state":"complete"},"childId":"child-one","snapshotCwd":{"known":true,"value":"<tmp>/workspace"}}
GET /v1/snapshot {"ordinal":3,"status":200,"schema":"1","inventory":{"state":"complete"},"childId":"child-one","snapshotCwd":{"known":true,"value":"<tmp>/workspace"}}
RPC_COMMAND /gb1cwd facts
AFTER_SNAPSHOTS_READ_LOG {"type":"facts","root":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl","refs":[{"id":"child-one","parentId":"Main","status":"parked","session":null,"sessionFile":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","createdAt":1790817959551,"history":{"resolvedModel":"stub/scripted","resolvedModelIsFallback":false,"agent":"blocking","readOnly":false,"outputPath":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.md"}}],"reads":[{"path":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","offset":0,"length":4096,"bytesRead":4096}],"opens":[{"path":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a/child-one.jsonl","flags":"r"}],"wholeFileReads":[],"installed":true}
RESTORED_FIELD_FACTS {"childId":"child-one","status":"parked","session":null,"snapshotCwd":{"known":true,"value":"<tmp>/workspace"},"transcriptHeader":{"type":"session","version":3,"id":"01a0f511-7e7f-7325-85e1-da46e721afbb","timestamp":"2026-10-01T01:25:59.551Z","cwd":"<tmp>/workspace","parentSession":"<tmp>/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-zZJ3yl-workspace--/2026-10-01T01-25-59-376Z_01a0f511-7dd0-7539-9715-92f68c40c70a.jsonl"}}
V02_RESTORED_CWD_RESULT {"pass":true,"nativeRestore":true,"firstPhysicalLineType":"title","preSnapshotObserverOpens":0,"preSnapshotObserverReads":0,"comparedSnapshotOrdinal":2,"observerHeaderReads":1,"requestedReadBytes":4096,"additionalSnapshotUsesCache":true}
PROCESS_EXIT 143
PROFILE_REMOVED one-child
```

Limits: one naturally restored child in `one-child`, same incarnation, three snapshots, and the valid leading-title-slot form. Malformed/oversized headers, later incarnations, and unrelated criteria were not exercised. This re-gate is evidence-only; the title-slot product fix belongs to another worker. All historical restored-field FAIL records remain unchanged and are superseded only for this criterion by this committed PASS.

| Command | Tested state | Result | Limitation |
|---|---|---|---|
| `bun /tmp/gb1-cwd-regate.ts` (initial source) | Native restart/restore at initial input, before GET | baseline failure | Oracle stopped on physical title line; not an end-to-end cwd verdict |
| `bun /tmp/gb1-cwd-regate.ts` (completed source, interim) | Working-tree title-slot fix, native restore + 3 GETs | passed | HEAD still cd7fff0; not stable committed acceptance |
| Stable command above | ae756c9, one native restored parked child, pre-viewer probes, 3 GETs | passed | Scoped scenario; second snapshot equals native header cwd |
| Project-wide builds/tests, formatters, linters | Outside dispatch | not run (orchestrator-owned) | No installs, product edits, commits or pushes |

### Retained-source/output integrity and owned delta check

Exact command: `bun /tmp/gb1-cwd-integrity.mjs`; exit 0. It verified the entire original evidence prefix byte-for-byte except the one named matrix row, all three executed driver/extension source hashes, and all three complete normalized output hashes. It independently asserted native parked restoration, the title/session physical-line boundary, zero pre-viewer reads, one bounded read and matching second/third snapshot cwd. This is an evidence check, not another runtime run.

For reproduction after cleanup, reconstruct `/tmp/gb1-cwd-regate-before.md` from the historical prefix before this appended section and restore the historical matrix row quoted in the initial evidence; its expected recovery SHA-256 is recorded above.

Source `/tmp/gb1-cwd-integrity.mjs`:

```js
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const path = 'omp-orca-observer/checks/evidence/gb1.md';
const evidence = await readFile(path, 'utf8');
const before = await readFile('/tmp/gb1-cwd-regate-before.md', 'utf8');
const oldRow = before.split('\n')[222];
const newRow = evidence.split('\n')[222];
assert.ok(newRow.includes('**PASS**') && newRow.includes('ae756c9'));
assert.ok(evidence.startsWith(before.replace(oldRow, newRow)), 'all baseline bytes except named row unchanged');
const section = evidence.slice(evidence.indexOf('## Re-run after cd7fff0 — 2026-09-30'));
assert.ok(!section.includes(process.cwd()));
const sources = [
  ['### Source `/tmp/gb1-cwd-initial.ts`', '61512927760a571b0803de0e4d54151c1bad3ebc95861a4a0588191e8bf0a995'],
  ['### Source `/tmp/gb1-cwd-regate.ts`', '99f77a2a783798cdeb3ad2291a69b1d14e706cf05026feec87ad057bd7575828'],
  ['### Source `/tmp/gb1-cwd-extension.ts`', '4763faacf2d778838a98ef03bae8a29a3af0f56419d16758686839afb4f6dc1e'],
];
for (const [heading, expected] of sources) {
  const tail = section.slice(section.indexOf(heading));
  const start = tail.indexOf('```ts\n') + '```ts\n'.length;
  const source = tail.slice(start, tail.indexOf('```', start));
  assert.equal(createHash('sha256').update(source).digest('hex'), expected, heading);
}
const outputs = [
  ['### Initial complete normalized output', '05d8690a13f6aa3acd3c4395b562c3546204a0202f04588794ed54b86da21d9e'],
  ['### Interim complete normalized output', 'e3f67ba3c795d95a85a334bce1ab66b8a3c92e91e9fc6466d75389e22438e4ab'],
  ['### Stable committed re-run after ae756c9', '4a0e4fa8436066dc86922866694e30497aec7a364fb66a70b6cd1959c0ae8dd3'],
];
let stable;
for (const [heading, expected] of outputs) {
  const tail = section.slice(section.indexOf(heading));
  const start = tail.indexOf('```text\n') + '```text\n'.length;
  const stdout = tail.slice(start, tail.indexOf('```', start));
  assert.equal(createHash('sha256').update(stdout).digest('hex'), expected, heading);
  if (heading.includes('Stable')) stable = stdout;
}
const lines = stable.trim().split('\n');
const snapshots = lines.filter(line => line.startsWith('GET /v1/snapshot ')).map(line => JSON.parse(line.slice(line.indexOf('{'))));
assert.equal(snapshots.length, 3);
for (const row of snapshots.slice(1)) assert.deepEqual(row.snapshotCwd, { known: true, value: '<tmp>/workspace' });
const pre = JSON.parse(lines.find(line => line.startsWith('BEFORE_SNAPSHOT_NO_VIEWER ')).slice('BEFORE_SNAPSHOT_NO_VIEWER '.length));
assert.deepEqual(pre.reads, []);
assert.deepEqual(pre.opens, []);
const after = JSON.parse(lines.find(line => line.startsWith('AFTER_SNAPSHOTS_READ_LOG ')).slice('AFTER_SNAPSHOTS_READ_LOG '.length));
assert.equal(after.reads.length, 1);
assert.equal(after.reads[0].length, 4096);
assert.equal(after.reads[0].offset, 0);
assert.equal(after.refs[0].session, null);
const physical = JSON.parse(lines.find(line => line.startsWith('TRANSCRIPT_FIRST_TWO_PHYSICAL_LINES ')).slice('TRANSCRIPT_FIRST_TWO_PHYSICAL_LINES '.length));
assert.equal(JSON.parse(physical.lines[0]).type, 'title');
assert.equal(JSON.parse(physical.lines[1]).cwd, snapshots[1].snapshotCwd.value);
console.log('EVIDENCE_INTEGRITY', JSON.stringify({ pass: true, historicalBytesUnchangedExceptNamedRow: true, retainedSources: 3, retainedOutputs: 3, stableSnapshots: 3, nativeRestoredCwdVerdict: 'PASS', observerReadsBeforeViewer: 0, boundedHeaderReads: 1 }));
```

Exact output:

```text
EVIDENCE_INTEGRITY {"pass":true,"historicalBytesUnchangedExceptNamedRow":true,"retainedSources":3,"retainedOutputs":3,"stableSnapshots":3,"nativeRestoredCwdVerdict":"PASS","observerReadsBeforeViewer":0,"boundedHeaderReads":1}
```

Check receipt: `bun /tmp/gb1-cwd-integrity.mjs | preserved historical evidence + exact retained sources/outputs + stable runtime receipts | passed | scoped evidence integrity, not project-wide validation`.

Consequential removals: none in the repository. Only disposable scripts/extensions/output copies are removed after their exact source/output retention; no production/support file is deleted. Earlier review findings and final-disposition paragraphs are historical, unchanged by instruction; the named matrix row and this dated re-run carry the current restored-cwd verdict.

### Cleanup receipt

Exact command: `rm /tmp/gb1-cwd-regate.ts /tmp/gb1-cwd-extension.ts /tmp/gb1-cwd-integrity.mjs /tmp/gb1-cwd-regate.out /tmp/gb1-cwd-regate-before.md`; exit 0. Earlier preserved initial/interim copies were moved verbatim into this evidence and their empty temporary files deleted. The exact-path glob `/tmp/gb1-cwd-*` returned `No files found matching pattern`. All three disposable profiles were torn down by their driver, with `PROFILE_REMOVED one-child` recorded for each run. All executed throwaway sources, invocations and complete normalized outputs remain embedded here.

**Current scoped verdict: V02.1 native restored-child cwd PASS at ae756c9.** No other criterion, historical ledger row or historical evidence paragraph was changed.

