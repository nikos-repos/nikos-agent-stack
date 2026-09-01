import { isRecord, isText } from "./predicates.js";

export const journal_type = "omp.gate-checker.journal";
export const journal_version = 1;
const recovery = (reason) => ({ status: "recovery_required", reason, request_id: null, continuation: 0, failure_hash: null, verify_ids: [], outcome: null, release_reason: null });
const objectLike = (value) => isRecord(value) || Array.isArray(value);
const valid = (event) => isRecord(event) && event.version === journal_version && isText(event.kind) && isText(event.request_id) && event.request_id.length > 0;

export function reducejournal(events) {
  let state = {
    status: "idle", request_id: null, repo_root: null, baseline_sha: null,
    baseline_dirty: [], baseline_snapshots: {}, policy_fingerprint: null,
    continuation: 0, failure_hash: null, verify_ids: [], outcome: null, release_reason: null,
  };
  if (!Array.isArray(events)) return recovery("malformed journal event");
  for (const event of events) {
    if (!valid(event)) return recovery("malformed journal event");
    if (event.kind === "request_start") {
      if (state.status === "active") return recovery("overlapping journal requests");
      if (!isText(event.repo_root) || !Array.isArray(event.baseline_dirty) || !isText(event.policy_fingerprint))
        return recovery("invalid request baseline");
      state = {
        status: "active", request_id: event.request_id, repo_root: event.repo_root,
        baseline_sha: isText(event.baseline_sha) ? event.baseline_sha : null,
        baseline_dirty: event.baseline_dirty.filter(isText),
        baseline_snapshots: objectLike(event.baseline_snapshots) ? event.baseline_snapshots : {},
        policy_fingerprint: event.policy_fingerprint, continuation: 0, failure_hash: null,
        verify_ids: [], outcome: null, release_reason: null,
      };
      continue;
    }
    if (state.status !== "active" || event.request_id !== state.request_id)
      return recovery("journal event does not match an active request");
    if (event.kind === "continuation") {
      if (!Number.isInteger(event.continuation) || event.continuation < 1) return recovery("invalid continuation event");
      state = { ...state, continuation: event.continuation, failure_hash: isText(event.failure_hash) ? event.failure_hash : null };
    } else if (event.kind === "repository_bound") {
      if (!isText(event.repo_root) || !isText(event.baseline_sha) || !Array.isArray(event.baseline_dirty) || !objectLike(event.baseline_snapshots))
        return recovery("invalid repository binding");
      state = { ...state, repo_root: event.repo_root, baseline_sha: event.baseline_sha,
        baseline_dirty: event.baseline_dirty.filter(isText), baseline_snapshots: event.baseline_snapshots };
    } else if (event.kind === "verify") {
      if (!isText(event.verify_id)) return recovery("invalid verify event");
      state = { ...state, verify_ids: [...state.verify_ids, event.verify_id] };
    } else if (event.kind === "terminal") {
      if (!isText(event.outcome)) return recovery("invalid terminal event");
      state = { ...state, status: "terminal", outcome: event.outcome,
        release_reason: isText(event.release_reason) ? event.release_reason : null };
    } else return recovery(`unknown journal event: ${event.kind}`);
  }
  return state;
}

export function journalfrombranch(branch) {
  if (!Array.isArray(branch)) return reducejournal([]);
  return reducejournal(branch.filter((entry) => isRecord(entry) && entry.type === "custom" && entry.customType === journal_type).map((entry) => entry.data));
}
