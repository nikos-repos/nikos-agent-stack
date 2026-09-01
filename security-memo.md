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

## 2026-08-31 — mutation lease reliability

### closed by ml-0 through ml-4

- **request-lifetime ownership and delegated-writer blocking.** a lease now brackets one matching worktree mutation operation. `task` only coordinates children, so it does not reserve a parent lease; each child acquires for its own eligible mutation. this closes the parent-held and yielded-child ownership causes recorded during the user-guide refresh.
- **approval-held and out-of-scope lease acquisition.** acquisition occurs after validation and provider or user approval, immediately before execution. approval waits own no lease. read-only tools, internal uris, and filesystem targets outside the bound worktree do not reserve the worktree lease.
- **fixed-age reclaim and opaque conflicts.** the active operation renews a heartbeat. stale-only recovery refuses a fresh heartbeat and can reclaim a missed heartbeat without treating shared pid liveness as the primary activity signal. blocked calls receive holder, operation, heartbeat, fence, relation, and safe-status diagnostics; a call conflict does not create a later `mutation_lease_conflict` stop failure.
- **unsupported manual deletion and startup-only control.** operators can inspect and recover through `nikos-gates lease status`, stale-only release, or exact-identity force release with a reason. agents require direct user authorization before force release. `/gates-lease status|on|off` changes the current session without restart; successful manual recovery records `lease_manual_release`.

sources: [mutation lease reliability plan](docs/maintainers/mutation-lease-reliability-plan.md), [lease guide](docs/gates-plugin-user-guide.md)

### retained boundaries

- **worktree-wide contention.** ml-4 retains one cooperative lease per worktree operation. it does not add path-scoped locking.
- **external mutations.** external editors and arbitrary processes remain outside the guarantee because they do not participate in gate-aware native tool leasing.
- **rollout evidence.** three source-runtime waves completed with zero `lease_manual_release`, zero `lease_wait_timed_out`, and zero failed releases. final lease statuses were `free` with `exists: false` after more than 31 seconds. focused and required full checks passed. the lease is enabled at startup by default; set `OMP_GATE_MUTATION_LEASE` to `0`, `false`, or `off` before startup to disable it.
- **provider failure.** the `omniwriter` failure also included a provider 429. the lease changes do not prove that the provider failure is resolved.
