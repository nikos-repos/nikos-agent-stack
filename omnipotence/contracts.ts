export type jsonprimitive = string | number | boolean | null;
export type jsonvalue = jsonprimitive | jsonvalue[] | { [key: string]: jsonvalue };
export type jsontype = "null" | "boolean" | "number" | "integer" | "string" | "array" | "object";

export interface jsonschema {
	type?: jsontype | readonly jsontype[];
	enum?: readonly jsonprimitive[];
	min?: number;
	max?: number;
	pattern?: string;
	items?: jsonschema;
	properties?: Record<string, jsonschema>;
	required?: readonly string[];
	additionalproperties?: boolean;
}

export interface validationissue {
	path: string;
	message: string;
}

export type runstatus =
	| "created"
	| "running"
	| "waiting_effect"
	| "waiting_for_user"
	| "blocked"
	| "completed"
	| "failed"
	| "halted";

export type effectstatus = "requested" | "resolved_ok" | "resolved_error" | "uncertain" | "cancelled";
export type effectkind = "task" | "parallel" | "subprocess" | "sleep" | "breakpoint" | "hook";
export type orchestrationmode = "babysit" | "plan" | "yolo" | "forever";

export interface effectrequest {
	key: string;
	kind: effectkind;
	input: jsonvalue;
	label?: string;
}

export interface parallelrequest extends effectrequest {
	kind: "task";
}

export interface processparent {
	readonly runid: string;
	readonly effectkey: string;
	readonly processid: string;
	readonly processversion: string;
	readonly blueprintname: string | null;
	readonly blueprintversion: string | null;
}

export interface processcontext {
	readonly runid: string;
	readonly profile: jsonvalue;
	readonly parent: processparent | null;
	task(key: string, input: jsonvalue, label?: string): Promise<jsonvalue>;
	parallel(key: string, requests: readonly parallelrequest[], maxconcurrency?: number): Promise<jsonvalue[]>;
	subprocess(key: string, processid: string, input: jsonvalue): Promise<jsonvalue>;
	sleep(key: string, until: string): Promise<void>;
	breakpoint(key: string, input: jsonvalue): Promise<jsonvalue>;
	hook(key: string, hookid: string, input: jsonvalue): Promise<jsonvalue>;
	halt(reason: string, payload?: jsonvalue): never;
}

export interface processblueprint {
	name: string;
	version: string;
}

export interface processdefinition<input = unknown, output = unknown> {
	id: string;
	version: string;
	maxturns: number;
	input: jsonschema;
	output: jsonschema;
	blueprint?: processblueprint;
	active: boolean;
	profiledefaults?: jsonvalue;
	sourcehash?: string;
	run(context: processcontext, input: input): Promise<output>;
}

export interface processinput<input = unknown, output = unknown> {
	id: string;
	version: string;
	maxturns?: number;
	input: jsonschema;
	output: jsonschema;
	blueprint?: processblueprint;
	active?: boolean;
	profiledefaults?: jsonvalue;
	sourcehash?: string;
	run(context: processcontext, input: input): Promise<output>;
}

export interface jsonerror {
	code: string;
	message: string;
	details?: jsonvalue;
}

export type jsonenvelope<data extends jsonvalue = jsonvalue> =
	| { ok: true; data: data }
	| { ok: false; error: jsonerror };

const processidpattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const versionpattern = /^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/;
const effectkeypattern = /^[a-z0-9][a-z0-9._/-]{0,127}$/;
const allowedschemafields: Record<string, true> = {
	type: true,
	enum: true,
	min: true,
	max: true,
	pattern: true,
	items: true,
	properties: true,
	required: true,
	additionalproperties: true,
};
const allowedschematypes: Record<string, true> = {
	null: true,
	boolean: true,
	number: true,
	integer: true,
	string: true,
	array: true,
	object: true,
};

function pathfor(parent: string, key: string): string {
	return /^[a-z_][a-z0-9_]*$/i.test(key) ? `${parent}.${key}` : `${parent}[${JSON.stringify(key)}]`;
}

function issue(path: string, message: string): validationissue[] {
	return [{ path, message }];
}

function sameprimitive(left: jsonprimitive, right: unknown): boolean {
	return left === right;
}

function validatetype(schema: jsonschema, type: jsontype, value: unknown, path: string): validationissue[] {
	switch (type) {
		case "null":
			return value === null ? [] : issue(path, "expected null");
		case "boolean":
			return typeof value === "boolean" ? [] : issue(path, "expected boolean");
		case "number":
		case "integer": {
			if (typeof value !== "number" || !Number.isFinite(value)) return issue(path, "expected finite number");
			if (type === "integer" && !Number.isInteger(value)) return issue(path, "expected integer");
			if (schema.min !== undefined && value < schema.min) return issue(path, `expected value at least ${schema.min}`);
			if (schema.max !== undefined && value > schema.max) return issue(path, `expected value at most ${schema.max}`);
			return [];
		}
		case "string": {
			if (typeof value !== "string") return issue(path, "expected string");
			if (schema.min !== undefined && value.length < schema.min) {
				return issue(path, `expected at least ${schema.min} characters`);
			}
			if (schema.max !== undefined && value.length > schema.max) {
				return issue(path, `expected at most ${schema.max} characters`);
			}
			if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) {
				return issue(path, `expected pattern ${schema.pattern}`);
			}
			return [];
		}
		case "array": {
			if (!Array.isArray(value)) return issue(path, "expected array");
			if (schema.min !== undefined && value.length < schema.min) return issue(path, `expected at least ${schema.min} items`);
			if (schema.max !== undefined && value.length > schema.max) return issue(path, `expected at most ${schema.max} items`);
			if (schema.items === undefined) return [];
			const issues: validationissue[] = [];
			for (let index = 0; index < value.length; index++) {
				issues.push(...validate(schema.items, value[index], `${path}[${index}]`));
			}
			return issues;
		}
		case "object": {
			if (!value || typeof value !== "object" || Array.isArray(value)) return issue(path, "expected object");
			const record = value as Record<string, unknown>;
			const properties = schema.properties ?? {};
			const issues: validationissue[] = [];
			for (const required of schema.required ?? []) {
				if (!Object.hasOwn(record, required)) {
					issues.push({ path: pathfor(path, required), message: "required field" });
				}
			}
			for (const [key, entry] of Object.entries(record)) {
				const property = Object.hasOwn(properties, key) ? properties[key] : undefined;
				if (!property) {
					if (schema.additionalproperties === false) issues.push({ path: pathfor(path, key), message: "unknown field" });
					continue;
				}
				issues.push(...validate(property, entry, pathfor(path, key)));
			}
			return issues;
		}
	}
}

export function validate(schema: jsonschema, value: unknown, path = "value"): validationissue[] {
	if (schema.enum && !schema.enum.some((entry) => sameprimitive(entry, value))) {
		return issue(path, `expected one of ${schema.enum.map((entry) => JSON.stringify(entry)).join(", ")}`);
	}

	const types = schema.type;
	if (types === undefined) return [];
	if (typeof types === "string") return validatetype(schema, types, value, path);
	for (const type of types) {
		if (validatetype(schema, type, value, path).length === 0) return [];
	}
	return issue(path, `expected one of types ${types.join(", ")}`);
}

export function assertvalid(schema: jsonschema, value: unknown, path = "value"): void {
	const [first] = validate(schema, value, path);
	if (first) throw new TypeError(`${first.path}: ${first.message}`);
}

export function assertschema(value: unknown, path = "schema"): asserts value is jsonschema {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new TypeError(`${path}: expected schema`);
	}
	const schema = value as Record<string, unknown>;
	for (const key of Object.keys(schema)) {
		if (!Object.hasOwn(allowedschemafields, key)) {
			throw new TypeError(`${pathfor(path, key)}: unknown schema field`);
		}
	}

	if (schema.type === undefined && schema.enum === undefined) {
		throw new TypeError(`${path}: expected type or enum`);
	}
	if (schema.type !== undefined) {
		if (typeof schema.type === "string") {
			if (!Object.hasOwn(allowedschematypes, schema.type)) {
				throw new TypeError(`${path}.type: expected supported type`);
			}
		} else if (Array.isArray(schema.type)) {
			if (schema.type.length === 0) {
				throw new TypeError(`${path}.type: expected non-empty type array`);
			}
			const seen = new Set<string>();
			for (const type of schema.type) {
				if (typeof type !== "string" || !Object.hasOwn(allowedschematypes, type)) {
					throw new TypeError(`${path}.type: expected supported type`);
				}
				if (seen.has(type)) throw new TypeError(`${path}.type: expected unique type array`);
				seen.add(type);
			}
		} else {
			throw new TypeError(`${path}.type: expected supported type`);
		}
	}
	if (schema.enum !== undefined) {
		if (!Array.isArray(schema.enum) || schema.enum.length === 0) {
			throw new TypeError(`${path}.enum: expected non-empty primitive array`);
		}
		for (const entry of schema.enum) {
			if (
				entry !== null &&
				typeof entry !== "string" &&
				typeof entry !== "boolean" &&
				(typeof entry !== "number" || !Number.isFinite(entry))
			) {
				throw new TypeError(`${path}.enum: expected primitive values`);
			}
		}
	}
	for (const bound of ["min", "max"] as const) {
		const entry = schema[bound];
		if (entry !== undefined && (typeof entry !== "number" || !Number.isFinite(entry) || entry < 0)) {
			throw new TypeError(`${path}.${bound}: expected non-negative finite number`);
		}
	}
	if (
		typeof schema.min === "number" &&
		typeof schema.max === "number" &&
		schema.min > schema.max
	) {
		throw new TypeError(`${path}: min exceeds max`);
	}
	if (schema.pattern !== undefined) {
		if (typeof schema.pattern !== "string") throw new TypeError(`${path}.pattern: expected string`);
		try {
			new RegExp(schema.pattern, "u");
		} catch {
			throw new TypeError(`${path}.pattern: invalid regular expression`);
		}
	}
	const arraytype = schema.type === "array" || (Array.isArray(schema.type) && schema.type.includes("array"));
	if (arraytype && schema.items !== undefined) {
		assertschema(schema.items, `${path}.items`);
	}
	const objecttype = schema.type === "object" || (Array.isArray(schema.type) && schema.type.includes("object"));
	if (objecttype) {
		if (schema.additionalproperties !== undefined && typeof schema.additionalproperties !== "boolean") {
			throw new TypeError(`${path}.additionalproperties: expected boolean`);
		}
		if (schema.properties !== undefined) {
			if (!schema.properties || typeof schema.properties !== "object" || Array.isArray(schema.properties)) {
				throw new TypeError(`${path}.properties: expected schema map`);
			}
			for (const [key, entry] of Object.entries(schema.properties)) {
				assertschema(entry, pathfor(`${path}.properties`, key));
			}
		}
		if (schema.required !== undefined) {
			if (!Array.isArray(schema.required) || !schema.required.every((entry) => typeof entry === "string")) {
				throw new TypeError(`${path}.required: expected string array`);
			}
			const properties =
				schema.properties && typeof schema.properties === "object" && !Array.isArray(schema.properties)
					? schema.properties
					: {};
			for (const required of schema.required) {
				if (!Object.hasOwn(properties, required)) {
					throw new TypeError(`${path}.required: missing property ${required}`);
				}
			}
		}
	}
}

function normalizejson(value: unknown, path: string, seen: WeakSet<object>): jsonvalue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return value;
	if (typeof value === "number") {
		if (!Number.isFinite(value)) throw new TypeError(`${path}: expected finite number`);
		return value;
	}
	if (typeof value !== "object") throw new TypeError(`${path}: expected json value`);
	if (seen.has(value)) throw new TypeError(`${path}: cyclic value`);
	seen.add(value);

	if (Array.isArray(value)) {
		const array: jsonvalue[] = [];
		for (let index = 0; index < value.length; index++) {
			if (!Object.hasOwn(value, index)) {
				seen.delete(value);
				throw new TypeError(`${path}[${index}]: expected own array element`);
			}
			array.push(normalizejson(value[index], `${path}[${index}]`, seen));
		}
		seen.delete(value);
		return array;
	}

	if (Object.getPrototypeOf(value) !== Object.prototype) {
		seen.delete(value);
		throw new TypeError(`${path}: expected plain object`);
	}

	const record: Record<string, jsonvalue> = {};
	for (const key of Object.keys(value).sort()) {
		const entry = Reflect.get(value, key);
		Object.defineProperty(record, key, {
			value: normalizejson(entry, pathfor(path, key), seen),
			enumerable: true,
			configurable: true,
			writable: true,
		});
	}
	seen.delete(value);
	return record;
}

export function jsonvalueof(value: unknown, path = "value"): jsonvalue {
	return normalizejson(value, path, new WeakSet<object>());
}

export function parsejson(text: string, path = "value"): jsonvalue {
	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		throw new TypeError(`${path}: invalid json`);
	}
	return jsonvalueof(parsed, path);
}

export function stablejson(value: unknown): string {
	return JSON.stringify(jsonvalueof(value));
}

function assertidentifier(value: string, path: string): void {
	if (!processidpattern.test(value)) throw new TypeError(`${path}: expected lowercase dotted identifier`);
}

export function assertprocessid(value: string): void {
	assertidentifier(value, "process.id");
}

export function assertversion(value: string, path = "version"): void {
	if (!versionpattern.test(value)) throw new TypeError(`${path}: expected semantic version`);
}
export function compareversions(left: string, right: string): number {
	assertversion(left, "left");
	assertversion(right, "right");

	const comparedecimal = (first: string, second: string): number => {
		const normalizedfirst = first.replace(/^0+(?=\d)/, "");
		const normalizedsecond = second.replace(/^0+(?=\d)/, "");
		return normalizedfirst.length - normalizedsecond.length ||
			(normalizedfirst < normalizedsecond ? -1 : normalizedfirst > normalizedsecond ? 1 : 0);
	};
	const compareidentifier = (first: string, second: string): number => {
		const firstnumeric = /^\d+$/.test(first);
		const secondnumeric = /^\d+$/.test(second);
		if (firstnumeric && secondnumeric) return comparedecimal(first, second);
		if (firstnumeric !== secondnumeric) return firstnumeric ? -1 : 1;
		return first < second ? -1 : first > second ? 1 : 0;
	};
	const prerelease = (version: string): string[] => {
		const separator = version.indexOf("-");
		return separator === -1 ? [] : version.slice(separator + 1).split(".");
	};
	const leftcore = left.slice(0, left.indexOf("-") === -1 ? undefined : left.indexOf("-")).split(".");
	const rightcore = right.slice(0, right.indexOf("-") === -1 ? undefined : right.indexOf("-")).split(".");
	for (let index = 0; index < leftcore.length; index += 1) {
		const comparison = comparedecimal(leftcore[index]!, rightcore[index]!);
		if (comparison !== 0) return comparison;
	}

	const leftprerelease = prerelease(left);
	const rightprerelease = prerelease(right);
	if (leftprerelease.length === 0 || rightprerelease.length === 0) {
		return leftprerelease.length === rightprerelease.length ? 0 : leftprerelease.length === 0 ? 1 : -1;
	}
	for (let index = 0; index < Math.min(leftprerelease.length, rightprerelease.length); index += 1) {
		const comparison = compareidentifier(leftprerelease[index]!, rightprerelease[index]!);
		if (comparison !== 0) return comparison;
	}
	return leftprerelease.length - rightprerelease.length;
}

export function asserteffectkey(value: string): void {
	if (!effectkeypattern.test(value)) throw new TypeError("effect.key: expected lowercase stable key");
}

export function defineprocess<input = unknown, output = unknown>(
	definition: processinput<input, output>,
): Readonly<processdefinition<input, output>> {
	assertprocessid(definition.id);
	assertversion(definition.version, "process.version");
	assertschema(definition.input, "process.input");
	assertschema(definition.output, "process.output");
	if (definition.blueprint) {
		assertidentifier(definition.blueprint.name, "process.blueprint.name");
		assertversion(definition.blueprint.version, "process.blueprint.version");
	}
	const maxturns = definition.maxturns ?? 64;
	if (!Number.isInteger(maxturns) || maxturns < 1 || maxturns > 10_000) {
		throw new TypeError("process.maxturns: expected integer from 1 to 10000");
	}
	if (typeof definition.run !== "function") throw new TypeError("process.run: expected function");
	const profiledefaults =
		definition.profiledefaults === undefined
			? undefined
			: jsonvalueof(definition.profiledefaults, "process.profiledefaults");
	if (definition.sourcehash !== undefined && !/^[a-f0-9]{64}$/.test(definition.sourcehash)) {
		throw new TypeError("process.sourcehash: expected sha256");
	}
	return Object.freeze({
		...definition,
		maxturns,
		active: definition.active ?? true,
		profiledefaults,
	});
}
