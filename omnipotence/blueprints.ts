import packagejson from "../package.json" with { type: "json" };
import { createHash, randomUUID } from "node:crypto";
import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	realpathSync,
	renameSync,
	rmSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
	assertprocessid,
	assertversion,
	compareversions,
	jsonvalueof,
	parsejson,
	stablejson,
} from "./contracts.ts";
import type { jsonvalue } from "./contracts.ts";
import { mergepatch } from "./profiles.ts";
import { orchestrationstore } from "./store.ts";
import type { blueprintrecord, doctorreport } from "./store.ts";

export interface blueprintplan {
	action: "install";
	name: string;
	version: string;
	sourcepath: string;
	installpath: string;
	contenthash: string;
}

export interface installoptions {
	dryrun?: boolean;
}

interface inspectedblueprint extends blueprintplan {
	manifest: Record<string, jsonvalue>;
	files: Record<string, string>;
	config: jsonvalue;
}

const manifestfilename = "omnipotence.blueprint.json";
const manifestfields: Record<string, true> = {
	schema: true,
	name: true,
	version: true,
	engine: true,
	processes: true,
	hooks: true,
	files: true,
	config: true,
	profile: true,
	migrations: true,
};
const engineversion = packagejson.version;
const terminalstates: Record<string, true> = { completed: true, failed: true, halted: true };

function objectrecord(value: jsonvalue, path: string): Record<string, jsonvalue> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${path}: expected object`);
	return value;
}

function stringfield(record: Record<string, jsonvalue>, field: string, path: string): string {
	const value = record[field];
	if (typeof value !== "string") throw new TypeError(`${path}.${field}: expected string`);
	return value;
}

export function assertenginecompatibility(manifestvalue: jsonvalue, name: string, version: string): void {
	const manifest = objectrecord(manifestvalue, "blueprint.manifest");
	const engine = stringfield(manifest, "engine", "blueprint");
	const minimum = /^>=(\d+\.\d+\.\d+)$/.exec(engine)?.[1];
	if (!minimum) throw new TypeError("blueprint.engine: expected minimum semantic version");
	if (compareversions(engineversion, minimum) < 0) {
		throw new Error(
			`blueprint ${name}@${version} requires engine ${engine}, current engine ${engineversion}`,
		);
	}
}

function escapesroot(root: string, path: string): boolean {
	const offset = relative(root, path);
	return offset === ".." || offset.startsWith(`..${sep}`) || isAbsolute(offset);
}

function hashcontent(content: string | Uint8Array): string {
	return createHash("sha256").update(content).digest("hex");
}


function setproperty(target: Record<string, jsonvalue>, key: string, value: jsonvalue): void {
	Object.defineProperty(target, key, {
		value,
		enumerable: true,
		configurable: true,
		writable: true,
	});
}

function validatemanifest(value: jsonvalue): Record<string, jsonvalue> {
	const manifest = objectrecord(value, "blueprint");
	for (const key of Object.keys(manifest)) {
		if (!Object.hasOwn(manifestfields, key)) throw new TypeError(`blueprint.${key}: unknown field`);
	}
	if (manifest.schema !== 1) throw new TypeError("blueprint.schema: expected 1");
	const name = stringfield(manifest, "name", "blueprint");
	try {
		assertprocessid(name);
	} catch {
		throw new TypeError("blueprint.name: expected lowercase identifier");
	}
	assertversion(stringfield(manifest, "version", "blueprint"), "blueprint.version");
	const engine = stringfield(manifest, "engine", "blueprint");
	if (!/^>=\d+\.\d+\.\d+$/.test(engine)) throw new TypeError("blueprint.engine: expected minimum semantic version");

	for (const group of ["processes", "hooks"] as const) {
		const entries = manifest[group];
		if (!Array.isArray(entries)) throw new TypeError(`blueprint.${group}: expected array`);
		const ids = new Set<string>();
		for (let index = 0; index < entries.length; index += 1) {
			const entry = objectrecord(entries[index]!, `blueprint.${group}[${index}]`);
			for (const key of Object.keys(entry)) {
				if (key !== "id" && key !== "entry" && key !== "export") {
					throw new TypeError(`blueprint.${group}[${index}].${key}: unknown field`);
				}
			}
			const id = stringfield(entry, "id", `blueprint.${group}[${index}]`);
			assertprocessid(id);
			if (ids.has(id)) throw new TypeError(`blueprint.${group} duplicate id ${id}`);
			ids.add(id);
			stringfield(entry, "entry", `blueprint.${group}[${index}]`);
			if (entry.export !== undefined && typeof entry.export !== "string") {
				throw new TypeError(`blueprint.${group}[${index}].export: expected string`);
			}
		}
	}

	const files = objectrecord(manifest.files, "blueprint.files");
	for (const [path, expected] of Object.entries(files)) {
		if (typeof expected !== "string" || !/^[a-f0-9]{64}$/.test(expected)) {
			throw new TypeError(`blueprint.files ${path}: expected sha256`);
		}
	}
	for (const group of ["processes", "hooks"] as const) {
		for (const entryvalue of manifest[group] as jsonvalue[]) {
			const entry = objectrecord(entryvalue, `blueprint.${group}`);
			const path = stringfield(entry, "entry", `blueprint.${group}`);
			if (!Object.hasOwn(files, path)) throw new TypeError(`blueprint.${group} entry ${path} is not declared in files`);
		}
	}
	const config = manifest.config ?? {};
	objectrecord(config, "blueprint.config");
	if (manifest.profile !== undefined) objectrecord(manifest.profile, "blueprint.profile");
	if (!Array.isArray(manifest.migrations)) throw new TypeError("blueprint.migrations: expected array");
	for (let index = 0; index < manifest.migrations.length; index += 1) {
		const migration = objectrecord(manifest.migrations[index]!, `blueprint.migrations[${index}]`);
		for (const key of Object.keys(migration)) {
			if (key !== "from" && key !== "patch") {
				throw new TypeError(`blueprint.migrations[${index}].${key}: unknown field`);
			}
		}
		assertversion(stringfield(migration, "from", `blueprint.migrations[${index}]`), "blueprint.migration.from");
		objectrecord(migration.patch, `blueprint.migrations[${index}].patch`);
	}
	return manifest;
}

function migrationpatch(manifest: Record<string, jsonvalue>, from: string): jsonvalue | null {
	const migrations = manifest.migrations;
	if (!Array.isArray(migrations)) return null;
	for (const value of migrations) {
		const migration = objectrecord(value, "blueprint.migration");
		if (migration.from === from) return migration.patch ?? {};
	}
	return null;
}

function processids(record: blueprintrecord): Set<string> {
	const manifest = objectrecord(record.manifest, "blueprint.manifest");
	const entries = manifest.processes;
	const ids = new Set<string>();
	if (!Array.isArray(entries)) return ids;
	for (const value of entries) {
		const entry = objectrecord(value, "blueprint.process");
		if (typeof entry.id === "string") ids.add(entry.id);
	}
	return ids;
}

export class blueprintservice {
	private readonly store: orchestrationstore;
	private readonly installroot: string;

	constructor(store: orchestrationstore, installroot: string) {
		this.store = store;
		this.installroot = resolve(installroot);
	}

	private inspectsource(sourcepath: string): inspectedblueprint {
		if (/^[a-z][a-z0-9+.-]*:\/\//.test(sourcepath)) throw new TypeError("blueprint source must be a local path");
		const source = realpathSync(resolve(sourcepath));
		const manifestpath = join(source, manifestfilename);
		const manifest = validatemanifest(parsejson(readFileSync(manifestpath, "utf8"), "blueprint manifest"));
		const name = stringfield(manifest, "name", "blueprint");
		const version = stringfield(manifest, "version", "blueprint");
		assertenginecompatibility(manifest, name, version);
		const declared = objectrecord(manifest.files, "blueprint.files");
		const files: Record<string, string> = {};
		for (const [path, expected] of Object.entries(declared)) {
			if (isAbsolute(path) || escapesroot(source, resolve(source, path))) {
				throw new Error(`blueprint.files ${path} escapes package root`);
			}
			const absolute = resolve(source, path);
			const real = realpathSync(absolute);
			if (escapesroot(source, real)) {
				throw new Error(`blueprint file ${path} escapes package root`);
			}
			const actual = hashcontent(readFileSync(real));
			if (actual !== expected) throw new Error(`blueprint file ${path} hash mismatch`);
			files[path] = actual;
		}
		const installpath = join(this.installroot, name, version);
		const contenthash = hashcontent(stablejson({ manifest, files }));
		return {
			action: "install",
			name,
			version,
			sourcepath: source,
			installpath,
			contenthash,
			manifest,
			files,
			config: manifest.config ?? {},
		};
	}

	install(sourcepath: string, options: { dryrun: true }): blueprintplan;
	install(sourcepath: string, options?: installoptions): blueprintrecord;
	install(sourcepath: string, options: installoptions = {}): blueprintplan | blueprintrecord {
		const inspected = this.inspectsource(sourcepath);
		if (options.dryrun) {
			const { manifest: _manifest, files: _files, config: _config, ...plan } = inspected;
			return plan;
		}
		const existing = this.store.getblueprint(inspected.name, inspected.version);
		if (existing) {
			assertenginecompatibility(existing.manifest, existing.name, existing.version);
			if (existing.contenthash !== inspected.contenthash) {
				throw new Error(`blueprint ${inspected.name}@${inspected.version} content changed`);
			}
			return existing.active ? existing : this.store.activateblueprint(existing.name, existing.version);
		}
		if (existsSync(inspected.installpath)) throw new Error(`blueprint target ${inspected.installpath} already exists`);

		const active = this.active(inspected.name);
		let config = inspected.config;
		if (active) {
			config = mergepatch(config, active.config);
			const patch = migrationpatch(inspected.manifest, active.version);
			if (patch !== null) config = mergepatch(config, patch);
		}

		const temporary = `${inspected.installpath}.tmp-${randomUUID()}`;
		mkdirSync(temporary, { recursive: true });
		try {
			for (const path of Object.keys(inspected.files)) {
				const destination = join(temporary, path);
				mkdirSync(dirname(destination), { recursive: true });
				copyFileSync(join(inspected.sourcepath, path), destination);
			}
			copyFileSync(join(inspected.sourcepath, manifestfilename), join(temporary, manifestfilename));
			mkdirSync(dirname(inspected.installpath), { recursive: true });
			renameSync(temporary, inspected.installpath);
			try {
				return this.store.writeblueprint({
					name: inspected.name,
					version: inspected.version,
					sourcepath: inspected.sourcepath,
					installpath: inspected.installpath,
					contenthash: inspected.contenthash,
					manifest: inspected.manifest,
					active: true,
					config,
				});

			} catch (error) {
				rmSync(inspected.installpath, { recursive: true, force: true });
				throw error;
			}
		} finally {
			rmSync(temporary, { recursive: true, force: true });
		}
	}

	list(name?: string): blueprintrecord[] {
		return this.store.listblueprints(name);
	}

	active(name: string): blueprintrecord | null {
		return this.list(name).find((record) => record.active) ?? null;
	}
	doctor(): doctorreport {
		const issues: string[] = [];
		const records = this.list();
		const names = new Set(records.map((record) => record.name));
		for (const name of names) {
			const active = records.filter((record) => record.name === name && record.active);
			if (active.length !== 1) issues.push(`blueprint ${name} has ${active.length} active versions`);
		}
		for (const record of records) {
			const identity = `${record.name}@${record.version}`;
			const manifestpath = join(record.installpath, manifestfilename);
			if (!existsSync(manifestpath)) {
				issues.push(`blueprint ${identity} manifest is missing`);
				continue;
			}
			try {
				const manifest = validatemanifest(
					parsejson(readFileSync(manifestpath, "utf8"), `blueprint ${identity} manifest`),
				);
				if (
					stringfield(manifest, "name", "blueprint") !== record.name ||
					stringfield(manifest, "version", "blueprint") !== record.version
				) {
					issues.push(`blueprint ${identity} manifest identity mismatch`);
				}
				const declared = objectrecord(manifest.files, "blueprint.files");
				const files: Record<string, string> = {};
				for (const [path, expected] of Object.entries(declared)) {
					const absolute = resolve(record.installpath, path);
					if (isAbsolute(path) || escapesroot(record.installpath, absolute)) {
						issues.push(`blueprint ${identity} file ${path} escapes install root`);
						continue;
					}
					if (!existsSync(absolute)) {
						issues.push(`blueprint ${identity} file ${path} is missing`);
						continue;
					}
					const real = realpathSync(absolute);
					if (escapesroot(record.installpath, real)) {
						issues.push(`blueprint ${identity} file ${path} escapes install root`);
						continue;
					}
					const actual = hashcontent(readFileSync(real));
					files[path] = actual;
					if (actual !== expected) issues.push(`blueprint ${identity} file ${path} hash mismatch`);
				}
				const contenthash = hashcontent(stablejson({ manifest, files }));
				if (Object.keys(files).length === Object.keys(declared).length && contenthash !== record.contenthash) {
					issues.push(`blueprint ${identity} registry content hash mismatch`);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				issues.push(`blueprint ${identity} verification failed: ${message}`);
			}
		}
		return { ok: issues.length === 0, issues };
	}

	rollback(name: string): blueprintrecord {
		const records = this.list(name).sort((left, right) => compareversions(left.version, right.version));
		const active = records.find((record) => record.active);
		if (!active) throw new Error(`blueprint ${name} has no active version`);
		const index = records.findIndex((record) => record.version === active.version);
		const previous = records[index - 1];
		if (!previous) throw new Error(`blueprint ${name}@${active.version} has no previous version`);
		assertenginecompatibility(previous.manifest, previous.name, previous.version);
		return this.store.activateblueprint(name, previous.version);
	}

	remove(name: string, version: string): void {
		const record = this.store.getblueprint(name, version);
		if (!record) throw new Error(`blueprint ${name}@${version} is not installed`);
		const ids = processids(record);
		for (const run of this.store.listruns()) {
			if (
				run.blueprintname === name &&
				run.blueprintversion === version &&
				ids.has(run.processid) &&
				!Object.hasOwn(terminalstates, run.status)
			) {
				throw new Error(`blueprint ${name}@${version} is pinned by active run ${run.id}`);
			}
		}

		const remaining = this.list(name)
			.filter((entry) => entry.version !== version)
			.sort((left, right) => compareversions(left.version, right.version));
		const replacement = record.active ? remaining.at(-1) : undefined;
		if (replacement) assertenginecompatibility(replacement.manifest, replacement.name, replacement.version);
		const tomb = `${record.installpath}.remove-${randomUUID()}`;
		if (existsSync(record.installpath)) renameSync(record.installpath, tomb);
		try {
			if (!this.store.deleteblueprint(name, version, replacement?.version)) {
				throw new Error(`blueprint ${name}@${version} disappeared`);
			}
			rmSync(tomb, { recursive: true, force: true });
		} catch (error) {
			if (existsSync(tomb)) renameSync(tomb, record.installpath);
			throw error;
		}
	}
}
