# n-code-mode user guide

n-code-mode is an OMP extension, a Claude Code plugin, and a command-line checker shipped inside the `nikos-agent-stack` repository. it carries one rule:

> write less code, and say more about the little you wrote. a contract earns its place when it lets you delete code, never when it narrates code.

it ships five parts:

| part | file | what it does |
| --- | --- | --- |
| OMP extension | `n-code-mode/index.ts` | runs `before_agent_start` and appends the concise Lazy Ladder (doctrine lines 1–14) to OMP's native `systemPrompt: string[]`; it does not inject Contracts |
| doctrine | `n-code-mode/doctrine.md` | the Lazy Ladder for OMP, plus the Contracts section still wired manually for Claude Code |
| checker | `n-code-mode/ncm.ts` | `ncm check` validates every `@cc` block in a repository; `ncm ledger` lists the ceilings |
| review skill | `n-code-mode/skills/review/SKILL.md` | separate Claude Code pass over a diff or path: deletions, contract violations, contracts to kill, and the ledger |
| contracts | `n-code-mode/CONTRACTS` | the plugin's own eight rules, checked by its own test |

The OMP extension uses a hook, but the Claude Code plugin does not: OMP receives the Lazy Ladder at `before_agent_start`; Claude Code still relies on manually wired doctrine. its standing OMP cost is the concise ladder, while the full doctrine and review skill remain separate Claude workflow pieces.

## install

### OMP extension

For the published package, install the OMP extension:

```sh
omp plugin install nikos-agent-stack
```

Start a new OMP session after installing or updating. `n-code-mode/index.ts` activates automatically at `before_agent_start`; it appends the concise Lazy Ladder to OMP's native `systemPrompt: string[]`. there is no separate activation command, and OMP does not receive the Claude-specific Contracts section.

For a local checkout, from the repository root use `omp plugin link .` instead. the same link makes the extension available to the next OMP session.

### command-line checker

From the root of a clone of this repository, expose the `ncm` command next to `omnipotence` and `nikos-gates`:

```sh
bun install
bun link
PATH="$(bun pm bin -g):$PATH" ncm --version
```

Without the link, run the checker directly with `bun n-code-mode/ncm.ts`.

### Claude Code plugin

Register the Claude plugin from the repository root. the plugin directory is its own marketplace:

```sh
claude plugin marketplace add ./n-code-mode
claude plugin install n-code-mode@n-code-mode
```

Installed plugins are copied into `~/.claude/plugins/cache`. after editing the repository, run `claude plugin update n-code-mode@n-code-mode`, or load the working copy for one session without installing:

```sh
claude --plugin-dir ./n-code-mode
```

`claude plugin validate n-code-mode` checks both manifests.

## Claude Code doctrine wiring

the OMP extension already appends the Lazy Ladder at `before_agent_start`; this section is only for Claude Code. Claude Code still loads doctrine through user memory, so wire both sections of `n-code-mode/doctrine.md` manually. the review skill and Contracts remain separate Claude workflow pieces. the two methods below were probed on Claude Code 2.1.278:

**paste it.** copy the two sections of `n-code-mode/doctrine.md` into `~/.claude/CLAUDE.md`. no dialogs, headless `-p` runs carry it, and re-pasting the doctrine when it changes is the maintenance. this is the recommended Claude wiring.

**import it.** add an import that points to your checkout's `n-code-mode/doctrine.md` (for example, `@<checkout>/n-code-mode/doctrine.md`) in `~/.claude/CLAUDE.md`. an import outside the current project directory is an external include: Claude Code asks once per project directory before loading it and records the answer in `~/.claude/.claude.json` under `hasClaudeMdExternalIncludesApproved`. a headless `-p` run in a project that has not approved it skips the import silently. use a project-local copy or paste when external-include approval is unavailable.

### Ponytail cutover and verification

Do not uninstall Ponytail as part of installation. In a fresh OMP session, inspect the effective system prompt for the n-code-mode Lazy Ladder segment; an agent answer alone cannot distinguish it from Ponytail while both are active. Once verified, disable Ponytail, start another session, and confirm the ladder remains before uninstalling it. Both injectors may contribute guidance during the overlap, so the OMP token cost has not been measured. Claude Code doctrine wiring remains separate.

## the grammar

a contract is one `@cc` directive followed by prose. the directive is code-contracts' grammar: `@cc [key:value,...] id`, where tokens contain no whitespace, commas, colons, or brackets. n-code-mode fixes two labels and requires a trailer for each:

| label | lives in | prose ends with | meaning |
| --- | --- | --- | --- |
| `rule` | a `CONTRACTS` file at the directory it governs | `deletes: <the code it makes unnecessary>` | a promise callers may rely on instead of writing a guard, a wrapper, or a dependency |
| `ceiling` | a comment beside a deliberate shortcut | `until: <the condition that ends it>` | a known limit with the trigger that retires it |

ids are unique across every `CONTRACTS` file in the repository, and unique per source file. a repository's `CLAUDE.md` imports its `CONTRACTS` file with a single `@CONTRACTS` line, so the rules are read on entering the repository without a reminder.

a rule in a `CONTRACTS` file:

```text
@cc [label:rule] validated-input
pipeline stages receive validated page objects and MUST NOT re-check required frontmatter fields.
deletes: the per-stage None guards on frontmatter fields.
```

a ceiling in python, c#, typescript, and html. the checker reads comment text, so any comment style works:

```python
# @cc [label:ceiling] all-pairs-dedup
# all-pairs comparison over block ids.
# until: more than ~5,000 blocks. then banded lsh.
```

```csharp
// @cc [label:ceiling] single-series
// assumes BarsArray[0] only.
// until: a second data series is added; then guard on BarsInProgress.
```

```typescript
/**
 * @cc [label:rule] trusted-caller
 * callers pass validated input.
 * deletes: the argument guards in every caller.
 */
```

```html
<!-- @cc [label:ceiling] fake-submit
the demo status fakes success.
until: a backend exists. -->
```

## ncm

```text
ncm check [path]    validate every @cc block under path (default: the current directory)
ncm ledger [path]   list every ceiling under path with its until: condition
```

`check` prints one `path:line: message` per finding and exits 1 when there are any, 0 when clean. `ledger` prints `path:line`, the id, and the `until:` text separated by tabs, and exits 0. exit code 2 means a usage or environment error. paths print relative to the repository root.

`check` reports:

- an invalid directive
- a label other than `rule` or `ceiling`, or no label
- a missing prose body
- a rule without a `deletes:` last line, a ceiling without an `until:` last line
- a duplicate id inside a file, or across `CONTRACTS` files

it scans the text files in which `git grep --untracked` finds `@cc`, tracked and untracked but not ignored, so it needs a git repository. git skips binaries and never enters a nested repository. `ncm` also skips markdown, because examples in documentation are not declarations. it does not judge prose and does not verify that code complies; the review skill does that.

## review

```text
/n-code-mode:review
/n-code-mode:review path/to/dir
```

without a path the skill reviews the current task's changes against the branch base. with a path it audits that path in full. it runs `ncm check` first and prints the output verbatim, then reads:

1. deletions, one line each, tagged `delete:`, `stdlib:`, `native:`, `yagni:`, or `shrink:`
2. contract violations, `violates <id>` with the contract's location and evidence
3. hygiene, `kill: <id>` for a contract that names nothing real and `expired: <id>` for a ceiling whose trigger has fired
4. the ceiling ledger, for a path scope

it closes with `net: -<N> lines. <V> violations. <K> to kill, <E> expired.` or `lean and compliant. ship.` it lists and applies nothing. correctness, security, and performance belong to `/code-review`.

## what it replaces

- the OMP extension replaces manual Lazy Ladder wiring for OMP only; it does not inject Contracts and does not replace the separate Claude Code review skill.
- any comparison with Ponytail's token cost is an estimate from a different setup, not an OMP measurement. actual OMP cost depends on prompt serialization and the active model; measure it in your own environment if it matters.
- Ponytail's `review`, `audit`, and `debt` skills are still a separate concern; n-code-mode's Claude review skill consolidates that review workflow with a scope argument.
- `cc-check` from code-contracts. its `list` command cannot produce a ledger, its published package depends on pyright and a typescript language server, it pins node 24, and the repository carries no license. `ncm` keeps the directive grammar so the two formats stay compatible on the line that matters.

## boundaries

- `ncm` validates form, not truth. a contract can be well-formed and wrong.
- the labels and trailers are fixed. `owner` and `notify` attributes parse but mean nothing here.
- scan time follows the size of the untracked tree, because `--untracked` walks it. a repository carrying hundreds of thousands of unignored scratch files takes about a minute; ignore the scratch tree or pass the directory you are reviewing as the path. a path that holds a `CONTRACTS` file walks the tree a second time to find every other `CONTRACTS` file, so its ids stay unique repository-wide.
- ceiling comments must be a comment block on their own: the directive line and its prose, ending at the first non-comment or blank comment line.
- OMP injection has no separate stop command; disable the n-code-mode extension only when you intend to remove its ladder. In Claude Code, say so in the conversation when a task should skip the ladder.
