# module implementation research contract

the caller uses this file as the sole contract for the section 4 module research fan-out. it supplies the approval rule, the shared context, the per-module assignment, and the strict output schema unchanged.

this fan-out answers one question per module: **what is the best way to implement this module, given evidence that does not already live in the model.** it does not design the module, choose its interface, or decide the stack.

## prepare the complete batch

Before dispatch, assemble the full shared context, every eligible per-module assignment row in document order, its exact agent and effort, and the sole strict output schema below. Dispatch those eligible rows together using the actual native task API. Keep the exact supplied context and assignments with the existing attempt evidence.

Record deterministic modules and their skip reasons in the architecture module table; they receive no worker. This authoring inventory is not a new task payload or result schema. Do not add assignments, status, fingerprints, or other undeclared fields to a native task call or closed factory result. Preserve every required assignment cell and schema field for dispatched rows; compact only the subsequent human summary.

## why this reaches the network

the repository checkpoint runs in phase 4, after gate 4. when this fan-out runs, `projectRoot` holds `.factory/` and nothing else — no manifest, no installed dependency, no vendored source.

a worker restricted to what is already on disk therefore has two inputs: the artifacts this run wrote, and the weights of the model that wrote them. it discovers nothing. it restates `.factory/recon.md`, fills the gaps from recall, and a provenance field makes that recall look like evidence.

**research means consulting a source the answering model does not already contain.** on a project with no repository yet, that source is the network: the dependency's actual source tree, its issue tracker, its changelog, its documentation. `librarian` exists to read that source rather than its readme, which is why its profile carries `web_search` and `github`.

## approval before any public request

the online path requires both:

1. an exact recorded `public_research: yes` answer from discovery, and
2. this checkpoint's own native disclosure confirmation

The earlier recon request covered the idea; this request discloses the module list and selected stack. Reuse user authority that already covers this exact operation and target; ask only for missing authority or changed scope. Preserve this checkpoint's required matching native risk/disclosure response. A different earlier product or research response is not that machine record, and must not be fabricated into one.

when approval is `yes` and disclosure confirmation is absent, return `outcome: "needs-risk-approval"` with exactly one `riskRequest`:

```json
{
  "id": "module-research",
  "actionKind": "public-research",
  "target": "dependency source repositories, package registries, and public technical documentation",
  "parameters": {
    "architecturePath": ".factory/architecture.md",
    "modules": ["<module name>", "..."],
    "stack": "<the selected stack from section 3>",
    "scope": [
      "dependency source repositories",
      "package registries",
      "public technical documentation"
    ]
  },
  "reason": "module research sends the module list and the selected stack outside the local project"
}
```

the owning omp session approves or denies this exact request. denial produces no network effect and no finding. approval permits only the declared public-research effect. an acknowledged or unknown outcome is uncertain, is never resent automatically, and requires explicit confirm, fail, or retry after evidence review.

## when the answer is no

**when the recorded discovery answer is exactly `no`, do not dispatch this fan-out.**

skip it. record one open question per module that would have been researched, and state in the document that the implementation approach was chosen without external evidence.

do not dispatch a narrowed offline variant. a worker with no new information source is not a cheaper researcher, it is a confident one, and an invented provenance line is worse than an admitted gap. the honest artifact says which modules were decided on priors; the dishonest one cites itself.

if no exact `yes` or `no` is recorded, return a typed blocker and choose no mode.

## the citation rule

a finding with no resolvable source does not exist. **drop it silently.** do not report it as a hunch, an impression, or "commonly".

**a search-result snippet is a lead, not evidence.** open the page. cite the source file, the issue, the release note, or the documentation page that actually supports the claim.

this applies to capability claims, version claims, maintenance claims, and performance claims alike. a worker that returns an uncited claim has returned nothing.

## when to dispatch a worker

one worker per deep module in the section 4 table, dispatched as one batch.

**skip a module whose implementation the stack and its interface already determine.** a module that transcribes a fixed signature over the standard library has nothing to research, and a worker sent to research it returns a restatement of the interface. research the modules where a real choice remains: an algorithm, a storage format, a protocol adapter, a concurrency model, a rendering seam.

dispatch beyond `task.maxConcurrency` is queued by the harness without changing any assignment. the module names are stable, so a queued worker is delayed, never renamed.

## shared context

```text
# goal
find how to implement <module name> — <module responsibility> — inside the selected stack: <stack summary from section 3>.
# constraints
every claim carries a resolvable url. no url, no claim.
a search snippet is a lead. open the source before you keep a claim.
read the dependency's source tree, issues, and release notes. a readme states intent; the source states behaviour.
check the recon `capabilities already solved` table first, then verify each entry against its source rather than trusting the table.
read-only. no edits, no clones, no writes outside your returned report, no user questions, no subagents.
do not design the interface, choose the error type, or decide the stack. report what the evidence supports.
prefer the platform's native capability over a dependency, and a maintained dependency over new code, and say which the evidence supports.
return exactly the object defined below.
# contract
the requirements and architecture artifacts are supplied by local:// uri. read them; do not restate them.
```

## per-module assignment

one row per researched module. keep the full assignment in the assignment cell.

| name | agent | effort | assignment |
| --- | --- | --- | --- |
| `<module-slug>` | `librarian` | `hi` | for `<module name>`, whose responsibility is `<one sentence>` and whose owned requirement ids are `<ids>`: find at least two materially different implementation approaches available inside the selected stack. for every dependency you name, open its source and cite the file and symbol that proves the capability; check its issue tracker for the failure mode nobody has fixed and its release history for whether it is maintained. report what each approach does not cover |

`agent` and `effort` come from the `library` shape in `skill://factory-taskgraph/reference/routing.md`, raised to `hi` because these findings feed a frozen contract. `factory-scout` has no assignment here: this fan-out asks a capability question about named candidates, not an open discovery question, which is the distinction between the two agents.

## output schema

set the following as the sole module-research `outputSchema` and invoke it with `schemaMode: strict`:

```json
{
  "type": "object",
  "additionalProperties": false,
  "required": ["module", "approaches", "recommended", "sources", "not_covered"],
  "properties": {
    "module": { "type": "string", "minLength": 1 },
    "approaches": {
      "type": "array",
      "minItems": 2,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["name", "kind", "what_it_buys", "what_it_costs", "maintenance", "source_ids"],
        "properties": {
          "name": { "type": "string", "minLength": 1 },
          "kind": {
            "type": "string",
            "enum": ["native-capability", "existing-dependency", "new-code"],
            "description": "which rung of the section 3 preference order this approach sits on."
          },
          "what_it_buys": { "type": "string", "minLength": 1 },
          "what_it_costs": {
            "type": "string",
            "minLength": 1,
            "description": "the debt, the removal cost, or the failure mode this approach introduces."
          },
          "maintenance": {
            "type": "string",
            "minLength": 1,
            "description": "last release or commit date and open-issue signal, with a source id. 'unknown' is a valid answer; a guess is not."
          },
          "source_ids": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string" }
          }
        }
      }
    },
    "recommended": {
      "type": "object",
      "additionalProperties": false,
      "required": ["name", "why", "falsified_if"],
      "properties": {
        "name": { "type": "string", "minLength": 1 },
        "why": { "type": "string", "minLength": 1 },
        "falsified_if": {
          "type": "string",
          "minLength": 1,
          "description": "the observation that would prove this recommendation wrong. a recommendation that cannot be wrong has not been examined."
        }
      }
    },
    "sources": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "additionalProperties": false,
        "required": ["id", "url", "what_it_establishes"],
        "properties": {
          "id": { "type": "string" },
          "url": {
            "type": "string",
            "format": "uri",
            "description": "the resolvable source that supports the claim: a source file, an issue, a release note, or a documentation page. not a search-result page."
          },
          "what_it_establishes": { "type": "string", "minLength": 1 }
        }
      }
    },
    "not_covered": {
      "type": "array",
      "items": { "type": "string" }
    }
  }
}
```

every `source_ids` entry must resolve to a `sources[].id` in the same response. read-only agents return no changed files.

## how the caller consumes it

- `recommended.name` and its `kind` are **evidence for** the module's implementation, not a decision. section 4 records the finding; the architect still decides.
- an `existing-dependency` recommendation adds a row to the section 3 dependency table, with its removal cost taken from `what_it_costs` and its abandonment column from `maintenance`. a dependency with no removal path is an architecture decision, not a convenience.
- `not_covered` entries become section 11 open questions or section 5 containment rows. they are never dropped silently.
- **a finding that overturns the section 3 stack returns to section 3 and is recorded there with the requirement id that decides it.** overturning the stack is allowed and cheap; overturning it silently is not.
- open every url before adopting a finding. a 404 is a dropped claim, not a footnote — the same rule recon applies to its own report.
- a worker that returns fewer than two approaches, or any claim without a resolvable source, is a failed assignment. re-dispatch it once with the citation rule restated, then proceed without it and record the gap as an open question.
