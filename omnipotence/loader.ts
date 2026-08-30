import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertenginecompatibility } from "./blueprints.ts";
import { defineprocess, jsonvalueof, objectrecord, stablejson, stringfield } from "./contracts.ts";
import type { jsonschema, jsonvalue, processcontext, processdefinition } from "./contracts.ts";
import type { orchestrationengine } from "./engine.ts";
import { definehook } from "./hooks.ts";
import type { hookdefinition, hookphase } from "./hooks.ts";
import type { blueprintrecord, orchestrationstore } from "./store.ts";

export interface loadsummary {
	blueprints: number;
	processes: number;
	hooks: number;
}

function entries(manifest: unknown, field: "processes" | "hooks"): Record<string, unknown>[] {
	const record = objectrecord<unknown>(manifest, "blueprint.manifest");
	const value = record[field];
	if (!Array.isArray(value)) throw new TypeError(`blueprint.manifest.${field}: expected array`);
	return value.map((entry, index) => objectrecord<unknown>(entry, `blueprint.manifest.${field}[${index}]`));
}

function verifiedsourcehash(blueprint: blueprintrecord): string {
	const manifest = objectrecord<unknown>(blueprint.manifest, "blueprint.manifest");
	const declared = objectrecord<unknown>(manifest.files, "blueprint.files");
	const files: Record<string, string> = {};
	for (const [path, expected] of Object.entries(declared)) {
		if (typeof expected !== "string") throw new TypeError(`blueprint file ${path} has invalid hash`);
		const actual = createHash("sha256")
			.update(readFileSync(join(blueprint.installpath, path)))
			.digest("hex");
		if (actual !== expected) throw new Error(`blueprint ${blueprint.name}@${blueprint.version} file ${path} hash mismatch`);
		files[path] = actual;
	}
	const actual = createHash("sha256")
		.update(stablejson({ manifest: blueprint.manifest, files }))
		.digest("hex");
	if (actual !== blueprint.contenthash) {
		throw new Error(`blueprint ${blueprint.name}@${blueprint.version} registry content hash mismatch`);
	}
	return actual;
}

function processvalue(
	value: unknown,
	manifestid: string,
	blueprintname: string,
	blueprintversion: string,
	active: boolean,
	profiledefaults: jsonvalue,
	sourcehash: string,
): Readonly<processdefinition> {
	const record = objectrecord<unknown>(value, `process ${manifestid}`);
	const id = stringfield(record, "id", `process ${manifestid}`);
	if (id !== manifestid) throw new Error(`process export ${id} does not match manifest id ${manifestid}`);
	const version = stringfield(record, "version", `process ${manifestid}`);
	if (typeof record.run !== "function") throw new TypeError(`process ${manifestid}.run: expected function`);
	const run = record.run as (context: processcontext, input: unknown) => Promise<unknown>;
	return defineprocess({
		id,
		version,
		maxturns: typeof record.maxturns === "number" ? record.maxturns : undefined,
		input: record.input as jsonschema,
		output: record.output as jsonschema,
		blueprint: { name: blueprintname, version: blueprintversion },
		active,
		profiledefaults,
		sourcehash,
		run,
	});
}

function hookvalue(
	value: unknown,
	manifestid: string,
	blueprintname: string,
	blueprintversion: string,
	active: boolean,
): Readonly<hookdefinition> {
	const record = objectrecord<unknown>(value, `hook ${manifestid}`);
	const id = stringfield(record, "id", `hook ${manifestid}`);
	if (id !== manifestid) throw new Error(`hook export ${id} does not match manifest id ${manifestid}`);
	if (typeof record.run !== "function") throw new TypeError(`hook ${manifestid}.run: expected function`);
	const run = record.run as hookdefinition["run"];
	return definehook({
		id,
		version: stringfield(record, "version", `hook ${manifestid}`),
		phase: stringfield(record, "phase", `hook ${manifestid}`) as hookphase,
		priority: typeof record.priority === "number" ? record.priority : undefined,
		timeoutms: typeof record.timeoutms === "number" ? record.timeoutms : 5_000,
		blueprint: { name: blueprintname, version: blueprintversion },
		active,
		run,
	});
}

async function loadentry(
	installpath: string,
	contenthash: string,
	entry: Record<string, unknown>,
): Promise<unknown> {
	const path = stringfield(entry, "entry", "blueprint entry");
	const exportname = typeof entry.export === "string" ? entry.export : "default";
	const url = `${pathToFileURL(join(installpath, path)).href}?v=${contenthash}`;
	// blueprint modules come from the runtime registry, so no static import path exists.
	const module = objectrecord<unknown>(await import(url), `module ${path}`);
	if (!Object.hasOwn(module, exportname)) throw new Error(`module ${path} has no export ${exportname}`);
	return module[exportname];
}

export async function loadactiveblueprints(
	store: orchestrationstore,
	engine: orchestrationengine,
): Promise<loadsummary> {
	let blueprintcount = 0;
	let processcount = 0;
	let hookcount = 0;
	const pinned = new Set(
		store
			.listruns()
			.filter((run) => run.status !== "completed" && run.status !== "failed" && run.status !== "halted")
			.filter((run) => run.blueprintname !== null && run.blueprintversion !== null)
			.map((run) => `${run.blueprintname}@${run.blueprintversion}`),
	);
	const required = store
		.listblueprints()
		.filter((record) => record.active || pinned.has(`${record.name}@${record.version}`));
	for (const blueprint of required) {
		assertenginecompatibility(blueprint.manifest, blueprint.name, blueprint.version);
	}
	for (const blueprint of required) {
		blueprintcount += 1;
		const manifest = objectrecord<unknown>(blueprint.manifest, "blueprint.manifest");
		const profiledefaults = jsonvalueof(manifest.profile ?? { schema: 1 }, "blueprint.profile");
		const sourcehash = verifiedsourcehash(blueprint);
		for (const entry of entries(blueprint.manifest, "processes")) {
			const id = stringfield(entry, "id", "blueprint process");
			engine.register(
				processvalue(
					await loadentry(blueprint.installpath, blueprint.contenthash, entry),
					id,
					blueprint.name,
					blueprint.version,
					blueprint.active,
					profiledefaults,
					sourcehash,
				),
			);
			processcount += 1;
		}
		for (const entry of entries(blueprint.manifest, "hooks")) {
			const id = stringfield(entry, "id", "blueprint hook");
			engine.hooks.register(
				hookvalue(
					await loadentry(blueprint.installpath, blueprint.contenthash, entry),
					id,
					blueprint.name,
					blueprint.version,
					blueprint.active,
				),
			);
			hookcount += 1;
		}
	}
	return { blueprints: blueprintcount, processes: processcount, hooks: hookcount };
}
