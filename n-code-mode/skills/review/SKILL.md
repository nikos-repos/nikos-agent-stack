---
name: review
description: >
  one review pass over a diff (default) or a path: what to delete, which @cc contracts the
  code violates, which contracts to kill or upgrade, and the ceiling ledger. runs the ncm
  checker first, then reads. every finding cites a contract id or a deletion tag. use when
  the user says "review", "audit", "what can we delete", "is this over-engineered", "verify
  contracts", "check contracts", "ceilings", "ledger", "what did we defer", or invokes
  /n-code-mode:review. lists findings, applies nothing.
argument-hint: "[path]"
---

# review

scope: the current task's changes (committed on the branch, staged, unstaged, untracked) against the branch base. a path argument audits that path in full instead of a diff.

## 0. mechanical pass

run `ncm check <root>`, where root is the repository root for a diff or the given path. `ncm` is on PATH after `bun link` in nikos-agent-stack; otherwise run `bun ${CLAUDE_PLUGIN_ROOT}/ncm.ts check <root>`. print every line it emits verbatim under the tag `ncm:`. exit code 2 means the tool could not run: say so and continue by reading.

## 1. deletions

one line per finding: `<file>:L<n>: <tag> <what>. <replacement>.`

- `delete:` dead code, unused flexibility, speculative feature. replacement: nothing
- `stdlib:` hand-rolled thing the standard library ships. name the function
- `native:` dependency or code doing what the platform already does. name the feature
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller
- `shrink:` same logic, fewer lines. show the shorter form

a single assert-based self-check is the minimum, never a deletion candidate.

## 2. contracts

run `ncm list <touched-file>...` for every touched file (or `bun ${CLAUDE_PLUGIN_ROOT}/ncm.ts list <touched-file>...` when `ncm` is not on PATH) to read directory rules and each file's own contracts. then read the `@cc` blocks on declarations those files call; `ncm list` does not follow calls.

`<file>:L<n>: violates <id> (<contracts-file>:L<m>). <evidence>.`

trace inputs, guards, errors, outputs, and side effects. a contract weakened or deleted in the same change does not excuse a violation. report a contradiction between two contracts as one finding naming both ids.

## 3. hygiene

- `kill: <id>` a contract that restates the implementation or says nothing a reader could not see in the code, a `deletes:` line naming nothing that exists, or a ceiling whose `until:` cannot be observed
- `expired: <id>` a ceiling whose `until:` condition now holds. upgrade or re-justify
- `changed: <id> → <owners>` for every existing contract edited or removed in the diff with `owner:` metadata. split `;` between owners so those people review the change. path scope has no diff, so reports none
- ncm already reports missing trailers, wrong labels, and duplicate ids. do not repeat those

## 4. ledger

path scope only: run `ncm ledger <path>` and print it verbatim.

## close

`net: -<N> lines. <V> violations. <K> to kill, <E> expired, <C> changed.` or `lean and compliant. ship.`

## boundaries

lists findings, applies nothing. correctness bugs, security, and performance are out of scope: route them to `/code-review`. for a deletion-only pass that also applies fixes, `/simplify` exists natively.
