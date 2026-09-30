# gb3 — v08 reader fidelity on native files

- Dispatch: `gb3-reader-native`; input contract: slice `F017`, reader `0F6E`, contract `3018`; mode: gate execution, evidence-only.
- Exclusive write boundary: this evidence file. Recovery baseline: this file was absent (`read` returned `Path ... not found`); no product, check, or harness changes are authorized or made.
- Start: `2026-09-30T20:51:34Z`. Disposable profiles and the local stub provider only; no Orca commands, live credentials, or live sessions. Imported omp code ran in separately spawned Bun processes with the harness HOME/TMPDIR/XDG environment set before module loading.
- Relevant contracts: `schema-v1-frozen`, `reader-bounded-page`, `reader-admitted-file`. `ncm list` first reported the evidence path absent, then reported `ncm: 0 contracts apply to 1 paths` after creation. No contract declaration is changed.
- Runtime command: `bun --version`; verbatim output: `1.3.14`.
- Final criterion status: C1–C9 PASS; accepted residual OBSERVED. Two print-mode fixture-production failures and two shell-lease nonexecutions are retained below; the separate RPC runs supplied the required native-file coverage without any product or harness change.

## Native production / version baseline

Exploratory invocation (paths normalized): `bun <tmp>/gb3-discover.ts "$PWD"`, launched with cwd `<tmp>` and the checkout supplied as the second argument. Each omp command was spawned by `create("one-child")` with the harness's disposable environment.

```text
COMMAND omp --profile one-child --version
VERSION 0 omp/18.4.4

COMMAND omp --profile one-child --mode json -p "HARNESS_AGENT=main"
EXIT 0
STDERR
NATIVE <profile>/home/.omp/profiles/one-child/agent/sessions/<workspace-key>/<root-session>/child-one.jsonl 15079 {"type":"title","v":1,"title":"","updatedAt":"2026-09-30T20:53:40.247Z"
```

The first invocation, `bun <tmp>/gb3-discover.ts .` with cwd `$PWD`, did not execute because the shell tool returned the following infrastructure failure (not a reader criterion failure):

```text
worktree mutation busy after 5.0s
agent: Gb2Gate
session: 01a0f415-c390-70e9-9394-5126f80a1e08
request: 70bd2c0d-38f6-4b57-a0cf-214ec414a258
tool name: bash
target: unknown
pid: 1830272
age: 12.9s
heartbeat age: 0.7s ago
fence: 1522
relation: sibling
```

Only the version, exit, and native-file production are accepted from this exploration; its JSON streaming transcript is not reader proof. The disposable profile was removed by `finally`.

### Source: `gb3-discover.ts`

```ts
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
const repo = resolve(process.argv[2] ?? ".");
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create("one-child");
const normalize = (s: string) => s.replaceAll(profile.root, "<profile>").replaceAll(repo, "$PWD");
try {
  console.log("COMMAND omp --profile one-child --version");
  const version = await profile.run(["--version"]);
  console.log("VERSION", version.exitCode, normalize(version.stdout), normalize(version.stderr));
  console.log('COMMAND omp --profile one-child --mode json -p "HARNESS_AGENT=main"');
  const result = await profile.run(["--mode", "json", "-p", "HARNESS_AGENT=main"]);
  console.log("EXIT", result.exitCode);
  console.log("STDOUT", normalize(result.stdout));
  console.log("STDERR", normalize(result.stderr));
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith(".jsonl") && file !== profile.capture) {
        const bytes = await readFile(file);
        console.log("NATIVE", normalize(file), bytes.length, normalize(bytes.toString("utf8").slice(0, 900)));
      }
    }
  }
  await walk(profile.home);
} finally { await profile.teardown(); }
```

## C2 — completed native file: PASS (one-child)

Exact normalized invocation: `bun <tmp>/gb3-driver.ts "$PWD" one-child native` (cwd `<tmp>`, checkout argument `$PWD`). `readPage` used the actual child id `child-one`, fixed epoch `gb3-v08-fixed-epoch`, and the dev dependency's `parseSessionContent`. Delivered bytes were independently compared with the complete native file.

Complete normalized driver output:

```text
COMMAND omp --profile one-child --mode json -p "HARNESS_AGENT=main"
COMMAND bun --preload $PWD/omp-orca-observer/checks/harness/fs-probe.ts <tmp>/gb3-reader.ts $PWD <profile>/tmp/manifest.json native
READ {"label":"child-one-0","childId":"child-one","size":15078,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15078],"malformed":0,"reads":[{"offset":0,"length":15078}]}
NATIVE_COVERAGE {"files":1,"pages":1,"bytes":15078,"exactBytes":true,"contiguous":true,"overlappingDeliveredBytes":0}
PASS C2-completed-native-continuation
CALL_LOG {"lines":1,"sha256":"525a1c23d6c5c67480124aea10fbb3e04d6ea7f3358f59f16352a1a34bcb2fe2"}
PROBE_LOG {"lines":1,"sha256":"b2f8a4819687fb76bd1232a52c55fb6f4c5d9f1daf9f77330d6e320b7d4143d4"}
BOUNDS {"boundedCalls":1,"remainingWindowCalls":0,"pageMaxBytes":262144}
RESULT {"phase":"native","failures":[]}
READER_EXIT 0
NATIVE_RUN {"scenario":"one-child","exitCode":0,"childFiles":1,"terminalResults":1,"failed":0}
NATIVE_STDERR ""
PROFILE_REMOVED one-child
```

C1's basic read budget is also satisfied on this call; its multi-page-window proof is recorded separately. C2's growing-file proof is not supplied by this completed-file run.

## Native production limitation — many-135 first attempt: FAIL (setup, not reader)

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" many-135 native` (cwd `<tmp>`). The print-mode parent exited before the script's 135-native-file requirement was met. No reader call ran in this attempt, and no product or harness setting was changed.

Complete normalized output:

```text
COMMAND omp --profile many-135 --mode json -p "HARNESS_AGENT=main"
DRIVER_FAIL AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

16 !== 135

PROFILE_REMOVED many-135
```

Exit: `1`. This is retained as a production/setup failure, not silently counted as 135-file evidence.

## C1 — bounded reads / page window: PASS

Command for C1 and C3–C9/residual below: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges` (cwd `<tmp>`). The driver created an official native `one-child` session and then copied it under the disposable profile's temporary directory for controlled mutations and appended native-message-shaped records. The child id remained `child-one`. Apart from explicit token-mismatch cases, every request used the fixed epoch `gb3-v08-fixed-epoch`.

The wrapper asserted every call's physical read count, each read's bound, exact last-delivered-record revalidation range, and exact bounded payload range. These four delivered ranges cover the 977542-byte file exactly once. The first two calls have more than two page windows remaining and stop their payloads at their own 262144-byte windows:

```text
COMMAND omp --profile one-child --mode json -p "HARNESS_AGENT=main"
COMMAND bun --preload $PWD/omp-orca-observer/checks/harness/fs-probe.ts <tmp>/gb3-reader.ts $PWD <profile>/tmp/manifest.json edges
READ {"label":"window-0","childId":"child-one","size":977542,"kind":"page","reset":false,"atEnd":false,"delivered":[0,255695],"malformed":0,"reads":[{"offset":0,"length":262144}]}
READ {"label":"window-1","childId":"child-one","size":977542,"kind":"page","reset":false,"atEnd":false,"delivered":[255695,496310],"malformed":0,"reads":[{"offset":175490,"length":80205},{"offset":255695,"length":262144}]}
READ {"label":"window-2","childId":"child-one","size":977542,"kind":"page","reset":false,"atEnd":false,"delivered":[496310,736925],"malformed":0,"reads":[{"offset":416105,"length":80205},{"offset":496310,"length":262144}]}
READ {"label":"window-3","childId":"child-one","size":977542,"kind":"page","reset":false,"atEnd":true,"delivered":[736925,977542],"malformed":0,"reads":[{"offset":656720,"length":80205},{"offset":736925,"length":240617}]}
WINDOW_COVERAGE {"cursor":977542,"pages":4,"revalidationOnlyLastRecord":true,"payloadWithinWindow":true,"deliveredContiguous":true,"physicalTailRereadsAllowed":true}
PASS C1-window-and-physical-overlap
```

Physical payload overlap is only the incomplete trailing record re-read; the separate revalidation read is exactly the last delivered record. The independently concatenated delivered bytes equaled the full temporary native copy.

## C3 — held-read cancellation / closed handle: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
HELD_READ {"offset":0,"length":15080}
READ {"label":"cancel-held","childId":"child-one","size":15080,"kind":"unavailable","reason":"cancelled","reads":[{"offset":0,"length":15080}]}
CANCELLATION {"result":{"kind":"unavailable","reason":"cancelled"},"handleClosed":true,"closedHandles":1,"fdNoLongerPresent":true}
PASS C3-cancelled-handle-closed
```

The abort occurred while the preload probe held the read. The script then released the held read and awaited the result. A throwaway close wrapper called the original `FileHandle.close`, observed exactly one close for the target, and asserted that its captured fd no longer existed under `/proc/self/fd`.

## C4 — deleted file / shrink below cursor: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"deleted","childId":"child-one","size":null,"kind":"unavailable","reason":"missing","reads":[]}
READ {"label":"shrink-before","childId":"child-one","size":15080,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"shrink-below-cursor","childId":"child-one","size":14873,"kind":"page","reset":true,"atEnd":true,"delivered":[0,14873],"malformed":0,"reads":[{"offset":0,"length":14873}]}
SHRINK {"oldCursor":15080,"newSize":14873,"reset":true}
PASS C4-missing-and-shrink
```

## C5 — replacement / size reduction / last delivered rewrite: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"inode-before","childId":"child-one","size":15080,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"inode-replaced","childId":"child-one","size":15080,"kind":"page","reset":true,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"size-before","childId":"child-one","size":15290,"kind":"page","reset":false,"atEnd":false,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"size-shrank-to-cursor","childId":"child-one","size":15080,"kind":"page","reset":true,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"last-before","childId":"child-one","size":15080,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"last-rewritten","childId":"child-one","size":15080,"kind":"page","reset":true,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":14873,"length":207},{"offset":0,"length":15080}]}
MUTATIONS {"newInodeReset":true,"shrinkToCursorReset":true,"lastDeliveredRewriteReset":true,"lastRange":[14873,15080]}
PASS C5-inode-size-last-record
```

The script independently asserted a changed inode for replacement, a reduction from the token's observed size even when the new size equals its cursor, and unchanged inode/size for the last-record rewrite.

## C6 — another child / epoch token: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"identity-before","childId":"child-one","size":15080,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"wrong-child","childId":"child-one-other","size":15080,"kind":"page","reset":true,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"wrong-epoch","childId":"child-one","size":15080,"kind":"page","reset":true,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
IDENTITY {"childIdReset":true,"epochReset":true}
PASS C6-child-and-epoch
```

## C7 — oversized bounded scanning / resume: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"oversized-prefix","childId":"child-one","size":801961,"kind":"page","reset":false,"atEnd":false,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":262144}]}
READ {"label":"oversized-step-0","childId":"child-one","size":801961,"kind":"record_too_large","reset":false,"start":15080,"end":null,"scannedTo":277224,"reads":[{"offset":14873,"length":207},{"offset":15080,"length":262144}]}
READ {"label":"oversized-step-1","childId":"child-one","size":801961,"kind":"record_too_large","reset":false,"start":15080,"end":null,"scannedTo":539368,"reads":[{"offset":14873,"length":207},{"offset":277224,"length":262144}]}
READ {"label":"oversized-step-2","childId":"child-one","size":801961,"kind":"record_too_large","reset":false,"start":15080,"end":null,"scannedTo":801512,"reads":[{"offset":14873,"length":207},{"offset":539368,"length":262144}]}
READ {"label":"oversized-step-3","childId":"child-one","size":801961,"kind":"record_too_large","reset":false,"start":15080,"end":801735,"scannedTo":801961,"reads":[{"offset":14873,"length":207},{"offset":801512,"length":449}]}
READ {"label":"oversized-resume","childId":"child-one","size":801961,"kind":"page","reset":false,"atEnd":true,"delivered":[801735,801961],"malformed":0,"reads":[{"offset":14873,"length":207},{"offset":801735,"length":226}]}
OVERSIZED {"steps":4,"start":15080,"end":801735,"fullExtent":786655,"resumedRange":[801735,801961],"resumedExact":true}
PASS C7-oversized-bounded-full-extent
```

The entire 786655-byte record extent was reported after four bounded steps; the following record's bytes were delivered exactly.

## C8 — split multibyte / incomplete trailing / malformed: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"partial-utf8-before","childId":"child-one","size":15240,"kind":"page","reset":false,"atEnd":false,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15240}]}
READ {"label":"partial-utf8-wait","childId":"child-one","size":15240,"kind":"page","reset":false,"atEnd":false,"delivered":[15080,15080],"malformed":0,"reads":[{"offset":14873,"length":207},{"offset":15080,"length":160}]}
READ {"label":"partial-no-newline","childId":"child-one","size":15301,"kind":"page","reset":false,"atEnd":false,"delivered":[15080,15080],"malformed":0,"reads":[{"offset":14873,"length":207},{"offset":15080,"length":221}]}
READ {"label":"partial-completed","childId":"child-one","size":15302,"kind":"page","reset":false,"atEnd":true,"delivered":[15080,15302],"malformed":0,"reads":[{"offset":14873,"length":207},{"offset":15080,"length":222}]}
READ {"label":"malformed-count","childId":"child-one","size":15332,"kind":"page","reset":false,"atEnd":true,"delivered":[15302,15332],"malformed":2,"reads":[{"offset":15080,"length":222},{"offset":15302,"length":30}]}
PARTIAL {"waitedAt":15080,"multibyteExact":true,"waitedWithoutNewline":true,"completedRange":[15080,15302],"malformed":2}
PASS C8-multibyte-partial-malformed
```

A UTF-8 globe was split after its first two bytes; completing UTF-8 without its newline still delivered nothing. Only the final newline advanced the cursor and produced the original globe entry. Two malformed completed records yielded the dev parser's count of two.

## C9 — entries and bytes describe identical range: PASS

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"mode-bytes-0","childId":"child-one","size":436522,"kind":"page","reset":false,"atEnd":false,"delivered":[0,255904],"malformed":0,"reads":[{"offset":0,"length":262144}]}
READ {"label":"mode-entries-0","childId":"child-one","size":436522,"kind":"page","reset":false,"atEnd":false,"delivered":[0,255904],"malformed":0,"reads":[{"offset":0,"length":262144}]}
READ {"label":"mode-bytes-1","childId":"child-one","size":436522,"kind":"page","reset":false,"atEnd":true,"delivered":[255904,436522],"malformed":0,"reads":[{"offset":195698,"length":60206},{"offset":255904,"length":180618}]}
READ {"label":"mode-entries-1","childId":"child-one","size":436522,"kind":"page","reset":false,"atEnd":true,"delivered":[255904,436522],"malformed":0,"reads":[{"offset":195698,"length":60206},{"offset":255904,"length":180618}]}
MODE_EQUIVALENCE {"pairs":2,"sameRanges":true,"parserEntriesEqual":true,"malformedCountsEqual":true}
PASS C9-entries-bytes-range
```

Both pairs used the same input token. Output token fields, malformed counts, reset/end state, and the dev parser's entries from the exact bytes were equal.

## Accepted residual — earlier delivered rewrite: OBSERVED, NOT FAILED

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" one-child edges`.

```text
READ {"label":"residual-before","childId":"child-one","size":15080,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
READ {"label":"residual-undetected","childId":"child-one","size":15080,"kind":"page","reset":false,"atEnd":true,"delivered":[15080,15080],"malformed":0,"reads":[{"offset":14873,"length":207},{"offset":15080,"length":0}]}
READ {"label":"residual-after-reset","childId":"child-one","size":15080,"kind":"page","reset":true,"atEnd":true,"delivered":[0,15080],"malformed":0,"reads":[{"offset":0,"length":15080}]}
ACCEPTED_RESIDUAL {"changedByte":12907,"lastRange":[14873,15080],"sameInode":true,"sameSize":true,"detectedByContinuation":false,"refreshedAfterReset":true}
PASS RESIDUAL-earlier-delivered-rewrite
CALL_LOG {"lines":35,"sha256":"e92d03d88e6927f08814360380111bb19f2277cae451c547b78e986fd34db451"}
PROBE_LOG {"lines":50,"sha256":"28c61a9b5c8f37d331f7fe21a65752ee5df8f1dad7538f7b2298716659b16dce"}
BOUNDS {"boundedCalls":33,"remainingWindowCalls":5,"pageMaxBytes":262144}
RESULT {"phase":"edges","failures":[]}
READER_EXIT 0
NATIVE_RUN {"scenario":"one-child","exitCode":0,"childFiles":1,"terminalResults":1,"failed":0}
NATIVE_STDERR ""
PROFILE_REMOVED one-child
```

Byte 12907 was in an earlier delivered user-message record, before the protected last record `[14873,15080)`. The same-inode, same-size rewrite did not reset continuation. An explicit epoch mismatch reset re-read and returned the modified file; no claim is made that the reader automatically detects earlier-record rewrites.

All normalized output from the accepted edges run is reproduced across the criterion blocks above. The preload's 50-line raw probe log is represented by the observed normalized SHA-256 and every criterion's verbatim read ranges.

## Native production limitation — slow-appending first attempt: FAIL (setup, not reader)

Exact normalized command: `bun <tmp>/gb3-driver.ts "$PWD" slow-appending slow` (cwd `<tmp>`).

```text
COMMAND omp --profile slow-appending --mode json -p "HARNESS_AGENT=main"
DRIVER_FAIL AssertionError [ERR_ASSERTION]: no native child session file appeared
PROFILE_REMOVED slow-appending
```

Exit: `1`. No reader call ran. This retains the print-mode setup failure. A distinct disposable RPC-mode invocation keeps the official parent process alive while its asynchronous children run; this changes only the throwaway invocation, not product/harness code or settings.

## Runnable sources / invocation contract

`$PWD` denotes the checkout, `<tmp>` the throwaway-source directory, and `<profile>` the harness-created disposable root. Source files belong together in `<tmp>`. Invoke a driver with the checkout as its first argument (absolute path supplied at runtime); its separately spawned preloaded reader receives only the disposable HOME/TMPDIR/XDG environment shown below. No in-process environment mutation occurs.

### Source: `gb3-driver.ts` (print-mode attempts, including accepted one-child runs)

```ts
import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, basename, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Subprocess } from "bun";

const repo = resolve(process.argv[2]);
const scenario = process.argv[3];
const phase = process.argv[4] ?? "native";
// The checkout is supplied at runtime; the throwaway source lives outside it.
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create(scenario);
const readerScript = join(import.meta.dir, "gb3-reader.ts");
const env: Record<string, string> = {};
for (const key of ["PATH", "TERM", "LANG"]) {
  if (process.env[key]) env[key] = process.env[key]!;
}
Object.assign(env, {
  HOME: profile.home,
  TMPDIR: join(profile.root, "tmp"),
  XDG_CONFIG_HOME: join(profile.root, "config"),
  XDG_CACHE_HOME: join(profile.root, "cache"),
  XDG_DATA_HOME: join(profile.root, "data"),
  XDG_STATE_HOME: join(profile.root, "state"),
  FS_PROBE_LOG: join(profile.root, "tmp", "probe.jsonl"),
});
const normalize = (s: string) => s.replaceAll(profile.root, "<profile>")
  .replaceAll(basename(profile.root), "<profile-key>").replaceAll(repo, "$PWD");
async function children(): Promise<{ childId: string; file: string }[]> {
  const found: { childId: string; file: string }[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith(".jsonl")) {
        const text = await readFile(file, "utf8");
        const header = text.split("\n").slice(0, 3).map(line => {
          try { return JSON.parse(line); } catch { return null; }
        }).find(row => row?.type === "session");
        if (header?.parentSession) found.push({ childId: entry.name.slice(0, -6), file });
      }
    }
  }
  await walk(profile.home);
  return found.sort((a, b) => a.childId.localeCompare(b.childId));
}
let reader: Subprocess<"ignore", "pipe", "pipe"> | undefined;
let omp: { kill(): void; exited: Promise<number> } | undefined;
try {
  console.log(`COMMAND omp --profile ${scenario} --mode json -p "HARNESS_AGENT=main"`);
  const native = profile.spawn(["--mode", "json", "-p", "HARNESS_AGENT=main"]);
  omp = native;
  native.stdin.end();
  const stdout = new Response(native.stdout).text();
  const stderr = new Response(native.stderr).text();
  const doneFile = join(profile.root, "tmp", "native-done");
  const completed = native.exited.then(async (exitCode: number) => {
    await writeFile(doneFile, String(exitCode));
    return exitCode;
  });
  if (phase !== "slow") assert.equal(await completed, 0, "native omp failed");
  let files = await children();
  const deadline = Date.now() + 20_000;
  while (files.length === 0 && Date.now() < deadline) {
    await Bun.sleep(25);
    files = await children();
  }
  assert.ok(files.length > 0, "no native child session file appeared");
  if (scenario === "many-135") assert.equal(files.length, 135);
  if (scenario === "one-child") assert.equal(files[0].childId, "child-one");
  if (scenario === "slow-appending") assert.equal(files[0].childId, "slow-child");
  const manifest = join(profile.root, "tmp", "manifest.json");
  await writeFile(manifest, JSON.stringify({ root: profile.root, files, doneFile, phase }));
  console.log(`COMMAND bun --preload $PWD/omp-orca-observer/checks/harness/fs-probe.ts <tmp>/gb3-reader.ts $PWD <profile>/tmp/manifest.json ${phase}`);
  reader = Bun.spawn(["bun", "--preload", join(repo, "omp-orca-observer/checks/harness/fs-probe.ts"),
    readerScript, repo, manifest, phase], { cwd: profile.workspace, env, stdin: "ignore", stdout: "pipe", stderr: "pipe" });
  const [readerOut, readerErr, readerExit] = await Promise.all([
    new Response(reader.stdout).text(), new Response(reader.stderr).text(), reader.exited,
  ]);
  console.log(normalize(readerOut).trimEnd());
  if (readerErr) console.log("READER_STDERR", normalize(readerErr).trimEnd());
  console.log("READER_EXIT", readerExit);
  const [nativeOut, nativeErr, nativeExit] = await Promise.all([stdout, stderr, completed]);
  const terminal = nativeOut.split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(row => row?.type === "tool_execution_end" && row.toolName === "task")
    .flatMap(row => row.result?.details?.results ?? []).map(row => ({ childId: row.id, exitCode: row.exitCode, aborted: row.aborted }));
  console.log("NATIVE_RUN", JSON.stringify({
    scenario, exitCode: nativeExit, childFiles: files.length,
    terminalResults: terminal.length, failed: terminal.filter(row => row.exitCode !== 0 || row.aborted).length
  }));
  console.log("NATIVE_STDERR", JSON.stringify(normalize(nativeErr)));
  if (readerExit !== 0) process.exitCode = readerExit;
} catch (error) {
  console.error("DRIVER_FAIL", normalize(String(error)));
  process.exitCode = 1;
} finally {
  reader?.kill();
  omp?.kill();
  await profile.teardown();
  console.log("PROFILE_REMOVED", scenario);
}
```

### Source: `gb3-reader.ts` (all reader scenarios)

```ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { access, appendFile, copyFile, open, readFile, rename, rm, stat, truncate, writeFile } from "node:fs/promises";
import { readlinkSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repo = resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(process.argv[3], "utf8"));
const phase = process.argv[4];
// The checkout and dev dependency are runtime-selected by the disposable launcher.
const { readPage } = await import(pathToFileURL(join(repo, "omp-orca-observer/reader.ts")).href);
const { PAGE_MAX_BYTES } = await import(pathToFileURL(join(repo, "omp-orca-observer/contract.ts")).href);
const { parseSessionContent } = await import(pathToFileURL(Bun.resolveSync("@oh-my-pi/pi-coding-agent", join(repo, "omp-orca-observer"))).href);
const probe = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/fs-probe.ts")).href);
const epoch = "gb3-v08-fixed-epoch";
const first = manifest.files[0];
const failures: string[] = [];
const callLog: string[] = [];
let boundedCalls = 0;
let remainingWindowCalls = 0;
const normalize = (s: string) => s.replaceAll(manifest.root, "<profile>")
  .replaceAll(basename(manifest.root), "<profile-key>").replaceAll(repo, "$PWD");
const decode = (token: string) => JSON.parse(Buffer.from(token, "base64url").toString("utf8"));

async function call(label: string, file: { childId: string; file: string }, token: string | null,
  mode = "bytes", maxBytes = PAGE_MAX_BYTES, signal = new AbortController().signal,
  requestChild = file.childId, requestEpoch = epoch) {
  const old = token ? decode(token) : null;
  const before = probe.reads.length;
  const info = await stat(file.file).catch(() => null);
  const result = await readPage({
    childId: requestChild, sessionFile: file.file, epoch: requestEpoch,
    token, mode, maxBytes, signal
  }, parseSessionContent);
  const reads = probe.reads.slice(before).filter((r: { path: string }) => r.path === file.file);
  assert.ok(reads.length <= 2, `${label}: ${reads.length} physical reads`);
  assert.ok(reads.every((r: { offset: number; length: number }) => r.offset >= 0 && r.length >= 0 && r.length <= PAGE_MAX_BYTES), `${label}: unbounded read`);
  if (result.kind !== "unavailable") {
    assert.ok(info, `${label}: missing stat for available page`);
    const validOld = old && info && old.childId === requestChild && old.epoch === requestEpoch &&
      old.sessionFile === file.file && old.inode === String(info.ino) && info.size >= old.size && info.size >= old.cursor;
    const last = validOld ? old.lastRecord : null;
    assert.equal(reads.length, last ? 2 : 1, `${label}: read count`);
    if (last) assert.deepEqual({ offset: reads[0].offset, length: reads[0].length }, { offset: last.start, length: last.end - last.start });
    const payload = reads.at(-1);
    const start = result.reset ? 0 : old?.cursor ?? 0;
    const limit = Math.min(Math.max(0, Math.floor(maxBytes)), PAGE_MAX_BYTES);
    assert.deepEqual({ offset: payload.offset, length: payload.length }, { offset: start, length: Math.min(limit, info.size - start) });
    if (info.size - start > limit * 2) {
      assert.ok(payload.offset + payload.length <= start + limit, `${label}: read past page window`);
      remainingWindowCalls++;
    }
    boundedCalls++;
  }
  const next = result.kind === "unavailable" ? null : decode(result.token);
  const start = result.kind === "unavailable" ? null : result.reset ? 0 : old?.cursor ?? 0;
  if (result.kind === "page" && mode === "bytes") {
    assert.equal(Buffer.from(result.bytesBase64, "base64").length, next.cursor - start, `${label}: delivered byte range`);
  }
  const line = JSON.stringify({
    label, childId: requestChild, size: info?.size ?? null,
    kind: result.kind, reason: result.reason, reset: result.reset, atEnd: result.atEnd,
    delivered: result.kind === "page" ? [start, next.cursor] : undefined,
    start: result.start, end: result.end, scannedTo: result.scannedTo, malformed: result.malformed,
    reads: reads.map((r: { offset: number; length: number }) => ({ offset: r.offset, length: r.length }))
  });
  callLog.push(line);
  if (phase !== "native" || callLog.length <= 3) console.log("READ", line);
  return result;
}
async function check(id: string, body: () => Promise<void>) {
  try { await body(); console.log("PASS", id); }
  catch (error) { failures.push(id); console.log("FAIL", id, normalize(String(error))); }
}
async function copy(name: string) {
  const file = join(manifest.root, "tmp", `${name}.jsonl`);
  await copyFile(first.file, file);
  return { childId: first.childId, file };
}
const original = await readFile(first.file);
const template = original.toString("utf8").split("\n").filter(Boolean).map(line => JSON.parse(line))
  .find(row => row.type === "message" && row.message?.role === "user");
assert.ok(template, "native child has no user message template");
let extraId = 0;
function record(text: string) {
  return Buffer.from(JSON.stringify({
    ...template, id: `gb3-${extraId++}`, message: {
      ...template.message, content: [{ type: "text", text }],
    }
  }) + "\n");
}
async function pageAll(file: { childId: string; file: string }, label: string, maxBytes = PAGE_MAX_BYTES) {
  let token: string | null = null;
  let cursor = 0;
  const delivered: Buffer[] = [];
  for (let step = 0; step < 1000; step++) {
    const result = await call(`${label}-${step}`, file, token, "bytes", maxBytes);
    assert.equal(result.kind, "page", `${label}: unexpected ${result.kind}`);
    assert.equal(result.reset, false, `${label}: unintended reset`);
    const next = decode(result.token);
    const bytes = Buffer.from(result.bytesBase64, "base64");
    assert.equal(cursor + bytes.length, next.cursor, `${label}: gap/overlap`);
    delivered.push(bytes);
    cursor = next.cursor;
    token = result.token;
    if (result.atEnd) {
      assert.deepEqual(Buffer.concat(delivered), await readFile(file.file), `${label}: not exactly the native file`);
      return { token, cursor, pages: step + 1 };
    }
    assert.ok(bytes.length > 0, `${label}: no completed record at this window`);
  }
  assert.fail(`${label}: did not reach EOF`);
}

if (phase === "native") {
  await check("C2-completed-native-continuation", async () => {
    let pages = 0;
    let bytes = 0;
    for (const file of manifest.files) {
      const result = await pageAll(file, file.childId);
      pages += result.pages;
      bytes += result.cursor;
    }
    console.log("NATIVE_COVERAGE", JSON.stringify({ files: manifest.files.length, pages, bytes, exactBytes: true, contiguous: true, overlappingDeliveredBytes: 0 }));
  });
} else if (phase === "slow") {
  await check("C2-growing-native-continuation", async () => {
    let token: string | null = null;
    let cursor = 0;
    let done = false;
    const chunks: Buffer[] = [];
    const growth: number[] = [];
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      done = await access(manifest.doneFile).then(() => true, () => false);
      const result = await call(`slow-${growth.length}`, first, token);
      assert.equal(result.kind, "page");
      assert.equal(result.reset, false);
      const next = decode(result.token);
      const bytes = Buffer.from(result.bytesBase64, "base64");
      assert.equal(cursor + bytes.length, next.cursor);
      if (bytes.length) {
        chunks.push(bytes);
        growth.push(next.cursor);
        console.log("GROWTH", JSON.stringify({ cursor: next.cursor, producerExited: done, deliveredBytes: bytes.length }));
      }
      cursor = next.cursor;
      token = result.token;
      if (done && result.atEnd) break;
      await Bun.sleep(150);
    }
    assert.equal(done, true, "producer did not exit within observation window");
    assert.ok(growth.length >= 3, "not enough native append transitions");
    assert.ok(growth.every((end, index) => index === 0 || end > growth[index - 1]));
    assert.deepEqual(Buffer.concat(chunks), await readFile(first.file));
    console.log("GROWING_COVERAGE", JSON.stringify({ growth, exactBytes: true, contiguous: true, overlappingDeliveredBytes: 0 }));
  });
} else if (phase === "edges") {
  await check("C1-window-and-physical-overlap", async () => {
    const file = await copy("many-pages-native-copy");
    const lines = Array.from({ length: 12 }, () => record("W".repeat(80_000)));
    await appendFile(file.file, Buffer.concat(lines));
    const result = await pageAll(file, "window");
    assert.ok(result.pages >= 4);
    assert.ok(remainingWindowCalls >= 2);
    console.log("WINDOW_COVERAGE", JSON.stringify({
      ...result, token: undefined, revalidationOnlyLastRecord: true,
      payloadWithinWindow: true, deliveredContiguous: true, physicalTailRereadsAllowed: true
    }));
  });
  await check("C3-cancelled-handle-closed", async () => {
    const file = await copy("cancel");
    const sentinel = await open(join(manifest.root, "tmp", "close-probe"), "w+");
    const prototype = Object.getPrototypeOf(sentinel);
    const close = prototype.close;
    const closed: { path: string; fd: number }[] = [];
    prototype.close = async function() {
      const fd = this.fd;
      let path: string;
      try { path = readlinkSync(`/proc/self/fd/${fd}`); } catch { path = "<already-closed>"; }
      const result = await close.call(this);
      if (path === file.file) {
        assert.throws(() => readlinkSync(`/proc/self/fd/${fd}`));
        closed.push({ path, fd });
      }
      return result;
    };
    await sentinel.close();
    const controller = new AbortController();
    probe.holdNextRead(file.file);
    const pending = call("cancel-held", file, null, "bytes", PAGE_MAX_BYTES, controller.signal);
    const held = await probe.waitForHeldRead();
    console.log("HELD_READ", JSON.stringify({ offset: held.offset, length: held.length }));
    controller.abort();
    probe.releaseHeldRead();
    try {
      const result = await pending;
      assert.deepEqual(result, { kind: "unavailable", reason: "cancelled" });
      assert.equal(closed.length, 1);
      console.log("CANCELLATION", JSON.stringify({ result, handleClosed: true, closedHandles: closed.length, fdNoLongerPresent: true }));
    } finally { prototype.close = close; }
  });
  await check("C4-missing-and-shrink", async () => {
    const missing = await copy("missing");
    await rm(missing.file);
    assert.deepEqual(await call("deleted", missing, null), { kind: "unavailable", reason: "missing" });
    const shrinking = await copy("shrinking");
    const old = await call("shrink-before", shrinking, null);
    const last = decode(old.token).lastRecord;
    await truncate(shrinking.file, last.start);
    const result = await call("shrink-below-cursor", shrinking, old.token);
    assert.equal(result.kind, "page");
    assert.equal(result.reset, true);
    assert.ok(decode(old.token).cursor > (await stat(shrinking.file)).size);
    console.log("SHRINK", JSON.stringify({ oldCursor: decode(old.token).cursor, newSize: (await stat(shrinking.file)).size, reset: result.reset }));
  });
  await check("C5-inode-size-last-record", async () => {
    const replacing = await copy("replacing");
    const old = await call("inode-before", replacing, null);
    const oldInode = (await stat(replacing.file)).ino;
    const newFile = `${replacing.file}.new`;
    await writeFile(newFile, original);
    await rename(newFile, replacing.file);
    assert.notEqual((await stat(replacing.file)).ino, oldInode);
    assert.equal((await call("inode-replaced", replacing, old.token)).reset, true);
    const sizeFile = await copy("size-only");
    await appendFile(sizeFile.file, record("tail"));
    const sizeOld = await call("size-before", sizeFile, null, "bytes", original.length);
    const sizeToken = decode(sizeOld.token);
    await truncate(sizeFile.file, original.length);
    assert.ok((await stat(sizeFile.file)).size < sizeToken.size);
    assert.equal((await stat(sizeFile.file)).size, sizeToken.cursor);
    assert.equal((await call("size-shrank-to-cursor", sizeFile, sizeOld.token)).reset, true);
    const rewritten = await copy("last-rewritten");
    const rewriteOld = await call("last-before", rewritten, null);
    const last = decode(rewriteOld.token).lastRecord;
    const bytes = await readFile(rewritten.file);
    const position = bytes.indexOf(Buffer.from("type"), last.start);
    assert.ok(position >= last.start && position + 4 < last.end);
    const inode = (await stat(rewritten.file)).ino;
    bytes[position] = "T".charCodeAt(0);
    await writeFile(rewritten.file, bytes);
    assert.equal((await stat(rewritten.file)).ino, inode);
    assert.equal((await stat(rewritten.file)).size, original.length);
    assert.equal((await call("last-rewritten", rewritten, rewriteOld.token)).reset, true);
    console.log("MUTATIONS", JSON.stringify({ newInodeReset: true, shrinkToCursorReset: true, lastDeliveredRewriteReset: true, lastRange: [last.start, last.end] }));
  });
  await check("C6-child-and-epoch", async () => {
    const old = await call("identity-before", first, null);
    const other = await call("wrong-child", first, old.token, "bytes", PAGE_MAX_BYTES, new AbortController().signal, `${first.childId}-other`);
    const epochResult = await call("wrong-epoch", first, old.token, "bytes", PAGE_MAX_BYTES, new AbortController().signal, first.childId, `${epoch}-other`);
    assert.equal(other.reset, true);
    assert.equal(epochResult.reset, true);
    console.log("IDENTITY", JSON.stringify({ childIdReset: other.reset, epochReset: epochResult.reset }));
  });
  await check("C7-oversized-bounded-full-extent", async () => {
    const file = await copy("oversized");
    const oversized = record("O".repeat(PAGE_MAX_BYTES * 3 + 17));
    const after = record("after oversized 🌍");
    await appendFile(file.file, Buffer.concat([oversized, after]));
    const initial = await call("oversized-prefix", file, null);
    assert.equal(initial.kind, "page");
    assert.equal(decode(initial.token).cursor, original.length);
    let token = initial.token;
    let steps = 0;
    let result;
    do {
      result = await call(`oversized-step-${steps}`, file, token);
      assert.equal(result.kind, "record_too_large");
      assert.equal(result.start, original.length);
      assert.equal(result.reset, false);
      assert.ok(result.scannedTo - decode(token).cursor <= PAGE_MAX_BYTES);
      token = result.token;
      steps++;
      assert.ok(steps <= 10);
    } while (result.end === null);
    assert.equal(result.end, original.length + oversized.length);
    const resumed = await call("oversized-resume", file, token);
    assert.equal(resumed.kind, "page");
    assert.equal(resumed.atEnd, true);
    assert.deepEqual(Buffer.from(resumed.bytesBase64, "base64"), after);
    console.log("OVERSIZED", JSON.stringify({
      steps, start: original.length, end: result.end, fullExtent: oversized.length,
      resumedRange: [result.end, decode(resumed.token).cursor], resumedExact: true
    }));
  });
  await check("C8-multibyte-partial-malformed", async () => {
    const file = await copy("partial");
    const line = record("split 🌍 final");
    const globe = line.indexOf(Buffer.from("🌍"));
    await appendFile(file.file, line.subarray(0, globe + 2));
    const firstPage = await call("partial-utf8-before", file, null);
    assert.equal(decode(firstPage.token).cursor, original.length);
    assert.equal(firstPage.atEnd, false);
    assert.equal(firstPage.malformed, 0);
    const waitPage = await call("partial-utf8-wait", file, firstPage.token, "entries");
    assert.equal(decode(waitPage.token).cursor, original.length);
    assert.deepEqual(waitPage.entries, []);
    await appendFile(file.file, line.subarray(globe + 2, line.length - 1));
    const noNewline = await call("partial-no-newline", file, waitPage.token);
    assert.equal(decode(noNewline.token).cursor, original.length);
    assert.equal(noNewline.atEnd, false);
    await appendFile(file.file, line.subarray(line.length - 1));
    const completed = await call("partial-completed", file, noNewline.token, "entries");
    assert.equal(completed.atEnd, true);
    assert.deepEqual(completed.entries, parseSessionContent(line.toString("utf8")).entries);
    assert.ok(JSON.stringify(completed.entries).includes("🌍"));
    const malformed = Buffer.from('{bad-json}\n{"type":"message",\n');
    await appendFile(file.file, malformed);
    const malformedPage = await call("malformed-count", file, completed.token);
    assert.equal(parseSessionContent(malformed.toString("utf8")).malformedRecords, 2);
    assert.equal(malformedPage.malformed, 2);
    console.log("PARTIAL", JSON.stringify({
      waitedAt: original.length, multibyteExact: true, waitedWithoutNewline: true,
      completedRange: [original.length, decode(completed.token).cursor], malformed: malformedPage.malformed
    }));
  });
  await check("C9-entries-bytes-range", async () => {
    const file = await copy("mode-pair");
    await appendFile(file.file, Buffer.concat(Array.from({ length: 7 }, () => record("M".repeat(60_000)))));
    let token: string | null = null;
    let pairs = 0;
    for (let step = 0; step < 10; step++) {
      const bytes = await call(`mode-bytes-${step}`, file, token, "bytes");
      const entries = await call(`mode-entries-${step}`, file, token, "entries");
      assert.equal(bytes.kind, "page");
      assert.equal(entries.kind, "page");
      assert.deepEqual(decode(bytes.token), decode(entries.token));
      assert.deepEqual(entries.entries, parseSessionContent(Buffer.from(bytes.bytesBase64, "base64").toString("utf8")).entries);
      assert.equal(bytes.malformed, entries.malformed);
      assert.equal(bytes.atEnd, entries.atEnd);
      assert.equal(bytes.reset, entries.reset);
      token = bytes.token;
      pairs++;
      if (bytes.atEnd) break;
    }
    assert.ok(pairs >= 2);
    assert.equal(decode(token!).cursor, (await stat(file.file)).size);
    console.log("MODE_EQUIVALENCE", JSON.stringify({ pairs, sameRanges: true, parserEntriesEqual: true, malformedCountsEqual: true }));
  });
  await check("RESIDUAL-earlier-delivered-rewrite", async () => {
    const file = await copy("residual");
    const old = await call("residual-before", file, null);
    const last = decode(old.token).lastRecord;
    const bytes = await readFile(file.file);
    const target = bytes.indexOf(Buffer.from("HARNESS_AGENT=child/one"));
    assert.ok(target >= 0 && target + 1 < last.start, "target is not an earlier delivered record");
    const info = await stat(file.file);
    const previous = bytes[target];
    bytes[target] = previous === 72 ? 74 : 72;
    await writeFile(file.file, bytes);
    assert.equal((await stat(file.file)).ino, info.ino);
    assert.equal((await stat(file.file)).size, info.size);
    const continuation = await call("residual-undetected", file, old.token);
    assert.equal(continuation.reset, false);
    assert.equal(decode(continuation.token).cursor, info.size);
    const reset = await call("residual-after-reset", file, old.token, "bytes", PAGE_MAX_BYTES, new AbortController().signal, file.childId, `${epoch}-reset`);
    assert.equal(reset.reset, true);
    assert.deepEqual(Buffer.from(reset.bytesBase64, "base64"), bytes);
    console.log("ACCEPTED_RESIDUAL", JSON.stringify({
      changedByte: target, lastRange: [last.start, last.end],
      sameInode: true, sameSize: true, detectedByContinuation: false, refreshedAfterReset: true
    }));
  });
} else assert.fail(`unknown phase ${phase}`);

const normalizedCallLog = callLog.join("\n") + "\n";
const normalizedProbeLog = normalize(await readFile(process.env.FS_PROBE_LOG!, "utf8"));
console.log("CALL_LOG", JSON.stringify({ lines: callLog.length, sha256: createHash("sha256").update(normalizedCallLog).digest("hex") }));
console.log("PROBE_LOG", JSON.stringify({
  lines: normalizedProbeLog.split("\n").filter(Boolean).length,
  sha256: createHash("sha256").update(normalizedProbeLog).digest("hex")
}));
console.log("BOUNDS", JSON.stringify({ boundedCalls, remainingWindowCalls, pageMaxBytes: PAGE_MAX_BYTES }));
console.log("RESULT", JSON.stringify({ phase, failures }));
if (failures.length) process.exitCode = 1;
```

## C2 — completed many-135 native files: PASS (RPC parent lifetime)

Exact normalized command: `bun <tmp>/gb3-live.ts "$PWD" many-135` (cwd `<tmp>`). The official RPC parent was kept open until all 135 native child session files contained a completed `yield` tool-result record; only then was stdin ended and the parent allowed to exit successfully. No scenario or harness setting was changed. `readPage` covered every native file with its own actual child id and the same fixed epoch. The first three probe observations are printed verbatim; the 135-line probe log is represented by its normalized hash.

Complete normalized driver output:

```text
COMMAND omp --profile many-135 --mode rpc
RPC_STDIN {"id":"gb3-native","type":"prompt","message":"HARNESS_AGENT=main"}
NATIVE_READY {"scenario":"many-135","childFiles":135,"ready":135,"terminal":135,"expected":135}
COMMAND bun --preload $PWD/omp-orca-observer/checks/harness/fs-probe.ts <tmp>/gb3-reader.ts $PWD <profile>/tmp/manifest.json native
READ {"label":"agent-1-0","childId":"agent-1","size":15817,"kind":"page","reset":false,"atEnd":true,"delivered":[0,15817],"malformed":0,"reads":[{"offset":0,"length":15817}]}
READ {"label":"agent-10-0","childId":"agent-10","size":16164,"kind":"page","reset":false,"atEnd":true,"delivered":[0,16164],"malformed":0,"reads":[{"offset":0,"length":16164}]}
READ {"label":"agent-100-0","childId":"agent-100","size":16993,"kind":"page","reset":false,"atEnd":true,"delivered":[0,16993],"malformed":0,"reads":[{"offset":0,"length":16993}]}
NATIVE_COVERAGE {"files":135,"pages":135,"bytes":2274786,"exactBytes":true,"contiguous":true,"overlappingDeliveredBytes":0}
PASS C2-completed-native-continuation
CALL_LOG {"lines":135,"sha256":"0c0c4590fee24e35e225013ccfdd846296b3c0e0351360e9d83d71a66e1ea797"}
PROBE_LOG {"lines":135,"sha256":"87a7015de638d55db230f526706fc40695563bdabbca9bbbb66c5081e507078b"}
BOUNDS {"boundedCalls":135,"remainingWindowCalls":0,"pageMaxBytes":262144}
RESULT {"phase":"native","failures":[]}
READER_EXIT 0
RPC_RESPONSES [{"id":"gb3-native","type":"response","command":"prompt","success":true}]
NATIVE_RUN {"scenario":"many-135","exitCode":0,"childFiles":135,"terminalFiles":135}
NATIVE_STDERR ""
PROFILE_REMOVED many-135
```

## C2 — growing slow-appending native file: PASS (RPC parent lifetime)

Exact normalized command: `bun <tmp>/gb3-live.ts "$PWD" slow-appending` (cwd `<tmp>`).

Complete normalized driver output (identical polling lines are collapsed with exact counts):

```text
COMMAND omp --profile slow-appending --mode rpc
RPC_STDIN {"id":"gb3-native","type":"prompt","message":"HARNESS_AGENT=main"}
NATIVE_READY {"scenario":"slow-appending","childFiles":1,"ready":1,"terminal":0,"expected":1}
COMMAND bun --preload $PWD/omp-orca-observer/checks/harness/fs-probe.ts <tmp>/gb3-reader.ts $PWD <profile>/tmp/manifest.json slow
NATIVE_COMPLETED {"childFiles":1,"terminal":1}
READ {"label":"slow-0","childId":"slow-child","size":14107,"kind":"page","reset":false,"atEnd":true,"delivered":[0,14107],"malformed":0,"reads":[{"offset":0,"length":14107}]}
GROWTH {"cursor":14107,"producerExited":false,"deliveredBytes":14107}
READ {"label":"slow-1","childId":"slow-child","size":14107,"kind":"page","reset":false,"atEnd":true,"delivered":[14107,14107],"malformed":0,"reads":[{"offset":13822,"length":285},{"offset":14107,"length":0}]}
READ {"label":"slow-1","childId":"slow-child","size":15646,"kind":"page","reset":false,"atEnd":true,"delivered":[14107,15646],"malformed":0,"reads":[{"offset":13822,"length":285},{"offset":14107,"length":1539}]}
GROWTH {"cursor":15646,"producerExited":false,"deliveredBytes":1539}
READ {"label":"slow-2","childId":"slow-child","size":15646,"kind":"page","reset":false,"atEnd":true,"delivered":[15646,15646],"malformed":0,"reads":[{"offset":15174,"length":472},{"offset":15646,"length":0}]}
[preceding identical READ line occurred 6 times total]
READ {"label":"slow-2","childId":"slow-child","size":17193,"kind":"page","reset":false,"atEnd":true,"delivered":[15646,17193],"malformed":0,"reads":[{"offset":15174,"length":472},{"offset":15646,"length":1547}]}
GROWTH {"cursor":17193,"producerExited":false,"deliveredBytes":1547}
READ {"label":"slow-3","childId":"slow-child","size":17193,"kind":"page","reset":false,"atEnd":true,"delivered":[17193,17193],"malformed":0,"reads":[{"offset":16721,"length":472},{"offset":17193,"length":0}]}
[preceding identical READ line occurred 6 times total]
READ {"label":"slow-3","childId":"slow-child","size":18829,"kind":"page","reset":false,"atEnd":true,"delivered":[17193,18829],"malformed":0,"reads":[{"offset":16721,"length":472},{"offset":17193,"length":1636}]}
GROWTH {"cursor":18829,"producerExited":true,"deliveredBytes":1636}
GROWING_COVERAGE {"growth":[14107,15646,17193,18829],"exactBytes":true,"contiguous":true,"overlappingDeliveredBytes":0}
PASS C2-growing-native-continuation
CALL_LOG {"lines":17,"sha256":"51e5c4bf70bc3029fc2f2c078039f0826b4ad4622f16ec15fb0f1a1d8f436580"}
PROBE_LOG {"lines":33,"sha256":"04846cda64ec714d636da3d9a41af983cbf50ba1d12e7101f31933125f140f67"}
BOUNDS {"boundedCalls":17,"remainingWindowCalls":0,"pageMaxBytes":262144}
RESULT {"phase":"slow","failures":[]}
READER_EXIT 0
RPC_RESPONSES [{"id":"gb3-native","type":"response","command":"prompt","success":true}]
NATIVE_RUN {"scenario":"slow-appending","exitCode":0,"childFiles":1,"terminalFiles":1}
NATIVE_STDERR ""
PROFILE_REMOVED slow-appending
```

The four nonempty delivered ranges were `[0,14107)`, `[14107,15646)`, `[15646,17193)`, and `[17193,18829)`: contiguous, non-overlapping, and byte-for-byte equal to the final native file. The first three deliveries happened before the native producer exited. Zero-byte EOF observations did not advance the cursor and only revalidated the latest delivered record. `NATIVE_COMPLETED` appears before the reader's buffered output because the driver drains and prints that output after closing the finished producer; the recorded `producerExited` flags are taken at each actual read.

### Source: `gb3-live.ts` (accepted many-135 and slow-appending runs)

```ts
import assert from "node:assert/strict";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Subprocess } from "bun";

const repo = resolve(process.argv[2]);
const scenario = process.argv[3];
const phase = scenario === "slow-appending" ? "slow" : "native";
// The checkout is runtime-selected; this source is outside the repository.
const { create } = await import(pathToFileURL(join(repo, "omp-orca-observer/checks/harness/profile.ts")).href);
const profile = await create(scenario);
const normalize = (s: string) => s.replaceAll(profile.root, "<profile>")
  .replaceAll(basename(profile.root), "<profile-key>").replaceAll(repo, "$PWD");
const env: Record<string, string> = {};
for (const key of ["PATH", "TERM", "LANG"]) if (process.env[key]) env[key] = process.env[key]!;
Object.assign(env, {
  HOME: profile.home, TMPDIR: join(profile.root, "tmp"),
  XDG_CONFIG_HOME: join(profile.root, "config"), XDG_CACHE_HOME: join(profile.root, "cache"),
  XDG_DATA_HOME: join(profile.root, "data"), XDG_STATE_HOME: join(profile.root, "state"),
  FS_PROBE_LOG: join(profile.root, "tmp", "probe.jsonl")
});
const expected = scenario === "many-135" ? 135 : 1;
async function inventory() {
  const files: { childId: string; file: string; ready: boolean; terminal: boolean; size: number }[] = [];
  async function walk(dir: string): Promise<void> {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const file = join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.name.endsWith(".jsonl")) {
        const text = await readFile(file, "utf8");
        const rows = text.split("\n").slice(0, -1).map(line => {
          try { return JSON.parse(line); } catch { return null; }
        });
        const header = rows.find(row => row?.type === "session");
        if (header?.parentSession) {
          const terminal = rows.some(row => row?.type === "message" && row.message?.role === "toolResult" && row.message.toolName === "yield");
          const ready = rows.some(row => row?.type === "message" && row.message?.role === "user");
          files.push({ childId: entry.name.slice(0, -6), file, ready, terminal, size: Buffer.byteLength(text) });
        }
      }
    }
  }
  await walk(profile.home);
  return files.sort((a, b) => a.childId.localeCompare(b.childId));
}
let reader: Subprocess<"ignore", "pipe", "pipe"> | undefined;
let native: { kill(): void; exited: Promise<number> } | undefined;
try {
  console.log(`COMMAND omp --profile ${scenario} --mode rpc`);
  const omp = profile.spawn(["--mode", "rpc"]);
  native = omp;
  const stdout = new Response(omp.stdout).text();
  const stderr = new Response(omp.stderr).text();
  const doneFile = join(profile.root, "tmp", "native-done");
  const completed = omp.exited.then(async (code: number) => { await writeFile(doneFile, String(code)); return code; });
  console.log('RPC_STDIN {"id":"gb3-native","type":"prompt","message":"HARNESS_AGENT=main"}');
  omp.stdin.write(JSON.stringify({ id: "gb3-native", type: "prompt", message: "HARNESS_AGENT=main" }) + "\n");
  const deadline = Date.now() + 90_000;
  let files = await inventory();
  while (Date.now() < deadline && (files.length !== expected || !files.every(file => file.ready) ||
    (phase === "native" && !files.every(file => file.terminal)))) {
    await Bun.sleep(50);
    files = await inventory();
  }
  console.log("NATIVE_READY", JSON.stringify({
    scenario, childFiles: files.length, ready: files.filter(file => file.ready).length,
    terminal: files.filter(file => file.terminal).length, expected
  }));
  assert.equal(files.length, expected, "wrong native child file count");
  assert.ok(files.every(file => file.ready), "child user messages unavailable");
  if (phase === "native") {
    assert.ok(files.every(file => file.terminal), "native children did not finish");
    omp.stdin.end();
    assert.equal(await completed, 0);
  } else assert.equal(files[0].terminal, false, "slow child finished before reader launch");
  const manifest = join(profile.root, "tmp", "manifest.json");
  await writeFile(manifest, JSON.stringify({ root: profile.root, files, doneFile, phase }));
  console.log(`COMMAND bun --preload $PWD/omp-orca-observer/checks/harness/fs-probe.ts <tmp>/gb3-reader.ts $PWD <profile>/tmp/manifest.json ${phase}`);
  reader = Bun.spawn(["bun", "--preload", join(repo, "omp-orca-observer/checks/harness/fs-probe.ts"),
    join(import.meta.dir, "gb3-reader.ts"), repo, manifest, phase], {
    cwd: profile.workspace, env, stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  const readerOut = new Response(reader.stdout).text();
  const readerErr = new Response(reader.stderr).text();
  if (phase === "slow") {
    while (Date.now() < deadline && !files.every(file => file.terminal)) {
      await Bun.sleep(50);
      files = await inventory();
    }
    console.log("NATIVE_COMPLETED", JSON.stringify({ childFiles: files.length, terminal: files.filter(file => file.terminal).length }));
    assert.ok(files.every(file => file.terminal), "slow child did not finish");
    omp.stdin.end();
    assert.equal(await completed, 0);
  }
  const [out, err, code] = await Promise.all([readerOut, readerErr, reader.exited]);
  console.log(normalize(out).trimEnd());
  if (err) console.log("READER_STDERR", normalize(err).trimEnd());
  console.log("READER_EXIT", code);
  const [nativeOut, nativeErr, nativeCode] = await Promise.all([stdout, stderr, completed]);
  const responses = nativeOut.split("\n").filter(Boolean).map(line => {
    try { return JSON.parse(line); } catch { return null; }
  }).filter(row => row?.type === "response");
  console.log("RPC_RESPONSES", JSON.stringify(responses));
  console.log("NATIVE_RUN", JSON.stringify({
    scenario, exitCode: nativeCode, childFiles: files.length,
    terminalFiles: files.filter(file => file.terminal).length
  }));
  console.log("NATIVE_STDERR", JSON.stringify(normalize(nativeErr)));
  if (code !== 0) process.exitCode = code;
} catch (error) {
  console.error("LIVE_DRIVER_FAIL", normalize(String(error)));
  process.exitCode = 1;
} finally {
  reader?.kill();
  native?.kill();
  await profile.teardown();
  console.log("PROFILE_REMOVED", scenario);
}
```

## Final result / limitations

| Criterion | Result | Observed proof |
| --- | --- | --- |
| C1 — physical read budget and payload window | PASS | Exact probe offsets/lengths on 977542-byte, four-page native copy; 262144-byte payload cap and only last-record revalidation. |
| C2 — exact continuation while growing | PASS | Complete one-child and all 135 many-135 native files; slow child's four growing deliveries equal final 18829-byte file; four-page native-copy delivery also exact. |
| C3 — held-read cancellation and close | PASS | `unavailable(cancelled)` plus one observed close and fd absence after release of held read. |
| C4 — missing and shrink | PASS | `unavailable(missing)`; 15080→14873-byte shrink reset to zero. |
| C5 — replacement, size reduction, protected-record rewrite | PASS | New inode reset; reduced recorded size at cursor reset; same-size/inode last-record rewrite reset. |
| C6 — child/epoch binding | PASS | Both deliberate mismatches reset to zero. |
| C7 — oversized record | PASS | Four bounded steps reported `[15080,801735)`, then delivered the next record exactly. |
| C8 — UTF-8 / partial tail / malformed counts | PASS | Incomplete UTF-8 and missing newline withheld; completion preserved globe; malformed count two. |
| C9 — modes | PASS | Two page pairs have equal continuation fields/ranges and exact parser-equivalent entries. |
| Accepted residual | OBSERVED, NOT FAILED | Earlier delivered byte 12907 rewrite stayed undetected until explicit reset refreshed bytes. |

- Missing rule: none needed to execute the slice. The print-mode lifetime problem was isolated to fixture invocation and solved by keeping the unmodified official RPC parent alive, not by fixing product or harness files.
- Still unverified: cancellation return/close latency before the probe releases the held I/O; mutation between stat/revalidation/payload operations; exhaustive filesystem race schedules and platform behavior outside this Linux/WSL run; authorization, endpoint, UI, and other gates; parser package metadata/version was not opened (the prescribed dev dependency export was used). No project-wide validation, permanent-test command, formatter, or linter ran.
- These are scoped runtime gate observations, not a general proof against all concurrent rewrites. The deliberate earlier-record residual is explicitly accepted by the slice.
- Recovery receipt: evidence baseline absent; after-state is this complete added file. Both gate drivers printed `PROFILE_REMOVED`; discovery's `finally` also awaited harness teardown. Teardown removed generated native sessions, temporary copies, manifests, sentinels, and probe logs. The four throwaway sources `gb3-discover.ts`, `gb3-driver.ts`, `gb3-reader.ts`, and `gb3-live.ts` were deleted with guarded editor operations after their exact sources and outputs were recorded above. Only this evidence file is a repository change.

## Evidence digest command — infrastructure nonexecution

The read-only command `sha256sum omp-orca-observer/checks/evidence/gb3.md` with cwd `$PWD` did not execute; the shell tool returned:

```text
worktree mutation busy after 5.0s
agent: Gb2Gate
session: 01a0f415-c390-70e9-9394-5126f80a1e08
request: 70bd2c0d-38f6-4b57-a0cf-214ec414a258
tool name: bash
target: unknown
pid: 1830272
age: 30.6s
heartbeat age: 0.5s ago
fence: 1553
relation: sibling
```

This is not a reader failure. It was reported to the automated tool-issue device. The final digest is obtained with the same file supplied as an absolute runtime argument from cwd `<tmp>`; its normalized command is `sha256sum "$PWD/omp-orca-observer/checks/evidence/gb3.md"`. The actual digest is carried by the final handoff, avoiding a self-referential hash in this file.
