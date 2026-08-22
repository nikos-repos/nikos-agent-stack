import { createHash, randomUUID } from "node:crypto";
import {
	asserteffectkey,
	assertprocessid,
	assertvalid,
	jsonvalueof,
	stablejson,
} from "./contracts.ts";
import type {
	effectkind,
	jsonvalue,
	orchestrationmode,
	parallelrequest,
	processcontext,
	processdefinition,
} from "./contracts.ts";
import { hookdispatcherror, hookregistry } from "./hooks.ts";
import type { hookphase, hookresult, hookselector } from "./hooks.ts";
import { modepolicy } from "./processes.ts";
import { orchestrationstore } from "./store.ts";
import type {
	effectpost,
	effectrecord,
	runrecord,
	uncertainresolution,
} from "./store.ts";

export interface startinput {
	runid?: string;
	processid: string;
	processversion?: string;
	blueprintname?: string;
	blueprintversion?: string;
	sessionid: string | null;
	mode: orchestrationmode;
	input: jsonvalue;
	profile?: jsonvalue;
	userprofileversion?: number | null;
	projectprofileversion?: number | null;
}

export interface enginepost extends effectpost {
	rootrunid: string;
}

export interface engineresolution extends uncertainresolution {
	rootrunid: string;
}

export type advanceresult =
	| { status: "waiting"; run: runrecord; effects: effectrecord[] }
	| { status: "completed"; run: runrecord; output: jsonvalue }
	| { status: "blocked"; run: runrecord; reason: string }
	| { status: "failed"; run: runrecord; error: string }
	| { status: "halted"; run: runrecord; reason: string };

export interface effectcommit {
	status: "committed" | "duplicate" | "blocked";
	run: runrecord;
	effect: effectrecord;
	reason?: string;
}

class effectpending extends Error {
	readonly effects: effectrecord[];

	constructor(effects: effectrecord[]) {
		super("effects pending");
		this.effects = effects;
	}
}

interface planentry {
	key: string;
	kind: effectkind;
	input: jsonvalue;
}

class planpending extends Error {
	readonly requests: planentry[];

	constructor(requests: planentry[]) {
		super("plan effects pending");
		this.requests = requests;
	}
}

class processhalt extends Error {
	readonly payload: jsonvalue;

	constructor(reason: string, payload: jsonvalue) {
		super(reason);
		this.payload = payload;
	}
}

class processblocked extends Error {}

export class effectexecutionerror extends Error {
	readonly effect: effectrecord;

	constructor(effect: effectrecord) {
		const detail = effect.error === null ? "effect failed" : stablejson(effect.error);
		super(`effect ${effect.key} failed: ${detail}`);
		this.name = "effectexecutionerror";
		this.effect = effect;
	}
}

function processkey(process: Readonly<processdefinition>): string {
	return `${process.id}@${process.version}@${process.blueprint?.name ?? ""}@${process.blueprint?.version ?? ""}`;
}

function subprocessrunid(parentrunid: string, key: string, processid: string, version: string, input: jsonvalue): string {
	const digest = createHash("sha256")
		.update(`${parentrunid}\n${key}\n${processid}\n${version}\n${stablejson(input)}`)
		.digest("hex");
	return `child-${digest.slice(0, 32)}`;
}

function processhash(process: Readonly<processdefinition>): string {
	const source = Function.prototype.toString.call(process.run);
	return createHash("sha256")
		.update(
			`${process.id}\n${process.version}\n${process.sourcehash ?? ""}\n${stablejson(process.input)}\n${stablejson(process.output)}\n${source}`,
		)
		.digest("hex");
}

function objectinput(value: jsonvalue, path: string): Record<string, jsonvalue> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected object`);
	return value;
}

function terminalresult(run: runrecord): advanceresult | null {
	if (run.status === "completed") return { status: "completed", run, output: run.output ?? null };
	if (run.status === "failed") return { status: "failed", run, error: run.blockedreason ?? "process failed" };
	if (run.status === "halted") return { status: "halted", run, reason: run.blockedreason ?? "process halted" };
	if (run.status === "blocked") return { status: "blocked", run, reason: run.blockedreason ?? "run blocked" };
	return null;
}

export class orchestrationengine {
	readonly store: orchestrationstore;
	readonly hooks: hookregistry;
	private readonly processes = new Map<string, Readonly<processdefinition>>();
	private operationowner(): string {
		return `${process.pid}:${randomUUID()}`;
	}

	private async withrootlease<result>(
		runid: string,
		operation: (owner: string, epoch: number) => Promise<result>,
	): Promise<result> {
		const owner = this.operationowner();
		const epoch = this.store.claimrun(runid, owner);
		try {
			return await operation(owner, epoch);
		} finally {
			this.store.releaserun(runid, owner, epoch);
		}
	}
	constructor(store: orchestrationstore, hooks = new hookregistry()) {
		this.store = store;
		this.hooks = hooks;
	}

	register(process: Readonly<processdefinition>): void {
		const key = processkey(process);
		if (this.processes.has(key)) throw new Error(`process ${key} is already registered`);
		this.processes.set(key, process);
	}

	listprocesses(): Readonly<processdefinition>[] {
		return [...this.processes.values()].sort(
			(left, right) =>
				left.id.localeCompare(right.id) ||
				left.version.localeCompare(right.version, undefined, { numeric: true }) ||
				(left.blueprint?.version ?? "").localeCompare(
					right.blueprint?.version ?? "",
					undefined,
					{ numeric: true },
				),
		);
	}


	resolveprocess(
		processid: string,
		version?: string,
		blueprint?: { name: string; version: string },
	): Readonly<processdefinition> {
		return this.requireprocess(processid, version, blueprint);
	}
	private requireprocess(
		processid: string,
		version?: string,
		blueprint?: { name: string; version: string },
	): Readonly<processdefinition> {
		assertprocessid(processid);
		const candidates = [...this.processes.values()]
			.filter((process) => process.id === processid)
			.filter((process) => version === undefined || process.version === version)
			.filter((process) =>
				blueprint
					? process.blueprint?.name === blueprint.name &&
						process.blueprint.version === blueprint.version
					: process.active,
			)
			.sort((left, right) =>
				right.version.localeCompare(left.version, undefined, { numeric: true }),
			);
		if (candidates.length === 0) {
			throw new Error(`process ${processid}${version ? `@${version}` : ""} is not registered`);
		}
		if (candidates.length > 1 && version !== undefined && blueprint === undefined) {
			throw new Error(`process ${processid}@${version} is ambiguous across blueprints`);
		}
		return candidates[0]!;
	}

	private async dispatchphase(runid: string, phase: hookphase, input: jsonvalue): Promise<hookresult[]> {
		const run = this.store.getrun(runid);
		if (!run) throw new Error(`run ${runid} does not exist`);
		const blueprint =
			run.blueprintname && run.blueprintversion
				? { name: run.blueprintname, version: run.blueprintversion }
				: undefined;
		const results = await this.hooks.dispatchfor(phase, input, blueprint);
		for (const result of results) this.store.recordevent(runid, "hook_completed", jsonvalueof(result));
		return results;
	}

	private async postsafe(runid: string, phase: hookphase, input: jsonvalue): Promise<void> {
		try {
			await this.dispatchphase(runid, phase, input);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			this.store.recordevent(runid, "hook_failed", { phase, message });
		}
	}

	private async create(input: startinput): Promise<runrecord> {
		const process = this.requireprocess(
			input.processid,
			input.processversion,
			input.blueprintname && input.blueprintversion
				? { name: input.blueprintname, version: input.blueprintversion }
				: undefined,
		);
		assertvalid(process.input, input.input, "run.input");
		const blueprint = process.blueprint;
		const startedhooks = modepolicy(input.mode).execute
			? await this.hooks.dispatchfor(
					"run_start",
					{
						processid: process.id,
						processversion: process.version,
						mode: input.mode,
						input: input.input,
					},
					blueprint,
				)
			: [];
		const run = this.store.createrun({
			runid: input.runid,
			processid: process.id,
			processversion: process.version,
			processhash: processhash(process),
			blueprintname: process.blueprint?.name ?? null,
			blueprintversion: process.blueprint?.version ?? null,
			sessionid: input.sessionid,
			mode: input.mode,
			input: input.input,
			profile: input.profile,
			userprofileversion: input.userprofileversion,
			projectprofileversion: input.projectprofileversion,
			maxturns: process.maxturns,
		});
		for (const result of startedhooks) this.store.recordevent(run.id, "hook_completed", jsonvalueof(result));
		return run;
	}

	async start(input: startinput): Promise<advanceresult> {
		const run = await this.create(input);
		return this.advance(run.id);
	}

	private effectvalue(effect: effectrecord): jsonvalue {
		if (effect.status === "resolved_ok") return effect.value;
		if (effect.status === "resolved_error" || effect.status === "cancelled") {
			throw new effectexecutionerror(effect);
		}
		if (effect.status === "uncertain") throw new processblocked(`effect ${effect.key} outcome is uncertain`);
		throw new effectpending([effect]);
	}

	private async ensureeffect(
		run: runrecord,
		kind: effectkind,
		key: string,
		input: jsonvalue,
	): Promise<effectrecord> {
		asserteffectkey(key);
		const existing = this.store.geteffectbykey(run.id, key);
		if (!existing) {
			await this.dispatchphase(run.id, "effect_requested", { runid: run.id, key, kind, input });
		}
		return this.store.requesteffect(run.id, { key, kind, input });
	}

	private async resolveinternaleffect(
		runid: string,
		effect: effectrecord,
		status: "ok" | "error",
		value: jsonvalue,
	): Promise<effectrecord> {
		const resolved = this.store.posteffect({
			runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status,
			...(status === "ok" ? { value } : { error: value }),
		});
		await this.dispatchphase(runid, "effect_resolved", {
			runid,
			effectid: effect.id,
			status: resolved.status,
		});
		return resolved;
	}

	private async task(run: runrecord, key: string, input: jsonvalue): Promise<jsonvalue> {
		const effect = await this.ensureeffect(run, "task", key, input);
		return this.effectvalue(effect);
	}

	private async parallel(
		run: runrecord,
		key: string,
		requests: readonly parallelrequest[],
		maxconcurrency = requests.length,
	): Promise<jsonvalue[]> {
		asserteffectkey(key);
		if (!Number.isInteger(maxconcurrency) || maxconcurrency < 1 || maxconcurrency > 64) {
			throw new TypeError("parallel.maxconcurrency: expected integer from 1 to 64");
		}
		if (requests.length === 0) return [];
		const seen = new Set<string>();
		for (const request of requests) {
			if (seen.has(request.key)) throw new TypeError(`parallel request ${request.key} is duplicated`);
			seen.add(request.key);
		}
		const effects: effectrecord[] = [];
		const pending: effectrecord[] = [];
		for (const request of requests) {
			const effectkey = `${key}/${request.key}`;
			const existing = this.store.geteffectbykey(run.id, effectkey);
			if (!existing && pending.length >= maxconcurrency) continue;
			const effect = await this.ensureeffect(run, "task", effectkey, request.input);
			effects.push(effect);
			if (effect.status === "requested" || effect.status === "uncertain") pending.push(effect);
		}
		if (pending.length > 0) {
			if (pending.some((effect) => effect.status === "uncertain")) {
				throw new processblocked("parallel effect outcome is uncertain");
			}
			throw new effectpending(pending);
		}
		return effects.map((effect) => this.effectvalue(effect));
	}

	private async subprocess(
		run: runrecord,
		key: string,
		processid: string,
		input: jsonvalue,
	): Promise<jsonvalue> {
		asserteffectkey(key);
		assertprocessid(processid);
		let childprocess: Readonly<processdefinition>;
		try {
			childprocess = this.requireprocess(
				processid,
				undefined,
				run.blueprintname && run.blueprintversion
					? { name: run.blueprintname, version: run.blueprintversion }
					: undefined,
			);
		} catch {
			childprocess = this.requireprocess(processid);
		}
		let parent = this.store.geteffectbykey(run.id, key);
		let childrunid: string;
		let childversion: string;
		if (!parent) {
			childversion = childprocess.version;
			childrunid = subprocessrunid(run.id, key, processid, childversion, input);
			parent = await this.ensureeffect(run, "subprocess", key, {
				processid,
				processversion: childversion,
				blueprintname: childprocess.blueprint?.name ?? null,
				blueprintversion: childprocess.blueprint?.version ?? null,
				input,
				childrunid,
			});
		} else {
			if (parent.kind !== "subprocess") throw new Error(`effect ${key} is not a subprocess`);
			const stored = objectinput(parent.input, `effect ${key} input`);
			if (stored.processid !== processid || stablejson(stored.input) !== stablejson(input)) {
				throw new Error(`effect ${key} input changed during replay`);
			}
			if (typeof stored.childrunid !== "string") throw new Error(`effect ${key} has no child run`);
			if (typeof stored.processversion !== "string") throw new Error(`effect ${key} has no child version`);
			childrunid = stored.childrunid;
			childversion = stored.processversion;
			childprocess = this.requireprocess(
				processid,
				childversion,
				typeof stored.blueprintname === "string" &&
					typeof stored.blueprintversion === "string"
					? { name: stored.blueprintname, version: stored.blueprintversion }
					: undefined,
			);
		}
		if (!this.store.getrun(childrunid)) {
			await this.create({
				runid: childrunid,
				processid,
				processversion: childversion,
				blueprintname: childprocess.blueprint?.name,
				blueprintversion: childprocess.blueprint?.version,
				sessionid: null,
				mode: run.mode,
				input,
				profile: run.profile,
				userprofileversion: run.userprofileversion,
				projectprofileversion: run.projectprofileversion,
			});
		}

		if (parent.status === "resolved_ok") return parent.value;
		if (parent.status === "resolved_error" || parent.status === "cancelled") throw new effectexecutionerror(parent);
		const childresult = await this.advance(childrunid);
		if (childresult.status === "waiting") throw new effectpending(childresult.effects);
		if (childresult.status === "blocked") throw new processblocked(`child ${childrunid} blocked: ${childresult.reason}`);
		if (childresult.status === "failed") {
			await this.resolveinternaleffect(run.id, parent, "error", { childrunid, error: childresult.error });
			throw new effectexecutionerror(this.store.geteffect(run.id, parent.id) ?? parent);
		}
		if (childresult.status === "halted") {
			await this.resolveinternaleffect(run.id, parent, "error", { childrunid, error: childresult.reason });
			throw new effectexecutionerror(this.store.geteffect(run.id, parent.id) ?? parent);
		}
		const resolved = await this.resolveinternaleffect(run.id, parent, "ok", childresult.output);
		return this.effectvalue(resolved);
	}

	private async sleep(run: runrecord, key: string, until: string): Promise<void> {
		const deadline = Date.parse(until);
		if (!Number.isFinite(deadline)) throw new TypeError("sleep.until: expected iso timestamp");
		const effect = await this.ensureeffect(run, "sleep", key, { until: new Date(deadline).toISOString() });
		if (effect.status === "requested" && Date.now() >= deadline) {
			await this.resolveinternaleffect(run.id, effect, "ok", null);
			return;
		}
		this.effectvalue(effect);
	}

	private async breakpoint(run: runrecord, key: string, input: jsonvalue): Promise<jsonvalue> {
		if (!modepolicy(run.mode).optionalbreakpoints) {
			const record = objectinput(input, "breakpoint input");
			if (record.required !== true) return { approved: true, mode: run.mode };
		}
		const effect = await this.ensureeffect(run, "breakpoint", key, input);
		return this.effectvalue(effect);
	}

	private async processhook(run: runrecord, key: string, hookid: string, input: jsonvalue): Promise<jsonvalue> {
		const existing = this.store.geteffectbykey(run.id, key);
		let selector: hookselector;
		if (existing) {
			const stored = objectinput(existing.input, `effect ${key} input`);
			if (stored.hookid !== hookid || stablejson(stored.input) !== stablejson(input)) {
				throw new Error(`effect ${key} input changed during replay`);
			}
			selector = {
				version: typeof stored.hookversion === "string" ? stored.hookversion : undefined,
				blueprintname:
					typeof stored.blueprintname === "string" ? stored.blueprintname : undefined,
				blueprintversion:
					typeof stored.blueprintversion === "string" ? stored.blueprintversion : undefined,
			};
		} else {
			const selected = this.hooks.resolve(
				hookid,
				run.blueprintname && run.blueprintversion
					? {
							blueprintname: run.blueprintname,
							blueprintversion: run.blueprintversion,
						}
					: {},
			);
			selector = {
				version: selected.version,
				blueprintname: selected.blueprint?.name,
				blueprintversion: selected.blueprint?.version,
			};
		}
		const selected = this.hooks.resolve(hookid, selector);
		const effect = await this.ensureeffect(run, "hook", key, {
			hookid,
			hookversion: selected.version,
			blueprintname: selected.blueprint?.name ?? null,
			blueprintversion: selected.blueprint?.version ?? null,
			input,
		});
		if (effect.status !== "requested") return this.effectvalue(effect);
		const result = await this.hooks.dispatchone(hookid, input, selector);
		const resolved = await this.resolveinternaleffect(run.id, effect, "ok", result.output);
		return this.effectvalue(resolved);
	}

	private context(run: runrecord): processcontext {
		return {
			runid: run.id,
			task: (key, input) => this.task(run, key, input),
			parallel: (key, requests, maxconcurrency) => this.parallel(run, key, requests, maxconcurrency),
			subprocess: (key, processid, input) => this.subprocess(run, key, processid, input),
			sleep: (key, until) => this.sleep(run, key, until),
			breakpoint: (key, input) => this.breakpoint(run, key, input),
			hook: (key, hookid, input) => this.processhook(run, key, hookid, input),
			halt(reason, payload = null): never {
				throw new processhalt(reason, jsonvalueof(payload, "halt payload"));
			},
			profile: run.profile,
		};
	}

	private plancontext(run: runrecord): processcontext {
		const pending = (request: planentry): Promise<never> =>
			Promise.reject(new planpending([request]));
		return {
			runid: run.id,
			profile: run.profile,
			task: (key, input) => pending({ key, kind: "task", input }),
			parallel: (key, requests, maxconcurrency) =>
				pending({
					key,
					kind: "parallel",
					input: {
						maxconcurrency: maxconcurrency ?? requests.length,
						requests: requests.map((request) => ({
							key: request.key,
							kind: request.kind,
							input: request.input,
						})),
					},
				}),
			subprocess: (key, processid, input) =>
				pending({ key, kind: "subprocess", input: { processid, input } }),
			sleep: (key, until) => pending({ key, kind: "sleep", input: { until } }),
			breakpoint: (key, input) => {
				const record = objectinput(input, "breakpoint input");
				return !modepolicy(run.mode).optionalbreakpoints && record.required !== true
					? Promise.resolve({ approved: true, mode: run.mode })
					: pending({ key, kind: "breakpoint", input });
			},
			hook: (key, hookid, input) =>
				pending({ key, kind: "hook", input: { hookid, input } }),
			halt(reason, payload = null): never {
				throw new processhalt(reason, jsonvalueof(payload, "halt payload"));
			},
		};
	}

	private async block(runid: string, reason: string): Promise<advanceresult> {
		let run = this.store.getrun(runid);
		if (!run) throw new Error(`run ${runid} does not exist`);
		if (run.status !== "blocked") run = this.store.transitionrun(runid, "blocked", null, reason);
		await this.postsafe(runid, "run_blocked", { runid, reason });
		return { status: "blocked", run, reason };
	}

	private async haltclaimed(runid: string, reason: string): Promise<advanceresult> {
		const root = this.store.getrun(runid);
		if (!root) throw new Error(`run ${runid} does not exist`);
		for (const ownedrunid of this.ownedrunids(runid).reverse()) {
			const run = this.store.getrun(ownedrunid);
			if (!run) throw new Error(`run ${ownedrunid} does not exist`);
			if (run.status === "completed" || run.status === "failed" || run.status === "halted") continue;
			this.store.bumpfence(run.id);
			const halted = this.store.transitionrun(run.id, "halted", null, reason);
			await this.postsafe(run.id, "run_halted", {
				runid: halted.id,
				reason,
				payload: null,
			});
		}
		const current = this.store.getrun(runid);
		if (!current) throw new Error(`run ${runid} does not exist`);
		const result = terminalresult(current);
		if (result) return result;
		return { status: "halted", run: current, reason };
	}

	async halt(runid: string, reason: string): Promise<advanceresult> {
		const result = await this.withrootlease(runid, async () => this.haltclaimed(runid, reason));
		const current = this.store.getrun(runid);
		if (!current) throw new Error(`run ${runid} does not exist`);
		result.run = current;
		return result;
	}

	async advance(runid: string): Promise<advanceresult> {
		const result = await this.withrootlease(runid, async () => this.advanceclaimed(runid));
		const current = this.store.getrun(runid);
		if (!current) throw new Error(`run ${runid} does not exist`);
		result.run = current;
		return result;
	}

	private async advanceclaimed(runid: string): Promise<advanceresult> {
		let run = this.store.getrun(runid);
		if (!run) throw new Error(`run ${runid} does not exist`);
		const terminal = terminalresult(run);
		if (terminal) return terminal;
		const process = this.requireprocess(
			run.processid,
			run.processversion,
			run.blueprintname && run.blueprintversion
				? { name: run.blueprintname, version: run.blueprintversion }
				: undefined,
		);
		if (processhash(process) !== run.processhash) return this.block(runid, "process source changed during replay");

		if (run.status === "created") run = this.store.transitionrun(runid, "running");
		if (run.status === "running" && run.turns > run.maxturns) {
			return this.block(runid, `turn budget ${run.maxturns} exhausted`);
		}

		const policy = modepolicy(run.mode);
		try {
			if (policy.execute) {
				await this.dispatchphase(runid, "before_advance", {
					runid,
					status: run.status,
					turns: run.turns,
				});
			}
			const context = policy.execute ? this.context(run) : this.plancontext(run);
			const output = jsonvalueof(await process.run(context, run.input), "process output");
			assertvalid(process.output, output, "process.output");
			const completed = this.store.transitionrun(runid, "completed", output);
			if (policy.execute) await this.postsafe(runid, "run_completed", { runid, output });
			return { status: "completed", run: completed, output };
		} catch (error) {
			if (error instanceof planpending) {
				const plan = { effects: error.requests };
				const completed = this.store.transitionrun(runid, "completed", plan);
				return { status: "completed", run: completed, output: plan };
			}
			if (error instanceof effectpending) {
				const current = this.store.getrun(runid);
				if (!current) throw new Error(`run ${runid} disappeared`);
				const waitstatus = error.effects.some((effect) => effect.kind === "breakpoint")
					? "waiting_for_user"
					: "waiting_effect";
				const waiting = current.status === waitstatus ? current : this.store.transitionrun(runid, waitstatus);
				return { status: "waiting", run: waiting, effects: error.effects };
			}
			if (error instanceof processhalt) {
				const halted = this.store.transitionrun(runid, "halted", error.payload, error.message);
				await this.postsafe(runid, "run_halted", { runid, reason: error.message, payload: error.payload });
				return { status: "halted", run: halted, reason: error.message };
			}
			if (error instanceof processblocked || error instanceof hookdispatcherror) {
				return this.block(runid, error.message);
			}
			const message = error instanceof Error ? error.message : String(error);
			const failed = this.store.transitionrun(runid, "failed", null, message);
			await this.postsafe(runid, "run_failed", { runid, error: message });
			return { status: "failed", run: failed, error: message };
		}
	}

	private ownedrunids(rootrunid: string): string[] {
		const pending = [rootrunid];
		const seen = new Set<string>();
		while (pending.length > 0) {
			const runid = pending.pop();
			if (!runid || seen.has(runid)) continue;
			seen.add(runid);
			for (const effect of this.store.listeffects(runid)) {
				if (effect.kind !== "subprocess") continue;
				const input = objectinput(effect.input, `effect ${effect.key} input`);
				if (typeof input.childrunid === "string") pending.push(input.childrunid);
			}
		}
		return [...seen];
	}

	private ownsrun(rootrunid: string, targetrunid: string): boolean {
		return this.ownedrunids(rootrunid).includes(targetrunid);
	}

	async commiteffect(post: enginepost): Promise<effectcommit> {
		const result = await this.withrootlease(post.rootrunid, async () =>
			this.commiteffectclaimed(post),
		);
		const current = this.store.getrun(post.rootrunid);
		if (!current) throw new Error(`run ${post.rootrunid} does not exist`);
		result.run = current;
		return result;
	}

	private async commiteffectclaimed(post: enginepost): Promise<effectcommit> {
		if (!this.ownsrun(post.rootrunid, post.runid)) {
			throw new Error(`effect run ${post.runid} is not owned by root run ${post.rootrunid}`);
		}
		const previous = this.store.geteffect(post.runid, post.effectid);
		const effect = this.store.posteffect(post);
		const duplicate = previous !== null && previous.status !== "requested";
		if (!duplicate) {
			try {
				await this.dispatchphase(post.runid, "effect_resolved", {
					runid: post.runid,
					effectid: post.effectid,
					status: effect.status,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				const blocked = await this.block(post.rootrunid, message);
				if (blocked.status !== "blocked") throw new Error(message);
				return { status: "blocked", run: blocked.run, effect, reason: blocked.reason };
			}
		}
		const run = this.store.getrun(post.rootrunid);
		if (!run) throw new Error(`run ${post.rootrunid} does not exist`);
		if (run.status === "blocked") {
			return {
				status: "blocked",
				run,
				effect,
				reason: run.blockedreason ?? "run blocked",
			};
		}
		return { status: duplicate ? "duplicate" : "committed", run, effect };
	}

	private async posteffectclaimed(post: enginepost): Promise<advanceresult> {
		const committed = await this.commiteffectclaimed(post);
		if (committed.status === "blocked") {
			return {
				status: "blocked",
				run: committed.run,
				reason: committed.reason ?? "run blocked",
			};
		}
		const result = await this.advanceclaimed(post.rootrunid);
		return result;
	}

	async posteffect(post: enginepost): Promise<advanceresult> {
		const result = await this.withrootlease(post.rootrunid, async () => this.posteffectclaimed(post));
		const current = this.store.getrun(post.rootrunid);
		if (!current) throw new Error(`run ${post.rootrunid} does not exist`);
		result.run = current;
		return result;
	}

	private async resumeclaimed(runid: string, response?: jsonvalue): Promise<advanceresult> {
		const run = this.store.getrun(runid);
		if (!run) throw new Error(`run ${runid} does not exist`);
		const terminal = terminalresult(run);
		if (terminal && terminal.status !== "blocked") return terminal;
		const ownedeffects = this.ownedrunids(runid).flatMap((ownedrunid) =>
			this.store.listeffects(ownedrunid),
		);
		const uncertain = ownedeffects.find((effect) => effect.status === "uncertain");
		if (uncertain) throw new Error("run has an uncertain effect; resolve it explicitly");

		if (run.status === "waiting_for_user") {
			const breakpoints = ownedeffects.filter(
				(effect) => effect.kind === "breakpoint" && effect.status === "requested",
			);
			if (breakpoints.length > 1) throw new Error(`run ${runid} has multiple pending breakpoints`);
			const breakpoint = breakpoints[0];
			if (!breakpoint) throw new Error(`run ${runid} has no pending breakpoint`);
			if (response === undefined) throw new Error(`run ${runid} requires a breakpoint response`);
			return this.posteffectclaimed({
				rootrunid: runid,
				runid: breakpoint.runid,
				effectid: breakpoint.id,
				fence: breakpoint.fence,
				inputhash: breakpoint.inputhash,
				status: "ok",
				value: response,
			});
		}

		if (run.status === "blocked") {
			if (run.blockedreason?.startsWith("turn budget ")) {
				this.store.extendturnbudget(runid, Math.max(1, run.turns + 1 - run.maxturns));
			}
			this.store.transitionrun(runid, "running");
		}
		return this.advanceclaimed(runid);
	}

	async resume(runid: string, response?: jsonvalue): Promise<advanceresult> {
		const result = await this.withrootlease(runid, async () => this.resumeclaimed(runid, response));
		const current = this.store.getrun(runid);
		if (!current) throw new Error(`run ${runid} does not exist`);
		result.run = current;
		return result;
	}

	async resolveuncertain(resolution: engineresolution): Promise<advanceresult> {
		const result = await this.withrootlease(resolution.rootrunid, async () => {
			if (!this.ownsrun(resolution.rootrunid, resolution.runid)) {
				throw new Error(
					`effect run ${resolution.runid} is not owned by root run ${resolution.rootrunid}`,
				);
			}
			const targetrun = this.store.getrun(resolution.runid);
			if (!targetrun) throw new Error(`run ${resolution.runid} does not exist`);
			if (targetrun.fence !== resolution.fence) {
				throw new Error(`stale fence ${resolution.fence}; current fence is ${targetrun.fence}`);
			}
			const effect = this.store.geteffect(resolution.runid, resolution.effectid);
			if (!effect) throw new Error(`effect ${resolution.effectid} does not exist`);
			if (effect.status !== "uncertain") throw new Error(`effect ${effect.id} is not uncertain`);
			if (effect.fence !== resolution.fence) {
				throw new Error(`stale effect fence ${effect.fence}; current fence is ${resolution.fence}`);
			}
			if (effect.inputhash !== resolution.inputhash) {
				throw new Error(`effect ${effect.id} input hash mismatch`);
			}
			const root = this.store.getrun(resolution.rootrunid);
			if (!root) throw new Error(`run ${resolution.rootrunid} does not exist`);
			try {
				await this.dispatchphase(resolution.rootrunid, "recovery", {
					runid: resolution.runid,
					effectid: resolution.effectid,
					decision: resolution.decision,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return this.block(resolution.rootrunid, message);
			}
			if (root.turns >= root.maxturns) {
				this.store.extendturnbudget(
					root.id,
					Math.max(1, root.turns + 1 - root.maxturns),
				);
			}
			const resolved = this.store.resolveuncertain(resolution);
			try {
				await this.dispatchphase(resolution.runid, "effect_resolved", {
					runid: resolution.runid,
					effectid: resolution.effectid,
					status: resolved.status,
				});
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				return this.block(resolution.rootrunid, message);
			}
			return this.advanceclaimed(resolution.rootrunid);
		});
		const current = this.store.getrun(resolution.rootrunid);
		if (!current) throw new Error(`run ${resolution.rootrunid} does not exist`);
		result.run = current;
		return result;
	}
}
