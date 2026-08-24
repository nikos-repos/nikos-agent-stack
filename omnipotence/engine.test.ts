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
			mode: "babysit",
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
			mode: "babysit",
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
		const initialfences = new Map(
			[root, child, leaf].map((run) => [run.id, run.fence]),
		);

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
		await expect(engine.advance(child.id)).rejects.toThrow(
			`run ${root.id} is leased by another engine`,
		);
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
			store.events(runid).find(
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
