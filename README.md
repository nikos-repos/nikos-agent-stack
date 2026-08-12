# nikos agent stack

private source repository for niko's omp delivery-gate extension and its supporting tools.

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

this command runs focused unit tests, embedded policy checks, and the end-to-end extension wiring probe. see [`package.json`](package.json) for the exact command.

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
| [`docs/gates-agent-stuff-extension-fit-report.html`](docs/gates-agent-stuff-extension-fit-report.html) | architecture and native-compatibility report |
