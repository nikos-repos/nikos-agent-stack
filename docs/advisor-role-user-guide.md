# terra advisor user guide

`terra` is a native omp advisor configuration. it is not an omp extension. `advisor/WATCHDOG.yml` supplies the terra profile, and the package extension `advisor/index.ts` registers `/advisor-install`.

source: [package](../package.json), [command registration](../advisor/index.ts), [terra profile](../advisor/WATCHDOG.yml)

## prerequisites

for the omp flow, use an omp installation with plugin support and the `omp plugin` command. use bun 1.3.14 or later for this package.

the `nikos-advisor` command is optional. the package exposes it as a shell bin, and `advisor/cli.js` starts with `#!/usr/bin/env bun`. to use this command, make `bun` and the global bun bin directory available on `PATH`:

```sh
bun add --global nikos-agent-stack
export PATH="$(bun pm bin -g):$PATH"
```

an omp plugin install does not install the `nikos-advisor` shell bin.

source: [package](../package.json), [shell command](../advisor/cli.js)

## install and start

### install the published omp plugin

```sh
omp plugin install nikos-agent-stack
```

this installs the omp extensions. start an omp session and run the setup command with no model argument, or pass one optional nonblank model selector:

```text
/advisor-install
/advisor-install [model]
```

the command writes terra to the user watchdog configuration. start a new omp session to activate terra. in the new session, enable and inspect the native advisor:

```text
/advisor on
/advisor status
```

`/advisor on` enables native passive monitoring. `/advisor status` reports native advisor state. `/advisor-install` accepts no argument or one optional nonblank model selector; it trims the full trailing text and passes nonblank text as the selector. whitespace-only trailing text behaves like no argument.

for a linked local checkout, use this instead of the published plugin install:

```sh
omp plugin link .
```

then start an omp session and run `/advisor-install`.

### use the direct shell installer

after the global shell-bin prerequisite, run:

```sh
nikos-advisor install
nikos-advisor install [model]
```

the command accepts `install` with one optional nonblank model selector. with no model argument, a fresh terra entry omits `model` and the native omp host resolves its default advisor model role; a no-argument reinstall preserves the model on the existing normalized `terra` entry. an explicit selector overrides that model. success prints the installed path and tells you to start a new omp session. success returns exit code `0`; failure prints an `advisor install:` error and returns exit code `2`.

source: [package](../package.json), [command registration](../advisor/index.ts), [shell installer](../advisor/cli.js), [installer](../advisor/install.js)

## watchdog configuration

the installer selects the user watchdog file in this order:

1. use `PI_CODING_AGENT_DIR` when it is set; otherwise use `~/.omp/agent`.
2. use `WATCHDOG.yml` when that file exists.
3. when `WATCHDOG.yml` does not exist but `WATCHDOG.yaml` exists, use `WATCHDOG.yaml`.
4. when neither file exists, create `WATCHDOG.yml`.

the installer validates an existing file before it writes. the document root must be a yaml mapping. `instructions`, when present, must be a string. `advisors`, when present, must be a list. every advisor must be a mapping with a string `name`; optional `model` and `instructions` values must be strings, `tools` must be a string list, and `enabled` must be a boolean.

the packaged profile passes the same validation and contains exactly one advisor named `terra`.

the merge keeps every existing top-level key. it rebuilds `advisors` by keeping entries whose normalized name is not `terra`, then appending the packaged terra entry. name normalization lowercases a name, replaces each run of non-letter and non-digit characters with `-`, and trims `-` characters. a rerun replaces every normalized terra entry, including a customized terra object or extra terra fields, with the shipped profile; the one exception is the existing `model` value, which a no-argument reinstall preserves. passing one explicit nonblank model selector writes that selector instead. other advisor entries remain in the list.

the installer creates the target directory when needed. if the serialized result is identical to the existing UTF-8 text, it leaves the file alone. otherwise, before replacing an existing file, it saves the original UTF-8 text, including comments, under the same basename in a unique sibling `.watchdog-backup-*` directory. the backup directory is private and its file has mode `0600`. a failed backup prevents replacement; a completed backup remains available if replacement later fails.

it writes the new yaml to a file in a sibling temporary directory named `.watchdog-*`, renames that file over the selected target, and removes the temporary directory. this is the installer’s atomic replacement path. serialization preserves parsed peer settings, but may change formatting and remove comments from the active file; retain the backup for recovery.

yaml parse errors, validation errors, packaged-profile errors, directory errors, write errors, and rename errors stop installation. on failure, the commands do not print a success result; temporary-directory cleanup runs after a temporary directory exists. `/advisor-install` reports the error in the omp ui. `nikos-advisor install` writes the error to stderr and returns exit code `2`.

source: [installer](../advisor/install.js), [command registration](../advisor/index.ts), [shell installer](../advisor/cli.js)

### restore a compatible retained profile

keep the selected backup and the compatible retained package before changing profiles. to select an earlier packaged terra profile, invoke `nikos-advisor install` from that retained package's `advisor/cli.js` with `PI_CODING_AGENT_DIR` set to the intended agent directory. inspect the resulting terra entry and preserved peer settings. running the new package's installer again reselects the new profile; it is not rollback.

when the original comments or formatting are needed, restore the retained pre-merge file after checking that doing so will not overwrite later user edits. a subsequent installer merge can serialize it again. use a new omp session to inspect the restored selection; do not restart an active session merely to activate it. profile selection does not change historical run, approval, or effect records.

## shipped terra profile

the installed profile contains:

- `name: terra`
- `enabled: true`
- the packaged entry omits `model`, so a fresh no-argument install uses the native omp host's default advisor model role.
- `tools: read`, `grep`, and `glob`

the native omp host resolves arbitrary configured model selectors; this package does not pin one. model choice does not change terra's identity or shipped instructions. terra can inspect source with `read`, `grep`, and `glob`; it cannot edit files, write files, or run commands. this tool restriction applies only to terra's own operations; it does not apply to `OMP-DEV`.

source: [terra profile](../advisor/WATCHDOG.yml)

## native omp operation

the installer supplies configuration only. the terra profile defines no polling loop, turn hook, fixed cadence, or review frequency. native omp decides when passive monitoring runs.

native omp owns `/advisor on`, `/advisor status`, advisor routing, concern and blocker interruption, and the advisor ui. terra does not replace these native surfaces.

`OMP-DEV` is the sole writer, integrator, and validator. terra advises from inspected source, but a terra note is not an approval, gate result, or handoff. terra cannot select concern or blocker only to enforce its own tool or authority limits. the separate gate checker owns gate results.

source: [terra profile](../advisor/WATCHDOG.yml), [package](../package.json)

## advisory standard

terra advises only when inspected evidence directly establishes all three links at once:

1. a current `OMP-DEV` decision or candidate;
2. an explicit acceptance criterion or existing observable contract that applies to it; and
3. a concrete path by which the candidate violates that criterion or leaves it materially unverified.

when any link is hypothetical, unobserved, or supported only by an unrelated source, terra stays silent. each recommendation covers one candidate, its acceptance criteria, relevant existing tests, and supplied proposals. terra does not propose a broader plan, invent edge cases, or reopen settled design.

when a proposed or speculative test fails, terra classifies the failure before advising:

| class | condition | recommendation |
|---|---|---|
| `bug` | inspected evidence proves that current or accepted behavior violates an explicit criterion or contract | advise a production change |
| `bad_oracle` | the expectation is unsupported or wrong | advise correction or removal of the test |
| `low_value` | the difference protects no distinct, important, stable observable contract | advise correction or removal of the test |

terra advises a production change only for `bug`. it advises correction or removal for `bad_oracle` and `low_value`.

source: [terra profile](../advisor/WATCHDOG.yml)

## evidence in notes

each terra note identifies the current `OMP-DEV` candidate from the session update and includes these labels copied from one inspected read result:

- `path` for the applicable acceptance criterion or observable contract;
- `line` that establishes that criterion or contract;
- `claim` that explains how the candidate violates the cited criterion or leaves it materially unverified; and
- `digest` from the same read snapshot as the cited `path` and `line`.

terra never uses an unrelated read only to supply a digest, and never invents or recomputes a digest. when no inspected source grounds advice, terra emits no note.

omp validates only the native `note` and `severity` fields. the evidence convention remains an instruction inside terra’s profile, not a native schema check. native omp semantics determine concern and blocker impact. verify each cited source result before acting on a note.

source: [terra profile](../advisor/WATCHDOG.yml)

## uninstall

remove the omp plugin with:

```sh
omp plugin uninstall nikos-agent-stack
```

this command does not remove the user `WATCHDOG.yml` or `WATCHDOG.yaml` file and does not remove the terra entry. if you install the global shell bin only for direct installation, remove that package separately:

```sh
bun remove --global nikos-agent-stack
```

to remove terra configuration, edit the selected watchdog file and remove every advisor whose normalized name is `terra`. preserve all other top-level keys and advisors. `/advisor on` and `/advisor status` control or report native state; neither command removes configuration. start a new omp session after removal.

source: [installer](../advisor/install.js), [package](../package.json)

## troubleshooting

### `nikos-gates` is not found

install the package globally and export the global bun bin directory:

```sh
bun add --global nikos-agent-stack
export PATH="$(bun pm bin -g):$PATH"
```

also confirm that `bun` is available on `PATH`; the shell bin invokes `bun` through its shebang.

### the installer reports an invalid watchdog file

fix the selected file so it follows the mapping, string, list, and boolean rules in [watchdog configuration](#watchdog-configuration). `WATCHDOG.yml` takes precedence over `WATCHDOG.yaml` when both exist. the installer stops before replacement when parsing or validation fails.

### terra does not appear in `/advisor status`

run `/advisor-install`, start a new omp session, run `/advisor on`, and run `/advisor status` again. check the file selected by `PI_CODING_AGENT_DIR`, or by the default `~/.omp/agent` path when the variable is unset. confirm that it contains an enabled `terra` entry.

### a direct shell install fails

use `nikos-advisor install` or `nikos-advisor install [model]`. the direct command rejects another subcommand, extra arguments, or a blank selector, prints the failure as `advisor install: ...`, and returns exit code `2`.

### a terra note has incomplete evidence

native omp can accept the note because it validates only `note` and `severity`. treat missing or unverifiable `path`, `line`, `claim`, or `digest` as a terra instruction violation. do not act on the note until an inspected read result supports it.

### the terra model is unavailable

the packaged profile has no pinned model. on a fresh no-argument install, the native omp host resolves its default advisor model role; on a no-argument reinstall, the existing normalized terra model is preserved. to choose a model explicitly, rerun `/advisor-install [model]` or `nikos-advisor install [model]` with a nonblank selector, then start a new omp session, enable the advisor, and check `/advisor status`.

source: [terra profile](../advisor/WATCHDOG.yml), [installer](../advisor/install.js), [shell installer](../advisor/cli.js), [command registration](../advisor/index.ts)
