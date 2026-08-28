import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blueprintservice } from "./blueprints.ts";
import activate, { factoryflags, factoryrequestfor, nextsleepdelay, runsentence } from "./index.ts";
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
	const forevercontent = `import { defineprocess } from ${JSON.stringify(contracts)};
export default defineprocess({
  id: "delivery.forever",
  version: "1.0.0",
  maxturns: 1,
  input: { type: "object", additionalproperties: true },
  output: { type: "object", additionalproperties: true },
  async run(ctx) {
    await ctx.breakpoint("optional", { required: false });
    const first = await ctx.task("first", { step: 1 });
    const second = await ctx.task("second", { first });
    return { first, second };
  }
});
`;
	const breakpointcontent = `import { defineprocess } from ${JSON.stringify(contracts)};\nexport default defineprocess({\n  id: "delivery.breakpoint",\n  version: "1.0.0",\n  input: { type: "object", additionalproperties: true },\n  output: { type: "object", additionalproperties: true },\n  async run(ctx) { return ctx.breakpoint("approval", { required: true }); }\n});\n`;
	writeFileSync(join(source, "processes/extension.ts"), processcontent);
	writeFileSync(join(source, "processes/breakpoint.ts"), breakpointcontent);
	writeFileSync(join(source, "processes/forever.ts"), forevercontent);
	writeFileSync(
		join(source, "omnipotence.blueprint.json"),
		JSON.stringify({
			schema: 1,
			name: "extension-pack",
			version: "1.0.0",
			engine: ">=1.0.0",
			processes: [
				{ id: "delivery.extension", entry: "processes/extension.ts" },
				{ id: "delivery.forever", entry: "processes/forever.ts" },
				{ id: "delivery.sleep", entry: "processes/extension.ts", export: "sleeping" },
				{ id: "delivery.breakpoint", entry: "processes/breakpoint.ts" },
			],
			hooks: [],
			files: {
				"processes/extension.ts": hash(processcontent),
				"processes/breakpoint.ts": hash(breakpointcontent),
				"processes/forever.ts": hash(forevercontent),
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
	const commands = new Map<string, { description: string; handler: (args: unknown, context: unknown) => unknown }>();
	const tools = new Map<string, faketool>();
	const messages: Array<{ message: unknown; options: unknown }> = [];
	const entries: Array<{ type: string; data: unknown }> = [];
	const api = {
		on(event: string, handler: (payload: unknown, context: unknown) => unknown) {
			const existing = handlers.get(event) ?? [];
			existing.push(handler);
			handlers.set(event, existing);
		},
		registerCommand(
			name: string,
			command: { description: string; handler: (args: unknown, context: unknown) => unknown },
		) {
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

function context(
	sessionid: string,
	root: string,
	notifications: unknown[] = [],
	statuses: Array<{ key: string; text: string }> = [],
) {
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
			setStatus(key: string, text: string) {
				statuses.push({ key, text });
			},
		},
	};
}

describe("omnipotence omp extension", () => {
	test("shows the observant eye while the extension runs", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-status-line-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const statuses: Array<{ key: string; text: string }> = [];
		const ctx = context("session-status-line", root, [], statuses);

		await fire(fake.handlers, "session_start", { type: "session_start" }, ctx);

		expect(statuses).toEqual([{ key: "omnipotence", text: "𓂀" }]);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
	});

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
		expect(command.description).toBe("start one unbounded native orchestration run");
		await expect(command.handler("", ctx)).rejects.toThrow("usage: /omnipotence-forever <process-id> [json-input]");
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
		await fire(
			fake.handlers,
			"session_shutdown",
			{ type: "session_shutdown" },
			context("session-command-registry", root),
		);
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
		const result = await fire(fake.handlers, "session_stop", { type: "session_stop", stop_hook_active: false }, ctx);
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
		const start = fake.commands.get("omnipotence-forever");
		const stop = fake.commands.get("omnipotence-stop");
		if (!start || !stop) throw new Error("omnipotence commands were not registered");
		await start.handler("delivery.forever {}", ctx);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-stop-engine");
		if (!run) throw new Error("expected active stop run");
		const reason = "operator requested stop";
		await stop.handler(reason, ctx);
		const halted = store.getrun(run.id);
		expect(halted?.status).toBe("halted");
		expect(halted?.blockedreason).toBe(reason);
		expect(halted?.fence).toBe(run.fence + 1);
		expect(store.getsessionrun("session-stop-engine")).toBeNull();
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
		expect(String(notifications.at(-1))).toContain("delivery.extension");

		const reason = "operator requested stop";
		await expect(stop.handler(reason, context2)).resolves.toBeUndefined();
		expect(store.getrun(active.id)).toMatchObject({
			status: "halted",
			blockedreason: reason,
		});

		notifications.length = 0;
		await expect(status.handler("", context2)).resolves.toBeUndefined();
		expect(String(notifications.at(-1))).toBe("no active omnipotence run");
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

		const missing = await fire(fake.handlers, "session_stop", { type: "session_stop", stop_hook_active: false }, ctx);
		expect(missing).toEqual({
			decision: "block",
			reason: `active omnipotence run ${run.id} still needs result for effect ${second.id}`,
		});
		const repeated = await fire(fake.handlers, "session_stop", { type: "session_stop", stop_hook_active: true }, ctx);
		expect(repeated).toBeUndefined();
		expect(fake.messages).toHaveLength(2);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
	test("forever command continues past its finite budget through result turns", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-forever-chain-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-forever-chain", root);
		const command = fake.commands.get("omnipotence-forever");
		if (!command) throw new Error("omnipotence-forever command was not registered");
		await command.handler("delivery.forever {}", ctx);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-forever-chain");
		if (!run) throw new Error("expected active forever run");
		expect(run.mode).toBe("forever");
		expect(run.maxturns).toBe(1);
		expect(run.turns).toBe(1);
		expect(fake.messages).toHaveLength(1);
		expect(fake.messages[0]?.options).toEqual({ deliverAs: "nextTurn", triggerTurn: true });
		const first = store.geteffectbykey(run.id, "first");
		if (!first) throw new Error("expected first forever effect");
		expect(first.kind).toBe("task");
		expect(first.dispatchedat).not.toBeNull();
		expect(store.geteffectbykey(run.id, "optional")).toBeNull();
		expect(fake.messages[0]?.message).toMatchObject({
			customType: "nikos-agent-stack.omnipotence.effect",
			display: false,
			details: { runid: run.id, effectids: [first.id] },
		});
		const tool = fake.tools.get("omnipotence_result");
		if (!tool) throw new Error("result tool was not registered");
		await tool.execute(
			"forever-first",
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
		expect(store.getrun(run.id)).toMatchObject({ status: "running", turns: 2, maxturns: 1 });
		expect(
			await fire(fake.handlers, "session_stop", { type: "session_stop", stop_hook_active: false }, ctx),
		).toBeUndefined();
		expect(fake.messages).toHaveLength(2);
		const second = store.geteffectbykey(run.id, "second");
		if (!second) throw new Error("expected second forever effect");
		expect(second.kind).toBe("task");
		expect(second.dispatchedat).not.toBeNull();
		expect(fake.messages[1]?.options).toEqual({ deliverAs: "nextTurn", triggerTurn: true });
		expect(fake.messages[1]?.message).toMatchObject({
			customType: "nikos-agent-stack.omnipotence.effect",
			display: false,
			details: { runid: run.id, effectids: [second.id] },
		});
		await tool.execute(
			"forever-second",
			{
				rootrunid: run.id,
				runid: run.id,
				effectid: second.id,
				fence: second.fence,
				inputhash: second.inputhash,
				status: "ok",
				value: { second: true },
			},
			undefined,
			undefined,
			ctx,
		);
		expect(fake.messages).toHaveLength(2);
		expect(store.getrun(run.id)).toMatchObject({ status: "running", turns: 3, maxturns: 1 });
		expect(
			await fire(fake.handlers, "session_stop", { type: "session_stop", stop_hook_active: false }, ctx),
		).toBeUndefined();
		expect(fake.messages).toHaveLength(2);
		expect(store.getrun(run.id)).toMatchObject({
			status: "completed",
			turns: 3,
			maxturns: 1,
			output: { first: { first: true }, second: { second: true } },
		});
		expect(store.getsessionrun("session-forever-chain")).toBeNull();
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
		await expect(command.handler("delivery.extension {}", ctx)).rejects.toThrow("client rejected hidden turn");
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-send-failure");
		if (!run) throw new Error("expected failed-schedule run");
		expect(run.status).toBe("blocked");
		const [effect] = store.listeffects(run.id);
		expect(effect?.status).toBe("requested");
		expect(effect?.dispatchedat).toBeNull();
		expect(run.blockedreason).toBe("hidden-turn scheduling failed: client rejected hidden turn");
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
	test("a hidden-turn send failure after concurrent terminalization preserves the terminal outcome", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-send-terminal-race-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		let terminalrunid = "";
		const fake = fakepi(() => {
			const concurrent = new orchestrationstore(paths.dbpath);
			const active = concurrent.getsessionrun("session-send-terminal-race");
			if (!active) {
				concurrent.close();
				throw new Error("expected active run during hidden-turn send");
			}
			terminalrunid = active.id;
			try {
				concurrent.transitionrun(active.id, "halted", { preserved: true }, "concurrent terminal");
			} finally {
				concurrent.close();
			}
			throw new Error("client rejected hidden turn after terminalization");
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const notifications: unknown[] = [];
		const ctx = context("session-send-terminal-race", root, notifications);
		const command = fake.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		await expect(command.handler("delivery.extension {}", ctx)).resolves.toBeUndefined();
		expect(fake.messages).toEqual([]);
		expect(notifications).toEqual([]);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getrun(terminalrunid);
		expect(run).toMatchObject({
			status: "halted",
			output: { preserved: true },
			blockedreason: "concurrent terminal",
		});
		expect(run?.status).not.toBe("blocked");
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
	test("session_stop ignores a stale waiting result after concurrent terminalization", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-stop-terminal-race-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		let sendcount = 0;
		let terminalrunid = "";
		const fake = fakepi(() => {
			sendcount += 1;
			if (sendcount !== 2) return;
			const concurrent = new orchestrationstore(paths.dbpath);
			const active = concurrent.getsessionrun("session-stop-terminal-race");
			if (!active) {
				concurrent.close();
				throw new Error("expected active run during session_stop hidden-turn send");
			}
			terminalrunid = active.id;
			try {
				concurrent.transitionrun(active.id, "halted", { preserved: true }, "concurrent terminal");
			} finally {
				concurrent.close();
			}
			throw new Error("client rejected hidden turn after terminalization");
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-stop-terminal-race", root);
		const command = fake.commands.get("omnipotence");
		if (!command) throw new Error("omnipotence command was not registered");
		await command.handler("delivery.extension {}", ctx);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-stop-terminal-race");
		if (!run) throw new Error("expected active run");
		const first = store.geteffectbykey(run.id, "first");
		if (!first) throw new Error("expected first effect");
		const tool = fake.tools.get("omnipotence_result");
		if (!tool) throw new Error("result tool was not registered");
		await tool.execute(
			"stop-first",
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
		const stopresult = await fire(
			fake.handlers,
			"session_stop",
			{ type: "session_stop", stop_hook_active: false },
			ctx,
		);
		expect(stopresult).toBeUndefined();
		expect(sendcount).toBe(2);
		expect(fake.messages).toHaveLength(1);
		const terminal = store.getrun(terminalrunid);
		expect(terminal?.status).toBe("halted");
		expect(terminal?.blockedreason).toBe("concurrent terminal");
		expect(terminal?.output).toEqual({ preserved: true });
		expect(fake.entries).not.toContainEqual(
			expect.objectContaining({
				type: "nikos-agent-stack.omnipotence.state",
				data: expect.objectContaining({ status: "blocked" }),
			}),
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

	test("required forever breakpoints wait for explicit resume instead of model scheduling", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-breakpoint-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-breakpoint-extension", root);
		const start = fake.commands.get("omnipotence-forever");
		const resume = fake.commands.get("omnipotence-resume");
		if (!start || !resume) throw new Error("omnipotence commands were not registered");
		await start.handler("delivery.breakpoint {}", ctx);
		expect(fake.messages).toEqual([]);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-breakpoint-extension");
		if (!run) throw new Error("expected breakpoint run");
		expect(run.mode).toBe("forever");
		const [effect] = store.listeffects(run.id);
		expect(run.status).toBe("waiting_for_user");
		expect(effect?.kind).toBe("breakpoint");
		expect(effect?.dispatchedat).toBeNull();
		expect(
			await fire(fake.handlers, "session_stop", { type: "session_stop", stop_hook_active: false }, ctx),
		).toBeUndefined();
		await resume.handler('{"approved":true}', ctx);
		expect(store.getsessionrun("session-breakpoint-extension")).toBeNull();
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
	test("a restarted session schedules safe never-dispatched work once", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-restart-safe-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const first = fakepi();
		Reflect.apply(activate, undefined, [first.api]);
		const owner = context("session-restart-safe", root);
		const command = first.commands.get("omnipotence-forever");
		if (!command) throw new Error("omnipotence-forever command was not registered");
		await command.handler("delivery.forever {}", owner);
		const before = new orchestrationstore(paths.dbpath);
		const run = before.getsessionrun("session-restart-safe");
		if (!run) throw new Error("expected safe-recovery run");
		const effect = before.geteffectbykey(run.id, "first");
		if (!effect) throw new Error("expected safe-recovery effect");
		before.reverteffectdispatch(run.id, effect.id, effect.fence);
		expect(before.geteffect(run.id, effect.id)).toMatchObject({
			status: "requested",
			dispatchingat: null,
			dispatchedat: null,
		});
		before.close();
		await fire(first.handlers, "session_shutdown", { type: "session_shutdown" }, owner);

		const second = fakepi();
		Reflect.apply(activate, undefined, [second.api]);
		const restored = context("session-restart-safe", root);
		await fire(second.handlers, "session_start", { type: "session_start" }, restored);
		const after = new orchestrationstore(paths.dbpath);
		const recovered = after.getsessionrun("session-restart-safe");
		if (!recovered) throw new Error("expected recovered safe-recovery run");
		const dispatched = after.geteffect(recovered.id, effect.id);
		expect(second.messages).toHaveLength(1);
		expect(second.messages[0]?.options).toEqual({ deliverAs: "nextTurn", triggerTurn: true });
		expect(dispatched).toMatchObject({
			status: "requested",
			dispatchingat: null,
		});
		expect(dispatched?.dispatchedat).not.toBeNull();
		await fire(second.handlers, "session_shutdown", { type: "session_shutdown" }, restored);
		after.close();
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
		expect(first.messages).toHaveLength(1);
		await fire(first.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);

		const second = fakepi();
		Reflect.apply(activate, undefined, [second.api]);
		await fire(second.handlers, "session_start", { type: "session_start" }, ctx);
		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun("session-restart");
		if (!run) throw new Error("expected restarted run");
		expect(run.status).toBe("blocked");
		expect(second.messages).toEqual([]);
		expect(store.listeffects(run.id)[0]).toMatchObject({
			status: "uncertain",
			dispatchingat: null,
		});
		expect(store.listeffects(run.id)[0]?.dispatchedat).not.toBeNull();
		await fire(second.handlers, "session_start", { type: "session_start" }, ctx);
		expect(second.messages).toEqual([]);
		expect(store.listeffects(run.id)[0]?.status).toBe("uncertain");
		await fire(second.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});
	test("concurrent session recovery claims safe dispatch once", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-restart-concurrent-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const first = fakepi();
		Reflect.apply(activate, undefined, [first.api]);
		const owner = context("session-restart-concurrent", root);
		const start = first.commands.get("omnipotence-forever");
		if (!start) throw new Error("omnipotence-forever command was not registered");
		await start.handler("delivery.forever {}", owner);
		const before = new orchestrationstore(paths.dbpath);
		const run = before.getsessionrun("session-restart-concurrent");
		if (!run) throw new Error("expected concurrent recovery run");
		const effect = before.geteffectbykey(run.id, "first");
		if (!effect) throw new Error("expected concurrent recovery effect");
		before.reverteffectdispatch(run.id, effect.id, effect.fence);
		expect(before.geteffect(run.id, effect.id)).toMatchObject({
			status: "requested",
			dispatchingat: null,
			dispatchedat: null,
		});
		const startedbefore = before.events(run.id).filter((entry) => entry.type === "effect_dispatch_started").length;
		const dispatchedbefore = before.events(run.id).filter((entry) => entry.type === "effect_dispatched").length;
		before.close();
		await fire(first.handlers, "session_shutdown", { type: "session_shutdown" }, owner);

		const second = fakepi();
		const third = fakepi();
		Reflect.apply(activate, undefined, [second.api]);
		Reflect.apply(activate, undefined, [third.api]);
		const restored = context("session-restart-concurrent", root);
		expect(
			await Promise.all([
				fire(second.handlers, "session_start", { type: "session_start" }, restored),
				fire(third.handlers, "session_start", { type: "session_start" }, restored),
			]),
		).toEqual([undefined, undefined]);

		const messages = [...second.messages, ...third.messages];
		expect(messages).toHaveLength(1);
		expect(messages[0]?.options).toEqual({ deliverAs: "nextTurn", triggerTurn: true });
		expect(messages[0]?.message).toMatchObject({
			customType: "nikos-agent-stack.omnipotence.effect",
			display: false,
			details: { runid: run.id, effectids: [effect.id] },
		});
		const after = new orchestrationstore(paths.dbpath);
		const recovered = after.getrun(run.id);
		expect(recovered?.status).not.toBe("blocked");
		expect(after.geteffect(run.id, effect.id)).toMatchObject({
			status: "requested",
			dispatchingat: null,
		});
		expect(after.geteffect(run.id, effect.id)?.dispatchedat).not.toBeNull();
		expect(after.events(run.id).filter((entry) => entry.type === "effect_dispatch_started")).toHaveLength(
			startedbefore + 1,
		);
		expect(after.events(run.id).filter((entry) => entry.type === "effect_dispatched")).toHaveLength(
			dispatchedbefore + 1,
		);
		await fire(second.handlers, "session_shutdown", { type: "session_shutdown" }, restored);
		await fire(third.handlers, "session_shutdown", { type: "session_shutdown" }, restored);
		after.close();
	});

	test("a restarted forever sleep re-arms its durable deadline", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-sleep-restart-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const first = fakepi();
		Reflect.apply(activate, undefined, [first.api]);
		const owner = context("session-sleep-restart", root);
		const start = first.commands.get("omnipotence-forever");
		if (!start) throw new Error("omnipotence-forever command was not registered");
		const until = new Date(Date.now() + 500).toISOString();
		await start.handler(`delivery.sleep ${JSON.stringify({ until })}`, owner);
		expect(first.messages).toEqual([]);
		await fire(first.handlers, "session_shutdown", { type: "session_shutdown" }, owner);
		const before = new orchestrationstore(paths.dbpath);
		const run = before.getsessionrun("session-sleep-restart");
		if (!run) throw new Error("expected sleep restart run");
		expect(run.mode).toBe("forever");
		const effect = before.geteffectbykey(run.id, "pause");
		if (!effect) throw new Error("expected sleep restart effect");
		expect(effect.kind).toBe("sleep");
		expect(effect.dispatchedat).not.toBeNull();
		before.close();

		const completed = Promise.withResolvers<void>();
		const second = fakepi(undefined, (_type, data) => {
			if (data && typeof data === "object" && "status" in data && data.status === "completed") {
				completed.resolve();
			}
		});
		Reflect.apply(activate, undefined, [second.api]);
		const restored = context("session-sleep-restart", root);
		await fire(second.handlers, "session_start", { type: "session_start" }, restored);
		expect(second.messages).toEqual([]);
		await completed.promise;
		expect(second.messages).toEqual([]);
		const after = new orchestrationstore(paths.dbpath);
		expect(after.getrun(run.id)).toMatchObject({ status: "completed", mode: "forever", output: { done: true } });
		expect(after.geteffect(run.id, effect.id)).toMatchObject({ kind: "sleep", status: "resolved_ok" });
		expect(after.getsessionrun("session-sleep-restart")).toBeNull();
		await fire(second.handlers, "session_shutdown", { type: "session_shutdown" }, restored);
		after.close();
	});

	test("a live extension rebinds a future forever sleep to the newest fence", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-sleep-rebind-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const completions: unknown[] = [];
		const fake = fakepi(undefined, (_type, data) => {
			if (data && typeof data === "object" && "status" in data && data.status === "completed") {
				completions.push(data);
			}
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const oldsession = "session-sleep-rebind-old";
		const newsession = "session-sleep-rebind-new";
		const owner = context(oldsession, root);
		const start = fake.commands.get("omnipotence-forever");
		if (!start) throw new Error("omnipotence-forever command was not registered");
		const until = new Date(Date.now() + 300).toISOString();
		await start.handler(`delivery.sleep ${JSON.stringify({ until })}`, owner);
		expect(fake.messages).toEqual([]);

		const before = new orchestrationstore(paths.dbpath);
		const run = before.getsessionrun(oldsession);
		if (!run) throw new Error("expected sleep rebind run");
		const effect = before.geteffectbykey(run.id, "pause");
		if (!effect) throw new Error("expected sleep rebind effect");
		expect(effect.kind).toBe("sleep");
		expect(effect.dispatchedat).not.toBeNull();
		const oldfence = effect.fence;
		before.reverteffectdispatch(run.id, effect.id, effect.fence);
		expect(before.geteffect(run.id, effect.id)).toMatchObject({
			dispatchingat: null,
			dispatchedat: null,
		});
		const rebound = before.bindsession(newsession, run.id, true);
		expect(rebound.fence).toBe(oldfence + 1);
		expect(before.getrun(run.id)).toMatchObject({ fence: rebound.fence, sessionid: newsession });
		expect(before.geteffect(run.id, effect.id)).toMatchObject({
			kind: "sleep",
			fence: rebound.fence,
			dispatchingat: null,
			dispatchedat: null,
		});
		expect(before.getsessionrun(oldsession)).toBeNull();
		expect(before.getsessionrun(newsession)?.id).toBe(run.id);
		before.close();

		const restored = context(newsession, root);
		await fire(fake.handlers, "session_start", { type: "session_start" }, restored);
		expect(fake.messages).toEqual([]);
		await new Promise<void>((resolve) => setTimeout(resolve, 600));

		const after = new orchestrationstore(paths.dbpath);
		expect(completions).toHaveLength(1);
		expect(after.events(run.id).filter((entry) => entry.type === "effect_resolved")).toHaveLength(1);
		expect(after.geteffect(run.id, effect.id)).toMatchObject({
			kind: "sleep",
			fence: rebound.fence,
			status: "resolved_ok",
		});
		expect(after.getrun(run.id)).toMatchObject({
			status: "completed",
			blockedreason: null,
		});
		expect(after.getsessionrun(oldsession)).toBeNull();
		expect(after.getsessionrun(newsession)).toBeNull();
		expect(fake.messages).toEqual([]);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, restored);
		after.close();
	});

	test("a lease-held future forever sleep retries after ownership is released", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-sleep-lease-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const completions: unknown[] = [];
		const fake = fakepi(undefined, (_type, data) => {
			if (data && typeof data === "object" && "status" in data && data.status === "completed") {
				completions.push(data);
			}
		});
		Reflect.apply(activate, undefined, [fake.api]);
		const sessionid = "session-sleep-lease";
		const ctx = context(sessionid, root);
		const start = fake.commands.get("omnipotence-forever");
		if (!start) throw new Error("omnipotence-forever command was not registered");
		const until = new Date(Date.now() + 200).toISOString();
		await start.handler(`delivery.sleep ${JSON.stringify({ until })}`, ctx);
		expect(fake.messages).toEqual([]);

		const store = new orchestrationstore(paths.dbpath);
		const run = store.getsessionrun(sessionid);
		if (!run) throw new Error("expected sleep lease run");
		const effect = store.geteffectbykey(run.id, "pause");
		if (!effect) throw new Error("expected sleep lease effect");
		const epoch = store.claimrun(run.id, "old-engine", 60_000);
		await new Promise<void>((resolve) => setTimeout(resolve, 300));
		expect(store.getrun(run.id)).toMatchObject({
			status: "waiting_effect",
			blockedreason: null,
			leaseowner: "old-engine",
			leaseepoch: epoch,
		});
		expect(store.geteffect(run.id, effect.id)).toMatchObject({
			kind: "sleep",
			status: "requested",
			fence: effect.fence,
		});
		expect(completions).toHaveLength(0);
		expect(fake.messages).toEqual([]);
		expect(store.releaserun(run.id, "old-engine", epoch)).toBe(true);
		await new Promise<void>((resolve) => setTimeout(resolve, 200));

		expect(completions).toHaveLength(1);
		expect(store.events(run.id).filter((entry) => entry.type === "effect_resolved")).toHaveLength(1);
		expect(store.geteffect(run.id, effect.id)).toMatchObject({
			kind: "sleep",
			status: "resolved_ok",
			fence: effect.fence,
		});
		expect(store.getrun(run.id)).toMatchObject({
			status: "completed",
			blockedreason: null,
		});
		expect(store.getsessionrun(sessionid)).toBeNull();
		expect(fake.messages).toEqual([]);
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		store.close();
	});

	test("immediate shutdown near a sleep deadline leaves no uncaught work", async () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-sleep-shutdown-"));
		roots.push(root);
		const paths = installfixture(root);
		process.env.OMNIPOTENCE_DB = paths.dbpath;
		process.env.OMNIPOTENCE_BLUEPRINTS = paths.blueprintroot;
		const fake = fakepi();
		Reflect.apply(activate, undefined, [fake.api]);
		const ctx = context("session-sleep-shutdown", root);
		const start = fake.commands.get("omnipotence-forever");
		if (!start) throw new Error("omnipotence-forever command was not registered");
		const until = new Date(Date.now() + 500).toISOString();
		await start.handler(`delivery.sleep ${JSON.stringify({ until })}`, ctx);
		const before = new orchestrationstore(paths.dbpath);
		const run = before.getsessionrun("session-sleep-shutdown");
		if (!run) throw new Error("expected sleep shutdown run");
		const effect = before.geteffectbykey(run.id, "pause");
		if (!effect) throw new Error("expected sleep shutdown effect");
		expect(effect.kind).toBe("sleep");
		expect(effect.dispatchedat).not.toBeNull();
		before.close();
		await fire(fake.handlers, "session_shutdown", { type: "session_shutdown" }, ctx);
		// this real wait exercises the extension's private platform timer; fake timers cannot observe its shutdown race.
		await new Promise<void>((resolve) => setTimeout(resolve, 600));
		const after = new orchestrationstore(paths.dbpath);
		expect(after.geteffect(run.id, effect.id)).toMatchObject({
			kind: "sleep",
			status: "requested",
			dispatchingat: null,
		});
		expect(after.geteffect(run.id, effect.id)?.dispatchedat).not.toBeNull();
		expect(after.getsessionrun("session-sleep-shutdown")).toMatchObject({ id: run.id });
		after.close();
	});
});

describe("factory front door", () => {
	function project(name: string): string {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-factory-"));
		roots.push(root);
		const dir = join(root, name);
		mkdirSync(dir, { recursive: true });
		return dir;
	}

	test("resumes an existing project instead of restarting it", () => {
		const dir = project("omp-orca bridge");
		mkdirSync(join(dir, ".factory"), { recursive: true });
		writeFileSync(join(dir, ".factory", "state.json"), "{}\n");
		writeFileSync(join(dir, "final-plan.md"), "# plan\n");

		expect(factoryrequestfor(dir, "")).toEqual({ projectroot: dir, entry: { kind: "resume" } });
		expect(factoryrequestfor("/", dir)).toEqual({ projectroot: dir, entry: { kind: "resume" } });
	});

	test("starts from a plan file a path with spaces still resolves", () => {
		const dir = project("omp-orca bridge");
		const plan = join(dir, "final-plan.md");
		writeFileSync(plan, "# plan\n");

		expect(factoryrequestfor(dir, "")).toEqual({ projectroot: dir, entry: { kind: "spec", value: plan } });
		expect(factoryrequestfor("/", plan)).toEqual({ projectroot: dir, entry: { kind: "spec", value: plan } });
		expect(factoryrequestfor("/", dir)).toEqual({ projectroot: dir, entry: { kind: "spec", value: plan } });
	});

	test("falls back to the only markdown file, then to a typed idea", () => {
		const dir = project("solo");
		const only = join(dir, "notes.md");
		writeFileSync(only, "# notes\n");
		expect(factoryrequestfor(dir, "")).toEqual({ projectroot: dir, entry: { kind: "spec", value: only } });

		const empty = project("empty");
		expect(factoryrequestfor(empty, "build a bridge")).toEqual({
			projectroot: empty,
			entry: { kind: "rough-idea", value: "build a bridge" },
		});
	});

	test("asks for an idea rather than failing when there is nothing to go on", () => {
		expect(factoryrequestfor(project("bare"), "")).toBeNull();
	});

	test("strips flags without eating the target", () => {
		expect(factoryflags("")).toEqual({ preview: false, fresh: false, target: "" });
		expect(factoryflags("--preview")).toEqual({ preview: true, fresh: false, target: "" });
		expect(factoryflags("--fresh ~/omp-orca bridge")).toEqual({
			preview: false,
			fresh: true,
			target: "~/omp-orca bridge",
		});
		expect(factoryflags("~/omp-orca bridge --preview --fresh")).toEqual({
			preview: true,
			fresh: true,
			target: "~/omp-orca bridge",
		});
	});

	test("names a missing path instead of starting a run from a typo", () => {
		const bare = project("bare");
		expect(() => factoryrequestfor(bare, "/no/such/place")).toThrow("no such path");
		expect(factoryrequestfor(bare, "build a ci/cd bridge")).toEqual({
			projectroot: bare,
			entry: { kind: "rough-idea", value: "build a ci/cd bridge" },
		});
	});
});

describe("status line", () => {
	function run(input: unknown, status: string): never {
		return { input, status, processid: "factory.new-project" } as never;
	}
	function effect(key: string): never {
		return { key, status: "requested" } as never;
	}

	test("names whichever project is actually running", () => {
		expect(runsentence(run({ projectRoot: "/home/ada/work/invoice-parser" }, "waiting_for_user"))).toBe(
			"invoice-parser · your turn",
		);
		expect(runsentence(run({ projectRoot: "/srv/tenants/acme crm" }, "waiting_effect"))).toBe("acme crm · working");
		expect(runsentence(run({ projectRoot: "/home/niko/nikos-agent-stack/omp-orca bridge" }, "halted"))).toBe(
			"omp-orca bridge · paused",
		);
	});

	test("falls back to the process id when a run has no project", () => {
		expect(runsentence(run({}, "running"))).toBe("factory.new-project · working");
		expect(runsentence(run(null, "blocked"))).toBe("factory.new-project · blocked");
	});

	test("adds the phase only when an effect is actually requesting one", () => {
		const project = { projectRoot: "/home/ada/work/invoice-parser" };
		expect(runsentence(run(project, "waiting_effect"), [effect("phase/architecture/attempt/0")])).toBe(
			"invoice-parser · architecture · working",
		);
		expect(runsentence(run(project, "waiting_effect"), [effect("bootstrap/state")])).toBe(
			"invoice-parser · working",
		);
	});
});
