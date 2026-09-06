# Deliver through the required operational boundary

Read for authorized shipping/deployment, runtime-impacting changes, migrations, or a task that includes operation after release. Apply only the relevant boundary; a local artifact task does not acquire a production checklist.

## Identity and authority

Distinguish locally verified, PR opened, required checks passed for the current head, merged, intended artifact deployed to the intended environment, and observed healthy over a stated period. Use actual release-system relationships between revision, artifact, environment, and observation. A name, requested deployment, or old CI pass cannot stand in for the current fact. Missing required checks are not green; a push can invalidate earlier check evidence.

Existing user authorization persists for its stated action and target. Complete authorized preparation before asking for any missing final authority. Do not infer authority to publish, comment, merge, communicate externally, or monitor indefinitely from this reference or an upstream workflow default.

## Prepare and observe

For material runtime impact, identify the existing operator, failure signals, rollout constraints, and credible recovery path. A migration may need forward repair or tested restore rather than reversible rollback. Use the project's existing release and recovery artifacts; do not invent a universal runbook or new service.

After an authorized deployment, exercise the required primary journey and relevant failure path against the actual deployed identity, and inspect appropriate operational signals for the agreed observation window. For changed UI behavior, select reachable pending, empty, error, retry, permission, and recovery states. Real device and accessibility requirements need appropriate observed evidence; CSS, screenshots, or a build alone do not establish interaction correctness.

When CI/review is still arriving, use bounded stabilization: inspect the current revision, handle relevant new findings, and reestablish readiness after changes. Longer-term follow-up uses the host's existing scheduler when requested or already authorized. A skill is not a daemon and cannot promise hard enforcement or permanent observation.

## Failure and handoff

If operation fails, contain further rollout within authority, preserve exact identity and evidence, and use the established recovery or escalation path. Record the receiving owner and receipt plus resolution or remaining required action. An unacknowledged escalation does not transfer ownership. Report missing access or proof as a limitation or blocker according to acceptance; do not invent health or successful recovery.

The factory retains all five mandatory finish records in their existing order and schema: release, smoke, primary journey, critical failure, and traceability. Its release record does not automatically establish deployment. Use existing release artifacts and allowed evidence references for additional task-required operational proof. Do not add a sixth finish record, seventh check, or waive an admitted factory's finish requirement.

Sources: Compound [shipping workflow](https://github.com/EveryInc/compound-engineering-plugin/blob/57e409e5c8c2c472106bd7d87ac72b724b70826b/skills/ce-work/references/shipping-workflow.md), [PR pipeline](https://github.com/EveryInc/compound-engineering-plugin/blob/57e409e5c8c2c472106bd7d87ac72b724b70826b/skills/ce-babysit-pr/references/pipeline.md), and [settling](https://github.com/EveryInc/compound-engineering-plugin/blob/57e409e5c8c2c472106bd7d87ac72b724b70826b/skills/ce-babysit-pr/references/settle.md), adapted to existing OMP authority and finish contracts. Workflow/UI/escalation refinements also derive from bookmark synthesis entries B103, B279, and B300; source qualifications remain in the integration provenance record.
