# n-code-mode user guide

n-code-mode is a claude code plugin and a command-line checker shipped inside the `nikos-agent-stack` repository. it carries one rule:

> write less code, and say more about the little you wrote. a contract earns its place when it lets you delete code, never when it narrates code.

it ships four parts:

| part | file | what it does |
| --- | --- | --- |
| doctrine | `n-code-mode/doctrine.md` | the lazy ladder and the contract rules, carried by `~/.claude/CLAUDE.md` so every session and subagent has them |
| checker | `n-code-mode/ncm.ts` | `ncm check` validates every `@cc` block in a repository; `ncm ledger` lists the ceilings |
| review skill | `n-code-mode/skills/review/SKILL.md` | one pass over a diff or a path: deletions, contract violations, contracts to kill, the ledger |
| contracts | `n-code-mode/CONTRACTS` | the plugin's own eight rules, checked by its own test |

the plugin registers no hooks and adds no session-start injection. its standing cost is the doctrine block plus one skill description.

## install

from the root of a clone of this repository, expose the `ncm` command next to `omnipotence` and `nikos-gates`:

```sh
bun install
bun link
PATH="$(bun pm bin -g):$PATH" ncm --version
```

without the link, run the checker directly with `bun n-code-mode/ncm.ts`.

register the plugin from the same clone. the plugin directory is its own marketplace:

```sh
claude plugin marketplace add /home/niko/nikos-agent-stack/n-code-mode
claude plugin install n-code-mode@n-code-mode
```

installed plugins are copied into `~/.claude/plugins/cache`. after editing the repository, run `claude plugin update n-code-mode@n-code-mode`, or load the working copy for one session without installing:

```sh
claude --plugin-dir /home/niko/nikos-agent-stack/n-code-mode
```

`claude plugin validate n-code-mode` checks both manifests.

## wire the doctrine

the doctrine is not injected by a hook. it rides in your user memory, which claude code loads into every session and passes to every subagent. two ways to get it there, both probed on claude code 2.1.278:

**paste it.** copy the two sections of `n-code-mode/doctrine.md` into `~/.claude/CLAUDE.md`. no dialogs, headless `-p` runs carry it, and re-pasting a 24-line block when the doctrine changes is the whole maintenance. this is the recommended wiring.

**import it.** add `@~/nikos-agent-stack/n-code-mode/doctrine.md` to `~/.claude/CLAUDE.md`. an import that resolves outside the current project directory is an external include: claude code asks once per project directory before loading it and records the answer in `~/.claude/.claude.json` under `hasClaudeMdExternalIncludesApproved`. a headless `-p` run in a project that has not approved it skips the import silently. the probes: a relative or absolute import inside the project loads; an import outside the project loads in no `-p` run, whether written with `~/`, given `--add-dir`, or reached through a symlink.

either way, then retire the ponytail plugin, whose session-start hook the doctrine replaces. in `~/.claude/settings.json` set `"ponytail@ponytail": false` under `enabledPlugins`, and remove the `statusLine` entry that points into the ponytail plugin cache. measure the result once with `~/.claude/ctx.sh -q`.

## the grammar

a contract is one `@cc` directive followed by prose. the directive is code-contracts' grammar: `@cc [key:value,...] id`, where tokens contain no whitespace, commas, colons, or brackets. n-code-mode fixes two labels and requires a trailer for each:

| label | lives in | prose ends with | meaning |
| --- | --- | --- | --- |
| `rule` | a `CONTRACTS` file at the directory it governs | `deletes: <the code it makes unnecessary>` | a promise callers may rely on instead of writing a guard, a wrapper, or a dependency |
| `ceiling` | a comment beside a deliberate shortcut | `until: <the condition that ends it>` | a known limit with the trigger that retires it |

a `CONTRACTS` file holds at most 12 contracts. ids are unique across every `CONTRACTS` file in the repository, and unique per source file. a repository's `CLAUDE.md` imports its `CONTRACTS` file with a single `@CONTRACTS` line, so the rules are read on entering the repository without a reminder.

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
- a `CONTRACTS` file holding more than 12 contracts

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

- the ponytail session-start hook, measured at 1,893 tokens per session on this machine and repeated into every subagent. the doctrine import carries the ladder at roughly a quarter of that and reaches subagents natively.
- ponytail's `review`, `audit`, and `debt` skills, merged into one skill with a scope argument.
- `cc-check` from code-contracts. its `list` command cannot produce a ledger, its published package depends on pyright and a typescript language server, it pins node 24, and the repository carries no license. `ncm` keeps the directive grammar so the two formats stay compatible on the line that matters.

## boundaries

- `ncm` validates form, not truth. a contract can be well-formed and wrong.
- the labels and trailers are fixed. `owner` and `notify` attributes parse but mean nothing here.
- the budget is the `budget` constant in `n-code-mode/ncm.ts`. raise it when a real thirteenth contract earns its place.
- scan time follows the size of the untracked tree, because `--untracked` walks it. a repository carrying hundreds of thousands of unignored scratch files takes about a minute; ignore the scratch tree or pass the directory you are reviewing as the path. a path that holds a `CONTRACTS` file walks the tree a second time to find every other `CONTRACTS` file, so its ids stay unique repository-wide.
- ceiling comments must be a comment block on their own: the directive line and its prose, ending at the first non-comment or blank comment line.
- the doctrine import replaces the ponytail off-switch. there is no `stop` command; say so in the conversation when a task should skip the ladder.
