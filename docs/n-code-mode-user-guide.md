# n-code-mode user guide

n-code-mode is an OMP extension, a Claude Code plugin, and a command-line checker shipped inside the `nikos-agent-stack` repository. it follows this contract admission rule:

> write less code, and say more about the little you wrote. a contract states what the code can't show at a glance: what callers may rely on, what the code assumes but doesn't check, a boundary, or a shortcut with an exit. never restate the implementation.

it ships six parts:

| part | file | what it does |
| --- | --- | --- |
| OMP extension | `n-code-mode/index.ts` | appends the whole doctrine at `before_agent_start`, registers the `ncm` tool, and appends findings plus governing contracts to successful edit/write results |
| doctrine | `n-code-mode/doctrine.md` | the Lazy Ladder and the Contracts rules; OMP injects it, Claude Code wires it manually |
| checker | `n-code-mode/ncm.ts` | `ncm check` validates `@cc` blocks; `ncm list` shows governing contracts; `ncm ledger` lists ceilings |
| Claude Code Stop hook | `n-code-mode/hooks/hooks.json` and `n-code-mode/hooks/stop.ts` | blocks a stop when changed files contain contract findings |
| review skill | `n-code-mode/skills/review/SKILL.md` | separate Claude Code pass over a diff or path: deletions, contract violations, contracts to kill, and the ledger |
| contracts | `n-code-mode/ncm.ts` and `n-code-mode/ncm.test.ts` | the plugin's own specifications on its checker and fixture, checked by its own test |

The OMP extension injects doctrine, offers a tool, and appends edit/write notices; the Claude Code plugin registers one Stop hook instead of using those OMP hooks. Claude Code loads the same doctrine from manually wired user memory. both hosts carry the same text. the review skill is Claude Code only.

## install

### OMP extension

For the published package, install the OMP extension:

```sh
omp plugin install nikos-agent-stack
```

Start a new OMP session after installing or updating. `n-code-mode/index.ts` activates automatically at `before_agent_start`; it appends the whole doctrine to OMP's native `systemPrompt: string[]`, registers the `ncm` tool, and appends findings plus governing contracts to successful edit/write results. there is no separate activation command.

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

the plugin's Stop hook checks changed tracked and untracked, unignored files for contract findings. findings make it exit 2 so Claude keeps working; it blocks at most once per stop cycle. `bun` must be on PATH.

## Claude Code doctrine wiring

the OMP extension already appends the doctrine at `before_agent_start`; this section is only for Claude Code. Claude Code loads doctrine through user memory, so wire both sections of `n-code-mode/doctrine.md` manually. the review skill is Claude Code only. the two methods below were probed on Claude Code 2.1.278:

**paste it.** copy the two sections of `n-code-mode/doctrine.md` into `~/.claude/CLAUDE.md`. no dialogs, headless `-p` runs carry it, and re-pasting the doctrine when it changes is the maintenance. this is the recommended Claude wiring.

**import it.** add an import that points to your checkout's `n-code-mode/doctrine.md` (for example, `@<checkout>/n-code-mode/doctrine.md`) in `~/.claude/CLAUDE.md`. an import outside the current project directory is an external include: Claude Code asks once per project directory before loading it and records the answer in `~/.claude/.claude.json` under `hasClaudeMdExternalIncludesApproved`. a headless `-p` run in a project that has not approved it skips the import silently. use a project-local copy or paste when external-include approval is unavailable.

### Ponytail cutover and verification

Do not uninstall Ponytail as part of installation. In a fresh OMP session, inspect the effective system prompt for the n-code-mode doctrine segment; an agent answer alone cannot distinguish it from Ponytail while both are active. Once verified, disable Ponytail, start another session, and confirm the doctrine remains before uninstalling it. Both injectors may contribute guidance during the overlap, so the OMP token cost has not been measured. Claude Code doctrine wiring remains separate.

## the grammar

a contract is one `@cc` directive followed by prose. the directive is code-contracts' grammar: `@cc [key:value,...] id`, where tokens contain no whitespace, commas, colons, or brackets. n-code-mode fixes four labels; only ceilings require an ending:

| label | where it lives | required ending | meaning |
| --- | --- | --- | --- |
| `product` | a declaration's doc comment | none | behavior callers rely on: preconditions, postconditions, invariants |
| `security` | a declaration's doc comment or directory-wide `CONTRACTS` | none | trust and data-handling assumptions |
| `architecture` | a declaration's doc comment or directory-wide `CONTRACTS` | none | boundaries and dependencies |
| `ceiling` | the shortcut's declaration doc comment | `until: <the condition that ends it>` | a deliberate shortcut with an exit |

ids are unique across every `CONTRACTS` file in the repository, and unique per source file. put each contract in the doc comment of the declaration it governs. a directory's `CONTRACTS` file holds only rules for the whole directory: architecture, dependencies, security. the doctrine tells the agent to use `ncm list <file>` for directory-wide and file-local contracts, then read the contracts on declarations it calls.

a directory-wide security contract in a `CONTRACTS` file:

```text
@cc [label:security] untrusted-webhook-input
webhook payloads under this directory are untrusted until validated at the HTTP boundary.
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
 * @cc [label:product] trusted-caller
 * callers pass a non-empty array of validated names; returns the first name unchanged.
 */
export function firstName(names: string[]): string {
  return names[0];
}
```

`deletes: <the code it makes unnecessary>` is optional on every label; place it before the required final `until:` on a ceiling.

```html
<!-- @cc [label:ceiling] fake-submit
the demo status fakes success.
until: a backend exists. -->
```

## ncm

```text
ncm check [path]    validate every @cc block under path (default: the current directory)
ncm list <path>...  list contracts governing each path (one or more paths required)
ncm ledger [path]   list every ceiling under path with its until: condition
```

`check` prints one `path:line: message` per finding and exits 1 when there are any, 0 when clean. `list` prints one `<file>:<line>\t<label or ->\t<id>\t<prose>` line per contract (non-empty prose lines joined with spaces), sorted by file and line and deduplicated across the requested paths. it ends with `ncm: <N> contracts apply to <M> paths` and exits 0; it does not follow calls. `ledger` prints `path:line`, the id, and the `until:` text separated by tabs, and exits 0. exit code 2 means a usage or environment error, including `list` without a path. paths print relative to the repository root.

`check` reports:

- an invalid directive
- a missing label or a label other than `product`, `security`, `architecture`, or `ceiling`
- a missing prose body
- a ceiling without an `until:` last line
- a duplicate id inside a file, or across `CONTRACTS` files

`check` scans the text files in which `git grep --untracked` finds `@cc`, tracked and untracked but not ignored, so it needs a git repository. git skips binaries and never enters a nested repository. `check` skips markdown examples; `list` includes directory-wide `CONTRACTS` but skips a markdown file's own examples. `ncm` does not judge prose or verify that code complies; the review skill does that.

## review

```text
/n-code-mode:review
/n-code-mode:review path/to/dir
```

without a path the skill reviews the current task's changes against the branch base. with a path it audits that path in full. it runs `ncm check` first and prints the output verbatim, runs `ncm list` for every touched file to read directory rules and each file's own contracts, then reads `@cc` blocks on declarations those files call (`ncm list` does not follow calls). then it reads:

1. deletions, one line each, tagged `delete:`, `stdlib:`, `native:`, `yagni:`, or `shrink:`
2. contract violations, `violates <id>` with the contract's location and evidence
3. hygiene, `kill: <id>` for a contract that restates code, claims an unreal `deletes:`, or has an unobservable ceiling exit; `expired: <id>` for a ceiling whose trigger has fired; `changed: <id> → <owners>` routes an edited or removed contract to its `owner:` names (split on `;`, diff scope only)
4. the ceiling ledger, for a path scope

it closes with `net: -<N> lines. <V> violations. <K> to kill, <E> expired, <C> changed.` or `lean and compliant. ship.` it lists and applies nothing. correctness, security, and performance belong to `/code-review`.

## what it replaces

- the OMP extension replaces manual doctrine wiring for OMP only; it does not replace the separate Claude Code review skill.
- any comparison with Ponytail's token cost is an estimate from a different setup, not an OMP measurement. actual OMP cost depends on prompt serialization and the active model; measure it in your own environment if it matters.
- Ponytail's `review`, `audit`, and `debt` skills are still a separate concern; n-code-mode's Claude review skill consolidates that review workflow with a scope argument.
- `cc-check` from code-contracts. its `list` command cannot produce a ledger, its published package depends on pyright and a typescript language server, it pins node 24, and the repository carries no license. `ncm` keeps the directive grammar so the two formats stay compatible on the line that matters.

## boundaries

- `ncm` validates form, not truth. a contract can be well-formed and wrong.
- `owner` names who the review asks to look at a changed or removed contract; `notify` parses but means nothing here.
- `list` works per file and directory, not per declaration, and does not follow calls.
- the Claude Code Stop hook checks files differing from HEAD, so files committed during the turn escape it.
- scan time follows the size of the untracked tree, because `--untracked` walks it. a repository carrying hundreds of thousands of unignored scratch files takes about a minute; ignore the scratch tree or pass the directory you are reviewing as the path. a path that holds a `CONTRACTS` file walks the tree a second time to find every other `CONTRACTS` file, so its ids stay unique repository-wide.
- ceiling comments must be a comment block on their own: the directive line and its prose, ending at the first non-comment or blank comment line.
- OMP injection has no separate stop command; disable the n-code-mode extension only when you intend to remove its doctrine. In Claude Code, say so in the conversation when a task should skip the ladder.
