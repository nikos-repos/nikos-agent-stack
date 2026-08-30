import { describe, expect, test } from "bun:test";
import { assertschema, assertvalid, compareversions, defineprocess, jsonvalueof, stablejson } from "./contracts.ts";
import type { jsonschema, processcontext } from "./contracts.ts";

const input: jsonschema = {
	type: "object",
	required: ["request"],
	additionalproperties: false,
	properties: {
		request: { type: "string", min: 1 },
		options: {
			type: "object",
			additionalproperties: false,
			properties: { review: { type: "boolean" } },
		},
	},
};

describe("native orchestration contracts", () => {
	test("a process freezes one validated public definition", () => {
		const process = defineprocess({
			id: "delivery.review",
			version: "1.0.0",
			maxturns: 12,
			input,
			output: { type: "object", required: ["ok"], properties: { ok: { type: "boolean" } } },
			async run(_ctx: processcontext, value: unknown) {
				assertvalid(input, value, "input");
				if (!value || typeof value !== "object" || !("request" in value)) {
					throw new Error("input.request: expected string");
				}
				return { ok: typeof value.request === "string" && value.request.length > 0 };
			},
		});

		expect(process.id).toBe("delivery.review");
		expect(process.maxturns).toBe(12);
		expect(Object.isFrozen(process)).toBe(true);
	});

	test("trust-boundary validation reports the exact invalid path", () => {
		expect(() => assertvalid(input, { request: "ship", extra: true }, "input")).toThrow(
			"input.extra: unknown field",
		);
		expect(() => assertvalid(input, { request: "" }, "input")).toThrow(
			"input.request: expected at least 1 characters",
		);
	});
	test("type unions apply constraints only to matching branches", () => {
		const hash: jsonschema = { type: ["string", "null"], pattern: "^[a-f0-9]{64}$" };
		assertschema(hash);
		expect(() => assertvalid(hash, null)).not.toThrow();
		expect(() => assertvalid(hash, "a".repeat(64))).not.toThrow();
		expect(() => assertvalid(hash, "z".repeat(64))).toThrow(
			"value: expected one of types string, null",
		);
		expect(() => assertvalid(hash, 42)).toThrow("value: expected one of types string, null");
	});

	test("all-json and unconstrained array schemas accept nested json values", () => {
		const alljson: jsonschema = {
			type: ["null", "boolean", "number", "string", "array", "object"],
			additionalproperties: true,
		};
		assertschema(alljson);
		expect(() => assertvalid(alljson, { nested: [null, true, 1, "text", { value: false }] })).not.toThrow();

		const array: jsonschema = { type: "array" };
		assertschema(array);
		expect(() => assertvalid(array, [null, { nested: ["text"] }])).not.toThrow();
	});
	test("sparse array holes fail validation and normalization before storage", () => {
		const sparse = (length: number): unknown[] => {
			const holes: unknown[] = [];
			holes.length = length;
			return holes;
		};
		const alljson: jsonschema = {
			type: ["null", "boolean", "number", "string", "array", "object"],
			additionalproperties: true,
		};

		expect(() => assertvalid({ type: "array", items: { type: "string" } }, sparse(1))).toThrow(
			"value[0]: expected string",
		);
		expect(() => assertvalid({ type: "array", items: alljson }, sparse(1))).toThrow(
			"value[0]: expected one of types null, boolean, number, string, array, object",
		);
		expect(() => jsonvalueof(sparse(2))).toThrow("value[0]: expected own array element");
		expect(jsonvalueof(["text", { nested: ["value"] }])).toEqual(["text", { nested: ["value"] }]);
	});

	test("type unions must be non-empty unique and supported", () => {
		expect(() => assertschema({ type: [] })).toThrow("schema.type: expected non-empty type array");
		expect(() => assertschema({ type: ["string", "string"] })).toThrow(
			"schema.type: expected unique type array",
		);
		expect(() => assertschema({ type: ["string", "date"] })).toThrow(
			"schema.type: expected supported type",
		);
		expect(() => assertvalid({ type: ["string", "number"] }, true)).toThrow(
			"value: expected one of types string, number",
		);
	});

	test("stable json makes hashes independent of object key order", () => {
		expect(stablejson({ b: 2, a: { d: 4, c: 3 } })).toBe(
			'{"a":{"c":3,"d":4},"b":2}',
		);
		expect(() => stablejson({ value: Number.NaN })).toThrow("value: expected finite number");
	});

	test("object validation ignores inherited property names", () => {
		expect(() =>
			assertschema({
				type: "object",
				required: ["constructor"],
				properties: {},
			}),
		).toThrow("schema.required: missing property constructor");

		const properties: Record<string, jsonschema> = {};
		Object.defineProperty(properties, "constructor", {
			value: { type: "string" },
			enumerable: true,
		});
		const requiredconstructor: jsonschema = {
			type: "object",
			required: ["constructor"],
			properties,
			additionalproperties: false,
		};
		assertschema(requiredconstructor);
		expect(() => assertvalid(requiredconstructor, {})).toThrow(
			'value.constructor: required field',
		);

		const ownconstructor: Record<string, unknown> = {};
		Object.defineProperty(ownconstructor, "constructor", {
			value: true,
			enumerable: true,
		});
		expect(() =>
			assertvalid(
				{ type: "object", properties: {}, additionalproperties: false },
				ownconstructor,
			),
		).toThrow("value.constructor: unknown field");
	});

	test("invalid process identities and budgets fail before registration", () => {
		expect(() =>
			defineprocess({
				id: "Delivery Review",
				version: "1.0.0",
				input,
				output: { type: "null" },
				async run() {
					return null;
				},
			}),
		).toThrow("process.id: expected lowercase dotted identifier");

		expect(() =>
			defineprocess({
				id: "delivery.review",
				version: "1.0.0",
				maxturns: 0,
				input,
				output: { type: "null" },
				async run() {
					return null;
				},
			}),
		).toThrow("process.maxturns: expected integer from 1 to 10000");
	});

	test("process schemas are required and valid before registration", () => {
		const missingoutput = {
			id: "delivery.review",
			version: "1.0.0",
			input,
			async run() {
				return null;
			},
		};
		expect(() => Reflect.apply(defineprocess, undefined, [missingoutput])).toThrow(
			"process.output: expected schema",
		);

		const invalidinput = {
			id: "delivery.review",
			version: "1.0.0",
			input: { type: "array" },
			output: { type: "null" },
			async run() {
				return null;
			},
		};
		expect(() => Reflect.apply(defineprocess, undefined, [invalidinput])).not.toThrow();

		const inheritedfield = {
			id: "delivery.review",
			version: "1.0.0",
			input: { type: "object", constructor: true },
			output: { type: "null" },
			async run() {
				return null;
			},
		};
		expect(() => Reflect.apply(defineprocess, undefined, [inheritedfield])).toThrow(
			"process.input.constructor: unknown schema field",
		);

		const inheritedtype = {
			id: "delivery.review",
			version: "1.0.0",
			input: { type: "constructor" },
			output: { type: "null" },
			async run() {
				return null;
			},
		};
		expect(() => Reflect.apply(defineprocess, undefined, [inheritedtype])).toThrow(
			"process.input.type: expected supported type",
		);
	});
	test("semantic versions compare by numeric and prerelease precedence", () => {
		const cases = [
			["1.0.0", "1.0.0-rc.1", 1],
			["1.0.0-rc.10", "1.0.0-rc.2", 1],
			["1.0.0-alpha", "1.0.0-beta", -1],
			["1.0.0-alpha.1", "1.0.0-alpha.beta", -1],
			["1.0.0-alpha.2", "1.0.0-alpha.10", -1],
			["2.0.0", "10.0.0", -1],
		] as const;
		for (const [left, right, expected] of cases) {
			expect(Math.sign(compareversions(left, right))).toBe(expected);
			expect(Math.sign(compareversions(right, left))).toBe(-expected);
		}
	});
});
