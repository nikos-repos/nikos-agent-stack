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

* write less code, and say more about the little you wrote. a contract earns its place when it lets you delete code, never when it narrates code
* grammar: `@cc [label:rule] id` in a repo's `CONTRACTS` file (that repo's CLAUDE.md imports it with `@CONTRACTS`); `@cc [label:ceiling] id` in a comment beside a deliberate shortcut. prose on the lines below the directive
* a rule's prose ends with `deletes: <the code it makes unnecessary>`. a ceiling's ends with `until: <the condition that ends it>`. missing trailer = deleted at the next review
* after adding or editing a contract, run `ncm check <path>`. it validates grammar, label, trailer, and id uniqueness
* findings cite contract ids. `/n-code-mode:review` verifies a diff by default, or a path
