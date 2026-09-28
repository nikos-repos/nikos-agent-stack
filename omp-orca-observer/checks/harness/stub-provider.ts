import { createHash } from "node:crypto";
import { appendFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

type TaskCall = {
  name?: string;
  agent?: string;
  task: string;
  solutionSpace: string;
  isolated?: boolean;
};

type ScriptedCall = { tool: "task"; args: TaskCall | { context: string; tasks: TaskCall[] } } | {
  tool: "eval";
  args: { language: "js"; code: string };
};

type Turn = {
  text?: string;
  chunks?: string[];
  delayMs?: number;
  chunkDelayMs?: number;
  calls?: ScriptedCall[];
  fanout?: { count: number; prefix: string; agent: string; isolated?: boolean };
};

/** A scenario owns each agent path's ordered turns; the final user marker HARNESS_AGENT=<path> selects its path. */
export type Scenario = {
  name: string;
  setup: string[];
  settings: Record<string, unknown>;
  agents: string[];
  expected: string[];
  turns: Record<string, Turn[]>;
};

/** The capture file contains request metadata and message digests, never message bodies. */
export type Capture = {
  method: string;
  path: string;
  model: string | null;
  messages: { role: string; byteLength: number; sha256: string }[];
  secret_seen?: boolean;
};

/** Only local callers can reach this scripted server; callers must stop it after their gate. */
export async function startStub(options: {
  scenario: string | Scenario;
  capture: string;
  watch?: string;
}): Promise<{ url: string; stop(): Promise<void> }> {
  const scenario: Scenario = typeof options.scenario === "string"
    ? JSON.parse(await readFile(options.scenario, "utf8")) as Scenario
    : options.scenario;
  const positions = new Map<string, number>();
  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    async fetch(request) {
      const path = new URL(request.url).pathname;
      let body: { model?: unknown; messages?: unknown; stream?: unknown } = {};
      let raw = "";
      let malformed = false;
      if (request.method === "POST" && path === "/v1/chat/completions") {
        try {
          raw = await request.text();
          const parsed: unknown = JSON.parse(raw);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) body = parsed as typeof body;
          else malformed = true;
        } catch {
          malformed = true;
        }
      }
      const messages = Array.isArray(body.messages) ? body.messages : [];
      // The watch file is a JSON array; reload it for every request so gates can change it mid-run.
      const watched = options.watch ? JSON.parse(await readFile(options.watch, "utf8")) as unknown : [];
      if (!Array.isArray(watched) || !watched.every(value => typeof value === "string")) {
        throw new Error("Secret watch must be a JSON string array");
      }
      const secret_seen = options.watch ? watched.filter(Boolean).some(secret => raw.includes(secret)) : undefined;
      const capture: Capture = {
        method: request.method,
        path,
        model: typeof body.model === "string" ? body.model : null,
        messages: messages.map((message: unknown) => {
          const encoded = JSON.stringify(message) ?? "null";
          return {
            role: typeof message === "object" && message !== null && "role" in message
              ? String(message.role) : "unknown",
            byteLength: Buffer.byteLength(encoded),
            sha256: createHash("sha256").update(encoded).digest("hex"),
          };
        }),
        ...(options.watch ? { secret_seen } : {}),
      };
      await appendFile(options.capture, `${JSON.stringify(capture)}\n`);
      if (malformed) return new Response("Invalid JSON", { status: 400 });
      if (request.method === "GET" && path === "/v1/models") {
        return Response.json({ object: "list", data: [{ id: "scripted", object: "model", owned_by: "stub" }] });
      }
      if (request.method !== "POST" || path !== "/v1/chat/completions" || !Array.isArray(body.messages)) {
        return new Response("Not found", { status: 404 });
      }
      const lastUser = [...messages].reverse().find((message): message is { role: string; content: unknown } =>
        typeof message === "object" && message !== null && message.role === "user");
      const userText = typeof lastUser?.content === "string" ? lastUser.content
        : JSON.stringify(lastUser?.content ?? "") ?? "";
      const agentPath = /HARNESS_AGENT=([A-Za-z0-9_/-]+)/.exec(userText)?.[1];
      if (!agentPath) return new Response("Unscripted agent", { status: 409 });
      const turns = scenario.turns[agentPath] ?? scenario.turns[`${agentPath.split("/")[0]}/*`];
      if (!turns) return new Response("Unscripted agent", { status: 409 });
      const position = positions.get(agentPath) ?? 0;
      const turn = turns[position];
      if (!turn) return new Response("Unscripted turn", { status: 409 });
      positions.set(agentPath, position + 1);
      if (turn.delayMs) await Bun.sleep(turn.delayMs);
      const id = `chatcmpl-${scenario.name}-${agentPath.replaceAll("/", "-")}-${position}`;
      const model = typeof body.model === "string" ? body.model : "scripted";
      const chunks: object[] = [];
      const delta = (value: object, finish_reason: string | null = null) => ({
        id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model,
        choices: [{ index: 0, delta: value, finish_reason }],
      });
      chunks.push(delta({ role: "assistant" }));
      for (const text of turn.chunks ?? (turn.text === undefined ? [] : [turn.text])) {
        chunks.push(delta({ content: text }));
      }
      const calls: ScriptedCall[] = [...turn.calls ?? []];
      if (turn.fanout) {
        const { count, prefix, agent, isolated } = turn.fanout;
        calls.push({
          tool: "task", args: {
            context: "Run each assigned harness child independently.",
            tasks: Array.from({ length: count }, (_, index) => ({
              name: `${prefix}${index + 1}`, agent,
              task: `HARNESS_AGENT=child/${prefix}${index + 1} complete the harness assignment.`,
              solutionSpace: "Reply with the assigned child's result.",
              ...(isolated === undefined ? {} : { isolated }),
            })),
          }
        });
      }
      const toolCalls = calls.map((call, index) => ({
        index,
        id: `${id}-call-${index}`,
        type: "function" as const,
        function: { name: call.tool, arguments: JSON.stringify(call.args) },
      }));
      if (toolCalls?.length) chunks.push(delta({ tool_calls: toolCalls }));
      chunks.push(delta({}, toolCalls?.length ? "tool_calls" : "stop"));
      if (body.stream === false) {
        return Response.json({
          id, object: "chat.completion", created: Math.floor(Date.now() / 1000), model,
          choices: [{
            index: 0, message: {
              role: "assistant", content: turn.text ?? turn.chunks?.join("") ?? null,
              ...(toolCalls?.length ? { tool_calls: toolCalls.map(({ index: _index, ...call }) => call) } : {})
            },
            finish_reason: toolCalls?.length ? "tool_calls" : "stop"
          }],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
        });
      }
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          for (const chunk of chunks) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            if (turn.chunkDelayMs) await Bun.sleep(turn.chunkDelayMs);
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
      });
    },
  });
  return { url: `http://127.0.0.1:${server.port}/v1`, async stop() { await server.stop(true); } };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const flag = (name: string): string => {
    const index = process.argv.indexOf(name);
    const value = process.argv[index + 1];
    if (index < 0 || !value || value.startsWith("--")) {
      throw new Error(`Expected ${name} <file>`);
    }
    return value;
  };
  const server = await startStub({
    scenario: flag("--scenario"), capture: flag("--capture"),
    ...(process.argv.includes("--watch") ? { watch: flag("--watch") } : {}),
  });
  console.log(server.url);
  process.on("SIGTERM", () => { void server.stop().then(() => process.exit(0)); });
}
