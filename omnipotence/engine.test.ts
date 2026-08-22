import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineprocess } from "./contracts.ts";
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

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("deterministic process engine", () => {
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
			mode: "call",
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
			mode: "call",
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
	test("a subprocess exposes its leaf effect and returns through the parent", async () => {
		const { store, engine } = openengine();
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
			mode: "call",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected child waiting result");
		expect(started.effects).toHaveLength(1);
		expect(started.effects[0]?.key).toBe("child-work");
		expect(started.effects[0]?.runid).not.toBe(started.run.id);

		const leaf = started.effects[0]!;
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
			mode: "call",
			input: {},
		});
		if (started.status !== "waiting") throw new Error("expected leaf waiting result");
		const leaf = started.effects[0]!;
		const rootchild = store.geteffectbykey(started.run.id, "nested");
		if (!rootchild) throw new Error("expected root subprocess effect");
		const child = store
			.listruns()
			.find((candidate) => candidate.id !== started.run.id && candidate.id !== leaf.runid);
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
			mode: "call",
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
			mode: "call",
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
			mode: "call",
			input: {},
		});
		const second = await engine.start({
			processid: "delivery.ownership",
			sessionid: "session-owner-two",
			mode: "call",
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
		).rejects.toThrow(
			`effect run ${second.run.id} is not owned by root run ${first.run.id}`,
		);
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
			mode: "call",
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
			mode: "call",
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
		const terminalevents = store.events(started.run.id).filter(
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
			mode: "call",
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
});
