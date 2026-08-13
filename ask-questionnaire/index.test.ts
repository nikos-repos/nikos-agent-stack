import { expect, test } from "bun:test";
import askQuestionnaire, { initiatesNewProject } from "./index.ts";

// --- fake extension api -----------------------------------------------------
//
// captures pi.on(...) registrations and replays documented event payloads
// through the handlers. tests observe state transitions through the handlers'
// observable return values (block/allow, injected message, continuation),
// never through the extension's internal closure.

type Handler = (event: any, ctx?: any) => any | Promise<any>;

class FakeApi {
	private handlers = new Map<string, Handler[]>();

	on(event: string, handler: Handler): void {
		const list = this.handlers.get(event) ?? [];
		list.push(handler);
		this.handlers.set(event, list);
	}

	async run<T = any>(event: string, payload: any): Promise<T | undefined> {
		const list = this.handlers.get(event);
		if (!list) return undefined;
		let result: any;
		for (const handler of list) {
			const value = await handler(payload);
			if (value !== undefined && result === undefined) result = value;
		}
		return result as T | undefined;
	}
}

async function harness() {
	const api = new FakeApi();
	askQuestionnaire(api as any);
	return api;
}

function send(api: FakeApi, text: string, source: "interactive" | "rpc" | "extension" = "interactive") {
	return api.run("input", { type: "input", text, source });
}

function callTool(api: FakeApi, toolName: string) {
	return api.run<{ block?: boolean; reason?: string }>("tool_call", { toolName, toolCallId: "1", input: {} });
}

function toolResult(api: FakeApi, toolName: string, isError: boolean) {
	return api.run("tool_result", { toolName, toolCallId: "1", input: {}, content: [], isError });
}

// --- detector ---------------------------------------------------------------

test("initiatesNewProject detects direct new-project requests", () => {
	expect(initiatesNewProject("create a new app")).toBe(true);
	expect(initiatesNewProject("build me a rest api")).toBe(true);
	expect(initiatesNewProject("set up our brand new dashboard")).toBe(true);
	expect(initiatesNewProject("scaffold a cli tool")).toBe(true);
	expect(initiatesNewProject("initialize my website")).toBe(true);
	expect(initiatesNewProject("start a new repository")).toBe(true);
});

test("initiatesNewProject rejects ordinary requests", () => {
	expect(initiatesNewProject("read the readme and summarize it")).toBe(false);
	expect(initiatesNewProject("fix the auth bug in login.ts")).toBe(false);
	expect(initiatesNewProject("explain how the parser works")).toBe(false);
	expect(initiatesNewProject("")).toBe(false);
});

// --- arming and blocking ----------------------------------------------------

test("a direct new-project input arms blocking for every non-ask tool", async () => {
	const api = await harness();
	await send(api, "create a new web app");

	const blocked = await callTool(api, "bash");
	expect(blocked?.block).toBe(true);

	const writeBlocked = await callTool(api, "write");
	expect(writeBlocked?.block).toBe(true);
});

test("ask is the only allowed tool while pending", async () => {
	const api = await harness();
	await send(api, "build me a library");

	const ask = await callTool(api, "ask");
	expect(ask?.block).toBeUndefined();
});

test("no tool is blocked when the request is not a new project", async () => {
	const api = await harness();
	await send(api, "refactor the login module");

	const result = await callTool(api, "bash");
	expect(result?.block).toBeUndefined();
});

test("extension-originated input never arms the workflow", async () => {
	const api = await harness();
	await send(api, "create a new app", "extension");

	const blocked = await callTool(api, "bash");
	expect(blocked?.block).toBeUndefined();
});

// --- guidance injection -----------------------------------------------------

test("before_agent_start injects guidance only while pending", async () => {
	const api = await harness();

	const beforeArm = await api.run<{ message?: { content: string } }>("before_agent_start", { type: "before_agent_start", prompt: "hello" });
	expect(beforeArm).toBeUndefined();

	await send(api, "create a new service");
	const armed = await api.run<{ message?: { content: string; customType: string; display?: boolean } }>("before_agent_start", { type: "before_agent_start", prompt: "create a new service" });
	expect(armed?.message?.content).toContain("batched questionnaire");
	expect(armed?.message?.display).toBe(false);
});

// --- ask result clearing ----------------------------------------------------

test("a failed ask keeps the request pending", async () => {
	const api = await harness();
	await send(api, "build a plugin");

	await toolResult(api, "ask", true);

	const blocked = await callTool(api, "write");
	expect(blocked?.block).toBe(true);
});

test("a successful ask clears the request and unblocks tools", async () => {
	const api = await harness();
	await send(api, "build a plugin");

	await toolResult(api, "ask", false);

	const allowed = await callTool(api, "write");
	expect(allowed?.block).toBeUndefined();
	const bash = await callTool(api, "bash");
	expect(bash?.block).toBeUndefined();
});

test("a non-ask tool result never clears the request", async () => {
	const api = await harness();
	await send(api, "build a plugin");

	await toolResult(api, "bash", false);

	const blocked = await callTool(api, "write");
	expect(blocked?.block).toBe(true);
});

// --- session stop continuation ----------------------------------------------

test("session_stop continues with guidance while pending", async () => {
	const api = await harness();
	await send(api, "create a new website");

	const stop = await api.run<{ continue?: boolean; additionalContext?: string }>("session_stop", { type: "session_stop", stop_hook_active: false });
	expect(stop?.continue).toBe(true);
	expect(stop?.additionalContext).toContain("batched questionnaire");
});

test("session_stop does not continue once ask succeeded", async () => {
	const api = await harness();
	await send(api, "create a new website");
	await toolResult(api, "ask", false);

	const stop = await api.run<{ continue?: boolean }>("session_stop", { type: "session_stop", stop_hook_active: false });
	expect(stop?.continue).toBeUndefined();
});

test("session_stop does not continue when not armed", async () => {
	const api = await harness();
	await send(api, "explain the codebase");

	const stop = await api.run<{ continue?: boolean }>("session_stop", { type: "session_stop", stop_hook_active: false });
	expect(stop?.continue).toBeUndefined();
});

// --- lifecycle reset --------------------------------------------------------

test("session_switch clears the pending request", async () => {
	const api = await harness();
	await send(api, "create a new app");

	await api.run("session_switch", { type: "session_switch", previousSessionFile: undefined });

	const blocked = await callTool(api, "bash");
	expect(blocked?.block).toBeUndefined();
});

test("session_branch clears the pending request", async () => {
	const api = await harness();
	await send(api, "create a new app");

	await api.run("session_branch", { type: "session_branch", previousSessionFile: undefined });

	const blocked = await callTool(api, "bash");
	expect(blocked?.block).toBeUndefined();
});

test("session_start clears the pending request", async () => {
	const api = await harness();
	await send(api, "create a new app");

	await api.run("session_start", { type: "session_start" });

	const blocked = await callTool(api, "bash");
	expect(blocked?.block).toBeUndefined();
});
