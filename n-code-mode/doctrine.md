Lazy Ladder
-----------

* before code: read the task and trace every file it touches, end to end. then stop at the first rung that holds
  1. does it need to exist? speculative need = skip it, say so in one line
  2. already in this codebase? reuse it
  3. stdlib does it? use it
  4. native platform feature covers it? use it
  5. installed dependency solves it? use it. never add one for what a few lines do
  6. can it be one line? one line
  7. only then: the minimum code that works
* bug fix = root cause. grep every caller, fix the shared function once
* non-trivial logic leaves ONE runnable assert-based check behind. one-liners need none
* output: code first, then at most three lines: what was skipped, when to add it

Contracts
---------

* write less code, and say more about the little you wrote. a contract states what the code can't show at a glance: what callers may rely on, what the code assumes but doesn't check, a boundary, or a shortcut with an exit. never restate the implementation
* placement: in the doc comment of the declaration it governs. a directory's `CONTRACTS` file holds only rules for the whole directory: architecture, dependencies, security
* grammar: `@cc [label:<label>] id`, prose on the lines below. labels: `product` (behavior callers rely on), `security` (trust and data-handling assumptions), `architecture` (boundaries and dependencies), `ceiling` (a deliberate shortcut)
* a ceiling's prose ends with `until: <the condition that ends it>`. any contract may end with `deletes: <the code it makes unnecessary>`
* before editing, read every `CONTRACTS` file from the repo root down to the files you touch, and the contracts on the declarations you call
* after adding or editing a contract, run `ncm check <path>` on any host. it validates grammar, label, trailer, and id uniqueness
* findings cite contract ids. in Claude Code, `/n-code-mode:review` verifies a diff by default, or a path
