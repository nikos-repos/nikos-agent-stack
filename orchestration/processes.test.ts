import { afterEach, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineprocess } from "./contracts.ts";
import { orchestrationengine } from "./engine.ts";
import { definehook } from "./hooks.ts";
import { modepolicy } from "./processes.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];
const objectschema = { type: "object" as const, additionalproperties: true };

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function openengine() {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-modes-"));
	roots.push(root);
	const store = new orchestrationstore(join(root, "state.sqlite"));
	return { store, engine: new orchestrationengine(store) };
}

describe("built-in orchestration modes", () => {
	test("one policy table defines every public mode", () => {
		expect(modepolicy("babysit")).toEqual({ execute: true, optionalbreakpoints: true, persistent: false });
		expect(modepolicy("call")).toEqual({ execute: true, optionalbreakpoints: true, persistent: false });
		expect(modepolicy("plan")).toEqual({ execute: false, optionalbreakpoints: false, persistent: false });
		expect(modepolicy("yolo")).toEqual({ execute: true, optionalbreakpoints: false, persistent: false });
		expect(modepolicy("forever")).toEqual({ execute: true, optionalbreakpoints: true, persistent: true });
		expect(modepolicy("resume")).toEqual({ execute: true, optionalbreakpoints: true, persistent: false });
	});

	test("resume posts a breakpoint answer without a second start", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.approval",
				version: "1.0.0",
				input: objectschema,
				output: objectschema,
				async run(ctx) {
					return ctx.breakpoint("approval", { question: "continue", required: true });
				},
			}),
		);
		const waiting = await engine.start({
			processid: "delivery.approval",
			sessionid: "session-resume",
			mode: "babysit",
			input: {},
		});
		if (waiting.status !== "waiting") throw new Error("expected breakpoint");
		const completed = await engine.resume(waiting.run.id, { approved: true });
		expect(completed.status).toBe("completed");
		store.close();
	});

	test("resume extends an exhausted finite budget and uncertain effects need a decision", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.budget",
				version: "1.0.0",
				maxturns: 1,
				input: objectschema,
				output: objectschema,
				async run(ctx) {
					return ctx.task("work", { value: 1 });
				},
			}),
		);

		const budgetrun = await engine.start({
			processid: "delivery.budget",
			sessionid: "session-budget",
			mode: "forever",
			input: {},
		});
		if (budgetrun.status !== "waiting") throw new Error("expected budget effect");
		const budgeteffect = budgetrun.effects[0]!;
		const blocked = await engine.posteffect({
			rootrunid: budgetrun.run.id,
			runid: budgeteffect.runid,
			effectid: budgeteffect.id,
			fence: budgeteffect.fence,
			inputhash: budgeteffect.inputhash,
			status: "ok",
			value: { done: true },
		});
		expect(blocked.status).toBe("blocked");
		const resumed = await engine.resume(budgetrun.run.id);
		expect(resumed.status).toBe("completed");

		const uncertainrun = await engine.start({
			processid: "delivery.budget",
			sessionid: "session-uncertain-mode",
			mode: "call",
			input: {},
		});
		if (uncertainrun.status !== "waiting") throw new Error("expected uncertain effect");
		const uncertaineffect = uncertainrun.effects[0]!;
		const uncertain = await engine.posteffect({
			rootrunid: uncertainrun.run.id,
			runid: uncertaineffect.runid,
			effectid: uncertaineffect.id,
			fence: uncertaineffect.fence,
			inputhash: uncertaineffect.inputhash,
			status: "uncertain",
			error: { message: "unknown outcome" },
		});
		expect(uncertain.status).toBe("blocked");
		await expect(engine.resume(uncertainrun.run.id)).rejects.toThrow(
			"run has an uncertain effect; resolve it explicitly",
		);
		const recovered = await engine.resolveuncertain({
			rootrunid: uncertainrun.run.id,
			runid: uncertaineffect.runid,
			effectid: uncertaineffect.id,
			fence: uncertaineffect.fence,
			inputhash: uncertaineffect.inputhash,
			decision: "confirm",
			value: { done: true },
		});
		expect(recovered.status).toBe("completed");
		store.close();
	});

	test("plan and yolo behavior comes from the shared policy table", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.policy",
				version: "1.0.0",
				input: objectschema,
				output: objectschema,
				async run(ctx) {
					const approval = await ctx.breakpoint("approval", {
						question: "continue",
						required: false,
					});
					return ctx.task("work", { approval });
				},
			}),
		);

		const plan = await engine.start({
			processid: "delivery.policy",
			sessionid: "session-plan",
			mode: "plan",
			input: {},
		});
		expect(plan.status).toBe("completed");
		if (plan.status !== "completed") throw new Error("expected plan completion");
		expect(plan.output).toEqual({
			effects: [
				{
					key: "work",
					kind: "task",
					input: { approval: { approved: true, mode: "plan" } },
				},
			],
		});

		const yolo = await engine.start({
			processid: "delivery.policy",
			sessionid: "session-yolo",
			mode: "yolo",
			input: {},
		});
		if (yolo.status !== "waiting") throw new Error("expected yolo task");
		expect(yolo.effects[0]?.key).toBe("work");
		expect(yolo.effects[0]?.input).toEqual({ approval: { approved: true, mode: "yolo" } });
		store.close();
	});

	test("plan does not execute hooks or create child runs", async () => {
		const { store, engine } = openengine();
		let hookcalls = 0;
		engine.hooks.register(
			definehook({
				id: "audit.plan",
				version: "1.0.0",
				phase: "effect_resolved",
				timeoutms: 100,
				async run() {
					hookcalls += 1;
					return { observed: true };
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.plan-safe",
				version: "1.0.0",
				input: objectschema,
				output: objectschema,
				async run(ctx) {
					return ctx.hook("probe", "audit.plan", {});
				},
			}),
		);
		const plan = await engine.start({
			processid: "delivery.plan-safe",
			sessionid: "session-plan-safe",
			mode: "plan",
			input: {},
		});
		expect(plan.status).toBe("completed");
		if (plan.status !== "completed") throw new Error("expected safe plan");
		expect(plan.output).toEqual({
			effects: [{ key: "probe", kind: "hook", input: { hookid: "audit.plan", input: {} } }],
		});
		expect(hookcalls).toBe(0);
		expect(store.listruns()).toHaveLength(1);
		store.close();
	});

	test("yolo policy propagates into subprocess breakpoints", async () => {
		const { store, engine } = openengine();
		engine.register(
			defineprocess({
				id: "delivery.yolo-child",
				version: "1.0.0",
				input: objectschema,
				output: objectschema,
				async run(ctx) {
					const approval = await ctx.breakpoint("optional", {
						required: false,
					});
					return ctx.task("child-work", { approval });
				},
			}),
		);
		engine.register(
			defineprocess({
				id: "delivery.yolo-parent",
				version: "1.0.0",
				input: objectschema,
				output: objectschema,
				async run(ctx) {
					return ctx.subprocess("child", "delivery.yolo-child", {});
				},
			}),
		);
		const result = await engine.start({
			processid: "delivery.yolo-parent",
			sessionid: "session-yolo-child",
			mode: "yolo",
			input: {},
		});
		if (result.status !== "waiting") throw new Error("expected child work");
		expect(result.effects.map((effect) => effect.key)).toEqual(["child-work"]);
		expect(result.effects[0]?.input).toEqual({
			approval: { approved: true, mode: "yolo" },
		});
		const babysit = await engine.start({
			processid: "delivery.yolo-parent",
			sessionid: "session-babysit-child",
			mode: "babysit",
			input: {},
		});
		if (babysit.status !== "waiting") throw new Error("expected child breakpoint");
		expect(babysit.effects.map((effect) => effect.key)).toEqual(["optional"]);
		const resumed = await engine.resume(babysit.run.id, { approved: true });
		if (resumed.status !== "waiting") throw new Error("expected child work after resume");
		expect(resumed.effects.map((effect) => effect.key)).toEqual(["child-work"]);
		store.close();
	});
});
