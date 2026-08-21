import { assertprocessid, assertversion, jsonvalueof } from "./contracts.ts";
import type { jsonvalue, processblueprint } from "./contracts.ts";

export type hookphase =
	| "run_start"
	| "before_advance"
	| "effect_requested"
	| "effect_resolved"
	| "run_blocked"
	| "run_completed"
	| "run_failed"
	| "run_halted"
	| "recovery";

export interface hookdefinition {
	id: string;
	version: string;
	phase: hookphase;
	priority: number;
	timeoutms: number;
	blueprint?: processblueprint;
	active: boolean;
	run(input: jsonvalue, signal: AbortSignal): Promise<unknown>;
}

export interface hookinput {
	id: string;
	version: string;
	phase: hookphase;
	priority?: number;
	timeoutms: number;
	blueprint?: processblueprint;
	active?: boolean;
	run(input: jsonvalue, signal: AbortSignal): Promise<unknown>;
}

export interface hookresult {
	hookid: string;
	version: string;
	phase: hookphase;
	output: jsonvalue;
	durationms: number;
}

export interface hookselector {
	version?: string;
	blueprintname?: string;
	blueprintversion?: string;
}

const phases: Record<hookphase, true> = {
	run_start: true,
	before_advance: true,
	effect_requested: true,
	effect_resolved: true,
	run_blocked: true,
	run_completed: true,
	run_failed: true,
	run_halted: true,
	recovery: true,
};

class hooktimeout extends Error {}

export class hookdispatcherror extends Error {
	readonly hookid: string;
	readonly phase: hookphase;

	constructor(hookid: string, phase: hookphase, message: string) {
		super(message);
		this.name = "hookdispatcherror";
		this.hookid = hookid;
		this.phase = phase;
	}
}

function hookkey(hook: Readonly<hookdefinition>): string {
	return `${hook.id}@${hook.version}@${hook.blueprint?.name ?? ""}@${hook.blueprint?.version ?? ""}`;
}

export function definehook(input: hookinput): Readonly<hookdefinition> {
	assertprocessid(input.id);
	assertversion(input.version, "hook.version");
	if (!Object.hasOwn(phases, input.phase)) throw new TypeError(`hook.phase: unsupported phase ${input.phase}`);
	if (input.blueprint) {
		assertprocessid(input.blueprint.name);
		assertversion(input.blueprint.version, "hook.blueprint.version");
	}
	const priority = input.priority ?? 100;
	if (!Number.isInteger(priority) || priority < -10_000 || priority > 10_000) {
		throw new TypeError("hook.priority: expected integer from -10000 to 10000");
	}
	if (!Number.isInteger(input.timeoutms) || input.timeoutms < 1 || input.timeoutms > 60_000) {
		throw new TypeError("hook.timeoutms: expected integer from 1 to 60000");
	}
	if (typeof input.run !== "function") throw new TypeError("hook.run: expected function");
	return Object.freeze({ ...input, priority, active: input.active ?? true });
}

export class hookregistry {
	private readonly hooks = new Map<string, Readonly<hookdefinition>>();

	register(hook: Readonly<hookdefinition>): void {
		const key = hookkey(hook);
		if (this.hooks.has(key)) throw new Error(`hook ${hook.id} is already registered`);
		this.hooks.set(key, hook);
	}

	list(phase?: hookphase): Readonly<hookdefinition>[] {
		return [...this.hooks.values()]
			.filter((hook) => hook.active && (phase === undefined || hook.phase === phase))
			.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
	}

	resolve(hookid: string, selector: hookselector = {}): Readonly<hookdefinition> {
		const candidates = [...this.hooks.values()]
			.filter((hook) => hook.id === hookid)
			.filter((hook) => selector.version === undefined || hook.version === selector.version)
			.filter(
				(hook) =>
					selector.blueprintname === undefined ||
					(hook.blueprint?.name === selector.blueprintname &&
						hook.blueprint.version === selector.blueprintversion),
			)
			.filter((hook) => selector.blueprintname !== undefined || hook.active)
			.sort((left, right) =>
				right.version.localeCompare(left.version, undefined, { numeric: true }),
			);
		const hook = candidates[0];
		if (!hook) throw new Error(`hook ${hookid} is not registered`);
		return hook;
	}

	listfor(phase: hookphase, blueprint?: processblueprint): Readonly<hookdefinition>[] {
		return [...this.hooks.values()]
			.filter((hook) => hook.phase === phase)
			.filter((hook) => {
				if (!hook.blueprint) return hook.active;
				if (blueprint && hook.blueprint.name === blueprint.name) {
					return hook.blueprint.version === blueprint.version;
				}
				return hook.active;
			})
			.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));
	}

	async dispatchfor(
		phase: hookphase,
		input: jsonvalue,
		blueprint?: processblueprint,
	): Promise<hookresult[]> {
		if (!Object.hasOwn(phases, phase)) throw new TypeError(`hook.phase: unsupported phase ${phase}`);
		return this.execute(this.listfor(phase, blueprint), input);
	}

	async dispatch(phase: hookphase, input: jsonvalue): Promise<hookresult[]> {
		if (!Object.hasOwn(phases, phase)) throw new TypeError(`hook.phase: unsupported phase ${phase}`);
		return this.execute(this.list(phase), input);
	}

	async dispatchone(
		hookid: string,
		input: jsonvalue,
		selector: hookselector = {},
	): Promise<hookresult> {
		const hook = this.resolve(hookid, selector);
		const [result] = await this.execute([hook], input);
		if (!result) throw new Error(`hook ${hookid} returned no result`);
		return result;
	}

	private async execute(hooks: readonly Readonly<hookdefinition>[], input: jsonvalue): Promise<hookresult[]> {
		const payload = jsonvalueof(input, "hook input");
		const results: hookresult[] = [];
		for (const hook of hooks) {
			const controller = new AbortController();
			const timeoutstate = Promise.withResolvers<never>();
			const timeout = setTimeout(() => {
				timeoutstate.reject(new hooktimeout());
				controller.abort();
			}, hook.timeoutms);
			const started = performance.now();
			try {
				const output = await Promise.race([hook.run(payload, controller.signal), timeoutstate.promise]);
				results.push({
					hookid: hook.id,
					version: hook.version,
					phase: hook.phase,
					output: jsonvalueof(output, "hook output"),
					durationms: performance.now() - started,
				});
			} catch (error) {
				if (error instanceof hooktimeout) {
					throw new hookdispatcherror(
						hook.id,
						hook.phase,
						`hook ${hook.id} timed out after ${hook.timeoutms}ms during ${hook.phase}`,
					);
				}
				const message = error instanceof Error ? error.message : String(error);
				throw new hookdispatcherror(
					hook.id,
					hook.phase,
					`hook ${hook.id} failed during ${hook.phase}: ${message}`,
				);
			} finally {
				clearTimeout(timeout);
			}
		}
		return results;
	}
}
