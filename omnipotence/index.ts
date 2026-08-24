import type { TSchema } from "@sinclair/typebox";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { jsonvalueof, parsejson, stablejson } from "./contracts.ts";
import type { jsonvalue, orchestrationmode } from "./contracts.ts";
import { orchestrationengine } from "./engine.ts";
import type { advanceresult } from "./engine.ts";
import { loadactiveblueprints } from "./loader.ts";
import type { loadsummary } from "./loader.ts";
import { profileservice } from "./profiles.ts";
import { orchestrationstore } from "./store.ts";
import type { effectrecord } from "./store.ts";

interface extensioncontext {
	cwd: string;
	hasUI: boolean;
	sessionManager?: {
		getSessionId?(): string;
	};
	ui?: {
		notify?(message: string, type?: string): void;
	};
}

interface sessionstopevent {
	type: "session_stop";
	stop_hook_active: boolean;
}

interface sessionstopresult {
	decision: "block";
	reason: string;
}

interface resultparams {
	rootrunid: string;
	runid: string;
	effectid: string;
	fence: number;
	inputhash: string;
	status: "ok" | "error" | "uncertain" | "cancelled";
	value: jsonvalue;
	error: jsonvalue;
}

const stateentry = "nikos-agent-stack.omnipotence.state";
const effectmessage = "nikos-agent-stack.omnipotence.effect";
const maximumtimerdelay = 2_147_483_647;

export function nextsleepdelay(deadline: number, current = Date.now()): number {
	return Math.min(maximumtimerdelay, Math.max(0, deadline - current));
}
const resultparameters: TSchema = {
	type: "object",
	additionalProperties: false,
	required: ["rootrunid", "runid", "effectid", "fence", "inputhash", "status"],
	properties: {
		rootrunid: { type: "string" },
		runid: { type: "string" },
		effectid: { type: "string" },
		fence: { type: "integer", minimum: 1 },
		inputhash: { type: "string", pattern: "^[a-f0-9]{64}$" },
		status: { type: "string", enum: ["ok", "error", "uncertain", "cancelled"] },
		value: {},
		error: {},
	},
};

function recordvalue(value: unknown, path: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError(`${path}: expected object`);
	return value as Record<string, unknown>;
}

function stringfield(record: Record<string, unknown>, field: string, path: string): string {
	const value = record[field];
	if (typeof value !== "string") throw new TypeError(`${path}.${field}: expected string`);
	return value;
}

function resultinput(value: unknown): resultparams {
	const record = recordvalue(value, "omnipotence result");
	const fence = record.fence;
	if (typeof fence !== "number" || !Number.isInteger(fence) || fence < 1) {
		throw new TypeError("omnipotence result.fence: expected positive integer");
	}
	const status = stringfield(record, "status", "omnipotence result");
	if (status !== "ok" && status !== "error" && status !== "uncertain" && status !== "cancelled") {
		throw new TypeError("omnipotence result.status: unsupported status");
	}
	return {
		rootrunid: stringfield(record, "rootrunid", "omnipotence result"),
		runid: stringfield(record, "runid", "omnipotence result"),
		effectid: stringfield(record, "effectid", "omnipotence result"),
		fence,
		inputhash: stringfield(record, "inputhash", "omnipotence result"),
		status,
		value: record.value === undefined ? null : jsonvalueof(record.value, "omnipotence result.value"),
		error: record.error === undefined ? null : jsonvalueof(record.error, "omnipotence result.error"),
	};
}

function sessionid(context: extensioncontext): string {
	const id = context.sessionManager?.getSessionId?.();
	if (!id) throw new Error("omnipotence requires an omp session id");
	return id;
}

function commandinput(args: unknown, command: string): { processid: string; input: jsonvalue } {
	const text = String(args ?? "").trim();
	const separator = text.search(/\s/u);
	const processid = separator < 0 ? text : text.slice(0, separator);
	if (!processid) throw new Error(`usage: /${command} <process-id> [json-input]`);
	const json = separator < 0 ? "{}" : text.slice(separator).trim() || "{}";
	return { processid, input: parsejson(json, "omnipotence input") };
}

function terminal(result: advanceresult): boolean {
	return result.status === "completed" || result.status === "failed" || result.status === "halted";
}

function pendingmessage(rootrunid: string, effects: effectrecord[], profile: jsonvalue): string {
	return [
		`active omnipotence run: ${rootrunid}`,
		`effective profile: ${stablejson(profile)}`,
		"perform each committed effect below with normal omp tools and approvals.",
		"after each effect, call omnipotence_result with its exact run id, effect id, fence, status, and result.",
		stablejson(
			effects.map((effect) => ({
				runid: effect.runid,
				effectid: effect.id,
				fence: effect.fence,
				inputhash: effect.inputhash,
				key: effect.key,
				kind: effect.kind,
				input: effect.input,
			})),
		),
	].join("\n");
}

export default function omnipotence(pi: ExtensionAPI): void {
	const dbpath = resolve(
		process.env.OMNIPOTENCE_DB ?? join(homedir(), ".omp", "nikos-agent-stack", "omnipotence.sqlite"),
	);
	const store = new orchestrationstore(dbpath);
	const engine = new orchestrationengine(store);
	const profiles = new profileservice(store);
	let loaded: Promise<loadsummary> | undefined;
	const ensureloaded = (): Promise<loadsummary> =>
		(loaded ??= loadactiveblueprints(store, engine));
	let closed = false;
	const sleeptimers = new Map<string, Timer>();

	const appendstate = (result: advanceresult): void => {
		pi.appendEntry(stateentry, {
			runid: result.run.id,
			status: result.status,
			runstatus: result.run.status,
		});
	};

	async function schedulesleep(rootrunid: string, effect: effectrecord): Promise<boolean> {
		if (sleeptimers.has(effect.id)) return false;
		if (!effect.input || typeof effect.input !== "object" || Array.isArray(effect.input)) {
			throw new Error(`sleep effect ${effect.id} has invalid input`);
		}
		const until = effect.input.until;
		if (typeof until !== "string" || !Number.isFinite(Date.parse(until))) {
			throw new Error(`sleep effect ${effect.id} has invalid deadline`);
		}
		if (effect.dispatchedat === null && effect.dispatchingat === null) {
			store.markeffectdispatching(effect.runid, effect.id, effect.fence);
		}
		const deadline = Date.parse(until);
		const finish = async (): Promise<void> => {
			try {
				const result = await engine.posteffect({
					rootrunid,
					runid: effect.runid,
					effectid: effect.id,
					fence: effect.fence,
					inputhash: effect.inputhash,
					status: "ok",
					value: null,
				});
				await schedule(result);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				const run = store.getrun(rootrunid);
				if (run && run.status !== "completed" && run.status !== "failed" && run.status !== "halted") {
					const blocked = store.transitionrun(rootrunid, "blocked", null, message);
					pi.appendEntry(stateentry, { runid: blocked.id, status: blocked.status });
				}
			}
		};
		const arm = (): void => {
			const timer = setTimeout(async () => {
				sleeptimers.delete(effect.id);
				if (closed) return;
				if (Date.now() < deadline) {
					arm();
					return;
				}
				await finish();
			}, nextsleepdelay(deadline));
			timer.unref?.();
			sleeptimers.set(effect.id, timer);
		};
		arm();
		store.markeffectdispatched(effect.runid, effect.id, effect.fence);
		return true;
	}

	async function schedule(result: advanceresult): Promise<boolean> {
		if (result.status !== "waiting") {
			appendstate(result);
			return false;
		}
		let scheduled = false;
		const requested = result.effects.filter((effect) => effect.status === "requested");
		for (const effect of requested.filter((entry) => entry.kind === "sleep")) {
			scheduled = (await schedulesleep(result.run.id, effect)) || scheduled;
		}
		const external = requested.filter(
			(effect) =>
				effect.kind !== "sleep" &&
				effect.kind !== "breakpoint" &&
				effect.dispatchedat === null &&
				effect.dispatchingat === null,
		);
		if (external.length > 0) {
			const marked: effectrecord[] = [];
			const blockdispatch = (reason: string): void => {
				let run = store.getrun(result.run.id);
				if (run && run.status !== "blocked") {
					run = store.transitionrun(run.id, "blocked", null, reason);
				}
				if (run) appendstate({ status: "blocked", run, reason: run.blockedreason ?? reason });
			};
			try {
				for (const effect of external) {
					marked.push(store.markeffectdispatching(effect.runid, effect.id, effect.fence));
				}
			} catch (error) {
				for (const effect of marked) {
					store.reverteffectdispatch(effect.runid, effect.id, effect.fence);
				}
				const message = error instanceof Error ? error.message : String(error);
				blockdispatch(`hidden-turn dispatch intent failed: ${message}`);
				throw error;
			}
			try {
				pi.sendMessage(
					{
						customType: effectmessage,
						content: pendingmessage(result.run.id, marked, result.run.profile),
						display: false,
						details: { runid: result.run.id, effectids: marked.map((effect) => effect.id) },
					},
					{ deliverAs: "nextTurn", triggerTurn: true },
				);
			} catch (error) {
				for (const effect of marked) {
					store.reverteffectdispatch(effect.runid, effect.id, effect.fence);
				}
				const message = error instanceof Error ? error.message : String(error);
				blockdispatch(`hidden-turn scheduling failed: ${message}`);
				throw error;
			}
			try {
				for (const effect of marked) {
					store.markeffectdispatched(effect.runid, effect.id, effect.fence);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				blockdispatch(`hidden-turn dispatch acknowledgement failed: ${message}`);
				throw error;
			}
			scheduled = true;
		}
		appendstate(result);
		return scheduled;
	}

	const notify = (context: extensioncontext, value: unknown): void => {
		context.ui?.notify?.(stablejson(jsonvalueof(value)), "info");
	};

	const startcommand = (command: string, mode: orchestrationmode) => async (args: unknown, context: extensioncontext) => {
		await ensureloaded();
		const request = commandinput(args, command);
		const process = engine.resolveprocess(request.processid);
		const profile = profiles.snapshot(
			context.cwd,
			process.profiledefaults ?? { schema: 1 },
			{ schema: 1 },
		);
		const result = await engine.start({
			processid: request.processid,
			processversion: process.version,
			blueprintname: process.blueprint?.name,
			blueprintversion: process.blueprint?.version,
			sessionid: sessionid(context),
			mode,
			input: request.input,
			profile: profile.effective,
			userprofileversion: profile.userprofileversion,
			projectprofileversion: profile.projectprofileversion,
		});
		await schedule(result);
		notify(context, result);
	};

	pi.registerCommand("omnipotence", {
		description: "start one native orchestration run",
		handler: startcommand("omnipotence", "babysit"),
	});
	for (const mode of ["plan", "yolo", "forever"] as const) {
		const command = `omnipotence-${mode}`;
		pi.registerCommand(command, {
			description: `start one native ${mode} run`,
			handler: startcommand(command, mode),
		});
	}
	pi.registerCommand("omnipotence-resume", {
		description: "resume the active native orchestration run",
		async handler(args: unknown, context: extensioncontext) {
			await ensureloaded();
			const run = store.getsessionrun(sessionid(context));
			if (!run) throw new Error("this session has no active omnipotence run");
			const text = String(args ?? "").trim();
			const result = await engine.resume(run.id, text ? parsejson(text, "resume input") : undefined);
			await schedule(result);
			notify(context, result);
		},
	});
	pi.registerCommand("omnipotence-status", {
		description: "show the active native orchestration run",
		async handler(_args: unknown, context: extensioncontext) {
			notify(context, store.getsessionrun(sessionid(context)) ?? { status: "inactive" });
		},
	});
	pi.registerCommand("omnipotence-stop", {
		description: "halt the active native orchestration run",
		async handler(args: unknown, context: extensioncontext) {
			const run = store.getsessionrun(sessionid(context));
			if (!run) throw new Error("this session has no active omnipotence run");
			const reason = String(args ?? "").trim() || "halted by user";
			const halted = await engine.halt(run.id, reason);
			pi.appendEntry(stateentry, { runid: halted.run.id, status: halted.run.status });
			notify(context, halted.run);
		},
	});

	pi.registerTool({
		name: "omnipotence_result",
		label: "omnipotence result",
		description: "post one committed effect result to the active native orchestration run",
		parameters: resultparameters,
		async execute(_callid, params, _signal, _onupdate, context) {
			await ensureloaded();
			const post = resultinput(params);
			const run = store.getsessionrun(sessionid(context));
			if (!run) throw new Error("this session has no active omnipotence run");
			if (run.id !== post.rootrunid) {
				throw new Error(`omnipotence result root run ${post.rootrunid} does not match this session's active run ${run.id}`);
			}
			const result = await engine.commiteffect(post);
			pi.appendEntry(stateentry, {
				runid: result.run.id,
				status: `effect_${result.status}`,
				runstatus: result.run.status,
			});
			return {
				content: [{ type: "text", text: stablejson(jsonvalueof(result)) }],
				details: result,
			};
		},
	});

	pi.on("session_stop", async (event: sessionstopevent, context: extensioncontext): Promise<sessionstopresult | void> => {
		const run = store.getsessionrun(sessionid(context));
		if (!run) return;
		await ensureloaded();
		const result = await engine.advance(run.id);
		if (terminal(result)) {
			appendstate(result);
			return;
		}
		if (result.status === "blocked") {
			appendstate(result);
			if (event.stop_hook_active) return;
			return { decision: "block", reason: result.reason };
		}
		if (result.run.status === "waiting_for_user") {
			appendstate(result);
			return;
		}
		const dispatching = result.effects.find(
			(effect) =>
				effect.status === "requested" &&
				effect.kind !== "sleep" &&
				effect.kind !== "breakpoint" &&
				effect.dispatchingat !== null &&
				effect.dispatchedat === null,
		);
		if (dispatching) {
			if (event.stop_hook_active) return;
			return {
				decision: "block",
				reason: `active omnipotence run ${result.run.id} has unknown scheduling outcome for effect ${dispatching.id}`,
			};
		}
		if (await schedule(result)) return;
		if (event.stop_hook_active) return;
		const missing = result.effects.find(
			(effect) =>
				effect.status === "requested" &&
				effect.kind !== "sleep" &&
				effect.kind !== "breakpoint",
		);
		if (!missing) return;
		return {
			decision: "block",
			reason: `active omnipotence run ${result.run.id} still needs result for effect ${missing.id}`,
		};
	});

	const recover = async (_event: unknown, context: extensioncontext): Promise<void> => {
		const run = store.getsessionrun(sessionid(context));
		if (!run) return;
		await ensureloaded();
		const result = await engine.advance(run.id);
		if (result.status !== "waiting") return;
		for (const effect of result.effects) {
			if (effect.status !== "requested") continue;
			if (effect.kind === "sleep") {
				await schedulesleep(run.id, effect);
				continue;
			}
			if (effect.kind === "breakpoint") continue;
			if (effect.dispatchingat !== null && effect.dispatchedat === null) {
				const reason = `hidden-turn scheduling outcome is unknown for effect ${effect.id}`;
				await engine.commiteffect({
					rootrunid: run.id,
					runid: effect.runid,
					effectid: effect.id,
					fence: effect.fence,
					inputhash: effect.inputhash,
					status: "uncertain",
					error: { message: reason },
				});
				const current = store.getrun(run.id);
				const blocked =
					current?.status === "blocked"
						? current
						: store.transitionrun(run.id, "blocked", null, reason);
				pi.appendEntry(stateentry, { runid: blocked.id, status: blocked.status });
				continue;
			}
			if (effect.dispatchedat === null) continue;
			await engine.posteffect({
				rootrunid: run.id,
				runid: effect.runid,
				effectid: effect.id,
				fence: effect.fence,
				inputhash: effect.inputhash,
				status: "uncertain",
				error: { message: "session restarted after effect dispatch" },
			});
		}
		const recovered = store.getrun(run.id);
		if (recovered) pi.appendEntry(stateentry, { runid: recovered.id, status: recovered.status });
	};
	pi.on("session_start", recover);
	pi.on("session_switch", recover);
	pi.on("session_branch", recover);
	pi.on("session_shutdown", () => {
		if (closed) return;
		closed = true;
		for (const timer of sleeptimers.values()) clearTimeout(timer);
		sleeptimers.clear();
		store.close();
	});
}
