# nikos agent stack

private source repository for niko's omp delivery gates, advisor role, and native questionnaire tooling.

## gate checker

`gate-checker` adds deterministic checks to omp sessions and babysitter processes. it records request evidence, checks added lines and delivery claims, supports configurable verification, exposes repository-scope audits, and records gate outcomes.

### engagement levels

```text
/gates-engage low
/gates-engage medium
/gates-engage high bun test
/gates-disable
```

- `low`: report findings without forcing another turn.
- `medium`: block material delivery failures without requiring a commit.
- `high`: enable every rule family, including clean-tree enforcement.
- `off`: disable checks and recording.

see the [complete gate plugin user guide](docs/gates-plugin-user-guide.md) for configuration, commands, rule behavior, troubleshooting, and development details.

## ask questionnaire

`ask-questionnaire` packages the native omp questionnaire workflow as a git format-patch. it adds structured single-select and multi-select questions, custom answers, notes, markdown and code previews, recommended choices, timeouts, collaboration support, external-editor cancellation, and automatic new-project intake.

apply it to upstream base `06aecdd51f`:

```sh
cd /path/to/oh-my-pi
git am /path/to/nikos-agent-stack/ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch
```

the patch is a core change, not an extension. see the [complete ask questionnaire user guide](docs/ask-questionnaire-user-guide.md) for the schema, controls, installation contract, new-project behavior, remote behavior, verification, updates, and troubleshooting.

## advisor role

`advisor-role` packages the sol-terra advisor profile and an omp core patch for structured advisory evidence. terra stays read-only and attaches `{ path, line, claim, digest }` when inspected source supports advice. omp preserves the record through routing, agent-facing xml, transcript details, and the visible advisor card.

apply the core patch to upstream base `8b0f400d3c`:

```sh
cd /path/to/oh-my-pi
git apply --check /path/to/nikos-agent-stack/advisor-role/0001-feat-advisor-add-structured-evidence-records.patch
git am /path/to/nikos-agent-stack/advisor-role/0001-feat-advisor-add-structured-evidence-records.patch
```

the harness patch remains an explicit manual installation. see the [complete advisor role user guide](docs/advisor-role-user-guide.md) for the profile, evidence schema, compatibility contract, installation, verification, and update procedure.

## repository tools

```sh
bun run gate-checker/gate-cli.js audit --kind uncommitted --cwd . --json
bun run gate-checker/gate-cli.js cutover --base HEAD~1 --cwd .
bun run gate-checker/gate-cli.js stats --json
```

supported audit scopes:

- `request`: changes since a captured request baseline.
- `uncommitted`: staged, unstaged, and untracked changes.
- `base`: changes from a supplied merge base through the current commit.
- `commit`: changes introduced by one commit.

## verification

```sh
bun run test
```

this command runs focused gate-checker unit tests, embedded policy checks, and the end-to-end extension wiring probe. see [`package.json`](package.json) for the exact command. questionnaire and advisor-role source checks run after patch installation and are listed in their user guides.

## repository map

| path | purpose |
|---|---|
| [`gate-checker/index.ts`](gate-checker/index.ts) | omp extension hooks, evidence collection, policy enforcement, and commands |
| [`gate-checker/scope.js`](gate-checker/scope.js) | canonical immutable repository scopes |
| [`gate-checker/predicates.js`](gate-checker/predicates.js) | shared deterministic gate predicates |
| [`gate-checker/gate-cli.js`](gate-checker/gate-cli.js) | cutover, audit, and telemetry command-line interface |
| [`gate-checker/gates.js`](gate-checker/gates.js) | composable babysitter gate tasks |
| [`gate-checker/delivery-contract.process.js`](gate-checker/delivery-contract.process.js) | structured delivery process |
| [`docs/gates-plugin-user-guide.md`](docs/gates-plugin-user-guide.md) | complete user and operator guide |
| [`ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch`](ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch) | native omp questionnaire workflow package |
| [`docs/ask-questionnaire-user-guide.md`](docs/ask-questionnaire-user-guide.md) | complete questionnaire installation, usage, and operator guide |
| [`advisor-role/0001-feat-advisor-add-structured-evidence-records.patch`](advisor-role/0001-feat-advisor-add-structured-evidence-records.patch) | native omp structured advisory evidence package |
| [`advisor-role/upstream_base`](advisor-role/UPSTREAM_BASE) | exact compatible omp upstream commit |
| [`advisor-role/watchdog.yml`](advisor-role/WATCHDOG.yml) | bounded sol-terra advisor profile |
| [`docs/advisor-role-user-guide.md`](docs/advisor-role-user-guide.md) | complete advisor role installation, schema, behavior, and verification guide |
| [`docs/gates-agent-stuff-extension-fit-report.html`](docs/gates-agent-stuff-extension-fit-report.html) | architecture and native-compatibility report |
