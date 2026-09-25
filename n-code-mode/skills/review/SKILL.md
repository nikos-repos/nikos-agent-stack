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

applicable contracts are every `CONTRACTS` file from the repository root down to each touched directory, plus `@cc` blocks on touched declarations and on the declarations they call. read them all.

`<file>:L<n>: violates <id> (<contracts-file>:L<m>). <evidence>.`

trace inputs, guards, errors, outputs, and side effects. a contract weakened or deleted in the same change does not excuse a violation. report a contradiction between two contracts as one finding naming both ids.

## 3. hygiene

- `kill: <id>` a rule whose `deletes:` names nothing that exists or could exist, or a ceiling whose `until:` cannot be observed
- `expired: <id>` a ceiling whose `until:` condition now holds. upgrade or re-justify
- ncm already reports missing trailers, wrong labels, and duplicate ids. do not repeat those

## 4. ledger

path scope only: run `ncm ledger <path>` and print it verbatim.

## close

`net: -<N> lines. <V> violations. <K> to kill, <E> expired.` or `lean and compliant. ship.`

## boundaries

lists findings, applies nothing. correctness bugs, security, and performance are out of scope: route them to `/code-review`. for a deletion-only pass that also applies fixes, `/simplify` exists natively.
