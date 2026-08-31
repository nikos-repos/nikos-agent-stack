# terra advisor user guide

> a native passive, read-only omp advisor configured by nikos agent stack.

## install and start

run the setup flow in this order:

```sh
omp plugin install nikos-agent-stack
```

start an omp session and run the installed plugin setup command:

```text
/advisor-install
```

restart the session, then use the native advisor commands:

```text
/advisor on
/advisor status
```

`/advisor-install` installs or updates terra in the user watchdog configuration. `/advisor on` enables passive monitoring, and `/advisor status` reports native advisor state. for a linked local checkout, run `omp plugin link .`, then use `/advisor-install` in an omp session. `nikos-gates advisor install` remains available for direct package use outside omp.

source: [package command](../package.json), [advisor setup command](../advisor/install.js), [shell setup command](../gate-checker/gate-cli.js), [watchdog source](../advisor/WATCHDOG.yml)

## setup behavior

`/advisor-install` and `nikos-gates advisor install` read the existing user `WATCHDOG.yml`, or an existing `WATCHDOG.yaml` when no `.yml` file exists, from the directory named by `PI_CODING_AGENT_DIR`, or from `~/.omp/agent` when that environment variable is unset.

the setup command:

- preserves top-level instructions and every non-terra advisor;
- normalizes advisor names, then replaces or adds terra;
- validates the native watchdog schema before writing;
- writes atomically to `WATCHDOG.yml`, or to an existing `WATCHDOG.yaml` when no `.yml` file exists; and
- is idempotent: a repeated setup leaves the same terra configuration.

the user owns this configuration after setup. run `/advisor-install` again after a plugin update when the shipped terra instructions change, then restart omp. use `nikos-gates advisor install` only when invoking the package directly outside omp.

source: [advisor setup command](../advisor/install.js), [shell setup command](../gate-checker/gate-cli.js), [watchdog source](../advisor/WATCHDOG.yml)

## passive advisor behavior

terra is a native passive advisor. after `/advisor on`, omp monitors the session and routes terra notes through the native advisor flow.

omp owns the native `/advisor on` and `/advisor status` commands, advisor routing, concern and blocker interruption, and the advisor ui. the plugin supplies terra configuration only; it does not replace those native surfaces.

terra has `read`, `grep`, and `glob` only. it cannot edit, write, or run commands. this restriction applies only to terra; it is not an acceptance criterion for `OMP-DEV` operations.

source: [watchdog source](../advisor/WATCHDOG.yml)

## advisory standard

terra advises only when inspected source establishes all three links:

1. a current `OMP-DEV` decision or candidate;
2. an explicit acceptance criterion or existing observable contract; and
3. a concrete path by which the candidate violates that criterion or remains materially unverified.

when a link is hypothetical, unobserved, or supported only by an unrelated source, terra stays silent. each recommendation stays focused on one candidate, its acceptance criteria, relevant existing tests, and supplied proposals. terra does not propose a broader plan, invent edge cases, or reopen a settled design.

when a failed test is involved, terra classifies it before advising:

| class | condition | recommendation |
|---|---|---|
| `bug` | inspected evidence proves that current or accepted behavior breaks an explicit criterion or contract | advise a production change |
| `bad_oracle` | the expectation is unsupported or wrong | advise correction or removal of the test |
| `low_value` | the difference protects no distinct, important, stable observable contract | advise correction or removal of the test |

terra advises a production change only for a `bug`. it advises but never claims approval, gate, or handoff authority.

source: [watchdog source](../advisor/WATCHDOG.yml)

## evidence in notes

each terra note must identify the current `OMP-DEV` candidate from the session update and include source evidence in its note text:

- the exact repository-relative `path` to an applicable acceptance criterion or observable contract;
- the one-indexed `line` that establishes that criterion or contract;
- a concrete `claim` that explains how the identified candidate violates the cited criterion or leaves it materially unverified; and
- the read-snapshot `digest`, copied verbatim from the same read result as the cited path and line.

terra does not use an unrelated read only to supply a digest, and it never invents or recomputes one. when no inspected source grounds advice, terra emits no note.

omp machine-enforces the native `note` and `severity` fields. terra's watchdog instructions require the candidate, `path`, `line`, `claim`, and matching read-snapshot digest inside the note text. concern and blocker remain governed by omp's native advisor semantics; terra never selects either severity solely to enforce its own tool or authority restrictions against `OMP-DEV`. verify cited evidence against a current read result before acting on it.

source: [watchdog source](../advisor/WATCHDOG.yml)

## authority boundary

- `OMP-DEV` remains the sole writer, integrator, and validator.
- terra advises from read-only source inspection.
- native advisor notes are not approvals or gate results.
- gate results remain the responsibility of the separate gate checker extension.

source: [watchdog source](../advisor/WATCHDOG.yml), [gate checker guide](gates-plugin-user-guide.md)

## uninstall

```sh
omp plugin uninstall nikos-agent-stack
```

plugin uninstall does not remove the user `WATCHDOG.yml` or `WATCHDOG.yaml` file or the terra entry that `/advisor-install` added. `/advisor on` and `/advisor status` only control or report the native advisor; neither removes configuration. to remove terra, delete its entry from the user watchdog configuration while preserving top-level instructions and other advisors, then start a new omp session.

source: [advisor setup command](../advisor/install.js)

## troubleshooting

### `/advisor status` does not show terra

run `/advisor-install`, then start a new omp session before checking status again. confirm that the user watchdog configuration still contains the terra entry and that `PI_CODING_AGENT_DIR` points to the intended agent directory when it is set.

### a terra note has incomplete evidence

the native schema accepts the note because it machine-enforces only `note` and `severity`. treat absent or unverifiable `path`, `line`, `claim`, or read-snapshot digest as an instruction violation and do not act on that note until source inspection supports it.

### the model is unavailable

terra uses `openai-codex/gpt-5.6-terra:high`. make the model available to omp, then start a new session and enable the advisor again.

## limitations

- **user-owned watchdog configuration.** plugin uninstall leaves the user `WATCHDOG.yml` or `WATCHDOG.yaml` file and terra entry in place until the user removes terra manually.
- **prompt-enforced evidence.** omp validates only `note` and `severity`; it does not machine-enforce the evidence fields inside terra's note text.
- **native surface ownership.** omp, not this plugin, owns advisor commands, routing, concern and blocker interruption, and the advisor ui.
- **read-only operation.** terra cannot edit files, run commands, approve work, or produce a gate result.

## source map

| path | purpose |
|---|---|
| [`advisor/WATCHDOG.yml`](../advisor/WATCHDOG.yml) | terra model, tools, native passive advisor configuration, and source-backed note instructions |
| [`advisor/install.js`](../advisor/install.js) | `/advisor-install` setup and atomic watchdog merge behavior |
| [`gate-checker/gate-cli.js`](../gate-checker/gate-cli.js) | `nikos-gates advisor install` shell setup command |
| [`package.json`](../package.json) | plugin package, native setup extension, and `nikos-gates` command registration |
| [`docs/gates-plugin-user-guide.md`](gates-plugin-user-guide.md) | separate gate checker behavior and authority |
