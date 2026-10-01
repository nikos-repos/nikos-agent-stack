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
} | {
  tool: "yield";
  args: { type: string };
} | {
  tool: "read";
  args: { path: string };
};

type Turn = {
  text?: string;
  chunks?: string[];
  delayMs?: number;
  chunkDelayMs?: number;
  calls?: ScriptedCall[];
  fanout?: { count: number; prefix: string; agent: string; isolated?: boolean };
};

/** A scenario owns each agent path's ordered turns; the last user message carrying HARNESS_AGENT=<path> selects its path (main-session guidance may follow it). */
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
  agent: string | null;
  status: number;
  messages: { role: string; byteLength: number; sha256: string }[];
  secret_seen?: boolean;
};
function containsString(value: unknown, secret: string): boolean {
  if (typeof value === "string") return value.includes(secret);
  if (Array.isArray(value)) return value.some(item => containsString(item, secret));
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some(item => containsString(item, secret));
  }
  return false;
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  const { promise, resolve, reject } = Promise.withResolvers<void>();
  let timer: ReturnType<typeof setTimeout>;
  const abort = () => {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
    reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  };
  timer = setTimeout(() => {
    signal.removeEventListener("abort", abort);
    resolve();
  }, milliseconds);
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  return promise;
}

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
  const stopController = new AbortController();
  const inFlight = new Set<Promise<unknown>>();
  let auxiliaryPosition = 0;

  const track = <T>(promise: Promise<T>): Promise<T> => {
    inFlight.add(promise);
    void promise.then(
      () => inFlight.delete(promise),
      () => inFlight.delete(promise),
    );
    return promise;
  };

  async function handleRequest(request: Request): Promise<Response> {
    const requestController = new AbortController();
    const signal = AbortSignal.any([stopController.signal, request.signal, requestController.signal]);
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
    const watched = options.watch ? JSON.parse(await readFile(options.watch, "utf8")) as unknown : [];
    if (!Array.isArray(watched) || !watched.every(value => typeof value === "string")) {
      throw new Error("Secret watch must be a JSON string array");
    }
    const secret_seen = options.watch
      ? watched.some(secret => secret.length > 0 && containsString(body, secret))
      : undefined;
    const model = typeof body.model === "string" ? body.model : "scripted";
    const lastUser = [...messages].reverse().find((message): message is { role: string; content: unknown } =>
      typeof message === "object" && message !== null && message.role === "user" && (JSON.stringify(message.content) ?? "").includes("HARNESS_AGENT="));
    const userText = typeof lastUser?.content === "string" ? lastUser.content
      : JSON.stringify(lastUser?.content ?? "") ?? "";
    const agentPath = model === "advisor" ? "advisor"
      : model === "scripted" ? /HARNESS_AGENT=([A-Za-z0-9_/-]+)/.exec(userText)?.[1]
        : undefined;
    const capture: Omit<Capture, "status"> = {
      method: request.method,
      path,
      model: typeof body.model === "string" ? body.model : null,
      agent: agentPath ?? null,
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
    const respond = async (response: Response): Promise<Response> => {
      await appendFile(options.capture, `${JSON.stringify({ ...capture, status: response.status })}\n`);
      return response;
    };
    if (malformed) return respond(new Response("Invalid JSON", { status: 400 }));
    if (request.method === "GET" && path === "/v1/models") {
      return respond(Response.json({
        object: "list",
        data: ["scripted", "aux", "advisor"].map(id => ({ id, object: "model", owned_by: "stub" })),
      }));
    }
    if (request.method !== "POST" || path !== "/v1/chat/completions") {
      return respond(new Response("Not found", { status: 404 }));
    }
    if (!Array.isArray(body.messages) || body.stream !== true) {
      return respond(new Response("Streaming requests required", { status: 400 }));
    }

    let position: number;
    let turn: Turn | undefined;
    if (model === "aux") {
      position = auxiliaryPosition++;
      turn = { text: "Harness auxiliary reply" };
    } else if (model === "advisor") {
      const turns = scenario.turns.advisor;
      if (!turns) {
        position = auxiliaryPosition++;
        turn = { text: "Harness advisor reply" };
      } else {
        position = positions.get(agentPath!) ?? 0;
        turn = turns[position];
        if (!turn) return respond(new Response("Unscripted turn", { status: 409 }));
        positions.set(agentPath!, position + 1);
      }
    } else if (model === "scripted") {
      if (!agentPath) return respond(new Response("Unscripted agent", { status: 409 }));
      const turns = scenario.turns[agentPath] ?? scenario.turns[`${agentPath.split("/")[0]}/*`];
      if (!turns) return respond(new Response("Unscripted agent", { status: 409 }));
      position = positions.get(agentPath) ?? 0;
      turn = turns[position];
      if (!turn) return respond(new Response("Unscripted turn", { status: 409 }));
      positions.set(agentPath, position + 1);
    } else {
      return respond(new Response("Unknown model", { status: 400 }));
    }

    try {
      if (turn.delayMs) await delay(turn.delayMs, signal);
    } catch (error) {
      if (!signal.aborted) throw error;
      return respond(new Response("Request aborted", { status: 503 }));
    }
    const id = `chatcmpl-${scenario.name}-${agentPath?.replaceAll("/", "-") ?? model}-${position}`;
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
    if (toolCalls.length) chunks.push(delta({ tool_calls: toolCalls }));
    chunks.push(delta({}, toolCalls.length ? "tool_calls" : "stop"));

    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const producer = (async () => {
          const encoder = new TextEncoder();
          try {
            for (const chunk of chunks) {
              if (signal.aborted) {
                if (!cancelled) controller.close();
                return;
              }
              controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
              if (turn.chunkDelayMs) await delay(turn.chunkDelayMs, signal);
            }
            if (signal.aborted) {
              if (!cancelled) controller.close();
              return;
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch (error) {
            if (signal.aborted) {
              if (!cancelled) controller.close();
            } else {
              controller.error(error);
            }
          }
        })();
        return track(producer);
      },
      cancel() {
        cancelled = true;
        requestController.abort();
      },
    });
    return respond(new Response(stream, {
      headers: { "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache" },
    }));
  }

  const server = Bun.serve({
    hostname: "127.0.0.1",
    port: 0,
    fetch(request) {
      return track(handleRequest(request));
    },
  });
  return {
    url: `http://127.0.0.1:${server.port}/v1`,
    async stop() {
      stopController.abort();
      await server.stop(true);
      while (inFlight.size > 0) await Promise.all([...inFlight]);
    },
  };
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
