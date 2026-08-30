import type { TSchema } from "@sinclair/typebox";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { homedir } from "node:os";
import { basename, join, resolve } from "node:path";
import { jsonvalueof, objectrecord, parsejson, stablejson, stringfield } from "./contracts.ts";
import type { jsonvalue, orchestrationmode } from "./contracts.ts";
import { orchestrationengine } from "./engine.ts";
import type { advanceresult } from "./engine.ts";
import { factoryflags, factoryprocessid, factoryrequestfor } from "./factory.ts";
import { loadactiveblueprints } from "./loader.ts";
import type { loadsummary } from "./loader.ts";
import { profileservice } from "./profiles.ts";
import { runlabel, runsentence } from "./status.ts";
import { orchestrationstore } from "./store.ts";
import type { effectrecord, runrecord } from "./store.ts";
import { installOmnipotenceStop, resetOmnipotenceStop } from "./stop-decision.ts";

export { omnipotenceStop } from "./stop-decision.ts";
export { factoryflags, factoryrequestfor } from "./factory.ts";
export { runsentence } from "./status.ts";

interface extensioncontext {
	cwd: string;
	hasUI: boolean;
	sessionManager?: {
		getSessionId?(): string;
	};
	ui?: {
		notify?(message: string, type?: string): void;
		setStatus?(key: string, text: string): void;
	};
}

interface sessionstopevent {
	stop_hook_active: boolean;
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
const sleepleaseretrydelay = 25;

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

function resultinput(value: unknown): resultparams {
	const record = objectrecord<unknown>(value, "omnipotence result");
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

// ponytail: a raw newline is never significant inside valid json, so collapsing the
// line breaks a wrapped terminal paste introduces can only rescue input, never change meaning.
function commandjson(text: string, path: string): jsonvalue {
	return parsejson(text.replace(/[\r\n]+/gu, " "), path);
}

function commandinput(args: unknown, command: string): { processid: string; input: jsonvalue } {
	const text = String(args ?? "").trim();
	const separator = text.search(/\s/u);
	const processid = separator < 0 ? text : text.slice(0, separator);
	if (!processid) throw new Error(`usage: /${command} <process-id> [json-input]`);
	const json = separator < 0 ? "{}" : text.slice(separator).trim() || "{}";
	return { processid, input: commandjson(json, "omnipotence input") };
}

function terminalstatus(status: string | undefined): boolean {
	return status === "completed" || status === "failed" || status === "halted";
}

// a real type guard, not an alias: `effects` lives only on the waiting arm of advanceresult,
// so every reader of result.effects has to pass through this to be honest about the union.
function waiting(result: advanceresult): result is advanceresult & { status: "waiting" } {
	return result.status === "waiting";
}

// sleep and breakpoint are the two kinds the extension itself resolves. everything else is
// "external": a human or the model has to perform it and post a result back.
function iscontrol(effect: effectrecord): boolean {
	return effect.kind === "sleep" || effect.kind === "breakpoint";
}

function isundispatched(effect: effectrecord): boolean {
	return effect.dispatchingat === null && effect.dispatchedat === null;
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
	const ensureloaded = (): Promise<loadsummary> => (loaded ??= loadactiveblueprints(store, engine));
	let closed = false;
	const sleeptimers = new Map<string, { timer: Timer; fence: number }>();

	const appendstate = (result: advanceresult): void => {
		pi.appendEntry(stateentry, {
			runid: result.run.id,
			status: result.status,
			runstatus: result.run.status,
		});
	};
	const stale = (result: advanceresult): boolean =>
		closed || (!terminalstatus(result.status) && terminalstatus(store.getrun(result.run.id)?.status));
	// the one question every dispatch retry path asks: is this effect still worth acting on?
	const effectstillpending = (rootrunid: string, effect: effectrecord): boolean => {
		const current = store.geteffect(effect.runid, effect.id);
		const root = store.getrun(rootrunid);
		return current?.status === "requested" && root !== null && !terminalstatus(root.status);
	};
	const blockrun = (runid: string, reason: string) => {
		let run = store.getrun(runid);
		if (!run || terminalstatus(run.status)) return null;
		if (run.status !== "blocked") {
			try {
				run = store.transitionrun(run.id, "blocked", null, reason);
			} catch (error) {
				const current = store.getrun(runid);
				if (!current || terminalstatus(current.status)) return null;
				throw error;
			}
		}
		return run;
	};

	async function schedulesleep(rootrunid: string, effect: effectrecord): Promise<boolean> {
		const existing = sleeptimers.get(effect.id);
		if (closed || existing?.fence === effect.fence) return false;
		if (existing) clearTimeout(existing.timer);
		if (!effect.input || typeof effect.input !== "object" || Array.isArray(effect.input)) {
			throw new Error(`sleep effect ${effect.id} has invalid input`);
		}
		const until = effect.input.until;
		if (typeof until !== "string" || !Number.isFinite(Date.parse(until))) {
			throw new Error(`sleep effect ${effect.id} has invalid deadline`);
		}
		let claimed = false;
		if (isundispatched(effect)) {
			try {
				const claim = store.claimeffectdispatching(effect.runid, effect.id, effect.fence);
				if (!claim.claimed) return false;
				claimed = true;
			} catch (error) {
				if (!effectstillpending(rootrunid, effect)) return false;
				throw error;
			}
		}
		const deadline = Date.parse(until);
		const arm = (delay = nextsleepdelay(deadline)): void => {
			const timer = setTimeout(async () => {
				const current = sleeptimers.get(effect.id);
				if (!current || current.fence !== effect.fence || current.timer !== timer) return;
				sleeptimers.delete(effect.id);
				if (closed) return;
				if (Date.now() < deadline) {
					arm();
					return;
				}
				await finish();
			}, delay);
			timer.unref?.();
			sleeptimers.set(effect.id, { timer, fence: effect.fence });
		};
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
				if (closed) return;
				await schedule(result);
				if (closed) return;
			} catch (error) {
				if (closed) return;
				const message = error instanceof Error ? error.message : String(error);
				if (/stale .*fence/.test(message)) {
					const current = store.geteffect(effect.runid, effect.id);
					if (current?.fence !== effect.fence) return;
				}
				if (message === `run ${rootrunid} is leased by another engine`) {
					const current = store.geteffect(effect.runid, effect.id);
					if (current?.fence !== effect.fence) return;
					arm(sleepleaseretrydelay);
					return;
				}
				const blocked = blockrun(rootrunid, message);
				if (blocked) {
					pi.appendEntry(stateentry, { runid: blocked.id, status: blocked.status });
				}
			}
		};
		arm();
		if (claimed) store.markeffectdispatched(effect.runid, effect.id, effect.fence);
		return true;
	}

	async function schedule(result: advanceresult): Promise<boolean> {
		if (closed) return false;
		if (result.status !== "waiting") {
			appendstate(result);
			return false;
		}
		let scheduled = false;
		const requested = result.effects.filter((effect) => effect.status === "requested");
		for (const effect of requested.filter((entry) => entry.kind === "sleep")) {
			if (closed) return scheduled;
			const sleepscheduled = await schedulesleep(result.run.id, effect);
			if (closed) return scheduled;
			scheduled = sleepscheduled || scheduled;
		}
		const external = requested.filter((effect) => !iscontrol(effect) && isundispatched(effect));
		if (external.length > 0) {
			const claimed: effectrecord[] = [];
			const blockdispatch = (reason: string): boolean => {
				const run = blockrun(result.run.id, reason);
				if (!run) return false;
				appendstate({ status: "blocked", run, reason: run.blockedreason ?? reason });
				return true;
			};
			const revertclaims = (): void => {
				for (const effect of claimed) {
					if (!effectstillpending(result.run.id, effect)) continue;
					store.reverteffectdispatch(effect.runid, effect.id, effect.fence);
				}
			};
			for (const effect of external) {
				if (closed) return scheduled;
				try {
					const claim = store.claimeffectdispatching(effect.runid, effect.id, effect.fence);
					if (claim.claimed) claimed.push(claim.effect);
				} catch (error) {
					if (!effectstillpending(result.run.id, effect)) continue;
					revertclaims();
					const message = error instanceof Error ? error.message : String(error);
					if (!blockdispatch(`hidden-turn dispatch intent failed: ${message}`)) return scheduled;
					throw error;
				}
			}
			if (claimed.length > 0) {
				try {
					pi.sendMessage(
						{
							customType: effectmessage,
							content: pendingmessage(result.run.id, claimed, result.run.profile),
							display: false,
							details: { runid: result.run.id, effectids: claimed.map((effect) => effect.id) },
						},
						{ deliverAs: "nextTurn", triggerTurn: true },
					);
				} catch (error) {
					revertclaims();
					const message = error instanceof Error ? error.message : String(error);
					if (blockdispatch(`hidden-turn scheduling failed: ${message}`)) throw error;
					return scheduled;
				}
				try {
					for (const effect of claimed) {
						store.markeffectdispatched(effect.runid, effect.id, effect.fence);
					}
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					if (blockdispatch(`hidden-turn dispatch acknowledgement failed: ${message}`)) throw error;
					return scheduled;
				}
				scheduled = true;
			}
		}
		if (closed) return scheduled;
		appendstate(result);
		return scheduled;
	}

	const showstatus = (
		context: extensioncontext,
		run: runrecord | null,
		effects?: readonly effectrecord[],
	): void => {
		try {
			context.ui?.setStatus?.("omnipotence", run ? `𓂀 ${runsentence(run, effects)}` : "𓂀");
		} catch {}
	};
	const say = (context: extensioncontext, text: string): void => {
		context.ui?.notify?.(text, "info");
	};
	const announce = (
		context: extensioncontext,
		run: runrecord | null,
		effects?: readonly effectrecord[],
		prefix?: string,
	): void => {
		showstatus(context, run, effects);
		if (!run) {
			say(context, "no active omnipotence run");
			return;
		}
		const sentence = runsentence(run, effects);
		say(context, prefix ? `${prefix} — ${sentence}` : sentence);
	};

	const startcommand =
		(command: string, mode: orchestrationmode) => async (args: unknown, context: extensioncontext) => {
			await ensureloaded();
			const request = commandinput(args, command);
			const process = engine.resolveprocess(request.processid);
			const profile = profiles.snapshot(context.cwd, process.profiledefaults ?? { schema: 1 }, { schema: 1 });
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
			if (!stale(result)) announce(context, result.run, waiting(result) ? result.effects : undefined);
		};

	pi.registerCommand("omnipotence", {
		description: "start one native orchestration run",
		handler: startcommand("omnipotence", "babysit"),
	});
	for (const mode of ["plan", "yolo"] as const) {
		const command = `omnipotence-${mode}`;
		pi.registerCommand(command, {
			description: `start one native ${mode} run`,
			handler: startcommand(command, mode),
		});
	}
	pi.registerCommand("omnipotence-forever", {
		description: "start one unbounded native orchestration run",
		handler: startcommand("omnipotence-forever", "forever"),
	});
	pi.registerCommand("factory", {
		description: "start or continue the factory workflow for a project",
		async handler(args: unknown, context: extensioncontext) {
			await ensureloaded();
			const { preview, fresh, target } = factoryflags(args);
			const request = factoryrequestfor(context.cwd, target);
			if (!request) {
				say(context, "nothing to resume here and no plan file found. say what to build: /factory <your idea>");
				return;
			}
			const existing = fresh ? null : store.getprojectrun(request.projectroot);
			if (existing && existing.status === "blocked") {
				say(
					context,
					`${runlabel(existing)} is stuck: ${existing.blockedreason ?? "blocked"}. run /factory --fresh to start a new run and retire it.`,
				);
				showstatus(context, existing);
				return;
			}
			if (existing) {
				if (existing.sessionid !== sessionid(context)) store.bindsession(sessionid(context), existing.id, true);
				const resumed = await engine.resume(existing.id);
				await schedule(resumed);
				if (!stale(resumed)) announce(context, resumed.run, waiting(resumed) ? resumed.effects : undefined, "continuing");
				return;
			}
			const process = engine.resolveprocess(factoryprocessid);
			const profile = profiles.snapshot(context.cwd, process.profiledefaults ?? { schema: 1 }, { schema: 1 });
			const entry: Record<string, string> = { kind: request.entry.kind };
			if (request.entry.value !== undefined) entry.value = request.entry.value;
			const result = await engine.start({
				processid: factoryprocessid,
				processversion: process.version,
				blueprintname: process.blueprint?.name,
				blueprintversion: process.blueprint?.version,
				sessionid: sessionid(context),
				mode: preview ? "plan" : "babysit",
				input: jsonvalueof({ projectRoot: request.projectroot, entry }, "factory input"),
				profile: profile.effective,
				userprofileversion: profile.userprofileversion,
				projectprofileversion: profile.projectprofileversion,
			});
			await schedule(result);
			const opened = `${request.entry.kind} · ${basename(request.projectroot)}`;
			if (!stale(result)) announce(context, result.run, waiting(result) ? result.effects : undefined, opened);
		},
	});
	pi.registerCommand("omnipotence-resume", {
		description: "resume the active native orchestration run",
		async handler(args: unknown, context: extensioncontext) {
			await ensureloaded();
			const run = store.getsessionrun(sessionid(context));
			if (!run) throw new Error("this session has no active omnipotence run");
			const text = String(args ?? "").trim();
			const result = await engine.resume(run.id, text ? commandjson(text, "resume input") : undefined);
			await schedule(result);
			if (!stale(result)) announce(context, result.run, waiting(result) ? result.effects : undefined);
		},
	});
	pi.registerCommand("omnipotence-status", {
		description: "show the active native orchestration run",
		async handler(_args: unknown, context: extensioncontext) {
			announce(context, store.getsessionrun(sessionid(context)));
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
			announce(context, halted.run);
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
				throw new Error(
					`omnipotence result root run ${post.rootrunid} does not match this session's active run ${run.id}`,
				);
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

	installOmnipotenceStop(async (_event: unknown, _context: unknown) => {
		const event = _event as sessionstopevent;
		const context = _context as extensioncontext;
		const run = store.getsessionrun(sessionid(context));
		if (!run) return;
		await ensureloaded();
		const result = await engine.advance(run.id);
		if (terminalstatus(result.status)) {
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
		// terminal and blocked already returned, so this only narrows the union for the reads below.
		if (!waiting(result)) return;
		const dispatching = result.effects.find(
			(effect) =>
				effect.status === "requested" &&
				!iscontrol(effect) &&
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
		if (stale(result)) return;
		if (event.stop_hook_active) return;
		const missing = result.effects.find((effect) => effect.status === "requested" && !iscontrol(effect));
		if (!missing) return;
		return {
			decision: "block",
			reason: `active omnipotence run ${result.run.id} still needs result for effect ${missing.id}`,
		};
	});

	const recover = async (_event: unknown, context: extensioncontext): Promise<void> => {
		const run = store.getsessionrun(sessionid(context));
		showstatus(context, run);
		if (!run) return;
		await ensureloaded();
		let result: advanceresult;
		try {
			result = await engine.advance(run.id);
		} catch (error) {
			if (error instanceof Error && error.message === `run ${run.id} is leased by another engine`) return;
			throw error;
		}
		if (result.status !== "waiting") return;
		let unsafe = false;
		for (const effect of result.effects) {
			if (effect.status !== "requested") continue;
			if (effect.kind === "sleep") {
				await schedulesleep(run.id, effect);
				continue;
			}
			if (effect.kind === "breakpoint") continue;
			if (effect.dispatchingat !== null && effect.dispatchedat === null) {
				unsafe = true;
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
				const blocked = current?.status === "blocked" ? current : store.transitionrun(run.id, "blocked", null, reason);
				pi.appendEntry(stateentry, { runid: blocked.id, status: blocked.status });
				continue;
			}
			if (effect.dispatchedat === null) continue;
			unsafe = true;
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
		if (!unsafe && recovered && recovered.status !== "blocked" && !terminalstatus(recovered.status)) {
			await schedule(result);
		}
		if (recovered) pi.appendEntry(stateentry, { runid: recovered.id, status: recovered.status });
	};
	pi.on("session_start", recover);
	pi.on("session_switch", recover);
	pi.on("session_branch", recover);
	pi.on("session_shutdown", () => {
		if (closed) return;
		closed = true;
		for (const entry of sleeptimers.values()) clearTimeout(entry.timer);
		sleeptimers.clear();
		store.close();
		resetOmnipotenceStop();
	});
}
