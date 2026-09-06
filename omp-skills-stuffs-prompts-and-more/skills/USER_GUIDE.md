# Skills routing guide

This is the routing guide for the proposed release. It becomes the installed guide only after source selection and recovery checks pass. [OMP-DEV control map](../OMP-DEV-USER-GUIDE.md) explains policy and enforcement. Read the selected skill and its relevant references; this index grants no authority and does not load all skills.

| Situation | Entry and next owner |
|---|---|
| Defined change in an existing repository | [engineering-workflow](engineering-workflow/SKILL.md); root owns acceptance and shared branch names its integrator |
| Failure with an unknown cause | diagnosing-bugs, then engineering-workflow for the grounded repair |
| Observable behavior suitable for test-first work outside a factory | [tdd](tdd/SKILL.md), using a suitable existing failing test where possible |
| Product/specification work needing the multi-phase factory | [new-project](new-project/SKILL.md), through the installed /factory workflow and its actual capability checks |
| Any task in an already admitted factory graph, including a stable interface | [factory-build](factory-build/SKILL.md); this route replaces tdd and keeps its probes, cadence, budget and six result checks |
| Session coordination, shared write ownership, handoff, detached jobs or recovery | [session-coordination](session-coordination/SKILL.md); native OMP retains execution authority |
| Requested simplification audit or substantive contract retirement | [simplify-codebase](simplify-codebase/SKILL.md) |
| Evidence-backed review | [deep-code-review](deep-code-review/SKILL.md); verify diagnosis and remedy separately |
| Settled product/repository conversation needing a local spec | to-spec, when installed and applicable |
| Explicitly authorized commit/push | git-commit and its inspected script; push is opt-in |
| Durable process/effect/profile/blueprint operation | [omnipotence-cli](omnipotence-cli/SKILL.md); inspect payload status, not exit zero alone |
| GPUI app work, including Paper frame translation | [build-gpui-apps](build-gpui-apps/SKILL.md) and its local Paper reference; verify the needed Paper connection before using it |
| Skill authoring or skills-directory review | [skill-dev](skill-dev/SKILL.md); plural audit is advisory and does not authorize removal |
| GitHub project prioritization or diagram/report selection | github-project-triage or visual-documentation, when installed and applicable |

The factory chain is new-project → factory-discovery → factory-recon → factory-requirements → factory-architecture → factory-taskgraph → factory-waves, with factory-build used by its task workers. New-project owns product gates, decisions and state transitions; validated controller effects can execute its machine actions. A phase may read state only where its contract requires that check and cannot write it. Waves owns worktrees, integration and prescribed gatekeeper/reviewer dispatch. The gatekeeper persists exactly six checks. Finish still requires all five records, including release evidence.

The old coherent-agent-operating-loop name is retired for new source selection. Its replacement is session-coordination, with an explicitly narrower session/run coordination purpose. Historical methodology documents and old source bundles remain preserved; this is an intentional capability retirement, not an alias or an assertion of measured equivalence. Update callers and verify native selection before retiring the old installed entry. Old active factory runs retain the original effective guidance or drain under the unchanged installation.

External unchanged skills such as diagnosing-bugs, to-spec and git-commit must be resolved in the target catalogue. A missing dependency blocks its own operation. There is no FACTORY_USER_GUIDE or FACTORY_RULE_REGISTRY dependency: maintained contracts are in new-project and the phase references. Skill descriptions influence model selection; they do not constitute a deterministic router.
