# ask questionnaire user guide

> a new-project policy extension for omp's native ask tool

## contents

- [what the extension does](#what-the-extension-does)
- [quick start](#quick-start)
- [native ask ownership](#native-ask-ownership)
- [new-project detection](#new-project-detection)
- [input sources that arm the policy](#input-sources-that-arm-the-policy)
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

it does four things:

1. it detects a direct new-project request in user input.
2. it injects short questionnaire guidance before the model call while that request is open.
3. it blocks every tool except `ask` while that request is open.
4. it clears the request after one successful `ask` result, and it asks for one continuation turn at session stop while the request stays open.

the plugin declares the extension entry in the package manifest, so omp loads it after installation.

sources: [`ask-questionnaire/index.ts`](../ask-questionnaire/index.ts#L1-L16), [`package.json`](../package.json#L35-L40)

## quick start

```sh
omp plugin install nikos-agent-stack
```

then start a session and send a direct new-project request:

```text
create a new cli tool for log triage
```

expected behavior:

| step | observable result |
|---|---|
| the request arrives | the extension marks one open request |
| the model turn starts | omp adds the guidance message to model context, not to the transcript |
| the model calls a tool that is not `ask` | omp blocks the call and returns the guidance as the reason |
| the model calls `ask` | the native ask dialog opens |
| the ask result returns without an error | the extension clears the request and omp allows every tool again |

sources: [event handlers](../ask-questionnaire/index.ts#L105-L152)

## native ask ownership

omp owns the ask tool. this package never renders, times out, or transports a questionnaire.

| surface | owner |
|---|---|
| ask input schema and validation | omp |
| questionnaire dialog, tabs, and keyboard controls | omp |
| custom answer row, notes, previews, and timeouts | omp |
| remote and collaboration answer routing | omp |
| new-project detection and tool gating | this extension |

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

## new-project detection

one exported regular expression decides the outcome. `initiatesNewProject(text)` returns its test result.

| part | accepted values |
|---|---|
| verb | `bootstrap`, `build`, `create`, `develop`, `initialize`, `make`, `scaffold`, `set up`, `start` |
| optional pronoun | `me`, `us` |
| optional article | `a`, `an`, `my`, `our` |
| optional freshness word | `new`, `brand new`, `brand-new` |
| optional filler | up to three words of letters, digits, `.`, `+`, `#`, or `-` |
| noun | `api`, `app`, `application`, `cli`, `codebase`, `dashboard`, `extension`, `library`, `package`, `plugin`, `project`, `repo`, `repository`, `service`, `site`, `tool`, `website` |

behavior details:

- the pattern uses the `i` and `u` flags, so it ignores case and supports unicode letters and digits.
- word boundaries surround the verb group and the noun.
- the pattern has no `g` flag and no anchors, so it is stateless and matches anywhere inside the text.

verified matches: `create a new app`, `build me a rest api`, `set up our brand new dashboard`, `scaffold a cli tool`, `initialize my website`, `start a new repository`.

verified non-matches: `read the readme and summarize it`, `fix the auth bug in login.ts`, `explain how the parser works`, empty text.

the detector reads text only. it has no intent model, so a sentence such as `set up a new logging package` arms the policy even when the user means a small change.

sources: [detector](../ask-questionnaire/index.ts#L20-L31), [detector tests](../ask-questionnaire/index.test.ts#L54-L68)

## input sources that arm the policy

the extension listens to omp's interactive-only `input` event. it checks the documented `source` field defensively, but rpc and headless requests do not emit this event and do not arm the policy.

| source | effect |
|---|---|
| `interactive` | detection runs |
| `extension` | the handler returns immediately and detection never runs |
| `rpc` or headless input | no `input` event; the policy does not arm |

this keeps extension-originated text, such as injected messages and steering prompts from other extensions, from arming the workflow.

sources: [omp input event contract](https://github.com/can1357/oh-my-pi/blob/main/packages/coding-agent/src/extensibility/extensions/types.ts#L851-L857), [input handler](../ask-questionnaire/index.ts#L105-L108), [source test](../ask-questionnaire/index.test.ts#L99-L105)

## guidance injection

while a request is open, the `before_agent_start` handler returns one message:

```text
this request starts a new project. call the ask tool now with one batched questionnaire before planning, editing, or using another tool.
```

| field | value |
|---|---|
| `customType` | `nikos-agent-stack.ask-questionnaire.guidance` |
| `display` | `false`, so the message stays out of the transcript |
| `attribution` | `agent` |

the handler returns nothing when no request is open. omp adds the message on every model turn while the request stays open.

sources: [guidance text](../ask-questionnaire/index.ts#L33-L39), [before_agent_start handler](../ask-questionnaire/index.ts#L110-L123), [injection test](../ask-questionnaire/index.test.ts#L109-L119)

## tool blocking

the `tool_call` handler applies one rule while a request is open:

- `ask` passes. the handler returns nothing.
- every other tool receives `{ block: true, reason: <guidance> }`.

there is no second allow list. read-only tools such as read, grep, and glob are blocked with the same rule. when no request is open, the handler returns nothing for every tool.

sources: [tool_call handler](../ask-questionnaire/index.ts#L125-L131), [blocking tests](../ask-questionnaire/index.test.ts#L72-L105)

## success and failure transitions

the `tool_result` handler clears the open request only for a successful ask result.

| result | tool name | `isError` | outcome |
|---|---|---|---|
| successful ask | `ask` | `false` | the request closes and every tool is allowed again |
| failed ask | `ask` | `true` | the request stays open and blocking continues |
| any other tool | not `ask` | any | the request stays open |

the extension treats an error-free return as success. it does not inspect answers, selected options, or custom input.

sources: [tool_result handler](../ask-questionnaire/index.ts#L133-L138), [transition tests](../ask-questionnaire/index.test.ts#L123-L153)

## lifecycle resets

three session events clear the open request:

- `session_start`
- `session_switch`
- `session_branch`

the state is one in-memory flag per loaded extension instance, so a context change or a restart never carries a stale request forward.

sources: [state and reset handlers](../ask-questionnaire/index.ts#L92-L100), [lifecycle registration](../ask-questionnaire/index.ts#L148-L151), [reset tests](../ask-questionnaire/index.test.ts#L185-L213)

## stop continuation

while a request stays open, the `session_stop` handler returns `{ continue: true, additionalContext: <guidance> }`. omp treats that return as a request for one continuation turn.

- the handler returns nothing after a successful ask result.
- the handler returns nothing when no request was armed.
- the handler does not read `stop_hook_active`, so it repeats the request at each stop while the request stays open. a successful ask ends the chain.

sources: [session_stop handler](../ask-questionnaire/index.ts#L140-L146), [stop tests](../ask-questionnaire/index.test.ts#L157-L181); omp `session_stop` contract in `@oh-my-pi/pi-coding-agent` 17.2.15, `src/extensibility/shared-events.ts`

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

- no omp source checkout.
- no `git am`, no patch file, and no pinned omp base commit.
- one restart, because omp discovers extensions at startup ([gates plugin user guide](gates-plugin-user-guide.md)).

the package manifest declares what omp loads:

| manifest field | effect |
|---|---|
| `omp.extensions` | omp loads `./gate-checker/index.ts` and `./ask-questionnaire/index.ts` |
| `files` | the published package ships the extension entries, the gate-checker modules, `agents/terra.md`, and the readme |

`agents/terra.md` installs through the plugin agent-discovery convention, so the terra advisor profile appears as an installed task agent. the gate checker keeps its existing behavior; see the [gates plugin user guide](gates-plugin-user-guide.md).

sources: [`package.json`](../package.json#L35-L58), [manifest test](../plugin.test.ts#L101-L126), [conversion plan](official-extension-plan.html)

## updates and removal

```sh
omp plugin install nikos-agent-stack@latest
omp plugin uninstall nikos-agent-stack
```

notes:

- an update replaces the whole plugin, so the gate checker, the questionnaire policy, and the terra profile move together.
- removal stops the policy at the next start. an open request never survives a restart, because the state is in memory only.
- omp records the installed version and the enabled state in its own plugin manager state; that record is omp behavior, not package behavior.

sources: [state and reset handlers](../ask-questionnaire/index.ts#L92-L100), [`package.json`](../package.json#L35-L58)

## focused tests

the repository holds two focused test files. `package.json#files` does not publish them, so they stay in the source repository.

| file | coverage |
|---|---|
| [`ask-questionnaire/index.test.ts`](../ask-questionnaire/index.test.ts) | detector matches and non-matches, arming from direct input, extension-source rejection, ask-only allowance, guidance injection, success and failure transitions, stop continuation, and the three lifecycle resets |
| [`plugin.test.ts`](../plugin.test.ts) | manifest surface, declared extension entries, file allowlist, absence of the old patch artifacts, and a runtime import that proves each declared entry exports a factory function |

the tests drive the extension through a fake extension api. they observe handler return values only, never internal state.

documented verification commands, for a maintainer to run in a clean checkout:

```sh
bun test ask-questionnaire/index.test.ts plugin.test.ts
bun run test
```

`bun run test` also runs the gate-checker unit tests, the embedded policy check, and the wiring probe.

sources: [test harness](../ask-questionnaire/index.test.ts#L1-L50), [`package.json` scripts](../package.json#L59-L61)

## troubleshooting

### no questionnaire pressure appears

check in this order:

1. the phrase matches the detector table above.
2. the text arrived through omp's interactive input event.
3. the plugin is installed and enabled, and omp restarted after installation.

the omp event contract fires `input` for interactive submissions, so a flow that never emits that event never arms the policy.

### every tool is blocked

one request is open. call the native `ask` tool, or start, switch, or branch the session to clear the state.

### blocking never stops

the request closes only on a successful ask result or a lifecycle reset. inspect two causes:

- the `ask` tool is not in the active tool set, so no successful ask result can arrive.
- each ask call returns an error, which keeps the request open by design.

### the session keeps continuing at stop

the same open request drives the continuation. a successful ask ends it.

### the guidance is missing from the transcript

this is expected. the message uses `display: false` and enters model context only.

### the questionnaire looks different from another guide

the dialog belongs to the installed omp version. this package does not render it and cannot change it.

sources: [handlers](../ask-questionnaire/index.ts#L105-L152)

## limitations

- the package contains no dialog, no preview renderer, no note editor, no timeout, no external editor, and no collaboration transport. every one of those belongs to native omp ask.
- the package changes no omp core file, controls no prompt queue, and forces no tool choice.
- one flag holds the state, so several new-project requests collapse into one requirement and one successful ask clears it.
- detection is a regular expression over raw text. it misses paraphrases outside the verb and noun lists and matches incidental phrases that use those words.
- blocking has no exception for read-only tools.
- success means an ask result without an error. the extension does not check answer quality or answer count.
- the state is in memory. it does not persist across restarts, and the lifecycle handlers clear it.

sources: [extension scope comment](../ask-questionnaire/index.ts#L1-L16), [handlers](../ask-questionnaire/index.ts#L92-L152)

## source map

| path | contents |
|---|---|
| [`ask-questionnaire/index.ts#L20-L31`](../ask-questionnaire/index.ts#L20-L31) | new-project detector and the exported `initiatesNewProject` helper |
| [`ask-questionnaire/index.ts#L33-L39`](../ask-questionnaire/index.ts#L33-L39) | guidance text and custom message type |
| [`ask-questionnaire/index.ts#L41-L88`](../ask-questionnaire/index.ts#L41-L88) | documented event payload and result shapes |
| [`ask-questionnaire/index.ts#L92-L108`](../ask-questionnaire/index.ts#L92-L108) | request state, reset helper, and input detection |
| [`ask-questionnaire/index.ts#L110-L131`](../ask-questionnaire/index.ts#L110-L131) | guidance injection and tool blocking |
| [`ask-questionnaire/index.ts#L133-L146`](../ask-questionnaire/index.ts#L133-L146) | ask result transitions and stop continuation |
| [`ask-questionnaire/index.ts#L148-L151`](../ask-questionnaire/index.ts#L148-L151) | session lifecycle resets |
| [`ask-questionnaire/index.test.ts`](../ask-questionnaire/index.test.ts) | focused behavior tests |
| [`package.json`](../package.json) | extension entries, publish allowlist, and test script |
| [`plugin.test.ts`](../plugin.test.ts) | manifest and load-surface tests |
| [`docs/official-extension-plan.html`](official-extension-plan.html) | plugin conversion scope and public-api boundary |
