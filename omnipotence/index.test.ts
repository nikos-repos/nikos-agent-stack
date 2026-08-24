import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blueprintservice } from "./blueprints.ts";
import activate, { nextsleepdelay } from "./index.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];
const originaldb = process.env.OMNIPOTENCE_DB;
const originalblueprints = process.env.OMNIPOTENCE_BLUEPRINTS;

afterEach(() => {
	if (originaldb === undefined) delete process.env.OMNIPOTENCE_DB;
	else process.env.OMNIPOTENCE_DB = originaldb;
	if (originalblueprints === undefined) delete process.env.OMNIPOTENCE_BLUEPRINTS;
	else process.env.OMNIPOTENCE_BLUEPRINTS = originalblueprints;
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function hash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

function installfixture(root: string): { dbpath: string; blueprintroot: string } {
	const dbpath = join(root, "state.sqlite");
	const blueprintroot = join(root, "blueprints");
	const source = join(root, "source");
	mkdirSync(join(source, "processes"), { recursive: true });
	const contracts = new URL("./contracts.ts", import.meta.url).href;
	const processcontent = `import { defineprocess } from ${JSON.stringify(contracts)};\nexport default defineprocess({\n  id: "delivery.extension",\n  version: "1.0.0",\n  input: { type: "object", additionalproperties: true },\n  output: { type: "object", additionalproperties: true },\n  async run(ctx) {\n    const first = await ctx.task("first", { step: 1 });\n    return ctx.task("second", { first });\n  }\n});\n\nexport const sleeping = defineprocess({\n  id: "delivery.sleep",\n  version: "1.0.0",\n  input: {\n    type: "object",\n    required: ["until"],\n    additionalproperties: false,\n    properties: { until: { type: "string" } }\n  },\n  output: {\n    type: "object",\n    required: ["done"],\n    additionalproperties: false,\n    properties: { done: { type: "boolean" } }\n  },\n  async run(ctx, input) {\n    await ctx.sleep("pause", input.until);\n    return { done: true };\n  }\n});\n`;
	const breakpointcontent = `import { defineprocess } from ${JSON.stringify(contracts)};\nexport default defineprocess({\n  id: "delivery.breakpoint",\n  version: "1.0.0",\n  input: { type: "object", additionalproperties: true },\n  output: { type: "object", additionalproperties: true },\n  async run(ctx) { return ctx.breakpoint("approval", { required: true }); }\n});\n`;
	writeFileSync(join(source, "processes/extension.ts"), processcontent);
	writeFileSync(join(source, "processes/breakpoint.ts"), breakpointcontent);
	writeFileSync(
		join(source, "omnipotence.blueprint.json"),
		JSON.stringify({
			schema: 1,
			name: "extension-pack",
			version: "1.0.0",
			engine: ">=1.0.0",
			processes: [
				{ id: "delivery.extension", entry: "processes/extension.ts" },
				{ id: "delivery.sleep", entry: "processes/extension.ts", export: "sleeping" },
				{ id: "delivery.breakpoint", entry: "processes/breakpoint.ts" },
			],
			hooks: [],
			files: {
				"processes/extension.ts": hash(processcontent),
				"processes/breakpoint.ts": hash(breakpointcontent),
			},
			config: {},
			migrations: [],
		}),
	);
	const store = new orchestrationstore(dbpath);
	new blueprintservice(store, blueprintroot).install(source);
	store.close();
	return { dbpath, blueprintroot };
}

interface faketool {
	execute(
		callid: string,
		params: unknown,
		signal: AbortSignal | undefined,
		onupdate: unknown,
		context: unknown,
	): Promise<unknown>;
}

function fakepi(
	onsend?: (message: unknown, options: unknown) => void,
	onentry?: (type: string, data: unknown) => void,
) {
	const handlers = new Map<string, Array<(event: unknown, context: unknown) => unknown>>();
	const commands = new Map<string, { handler: (args: unknown, context: unknown) => unknown }>();
	const tools = new Map<string, faketool>();
	const messages: Array<{ message: unknown; options: unknown }> = [];
	const entries: Array<{ type: string; data: unknown }> = [];
	const api = {
		on(event: string, handler: (payload: unknown, context: unknown) => unknown) {
			const existing = handlers.get(event) ?? [];
			existing.push(handler);
			handlers.set(event, existing);
		},
		registerCommand(name: string, command: { handler: (args: unknown, context: unknown) => unknown }) {
			commands.set(name, command);
		},
		registerTool(tool: faketool & { name: string }) {
			tools.set(tool.name, tool);
		},
		sendMessage(message: unknown, options: unknown) {
			onsend?.(message, options);
			messages.push({ message, options });
		},
		appendEntry(type: string, data: unknown) {
			onentry?.(type, data);
			entries.push({ type, data });
		},
		getActiveTools() {
			return [];
		},
		setActiveTools() {},
	};
	return { api, handlers, commands, tools, messages, entries };
}

async function fire(
	handlers: Map<string, Array<(event: unknown, context: unknown) => unknown>>,
	event: string,
	payload: unknown,
	context: unknown,
): Promise<unknown> {
	let result: unknown;
	for (const handler of handlers.get(event) ?? []) {
		const value = await handler(payload, context);
		if (value !== undefined) result = value;
	}
	return result;
}

function context(sessionid: string, root: string, notifications: unknown[] = []) {
	return {
		cwd: root,
		hasUI: false,
		sessionManager: {
			getSessionId() {
				return sessionid;
			},
		},
		ui: {
			notify(value: unknown) {
				notifications.push(value);
			},
		},
	};
}

describe("omnipotence omp extension", () => {
	test("mode command usage names the invoked command", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-command-usage-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-command-usage", root);
		const command = fake.commands.get("omnipotence-forever");
		if (!command) throw new Error("omnipotence-forever command was not registered");
		await expect(command.handler("", ctx)).rejects.toThrow(
			"usage: /omnipotence-forever <process-id> [json-input]",
		);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
	});
	test("registers canonical start commands without a call alias", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-command-registry-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		expect(fake.commands.has("omnipotence")).toBe(true);
		expect(fake.commands.has("omnipotence-plan")).toBe(true);
		expect(fake.commands.has("omnipotence-yolo")).toBe(true);
		expect(fake.commands.has("omnipotence-forever")).toBe(true);
		expect(fake.commands.has("omnipotence-call")).toBe(false);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, context("session-command-registry", root));
	});


	test("an unbound session stop has no orchestration side effect", async () => {
		expect(nextsleepdelay(3_000_000_000, 0)).toBe(2_147_483_647);
		const root = mkdtempSync(join(tmpdir(), "omnipotence-inactive-"));
		roots.push(root);
		process.env.OMNIPOTENCE_DB = join(root, "state.sqlite");
		process.env.OMNIPOTENCE_BLUEPRINTS = join(root, "blueprints");
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-inactive", root);
		const result = await fire(
			fake.handlers,
			"session_stop",
			{ type: "session_stop", stop_hook_active: false },
			ctx,
		);
		expect(result).toBeUndefined();
		expect(fake.messages).toEqual([]);
		expect(fake.entries).toEqual([]);
		const store = new orchestrationstore(process.env.OMNIPOTENCE_DB);
		expect(store.getsessionrun("session-inactive")).toBeNull();
		expect(store.listruns()).toEqual([]);
		store.close();
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
	});
	test("stop command halts the active run through the engine", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-stop-engine-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-stop-engine", root);
		const start = fake.commands.get("omnipotence");
		const stop = fake.commands.get("omnipotence-stop");
		if (!start || !stop) throw new Error("omnipotence commands were not registered");
		await start.handler("delivery.extension {}", ctx);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-stop-engine");
		if (!run) throw new Error("expected active stop run");
		const reason = "operator requested stop";
		await stop.handler(reason, ctx);
		const halted = store.getrun(run.id);
		expect(halted?.status).toBe("halted");
		expect(halted?.blockedreason).toBe(reason);
		expect(halted?.fence).toBe(run.fence + 1);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});

	test("registered status and stop survive a corrupt active blueprint", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-corrupt-controls-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const first = fakepi();
		Reflect.apply(activate, undefined, [first.api]);
		const owner = context("session-corrupt-controls", root);
		const start = first.commands.get("omnipotence");
		if (!start) throw new Error("omnipotence command was not registered");
		await start.handler("delivery.extension {}", owner);
		await fire(first.handlers, "session_shutdown", { type: "session_shutdown" }, owner);

		writeFileSync(
			join(paths.blueprintroot, "extension-pack", "1.0.0", "processes/extension.ts"),
			"export default null;\n",
		);

		const second = fakepi();
		Reflect.apply(activate, undefined, [second.api]);
		const notifications: unknown[] = [];
		const context2 = context("session-corrupt-controls", root, notifications);
		const status = second.commands.get("omnipotence-status");
		const stop = second.commands.get("omnipotence-stop");
		const start2 = second.commands.get("omnipotence");
		if (!status || !stop || !start2) throw new Error("omnipotence controls were not registered");
		const store = new orchestrationstore(paths.dbpath);
		const active = store.getsessionrun("session-corrupt-controls");
		if (!active) throw new Error("expected active corrupt-blueprint run");

		await expect(status.handler("", context2)).resolves.toBeUndefined();
		expect(JSON.parse(String(notifications.at(-1)))).toMatchObject({
			id: active.id,
			status: active.status,
		});

		const reason = "operator requested stop";
		await expect(stop.handler(reason, context2)).resolves.toBeUndefined();
		expect(store.getrun(active.id)).toMatchObject({
			status: "halted",
			blockedreason: reason,
		});

		notifications.length = 0;
		await expect(status.handler("", context2)).resolves.toBeUndefined();
		expect(JSON.parse(String(notifications.at(-1)))).toEqual({ status: "inactive" });
		await expect(start2.handler("delivery.extension {}", context2)).rejects.toThrow(
			"blueprint extension-pack@1.0.0 file processes/extension.ts hash mismatch",
		);

		await fire(second.handlers, "session_shutdown", { type: "session_shutdown" }, context2);
		store.close();
	});

	test("commands start once and session stop schedules only after gates can run", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-extension-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		let intentbeforesend = false;
		const fake = fakepi(() => {
			const check = new orchestrationstore(paths.dbpath, { readonly: true });
			const active = check.getsessionrun("session-extension");
			if (active) {
				intentbeforesend = check
					.listeffects(active.id)
					.every((effect) => effect.dispatchingat !== null && effect.dispatchedat === null);
			}
			check.close();
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-extension", root);
		const command = fake.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		await command.handler("delivery.extension {}", ctx);
		expect(intentbeforesend).toBe(true);

		expect(fake.messages).toHaveLength(1);
		expect(fake.messages[0]?.options).toEqual({ deliverAs: "nextTurn", triggerTurn: true });
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-extension");
		if (!run) throw new Error("expected active run");
		const first = store.listeffects(run.id)[0];
		if (!first) throw new Error("expected first effect");
		expect(first.dispatchedat).not.toBeNull();

		const tool = fake.tools.get("omnipotence_result");
		if (!tool) throw new Error("result tool was not registered");
		await tool.execute(
			"call-1",
			{
				rootrunid: run.id,
				runid: run.id,
				effectid: first.id,
				fence: first.fence,
				inputhash: first.inputhash,
				status: "ok",
				value: { first: true },
			},
			undefined,
			undefined,
			ctx,
		);
		expect(fake.messages).toHaveLength(1);
		expect(store.geteffectbykey(run.id, "second")).toBeNull();
		expect(store.getrun(run.id)?.status).toBe("running");

		const stopresult = await fire(
			fake.handlers,
			"session_stop",
			{ type: "session_stop", stop_hook_active: false },
			ctx,
		);
		expect(stopresult).toBeUndefined();
		expect(fake.messages).toHaveLength(2);
		const second = store.listeffects(run.id).find((effect) => effect.key === "second");
		if (!second) throw new Error("expected second effect");
		expect(store.geteffect(run.id, second.id)?.dispatchedat).not.toBeNull();

		const missing = await fire(
			fake.handlers,
			"session_stop",
			{ type: "session_stop", stop_hook_active: false },
			ctx,
		);
		expect(missing).toEqual({
			decision: "block",
			reason: `active omnipotence run ${run.id} still needs result for effect ${second.id}`,
		});
		const repeated = await fire(
			fake.handlers,
			"session_stop",
			{ type: "session_stop", stop_hook_active: true },
			ctx,
		);
		expect(repeated).toBeUndefined();
		expect(fake.messages).toHaveLength(2);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});


	test("result tool is bound to the calling session", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-result-session-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const owner = context("session-result-owner", root);
		const command = fake.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		await command.handler("delivery.extension {}", owner);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-result-owner");
		if (!run) throw new Error("expected active result run");
		const [effect] = store.listeffects(run.id);
		if (!effect) throw new Error("expected dispatched result effect");
		const tool = fake.tools.get("omnipotence_result");
		if (!tool) throw new Error("result tool was not registered");
		const post = {
			rootrunid: run.id,
			runid: run.id,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { accepted: true },
		};
		const before = {
			run: store.getrun(run.id),
			effect: store.geteffect(run.id, effect.id),
		};
		await expect(
			tool.execute("call-session-b", post, undefined, undefined, context("session-result-other", root)),
		).rejects.toThrow("this session has no active omnipotence run");
		expect(store.getrun(run.id)).toEqual(before.run);
		expect(store.geteffect(run.id, effect.id)).toEqual(before.effect);
		await expect(tool.execute("call-session-a", post, undefined, undefined, owner)).resolves.toBeDefined();
		expect(store.geteffect(run.id, effect.id)?.status).toBe("resolved_ok");
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, owner);
		store.close();
	});

	test("a hidden-turn send failure reverts dispatch and blocks recovery", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-send-failure-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi(() => {
			throw new Error("client rejected hidden turn");
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-send-failure", root);
		const command = fake.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		await expect(command.handler("delivery.extension {}", ctx)).rejects.toThrow(
			"client rejected hidden turn",
		);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-send-failure");
		if (!run) throw new Error("expected failed-schedule run");
		expect(run.status).toBe("blocked");
		const [effect] = store.listeffects(run.id);
		expect(effect?.status).toBe("requested");
		expect(effect?.dispatchedat).toBeNull();
		expect(run.blockedreason).toBe(
			"hidden-turn scheduling failed: client rejected hidden turn",
		);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});

	test("a future sleep wakes without a model effect turn", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-sleep-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const completed = Promise.withResolvers<void>();
		const fake = fakepi(undefined, (_type, data) => {
			if (data && typeof data === "object" && "status" in data && data.status === "completed") {
				completed.resolve();
			}
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-sleep", root);
		const command = fake.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		const until = new Date(Date.now() + 20).toISOString();
		await command.handler(`delivery.sleep ${JSON.stringify({ until })}`, ctx);
		expect(fake.messages).toEqual([]);
		await completed.promise;
		const store = new orchestrationstore(paths.dbpath);
		const [run] = store.listruns();
		expect(run?.status).toBe("completed");
		expect(run?.output).toEqual({ done: true });
		expect(store.getsessionrun("session-sleep")).toBeNull();
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});

	test("required breakpoints wait for explicit resume instead of model scheduling", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-breakpoint-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-breakpoint-extension", root);
		const start = fake.commands.get("omnipotence");
		const resume = fake.commands.get("omnipotence-resume");
		if (!start || !resume) throw new Error("omnipotence commands were not registered");
		await start.handler("delivery.breakpoint {}", ctx);
		expect(fake.messages).toEqual([]);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-breakpoint-extension");
		if (!run) throw new Error("expected breakpoint run");
		const [effect] = store.listeffects(run.id);
		expect(run.status).toBe("waiting_for_user");
		expect(effect?.kind).toBe("breakpoint");
		expect(effect?.dispatchedat).toBeNull();
		expect(
			await fire(
				fake.handlers,
				"session_stop",
				{ type: "session_stop", stop_hook_active: false },
				ctx,
			),
		).toBeUndefined();
		await resume.handler('{"approved":true}', ctx);
		expect(store.getsessionrun("session-breakpoint-extension")).toBeNull();
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
	test("a restarted session fences a dispatched effect as uncertain", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-restart-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const first = fakepi();
		Reflect.apply(activate, undefined, [first.api]);
		const ctx = context("session-restart", root);
		const command = first.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		await command.handler("delivery.extension {}", ctx);
		await fire(first.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);

		const second = fakepi();
		Reflect.apply(activate, undefined, [second.api]);
		await fire(second.handlers, "session_start", { type: "session_start" }, ctx);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-restart");
		if (!run) throw new Error("expected restarted run");
		expect(run.status).toBe("blocked");
		expect(store.listeffects(run.id)[0]?.status).toBe("uncertain");
		await fire(second.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
});
