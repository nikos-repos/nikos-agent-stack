import { beforeEach, expect, test } from "bun:test";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import askQuestionnaire, { questionnaireStop } from "./index.ts";
import { resetQuestionnaireStop } from "./stop-decision.ts";

// --- fake extension api -----------------------------------------------------
//
// captures pi.on(...) registrations and the questionnaire_open tool, then
// replays documented event payloads through the handlers' observable return
// values (block/allow, injected message, continuation), never through the
// extension's internal closure.

type Handler = (event: unknown, ctx?: unknown) => unknown | Promise<unknown>;

type RegisteredTool = {
	name: string;
	execute: (...args: unknown[]) => Promise<unknown>;
};

type QuestionnaireResult = {
	content: Array<{ type: "text"; text: string }>;
	isError?: boolean;
};

const zodSchema: { describe: () => unknown } = {
	describe() {
		return zodSchema;
	},
};

function isRegisteredTool(value: unknown): value is RegisteredTool {
	if (value === null || typeof value !== "object") return false;
	if (!("name" in value) || !("execute" in value)) return false;
	return typeof value.name === "string" && typeof value.execute === "function";
}

class FakeApi {
	private handlers = new Map<string, Handler[]>();
	private tools = new Map<string, RegisteredTool>();

	readonly zod = {
		object: (_shape: unknown) => zodSchema,
		string: () => zodSchema,
	};

	on(event: string, handler: Handler): void {
		const list = this.handlers.get(event) ?? [];
		list.push(handler);
		this.handlers.set(event, list);
	}

	registerTool(tool: unknown): void {
		if (!isRegisteredTool(tool)) throw new Error("invalid tool registration");
		this.tools.set(tool.name, tool);
	}

	async run<T = unknown>(event: string, payload: unknown): Promise<T | undefined> {
		const list = this.handlers.get(event);
		if (!list) return undefined;
		let result: unknown;
		for (const handler of list) {
			const value = await handler(payload);
			if (value !== undefined && result === undefined) result = value;
		}
		return result as T | undefined;
	}

	async executeTool<T = unknown>(name: string, params: Record<string, unknown>): Promise<T> {
		const tool = this.tools.get(name);
		if (!tool) throw new Error(`missing tool ${name}`);
		const result = await tool.execute("tool-call", params, undefined, undefined, undefined);
		return result as T;
	}
}

async function harness() {
	const api = new FakeApi();
	// The fake implements only the methods exercised by this extension.
	askQuestionnaire(api as unknown as ExtensionAPI);
	return api;
}

function callTool(api: FakeApi, toolName: string) {
	return api.run<{ block?: boolean; reason?: string }>("tool_call", { toolName, toolCallId: "1", input: {} });
}

function toolResult(api: FakeApi, toolName: string, isError: boolean) {
	return api.run("tool_result", { toolName, toolCallId: "1", input: {}, content: [], isError });
}

async function openQuestionnaire(api: FakeApi, owner: string, reason: string): Promise<QuestionnaireResult> {
	const gate = await callTool(api, "questionnaire_open");
	if (gate?.block) throw new Error("questionnaire_open was blocked while declaring an interview");
	return api.executeTool<QuestionnaireResult>("questionnaire_open", { owner, reason });
}

beforeEach(() => {
	resetQuestionnaireStop();
});

// --- declaration and blocking ----------------------------------------------

test("a declared questionnaire allows read-only tools and blocks writes", async () => {
	const api = await harness();
	const reason = "settle the product scope before discovery starts";
	await openQuestionnaire(api, "factory-discovery", reason);

	const read = await callTool(api, "read");
	expect(read?.block).toBeUndefined();

	const write = await callTool(api, "write");
	expect(write?.block).toBe(true);
	expect(write?.reason).toBe(reason);

	const futureMutation = await callTool(api, "future_mutation");
	expect(futureMutation?.block).toBe(true);
});

test("with no declaration, an ordinary coding turn arms nothing", async () => {
	const api = await harness();
	await api.run("input", { type: "input", text: "refactor the login module", source: "interactive" });

	const write = await callTool(api, "write");
	expect(write?.block).toBeUndefined();
	expect(await questionnaireStop({}, {})).toBeUndefined();
});

test("a different owner is refused and leaves the pending questionnaire unchanged", async () => {
	const api = await harness();
	const reason = "settle the project constraints";
	await openQuestionnaire(api, "factory-discovery", reason);

	const refused = await openQuestionnaire(api, "factory-recon", "replace the project constraints");
	expect(refused.isError).toBe(true);
	expect(refused.content[0].text).toBe("questionnaire already open for factory-discovery");

	const decision = await questionnaireStop({}, {});
	expect(decision).toEqual({ continue: true, additionalContext: reason });
});

test("a same-owner retry leaves owner and reason byte-identical", async () => {
	const api = await harness();
	const reason = "settle the project constraints";
	await openQuestionnaire(api, "factory-discovery", reason);

	const retry = await openQuestionnaire(api, "factory-discovery", "silently replace the reason");
	expect(retry.content[0].text).toBe("already open");

	const refused = await openQuestionnaire(api, "factory-recon", "another reason");
	expect(refused.isError).toBe(true);
	expect(refused.content[0].text).toBe("questionnaire already open for factory-discovery");

	const decision = await questionnaireStop({}, {});
	expect(decision).toEqual({ continue: true, additionalContext: reason });
});

// --- guidance injection -----------------------------------------------------

test("before_agent_start injects the declaring reason only while pending", async () => {
	const api = await harness();

	const beforeArm = await api.run<{ message?: { content: string } }>("before_agent_start", { type: "before_agent_start", prompt: "hello" });
	expect(beforeArm).toBeUndefined();

	const reason = "settle the interview questions before planning";
	await openQuestionnaire(api, "factory-discovery", reason);
	const armed = await api.run<{ message?: { content: string; customType: string; display?: boolean } }>("before_agent_start", { type: "before_agent_start", prompt: "continue" });
	expect(armed?.message?.content).toBe(reason);
	expect(armed?.message?.display).toBe(false);
	// omp normalises an absent attribution to "agent", so the extension does not
	// restate it.
	expect("attribution" in (armed?.message ?? {})).toBe(false);
});

// --- ask result clearing ----------------------------------------------------

test("a failed ask keeps the questionnaire pending", async () => {
	const api = await harness();
	const reason = "settle the project constraints";
	await openQuestionnaire(api, "factory-discovery", reason);

	await toolResult(api, "ask", true);

	const blocked = await callTool(api, "write");
	expect(blocked?.block).toBe(true);
	expect((await questionnaireStop({}, {}))?.additionalContext).toBe(reason);
});

test("a successful ask clears the questionnaire and unblocks tools", async () => {
	const api = await harness();
	await openQuestionnaire(api, "factory-discovery", "settle the project constraints");

	await toolResult(api, "ask", false);

	const write = await callTool(api, "write");
	expect(write?.block).toBeUndefined();
	expect(await questionnaireStop({}, {})).toBeUndefined();
});

test("a non-ask tool result never clears the questionnaire", async () => {
	const api = await harness();
	await openQuestionnaire(api, "factory-discovery", "settle the project constraints");

	await toolResult(api, "bash", false);

	const blocked = await callTool(api, "write");
	expect(blocked?.block).toBe(true);
});

// --- continuation decision --------------------------------------------------

test("questionnaireStop continues with the declaring reason while pending", async () => {
	const api = await harness();
	const reason = "settle the project constraints";
	await openQuestionnaire(api, "factory-discovery", reason);

	const decision = await questionnaireStop({}, {});
	expect(decision).toEqual({ continue: true, additionalContext: reason });
});

test("questionnaireStop does not continue after a successful ask", async () => {
	const api = await harness();
	await openQuestionnaire(api, "factory-discovery", "settle the project constraints");
	await toolResult(api, "ask", false);

	expect(await questionnaireStop({}, {})).toBeUndefined();
});

test("questionnaireStop does not continue when nothing was declared", async () => {
	const api = await harness();

	expect(await questionnaireStop({}, {})).toBeUndefined();
});

// --- lifecycle reset --------------------------------------------------------

test("session_switch clears the pending questionnaire", async () => {
	const api = await harness();
	await openQuestionnaire(api, "factory-discovery", "settle the project constraints");

	await api.run("session_switch", { type: "session_switch", previousSessionFile: undefined });

	const write = await callTool(api, "write");
	expect(write?.block).toBeUndefined();
});

test("session_branch clears the pending questionnaire", async () => {
	const api = await harness();
	await openQuestionnaire(api, "factory-discovery", "settle the project constraints");

	await api.run("session_branch", { type: "session_branch", previousSessionFile: undefined });

	const write = await callTool(api, "write");
	expect(write?.block).toBeUndefined();
});

test("session_start clears the pending questionnaire", async () => {
	const api = await harness();
	await openQuestionnaire(api, "factory-discovery", "settle the project constraints");

	await api.run("session_start", { type: "session_start" });

	const write = await callTool(api, "write");
	expect(write?.block).toBeUndefined();
});
