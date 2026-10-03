# omp–orca observer user guide

`omp-orca-observer` is a read-only viewer of native omp `task` children. `/observer open` opens it as a tab in orca's embedded browser. omp keeps execution, cancellation, workspace and transcript authority; the observer does not launch, resume, stop or control children, and it does not replace stock orca views.

source: [package](../omp-orca-observer/package.json), [commands](../omp-orca-observer/commands.ts), [viewer](../omp-orca-observer/viewer/index.html), [contract](../omp-orca-observer/contract.ts)

## prerequisites and verified versions

- omp ≥ **18.3.5**, with native plugin support.
- orca ≥ **1.4.205** for `/observer open`, with its embedded browser available.
- run `/observer` in the publishing main omp session, not in a child. `grant`, `url` and `open` work only in the interactive tui with UI available.

[gd.md](../omp-orca-observer/checks/evidence/gd.md) records observer package **0.1.0**, verified omp **18.4.12**, and installed orca **1.4.217**. this guide's orca topic map matches **v1.4.217**, not a newer tag. the recorded package tarball SHA-256 is `7ea2a73a6cda54e018f7fd8152648ec84e138838730d326e4884871155dca153`.

**v1.4.219 is the latest orca release recorded in gd.md; the observer has not been verified on it.** the orca half of v13 remains a recorded gap until the operator updates orca and verification is completed. the installed 1.4.217 version observation is not a latest-release smoke pass. meeting a version floor alone is not release verification.

source: [version floors](../omp-orca-observer/contract.ts), [release evidence](../omp-orca-observer/checks/evidence/gd.md)

## install, start and remove

install the observer package with `omp plugin install` and the supplied observer package source, or link the local package from this repository's root:

```sh
omp plugin link ./omp-orca-observer
```

the package is private; this guide does not assume a published registry package. start a new omp process after installing or linking. in its main session, create children with native `task`, then issue a grant and open the viewer:

```text
/observer status
/observer grant all --ttl 30
/observer open all
```

`serve` is optional here: `grant`, `url` and `open` start the observer server if needed. `all` selects children admitted at command time; it is not an automatic grant for children created later.

remove the plugin with:

```sh
omp plugin uninstall omp-orca-observer
```

**disable and uninstall take effect at the next omp process launch.** the running process, `/new` included, keeps the loaded observer until it exits. to end current viewer access before disabling or uninstalling, run `/observer revoke all` in the publishing main session. do not restart a live parent merely to change the loaded package.

source: [package](../omp-orca-observer/package.json), [commands](../omp-orca-observer/commands.ts), [verified local link](../omp-orca-observer/checks/evidence/gd.md)

## observer commands

these are the exact command forms registered by `commands.ts`:

```text
/observer serve
/observer grant <childId…|all> [--ttl <minutes>]
/observer revoke <childId…|all>
/observer status
/observer url <childId…|all>
/observer open <childId…|all>
```

| command | example | behavior |
|---|---|---|
| `serve` | `/observer serve` | starts the server and reports its endpoint; it does not grant browser access. |
| `grant` | `/observer grant all --ttl 30` | approves selected admitted children and issues a single-use bootstrap URL in a tui notification. |
| `revoke` | `/observer revoke all` | revokes all grants, or the named children's access; it does not cancel native tasks. |
| `status` | `/observer status` | reports observer state and reason, epoch, endpoint, granted-child/live-credential/pending-code counts, and inventory state and reason. |
| `url` | `/observer url all` | issues a fresh bootstrap URL for selected already-approved children in a tui notification. |
| `open` | `/observer open all` | checks orca's version and current-worktree tabs, then creates an embedded-browser tab with a fresh bootstrap URL for already-approved children. |

replace `child-a` and `child-b` below with actual native task child IDs; multiple IDs are space-separated:

```text
/observer grant child-a child-b --ttl 15
/observer url child-a
/observer open child-a
/observer revoke child-a
```

use `all` alone, never mixed with IDs. `grant all` selects admitted children; `url all` and `open all` select admitted, already-approved children. explicit IDs must be admitted, and `url`/`open` also require approval. `revoke all` revokes every granted child, while named ungranted IDs have no effect. an empty admitted selection cannot be granted or opened.

only `grant` accepts a trailing `--ttl <minutes>`. the default is **30 minutes**; the value must be greater than 0 and at most **480 minutes**. `url` and `open` issue fresh access with the default lifetime, not a copied custom `grant` ttl. `serve` and `status` take no arguments.

orca may retain the full opened URL, including its fragment, in browser history. the code in that URL is **single-use** and expires **60 s after issue** if unused; loading the viewer exchanges it and removes the fragment from the page's current URL. never reuse a history URL or share it with an agent. if opening fails, use `/observer url <childId…|all>` to issue a fresh URL, or retry `/observer open <childId…|all>` after fixing the reported problem.

source: [commands](../omp-orca-observer/commands.ts), [viewer bootstrap](../omp-orca-observer/viewer/index.html)

## read the viewer

### tree and facts

only granted children appear in the tree. it groups them by root session and parent-worktree → child-worktree lineage, with parent/child nesting within each group. select a child's name/ID button to read its transcript.

a child card shows its ID and parent, model role and resolved model, registry status, current-run outcome, lifecycle milestones, sampled activity, live lineage and completeness. a tombstone is marked `hard-killed (tombstone)`. registry states such as `idle`, and sampled activity, are **not proof of a completed or successful run**; use the separate outcome evidence.

`unknown(<reason>)` means omp cannot provide that fact or the evidence is missing, lost or conflicting. it is an explicit uncertainty, not an empty value, success, failure or an inferred workspace. inventory and child completeness separately report `complete`, `partial(<reason>)`, `unknown(<reason>)` or `unavailable(<reason>)`; a missing row in an incomplete inventory is not proof that a child never existed.

### transcripts

selecting a child starts a bounded, paged read of its native transcript. text entries are shown by role; entries without supported text are shown as JSON. use **Load more** until **End of transcript.** inventory refreshes do not automatically tail the transcript; reselect the child to read it again from the beginning.

**Transcript reset; restarted from byte zero.** means previously displayed pages were discarded and reading restarted. malformed records are counted in a notice. a **Record too large** marker reports the byte range and scan progress instead of pretending to display the oversized record; its end can remain `unknown(record end beyond bounded scan)`. transcript reads can also report `unavailable(missing)`, `unavailable(stale)`, `unavailable(cancelled)` or `unavailable(unreadable)`.

### banners, staleness and access ending

- **Connecting…** / **Waiting for snapshot**: the viewer has not received a usable snapshot yet.
- **Last snapshot received … s ago**: age of the last compatible response, not proof that every fact is fresh. snapshot polling is every 2 s.
- **stale (no response within 10 s)**: a request timed out or no compatible snapshot has arrived for 10 s. retained observations are not current; a later usable response can clear the banner.
- **unavailable(<reason>)**: observation cannot currently be used; the previous view is dimmed where retained. reasons include an unreachable publisher, invalid snapshot, incompatible schema or incomplete new-epoch inventory. a new epoch is not admitted until its inventory is complete.
- **unavailable(access not granted)**: the page has no usable bootstrap code or the exchange failed. issue a fresh URL rather than reloading an old history entry.
- **unavailable(access ended)**: access has ended. the viewer stops polling and clears the tree and transcript rather than leaving them looking live.

revoking a child removes access to that child. viewer credentials also end on expiry, **60 s of inactivity**, or the end of the publishing extension/epoch. a hidden viewer may stop making requests long enough to lose access. reopen it with `/observer open <childId…|all>`; if the children are no longer approved, grant them again first. opening a new tab is not a way to restore revoked approval.

after an omp restart, inventory is `unknown` until omp restores it; the viewer can show an unavailable banner while waiting for a complete new-epoch inventory. use `/observer status` for the publisher's inventory and reason. a restart requires a new grant, not reuse of the old URL.

source: [viewer](../omp-orca-observer/viewer/index.html), [fact and page contract](../omp-orca-observer/contract.ts), [commands](../omp-orca-observer/commands.ts)

## agent routing and session safety

the observer supplies this routing paragraph verbatim:

Use native task to create subagents; Orca orchestration, handoffs, or agent launches happen only when the user explicitly asks for them. Never resume an omp child from Orca's session history while its parent session is live. The bridge needs no agent action, and you never handle observer credentials.

**warning: never resume an omp child from orca's session history while its parent session is live.** the viewer is observation only; continue execution and cancellation through the live parent in omp. stock orca views retain their own actions, but those actions do not acquire authority over a live omp child from this bridge.

source: [routing guidance](../omp-orca-observer/guidance.ts)

## accepted limits

- r01 — no in-app child rows or popouts; select children in the viewer tab.
- r02 — access is tied to the extension lifetime and can end sooner; a restart needs a new grant.
- r03 — facts omp cannot provide show as `unknown`.
- r04 — after an omp restart, inventory reads `unknown` until omp restores it.
- r05 — no replay of missed events, only fresh snapshots.
- r06 — an in-place rewrite of an already-shown transcript record other than the last is not caught until the next reset.
- r07 — no orca status rows; use `/observer status`.
- r08 — lineage is live, with explicit unknowns.
- r09 — open a child's worktree in orca's source control by hand.
- r10 — the viewer is read-only, and stock views keep their own actions.
- r11 — browser recipients only.
- r12 — `/observer` commands, no orca cli additions.
- r14 — an update may disable the observer until it is verified, and loaded sessions keep old code.
- r15 — no orca panel is built: the viewer tab is the only in-app surface; phone or remote access is only through an operator tunnel approved per use.

## orca cli topic map — v1.4.217

this map covers all **18 command families** in the tagged reference, separating browser page commands, tabs and capture/diagnostics, and automations, environments and agent hooks. selectors and agent habits are guidance, not additional command families.

`/observer open` uses only `status`, `tab list` and `tab create`. the extension uses `ORCA_CLI_COMMAND` when set, otherwise `orca-ide`; its calls, shown with that default executable, are:

```text
orca-ide status --json
orca-ide tab list --worktree current --json
orca-ide tab create --url <bootstrap-url> --worktree current --json
```

these are extension calls, not extra setup steps. `status` must provide a parseable `result.runtime.appVersion` at or above the floor. on linux, never run bare `orca`: it may be the system screen reader rather than the orca IDE cli.

| command family | observer use | boundary / why other commands are not used |
|---|---|---|
| runtime (`open`, `status`, `serve`) | `status --json` only | checks `appVersion`; the observer does not start orca or configure runtime serving/pairing. |
| host | none | no host selection or remote connection management; access is local unless an operator approves a tunnel per use. |
| repo | none | no repository registration, base-ref changes or ref search. omp keeps workspace authority. |
| worktree | none | no worktree creation, agent launch, metadata mutation or removal; open a child's source-control worktree by hand. |
| terminal | none | no terminal creation, reading, sending or waiting; native omp owns task execution and transcripts. |
| file | none | no editor file opening or diffs; the viewer reads native transcripts without changing stock file views. |
| built-in browser page commands (`goto`, `snapshot`, `click`, `fill`, `wait`, `screenshot`, `exec`, `set device`) | none | `tab create` opens the URL; the viewer handles its own reads without browser automation or device emulation. |
| tab (`list`, `create`, `switch`) | `list`, `create` | checks current-worktree tabs and creates the viewer tab; it does not use `switch`. |
| capture / console / network / full-screenshot / pdf | none | no recording, diagnostic stream, screenshot export or PDF generation. |
| computer | none | no desktop input or application-state control; the in-app surface is a browser tab only. |
| emulator | none | no mobile device lifecycle or input; phone access requires an operator-approved tunnel, not an emulator integration. |
| linear | none | no issue, project, team or field operations; observations are not issue updates. |
| skills | none | the observer is an omp plugin, not an orca skill installer or updater. |
| account | none | no agent account provisioning or provider credential handling. |
| artifacts | none | no publishing, sharing or retaining observer URLs, credentials or transcripts as orca artifacts. |
| automations | none | no schedules or automation runs; native omp remains the execution owner. |
| environment | none | no environment creation, selection or removal; remote access remains an operator responsibility. |
| agent hooks | none | no orca hook changes; routing guidance is delivered by the omp extension. |

source: `stablyai/orca`, `docs/site/content/docs/cli/reference.mdx`, tag **v1.4.217** (retrieved with the github tool `file_read`); [actual observer cli calls](../omp-orca-observer/commands.ts)

## troubleshooting

- **observer unavailable**: read `/observer status` and its reason in the publishing main session. a version or API incompatibility is not fixed by inventing missing facts or forcing the observer on.
- **no admitted children selected**: create native task children first. `all` is resolved now, not a future subscription.
- **child IDs not approved**: run `/observer grant <childId…|all>` before `url` or `open`.
- **requires interactive tui mode with UI**: issue `grant`, `url` or `open` yourself in the interactive main tui, not through a child or non-interactive run.
- **orca open fails**: fix the reported CLI/runtime/version problem, then use the full `/observer url <childId…|all>` form for a fresh browser URL or retry `/observer open <childId…|all>`. an old history entry is not a reusable grant.
- **hidden tab loses access**: reopen with `/observer open <childId…|all>` and regrant if needed; this does not resume the child's task.

source: [commands and errors](../omp-orca-observer/commands.ts), [viewer states](../omp-orca-observer/viewer/index.html)
