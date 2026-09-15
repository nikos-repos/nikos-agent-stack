# orchestrate prompt user guide

the orchestrate prompt is included in the `nikos-agent-stack` package plugin. install or link the package plugin; there is no separate component install.

## install

after this commit is released, install the published package:

```sh
omp plugin install nikos-agent-stack
```

until then, from the root of a clone of this repository, install dependencies and link the package plugin:

```sh
bun install
omp plugin link .
```

## remove the old standalone handler

if the old local standalone extension is present, install or link the package plugin first, then remove only the old standalone handler before restarting omp. removing it before the package is installed or linked can discard the customization before the replacement is ready, while leaving both handlers in place can duplicate orchestration.

with the default agent directory, remove only the original standalone handler:

```sh
rm ~/.omp/agent/extensions/orchestrate-prompt/index.ts
```

keep `~/.omp/agent/extensions/orchestrate-prompt/prompt.md`. the path is profile-scoped through `getAgentDir`; when a profile uses another agent directory, remove the corresponding original `extensions/orchestrate-prompt/index.ts` there instead. this task does not automate migration.

restart omp once after the install or link and handler cleanup.

do not launch the harness from an omp source checkout or rebuild omp.

## edit the prompt

the editable prompt path is:

```text
~/.omp/agent/extensions/orchestrate-prompt/prompt.md
```

this is the default path; the active profile's `getAgentDir` determines the effective agent directory. when the file is missing, the extension uses its built-in bundled `orchestrate-prompt/prompt.md` template.

create a custom prompt in an editor:

```sh
mkdir -p ~/.omp/agent/extensions/orchestrate-prompt
${EDITOR:-vi} ~/.omp/agent/extensions/orchestrate-prompt/prompt.md
```

or copy the bundled template from a repository clone without overwriting an existing customization:

```sh
mkdir -p ~/.omp/agent/extensions/orchestrate-prompt
cp -n orchestrate-prompt/prompt.md ~/.omp/agent/extensions/orchestrate-prompt/prompt.md
```

use the profile's agent directory in place of the default path when `getAgentDir` resolves elsewhere.

## activation

the extension handles a standalone, lowercase prose `orchestrate` request when the `task` tool, `magicKeywords.enabled`, and `magicKeywords.orchestrate` are all enabled. a literal inline-code mention such as `` `orchestrate` `` does not trigger the extension.

## prompt behavior

- `prompt.md` is reread for every model request, so edits apply on the next request.
- active-tool `Handlebars` templates are supported, and ordinary markdown remains valid.
- a missing file uses the bundled template; an empty file or a read or render error aborts orchestration rather than silently falling back.

for example, a plain markdown prompt can provide a brief useful system notice:

```md
<system-notice>
Keep orchestration focused on the user's request.
</system-notice>
```

existing context notices are replaced without mutating saved history. notices from older requests that remain in the current context are replaced as well.
