# sol-terra advisor role

> a bounded terra advisor profile with source-backed advisory evidence for omp

## contents

- [what the package does](#what-the-package-does)
- [quick start](#quick-start)
- [compatibility contract](#compatibility-contract)
- [advisor evidence schema](#advisor-evidence-schema)
- [delivery behavior](#delivery-behavior)
- [sol-terra profile](#sol-terra-profile)
- [verification](#verification)
- [update procedure](#update-procedure)
- [troubleshooting](#troubleshooting)
- [source map](#source-map)

## what the package does

`advisor-role` contains two related artifacts:

1. `0001-feat-advisor-add-structured-evidence-records.patch` extends omp's native `advise` tool with one optional source-evidence record. omp preserves the record through advisor routing, agent-facing xml, transcript details, and the visible advisor card.
2. `watchdog.yml` configures terra as sol's bounded read-only advisor. it requires inspected source advice to cite the exact path, one-indexed line, concrete claim, and read-snapshot digest.

this package does not install a second orchestrator, replace omp's advisor runtime, execute validation, or give terra write access. sol remains the writer, integrator, validator, and final decision owner.

sources: [core patch](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L14-L180), [terra profile](../advisor-role/WATCHDOG.yml)

## quick start

### confirm the target base

run this in an omp source checkout:

```sh
git rev-parse HEAD
```

the expected revision is listed in the [compatibility contract](#compatibility-contract). do not apply the patch to a different revision without first running the patch check and focused verification.

### check and apply the core patch

```sh
cd /path/to/oh-my-pi
git apply --check /home/niko/nikos-agent-stack/advisor-role/0001-feat-advisor-add-structured-evidence-records.patch
git am /home/niko/nikos-agent-stack/advisor-role/0001-feat-advisor-add-structured-evidence-records.patch
```

### install the advisor profile

for a user-wide profile with no existing watchdog configuration:

```sh
cp /home/niko/nikos-agent-stack/advisor-role/WATCHDOG.yml ~/.omp/agent/WATCHDOG.yml
```

if `~/.omp/agent/WATCHDOG.yml` already exists, merge the `terra` entry instead of overwriting the file. for one repository only, place the file at `<repo>/WATCHDOG.yml` or `<repo>/.omp/WATCHDOG.yml`.

start omp, run `/advisor on`, then use `/advisor status` to confirm that terra is running.

sources: [terra profile](../advisor-role/WATCHDOG.yml), [core patch schema and routing](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L18-L180)

## compatibility contract

| item | supported value |
|---|---|
| upstream repository | `can1357/oh-my-pi` |
| required base commit | `8b0f400d3cff1defdf368932528fd2f20573a76c` |
| package type | git format-patch plus watchdog profile |
| advisor model | `openai-codex/gpt-5.6-terra:high` |
| advisor tools | `read`, `grep`, `glob` |
| harness installation | manual and blocked until the package commit exists in this repository |

sources: [upstream base](../advisor-role/UPSTREAM_BASE), [terra model and tools](../advisor-role/WATCHDOG.yml), [patch metadata](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L1-L12)

## advisor evidence schema

`advise` gains this optional field:

```json
{
  "evidence": {
    "path": "packages/coding-agent/src/advisor/advise-tool.ts",
    "line": 18,
    "claim": "the advise schema accepts one structured evidence record",
    "digest": "6fd3"
  }
}
```

| field | type | rule |
|---|---|---|
| `path` | string | required and non-empty when `evidence` is present |
| `line` | integer | required, one-indexed, and at least `1` |
| `claim` | string | required and non-empty; states what the cited source establishes |
| `digest` | string | required and non-empty; identifies the inspected file snapshot |

`evidence` stays optional because valid advice can rely on transcript evidence that has no file location. the terra profile requires it when inspected source supports the advice. terra must copy the digest from the read result's file snapshot header; it must not invent or recompute one.

sources: [schema and types](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L18-L55), [tool prompt](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L128-L136), [terra profile](../advisor-role/WATCHDOG.yml)

## delivery behavior

one evidence object follows the same native path as its advice note:

```text
terra advise call
  -> arktype validation
  -> advise callback
  -> native aside, preserve, or steer route
  -> advisor message details
  -> escaped agent-facing xml
  -> visible advisor card
```

agent-facing xml uses a child element:

```xml
<advisory guidance="weigh, don't blindly obey">
inspect the cited branch
<evidence path="src/auth.ts" line="42" digest="a1b2">
expired tokens reach the success branch
</evidence>
</advisory>
```

omp escapes the path, digest, and claim before serialization. the visible card shows `path:line`, the claim, and the digest under the note. advice without evidence keeps its existing representation and callback arity.

sources: [serialization and compatibility](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L56-L110), [card rendering](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L112-L127), [session routing](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L137-L180)

## sol-terra profile

terra follows four bounded rules:

- sol alone writes, integrates, validates, and decides.
- terra advises only when it can connect a current candidate, an explicit criterion or observable contract, and a concrete violation or material verification gap.
- terra stays within the current candidate and does not broaden the plan, invent edge cases, or reopen settled design.
- terra classifies speculative test failures as `bug`, `bad_oracle`, or `low_value` before it recommends any production change.

source: [terra profile](../advisor-role/WATCHDOG.yml)

## verification

run these checks after applying the patch to the compatible omp checkout:

```sh
bun install --frozen-lockfile
bun --cwd=packages/natives run build
bun test packages/coding-agent/test/advisor/advisor.test.ts
bun --cwd=packages/coding-agent run check:types
bunx biome check packages/coding-agent/src/advisor/advise-tool.ts packages/coding-agent/src/session/session-advisors.ts packages/coding-agent/src/modes/components/advisor-message.ts packages/coding-agent/test/advisor/advisor.test.ts
```

the focused test verifies:

- schema acceptance and rejection;
- callback and tool-detail preservation;
- xml escaping and serialization;
- visible card rendering.

source: [focused tests](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch#L182-L285)

## update procedure

1. create a clean checkout of the new upstream revision.
2. apply or port the advisor evidence change.
3. run the focused test, type check, and formatter check.
4. export one new format-patch.
5. replace the packaged patch and update the required base commit in this guide.
6. run this repository's full validation before commit and push.

## troubleshooting

### `git apply --check` fails

the upstream source moved or the checkout is not at the required base. do not force the patch. port the five changed files, rerun focused checks, and export a new patch.

### terra does not appear

run `/advisor status`, confirm that advisor mode is enabled, and confirm that omp discovered the intended `watchdog.yml` scope.

### advice has no evidence

`evidence` is optional at the core schema. the terra profile requires it only for inspected source. transcript-only advice can have no file evidence.

### the digest does not match the current read result

treat the evidence as stale and reread the cited file. existing note deduplication can suppress the same advice text, even with a new digest. do not bypass this safeguard by rephrasing repeated advice.

## source map

| path | purpose |
|---|---|
| [`advisor-role/0001-feat-advisor-add-structured-evidence-records.patch`](../advisor-role/0001-feat-advisor-add-structured-evidence-records.patch) | omp core schema, routing, serialization, rendering, and focused tests |
| [`advisor-role/upstream_base`](../advisor-role/UPSTREAM_BASE) | exact compatible upstream commit |
| [`advisor-role/watchdog.yml`](../advisor-role/WATCHDOG.yml) | production sol-terra advisor profile |
| [`docs/advisor-role-user-guide.md`](advisor-role-user-guide.md) | installation, schema, behavior, verification, and maintenance guide |
