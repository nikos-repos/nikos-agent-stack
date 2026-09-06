# omnipotence process and blueprint authoring

Use this reference only when no installed process matches the requested workflow. The engine cannot start arbitrary prose: run start, the session commands, and process plan require a registered process id. Authoring and installing a blueprint are deliberate code and local-state changes.

Sources for the supported surface:

- <stack-source>/omnipotence/api.ts
- <stack-source>/omnipotence/contracts.ts
- <stack-source>/omnipotence/hooks.ts
- <stack-source>/omnipotence/blueprints.ts
- <stack-source>/omnipotence/loader.ts
- <stack-source>/docs/omnipotence-user-guide.md

Use the public subpath and the exports listed below. Do not import private functions from contracts, store, engine, profiles, blueprints, loader, or processes in a process or hook module merely because they are reachable in the repository.

Source locators: `<stack-source>` is the inspected checkout or installed package matching the active version; `<selected-blueprint-root>` is the source of the registered blueprint selected for the run. Resolve both from the release inventory and native registration, not from an assumed home directory. `<historical-home>` denotes a dated audit location only.

## public typescript API

The supported authoring import is:

~~~ts
import {
  assertvalid,
  definehook,
  defineprocess,
  jsonvalueof,
  stablejson,
} from "nikos-agent-stack/omnipotence";
import type {
  effectkind,
  hookphase,
  hookresult,
  jsonschema,
  jsonvalue,
  parallelrequest,
  processcontext,
  processparent,
} from "nikos-agent-stack/omnipotence";
~~~

Runtime exports are exactly:

- assertvalid
- defineprocess
- jsonvalueof
- stablejson
- definehook

Type exports are exactly:

- effectkind
- jsonschema
- jsonvalue
- parallelrequest
- processcontext
- processparent
- hookphase
- hookresult

The explicit barrel is intentional. Do not document a wildcard export or claim that parsejson, assertschema, assertprocessid, assertversion, compareversions, asserteffectkey, orchestrationengine, orchestrationstore, profileservice, hookregistry, or blueprintservice are public authoring imports.

## Public JSON helper signatures

- `assertvalid(schema: jsonschema, value: unknown, path = "value"): void` validates the value and throws TypeError on the first schema violation. It returns no parsed value and does not narrow a TypeScript type; use ordinary guards or a justified type after validation.
- `jsonvalueof(value: unknown, path = "value"): jsonvalue` returns normalized JSON or throws for unsupported data.
- `stablejson(value: unknown): string` normalizes through jsonvalueof and returns its deterministic JSON serialization.

For a durable response, call `assertvalid(decisionSchema, response, "decision")` before branching. These signatures follow contracts.ts:229–232,381–383,415–417; they are public through api.ts.

## define a process

Call defineprocess with these fields:

- id: lowercase dotted identifier; each segment starts with a letter and then uses lowercase letters, digits, or hyphens
- version: semantic version with an optional lowercase prerelease
- maxturns: optional integer from 1 through 10000; defaults to 64
- input: local jsonschema
- output: local jsonschema
- profiledefaults: optional JSON value
- active: optional boolean; defaults to true
- blueprint: optional name/version pin
- sourcehash: optional lowercase 64-character SHA-256
- run: async function receiving processcontext and validated input

The returned definition is immutable. defineprocess validates the id, version, schemas, blueprint identity, maxturns, run function, profile defaults, and sourcehash.

The schema vocabulary is local and lowercase: type, enum, min, max, pattern, items, properties, required, and additionalproperties. Types are null, boolean, number, integer, string, array, and object. Do not substitute JSON Schema spellings such as additionalProperties, minimum, or maximum.

A minimal process:

~~~ts
import { defineprocess } from "nikos-agent-stack/omnipotence";

export default defineprocess<{ request: string }, { accepted: boolean }>({
  id: "delivery.review",
  version: "1.0.0",
  maxturns: 32,
  input: {
    type: "object",
    required: ["request"],
    additionalproperties: false,
    properties: { request: { type: "string", min: 1 } },
  },
  output: {
    type: "object",
    required: ["accepted"],
    additionalproperties: false,
    properties: { accepted: { type: "boolean" } },
  },
  async run(ctx, input) {
    const result = await ctx.task("review", { request: input.request });
    return { accepted: Boolean(result) };
  },
});
~~~

jsonvalueof accepts only normalized JSON values: null, strings, booleans, finite numbers, dense arrays, and plain objects. It rejects cycles, sparse arrays, class instances, and non-finite numbers. Use it for output, effect values, hook input/output, and halt payloads. stablejson returns the deterministic normalized JSON string. A changed process source blocks replay; sourcehash is part of the process identity when present.

## process context

The public processcontext has runid, profile, parent, and these methods:

| method | meaning |
| --- | --- |
| ctx.task(key, input, label?) | one external task effect |
| ctx.parallel(key, requests, maxconcurrency?) | bounded task effects; requests are kind task |
| ctx.subprocess(key, processid, input) | pinned child process |
| ctx.sleep(key, until) | durable ISO timestamp sleep |
| ctx.breakpoint(key, input) | optional or required user decision |
| ctx.hook(key, hookid, input) | versioned hook effect |
| ctx.halt(reason, payload?) | intentional terminal halt; never returns |

A parallel request has exactly the public fields `key: string`, `kind: "task"`, `input: jsonvalue`, and optional `label: string`. Keys are unique within the group; the engine combines group key and child key for durable identity. For example:

~~~ts
const results = await ctx.parallel("compare", [
  { key: "a", kind: "task", input: { question: input.request } },
  { key: "b", kind: "task", input: { question: input.request } },
], 2);
const decision = await ctx.breakpoint("decision", {
  required: true,
  question: "Which result should be accepted?",
  results,
});
~~~

Put the literal boolean `required: true` in the breakpoint input object when it must wait in yolo/forever. A name such as "required-decision" has no effect on requiredness. Without that field, those modes auto-approve the optional breakpoint. The public signature has no separate required argument. Validate the returned JSON with the workflow's actual decision schema before branching; a TypeScript cast, questionnaire answer or tool approval is not that durable response. These rules follow contracts.ts:36–45,56–66 and engine.ts:427–457,552–558.

Keys must be stable lowercase effect keys. A repeated key may reuse a stored effect only with the same kind and normalized input. Do not hide an unbounded loop in a prompt or change input under an existing key.

The process parent, when present, contains runid, effectkey, processid, processversion, blueprintname, and blueprintversion. Direct context facts do not grant tool authority or point-of-risk approval.

## modes and turns

The public modes are babysit, plan, yolo, and forever. resume is an internal continuation policy, not an authoring mode.

- babysit executes effects and waits at optional and required breakpoints.
- plan does not execute effects or hooks; it reports the first pending effect or planned breakpoint and persists a completed plan result.
- yolo executes effects and auto-approves optional breakpoints only.
- forever executes with persistent mode semantics and auto-approves optional breakpoints only.

Finite modes enforce the stored maxturns. resume after a turn-budget block can extend the stored budget. forever retains its configured maxturns for replay data but does not enforce or extend it, does not create a daemon, and ends when the process returns. Required breakpoints and normal omp approvals remain required.

## define a hook

Call definehook with:

- id: lowercase dotted identifier
- version: semantic version
- phase: run_start, before_advance, effect_requested, effect_resolved, run_blocked, run_completed, run_failed, run_halted, or recovery
- timeoutms: integer from 1 through 60000
- priority: optional integer from -10000 through 10000; defaults to 100
- active: optional boolean; defaults to true
- blueprint: optional name/version pin
- run: async function receiving normalized JSON input and AbortSignal

Hooks run sequentially by priority and then id. Honor AbortSignal. A hook timeout or dispatch failure follows the owning phase's failure boundary; do not claim that a hook makes external side effects exactly once.

## blueprint package

A local blueprint has this layout:

~~~text
<source>/
  omnipotence.blueprint.json
  processes/
    <process>.ts
  hooks/
    <hook>.ts
~~~

Required manifest fields are schema, name, version, engine, processes, hooks, files, and migrations. config and profile are optional object fields. The manifest rejects other top-level fields. schema is currently 1. name is a lowercase dotted identifier. version is semantic. engine uses the local minimum-compatible form such as >=1.0.0. processes and hooks are arrays of entries with id and entry and an optional named export defaulting to default. Every declared process or hook file appears in files with a lowercase SHA-256 digest. config and profile are objects. migrations is an array of explicit from/patch objects.

The `files` field is an object mapping each package-relative filename to its exact lowercase 64-character SHA-256 string: `Record<string, string>`, not an array of file records. Every process/hook entry path is a key in that object; include referenced helper files as declared files too. Compute hashes from the final source bytes. Empty hooks and migrations use `[]`; optional config defaults to `{}`. The manifest itself is copied separately and need not be included in its own files map. This shape follows blueprints.ts:95–160,199–218,264–269.

Installation is local-path-only. Inspect and dry-run before writing. The loader rejects URL sources, path escape, undeclared files, hash mismatch, and invalid manifest values. It does not run installer scripts. Versions install side by side; active runs keep their original process/blueprint pin. Update activates a new version for new runs, rollback activates a compatible prior version, and removal refuses a version pinned by a non-terminal run.

## authoring workflow

1. Search omnipotence process list --json for a registered process to reuse.
2. State the input/output schemas, effects, failure modes, approvals, and completion result.
3. Write the smallest process that owns the workflow. Keep general coding logic in the worker, not in the engine.
4. Add hooks only for cross-cutting lifecycle policy that the process cannot own.
5. Assign stable effect keys and one result owner.
6. Add declared files and exact SHA-256 values to the manifest.
7. Run omnipotence blueprint inspect <source-path> --json.
8. Run omnipotence --dry-run blueprint install <source-path> --json.
9. Install only with applicable user authorization into the intended isolated or target store, then restart the omp session so active blueprints reload.
10. Once registered, validate input with omnipotence --dry-run process plan <process-id> --input '<json>' --json. This resolves the process and validates input only; it does not load an uninstalled draft or evaluate the process to its first effect.
11. In that authorized store, use process plan without --dry-run for the persisted first-effect preview; it executes no external effects or hooks. Run the scoped authorized real canary and resume/replay check required by the changed workflow.

Do not claim that a file on disk is registered. Inspect process, hook, blueprint, and guard lists after installation. A source fingerprint or manifest is evidence of selected bytes, not proof that the running extension loaded them.

## factory dependencies

The obsolete FACTORY_USER_GUIDE.md and FACTORY_RULE_REGISTRY.md are no longer dependencies of this skill. Read the maintained OMP-DEV-USER-GUIDE.md beside the selected agent prompt, skills/USER_GUIDE.md, new-project and its phase contracts, and the selected installed blueprint/process/guard sources. Resolve actual paths and registration in the target environment; a file or inventory hash is not proof of active loading.

## worker result contract

When a process requests task or parallel work, the worker receives a committed run/effect identity. It must execute only the supplied input, preserve the process contract, never invent run/effect/fence/hash fields, return JSON matching the process's expected effect usage, and post exactly once through the active session's omnipotence_result path. Use uncertain when an external action may have occurred but evidence is incomplete. Let the owning run choose confirm, fail, retry, compensation, or halt.
