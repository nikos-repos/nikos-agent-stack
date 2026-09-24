// per-task token cost from omp's stats.db. a task is one user message in a main session; it owns
// every main, subagent, and advisor request of that session tree until the next user message.
// run `omp stats -s` first so stats.db has ingested the latest session files.
//
//   bun token-efficiency/measure.ts [--since 7d|YYYY-MM-DD] [--until YYYY-MM-DD] [--folder <session folder>]
import { Database } from "bun:sqlite";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { parseArgs } from "node:util";

const { values: args } = parseArgs({
  options: { since: { type: "string", default: "30d" }, until: { type: "string" }, folder: { type: "string" } },
});
const toMs = (value: string): number => {
  const days = /^(\d+)d$/.exec(value);
  return days ? Date.now() - Number(days[1]) * 86_400_000 : Date.parse(value);
};
const since = toMs(args.since);
const until = args.until ? toMs(args.until) : Date.now();
const db = new Database(process.env.OMP_STATS_DB ?? join(homedir(), ".omp/stats.db"), { readonly: true });
const folder = args.folder ?? null;

type Request = {
  session_file: string;
  agent_type: string;
  timestamp: number;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
  cost_input: number;
  cost_output: number;
  cost_cache_read: number;
  cost_cache_write: number;
};
const requests = db
  .query(
    `select session_file, agent_type, timestamp, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
       cost_input, cost_output, cost_cache_read, cost_cache_write
     from messages where timestamp >= ?1 and timestamp < ?2 and (?3 is null or folder = ?3) order by timestamp`,
  )
  .all(since, until, folder) as Request[];
const mainSessions = new Set(requests.filter((r) => r.agent_type === "main").map((r) => r.session_file));
// a child session file lives in a directory named after its parent's stem:
// <stem>.jsonl owns <stem>/<child>.jsonl, which owns <stem>/<child>/<grandchild>.jsonl.
const rootOf = (file: string): string | null => {
  for (let current = file; ; ) {
    if (mainSessions.has(current)) return current;
    const parent = `${dirname(current)}.jsonl`;
    if (parent === current) return null;
    current = parent;
  }
};
const starts = new Map<string, number[]>();
for (const row of db
  .query(`select session_file, timestamp from user_messages where timestamp >= ?1 and timestamp < ?2 order by timestamp`)
  .all(since, until) as { session_file: string; timestamp: number }[])
  if (mainSessions.has(row.session_file)) starts.set(row.session_file, [...(starts.get(row.session_file) ?? []), row.timestamp]);

type Task = { cost: number; mainTurns: number };
const tasks = new Map<string, Task>();
const billing = new Map<string, number[]>(); // agent type -> [$in, $out, $cacheRead, $cacheWrite, tokIn, tokCacheRead, tokCacheWrite]
let bigContextCost = 0;
let mainCost = 0;
for (const r of requests) {
  const cost = r.cost_input + r.cost_output + r.cost_cache_read + r.cost_cache_write;
  const b = billing.get(r.agent_type) ?? [0, 0, 0, 0, 0, 0, 0];
  [r.cost_input, r.cost_output, r.cost_cache_read, r.cost_cache_write, r.input_tokens, r.cache_read_tokens, r.cache_write_tokens].forEach(
    (value, i) => (b[i] += value),
  );
  billing.set(r.agent_type, b);
  if (r.agent_type === "main") {
    mainCost += cost;
    if (r.input_tokens + r.cache_read_tokens + r.cache_write_tokens > 200_000) bigContextCost += cost;
  }
  const root = rootOf(r.session_file);
  const taskStarts = root ? starts.get(root) : undefined;
  if (!root || !taskStarts) continue;
  const index = taskStarts.findLastIndex((ts) => ts <= r.timestamp);
  if (index < 0) continue;
  const task = tasks.get(`${root}#${index}`) ?? { cost: 0, mainTurns: 0 };
  task.cost += cost;
  if (r.agent_type === "main") task.mainTurns += 1;
  tasks.set(`${root}#${index}`, task);
}

const sorted = (values: number[]) => [...values].sort((a, b) => a - b);
const at = (values: number[], q: number) => values[Math.min(values.length - 1, Math.floor(q * values.length))] ?? 0;
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / Math.max(1, values.length);
const costs = sorted([...tasks.values()].map((t) => t.cost));
const turns = sorted([...tasks.values()].map((t) => t.mainTurns));
const total = [...billing.values()].reduce((sum, b) => sum + b[0] + b[1] + b[2] + b[3], 0);
const usd = (value: number) => `$${value.toFixed(2)}`;
const pct = (value: number, of: number) => `${((100 * value) / Math.max(of, 1e-9)).toFixed(1)}%`;

console.log(`window ${new Date(since).toISOString().slice(0, 10)} .. ${new Date(until).toISOString().slice(0, 10)}${folder ? ` folder ${folder}` : ""}`);
console.log(`tasks ${tasks.size}  cost/task mean ${usd(mean(costs))} median ${usd(at(costs, 0.5))} p90 ${usd(at(costs, 0.9))}`);
console.log(`main turns/task mean ${mean(turns).toFixed(1)} median ${at(turns, 0.5)} p90 ${at(turns, 0.9)}`);
console.log(`total ${usd(total)}  main requests >200k context: ${pct(bigContextCost, mainCost)} of main cost`);
console.log("agent       share   $input  $output $cacheRd $cacheWr  cache-hit");
for (const [agent, b] of [...billing].sort((x, y) => y[1][2] + y[1][0] - (x[1][2] + x[1][0]))) {
  const spend = b[0] + b[1] + b[2] + b[3];
  const hit = pct(b[5], b[4] + b[5] + b[6]);
  console.log(
    `${agent.padEnd(10)} ${pct(spend, total).padStart(6)} ${[b[0], b[1], b[2], b[3]].map((v) => usd(v).padStart(8)).join(" ")} ${hit.padStart(10)}`,
  );
}
const tools = db
  .query(
    `select agent_type, tool_name, count(distinct session_file) sessions, count(*) calls, sum(coalesce(is_error, 0)) errors
     from tool_calls where timestamp >= ?1 and timestamp < ?2 and (?3 is null or folder = ?3)
     group by 1, 2 order by 1, 3 desc`,
  )
  .all(since, until, folder) as { agent_type: string; tool_name: string; sessions: number; calls: number; errors: number }[];
const sessionsBy = new Map<string, number>();
for (const row of db
  .query(
    `select agent_type, count(distinct session_file) n from messages
     where timestamp >= ?1 and timestamp < ?2 and (?3 is null or folder = ?3) group by 1`,
  )
  .all(since, until, folder) as { agent_type: string; n: number }[])
  sessionsBy.set(row.agent_type, row.n);
console.log("agent      tool                 sessions%   calls  error%");
for (const t of tools)
  console.log(
    `${t.agent_type.padEnd(10)} ${t.tool_name.padEnd(20)} ${pct(t.sessions, sessionsBy.get(t.agent_type) ?? 1).padStart(9)} ${String(t.calls).padStart(7)} ${pct(t.errors, t.calls).padStart(7)}`,
  );
