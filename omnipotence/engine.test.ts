import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineprocess, stablejson } from "./contracts.ts";
import type { jsonschema } from "./contracts.ts";
import { orchestrationengine } from "./engine.ts";
import { definehook } from "./hooks.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];
const objectinput: jsonschema = { type: "object", additionalproperties: true };
const objectoutput: jsonschema = { type: "object", additionalproperties: true };

function openengine() {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-engine-"));
	roots.push(root);
	const path = join(root, "state.sqlite");
	const store = new orchestrationstore(path);
	return { store, engine: new orchestrationengine(store), path };
}
class mutationstore extends orchestrationstore {
	mutateafterrelease = false;

	releaserun(runid: string, owner: string, epoch: number): boolean {
		const released = super.releaserun(runid, owner, epoch);
		if (released && this.mutateafterrelease) {
			this.mutateafterrelease = false;
			const run = this.getrun(runid);
			if (run?.status === "waiting_effect" || run?.status === "running") {
				this.transitionrun(runid, "blocked", null, "mutation after release");
			} else if (run) {
				this.bumpfence(runid);
			}
		}
		return released;
	}
}

function openmutationengine() {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-engine-mutation-"));
	roots.push(root);
	const path = join(root, "state.sqlite");
	const store = new mutationstore(path);
	return { store, engine: new orchestrationengine(store), path };
}

function registersnapshotprocess(engine: orchestrationengine, id: string): void {
	engine.register(
		defineprocess({
			id,
			version: "1.0.0",
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				return ctx.task("work", {});
			},
		}),
	);
}

async function startsnapshotrun(engine: orchestrationengine, processid: string) {
	const started = await engine.start({
		processid,
		sessionid: `session-${processid}`,
		mode: "babysit",
		input: {},
	});
	if (started.status !== "waiting") throw new Error("expected waiting result");
	return started;
}

function markcallrun(path: string, runid: string): void {
	const external = new Database(path);
	const rows = external
		.query("select id, seq, type, payload_json from events where run_id = ? order by seq")
		.all(runid) as Array<{ id: number; seq: number; type: string; payload_json: string }>;
	let previoushash: string | null = null;
	for (const row of rows) {
		let payload: unknown = JSON.parse(row.payload_json);
		if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
			throw new Error("expected event object");
		}
		if (row.type === "run_created" || row.type === "run_status") {
			payload = { ...payload, mode: "call" };
		}
		const payloadjson = stablejson(payload);
		const hash = createHash("sha256")
			.update(`${runid}\n${row.seq}\n${row.type}\n${payloadjson}\n${previoushash ?? ""}`)
			.digest("hex");
		external
			.query("update events set payload_json = ?, previous_hash = ?, hash = ? where id = ?")
			.run(payloadjson, previoushash, hash, row.id);
		previoushash = hash;
	}
	external.query("update runs set mode = 'call' where id = ?").run(runid);
	external.exec("pragma user_version = 7");
	external.close();
}

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("deterministic process engine", () => {
	test("process resolution orders semantic versions and rejects active ties", () => {
		const { store, engine } = openengine();
		const process = (version: string, blueprint: { name: string; version: string }) =>
			defineprocess({
				id: "delivery.versioned",
				version,
				blueprint,
				input: objectinput,
				output: objectoutput,
				async run() {
					return {};
				},
			});
		engine.register(process("1.0.0-rc.1", { name: "alpha-pack", version: "1.0.0" }));
		engine.register(process("1.0.0", { name: "alpha-pack", version: "1.0.0" }));
		expect(engine.resolveprocess("delivery.versioned").version).toBe("1.0.0");

		engine.register(process("1.0.0", { name: "beta-pack", version: "1.0.0" }));
		expect(() => engine.resolveprocess("delivery.versioned")).toThrow(
			"process delivery.versioned@1.0.0 is ambiguous across blueprints",
		);
		expect(
			engine.resolveprocess("delivery.versioned", undefined, {
				name: "beta-pack",
				version: "1.0.0",
			}).blueprint?.name,
		).toBe("beta-pack");
		store.close();
	});
	test("start rejects sparse input before storing a run", async () => {
		const { store, engine } = openengine();
		let processcalls = 0;
		engine.register(
			defineprocess({
				id: "delivery.sparse-input",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run() {
					processcalls += 1;
					return {};
				},
			}),
		);
		const sparse: unknown[] = [];
		sparse.length = 1;

		await expect(
			engine.start({
				processid: "delivery.sparse-input",
				sessionid: "session-sparse-input",
				mode: "babysit",
				input: { payload: sparse },
			}),
		).rejects.toThrow("run.input.payload[0]: expected own array element");
		expect(processcalls).toBe(0);
		expect(store.listruns()).toHaveLength(0);
		store.close();
	});
	test("matching blueprint hooks execute once and replay their stored result", async () => {
		const { store, engine } = openengine();
		const blueprint = { name: "scoped-pack", version: "1.0.0" };
		let hookcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.guard",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				blueprint,
				async run() {
					hookcalls += 1;
					return { approved: true };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.blueprint-hook",
				version: "1.0.0",
				blueprint,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					const guard = await ctx.hook("guard", "audit.guard", { request: "run" });
					const work = await ctx.task("work", {});
					return { guard, work };
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.blueprint-hook",
			sessionid: "session-blueprint-hook",
			mode: "babysit",
			input: {},
		});
		expect(started.status).toBe("waiting");
		if (started.status !== "waiting") throw new Error("expected waiting result");
		expect(hookcalls).toBe(1);
		const replay = await engine.resume(started.run.id);
		expect(replay.status).toBe("waiting");
		expect(hookcalls).toBe(1);

		const work = started.effects[0]!;
		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: work.runid,
			effectid: work.id,
			fence: work.fence,
			inputhash: work.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected completed result");
		expect(completed.output).toEqual({ guard: { approved: true }, work: { done: true } });
		expect(hookcalls).toBe(1);
		store.close();
	});
	test("an unscoped hook effect replays its identity after a scoped hook appears", async () => {
		const { store, engine } = openengine();
		let unscopedcalls = 0;
		let scopedcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.replay-identity",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				async run() {
					unscopedcalls += 1;
					return { approved: true };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.unscoped-hook-replay",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					const guard = await ctx.hook("guard", "audit.replay-identity", { request: "run" });
					const work = await ctx.task("work", {});
					return { guard, work };
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.unscoped-hook-replay",
			sessionid: "session-unscoped-hook-replay",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const hookeffect = store.geteffectbykey(started.run.id, "guard");
		const work = started.effects[0];
		if (!hookeffect || !work) throw new Error("expected durable hook and work effects");
		const inputbytes = stablejson(hookeffect.input);

		engine.hooks.register(
			definehook({
				id: "audit.replay-identity",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				blueprint: { name: "scoped-pack", version: "1.0.0" },
				async run() {
					scopedcalls += 1;
					return { approved: false };
				},
			}),
		);

		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: work.runid,
			effectid: work.id,
			fence: work.fence,
			inputhash: work.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected completed result");
		expect(completed.output).toEqual({ guard: { approved: true }, work: { done: true } });
		expect(unscopedcalls).toBe(1);
		expect(scopedcalls).toBe(0);
		const replayed = store.geteffect(started.run.id, hookeffect.id);
		expect(replayed).toMatchObject({
			inputhash: hookeffect.inputhash,
			input: hookeffect.input,
		});
		expect(replayed ? stablejson(replayed.input) : null).toBe(inputbytes);
		store.close();
	});
	test("new unblueprinted hooks require active definitions while durable null selectors replay", async () => {
		const { store, engine, path } = openengine();
		let activecalls = 0;
		const process = defineprocess({
			id: "delivery.inactive-hook-replay",
			version: "1.0.0",
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				const guard = await ctx.hook("guard", "audit.inactive-global", { request: "run" });
				const work = await ctx.task("work", {});
				return { guard, work };
			},
		});
		engine.hooks.register(
			definehook({
				id: "audit.inactive-global",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				async run() {
					activecalls += 1;
					return { approved: true };
				},
			}),
		);
		engine.register(process);

		const started = await engine.start({
			processid: process.id,
			sessionid: "session-inactive-hook-seed",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting seed run");
		const hookeffect = store.geteffectbykey(started.run.id, "guard");
		const work = started.effects[0];
		if (!hookeffect || !work) throw new Error("expected durable hook and work effects");
		const hookinputbytes = stablejson(hookeffect.input);
		store.close();

		const reopenedstore = new orchestrationstore(path);
		const reopened = new orchestrationengine(reopenedstore);
		let inactivecalls = 0;
		reopened.hooks.register(
			definehook({
				id: "audit.inactive-global",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				active: false,
				async run() {
					inactivecalls += 1;
					return { approved: false };
				},
			}),
		);
		reopened.register(process);

		const failed = await reopened.start({
			processid: process.id,
			sessionid: "session-inactive-hook-new",
			mode: "babysit",
			input: {},
		});
		expect(failed.status).toBe("failed");
		if (failed.status !== "failed") throw new Error("expected inactive hook failure");
		expect(reopenedstore.listeffects(failed.run.id)).toHaveLength(0);
		expect(inactivecalls).toBe(0);

		const completed = await reopened.posteffect({
			rootrunid: started.run.id,
			runid: work.runid,
			effectid: work.id,
			fence: work.fence,
			inputhash: work.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected durable replay completion");
		expect(completed.output).toEqual({ guard: { approved: true }, work: { done: true } });
		expect(activecalls).toBe(1);
		expect(inactivecalls).toBe(0);
		const replayed = reopenedstore.geteffect(started.run.id, hookeffect.id);
		expect(replayed).toMatchObject({
			status: "resolved_ok",
			input: hookeffect.input,
			inputhash: hookeffect.inputhash,
			value: { approved: true },
		});
		expect(replayed ? stablejson(replayed.input) : null).toBe(hookinputbytes);
		reopenedstore.close();
	});

	test("unrelated processes cannot dispatch blueprint-scoped explicit hooks", async () => {
		const { store, engine } = openengine();
		const blueprint = { name: "scoped-pack", version: "1.0.0" };
		let hookcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.guard",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				blueprint,
				async run() {
					hookcalls += 1;
					return { approved: true };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.unblueprinted-hook",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.hook("guard", "audit.guard", { request: "run" });
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.different-blueprint-hook",
				version: "1.0.0",
				blueprint: { name: "other-pack", version: "1.0.0" },
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.hook("guard", "audit.guard", { request: "run" });
				},
			}),
		);

		for (const [processid, sessionid] of [
			["delivery.unblueprinted-hook", "session-unblueprinted-hook"],
			["delivery.different-blueprint-hook", "session-different-blueprint-hook"],
		] as const) {
			const result = await engine.start({
				processid,
				sessionid,
				mode: "babysit",
				input: {},
			});
			expect(result.status).toBe("failed");
			expect(result.run.status).toBe("failed");
			expect(store.listeffects(result.run.id)).toHaveLength(0);
		}
		expect(hookcalls).toBe(0);
		store.close();
	});
	test("one start advances two effect turns into one validated output", async () => {
		const { store, engine } = openengine();
		let resolvedhooks = 0;
		engine.hooks.register(
			definehook({
				id: "audit.effect-resolved",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					resolvedhooks += 1;
					return null;
				},
			}),
		);
		engine.register(
			defineprocess<{ request: string }, { summary: string }>({
				id: "delivery.sequence",
				version: "1.0.0",
				input: {
					type: "object",
					required: ["request"],
					additionalproperties: false,
					properties: { request: { type: "string", min: 1 } },
				},
				output: {
					type: "object",
					required: ["summary"],
					additionalproperties: false,
					properties: { summary: { type: "string" } },
				},
				async run(ctx, input) {
					const reviewed = await ctx.task("review", { request: input.request });
					const delivered = await ctx.task("deliver", { reviewed });
					return { summary: JSON.stringify(delivered) };
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.sequence",
			sessionid: "session-1",
			mode: "babysit",
			input: { request: "ship" },
		});
		expect(started.status).toBe("waiting");
		if (started.status !== "waiting") throw new Error("expected waiting result");
		expect(started.run.leaseowner).toBeNull();
		expect(started.effects.map((effect) => effect.key)).toEqual(["review"]);

		const reviewed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: started.effects[0]!.runid,
			effectid: started.effects[0]!.id,
			fence: started.effects[0]!.fence,
			inputhash: started.effects[0]!.inputhash,
			status: "ok",
			value: { approved: true },
		});
		expect(reviewed.status).toBe("waiting");
		if (reviewed.status !== "waiting") throw new Error("expected second waiting result");
		expect(reviewed.effects.map((effect) => effect.key)).toEqual(["deliver"]);

		expect(resolvedhooks).toBe(1);
		const repeated = await engine.posteffect({
			rootrunid: started.run.id,
			runid: started.effects[0]!.runid,
			effectid: started.effects[0]!.id,
			fence: started.effects[0]!.fence,
			inputhash: started.effects[0]!.inputhash,
			status: "ok",
			value: { approved: true },
		});
		if (repeated.status !== "waiting") throw new Error("expected idempotent waiting result");
		expect(repeated.effects[0]?.id).toBe(reviewed.effects[0]?.id);
		expect(resolvedhooks).toBe(1);

		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: reviewed.effects[0]!.runid,
			effectid: reviewed.effects[0]!.id,
			fence: reviewed.effects[0]!.fence,
			inputhash: reviewed.effects[0]!.inputhash,
			status: "ok",
			value: { delivered: true },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected completed result");
		expect(completed.output).toEqual({ summary: '{"delivered":true}' });
		expect(store.getsessionrun("session-1")).toBeNull();
		store.close();
	});
	test("reserves a session before dispatching run start hooks", async () => {
		const { store, engine } = openengine();
		let runstarthooks = 0;
		engine.hooks.register(
			definehook({
				id: "audit.session-reservation",
				version: "1.0.0",
				phase: "run_start",
				timeoutms: 100,
				async run() {
					runstarthooks += 1;
					return { accepted: true };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.session-reservation",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", {});
				},
			}),
		);

		const first = await engine.start({
			processid: "delivery.session-reservation",
			sessionid: "session-reservation",
			mode: "babysit",
			input: {},
		});
		if (first.status !== "waiting") throw new Error("expected waiting result");

		await expect(
			engine.start({
				processid: "delivery.session-reservation",
				sessionid: "session-reservation",
				mode: "babysit",
				input: {},
			}),
		).rejects.toThrow("session session-reservation already has active run");
		expect(runstarthooks).toBe(1);
		expect(store.listruns()).toHaveLength(1);
		expect(store.events(first.run.id).filter((event) => event.type === "hook_completed")).toHaveLength(1);

		engine.hooks.register(
			definehook({
				id: "audit.start-failure",
				version: "1.0.0",
				phase: "run_start",
				timeoutms: 100,
				async run() {
					throw new Error("start hook rejected");
				},
			}),
		);
		const failed = await engine.start({
			processid: "delivery.session-reservation",
			sessionid: "session-reservation-failure",
			mode: "babysit",
			input: {},
		});
		expect(failed.status).toBe("failed");
		expect(failed.run.status).toBe("failed");
		expect(failed.run.blockedreason).toBe("hook audit.start-failure failed during run_start: start hook rejected");
		expect(store.getsessionrun("session-reservation-failure")).toBeNull();
		expect(store.listruns()).toHaveLength(2);
		expect(store.events(failed.run.id).map((event) => event.type)).toContain("hook_failed");
		store.close();
	});

	test("parallel effects wait for every result without repeating resolved work", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.parallel",
				version: "1.0.0",
				input: objectinput,
				output: { type: "array", items: { type: "object", additionalproperties: true } },
				async run(ctx) {
					return ctx.parallel(
						"checks",
						[
							{ key: "tests", kind: "task", input: { command: "test" } },
							{ key: "review", kind: "task", input: { command: "review" } },
						],
						2,
					);
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.parallel",
			sessionid: "session-2",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		expect(started.effects.map((effect) => effect.key)).toEqual(["checks/tests", "checks/review"]);

		const first = started.effects[0]!;
		const partial = await engine.posteffect({
			rootrunid: started.run.id,
			runid: first.runid,
			effectid: first.id,
			fence: first.fence,
			inputhash: first.inputhash,
			status: "ok",
			value: { passed: true },
		});
		if (partial.status !== "waiting") throw new Error("expected partial waiting result");
		expect(partial.effects.map((effect) => effect.key)).toEqual(["checks/review"]);

		const second = partial.effects[0]!;
		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: second.runid,
			effectid: second.id,
			fence: second.fence,
			inputhash: second.inputhash,
			status: "ok",
			value: { accepted: true },
		});
		expect(completed.status).toBe("completed");
		store.close();
	});

	test("empty parallel groups complete without effects in execute and plan modes", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.parallel-empty",
				version: "1.0.0",
				input: objectinput,
				output: { type: "array", items: { type: "object", additionalproperties: true } },
				async run(ctx) {
					return ctx.parallel("empty", []);
				},
			}),
		);

		const executed = await engine.start({
			processid: "delivery.parallel-empty",
			sessionid: "session-parallel-empty-babysit",
			mode: "babysit",
			input: {},
		});
		expect(executed.status).toBe("completed");
		if (executed.status !== "completed") throw new Error("expected empty execute result");
		expect(executed.output).toEqual([]);
		expect(store.listeffects(executed.run.id)).toHaveLength(0);
		expect(store.events(executed.run.id).filter((event) => event.type === "effect_requested")).toHaveLength(0);

		const planned = await engine.start({
			processid: "delivery.parallel-empty",
			sessionid: "session-parallel-empty-plan",
			mode: "plan",
			input: {},
		});
		expect(planned.status).toBe("completed");
		if (planned.status !== "completed") throw new Error("expected empty plan result");
		expect(planned.output).toEqual([]);
		expect(store.listeffects(planned.run.id)).toHaveLength(0);
		expect(store.events(planned.run.id).filter((event) => event.type === "effect_requested")).toHaveLength(0);

		engine.register(
			defineprocess({
				id: "delivery.parallel-empty-invalid",
				version: "1.0.0",
				input: objectinput,
				output: { type: "array", items: { type: "object", additionalproperties: true } },
				async run(ctx) {
					return ctx.parallel("empty", [], 0);
				},
			}),
		);
		const invalid = await engine.start({
			processid: "delivery.parallel-empty-invalid",
			sessionid: "session-parallel-empty-invalid",
			mode: "babysit",
			input: {},
		});
		expect(invalid.status).toBe("failed");
		if (invalid.status !== "failed") throw new Error("expected invalid concurrency failure");
		expect(invalid.error).toBe("parallel.maxconcurrency: expected integer from 1 to 64");

		const invalidplan = await engine.start({
			processid: "delivery.parallel-empty-invalid",
			sessionid: "session-parallel-empty-invalid-plan",
			mode: "plan",
			input: {},
		});
		expect(invalidplan.status).toBe("failed");
		if (invalidplan.status !== "failed") throw new Error("expected invalid plan concurrency failure");
		expect(invalidplan.error).toBe("parallel.maxconcurrency: expected integer from 1 to 64");
		store.close();
	});

	test("parallel max concurrency releases one effect per available slot", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.parallel-limit",
				version: "1.0.0",
				input: objectinput,
				output: { type: "array", items: { type: "object", additionalproperties: true } },
				async run(ctx) {
					return ctx.parallel(
						"limited",
						[
							{ key: "first", kind: "task", input: { order: 1 } },
							{ key: "second", kind: "task", input: { order: 2 } },
						],
						1,
					);
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.parallel-limit",
			sessionid: "session-parallel-limit",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected first limited effect");
		expect(started.effects.map((effect) => effect.key)).toEqual(["limited/first"]);
		const first = started.effects[0]!;
		const next = await engine.posteffect({
			rootrunid: started.run.id,
			runid: first.runid,
			effectid: first.id,
			fence: first.fence,
			inputhash: first.inputhash,
			status: "ok",
			value: { done: 1 },
		});
		if (next.status !== "waiting") throw new Error("expected second limited effect");
		expect(next.effects.map((effect) => effect.key)).toEqual(["limited/second"]);
		store.close();
	});
	test("a subprocess recreates a missing child and returns through the parent", async () => {
		const { store, engine, path } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.child",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("child-work", { value: 1 });
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.parent",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("child", "delivery.child", {});
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.parent",
			sessionid: "session-3",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected child waiting result");
		expect(started.effects).toHaveLength(1);
		expect(started.effects[0]?.key).toBe("child-work");
		expect(started.effects[0]?.runid).not.toBe(started.run.id);

		const childrunid = started.effects[0]!.runid;
		const external = new Database(path);
		external.query("delete from effects where run_id = ?").run(childrunid);
		external.query("delete from events where run_id = ?").run(childrunid);
		external.query("delete from runs where id = ?").run(childrunid);
		external.close();

		const replayed = await engine.resume(started.run.id);
		if (replayed.status !== "waiting") throw new Error("expected recreated child effect");
		expect(replayed.effects[0]?.runid).toBe(childrunid);

		const leaf = replayed.effects[0]!;
		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: leaf.runid,
			effectid: leaf.id,
			fence: leaf.fence,
			inputhash: leaf.inputhash,
			status: "ok",
			value: { child: "done" },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected parent completion");
		expect(completed.output).toEqual({ child: "done" });
		store.close();
	});

	test("process contexts expose durable parent metadata across replay", async () => {
		const { store, engine } = openengine();
		const observed: unknown[] = [];
		const blueprint = { name: "delivery-pack", version: "1.0.0" };
		engine.register(
			defineprocess({
				id: "delivery.child-context",
				version: "1.0.0",
				blueprint,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					observed.push(ctx.parent);
					return { parent: ctx.parent, value: await ctx.task("child-work", {}) };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.parent-context",
				version: "1.0.0",
				blueprint,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("child", "delivery.child-context", {});
				},
			}),
		);

		const top = await engine.start({
			processid: "delivery.child-context",
			sessionid: "session-parent-context-top",
			mode: "babysit",
			input: {},
		});
		expect(top.status).toBe("waiting");
		if (top.status !== "waiting") throw new Error("expected top-level child work");
		const topwork = top.effects[0]!;
		const topcompleted = await engine.posteffect({
			rootrunid: top.run.id,
			runid: topwork.runid,
			effectid: topwork.id,
			fence: topwork.fence,
			inputhash: topwork.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(topcompleted.status).toBe("completed");
		if (topcompleted.status !== "completed") throw new Error("expected top-level child completion");
		expect(topcompleted.output).toEqual({ parent: null, value: { done: true } });
		observed.length = 0;

		const started = await engine.start({
			processid: "delivery.parent-context",
			sessionid: "session-parent-context-child",
			mode: "babysit",
			input: {},
		});
		expect(started.status).toBe("waiting");
		if (started.status !== "waiting") throw new Error("expected subprocess child work");
		const childwork = started.effects[0]!;
		const expected = {
			runid: started.run.id,
			effectkey: "child",
			processid: "delivery.parent-context",
			processversion: "1.0.0",
			blueprintname: "delivery-pack",
			blueprintversion: "1.0.0",
		};
		expect(observed[0]).toEqual(expected);
		expect(store.parentprocesscontext("unrelated-child")).toBeNull();

		const replay = await engine.resume(started.run.id);
		expect(replay.status).toBe("waiting");
		expect(observed[1]).toEqual(expected);
		expect(observed[1]).toEqual(observed[0]);

		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: childwork.runid,
			effectid: childwork.id,
			fence: childwork.fence,
			inputhash: childwork.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(completed.status).toBe("completed");
		expect(observed.every((parent) => JSON.stringify(parent) === JSON.stringify(expected))).toBe(true);
		store.close();
	});

	test("parent lookup rejects ambiguous subprocess parents", () => {
		const { store } = openengine();
		const createrun = (processid: string) =>
			store.createrun({
				processid,
				processversion: "1.0.0",
				processhash: "hash",
				sessionid: null,
				mode: "babysit",
				input: {},
				maxturns: 3,
			});
		const parent = createrun("delivery.parent-lookup");
		const child = createrun("delivery.child-lookup");
		const first = store.requesteffect(parent.id, {
			key: "child",
			kind: "subprocess",
			input: { childrunid: child.id },
		});
		const duplicate = createrun("delivery.other-parent");
		store.requesteffect(duplicate.id, {
			key: "child",
			kind: "subprocess",
			input: { childrunid: child.id },
		});
		expect(() => store.parentprocesscontext(child.id)).toThrow(`run ${child.id} has ambiguous subprocess parents`);
		expect(first.kind).toBe("subprocess");
		store.close();
	});

	test("parent lookup rejects malformed subprocess envelopes", () => {
		const { store, path } = openengine();
		const createrun = (processid: string) =>
			store.createrun({
				processid,
				processversion: "1.0.0",
				processhash: "hash",
				sessionid: null,
				mode: "babysit",
				input: {},
				maxturns: 3,
			});
		const parent = createrun("delivery.parent-lookup");
		const malformedchild = createrun("delivery.malformed-child");
		const malformed = store.requesteffect(parent.id, {
			key: "malformed",
			kind: "subprocess",
			input: { childrunid: malformedchild.id },
		});
		const external = new Database(path);
		external.query("update effects set input_json = ? where id = ?").run(JSON.stringify({ childrunid: 42 }), malformed.id);
		external.close();
		expect(() => store.parentprocesscontext(malformedchild.id)).toThrow("effect malformed input.childrunid: expected string");
		store.close();
	});

	test("rejects malformed ownership before an engine effect post mutates state", async () => {
		const { store, engine } = openengine();
		let hookcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.ownership-rejection",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					hookcalls += 1;
					return null;
				},
			}),
		);
		const root = store.createrun({
			processid: "delivery.ownership-malformed",
			processversion: "1.0.0",
			processhash: "hash",
			sessionid: "session-ownership-malformed",
			mode: "babysit",
			input: {},
			maxturns: 3,
		});
		const malformed = store.requesteffect(root.id, {
			key: "child",
			kind: "subprocess",
			input: { childrunid: 42 },
		});
		const work = store.requesteffect(root.id, {
			key: "work",
			kind: "task",
			input: { value: "before" },
		});
		const beforework = store.geteffect(root.id, work.id);
		const beforemalformed = store.geteffect(root.id, malformed.id);
		if (!beforework || !beforemalformed) throw new Error("expected pending effects");
		const fence = root.fence;

		await expect(
			engine.posteffect({
				rootrunid: root.id,
				runid: root.id,
				effectid: work.id,
				fence: work.fence,
				inputhash: work.inputhash,
				status: "ok",
				value: { done: true },
			}),
		).rejects.toThrow("childrunid");
		expect(store.getrun(root.id)?.fence).toBe(fence);
		expect(store.geteffect(root.id, work.id)).toEqual(beforework);
		expect(store.geteffect(root.id, malformed.id)).toEqual(beforemalformed);
		expect(store.listhookdeliveries(root.id, work.id)).toHaveLength(0);
		expect(hookcalls).toBe(0);
		store.close();
	});

	test("rejects duplicate ownership before an engine effect post mutates state", async () => {
		const { store, engine } = openengine();
		registersnapshotprocess(engine, "delivery.ownership-duplicate");
		registersnapshotprocess(engine, "delivery.ownership-child");
		let hookcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.duplicate-ownership",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					hookcalls += 1;
					return null;
				},
			}),
		);
		const root = store.createrun({
			processid: "delivery.ownership-duplicate",
			processversion: "1.0.0",
			processhash: "hash",
			sessionid: "session-ownership-duplicate",
			mode: "babysit",
			input: {},
			maxturns: 3,
		});
		const child = store.createrun({
			processid: "delivery.ownership-child",
			processversion: "1.0.0",
			processhash: "hash",
			sessionid: null,
			mode: "babysit",
			input: {},
			maxturns: 3,
		});
		const first = store.requesteffect(root.id, {
			key: "child-a",
			kind: "subprocess",
			input: { childrunid: child.id },
		});
		const second = store.requesteffect(root.id, {
			key: "child-b",
			kind: "subprocess",
			input: { childrunid: child.id },
		});
		const work = store.requesteffect(root.id, {
			key: "work",
			kind: "task",
			input: { value: "before" },
		});
		const beforework = store.geteffect(root.id, work.id);
		const beforefirst = store.geteffect(root.id, first.id);
		const beforesecond = store.geteffect(root.id, second.id);
		if (!beforework || !beforefirst || !beforesecond) throw new Error("expected pending effects");
		const fence = root.fence;

		await expect(
			engine.posteffect({
				rootrunid: root.id,
				runid: root.id,
				effectid: work.id,
				fence: work.fence,
				inputhash: work.inputhash,
				status: "ok",
				value: { done: true },
			}),
		).rejects.toThrow("ambiguous subprocess parents");
		expect(store.getrun(root.id)?.fence).toBe(fence);
		expect(store.geteffect(root.id, work.id)).toEqual(beforework);
		expect(store.geteffect(root.id, first.id)).toEqual(beforefirst);
		expect(store.geteffect(root.id, second.id)).toEqual(beforesecond);
		expect(store.listhookdeliveries(root.id, work.id)).toHaveLength(0);
		expect(hookcalls).toBe(0);
		store.close();
	});
	test("rebinding a root fences every subprocess descendant before stale results", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.fence-leaf",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("leaf-work", {});
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.fence-nested",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("leaf", "delivery.fence-leaf", {});
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.fence-root",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("nested", "delivery.fence-nested", {});
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.fence-root",
			sessionid: "session-fence-old",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected leaf waiting result");
		const leaf = started.effects[0]!;
		const rootchild = store.geteffectbykey(started.run.id, "nested");
		if (!rootchild) throw new Error("expected root subprocess effect");
		const child = store.listruns().find((candidate) => candidate.id !== started.run.id && candidate.id !== leaf.runid);
		if (!child) throw new Error("expected child run");
		const childnested = store.geteffectbykey(child.id, "leaf");
		if (!childnested) throw new Error("expected nested subprocess effect");
		const nested = store.getrun(leaf.runid);
		if (!nested) throw new Error("expected nested run");

		store.bindsession("session-fence-new", started.run.id);
		expect(store.getrun(started.run.id)?.fence).toBe(started.run.fence + 1);
		expect(store.getrun(child.id)?.fence).toBe(child.fence + 1);
		expect(store.getrun(nested.id)?.fence).toBe(nested.fence + 1);
		expect(store.geteffect(started.run.id, rootchild.id)?.fence).toBe(rootchild.fence + 1);
		expect(store.geteffect(child.id, childnested.id)?.fence).toBe(childnested.fence + 1);
		expect(store.geteffect(nested.id, leaf.id)?.fence).toBe(leaf.fence + 1);
		await expect(
			engine.commiteffect({
				rootrunid: started.run.id,
				runid: leaf.runid,
				effectid: leaf.id,
				fence: leaf.fence,
				inputhash: leaf.inputhash,
				status: "ok",
				value: { done: true },
			}),
		).rejects.toThrow("stale fence");
		expect(store.geteffect(nested.id, leaf.id)?.status).toBe("requested");
		store.close();
	});
	test("an exhausted turn budget blocks before another effect", async () => {
		const { store, engine } = openengine();
		const original = defineprocess({
			id: "delivery.drift",
			version: "1.0.0",
			maxturns: 1,
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				return ctx.task("work", { revision: 1 });
			},
		});
		engine.register(original);
		const started = await engine.start({
			processid: "delivery.drift",
			sessionid: "session-4",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");

		const effect = started.effects[0]!;
		const blocked = await engine.posteffect({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: {},
		});
		expect(blocked.status).toBe("blocked");
		if (blocked.status !== "blocked") throw new Error("expected blocked result");
		expect(blocked.reason).toBe("turn budget 1 exhausted");
		store.close();
	});
	test("forever runs cross sequential task boundaries without growing maxturns", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.forever-sequence",
				version: "1.0.0",
				maxturns: 1,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					const first = await ctx.task("first", {});
					const second = await ctx.task("second", {});
					return { first, second };
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.forever-sequence",
			sessionid: "session-forever-sequence",
			mode: "forever",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected first forever effect");
		expect(started.effects.map((effect) => effect.key)).toEqual(["first"]);
		expect(started.run.turns).toBe(1);
		expect(started.run.maxturns).toBe(1);

		const first = started.effects[0]!;
		const middle = await engine.posteffect({
			rootrunid: started.run.id,
			runid: first.runid,
			effectid: first.id,
			fence: first.fence,
			inputhash: first.inputhash,
			status: "ok",
			value: { done: "first" },
		});
		if (middle.status !== "waiting") throw new Error("expected second forever effect");
		expect(middle.effects.map((effect) => effect.key)).toEqual(["second"]);
		expect(middle.run.turns).toBe(2);
		expect(middle.run.maxturns).toBe(1);

		const second = middle.effects[0]!;
		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: second.runid,
			effectid: second.id,
			fence: second.fence,
			inputhash: second.inputhash,
			status: "ok",
			value: { done: "second" },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected forever completion");
		expect(completed.run.turns).toBe(3);
		expect(completed.run.maxturns).toBe(1);
		expect(completed.output).toEqual({
			first: { done: "first" },
			second: { done: "second" },
		});
		store.close();
	});

	test("forever auto-approves optional breakpoints and waits for required ones", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.forever-optional-breakpoint",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return {
						approval: await ctx.breakpoint("optional", {
							question: "continue",
							required: false,
						}),
					};
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.forever-required-breakpoint",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.breakpoint("required", {
						question: "continue",
						required: true,
					});
				},
			}),
		);

		const optional = await engine.start({
			processid: "delivery.forever-optional-breakpoint",
			sessionid: "session-forever-optional-breakpoint",
			mode: "forever",
			input: {},
		});
		expect(optional.status).toBe("completed");
		if (optional.status !== "completed") throw new Error("expected optional breakpoint approval");
		expect(optional.output).toEqual({
			approval: { approved: true, mode: "forever" },
		});
		expect(store.listeffects(optional.run.id)).toHaveLength(0);

		const required = await engine.start({
			processid: "delivery.forever-required-breakpoint",
			sessionid: "session-forever-required-breakpoint",
			mode: "forever",
			input: {},
		});
		if (required.status !== "waiting") throw new Error("expected required breakpoint");
		expect(required.run.status).toBe("waiting_for_user");
		expect(required.effects.map((effect) => effect.key)).toEqual(["required"]);
		expect(required.effects[0]?.kind).toBe("breakpoint");
		store.close();
	});

	test("forever subprocesses inherit budget persistence and breakpoint policy", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.forever-child",
				version: "1.0.0",
				maxturns: 1,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					const approval = await ctx.breakpoint("optional", { required: false });
					const first = await ctx.task("first", {});
					const second = await ctx.task("second", {});
					return { approval, first, second };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.forever-parent",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("child", "delivery.forever-child", {});
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.forever-parent",
			sessionid: "session-forever-subprocess",
			mode: "forever",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected inherited child effect");
		expect(started.effects.map((effect) => effect.key)).toEqual(["first"]);
		const child = store.listruns().find((run) => run.processid === "delivery.forever-child");
		if (!child) throw new Error("expected forever child run");
		expect(child.mode).toBe("forever");
		expect(child.maxturns).toBe(1);
		expect(child.turns).toBe(1);

		const first = started.effects[0]!;
		const middle = await engine.posteffect({
			rootrunid: started.run.id,
			runid: first.runid,
			effectid: first.id,
			fence: first.fence,
			inputhash: first.inputhash,
			status: "ok",
			value: { done: "first" },
		});
		if (middle.status !== "waiting") throw new Error("expected inherited second child effect");
		expect(middle.effects.map((effect) => effect.key)).toEqual(["second"]);
		expect(store.getrun(child.id)?.turns).toBe(2);
		expect(store.getrun(child.id)?.maxturns).toBe(1);

		const second = middle.effects[0]!;
		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: second.runid,
			effectid: second.id,
			fence: second.fence,
			inputhash: second.inputhash,
			status: "ok",
			value: { done: "second" },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected inherited child completion");
		expect(completed.output).toEqual({
			approval: { approved: true, mode: "forever" },
			first: { done: "first" },
			second: { done: "second" },
		});
		expect(store.getrun(child.id)).toMatchObject({
			status: "completed",
			mode: "forever",
			maxturns: 1,
			turns: 3,
		});
		store.close();
	});

	test("advance recovers only legacy forever budget blocks", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.legacy-budget",
				version: "1.0.0",
				maxturns: 1,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", {});
				},
			}),
		);

		const forever = await engine.start({
			processid: "delivery.legacy-budget",
			sessionid: "session-legacy-forever",
			mode: "forever",
			input: {},
		});
		if (forever.status !== "waiting") throw new Error("expected legacy forever effect");
		const legacyeffect = forever.effects[0]!;
		store.transitionrun(forever.run.id, "blocked", null, "turn budget 1 exhausted");
		const recovered = await engine.advance(forever.run.id);
		if (recovered.status !== "waiting") throw new Error("expected legacy budget recovery");
		expect(recovered.run.status).toBe("waiting_effect");
		expect(recovered.run.blockedreason).toBeNull();
		expect(recovered.run.maxturns).toBe(1);
		expect(recovered.run.turns).toBe(2);
		expect(recovered.effects.map((effect) => effect.id)).toEqual([legacyeffect.id]);
		const completed = await engine.posteffect({
			rootrunid: forever.run.id,
			runid: legacyeffect.runid,
			effectid: legacyeffect.id,
			fence: legacyeffect.fence,
			inputhash: legacyeffect.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected recovered forever completion");
		expect(completed.run.maxturns).toBe(1);
		expect(completed.run.turns).toBe(3);

		const finite = await engine.start({
			processid: "delivery.legacy-budget",
			sessionid: "session-legacy-finite",
			mode: "babysit",
			input: {},
		});
		if (finite.status !== "waiting") throw new Error("expected finite effect");
		store.transitionrun(finite.run.id, "blocked", null, "turn budget 1 exhausted");
		const finiteblocked = await engine.advance(finite.run.id);
		expect(finiteblocked.status).toBe("blocked");
		if (finiteblocked.status !== "blocked") throw new Error("expected finite block to remain");
		expect(finiteblocked.reason).toBe("turn budget 1 exhausted");
		expect(finiteblocked.run.maxturns).toBe(1);
		expect(finiteblocked.run.turns).toBe(1);

		const nonbudget = await engine.start({
			processid: "delivery.legacy-budget",
			sessionid: "session-legacy-nonbudget",
			mode: "forever",
			input: {},
		});
		if (nonbudget.status !== "waiting") throw new Error("expected non-budget effect");
		const nonbudgeteffect = nonbudget.effects[0]!;
		store.transitionrun(nonbudget.run.id, "blocked", null, "operator paused");
		const stillblocked = await engine.advance(nonbudget.run.id);
		expect(stillblocked.status).toBe("blocked");
		if (stillblocked.status !== "blocked") throw new Error("expected non-budget block to remain");
		expect(stillblocked.reason).toBe("operator paused");
		expect(stillblocked.run.maxturns).toBe(1);
		expect(stillblocked.run.turns).toBe(1);
		expect(store.geteffect(nonbudget.run.id, nonbudgeteffect.id)?.status).toBe("requested");
		store.close();
	});

	test("a changed process source blocks replay before execution", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.source-drift",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", { revision: 1 });
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.source-drift",
			sessionid: "session-drift",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");

		const replacement = new orchestrationengine(store);
		replacement.register(
			defineprocess({
				id: "delivery.source-drift",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", { revision: 2 });
				},
			}),
		);
		const blocked = await replacement.advance(started.run.id);
		expect(blocked.status).toBe("blocked");
		if (blocked.status !== "blocked") throw new Error("expected blocked result");
		expect(blocked.reason).toBe("process source changed during replay");
		expect(store.geteffectbykey(started.run.id, "work")?.input).toEqual({ revision: 1 });
		store.close();
	});

	test("past sleeps resume, breakpoints wait, and halt is terminal", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.breakpoint",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					await ctx.sleep("ready", "2000-01-01T00:00:00.000Z");
					return ctx.breakpoint("approval", { question: "continue", required: true });
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.halt",
				version: "1.0.0",
				input: objectinput,
				output: { type: "null" },
				async run(ctx) {
					ctx.halt("stopped by process");
				},
			}),
		);

		const waiting = await engine.start({
			processid: "delivery.breakpoint",
			sessionid: "session-breakpoint",
			mode: "babysit",
			input: {},
		});
		if (waiting.status !== "waiting") throw new Error("expected breakpoint");
		expect(waiting.run.status).toBe("waiting_for_user");
		expect(waiting.effects.map((effect) => effect.key)).toEqual(["approval"]);
		const approval = waiting.effects[0]!;
		const completed = await engine.posteffect({
			rootrunid: waiting.run.id,
			runid: approval.runid,
			effectid: approval.id,
			fence: approval.fence,
			inputhash: approval.inputhash,
			status: "ok",
			value: { approved: true },
		});
		expect(completed.status).toBe("completed");

		const halted = await engine.start({
			processid: "delivery.halt",
			sessionid: "session-halt",
			mode: "babysit",
			input: {},
		});
		expect(halted.status).toBe("halted");
		store.close();
	});

	test("a result cannot target an unrelated root run", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.ownership",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", {});
				},
			}),
		);
		const first = await engine.start({
			processid: "delivery.ownership",
			sessionid: "session-owner-one",
			mode: "babysit",
			input: {},
		});
		const second = await engine.start({
			processid: "delivery.ownership",
			sessionid: "session-owner-two",
			mode: "babysit",
			input: {},
		});
		if (first.status !== "waiting" || second.status !== "waiting") {
			throw new Error("expected two waiting runs");
		}
		const effect = second.effects[0]!;
		await expect(
			engine.commiteffect({
				rootrunid: first.run.id,
				runid: second.run.id,
				effectid: effect.id,
				fence: effect.fence,
				inputhash: effect.inputhash,
				status: "ok",
				value: {},
			}),
		).rejects.toThrow(`effect run ${second.run.id} is not owned by root run ${first.run.id}`);
		expect(store.geteffect(second.run.id, effect.id)?.status).toBe("requested");
		store.close();
	});

	test("a database lease serializes concurrent engine advances", async () => {
		const { store, engine, path } = openengine();
		const process = defineprocess({
			id: "delivery.lease",
			version: "1.0.0",
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				return ctx.task("work", {});
			},
		});
		engine.register(process);
		const started = await engine.start({
			processid: "delivery.lease",
			sessionid: "session-lease",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected leased effect");
		const effect = started.effects[0]!;
		await engine.commiteffect({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { done: true },
		});

		const entered = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		engine.hooks.register(
			definehook({
				id: "audit.lease",
				version: "1.0.0",
				phase: "before_advance",
				timeoutms: 1_000,
				async run() {
					entered.resolve();
					await release.promise;
					return null;
				},
			}),
		);
		const firstadvance = engine.advance(started.run.id);
		await entered.promise;
		const external = new Database(path);
		external.query("update runs set lease_expires_at = 0 where id = ?").run(started.run.id);
		external.close();
		const competing = new orchestrationengine(store);
		competing.register(process);
		await expect(competing.advance(started.run.id)).rejects.toThrow(
			`run ${started.run.id} is leased by another engine`,
		);
		release.resolve();
		expect((await firstadvance).status).toBe("completed");
		store.close();
	});
	test("same-engine advances reject a competing operation before duplicate hooks", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.same-engine-lease",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					await ctx.task("work", {});
					return { done: true };
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.same-engine-lease",
			sessionid: "session-same-engine-lease",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const effect = started.effects[0]!;
		store.posteffect({
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: {},
		});

		let beforeadvance = 0;
		const entered = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		engine.hooks.register(
			definehook({
				id: "audit.same-engine-lease",
				version: "1.0.0",
				phase: "before_advance",
				timeoutms: 1_000,
				async run() {
					beforeadvance += 1;
					entered.resolve();
					await release.promise;
					return null;
				},
			}),
		);

		const first = engine.advance(started.run.id);
		await entered.promise;
		const second = engine.advance(started.run.id);
		release.resolve();

		await expect(second).rejects.toThrow(`run ${started.run.id} is leased by another engine`);
		const completed = await first;
		expect(completed.status).toBe("completed");
		expect(beforeadvance).toBe(1);
		const terminalevents = store
			.events(started.run.id)
			.filter(
				(event) =>
					event.type === "run_status" &&
					event.payload !== null &&
					typeof event.payload === "object" &&
					!Array.isArray(event.payload) &&
					"status" in event.payload &&
					event.payload.status === "completed",
			);
		expect(terminalevents).toHaveLength(1);
		store.close();
	});

	test("advance snapshots the run before releasing its lease", async () => {
		const { store, engine } = openmutationengine();
		engine.register(
			defineprocess({
				id: "delivery.snapshot-advance",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", {});
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.snapshot-advance",
			sessionid: "session-snapshot-advance",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");

		store.mutateafterrelease = true;
		const advanced = await engine.advance(started.run.id);

		expect(advanced.status).toBe("waiting");
		expect(advanced.run.status).toBe("waiting_effect");
		expect(store.getrun(started.run.id)?.status).toBe("blocked");
		store.close();
	});

	test("commiteffect snapshots the run before releasing its lease", async () => {
		const { store, engine } = openmutationengine();
		engine.register(
			defineprocess({
				id: "delivery.snapshot-commiteffect",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", {});
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.snapshot-commiteffect",
			sessionid: "session-snapshot-commiteffect",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const effect = started.effects[0]!;

		store.mutateafterrelease = true;
		const committed = await engine.commiteffect({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { done: true },
		});

		expect(committed.status).toBe("committed");
		expect(committed.run.status).toBe("running");
		expect(store.getrun(started.run.id)?.status).toBe("blocked");
		store.close();
	});

	test("halt snapshots the run before releasing its lease", async () => {
		const { store, engine } = openmutationengine();
		const processid = "delivery.snapshot-halt";
		registersnapshotprocess(engine, processid);
		const started = await startsnapshotrun(engine, processid);
		const initialfence = started.run.fence;

		store.mutateafterrelease = true;
		const halted = await engine.halt(started.run.id, "operator requested stop");

		expect(halted.status).toBe("halted");
		expect(halted.run.status).toBe("halted");
		expect(halted.run.fence).toBe(initialfence + 1);
		expect(halted.run.leaseowner).toBeNull();
		expect(halted.run.leaseexpiresat).toBeNull();
		expect(store.getrun(started.run.id)?.status).toBe("halted");
		expect(store.getrun(started.run.id)?.fence).toBe(initialfence + 2);
		store.close();
	});

	test("posteffect snapshots the run before releasing its lease", async () => {
		const { store, engine } = openmutationengine();
		const processid = "delivery.snapshot-posteffect";
		registersnapshotprocess(engine, processid);
		const started = await startsnapshotrun(engine, processid);
		const effect = started.effects[0]!;
		const initialfence = started.run.fence;

		store.mutateafterrelease = true;
		const completed = await engine.posteffect({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { done: true },
		});

		expect(completed.status).toBe("completed");
		expect(completed.run.status).toBe("completed");
		expect(completed.run.fence).toBe(initialfence);
		expect(completed.run.leaseowner).toBeNull();
		expect(completed.run.leaseexpiresat).toBeNull();
		expect(store.getrun(started.run.id)?.status).toBe("completed");
		expect(store.getrun(started.run.id)?.fence).toBe(initialfence + 1);
		store.close();
	});

	test("resume snapshots the run before releasing its lease", async () => {
		const { store, engine } = openmutationengine();
		const processid = "delivery.snapshot-resume";
		registersnapshotprocess(engine, processid);
		const started = await startsnapshotrun(engine, processid);
		const initialfence = started.run.fence;

		store.mutateafterrelease = true;
		const resumed = await engine.resume(started.run.id);

		expect(resumed.status).toBe("waiting");
		expect(resumed.run.status).toBe("waiting_effect");
		expect(resumed.run.fence).toBe(initialfence);
		expect(resumed.run.leaseowner).toBeNull();
		expect(resumed.run.leaseexpiresat).toBeNull();
		expect(store.getrun(started.run.id)?.status).toBe("blocked");
		expect(store.getrun(started.run.id)?.fence).toBe(initialfence);
		store.close();
	});

	test("resolveuncertain snapshots the run before releasing its lease", async () => {
		const { store, engine } = openmutationengine();
		const processid = "delivery.snapshot-resolveuncertain";
		registersnapshotprocess(engine, processid);
		const started = await startsnapshotrun(engine, processid);
		const effect = started.effects[0]!;
		store.posteffect({
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "uncertain",
			error: { message: "connection closed after dispatch" },
		});
		const initialfence = started.run.fence;

		store.mutateafterrelease = true;
		const resolved = await engine.resolveuncertain({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			decision: "confirm",
			value: { done: true },
		});

		expect(resolved.status).toBe("completed");
		expect(resolved.run.status).toBe("completed");
		expect(resolved.run.fence).toBe(initialfence);
		expect(resolved.run.leaseowner).toBeNull();
		expect(resolved.run.leaseexpiresat).toBeNull();
		expect(store.getrun(started.run.id)?.status).toBe("completed");
		expect(store.getrun(started.run.id)?.fence).toBe(initialfence + 1);
		store.close();
	});

	test("same-engine uncertain recovery runs hooks once while holding the root lease", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.same-engine-recovery",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("work", {});
				},
			}),
		);
		const started = await engine.start({
			processid: "delivery.same-engine-recovery",
			sessionid: "session-same-engine-recovery",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const effect = started.effects[0]!;
		store.posteffect({
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "uncertain",
			error: { message: "connection closed after dispatch" },
		});

		let recoveryhooks = 0;
		let resolvedhooks = 0;
		const recoveryentered = Promise.withResolvers<void>();
		const releaserecovery = Promise.withResolvers<void>();
		engine.hooks.register(
			definehook({
				id: "audit.same-engine-recovery",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 1_000,
				async run() {
					recoveryhooks += 1;
					recoveryentered.resolve();
					await releaserecovery.promise;
					return null;
				},
			}),
		);
		engine.hooks.register(
			definehook({
				id: "audit.same-engine-recovery-resolved",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 1_000,
				async run() {
					resolvedhooks += 1;
					return null;
				},
			}),
		);

		const resolution = {
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			decision: "confirm" as const,
			value: { published: true },
		};
		const first = engine.resolveuncertain(resolution);
		await recoveryentered.promise;
		const second = engine.resolveuncertain(resolution);
		releaserecovery.resolve();

		await expect(second).rejects.toThrow(`run ${started.run.id} is leased by another engine`);
		const completed = await first;
		expect(completed.status).toBe("completed");
		expect(recoveryhooks).toBe(1);
		expect(resolvedhooks).toBe(1);
		store.close();
	});
	test("uncertain child recovery uses the child blueprint hooks", async () => {
		const { store, engine } = openengine();
		const blueprinta = { name: "pack-a", version: "1.0.0" };
		const blueprintb = { name: "pack-b", version: "1.0.0" };
		engine.register(
			defineprocess({
				id: "delivery.recovery-root-a",
				version: "1.0.0",
				blueprint: blueprinta,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("child", "delivery.recovery-child-b", {});
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.recovery-child-b",
				version: "1.0.0",
				blueprint: blueprintb,
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return { result: await ctx.task("work", {}) };
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.recovery-root-a",
			sessionid: "session-recovery-blueprint-child",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected child effect");
		const effect = started.effects[0]!;
		const child = store.getrun(effect.runid);
		if (!child) throw new Error("expected child run");
		const uncertain = store.posteffect({
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "uncertain",
			error: { message: "connection closed after dispatch" },
		});
		expect(uncertain.status).toBe("uncertain");

		let ahooks = 0;
		let bhooks = 0;
		engine.hooks.register(
			definehook({
				id: "audit.recovery-a",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				blueprint: blueprinta,
				async run() {
					ahooks += 1;
					return { scope: "a" };
				},
			}),
		);
		engine.hooks.register(
			definehook({
				id: "audit.recovery-b",
				version: "1.0.0",
				phase: "recovery",
				timeoutms: 100,
				blueprint: blueprintb,
				async run() {
					bhooks += 1;
					return { scope: "b" };
				},
			}),
		);

		const resolved = await engine.resolveuncertain({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			decision: "confirm",
			value: { done: true },
		});
		expect(resolved.status).toBe("completed");
		if (resolved.status !== "completed") throw new Error("expected completed recovery");
		expect(resolved.output).toEqual({ result: { done: true } });
		expect(ahooks).toBe(0);
		expect(bhooks).toBe(1);

		const recovered = store.geteffect(effect.runid, effect.id);
		expect(recovered).toMatchObject({
			status: "resolved_ok",
			value: { done: true },
			fence: uncertain.fence,
		});
		expect(store.getrun(started.run.id)).toMatchObject({
			status: "completed",
			blueprintname: blueprinta.name,
			blueprintversion: blueprinta.version,
		});
		expect(store.getrun(child.id)).toMatchObject({
			status: "completed",
			blueprintname: blueprintb.name,
			blueprintversion: blueprintb.version,
		});
		const recoveryevents = store.events(child.id).filter((event) => event.type === "hook_completed");
		expect(recoveryevents).toHaveLength(1);
		expect(recoveryevents[0]?.payload).toMatchObject({
			hookid: "audit.recovery-b",
			phase: "recovery",
			output: { scope: "b" },
		});
		expect(store.events(started.run.id).filter((event) => event.type === "hook_completed")).toHaveLength(0);
		const effectrecoveredevents = store
			.events(child.id)
			.filter((event) => event.type === "effect_recovered");
		expect(effectrecoveredevents).toHaveLength(1);
		expect(effectrecoveredevents[0]?.payload).toMatchObject({
			id: effect.id,
			status: "resolved_ok",
			value: { done: true },
		});
		const parenteffect = store.geteffectbykey(started.run.id, "child");
		expect(parenteffect).toMatchObject({ status: "resolved_ok", value: { result: { done: true } } });
		store.close();
	});
	test("halting a root cascades owned descendants under one lease", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.halt-leaf",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.task("leaf-work", {});
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.halt-child",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("leaf", "delivery.halt-leaf", {});
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.halt-root",
				version: "1.0.0",
				input: objectinput,
				output: objectoutput,
				async run(ctx) {
					return ctx.subprocess("child", "delivery.halt-child", {});
				},
			}),
		);

		const started = await engine.start({
			processid: "delivery.halt-root",
			sessionid: "session-halt-root",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting halt tree");
		const leafeffect = started.effects[0];
		if (!leafeffect) throw new Error("expected leaf effect");
		const child = store.listruns().find((run) => run.processid === "delivery.halt-child");
		const leaf = store.listruns().find((run) => run.processid === "delivery.halt-leaf");
		if (!child || !leaf) throw new Error("expected owned descendants");
		const root = store.getrun(started.run.id);
		if (!root) throw new Error("expected root run");
		const initialfences = new Map([root, child, leaf].map((run) => [run.id, run.fence]));

		const entered = Promise.withResolvers<void>();
		const release = Promise.withResolvers<void>();
		engine.hooks.register(
			definehook({
				id: "audit.halt-lease",
				version: "1.0.0",
				phase: "run_halted",
				timeoutms: 1_000,
				async run(input) {
					if (
						input &&
						typeof input === "object" &&
						!Array.isArray(input) &&
						"runid" in input &&
						input.runid === child.id
					) {
						entered.resolve();
						await release.promise;
					}
					return null;
				},
			}),
		);
		let beforeadvancehooks = 0;
		engine.hooks.register(
			definehook({
				id: "audit.child-lease",
				version: "1.0.0",
				phase: "before_advance",
				timeoutms: 1_000,
				async run() {
					beforeadvancehooks += 1;
					return null;
				},
			}),
		);

		const first = engine.halt(root.id, "operator requested stop");
		await entered.promise;
		await expect(engine.advance(child.id)).rejects.toThrow(`run ${root.id} is leased by another engine`);
		expect(beforeadvancehooks).toBe(0);
		await expect(engine.advance(root.id)).rejects.toThrow(`run ${root.id} is leased by another engine`);

		release.resolve();
		const halted = await first;
		expect(halted.status).toBe("halted");
		expect(halted.reason).toBe("operator requested stop");
		for (const runid of [root.id, child.id, leaf.id]) {
			expect(store.getrun(runid)?.status).toBe("halted");
			expect(store.getrun(runid)?.blockedreason).toBe("operator requested stop");
			expect(store.getrun(runid)!.fence).toBe(initialfences.get(runid)! + 1);
		}

		const haltedevent = (runid: string) =>
			store
				.events(runid)
				.find(
					(event) =>
						event.type === "run_status" &&
						event.payload &&
						typeof event.payload === "object" &&
						!Array.isArray(event.payload) &&
						"status" in event.payload &&
						event.payload.status === "halted",
				);
		const leafhalt = haltedevent(leaf.id);
		const childhalt = haltedevent(child.id);
		const roothalt = haltedevent(root.id);
		if (!leafhalt || !childhalt || !roothalt) throw new Error("expected halt events");
		expect(leafhalt.id).toBeLessThan(childhalt.id);
		expect(childhalt.id).toBeLessThan(roothalt.id);

		await expect(
			engine.commiteffect({
				rootrunid: root.id,
				runid: leafeffect.runid,
				effectid: leafeffect.id,
				fence: leafeffect.fence,
				inputhash: leafeffect.inputhash,
				status: "ok",
				value: { done: true },
			}),
		).rejects.toThrow("stale fence");

		const transitions = store.events(root.id).filter((event) => event.type === "run_status").length;
		const repeated = await engine.halt(root.id, "different reason");
		expect(repeated.status).toBe("halted");
		expect(repeated.reason).toBe("operator requested stop");
		expect(store.getrun(root.id)?.blockedreason).toBe("operator requested stop");
		expect(store.events(root.id).filter((event) => event.type === "run_status")).toHaveLength(transitions);
		store.close();
	});
	test("an unscoped hook delivery retries its identity after a scoped hook appears", async () => {
		const { store, engine } = openengine();
		let unscopedcalls = 0;
		let scopedcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.replay-delivery",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					unscopedcalls += 1;
					if (unscopedcalls === 1) throw new Error("policy unavailable");
					return null;
				},
			}),
		);
		const process = defineprocess({
			id: "delivery.unscoped-delivery-replay",
			version: "1.0.0",
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				return { result: await ctx.task("work", {}) };
			},
		});
		engine.register(process);

		const started = await engine.start({
			processid: process.id,
			sessionid: "session-unscoped-delivery-replay",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const effect = started.effects[0]!;
		const blocked = await engine.commiteffect({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(blocked.status).toBe("blocked");
		const before = store.listhookdeliveries(effect.runid, effect.id);
		expect(before).toHaveLength(1);
		const delivery = before[0]!;
		const inputbytes = stablejson(delivery.input);
		const effectbefore = store.geteffect(effect.runid, effect.id);
		if (!effectbefore) throw new Error("expected resolved effect");

		engine.hooks.register(
			definehook({
				id: "audit.replay-delivery",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				blueprint: { name: "scoped-pack", version: "1.0.0" },
				async run() {
					scopedcalls += 1;
					return null;
				},
			}),
		);

		const completed = await engine.resume(started.run.id);
		expect(completed.status).toBe("completed");
		expect(unscopedcalls).toBe(2);
		expect(scopedcalls).toBe(0);
		const replayed = store.listhookdeliveries(effect.runid, effect.id);
		expect(replayed).toHaveLength(1);
		const replayeddelivery = replayed[0];
		if (!replayeddelivery) throw new Error("expected completed hook delivery");
		expect(replayeddelivery).toMatchObject({
			hookid: delivery.hookid,
			hookversion: delivery.hookversion,
			blueprintname: null,
			blueprintversion: null,
			input: delivery.input,
			state: "completed",
		});
		expect(stablejson(replayeddelivery.input)).toBe(inputbytes);
		expect(store.geteffect(effect.runid, effect.id)).toEqual(effectbefore);
		store.close();
	});
	test("resumes a failed resolved-effect hook without repeating completed delivery", async () => {
		const { store, engine, path } = openengine();
		let hookcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.retry-resolved",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					hookcalls += 1;
					if (hookcalls === 1) throw new Error("policy unavailable");
					return null;
				},
			}),
		);
		const process = defineprocess({
			id: "delivery.retry-resolved",
			version: "1.0.0",
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				const result = await ctx.task("work", {});
				return { result };
			},
		});
		engine.register(process);
		const started = await engine.start({
			processid: "delivery.retry-resolved",
			sessionid: "session-retry-resolved",
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const effect = started.effects[0]!;
		const blocked = await engine.commiteffect({
			rootrunid: started.run.id,
			runid: effect.runid,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(blocked.status).toBe("blocked");
		expect(store.geteffect(effect.runid, effect.id)?.status).toBe("resolved_ok");
		expect(hookcalls).toBe(1);
		store.close();

		const reopenedstore = new orchestrationstore(path);
		const reopened = new orchestrationengine(reopenedstore);
		reopened.hooks.register(
			definehook({
				id: "audit.retry-resolved",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					hookcalls += 1;
					if (hookcalls === 1) throw new Error("policy unavailable");
					return null;
				},
			}),
		);
		reopened.register(process);
		const completed = await reopened.resume(started.run.id);
		expect(completed.status).toBe("completed");
		expect(hookcalls).toBe(2);
		const repeated = await reopened.resume(started.run.id);
		expect(repeated.status).toBe("completed");
		expect(hookcalls).toBe(2);
		reopenedstore.close();
	});
	test("start, pause, migrate, resume, and complete one real process", async () => {
		const { store, engine, path } = openengine();
		const process = defineprocess({
			id: "delivery.schema-7-active-resume",
			version: "1.0.0",
			input: objectinput,
			output: objectoutput,
			async run(ctx) {
				const result = await ctx.task("work", { value: 1 });
				return { result };
			},
		});
		const sessionid = "session-schema-7-active-resume";
		engine.register(process);
		const started = await engine.start({
			processid: process.id,
			sessionid,
			mode: "babysit",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected waiting result");
		const effect = started.effects[0];
		if (!effect) throw new Error("expected waiting effect");
		const runid = started.run.id;
		const effectid = effect.id;
		expect(started.run.mode).toBe("babysit");
		expect(started.run.status).toBe("waiting_effect");
		expect(store.listeffects(runid)).toHaveLength(1);
		store.close();

		markcallrun(path, runid);
		const beforedb = new Database(path, { readonly: true });
		const before = beforedb
			.query(
				"select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events where run_id = ? order by seq",
			)
			.all(runid);
		const version = beforedb.query("pragma user_version").get() as { user_version: number };
		beforedb.close();
		expect(version.user_version).toBe(7);

		const migratedstore = new orchestrationstore(path);
		const reopened = new orchestrationengine(migratedstore);
		reopened.register(process);
		const migrated = migratedstore.getrun(runid);
		expect(migrated).toMatchObject({
			mode: "babysit",
			status: "waiting_effect",
			sessionid,
		});
		expect(migratedstore.geteffect(runid, effectid)?.id).toBe(effectid);
		expect(migratedstore.listeffects(runid)).toHaveLength(1);
		expect(migratedstore.events(runid).filter((event) => event.type === "run_mode_migrated")).toHaveLength(1);

		const afterdb = new Database(path, { readonly: true });
		const after = afterdb
			.query(
				"select id, run_id, seq, type, payload_json, previous_hash, hash, created_at from events where run_id = ? order by seq",
			)
			.all(runid);
		afterdb.close();
		expect(after.slice(0, before.length)).toEqual(before);

		const resumed = await reopened.resume(runid);
		expect(resumed.status).toBe("waiting");
		if (resumed.status !== "waiting") throw new Error("expected resumed waiting result");
		expect(resumed.run.mode).toBe("babysit");
		expect(resumed.effects).toHaveLength(1);
		expect(resumed.effects[0]?.id).toBe(effectid);

		const committed = await reopened.commiteffect({
			rootrunid: runid,
			runid: resumed.effects[0]!.runid,
			effectid: resumed.effects[0]!.id,
			fence: resumed.effects[0]!.fence,
			inputhash: resumed.effects[0]!.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(committed.status).toBe("committed");

		const completed = await reopened.resume(runid);
		expect(completed.status).toBe("completed");
		if (completed.status !== "completed") throw new Error("expected completed result");
		expect(completed.run.mode).toBe("babysit");
		expect(completed.run.sessionid).toBe(sessionid);
		expect(completed.output).toEqual({ result: { done: true } });
		expect(migratedstore.getsessionrun(sessionid)).toBeNull();
		expect(migratedstore.getrun(runid)?.sessionid).toBe(sessionid);
		expect(migratedstore.listeffects(runid)).toHaveLength(1);
		expect(migratedstore.geteffect(runid, effectid)).toMatchObject({
			id: effectid,
			status: "resolved_ok",
		});
		expect(migratedstore.events(runid).filter((event) => event.type === "effect_requested")).toHaveLength(1);
		expect(migratedstore.events(runid).filter((event) => event.type === "effect_resolved")).toHaveLength(1);
		expect(migratedstore.doctor()).toEqual({ ok: true, issues: [] });
		migratedstore.close();
	});
});
