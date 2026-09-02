# ask questionnaire user guide

> a phase-declared questionnaire policy extension for omp's native ask tool

## contents

- [purpose and ownership](#purpose-and-ownership)
- [quick start](#quick-start)
- [declaration](#declaration)
- [native ask fields](#native-ask-fields)
- [native ask ui and answers](#native-ask-ui-and-answers)
- [pending policy](#pending-policy)
- [outcomes](#outcomes)
- [lifecycle and stop continuation](#lifecycle-and-stop-continuation)
- [configuration](#configuration)
- [installation and package surface](#installation-and-package-surface)
- [troubleshooting](#troubleshooting)
- [limits and boundaries](#limits-and-boundaries)

## purpose and ownership

`ask-questionnaire` is one omp extension in the `nikos-agent-stack` plugin. it adds a policy gate around the native `ask` tool. it does not add an ask dialog, transport, prompt queue, or omp core change.

the extension owns:

- the explicit `questionnaire_open` declaration.
- one pending `{ owner, reason }` value.
- hidden guidance for the model while the value is pending.
- the closed tool allowlist while the value is pending.
- one stop continuation decision for gate-checker.

omp owns the native ask contract and ui. native omp handles question validation, option controls, custom input, notes, previews, timeout, notifications, speech, cancellation, and answer results. the extension reads only the native ask tool name and its `isError` result flag.

there is no questionnaire bin, package export, slash command, environment trigger, or extension setting. ordinary chat text does not open a questionnaire. only an executed `questionnaire_open` tool call can open one.

sources: [extension source](../ask-questionnaire/index.ts#L1-L143), [package manifest](../package.json#L26-L76), [native ask source](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/tools/ask.ts)

## quick start

1. install or link the plugin as described in [installation and package surface](#installation-and-package-surface).
2. restart omp so it discovers the extension.
3. let the model call `questionnaire_open` with the required `owner` and `reason` fields. omp marks this tool for `write` approval, so the call can require approval before it executes.
4. after a successful declaration, the model receives the hidden reason, and the extension blocks tools outside its allowlist.
5. the model calls native `ask` with one or more questions. answer, use custom input, or use the native chat redirect.
6. a non-error `ask` result closes the extension gate. omp then allows normal tool use again.

the extension does not start a questionnaire from the user message. it also cannot open the native dialog by itself.

## declaration

the registered tool name is exactly `questionnaire_open`. it requires two string fields:

```json
{
  "owner": "factory-discovery",
  "reason": "settle the project goal and constraints before work starts"
}
```

`owner` identifies the skill or phase that declares the questionnaire. `reason` explains what the interview must settle. the extension has no length bound for either string. it compares owner strings; `owner` is not a separate authentication or permission system.

the call has these results:

| situation | result |
|---|---|
| no questionnaire is pending | `questionnaire armed by <owner>` and one pending value is stored |
| the same owner calls again | `already open`; the original owner and reason stay unchanged |
| a different owner calls while pending | an error with `questionnaire already open for <existing-owner>`; the original value stays unchanged |

a declaration call that does not execute successfully does not arm the policy.

source: [declaration registration and results](../ask-questionnaire/index.ts#L72-L104)

## native ask fields

the native `ask` tool receives this shape. this is native omp behavior, not extension input:

```json
{
  "questions": [
    {
      "id": "auth_method",
      "question": "which authentication method should this api use?",
      "header": "auth",
      "options": [
        {
          "label": "jwt",
          "description": "bearer tokens for stateless clients.",
          "preview": "**jwt** uses bearer tokens."
        },
        {
          "label": "session cookies",
          "description": "browser-first authentication."
        }
      ],
      "multi": false,
      "recommended": 0
    }
  ]
}
```

the native schema requires:

- `questions`: an array with at least one item.
- each question's `id`, `question`, and `options` fields.
- each option's `label` field.

the native schema also accepts these optional fields:

- question `header`: a short display chip in a rich dialog.
- question `multi`: allow several option selections.
- question `recommended`: the numeric index of a recommended option.
- option `description`: explanatory text below the label.
- option `preview`: rich preview content for a rich dialog.

do not use these exact option labels because native ask reserves them for controls:

- `Other (type your own)`
- `Chat about this`
- `Next →`

the extension does not inspect `questions`, options, or answer content. native omp validates this schema and rejects invalid calls before they can produce a successful result.

source: [pinned native ask schema and result types](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/tools/ask.ts)

## native ask ui and answers

native ask requires an interactive omp session. when the session has no ui, omp does not create the ask tool. an attempted headless execution aborts with `Ask tool requires interactive mode`.

when the rich ask dialog is available:

- `header`, option `description`, and option `preview` are shown by native omp.
- `preview` supports rich markdown and fenced code rendering.
- `multi: true` uses multi-select controls. the dialog adds one global `Submit` tab when the form has more than one question or any question is multi-select, including a one-question multi-select form.
- submit warns about unanswered questions but still permits submission.
- tabs, review, scrolling, and keyboard hints are native dialog controls.
- `Other (type your own)` opens custom text input. empty custom text clears that answer. for a non-multi question, custom text replaces selected options.
- press `n` to open a note editor for an option or custom answer.
- `Chat about this` redirects the user to chat instead of returning an answer.

if rich ask ui is not available but omp has its interactive selector/editor fallback, native ask keeps selection, custom input, and notes. the fallback maps option labels and descriptions, but it drops `preview` content.

for a valid `recommended` index, native ask adds the exact suffix `(Recommended)` to that option. on timeout, the rich dialog keeps existing answers. for each unanswered question, it first uses the option referenced by an active option note; otherwise it clamps `recommended` to the available options and defaults to the first option when `recommended` is absent. the result marks the automatic choice with `timedOut: true`.

native result details can contain:

- one-question fields: `question`, `options`, `multi`, `selectedOptions`, optional `customInput`, optional `note`, and optional `timedOut`.
- multi-question `results`: one item per question, with `id`, `question`, `options`, `multi`, `selectedOptions`, and optional `customInput`, `note`, and `timedOut`.
- a chat redirect: `chatRedirect: true` and `questions` containing the surfaced question text.

source: [pinned native ask execution](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/tools/ask.ts)

## pending policy

after a successful declaration, the extension keeps one pending value in memory.

### hidden guidance

before every model turn while pending, the extension returns one hidden message:

| field | value |
|---|---|
| `customType` | `nikos-agent-stack.ask-questionnaire.guidance` |
| `content` | the declaration's `reason`, verbatim |
| `display` | `false`; the message is not shown in the transcript |

the message enters model context. it is not a user-visible ask message and does not add an extension-owned ui surface. when no questionnaire is pending, the handler returns nothing.

### tool allowlist

while pending, exactly these tools pass without an extension block:

`read`, `grep`, `glob`, `lsp`, `ast_grep`, `inspect_image`, `ask`, and `questionnaire_open`.

every other tool receives a block result with the declaration reason:

```json
{
  "block": true,
  "reason": "<the declaring reason>"
}
```

the allowlist is closed. `questionnaire_open` is allowed for retries, but it cannot create a second pending slot. with no pending value, the tool-call handler returns nothing.

source: [guidance and allowlist handlers](../ask-questionnaire/index.ts#L111-L131)

## outcomes

the extension closes its gate only when a native `ask` result has `toolName === "ask"` and `isError === false`.

| outcome | native behavior | extension state |
|---|---|---|
| normal answer | native returns selected options and any custom input or notes | pending state clears; all tools pass |
| timeout | the rich dialog keeps existing answers and fills each unanswered question from its noted option or the clamped `recommended` index, defaulting to the first option; result has `timedOut: true` | the non-error result clears pending state |
| chat redirect | rich ui returns `chatRedirect: true` and the surfaced `questions`; no answer selection is returned | this is still a non-error result, so pending state clears |
| schema or native error | native rejects invalid questions, reserved labels, or another invalid call | the ask result is an error; pending state stays open |
| cancel or abort | esc, an abort signal, or a cancelled native dialog raises a native ask abort error | no successful result clears the gate; pending state stays open |
| headless execution | native ask is unavailable or aborts with `Ask tool requires interactive mode` | pending state stays open |
| any non-`ask` result | another tool finishes or fails | pending state stays open |

the extension does not judge whether answers are useful, complete, or high quality. a native non-error result is enough to clear the gate.

source: [extension result handler](../ask-questionnaire/index.ts#L133-L138), [pinned native ask outcomes](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/tools/ask.ts)

## lifecycle and stop continuation

pending state is one in-memory `{ owner, reason }` object per loaded extension instance. these events clear it:

- `session_start`
- `session_switch`
- `session_branch`

the value does not persist in a session file, plugin state, or restart. a reload or process restart starts with no pending questionnaire.

the questionnaire module does not register its own `session_stop` handler. it installs one callback in the questionnaire stop slot and exports `questionnaireStop`. `stop-slot.ts` is write-once per owner: a duplicate install throws, `release()` removes the callback, and `decide()` returns `undefined` when no callback is installed.

gate-checker owns the package `session_stop` handler. at [the current stop chain](../gate-checker/index.ts#L1133), it evaluates completion, then questionnaire, then omnipotence. if completion returns nothing and a questionnaire is pending, the questionnaire decision returns:

```json
{
  "continue": true,
  "additionalContext": "<the declaring reason>"
}
```

omp treats this as one continuation turn. after a successful ask, or when no questionnaire is pending, the questionnaire decision returns nothing. if the completion decision returns a continuation first, the questionnaire decision does not replace it for that stop.

sources: [questionnaire stop installer](../ask-questionnaire/stop-decision.ts#L1-L9), [write-once stop slot](../stop-slot.ts#L1-L29), [questionnaire lifecycle handlers](../ask-questionnaire/index.ts#L140-L143)

## configuration

the extension has no configuration key. it reads no environment variable, config file, or omp setting.

native omp owns these related settings:

| setting | default | behavior |
|---|---|---|
| `ask.timeout` | `0` | timeout is disabled. a positive value is seconds. the settings ui offers disabled, 15, 30, 60, or 120 seconds. plan mode disables the timeout. |
| `ask.notify` | `"on"` | when on, native ask sends a terminal `Waiting for input` notification. `"off"` disables it. |
| `speech.enabled` | `false` | when true, native ask speaks the question text before showing the dialog. |

configure these keys through omp's normal settings mechanism. changing them changes native ask only; it does not change declaration, hidden guidance, the allowlist, or lifecycle state.

source: [pinned native settings schema](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/config/settings-schema.ts)

## installation and package surface

install the published plugin with omp:

```sh
omp plugin install nikos-agent-stack
```

for a local checkout, run this from the repository root:

```sh
omp plugin link .
```

the package requires bun `>=1.2.22`. restart omp after install or link because omp discovers extension entries at startup.

for package lifecycle operations, use:

```sh
omp plugin install nikos-agent-stack@latest
omp plugin uninstall nikos-agent-stack
```

the manifest exposes this package surface:

| manifest field | current behavior |
|---|---|
| `omp.extensions` | loads `./gate-checker/index.ts`, `./omnipotence/index.ts`, and `./ask-questionnaire/index.ts` |
| `files` | publishes `ask-questionnaire/index.ts`, `ask-questionnaire/stop-decision.ts`, and `stop-slot.ts` among the package files |
| `bin` | provides only `nikos-gates` and `omnipotence` |
| `exports` | provides only `./gate-cli` and `./omnipotence` |

`docs/ask-questionnaire-user-guide.md` is repository documentation. it is not in the published `files` list. there is no questionnaire-specific install command or published questionnaire executable.

source: [package manifest](../package.json#L26-L76)

## troubleshooting

### no questionnaire opens

- confirm the plugin is installed or linked, then restart omp.
- confirm the model executed `questionnaire_open` and the tool returned `questionnaire armed by <owner>`.
- approve the `write` tool request if omp asks for declaration approval.
- confirm the session has interactive ui. headless sessions cannot run native ask.
- inspect the native `questions` payload for missing required fields or reserved option labels.

chat text, a request phrase, rpc input, and a headless request do not arm this extension.

### tools are blocked

this is expected while pending for any tool outside the allowlist in [pending policy](#pending-policy). read-only inspection, `ask`, and declaration retries remain available.

### blocking continues after ask

an ask error or cancellation leaves pending state open. retry native ask with an interactive session and a valid payload. only a non-error ask result or one of the three lifecycle resets clears the gate.

### guidance is not visible in the transcript

this is expected. the extension sets `display` to `false`; the reason is hidden model context.

### timeout or automatic choice is unexpected

check `ask.timeout`, the current plan mode, the active option note, and the `recommended` index. the rich dialog keeps existing answers, then uses a noted option or the clamped recommendation for each unanswered question. timeout results include `timedOut: true`.

### no waiting notification or speech

check native `ask.notify` and `speech.enabled`. the defaults are `"on"` and `false`. these settings belong to omp, not this extension.

### the dialog does not show a preview

preview content is rendered only by the native rich ask dialog. the native fallback shows option labels and descriptions and drops `preview`.

### the session continues at stop

while pending, the questionnaire stop decision supplies the declaration reason as `additionalContext`. gate-checker's completion decision has precedence at the same stop.

## limits and boundaries

- the extension has one pending declaration per loaded instance. a second owner cannot replace it, and a same-owner retry cannot replace its reason.
- pending state is memory only. restart, reload, session start, session switch, and session branch clear it as described above.
- the allowlist is fixed and closed while pending. new or unlisted tools are blocked by default.
- native `questions` requires at least one item. the schema declares no maximum question count and no minimum option count.
- native option labels cannot use `Other (type your own)`, `Chat about this`, or `Next →` because native ui reserves them.
- native ask is exclusive. omp does not safely queue concurrent ask calls on the shared interactive surface.
- the extension does not validate answer quality, answer count, selected options, custom input, notes, timeout status, or chat redirect details.
- the extension owns no dialog, editor, preview renderer, timeout, notification, speech, transport, or collaboration answer route. those are native omp surfaces.
- rich native ui can render `preview`; the native fallback drops it.
- no text detector, request-text trigger, rpc trigger, headless trigger, questionnaire setting, questionnaire slash command, questionnaire bin, or questionnaire export exists in this package.

sources: [extension scope and handlers](../ask-questionnaire/index.ts#L1-L143), [pinned native ask source](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/tools/ask.ts), [pinned native settings](https://unpkg.com/@oh-my-pi/pi-coding-agent@17.2.15/src/config/settings-schema.ts)
