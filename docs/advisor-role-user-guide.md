# terra advisor user guide

> a read-only omp task agent that returns one source-backed advisory record

## contents

- [what the agent does](#what-the-agent-does)
- [what changed from the earlier advisor role](#what-changed-from-the-earlier-advisor-role)
- [installation](#installation)
- [invocation](#invocation)
- [fixed profile](#fixed-profile)
- [output schema](#output-schema)
- [when terra advises](#when-terra-advises)
- [authority boundary](#authority-boundary)
- [verification](#verification)
- [troubleshooting](#troubleshooting)
- [limitations](#limitations)
- [source map](#source-map)

## what the agent does

the `nikos-agent-stack` plugin installs one agent profile, `agents/terra.md`. the
agent name is `terra-advisor`. sol calls it through the native `task` tool. terra
reads source with read-only tools, and returns one structured record that holds
one recommendation and one evidence object.

terra is an explicit task agent. it starts only when sol calls it. it does not
watch the session, it does not interrupt a turn, and it produces no output
between calls.

the plugin changes no omp source file. it declares two extensions in
`package.json#omp.extensions`, and it ships the agent profile in the packaged
`agents/` directory. omp finds the profile through plugin agent discovery.

sources: [agent profile](../agents/terra.md), [packaged agent file](../package.json#L35-L57), [discovery decision](official-extension-plan.html)

## what changed from the earlier advisor role

this package no longer contains a passive advisor. read this table before you
use the agent.

| earlier behavior | current fact |
|---|---|
| passive advisor mode, started with `/advisor on` and inspected with `/advisor status` | removed. no passive advisor exists. sol must make one explicit `task` call for each advisory record. |
| `WATCHDOG.yml` profile copied to `~/.omp/agent/` | removed. a plugin cannot register a passive native advisor and cannot write `watchdog.yml`. |
| omp core patch that extended the native `advise` tool schema, advisor routing, agent-facing xml, and the visible advisor card | removed. evidence now travels in the agent's own output object only. |
| a pinned upstream base revision, plus patch application into an omp source checkout | removed. installation uses the omp plugin manager only, and no step touches omp source. |
| advisor card, transcript advisor details, and native note deduplication | not available. the record is a normal task result. |

**the passive `/advisor` behavior is gone. no part of this package restores it.**
terra now speaks only when sol calls it, and terra advice reaches the transcript
as a task result, not as an advisory interrupt.

sources: [scope and compatibility rule](official-extension-plan.html), [terra advisor summary](../README.md#L126-L135)

## installation

terra installs with the rest of the stack. the plugin name is
`nikos-agent-stack`. all actions use `omp plugin <action> [target]`.

### install

```sh
omp plugin install nikos-agent-stack
```

`--scope user` is the default and installs for every project. use
`--scope project` to bind the plugin to the current project only.

### link a local checkout

```sh
omp plugin link .
```

run this from the repository root when you develop the profile. the link points
omp at the working tree, so a later edit of `agents/terra.md` needs no reinstall.

### update

```sh
omp plugin install nikos-agent-stack@latest
```

a linked checkout does not need this command. update its source instead.

### remove

```sh
omp plugin uninstall nikos-agent-stack
```

removal deletes the packaged profile, so `terra-advisor` leaves the agent list.
terra keeps no state on disk, so removal leaves no advisor files behind. the gate
checker state at `~/.omp/gate-checker/` belongs to a different part of the stack.

### after any install, link, update, or removal

restart omp. agent discovery occurs at startup.

source: [packaged files and extension entries](../package.json#L35-L58)

## invocation

sol calls terra through the native `task` tool, and selects the agent by name:

```text
task
  agent: terra-advisor
  task: one candidate decision, its acceptance criterion, and the paths to inspect
```

rules for each call:

- one call returns one record. ask about one candidate only.
- name the acceptance criterion or the observable contract in the call. terra
  stays silent when the call supplies no criterion to test against.
- name the files or the search scope. terra reads source; it does not receive
  your working context.
- terra does not delegate, so a call never starts a further agent.

source: [scope, silence, and delegation rules](../agents/terra.md#L48-L64)

## fixed profile

the profile fixes the model, the thinking level, and the tool set:

| field | value | effect |
|---|---|---|
| `name` | `terra-advisor` | the name that selects the agent in a `task` call |
| `model` | `openai-codex/gpt-5.6-terra` | every call uses this model |
| `thinking` | `high` | every call uses high reasoning effort |
| `tools` | `read`, `grep`, `glob` | terra cannot edit, write, or run a command |

these values live in the profile frontmatter. no runtime flag changes them. to
change one, edit `agents/terra.md`, then relink or reinstall the plugin, then
restart omp. `plugin.test.ts` asserts all four values, so a change to the profile
without a matching change to the test fails `bun run test`.

sources: [profile frontmatter](../agents/terra.md#L1-L9), [asserted profile contract](../plugin.test.ts#L128-L146)

## output schema

the profile declares a closed output object. `advice` and `evidence` are both
required, and `additionalProperties` is `false` on the record and on the evidence
object.

```json
{
  "advice": "the expired-token branch reaches the success path, which the stated criterion forbids",
  "evidence": {
    "path": "src/auth.ts",
    "line": 42,
    "claim": "the expired-token check returns before the guard runs",
    "digest": "a1b2"
  }
}
```

| field | type | rule |
|---|---|---|
| `advice` | string | one candidate recommendation, grounded in inspected source |
| `evidence.path` | string | exact repository-relative path of the read file |
| `evidence.line` | integer | one-indexed line that establishes the claim |
| `evidence.claim` | string | concrete claim that the cited line proves |
| `evidence.digest` | string | digest copied word for word from the read result file snapshot header |

evidence is required on every record. terra copies the digest from the read
result. terra never invents a digest and never recomputes one. when no inspected
source grounds the advice, terra returns no advice instead of a guess.

sources: [output schema](../agents/terra.md#L10-L41), [evidence rules](../agents/terra.md#L66-L75)

## when terra advises

terra advises only when inspected evidence establishes all three links at once:

1. a current sol decision or candidate;
2. an explicit acceptance criterion, or an existing observable contract that the
   candidate must satisfy;
3. a concrete path by which the candidate breaks that criterion, or leaves it
   materially unverified.

when one link is hypothetical or unobserved, terra stays silent.

terra keeps each recommendation to one candidate, its acceptance criteria, the
relevant existing tests, and any supplied proposals. terra does not propose a
broader plan, does not invent an edge case, and does not reopen a settled design.

### classification of a failed test

when a proposed or speculative test fails, terra classifies the failure before it
advises:

| class | condition | recommendation |
|---|---|---|
| `bug` | inspected evidence proves that current or accepted behavior breaks an explicit criterion or contract | advise a production change |
| `bad_oracle` | the expectation is unsupported or wrong | advise correction or removal of the test |
| `low_value` | the difference protects no distinct, important, stable observable contract | advise correction or removal of the test |

terra advises a production change only for a `bug`.

sources: [advice conditions](../agents/terra.md#L54-L64), [failure classification](../agents/terra.md#L77-L86)

## authority boundary

- sol is the sole writer, integrator, and validator, and sol owns the final
  decision.
- terra advises. terra never claims approval, gate, or handoff authority.
- terra never delegates and never hands work to another agent.
- the tool set makes the boundary structural: with `read`, `grep`, and `glob`
  only, terra produces no diff, runs no command, and creates no commit.

a terra record is an input to sol's decision. it is not an approval, and it is
not a gate result. gate results come from the gate checker extension, which is a
different part of this plugin.

sources: [authority statement](../agents/terra.md#L44-L52), [gate checker scope](gates-plugin-user-guide.md)

## verification

### the plugin is installed

```sh
omp plugin list
omp plugin doctor
```

`list` must show `nikos-agent-stack` as installed and enabled. `doctor` must
report no unresolved entry point.

### the agent is discovered

start omp and open the agent list. `terra-advisor` must appear with the
description from the profile.

### the profile contract holds

```sh
bun run test
```

this suite includes `plugin.test.ts`, which reads `agents/terra.md` and asserts:

- the frontmatter keys, the agent name, the model, and the thinking level;
- the exact tool list `read`, `grep`, `glob`;
- `additionalProperties: false` on the record and on the evidence object;
- required `advice` and `evidence`;
- required `path`, `line`, `claim`, and `digest` in that order.

that test checks the profile file only. it does not run the model and does not
check a live record.

### one smoke call

call terra about a file that you have read yourself. then check the returned
`path`, `line`, and `digest` against your own read result. a digest that does not
match your read result means stale or invented evidence.

source: [terra profile test](../plugin.test.ts#L128-L146)

## troubleshooting

### `terra-advisor` does not appear in the agent list

run `omp plugin list` and confirm that the plugin is installed and enabled. run
`omp plugin doctor`. restart omp, because discovery occurs at startup. for a
linked checkout, confirm that `agents/terra.md` exists in the linked working
tree.

### `/advisor on` reports nothing about terra

this is expected. this package installs no passive advisor and no watchdog
profile. use a `task` call. see
[what changed from the earlier advisor role](#what-changed-from-the-earlier-advisor-role).

### terra returns no advice

this is a designed result. terra stays silent when the call supplies no explicit
criterion, or when no inspected source proves a concrete violation. supply the
criterion and the paths, then call again.

### the record has no evidence object

evidence is required by the profile schema. a record without evidence means that
the model did not follow the schema, or that the installed profile is not this
profile. compare the installed `agents/terra.md` with the repository copy, and
run `bun run test`.

### the digest does not match the current file

treat the evidence as stale. read the cited file again, and call terra again. do
not act on a record whose digest disagrees with a current read result.

### the gate checker reports a missing subagent manifest

terra cannot supply a manifest. its output object is closed, so it can hold no
`changed_files` key and no `<changed-files>` block. the gate checker adjudicates
a subagent report only when the parent response refers to that delegated work. at
`medium` engagement this produces a warning. at `high` engagement the missing
manifest blocks. use terra at `medium` or lower, or state in your response that
terra changed no file, so the gate checker does not need to adjudicate it.

sources: [manifest rule and `auto` behavior](gates-plugin-user-guide.md), [closed output schema](../agents/terra.md#L10-L41)

### the model is unavailable

the profile fixes `openai-codex/gpt-5.6-terra`. the call fails when your omp
installation cannot reach that model. change the `model` field in
`agents/terra.md`, update `plugin.test.ts`, relink, and restart omp.

## limitations

- **no passive advice.** terra sees nothing that sol does not send in a `task`
  call. terra cannot interrupt a turn, cannot watch tool calls, and cannot react
  to a decision on its own.
- **no advisor user interface.** there is no advisor card, no advisor transcript
  detail, and no native note deduplication. two calls with the same input can
  return the same advice twice.
- **one record for each call.** terra returns one recommendation with one
  evidence object. a review of several candidates needs several calls.
- **the digest is not machine-checked.** the schema requires a digest string.
  nothing in this package compares that string with the current file. verify it
  yourself, as described in [verification](#verification).
- **the schema check is static.** `plugin.test.ts` validates the profile file
  only. it runs no model call and checks no live record.
- **read-only by design.** terra proposes no diff and runs no verification. sol
  performs every change and every check.

## source map

| path | purpose |
|---|---|
| [`agents/terra.md`](../agents/terra.md) | installed agent profile: name, model, thinking level, read-only tools, output schema, advice conditions, and authority boundary |
| [`package.json`](../package.json) | plugin manifest: extension entries and the packaged file list that ships the profile |
| [`plugin.test.ts`](../plugin.test.ts) | asserts the packaged surface and the terra profile contract |
| [`README.md`](../README.md) | stack overview, install, and the terra advisor summary |
| [`docs/gates-plugin-user-guide.md`](gates-plugin-user-guide.md) | gate checker behavior, engagement levels, and the subagent manifest rule |
| [`docs/official-extension-plan.html`](official-extension-plan.html) | the decision to package terra as a task agent, and the surfaces that stay out of scope |
</content>
</invoke>
