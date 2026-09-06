---
name: factory-build
description: "Implement one admitted factory task-graph task. Replaces tdd for graph tasks, including tasks with a stable interface; use engineering-workflow outside an admitted factory."
argument-hint: "[task id]"
---

# factory build

Implement one admitted task-graph task against its fixed interface. Observe real behavior before writing durable tests, then prove only the behavior the task record names. Follow the admitted factory task and cadence even when its interface is stable. Outside an admitted factory run, a bug fix behind an existing stable interface may use tdd through engineering-workflow; that route does not waive an active factory task's probe or acceptance contract.

The task record and the current source fingerprint are the authority. Load the task's bounded source/context slice: task id, workspace and branch, owned paths, fixed interface, acceptance criteria, named failure modes, falsifier, cadence, cadence.mocked_at, test ceiling, route, dependencies, non-goals, and expected result consumers. Retrieve other source only when a criterion or observed failure requires it. Do not make a whole-repository context dump or create a second task contract.

When the admitted task changes dependencies, query/cache/resource semantics, or UI behavior, use the applicable [merge-readiness guidance](../engineering-workflow/references/merge-readiness.md) to sharpen proof of the existing criteria. Preserve the fixed interface and owned files. If a required sibling consumer or missing invariant needs a contract change, return a typed blocker to the owning workflow rather than widening scope. Keep real probes before durable tests, the existing doubles policy, test ceiling/escalation, and all six result checks; this reference creates no separate test or gate requirement.

## stages

### 1. contract — before code

Write a short contract record containing:

- the responsibility this module hides from callers
- the exact public inputs, outputs, and error vocabulary
- invariants, resource limits, and data-loss containment
- owned files, external effects, and the real entrypoint
- the completion threshold
- the acceptance and failure-mode names copied exactly from the task record

The interface is frozen task input. Implement it; do not redesign it locally. If it is wrong or incomplete, return a typed contract blocker before editing. A local interface change would break the consumer that is already building against the recorded text.

Keep context and proof scoped to this seam. A source hash, decision record, or handoff reference is useful when the fact is consequential; it does not require copying unrelated guidance or adding a new persisted gate.

### 2. falsifier — design the experiment that can prove the contract wrong

Before drafting implementation details, name the smallest real execution that could falsify the contract:

- concrete input and source/workspace revision
- real entrypoint: command, request, file, database, rendered surface, or process
- expected observation when the contract holds
- observation that would prove it wrong

Read the falsifier from the task record's experiment field; sharpen a vague observation without changing its admitted contract. Use the real boundary. A probe-time double is allowed only at a boundary named by the task's cadence.mocked_at; it must force an observed boundary case and must not replace the code under the task. If no real entrypoint or declared probe seam exists, stop with a blocker or correct the task record. An experiment that cannot fail is not evidence.

### 3. draft — no durable tests yet

Implement against the fixed interface. Draft validation at trust boundaries and behavior that prevents data loss with the rest of the module; do not defer them as polish.

Allowed during drafting:

- revise internals without changing the interface
- use an uncommitted scratch entrypoint, REPL, or diagnostic
- print or dump state needed to design the probe

Do not add or run files collected by the durable test runner before the real probe. Do not commit scratch entrypoints. Do not broaden the module, add a generic abstraction, or import private APIs to avoid an admitted boundary. Stop drafting when every criterion has a plausible code path; proof comes next.

### 4. probe — real behavior before tests

Run the module through its real entrypoint once for each acceptance criterion, in the exact task-record order, and once for the falsifier.

For each entry:

1. choose the smallest concrete invocation;
2. run it with the real command, process, browser, database, or other declared entrypoint;
3. capture the exact output bytes;
4. append the command, raw output, and result to .factory/probes/<task-id>.log;
5. mark pass or fail against the criterion's expected observation.

Use [reference/probe-log.md](reference/probe-log.md) as the sole grammar. It defines the exact heading/name match, one-line command, byte count, raw fence, result token, separators, ordering, escaping, newline rules, falsifier entry, and final freeze line. Do not summarize output in place of the raw bytes or invent a second format.

The acceptance gate opens probe_log_path from the task worktree before merge; the log is ignored by git and is not a substitute for the durable result. A missing criterion entry is a failed criterion even when the implementation looks obvious. If a probe fails, preserve the entire failed attempt before returning to drafting: copy its exact available log bytes and raw command output into `.factory/probes/history/<task-id>/<attempt-number>/`, using the next unused positive integer and never overwriting a prior attempt. Keep a `context.md` beside those raw files with native task/attempt identity, source revision, criterion, invocation, exit/result, observed failure and diagnosed root cause (or unknown). This is an ignored local evidence sidecar, not a new machine result field, command ledger or accepted probe format. Before submitting for acceptance, rebuild the canonical `<task-id>.log` from the latest complete grammar-conforming pass. During probing it may be incomplete or failing and cannot pass acceptance. Never append retained attempt history to the accepted log or put a freeze line on a failed attempt. Reference the retained attempt in the existing blocker/reason or acceptance evidence where applicable. Preserve this history across resume and cleanup until the root retains the evidence it needs. Count consecutive failed attempts for the same criterion across resume. Escalate after two failures with established different root causes; an unknown cause calls for diagnosis, not speculative code or resetting the counter.

Do not write or run durable tests before at least the complete probe pass has been recorded. A probe itself may use only the doubles declared by the task.

### 5. freeze — minimum deliverable

Freeze only when every acceptance criterion has a passing probe entry and the falsifier is not-falsified.

At freeze:

- remove scratch entrypoints and temporary files, unless one is a deliberately retained operational diagnostic;
- stop changing the interface; interface changes are an escalation;
- put the grammar-defined freeze line last in the probe log;
- retain the exact source/workspace revision used by the probe.

Freeze is the minimum observed behavior. It does not imply that a test suite, integration wave, or final delivery passed.

### 6. prove — durable tests within the current budget

After the probe pass, write durable tests at the real module entrypoint.

~~~text
test_budget = len(acceptance) + len(failure_modes)
~~~

This is a ceiling, not a target. A single behavioral test may cover more than one named criterion when acceptance_results explicitly maps its evidence to each covered criterion. Shared coverage is not a test omission and needs no tests_omitted entry. Use tests_omitted for a test deliberately not implemented, with its permitted reason; it never excuses an uncovered required criterion or failure mode. An experiment-only cadence records its no-durable-tests reason while retaining all required probes. A test claim is valid only after the command ran in this session and its command/result is recorded.

Use the same meaningful inputs and observed values as the probes:

- cover each acceptance criterion through the module interface;
- cover each named failure mode by asserting containment behavior, not a private implementation cause;
- exercise input validation and data-loss prevention through the real trust boundary;
- choose a property test, round trip, process invocation, or other shape that matches the module.

Do not test private helpers, trivial getters/setters/constructors, compiler-enforced type facts, unowned dependency internals, imagined branch matrices, source text, or a synthetic fallback invented only for the test.

If another test is necessary, first use the existing criterion-naming escalation: name the exact acceptance criterion or failure mode it protects, explain why the current probe/test set does not cover it, and obtain the current acceptance-gate route before exceeding the ceiling. Do not silently raise the count. If the pinned acceptance gate still rejects the extra test, the task remains blocked: a prose escalation does not override a hard validator. Only a separately admitted F2 acceptance-contract change may alter the policy, and it must update the actual producers, gatekeeper, guard, and consumers together. The task result keeps the existing proof contract; it does not gain a seventh persisted check or new F2 proof fields.

## real entrypoints and doubles

A durable test drives the same real entrypoint that the probe drove. Do not use mocks, stubs, fake contexts, fabricated state, impossible fixtures, or assertions on declarations in durable tests. A probe-time double can stand in for an external service or clock only when cadence.mocked_at names that boundary and the log says what was replaced. It cannot stand in for repository code, its process context, its store, or its acceptance gate.

For a CLI, invoke the CLI. For a process, invoke the public process entrypoint and post results through its real result path. For persistence, use the real store boundary and a disposable location permitted by the task. For a rendered surface, use the real renderer or browser surface. If the desired behavior cannot be observed through the real boundary, report the missing capability rather than converting a mock into proof.

## cadence

Read cadence from the task record; this skill does not choose it.

| cadence | stages |
| --- | --- |
| experiment-only | contract through freeze; no durable tests |
| module-complete | all six stages; default |
| characterize-first | characterize current behavior before changing a corruption, security, money, migration, or published-protocol seam, then all six stages |
| integration-gate | all six stages plus the declared cross-module check after every producer and consumer |
| release-gate | task-owned required suite only; task agents do not launch the product-level entrypoint |

The wave orchestrator owns the barrier, dependency order, integration check, and declared reviewer set. A task agent does not merge, push, clean another worktree, or run the product smoke.

## rules that remain binding

- Input validation at trust boundaries and data-loss prevention are named failure modes by default. Draft and probe them with the module. In a cadence that admits durable tests, test trust-boundary validation through the real entrypoint; experiment-only retains its no-durable-tests rule.
- A t4 task covers every acceptance criterion and named failure mode, but the same test ceiling and escalation route remain in force.
- Follow the task's route, model, workspace, and allowed writes. Do not add fan-out because a task appears small or because a file is large.
- The wave's integration check and the pinned acceptance gate are required. A worker's prose never substitutes for them.
- Never claim a test, probe, acceptance, commit, or integration result that did not run or exist in this session.
- Advisory prediction or tradeoff explanation for unfamiliar high-risk work is outside the factory's six persisted checks unless the authorized task explicitly makes it an acceptance criterion with owner, evidence, scope, and timebox.

## result consumed by the factory

Return the exact fields required by the task result schema:

- task_id
- status: complete, blocked, or failed
- changed_files: exact owned manifest
- probe_log_path: the ignored worktree log path
- acceptance_results: one criterion/evidence entry per named criterion
- commands_run
- tests_written: guard-derived count; the commit diff is authoritative
- tests_omitted: every omission and its reason
- commit: one local commit on the assigned task branch
- blocker: typed blocker or null

factory-waves normalizes this result and waits for every settled task. The pinned factory-gatekeeper independently persists exactly six checks: identity, ownership, probe-log, acceptance, budget, and cadence. The owning new-project workflow consumes the passing result, real diff, merge/integration evidence, and finish records. Do not add a seventh learning/understanding check to the persisted result; advisory explanation stays alongside the evidence unless an authorized task criterion explicitly makes it blocking.

## completion

A task is complete only when its fixed public seam meets every acceptance criterion, the success and failure probes ran, the falsifier was not fired, data-loss and cleanup behavior are covered, required durable tests pass within the current budget or a named escalation is accepted, and every changed path is inside the task ownership.
