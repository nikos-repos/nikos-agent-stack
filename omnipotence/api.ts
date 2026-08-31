// the public authoring surface for process and hook authors. explicit by design: a wildcard
// barrel would turn every internal export into a permanent api commitment, so anything added
// here is a deliberate versioned decision. plugin.test.ts pins this file in both directions:
// no wildcard re-exports, and exactly this set of runtime values.
export { assertvalid, defineprocess, jsonvalueof, stablejson } from "./contracts.ts";
export { definehook } from "./hooks.ts";

export type {
	effectkind,
	jsonschema,
	jsonvalue,
	parallelrequest,
	processcontext,
	processparent,
} from "./contracts.ts";
export type { hookphase, hookresult } from "./hooks.ts";
