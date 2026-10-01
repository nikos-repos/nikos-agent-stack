# gc3 — restart/reconnect, workspace, git-commit evidence

Gate slice: `docs/maintainers/omp-orca-bridge-slices/gc3-restart-workspace-commit.md` (sha256 `4b3a10af85dd289ff1730c5174ac948094cb84c0f4e2b2c73c0d05cf7029e6a6`). Started 2026-10-01T05:31:30Z. Evidence-only gate: no product edits, no Orca commands, no live profiles, no push. All omp invocations that create sessions use `checks/harness/profile.ts` disposable roots and its local stub provider. The evidence path was absent at entry; this absent before-image is the recovery baseline. `ncm list checks/evidence` reported zero applicable contracts.

## Versions and source state

- Locally executed `omp --version`: `omp/18.4.6`.
- Orchestrator-supplied, Orca 1.4.217: the orchestrator ran `"$ORCA_CLI_COMMAND" status --json` in an Orca-managed terminal on 2026-10-01, filtered to `result.runtime.appVersion`, and supplied `{"appVersion": "1.4.217"}`. This worker did not run that command or independently inspect Orca.
- Cited omp native behavior comes only from the installed dev dependency's 18.3.5 sources under `node_modules/@oh-my-pi/pi-coding-agent/src/`, as authorized by the slice; the executable under test is the unmodified installed binary above.

Executed input checksums:

```text
sha256sum docs/maintainers/omp-orca-bridge-slices/gc3-restart-workspace-commit.md omp-orca-observer/contract.ts omp-orca-observer/commands.ts omp-orca-observer/transport.ts omp-orca-observer/viewer/index.html omp-orca-observer/checks/harness/profile.ts omp-orca-observer/checks/harness/stub-provider.ts
4b3a10af85dd289ff1730c5174ac948094cb84c0f4e2b2c73c0d05cf7029e6a6  docs/maintainers/omp-orca-bridge-slices/gc3-restart-workspace-commit.md
f76ef841a29a8efe5a9c841fb0b8f33d08d317645341f680d529c7536de5245b  omp-orca-observer/contract.ts
5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9  omp-orca-observer/commands.ts
c23255f7b2c553ccc6ddb2aed4cee71a32af91d2d2a2c02756a015d122be0b41  omp-orca-observer/transport.ts
0310aa399458debbaf9daa5878ccfa91876f0341ce10881bd770e394e12734cb  omp-orca-observer/viewer/index.html
4d9b3ce0319f5b8efa8b2d3d1c3d6b07449b4c937ca35135577b16e2799d572b  omp-orca-observer/checks/harness/profile.ts
c121b1871cfe9a8ea94e980feb3ded0ad68543d20d9c272d57c0b3bd26ffbc6d  omp-orca-observer/checks/harness/stub-provider.ts
```

Temporary scripts and normalized outputs are recorded below as each criterion completes. Paths use `$PWD`, `$HOME`, and `<tmp>`; endpoint ports are ephemeral. No credentials or unused bootstrap codes are retained in this evidence.

## Launch prerequisite (initial, non-accepted run)

Command: `GC3_REPO="$PWD" bun <tmp>/gc3/v10.mjs`. Result: exit 1 before any commit; the script sent its prompt while stock omp's first-launch setup was still active, so no criterion was evaluated. Exact output excerpts:

```text
TUI_START ... press ⏎ to skip
V10_FAILURE ... Timed out waiting ... ↑/↓ select · ⏎ confirm · ⎋ skip · Ctrl+C exit setup
TUI_STOP {"nativeStatus":143,"stderr":""}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}
```

The raw complete command output sha256 was `69eb7a973d047532a51a58201c05543573d1642656b3ec33dea342d1416d89ab`. The exact initial support script hash was `382fa1ea529a2801f82f6e42305b9e1ae6367a5bb0c2bd83727e153382783cfd`; its bytes are retained in the source appendix. The driver hash was `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`, and the v10 script hash was `94dc8e3214f9b6545c330d56c3ef9d370594879e975c05d2f891c2768948e5cb`.

Subsequent disposable profiles explicitly disable only their own startup wizard/splash/update check, using the native settings declared in the 18.3.5 source `src/modes/settings.ts:964-999`; `src/main.ts:618-644` shows the startup setup precedes interactive prompt processing. No real product configuration is touched. This is corrected harness initialization, not a product failure bypass.

Additional orchestrator resolution: v09 fixture commits in harness-created disposable workspaces are authorized setup (plain git with pinned fixture identity, no remote or push). v10 may replay one hash-identical skill-script commit by restoring only its disposable `.git` before-image between observer modes; only one commit survives and the repository is then deleted.

## v10 — disposable git-commit comparison

**PASS — identical real skill-script commit with observer enabled and disabled; no push; repository removed.** Accepted invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v10.mjs` (exit 0, 13.25 s). Source sha256 `94dc8e3214f9b6545c330d56c3ef9d370594879e975c05d2f891c2768948e5cb`; support version sha256 `c816c1268f8c22f6468572669292d42eba6f18ef9c4d4c84e09974f7c8a50b20`. Complete normalized command output is in the output appendix (raw sha256 `59c80db29d1a65ad3e12878ab02b440b8437b2bb329768ed1b2670d1cf6243f7`).

Both invocations ran in the same `create("one-child")` disposable workspace; the observer-enabled TUI spawned its real native child, reported `observer state: ready`, and served an endpoint. The disabled TUI used stock `omp --profile one-child --no-extensions` (18.3.5 `src/cli/args.ts:274-275` declares this flag). Between modes, only the disposable `.git` was restored from its exact before-image. Both git environments pinned fixture author/committer names, email and date and set `GIT_CONFIG_NOSYSTEM=1`; no actual user Git config was read.

Exact commit command in each mode:

```sh
bash "$HOME/.omp/agent/skills/git-commit/scripts/smart_commit.sh" "test(gc3): check commit parity" --no-push --whole-paths -- fixture.txt
```

Identical output (two occurrences):

```text
→ current branch: gc3-commit
→ staging every change in 1 requested path(s)...
→ Using provided message: test(gc3): check commit parity
[gc3-commit (root-commit) 960ef97] test(gc3): check commit parity
 1 file changed, 1 insertion(+)
 create mode 100644 fixture.txt
→ Created commit: 960ef97 (test(gc3): check commit parity)
→ Skipping push (default; pass --push to opt in)
 fixture.txt | 1 +
 1 file changed, 1 insertion(+)
```

`git log -1 --format=%H%n%T%n%s` was identical in both modes:

```text
960ef978982a9d56974b5a2f2d2df950fdf411a1
1bad9965cf80f19858f7ab5707dcd0c2971424c6
test(gc3): check commit parity
```

`git show --stat --format=fuller` was also byte-identical; both post-commit `git status --porcelain` and `git remote -v` returned empty output. Before/after `ps -eo pid=,ppid=,comm=,args=` filtered to the TUI's actual descendant tree contained only Python, omp and stock omp's worker broker/text-prediction processes, never an Orca process. No `/observer open` or any Orca command was invoked. Inspection of `commands.ts:170-190` places its Orca CLI calls exclusively in the explicitly user-triggered `open` branch, not serve/grant or Git. Limitation: process lists are before/after observations, not a syscall-level audit of transient subprocesses.

```text
V10_RESULT {"criterion":"git-commit-enabled-disabled","result":"PASS","identicalOutput":true,"identicalCommit":"960ef978982a9d56974b5a2f2d2df950fdf411a1\n1bad9965cf80f19858f7ab5707dcd0c2971424c6\ntest(gc3): check commit parity\n","noRemote":true,"noPush":true,"survivingCommits":1}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}
```

## v09 — workspace scenarios

Initial invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v09.mjs` (exit 1, 77.90 s). Script sha256 `61fdd3e62c7a6e17e8ba5ef5365e2a3fbf0c57493836332b0f0ec0d3221b80e0`; the same support version as v10. Complete normalized output appears in the output appendix (raw sha256 `f6e126181eff49495adf7ac0f83d867991cc7e3f29ddf499fe179a47e15b543e`). Fixture setup commands are emitted individually in that output. All five scenario profiles were removed, with `absent:true`.

- **worktree-shared — PASS.** HTTP snapshot 200, one native child `shared-child`, known cwd `<tmp>/worktree-shared/workspace`; other fields explicitly `unknown(repository root not recorded)`, `unknown(parent worktree not recorded)`, `unknown(child worktree not recorded)`, `unknown(isolation not recorded)` and `unknown(branch not recorded)`. The slice permits explicit unknown rather than invented Git facts.
- **worktree-isolated — PASS.** HTTP snapshot 200, one native child `isolated-child`, known cwd `<tmp>/worktree-isolated/home/.omp/profiles/worktree-isolated/wt/t9781a1172/m`, distinct from the parent workspace; all remaining lineage fields explicitly unknown with the same native-evidence reasons above. This is an observed native isolated cwd, not an observer-created checkout.
- In both passing cases, `git worktree list --porcelain` was byte-identical immediately before and after the observer grant/snapshot requests: one master worktree at fixture HEAD `ce92d820cbf137123bf739899cff9f14b8a65e9f`. The actual descendant process arrays were identical before/after. **PASS for no observer-created checkout or terminal in these exercised observer operations**; native task setup/isolation is separate and not attributed to the bridge.
- `worktree-linked`, `worktree-deleted`, and `detached-head` each reached native child-session creation but the initial `/observer grant all` did not yield a URL within 15 s. These are not yet classified solely from the URL-only driver. The orchestrator requested explicit status/grant/log diagnostics for detached-head and linked; those observations are recorded below, not bypassed.

### Manual SCM join — PASS (documented procedure; not executed)

The pinned source is the supplied `local://orca-v1.4.215.md`: `docs/site/content/docs/model/worktrees.mdx:133-143` and `docs/site/content/docs/review/commit-push.mdx:9-15,45-55`. Sources:

- https://raw.githubusercontent.com/stablyai/orca/v1.4.215/docs/site/content/docs/model/worktrees.mdx
- https://raw.githubusercontent.com/stablyai/orca/v1.4.215/docs/site/content/docs/review/commit-push.mdx

1. In the read-only observer, identify the child and its known physical cwd/child-worktree path. If those fields are `unknown(<reason>)`, retain that reason and stop rather than guessing another checkout.
2. In Orca, select the existing project/repository and the correct execution host. Do not create a worktree or terminal as part of this join.
3. For an external child worktree that is not in the sidebar, use that repository's **hidden worktrees** card → **Non-Orca worktrees** → **Show** on the already-existing child checkout. The pinned worktree docs explicitly describe this manual reveal; do not use Create Worktree as a substitute.
4. Select that child's worktree card in the sidebar and open the sidebar **Source Control** panel. Check its branch context row (branch or detached HEAD) against the child observation; it is independent of the parent observer browser tab.
5. Inspect changed files/diffs there. Staging, **Generate with AI**, **Commit**, **Push**, **Pull** and **Sync** remain explicit Source Control actions. The observer does not trigger any of them.
6. If the checkout has been deleted, preserve the unavailable/unknown observation and do not recreate it automatically. The pinned docs say Orca reconciles removed worktrees on its next repository refresh.

The gate records these manual steps only, as required; no live Orca SCM join or UI action was attempted.

### Additional workspace observations and accepted status-first run

Commands: `GC3_REPO="$PWD" bun <tmp>/gc3/v09-diagnostics.mjs` (exit 0, 135.83 s); `GC3_REPO="$PWD" bun <tmp>/gc3/v09.mjs` with the extended three-scenario source (exit 1, 88.94 s); `GC3_REPO="$PWD" bun <tmp>/gc3/v09-ready.mjs` (exit 1, 15.43 s). The exact source and complete normalized output of each are included below.

The diagnostic run waited for the native scenario reply, captured `/observer status` and `/observer grant all` in full, and read every disposable log line containing `omp-orca-observer`. Detached-head and linked both reported `observer state: ready`, `inventory: complete`, zero grants before the first grant, then a bootstrap URL. The only observer log messages were main binding, publisher epoch, and child binding; no rejected reason appeared. The early URL-only timeouts remain recorded, not treated as evidence that these final scenarios are unavailable.

- **detached-head — PASS.** The extended run exchanged a URL and obtained HTTP 200 with `branch: {known:false,reason:"branch not recorded"}` and explicit unknown reasons for every remaining unrecorded lineage field. The Git worktree list was identical before/after. The script's full-process assertion failed only because the same PID 2321531, PPID 2321497 and text-prediction arguments changed `comm` from `cli.js` to `omp`; that is a native process rename, not creation. The orchestrator accepted comparison by PID/PPID/arguments. The full failure output is retained.
- **worktree-linked — PASS for lineage and no checkout/terminal creation.** The final status-first run exchanged HTTP 200 and observed `cwd: {known:true,value:"<tmp>/worktree-linked/linked"}`; all unrecorded fields retained explicit reasons. Both worktree lists contain the same master and linked checkout at HEAD `ce92d820cbf137123bf739899cff9f14b8a65e9f`. The process assertion failed because an already-present native `gh pr view --json number,url` lookup changed PID from 2329261 to 2329329; both have PPID 2329069, the same omp main process. The Python, omp, broker and prediction PID/PPID/arguments did not change. This is normalized as native PR lookup turnover, not an observer-created terminal.
- **worktree-deleted — FAIL.** After `git worktree remove --force <tmp>/worktree-deleted/linked` succeeded and native transcript text contained `checkout already removed`, the accepted HTTP-200 snapshot still asserted `lineage.cwd` was known at that deleted path. Exact invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v09-ready.mjs`; exact output excerpt:

```text
COMMAND {"command":["git","worktree","remove","--force","<tmp>/worktree-deleted/linked"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"","stderr":""}
"cwd":{"known":true,"value":"<tmp>/worktree-deleted/linked"}
V09_READY_FAILURE {"name":"worktree-deleted","result":"FAIL","message":"Expected values to be strictly equal:\n\ntrue !== false\n", ...}
PROFILE_REMOVED {"name":"worktree-deleted","root":"<tmp>/worktree-deleted","absent":true}
```

For the linked attribution, the worker additionally ran the specialized-tool grep `\bspawn(?:Sync)?\b|exec(?:File|Sync)?\(|\bfork\(|\bgh\b|terminal|runOrca` over `omp-orca-observer/*.ts`. Only `commands.ts` owns subprocess execution (`runOrca`, using `execute`); its invocations at 173, 174 and 190 are the user-triggered Orca `open` command. No package runtime `gh` call or terminal creation was found. Regex `.exec` calls and lifecycle `terminalAt` matches are not subprocesses. No `open` command was exercised. This independently corroborates the before/after process attribution. For deleted-worktree, the assertion stops before its after-process/list captures, so that scenario alone has no complete no-side-effect comparison.

## v05 — publisher replacement and restoration

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-lifetimes.mjs` (exit 1, 159.97 s). Script sha256 `f1fdbd56c81fcf0e67bb17334197f4ba4455b89223cf696316646c7abd92cf61`; support sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`. All six profile roots were removed. Source and complete normalized emitted output are below.

- **new session — PASS.** `/new` changes epoch `39c0236e-e771-43ee-b02d-189cb8f64f08` → `79cfcef1-e344-4d30-b006-3c004551cb0b`; a prior unused bootstrap code and credential each return 401 against the new endpoint, and the prior transcript token returns a page with `reset:true`. The check occurred 1,911 ms after issuance, before the unused code's normal expiry.
- **process restart / resume — PASS.** Reopening the same actual native session changes epoch `0ab682d4-e1c4-4d07-9a4f-43d264cb0b06` → `5820d126-d6cd-4caf-b89a-c8b75ddeb242`; old code 401, old credential 401 and prior token reset at 1,915 ms. The restored child is parked and its outcome is `unknown(no lifecycle evidence)`, not its previous completed outcome.
- **extension removal/reload — PASS by the resolved stock next-launch lifecycle.** `omp --profile resume plugin disable omp-orca-observer` and the corresponding `enable` each exit 0. The disabled restart has no observer command state and the old endpoint fails with `Unable to connect. Is the computer able to access the url?`. Re-enable plus restart produces epoch `c3200602-4f9d-4096-9ab3-6ee277613150`; old unused code 401, old credential 401, prior token reset at 14,933 ms. The orchestrator resolved this method from native `src/extensibility/plugins/manager.ts:871-880`; disable persists next-launch configuration. `/reload-plugins` is not an extension replacement and was not used.
- **partial-restore replacement invalidation — PASS; partial-inventory interval — UNVERIFIED.** The actual 135-child profile had 136 native transcript files. Restart changes epoch `bdb957a3-8aed-4947-8eab-e1f3986dcf3d` → `a4875129-2dcd-4e03-9d34-459bb71c267b`; old code/credential 401 and prior token reset at 6,865 ms. All 135 restored rows were parked with `outcome: unknown(no lifecycle evidence)`. However, the first public status was already `inventory: complete`, and the first snapshot admitted all 135 references. This does not prove the conditional interval before every reference is restored. Each row's separate lineage completeness remained explicitly unknown.
- **tombstoned child — PASS.** The genuine native `.tombstone` marker existed; the observer row for `tombstone-child` had `tombstoned:true`, registry `aborted`, and current outcome `aborted`, generation 1. A readable retained transcript does not negate the required aborted row.
- **delayed previous-run lifecycle signal — UNVERIFIED.** Restart demonstrated loss of historical outcomes, but no controlled delayed old signal was generated. That distinct acceptance criterion is not inferred from the restored parked rows.
- **fork — UNVERIFIED.** Baseline `/observer grant all` failed to issue a URL within 35 s before `/fork` was reached. Exact invocation is the lifetime command above; emitted `V05_REPLACEMENT_FAILURE {"name":"fork","message":"Timed out waiting; ...","screen":"... Error: observer: no admitted children selected ..."}`. Thus no pre-fork credential/token could be issued, and replacement behavior was not evaluated.
- **cold-restart inventory — UNVERIFIED.** The cold-restart scenario reached native creation of four transcript files, but baseline grant timed out before a restart. Exact invocation is the lifetime command above; emitted `V05_REPLACEMENT_FAILURE {"name":"cold-restart","message":"Timed out waiting; ...","screen":"... 409 Unscripted turn ..."}`. The output also retains stock background `409 Unscripted turn` messages in resumed multi-child scenarios; the stub/provider or product was not altered to hide them.

### Native branch-selector attempt

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-branch.mjs` (exit 1, 39.80 s). The baseline epoch was `c409691e-78ba-4043-bb91-3fb2633b198a`; baseline exchange and snapshot both returned 200. `/branch` displayed the genuine rewind selector, including `3/3  ↑/↓ step  ←/→ user turns  f filter  ⏎ rewind  Ctrl+O expand  ⎋ cancel`. After Enter, the driver did not observe its required `Rewound` completion within 30 s and emitted `V05_BRANCH_FAILURE {"message":"Timed out waiting; ..."}` while the selector remained visible. **UNVERIFIED**, not an inferred publisher failure: the transition itself was not observed. Complete output and exact source are retained below; the profile was removed.

## v05 — recipient reconnect

**PASS — actual old browser closed, fresh browser reads rows and transcript under the same publisher epoch; unused old credential expires.** Accepted invocation:

```sh
PLAYWRIGHT_BROWSERS_PATH=<tmp>/gc3/browsers GC3_REPO="$PWD" bun <tmp>/gc3/v05-reconnect.mjs
```

Exit 0, 75.99 s. Source sha256 `3cc9d23d84223e2f096c48a53782dd5557b2e22a1c7f7032e22985a495f2769c`; complete normalized output sha256 `db5ba31afcd299d1e9322e47ddda0634f387ce29bac085c58befdffd3ee3eff9`.

Each Playwright recipient is a real new headless Chromium process/context using the disposable profile environment. The first recipient exchanged its code, selected `child-one`, displayed its completed row and real `child complete` transcript with `End of transcript.`, then closed. `/observer url all` issued a fresh code; the second fresh browser displayed the same row and transcript. Both displayed epoch `7faaf404-5f39-413f-80bc-78c08b3cd503`. The second browser continued polling while the old credential was unused.

```text
OLD_CREDENTIAL_UNUSED_WAIT {"lastRequestAt":"2026-10-01T06:14:56.039Z","minimumWaitMs":65000,"remainingMs":64669}
REQUEST {"path":"/v1/snapshot","status":401,"body":"Unauthorized"}
V05_RECONNECT_RESULT {"result":"PASS","epoch":"7faaf404-5f39-413f-80bc-78c08b3cd503","oldStatusAfterMs":65005,"oldCredentialStatus":401,"newCredentialStatus":200,"unchangedNativeDigests":true}
```

The parent's native JSONL sha256 remained `e2c83df4a745ca220fd75d71ba71d28a825f2fbdaf1cf180d120e6a7087a5f08`; the child's remained `3134b0de7efa370440189b761e279c9aeae235b443f2e6c7728f89424d2358fe`. The observed native session files and their contents were unchanged, and the publisher epoch stayed the same. Both browser processes and the profile were closed/deleted.

Browser prerequisites (not accepted recipient attempts): the first attempt could not launch missing cached Chromium headless shell 1243. Installing through the cached 1.63.0 package CLI failed with `Cannot find module 'playwright-core/lib/bootstrap'`. The orchestrator authorized an official download and matching temporary client under this gate's scratch directory: `PLAYWRIGHT_BROWSERS_PATH="$PWD/browsers" bun x --no-install playwright install chromium --only-shell` succeeded; `bun x --no-install playwright --version` reported `Version 1.58.0`; a temporary `{"private":true,"dependencies":{"playwright":"1.58.0"}}` followed by `bun install` installed exactly playwright and playwright-core. The actual downloaded executable's `--version` returned `Google Chrome for Testing 145.0.7632.6`. No repository dependency or real-home cache was changed.

## Supporting source appendix

The following are the exact temporary script sources, identified by executed-source sha256. Any code-fence separator newline after a script whose source lacked a final newline is representational, not part of the hashed bytes. Scripts and binaries exist only under the owned scratch root and are removed after evidence capture. No new repository test was written.

### gate-lib.mjs — initial launch source

sha256 `382fa1ea529a2801f82f6e42305b9e1ae6367a5bb0c2bd83727e153382783cfd`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 15000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

### gate-lib.mjs — initialized disposable startup, 15-second grant wait

sha256 `c816c1268f8c22f6468572669292d42eba6f18ef9c4d4c84e09974f7c8a50b20`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 15000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

### v09.mjs — initial five-scenario source

sha256 `61fdd3e62c7a6e17e8ba5ef5365e2a3fbf0c57493836332b0f0ec0d3221b80e0`.

```javascript
import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { profile, tui, waitFor, grant, exchange, request, git, nativeHeaders, processList, cleanup, log } from "./gate-lib.mjs";
for (const name of ["worktree-shared", "worktree-isolated", "worktree-linked", "worktree-deleted", "detached-head"]) {
  const p = await profile(name);
  let t;
  try {
    await writeFile(join(p.workspace, "fixture.txt"), "gc3 workspace fixture\n");
    await git(p, ["add", "--", "fixture.txt"]);
    await git(p, ["commit", "-qm", "test(gc3): seed disposable workspace"]);
    let cwd = p.workspace;
    if (["worktree-linked", "worktree-deleted"].includes(name)) {
      cwd = join(p.root, "linked");
      await git(p, ["worktree", "add", "-b", "linked-fixture", cwd]);
    }
    if (name === "detached-head") await git(p, ["switch", "--detach"]);
    t = await tui(p, [], cwd);
    t.send("HARNESS_AGENT=main");
    await waitFor(() => nativeHeaders(p), files => files.length >= 2, 60000);
    if (name === "worktree-deleted") await git(p, ["worktree", "remove", "--force", cwd]);
    else await waitFor(() => t.text, text => /shared complete|isolation complete|linked complete|head observed/.test(text), 60000);
    const worktreesBefore = await git(p, ["worktree", "list", "--porcelain"]);
    const processesBefore = await processList(t);
    log("PROCESS_LIST_BEFORE_OBSERVER", processesBefore);
    const bootstrap = await grant(t);
    const session = await exchange(bootstrap);
    assert.equal(session.status, 200);
    const snapshot = await request(session, "/v1/snapshot");
    const headers = await nativeHeaders(p);
    log("NATIVE_HEADERS", headers);
    const worktreesAfter = await git(p, ["worktree", "list", "--porcelain"]);
    const processesAfter = await processList(t);
    log("PROCESS_LIST_AFTER_OBSERVER", processesAfter);
    assert.equal(snapshot.status, 200);
    assert.equal(snapshot.body.children.length, 1);
    const row = snapshot.body.children[0];
    for (const [field, value] of Object.entries(row.lineage)) {
      assert.equal(typeof value.known, "boolean", `${field} missing Known shape`);
      if (!value.known) assert.ok(typeof value.reason === "string" && value.reason.length > 0, `${field} missing unknown reason`);
      else assert.equal(typeof value.value, "string", `${field} missing known value`);
    }
    if (row.lineage.cwd.known && name !== "worktree-isolated") assert.equal(row.lineage.cwd.value, cwd);
    if (name === "detached-head") assert.equal(row.lineage.branch.known, false);
    if (name === "worktree-isolated" && row.lineage.childWorktree.known && row.lineage.parentWorktree.known) assert.notEqual(row.lineage.childWorktree.value, row.lineage.parentWorktree.value);
    if (name === "worktree-deleted") {
      assert.equal(row.lineage.cwd.known, false);
      assert.equal(row.lineage.branch.known, false);
    }
    assert.equal(worktreesBefore.stdout, worktreesAfter.stdout, "Observer changed git worktree list");
    assert.deepEqual(processesBefore, processesAfter, "Observer created a terminal/process");
    log("V09_RESULT", { name, result: "PASS", lineage: row.lineage, noCheckoutCreated: true, noTerminalCreated: true });
  } catch (error) {
    log("V09_FAILURE", { name, message: error.message, screen: t?.text.slice(-4000) });
    process.exitCode = 1;
  } finally {
    await t?.stop();
    await cleanup(p);
  }
}
```

## Complete recorded archive

This lossless archive contains every remaining executed throwaway script source, its sha256, and the complete emitted normalized output for v10, initial/extended/diagnostic/status-first v09, publisher lifetimes, native branch attempt, browser reconnect, and the failed matched installer. No output line is omitted or collapsed. Reconstruct the inner Markdown archive by base64-decoding the following block and gunzipping it; its exact sha256 is `6e032f78c9440558a209fb1b00b73499561c0f963f3f878852f9e8792be942d4`. Each inner source/output block is ordinary base64 with its decoded byte count and sha256. Bootstrap fragments are redacted, and both original and normalized hashes are supplied where that changed bytes. This encoding preserves the full native transcript-system-prompt output without treating it as instructions or leaving maintenance markers in the evidence prose. Compression command: `gzip -n -c archive.md | base64 -w 120`.

```gzip-base64
H4sIAAAAAAAAA+y9WZPjOrIm+I5fEVb3ZcaqTx1SS0i8M91mIYX2JUIbtTyVSGphiJRUoV1t/d/H3QGQ4KLIyDxZd8asx8pOZaZEgYDD4evnDvYf//HU3h0O
3uJweDrsTp/24mm+dZ7snb/3FsfF0+503J+OT/NPe+2eF4xVtvbOcber/3xazO31kzU/LJ5zT5a3szdPzgK+Wxyejrun43rxtLjO7ePTaFj9oyiH3n2GI293
n/7cc+8L52nhu8cj/Mlf9o+n4do9PO0/F4fF5xnGs+efn+58tXj6XBxPn9sDzXDpbufeH9vFxXO3i6fDcQ5DXtzjGsZ46sw/N87usuXvcxZ/LBdbeLu7PS4+
YVh41t1t//HU3R3XsJQneJm987z5/rBw/vH0RpOAlziOi8/NPe8Gb3ZwMfPt7cna7Y6H4+d8/wcO/bT8nK/8xfZ4+L/gbe4KZ0Xz48RwntbzwxrW4DrwjLu8
AWXmx2DtYiL9E3znwypuh+PC/2P/CTQ6Ph0X1yPObbHlI33OgaqfOMAW5rt34aM5fHtd2Kfj3PJwfTCvk41jHv7x9EoTIJo8zZFAW2f+6cgd49P7/MfTC9/Z
J/tzQbPBDfLh2f98+qd12j7930d//z/+XNnZPwUL/MP/OPzz6f/Y7p5gkvDK886m3/2f/2DsP4CblMcY+59/2879xd/+82/Kp3/7b3873vb44cH+dPfHPzhv
wMeSfoP1PJN/hgeyxtLQM5q90PJZw8hn7KU1n+t20ck+5wpG0XKWy+fnTGaZyebt7DxvFYvLYmFRzD/nioXC0i7AmGIb/g1Dlm7HxeFv/5nJ5TP/i7F//vOf
nLJsPtYvVrapNWrVu50xb0655Nu+cWyUmycr0/fefPm5cXfqzf0023PfLvu9NSmd7W1vtbiVPmzfXDs1szGddHeNuraabZtna/DiWr6xmQ33H/bWuzi1YuR3
DH54m42rm77vHWaDy8rJNvcwSG0+vnopg/j2zbjgxOaTrmffGoWy7x3tmoETLjRq/b3t59fWeHRo1Pbn+Ti3Wg5iC9mWYJIrl8Vm7+MLTbPZMWtGbzrpp61A
t/0Lzv7DyuTv8ML7NNuEwWC1r/BszbtZfvU4G6wTY7VqcpL5I5tN+uv21rxZ5c1eGew0HeuwohejUT2400nzY17zMrNBHo5Ax22XX9xZpqrNBvphPm6crPH+
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
```

## re-run v09 worktree-deleted (2026-10-01)

Binding slice sha256 for this continuation: `a938cd41feaa9c11e22de92522cb028aa350f1732f786aec7c3073d7bfb9b994`. Exclusive write ownership remains this evidence file only. Its exact before-image was captured under `<tmp>/gc3/gc3-before-continuation.md`, sha256 `73cfdf524ef1767339fc25497b06ee08091fc98ef62536be2bc26a019910ecda`; earlier evidence is append-only and stands.

Input source: `git show --no-patch --format='%H%n%s' 2f6d27b` → `2f6d27be41e4ac53afebb686cb81fff28276eadc`, `fix(omp-orca-observer): report a removed child cwd as unknown`; `git merge-base --is-ancestor 2f6d27b HEAD` exited 0; `git rev-parse HEAD` returned that same full revision. `ncm list omp-orca-observer/checks/evidence/gc3.md` reported zero applicable contracts.

The ordered continuation is deleted-worktree lineage, cold/partial native restoration and old tokens, branch, then delayed prior-run evidence. Every TUI observer command follows the scenario's final assistant reply; status is captured first in full, grant output waits up to 90 seconds and is captured in full. All runs use harness disposable profiles and the local stub; no Orca call, live profile, product edit, install, formatter, linter, project-wide suite, commit outside authorized disposable fixtures, or push is performed. Supporting scripts below live only in the scratch directory, with exact bytes and sha256 retained before removal.

### Deleted cwd against 2f6d27b

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v09-deleted-rerun.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### v09-deleted-rerun.mjs — exact source

sha256 `76fa7b1396fc430d8da83998fe592cb38e70fcb520a8eb1edb9fc4e924f67049`.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { profile, tui, waitFor, exchange, request, git, nativeHeaders, processList, sessionFiles, cleanup, log } from "./gate-lib.mjs";
import { recordStart, recordEnd } from "./record-run.mjs";
recordStart("Deleted cwd against 2f6d27b");
const p = await profile("worktree-deleted");
let t;
try {
  await writeFile(join(p.workspace, "fixture.txt"), "gc3 workspace fixture\n");
  await git(p, ["add", "--", "fixture.txt"]);
  await git(p, ["commit", "-qm", "test(gc3): seed disposable workspace"]);
  const cwd = join(p.root, "linked");
  await git(p, ["worktree", "add", "-b", "linked-fixture", cwd]);
  t = await tui(p, [], cwd);
  t.send("HARNESS_AGENT=main");
  await waitFor(() => nativeHeaders(p), files => files.length >= 2, 60000);
  await git(p, ["worktree", "remove", "--force", cwd]);
  const absent = await stat(cwd).then(() => false, () => true);
  assert.equal(absent, true);
  await waitFor(() => t.text, text => text.includes("child launched"), 60000);
  await waitFor(async () => Promise.all((await sessionFiles(p)).map(path => readFile(path, "utf8"))), files => files.some(text => text.includes("checkout already removed")), 30000);
  await Bun.sleep(1000);
  log("DELETED_NATIVE_HEADERS", await nativeHeaders(p));
  const worktreesBefore = await git(p, ["worktree", "list", "--porcelain"]);
  const processesBefore = await processList(t);
  log("PROCESS_LIST_BEFORE", processesBefore);
  let mark = t.text.length;
  t.send("/observer status");
  await waitFor(() => t.text.slice(mark), text => text.includes("inventory:"), 90000);
  await Bun.sleep(150);
  log("FULL_OBSERVER_STATUS", t.text.slice(mark));
  mark = t.text.length;
  t.send("/observer grant all");
  let text;
  try { text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 90000); }
  finally { log("FULL_OBSERVER_GRANT", t.text.slice(mark).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>")); }
  const url = new URL([...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)].at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code"); url.hash = "";
  const session = await exchange({ origin: url.href, code });
  assert.equal(session.status, 200);
  const snapshot = await request(session, "/v1/snapshot");
  assert.equal(snapshot.status, 200);
  assert.equal(snapshot.body.children.length, 1);
  const row = snapshot.body.children[0];
  assert.deepEqual(row.lineage.cwd, { known: false, reason: "cwd no longer exists" });
  for (const [field, value] of Object.entries(row.lineage)) if (!value.known) assert.ok(typeof value.reason === "string" && value.reason.length > 0, field);
  const worktreesAfter = await git(p, ["worktree", "list", "--porcelain"]);
  const processesAfter = await processList(t);
  log("PROCESS_LIST_AFTER", processesAfter);
  assert.equal(worktreesBefore.stdout, worktreesAfter.stdout);
  assert.deepEqual(processesBefore.map(({ pid, ppid, args }) => ({ pid, ppid, args })), processesAfter.map(({ pid, ppid, args }) => ({ pid, ppid, args })));
  log("V09_DELETED_RESULT", { result: "PASS", cwdAbsent: absent, lineage: row.lineage, noCheckoutCreated: true, noTerminalCreated: true, processComparison: "pid/ppid/args; comm ignored" });
} catch (error) {
  log("V09_DELETED_FAILURE", { result: "FAIL", message: error.message, stack: error.stack, screen: t?.text.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>").slice(-6000) });
  process.exitCode = 1;
} finally {
  await t?.stop();
  await cleanup(p);
  recordEnd("All spawned TUI/native processes were awaited; the stub and disposable profile/repository were removed.");
}

```

#### Observed output (incremental)

```text
PROFILE {"name":"worktree-deleted","root":"<tmp>/worktree-deleted","workspace":"<tmp>/worktree-deleted/workspace","stubUrl":"http://127.0.0.1:41197/v1"}
COMMAND {"command":["git","add","--","fixture.txt"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"","stderr":""}
COMMAND {"command":["git","commit","-qm","test(gc3): seed disposable workspace"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"","stderr":""}
COMMAND {"command":["git","worktree","add","-b","linked-fixture","<tmp>/worktree-deleted/linked"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"HEAD is now at ce92d82 test(gc3): seed disposable workspace\n","stderr":"Preparing worktree (new branch 'linked-fixture')\n"}
TUI_START {"command":["omp","--profile","worktree-deleted"],"cwd":"<tmp>/worktree-deleted/linked","screen":"───────────────────────────────────────────────────────────╯\r\r\n Tip: Drop the word `ultrathink` in your message for harder multi-step reasoning — watch it glow\r\r\n      rainbow as you type\r\r\n\r\r\n\r\r\n π > ⬢ Harness scripted model > 🌳 workspace/linked > ⑂ linked-fixture ▶──────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎────────────────────────────────────────────┃──────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort\r"}
COMMAND {"command":["git","worktree","remove","--force","<tmp>/worktree-deleted/linked"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"","stderr":""}
DELETED_NATIVE_HEADERS [{"path":"<tmp>/worktree-deleted/home/.omp/profiles/worktree-deleted/agent/sessions/--tmp-omp-orca-harness-QrrwaY-linked--/2026-10-01T06-40-57-455Z_01a0f631-da6f-732b-bf70-a4076925cf19.jsonl","header":{"type":"title","v":1,"title":"Harness auxiliary reply","source":"auto","updatedAt":"2026-10-01T06:40:58.307Z","pad":"                                                                                                                                       "},"tombstone":false},{"path":"<tmp>/worktree-deleted/home/.omp/profiles/worktree-deleted/agent/sessions/--tmp-omp-orca-harness-QrrwaY-linked--/2026-10-01T06-40-57-455Z_01a0f631-da6f-732b-bf70-a4076925cf19/removed-checkout.jsonl","header":{"type":"title","v":1,"title":"","updatedAt":"2026-10-01T06:40:58.387Z","pad":"                                                                                                                                                                              "},"tombstone":false}]
COMMAND {"command":["git","worktree","list","--porcelain"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"worktree <tmp>/worktree-deleted/workspace\nHEAD ce92d820cbf137123bf739899cff9f14b8a65e9f\nbranch refs/heads/master\n\n","stderr":""}
PROCESS_LIST_BEFORE [{"pid":2343790,"ppid":2343719,"comm":"python3","args":"python3 <tmp>/gc3/pty-driver.py --profile worktree-deleted"},{"pid":2343791,"ppid":2343790,"comm":"omp","args":"omp --profile worktree-deleted"},{"pid":2343909,"ppid":2343791,"comm":"omp","args":"daemon brok $HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_daemon_broker"},{"pid":2343964,"ppid":2343909,"comm":"omp","args":"$HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_text_predict"}]
FULL_OBSERVER_STATUS  observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: d5a92497-3ba5-4ec4-8bc7-e1b0fb6c6f30                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🌳 workspace/linked ▶────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────┃─────────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
FULL_OBSERVER_GRANT  http://127.0.0.1:46225/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🌳 workspace/linked ▶────────────────────────5%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────────┃─────────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:11:01.931Z","schema":1,"epoch":"d5a92497-3ba5-4ec4-8bc7-e1b0fb6c6f30"}}
REQUEST {"path":"/v1/snapshot","status":200,"body":{"schema":1,"epoch":"d5a92497-3ba5-4ec4-8bc7-e1b0fb6c6f30","generation":3,"observedAt":"2026-10-01T06:41:00.654Z","rootSession":{"known":true,"value":"<tmp>/worktree-deleted/home/.omp/profiles/worktree-deleted/agent/sessions/--tmp-omp-orca-harness-QrrwaY-linked--/2026-10-01T06-40-57-455Z_01a0f631-da6f-732b-bf70-a4076925cf19.jsonl"},"inventory":{"state":"complete"},"children":[{"childId":"removed-checkout","parentId":"Main","rootSession":"<tmp>/worktree-deleted/home/.omp/profiles/worktree-deleted/agent/sessions/--tmp-omp-orca-harness-QrrwaY-linked--/2026-10-01T06-40-57-455Z_01a0f631-da6f-732b-bf70-a4076925cf19.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"idle","tombstoned":false,"outcome":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-worktree-deleted-main-0-call-0"},"at":"2026-10-01T06:41:00.475Z"},"milestones":{"responseAt":{"known":true,"value":"2026-10-01T06:41:00.472Z"},"acceptedAt":{"known":true,"value":"2026-10-01T06:41:00.472Z"},"terminalAt":{"known":true,"value":"2026-10-01T06:41:00.474Z"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:41:00.474Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":false,"reason":"cwd no longer exists"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:41:00.654Z","grantScope":"granted"}]}}
COMMAND {"command":["git","worktree","list","--porcelain"],"cwd":"<tmp>/worktree-deleted/workspace","code":0,"stdout":"worktree <tmp>/worktree-deleted/workspace\nHEAD ce92d820cbf137123bf739899cff9f14b8a65e9f\nbranch refs/heads/master\n\n","stderr":""}
PROCESS_LIST_AFTER [{"pid":2343790,"ppid":2343719,"comm":"python3","args":"python3 <tmp>/gc3/pty-driver.py --profile worktree-deleted"},{"pid":2343791,"ppid":2343790,"comm":"omp","args":"omp --profile worktree-deleted"},{"pid":2343909,"ppid":2343791,"comm":"omp","args":"daemon brok $HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_daemon_broker"},{"pid":2343964,"ppid":2343909,"comm":"omp","args":"$HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_text_predict"}]
V09_DELETED_RESULT {"result":"PASS","cwdAbsent":true,"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":false,"reason":"cwd no longer exists"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"noCheckoutCreated":true,"noTerminalCreated":true,"processComparison":"pid/ppid/args; comm ignored"}
TUI_STOP {"nativeStatus":null,"stderr":""}
PROFILE_REMOVED {"name":"worktree-deleted","root":"<tmp>/worktree-deleted","absent":true}

```

Runner exit: 0. All spawned TUI/native processes were awaited; the stub and disposable profile/repository were removed.

**PASS — worktree-deleted.** `GC3_REPO="$PWD" bun <tmp>/gc3/v09-deleted-rerun.mjs` exited 0. The linked checkout was successfully removed and independently absent; HTTP 200 snapshot lineage was exactly `cwd: {known:false,reason:"cwd no longer exists"}`. Both `git worktree list --porcelain` outputs were byte-identical, as were the process lists by PID/PPID/args, ignoring native process-name changes. No observer checkout or terminal appeared. The disposable profile was removed with `absent:true`. The earlier deleted-cwd failure remains historical and is superseded by this section.

## continuation (2026-10-01)

### Resolved cold-restart authentication note

Orchestrator-supplied correction for this run: the old-epoch credential returns HTTP **401**, the expected rejection under the shipped request-authenticated transport (`transport.ts:184-188` authorizes before checking admission). The older gb2 pre-restoration 404 note predates authentication and is superseded. Before native restoration a named grant must refuse an unadmitted child if that TUI moment is reachable; otherwise explicitly note that TUI restores eagerly. After restoration use a fresh TUI-issued grant with the old page token and expect `reset:true`. No probe package copy is permitted or used for this continuation.

Restoration inventory will be sampled through the stock `/observer status` surface in persistent RPC mode alongside an independent native registry-only control extension. The control extension does not import observer modules, alter the registry, create credentials, or change the observer package. TUI commands remain the sole bootstrap source.

### v05 cold-restart then partial-restore inventory and old-token sequence

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-restore-continuation.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### v05-restore-continuation.mjs — exact source

sha256 `ea10ccbe0e354cc35463d6fb3630c034360fbe0605d38e9ffe65c03a3e889947`.

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile, tui, waitFor, exchange, request, cleanup, log, sessionFiles, scratch, repo } from "./gate-lib.mjs";
import { recordStart, recordEnd } from "./record-run.mjs";
import { control, tuiStatus, tuiGrant, page, launchRpc, nativeLog, customStub } from "./continuation-lib.mjs";
recordStart("v05 cold-restart then partial-restore inventory and old-token sequence", ["gc3-control.mjs", "continuation-lib.mjs"]);
for (const name of ["cold-restart", "partial-restore"]) {
  const p = await profile(name);
  let t, rpc, stub;
  try {
    const expected = name === "cold-restart" ? 3 : 135;
    const reply = name === "cold-restart" ? "restart source complete" : "restore source complete";
    t = await tui(p, ["--extension", control]);
    t.send("HARNESS_AGENT=main");
    await waitFor(() => t.text, text => text.includes(reply), 120000);
    log("SCENARIO_FINAL_REPLY", { name, reply, observed: true });
    await waitFor(() => nativeLog(p), rows => rows.some(r => r.kind === "registry" && r.refs.filter(ref => ref.kind === "sub").length === expected && r.refs.filter(ref => ref.kind === "sub").every(ref => ref.status !== "running")), 180000);
    await tuiStatus(t, "BASELINE_FULL_STATUS");
    const before = await exchange(await tuiGrant(t));
    assert.equal(before.status, 200);
    const snapshot = await request(before, "/v1/snapshot", true);
    assert.equal(snapshot.status, 200);
    assert.equal(snapshot.body.children.length, expected);
    const child = snapshot.body.children[0];
    const root = snapshot.body.rootSession.value;
    const first = await page(before, child.childId, "", "OLD_PAGE_TOKEN_ISSUED");
    assert.equal(first.status, 200); assert.equal(first.body.kind, "page"); assert.equal(first.body.reset, false);
    const pending = await tuiGrant(t, "url"); const issuedAt = Date.now();
    const files = (await sessionFiles(p)).filter(path => path !== root);
    assert.equal(files.length, expected);
    log("PERSISTED_NATIVE_INVENTORY", { name, root, childFiles: files, expected, snapshotInventory: snapshot.body.inventory, epoch: before.epoch });
    await t.stop(); t = null;
    const scenario = JSON.parse(await readFile(join(repo, "omp-orca-observer/checks/harness/scenarios", name + ".json"), "utf8"));
    scenario.turns.main = [{ calls: [{ tool: "read", args: { path: "agent://" + child.childId } }] }, { text: "native restoration requested" }];
    stub = await customStub(p, scenario);
    rpc = await launchRpc(p, ["--resume", root]);
    await Bun.sleep(750);
    for (let i = 0; i < 12; i++) {
      const state = await rpc.status("PRE_RESTORE_FULL_STATUS");
      const refs = state.refs.filter(r => r.kind === "sub");
      log("PRE_RESTORE_INVENTORY_SAMPLE", { name, sample: i + 1, epoch: state.epoch, inventory: state.inventory, expected, registeredChildRefs: refs });
      assert.notEqual(state.epoch, before.epoch);
      assert.equal(refs.length, 0);
      assert.ok(state.inventory?.startsWith("unknown: registry not fully restored: 0 of " + expected), JSON.stringify(state));
      await Bun.sleep(100);
    }
    const origin = await rpc.serve();
    const oldCode = await exchange({ origin, code: pending.code });
    const oldCredential = await request({ ...before, origin }, "/v1/snapshot");
    const oldTokenBefore = await page({ ...before, origin }, child.childId, first.body.token, "OLD_TOKEN_BEFORE_NATIVE_RESTORE");
    assert.equal(oldCode.status, 401); assert.equal(oldCredential.status, 401); assert.equal(oldTokenBefore.status, 401);
    log("PRE_RESTORE_OLD_AUTH_RESULT", { name, result: "PASS", oldCodeStatus: oldCode.status, oldCredentialStatus: oldCredential.status, oldTokenWithOldCredentialStatus: oldTokenBefore.status, ageMs: Date.now() - issuedAt, ruling: "old grant store rejected before native admission" });
    const refusal = await rpc.command("/observer grant " + child.childId);
    log("PRE_RESTORE_GRANT_MODE_REFUSAL", { name, command: "/observer grant " + child.childId, events: refusal });
    assert.ok(refusal.some(e => e.method === "notify" && e.message === "observer grant requires interactive tui mode with UI"));
    const restorationEvents = await rpc.prompt();
    log("NATIVE_RESTORATION_TOOL_EVENTS", { name, command: "RPC prompt HARNESS_AGENT=main", events: restorationEvents.filter(e => e.type === "tool_execution_start" || e.type === "tool_execution_end") });
    assert.ok(restorationEvents.some(e => e.type === "tool_execution_start" && e.toolName === "read" && e.args?.path === "agent://" + child.childId));
    let restored;
    await waitFor(async () => restored = await rpc.status("POST_RESTORE_FULL_STATUS"), state => state.inventory === "complete" && state.refs.filter(r => r.kind === "sub").length === expected, 60000);
    const refs = restored.refs.filter(r => r.kind === "sub");
    for (const file of files) assert.ok(refs.some(ref => ref.sessionFile === file), "Unrestored child transcript: " + file);
    log("ALL_CHILD_TRANSCRIPTS_HAVE_REFS", { name, result: "PASS", inventory: restored.inventory, expected, refs });
    await rpc.close(); rpc = null;
    t = await tui(p, ["--extension", control, "--resume", root]);
    await waitFor(() => t.text, text => text.includes("native restoration requested"), 60000);
    await tuiStatus(t, "RESTORED_TUI_FULL_STATUS");
    const next = await exchange(await tuiGrant(t));
    assert.equal(next.status, 200); assert.notEqual(next.epoch, before.epoch);
    const nextSnapshot = await request(next, "/v1/snapshot", true);
    log("RESTORED_HTTP_SNAPSHOT", { name, status: nextSnapshot.status, epoch: nextSnapshot.body.epoch, inventory: nextSnapshot.body.inventory, children: nextSnapshot.body.children?.map(row => ({ childId: row.childId, registryStatus: row.registryStatus, outcome: row.outcome })) });
    assert.equal(nextSnapshot.status, 200); assert.equal(nextSnapshot.body.inventory.state, "complete"); assert.equal(nextSnapshot.body.children.length, expected);
    for (const row of nextSnapshot.body.children) assert.equal(row.outcome.state, "unknown", "Historical completion survived restart for " + row.childId);
    const oldTokenAfter = await page(next, child.childId, first.body.token, "OLD_TOKEN_AFTER_NATIVE_RESTORE");
    assert.equal(oldTokenAfter.status, 200); assert.equal(oldTokenAfter.body.kind, "page"); assert.equal(oldTokenAfter.body.reset, true);
    log("V05_RESTORATION_RESULT", { name, result: "PASS", unknownInventorySamples: 12, childTranscripts: expected, completeOnlyAfterAllNativeRefs: true, preRestoreOldCredentialRejected: 401, restoredOldTokenReset: true, namedPreRestoreTuiGrant: "UNVERIFIED: TUI restores eagerly; RPC refuses secret-bearing commands by mode before admission" });
  } catch (error) {
    log("V05_RESTORATION_FAILURE", { name, result: "FAIL", message: error.message, stack: error.stack, screen: t?.text.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>").slice(-6000) });
    process.exitCode = 1;
  } finally {
    await t?.stop(); await rpc?.close(); await stub?.stop(); await cleanup(p);
  }
}
recordEnd("Both disposable profiles, their native sessions/workspaces, persistent RPC/TUI processes and extra local stub servers were removed in awaited finally blocks. The named pre-restoration TUI grant moment is not claimed.");

```

#### gc3-control.mjs — exact source

sha256 `f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e`.

```javascript
import { appendFileSync } from "node:fs";
import { join } from "node:path";
const path = join(process.env.TMPDIR, "..", "gc3-native-probe.jsonl");
export default function(api) {
  const registry = api.pi.AgentRegistry.global();
  const refs = () => registry.list().map(r => ({ id: r.id, kind: r.kind, parentId: r.parentId, status: r.status, sessionFile: r.sessionFile, hasSession: Boolean(r.session) }));
  const save = (kind, data) => appendFileSync(path, JSON.stringify({ kind, at: Date.now(), ...data }) + "\n");
  api.on("session_start", (_, ctx) => {
    save("session_start", { agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() });
    if (ctx.agent.kind === "main") setInterval(() => save("registry", { refs: refs() }), 100).unref();
  });
  api.on("session_branch", (event, ctx) => save("session_branch", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.on("session_tree", (event, ctx) => save("session_tree", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.events.on("task:subagent:lifecycle", fact => save("lifecycle", { fact }));
  api.registerCommand("gc3native", {
    description: "Disposable registry evidence", handler: (_, ctx) => {
      const data = { sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() };
      save("report", data);
      ctx.ui.notify("GC3_NATIVE " + JSON.stringify(data), "info");
    }
  });
  api.registerCommand("gc3inject", {
    description: "Replay prior-run native bus evidence", handler: (args, ctx) => {
      const facts = JSON.parse(args);
      for (const fact of facts) api.events.emit("task:subagent:lifecycle", fact);
      save("injected", { facts, refs: refs() });
      ctx.ui.notify("GC3_INJECT " + JSON.stringify(facts), "info");
    }
  });
}

```

#### continuation-lib.mjs — exact source

sha256 `cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b`.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scratch, waitFor, log, request, repo } from "./gate-lib.mjs";
export const control = join(scratch, "gc3-control.mjs");
export const sha = value => createHash("sha256").update(value).digest("hex");
export const safe = value => value.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export async function nativeLog(p) {
  return (await readFile(join(p.root, "gc3-native-probe.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}
export async function tuiStatus(t, label = "FULL_OBSERVER_STATUS") {
  const mark = t.text.length;
  t.send("/observer status");
  const text = await waitFor(() => t.text.slice(mark), value => value.includes("inventory:"), 90000);
  await Bun.sleep(150);
  log(label, safe(t.text.slice(mark)));
  return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\r\n]+)/.exec(text)?.[1].trim() };
}
export async function tuiGrant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  let text;
  try { text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 90000); }
  finally { log("FULL_OBSERVER_" + kind.toUpperCase(), safe(t.text.slice(mark))); }
  const url = new URL([...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)].at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code"); url.hash = "";
  return { origin: url.href, code };
}
export async function page(session, childId, token = "", label = "PAGE") {
  const route = `/v1/children/${encodeURIComponent(childId)}/page?mode=entries&token=${encodeURIComponent(token)}`;
  const r = await request(session, route, true);
  const body = r.body;
  log(label, { route: route.replace(/token=[^&]+/, "token=<redacted>"), status: r.status, body: typeof body === "string" ? body : { kind: body.kind, reason: body.reason, mode: body.mode, malformed: body.malformed, reset: body.reset, atEnd: body.atEnd, tokenSha256: body.token ? sha(body.token) : null }, suppliedPriorToken: Boolean(token) });
  return r;
}
export async function launchRpc(p, args = []) {
  const c = p.spawn(["--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args]);
  const events = []; let carry = "", serial = 0;
  const out = (async () => { for await (const bytes of c.stdout) { carry += new TextDecoder().decode(bytes); const lines = carry.split("\n"); carry = lines.pop(); for (const line of lines) { try { events.push(JSON.parse(line)); } catch { events.push({ type: "nonjson", line }); } } } })();
  const err = new Response(c.stderr).text();
  async function wait(pred, from = 0, timeout = 120000) { return waitFor(() => events.slice(from), rows => rows.some(pred), timeout).then(rows => rows.find(pred)); }
  async function send(type, extra = {}) {
    const id = "gc3-" + (++serial);
    c.stdin.write(JSON.stringify({ id, type, ...extra }) + "\n");
    const response = await wait(e => e.type === "response" && e.id === id);
    assert.equal(response.success, true, JSON.stringify(response));
    return response;
  }
  async function command(message) {
    const from = events.length;
    await send("prompt", { message });
    await wait(e => e.type === "prompt_result", from);
    return events.slice(from);
  }
  async function report() {
    const rows = await command("/gc3native");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("GC3_NATIVE "))?.message;
    assert.ok(text, JSON.stringify(rows));
    return JSON.parse(text.slice("GC3_NATIVE ".length));
  }
  async function status(label) {
    const rows = await command("/observer status");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.includes("observer state:"))?.message;
    assert.ok(text, JSON.stringify(rows));
    log(label, { command: "/observer status", mode: "rpc", output: text });
    const reportValue = await report();
    return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\n]+)/.exec(text)?.[1].trim(), ...reportValue };
  }
  await wait(e => e.type === "ready");
  log("RPC_START", { command: ["omp", "--profile", p.name, "--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args] });
  let closed = false;
  return { events, send, wait, command, report, status, async prompt() { const from = events.length; await send("prompt", { message: "HARNESS_AGENT=main" }); await wait(e => e.type === "agent_end", from); return events.slice(from); }, async serve() { const rows = await command("/observer serve"); const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("observer serving: "))?.message; assert.ok(text, JSON.stringify(rows)); log("RPC_SERVE", { command: "/observer serve", output: text }); return text.slice("observer serving: ".length); }, async close() { if (closed) return; closed = true; c.kill(); const exitCode = await c.exited; await out; log("RPC_CLOSE", { exitCode, stderr: await err }); } };
}
export async function customStub(p, scenario) {
  const { startStub } = await import(join(repo, "omp-orca-observer/checks/harness/stub-provider.ts"));
  const stub = await startStub({ scenario, capture: p.capture });
  const models = join(p.home, ".omp/profiles", p.name, "agent/models.yml");
  await writeFile(models, (await readFile(models, "utf8")).replace(/baseUrl: .*/, "baseUrl: " + stub.url));
  log("DISPOSABLE_STUB_SCENARIO", scenario);
  return stub;
}

```

#### Observed output (incremental)

```text
PROFILE {"name":"cold-restart","root":"<tmp>/cold-restart","workspace":"<tmp>/cold-restart/workspace","stubUrl":"http://127.0.0.1:36273/v1"}
TUI_START {"command":["omp","--profile","cold-restart","--extension","<tmp>/gc3/gc3-control.mjs"],"cwd":"<tmp>/cold-restart/workspace","screen":"█  ██          │ ───────────────────────────────────────────────────────────────────── │\r│          ▒▒  ██          │ LSP Servers                                                           │\r│              ██          │ ● vscode-html-language-server .html .htm                              │\r│       ████████████       │ ! to run bash                                                         │\r│          ██  ██          │ $ to run python                                                       │\r│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │\r│          ▒▒  ██          │ LSP Servers                                                           │\r│       ████████████       │ ! to run bash                                                         │\r│          ██  ██          │ $ to run python                                                       │\r│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │\r│          ▒▒  ██          │ LSP Servers                                                           │\r│              ██          │ ● vscode-html-language-server .html .htm                              │\r"}
SCENARIO_FINAL_REPLY {"name":"cold-restart","reply":"restart source complete","observed":true}
BASELINE_FULL_STATUS │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│              ██          │ ● vscode-html-language-server .html .htm                              │
│       ████████████       │ ! to run bash                                                         │

 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: 0ab755fd-c070-4d3c-a51d-bf6ee56dd1b0                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
│       ████████████       │ ! to run bash                                                         │
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
FULL_OBSERVER_GRANT  π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 http://127.0.0.1:44757/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:18:18.737Z","schema":1,"epoch":"0ab755fd-c070-4d3c-a51d-bf6ee56dd1b0"}}
OLD_PAGE_TOKEN_ISSUED {"route":"/v1/children/restart-1/page?mode=entries&token=","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":false,"atEnd":true,"tokenSha256":"f0e5234aa06045bc999d5dfc866efd4637edaaa867b034de116d280bab47bac5"},"suppliedPriorToken":false}
FULL_OBSERVER_URL │       ████████████       │ ! to run bash                                                         │
 http://127.0.0.1:44757/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
PERSISTED_NATIVE_INVENTORY {"name":"cold-restart","root":"<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c.jsonl","childFiles":["<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-1.jsonl","<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-2.jsonl","<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-3.jsonl"],"expected":3,"snapshotInventory":{"state":"complete"},"epoch":"0ab755fd-c070-4d3c-a51d-bf6ee56dd1b0"}
TUI_STOP {"nativeStatus":143,"stderr":""}
DISPOSABLE_STUB_SCENARIO {"name":"cold-restart","setup":["create('cold-restart')","run HARNESS_AGENT=main until background children persist","stop omp without deleting its disposable profile, then restart on the same native session","inspect before persisted children have all restored"],"settings":{"async":{"enabled":true}},"agents":["bundled task: background children"],"expected":["new process epoch cannot claim complete inventory before native restoration","restored native child identities are not synthesized from transcript text"],"turns":{"main":[{"calls":[{"tool":"read","args":{"path":"agent://restart-1"}}]},{"text":"native restoration requested"}],"child/*":[{"text":"persisted child","delayMs":1000,"calls":[{"tool":"yield","args":{"type":"result"}}]}]}}
RPC_START {"command":["omp","--profile","cold-restart","--mode","rpc","--no-title","--no-lsp","--extension","<tmp>/gc3/gc3-control.mjs","--resume","<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c.jsonl"]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":1,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":2,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":3,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":4,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":5,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":6,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":7,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":8,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":9,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":10,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":11,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"cold-restart","sample":12,"epoch":"ee810b4e-f3de-48e9-a814-d363b6b4de1d","inventory":"unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl","expected":3,"registeredChildRefs":[]}
RPC_SERVE {"command":"/observer serve","output":"observer serving: http://127.0.0.1:36387/"}
EXCHANGE {"status":401,"body":"Unauthorized"}
REQUEST {"path":"/v1/snapshot","status":401,"body":"Unauthorized"}
OLD_TOKEN_BEFORE_NATIVE_RESTORE {"route":"/v1/children/restart-1/page?mode=entries&token=<redacted>","status":401,"body":"Unauthorized","suppliedPriorToken":true}
PRE_RESTORE_OLD_AUTH_RESULT {"name":"cold-restart","result":"PASS","oldCodeStatus":401,"oldCredentialStatus":401,"oldTokenWithOldCredentialStatus":401,"ageMs":4959,"ruling":"old grant store rejected before native admission"}
PRE_RESTORE_GRANT_MODE_REFUSAL {"name":"cold-restart","command":"/observer grant restart-1","events":[{"type":"extension_ui_request","id":"1594db7e7ec8e1f9","method":"notify","message":"observer grant requires interactive tui mode with UI","notifyType":"error"},{"id":"gc3-26","type":"response","command":"prompt","success":true},{"type":"prompt_result","id":"gc3-26","agentInvoked":false,"status":"completed","sessionSettled":true}]}
NATIVE_RESTORATION_TOOL_EVENTS {"name":"cold-restart","command":"RPC prompt HARNESS_AGENT=main","events":[{"type":"tool_execution_start","toolCallId":"chatcmpl-cold-restart-main-0-call-0","toolName":"read","args":{"path":"agent://restart-1"}},{"type":"tool_execution_end","toolCallId":"chatcmpl-cold-restart-main-0-call-0","toolName":"read","result":{"content":[{"type":"text","text":"\"persisted child\""}],"details":{"totalLines":1,"displayContent":{"text":"\"persisted child\"","startLine":1,"lineNumbers":[1]},"fileSize":17,"meta":{"source":{"type":"internal","value":"agent://restart-1"}},"resolvedPath":"<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-1.md","contentType":"text/markdown"}},"isError":false}]}
POST_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: http://127.0.0.1:36387/\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl"}
POST_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: ee810b4e-f3de-48e9-a814-d363b6b4de1d\nendpoint: http://127.0.0.1:36387/\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: complete"}
ALL_CHILD_TRANSCRIPTS_HAVE_REFS {"name":"cold-restart","result":"PASS","inventory":"complete","expected":3,"refs":[{"id":"restart-1","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-1.jsonl","hasSession":false},{"id":"restart-2","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-2.jsonl","hasSession":false},{"id":"restart-3","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c/restart-3.jsonl","hasSession":false}]}
RPC_CLOSE {"exitCode":143,"stderr":""}
TUI_START {"command":["omp","--profile","cold-restart","--extension","<tmp>/gc3/gc3-control.mjs","--resume","<tmp>/cold-restart/home/.omp/profiles/cold-restart/agent/sessions/--tmp-omp-orca-harness-BeuHaP-workspace--/2026-10-01T06-48-16-303Z_01a0f638-8caf-778f-930a-a55c2df98d8c.jsonl"],"cwd":"<tmp>/cold-restart/workspace","screen":"                                                                                                                                                                         Harness auxiliary reply\r\r\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  \r"}
RESTORED_TUI_FULL_STATUS  observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: 988e458a-dd3d-45fa-bb07-15148794afa9                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
FULL_OBSERVER_GRANT  http://127.0.0.1:42243/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-BeuHaP/workspace > ⑂ master ▶────────────────────────6%───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:18:26.501Z","schema":1,"epoch":"988e458a-dd3d-45fa-bb07-15148794afa9"}}
RESTORED_HTTP_SNAPSHOT {"name":"cold-restart","status":200,"epoch":"988e458a-dd3d-45fa-bb07-15148794afa9","inventory":{"state":"complete"},"children":[{"childId":"restart-1","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restart-2","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restart-3","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}}]}
OLD_TOKEN_AFTER_NATIVE_RESTORE {"route":"/v1/children/restart-1/page?mode=entries&token=<redacted>","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":true,"atEnd":true,"tokenSha256":"9fdf4b199ec8438b9bd15a9a64d4bf72168c9c6a38f9fa6c29051a2ded1c8231"},"suppliedPriorToken":true}
V05_RESTORATION_RESULT {"name":"cold-restart","result":"PASS","unknownInventorySamples":12,"childTranscripts":3,"completeOnlyAfterAllNativeRefs":true,"preRestoreOldCredentialRejected":401,"restoredOldTokenReset":true,"namedPreRestoreTuiGrant":"UNVERIFIED: TUI restores eagerly; RPC refuses secret-bearing commands by mode before admission"}
TUI_STOP {"nativeStatus":null,"stderr":""}
PROFILE_REMOVED {"name":"cold-restart","root":"<tmp>/cold-restart","absent":true}
PROFILE {"name":"partial-restore","root":"<tmp>/partial-restore","workspace":"<tmp>/partial-restore/workspace","stubUrl":"http://127.0.0.1:45909/v1"}
TUI_START {"command":["omp","--profile","partial-restore","--extension","<tmp>/gc3/gc3-control.mjs"],"cwd":"<tmp>/partial-restore/workspace","screen":"                                                                                                                                                                                                                                                                                                                                                                           ⇧⇥ to change thinking effort\r│       ████████████       │ ! to run bash                                                         │\r│          ██  ██          │ $ to run python                                                       │\r│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │\r│       ████████████       │ ! to run bash                                                         │\r│          ██  ██          │ $ to run python                                                       │\r│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │\r│          ▒▒  ██          │ LSP Servers                                                           │\r│              ██          │ ● vscode-html-language-server .html .htm                              │\r"}
SCENARIO_FINAL_REPLY {"name":"partial-restore","reply":"restore source complete","observed":true}
BASELINE_FULL_STATUS  Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-86 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-88 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-91 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-95 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-84 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-81 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-89 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-82 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-96 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-83 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-93 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-85 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-90 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-92 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-94 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-87 (14.3s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-110 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-112 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-103 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-111 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-105 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-108 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-109 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-104 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-98 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-99 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-106 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-97 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-100 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-102 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-101 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-107 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-126 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-115 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-117 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-123 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-127 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-113 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-118 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-121 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-114 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-119 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-125 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-124 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-122 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-116 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-128 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-120 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-130 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-133 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-135 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-129 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-134 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-131 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-132 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 epoch: 59650c66-b454-4ef4-9b74-25c457924bc5                                                                                                                                                                                                                                                                                                                                                                                                                                                                        

 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            

 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

 Subagents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          

  ├─ • restore-129: Harness auxiliary reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

  ├─ • restore-130: Harness auxiliary reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

  └─ • restore-131: Harness auxiliary reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

  … 4 more — expand                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 



────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply

 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─

╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
FULL_OBSERVER_GRANT  π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
 http://127.0.0.1:37597/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 ✘ 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 Dismissed when you send your next message.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         
────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:18:55.831Z","schema":1,"epoch":"59650c66-b454-4ef4-9b74-25c457924bc5"}}
OLD_PAGE_TOKEN_ISSUED {"route":"/v1/children/restore-9/page?mode=entries&token=","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":false,"atEnd":true,"tokenSha256":"fe5840ce9b7a41338fe7d09203f57b48571aedba15f436b71ade61438b2c91e5"},"suppliedPriorToken":false}
FULL_OBSERVER_URL  http://127.0.0.1:37597/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           
PERSISTED_NATIVE_INVENTORY {"name":"partial-restore","root":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd.jsonl","childFiles":["<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-2.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-43.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-77.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-108.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-109.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-30.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-118.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-111.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-90.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-74.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-126.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-24.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-37.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-16.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-32.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-125.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-69.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-84.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-65.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-17.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-73.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-58.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-42.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-96.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-14.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-100.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-56.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-135.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-116.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-91.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-23.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-103.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-88.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-71.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-106.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-78.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-105.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-123.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-107.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-94.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-41.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-114.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-55.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-52.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-87.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-11.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-22.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-127.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-36.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-50.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-70.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-44.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-110.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-34.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-131.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-13.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-129.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-89.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-48.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-79.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-113.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-85.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-46.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-20.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-99.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-104.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-72.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-124.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-49.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-60.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-120.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-133.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-93.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-26.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-53.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-102.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-81.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-63.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-75.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-122.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-29.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-33.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-51.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-132.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-8.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-12.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-6.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-57.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-31.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-117.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-40.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-83.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-76.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-39.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-3.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-54.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-86.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-68.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-121.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-128.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-18.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-45.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-130.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-10.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-66.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-80.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-27.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-25.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-35.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-62.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-82.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-112.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-15.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-119.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-64.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-9.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-59.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-1.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-101.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-38.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-4.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-67.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-92.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-134.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-95.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-19.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-7.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-47.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-5.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-21.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-61.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-97.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-115.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-28.jsonl","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-98.jsonl"],"expected":135,"snapshotInventory":{"state":"complete"},"epoch":"59650c66-b454-4ef4-9b74-25c457924bc5"}
TUI_STOP {"nativeStatus":null,"stderr":""}
DISPOSABLE_STUB_SCENARIO {"name":"partial-restore","setup":["create('partial-restore')","run HARNESS_AGENT=main until 135 task children are persisted in the disposable profile","restart omp on that native session","inspect the restoring inventory repeatedly before and after all registrations complete"],"settings":{"async":{"enabled":true},"task":{"maxConcurrency":16}},"agents":["bundled task: background child"],"expected":["partially restored inventory reports partial/unknown, not complete","post-restoration inventory includes each registered native child up to the configured observation limit"],"turns":{"main":[{"calls":[{"tool":"read","args":{"path":"agent://restore-9"}}]},{"text":"native restoration requested"}],"child/*":[{"text":"restored child","delayMs":2000,"calls":[{"tool":"yield","args":{"type":"result"}}]}]}}
RPC_START {"command":["omp","--profile","partial-restore","--mode","rpc","--no-title","--no-lsp","--extension","<tmp>/gc3/gc3-control.mjs","--resume","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd.jsonl"]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":1,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":2,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":3,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":4,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":5,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":6,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":7,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":8,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":9,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":10,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":11,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
PRE_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: not serving\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
PRE_RESTORE_INVENTORY_SAMPLE {"name":"partial-restore","sample":12,"epoch":"a2b80996-f9b6-43cf-a4bb-347d8dcbcadd","inventory":"unknown: registry not fully restored: 0 of 135; missing: restore-2.jsonl, restore-43.jsonl, restore-77.jsonl, restore-108.jsonl, restore-109.jsonl, restore-30.jsonl, restore-118.jsonl, restore-111.jsonl, restore-90.jsonl, restore-74.jsonl, restore-126.jsonl, restore-24.jsonl, restore-37.jsonl, restore-16.jsonl, restore-32.jsonl, restore-125.jsonl, restore-69.jsonl, restore-84.jsonl, restore-65.jsonl, restore-17.jsonl, restore-73.jsonl, restore-58.jsonl, restore-42.jsonl, restore-96.jsonl, restore-14.jsonl, restore-100.jsonl, restore-56.jsonl, restore-135.jsonl, restore-116.jsonl, restore-91.jsonl, restore-23.jsonl, restore-103.jsonl, restore-88.jsonl, restore-71.jsonl, restore-106.jsonl, restore-78.jsonl, restore-105.jsonl, restore-123.jsonl, restore-107.jsonl, restore-94.jsonl, restore-41.jsonl, restore-114.jsonl, restore-55.jsonl, restore-52.jsonl, restore-87.jsonl, restore-11.jsonl, restore-22.jsonl, restore-127.jsonl, restore-36.jsonl, restore-50.jsonl, restore-70.jsonl, restore-44.jsonl, restore-110.jsonl, restore-34.jsonl, restore-131.jsonl, restore-13.jsonl, restore-129.jsonl, restore-89.jsonl, restore-48.jsonl, restore-79.jsonl, restore-113.jsonl, restore-85.jsonl, restore-46.jsonl, restore-20.jsonl, restore-99.jsonl, restore-104.jsonl, restore-72.jsonl, restore-124.jsonl, restore-49.jsonl, restore-60.jsonl, restore-120.jsonl, restore-133.jsonl, restore-93.jsonl, restore-26.jsonl, restore-53.jsonl, restore-102.jsonl, restore-81.jsonl, restore-63.jsonl, restore-75.jsonl, restore-122.jsonl, restore-29.jsonl, restore-33.jsonl, restore-51.jsonl, restore-132.jsonl, restore-8.jsonl, restore-12.jsonl, restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl","expected":135,"registeredChildRefs":[]}
RPC_SERVE {"command":"/observer serve","output":"observer serving: http://127.0.0.1:35901/"}
EXCHANGE {"status":401,"body":"Unauthorized"}
REQUEST {"path":"/v1/snapshot","status":401,"body":"Unauthorized"}
OLD_TOKEN_BEFORE_NATIVE_RESTORE {"route":"/v1/children/restore-9/page?mode=entries&token=<redacted>","status":401,"body":"Unauthorized","suppliedPriorToken":true}
PRE_RESTORE_OLD_AUTH_RESULT {"name":"partial-restore","result":"PASS","oldCodeStatus":401,"oldCredentialStatus":401,"oldTokenWithOldCredentialStatus":401,"ageMs":9924,"ruling":"old grant store rejected before native admission"}
PRE_RESTORE_GRANT_MODE_REFUSAL {"name":"partial-restore","command":"/observer grant restore-9","events":[{"type":"extension_ui_request","id":"1594dba791dbb780","method":"notify","message":"observer grant requires interactive tui mode with UI","notifyType":"error"},{"id":"gc3-26","type":"response","command":"prompt","success":true},{"type":"prompt_result","id":"gc3-26","agentInvoked":false,"status":"completed","sessionSettled":true}]}
NATIVE_RESTORATION_TOOL_EVENTS {"name":"partial-restore","command":"RPC prompt HARNESS_AGENT=main","events":[{"type":"tool_execution_start","toolCallId":"chatcmpl-partial-restore-main-0-call-0","toolName":"read","args":{"path":"agent://restore-9"}},{"type":"tool_execution_end","toolCallId":"chatcmpl-partial-restore-main-0-call-0","toolName":"read","result":{"content":[{"type":"text","text":"\"restored child\""}],"details":{"totalLines":1,"displayContent":{"text":"\"restored child\"","startLine":1,"lineNumbers":[1]},"fileSize":16,"meta":{"source":{"type":"internal","value":"agent://restore-9"}},"resolvedPath":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-9.md","contentType":"text/markdown"}},"isError":false}]}
POST_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: http://127.0.0.1:35901/\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: unknown: registry not fully restored: 86 of 135; missing: restore-6.jsonl, restore-57.jsonl, restore-31.jsonl, restore-117.jsonl, restore-40.jsonl, restore-83.jsonl, restore-76.jsonl, restore-39.jsonl, restore-3.jsonl, restore-54.jsonl, restore-86.jsonl, restore-68.jsonl, restore-121.jsonl, restore-128.jsonl, restore-18.jsonl, restore-45.jsonl, restore-130.jsonl, restore-10.jsonl, restore-66.jsonl, restore-80.jsonl, restore-27.jsonl, restore-25.jsonl, restore-35.jsonl, restore-62.jsonl, restore-82.jsonl, restore-112.jsonl, restore-15.jsonl, restore-119.jsonl, restore-64.jsonl, restore-9.jsonl, restore-59.jsonl, restore-1.jsonl, restore-101.jsonl, restore-38.jsonl, restore-4.jsonl, restore-67.jsonl, restore-92.jsonl, restore-134.jsonl, restore-95.jsonl, restore-19.jsonl, restore-7.jsonl, restore-47.jsonl, restore-5.jsonl, restore-21.jsonl, restore-61.jsonl, restore-97.jsonl, restore-115.jsonl, restore-28.jsonl, restore-98.jsonl"}
POST_RESTORE_FULL_STATUS {"command":"/observer status","mode":"rpc","output":"observer state: ready\nepoch: a2b80996-f9b6-43cf-a4bb-347d8dcbcadd\nendpoint: http://127.0.0.1:35901/\ngrants: 0 children, 0 live credentials, 0 pending codes\ninventory: complete"}
ALL_CHILD_TRANSCRIPTS_HAVE_REFS {"name":"partial-restore","result":"PASS","inventory":"complete","expected":135,"refs":[{"id":"restore-2","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-2.jsonl","hasSession":false},{"id":"restore-43","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-43.jsonl","hasSession":false},{"id":"restore-77","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-77.jsonl","hasSession":false},{"id":"restore-108","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-108.jsonl","hasSession":false},{"id":"restore-109","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-109.jsonl","hasSession":false},{"id":"restore-30","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-30.jsonl","hasSession":false},{"id":"restore-118","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-118.jsonl","hasSession":false},{"id":"restore-111","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-111.jsonl","hasSession":false},{"id":"restore-90","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-90.jsonl","hasSession":false},{"id":"restore-74","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-74.jsonl","hasSession":false},{"id":"restore-126","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-126.jsonl","hasSession":false},{"id":"restore-24","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-24.jsonl","hasSession":false},{"id":"restore-37","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-37.jsonl","hasSession":false},{"id":"restore-16","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-16.jsonl","hasSession":false},{"id":"restore-32","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-32.jsonl","hasSession":false},{"id":"restore-125","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-125.jsonl","hasSession":false},{"id":"restore-69","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-69.jsonl","hasSession":false},{"id":"restore-84","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-84.jsonl","hasSession":false},{"id":"restore-65","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-65.jsonl","hasSession":false},{"id":"restore-17","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-17.jsonl","hasSession":false},{"id":"restore-73","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-73.jsonl","hasSession":false},{"id":"restore-58","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-58.jsonl","hasSession":false},{"id":"restore-42","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-42.jsonl","hasSession":false},{"id":"restore-96","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-96.jsonl","hasSession":false},{"id":"restore-14","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-14.jsonl","hasSession":false},{"id":"restore-100","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-100.jsonl","hasSession":false},{"id":"restore-56","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-56.jsonl","hasSession":false},{"id":"restore-135","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-135.jsonl","hasSession":false},{"id":"restore-116","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-116.jsonl","hasSession":false},{"id":"restore-91","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-91.jsonl","hasSession":false},{"id":"restore-23","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-23.jsonl","hasSession":false},{"id":"restore-103","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-103.jsonl","hasSession":false},{"id":"restore-88","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-88.jsonl","hasSession":false},{"id":"restore-71","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-71.jsonl","hasSession":false},{"id":"restore-106","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-106.jsonl","hasSession":false},{"id":"restore-78","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-78.jsonl","hasSession":false},{"id":"restore-105","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-105.jsonl","hasSession":false},{"id":"restore-123","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-123.jsonl","hasSession":false},{"id":"restore-107","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-107.jsonl","hasSession":false},{"id":"restore-94","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-94.jsonl","hasSession":false},{"id":"restore-41","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-41.jsonl","hasSession":false},{"id":"restore-114","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-114.jsonl","hasSession":false},{"id":"restore-55","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-55.jsonl","hasSession":false},{"id":"restore-52","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-52.jsonl","hasSession":false},{"id":"restore-87","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-87.jsonl","hasSession":false},{"id":"restore-11","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-11.jsonl","hasSession":false},{"id":"restore-22","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-22.jsonl","hasSession":false},{"id":"restore-127","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-127.jsonl","hasSession":false},{"id":"restore-36","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-36.jsonl","hasSession":false},{"id":"restore-50","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-50.jsonl","hasSession":false},{"id":"restore-70","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-70.jsonl","hasSession":false},{"id":"restore-44","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-44.jsonl","hasSession":false},{"id":"restore-110","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-110.jsonl","hasSession":false},{"id":"restore-34","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-34.jsonl","hasSession":false},{"id":"restore-131","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-131.jsonl","hasSession":false},{"id":"restore-13","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-13.jsonl","hasSession":false},{"id":"restore-129","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-129.jsonl","hasSession":false},{"id":"restore-89","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-89.jsonl","hasSession":false},{"id":"restore-48","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-48.jsonl","hasSession":false},{"id":"restore-79","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-79.jsonl","hasSession":false},{"id":"restore-113","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-113.jsonl","hasSession":false},{"id":"restore-85","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-85.jsonl","hasSession":false},{"id":"restore-46","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-46.jsonl","hasSession":false},{"id":"restore-20","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-20.jsonl","hasSession":false},{"id":"restore-99","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-99.jsonl","hasSession":false},{"id":"restore-104","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-104.jsonl","hasSession":false},{"id":"restore-72","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-72.jsonl","hasSession":false},{"id":"restore-124","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-124.jsonl","hasSession":false},{"id":"restore-49","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-49.jsonl","hasSession":false},{"id":"restore-60","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-60.jsonl","hasSession":false},{"id":"restore-120","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-120.jsonl","hasSession":false},{"id":"restore-133","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-133.jsonl","hasSession":false},{"id":"restore-93","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-93.jsonl","hasSession":false},{"id":"restore-26","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-26.jsonl","hasSession":false},{"id":"restore-53","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-53.jsonl","hasSession":false},{"id":"restore-102","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-102.jsonl","hasSession":false},{"id":"restore-81","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-81.jsonl","hasSession":false},{"id":"restore-63","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-63.jsonl","hasSession":false},{"id":"restore-75","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-75.jsonl","hasSession":false},{"id":"restore-122","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-122.jsonl","hasSession":false},{"id":"restore-29","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-29.jsonl","hasSession":false},{"id":"restore-33","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-33.jsonl","hasSession":false},{"id":"restore-51","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-51.jsonl","hasSession":false},{"id":"restore-132","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-132.jsonl","hasSession":false},{"id":"restore-8","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-8.jsonl","hasSession":false},{"id":"restore-12","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-12.jsonl","hasSession":false},{"id":"restore-6","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-6.jsonl","hasSession":false},{"id":"restore-57","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-57.jsonl","hasSession":false},{"id":"restore-31","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-31.jsonl","hasSession":false},{"id":"restore-117","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-117.jsonl","hasSession":false},{"id":"restore-40","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-40.jsonl","hasSession":false},{"id":"restore-83","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-83.jsonl","hasSession":false},{"id":"restore-76","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-76.jsonl","hasSession":false},{"id":"restore-39","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-39.jsonl","hasSession":false},{"id":"restore-3","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-3.jsonl","hasSession":false},{"id":"restore-54","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-54.jsonl","hasSession":false},{"id":"restore-86","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-86.jsonl","hasSession":false},{"id":"restore-68","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-68.jsonl","hasSession":false},{"id":"restore-121","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-121.jsonl","hasSession":false},{"id":"restore-128","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-128.jsonl","hasSession":false},{"id":"restore-18","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-18.jsonl","hasSession":false},{"id":"restore-45","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-45.jsonl","hasSession":false},{"id":"restore-130","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-130.jsonl","hasSession":false},{"id":"restore-10","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-10.jsonl","hasSession":false},{"id":"restore-66","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-66.jsonl","hasSession":false},{"id":"restore-80","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-80.jsonl","hasSession":false},{"id":"restore-27","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-27.jsonl","hasSession":false},{"id":"restore-25","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-25.jsonl","hasSession":false},{"id":"restore-35","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-35.jsonl","hasSession":false},{"id":"restore-62","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-62.jsonl","hasSession":false},{"id":"restore-82","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-82.jsonl","hasSession":false},{"id":"restore-112","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-112.jsonl","hasSession":false},{"id":"restore-15","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-15.jsonl","hasSession":false},{"id":"restore-119","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-119.jsonl","hasSession":false},{"id":"restore-64","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-64.jsonl","hasSession":false},{"id":"restore-9","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-9.jsonl","hasSession":false},{"id":"restore-59","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-59.jsonl","hasSession":false},{"id":"restore-1","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-1.jsonl","hasSession":false},{"id":"restore-101","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-101.jsonl","hasSession":false},{"id":"restore-38","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-38.jsonl","hasSession":false},{"id":"restore-4","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-4.jsonl","hasSession":false},{"id":"restore-67","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-67.jsonl","hasSession":false},{"id":"restore-92","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-92.jsonl","hasSession":false},{"id":"restore-134","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-134.jsonl","hasSession":false},{"id":"restore-95","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-95.jsonl","hasSession":false},{"id":"restore-19","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-19.jsonl","hasSession":false},{"id":"restore-7","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-7.jsonl","hasSession":false},{"id":"restore-47","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-47.jsonl","hasSession":false},{"id":"restore-5","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-5.jsonl","hasSession":false},{"id":"restore-21","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-21.jsonl","hasSession":false},{"id":"restore-61","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-61.jsonl","hasSession":false},{"id":"restore-97","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-97.jsonl","hasSession":false},{"id":"restore-115","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-115.jsonl","hasSession":false},{"id":"restore-28","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-28.jsonl","hasSession":false},{"id":"restore-98","kind":"sub","parentId":"Main","status":"parked","sessionFile":"<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-98.jsonl","hasSession":false}]}
RPC_CLOSE {"exitCode":143,"stderr":""}
TUI_START {"command":["omp","--profile","partial-restore","--extension","<tmp>/gc3/gc3-control.mjs","--resume","<tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd.jsonl"],"cwd":"<tmp>/partial-restore/workspace","screen":"                                                                                                                                                                         Harness auxiliary reply\r\r\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─\r\r\n╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  \r"}
RESTORED_TUI_FULL_STATUS  Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-110 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-112 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-103 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-111 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-105 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-108 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-109 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-104 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-98 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-99 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-106 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-97 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                               

 • Background job completed [task] restore-100 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-102 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-101 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-107 (16.7s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-126 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-115 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-117 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-123 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-127 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-113 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-118 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-121 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-114 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-119 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-125 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-124 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-122 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-116 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-128 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-120 (19.0s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-130 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-133 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-135 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-129 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-134 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 • Background job completed [task] restore-131 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



 • Background job completed [task] restore-132 (21.2s)                                                                                                                                                                                                                                                                                                                                                                                                                                                              



 Error: 409 Unscripted turn                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

 HARNESS_AGENT=main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    



╭─── • Read agent://restore-9 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮

│ "restored child"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 │

├─── Output ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤

│ ⟦Resolved path: <tmp>/partial-restore/home/.omp/profiles/partial-restore/agent/sessions/--tmp-omp-orca-harness-invuLP-workspace--/2026-10-01T06-48-33-356Z_01a0f638-cf4c-7387-a811-e72ee5b545fd/restore-9.md⟧                                                                                                                                                                                                                                                                                             │

╰──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯



 native restoration requested                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       



 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 epoch: 166e8276-bc7d-4085-bcd6-0e73c8c1cb8c                                                                                                                                                                                                                                                                                                                                                                                                                                                                        

 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              

 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            

 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply

 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─

╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
FULL_OBSERVER_GRANT  http://127.0.0.1:41579/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-invuLP/workspace > ⑂ master ▶─────────────────────────────────────────────────────────────────────────────────20%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:19:08.677Z","schema":1,"epoch":"166e8276-bc7d-4085-bcd6-0e73c8c1cb8c"}}
RESTORED_HTTP_SNAPSHOT {"name":"partial-restore","status":200,"epoch":"166e8276-bc7d-4085-bcd6-0e73c8c1cb8c","inventory":{"state":"complete"},"children":[{"childId":"restore-2","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-43","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-77","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-108","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-109","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-30","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-118","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-111","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-90","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-74","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-126","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-24","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-37","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-16","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-32","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-125","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-69","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-84","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-65","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-17","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-73","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-58","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-42","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-96","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-14","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-100","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-56","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-135","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-116","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-91","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-23","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-103","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-88","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-71","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-106","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-78","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-105","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-123","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-107","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-94","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-41","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-114","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-55","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-52","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-87","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-11","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-22","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-127","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-36","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-50","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-70","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-44","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-110","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-34","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-131","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-13","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-129","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-89","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-48","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-79","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-113","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-85","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-46","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-20","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-99","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-104","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-72","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-124","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-49","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-60","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-120","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-133","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-93","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-26","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-53","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-102","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-81","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-63","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-75","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-122","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-29","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-33","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-51","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-132","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-8","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-12","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-6","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-57","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-31","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-117","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-40","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-83","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-76","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-39","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-3","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-54","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-86","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-68","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-121","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-128","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-18","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-45","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-130","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-10","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-66","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-80","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-27","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-25","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-35","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-62","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-82","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-112","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-15","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-119","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-64","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-9","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-59","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-1","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-101","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-38","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-4","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-67","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-92","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-134","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-95","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-19","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-7","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-47","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-5","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-21","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-61","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-97","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-115","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-28","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}},{"childId":"restore-98","registryStatus":"parked","outcome":{"state":"unknown","reason":"no lifecycle evidence"}}]}
OLD_TOKEN_AFTER_NATIVE_RESTORE {"route":"/v1/children/restore-9/page?mode=entries&token=<redacted>","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":true,"atEnd":true,"tokenSha256":"f524ce61f6dc7527aa51561c05e208ab6e23f3ac22785a75c4a88030ed17d1ff"},"suppliedPriorToken":true}
V05_RESTORATION_RESULT {"name":"partial-restore","result":"PASS","unknownInventorySamples":12,"childTranscripts":135,"completeOnlyAfterAllNativeRefs":true,"preRestoreOldCredentialRejected":401,"restoredOldTokenReset":true,"namedPreRestoreTuiGrant":"UNVERIFIED: TUI restores eagerly; RPC refuses secret-bearing commands by mode before admission"}
TUI_STOP {"nativeStatus":null,"stderr":""}
PROFILE_REMOVED {"name":"partial-restore","root":"<tmp>/partial-restore","absent":true}

```

Runner exit: 0. Both disposable profiles, their native sessions/workspaces, persistent RPC/TUI processes and extra local stub servers were removed in awaited finally blocks. The named pre-restoration TUI grant moment is not claimed.

**PASS — cold-restart and partial-restore inventory plus old tokens.** `GC3_REPO="$PWD" bun <tmp>/gc3/v05-restore-continuation.mjs` exited 0 (59.38 s). Each fresh RPC publisher was sampled 12 times with zero native child refs: cold inventory was exactly `unknown: registry not fully restored: 0 of 3; missing: restart-1.jsonl, restart-2.jsonl, restart-3.jsonl`; partial inventory was `unknown: registry not fully restored: 0 of 135` with every missing filename recorded above. None of those samples said complete. After native `read agent://restart-1` / `read agent://restore-9`, partial restore additionally exposed `unknown: registry not fully restored: 86 of 135`; later complete inventory was independently paired with all 3 / all 135 native refs, and every persisted child filename matched a ref.

Cold restart changed epoch `0ab755fd-c070-4d3c-a51d-bf6ee56dd1b0` → `ee810b4e-f3de-48e9-a814-d363b6b4de1d`; partial restart changed to `a2b80996-f9b6-43cf-a4bb-347d8dcbcadd`. Before native restoration old unused code, old snapshot credential, and old-token page requests with that credential all returned exactly HTTP 401 / `Unauthorized`, at 4,959 ms and 9,924 ms respectively after the unused code was issued (before ordinary expiry). This is the corrected expected rejection, not a 404 failure.

After native restoration, a fresh TUI-only command grant read each old page token as HTTP 200, `kind:"page"`, `reset:true`; the subsequent TUI publisher epochs were `988e48da-d3dd-45fa-bb07-15148794afa9` and `166e8276-bc7d-4085-bcd6-0e73c8c1cb8c`. All restored snapshot outcomes were `unknown("no lifecycle evidence")`, never historical completed results. Both profiles were removed with `absent:true`.

**Reachability limit, not a substituted assertion:** a pre-restoration named TUI grant refusal was not observed because native TUI restoration is eager. In the reachable pre-restoration RPC window, `/observer grant restart-1` / `restore-9` correctly refused secrets with `observer grant requires interactive tui mode with UI`, before admission selection. The exact mode refusal is retained; it is not presented as a named child-admission refusal. Stock background `409 Unscripted turn` messages are preserved in the TUI capture, not suppressed or repaired.

### v05 branch — native rewind selector

The cited installed dev source `selector-controller.ts:1073-1116,1153-1197` implements `/branch`'s native rewind selector and reports `Already at this point` when Enter targets the current non-user leaf; an earlier user-request target makes a real rewind. This continuation selects the earlier user turn instead of asserting a transition after selecting the current leaf. The earlier selector timeout remains historical.

### v05 branch native selector continuation

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-branch-continuation.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### v05-branch-continuation.mjs — exact source

sha256 `652378c58743ab015ec98cb202459632e9c3e21c49847f0eb3ac309e679e9480`.

```javascript
import assert from "node:assert/strict";
import { profile, tui, waitFor, exchange, request, cleanup, log } from "./gate-lib.mjs";
import { recordStart, recordEnd } from "./record-run.mjs";
import { control, tuiStatus, tuiGrant, page, nativeLog, safe } from "./continuation-lib.mjs";
recordStart("v05 branch native selector continuation", ["gc3-control.mjs", "continuation-lib.mjs"]);
const p = await profile("one-child");
let t;
try {
  t = await tui(p, ["--extension", control]);
  t.send("HARNESS_AGENT=main");
  await waitFor(() => t.text, text => text.includes("main complete"), 60000);
  log("SCENARIO_FINAL_REPLY", "main complete");
  await tuiStatus(t, "BASELINE_FULL_OBSERVER_STATUS");
  const old = await exchange(await tuiGrant(t));
  assert.equal(old.status, 200);
  const snap = await request(old, "/v1/snapshot");
  assert.equal(snap.status, 200);
  const child = snap.body.children[0]; assert.ok(child);
  const issued = await page(old, child.childId, "", "BEFORE_BRANCH_PAGE");
  assert.equal(issued.status, 200); assert.equal(issued.body.kind, "page");
  const unused = await tuiGrant(t, "url"); const issuedAt = Date.now();
  let mark = t.text.length;
  t.send("/branch");
  await waitFor(() => t.text.slice(mark), text => text.includes("pick the point to continue from"), 30000);
  await Bun.sleep(500);
  log("BRANCH_SELECTOR_FULL_SCREEN", safe(t.text.slice(mark)));
  mark = t.text.length;
  t.keys("\x1b[D");
  await Bun.sleep(500);
  log("BRANCH_SELECT_EARLIER_USER", { keys: "Left arrow (native previous user turn)", output: safe(t.text.slice(mark)) });
  mark = t.text.length;
  t.keys("\r");
  await waitFor(() => t.text.slice(mark), text => /Rewound to selected point|Navigation cancelled|Already at this point/.test(text), 30000);
  log("BRANCH_SELECTION_RESULT_SCREEN", safe(t.text.slice(mark)));
  assert.ok(t.text.slice(mark).includes("Rewound to selected point"));
  t.keys("\x15"); await Bun.sleep(250);
  const next = await tuiStatus(t, "AFTER_BRANCH_FULL_OBSERVER_STATUS");
  assert.ok(next.epoch); assert.notEqual(next.epoch, old.epoch);
  const events = (await nativeLog(p)).filter(row => row.kind === "session_branch" || row.kind === "session_tree");
  log("NATIVE_BRANCH_EVENTS", events);
  assert.ok(events.length > 0, "No native branch/tree event observed");
  mark = t.text.length;
  t.send("/observer serve");
  const served = await waitFor(() => t.text.slice(mark), text => /observer serving: http:\/\/127\.0\.0\.1:\d+\//.test(text), 90000);
  log("AFTER_BRANCH_FULL_SERVE", safe(t.text.slice(mark)));
  const origin = /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(served)[1];
  const oldCode = await exchange({ origin, code: unused.code });
  const oldCredential = await request({ ...old, origin }, "/v1/snapshot");
  const oldPage = await page({ ...old, origin }, child.childId, issued.body.token, "AFTER_BRANCH_OLD_PAGE_TOKEN");
  assert.equal(oldCode.status, 401); assert.equal(oldCredential.status, 401); assert.equal(oldPage.status, 401);
  log("V05_BRANCH_RESULT", { result: "PASS", nativePath: "/branch -> Left -> Enter", oldEpoch: old.epoch, epoch: next.epoch, oldCodeStatus: oldCode.status, oldCredentialStatus: oldCredential.status, oldPageTokenStatus: oldPage.status, elapsedUnusedCodeMs: Date.now() - issuedAt });
} catch (error) {
  log("V05_BRANCH_FAILURE", { result: "FAIL", message: error.message, stack: error.stack, screen: t ? safe(t.text).slice(-6000) : "" });
  process.exitCode = 1;
} finally {
  await t?.stop(); await cleanup(p);
  recordEnd("The genuine stock selector, transition event, publisher state and old authenticated requests are judged above; all profile resources were removed.");
}

```

#### gc3-control.mjs — exact source

sha256 `f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e`.

```javascript
import { appendFileSync } from "node:fs";
import { join } from "node:path";
const path = join(process.env.TMPDIR, "..", "gc3-native-probe.jsonl");
export default function(api) {
  const registry = api.pi.AgentRegistry.global();
  const refs = () => registry.list().map(r => ({ id: r.id, kind: r.kind, parentId: r.parentId, status: r.status, sessionFile: r.sessionFile, hasSession: Boolean(r.session) }));
  const save = (kind, data) => appendFileSync(path, JSON.stringify({ kind, at: Date.now(), ...data }) + "\n");
  api.on("session_start", (_, ctx) => {
    save("session_start", { agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() });
    if (ctx.agent.kind === "main") setInterval(() => save("registry", { refs: refs() }), 100).unref();
  });
  api.on("session_branch", (event, ctx) => save("session_branch", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.on("session_tree", (event, ctx) => save("session_tree", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.events.on("task:subagent:lifecycle", fact => save("lifecycle", { fact }));
  api.registerCommand("gc3native", {
    description: "Disposable registry evidence", handler: (_, ctx) => {
      const data = { sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() };
      save("report", data);
      ctx.ui.notify("GC3_NATIVE " + JSON.stringify(data), "info");
    }
  });
  api.registerCommand("gc3inject", {
    description: "Replay prior-run native bus evidence", handler: (args, ctx) => {
      const facts = JSON.parse(args);
      for (const fact of facts) api.events.emit("task:subagent:lifecycle", fact);
      save("injected", { facts, refs: refs() });
      ctx.ui.notify("GC3_INJECT " + JSON.stringify(facts), "info");
    }
  });
}

```

#### continuation-lib.mjs — exact source

sha256 `cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b`.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scratch, waitFor, log, request, repo } from "./gate-lib.mjs";
export const control = join(scratch, "gc3-control.mjs");
export const sha = value => createHash("sha256").update(value).digest("hex");
export const safe = value => value.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export async function nativeLog(p) {
  return (await readFile(join(p.root, "gc3-native-probe.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}
export async function tuiStatus(t, label = "FULL_OBSERVER_STATUS") {
  const mark = t.text.length;
  t.send("/observer status");
  const text = await waitFor(() => t.text.slice(mark), value => value.includes("inventory:"), 90000);
  await Bun.sleep(150);
  log(label, safe(t.text.slice(mark)));
  return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\r\n]+)/.exec(text)?.[1].trim() };
}
export async function tuiGrant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  let text;
  try { text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 90000); }
  finally { log("FULL_OBSERVER_" + kind.toUpperCase(), safe(t.text.slice(mark))); }
  const url = new URL([...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)].at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code"); url.hash = "";
  return { origin: url.href, code };
}
export async function page(session, childId, token = "", label = "PAGE") {
  const route = `/v1/children/${encodeURIComponent(childId)}/page?mode=entries&token=${encodeURIComponent(token)}`;
  const r = await request(session, route, true);
  const body = r.body;
  log(label, { route: route.replace(/token=[^&]+/, "token=<redacted>"), status: r.status, body: typeof body === "string" ? body : { kind: body.kind, reason: body.reason, mode: body.mode, malformed: body.malformed, reset: body.reset, atEnd: body.atEnd, tokenSha256: body.token ? sha(body.token) : null }, suppliedPriorToken: Boolean(token) });
  return r;
}
export async function launchRpc(p, args = []) {
  const c = p.spawn(["--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args]);
  const events = []; let carry = "", serial = 0;
  const out = (async () => { for await (const bytes of c.stdout) { carry += new TextDecoder().decode(bytes); const lines = carry.split("\n"); carry = lines.pop(); for (const line of lines) { try { events.push(JSON.parse(line)); } catch { events.push({ type: "nonjson", line }); } } } })();
  const err = new Response(c.stderr).text();
  async function wait(pred, from = 0, timeout = 120000) { return waitFor(() => events.slice(from), rows => rows.some(pred), timeout).then(rows => rows.find(pred)); }
  async function send(type, extra = {}) {
    const id = "gc3-" + (++serial);
    c.stdin.write(JSON.stringify({ id, type, ...extra }) + "\n");
    const response = await wait(e => e.type === "response" && e.id === id);
    assert.equal(response.success, true, JSON.stringify(response));
    return response;
  }
  async function command(message) {
    const from = events.length;
    await send("prompt", { message });
    await wait(e => e.type === "prompt_result", from);
    return events.slice(from);
  }
  async function report() {
    const rows = await command("/gc3native");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("GC3_NATIVE "))?.message;
    assert.ok(text, JSON.stringify(rows));
    return JSON.parse(text.slice("GC3_NATIVE ".length));
  }
  async function status(label) {
    const rows = await command("/observer status");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.includes("observer state:"))?.message;
    assert.ok(text, JSON.stringify(rows));
    log(label, { command: "/observer status", mode: "rpc", output: text });
    const reportValue = await report();
    return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\n]+)/.exec(text)?.[1].trim(), ...reportValue };
  }
  await wait(e => e.type === "ready");
  log("RPC_START", { command: ["omp", "--profile", p.name, "--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args] });
  let closed = false;
  return { events, send, wait, command, report, status, async prompt() { const from = events.length; await send("prompt", { message: "HARNESS_AGENT=main" }); await wait(e => e.type === "agent_end", from); return events.slice(from); }, async serve() { const rows = await command("/observer serve"); const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("observer serving: "))?.message; assert.ok(text, JSON.stringify(rows)); log("RPC_SERVE", { command: "/observer serve", output: text }); return text.slice("observer serving: ".length); }, async close() { if (closed) return; closed = true; c.kill(); const exitCode = await c.exited; await out; log("RPC_CLOSE", { exitCode, stderr: await err }); } };
}
export async function customStub(p, scenario) {
  const { startStub } = await import(join(repo, "omp-orca-observer/checks/harness/stub-provider.ts"));
  const stub = await startStub({ scenario, capture: p.capture });
  const models = join(p.home, ".omp/profiles", p.name, "agent/models.yml");
  await writeFile(models, (await readFile(models, "utf8")).replace(/baseUrl: .*/, "baseUrl: " + stub.url));
  log("DISPOSABLE_STUB_SCENARIO", scenario);
  return stub;
}

```

#### Observed output (incremental)

```text
PROFILE {"name":"one-child","root":"<tmp>/one-child","workspace":"<tmp>/one-child/workspace","stubUrl":"http://127.0.0.1:44745/v1"}
TUI_START {"command":["omp","--profile","one-child","--extension","<tmp>/gc3/gc3-control.mjs"],"cwd":"<tmp>/one-child/workspace","screen":"\u001b_25a1;s\u001b\\\u001b_tsp;q;{\"q\":\"hello\",\"v\":[1],\"app\":\"omp\"}\u001b\\"}
SCENARIO_FINAL_REPLY main complete
BASELINE_FULL_OBSERVER_STATUS │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: 19f91f42-9e80-4270-9513-1da4f54395a5                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-4o0CJI/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
FULL_OBSERVER_GRANT │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
 http://127.0.0.1:37159/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-4o0CJI/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:22:34.714Z","schema":1,"epoch":"19f91f42-9e80-4270-9513-1da4f54395a5"}}
REQUEST {"path":"/v1/snapshot","status":200,"body":{"schema":1,"epoch":"19f91f42-9e80-4270-9513-1da4f54395a5","generation":2,"observedAt":"2026-10-01T06:52:34.100Z","rootSession":{"known":true,"value":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-4o0CJI-workspace--/2026-10-01T06-52-32-943Z_01a0f63c-772f-7428-a33a-eccec4ddafd3.jsonl"},"inventory":{"state":"complete"},"children":[{"childId":"child-one","parentId":"Main","rootSession":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-4o0CJI-workspace--/2026-10-01T06-52-32-943Z_01a0f63c-772f-7428-a33a-eccec4ddafd3.jsonl","kind":"sub","agentName":"blocking","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"idle","tombstoned":false,"outcome":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-one-child-main-0-call-0"},"at":"2026-10-01T06:52:34.045Z"},"milestones":{"responseAt":{"known":true,"value":"2026-10-01T06:52:34.040Z"},"acceptedAt":{"known":true,"value":"2026-10-01T06:52:34.041Z"},"terminalAt":{"known":true,"value":"2026-10-01T06:52:34.043Z"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:52:34.043Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/one-child/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:52:34.100Z","grantScope":"granted"}]}}
BEFORE_BRANCH_PAGE {"route":"/v1/children/child-one/page?mode=entries&token=","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":false,"atEnd":true,"tokenSha256":"e15295c5723ec915f0966235ea73e82d813e478cb69811f646519d4219a5e2a8"},"suppliedPriorToken":false}
FULL_OBSERVER_URL │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
 http://127.0.0.1:37159/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
BRANCH_SELECTOR_FULL_SCREEN ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

 ↶ Rewind · pick the point to continue from                                                                                                                                                                                                                                                                                                                                                                                                                                                                         

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

   HARNESS_AGENT=main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

  ╭─── • Task 1 agent ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮   

  │ Native single child                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         │   

  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   

  │ • child-one: Harness auxiliary reply ⟦blocking⟧ ⟦done⟧ · 1 req · 75ms                                                                                                                                                                                                                                                                                                                                                                                                                                       │   

  │   yield[result]: child complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                             │   

  │ ⟦1 succeeded · 1 req · 81ms⟧                                                                                                                                                                                                                                                                                                                                                                                                                                                                                │   

  ╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯   

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ 

┆  main complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  ┆ 

╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ 

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    

 3/3  ↑/↓ step  ←/→ user turns  f filter  ⏎ rewind  Ctrl+O expand  ⎋ cancel                                                                                                                                                                                                                                                                                                                                                                                                                                         

────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
BRANCH_SELECT_EARLIER_USER {"keys":"Left arrow (native previous user turn)","output":"╭┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╮ \r┆                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 ┆ \r┆  HARNESS_AGENT=main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             ┆ \r┆                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 ┆ \r╰┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄╯ \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    \r  ╭─── • Task 1 agent ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╮   \r  │ Native single child                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         │   \r  ├─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤   \r  │ • child-one: Harness auxiliary reply ⟦blocking⟧ ⟦done⟧ · 1 req · 75ms                                                                                                                                                                                                                                                                                                                                                                                                                                       │   \r  │   yield[result]: child complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                             │   \r  │ ⟦1 succeeded · 1 req · 81ms⟧                                                                                                                                                                                                                                                                                                                                                                                                                                                                                │   \r  ╰─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╯   \r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    \r   main complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    \r 1/3  ↑/↓ step  ←/→ user turns  f filter  ⏎ rewind  Ctrl+O expand  ⎋ cancel                                                                                                                                                                                                                                                                                                                                                                                                                                         \r"}
BRANCH_SELECTION_RESULT_SCREEN 

╭─── omp v18.4.6 ──────────────────────────────────────────────────────────────────────────────────╮

│                          │ Tips                                                                  │

│      Welcome back!       │ # for prompt actions                                                  │

│                          │ / for commands                                                        │

│       ████████████       │ ! to run bash                                                         │

│          ██  ██          │ $ to run python                                                       │

│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │

│          ▒▒  ██          │ LSP Servers                                                           │

│              ██          │ ● vscode-html-language-server .html .htm                              │

│                          │ ● vscode-css-language-server .css .scss .sass                         │

│  Harness scripted model  │ ● vscode-json-language-server .json .jsonc                            │

│           stub           │                                                                       │

│                          │ ───────────────────────────────────────────────────────────────────── │

│                          │ Recent sessions                                                       │

│                          │ No recent sessions                                                    │

│                          │                                                                       │

│                          │                                                                       │

│                          │                                                                       │

│                          │                                                                       │

╰──────────────────────────┴───────────────────────────────────────────────────────────────────────╯

 Tip: You can /btw to ask a side question



 Rewound to selected point                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply

 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-4o0CJI/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─

╰─ HARNESS_AGENT=main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
AFTER_BRANCH_FULL_OBSERVER_STATUS  observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: 19f91f42-9e80-4270-9513-1da4f54395a5                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: http://127.0.0.1:37159/                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
 grants: 1 children, 1 live credentials, 1 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-4o0CJI/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort
V05_BRANCH_FAILURE {"result":"FAIL","message":"Expected \"actual\" to be strictly unequal to:\n\n'19f91f42-9e80-4270-9513-1da4f54395a5'","stack":"AssertionError [ERR_ASSERTION]: Expected \"actual\" to be strictly unequal to:\n\n'19f91f42-9e80-4270-9513-1da4f54395a5'\n    at <tmp>/gc3/v05-branch-continuation.mjs:38:33\n    at processTicksAndRejections (native:7:39)","screen":"                                                                                                                                                                                                                                                                                                                                                                                                                                                                          Harness auxiliary reply\r\r\n π > ⬢ Harness scripted model > 🗑 omp-orca-harness-4o0CJI/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─\r\r\n╰─ HARNESS_AGENT=main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               \r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort\r observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              \r epoch: 19f91f42-9e80-4270-9513-1da4f54395a5                                                                                                                                                                                                                                                                                                                                                                                                                                                                        \r endpoint: http://127.0.0.1:37159/                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  \r grants: 1 children, 1 live credentials, 1 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            \r inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                \r\r                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply\r π > ⬢ Harness scripted model > 🗑 omp-orca-harness-4o0CJI/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─\r╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort\r"}
TUI_STOP {"nativeStatus":null,"stderr":""}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}

```

Runner exit: 1. The genuine stock selector, transition event, publisher state and old authenticated requests are judged above; all profile resources were removed.

**FAIL — required `/branch` publisher epoch change.** Exact command: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-branch-continuation.mjs` (exit 1, 10.69 s). Native `/branch` → Left → Enter completed with the exact notification `Rewound to selected point`, unlike the historical current-leaf timeout. Both baseline and post-rewind observer status reported epoch `19f91f42-9e80-4270-9513-1da4f54395a5`.

Exact failure excerpt:

```text
Rewound to selected point
AFTER_BRANCH_FULL_OBSERVER_STATUS  observer state: ready
epoch: 19f91f42-9e80-4270-9513-1da4f54395a5
V05_BRANCH_FAILURE {"result":"FAIL","message":"Expected \"actual\" to be strictly unequal to:\n\n'19f91f42-9e80-4270-9513-1da4f54395a5'","stack":"AssertionError [ERR_ASSERTION]: Expected \"actual\" to be strictly unequal to:\n\n'19f91f42-9e80-4270-9513-1da4f54395a5'\n    at <tmp>/gc3/v05-branch-continuation.mjs:38:33\n    at processTicksAndRejections (native:7:39)",...}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}
```

The failure stops this assertion-based driver before logging the native branch/tree event and before requesting the old code/credential/token against a successor. Those later checks are **UNVERIFIED**, not inferred passes. The preceding runner receipt's generic phrase “transition event … and old authenticated requests are judged above” is not a claim that those unreachable checks ran; this paragraph explicitly corrects that wording. No product fix, replacement API workaround, or confirming re-run was attempted. Native dev-source context: this installed stock selector rewinds in place via `navigateTree`; the required `/branch` epoch behavior is reported as exercised.

### v05 delayed prior-run outcome — snapshot row with registry cross-check

The binding method is the gb2 delayed-terminal re-run (`gb2.md:5467-5493`): controlled replay of a prior terminal, a next started fact with the reused native spawn call id, then the delayed prior terminal, while an actual native ref remains running. Acceptance is the snapshot row plus native registry, not a tracker-only assertion. The post-native-end row must report the real native status or `unknown("ambiguous terminal evidence")`. This continuation uses the unchanged package, a TUI-issued grant, real authenticated HTTP snapshots, and the native registry/bus-only control extension.
### Resolved branch meaning — supersedes the selector's criterion classification

Orchestrator-supplied ruling for this run: the preceding `/branch` result is **“in-place rewind: not a publisher replacement; epoch unchanged, as designed.”** It is an observation, not a v05 criterion failure. That UI uses `navigateTree`, emits `session_tree`, and keeps the session file/registry. Its assertion failure and exact output remain preserved above; the latest ruling supersedes only the earlier FAIL interpretation.

The actual branch criterion is `AgentSession.branch(entryId)`, which creates a branched native session and emits `session_branch` (`agent-session.ts:10582-10668`, inspected above). Authorized native reachability is a throwaway extension command calling `ctx.branch` on the latest actual user entry; inspected `extension-ui-controller.ts:273-286` forwards directly to the native branch implementation. No observer package copy or mutation is involved. This additional native branch check runs before the delayed prior-run item.

### v05 actual native session_branch publisher replacement

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-native-branch.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### v05-native-branch.mjs — exact source

sha256 `fc9f9f026664edc11ec260fa2bf027531883958e77151e8ae97a4dff53cc7680`.

```javascript
import assert from "node:assert/strict";
import { join } from "node:path";
import { profile, tui, waitFor, exchange, request, cleanup, log, scratch } from "./gate-lib.mjs";
import { recordStart, recordEnd } from "./record-run.mjs";
import { control, tuiStatus, tuiGrant, page, nativeLog, safe } from "./continuation-lib.mjs";
recordStart("v05 actual native session_branch publisher replacement", ["gc3-control.mjs", "gc3-branch-cmd.mjs", "continuation-lib.mjs"]);
const p = await profile("one-child");
let t;
try {
  t = await tui(p, ["--extension", control, "--extension", join(scratch, "gc3-branch-cmd.mjs")]);
  t.send("HARNESS_AGENT=main");
  await waitFor(() => t.text, text => text.includes("main complete"), 60000);
  log("SCENARIO_FINAL_REPLY", "main complete");
  await tuiStatus(t, "BASELINE_FULL_OBSERVER_STATUS");
  const old = await exchange(await tuiGrant(t));
  assert.equal(old.status, 200);
  const snap = await request(old, "/v1/snapshot");
  assert.equal(snap.status, 200);
  const child = snap.body.children[0]; assert.ok(child);
  const issued = await page(old, child.childId, "", "BEFORE_BRANCH_PAGE");
  assert.equal(issued.status, 200); assert.equal(issued.body.kind, "page");
  const unused = await tuiGrant(t, "url"); const issuedAt = Date.now();
  let mark = t.text.length;
  t.send("/gc3-branch");
  await waitFor(() => t.text.slice(mark), text => text.includes("GC3_BRANCH "), 30000);
  log("NATIVE_BRANCH_COMMAND_FULL_OUTPUT", safe(t.text.slice(mark)));
  t.keys("\x15"); await Bun.sleep(250);
  const next = await tuiStatus(t, "AFTER_BRANCH_FULL_OBSERVER_STATUS");
  assert.ok(next.epoch); assert.notEqual(next.epoch, old.epoch);
  const events = (await nativeLog(p)).filter(row => row.kind === "session_branch");
  log("NATIVE_BRANCH_EVENTS", events);
  assert.ok(events.length > 0, "No native session_branch event observed");
  assert.equal(events.at(-1).event.previousSessionFile, snap.body.rootSession.value);
  assert.notEqual(events.at(-1).sessionFile, snap.body.rootSession.value);
  mark = t.text.length;
  t.send("/observer serve");
  const served = await waitFor(() => t.text.slice(mark), text => /observer serving: http:\/\/127\.0\.0\.1:\d+\//.test(text), 90000);
  log("AFTER_BRANCH_FULL_SERVE", safe(t.text.slice(mark)));
  const origin = /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(served)[1];
  const oldCode = await exchange({ origin, code: unused.code });
  const oldCredential = await request({ ...old, origin }, "/v1/snapshot");
  const oldPage = await page({ ...old, origin }, child.childId, issued.body.token, "AFTER_BRANCH_OLD_PAGE_TOKEN");
  assert.equal(oldCode.status, 401); assert.equal(oldCredential.status, 401); assert.equal(oldPage.status, 401);
  log("V05_BRANCH_RESULT", { result: "PASS", nativePath: "/gc3-branch -> ctx.branch -> AgentSession.branch", oldEpoch: old.epoch, epoch: next.epoch, priorSessionFile: snap.body.rootSession.value, branchedSessionFile: events.at(-1).sessionFile, oldCodeStatus: oldCode.status, oldCredentialStatus: oldCredential.status, oldPageTokenStatus: oldPage.status, elapsedUnusedCodeMs: Date.now() - issuedAt });
} catch (error) {
  log("V05_BRANCH_FAILURE", { result: "FAIL", message: error.message, stack: error.stack, screen: t ? safe(t.text).slice(-6000) : "" });
  process.exitCode = 1;
} finally {
  await t?.stop(); await cleanup(p);
  recordEnd("The actual native session_branch publisher replacement is judged separately from in-place rewind. All disposable profile resources were removed.");
}

```

#### gc3-control.mjs — exact source

sha256 `f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e`.

```javascript
import { appendFileSync } from "node:fs";
import { join } from "node:path";
const path = join(process.env.TMPDIR, "..", "gc3-native-probe.jsonl");
export default function(api) {
  const registry = api.pi.AgentRegistry.global();
  const refs = () => registry.list().map(r => ({ id: r.id, kind: r.kind, parentId: r.parentId, status: r.status, sessionFile: r.sessionFile, hasSession: Boolean(r.session) }));
  const save = (kind, data) => appendFileSync(path, JSON.stringify({ kind, at: Date.now(), ...data }) + "\n");
  api.on("session_start", (_, ctx) => {
    save("session_start", { agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() });
    if (ctx.agent.kind === "main") setInterval(() => save("registry", { refs: refs() }), 100).unref();
  });
  api.on("session_branch", (event, ctx) => save("session_branch", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.on("session_tree", (event, ctx) => save("session_tree", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.events.on("task:subagent:lifecycle", fact => save("lifecycle", { fact }));
  api.registerCommand("gc3native", {
    description: "Disposable registry evidence", handler: (_, ctx) => {
      const data = { sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() };
      save("report", data);
      ctx.ui.notify("GC3_NATIVE " + JSON.stringify(data), "info");
    }
  });
  api.registerCommand("gc3inject", {
    description: "Replay prior-run native bus evidence", handler: (args, ctx) => {
      const facts = JSON.parse(args);
      for (const fact of facts) api.events.emit("task:subagent:lifecycle", fact);
      save("injected", { facts, refs: refs() });
      ctx.ui.notify("GC3_INJECT " + JSON.stringify(facts), "info");
    }
  });
}

```

#### gc3-branch-cmd.mjs — exact source

sha256 `91bdcb292d3577678d5b1c00cec8cf6aacf885d8e958cf5380cca7a1a9cb8daf`.

```javascript
export default function(api) {
  api.registerCommand("gc3-branch", {
    description: "Exercise the native publisher branch in a disposable profile",
    handler: async (_, ctx) => {
      const entry = ctx.sessionManager.getBranch().filter(e => e.type === "message" && e.message.role === "user").at(-1);
      if (!entry) throw new Error("Disposable branch fixture has no user entry");
      const before = ctx.sessionManager.getSessionFile();
      const result = await ctx.branch(entry.id);
      ctx.ui.notify("GC3_BRANCH " + JSON.stringify({ entryId: entry.id, before, after: ctx.sessionManager.getSessionFile(), result }), "info");
    },
  });
}

```

#### continuation-lib.mjs — exact source

sha256 `cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b`.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scratch, waitFor, log, request, repo } from "./gate-lib.mjs";
export const control = join(scratch, "gc3-control.mjs");
export const sha = value => createHash("sha256").update(value).digest("hex");
export const safe = value => value.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export async function nativeLog(p) {
  return (await readFile(join(p.root, "gc3-native-probe.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}
export async function tuiStatus(t, label = "FULL_OBSERVER_STATUS") {
  const mark = t.text.length;
  t.send("/observer status");
  const text = await waitFor(() => t.text.slice(mark), value => value.includes("inventory:"), 90000);
  await Bun.sleep(150);
  log(label, safe(t.text.slice(mark)));
  return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\r\n]+)/.exec(text)?.[1].trim() };
}
export async function tuiGrant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  let text;
  try { text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 90000); }
  finally { log("FULL_OBSERVER_" + kind.toUpperCase(), safe(t.text.slice(mark))); }
  const url = new URL([...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)].at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code"); url.hash = "";
  return { origin: url.href, code };
}
export async function page(session, childId, token = "", label = "PAGE") {
  const route = `/v1/children/${encodeURIComponent(childId)}/page?mode=entries&token=${encodeURIComponent(token)}`;
  const r = await request(session, route, true);
  const body = r.body;
  log(label, { route: route.replace(/token=[^&]+/, "token=<redacted>"), status: r.status, body: typeof body === "string" ? body : { kind: body.kind, reason: body.reason, mode: body.mode, malformed: body.malformed, reset: body.reset, atEnd: body.atEnd, tokenSha256: body.token ? sha(body.token) : null }, suppliedPriorToken: Boolean(token) });
  return r;
}
export async function launchRpc(p, args = []) {
  const c = p.spawn(["--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args]);
  const events = []; let carry = "", serial = 0;
  const out = (async () => { for await (const bytes of c.stdout) { carry += new TextDecoder().decode(bytes); const lines = carry.split("\n"); carry = lines.pop(); for (const line of lines) { try { events.push(JSON.parse(line)); } catch { events.push({ type: "nonjson", line }); } } } })();
  const err = new Response(c.stderr).text();
  async function wait(pred, from = 0, timeout = 120000) { return waitFor(() => events.slice(from), rows => rows.some(pred), timeout).then(rows => rows.find(pred)); }
  async function send(type, extra = {}) {
    const id = "gc3-" + (++serial);
    c.stdin.write(JSON.stringify({ id, type, ...extra }) + "\n");
    const response = await wait(e => e.type === "response" && e.id === id);
    assert.equal(response.success, true, JSON.stringify(response));
    return response;
  }
  async function command(message) {
    const from = events.length;
    await send("prompt", { message });
    await wait(e => e.type === "prompt_result", from);
    return events.slice(from);
  }
  async function report() {
    const rows = await command("/gc3native");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("GC3_NATIVE "))?.message;
    assert.ok(text, JSON.stringify(rows));
    return JSON.parse(text.slice("GC3_NATIVE ".length));
  }
  async function status(label) {
    const rows = await command("/observer status");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.includes("observer state:"))?.message;
    assert.ok(text, JSON.stringify(rows));
    log(label, { command: "/observer status", mode: "rpc", output: text });
    const reportValue = await report();
    return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\n]+)/.exec(text)?.[1].trim(), ...reportValue };
  }
  await wait(e => e.type === "ready");
  log("RPC_START", { command: ["omp", "--profile", p.name, "--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args] });
  let closed = false;
  return { events, send, wait, command, report, status, async prompt() { const from = events.length; await send("prompt", { message: "HARNESS_AGENT=main" }); await wait(e => e.type === "agent_end", from); return events.slice(from); }, async serve() { const rows = await command("/observer serve"); const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("observer serving: "))?.message; assert.ok(text, JSON.stringify(rows)); log("RPC_SERVE", { command: "/observer serve", output: text }); return text.slice("observer serving: ".length); }, async close() { if (closed) return; closed = true; c.kill(); const exitCode = await c.exited; await out; log("RPC_CLOSE", { exitCode, stderr: await err }); } };
}
export async function customStub(p, scenario) {
  const { startStub } = await import(join(repo, "omp-orca-observer/checks/harness/stub-provider.ts"));
  const stub = await startStub({ scenario, capture: p.capture });
  const models = join(p.home, ".omp/profiles", p.name, "agent/models.yml");
  await writeFile(models, (await readFile(models, "utf8")).replace(/baseUrl: .*/, "baseUrl: " + stub.url));
  log("DISPOSABLE_STUB_SCENARIO", scenario);
  return stub;
}

```

#### Observed output (incremental)

```text
PROFILE {"name":"one-child","root":"<tmp>/one-child","workspace":"<tmp>/one-child/workspace","stubUrl":"http://127.0.0.1:33443/v1"}
TUI_START {"command":["omp","--profile","one-child","--extension","<tmp>/gc3/gc3-control.mjs","--extension","<tmp>/gc3/gc3-branch-cmd.mjs"],"cwd":"<tmp>/one-child/workspace","screen":"\u001b_25a1;s\u001b\\\u001b_tsp;q;{\"q\":\"hello\",\"v\":[1],\"app\":\"omp\"}\u001b\\"}
SCENARIO_FINAL_REPLY main complete
BASELINE_FULL_OBSERVER_STATUS │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ▒▒  ██          │ LSP Servers                                                           │
 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: 7aed9943-bb89-4322-afd6-ea3031592fda                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-acdCsO/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-acdCsO/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
FULL_OBSERVER_GRANT │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 http://127.0.0.1:45753/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-acdCsO/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:26:41.425Z","schema":1,"epoch":"7aed9943-bb89-4322-afd6-ea3031592fda"}}
REQUEST {"path":"/v1/snapshot","status":200,"body":{"schema":1,"epoch":"7aed9943-bb89-4322-afd6-ea3031592fda","generation":2,"observedAt":"2026-10-01T06:56:40.801Z","rootSession":{"known":true,"value":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781.jsonl"},"inventory":{"state":"complete"},"children":[{"childId":"child-one","parentId":"Main","rootSession":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781.jsonl","kind":"sub","agentName":"blocking","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"idle","tombstoned":false,"outcome":{"state":"completed","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-one-child-main-0-call-0"},"at":"2026-10-01T06:56:40.690Z"},"milestones":{"responseAt":{"known":true,"value":"2026-10-01T06:56:40.685Z"},"acceptedAt":{"known":true,"value":"2026-10-01T06:56:40.686Z"},"terminalAt":{"known":true,"value":"2026-10-01T06:56:40.688Z"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:56:40.688Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/one-child/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:56:40.801Z","grantScope":"granted"}]}}
BEFORE_BRANCH_PAGE {"route":"/v1/children/child-one/page?mode=entries&token=","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":false,"atEnd":true,"tokenSha256":"3272255d7576d28c79c8ec3ceb8a53fe70947158ff4f7eb385293c821d08766a"},"suppliedPriorToken":false}
FULL_OBSERVER_URL │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
 http://127.0.0.1:45753/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
NATIVE_BRANCH_COMMAND_FULL_OUTPUT 

╭─── omp v18.4.6 ──────────────────────────────────────────────────────────────────────────────────╮

│                          │ Tips                                                                  │

│      Welcome back!       │ # for prompt actions                                                  │

│                          │ / for commands                                                        │

│       ████████████       │ ! to run bash                                                         │

│          ██  ██          │ $ to run python                                                       │

│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │

│          ▒▒  ██          │ LSP Servers                                                           │

│              ██          │ ● vscode-html-language-server .html .htm                              │

│                          │ ● vscode-css-language-server .css .scss .sass                         │

│  Harness scripted model  │ ● vscode-json-language-server .json .jsonc                            │

│           stub           │                                                                       │

│                          │ ───────────────────────────────────────────────────────────────────── │

│                          │ Recent sessions                                                       │

│                          │ No recent sessions                                                    │

│                          │                                                                       │

│                          │                                                                       │

│                          │                                                                       │

│                          │                                                                       │

╰──────────────────────────┴───────────────────────────────────────────────────────────────────────╯

 Tip: Need a cheap nested model call? Use `completion(x...)`. Have a big batch of tasks? Ask clanker

      to use it!



 GC3_BRANCH {"entryId":"5dd212a1","before":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781.jsonl","after":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-41-546Z_01a0f640-424a-7070-b3b8-737a08e7108f.jsonl","result":{"cancelled":false}}                                                  



                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply

 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-acdCsO/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─

╰─ HARNESS_AGENT=main                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
│       ████████████       │ ! to run bash                                                         │
AFTER_BRANCH_FULL_OBSERVER_STATUS │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: 6ba3d5ec-a9c1-4adf-8f01-2f0af3d3381c                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-acdCsO/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort
│       ████████████       │ ! to run bash                                                         │
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
NATIVE_BRANCH_EVENTS [{"kind":"session_branch","at":1790837801547,"event":{"type":"session_branch","previousSessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781.jsonl"},"agent":{"kind":"main","id":"Main","name":"main","depth":0},"sessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-41-546Z_01a0f640-424a-7070-b3b8-737a08e7108f.jsonl","refs":[{"id":"Main","kind":"main","status":"running","sessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781.jsonl","hasSession":true},{"id":"child-one","kind":"sub","parentId":"Main","status":"idle","sessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781/child-one.jsonl","hasSession":true}]}]
AFTER_BRANCH_FULL_SERVE │       ████████████       │ ! to run bash                                                         │
 observer serving: http://127.0.0.1:41985/                                                                                                                                                                                                                                                                                                                                                                                                                                                                          

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 π > ⬢ Harness scripted model > 🗑 omp-orca-harness-acdCsO/workspace > ⑂ master ▶─────────────────────5%──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎───────────────────────────────────────────┃─────────────────────────────────────────────────────────────128K─
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort
EXCHANGE {"status":401,"body":"Unauthorized"}
REQUEST {"path":"/v1/snapshot","status":401,"body":"Unauthorized"}
AFTER_BRANCH_OLD_PAGE_TOKEN {"route":"/v1/children/child-one/page?mode=entries&token=<redacted>","status":401,"body":"Unauthorized","suppliedPriorToken":true}
V05_BRANCH_RESULT {"result":"PASS","nativePath":"/gc3-branch -> ctx.branch -> AgentSession.branch","oldEpoch":"7aed9943-bb89-4322-afd6-ea3031592fda","epoch":"6ba3d5ec-a9c1-4adf-8f01-2f0af3d3381c","priorSessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-39-610Z_01a0f640-3aba-7757-9470-2e4df8868781.jsonl","branchedSessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-acdCsO-workspace--/2026-10-01T06-56-41-546Z_01a0f640-424a-7070-b3b8-737a08e7108f.jsonl","oldCodeStatus":401,"oldCredentialStatus":401,"oldPageTokenStatus":401,"elapsedUnusedCodeMs":712}
TUI_STOP {"nativeStatus":143,"stderr":""}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}

```

Runner exit: 0. The actual native session_branch publisher replacement is judged separately from in-place rewind. All disposable profile resources were removed.


### v05 delayed prior-run terminal judged at authenticated snapshot row

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/v05-delayed-continuation.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### v05-delayed-continuation.mjs — exact source

sha256 `e2b217f478db7c02ed3c962ae6daba72a8d6b032e2eb65a98336ef5cdbd602f8`.

```javascript
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile, tui, waitFor, exchange, request, cleanup, log, repo } from "./gate-lib.mjs";
import { recordStart, recordEnd } from "./record-run.mjs";
import { control, tuiStatus, tuiGrant, nativeLog, customStub, safe } from "./continuation-lib.mjs";
recordStart("v05 delayed prior-run terminal judged at authenticated snapshot row", ["gc3-control.mjs", "continuation-lib.mjs"]);
const p = await profile("follow-up");
let t, stub;
try {
  const scenario = JSON.parse(await readFile(join(repo, "omp-orca-observer/checks/harness/scenarios/follow-up.json"), "utf8"));
  scenario.turns["child/followup"][0].delayMs = 20000;
  stub = await customStub(p, scenario);
  t = await tui(p, ["--extension", control]);
  t.send("HARNESS_AGENT=main");
  await waitFor(() => t.text, text => text.includes("child ready for follow-up"), 60000);
  log("SCENARIO_FINAL_REPLY", "child ready for follow-up");
  await tuiStatus(t, "BASELINE_FULL_OBSERVER_STATUS");
  const session = await exchange(await tuiGrant(t));
  assert.equal(session.status, 200);
  const initial = await request(session, "/v1/snapshot");
  assert.equal(initial.status, 200);
  const child = initial.body.children[0]; assert.ok(child);
  assert.equal(child.registryStatus, "running"); assert.equal(child.outcome.state, "started");
  const records = await nativeLog(p);
  const nativeStart = records.find(r => r.kind === "lifecycle" && r.fact.id === child.childId && r.fact.status === "started")?.fact;
  assert.ok(nativeStart, "Native started lifecycle missing");
  const terminal = { id: nativeStart.id, sessionFile: nativeStart.sessionFile, parentToolCallId: nativeStart.parentToolCallId, status: "completed" };
  const nextStart = { ...terminal, status: "started" };
  log("CONTROLLED_SEQUENCE", { nativeStart, priorTerminal: terminal, nextStart, method: "gb2 delayed-row method: observer prior terminal -> next started -> delayed prior terminal on a genuinely running native ref; native registry is never mutated" });
  async function inject(facts) {
    const mark = t.text.length;
    t.send("/gc3inject " + JSON.stringify(facts));
    await waitFor(() => t.text.slice(mark), value => value.includes("GC3_INJECT "), 30000);
    log("FULL_INJECTION_OUTPUT", safe(t.text.slice(mark)));
    await Bun.sleep(500);
  }
  async function crossCheck(label) {
    const snap = await request(session, "/v1/snapshot", true);
    assert.equal(snap.status, 200);
    const row = snap.body.children.find(r => r.childId === child.childId); assert.ok(row);
    const mark = t.text.length;
    t.send("/gc3native");
    await waitFor(() => t.text.slice(mark), text => text.includes("GC3_NATIVE "), 30000);
    const report = (await nativeLog(p)).findLast(r => r.kind === "report");
    const ref = report.refs.find(r => r.id === child.childId); assert.ok(ref);
    log(label, { status: snap.status, epoch: snap.body.epoch, inventory: snap.body.inventory, snapshotRow: row, nativeRef: ref });
    return { row, ref };
  }
  await inject([terminal]);
  const prior = await crossCheck("PRIOR_TERMINAL_WHILE_NATIVE_RUNNING");
  assert.equal(prior.ref.status, "running");
  assert.deepEqual(prior.row.outcome, { state: "unknown", reason: "conflicting evidence" });
  await inject([nextStart]);
  const current = await crossCheck("CURRENT_STARTED_ROW");
  assert.equal(current.ref.status, "running"); assert.equal(current.row.outcome.state, "started");
  assert.ok(current.row.outcome.generation > child.outcome.generation);
  await inject([terminal]);
  const late = await crossCheck("DELAYED_PRIOR_RUN_SNAPSHOT_ROW");
  assert.equal(late.ref.status, "running"); assert.equal(late.row.registryStatus, "running");
  assert.deepEqual(late.row.outcome, { state: "unknown", reason: "conflicting evidence" });
  await waitFor(() => nativeLog(p), rows => rows.some(r => r.kind === "lifecycle" && r.fact.id === child.childId && r.fact.status === "completed") && rows.some(r => r.kind === "registry" && r.refs.some(ref => ref.id === child.childId && ref.status === "idle")), 60000);
  await Bun.sleep(750);
  const final = await crossCheck("AFTER_REAL_NATIVE_RUN_END");
  const lifecycle = (await nativeLog(p)).filter(r => r.kind === "lifecycle" || r.kind === "injected");
  log("NATIVE_LIFECYCLE_AND_REPLAY_EVIDENCE", lifecycle);
  assert.equal(final.ref.status, "idle"); assert.equal(final.row.registryStatus, "idle");
  assert.ok(final.row.outcome.state === "completed" || (final.row.outcome.state === "unknown" && final.row.outcome.reason === "ambiguous terminal evidence"), JSON.stringify(final.row.outcome));
  log("V05_DELAYED_PRIOR_RUN_RESULT", { result: "PASS", epoch: session.epoch, currentGeneration: current.row.outcome.generation, delayedWhileRunning: late.row.outcome, afterRealNativeEnd: final.row.outcome, nativeRegistryWhileDelayed: late.ref.status, nativeRegistryAfterEnd: final.ref.status, judgedSurface: "HTTP snapshot row + independent native registry, not tracker alone" });
} catch (error) {
  log("V05_DELAYED_PRIOR_RUN_FAILURE", { result: "FAIL", message: error.message, stack: error.stack, screen: t ? safe(t.text).slice(-6000) : "" });
  process.exitCode = 1;
} finally {
  await t?.stop(); await stub?.stop(); await cleanup(p);
  recordEnd("The snapshot-row/registry criterion is recorded above. The delayed fixture changes only the local stub timing; replay does not alter native registry or the observer package. All disposable processes, stubs, profile and workspace were removed.");
}

```

#### gc3-control.mjs — exact source

sha256 `f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e`.

```javascript
import { appendFileSync } from "node:fs";
import { join } from "node:path";
const path = join(process.env.TMPDIR, "..", "gc3-native-probe.jsonl");
export default function(api) {
  const registry = api.pi.AgentRegistry.global();
  const refs = () => registry.list().map(r => ({ id: r.id, kind: r.kind, parentId: r.parentId, status: r.status, sessionFile: r.sessionFile, hasSession: Boolean(r.session) }));
  const save = (kind, data) => appendFileSync(path, JSON.stringify({ kind, at: Date.now(), ...data }) + "\n");
  api.on("session_start", (_, ctx) => {
    save("session_start", { agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() });
    if (ctx.agent.kind === "main") setInterval(() => save("registry", { refs: refs() }), 100).unref();
  });
  api.on("session_branch", (event, ctx) => save("session_branch", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.on("session_tree", (event, ctx) => save("session_tree", { event, agent: ctx.agent, sessionFile: ctx.sessionManager.getSessionFile(), refs: refs() }));
  api.events.on("task:subagent:lifecycle", fact => save("lifecycle", { fact }));
  api.registerCommand("gc3native", {
    description: "Disposable registry evidence", handler: (_, ctx) => {
      const data = { sessionFile: ctx.sessionManager.getSessionFile(), mode: ctx.mode, refs: refs() };
      save("report", data);
      ctx.ui.notify("GC3_NATIVE " + JSON.stringify(data), "info");
    }
  });
  api.registerCommand("gc3inject", {
    description: "Replay prior-run native bus evidence", handler: (args, ctx) => {
      const facts = JSON.parse(args);
      for (const fact of facts) api.events.emit("task:subagent:lifecycle", fact);
      save("injected", { facts, refs: refs() });
      ctx.ui.notify("GC3_INJECT " + JSON.stringify(facts), "info");
    }
  });
}

```

#### continuation-lib.mjs — exact source

sha256 `cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b`.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { scratch, waitFor, log, request, repo } from "./gate-lib.mjs";
export const control = join(scratch, "gc3-control.mjs");
export const sha = value => createHash("sha256").update(value).digest("hex");
export const safe = value => value.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export async function nativeLog(p) {
  return (await readFile(join(p.root, "gc3-native-probe.jsonl"), "utf8")).trim().split("\n").filter(Boolean).map(line => JSON.parse(line));
}
export async function tuiStatus(t, label = "FULL_OBSERVER_STATUS") {
  const mark = t.text.length;
  t.send("/observer status");
  const text = await waitFor(() => t.text.slice(mark), value => value.includes("inventory:"), 90000);
  await Bun.sleep(150);
  log(label, safe(t.text.slice(mark)));
  return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\r\n]+)/.exec(text)?.[1].trim() };
}
export async function tuiGrant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  let text;
  try { text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 90000); }
  finally { log("FULL_OBSERVER_" + kind.toUpperCase(), safe(t.text.slice(mark))); }
  const url = new URL([...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)].at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code"); url.hash = "";
  return { origin: url.href, code };
}
export async function page(session, childId, token = "", label = "PAGE") {
  const route = `/v1/children/${encodeURIComponent(childId)}/page?mode=entries&token=${encodeURIComponent(token)}`;
  const r = await request(session, route, true);
  const body = r.body;
  log(label, { route: route.replace(/token=[^&]+/, "token=<redacted>"), status: r.status, body: typeof body === "string" ? body : { kind: body.kind, reason: body.reason, mode: body.mode, malformed: body.malformed, reset: body.reset, atEnd: body.atEnd, tokenSha256: body.token ? sha(body.token) : null }, suppliedPriorToken: Boolean(token) });
  return r;
}
export async function launchRpc(p, args = []) {
  const c = p.spawn(["--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args]);
  const events = []; let carry = "", serial = 0;
  const out = (async () => { for await (const bytes of c.stdout) { carry += new TextDecoder().decode(bytes); const lines = carry.split("\n"); carry = lines.pop(); for (const line of lines) { try { events.push(JSON.parse(line)); } catch { events.push({ type: "nonjson", line }); } } } })();
  const err = new Response(c.stderr).text();
  async function wait(pred, from = 0, timeout = 120000) { return waitFor(() => events.slice(from), rows => rows.some(pred), timeout).then(rows => rows.find(pred)); }
  async function send(type, extra = {}) {
    const id = "gc3-" + (++serial);
    c.stdin.write(JSON.stringify({ id, type, ...extra }) + "\n");
    const response = await wait(e => e.type === "response" && e.id === id);
    assert.equal(response.success, true, JSON.stringify(response));
    return response;
  }
  async function command(message) {
    const from = events.length;
    await send("prompt", { message });
    await wait(e => e.type === "prompt_result", from);
    return events.slice(from);
  }
  async function report() {
    const rows = await command("/gc3native");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("GC3_NATIVE "))?.message;
    assert.ok(text, JSON.stringify(rows));
    return JSON.parse(text.slice("GC3_NATIVE ".length));
  }
  async function status(label) {
    const rows = await command("/observer status");
    const text = rows.find(e => e.type === "extension_ui_request" && e.message?.includes("observer state:"))?.message;
    assert.ok(text, JSON.stringify(rows));
    log(label, { command: "/observer status", mode: "rpc", output: text });
    const reportValue = await report();
    return { epoch: /epoch:\s+([0-9a-f-]{36})/.exec(text)?.[1], inventory: /inventory:\s+([^\n]+)/.exec(text)?.[1].trim(), ...reportValue };
  }
  await wait(e => e.type === "ready");
  log("RPC_START", { command: ["omp", "--profile", p.name, "--mode", "rpc", "--no-title", "--no-lsp", "--extension", control, ...args] });
  let closed = false;
  return { events, send, wait, command, report, status, async prompt() { const from = events.length; await send("prompt", { message: "HARNESS_AGENT=main" }); await wait(e => e.type === "agent_end", from); return events.slice(from); }, async serve() { const rows = await command("/observer serve"); const text = rows.find(e => e.type === "extension_ui_request" && e.message?.startsWith("observer serving: "))?.message; assert.ok(text, JSON.stringify(rows)); log("RPC_SERVE", { command: "/observer serve", output: text }); return text.slice("observer serving: ".length); }, async close() { if (closed) return; closed = true; c.kill(); const exitCode = await c.exited; await out; log("RPC_CLOSE", { exitCode, stderr: await err }); } };
}
export async function customStub(p, scenario) {
  const { startStub } = await import(join(repo, "omp-orca-observer/checks/harness/stub-provider.ts"));
  const stub = await startStub({ scenario, capture: p.capture });
  const models = join(p.home, ".omp/profiles", p.name, "agent/models.yml");
  await writeFile(models, (await readFile(models, "utf8")).replace(/baseUrl: .*/, "baseUrl: " + stub.url));
  log("DISPOSABLE_STUB_SCENARIO", scenario);
  return stub;
}

```

#### Observed output (incremental)

```text
PROFILE {"name":"follow-up","root":"<tmp>/follow-up","workspace":"<tmp>/follow-up/workspace","stubUrl":"http://127.0.0.1:40493/v1"}
DISPOSABLE_STUB_SCENARIO {"name":"follow-up","setup":["create('follow-up')","run HARNESS_AGENT=main to spawn one native background child","after the child parks, send HARNESS_AGENT=child/followup as a second native assignment via the existing child handle rather than spawning a new task"],"settings":{"async":{"enabled":true}},"agents":["bundled task: background child"],"expected":["one child id has two run lifecycles","the original task spawn call id remains its native spawnCallId for the follow-up run"],"turns":{"main":[{"calls":[{"tool":"task","args":{"context":"First child run","tasks":[{"name":"follow-up-child","agent":"task","task":"HARNESS_AGENT=child/followup first assignment.","solutionSpace":"Reply once."}]}}]},{"text":"child ready for follow-up"}],"child/followup":[{"text":"first run","calls":[{"tool":"yield","args":{"type":"result"}}],"delayMs":20000},{"text":"second run on same child","calls":[{"tool":"yield","args":{"type":"result"}}]}]}}
TUI_START {"command":["omp","--profile","follow-up","--extension","<tmp>/gc3/gc3-control.mjs"],"cwd":"<tmp>/follow-up/workspace","screen":"                                                                                                                                                                                                                                                                      ⇧⇥ to change thinking effort\r│       ████████████       │ ! to run bash                                                         │\r│          ██  ██          │ $ to run python                                                       │\r│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │\r│          ▒▒  ██          │ LSP Servers                                                           │\r│       ████████████       │ ! to run bash                                                         │\r│          ██  ██          │ $ to run python                                                       │\r│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │\r│          ▒▒  ██          │ LSP Servers                                                           │\r│              ██          │ ● vscode-html-language-server .html .htm                              │\r"}
SCENARIO_FINAL_REPLY child ready for follow-up
BASELINE_FULL_OBSERVER_STATUS │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
 observer state: ready                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 epoch: f1d9d046-7e01-4bef-a7bc-d583b550b123                                                                                                                                                                                                                                                                                                                                                                                                                                                                        
 endpoint: not serving                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              
 grants: 0 children, 0 live credentials, 0 pending codes                                                                                                                                                                                                                                                                                                                                                                                                                                                            
 inventory: complete                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 Subagents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
  └─ • follow-up-child: Harness auxiliary reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 ⠸ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ←← to see 1 running agent
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
 ⠼ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 ⠼ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 ⠴ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
 ⠴ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
FULL_OBSERVER_GRANT │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 ⠏ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ▒▒  ██          │ LSP Servers                                                           │
 http://127.0.0.1:36959/#code=<redacted>                                                                                                                                                                                                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 Subagents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
  └─ • follow-up-child: Harness auxiliary reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 ⠏ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ←← to see 1 running agent
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
 ⠋ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:27:56.041Z","schema":1,"epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123"}}
REQUEST {"path":"/v1/snapshot","status":200,"body":{"schema":1,"epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123","generation":2,"observedAt":"2026-10-01T06:57:55.423Z","rootSession":{"known":true,"value":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl"},"inventory":{"state":"complete"},"children":[{"childId":"follow-up-child","parentId":"Main","rootSession":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"running","tombstoned":false,"outcome":{"state":"started","generation":1,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-10-01T06:57:55.418Z"},"milestones":{"responseAt":{"known":false,"reason":"not recorded"},"acceptedAt":{"known":false,"reason":"not recorded"},"terminalAt":{"known":false,"reason":"not recorded"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:57:55.418Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/follow-up/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:57:55.423Z","grantScope":"granted"}]}}
CONTROLLED_SEQUENCE {"nativeStart":{"id":"follow-up-child","agent":"task","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","detached":true,"agentSource":"bundled","status":"started","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","index":0},"priorTerminal":{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"},"nextStart":{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"started"},"method":"gb2 delayed-row method: observer prior terminal -> next started -> delayed prior terminal on a genuinely running native ref; native registry is never mutated"}
FULL_INJECTION_OUTPUT │       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ $ to run python                                                       │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
 GC3_INJECT [{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"}]                                                                                                                                                                            
│       ████████████       │ ! to run bash                                                         │
│          ▒▒  ██          │ LSP Servers                                                           │
 ⠙ 0s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
│          ██  ██          │ ───────────────────────────────────────────────────────────────────── │
│          ▒▒  ██          │ LSP Servers                                                           │
│              ██          │ ● vscode-html-language-server .html .htm                              │
PRIOR_TERMINAL_WHILE_NATIVE_RUNNING {"status":200,"epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123","inventory":{"state":"complete"},"snapshotRow":{"childId":"follow-up-child","parentId":"Main","rootSession":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"running","tombstoned":false,"outcome":{"state":"unknown","reason":"conflicting evidence"},"milestones":{"responseAt":{"known":false,"reason":"not recorded"},"acceptedAt":{"known":false,"reason":"not recorded"},"terminalAt":{"known":false,"reason":"not recorded"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:57:55.418Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/follow-up/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:57:56.184Z","grantScope":"granted"},"nativeRef":{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}}
FULL_INJECTION_OUTPUT │       ████████████       │ ! to run bash                                                         │
 GC3_INJECT [{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"started"}]                                                                                                                                                                              

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 ⠏ 1s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ←← to see 1 running agent
│          ▒▒  ██          │ LSP Servers                                                           │
 ⠋ 1s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
│       ████████████       │ ! to run bash                                                         │
CURRENT_STARTED_ROW {"status":200,"epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123","inventory":{"state":"complete"},"snapshotRow":{"childId":"follow-up-child","parentId":"Main","rootSession":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"running","tombstoned":false,"outcome":{"state":"started","generation":2,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-10-01T06:57:56.765Z"},"milestones":{"responseAt":{"known":false,"reason":"not recorded"},"acceptedAt":{"known":false,"reason":"not recorded"},"terminalAt":{"known":false,"reason":"not recorded"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:57:55.418Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/follow-up/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:57:56.935Z","grantScope":"granted"},"nativeRef":{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}}
FULL_INJECTION_OUTPUT  GC3_INJECT [{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"}]                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    
 Subagents                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          
  └─ • follow-up-child: Harness auxiliary reply                                                                                                                                                                                                                                                                                                                                                                                                                                                                     

                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             Harness auxiliary reply
 ⠇ 2s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
╰─                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ←← to see 1 running agent
 ⠏ 2s > ⬢ Harness scripted model > 🗑 omp-orca-harness-sVdtTJ/workspace > ⑂ master ▶──────────────────────5%─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────╎──────────────────────────────────────────┃────────────────────────────────────────────────────────────128K─◀ 👥 1 
DELAYED_PRIOR_RUN_SNAPSHOT_ROW {"status":200,"epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123","inventory":{"state":"complete"},"snapshotRow":{"childId":"follow-up-child","parentId":"Main","rootSession":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"running","tombstoned":false,"outcome":{"state":"unknown","reason":"conflicting evidence"},"milestones":{"responseAt":{"known":false,"reason":"not recorded"},"acceptedAt":{"known":false,"reason":"not recorded"},"terminalAt":{"known":false,"reason":"not recorded"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:57:55.418Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/follow-up/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:57:57.685Z","grantScope":"granted"},"nativeRef":{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}}
AFTER_REAL_NATIVE_RUN_END {"status":200,"epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123","inventory":{"state":"complete"},"snapshotRow":{"childId":"follow-up-child","parentId":"Main","rootSession":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","kind":"sub","agentName":"task","modelRole":{"known":false,"reason":"model role not recorded"},"resolvedModel":{"known":true,"value":"stub/scripted"},"registryStatus":"idle","tombstoned":false,"outcome":{"state":"completed","generation":2,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-10-01T06:57:57.471Z"},"milestones":{"responseAt":{"known":true,"value":"2026-10-01T06:58:15.480Z"},"acceptedAt":{"known":true,"value":"2026-10-01T06:58:15.481Z"},"terminalAt":{"known":true,"value":"2026-10-01T06:58:15.482Z"}},"activity":{"sampled":true,"lastActivityAt":{"known":true,"value":"2026-10-01T06:58:15.482Z"}},"lineage":{"repoRoot":{"known":false,"reason":"repository root not recorded"},"cwd":{"known":true,"value":"<tmp>/follow-up/workspace"},"parentWorktree":{"known":false,"reason":"parent worktree not recorded"},"childWorktree":{"known":false,"reason":"child worktree not recorded"},"isolation":{"known":false,"reason":"isolation not recorded"},"branch":{"known":false,"reason":"branch not recorded"}},"completeness":{"state":"unknown","reason":"native registry does not record full lineage"},"observedAt":"2026-10-01T06:58:15.511Z","grantScope":"granted"},"nativeRef":{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"idle","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}}
NATIVE_LIFECYCLE_AND_REPLAY_EVIDENCE [{"kind":"lifecycle","at":1790837875418,"fact":{"id":"follow-up-child","agent":"task","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","detached":true,"agentSource":"bundled","status":"started","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","index":0}},{"kind":"lifecycle","at":1790837876063,"fact":{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"}},{"kind":"injected","at":1790837876063,"facts":[{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"}],"refs":[{"id":"Main","kind":"main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","hasSession":true},{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}]},{"kind":"lifecycle","at":1790837876765,"fact":{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"started"}},{"kind":"injected","at":1790837876765,"facts":[{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"started"}],"refs":[{"id":"Main","kind":"main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","hasSession":true},{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}]},{"kind":"lifecycle","at":1790837877471,"fact":{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"}},{"kind":"injected","at":1790837877471,"facts":[{"id":"follow-up-child","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","status":"completed"}],"refs":[{"id":"Main","kind":"main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815.jsonl","hasSession":true},{"id":"follow-up-child","kind":"sub","parentId":"Main","status":"running","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","hasSession":true}]},{"kind":"lifecycle","at":1790837895483,"fact":{"id":"follow-up-child","agent":"task","parentToolCallId":"chatcmpl-follow-up-main-0-call-0","detached":true,"agentSource":"bundled","description":"Harness auxiliary reply","status":"completed","sessionFile":"<tmp>/follow-up/home/.omp/profiles/follow-up/agent/sessions/--tmp-omp-orca-harness-sVdtTJ-workspace--/2026-10-01T06-57-54-540Z_01a0f641-5f6c-75a9-b908-da20d660e815/follow-up-child.jsonl","index":0}}]
V05_DELAYED_PRIOR_RUN_RESULT {"result":"PASS","epoch":"f1d9d046-7e01-4bef-a7bc-d583b550b123","currentGeneration":2,"delayedWhileRunning":{"state":"unknown","reason":"conflicting evidence"},"afterRealNativeEnd":{"state":"completed","generation":2,"spawnCallId":{"known":true,"value":"chatcmpl-follow-up-main-0-call-0"},"at":"2026-10-01T06:57:57.471Z"},"nativeRegistryWhileDelayed":"running","nativeRegistryAfterEnd":"idle","judgedSurface":"HTTP snapshot row + independent native registry, not tracker alone"}
TUI_STOP {"nativeStatus":null,"stderr":""}
PROFILE_REMOVED {"name":"follow-up","root":"<tmp>/follow-up","absent":true}

```

Runner exit: 0. The snapshot-row/registry criterion is recorded above. The delayed fixture changes only the local stub timing; replay does not alter native registry or the observer package. All disposable processes, stubs, profile and workspace were removed.

### Accepted native branch result

**PASS — actual native publisher branch.** `GC3_REPO="$PWD" bun <tmp>/gc3/v05-native-branch.mjs` exited 0 (4.77 s). The authorized temporary command called `ctx.branch` on a real user entry. Independent native `session_branch` evidence recorded a different native session file, and the publisher epoch changed `7aed9943-bb89-4322-afd6-ea3031592fda` → `6ba3d5ec-a9c1-4adf-8f01-2f0af3d3381c`. Against the successor endpoint, unused old code, old snapshot credential and the old-token page request with its old credential all returned HTTP 401 / `Unauthorized`, only 712 ms after code issuance. The old page route was rejected, not accepted without reset. The profile was removed with `absent:true`. This is the branch criterion; the prior in-place rewind's unchanged epoch is the resolved expected observation.

### Accepted delayed prior-run result

**PASS — snapshot row plus independent native registry.** `GC3_REPO="$PWD" bun <tmp>/gc3/v05-delayed-continuation.mjs` exited 0 (29.11 s). With a real native `follow-up-child` ref running, the gb2-prescribed bus replay moved the observer's started-fact generation from 1 to 2. The delayed earlier completed fact produced HTTP 200 row `registryStatus:"running", outcome:{state:"unknown",reason:"conflicting evidence"}`, independently paired with the actual native ref's `status:"running"`. After the native child emitted its genuine terminal lifecycle and became idle, the authenticated HTTP row was idle/completed, generation 2, matching the real native status. The publisher epoch stayed `f1d9d046-7e01-4bef-a7bc-d583b550b123`. No assertion relied on the tracker alone.

This is controlled observer evidence replay using the reused native spawn call id, exactly as the resolved gb2 method specifies; it is not a claim that two distinct native tasks were launched. The complete observed lifecycle/replay sequence, snapshot rows and native refs are recorded above. The local fixture only delayed the first native child response by 20,000 ms; the package and registry were never mutated. The profile and both local stub servers were removed.

### Tested source fingerprint and scoped check ledger

The current inspected source fingerprint was recorded with:

```text
sha256sum omp-orca-observer/contract.ts omp-orca-observer/commands.ts omp-orca-observer/transport.ts omp-orca-observer/viewer/index.html omp-orca-observer/checks/harness/profile.ts omp-orca-observer/checks/harness/stub-provider.ts <tmp>/gc3/gate-lib.mjs <tmp>/gc3/pty-driver.py
f76ef841a29a8efe5a9c841fb0b8f33d08d317645341f680d529c7536de5245b  omp-orca-observer/contract.ts
5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9  omp-orca-observer/commands.ts
6894e7c73881939cfb93441e5b6d6facb0ef02f68015324d42f6ec7765a6fe20  omp-orca-observer/transport.ts
0310aa399458debbaf9daa5878ccfa91876f0341ce10881bd770e394e12734cb  omp-orca-observer/viewer/index.html
4d9b3ce0319f5b8efa8b2d3d1c3d6b07449b4c937ca35135577b16e2799d572b  omp-orca-observer/checks/harness/profile.ts
c121b1871cfe9a8ea94e980feb3ded0ad68543d20d9c272d57c0b3bd26ffbc6d  omp-orca-observer/checks/harness/stub-provider.ts
7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83  <tmp>/gc3/gate-lib.mjs
e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747  <tmp>/gc3/pty-driver.py
```

| Command | Tested state | Result | Limitation |
|---|---|---|---|
| `GC3_REPO="$PWD" bun <tmp>/gc3/v09-deleted-rerun.mjs` | fixed cwd revision `2f6d27b`; actual removed linked checkout | passed, exit 0 | observer operations only; no live Orca UI |
| `GC3_REPO="$PWD" bun <tmp>/gc3/v05-restore-continuation.mjs` | 3-child cold and 135-child partial native restoration, stock authenticated transport | passed, exit 0 | sampled status/registry windows; pre-restoration named TUI grant moment unreachable because TUI restores eagerly |
| `GC3_REPO="$PWD" bun <tmp>/gc3/v05-branch-continuation.mjs` | stock in-place rewind selected through `/branch` | baseline failure, exit 1, superseded interpretation | wrong fixture expectation, not publisher replacement; unchanged epoch is designed behavior under the explicit orchestrator ruling |
| `GC3_REPO="$PWD" bun <tmp>/gc3/v05-native-branch.mjs` | actual native `session_branch` via authorized temporary `ctx.branch` command | passed, exit 0 | old page request rejected with old credential; no fresh grant for the unadmitted old-root child |
| `GC3_REPO="$PWD" bun <tmp>/gc3/v05-delayed-continuation.mjs` | real running native ref plus controlled prior-run bus replay; authenticated snapshot row | passed, exit 0 | controlled fact replay, not a second independently launched native task |
| Initial v05/v09/v10 commands above | preceding run's scope | not run (preserved accepted evidence) | not re-executed in this continuation; newest scoped results supersede only the named old findings |
| Formatting, linting, project-wide builds/suites, Orca commands, live profiles, network installation, push | outside this gate's authority | not run (not authorized) | none are claimed |

There are **no unresolved scoped criterion failures**. The current in-place rewind assertion failure is fully captured and resolved as a method/expectation mismatch. The earlier deleted-worktree production failure is superseded by the successful fixed-revision re-run; earlier startup/grant/selector prerequisite failures and timeouts remain preserved as historical attempts.

### Cleanup and append-only recovery receipt

All five profiles created during this continuation (`worktree-deleted`, `cold-restart`, `partial-restore`, both disposable `one-child` branch attempts, and `follow-up`) were individually torn down with `PROFILE_REMOVED … absent:true`; each native/RPC/TUI process and local stub was awaited by its driver's finally block. The final scratch removal and baseline-prefix integrity check below are independent receipt checks, not product changes.

### Independent cleanup and before-image preservation receipt

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/cleanup-receipt.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### cleanup-receipt.mjs — exact source

sha256 `7e915376159a4169a9e07dd3330ed588aafd5203b1cee964d4ee7cfebf74b7b4`.

```javascript
import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { recordStart, recordEnd } from "./record-run.mjs";
import { repo, scratch, log } from "./gate-lib.mjs";
recordStart("Independent cleanup and before-image preservation receipt");
const path = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const before = await readFile(join(scratch, "gc3-before-continuation.md"));
const current = await readFile(path);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(sha(before), "73cfdf524ef1767339fc25497b06ee08091fc98ef62536be2bc26a019910ecda");
assert.ok(current.subarray(0, before.length).equals(before), "Earlier evidence changed instead of append-only continuation");
const added = current.subarray(before.length).toString();
const created = [...added.matchAll(/^PROFILE (\{.*\})$/gm)].map(match => JSON.parse(match[1]));
const removed = [...added.matchAll(/^PROFILE_REMOVED (\{.*\})$/gm)].map(match => JSON.parse(match[1]));
assert.equal(created.length, 6); assert.equal(removed.length, 6);
assert.ok(removed.every(profile => profile.absent === true));
log("APPEND_ONLY_RECOVERY", { baselineBytes: before.length, baselineSha256: sha(before), earlierBytesUnchanged: true, sourceDelta: "The exact current suffix after baselineBytes; the original before-image remains as the unchanged file prefix", disposableRootsCreated: created.length, disposableRootsRemoved: removed.length, scenarioNames: [...new Set(created.map(profile => profile.name))] });
await rm(scratch, { recursive: true, force: true });
const absent = await stat(scratch).then(() => false, error => { assert.equal(error.code, "ENOENT"); return true; });
assert.equal(absent, true);
log("SCRATCH_REMOVED", { root: "<tmp>/gc3", absent, includes: "all old/new scripts and outputs, exact before-image, temporary Playwright dependency/client and downloaded browser binaries" });
recordEnd("Six disposable roots across five scenario names were already removed; the entire reused scratch directory is now independently absent, including this receipt script. Before-image bytes remain unchanged as the evidence prefix. No repository file other than this evidence was written.");

```

#### Observed output (incremental)

```text
AssertionError: Expected values to be strictly equal:

7 !== 6

actual: 7
expected: 6
operator: "strictEqual"
at <tmp>/gc3/cleanup-receipt.mjs:17:41
Command exited with code 1
```

Cleanup receipt command `GC3_REPO="$PWD" bun <tmp>/gc3/cleanup-receipt.mjs` exited 1 before scratch deletion (0.11 s). The prefix-integrity assertions passed, but the receipt's whole-Markdown regex counted seven removal lines: six actual driver receipts plus the already-recorded illustrative `PROFILE_REMOVED` line in the branch failure excerpt. This is a receipt parser error, not a failed profile teardown or product criterion. Earlier results remain unchanged. The corrected receipt below restricts counting to actual `Observed output (incremental)` blocks; it does not relax an expected count or alter any gate behavior. There were six disposable roots across five scenario names, not five roots.

### Independent cleanup and before-image preservation receipt

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/cleanup-receipt.mjs`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.

#### record-run.mjs — exact source

sha256 `da904d16d56b2e527001bddc80d84d7849fbeec014b14179548ed9093b9d15ee`.

```javascript
import { appendFileSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { createHash } from "node:crypto";
import { repo, normalize } from "./gate-lib.mjs";
const evidence = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const root = dirname(process.argv[1]);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const safe = text => normalize(text).replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>");
export function recordStart(label, sources = []) {
  appendFileSync(evidence, `\n### ${label}\n\nInvocation: \`GC3_REPO=\"$PWD\" bun <tmp>/gc3/${basename(process.argv[1])}\`. Outputs below retain the full ANSI-stripped TUI notification text and HTTP status/body; only disposable roots and secret bootstrap fragments are redacted.\n\n`);
  for (const name of [...new Set(["record-run.mjs", "gate-lib.mjs", "pty-driver.py", basename(process.argv[1]), ...sources])]) {
    const bytes = readFileSync(join(root, name));
    appendFileSync(evidence, `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`.\n\n\`\`\`${name.endsWith(".py") ? "python" : "javascript"}\n${bytes.toString()}\n\`\`\`\n\n`);
  }
  appendFileSync(evidence, "#### Observed output (incremental)\n\n```text\n");
  const original = console.log;
  console.log = (...args) => {
    const line = safe(args.map(String).join(" "));
    appendFileSync(evidence, line + "\n");
    original(line);
  };
}
export function recordEnd(text) {
  appendFileSync(evidence, `\n\`\`\`\n\nRunner exit: ${process.exitCode ?? 0}. ${text}\n\n`);
}

```

#### gate-lib.mjs — exact source

sha256 `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83`.

```javascript
import assert from "node:assert/strict";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
export const repo = process.env.GC3_REPO;
assert.ok(repo, "GC3_REPO is required");
export const scratch = dirname(fileURLToPath(import.meta.url));
// The repository location is supplied at runtime because these scripts live outside it.
export const { create } = await import(join(repo, "omp-orca-observer/checks/harness/profile.ts"));
const roots = new Map([[repo, "$PWD"], [scratch, "<tmp>/gc3"], [process.env.HOME, "$HOME"]]);
export function normalize(value) {
  for (const [from, to] of [...roots].sort((a, b) => b[0].length - a[0].length)) value = value.replaceAll(from, to);
  return value.replace(/\x1b\][^\x07]*(?:\x07|\x1b\\)/g, "").replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, "").replace(/\x1b[=<>]/g, "");
}
export function log(label, value) {
  console.log(label + " " + normalize(typeof value === "string" ? value : JSON.stringify(value)));
}
export function env(p) {
  roots.set(p.root, `<tmp>/${p.name ?? "profile"}`);
  const out = {};
  for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];
  Object.assign(out, { HOME: p.home, TMPDIR: join(p.root, "tmp"), XDG_CONFIG_HOME: join(p.root, "config"), XDG_CACHE_HOME: join(p.root, "cache"), XDG_DATA_HOME: join(p.root, "data"), XDG_STATE_HOME: join(p.root, "state") });
  return out;
}
export async function profile(name) {
  const p = await create(name);
  p.name = name;
  env(p);
  const settingsPath = join(p.home, ".omp", "profiles", name, "agent", "config.yml");
  const settings = JSON.parse(await readFile(settingsPath, "utf8"));
  settings.startup = { ...settings.startup, setupWizard: false, showSplash: false, checkUpdate: false };
  await writeFile(settingsPath, JSON.stringify(settings, null, 2) + "\n");
  log("PROFILE", { name, root: p.root, workspace: p.workspace, stubUrl: p.stubUrl });
  return p;
}
export async function run(command, cwd, environment, quiet = false) {
  const child = Bun.spawn(command, { cwd, env: environment, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
  const result = { code, stdout: normalize(stdout), stderr: normalize(stderr) };
  if (!quiet) log("COMMAND", { command, cwd, ...result });
  return result;
}
export const gitEnv = p => ({ ...env(p), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_NAME: "Gate Fixture", GIT_AUTHOR_EMAIL: "gate@invalid.example", GIT_COMMITTER_NAME: "Gate Fixture", GIT_COMMITTER_EMAIL: "gate@invalid.example", GIT_AUTHOR_DATE: "2026-09-30T00:00:00Z", GIT_COMMITTER_DATE: "2026-09-30T00:00:00Z" });
export async function git(p, args, cwd = p.workspace, quiet = false) {
  const result = await run(["git", ...args], cwd, gitEnv(p), quiet);
  assert.equal(result.code, 0, `git ${args.join(" ")}: ${result.stderr}`);
  return result;
}
export async function waitFor(get, accept, timeout = 30000) {
  const deadline = Date.now() + timeout;
  let value;
  do {
    value = await get();
    if (accept(value)) return value;
    await Bun.sleep(100);
  } while (Date.now() < deadline);
  throw new Error("Timed out waiting; last value: " + normalize(JSON.stringify(value)).slice(-2000));
}
export async function tui(p, args = [], cwd = p.workspace) {
  const child = Bun.spawn(["python3", join(scratch, "pty-driver.py"), "--profile", p.name, ...args], { cwd, env: env(p), stdin: "pipe", stdout: "pipe", stderr: "pipe" });
  const state = { process: child, text: "", pid: 0, nativeStatus: null };
  const output = (async () => {
    let carry = "";
    for await (const chunk of child.stdout) {
      carry += new TextDecoder().decode(chunk);
      const rows = carry.split("\n");
      carry = rows.pop();
      for (const row of rows) {
        const event = JSON.parse(row);
        if (event.event === "data") state.text += normalize(event.text);
        if (event.event === "pid") state.pid = event.pid;
        if (event.event === "exit") state.nativeStatus = event.status;
      }
    }
  })();
  state.send = text => child.stdin.write(JSON.stringify({ text }) + "\n");
  state.keys = keys => child.stdin.write(JSON.stringify({ keys }) + "\n");
  state.stop = async () => {
    child.stdin.write('{"stop":true}\n');
    child.stdin.end();
    await Promise.all([output, child.exited]);
    const stderr = await new Response(child.stderr).text();
    log("TUI_STOP", { nativeStatus: state.nativeStatus, stderr });
  };
  await waitFor(() => state.pid, Boolean, 10000);
  await Bun.sleep(1500);
  log("TUI_START", { command: ["omp", "--profile", p.name, ...args], cwd, screen: state.text.slice(-1200) });
  return state;
}
export async function command(t, text, timeout = 10000) {
  const mark = t.text.length;
  t.send(text);
  await Bun.sleep(800);
  return waitFor(() => t.text.slice(mark), value => value.includes("observer") || /http:\/\/127\.0\.0\.1:\d+\/#code=/.test(value), timeout);
}
export async function grant(t, kind = "grant", selection = "all") {
  const mark = t.text.length;
  t.send(`/observer ${kind} ${selection}`);
  const text = await waitFor(() => t.text.slice(mark), value => /http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/.test(value), 35000);
  const urls = [...text.matchAll(/http:\/\/127\.0\.0\.1:\d+\/#code=[A-Za-z0-9_-]+/g)];
  const url = new URL(urls.at(-1)[0]);
  const code = new URLSearchParams(url.hash.slice(1)).get("code");
  url.hash = "";
  log("BOOTSTRAP", { command: `/observer ${kind} ${selection}`, endpoint: url.href, code: "<redacted>" });
  return { origin: url.href, code };
}
export async function exchange(bootstrap) {
  const response = await fetch(new URL("/v1/session", bootstrap.origin), { method: "POST", body: JSON.stringify({ code: bootstrap.code }), signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  log("EXCHANGE", { status: response.status, body: body?.credential ? { ...body, credential: "<redacted>" } : body });
  return { origin: bootstrap.origin, credential: body?.credential, epoch: body?.epoch, status: response.status };
}
export async function request(session, path, quiet = false) {
  const response = await fetch(new URL(path, session.origin), { headers: { Authorization: `Bearer ${session.credential}` }, signal: AbortSignal.timeout(10000) });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  const result = { status: response.status, body };
  if (!quiet) log("REQUEST", { path: path.includes("token=") ? path.replace(/token=[^&]+/, "token=<redacted>") : path, ...result });
  return result;
}
export async function sessionFiles(p) {
  const base = join(p.home, ".omp", "profiles", p.name, "agent", "sessions");
  const files = [];
  async function walk(path) {
    for (const entry of await readdir(path, { withFileTypes: true }).catch(() => [])) {
      const next = join(path, entry.name);
      if (entry.isDirectory()) await walk(next);
      else if (entry.name.endsWith(".jsonl")) files.push(next);
    }
  }
  await walk(base);
  return files;
}
export async function nativeHeaders(p) {
  return Promise.all((await sessionFiles(p)).map(async path => {
    const text = await readFile(path, "utf8");
    let header;
    try { header = JSON.parse(text.split("\n")[0]); } catch { header = { unreadable: true }; }
    return { path, header, tombstone: await stat(path + ".tombstone").then(() => true, () => false) };
  }));
}
export async function processList(t) {
  const result = await run(["ps", "-eo", "pid=,ppid=,comm=,args="], repo, { PATH: process.env.PATH }, true);
  assert.equal(result.code, 0);
  const rows = result.stdout.split("\n").map(line => /^\s*(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(line)).filter(Boolean).map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), comm: m[3], args: m[4] }));
  const ids = new Set([t.process.pid]);
  for (let changed = true; changed;) {
    changed = false;
    for (const row of rows) if (ids.has(row.ppid) && !ids.has(row.pid)) { ids.add(row.pid); changed = true; }
  }
  return rows.filter(row => ids.has(row.pid));
}
export async function cleanup(p) {
  await p.teardown();
  const absent = await stat(p.root).then(() => false, () => true);
  log("PROFILE_REMOVED", { name: p.name, root: p.root, absent });
  assert.equal(absent, true);
}
```

#### pty-driver.py — exact source

sha256 `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747`.

```python
import codecs
import fcntl
import json
import os
import pty
import select
import signal
import struct
import sys
import termios
import time

pid, master = pty.fork()
if pid == 0:
    os.execvp("omp", ["omp", *sys.argv[1:]])
fcntl.ioctl(master, termios.TIOCSWINSZ, struct.pack("HHHH", 80, 500, 0, 0))
decoder = codecs.getincrementaldecoder("utf-8")("replace")
print(json.dumps({"event": "pid", "pid": pid}), flush=True)
try:
    while True:
        readable, _, _ = select.select([master, sys.stdin], [], [], 0.2)
        if master in readable:
            try:
                data = os.read(master, 65536)
            except OSError:
                break
            if not data:
                break
            if b"\x1b[6n" in data:
                os.write(master, b"\x1b[1;1R")
            print(json.dumps({"event": "data", "text": decoder.decode(data)}), flush=True)
        if sys.stdin in readable:
            line = sys.stdin.readline()
            if not line:
                break
            command = json.loads(line)
            if command.get("stop"):
                break
            os.write(master, command.get("keys", (command.get("text", "") + "\r")).encode())
finally:
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    deadline = time.monotonic() + 5
    while time.monotonic() < deadline:
        found, status = os.waitpid(pid, os.WNOHANG)
        if found:
            print(json.dumps({"event": "exit", "status": os.waitstatus_to_exitcode(status)}), flush=True)
            break
        time.sleep(0.05)
    else:
        os.kill(pid, signal.SIGKILL)
        os.waitpid(pid, 0)
    os.close(master)

```

#### cleanup-receipt.mjs — exact source

sha256 `a3d2211b9dcc0bdb15c19192de64b41e7d41c2657ce9b12825eea5b6a4250a2f`.

```javascript
import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { recordStart, recordEnd } from "./record-run.mjs";
import { repo, scratch, log } from "./gate-lib.mjs";
recordStart("Independent cleanup and before-image preservation receipt");
const path = join(repo, "omp-orca-observer/checks/evidence/gc3.md");
const before = await readFile(join(scratch, "gc3-before-continuation.md"));
const current = await readFile(path);
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
assert.equal(sha(before), "73cfdf524ef1767339fc25497b06ee08091fc98ef62536be2bc26a019910ecda");
assert.ok(current.subarray(0, before.length).equals(before), "Earlier evidence changed instead of append-only continuation");
const added = current.subarray(before.length).toString();
const observed = [...added.matchAll(/^#### Observed output \(incremental\)\n\n```text\n([\s\S]*?)\n```/gm)].map(match => match[1]).join("\n");
const created = [...observed.matchAll(/^PROFILE (\{.*\})$/gm)].map(match => JSON.parse(match[1]));
const removed = [...observed.matchAll(/^PROFILE_REMOVED (\{.*\})$/gm)].map(match => JSON.parse(match[1]));
assert.equal(created.length, 6); assert.equal(removed.length, 6);
assert.ok(removed.every(profile => profile.absent === true));
log("APPEND_ONLY_RECOVERY", { baselineBytes: before.length, baselineSha256: sha(before), earlierBytesUnchanged: true, sourceDelta: "The exact current suffix after baselineBytes; the original before-image remains as the unchanged file prefix", disposableRootsCreated: created.length, disposableRootsRemoved: removed.length, scenarioNames: [...new Set(created.map(profile => profile.name))] });
await rm(scratch, { recursive: true, force: true });
const absent = await stat(scratch).then(() => false, error => { assert.equal(error.code, "ENOENT"); return true; });
assert.equal(absent, true);
log("SCRATCH_REMOVED", { root: "<tmp>/gc3", absent, includes: "all old/new scripts and outputs, exact before-image, temporary Playwright dependency/client and downloaded browser binaries" });
recordEnd("Six disposable roots across five scenario names were already removed; the entire reused scratch directory is now independently absent, including this receipt script. Before-image bytes remain unchanged as the evidence prefix. No repository file other than this evidence was written.");

```

#### Observed output (incremental)

```text
APPEND_ONLY_RECOVERY {"baselineBytes":187221,"baselineSha256":"73cfdf524ef1767339fc25497b06ee08091fc98ef62536be2bc26a019910ecda","earlierBytesUnchanged":true,"sourceDelta":"The exact current suffix after baselineBytes; the original before-image remains as the unchanged file prefix","disposableRootsCreated":6,"disposableRootsRemoved":6,"scenarioNames":["worktree-deleted","cold-restart","partial-restore","one-child","follow-up"]}
SCRATCH_REMOVED {"root":"<tmp>/gc3","absent":true,"includes":"all old/new scripts and outputs, exact before-image, temporary Playwright dependency/client and downloaded browser binaries"}

```

Runner exit: 0. Six disposable roots across five scenario names were already removed; the entire reused scratch directory is now independently absent, including this receipt script. Before-image bytes remain unchanged as the evidence prefix. No repository file other than this evidence was written.

**PASS — cleanup and recovery.** Corrected `GC3_REPO="$PWD" bun <tmp>/gc3/cleanup-receipt.mjs` exited 0 (0.15 s). Its assertion-based receipt counted exactly six created and six removed disposable roots across five scenario names, all removal receipts carrying `absent:true`. It byte-compared the original 187,221-byte evidence prefix against the exact before-image, hash `73cfdf524ef1767339fc25497b06ee08091fc98ef62536be2bc26a019910ecda`, and proved no earlier byte changed. The entire reused scratch directory was then removed and independently stat-checked as absent, including old/new scripts, outputs, recovery snapshot, temporary Playwright modules and downloaded browser binaries. The before-image remains recoverable from the unchanged evidence prefix; the owned delta is the appended suffix after byte 187,221. No unrelated repository change was reverted.

Cleanup checks: `GC3_REPO="$PWD" bun <tmp>/gc3/cleanup-receipt.mjs` | first receipt source, whole-Markdown counting | new failure, exit 1 (`7 !== 6`) | duplicate illustrative excerpt counted; no deletion reached. Same command | corrected receipt source, observed-output-only counting | passed, exit 0 | six actual teardown receipts, unchanged baseline prefix, scratch absent. This tooling failure is preserved above, not presented as a product failure or silently discarded.

## final matrix (2026-10-01; newest result wins)

| Criterion | Result | Proving section |
|---|---|---|
| v05 `/new`: epoch changes; old code/credential rejected and old page token reset | PASS | Original “v05 — publisher replacement and restoration”; unchanged accepted result |
| v05 omp restart / native resume: successor epoch and no historical outcome binding | PASS | Original publisher replacement section; continuation “Accepted cold-restart and partial-restore” observations |
| v05 extension removal / reload through stock disable-enable plus process restart | PASS | Original publisher replacement section; unchanged accepted next-launch lifecycle |
| v05 actual native branch: new session/epoch; old code, credential and old-token page request rejected | PASS | Continuation “v05 actual native session_branch publisher replacement” and “Accepted native branch result” |
| v05 cold-restart inventory unknown, not complete, before every child transcript has a ref | PASS | Continuation “v05 cold-restart then partial-restore inventory and old-token sequence”: 12 unknown samples at 0/3; all 3 native refs before complete |
| v05 partial-restore inventory unknown, not complete, before all refs | PASS | Same continuation: 12 unknown samples at 0/135, unknown at 86/135, then complete with all 135 persisted child transcripts matched to refs |
| v05 cold/partial old credential and old-token sequence across restoration | PASS | Same continuation: expected pre-restoration HTTP 401; fresh post-restoration TUI grant returns HTTP 200 / `reset:true` for both old tokens |
| v05 delayed prior-run outcome cannot claim current completion while native ref runs | PASS | Continuation “v05 delayed prior-run terminal judged at authenticated snapshot row” and “Accepted delayed prior-run result”: unknown/conflicting while running; real completed status after idle |
| v05 tombstoned child aborted or unavailable | PASS | Original publisher replacement section: actual tombstone marker, aborted row/outcome |
| v05 fresh recipient reconnect under unchanged epoch; old unused credential expires after 60 s; native state unchanged | PASS | Original “v05 — recipient reconnect”: two actual headless browsers, 401 after 65,005 ms, identical native digests |
| v05 Orca restart | DEFERRED | Slice lifetime 3 assigns it to the Orca-assisted gate; no Orca command is run here |
| Historical fork result (not in this slice's continuation scope) | UNVERIFIED | Original publisher replacement section; latest slice resolution explicitly leaves the recorded result |
| v09 worktree-shared lineage correct or explicitly unknown | PASS | Original “v09 — workspace scenarios”: HTTP 200, known shared cwd, explicit reasons for other fields |
| v09 worktree-isolated lineage correct or explicitly unknown | PASS | Original workspace section: native isolated cwd distinct from parent, other fields explicitly unknown |
| v09 worktree-linked lineage correct or explicitly unknown | PASS | Original “Additional workspace observations and accepted status-first run”: correct linked cwd |
| v09 worktree-deleted lineage explicitly unknown after deletion | PASS | “re-run v09 worktree-deleted (2026-10-01)”: fixed revision `2f6d27b`, absent checkout, exact `unknown("cwd no longer exists")` |
| v09 detached-head lineage correct or explicitly unknown | PASS | Original additional workspace observations: HTTP 200, branch explicitly `unknown("branch not recorded")` |
| v09 bridge creates no checkout or terminal in the observed operations | PASS | Original workspace before/after worktree/process comparisons plus deleted-worktree re-run; native process renames / PR lookup turnover are separately attributed |
| v09 manual SCM join documented step by step without bridge-created checkout/terminal | PASS | Original “Manual SCM join”: pinned v1.4.215 external-worktree Show → Source Control procedure; live execution not required or claimed |
| v10 bridge does not invoke Orca commit generation | PASS | Original “v10 — disposable git-commit comparison”: no Orca command/open, descendant process observations and inspected command ownership |
| v10 enabled/disabled skill-script commit parity, no push, one disposable repository | PASS | Original v10 section: identical output/tree/commit `960ef978982a9d56974b5a2f2d2df950fdf411a1`, no remote/push, repository removed |
| Append-only dated evidence and complete cleanup of used profiles / scratch | PASS | Both dated sections, embedded exact scripts/sha256/output, “Independent cleanup and before-image preservation receipt” and cleanup result above |

## unverified

- Historical fork remains unverified by explicit scope resolution; no fork attempt is added.
- A named pre-restoration TUI grant-admission refusal is not observed: TUI restores eagerly. The reachable RPC window proves the exact TUI-mode refusal instead; no grant-store bypass or probe copy is used.
- Orca restart is deferred to its assigned assisted gate; live Orca SCM/manual-join execution is not attempted here.
- Before/after process observations are not a syscall-level audit of transient subprocesses; the original v10 limitation stands.
- Restoration checks prove the recorded zero-ref, partial-ref and all-ref windows, not an exhaustive schedule of every possible interleaving. Delayed-terminal acceptance is the resolved controlled bus replay plus real snapshot/registry evidence, not a second independently launched native task.
- Previously accepted `/new`, resume, extension lifecycle, tombstone, recipient reconnect, other workspace shapes and v10 parity are preserved from the original run, not re-executed in this continuation. No unresolved in-scope criterion failure remains.

## re-run evidence review (2026-10-01)

Binding scope: the slice's newest four-item evidence-review note, in order. Product input is `2f6d27be41e4ac53afebb686cb81fff28276eadc` (`git rev-parse HEAD`); slice sha256 `7fb5e0ec4bf8c44e61986096338b630177dc3fc661a3a647505134baa4fe86ff`. The exact evidence before-image is 883,706 bytes, sha256 `63bd21059005e2c53a51a12c08ecd28ae6383b639db7d9d7573f92792eaa6494`, captured at `<tmp>/gc3/before.md` before editing; recovery is also the unchanged evidence prefix. `ncm list omp-orca-observer/checks/evidence/gc3.md` returned zero contracts. Exclusive repository write boundary: this file only.

Runs use harness-created disposable profiles, their local stub, and the unmodified installed omp. No live `$HOME/.omp` is used for omp execution; the pre-approved v10 skill script is read/run from its existing location with a disposable HOME and cwd. No Orca command is authorized: item 2's shims only log and fail if reached. Drivers are backgrounded from the scratch directory, not the shared worktree. The four results below supersede only the reviewed evidence gaps; earlier observations stand.

### 1. Native branch: old token with fresh TUI credential

Invocation: `GC3_REPO="$PWD" bun <tmp>/gc3/run.mjs branch-review` (background). Unmodified, already-embedded support sources are re-extracted and hash-checked; their exact-byte identities and the new runner/driver sources are recorded below. `/observer status` precedes grants; grant notifications wait up to 90 s. HTTP is exercised with Bun `fetch`, not a browser; this criterion is token/auth behavior, not viewer rendering. Receipts remove only TUI padding/banner noise and bootstrap secrets, retaining every observer-status line and relevant notification.

First attempt: exit 1, 94,495 ms. Executed `branch-review.mjs` sha256 `59db1149fab100da4b187433a1dd031cafde69c902fdb4640c7291948e295e07`; normalized stdout 13,800 bytes, sha256 `61411a79bfa3694fcd849e77a69e2264876bf0e27111e62f6cdd5cde12b1161e`; stderr empty. Exact proving excerpts:

```text
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T07:58:40.217Z","schema":1,"epoch":"234c7976-93f6-462e-bc2c-7e65f02dc003"}}
NATIVE_BRANCH_COMMAND ... "result":{"cancelled":false}
OLD_TOKEN_OLD_CREDENTIAL {"route":"/v1/children/child-one/page?mode=entries&token=<redacted>","status":401,"body":"Unauthorized","suppliedPriorToken":true}
OLD_EPOCH_AUTH_REJECTION {"code":401,"credential":401,"pageWithOldCredential":401,"elapsedUnusedCodeMs":707}
Error: observer: child ids not admitted: child-one
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}
```

The refusal is **correct**: the pre-branch child is outside the branched root. This attempt never acquired a fresh credential, so it proves no token-with-fresh-auth result. Orchestrator-approved method: spawn a real new native child via the disposable stub after branch, grant it in the new epoch, and present the pre-branch token on that child's page route. Both child and epoch differ; this is not a same-child/epoch-only isolation claim. The first output's empty status arrays were a receipt-normalizer CR/newline bug, not absent status observations; its source and hash stand, and the next normalizer accepts both delimiters.

**PASS — fresh new-epoch credential, independently of old-credential rejection.** Same command, native post-branch fixture, exit 0 in 5,624 ms. Executed driver sha256 `93109218b708d94db0d30daad51f3f6725c893c4325de4d021ab0cd46b6c6d7c`. Complete compact normalized stdout follows (5,866 bytes, sha256 `b9bc3b3d1b562509c9327f0d0491cd6b2fe0d2c0a448b072504d9564c9521d86`); stderr empty, sha256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

```text
PROFILE {"name":"one-child","root":"<tmp>/one-child","workspace":"<tmp>/one-child/workspace","stubUrl":"http://127.0.0.1:34627/v1"}
DISPOSABLE_STUB_SCENARIO {"name":"one-child","setup":["create('one-child')","run omp with user prompt HARNESS_AGENT=main; wait for its blocking task to finish"],"settings":{"async":{"enabled":false}},"agents":["blocking: full tools; inline task child"],"expected":["one native task child under the root session","started then completed lifecycle, with admitted session file and parent task tool-call id"],"turns":{"main":[{"calls":[{"tool":"task","args":{"context":"Native single child","tasks":[{"name":"child-one","agent":"blocking","task":"HARNESS_AGENT=child/one finish this assignment.","solutionSpace":"One short answer."}]}}]},{"text":"main complete"}],"child/one":[{"text":"child complete","calls":[{"tool":"yield","args":{"type":"result"}}]}],"branch":[{"calls":[{"tool":"task","args":{"context":"Native single child","tasks":[{"name":"after-branch","agent":"blocking","task":"HARNESS_AGENT=child/after finish this assignment.","solutionSpace":"One short answer."}]}}]},{"text":"branch fixture complete"}],"child/after":[{"text":"child complete","calls":[{"tool":"yield","args":{"type":"result"}}]}]}}
TUI_START {"command":["omp","--profile","one-child","--extension","<tmp>/gc3/gc3-control.mjs","--extension","<tmp>/gc3/gc3-branch-cmd.mjs"],"cwd":"<tmp>/one-child/workspace"}
SCENARIO_FINAL_REPLY main complete
BASELINE_FULL_OBSERVER_STATUS ["observer state: ready","epoch: 32686ae9-edad-45b3-9ef5-9dc9be78d10d","endpoint: not serving","grants: 0 children, 0 live credentials, 0 pending codes","inventory: complete"]
FULL_OBSERVER_GRANT http://127.0.0.1:38019/#code=<redacted>
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T08:04:56.191Z","schema":1,"epoch":"32686ae9-edad-45b3-9ef5-9dc9be78d10d"}}
PRE_BRANCH_ADMITTED_CHILD {"epoch":"32686ae9-edad-45b3-9ef5-9dc9be78d10d","rootSession":{"known":true,"value":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-54-494Z_01a0f663-3f1e-74f7-bc29-87abcf04aa80.jsonl"},"childId":"child-one","grantScope":"granted"}
PRE_BRANCH_PAGE {"route":"/v1/children/child-one/page?mode=entries&token=","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":false,"atEnd":true,"tokenSha256":"8240193445a50278d66c9ef55cf49add9795ea16db9788c8e58bca7389520e0f"},"suppliedPriorToken":false}
FULL_OBSERVER_URL http://127.0.0.1:38019/#code=<redacted>
NATIVE_BRANCH_COMMAND {"entryId":"a9028a7b","before":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-54-494Z_01a0f663-3f1e-74f7-bc29-87abcf04aa80.jsonl","after":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-56-311Z_01a0f663-4637-77e9-9ddd-cd32dfb7e8de.jsonl","result":{"cancelled":false}}
AFTER_BRANCH_FULL_OBSERVER_STATUS ["observer state: ready","epoch: 958e8c6b-02c5-417b-bd47-24773bab25f0","endpoint: not serving","grants: 0 children, 0 live credentials, 0 pending codes","inventory: complete"]
NATIVE_SESSION_BRANCH {"type":"session_branch","previousSessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-54-494Z_01a0f663-3f1e-74f7-bc29-87abcf04aa80.jsonl","sessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-56-311Z_01a0f663-4637-77e9-9ddd-cd32dfb7e8de.jsonl"}
AFTER_BRANCH_SERVE http://127.0.0.1:36995/
EXCHANGE {"status":401,"body":"Unauthorized"}
REQUEST {"path":"/v1/snapshot","status":401,"body":"Unauthorized"}
OLD_TOKEN_OLD_CREDENTIAL {"route":"/v1/children/child-one/page?mode=entries&token=<redacted>","status":401,"body":"Unauthorized","suppliedPriorToken":true}
OLD_EPOCH_AUTH_REJECTION {"code":401,"credential":401,"pageWithOldCredential":401,"elapsedUnusedCodeMs":709}
NEW_EPOCH_SCENARIO_FINAL_REPLY branch fixture complete
NEW_CHILD_FULL_OBSERVER_STATUS ["observer state: ready","epoch: 958e8c6b-02c5-417b-bd47-24773bab25f0","endpoint: http://127.0.0.1:36995/","grants: 0 children, 0 live credentials, 0 pending codes","inventory: complete"]
FULL_OBSERVER_GRANT http://127.0.0.1:36995/#code=<redacted>
EXCHANGE {"status":200,"body":{"credential":"<redacted>","expiresAt":"2026-10-01T08:04:57.561Z","schema":1,"epoch":"958e8c6b-02c5-417b-bd47-24773bab25f0"}}
FRESH_EPOCH_ADMITTED_CHILD {"status":200,"epoch":"958e8c6b-02c5-417b-bd47-24773bab25f0","rootSession":{"known":true,"value":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-56-311Z_01a0f663-4637-77e9-9ddd-cd32dfb7e8de.jsonl"},"childId":"after-branch","grantScope":"granted"}
FRESH_EPOCH_NATIVE_REF {"id":"after-branch","kind":"sub","parentId":"Main","status":"idle","sessionFile":"<tmp>/one-child/home/.omp/profiles/one-child/agent/sessions/--tmp-omp-orca-harness-vSTyly-workspace--/2026-10-01T07-34-56-311Z_01a0f663-4637-77e9-9ddd-cd32dfb7e8de/after-branch.jsonl","hasSession":true}
OLD_TOKEN_FRESH_CREDENTIAL {"route":"/v1/children/after-branch/page?mode=entries&token=<redacted>","status":200,"body":{"kind":"page","mode":"entries","malformed":0,"reset":true,"atEnd":true,"tokenSha256":"fa7b2533537fe44b5f93cf3cc92a3ce96df55019a37423f33b725535f58f7edc"},"suppliedPriorToken":true}
BRANCH_REVIEW_RESULT {"result":"PASS","oldEpoch":"32686ae9-edad-45b3-9ef5-9dc9be78d10d","epoch":"958e8c6b-02c5-417b-bd47-24773bab25f0","sourceChild":"child-one","grantedChild":"after-branch","oldCredentialRejected":401,"oldTokenFreshCredentialStatus":200,"reset":true}
TUI_STOP {"nativeStatus":143,"stderr":""}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}
```

The fresh grant is TUI-issued for native `after-branch`, whose registry transcript is under the new root; its authorized snapshot succeeds before token presentation. The prior token was issued for `child-one` in epoch `32686ae9-edad-45b3-9ef5-9dc9be78d10d`; with the new credential, `/v1/children/after-branch/page` returns HTTP 200, `kind:"page"`, `reset:true` in epoch `958e8c6b-02c5-417b-bd47-24773bab25f0`. The old-credential HTTP 401 is separately recorded, not substituted for this result.

### 2. v10: interval-complete Orca CLI logging and commit parity

Instrumentation setup: `bun <tmp>/gc3/setup-v10.mjs`. Run: `GC3_REPO="$PWD" PATH=<tmp>/gc3/shims:"$PATH" ORCA_CLI_COMMAND=<tmp>/gc3/shims/orca-cli-wrapper GC3_ORCA_CALL_LOG=<tmp>/gc3/orca-calls.log bun <tmp>/gc3/run.mjs v10-review` (background). The wrapper and first-PATH `orca-ide` / `orca` shims append argv then exit 97; they never forward to Orca. Logging begins before profile creation and ends after both TUI modes stop and the entire disposable repository/profile is removed. No instrumentation wrapper is invoked to self-test it.

Setup exited 0 and produced `logging-gate-lib.mjs` sha256 `3dd51a2f019448b1f0e048425a73265fcb0c9d29ce2a30a1f864fd70509ad23f`; each of the three identical 209-byte logging wrappers has sha256 `536cb684455e7b43d7d3aaf448e383120440676d3e93e341a1cfcab181fa9a0a`. Only the scratch helper's env allowlist differs from the already-embedded original: it forwards `ORCA_CLI_COMMAND` and `GC3_ORCA_CALL_LOG` to the disposable subprocess. The installed binary, observer, and harness remain unchanged.

**PASS — zero CLI calls across the complete interval and identical skill-script commits.** Run exited 0 in 5,793 ms; driver sha256 `f4243baed6634530219d87cccd321e546fa676cdebb47faba73e59496dc21d76`. Complete compact normalized stdout (5,978 bytes, sha256 `b5435f0a6b28751d4a57a867845543c4b0affe9f4e4e46f958b230e4bc1250ee`); stderr empty:

```text
CALL_LOG_INTERVAL_BEGIN {"log":"<tmp>/gc3/orca-calls.log","cli":"<tmp>/gc3/shims/orca-cli-wrapper","pathPrefix":"<tmp>/gc3/shims","shims":["orca-cli-wrapper","orca-ide","orca"],"initialBytes":0}
SKILL_SCRIPT {"path":"$HOME/.omp/agent/skills/git-commit/scripts/smart_commit.sh","sha256":"59ae8147d0208c3298241ef08f598c55f46364866f4b82c55279063b3f974af7"}
PROFILE {"name":"one-child","root":"<tmp>/one-child","workspace":"<tmp>/one-child/workspace","stubUrl":"http://127.0.0.1:42263/v1"}
OMP_VERSION omp/18.4.6
OMP_ENVIRONMENT {"HOME":"<tmp>/one-child/home","TMPDIR":"<tmp>/one-child/tmp","ORCA_CLI_COMMAND":"<tmp>/gc3/shims/orca-cli-wrapper","GC3_ORCA_CALL_LOG":"<tmp>/gc3/orca-calls.log","pathPrefix":"<tmp>/gc3/shims"}
COMMAND {"command":["git","switch","-c","gc3-commit"],"cwd":"<tmp>/one-child/workspace","code":0,"stdout":"","stderr":"Switched to a new branch 'gc3-commit'\n"}
TUI_START {"command":["omp","--profile","one-child"],"cwd":"<tmp>/one-child/workspace"}
SCENARIO_FINAL_REPLY main complete
ENABLED_FULL_OBSERVER_STATUS ["observer state: ready","epoch: eb5e42e5-de73-4a63-9310-55f559256293","endpoint: not serving","grants: 0 children, 0 live credentials, 0 pending codes","inventory: complete"]
OBSERVER_SERVING http://127.0.0.1:35369/
PROCESS_LIST_BEFORE {"enabled":true,"rows":[{"pid":2374009,"ppid":2373942,"comm":"python3","args":"python3 <tmp>/gc3/pty-driver.py --profile one-child"},{"pid":2374010,"ppid":2374009,"comm":"omp","args":"omp --profile one-child"},{"pid":2374134,"ppid":2374010,"comm":"omp","args":"daemon brok $HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_daemon_broker"},{"pid":2374193,"ppid":2374134,"comm":"omp","args":"$HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_text_predict"}]}
COMMAND {"command":["bash","$HOME/.omp/agent/skills/git-commit/scripts/smart_commit.sh","test(gc3): check commit parity","--no-push","--whole-paths","--","fixture.txt"],"cwd":"<tmp>/one-child/workspace","code":0,"stdout":"→ current branch: gc3-commit\n→ staging every change in 1 requested path(s)...\n→ Using provided message: test(gc3): check commit parity\n[gc3-commit (root-commit) 960ef97] test(gc3): check commit parity\n 1 file changed, 1 insertion(+)\n create mode 100644 fixture.txt\n→ Created commit: 960ef97 (test(gc3): check commit parity)\n→ Skipping push (default; pass --push to opt in)\n fixture.txt | 1 +\n 1 file changed, 1 insertion(+)\n","stderr":""}
PROCESS_LIST_AFTER {"enabled":true,"rows":[{"pid":2374009,"ppid":2373942,"comm":"python3","args":"python3 <tmp>/gc3/pty-driver.py --profile one-child"},{"pid":2374010,"ppid":2374009,"comm":"omp","args":"omp --profile one-child"},{"pid":2374134,"ppid":2374010,"comm":"omp","args":"daemon brok $HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_daemon_broker"},{"pid":2374193,"ppid":2374134,"comm":"omp","args":"$HOME/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js __omp_worker_text_predict"}]}
COMMIT_MODE_RESULT {"enabled":true,"commit":["960ef978982a9d56974b5a2f2d2df950fdf411a1","1bad9965cf80f19858f7ab5707dcd0c2971424c6","test(gc3): check commit parity"],"skillStdoutSha256":"9e8d809c3910065c07af98acecbd5e2cfed2805b3156a14ec5a1f359bf0ba603","skillStderrSha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","showSha256":"2b34752ee2a03f5a412040c6999b0f62e34247075d97f9b79c5dab7b43d41886","cleanWorktree":true,"remoteCount":0,"survivingCommits":1}
TUI_STOP {"nativeStatus":143,"stderr":""}
RESTORE_DISPOSABLE_GIT_BEFORE_IMAGE true
TUI_START {"command":["omp","--profile","one-child","--no-extensions"],"cwd":"<tmp>/one-child/workspace"}
OBSERVER_DISABLED {"flags":["--no-extensions"],"nativeTuiReady":true}
PROCESS_LIST_BEFORE {"enabled":false,"rows":[{"pid":2374337,"ppid":2373942,"comm":"python3","args":"python3 <tmp>/gc3/pty-driver.py --profile one-child --no-extensions"},{"pid":2374338,"ppid":2374337,"comm":"omp","args":"omp --profile one-child --no-extensions"}]}
COMMAND {"command":["bash","$HOME/.omp/agent/skills/git-commit/scripts/smart_commit.sh","test(gc3): check commit parity","--no-push","--whole-paths","--","fixture.txt"],"cwd":"<tmp>/one-child/workspace","code":0,"stdout":"→ current branch: gc3-commit\n→ staging every change in 1 requested path(s)...\n→ Using provided message: test(gc3): check commit parity\n[gc3-commit (root-commit) 960ef97] test(gc3): check commit parity\n 1 file changed, 1 insertion(+)\n create mode 100644 fixture.txt\n→ Created commit: 960ef97 (test(gc3): check commit parity)\n→ Skipping push (default; pass --push to opt in)\n fixture.txt | 1 +\n 1 file changed, 1 insertion(+)\n","stderr":""}
PROCESS_LIST_AFTER {"enabled":false,"rows":[{"pid":2374337,"ppid":2373942,"comm":"python3","args":"python3 <tmp>/gc3/pty-driver.py --profile one-child --no-extensions"},{"pid":2374338,"ppid":2374337,"comm":"omp","args":"omp --profile one-child --no-extensions"}]}
COMMIT_MODE_RESULT {"enabled":false,"commit":["960ef978982a9d56974b5a2f2d2df950fdf411a1","1bad9965cf80f19858f7ab5707dcd0c2971424c6","test(gc3): check commit parity"],"skillStdoutSha256":"9e8d809c3910065c07af98acecbd5e2cfed2805b3156a14ec5a1f359bf0ba603","skillStderrSha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","showSha256":"2b34752ee2a03f5a412040c6999b0f62e34247075d97f9b79c5dab7b43d41886","cleanWorktree":true,"remoteCount":0,"survivingCommits":1}
TUI_STOP {"nativeStatus":143,"stderr":""}
V10_PARITY_RESULT {"result":"PASS","identicalNormalizedStdoutStderr":true,"identicalCommitTreeSubject":true,"identicalFullerShow":true,"commit":"960ef978982a9d56974b5a2f2d2df950fdf411a1","noPush":true,"survivingCommits":1}
PROFILE_REMOVED {"name":"one-child","root":"<tmp>/one-child","absent":true}
CALL_LOG_INTERVAL_END {"bytes":0,"lines":0,"sha256":"e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855","profileRemoved":true,"coverage":"before profile creation through both stopped TUI modes, skill commits, and profile teardown"}
```

The log remains exactly empty through teardown: zero calls via explicit CLI selection or either first-PATH name. Both modes used one repository, the same `.git` before-image and pinned fixture identities/dates, the existing skill script with `--no-push --whole-paths -- fixture.txt`, and produced identical commit/tree/subject, normalized stdout/stderr and full `git show --stat --format=fuller`. Each replay had exactly one surviving commit and no remote; then the repository was deleted. Descendant samples contain only Python/omp/native omp workers. The logging proof closes the CLI-call interval gap; it is not a claim of syscall auditing or arbitrary hard-coded external-executable surveillance.

### 3. Pre-restoration named grant refusal

**UNVERIFIED natively.** Per the binding reachability ruling, TUI restores persisted children eagerly; in the reachable pre-admission RPC window `/observer grant` rejects secret-bearing commands on mode first. Earlier “v05 cold-restart then partial-restore inventory and old-token sequence” receipts remain the native evidence, not a named-admission proof. Item 1's post-branch named refusal is also not a pre-restoration observation.

Inspected component coverage `omp-orca-observer/checks/commands.check.ts:263-272` (`commands.ts:93-115` supplies the implementation): for each `grant`, `url`, `open` and each non-admitted `missing`, `terra-advisor`, `fixture.run` must yield `not admitted: <id>`, `fixture.issues.length === 0`, and `fixture.serving.calls === 0`. No test is added or modified, and this component file is not run in this evidence-only slice; the final matrix distinguishes component coverage from unobserved native reachability.

### 4. Epoch-summary errata (earlier text unchanged)

- Original summary line 136: `bdb957a3-8aed-4947-8eab-e1f3986dcf3d` is a transcription error; the original normalized `v05-lifetimes-output.txt` has `bdb957a3-a8ed-4947-8eab-e1f3986dcf3d`. The successor `a4875129-2dcd-4e03-9d34-459bb71c267b` is unchanged. The lossless embedded output was re-decoded and verified at sha256 `8449e53c69a1821d4618bf7ad6e967afa6700f59465224a865621d1769429a0e`:

```text
INVALIDATION_RESULT {"oldEpoch":"bdb957a3-a8ed-4947-8eab-e1f3986dcf3d","newEpoch":"a4875129-2dcd-4e03-9d34-459bb71c267b","oldCodeStatus":401,"oldCredentialStatus":401,"priorToken":"reset","elapsedSinceUnusedCodeMs":6865}
V05_REPLACEMENT_RESULT {"name":"partial-restore","result":"PASS","oldEpoch":"bdb957a3-a8ed-4947-8eab-e1f3986dcf3d","newEpoch":"a4875129-2dcd-4e03-9d34-459bb71c267b"}
```

- Continuation summary line 3205: `988e48da-d3dd-45fa-bb07-15148794afa9` is a transcription error; the already-recorded cold-restart `RESTORED_TUI_FULL_STATUS` at lines 2747-2751 has `988e458a-dd3d-45fa-bb07-15148794afa9`. The partial-restore epoch `166e8276-bc7d-4085-bcd6-0e73c8c1cb8c` is unchanged:

```text
RESTORED_TUI_FULL_STATUS  observer state: ready
 epoch: 988e458a-dd3d-45fa-bb07-15148794afa9
 endpoint: not serving
 grants: 0 children, 0 live credentials, 0 pending codes
 inventory: complete
```

Both corrections are errata only: no historical result, output or summary line was rewritten.
### Exact-byte source receipts

New scratch scripts are embedded once below. Each fence includes the exact final newline in the hash. Save its body verbatim under `<tmp>/gc3`. Reproduce the first branch attempt by installing `branch-first.mjs` as `branch-review.mjs` and `compact-first.mjs` as `compact.mjs`; then restore the current blocks for the accepted runs. `extract-first.mjs` and `extract-initial.mjs` reconstruct the original two extractor generations; the current extractor uses the unchanged 883,706-byte prefix so it remains runnable after this appendix.

Re-extracted, unchanged source receipts (already embedded in the earlier native-branch/continuation source sections):

| File | Bytes | Exact-byte sha256 |
|---|---:|---|
| gate-lib.mjs | 8524 | `7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83` |
| pty-driver.py | 1676 | `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747` |
| gc3-control.mjs | 1883 | `f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e` |
| gc3-branch-cmd.mjs | 653 | `91bdcb292d3577678d5b1c00cec8cf6aacf885d8e958cf5380cca7a1a9cb8daf` |
| continuation-lib.mjs | 5701 | `cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b` |

`setup-v10.mjs` mechanically derives `logging-gate-lib.mjs` (sha256 `3dd51a2f019448b1f0e048425a73265fcb0c9d29ce2a30a1f864fd70509ad23f`) from the embedded canonical helper and writes the three logging-wrapper copies (sha256 `536cb684455e7b43d7d3aaf448e383120440676d3e93e341a1cfcab181fa9a0a`). No generated source depends on a machine-specific path.

#### extract-first.mjs — exact source

sha256 `dc1933213df10984502654d89a3ea43740cbb48b34e4d8d3bde0eb0a7f3de332`; 2794 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const repo = process.env.GC3_REPO;
assert.ok(repo);
const scratch = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const before = await readFile(join(repo, "omp-orca-observer/checks/evidence/gc3.md"));
assert.equal(hash(before), "63bd21059005e2c53a51a12c08ecd28ae6383b639db7d9d7573f92792eaa6494");
await writeFile(join(scratch, "before.md"), before);
console.log("BEFORE_IMAGE " + JSON.stringify({ bytes: before.length, sha256: hash(before) }));
const text = before.toString();
const sources = [
  ["gate-lib.mjs", "7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83"],
  ["pty-driver.py", "e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747"],
  ["gc3-control.mjs", "f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e"],
  ["gc3-branch-cmd.mjs", "91bdcb292d3577678d5b1c00cec8cf6aacf885d8e958cf5380cca7a1a9cb8daf"],
  ["continuation-lib.mjs", "cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b"]
];
function extract(name, expected, document) {
  const heading = document.indexOf(" " + name + " —");
  assert.ok(heading >= 0, name + " heading absent");
  const fence = document.indexOf("```", heading);
  const start = document.indexOf("\n", fence) + 1;
  const end = document.indexOf("\n```", start);
  const body = document.slice(start, end);
  const candidates = [body, body + "\n", body.replace(/\n+$/, "")];
  const source = candidates.find(value => hash(value) === expected);
  assert.ok(source !== undefined, name + " exact bytes not recovered");
  return source;
}
for (const [name, expected] of sources) {
  const source = extract(name, expected, text.slice(text.indexOf("## continuation (2026-10-01)")));
  await writeFile(join(scratch, name), source);
  console.log("RECOVERED " + JSON.stringify({ file: name, bytes: Buffer.byteLength(source), sha256: hash(source) }));
}
const encoded = /```gzip-base64\n([\s\S]*?)\n```/.exec(text)?.[1];
assert.ok(encoded);
const archive = gunzipSync(Buffer.from(encoded.replace(/\s/g, ""), "base64"));
await writeFile(join(scratch, "original-archive.md"), archive);
console.log("ARCHIVE " + JSON.stringify({ bytes: archive.length, sha256: hash(archive) }));
const v10 = extract("v10.mjs", "94dc8e3214f9b6545c330d56c3ef9d370594879e975c05d2f891c2768948e5cb", archive.toString());
await writeFile(join(scratch, "v10-original.mjs"), v10);
console.log("RECOVERED " + JSON.stringify({ file: "v10-original.mjs", bytes: Buffer.byteLength(v10), sha256: hash(v10) }));
```

#### extract-initial.mjs — exact source

sha256 `11ba5d078a0b4d0c178b70f95f74b7265655280edfaa4ac5ffb8f1a1d97e7842`; 3273 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const repo = process.env.GC3_REPO;
assert.ok(repo);
const scratch = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const before = await readFile(join(repo, "omp-orca-observer/checks/evidence/gc3.md"));
assert.equal(hash(before), "63bd21059005e2c53a51a12c08ecd28ae6383b639db7d9d7573f92792eaa6494");
await writeFile(join(scratch, "before.md"), before);
console.log("BEFORE_IMAGE " + JSON.stringify({ bytes: before.length, sha256: hash(before) }));
const text = before.toString();
const sources = [
  ["gate-lib.mjs", "7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83"],
  ["pty-driver.py", "e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747"],
  ["gc3-control.mjs", "f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e"],
  ["gc3-branch-cmd.mjs", "91bdcb292d3577678d5b1c00cec8cf6aacf885d8e958cf5380cca7a1a9cb8daf"],
  ["continuation-lib.mjs", "cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b"]
];
function extract(name, expected, document) {
  const heading = document.indexOf(" " + name + " —");
  assert.ok(heading >= 0, name + " heading absent");
  const fence = document.indexOf("```", heading);
  const start = document.indexOf("\n", fence) + 1;
  const end = document.indexOf("\n```", start);
  const body = document.slice(start, end);
  const candidates = [body, body + "\n", body.replace(/\n+$/, "")];
  const source = candidates.find(value => hash(value) === expected);
  assert.ok(source !== undefined, name + " exact bytes not recovered");
  return source;
}
for (const [name, expected] of sources) {
  const source = extract(name, expected, text.slice(text.indexOf("## continuation (2026-10-01)")));
  await writeFile(join(scratch, name), source);
  console.log("RECOVERED " + JSON.stringify({ file: name, bytes: Buffer.byteLength(source), sha256: hash(source) }));
}
const encoded = /```gzip-base64\n([\s\S]*?)\n```/.exec(text)?.[1];
assert.ok(encoded);
const archive = gunzipSync(Buffer.from(encoded.replace(/\s/g, ""), "base64"));
await writeFile(join(scratch, "original-archive.md"), archive);
console.log("ARCHIVE " + JSON.stringify({ bytes: archive.length, sha256: hash(archive) }));
assert.equal(hash(archive), "6e032f78c9440558a209fb1b00b73499561c0f963f3f878852f9e8792be942d4");
for (const name of ["v10.mjs", "v05-lifetimes-output.txt"]) {
  const section = archive.toString().split("### " + name + "\n")[1]?.split("\n### ")[0];
  assert.ok(section, name + " archive section absent");
  const metadata = JSON.parse(section.trimStart().split("\n")[0]);
  const encoded = /```base64\n([\s\S]*?)\n```/.exec(section)?.[1];
  assert.ok(encoded);
  const source = Buffer.from(encoded.replace(/\s/g, ""), "base64");
  assert.equal(hash(source), metadata.decodedSha256);
  await writeFile(join(scratch, name === "v10.mjs" ? "v10-original.mjs" : name), source);
  console.log("RECOVERED " + JSON.stringify({ file: name, bytes: source.length, sha256: hash(source) }));
}
```

#### extract.mjs — exact source

sha256 `30f78dab1b2255c8b52da19365f8a80ba28a69cbf07d296b92b2586dfbbf47e9`; 3295 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const repo = process.env.GC3_REPO;
assert.ok(repo);
const scratch = dirname(fileURLToPath(import.meta.url));
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const before = (await readFile(join(repo, "omp-orca-observer/checks/evidence/gc3.md"))).subarray(0, 883706);
assert.equal(hash(before), "63bd21059005e2c53a51a12c08ecd28ae6383b639db7d9d7573f92792eaa6494");
await writeFile(join(scratch, "before.md"), before);
console.log("BEFORE_IMAGE " + JSON.stringify({ bytes: before.length, sha256: hash(before) }));
const text = before.toString();
const sources = [
  ["gate-lib.mjs", "7830bc2ba884cd9a7bbf3ff24d867ea1be313ba9ea3fd87e69790312f9319e83"],
  ["pty-driver.py", "e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747"],
  ["gc3-control.mjs", "f17686e474dd04db6d9980851198918c110adc4a6f80025c2f8f6022530c909e"],
  ["gc3-branch-cmd.mjs", "91bdcb292d3577678d5b1c00cec8cf6aacf885d8e958cf5380cca7a1a9cb8daf"],
  ["continuation-lib.mjs", "cf6f02112ae4c3d80532d424d7d8fade7a29c4d01fbac66971f482b4c614161b"]
];
function extract(name, expected, document) {
  const heading = document.indexOf(" " + name + " —");
  assert.ok(heading >= 0, name + " heading absent");
  const fence = document.indexOf("```", heading);
  const start = document.indexOf("\n", fence) + 1;
  const end = document.indexOf("\n```", start);
  const body = document.slice(start, end);
  const candidates = [body, body + "\n", body.replace(/\n+$/, "")];
  const source = candidates.find(value => hash(value) === expected);
  assert.ok(source !== undefined, name + " exact bytes not recovered");
  return source;
}
for (const [name, expected] of sources) {
  const source = extract(name, expected, text.slice(text.indexOf("## continuation (2026-10-01)")));
  await writeFile(join(scratch, name), source);
  console.log("RECOVERED " + JSON.stringify({ file: name, bytes: Buffer.byteLength(source), sha256: hash(source) }));
}
const encoded = /```gzip-base64\n([\s\S]*?)\n```/.exec(text)?.[1];
assert.ok(encoded);
const archive = gunzipSync(Buffer.from(encoded.replace(/\s/g, ""), "base64"));
await writeFile(join(scratch, "original-archive.md"), archive);
console.log("ARCHIVE " + JSON.stringify({ bytes: archive.length, sha256: hash(archive) }));
assert.equal(hash(archive), "6e032f78c9440558a209fb1b00b73499561c0f963f3f878852f9e8792be942d4");
for (const name of ["v10.mjs", "v05-lifetimes-output.txt"]) {
  const section = archive.toString().split("### " + name + "\n")[1]?.split("\n### ")[0];
  assert.ok(section, name + " archive section absent");
  const metadata = JSON.parse(section.trimStart().split("\n")[0]);
  const encoded = /```base64\n([\s\S]*?)\n```/.exec(section)?.[1];
  assert.ok(encoded);
  const source = Buffer.from(encoded.replace(/\s/g, ""), "base64");
  assert.equal(hash(source), metadata.decodedSha256);
  await writeFile(join(scratch, name === "v10.mjs" ? "v10-original.mjs" : name), source);
  console.log("RECOVERED " + JSON.stringify({ file: name, bytes: source.length, sha256: hash(source) }));
}
```

#### run.mjs — exact source

sha256 `79150db2b743f521cd50fb22ad75f59e547d69fef88f793a87e4ccbe68a51dbf`; 1346 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const scratch = dirname(fileURLToPath(import.meta.url));
const name = process.argv[2];
assert.ok(["branch-review", "v10-review"].includes(name));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
console.log("EXECUTED_SOURCE " + JSON.stringify({ file: name + ".mjs", sha256: sha(await readFile(join(scratch, name + ".mjs"))) }));
const started = Date.now();
const child = Bun.spawn([process.execPath, join(scratch, name + ".mjs")], { cwd: scratch, env: process.env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
const [stdout, stderr, code] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited]);
await writeFile(join(scratch, name + ".stdout"), stdout);
await writeFile(join(scratch, name + ".stderr"), stderr);
process.stdout.write(stdout);
process.stderr.write(stderr);
console.log("RUN_RECEIPT " + JSON.stringify({ driver: name + ".mjs", code, elapsedMs: Date.now() - started, stdoutBytes: Buffer.byteLength(stdout), stdoutSha256: sha(stdout), stderrBytes: Buffer.byteLength(stderr), stderrSha256: sha(stderr) }));
process.exitCode = code;
```

#### compact-first.mjs — exact source

sha256 `54128a7d8b26ef8d8d6f7e3ce77944bdd2c7af3fd4fc2821098c22209584d72f`; 802 bytes.

```javascript
const print = console.log.bind(console);
console.log = value => {
  const split = value.indexOf(" ");
  const label = value.slice(0, split);
  const text = value.slice(split + 1);
  if (label === "TUI_START") {
    const data = JSON.parse(text);
    delete data.screen;
    return print(label + " " + JSON.stringify(data));
  }
  if (label.endsWith("_OBSERVER_STATUS")) {
    const lines = [...text.matchAll(/(?:^|\n)\s*(observer state:|epoch:|endpoint:|grants:|inventory:)([^\r\n]*)/g)].map(m => (m[1] + m[2]).trim());
    return print(label + " " + JSON.stringify(lines));
  }
  if (/^FULL_OBSERVER_(GRANT|URL)$/.test(label)) {
    const url = /http:\/\/127\.0\.0\.1:\d+\/#code=<redacted>/.exec(text)?.[0];
    return print(label + " " + (url ?? JSON.stringify(text.trim())));
  }
  print(value);
};
```

#### compact.mjs — exact source

sha256 `f917fb68521271d41d6663a647f218306a64ea2c908d5576c6186ac4e3056223`; 908 bytes.

```javascript
const print = console.log.bind(console);
console.log = value => {
  const split = value.indexOf(" ");
  const label = value.slice(0, split);
  const text = value.slice(split + 1);
  if (label === "TUI_START") {
    const data = JSON.parse(text);
    delete data.screen;
    return print(label + " " + JSON.stringify(data));
  }
  if (label.endsWith("_OBSERVER_STATUS")) {
    const lines = [...text.matchAll(/(?:^|[\r\n])\s*(observer state:|epoch:|endpoint:|grants:|inventory:)([^\r\n]*)/g)].map(m => (m[1] + m[2]).trim());
    return print(label + " " + JSON.stringify(lines));
  }
  if (/^FULL_OBSERVER_(GRANT|URL)$/.test(label)) {
    const url = /http:\/\/127\.0\.0\.1:\d+\/#code=<redacted>/.exec(text)?.[0];
    const errors = [...text.matchAll(/(?:^|[\r\n])\s*(Error: observer:[^\r\n]*)/g)].map(m => m[1].trim());
    return print(label + " " + (url ?? JSON.stringify(errors)));
  }
  print(value);
};
```

#### branch-first.mjs — exact source

sha256 `59db1149fab100da4b187433a1dd031cafde69c902fdb4640c7291948e295e07`; 4372 bytes.

```javascript
import "./compact.mjs";
import assert from "node:assert/strict";
import { join } from "node:path";
import { profile, tui, waitFor, exchange, request, cleanup, log, scratch } from "./gate-lib.mjs";
import { control, tuiStatus, tuiGrant, page, nativeLog } from "./continuation-lib.mjs";
const p = await profile("one-child");
let t;
try {
  t = await tui(p, ["--extension", control, "--extension", join(scratch, "gc3-branch-cmd.mjs")]);
  t.send("HARNESS_AGENT=main");
  await waitFor(() => t.text, text => text.includes("main complete"), 60000);
  log("SCENARIO_FINAL_REPLY", "main complete");
  await tuiStatus(t, "BASELINE_FULL_OBSERVER_STATUS");
  const old = await exchange(await tuiGrant(t));
  assert.equal(old.status, 200);
  const snapshot = await request(old, "/v1/snapshot", true);
  assert.equal(snapshot.status, 200);
  const child = snapshot.body.children[0];
  assert.ok(child);
  log("PRE_BRANCH_ADMITTED_CHILD", { epoch: snapshot.body.epoch, rootSession: snapshot.body.rootSession, childId: child.childId, grantScope: child.grantScope });
  const issued = await page(old, child.childId, "", "PRE_BRANCH_PAGE");
  assert.equal(issued.status, 200);
  assert.equal(issued.body.kind, "page");
  const unused = await tuiGrant(t, "url");
  const issuedAt = Date.now();
  let mark = t.text.length;
  t.send("/gc3-branch");
  const branched = await waitFor(() => t.text.slice(mark), text => text.includes("GC3_BRANCH "), 30000);
  const notification = /GC3_BRANCH (\{[^\r\n]+\})/.exec(branched)?.[1];
  assert.ok(notification);
  log("NATIVE_BRANCH_COMMAND", JSON.parse(notification));
  t.keys("\x15");
  await Bun.sleep(250);
  const status = await tuiStatus(t, "AFTER_BRANCH_FULL_OBSERVER_STATUS");
  assert.ok(status.epoch);
  assert.notEqual(status.epoch, old.epoch);
  const event = (await nativeLog(p)).filter(row => row.kind === "session_branch").at(-1);
  assert.ok(event);
  assert.equal(event.event.previousSessionFile, snapshot.body.rootSession.value);
  assert.notEqual(event.sessionFile, snapshot.body.rootSession.value);
  log("NATIVE_SESSION_BRANCH", { type: event.event.type, previousSessionFile: event.event.previousSessionFile, sessionFile: event.sessionFile });
  mark = t.text.length;
  t.send("/observer serve");
  const served = await waitFor(() => t.text.slice(mark), text => /observer serving: http:\/\/127\.0\.0\.1:\d+\//.test(text), 90000);
  const origin = /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(served)[1];
  log("AFTER_BRANCH_SERVE", origin);
  const oldCode = await exchange({ origin, code: unused.code });
  const oldCredential = await request({ ...old, origin }, "/v1/snapshot");
  const oldAuthPage = await page({ ...old, origin }, child.childId, issued.body.token, "OLD_TOKEN_OLD_CREDENTIAL");
  assert.equal(oldCode.status, 401);
  assert.equal(oldCredential.status, 401);
  assert.equal(oldAuthPage.status, 401);
  log("OLD_EPOCH_AUTH_REJECTION", { code: 401, credential: 401, pageWithOldCredential: 401, elapsedUnusedCodeMs: Date.now() - issuedAt });
  const fresh = await exchange(await tuiGrant(t, "grant", child.childId));
  assert.equal(fresh.status, 200);
  assert.equal(fresh.epoch, status.epoch);
  const current = await request(fresh, "/v1/snapshot", true);
  assert.equal(current.status, 200);
  assert.equal(current.body.epoch, fresh.epoch);
  const admitted = current.body.children.find(row => row.childId === child.childId);
  assert.ok(admitted);
  assert.equal(admitted.grantScope, "granted");
  log("FRESH_EPOCH_ADMITTED_CHILD", { status: current.status, epoch: current.body.epoch, rootSession: current.body.rootSession, childId: admitted.childId, grantScope: admitted.grantScope });
  const oldTokenFreshAuth = await page(fresh, child.childId, issued.body.token, "OLD_TOKEN_FRESH_CREDENTIAL");
  assert.ok((oldTokenFreshAuth.status === 200 && oldTokenFreshAuth.body.reset === true) || [400, 401, 403, 404, 410].includes(oldTokenFreshAuth.status));
  log("BRANCH_REVIEW_RESULT", { result: "PASS", oldEpoch: old.epoch, epoch: fresh.epoch, sameChild: child.childId, oldCredentialRejected: oldCredential.status, oldTokenFreshCredentialStatus: oldTokenFreshAuth.status, reset: oldTokenFreshAuth.body.reset });
} catch (error) {
  log("BRANCH_REVIEW_FAILURE", { result: "FAIL", message: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  await t?.stop();
  await cleanup(p);
}
```

#### branch-review.mjs — exact source

sha256 `93109218b708d94db0d30daad51f3f6725c893c4325de4d021ab0cd46b6c6d7c`; 5605 bytes.

```javascript
import "./compact.mjs";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { profile, tui, waitFor, exchange, request, cleanup, log, scratch, repo } from "./gate-lib.mjs";
import { control, tuiStatus, tuiGrant, page, nativeLog, customStub } from "./continuation-lib.mjs";
const p = await profile("one-child");
let t, stub;
try {
  const scenario = JSON.parse(await readFile(join(repo, "omp-orca-observer/checks/harness/scenarios/one-child.json"), "utf8"));
  const after = structuredClone(scenario.turns.main[0]);
  after.calls[0].args.tasks[0].name = "after-branch";
  after.calls[0].args.tasks[0].task = "HARNESS_AGENT=child/after finish this assignment.";
  scenario.turns.branch = [after, { text: "branch fixture complete" }];
  scenario.turns["child/after"] = structuredClone(scenario.turns["child/one"]);
  stub = await customStub(p, scenario);
  t = await tui(p, ["--extension", control, "--extension", join(scratch, "gc3-branch-cmd.mjs")]);
  t.send("HARNESS_AGENT=main");
  await waitFor(() => t.text, text => text.includes("main complete"), 60000);
  log("SCENARIO_FINAL_REPLY", "main complete");
  await tuiStatus(t, "BASELINE_FULL_OBSERVER_STATUS");
  const old = await exchange(await tuiGrant(t));
  assert.equal(old.status, 200);
  const snapshot = await request(old, "/v1/snapshot", true);
  assert.equal(snapshot.status, 200);
  const child = snapshot.body.children[0];
  assert.ok(child);
  log("PRE_BRANCH_ADMITTED_CHILD", { epoch: snapshot.body.epoch, rootSession: snapshot.body.rootSession, childId: child.childId, grantScope: child.grantScope });
  const issued = await page(old, child.childId, "", "PRE_BRANCH_PAGE");
  assert.equal(issued.status, 200);
  assert.equal(issued.body.kind, "page");
  const unused = await tuiGrant(t, "url");
  const issuedAt = Date.now();
  let mark = t.text.length;
  t.send("/gc3-branch");
  const branched = await waitFor(() => t.text.slice(mark), text => text.includes("GC3_BRANCH "), 30000);
  const notification = /GC3_BRANCH (\{[^\r\n]+\})/.exec(branched)?.[1];
  assert.ok(notification);
  log("NATIVE_BRANCH_COMMAND", JSON.parse(notification));
  t.keys("\x15");
  await Bun.sleep(250);
  const status = await tuiStatus(t, "AFTER_BRANCH_FULL_OBSERVER_STATUS");
  assert.ok(status.epoch);
  assert.notEqual(status.epoch, old.epoch);
  const event = (await nativeLog(p)).filter(row => row.kind === "session_branch").at(-1);
  assert.ok(event);
  assert.equal(event.event.previousSessionFile, snapshot.body.rootSession.value);
  assert.notEqual(event.sessionFile, snapshot.body.rootSession.value);
  log("NATIVE_SESSION_BRANCH", { type: event.event.type, previousSessionFile: event.event.previousSessionFile, sessionFile: event.sessionFile });
  mark = t.text.length;
  t.send("/observer serve");
  const served = await waitFor(() => t.text.slice(mark), text => /observer serving: http:\/\/127\.0\.0\.1:\d+\//.test(text), 90000);
  const origin = /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(served)[1];
  log("AFTER_BRANCH_SERVE", origin);
  const oldCode = await exchange({ origin, code: unused.code });
  const oldCredential = await request({ ...old, origin }, "/v1/snapshot");
  const oldAuthPage = await page({ ...old, origin }, child.childId, issued.body.token, "OLD_TOKEN_OLD_CREDENTIAL");
  assert.equal(oldCode.status, 401);
  assert.equal(oldCredential.status, 401);
  assert.equal(oldAuthPage.status, 401);
  log("OLD_EPOCH_AUTH_REJECTION", { code: 401, credential: 401, pageWithOldCredential: 401, elapsedUnusedCodeMs: Date.now() - issuedAt });
  mark = t.text.length;
  t.send("HARNESS_AGENT=branch");
  await waitFor(() => t.text.slice(mark), text => text.includes("branch fixture complete"), 60000);
  log("NEW_EPOCH_SCENARIO_FINAL_REPLY", "branch fixture complete");
  await tuiStatus(t, "NEW_CHILD_FULL_OBSERVER_STATUS");
  const fresh = await exchange(await tuiGrant(t, "grant", "after-branch"));
  assert.equal(fresh.status, 200);
  assert.equal(fresh.epoch, status.epoch);
  const current = await request(fresh, "/v1/snapshot", true);
  assert.equal(current.status, 200);
  assert.equal(current.body.epoch, fresh.epoch);
  const admitted = current.body.children.find(row => row.childId === "after-branch");
  assert.ok(admitted);
  assert.equal(admitted.grantScope, "granted");
  log("FRESH_EPOCH_ADMITTED_CHILD", { status: current.status, epoch: current.body.epoch, rootSession: current.body.rootSession, childId: admitted.childId, grantScope: admitted.grantScope });
  const ref = (await nativeLog(p)).filter(row => row.kind === "registry").at(-1)?.refs.find(row => row.id === admitted.childId);
  assert.ok(ref?.sessionFile);
  assert.ok(ref.sessionFile.startsWith(current.body.rootSession.value.replace(/\.jsonl$/, "") + "/"));
  log("FRESH_EPOCH_NATIVE_REF", ref);
  const oldTokenFreshAuth = await page(fresh, admitted.childId, issued.body.token, "OLD_TOKEN_FRESH_CREDENTIAL");
  assert.equal(oldTokenFreshAuth.status, 200);
  assert.equal(oldTokenFreshAuth.body.kind, "page");
  assert.equal(oldTokenFreshAuth.body.reset, true);
  log("BRANCH_REVIEW_RESULT", { result: "PASS", oldEpoch: old.epoch, epoch: fresh.epoch, sourceChild: child.childId, grantedChild: admitted.childId, oldCredentialRejected: oldCredential.status, oldTokenFreshCredentialStatus: oldTokenFreshAuth.status, reset: oldTokenFreshAuth.body.reset });
} catch (error) {
  log("BRANCH_REVIEW_FAILURE", { result: "FAIL", message: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  await t?.stop();
  await cleanup(p);
  await stub?.stop();
}
```

#### setup-v10.mjs — exact source

sha256 `b98d813d6512fd9a89c9c168046897d92d770d3914a7936285e7b1590a903616`; 1606 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, chmod } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const scratch = dirname(fileURLToPath(import.meta.url));
const source = await readFile(join(scratch, "gate-lib.mjs"), "utf8");
const original = 'for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) out[key] = process.env[key];';
assert.equal(source.split(original).length, 2);
const instrumented = source.replace(original, 'for (const key of ["PATH", "TERM", "LANG", "ORCA_CLI_COMMAND", "GC3_ORCA_CALL_LOG"]) if (process.env[key]) out[key] = process.env[key];');
await writeFile(join(scratch, "logging-gate-lib.mjs"), instrumented);
const shims = join(scratch, "shims");
await mkdir(shims);
const wrapper = '#!/bin/sh\nprintf \'%s\' "${0##*/}" >> "$GC3_ORCA_CALL_LOG"\nfor arg do printf \'\\t%s\' "$arg" >> "$GC3_ORCA_CALL_LOG"; done\nprintf \'\\n\' >> "$GC3_ORCA_CALL_LOG"\nprintf \'Unexpected Orca CLI invocation\\n\' >&2\nexit 97\n';
for (const name of ["orca-cli-wrapper", "orca-ide", "orca"]) {
  await writeFile(join(shims, name), wrapper);
  await chmod(join(shims, name), 0o755);
}
await writeFile(join(scratch, "orca-calls.log"), "");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
console.log("V10_INSTRUMENTATION " + JSON.stringify({ loggingGateLibSha256: sha(instrumented), wrapperSha256: sha(wrapper), wrapperBytes: Buffer.byteLength(wrapper), copies: ["orca-cli-wrapper", "orca-ide", "orca"], initialLogBytes: 0 }));
```

#### v10-review.mjs — exact source

sha256 `f4243baed6634530219d87cccd321e546fa676cdebb47faba73e59496dc21d76`; 5939 bytes.

```javascript
import "./compact.mjs";
import assert from "node:assert/strict";
import { cp, rm, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { profile, tui, waitFor, run, git, gitEnv, processList, cleanup, log, scratch, env } from "./logging-gate-lib.mjs";
import { tuiStatus } from "./continuation-lib.mjs";
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const callLog = join(scratch, "orca-calls.log");
assert.equal(process.env.ORCA_CLI_COMMAND, join(scratch, "shims/orca-cli-wrapper"));
assert.equal(process.env.GC3_ORCA_CALL_LOG, callLog);
assert.equal(process.env.PATH.split(":")[0], join(scratch, "shims"));
assert.equal(await readFile(callLog, "utf8"), "");
log("CALL_LOG_INTERVAL_BEGIN", { log: callLog, cli: process.env.ORCA_CLI_COMMAND, pathPrefix: process.env.PATH.split(":")[0], shims: ["orca-cli-wrapper", "orca-ide", "orca"], initialBytes: 0 });
let p, t;
const results = [];
const skill = join(process.env.HOME, ".omp/agent/skills/git-commit/scripts/smart_commit.sh");
try {
  log("SKILL_SCRIPT", { path: skill, sha256: sha(await readFile(skill)) });
  p = await profile("one-child");
  const version = await p.run(["--version"]);
  assert.equal(version.exitCode, 0);
  log("OMP_VERSION", version.stdout.trim());
  const environment = env(p);
  assert.equal(environment.ORCA_CLI_COMMAND, process.env.ORCA_CLI_COMMAND);
  assert.equal(environment.GC3_ORCA_CALL_LOG, callLog);
  assert.equal(environment.PATH.split(":")[0], join(scratch, "shims"));
  log("OMP_ENVIRONMENT", { HOME: environment.HOME, TMPDIR: environment.TMPDIR, ORCA_CLI_COMMAND: environment.ORCA_CLI_COMMAND, GC3_ORCA_CALL_LOG: environment.GC3_ORCA_CALL_LOG, pathPrefix: environment.PATH.split(":")[0] });
  await git(p, ["switch", "-c", "gc3-commit"]);
  await writeFile(join(p.workspace, "fixture.txt"), "gc3 disposable commit fixture\n");
  await cp(join(p.workspace, ".git"), join(p.root, "git-before"), { recursive: true });
  for (const enabled of [true, false]) {
    if (!enabled) {
      await rm(join(p.workspace, ".git"), { recursive: true, force: true });
      await cp(join(p.root, "git-before"), join(p.workspace, ".git"), { recursive: true });
      log("RESTORE_DISPOSABLE_GIT_BEFORE_IMAGE", true);
    }
    t = await tui(p, enabled ? [] : ["--no-extensions"]);
    if (enabled) {
      t.send("HARNESS_AGENT=main");
      await waitFor(() => t.text, text => text.includes("main complete"), 60000);
      log("SCENARIO_FINAL_REPLY", "main complete");
      const status = await tuiStatus(t, "ENABLED_FULL_OBSERVER_STATUS");
      assert.ok(status.epoch);
      const mark = t.text.length;
      t.send("/observer serve");
      const served = await waitFor(() => t.text.slice(mark), text => /observer serving: http:\/\/127\.0\.0\.1:\d+\//.test(text), 90000);
      log("OBSERVER_SERVING", /observer serving: (http:\/\/127\.0\.0\.1:\d+\/)/.exec(served)[1]);
    } else {
      await waitFor(() => t.text, text => text.includes("Harness scripted model"), 30000);
      log("OBSERVER_DISABLED", { flags: ["--no-extensions"], nativeTuiReady: true });
    }
    const beforeProcesses = await processList(t);
    log("PROCESS_LIST_BEFORE", { enabled, rows: beforeProcesses });
    assert.ok(beforeProcesses.every(row => !["orca", "orca-ide", "orca-cli-wrapper"].includes(row.comm)));
    const before = await git(p, ["status", "--porcelain"], p.workspace, true);
    assert.equal(before.stdout, "?? fixture.txt\n");
    const result = await run(["bash", skill, "test(gc3): check commit parity", "--no-push", "--whole-paths", "--", "fixture.txt"], p.workspace, gitEnv(p));
    const commit = await git(p, ["log", "-1", "--format=%H%n%T%n%s"], p.workspace, true);
    const show = await git(p, ["show", "--stat", "--format=fuller"], p.workspace, true);
    const status = await git(p, ["status", "--porcelain"], p.workspace, true);
    const remotes = await git(p, ["remote", "-v"], p.workspace, true);
    const count = await git(p, ["rev-list", "--count", "HEAD"], p.workspace, true);
    const afterProcesses = await processList(t);
    log("PROCESS_LIST_AFTER", { enabled, rows: afterProcesses });
    assert.ok(afterProcesses.every(row => !["orca", "orca-ide", "orca-cli-wrapper"].includes(row.comm)));
    assert.equal(result.code, 0);
    assert.equal(status.stdout, "");
    assert.equal(remotes.stdout, "");
    assert.equal(count.stdout, "1\n");
    log("COMMIT_MODE_RESULT", { enabled, commit: commit.stdout.trim().split("\n"), skillStdoutSha256: sha(result.stdout), skillStderrSha256: sha(result.stderr), showSha256: sha(show.stdout), cleanWorktree: true, remoteCount: 0, survivingCommits: 1 });
    results.push({ enabled, result, commit: commit.stdout, show: show.stdout });
    await t.stop();
    t = undefined;
  }
  assert.equal(results[0].result.stdout, results[1].result.stdout);
  assert.equal(results[0].result.stderr, results[1].result.stderr);
  assert.equal(results[0].commit, results[1].commit);
  assert.equal(results[0].show, results[1].show);
  log("V10_PARITY_RESULT", { result: "PASS", identicalNormalizedStdoutStderr: true, identicalCommitTreeSubject: true, identicalFullerShow: true, commit: results[0].commit.split("\n")[0], noPush: true, survivingCommits: 1 });
} catch (error) {
  log("V10_REVIEW_FAILURE", { result: "FAIL", message: error.message, stack: error.stack });
  process.exitCode = 1;
} finally {
  await t?.stop();
  if (p) await cleanup(p);
  const calls = await readFile(callLog, "utf8");
  log("CALL_LOG_INTERVAL_END", { bytes: Buffer.byteLength(calls), lines: calls.split("\n").filter(Boolean).length, sha256: sha(calls), profileRemoved: Boolean(p), coverage: "before profile creation through both stopped TUI modes, skill commits, and profile teardown" });
  if (calls !== "") {
    log("ORCA_CALL_FAILURE", calls.replace(/#code=[A-Za-z0-9_-]+/g, "#code=<redacted>"));
    process.exitCode = 1;
  }
}
```

#### cleanup-review.mjs — exact source

sha256 `2a83bab3e38a76afffc4b3239a2e77b018f64a233745f054702ac63fc7e24d7b`; 2880 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, rm, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const scratch = dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const before = await readFile(join(scratch, "before.md"));
const current = await readFile(join(process.env.GC3_REPO, "omp-orca-observer/checks/evidence/gc3.md"));
assert.equal(before.length, 883706);
assert.equal(sha(before), "63bd21059005e2c53a51a12c08ecd28ae6383b639db7d9d7573f92792eaa6494");
assert.ok(current.subarray(0, before.length).equals(before));
const added = current.subarray(before.length);
const text = added.toString();
const sourceBlocks = [...text.matchAll(/^#### (\S+) — exact source\n\nsha256 `([0-9a-f]{64})`; (\d+) bytes\.\n\n```javascript\n([\s\S]*?)\n```/gm)];
assert.equal(sourceBlocks.length, 12);
for (const [, name, hash, size, body] of sourceBlocks) {
  const bytes = await readFile(join(scratch, name));
  assert.equal(bytes.length, Number(size));
  assert.equal(sha(bytes), hash);
  assert.equal(body + "\n", bytes.toString());
}
const transcripts = [...text.matchAll(/^```text\n([\s\S]*?)\n```/gm)].map(match => match[1] + "\n");
const outputHashes = [];
for (const name of ["branch-review", "v10-review"]) {
  const stdout = await readFile(join(scratch, name + ".stdout"), "utf8");
  assert.ok(transcripts.includes(stdout), name + " accepted transcript differs from evidence");
  assert.equal(await readFile(join(scratch, name + ".stderr"), "utf8"), "");
  outputHashes.push({ driver: name, stdoutSha256: sha(stdout) });
}
let profilesRemoved = 0;
for (const name of ["branch-first", "branch-review", "v10-review"]) {
  const stdout = await readFile(join(scratch, name + ".stdout"), "utf8");
  const removals = [...stdout.matchAll(/^PROFILE_REMOVED (\{[^\n]+\})$/gm)].map(match => JSON.parse(match[1]));
  assert.equal(removals.length, 1);
  assert.equal(removals[0].absent, true);
  profilesRemoved += removals.length;
}
assert.equal(await readFile(join(scratch, "orca-calls.log"), "utf8"), "");
console.log("APPEND_ONLY_RECEIPT " + JSON.stringify({ baselineBytes: before.length, baselineSha256: sha(before), earlierBytesUnchanged: true, inspectedAddedBytes: added.length, inspectedAddedSha256: sha(added), exactEmbeddedScripts: sourceBlocks.length, outputHashes, profilesRemoved, orcaCallLogBytes: 0 }));
await rm(scratch, { recursive: true, force: true });
const absent = await stat(scratch).then(() => false, error => { assert.equal(error.code, "ENOENT"); return true; });
assert.equal(absent, true);
console.log("SCRATCH_REMOVED " + JSON.stringify({ root: "<tmp>/gc3", absent, includes: "all scripts, profiles' supporting fixtures, outputs, argv log, source archive, and before-image" }));
```

#### pack-receipts.mjs — exact source

sha256 `bc4f71a4175e58c749fb7237c8f53c3a7d82f38b7bb1f0b56a615564448b5752`; 3351 bytes.

```javascript
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const scratch = dirname(fileURLToPath(import.meta.url));
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const current = await readFile(join(scratch, "extract.mjs"), "utf8");
const initial = current.replace('const before = (await readFile(join(repo, "omp-orca-observer/checks/evidence/gc3.md"))).subarray(0, 883706);', 'const before = await readFile(join(repo, "omp-orca-observer/checks/evidence/gc3.md"));');
await writeFile(join(scratch, "extract-initial.mjs"), initial);
const tail = 'const v10 = extract("v10.mjs", "94dc8e3214f9b6545c330d56c3ef9d370594879e975c05d2f891c2768948e5cb", archive.toString());\nawait writeFile(join(scratch, "v10-original.mjs"), v10);\nconsole.log("RECOVERED " + JSON.stringify({ file: "v10-original.mjs", bytes: Buffer.byteLength(v10), sha256: hash(v10) }));\n';
const first = initial.slice(0, initial.indexOf('assert.equal(hash(archive),')) + tail;
assert.equal(Buffer.byteLength(first), 2794);
await writeFile(join(scratch, "extract-first.mjs"), first);
const files = ["extract-first.mjs", "extract-initial.mjs", "extract.mjs", "run.mjs", "compact-first.mjs", "compact.mjs", "branch-first.mjs", "branch-review.mjs", "setup-v10.mjs", "v10-review.mjs", "cleanup-review.mjs", "pack-receipts.mjs"];
let markdown = '### Exact-byte source receipts\n\nNew scratch scripts are embedded once below. Each fence includes the exact final newline in the hash. Save its body verbatim under `<tmp>/gc3`. Reproduce the first branch attempt by installing `branch-first.mjs` as `branch-review.mjs` and `compact-first.mjs` as `compact.mjs`; then restore the current blocks for the accepted runs. `extract-first.mjs` and `extract-initial.mjs` reconstruct the original two extractor generations; the current extractor uses the unchanged 883,706-byte prefix so it remains runnable after this appendix.\n\n';
markdown += 'Re-extracted, unchanged source receipts (already embedded in the earlier native-branch/continuation source sections):\n\n| File | Bytes | Exact-byte sha256 |\n|---|---:|---|\n';
for (const name of ["gate-lib.mjs", "pty-driver.py", "gc3-control.mjs", "gc3-branch-cmd.mjs", "continuation-lib.mjs"]) {
  const bytes = await readFile(join(scratch, name));
  markdown += `| ${name} | ${bytes.length} | \`${sha(bytes)}\` |\n`;
}
markdown += '\n`setup-v10.mjs` mechanically derives `logging-gate-lib.mjs` (sha256 `3dd51a2f019448b1f0e048425a73265fcb0c9d29ce2a30a1f864fd70509ad23f`) from the embedded canonical helper and writes the three logging-wrapper copies (sha256 `536cb684455e7b43d7d3aaf448e383120440676d3e93e341a1cfcab181fa9a0a`). No generated source depends on a machine-specific path.\n\n';
for (const name of files) {
  const bytes = await readFile(join(scratch, name));
  assert.ok(bytes.toString().endsWith("\n"));
  markdown += `#### ${name} — exact source\n\nsha256 \`${sha(bytes)}\`; ${bytes.length} bytes.\n\n\`\`\`javascript\n${bytes.toString()}\`\`\`\n\n`;
}
await writeFile(join(scratch, "source-receipts.md"), markdown);
console.log("SOURCE_RECEIPTS " + JSON.stringify({ scripts: files.length, bytes: Buffer.byteLength(markdown), sha256: sha(markdown) }));
```


### Scoped checks and cleanup

| Command | Tested state | Result | Limitation |
|---|---|---|---|
| `GC3_REPO="$PWD" bun <tmp>/gc3/extract.mjs` | Initial reconstructed `extract-first.mjs` bytes | new failure, exit 1: `AssertionError: v10.mjs heading absent` | Tooling-only: inner archive uses base64 records, not raw source fences; no criterion evaluated |
| Same extraction command | Corrected `extract-initial.mjs`, then current prefix-aware extractor | passed, exit 0 each | Original 883,706-byte before-image and every reused-source/archive hash matched; not a product run |
| `GC3_REPO="$PWD" bun <tmp>/gc3/run.mjs branch-review` | First driver / first output filter | new failure, exit 1 | Correct post-branch refusal of the out-of-scope old child; fresh-credential token path not reached; empty status arrays were a receipt-filter defect |
| Same branch command | Authorized native post-branch child / corrected output filter | passed, exit 0 | Actual native branch, old-auth 401, fresh grant/snapshot plus old token HTTP 200 and `reset:true`; old epoch and child both differ |
| `bun <tmp>/gc3/setup-v10.mjs` | Scratch logging setup | passed, exit 0 | Generates wrappers; never invokes them |
| Item 2's exact instrumented `run.mjs v10-review` command | Both observer modes, one disposable repository, full CLI-log interval | passed, exit 0 | Identical commit `960ef978982a9d56974b5a2f2d2df950fdf411a1`; zero log bytes/lines; not syscall-level auditing |
| `bun <tmp>/gc3/pack-receipts.mjs` | All new source generations | passed, exit 0 | Packed 12 exact-source blocks, 39,489 bytes, sha256 `827a66ab2499d34ca2fef66b94bb253f749af126fd40fd7d06d363f22d890aec`; source moved into this appendix with a guarded edit |
| `GC3_REPO="$PWD" bun <tmp>/gc3/cleanup-review.mjs` | Current append, recorded outputs/source bytes, teardown receipts, scratch | passed, exit 0 | Proved unchanged earlier prefix, 12 exact scripts, both accepted transcripts byte-identical, three profile removals, empty call log, then scratch absent |
| `bun omp-orca-observer/checks/commands.check.ts` | Existing component coverage at 263-272 | not run (source inspected only) | Required native reachability remains unverified; no mock/secret-surface substitution |
| Earlier v05/v09 scenarios; project-wide checks, formatting, linting; Orca commands | Outside this four-item evidence-review scope | not run (preserved evidence / boundary) | No new claim of execution |

Cleanup output:

```text
APPEND_ONLY_RECEIPT {"baselineBytes":883706,"baselineSha256":"63bd21059005e2c53a51a12c08ecd28ae6383b639db7d9d7573f92792eaa6494","earlierBytesUnchanged":true,"inspectedAddedBytes":60188,"inspectedAddedSha256":"2f8260d8ea7191b379cd6e8225c2699c5c7dfff7dcf5ff748e7f9fb0dcee108a","exactEmbeddedScripts":12,"outputHashes":[{"driver":"branch-review","stdoutSha256":"b9bc3b3d1b562509c9327f0d0491cd6b2fe0d2c0a448b072504d9564c9521d86"},{"driver":"v10-review","stdoutSha256":"b5435f0a6b28751d4a57a867845543c4b0affe9f4e4e46f958b230e4bc1250ee"}],"profilesRemoved":3,"orcaCallLogBytes":0}
SCRATCH_REMOVED {"root":"<tmp>/gc3","absent":true,"includes":"all scripts, profiles' supporting fixtures, outputs, argv log, source archive, and before-image"}
```

The three disposable profiles/workspaces were removed by the drivers' awaited teardown paths. The scratch directory, scripts, generated shims, argv log, transcripts, re-decoded archive and temporary before-image were then removed. Recovery remains possible from the unchanged first 883,706 bytes of this evidence file. The owned delta is its exact suffix after that offset; the cleanup receipt hashes the suffix before this final ledger/matrix was appended. No repository file other than this evidence was written. The scratch-only empty-file syntax warning from the guarded source-block move was reported as a tool issue; the appended sources and transcripts passed the independent byte checks.

Post-run `sha256sum` of the inspected product/harness files matched the earlier fixed-revision source fingerprint:

```text
f76ef841a29a8efe5a9c841fb0b8f33d08d317645341f680d529c7536de5245b  omp-orca-observer/contract.ts
5791cad225fd01a3ec8db5b7ea902cef3dc62eaf7e822dd83793ddbb8948abe9  omp-orca-observer/commands.ts
6894e7c73881939cfb93441e5b6d6facb0ef02f68015324d42f6ec7765a6fe20  omp-orca-observer/transport.ts
0310aa399458debbaf9daa5878ccfa91876f0341ce10881bd770e394e12734cb  omp-orca-observer/viewer/index.html
4d9b3ce0319f5b8efa8b2d3d1c3d6b07449b4c937ca35135577b16e2799d572b  omp-orca-observer/checks/harness/profile.ts
c121b1871cfe9a8ea94e980feb3ded0ad68543d20d9c272d57c0b3bd26ffbc6d  omp-orca-observer/checks/harness/stub-provider.ts
```

### final matrix (2026-10-01; newest result wins)

| Criterion | Result | Proving section |
|---|---|---|
| v05 `/new`: successor epoch, old code/credential rejection, old page-token reset | PASS (preserved) | Original “v05 — publisher replacement and restoration” |
| v05 omp restart / native resume: successor epoch; no historical completed outcome binding | PASS (preserved) | Original publisher replacement; continuation “v05 cold-restart then partial-restore inventory and old-token sequence” |
| v05 extension removal/reload via stock disable/enable plus process restart | PASS (preserved) | Original publisher replacement, resolved stock next-launch lifecycle |
| v05 actual native branch: new epoch; old code and credential rejected separately | PASS | This re-run §1: native `session_branch`, old code/snapshot/page-with-old-auth HTTP 401 |
| v05 branch: old page token presented with a fresh TUI-issued new-epoch credential | PASS | This re-run §1: native `after-branch` admitted/granted, snapshot HTTP 200, old token HTTP 200 `reset:true`; epoch and child both differ |
| v05 post-branch old child remains outside the successor root's scope | PASS | This re-run §1 first attempt: `observer: child ids not admitted: child-one`; no fresh grant issued in that attempt |
| v05 cold-restart inventory unknown, not complete, before every transcript has a ref | PASS (preserved) | Continuation cold/partial sequence: 12 unknown samples at 0/3; all three native refs before complete |
| v05 partial-restore inventory unknown, not complete, before every transcript has a ref | PASS (preserved) | Same sequence: 12 unknown samples at 0/135; unknown at 86/135; complete with all 135 refs |
| v05 cold/partial old credentials rejected before restoration; fresh post-restoration token reset | PASS (preserved) | Same sequence: pre-restoration HTTP 401; fresh TUI grant plus old token HTTP 200 `reset:true`; corrected epoch summaries in re-run §4 |
| v05 pre-restoration named grant refusal | UNVERIFIED natively; component coverage `checks/commands.check.ts:263-272` (non-admitted ids refused by name, no code issued) | This re-run §3; native TUI eager restoration / RPC mode refusal, existing component source inspected |
| v05 delayed prior-run outcome cannot claim completion while actual native ref runs | PASS (preserved) | Continuation “Accepted delayed prior-run result”: authenticated snapshot unknown/conflicting with independent running ref; real completed status after native end |
| v05 tombstoned child aborted or unavailable | PASS (preserved) | Original publisher replacement: genuine native tombstone, aborted registry row/outcome |
| v05 fresh recipient reconnect: same epoch, old unused credential expires after 60 s, native state unchanged | PASS (preserved) | Original “v05 — recipient reconnect”: two headless browsers, old credential 401 after 65,005 ms, identical native file digests |
| v05 Orca restart | DEFERRED | Slice assigns this lifetime to the Orca-assisted gate; no Orca command run here |
| Historical fork (not in this run's scope) | UNVERIFIED | Original publisher replacement; continuation scope explicitly excludes re-running fork |
| v09 worktree-shared lineage correct or explicitly unknown | PASS (preserved) | Original “v09 — workspace scenarios”: known shared cwd, explicit reasons for remaining fields |
| v09 worktree-isolated lineage correct or explicitly unknown | PASS (preserved) | Original workspace section: native isolated cwd distinct from parent; other fields unknown |
| v09 worktree-linked lineage correct or explicitly unknown | PASS (preserved) | Original “Additional workspace observations and accepted status-first run”: correct linked cwd |
| v09 worktree-deleted lineage explicitly unknown after deletion | PASS (preserved) | “re-run v09 worktree-deleted (2026-10-01)”: fixed `2f6d27b`, absent cwd, exact `unknown("cwd no longer exists")` |
| v09 detached-head lineage correct or explicitly unknown | PASS (preserved) | Original additional workspace observations: HTTP 200, branch explicitly unknown |
| v09 bridge creates no checkout or terminal in observed operations | PASS (preserved) | Original workspace before/after worktree/process comparisons plus deleted-worktree re-run |
| v09 manual SCM join documented step by step, without bridge-created checkout/terminal | PASS (preserved) | Original “Manual SCM join”: pinned v1.4.215 external-worktree Show → Source Control procedure; live execution not claimed |
| v10 bridge does not invoke Orca commit generation / CLI | PASS | This re-run §2: explicit logging CLI wrapper and both first-PATH names, zero log bytes/lines from profile setup through teardown; descendant samples contain no Orca process |
| v10 enabled/disabled skill-script commit parity, no push, one disposable repository | PASS | This re-run §2: identical commit `960ef978982a9d56974b5a2f2d2df950fdf411a1`, tree, subject, normalized output and full show; clean/no remote; one replayed commit survives before repository deletion |
| Two erroneous historical summary epoch ids corrected append-only | PASS | This re-run §4: original decoded output / already-recorded TUI status, earlier bytes unchanged |
| Append-only dated evidence, exact reproducible receipts and complete profile/scratch cleanup | PASS | This re-run “Exact-byte source receipts” and “Scoped checks and cleanup”: prefix unchanged, 12 scripts and both accepted transcripts exact, three profiles removed, scratch independently absent |

### unverified

- A pre-restoration **named** TUI grant-admission refusal remains UNVERIFIED natively: TUI restoration is eager; reachable RPC refuses on mode first. Existing component coverage is identified, not presented as native or newly executed test proof.
- Branch token acceptance is the approved old-epoch/other-child replay against a fresh, admitted child. Same-child epoch-only isolation is not claimed.
- Orca restart belongs to the assisted gate; no live Orca SCM join, commit-generation action or UI action is executed here. Historical fork remains outside this continuation's scope.
- Call logging covers the required explicit/default CLI entry points for the entire v10 interval; process samples are not a kernel/syscall audit of arbitrary hard-coded executable paths.
- Earlier `/new`, native resume, stock extension lifecycle, tombstone, recipient reconnect and workspace-shape observations are preserved, not re-executed in this four-item review. Restoration interleavings and delayed-run bus replay retain their earlier stated limits.
- There is no unresolved failure of an exercised in-scope criterion. The first branch prerequisite and initial extractor failures, plus the initial receipt-filter defect, remain recorded rather than discarded.

### amendment: v10 logging interval (2026-10-01)

Orchestrator review finding **GC3-R2** narrows the logging proof; no gate command is re-run. The logging environment was forwarded to the **two parity TUI launches** (`omp --profile one-child`, then `omp --profile one-child --no-extensions`) through `logging-gate-lib.mjs`, and to the **two skill-script commit runs** through that helper's `gitEnv`. The zero-byte/zero-line log proves no Orca CLI call during those instrumented parity runs.

The harness setup launches **`create()` → `omp plugin link`** and **`p.run(["--version"])` → `omp --version`** did **not** receive that logging environment and are **uninstrumented**. Their absence of Orca CLI calls is not proven here. A log collected from before setup until teardown does not establish instrumentation of every subprocess launched within that wall-clock interval.

This amendment supersedes the earlier “from profile setup through teardown” / “complete interval” coverage claims and the broader v10 no-CLI final-matrix interpretation. The observed empty log, enabled/disabled commit parity, no-push behavior and cleanup receipts remain unchanged. Earlier bytes are untouched; the amendment before-image is the first 955,354 bytes, sha256 `41ea40bea4e9c596655c57a74e4774734088b36bed893a7fbf5ff09b7907cab5`.

### final matrix amendment (2026-10-01; newest result wins)

| Criterion | Result | Proving section |
|---|---|---|
| v10 no orca cli call during the instrumented parity runs | PASS; setup launches (`plugin link`, `--version`) uninstrumented | “amendment: v10 logging interval (2026-10-01)”; instrumented parity log remained zero bytes/lines |

All other final-matrix rows above remain unchanged. This qualified row replaces, rather than adds to, the broader v10 no-CLI coverage claim.

### unverified (amendment)

- Orca CLI calls during setup `omp plugin link` and `omp --version` remain unverified: those launches were uninstrumented; no confirming re-run is performed.
- Previously listed native pre-restoration named refusal, same-child epoch-only isolation, assisted Orca restart/live SCM actions, historical fork and broader scheduling/syscall limitations remain unchanged.
