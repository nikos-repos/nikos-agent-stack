import { Database as database } from "bun:sqlite";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
	asserteffectkey,
	assertprocessid,
	assertversion,
	jsonvalueof,
	parsejson,
	stablejson,
} from "./contracts.ts";
import type {
	effectkind,
	effectstatus,
	jsonvalue,
	orchestrationmode,
	runstatus,
} from "./contracts.ts";

export interface runrecord {
	id: string;
	sessionid: string | null;
	processid: string;
	processversion: string;
	processhash: string;
	blueprintname: string | null;
	blueprintversion: string | null;
	profile: jsonvalue;
	userprofileversion: number | null;
	projectprofileversion: number | null;
	mode: orchestrationmode;
	status: runstatus;
	input: jsonvalue;
	output: jsonvalue | null;
	blockedreason: string | null;
	maxturns: number;
	turns: number;
	fence: number;
	leaseowner: string | null;
	leaseepoch: number;
	leaseexpiresat: number | null;
	createdat: string;
	updatedat: string;
}

export interface eventrecord {
	id: number;
	runid: string;
	seq: number;
	type: string;
	payload: jsonvalue;
	previoushash: string | null;
	hash: string;
	createdat: string;
}

export interface effectrecord {
	id: string;
	runid: string;
	key: string;
	kind: effectkind;
	input: jsonvalue;
	inputhash: string;
	status: effectstatus;
	fence: number;
	value: jsonvalue | null;
	dispatchingat: string | null;
	error: jsonvalue | null;
	dispatchedat: string | null;
	createdat: string;
	updatedat: string;
}

export interface createruninput {
	runid?: string;
	processid: string;
	processversion: string;
	processhash: string;
	blueprintname?: string | null;
	blueprintversion?: string | null;
	profile?: jsonvalue;
	userprofileversion?: number | null;
	projectprofileversion?: number | null;
	sessionid: string | null;
	mode: orchestrationmode;
	input: jsonvalue;
	maxturns: number;
}

export interface effectinput {
	key: string;
	kind: effectkind;
	input: jsonvalue;
}

export interface effectpost {
	runid: string;
	effectid: string;
	fence: number;
	inputhash: string;
	status: "ok" | "error" | "uncertain" | "cancelled";
	value?: jsonvalue;
	error?: jsonvalue;
}

export interface uncertainresolution {
	runid: string;
	effectid: string;
	fence: number;
	inputhash: string;
	decision: "confirm" | "fail" | "retry";
	value?: jsonvalue;
	error?: jsonvalue;
}

export interface doctorreport {
	ok: boolean;
	issues: string[];
}

export type profilescope = "user" | "project";

export interface profilerecord {
	scope: profilescope;
	projectroot: string;
	version: number;
	document: jsonvalue;
	sourcehash: string;
	updatedat: string;
}

export interface blueprintrecord {
	name: string;
	version: string;
	sourcepath: string;
	installpath: string;
	contenthash: string;
	manifest: jsonvalue;
	active: boolean;
	config: jsonvalue;
	installedat: string;
}

export interface blueprintinput {
	name: string;
	version: string;
	sourcepath: string;
	installpath: string;
	contenthash: string;
	manifest: jsonvalue;
	active: boolean;
	config: jsonvalue;
}

interface runrow {
	id: string;
	session_id: string | null;
	process_id: string;
	process_version: string;
	process_hash: string;
	blueprint_name: string | null;
	blueprint_version: string | null;
	profile_json: string;
	user_profile_version: number | null;
	project_profile_version: number | null;
	mode: string;
	status: string;
	input_json: string;
	output_json: string | null;
	blocked_reason: string | null;
	max_turns: number;
	turns: number;
	fence: number;
	lease_owner: string | null;
	lease_epoch: number;
	lease_expires_at: number | null;
	created_at: string;
	updated_at: string;
}

interface effectrow {
	id: string;
	run_id: string;
	effect_key: string;
	kind: string;
	input_json: string;
	input_hash: string;
	status: string;
	fence: number;
	value_json: string | null;
	error_json: string | null;
	dispatched_at: string | null;
	dispatching_at: string | null;
	created_at: string;
	updated_at: string;
}

interface eventrow {
	id: number;
	run_id: string;
	seq: number;
	type: string;
	payload_json: string;
	previous_hash: string | null;
	hash: string;
	created_at: string;
}

interface profilerow {
	scope: string;
	project_root: string;
	version: number;
	document_json: string;
	source_hash: string;
	updated_at: string;
}

interface blueprintrow {
	name: string;
	version: string;
	source_path: string;
	install_path: string;
	content_hash: string;
	manifest_json: string;
	active: number;
	config_json: string;
	installed_at: string;
}

const runstatuses: Record<runstatus, true> = {
	created: true,
	running: true,
	waiting_effect: true,
	waiting_for_user: true,
	blocked: true,
	completed: true,
	failed: true,
	halted: true,
};
const modes: Record<orchestrationmode, true> = {
	babysit: true,
	call: true,
	plan: true,
	yolo: true,
	forever: true,
};
const profilescopes: Record<profilescope, true> = { user: true, project: true };
const effectkinds: Record<effectkind, true> = {
	task: true,
	parallel: true,
	subprocess: true,
	sleep: true,
	breakpoint: true,
	hook: true,
};
const effectstatuses: Record<effectstatus, true> = {
	requested: true,
	resolved_ok: true,
	resolved_error: true,
	uncertain: true,
	cancelled: true,
};
const terminalstatuses: Record<string, true> = { completed: true, failed: true, halted: true };
const transitions: Record<runstatus, readonly runstatus[]> = {
	created: ["running", "waiting_effect", "waiting_for_user", "blocked", "completed", "failed", "halted"],
	running: ["waiting_effect", "waiting_for_user", "blocked", "completed", "failed", "halted"],
	waiting_effect: ["running", "waiting_for_user", "blocked", "completed", "failed", "halted"],
	waiting_for_user: ["running", "waiting_effect", "blocked", "failed", "halted"],
	blocked: ["running", "failed", "halted"],
	completed: [],
	failed: [],
	halted: [],
};

function now(): string {
	return new Date().toISOString();
}

function leaseowneralive(owner: string): boolean {
	const separator = owner.indexOf(":");
	if (separator < 1) return false;
	const pid = Number(owner.slice(0, separator));
	if (!Number.isInteger(pid) || pid < 1) return false;
	try {
		process.kill(pid, 0);
		return true;
	} catch (error) {
		return Boolean(
			error &&
				typeof error === "object" &&
				"code" in error &&
				error.code === "EPERM",
		);
	}
}

function sha256(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function assertstatus(value: string): asserts value is runstatus {
	if (!Object.hasOwn(runstatuses, value)) throw new Error(`invalid run status ${value}`);
}

function assertmode(value: string): asserts value is orchestrationmode {
	if (!Object.hasOwn(modes, value)) throw new Error(`invalid orchestration mode ${value}`);
}

function assertkind(value: string): asserts value is effectkind {
	if (!Object.hasOwn(effectkinds, value)) throw new Error(`invalid effect kind ${value}`);
}

function asserteffectstatus(value: string): asserts value is effectstatus {
	if (!Object.hasOwn(effectstatuses, value)) throw new Error(`invalid effect status ${value}`);
}

function objectvalue(value: jsonvalue, path: string): Record<string, jsonvalue> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected object`);
	return value;
}

function stringfield(record: Record<string, jsonvalue>, field: string, path: string): string {
	const value = record[field];
	if (typeof value !== "string") throw new Error(`${path}.${field}: expected string`);
	return value;
}

function numberfield(record: Record<string, jsonvalue>, field: string, path: string): number {
	const value = record[field];
	if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`${path}.${field}: expected number`);
	return value;
}

function nullablejson(value: string | null, path: string): jsonvalue | null {
	return value === null ? null : parsejson(value, path);
}

function parserun(row: runrow): runrecord {
	assertmode(row.mode);
	assertstatus(row.status);
	return {
		id: row.id,
		sessionid: row.session_id,
		processid: row.process_id,
		processversion: row.process_version,
		processhash: row.process_hash,
		blueprintname: row.blueprint_name,
		blueprintversion: row.blueprint_version,
		profile: parsejson(row.profile_json, `run ${row.id} profile`),
		userprofileversion: row.user_profile_version,
		projectprofileversion: row.project_profile_version,
		mode: row.mode,
		status: row.status,
		input: parsejson(row.input_json, `run ${row.id} input`),
		output: nullablejson(row.output_json, `run ${row.id} output`),
		blockedreason: row.blocked_reason,
		maxturns: row.max_turns,
		turns: row.turns,
		fence: row.fence,
		leaseowner: row.lease_owner,
		leaseepoch: row.lease_epoch,
		leaseexpiresat: row.lease_expires_at,
		createdat: row.created_at,
		updatedat: row.updated_at,
	};
}

function parseeffect(row: effectrow): effectrecord {
	assertkind(row.kind);
	asserteffectstatus(row.status);
	return {
		id: row.id,
		runid: row.run_id,
		key: row.effect_key,
		kind: row.kind,
		input: parsejson(row.input_json, `effect ${row.id} input`),
		inputhash: row.input_hash,
		status: row.status,
		fence: row.fence,
		value: nullablejson(row.value_json, `effect ${row.id} value`),
		error: nullablejson(row.error_json, `effect ${row.id} error`),
		dispatchedat: row.dispatched_at,
		dispatchingat: row.dispatching_at,
		createdat: row.created_at,
		updatedat: row.updated_at,
	};
}

function parseevent(row: eventrow): eventrecord {
	return {
		id: row.id,
		runid: row.run_id,
		seq: row.seq,
		type: row.type,
		payload: parsejson(row.payload_json, `event ${row.run_id}/${row.seq}`),
		previoushash: row.previous_hash,
		hash: row.hash,
		createdat: row.created_at,
	};
}

function parseprofile(row: profilerow): profilerecord {
	if (!Object.hasOwn(profilescopes, row.scope)) throw new Error(`invalid profile scope ${row.scope}`);
	return {
		scope: row.scope,
		projectroot: row.project_root,
		version: row.version,
		document: parsejson(row.document_json, `${row.scope} profile`),
		sourcehash: row.source_hash,
		updatedat: row.updated_at,
	};
}

function parseblueprint(row: blueprintrow): blueprintrecord {
	return {
		name: row.name,
		version: row.version,
		sourcepath: row.source_path,
		installpath: row.install_path,
		contenthash: row.content_hash,
		manifest: parsejson(row.manifest_json, `blueprint ${row.name}@${row.version} manifest`),
		active: row.active === 1,
		config: parsejson(row.config_json, `blueprint ${row.name}@${row.version} config`),
		installedat: row.installed_at,
	};
}

export interface storeoptions {
	readonly?: boolean;
}

export class orchestrationstore {
	readonly path: string;
	private readonly data: database;

	constructor(path: string, options: storeoptions = {}) {
		this.path = path;
		if (!options.readonly) mkdirSync(dirname(path), { recursive: true });
		this.data = new database(path, {
			create: !options.readonly,
			readonly: options.readonly,
			strict: true,
		});
		this.data.exec("pragma foreign_keys = on");
		if (options.readonly) return;
		this.data.exec("pragma journal_mode = wal");
		this.data.exec("pragma synchronous = full");
		this.data.exec("pragma busy_timeout = 5000");
		this.migrate();
	}

	close(): void {
		this.data.close();
	}

	private eventprojectionissues(): string[] {
		const issues: string[] = [];
		const tables = new Set(
			(this.data.query("select name from sqlite_master where type = 'table'").all() as Array<{ name: string }>).map(
				(row) => row.name,
			),
		);
		if (!tables.has("events") || !tables.has("runs") || !tables.has("effects")) return issues;
		try {
			const events = this.data
				.query("select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events order by run_id, seq")
				.all() as eventrow[];
			const previousbyrun = new Map<string, string | null>();
			const runstatusbyid = new Map<string, string>();
			const effectstatusbyid = new Map<string, string>();
			for (const event of events) {
				const previous = previousbyrun.get(event.run_id) ?? null;
				if (event.previous_hash !== previous) {
					issues.push(`run ${event.run_id} event ${event.seq} previous hash mismatch`);
				}
				const expectedhash = sha256(
					`${event.run_id}\n${event.seq}\n${event.type}\n${event.payload_json}\n${event.previous_hash ?? ""}`,
				);
				if (event.hash !== expectedhash) {
					issues.push(`run ${event.run_id} event ${event.seq} hash mismatch`);
				}
				previousbyrun.set(event.run_id, event.hash);
				if (event.type === "run_created" || event.type === "run_status") {
					const payload = objectvalue(parsejson(event.payload_json), "event payload");
					runstatusbyid.set(event.run_id, stringfield(payload, "status", "event payload"));
				}
				if (event.type.startsWith("effect_")) {
					const payload = objectvalue(parsejson(event.payload_json), "event payload");
					effectstatusbyid.set(
						stringfield(payload, "id", "event payload"),
						stringfield(payload, "status", "event payload"),
					);
				}
			}
			for (const row of this.data.query("select id, status from runs").all() as Array<{ id: string; status: string }>) {
				const expected = runstatusbyid.get(row.id);
				if (expected && row.status !== expected) {
					issues.push(`run ${row.id} projection status ${row.status} does not match ${expected}`);
				}
			}
			for (const row of this.data.query("select id, status from effects").all() as Array<{ id: string; status: string }>) {
				const expected = effectstatusbyid.get(row.id);
				if (expected && row.status !== expected) {
					issues.push(`effect ${row.id} projection status ${row.status} does not match ${expected}`);
				}
			}
		} catch (error) {
			issues.push(`event projection verification failed: ${error instanceof Error ? error.message : String(error)}`);
		}
		return issues;
	}

	private migrate(): void {
		const versionrow = this.data.query("pragma user_version").get() as { user_version: number };
		if (versionrow.user_version > 7) throw new Error(`database schema ${versionrow.user_version} is newer than supported 7`);
		if (versionrow.user_version > 0) {
			const issues = this.eventprojectionissues();
			if (issues.length > 0) {
				throw new Error(`database migration blocked: ${issues.join("; ")}`);
			}
		}
		if (versionrow.user_version === 7) return;
		if (versionrow.user_version === 1) {
			const backup = `${this.path}.migration-v1-${Date.now()}`;
			this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
			this.data.exec(`
				create table profile_versions (
					scope text not null,
					project_root text not null,
					version integer not null,
					document_json text not null,
					source_hash text not null,
					updated_at text not null,
					primary key(scope, project_root, version)
				);
				insert into profile_versions(scope, project_root, version, document_json, source_hash, updated_at)
					select scope, project_root, version, document_json, source_hash, updated_at from profiles;
				pragma user_version = 2;
			`);
			const migrated = this.data
				.query("select name from sqlite_master where type = 'table' and name = 'profile_versions'")
				.get() as { name: string } | null;
			if (migrated?.name !== "profile_versions") throw new Error("database migration 2 verification failed");
			this.migrate();
			return;
		}
		if (versionrow.user_version === 2) {
			const backup = `${this.path}.migration-v2-${Date.now()}`;
			this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
			this.data.exec(`
				alter table runs add column blueprint_name text;
				alter table runs add column blueprint_version text;
				pragma user_version = 3;
			`);
			const columns = this.data.query("pragma table_info(runs)").all() as Array<{ name: string }>;
			if (
				!columns.some((column) => column.name === "blueprint_name") ||
				!columns.some((column) => column.name === "blueprint_version")
			) {
				throw new Error("database migration 3 verification failed");
			}
			this.migrate();
			return;
		}
		if (versionrow.user_version === 3) {
			const backup = `${this.path}.migration-v3-${Date.now()}`;
			this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
			this.data.exec(`
				alter table effects add column dispatched_at text;
				pragma user_version = 4;
			`);
			const columns = this.data.query("pragma table_info(effects)").all() as Array<{ name: string }>;
			if (!columns.some((column) => column.name === "dispatched_at")) {
				throw new Error("database migration 4 verification failed");
			}
			this.migrate();
			return;
		}
		if (versionrow.user_version === 4) {
			const backup = `${this.path}.migration-v4-${Date.now()}`;
			this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
			this.data.exec(`
				alter table effects add column dispatching_at text;
				pragma user_version = 5;
			`);
			const columns = this.data.query("pragma table_info(effects)").all() as Array<{ name: string }>;
			if (!columns.some((column) => column.name === "dispatching_at")) {
				throw new Error("database migration 5 verification failed");
			}
			this.migrate();
			return;
		}
		if (versionrow.user_version === 5) {
			const backup = `${this.path}.migration-v5-${Date.now()}`;
			this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
			this.data.exec(`
				alter table runs add column profile_json text not null default '{"schema":1}';
				alter table runs add column user_profile_version integer;
				alter table runs add column project_profile_version integer;
				pragma user_version = 6;
			`);
			const columns = this.data.query("pragma table_info(runs)").all() as Array<{ name: string }>;
			if (
				!columns.some((column) => column.name === "profile_json") ||
				!columns.some((column) => column.name === "user_profile_version") ||
				!columns.some((column) => column.name === "project_profile_version")
			) {
				throw new Error("database migration 6 verification failed");
			}
			this.migrate();
			return;
		}
		if (versionrow.user_version === 6) {
			const backup = `${this.path}.migration-v6-${Date.now()}`;
			this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
			this.data.exec(`
				alter table runs add column lease_owner text;
				alter table runs add column lease_epoch integer not null default 0;
				alter table runs add column lease_expires_at integer;
				pragma user_version = 7;
			`);
			const columns = this.data.query("pragma table_info(runs)").all() as Array<{ name: string }>;
			if (
				!columns.some((column) => column.name === "lease_owner") ||
				!columns.some((column) => column.name === "lease_epoch") ||
				!columns.some((column) => column.name === "lease_expires_at")
			) {
				throw new Error("database migration 7 verification failed");
			}
			this.migrate();
			return;
		}
		this.data.exec(`
			create table runs (
				id text primary key,
				session_id text,
				process_id text not null,
				process_version text not null,
				process_hash text not null,
				blueprint_name text,
				blueprint_version text,
				mode text not null,
				profile_json text not null,
				user_profile_version integer,
				project_profile_version integer,
				status text not null,
				input_json text not null,
				output_json text,
				blocked_reason text,
				max_turns integer not null,
				turns integer not null default 0,
				fence integer not null default 1,
				lease_owner text,
				lease_epoch integer not null default 0,
				lease_expires_at integer,
				created_at text not null,
				updated_at text not null
			);
			create table sessions (
				session_id text primary key,
				run_id text not null unique references runs(id) on delete cascade
			);
			create table events (
				id integer primary key autoincrement,
				run_id text not null,
				seq integer not null,
				type text not null,
				payload_json text not null,
				previous_hash text,
				hash text not null,
				created_at text not null,
				unique(run_id, seq)
			);
			create table effects (
				id text primary key,
				run_id text not null,
				effect_key text not null,
				kind text not null,
				input_json text not null,
				input_hash text not null,
				status text not null,
				fence integer not null,
				value_json text,
				error_json text,
				dispatched_at text,
				dispatching_at text,
				created_at text not null,
				updated_at text not null,
				unique(run_id, effect_key)
			);
			create table profiles (
				scope text not null,
				project_root text not null,
				version integer not null,
				document_json text not null,
				source_hash text not null,
				updated_at text not null,
				primary key(scope, project_root)
			);
			create table profile_versions (
				scope text not null,
				project_root text not null,
				version integer not null,
				document_json text not null,
				source_hash text not null,
				updated_at text not null,
				primary key(scope, project_root, version)
			);
			create table blueprints (
				name text not null,
				version text not null,
				source_path text not null,
				install_path text not null,
				content_hash text not null,
				manifest_json text not null,
				active integer not null default 0,
				config_json text not null,
				installed_at text not null,
				primary key(name, version)
			);
			create unique index one_active_blueprint on blueprints(name) where active = 1;
			pragma user_version = 7;
		`);
		const issues = this.eventprojectionissues();
		if (issues.length > 0) throw new Error(`database migration verification failed: ${issues.join("; ")}`);
	}

	private transact<result>(operation: () => result): result {
		this.data.exec("begin immediate");
		try {
			const result = operation();
			this.data.exec("commit");
			return result;
		} catch (error) {
			this.data.exec("rollback");
			throw error;
		}
	}

	private appendevent(runid: string, type: string, payload: jsonvalue): eventrecord {
		const previous = this.data
			.query("select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events where run_id = ? order by seq desc limit 1")
			.get(runid) as eventrow | null;
		const seq = (previous?.seq ?? 0) + 1;
		const previoushash = previous?.hash ?? null;
		const payloadjson = stablejson(payload);
		const createdat = now();
		const hash = sha256(`${runid}\n${seq}\n${type}\n${payloadjson}\n${previoushash ?? ""}`);
		this.data
			.query("insert into events(run_id, seq, type, payload_json, previous_hash, hash, created_at) values (?, ?, ?, ?, ?, ?, ?)")
			.run(runid, seq, type, payloadjson, previoushash, hash, createdat);
		const idrow = this.data.query("select last_insert_rowid() as id").get() as { id: number };
		return { id: Number(idrow.id), runid, seq, type, payload, previoushash, hash, createdat };
	}

	createrun(input: createruninput): runrecord {
		assertprocessid(input.processid);
		assertversion(input.processversion, "run.processversion");
		assertmode(input.mode);
		if (!Number.isInteger(input.maxturns) || input.maxturns < 1 || input.maxturns > 10_000) {
			throw new TypeError("run.maxturns: expected integer from 1 to 10000");
		}
		const blueprintname = input.blueprintname ?? null;
		const blueprintversion = input.blueprintversion ?? null;
		if ((blueprintname === null) !== (blueprintversion === null)) {
			throw new TypeError("run blueprint name and version must be provided together");
		}
		if (blueprintname && blueprintversion) {
			assertprocessid(blueprintname);
			assertversion(blueprintversion, "run.blueprintversion");
		}
		const runinput = jsonvalueof(input.input, "run.input");
		const profile = jsonvalueof(input.profile ?? { schema: 1 }, "run.profile");
		for (const [path, version] of [
			["run.userprofileversion", input.userprofileversion],
			["run.projectprofileversion", input.projectprofileversion],
		] as const) {
			if (version !== undefined && version !== null && (!Number.isInteger(version) || version < 1)) {
				throw new TypeError(`${path}: expected positive integer`);
			}
		}
		return this.transact(() => {
			if (input.sessionid && this.getsessionrun(input.sessionid)) {
				throw new Error(`session ${input.sessionid} already has active run`);
			}
			const id = input.runid ?? randomUUID();
			if (this.getrun(id)) throw new Error(`run ${id} already exists`);
			const createdat = now();
			this.data
				.query(`insert into runs(
					id, session_id, process_id, process_version, process_hash,
					blueprint_name, blueprint_version,
					profile_json, user_profile_version, project_profile_version,
					mode, status, input_json, output_json, blocked_reason,
					max_turns, turns, fence, lease_owner, lease_epoch, lease_expires_at,
					created_at, updated_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'created', ?, null, null, ?, 0, 1, null, 0, null, ?, ?)`)
				.run(
					id,
					input.sessionid,
					input.processid,
					input.processversion,
					input.processhash,
					blueprintname,
					blueprintversion,
					stablejson(profile),
					input.userprofileversion ?? null,
					input.projectprofileversion ?? null,
					input.mode,
					stablejson(runinput),
					input.maxturns,
					createdat,
					createdat,
				);
			const run = this.requiredrun(id);
			this.appendevent(id, "run_created", jsonvalueof(run));
			if (input.sessionid) {
				this.data.query("insert into sessions(session_id, run_id) values (?, ?)").run(input.sessionid, id);
				this.appendevent(id, "session_bound", { sessionid: input.sessionid, runid: id });
			}
			return run;
		});
	}

	listruns(): runrecord[] {
		const rows = this.data.query("select * from runs order by created_at desc, id desc").all() as runrow[];
		return rows.map(parserun);
	}

	getrun(runid: string): runrecord | null {
		const row = this.data
			.query("select * from runs where id = ?")
			.get(runid) as runrow | null;
		return row ? parserun(row) : null;
	}

	private requiredrun(runid: string): runrecord {
		const run = this.getrun(runid);
		if (!run) throw new Error(`run ${runid} does not exist`);
		return run;
	}

	private ownedrunids(rootrunid: string): string[] {
		const pending = [rootrunid];
		const seen = new Set<string>();
		while (pending.length > 0) {
			const runid = pending.pop();
			if (!runid || seen.has(runid)) continue;
			seen.add(runid);
			for (const effect of this.listeffects(runid)) {
				if (effect.kind !== "subprocess") continue;
				const input = objectvalue(effect.input, `effect ${effect.key} input`);
				if (typeof input.childrunid === "string") pending.push(input.childrunid);
			}
		}
		return [...seen];
	}

	private refenceinside(run: runrecord): runrecord {
		const ownedruns = this.ownedrunids(run.id).map((runid) => this.requiredrun(runid));
		const pending = new Map<string, effectrecord[]>();
		for (const ownedrun of ownedruns) {
			const requested = this.listeffects(ownedrun.id).filter((effect) => effect.status === "requested");
			const dispatched = requested.find(
				(effect) => effect.dispatchedat !== null || effect.dispatchingat !== null,
			);
			if (dispatched) {
				throw new Error(
					`run ${ownedrun.id} has dispatched effect ${dispatched.id}; resolve it before session ownership changes`,
				);
			}
			pending.set(ownedrun.id, requested);
		}

		const updatedat = now();
		for (const ownedrun of ownedruns) {
			const fence = ownedrun.fence + 1;
			this.data.query("update runs set fence = ?, updated_at = ? where id = ?").run(fence, updatedat, ownedrun.id);
			this.data
				.query(
					"update effects set fence = ?, dispatched_at = null, dispatching_at = null, updated_at = ? where run_id = ? and status = 'requested'",
				)
				.run(fence, updatedat, ownedrun.id);
			for (const effect of pending.get(ownedrun.id) ?? []) {
				const refenced = this.geteffect(ownedrun.id, effect.id);
				if (!refenced) throw new Error(`effect ${effect.id} disappeared`);
				this.appendevent(ownedrun.id, "effect_refenced", jsonvalueof(refenced));
			}
			const refenced = this.requiredrun(ownedrun.id);
			this.appendevent(ownedrun.id, "run_status", jsonvalueof(refenced));
		}
		return this.requiredrun(run.id);
	}

	getsessionrun(sessionid: string): runrecord | null {
		const row = this.data
			.query("select runs.* from sessions join runs on runs.id = sessions.run_id where sessions.session_id = ?")
			.get(sessionid) as runrow | null;
		return row ? parserun(row) : null;
	}

	bindsession(sessionid: string, runid: string, force = false): runrecord {
		if (sessionid.length === 0) throw new TypeError("session id is required");
		return this.transact(() => {
			let run = this.requiredrun(runid);
			if (Object.hasOwn(terminalstatuses, run.status)) throw new Error(`run ${runid} is terminal`);
			const occupied = this.getsessionrun(sessionid);
			if (occupied && occupied.id !== runid && !force) {
				throw new Error(`session ${sessionid} already has active run ${occupied.id}`);
			}
			if (occupied && occupied.id !== runid) {
				const fenced = this.refenceinside(occupied);
				this.data.query("update runs set session_id = null, updated_at = ? where id = ?").run(now(), fenced.id);
				this.data.query("delete from sessions where session_id = ?").run(sessionid);
				const detached = this.requiredrun(fenced.id);
				this.appendevent(detached.id, "run_status", jsonvalueof(detached));
				this.appendevent(detached.id, "session_unbound", { sessionid, runid: detached.id });
			}
			if (run.sessionid && run.sessionid !== sessionid) {
				this.data.query("delete from sessions where session_id = ?").run(run.sessionid);
				this.appendevent(run.id, "session_unbound", { sessionid: run.sessionid, runid: run.id });
			}
			if (run.sessionid !== sessionid) run = this.refenceinside(run);
			this.data.query("delete from sessions where run_id = ?").run(runid);
			this.data.query("insert or replace into sessions(session_id, run_id) values (?, ?)").run(sessionid, runid);
			this.data.query("update runs set session_id = ?, updated_at = ? where id = ?").run(sessionid, now(), runid);
			const bound = this.requiredrun(runid);
			this.appendevent(runid, "run_status", jsonvalueof(bound));
			this.appendevent(runid, "session_bound", { sessionid, runid });
			return bound;
		});
	}

	unbindsession(sessionid: string): runrecord | null {
		return this.transact(() => {
			let run = this.getsessionrun(sessionid);
			if (!run) return null;
			run = this.refenceinside(run);
			this.data.query("delete from sessions where session_id = ?").run(sessionid);
			this.data.query("update runs set session_id = null, updated_at = ? where id = ?").run(now(), run.id);
			const detached = this.requiredrun(run.id);
			this.appendevent(run.id, "run_status", jsonvalueof(detached));
			this.appendevent(run.id, "session_unbound", { sessionid, runid: run.id });
			return detached;
		});
	}

	events(runid: string): eventrecord[] {
		const rows = this.data
			.query("select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events where run_id = ? order by seq")
			.all(runid) as eventrow[];
		return rows.map(parseevent);
	}

	recordevent(runid: string, type: string, payload: jsonvalue): eventrecord {
		if (!/^[a-z][a-z0-9_]*$/.test(type)) throw new TypeError("event.type: expected lowercase identifier");
		const value = jsonvalueof(payload, "event.payload");
		return this.transact(() => {
			this.requiredrun(runid);
			return this.appendevent(runid, type, value);
		});
	}

	getprofile(scope: profilescope, projectroot: string): profilerecord | null {
		if (!Object.hasOwn(profilescopes, scope)) throw new TypeError(`profile.scope: unsupported scope ${scope}`);
		const row = this.data
			.query("select * from profiles where scope = ? and project_root = ?")
			.get(scope, projectroot) as profilerow | null;
		return row ? parseprofile(row) : null;
	}

	profilehistory(scope: profilescope, projectroot: string): profilerecord[] {
		if (!Object.hasOwn(profilescopes, scope)) throw new TypeError(`profile.scope: unsupported scope ${scope}`);
		const rows = this.data
			.query("select * from profile_versions where scope = ? and project_root = ? order by version")
			.all(scope, projectroot) as profilerow[];
		return rows.map(parseprofile);
	}

	writeprofile(scope: profilescope, projectroot: string, document: jsonvalue): profilerecord {
		if (!Object.hasOwn(profilescopes, scope)) throw new TypeError(`profile.scope: unsupported scope ${scope}`);
		if (scope === "user" && projectroot !== "") throw new TypeError("user profile project root must be empty");
		if (scope === "project" && projectroot.length === 0) throw new TypeError("project profile root is required");
		const value = jsonvalueof(document, "profile");
		const documentjson = stablejson(value);
		const sourcehash = sha256(documentjson);
		return this.transact(() => {
			const current = this.getprofile(scope, projectroot);
			const version = (current?.version ?? 0) + 1;
			const updatedat = now();
			this.data
				.query(
					"insert into profile_versions(scope, project_root, version, document_json, source_hash, updated_at) values (?, ?, ?, ?, ?, ?)",
				)
				.run(scope, projectroot, version, documentjson, sourcehash, updatedat);
			this.data
				.query(`insert into profiles(scope, project_root, version, document_json, source_hash, updated_at)
					values (?, ?, ?, ?, ?, ?)
					on conflict(scope, project_root) do update set
						version = excluded.version,
						document_json = excluded.document_json,
						source_hash = excluded.source_hash,
						updated_at = excluded.updated_at`)
				.run(scope, projectroot, version, documentjson, sourcehash, updatedat);
			const written = this.getprofile(scope, projectroot);
			if (!written) throw new Error(`${scope} profile was not stored`);
			return written;
		});
	}

	listblueprints(name?: string): blueprintrecord[] {
		const rows = name
			? (this.data
					.query("select * from blueprints where name = ? order by version")
					.all(name) as blueprintrow[])
			: (this.data.query("select * from blueprints order by name, version").all() as blueprintrow[]);
		return rows.map(parseblueprint);
	}

	getblueprint(name: string, version: string): blueprintrecord | null {
		const row = this.data
			.query("select * from blueprints where name = ? and version = ?")
			.get(name, version) as blueprintrow | null;
		return row ? parseblueprint(row) : null;
	}

	writeblueprint(input: blueprintinput): blueprintrecord {
		assertprocessid(input.name);
		assertversion(input.version, "blueprint.version");
		const manifest = jsonvalueof(input.manifest, "blueprint.manifest");
		const config = jsonvalueof(input.config, "blueprint.config");
		return this.transact(() => {
			if (input.active) this.data.query("update blueprints set active = 0 where name = ?").run(input.name);
			const installedat = now();
			this.data
				.query(`insert into blueprints(
					name, version, source_path, install_path, content_hash, manifest_json, active, config_json, installed_at
				) values (?, ?, ?, ?, ?, ?, ?, ?, ?)
				on conflict(name, version) do update set
					source_path = excluded.source_path,
					install_path = excluded.install_path,
					content_hash = excluded.content_hash,
					manifest_json = excluded.manifest_json,
					active = excluded.active,
					config_json = excluded.config_json,
					installed_at = excluded.installed_at`)
				.run(
					input.name,
					input.version,
					input.sourcepath,
					input.installpath,
					input.contenthash,
					stablejson(manifest),
					input.active ? 1 : 0,
					stablejson(config),
					installedat,
				);
			const written = this.getblueprint(input.name, input.version);
			if (!written) throw new Error(`blueprint ${input.name}@${input.version} was not stored`);
			return written;
		});
	}

	activateblueprint(name: string, version: string): blueprintrecord {
		return this.transact(() => {
			const selected = this.getblueprint(name, version);
			if (!selected) throw new Error(`blueprint ${name}@${version} is not installed`);
			this.data.query("update blueprints set active = 0 where name = ?").run(name);
			this.data.query("update blueprints set active = 1 where name = ? and version = ?").run(name, version);
			const active = this.getblueprint(name, version);
			if (!active) throw new Error(`blueprint ${name}@${version} disappeared`);
			return active;
		});
	}

	deleteblueprint(name: string, version: string, replacementversion?: string): boolean {
		return this.transact(() => {
			if (replacementversion) {
				const replacement = this.getblueprint(name, replacementversion);
				if (!replacement) throw new Error(`blueprint ${name}@${replacementversion} is not installed`);
			}
			const result = this.data.query("delete from blueprints where name = ? and version = ?").run(name, version);
			if (Number(result.changes) === 0) return false;
			if (replacementversion) {
				this.data.query("update blueprints set active = 0 where name = ?").run(name);
				this.data
					.query("update blueprints set active = 1 where name = ? and version = ?")
					.run(name, replacementversion);
			}
			return true;
		});
	}

	listeffects(runid: string): effectrecord[] {
		const rows = this.data
			.query("select * from effects where run_id = ? order by created_at, id")
			.all(runid) as effectrow[];
		return rows.map(parseeffect);
	}

	geteffect(runid: string, effectid: string): effectrecord | null {
		const row = this.data
			.query("select * from effects where run_id = ? and id = ?")
			.get(runid, effectid) as effectrow | null;
		return row ? parseeffect(row) : null;
	}

	geteffectbykey(runid: string, key: string): effectrecord | null {
		const row = this.data
			.query("select * from effects where run_id = ? and effect_key = ?")
			.get(runid, key) as effectrow | null;
		return row ? parseeffect(row) : null;
	}

	requesteffect(runid: string, request: effectinput): effectrecord {
		asserteffectkey(request.key);
		assertkind(request.kind);
		const input = jsonvalueof(request.input, "effect.input");
		const inputjson = stablejson(input);
		const inputhash = sha256(inputjson);
		return this.transact(() => {
			const run = this.requiredrun(runid);
			if (Object.hasOwn(terminalstatuses, run.status)) throw new Error(`run ${runid} is terminal`);
			const existing = this.geteffectbykey(runid, request.key);
			if (existing) {
				if (existing.kind !== request.kind || existing.inputhash !== inputhash) {
					throw new Error(`effect ${request.key} input changed during replay`);
				}
				return existing;
			}
			const id = randomUUID();
			const createdat = now();
			this.data
				.query(`insert into effects(
					id, run_id, effect_key, kind, input_json, input_hash, status, fence,
					value_json, error_json, dispatched_at, dispatching_at, created_at, updated_at
				) values (?, ?, ?, ?, ?, ?, 'requested', ?, null, null, null, null, ?, ?)`)
				.run(id, runid, request.key, request.kind, inputjson, inputhash, run.fence, createdat, createdat);
			const effect = this.geteffect(runid, id);
			if (!effect) throw new Error(`effect ${id} was not stored`);
			this.appendevent(runid, "effect_requested", jsonvalueof(effect));
			this.transitioninside(run, request.kind === "breakpoint" ? "waiting_for_user" : "waiting_effect");
			return effect;
		});
	}

	markeffectdispatching(runid: string, effectid: string, fence: number): effectrecord {
		return this.transact(() => {
			const run = this.requiredrun(runid);
			if (run.fence !== fence) throw new Error(`stale fence ${fence}; current fence is ${run.fence}`);
			const effect = this.geteffect(runid, effectid);
			if (!effect) throw new Error(`effect ${effectid} does not exist`);
			if (effect.fence !== fence) throw new Error(`stale effect fence ${effect.fence}; current fence is ${fence}`);
			if (effect.status !== "requested") throw new Error(`effect ${effectid} is not pending`);
			if (effect.dispatchedat || effect.dispatchingat) return effect;
			const dispatchingat = now();
			this.data
				.query("update effects set dispatching_at = ?, updated_at = ? where id = ?")
				.run(dispatchingat, dispatchingat, effectid);
			const dispatching = this.geteffect(runid, effectid);
			if (!dispatching) throw new Error(`effect ${effectid} disappeared`);
			this.appendevent(runid, "effect_dispatch_started", jsonvalueof(dispatching));
			return dispatching;
		});
	}

	markeffectdispatched(runid: string, effectid: string, fence: number): effectrecord {
		return this.transact(() => {
			const run = this.requiredrun(runid);
			if (run.fence !== fence) throw new Error(`stale fence ${fence}; current fence is ${run.fence}`);
			const effect = this.geteffect(runid, effectid);
			if (!effect) throw new Error(`effect ${effectid} does not exist`);
			if (effect.fence !== fence) throw new Error(`stale effect fence ${effect.fence}; current fence is ${fence}`);
			if (effect.status !== "requested") throw new Error(`effect ${effectid} is not pending`);
			if (effect.dispatchedat) return effect;
			if (!effect.dispatchingat) throw new Error(`effect ${effectid} has no dispatch intent`);
			const dispatchedat = now();
			this.data
				.query("update effects set dispatched_at = ?, dispatching_at = null, updated_at = ? where id = ?")
				.run(dispatchedat, dispatchedat, effectid);
			const dispatched = this.geteffect(runid, effectid);
			if (!dispatched) throw new Error(`effect ${effectid} disappeared`);
			this.appendevent(runid, "effect_dispatched", jsonvalueof(dispatched));
			return dispatched;
		});
	}

	reverteffectdispatch(runid: string, effectid: string, fence: number): effectrecord {
		return this.transact(() => {
			const run = this.requiredrun(runid);
			if (run.fence !== fence) throw new Error(`stale fence ${fence}; current fence is ${run.fence}`);
			const effect = this.geteffect(runid, effectid);
			if (!effect) throw new Error(`effect ${effectid} does not exist`);
			if (effect.status !== "requested") throw new Error(`effect ${effectid} is not pending`);
			if (effect.dispatchedat === null && effect.dispatchingat === null) return effect;
			const updatedat = now();
			this.data
				.query("update effects set dispatched_at = null, dispatching_at = null, updated_at = ? where id = ?")
				.run(updatedat, effectid);
			const reverted = this.geteffect(runid, effectid);
			if (!reverted) throw new Error(`effect ${effectid} disappeared`);
			this.appendevent(runid, "effect_dispatch_rejected", jsonvalueof(reverted));
			return reverted;
		});
	}

	posteffect(post: effectpost): effectrecord {
		return this.transact(() => {
			const run = this.requiredrun(post.runid);
			if (post.fence !== run.fence) throw new Error(`stale fence ${post.fence}; current fence is ${run.fence}`);
			const effect = this.geteffect(post.runid, post.effectid);
			if (!effect) throw new Error(`effect ${post.effectid} does not exist`);
			if (post.inputhash !== effect.inputhash) {
				throw new Error(`effect ${effect.id} input hash mismatch`);
			}
			if (effect.fence !== post.fence) throw new Error(`stale effect fence ${effect.fence}; current fence is ${post.fence}`);
			const status: effectstatus =
				post.status === "ok" ? "resolved_ok" : post.status === "error" ? "resolved_error" : post.status;
			const value = post.value === undefined ? null : jsonvalueof(post.value, "effect.value");
			const error = post.error === undefined ? null : jsonvalueof(post.error, "effect.error");
			if (effect.status === "uncertain") {
				if (
					status === "uncertain" &&
					stablejson(effect.value) === stablejson(value) &&
					stablejson(effect.error) === stablejson(error)
				) {
					return effect;
				}
				throw new Error(`effect ${effect.id} is uncertain; use explicit recovery`);
			}
			if (effect.status !== "requested") {
				if (
					effect.status === status &&
					stablejson(effect.value) === stablejson(value) &&
					stablejson(effect.error) === stablejson(error)
				) {
					return effect;
				}
				throw new Error(`effect ${effect.id} already has a conflicting result`);
			}
			const updatedat = now();
			this.data
				.query("update effects set status = ?, value_json = ?, error_json = ?, updated_at = ? where id = ?")
				.run(
					status,
					value === null ? null : stablejson(value),
					error === null ? null : stablejson(error),
					updatedat,
					effect.id,
				);
			const resolved = this.geteffect(post.runid, effect.id);
			if (!resolved) throw new Error(`effect ${effect.id} disappeared`);
			this.appendevent(post.runid, "effect_resolved", jsonvalueof(resolved));
			if (status === "uncertain") {
				this.transitioninside(run, "blocked", null, `effect ${effect.id} outcome is uncertain`);
			} else {
				this.transitioninside(run, "running");
			}
			return resolved;
		});
	}

	resolveuncertain(resolution: uncertainresolution): effectrecord {
		return this.transact(() => {
			const run = this.requiredrun(resolution.runid);
			if (resolution.fence !== run.fence) {
				throw new Error(`stale fence ${resolution.fence}; current fence is ${run.fence}`);
			}
			const effect = this.geteffect(resolution.runid, resolution.effectid);
			if (!effect) throw new Error(`effect ${resolution.effectid} does not exist`);
			if (effect.status !== "uncertain") throw new Error(`effect ${effect.id} is not uncertain`);

			const updatedat = now();
			if (effect.fence !== resolution.fence) {
				throw new Error(`stale effect fence ${effect.fence}; current fence is ${resolution.fence}`);
			}
			if (resolution.inputhash !== effect.inputhash) {
				throw new Error(`effect ${effect.id} input hash mismatch`);
			}
			if (resolution.decision === "retry") {
				const fence = run.fence + 1;
				this.data
					.query("update runs set fence = ?, updated_at = ? where id = ?")
					.run(fence, updatedat, run.id);
				const siblings = this.listeffects(run.id).filter((entry) => entry.status === "requested");
				this.data
					.query(
						"update effects set fence = ?, dispatched_at = null, dispatching_at = null, updated_at = ? where run_id = ? and status = 'requested'",
					)
					.run(fence, updatedat, run.id);
				this.data
					.query(
						"update effects set status = 'requested', fence = ?, value_json = null, error_json = null, dispatched_at = null, dispatching_at = null, updated_at = ? where id = ?",
					)
					.run(fence, updatedat, effect.id);
				for (const sibling of siblings) {
					const refenced = this.geteffect(run.id, sibling.id);
					if (!refenced) throw new Error(`effect ${sibling.id} disappeared`);
					this.appendevent(run.id, "effect_refenced", jsonvalueof(refenced));
				}
				const retried = this.geteffect(run.id, effect.id);
				if (!retried) throw new Error(`effect ${effect.id} disappeared`);
				this.appendevent(run.id, "effect_retried", jsonvalueof(retried));
				const fencedrun = this.requiredrun(run.id);
				this.transitioninside(fencedrun, "running");
				this.transitioninside(this.requiredrun(run.id), "waiting_effect");
				return retried;
			}

			const status: effectstatus = resolution.decision === "confirm" ? "resolved_ok" : "resolved_error";
			const value = resolution.value === undefined ? null : jsonvalueof(resolution.value, "effect.value");
			const error = resolution.error === undefined ? null : jsonvalueof(resolution.error, "effect.error");
			this.data
				.query("update effects set status = ?, value_json = ?, error_json = ?, updated_at = ? where id = ?")
				.run(
					status,
					value === null ? null : stablejson(value),
					error === null ? null : stablejson(error),
					updatedat,
					effect.id,
				);
			const recovered = this.geteffect(run.id, effect.id);
			if (!recovered) throw new Error(`effect ${effect.id} disappeared`);
			this.appendevent(run.id, "effect_recovered", jsonvalueof(recovered));
			this.transitioninside(run, "running");
			return recovered;
		});
	}

	claimrun(runid: string, owner: string, ttlms = 300_000): number {
		if (owner.length === 0) throw new TypeError("run lease owner is required");
		if (!Number.isInteger(ttlms) || ttlms < 1 || ttlms > 3_600_000) {
			throw new TypeError("run lease ttl must be an integer from 1 to 3600000");
		}
		return this.transact(() => {
			const run = this.requiredrun(runid);
			const current = Date.now();
			if (run.leaseowner && run.leaseowner !== owner) {
				const expired = run.leaseexpiresat !== null && run.leaseexpiresat <= current;
				if (!expired || leaseowneralive(run.leaseowner)) {
					throw new Error(`run ${runid} is leased by another engine`);
				}
			}
			const expires = current + ttlms;
			this.data
				.query(`update runs
					set lease_owner = ?, lease_epoch = lease_epoch + 1, lease_expires_at = ?
					where id = ?`)
				.run(owner, expires, runid);
			return this.requiredrun(runid).leaseepoch;
		});
	}

	releaserun(runid: string, owner: string, epoch: number): boolean {
		return this.transact(() => {
			const result = this.data
				.query(`update runs
					set lease_owner = null, lease_expires_at = null
					where id = ? and lease_owner = ? and lease_epoch = ?`)
				.run(runid, owner, epoch);
			return Number(result.changes) > 0;
		});
	}

	bumpfence(runid: string): number {
		return this.transact(() => {
			const run = this.requiredrun(runid);
			const fence = run.fence + 1;
			const updatedat = now();
			this.data.query("update runs set fence = ?, updated_at = ? where id = ?").run(fence, updatedat, runid);
			const updated = this.requiredrun(runid);
			this.appendevent(runid, "run_status", jsonvalueof(updated));
			return fence;
		});
	}

	extendturnbudget(runid: string, additional: number): runrecord {
		if (!Number.isInteger(additional) || additional < 1 || additional > 10_000) {
			throw new TypeError("run.additionalturns: expected integer from 1 to 10000");
		}
		return this.transact(() => {
			const run = this.requiredrun(runid);
			const maxturns = run.maxturns + additional;
			const updatedat = now();
			this.data
				.query("update runs set max_turns = ?, updated_at = ? where id = ?")
				.run(maxturns, updatedat, runid);
			const updated = this.requiredrun(runid);
			this.appendevent(runid, "run_status", jsonvalueof(updated));
			return updated;
		});
	}

	transitionrun(runid: string, status: runstatus, output: jsonvalue | null = null, reason: string | null = null): runrecord {
		return this.transact(() => this.transitioninside(this.requiredrun(runid), status, output, reason));
	}

	private transitioninside(
		run: runrecord,
		status: runstatus,
		output: jsonvalue | null = null,
		reason: string | null = null,
	): runrecord {
		assertstatus(status);
		if (run.status !== status && !transitions[run.status].includes(status)) {
			throw new Error(`illegal run transition ${run.status} -> ${status}`);
		}
		const updatedat = now();
		const normalizedoutput = output === null ? null : jsonvalueof(output, "run.output");
		const turns = status === "running" && run.status !== "running" ? run.turns + 1 : run.turns;
		this.data
			.query("update runs set status = ?, output_json = ?, blocked_reason = ?, turns = ?, updated_at = ? where id = ?")
			.run(
				status,
				normalizedoutput === null ? run.output === null ? null : stablejson(run.output) : stablejson(normalizedoutput),
				reason,
				turns,
				updatedat,
				run.id,
			);
		const updated = this.requiredrun(run.id);
		this.appendevent(run.id, "run_status", jsonvalueof(updated));
		if (Object.hasOwn(terminalstatuses, status) && run.sessionid) {
			this.data.query("delete from sessions where session_id = ?").run(run.sessionid);
			this.appendevent(run.id, "session_unbound", { sessionid: run.sessionid, runid: run.id });
		}
		return updated;
	}

	doctor(): doctorreport {
		const issues: string[] = [];
		const version = this.data.query("pragma user_version").get() as { user_version: number };
		if (version.user_version !== 7) {
			return {
				ok: false,
				issues: [`database schema ${version.user_version} requires migration to 7`],
			};
		}
		const integrity = this.data.query("pragma integrity_check").all() as Array<{ integrity_check: string }>;
		for (const row of integrity) {
			if (row.integrity_check !== "ok") issues.push(`sqlite integrity: ${row.integrity_check}`);
		}
		const rows = this.data
			.query("select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events order by run_id, seq")
			.all() as eventrow[];
		const previousbyrun = new Map<string, string | null>();
		const statusbyrun = new Map<string, runstatus>();
		const statuseffectbyid = new Map<string, effectstatus>();
		for (const row of rows) {
			const expectedprevious = previousbyrun.get(row.run_id) ?? null;
			if (row.previous_hash !== expectedprevious) {
				issues.push(`run ${row.run_id} event ${row.seq} previous hash mismatch`);
			}
			const expectedhash = sha256(
				`${row.run_id}\n${row.seq}\n${row.type}\n${row.payload_json}\n${row.previous_hash ?? ""}`,
			);
			if (row.hash !== expectedhash) issues.push(`run ${row.run_id} event ${row.seq} hash mismatch`);
			previousbyrun.set(row.run_id, row.hash);
			const payload = objectvalue(parsejson(row.payload_json, `event ${row.run_id}/${row.seq}`), "event payload");
			if (row.type === "run_created" || row.type === "run_status") {
				const status = stringfield(payload, "status", "event payload");
				assertstatus(status);
				statusbyrun.set(row.run_id, status);
			}
			if (row.type.startsWith("effect_")) {
				const effectid = stringfield(payload, "id", "event payload");
				const status = stringfield(payload, "status", "event payload");
				asserteffectstatus(status);
				statuseffectbyid.set(effectid, status);
			}
		}

		const seenruns = new Set<string>();
		const runrows = this.data.query("select * from runs order by id").all() as runrow[];
		for (const row of runrows) {
			seenruns.add(row.id);
			const expected = statusbyrun.get(row.id);
			if (!expected) {
				issues.push(`run ${row.id} projection has no event record`);
			} else if (row.status !== expected) {
				issues.push(`run ${row.id} projection status ${row.status} does not match ${expected}`);
			}
		}
		for (const runid of statusbyrun.keys()) {
			if (!seenruns.has(runid)) issues.push(`run ${runid} projection is missing`);
		}

		const seeneffects = new Set<string>();
		const effectrows = this.data.query("select * from effects order by id").all() as effectrow[];
		for (const row of effectrows) {
			seeneffects.add(row.id);
			const expected = statuseffectbyid.get(row.id);
			if (!expected) {
				issues.push(`effect ${row.id} projection has no event record`);
			} else if (row.status !== expected) {
				issues.push(`effect ${row.id} projection status ${row.status} does not match ${expected}`);
			}
		}
		for (const effectid of statuseffectbyid.keys()) {
			if (!seeneffects.has(effectid)) issues.push(`effect ${effectid} projection is missing`);
		}

		const runbyid = new Map(runrows.map((row) => [row.id, row]));
		const sessionrows = this.data
			.query("select session_id, run_id from sessions order by session_id")
			.all() as Array<{ session_id: string; run_id: string }>;
		const sessionbyrun = new Map<string, string>();
		for (const binding of sessionrows) {
			sessionbyrun.set(binding.run_id, binding.session_id);
			const run = runbyid.get(binding.run_id);
			if (!run) {
				issues.push(`session ${binding.session_id} points to missing run ${binding.run_id}`);
				continue;
			}
			if (run.session_id !== binding.session_id) {
				issues.push(
					`session ${binding.session_id} points to run ${run.id} with projection session ${run.session_id ?? "<none>"}`,
				);
			}
			if (Object.hasOwn(terminalstatuses, run.status)) {
				issues.push(`session ${binding.session_id} points to terminal run ${run.id}`);
			}
		}
		for (const run of runrows) {
			if (!run.session_id || Object.hasOwn(terminalstatuses, run.status)) continue;
			if (sessionbyrun.get(run.id) !== run.session_id) {
				issues.push(`run ${run.id} projection session ${run.session_id} has no matching binding`);
			}
		}

		const currentprofiles = this.data.query("select * from profiles").all() as profilerow[];
		const historyprofiles = this.data
			.query("select * from profile_versions order by scope, project_root, version")
			.all() as profilerow[];
		const latestprofile = new Map<string, profilerow>();
		for (const history of historyprofiles) {
			const key = `${history.scope}\u0000${history.project_root}`;
			latestprofile.set(key, history);
			if (sha256(history.document_json) !== history.source_hash) {
				const root = history.project_root || "<global>";
				issues.push(`profile ${history.scope}:${root} retained version ${history.version} hash mismatch`);
			}
		}
		const currentprofilekeys = new Set<string>();
		for (const current of currentprofiles) {
			const key = `${current.scope}\u0000${current.project_root}`;
			currentprofilekeys.add(key);
			const retained = latestprofile.get(key);
			const root = current.project_root || "<global>";
			if (!retained) {
				issues.push(`profile ${current.scope}:${root} has no retained history`);
				continue;
			}
			if (
				current.version !== retained.version ||
				current.document_json !== retained.document_json ||
				current.source_hash !== retained.source_hash
			) {
				issues.push(
					`profile ${current.scope}:${root} current record does not match retained version ${retained.version}`,
				);
			}
		}
		for (const [key, retained] of latestprofile) {
			if (currentprofilekeys.has(key)) continue;
			const root = retained.project_root || "<global>";
			issues.push(`profile ${retained.scope}:${root} retained history has no current record`);
		}
		return { ok: issues.length === 0, issues };
	}

	repair(): { backup: string; report: doctorreport } {
		const backup = `${this.path}.backup-${Date.now()}`;
		this.data.exec(`vacuum into '${backup.replaceAll("'", "''")}'`);
		const eventissues = this.eventprojectionissues().filter(
			(issue) =>
				issue.includes(" event ") ||
				issue.startsWith("event projection verification failed:"),
		);
		if (eventissues.length > 0) {
			throw new Error(`repair event verification failed: ${eventissues.join("; ")}`);
		}
		let report: doctorreport | undefined;
		this.transact(() => {
			const rows = this.data
				.query("select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events order by id")
				.all() as eventrow[];
			this.data.query("delete from sessions").run();
			this.data.query("delete from effects").run();
			this.data.query("delete from runs").run();
			this.data.query("delete from profiles").run();
			this.data
				.query(`insert into profiles(scope, project_root, version, document_json, source_hash, updated_at)
					select history.scope, history.project_root, history.version, history.document_json, history.source_hash, history.updated_at
					from profile_versions as history
					where history.version = (
						select max(candidate.version)
						from profile_versions as candidate
						where candidate.scope = history.scope and candidate.project_root = history.project_root
					)`)
				.run();

			for (const row of rows) {
				const payload = objectvalue(parsejson(row.payload_json, `event ${row.run_id}/${row.seq}`), "event payload");
				if (row.type === "run_created" || row.type === "run_status") {
					const id = stringfield(payload, "id", "event payload");
					if (id !== row.run_id) throw new Error(`event ${row.id} run identity mismatch`);
					const mode = stringfield(payload, "mode", "event payload");
					const status = stringfield(payload, "status", "event payload");
					assertmode(mode);
					assertstatus(status);
					this.data
						.query(`insert into runs(
							id, session_id, process_id, process_version, process_hash,
							blueprint_name, blueprint_version,
							profile_json, user_profile_version, project_profile_version,
							mode, status, input_json, output_json, blocked_reason,
							max_turns, turns, fence, lease_owner, lease_epoch, lease_expires_at,
							created_at, updated_at
						) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
						on conflict(id) do update set
							session_id = excluded.session_id,
							process_id = excluded.process_id,
							process_version = excluded.process_version,
							process_hash = excluded.process_hash,
							blueprint_name = excluded.blueprint_name,
							blueprint_version = excluded.blueprint_version,
							profile_json = excluded.profile_json,
							user_profile_version = excluded.user_profile_version,
							project_profile_version = excluded.project_profile_version,
							mode = excluded.mode,
							status = excluded.status,
							input_json = excluded.input_json,
							output_json = excluded.output_json,
							blocked_reason = excluded.blocked_reason,
							max_turns = excluded.max_turns,
							turns = excluded.turns,
							fence = excluded.fence,
							lease_owner = excluded.lease_owner,
							lease_epoch = excluded.lease_epoch,
							lease_expires_at = excluded.lease_expires_at,
							updated_at = excluded.updated_at`)
						.run(
							id,
							typeof payload.sessionid === "string" ? payload.sessionid : null,
							stringfield(payload, "processid", "event payload"),
							stringfield(payload, "processversion", "event payload"),
							stringfield(payload, "processhash", "event payload"),
							typeof payload.blueprintname === "string" ? payload.blueprintname : null,
							typeof payload.blueprintversion === "string" ? payload.blueprintversion : null,
							stablejson(payload.profile ?? { schema: 1 }),
							typeof payload.userprofileversion === "number" ? payload.userprofileversion : null,
							typeof payload.projectprofileversion === "number" ? payload.projectprofileversion : null,
							mode,
							status,
							stablejson(payload.input),
							payload.output === null ? null : stablejson(payload.output),
							typeof payload.blockedreason === "string" ? payload.blockedreason : null,
							numberfield(payload, "maxturns", "event payload"),
							numberfield(payload, "turns", "event payload"),
							numberfield(payload, "fence", "event payload"),
							typeof payload.leaseowner === "string" ? payload.leaseowner : null,
							typeof payload.leaseepoch === "number" ? payload.leaseepoch : 0,
							typeof payload.leaseexpiresat === "number" ? payload.leaseexpiresat : null,
							stringfield(payload, "createdat", "event payload"),
							stringfield(payload, "updatedat", "event payload"),
						);
				}
				if (row.type.startsWith("effect_")) {
					const effectid = stringfield(payload, "id", "event payload");
					const runid = stringfield(payload, "runid", "event payload");
					if (runid !== row.run_id) throw new Error(`event ${row.id} effect run identity mismatch`);
					const kind = stringfield(payload, "kind", "event payload");
					const status = stringfield(payload, "status", "event payload");
					assertkind(kind);
					asserteffectstatus(status);
					this.data
						.query(`insert into effects(
							id, run_id, effect_key, kind, input_json, input_hash, status, fence,
							value_json, error_json, dispatched_at, dispatching_at, created_at, updated_at
						) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
						on conflict(id) do update set
							run_id = excluded.run_id,
							effect_key = excluded.effect_key,
							kind = excluded.kind,
							input_json = excluded.input_json,
							input_hash = excluded.input_hash,
							status = excluded.status,
							fence = excluded.fence,
							value_json = excluded.value_json,
							error_json = excluded.error_json,
							dispatched_at = excluded.dispatched_at,
							dispatching_at = excluded.dispatching_at,
							updated_at = excluded.updated_at`)
						.run(
							effectid,
							runid,
							stringfield(payload, "key", "event payload"),
							kind,
							stablejson(payload.input),
							stringfield(payload, "inputhash", "event payload"),
							status,
							numberfield(payload, "fence", "event payload"),
							payload.value === null ? null : stablejson(payload.value),
							payload.error === null ? null : stablejson(payload.error),
							typeof payload.dispatchedat === "string" ? payload.dispatchedat : null,
							typeof payload.dispatchingat === "string" ? payload.dispatchingat : null,
							stringfield(payload, "createdat", "event payload"),
							stringfield(payload, "updatedat", "event payload"),
						);
				}
				if (row.type === "session_bound") {
					this.data
						.query("insert or replace into sessions(session_id, run_id) values (?, ?)")
						.run(stringfield(payload, "sessionid", "event payload"), row.run_id);
				}
				if (row.type === "session_unbound") {
					this.data
						.query("delete from sessions where session_id = ?")
						.run(stringfield(payload, "sessionid", "event payload"));
				}
			}
			for (const run of this.data.query("select id from runs order by id").all() as Array<{ id: string }>) {
				this.appendevent(run.id, "repair", { backup });
			}
			report = this.doctor();
			if (!report.ok) throw new Error(`repair verification failed: ${report.issues.join("; ")}`);
		});
		if (!report) throw new Error("repair verification did not run");
		return { backup, report };
	}
}
