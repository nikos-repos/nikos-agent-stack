---
name: skill-dev
description: "Draft, review, or audit OMP SKILL.md definitions. Use in singular mode to author or QA one skill's front matter, trigger precision, structure, local references, tool ownership, scope, provenance, and safe verification. Use in plural mode to audit a skills directory for redundancy, stale triggers, duplicate names, obsolete references, or redundant native-tool wrappers."
argument-hint: "<skill file or skills directory>"
license: Apache-2.0
---

# Skill Dev

Author, review, or audit skill definitions as self-contained operational guides. Keep each skill's instructions specific enough to choose it only for its intended task and useful enough to change how that task is executed.

> 

This skill is advisory only. It never edits, deletes, renames, disables, packages, or modifies skill files automatically.

## Modes

- **Singular (author/review):** inspect and improve one `SKILL.md`. Use when drafting a new skill or reviewing an existing one for quality.
- **Plural (audit):** inspect an entire skills directory for redundancy, staleness, duplicates, and native-tool-wrapper candidates. Use when asked to clean up, deduplicate, or assess skill QA across a project.

## Deterministic preflight

For mechanical preflight, inspect native OMP front matter for nonempty name/description, directory-name agreement and duplicate names, then resolve local references from the selected root. Preserve supported OMP metadata such as argument-hint. Use an available, inspected read-only validator only when its path and supported format have been verified; this installation previously cited a linter that was absent.

Mechanical findings are input to review, never a semantic verdict or permission to delete a skill. Plural audit remains advisory; report overlap and removal candidates with source evidence. Explicit authoring/change requests determine the allowed edit scope.

## Shared inspection method

Apply to every skill under review, whether singular or plural.

### Front matter and triggers

1. Verify that each skill has a parseable YAML front matter block with a non-empty `name` and `description`.
2. Provide a unique, lowercase-hyphenated `name` matching the skill directory. Compare the name with its directory and detect duplicate names across the scope.
3. In the `description`, name both the task and distinct activation conditions; avoid generic verbs such as "help," "manage," or "handle" without an object and context.
4. Flag descriptions that fail to state the task and a distinct activation condition, rely on vague verbs, or collide with another skill's trigger wording. Treat a fixable metadata defect as a QA finding, not removal evidence by itself.

### Structure and body

1. Confirm that `SKILL.md` holds a clear purpose and actionable workflow rather than only a title or tool list. Include a short purpose, ordered decision or execution steps, constraints, and verification appropriate to the task. Use imperative, verb-first instructions.
2. Explain task-specific judgment; do not restate native tool manuals.

### Local references

1. Add or check a local resource only when it supplies reusable task knowledge, data, or an output asset. Name every local path exactly and resolve it relative to the skill directory with `glob` and `read`.
2. For every local path, resource, or relative reference named in a skill, resolve it from that skill's directory with `glob`, then inspect it with `read` when it exists. Report a missing, ambiguous, or out-of-scope path; do not fetch external URLs to compensate. Remove no files as part of this check; report missing or unnecessary references to the requester instead.

### Tool ownership

Name OMP first-class tools only where they support a task-specific step: use `glob` and `read` for discovery and evidence, `grep` for text lookup, `lsp` for code intelligence, `edit` or `write` for approved changes, `browser` for rendered UI evidence, and `bash` only for bounded commands the native tools do not provide. Do not create wrappers, installers, hooks, connectors, scripts, or alternative runtimes merely to invoke those tools.

### Scope and approvals

Keep the skill advisory unless the requested task explicitly authorizes a change. Before crossing an external boundary—network access, external service action, publication, credential use, or writes outside the active task scope—present the target and effect and obtain approval. Do not claim sandboxing, foreign history access, browser-profile access, or automatic global changes.

### Provenance

For every adapted method, cite the source URL, pinned commit, and source path beside the relevant guidance. Distinguish adapted process from copied content and do not imply authority beyond the cited method.

## Singular mode: authoring checklist

When drafting or reviewing a single skill, work through each item:

1. **Define the boundary.** State the one job the skill performs, its expected result, and concrete requests that should activate it. State nearby work it does not own so its trigger does not overlap a general-purpose or specialist skill.
2. **Write precise front matter.** (See shared inspection method above.)
3. **Give an actionable body.** Include a short purpose, ordered decision or execution steps, constraints, and verification appropriate to the task.
4. **Keep references local and intentional.** (See shared inspection method above.)
5. **Assign tools by ownership.** (See shared inspection method above.)
6. **Preserve scope and approvals.** (See shared inspection method above.)
7. **Record provenance.** (See shared inspection method above.)

## Singular mode: review and safe verification

1. Use `read` to inspect the complete proposed `SKILL.md`; confirm YAML delimiters, `name`, and `description` are present and unique within the relevant skill directory using `glob` and `read`.
2. Compare the description with the body: each trigger must map to a real workflow, and each workflow must remain within the stated boundary.
3. Resolve every referenced local path with `glob`, then inspect it with `read` when it exists. Report a missing, ambiguous, or out-of-scope path; do not fetch external URLs to compensate.
4. Check that the workflow assigns native tools to concrete work and adds no installation, packaging, archive, deletion, hook, automation, or global-write mechanism.
5. Perform the smallest safe exercise of the skill's written process using only existing project inputs. If verification would alter data, invoke a service, publish, or cross an external boundary, stop and request approval instead.
6. Report the checked front matter, trigger examples, resolved local references, unverified boundaries, and any defects. Recommend edits but do not remove or disable skills.

## Plural mode: audit process

1. **Inventory first.** Use `glob` to locate project-local `SKILL.md` files in declared skill directories, then use `read` to collect each file's path, front matter, title, purpose, and referenced local resources. Record the inventory before drawing conclusions.
2. **Check front matter and triggers.** Apply the shared inspection method to every skill in the directory.
3. **Check structure and local references.** Apply the shared inspection method to every skill.
4. **Detect redundant native-tool wrappers.** Compare each skill's substantive instructions with the available OMP primitives. Flag a candidate only when it merely restates how to invoke a native tool and adds no task-specific decision process, domain knowledge, safety boundary, or reusable local reference. Preserve skills that supply any of those distinct contributions.
5. **Check overlap and duplicates.** Use `grep` to locate repeated trigger nouns and task phrases, then compare front matter and body intent. Distinguish exact duplicates, near-duplicates, complementary skills, and QA defects. Verify every proposed kept copy by reading it; do not infer availability from a filename alone.
6. **Report recommendations.** Present the inventory and QA findings, then removal candidates only. For each candidate, include the path, evidence, proposed kept copy (if any), and a confidence level. When evidence is insufficient, report a question rather than a removal recommendation.

## Plural mode: report format

Return an in-chat report with:

1. **Inventory** — all discovered skills with paths, names, and descriptions.
2. **QA findings** — front matter, trigger, structure, and reference issues per skill, labeled as repairable defects.
3. **Overlap analysis** — trigger collisions, near-duplicates, and complementary skills with evidence.
4. **Removal candidates** — path, evidence, proposed kept copy, confidence level. Include redundant native-tool-wrapper candidates here.
5. **Verification** — re-read every proposed kept copy and use `glob` to confirm every referenced local path named in the report. Ensure each removal recommendation has concrete duplicate, overlap, stale-reference, or redundant-native-wrapper evidence and that the audit itself made no file changes.

## Safety rules

- Never delete, rename, edit, disable, package, archive, or otherwise modify skill files automatically.
- Never create packaging scripts or zip archives, install hooks, write globally, or modify source repositories.
- Never recommend removal solely because usage evidence is absent or front matter is imperfect; usage is heuristic and metadata defects are usually repairable.
- Cleanup actions are out of scope for this skill; provide recommendations only.
- Do not package skills, generate zip archives, scaffold files, install dependencies, add hooks, or make automatic global changes.
- Do not inspect or modify source repositories except when explicitly asked and approved for the current task.
