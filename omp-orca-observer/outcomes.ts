import type { OutcomeTracker, RunOutcome } from "./contract.ts";

const MAX_CHILDREN = 4_096;

type ChildState = {
  generation: number;
  outcome: RunOutcome;
};

/**
 * @cc [label:product] outcome-current-generation
 * Generations count observed starts, not native run identities. Conflicting terminals
 * stay unknown until another start; evidence loss ignores terminals until then.
 * Callers must forget replaced incarnations. Spawn ids and timestamps are display only.
 * Recording, reading, and child-specific loss refresh recency; global loss preserves
 * relative recency. At most 4,096 live records and 4,096 eviction ids are retained.
 * Older eviction ids become indistinguishable from ids with no lifecycle evidence.
 */
export function createOutcomeTracker(): OutcomeTracker {
  const children = new Map<string, ChildState>();
  const evicted = new Set<string>();

  function remember(childId: string, state: ChildState): void {
    children.delete(childId);
    children.set(childId, state);
    evicted.delete(childId);
    if (children.size > MAX_CHILDREN) {
      const oldest = children.keys().next().value!;
      children.delete(oldest);
      evicted.add(oldest);
      if (evicted.size > MAX_CHILDREN) {
        evicted.delete(evicted.values().next().value!);
      }
    }
  }

  return {
    record(fact) {
      const current = children.get(fact.childId);
      const generation = (current?.generation ?? 0) + (fact.status === "started" ? 1 : 0);
      let outcome: RunOutcome;
      if (fact.status === "started" || current?.outcome.state === "started") {
        outcome = {
          state: fact.status,
          generation,
          spawnCallId: fact.spawnCallId === null
            ? { known: false, reason: "no spawn call id" }
            : { known: true, value: fact.spawnCallId },
          at: fact.at,
        };
      } else if (!current) {
        outcome = { state: "unknown", reason: "terminal without observed start" };
      } else if (current.outcome.state === "unknown" || current.outcome.state === fact.status) {
        outcome = current.outcome;
      } else {
        outcome = { state: "unknown", reason: "ambiguous terminal evidence" };
      }
      const state = current ?? { generation, outcome };
      state.generation = generation;
      state.outcome = outcome;
      remember(fact.childId, state);
    },

    evidenceLost(reason, childId) {
      if (childId !== undefined) {
        const current = children.get(childId);
        const outcome: RunOutcome = { state: "unknown", reason };
        const state = current ?? { generation: 0, outcome };
        state.outcome = outcome;
        remember(childId, state);
        return;
      }
      for (const state of children.values()) {
        state.outcome = { state: "unknown", reason };
      }
    },

    outcome(childId) {
      const state = children.get(childId);
      if (!state) {
        return { state: "unknown", reason: evicted.has(childId) ? "evicted" : "no lifecycle evidence" };
      }
      children.delete(childId);
      children.set(childId, state);
      return state.outcome;
    },

    forget(childId) {
      children.delete(childId);
      evicted.delete(childId);
    },

    clear() {
      children.clear();
      evicted.clear();
    },
  };
}
