# security memo

deferred verification work identified during review. nothing here is a known live
vulnerability; each item is an unverified assumption or an accepted scope boundary.

## 2026-08-30 — omnipotence extension thermo-nuclear review

### deferred verification

- **`store.getprojectrun` uses an unindexed json predicate.** it matches on
  `json_extract(input_json, '$.projectRoot')` and excludes child runs with
  `id not like 'child-%'` (`omnipotence/store.ts:1393-1407`). the prefix is a string
  convention, not a key, so a caller-supplied run id starting with `child-` is excluded
  from project lookup and an unrelated run carrying a coincidental `projectRoot` field
  can match. no scan was run against a large event store to measure the cost. deferred:
  a real parentage column or a project→root mapping table, both of which need a schema
  migration.
- **direct-execute path on `omnipotence_result`.** the harness validates registered tool
  arguments against the tool schema before `execute`
  (`pi-agent-core/src/agent-loop.ts:2179` validates, `:2531` executes), but the test
  suite and any programmatic caller reach `execute` directly. `resultinput`
  (`omnipotence/index.ts:73-93`) was therefore kept as the runtime guard rather than
  deleted as schema duplication. not audited: whether every other extension tool in this
  repo has an equivalent runtime guard on its direct-execute path.
- **`loader.ts` coerces malformed manifest values to defaults instead of rejecting.**
  `processvalue` maps a non-number `maxturns` to `undefined` and `hookvalue` maps an
  invalid `priority` to `undefined` and `timeoutms` to `5000`, so a malformed blueprint
  never reaches the canonical `defineprocess`/`definehook` validators. left unchanged
  because fixing it changes behaviour for malformed input, which was out of scope for a
  behaviour-preserving pass. a blueprint author can currently ship a manifest with a
  garbage budget and get a silent default.
- **blueprint traversal defences were not re-tested.** `blueprints.test.ts:167-200` and
  the `..cache` acceptance case at `:227-250` were deliberately retained during test-slop
  removal precisely because they pin the traversal boundary. no new fuzzing of archive
  paths, symlinks, or unicode path spellings was performed.

### accepted scope boundaries

- **`store.ts` remains 2431 lines and `engine.ts` 946.** both are god-objects and both
  exceed or approach the 1000-line threshold. neither was introduced by the branch under
  review, and decomposing them behind only 26 and 40 tests respectively carries more
  regression risk than the review was authorised to take. the decomposition seams are
  documented in the audit but not applied.
- **`cli.ts` `runcli` is a single 470-line function** that reimplements start, resume,
  status, and halt already implemented in the extension command handlers. the shared
  application layer that would remove the duplication was scoped out for the same reason.
- **`omnipotence/api.ts` is a wildcard barrel**, so every internal export from the store,
  engine, and loader is public by accident. narrowing it is a breaking change to the
  published `./omnipotence` export and needs a version decision.

## 2026-08-31 — lease fix and api narrowing

### resolved

- **`gate-checker` mutation lease deadlock.** fixed in two parts: `agent_start` now
  settles an abandoned request (new turn, no open continuation) and releases its lease,
  and `acquirelease` force-reclaims any lease older than twelve hours even when the
  holder pid is alive. covered by three new `lease.test.ts` cases and a wiring probe
  ("an abandoned request releases its lease on its next agent turn"). note: running
  sessions keep the old behaviour until they reload the extension.
- **`omnipotence/api.ts` wildcard barrel.** narrowed to the authoring surface:
  `defineprocess`, `definehook`, `assertvalid`, `jsonvalueof`, `stablejson` plus the
  authoring types. `plugin.test.ts` pins no-wildcards and the exact runtime value set.
  verified: zero in-repo consumers, zero imports from installed production blueprints,
  and the documented `defineprocess` install → load → resolve path works through the
  narrowed barrel.

### refined findings

- **`loader.ts` coercion (updated, narrower than first filed).** `definehook` does
  validate phase, priority range, and timeoutms range (`hooks.ts`), so the gap is only
  that `processvalue`/`hookvalue` discard type errors before those validators run:
  `priority: "high"` silently loads at priority 100, a non-number `maxturns` silently
  takes the default. still open; fixing it changes behaviour for malformed blueprints.

### newly observed, out of scope

- **installed blueprint integrity drift.** re-installing the production
  `factory-workflow/1.0.0` blueprint from `~/.omp/nikos-agent-stack/blueprints` fails
  with `hooks/factory-guard.ts hash mismatch` — the on-disk files no longer match the
  manifest hashes recorded at install time. pre-existing, in user state outside the
  repo. reinstall or re-seal the manifest deliberately.
