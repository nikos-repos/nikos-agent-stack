# ask questionnaire user guide

> a phase-declared questionnaire policy extension for omp's native ask tool

## contents

- [what the extension does](#what-the-extension-does)
- [quick start](#quick-start)
- [native ask ownership](#native-ask-ownership)
- [what arms the policy](#what-arms-the-policy)
- [guidance injection](#guidance-injection)
- [tool blocking](#tool-blocking)
- [success and failure transitions](#success-and-failure-transitions)
- [lifecycle resets](#lifecycle-resets)
- [stop continuation](#stop-continuation)
- [installation](#installation)
- [updates and removal](#updates-and-removal)
- [focused tests](#focused-tests)
- [troubleshooting](#troubleshooting)
- [limitations](#limitations)
- [source map](#source-map)

## what the extension does

`ask-questionnaire` is one omp extension file that ships inside the `nikos-agent-stack` plugin. it adds no user interface, no transport, and no omp core change.

it does not inspect user text. the model opens a pending questionnaire by calling the registered `questionnaire_open` tool with an owner and a reason. while a questionnaire is pending, the extension does four things:

1. it injects that reason before each model call.
2. it allows a fixed read-only tool allowlist plus `ask` and `questionnaire_open`.
3. it blocks every other tool.
4. it exposes one continuation decision that gate-checker evaluates at session stop.

the plugin declares the extension entry in the package manifest, so omp loads it after installation.

sources: [scope comment](../ask-questionnaire/index.ts#L1-L15), [tool registration and stop slot](../ask-questionnaire/index.ts#L72-L109), [tool blocking](../ask-questionnaire/index.ts#L125-L143), [`package.json`](../package.json#L37-L43)

## quick start

```sh
omp plugin install nikos-agent-stack
```

then start a session. ordinary text arms nothing. a questionnaire opens only when the model calls the registered `questionnaire_open` tool with an owner and a reason and the call executes successfully:

| step | observable result |
|---|---|
| `questionnaire_open` runs with a new owner | the tool returns `questionnaire armed by <owner>` and one questionnaire is pending |
| `questionnaire_open` runs from a different owner while one is pending | the tool refuses the call and leaves the pending questionnaire unchanged |
| `questionnaire_open` runs from the same owner while one is pending | the tool returns `already open` and keeps the original owner and reason |
| the model turn starts | omp adds the reason to model context, not to the transcript |
| the model calls a tool outside the allowlist | omp blocks the call and returns the declaring reason |
| the model calls `ask` | the native ask dialog opens |
| the ask result returns without an error | the extension clears the questionnaire and omp allows every tool again |

sources: [tool registration](../ask-questionnaire/index.ts#L79-L103), [declaration tests](../ask-questionnaire/index.test.ts#L103-L155)

## native ask ownership

omp owns the ask tool. this package never renders, times out, or transports a questionnaire.

| surface | owner |
|---|---|
| ask input schema and validation | omp |
| questionnaire dialog, tabs, and keyboard controls | omp |
| custom answer row, notes, previews, and timeouts | omp |
| remote and collaboration answer routing | omp |
| questionnaire declaration and tool gating | this extension |

### native ask schema example

the shape below belongs to the native omp ask tool, not to this package. this package neither defines nor validates it, so treat the field set as version-dependent and confirm it against the omp release you run.

```json
{
  "questions": [
    {
      "id": "auth_method",
      "question": "which authentication method should this api use?",
      "header": "auth",
      "options": [
        { "label": "jwt", "description": "bearer tokens for stateless clients." },
        { "label": "session cookies", "description": "browser-first authentication." }
      ],
      "multi": false,
      "recommended": 0
    }
  ]
}
```

the extension reads only the tool name and the error flag of an ask call. it does not read `questions`, and it does not require any specific question count or field.

sources: native ask tool in omp `@oh-my-pi/pi-coding-agent` 17.2.15, `src/tools/ask.ts` (schema `questions[]` with `id`, `question`, `header?`, `options[].label`, `options[].description?`, `options[].preview?`, `multi?`, `recommended?`); [tool handlers in this package](../ask-questionnaire/index.ts#L127-L138)

## what arms the policy

the only arming path is a successful `questionnaire_open` call. the extension registers no `input` handler. no chat text, rpc request, or headless request arms it.

sources: [tool registration](../ask-questionnaire/index.ts#L72-L104), [no-input-handler test](../ask-questionnaire/index.test.ts#L119-L126)

## guidance injection

there is no fixed guidance sentence. the `reason` argument of `questionnaire_open` is the guidance. while a questionnaire is pending, the `before_agent_start` handler returns that exact reason as one message, so it enters the model context and stays out of the transcript:

| field | value |
|---|---|
| `customType` | `nikos-agent-stack.ask-questionnaire.guidance` |
| `content` | the declaring reason, verbatim |
| `display` | `false`, so the message stays out of the transcript |
| `attribution` | not set; omp normalises an absent value to `agent` |

the registered tool description reads "declare that this phase needs a batched questionnaire before it proceeds."

the handler returns nothing when no questionnaire is pending. omp adds the message on every model turn while the questionnaire stays pending.

sources: [tool description](../ask-questionnaire/index.ts#L79-L87), [before_agent_start handler](../ask-questionnaire/index.ts#L111-L123), [injection test](../ask-questionnaire/index.test.ts#L159-L173)

## tool blocking

the `tool_call` handler applies one rule while a questionnaire is pending:

- these tools pass: `read`, `grep`, `glob`, `lsp`, `ast_grep`, `inspect_image`, `ask`, and `questionnaire_open`. the handler returns nothing for them.
- every other tool receives `{ block: true, reason: <the declaring reason> }`.

the allowlist is closed: a tool that is not listed is blocked. with nothing pending, the handler returns nothing.

sources: [read-only allowlist](../ask-questionnaire/index.ts#L25-L36), [tool_call handler](../ask-questionnaire/index.ts#L125-L131)

## success and failure transitions

the `tool_result` handler clears the open request only for a successful ask result.

| result | tool name | `isError` | outcome |
|---|---|---|---|
| successful ask | `ask` | `false` | the request closes and every tool is allowed again |
| failed ask | `ask` | `true` | the request stays open and blocking continues |
| any other tool | not `ask` | any | the request stays open |

the extension treats an error-free return as success. it does not inspect answers, selected options, or custom input.

sources: [tool_result handler](../ask-questionnaire/index.ts#L133-L138), [transition tests](../ask-questionnaire/index.test.ts#L177-L208)

## lifecycle resets

three session events clear the pending questionnaire:

- `session_start`
- `session_switch`
- `session_branch`

the state is one in-memory pending object per loaded extension instance, holding the declaring `owner` and `reason`, so a context change or a restart never carries a stale questionnaire forward.

sources: [state and reset handlers](../ask-questionnaire/index.ts#L72-L77), [lifecycle registration](../ask-questionnaire/index.ts#L140-L143), [reset tests](../ask-questionnaire/index.test.ts#L237-L265)

## stop continuation

this module registers no `session_stop` handler. it installs its decision in a write-once slot and exports `questionnaireStop`. gate-checker registers the package's only `session_stop` handler and calls the gate completion decision first, then the questionnaire decision, then the omnipotence decision. the questionnaire continuation therefore runs only when the gate completion decision returns nothing, and its `additionalContext` is the declaring reason. omp treats a continuation return as a request for one continuation turn.

- while a questionnaire is pending, the decision returns `{ continue: true, additionalContext: <the declaring reason> }`.
- the decision returns nothing after a successful ask result.
- the decision returns nothing when no questionnaire is pending.

sources: [slot installer](../ask-questionnaire/stop-decision.ts#L1-L9), [write-once slot](../stop-slot.ts#L1-L25), [gate-checker stop chain](../gate-checker/index.ts#L2259-L2263)

## installation

install the plugin with the native omp plugin manager:

```sh
omp plugin install nikos-agent-stack
```

for a local checkout of this repository, link it from the repository root:

```sh
omp plugin link .
```

requirements:

- install or link the package.
- restart omp after installation because omp discovers extensions at startup ([gates plugin user guide](gates-plugin-user-guide.md)).

the package manifest declares what omp loads:

| manifest field | effect |
|---|---|
| `omp.extensions` | omp loads `./gate-checker/index.ts`, `./omnipotence/index.ts`, and `./ask-questionnaire/index.ts` |
| `files` | the published package ships the three extension entries, `stop-slot.ts`, `ask-questionnaire/stop-decision.ts`, the gate-checker modules, the omnipotence modules, `docs/omnipotence-user-guide.md`, advisor setup and watchdog files, and the readme |

run `/advisor-install` to configure the native terra advisor; see the [terra advisor user guide](advisor-role-user-guide.md). see the [gates plugin user guide](gates-plugin-user-guide.md) for gate behavior.

sources: [`package.json`](../package.json#L37-L76), [manifest test](../plugin.test.ts)

## updates and removal

```sh
omp plugin install nikos-agent-stack@latest
omp plugin uninstall nikos-agent-stack
```

notes:

- the gate checker, questionnaire policy, and advisor setup use the same installed package version.
- removal stops the policy at the next start. an open request never survives a restart, because the state is in memory only.
- omp records the installed version and the enabled state in its own plugin manager state; that record is omp behavior, not package behavior.

sources: [state and reset handlers](../ask-questionnaire/index.ts#L72-L77), [`package.json`](../package.json#L37-L76)

## focused tests

the repository holds two focused test files. `package.json#files` does not publish them, so they stay in the source repository.

| file | coverage |
|---|---|
| [`ask-questionnaire/index.test.ts`](../ask-questionnaire/index.test.ts) | explicit declaration, owner conflict and same-owner retry, the read-only allowlist and blocking, reason injection, ask-result transitions, the exported stop decision, and the three lifecycle resets |
| [`plugin.test.ts`](../plugin.test.ts) | manifest surface, declared extension entries, file allowlist, and a runtime import that proves each declared entry exports a factory function |

the questionnaire test file contains no detector or input-source tests. the tests drive the extension through a fake extension api. they observe handler return values only, never internal state.

documented verification commands, for a maintainer to run in a clean checkout:

```sh
bun test ask-questionnaire/index.test.ts plugin.test.ts
bun run test
```

`bun run test` also runs the gate-checker unit tests and the wiring probe.

sources: [test harness](../ask-questionnaire/index.test.ts#L1-L50), [`package.json` scripts](../package.json#L78-L80)

## troubleshooting

### no questionnaire pressure appears

check in this order:

1. the plugin is loaded.
2. the model called `questionnaire_open` and the call returned `questionnaire armed by <owner>`.

no chat phrase and no input event can arm this module.

### every tool is blocked

a pending questionnaire blocks only tools outside the allowlist. `read`, `grep`, `glob`, `lsp`, `ast_grep`, `inspect_image`, `ask`, and `questionnaire_open` still work. a successful `ask` result or a session start, switch, or branch clears the pending questionnaire.

### blocking never stops

the questionnaire closes only on a successful ask result or a lifecycle reset. inspect one cause:

- each ask call returns an error, which keeps the questionnaire pending by design.

the read-only allowlist stays open while a questionnaire is pending, so an agent can still inspect the repository and retry the ask.

### the session keeps continuing at stop

a pending questionnaire supplies the continuation context and a successful `ask` ends it. gate-checker's completion decision runs first, so a stop can show gate guidance instead of the questionnaire reason when both need a continuation.

### the guidance is missing from the transcript

this is expected. the message uses `display: false` and enters model context only.

### the questionnaire looks different from another guide

the dialog belongs to the installed omp version. this package does not render it and cannot change it.

sources: [handlers](../ask-questionnaire/index.ts#L106-L143), [handler tests](../ask-questionnaire/index.test.ts#L159-L265)

## limitations

- the package contains no dialog, no preview renderer, no note editor, no timeout, no external editor, and no collaboration transport. every one of those belongs to native omp ask.
- the package changes no omp core file, controls no prompt queue, and forces no tool choice.
- one in-memory `{ owner, reason }` object holds the state and does not survive a reload.
- there is no text detector: only an explicit `questionnaire_open` call arms the policy.
- blocking exempts a fixed read-only allowlist plus `ask` and declaration retries.
- success means an ask result without an error. the extension does not check answer quality or answer count.
- the state is in memory. it does not persist across restarts, and the lifecycle handlers clear it.

sources: [extension scope comment](../ask-questionnaire/index.ts#L1-L16), [handlers](../ask-questionnaire/index.ts#L72-L143)

## source map

| path | contents |
|---|---|
| [`ask-questionnaire/index.ts#L23`](../ask-questionnaire/index.ts#L23) | guidance custom message type |
| [`ask-questionnaire/index.ts#L25-L36`](../ask-questionnaire/index.ts#L25-L36) | read-only tool allowlist |
| [`ask-questionnaire/index.ts#L40-L68`](../ask-questionnaire/index.ts#L40-L68) | event payload interfaces |
| [`ask-questionnaire/index.ts#L79-L104`](../ask-questionnaire/index.ts#L79-L104) | `questionnaire_open` tool registration |
| [`ask-questionnaire/index.ts#L114-L123`](../ask-questionnaire/index.ts#L114-L123) | reason injection |
| [`ask-questionnaire/index.ts#L133-L138`](../ask-questionnaire/index.ts#L133-L138) | ask-result clearing |
| [`ask-questionnaire/index.ts#L140-L143`](../ask-questionnaire/index.ts#L140-L143) | session lifecycle resets |
| [`ask-questionnaire/index.test.ts`](../ask-questionnaire/index.test.ts) | focused behavior tests |
| [`package.json`](../package.json) | extension entries, publish allowlist, and test script |
| [`plugin.test.ts`](../plugin.test.ts) | manifest and load-surface tests |
| [`ask-questionnaire/stop-decision.ts`](../ask-questionnaire/stop-decision.ts) | questionnaire slot installer, release helper, and exported decision |
| [`stop-slot.ts`](../stop-slot.ts) | independent write-once stop slots and the shared `StopDecision` type that the gate-checker owner calls |
