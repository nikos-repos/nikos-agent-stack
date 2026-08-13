# ask questionnaire user guide

> native omp questionnaires for structured decisions and new-project intake

## contents

- [what the package does](#what-the-package-does)
- [quick start](#quick-start)
- [compatibility contract](#compatibility-contract)
- [ask tool schema](#ask-tool-schema)
- [question and option fields](#question-and-option-fields)
- [rich dialog behavior](#rich-dialog-behavior)
- [keyboard controls](#keyboard-controls)
- [custom answers](#custom-answers)
- [notes](#notes)
- [descriptions and previews](#descriptions-and-previews)
- [single-select and multi-select](#single-select-and-multi-select)
- [recommended options](#recommended-options)
- [timeouts](#timeouts)
- [notifications and speech](#notifications-and-speech)
- [automatic new-project questionnaire](#automatic-new-project-questionnaire)
- [queued prompts and retries](#queued-prompts-and-retries)
- [collaboration and remote guests](#collaboration-and-remote-guests)
- [cancellation and external editors](#cancellation-and-external-editors)
- [results and transcripts](#results-and-transcripts)
- [installation](#installation)
- [removal and updates](#removal-and-updates)
- [verification](#verification)
- [troubleshooting](#troubleshooting)
- [source map](#source-map)

## what the package does

`ask-questionnaire` is a git format-patch for omp core. it is not an omp extension and it is not discovered from an extension directory.

installing the patch adds one integrated questionnaire workflow across the agent loop, coding-agent session, terminal dialog, collaboration transport, external editor, prompt guidance, and focused tests.

its main behaviors are:

1. one `ask` call can contain one or more related questions.
2. each question can show labels, descriptions, rich previews, a recommended choice, and an optional short header.
3. users can select one answer, select several answers, or type a custom answer.
4. users can attach a note to an option before submission.
5. new-project requests require one batched questionnaire before planning, editing, or another tool call.
6. local and remote participants use the same answer model for normal choices, custom answers, and multi-select answers.
7. cancellation propagates through the dialog and stops an active external-editor process tree.

source: [packaged patch](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch); source commit: `0613b2d898d082bfdde979160af30c4775053f85`

## quick start

### confirm the target base

run this in the omp source checkout:

```sh
git rev-parse HEAD
```

supported result:

```text
06aecdd51f07e689e970ceaa180abe2be0c14bbb
```

### apply the package

from the omp source checkout:

```sh
git am /path/to/nikos-agent-stack/ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch
```

### verify the installed commit

```sh
git show --stat --oneline HEAD
```

expect one commit named `feat(ask): add questionnaire workflow` with 13 changed paths.

source: [format-patch metadata and changed-path summary](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L1-L21)

## compatibility contract

| item | supported value |
|---|---|
| upstream repository | `can1357/oh-my-pi` |
| required base commit | `06aecdd51f07e689e970ceaa180abe2be0c14bbb` |
| packaged source commit | `0613b2d898d082bfdde979160af30c4775053f85` |
| installation method | `git am` |
| package form | one git format-patch |
| extension discovery | not applicable |

apply the patch to the required base. later upstream commits can change the same agent-loop, session, dialog, or test surfaces and can cause conflicts or invalid behavior even when `git am` finds a textual match.

source: [patch metadata](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L1-L23)

## ask tool schema

an `ask` call has one required `questions` array. the array must contain at least one question.

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
          "preview": "```text\nauthorization: bearer <token>\n```"
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

runtime-owned navigation labels are reserved and cannot be used as authored option labels. the schema rejects collisions before the dialog opens.

source: [ask schema, validation, and result types](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L815-L854)

## question and option fields

### question fields

| field | required | meaning |
|---|---:|---|
| `id` | yes | stable result identifier |
| `question` | yes | complete question shown to the user |
| `options` | yes | available authored choices |
| `header` | no | short tab chip; long values are truncated |
| `multi` | no | enables selection of several authored choices |
| `recommended` | no | zero-based index of the preferred option |

### option fields

| field | required | meaning |
|---|---:|---|
| `label` | yes | choice text and returned selected value |
| `description` | no | short explanation below the label |
| `preview` | no | markdown and fenced-code content shown in the rich local dialog |

keep labels concise. put trade-offs in `description` and detailed examples in `preview`.

sources: [schema additions](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L815-L854), [rich dialog rendering](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

## rich dialog behavior

for one question, the dialog shows the question and its answer rows. selecting a single option or submitting a custom answer completes the dialog.

for several questions, the dialog adds one tab per question and a final submit tab. the submit tab reviews all answers before final submission. tab labels use `header`, then `id`, then a generated question number.

the panel:

- targets 70 percent of terminal height, with a 12-row minimum for usability.
- keeps a stable height while the user moves between tabs and rows.
- scrolls content that exceeds the panel.
- limits long question headings so answer rows remain visible.
- shows radio markers for single-select questions and checkbox markers for multi-select questions.
- appends its custom-answer row automatically.

source: [rich ask dialog](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

## keyboard controls

| context | control | action |
|---|---|---|
| answer list | `up` or `down` | move between rows |
| answer list | `page up` or `page down` | scroll a long row or preview |
| single-select | `enter` | choose the row and advance or submit |
| multi-select | `space` | toggle the selected row |
| multi-select | `enter` on next | advance to the next question |
| any option | `n` | add or edit a note for that option |
| tabbed dialog | `tab` or reverse tab | move between question and submit tabs |
| custom answer | normal typing | edit the inline answer |
| custom answer | `enter` | submit the answer and advance |
| custom answer | `shift+enter` | add a new line |
| custom answer | `ctrl+u` | clear the inline answer |
| custom answer | `ctrl+g` | edit the answer in the configured external editor |
| dialog | `ctrl+]` | collapse or expand the panel |
| dialog | configured cancel key | cancel the questionnaire |
| submit tab | `enter` | submit all reviewed answers |

input resets an active timeout countdown. when a normal prompt draft already contains text, the draft keeps input ownership until the user submits or clears it.
tab switching is available for multiple questions and for one multi-select question. while the custom-answer row owns input, leave that row before using tab navigation.

source: [dialog input and control handling](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

## custom answers

every question gets one inline custom-answer row at runtime. authors must not add a duplicate custom option.

when the custom row is active:

- typed content renders inside the answer list.
- multiline content wraps with a visible insertion cursor.
- selecting or typing a custom answer clears authored option selections for that question.
- selecting an authored option clears the submitted custom answer.
- the external editor can replace the current inline content without changing its raw multiline form.

source: [inline input renderer and dialog integration](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L488-L634)

## notes

press `n` on an authored option to open a small note editor. the note is attached to that option and appears in the review and tool result.

moving the answer to a different row clears a note that no longer belongs to the submitted answer. a question stores one submitted note.

source: [note state and prompt behavior](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

## descriptions and previews

`description` renders below its option label and is limited to two visible lines in the rich dialog.

`preview` accepts markdown plus fenced code blocks. the local dialog renders markdown and syntax-highlighted code under the option. previews are cached by width so repeated renders do not reparse unchanged content.

remote guest selectors receive labels and descriptions. preview content and local option notes do not cross the current collaboration wire.

sources: [preview rendering](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487), [collaboration adapter](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L529-L634)

## single-select and multi-select

### single-select

- uses radio markers.
- one authored choice replaces the previous choice.
- selecting an authored choice advances immediately.
- submitting a custom answer also advances immediately.

### multi-select

- uses checkbox markers.
- `space` toggles choices without leaving the question.
- the next row remains available so the user can advance with no authored selection, one selection, several selections, or a custom answer.
- a custom answer replaces authored selections for that question.

source: [selection state and controls](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

## recommended options

set `recommended` to a zero-based option index. the runtime:

- starts the cursor on that option.
- adds a recommended suffix to its display label.
- removes the display suffix before returning the authored label.
- uses the option as the timeout fallback for an unanswered question.

an invalid recommendation does not create a new choice. use a valid index to keep cursor and timeout behavior deterministic.

sources: [recommended display and selection logic](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487), [ask runtime helpers](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L815-L927)

## timeouts

`ask.timeout` controls the waiting period in seconds. zero disables the timeout. plan mode disables ask timeouts even when the setting has a positive value.

when time expires:

1. answers already supplied remain unchanged.
2. each unanswered question selects its noted option when one exists.
3. otherwise it selects the recommended option.
4. otherwise it selects the first option.
5. the result records `timedOut: true` and the transcript identifies the answer as an automatic choice, not a user choice.

opening a note prompt or external editor defers timeout completion until that nested editor closes. normal dialog input resets the countdown.

source: [timeout handling and transcript state](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

## notifications and speech

when `ask.notify` is enabled, omp sends a terminal notification that input is waiting. when `speech.enabled` is enabled, omp speaks all question text before opening the dialog.

these settings do not change the returned answer model.

source: [ask execution path](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L815-L927)

## automatic new-project questionnaire

omp detects direct requests that start a new api, application, cli, codebase, dashboard, extension, library, package, plugin, project, repository, service, site, tool, or website.

when the `ask` tool is active and the request has no explicit tool choice, the session creates a soft requirement for `ask`. the model receives this instruction:

```text
this request starts a new project. call the ask tool now with one batched questionnaire before planning, editing, or using another tool.
```

one successful `ask` execution satisfies that request. a failed ask keeps the requirement active and assigns a new requirement id. synthetic prompts do not start the workflow.

the requirement runs before eager todo, task, or external-thinking preludes. this keeps the questionnaire as the first project action.

source: [new-project detection and enforcement](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L654-L814)

## queued prompts and retries

new-project detection also applies to user messages queued while the agent is streaming.

for steering and follow-up queues:

- the session marks each matching user message.
- the agent dequeues only the queue head when a marked message exists.
- each marked new-project request gets its own questionnaire requirement.
- mixed normal and new-project messages keep their queue order.
- all-mode follow-up processing does not merge separate project questionnaires.
- a failed or aborted ask does not permit the project request to continue through another tool.

source: [queue hooks and session tests](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L23-L106)

## collaboration and remote guests

when a collaboration host exists, omp races the local dialog against the remote guest request. the first valid result wins, and omp aborts the other surface.

remote guests can:

- select one authored option.
- toggle several options.
- enter a custom answer.
- advance a multi-select question with the next row.
- redirect to chat instead of answering.
- cancel the request.

remote selectors carry labels and descriptions. they do not carry rich preview content or local notes in this patch.

source: [collaboration-aware ask flow](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L529-L634)

## cancellation and external editors

cancelling the rich dialog aborts the ask tool instead of returning an empty answer as a successful result.

`ctrl+g` uses the editor selected by `$VISUAL`, then `$EDITOR`. windows falls back to notepad; posix requires one of the environment variables. on a dialog abort:

- a pre-aborted request does not launch the editor.
- posix launches the editor in a detached process group and terminates the full group.
- windows uses the system process-tree termination command.
- the temporary editor file is removed in a final cleanup step.

this prevents a shell wrapper or editor child from remaining alive after the questionnaire closes.

sources: [dialog and editor integration](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L529-L634), [external-editor cancellation](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L855-L927)

## results and transcripts

single-question results expose:

- question text.
- authored option labels.
- single-select or multi-select mode.
- selected authored labels.
- custom input when supplied.
- note when supplied.
- timeout attribution.

multi-question results return the same fields in a `results` array keyed by each question `id`.

transcript rendering shows every offered option with its selection marker, then the custom answer and note. automatic timeout answers get an explicit warning line. chat redirects list the questions without claiming that the user selected an answer.

persisted ask arguments are revalidated before `/tree` re-answer. malformed historical arguments fail closed instead of reopening a broken dialog.

source: [ask result and transcript renderer](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L815-L927)

## installation

### supported installation

```sh
cd /path/to/oh-my-pi
git status --short
git rev-parse HEAD
git am /path/to/nikos-agent-stack/ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch
```

requirements:

- the checkout is the `can1357/oh-my-pi` repository.
- `HEAD` is `06aecdd51f07e689e970ceaa180abe2be0c14bbb`.
- the working tree and index are clean.
- no other `git am` operation is active.

### conflict recovery

if `git am` reports a conflict, abort the operation rather than guessing at a partial port:

```sh
git am --abort
```

move the target checkout to the supported base or port the source commit as a new reviewed change.

source: [packaged patch](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch)

## removal and updates

### remove an installed patch

identify the local commit created by `git am`, then revert it:

```sh
git log --oneline -5
git revert <installed-commit>
```

use `git reset` only for an unpublished local branch where discarding the commit is intentional.

### update the package

this package is bound to one upstream base. do not apply it twice and do not assume it can be replayed safely on a later omp revision.

for a new upstream base:

1. port the behavior in the omp source repository.
2. run the affected tests and type checks there.
3. create one reviewed source commit.
4. export a new format-patch.
5. replace the package only after a clean-base application produces the same tree as the reviewed source commit.
6. update this guide with the new base and source commit ids.

source: [patch metadata](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L1-L23)

## verification

### package integrity

from this repository:

```sh
sha256sum ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch
```

expected digest:

```text
2eb22e030d582d1429e57dbcd1f87a6056ef2111a95dae76d550ae2b03d89c2d
```

### focused source verification

run after installation in the omp source checkout:

```sh
bun test packages/agent/test/agent.test.ts packages/coding-agent/test/agent-session-force-tool-choice.test.ts packages/coding-agent/test/modes/components/ask-dialog.test.ts packages/coding-agent/test/tools/ask.test.ts packages/coding-agent/test/modes/controllers/extension-ui-controller.test.ts packages/coding-agent/test/collab/guest-ui-request.test.ts packages/coding-agent/test/external-editor.test.ts
bun --cwd=packages/agent run check:types
bun --cwd=packages/coding-agent run check:types
```

these checks cover queue hooks, new-project enforcement, rich dialog behavior, ask result behavior, collaboration transport, external-editor cancellation, and both affected package type surfaces.

source: [focused tests in the packaged patch](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L928-L2130)

## troubleshooting

### `git am` reports that the patch does not apply

cause: the checkout is not at the required base, the tree is not clean, or overlapping changes already exist.

resolution:

```sh
git am --abort
git rev-parse HEAD
git status --short
```

use base `06aecdd51f07e689e970ceaa180abe2be0c14bbb` and retry from a clean tree.

### the ask tool is unavailable

cause: the session has no interactive ui, or the active tool set excludes `ask`.

resolution: run omp in interactive mode and enable the native ask tool. headless execution intentionally aborts instead of fabricating an answer.

### no questionnaire appears for a new project

check that:

- the request is a direct, non-synthetic user prompt.
- the request asks to bootstrap, build, create, develop, initialize, make, scaffold, set up, or start a recognized project type.
- no caller supplied an explicit tool choice.
- `ask` is active in the current tool set.

source: [new-project detector and activation checks](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L654-L814)

### the custom-answer external editor does not open

set `$VISUAL` or `$EDITOR` to a valid command. omp shows a warning when neither variable resolves to an editor on posix.

source: [external-editor integration](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L529-L634)

### the questionnaire selects an answer without user input

check `ask.timeout`. a positive value enables automatic selection outside plan mode. the transcript marks the answer as timed out.

source: [timeout behavior](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487)

### a remote guest does not see a preview or note control

this is the current wire contract. remote guests receive selection labels and descriptions plus normal, custom, next, chat, and cancel actions. rich previews and local notes remain local-only.

source: [collaboration adapter](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L529-L634)

## source map

| patch range | installed area |
|---|---|
| [agent queue hook](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L23-L106) | queue-kind-aware pre-dequeue behavior |
| [rich dialog](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L107-L487) | tabs, controls, notes, previews, custom input, timeout, and review |
| [inline input renderer](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L488-L528) | wrapped custom-answer text and cursor rendering |
| [collaboration controller](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L529-L634) | local and remote questionnaire routing |
| [tool guidance](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L635-L653) | model-facing batching and custom-answer rules |
| [agent session](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L654-L814) | new-project detection, requirement lifecycle, and queued prompts |
| [ask tool](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L815-L854) | schema and reserved labels |
| [external editor](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L855-L927) | abort propagation and process-tree cleanup |
| [focused tests](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch#L928-L2130) | behavior and regression coverage |

source commit: `0613b2d898d082bfdde979160af30c4775053f85`; distributable source: [packaged patch](../ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch)
