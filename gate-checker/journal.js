export const journal_type = "omp.gate-checker.journal";
export const journal_version = 1;

function recovery(reason) {
  return {
    status: "recovery_required",
    reason,
    request_id: null,
    continuation: 0,
    failure_hash: null,
    verify_ids: [],
    outcome: null,
    release_reason: null,
  };
}

function valid(event) {
  return Boolean(
    event &&
    typeof event === "object" &&
    event.version === journal_version &&
    typeof event.kind === "string" &&
    typeof event.request_id === "string" &&
    event.request_id.length > 0,
  );
}

export function reducejournal(events) {
  let state = {
    status: "idle",
    request_id: null,
    repo_root: null,
    baseline_sha: null,
    baseline_dirty: [],
    policy_fingerprint: null,
    continuation: 0,
    failure_hash: null,
    verify_ids: [],
    outcome: null,
    release_reason: null,
  };

  for (const event of events) {
    if (!valid(event)) return recovery("malformed journal event");
    if (event.kind === "request_start") {
      if (state.status === "active") return recovery("overlapping journal requests");
      if (
        typeof event.repo_root !== "string" ||
        !Array.isArray(event.baseline_dirty) ||
        typeof event.policy_fingerprint !== "string"
      ) return recovery("invalid request baseline");
      state = {
        status: "active",
        request_id: event.request_id,
        repo_root: event.repo_root,
        baseline_sha: typeof event.baseline_sha === "string" ? event.baseline_sha : null,
        baseline_dirty: event.baseline_dirty.filter((path) => typeof path === "string"),
        policy_fingerprint: event.policy_fingerprint,
        continuation: 0,
        failure_hash: null,
        verify_ids: [],
        outcome: null,
        release_reason: null,
      };
      continue;
    }
    if (state.status !== "active" || event.request_id !== state.request_id) {
      return recovery("journal event does not match an active request");
    }
    if (event.kind === "continuation") {
      if (!Number.isInteger(event.continuation) || event.continuation < 1) {
        return recovery("invalid continuation event");
      }
      state = {
        ...state,
        continuation: event.continuation,
        failure_hash: typeof event.failure_hash === "string" ? event.failure_hash : null,
      };
    } else if (event.kind === "verify") {
      if (typeof event.verify_id !== "string") return recovery("invalid verify event");
      state = { ...state, verify_ids: [...state.verify_ids, event.verify_id] };
    } else if (event.kind === "terminal") {
      if (typeof event.outcome !== "string") return recovery("invalid terminal event");
      state = {
        ...state,
        status: "terminal",
        outcome: event.outcome,
        release_reason: typeof event.release_reason === "string"
          ? event.release_reason
          : null,
      };
    } else {
      return recovery(`unknown journal event: ${event.kind}`);
    }
  }

  return state;
}

export function journalfrombranch(branch) {
  if (!Array.isArray(branch)) return reducejournal([]);
  const events = branch
    .filter((entry) => entry?.type === "custom" && entry.customType === journal_type)
    .map((entry) => entry.data);
  return reducejournal(events);
}
