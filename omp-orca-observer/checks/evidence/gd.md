# gd — package digest, v13 per-release smoke, release record

Date: 2026-10-02. Evidence-only gate; this worker owns only this file. Recovery baseline: this file was absent (`read` returned `Path not found`). Production failures are recorded, not fixed. Commands below use repository-relative working directories; disposable paths are normalized to `<tmp>`, the operator home to `HOME`, and runtime ports to `<port>`. No live profile or credential is used by this worker.

## package digest

First command, working directory `omp-orca-observer/`:

```text
bun pm pack
bun pack v1.3.14 (0d9b296a)
error: package.json must have `name` and `version` fields
exitCode=1
```

Observed cause at the first attempt: the inspected package metadata had `name: omp-orca-observer` but no `version` field. No tarball was produced by that attempt. The orchestrator then reported Niko's approval and added the one-line `"version": "0.1.0"` field (uncommitted; commit pending). This worker re-read that metadata and packed those approved bytes; no alternate digest method or metadata edit was performed by this worker.

Reference receipt after the orchestrator's approved version fix, working directory `omp-orca-observer/`:

```text
bun pm pack
bun pack v1.3.14 (0d9b296a)
packed 394B package.json
packed 6.91KB auth.ts
packed 10.86KB commands.ts
packed 2.26KB compat.ts
packed 9.1KB contract.ts
packed 5.14KB coordinator.ts
packed 1.92KB guidance.ts
packed 5.61KB index.ts
packed 3.74KB outcomes.ts
packed 7.1KB reader.ts
packed 12.90KB stock-source.ts
packed 9.51KB transport.ts
packed 23.87KB viewer/index.html
omp-orca-observer-0.1.0.tgz
Total files: 13
Shasum: e82c8485d879ddb133cba4df88b18a3afb622a6f
Integrity: sha512-yTQPnjxS7u6/8[...]zDKssGvaGuyyA==
Unpacked size: 99.27KB
Packed size: 26.36KB
exitCode=0

sha256sum omp-orca-observer-0.1.0.tgz
7ea2a73a6cda54e018f7fd8152648ec84e138838730d326e4884871155dca153  omp-orca-observer-0.1.0.tgz
exitCode=0

tar -tzf omp-orca-observer-0.1.0.tgz
package/package.json
package/auth.ts
package/commands.ts
package/compat.ts
package/contract.ts
package/coordinator.ts
package/guidance.ts
package/index.ts
package/outcomes.ts
package/reader.ts
package/stock-source.ts
package/transport.ts
package/viewer/index.html
exitCode=0

rm -- omp-orca-observer-0.1.0.tgz
exitCode=0; no output
```

**Reference SHA-256:** `7ea2a73a6cda54e018f7fd8152648ec84e138838730d326e4884871155dca153`. This is the tarball's digest, not the unpacked tree or a replacement hash.

## real-provider run

### launcher and guard

Purpose: run the observer against one disposable omp profile, confine the provider credential to that disposable store, and enforce four checks before every prompt.

Guard checks:

1. Profile/model: all 15 role keys (default smol slow vision plan commit tiny memory task advisor image web speech dictation judge) resolve to openai-codex/gpt-5.6-terra; enabledModels is exactly that singleton; cache warming is off; no task model overrides or retry fallback chains exist; no models.yml/json exists; both agent files select the target.
2. Pane/environment: pane executable realpath equals realpath(which omp); pane environment names are exactly PATH, TERM, LANG, HOME, TMPDIR, XDG_CONFIG_HOME, XDG_CACHE_HOME, XDG_DATA_HOME, XDG_STATE_HOME with values equal to env.json; descendants have no ORCA_* and no API-key, token, secret, OpenAI, Anthropic, Codex, Azure, Gemini, or Google-like names.
3. Live store: live HOME/.omp/agent/agent.db sha256, mtimeNs, and size equal the saved baseline.
4. Credentials: every disposable-root *.db has exactly one auth_credentials row in total, provider openai-codex.

Review fixed F1: netprobe counted URLs from response headers such as CSP as requests; F2: credential guard counted provider groups rather than rows; F3: send could block 900 seconds on an unref'ed watchdog; F4: probe pane-executable verification recorded null. Final gd.ts SHA-256: 8ee68fe8cdff5c06aba52b038a4ff953b2ca78cd85a575980d3aee6a1b04fbd3; first unused version SHA-256: 34a0ccc619527fb70e1e6b298c848606da29342933bf5bc9e5097596721652cb.

The normalized embedded launcher is byte-identical to the original: original SHA-256 8ee68fe8cdff5c06aba52b038a4ff953b2ca78cd85a575980d3aee6a1b04fbd3; embedded SHA-256 8ee68fe8cdff5c06aba52b038a4ff953b2ca78cd85a575980d3aee6a1b04fbd3.

```ts
import { createHash } from "node:crypto";
import {
 chmodSync,
 existsSync,
 mkdirSync,
 readdirSync,
 readFileSync,
 realpathSync,
 rmSync,
 statSync,
 writeFileSync,
} from "node:fs";
import { hostname, homedir } from "node:os";
import { isIP } from "node:net";
import { join, relative, resolve, sep } from "node:path";
import { Database } from "bun:sqlite";

const WORK = resolve(import.meta.dir);
const RECEIPTS = join(WORK, "receipts");
const ROOT = join(WORK, "root");
const PROFILE = "gd";
const MODEL = "openai-codex/gpt-5.6-terra";
const SOCK = "gd";
const SESSION = "gd";
const PROBE_SOCK = "gdprobe";
const PROBE_SESSION = "probe";
const WATCHDOG_SECONDS = 900;
const ROLE_KEYS = [
 "default", "smol", "slow", "vision", "plan", "commit", "tiny", "memory",
 "task", "advisor", "image", "web", "speech", "dictation", "judge",
] as const;
const ALLOWLIST = [
 "PATH", "TERM", "LANG", "HOME", "TMPDIR", "XDG_CONFIG_HOME", "XDG_CACHE_HOME",
 "XDG_DATA_HOME", "XDG_STATE_HOME",
] as const;
const FORBIDDEN_ENV = /(API_KEY|_TOKEN|SECRET|OPENAI|ANTHROPIC|CODEX|AZURE|GEMINI|GOOGLE_)/i;
const OBSERVER = join(resolve(process.cwd()), "omp-orca-observer");
type CredentialRow = { provider: string; count: number };
type CredentialDb = { path: string; rows: CredentialRow[]; error?: boolean };
type CredentialReport = { dbs: CredentialDb[]; ok: boolean; providers: string[]; rowCount: number };
type Env = Record<string, string>;
type CommandResult = { stdout: string; stderr: string; exitCode: number };
type Fingerprint = { sha256: string; mtimeNs: string; size: number };
type ConnectionRow = {
 state: string;
 remote: string;
 host: string;
 port: string;
 pids: number[];
};
type EnvironmentCheck = { ok: boolean; descendants: number; differing: string[] };
type FetchSummary = { requests: string[]; requestLinesSample: string[]; responseStatusCounts: Record<string, number> };
type PaneSample = { verified: boolean; exe: string };

function profileAgent(root: string): string {
 return join(root, "home", ".omp", "profiles", PROFILE, "agent");
}

function disposableEnv(root: string): Env {
 return {
  PATH: process.env.PATH ?? "",
  TERM: "xterm-256color",
  LANG: process.env.LANG ?? "C.UTF-8",
  HOME: join(root, "home"),
  TMPDIR: join(root, "tmp"),
  XDG_CONFIG_HOME: join(root, "config"),
  XDG_CACHE_HOME: join(root, "cache"),
  XDG_DATA_HOME: join(root, "data"),
  XDG_STATE_HOME: join(root, "state"),
 };
}

function shellQuote(value: string): string {
 return `'${value.replaceAll("'", "'\\''")}'`;
}

function writeJson(path: string, value: unknown, mode?: number): void {
 mkdirSync(join(path, ".."), { recursive: true });
 writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
 if (mode !== undefined) chmodSync(path, mode);
}

function fileFingerprint(path: string): Fingerprint | null {
 try {
  const stat = statSync(path, { bigint: true });
  const digest = createHash("sha256").update(readFileSync(path)).digest("hex");
  return { sha256: digest, mtimeNs: stat.mtimeNs.toString(), size: Number(stat.size) };
 } catch {
  return null;
 }
}

function sameFingerprint(left: Fingerprint | null, right: Fingerprint | null): boolean {
 return left !== null && right !== null
  && left.sha256 === right.sha256
  && left.mtimeNs === right.mtimeNs
  && left.size === right.size;
}

async function runCommand(
 args: string[],
 options: { cwd?: string; env?: Env; stdin?: "ignore" | "inherit" } = {},
): Promise<CommandResult> {
 const spawnOptions = {
  cwd: options.cwd,
  env: options.env,
  stdin: options.stdin,
  stdout: "pipe" as const,
  stderr: "pipe" as const,
 };
 const child = Bun.spawn(args, spawnOptions);
 const [stdout, stderr, exitCode] = await Promise.all([
  new Response(child.stdout).text(),
  new Response(child.stderr).text(),
  child.exited,
 ]);
 return { stdout, stderr, exitCode };
}

async function requireCommand(args: string[], options: { cwd?: string; env?: Env } = {}): Promise<void> {
 const result = await runCommand(args, options);
 if (result.exitCode !== 0) throw new Error(`${args[0]} failed`);
}

function writeStartScript(root: string, env: Env, extra: Record<string, string> = {}, redirect?: string): string {
 const workspace = join(root, "workspace");
 const script = join(root, "start.sh");
 const values = { ...env, ...extra };
 const assignments = Object.entries(values).map(([key, value]) => `${key}=${shellQuote(value)}`).join(" ");
 const redirection = redirect === undefined ? "" : ` 2>${shellQuote(redirect)}`;
 writeFileSync(script, `#!/bin/sh\ncd ${shellQuote(workspace)} && exec env -i ${assignments} omp --profile ${PROFILE} --no-title${redirection}\n`);
 chmodSync(script, 0o700);
 return script;
}

async function initProfile(root: string, options: { recordLiveBefore?: boolean } = {}): Promise<{ root: string; env: Env; start: string }> {
 if (existsSync(root)) throw new Error(`profile root exists: ${root}`);
 const env = disposableEnv(root);
 const home = join(root, "home");
 const workspace = join(root, "workspace");
 const config = profileAgent(root);
 try {
  for (const dir of [
   home,
   workspace,
   config,
   join(config, "agents"),
   join(root, "config"),
   join(root, "cache"),
   join(root, "data"),
   join(root, "state"),
   join(root, "tmp"),
  ]) mkdirSync(dir, { recursive: true });

  const modelRoles: Record<string, string> = {};
  for (const role of ROLE_KEYS) modelRoles[role] = MODEL;
  writeJson(join(config, "config.yml"), {
   setupVersion: 2,
   modelRoles,
   enabledModels: [MODEL],
   disabledProviders: ["local", "web", "ollama", "llama.cpp", "apple", "lm-studio"],
   providers: { cacheWarming: "off" },
   task: { batch: true, maxConcurrency: 3, maxRecursionDepth: 2 },
  });
  writeFileSync(join(config, "agents", "gd-leaf.md"), `---\nname: gd-leaf\ndescription: phase-d leaf child\nmodel: ${MODEL}\nblocking: true\ntools: [read]\n---\nAnswer with exactly the word you are asked for and nothing else.\n`);
  writeFileSync(join(config, "agents", "gd-branch.md"), `---\nname: gd-branch\nmodel: ${MODEL}\nblocking: true\nspawns: gd-leaf\ntools: [task]\n---\nDo exactly what the assignment says; spawn only what it names.\n`);
  writeJson(join(root, "env.json"), env);

  await requireCommand(["git", "init", "-q", workspace], { cwd: root, env });
  writeFileSync(join(workspace, "README.md"), "# gd\n");
  await requireCommand(["git", "-c", "user.name=gd", "-c", "user.email=gd@invalid", "add", "README.md"], { cwd: workspace, env });
  await requireCommand(["git", "-c", "user.name=gd", "-c", "user.email=gd@invalid", "commit", "-q", "-m", "gd"], { cwd: workspace, env });

  if (options.recordLiveBefore === true) {
   const live = join(process.env.HOME ?? homedir(), ".omp", "agent", "agent.db");
   writeJson(join(RECEIPTS, "live-before.json"), fileFingerprint(live));
  }
  await requireCommand(["omp", "--profile", PROFILE, "plugin", "link", OBSERVER], { cwd: workspace, env });
  const start = writeStartScript(root, env);
  return { root, env, start };
 } catch (error) {
  rmSync(root, { recursive: true, force: true });
  throw error;
 }
}

function tmuxCommand(socket: string, args: string[]): Promise<CommandResult> {
 return runCommand(["tmux", "-L", socket, ...args]);
}

async function tmuxText(socket: string, args: string[]): Promise<string | null> {
 const result = await tmuxCommand(socket, args);
 return result.exitCode === 0 ? result.stdout : null;
}

async function panePid(socket: string, session: string): Promise<number | null> {
 const text = await tmuxText(socket, ["display-message", "-p", "-t", session, "#{pane_pid}"]);
 if (text === null) return null;
 const pid = Number.parseInt(text.trim(), 10);
 return Number.isInteger(pid) && pid > 0 ? pid : null;
}

function procPids(): number[] {
 try {
  return readdirSync("/proc").filter(name => /^\d+$/.test(name)).map(Number);
 } catch {
  return [];
 }
}

function procEnvironment(pid: number): Map<string, string> | null {
 try {
  const result = new Map<string, string>();
  for (const field of readFileSync(`/proc/${pid}/environ`).toString().split("\0")) {
   if (!field) continue;
   const at = field.indexOf("=");
   if (at < 1) continue;
   result.set(field.slice(0, at), field.slice(at + 1));
  }
  return result;
 } catch {
  return null;
 }
}

function procParent(pid: number): number | null {
 try {
  const text = readFileSync(`/proc/${pid}/status`, "utf8");
  const match = /^PPid:\s+(\d+)/m.exec(text);
  return match ? Number(match[1]) : null;
 } catch {
  return null;
 }
}

function descendants(rootPid: number | null): number[] {
 if (rootPid === null) return [];
 const children = new Map<number, number[]>();
 for (const pid of procPids()) {
  const parent = procParent(pid);
  if (parent === null) continue;
  const list = children.get(parent) ?? [];
  list.push(pid);
  children.set(parent, list);
 }
 const found: number[] = [];
 const pending = [...(children.get(rootPid) ?? [])];
 while (pending.length) {
  const pid = pending.shift()!;
  found.push(pid);
  pending.push(...(children.get(pid) ?? []));
 }
 return found;
}

function processExe(pid: number): string | null {
 try { return realpathSync(`/proc/${pid}/exe`); } catch { return null; }
}

let ompPathCache: string | null | undefined;
async function ompRealpath(): Promise<string | null> {
 if (ompPathCache !== undefined) return ompPathCache;
 const result = await runCommand(["which", "omp"]);
 if (result.exitCode !== 0) return (ompPathCache = null);
 try { return (ompPathCache = realpathSync(result.stdout.trim())); } catch { return (ompPathCache = null); }
}

function parseRemote(remote: string): { host: string; port: string } {
 const value = remote.replace(/^\[/, "").replace(/\]$/, "");
 if (value.includes("]:")) {
  const at = value.lastIndexOf("]:");
  return { host: value.slice(0, at).replace(/^\[/, ""), port: value.slice(at + 2) };
 }
 const at = value.lastIndexOf(":");
 if (at > 0) return { host: value.slice(0, at), port: value.slice(at + 1) };
 return { host: value, port: "" };
}

function parseSsRows(text: string, pids: Set<number>): ConnectionRow[] {
 const rows: ConnectionRow[] = [];
 for (const line of text.split("\n")) {
  const fields = line.trim().split(/\s+/);
  if (fields.length < 5) continue;
  const owned = [...line.matchAll(/pid=(\d+)/g)].map(match => Number(match[1]));
  const matched = owned.filter(pid => pids.has(pid));
  if (!matched.length) continue;
  const remote = fields[4]!;
  const parsed = parseRemote(remote);
  rows.push({ state: fields[0]!, remote, host: parsed.host, port: parsed.port, pids: [...new Set(matched)] });
 }
 return rows;
}

async function connectionSnapshot(socket: string, session: string): Promise<{ panePid: number | null; pids: number[]; verified: boolean; rows: ConnectionRow[] }> {
 const pid = await panePid(socket, session);
 const childPids = descendants(pid);
 const pids = pid === null ? childPids : [pid, ...childPids];
 const omp = await ompRealpath();
 const verified = pid !== null && omp !== null && processExe(pid) === omp;
 const result = await runCommand(["ss", "-tnpH"]);
 const rows = result.exitCode === 0 ? parseSsRows(result.stdout, new Set(pids)) : [];
 return { panePid: pid, pids, verified, rows };
}

function loopback(host: string): boolean {
 return host === "localhost" || (isIP(host) === 4 && host.startsWith("127.")) || host === "::1";
}

async function ptr(host: string): Promise<string> {
 const result = await runCommand(["getent", "hosts", host]);
 if (result.exitCode !== 0) return "no-ptr";
 const parts = result.stdout.trim().split(/\s+/);
 return parts[1] || "no-ptr";
}

function codeDigest(value: string): string {
 return createHash("sha256").update(value).digest("hex").slice(0, 8);
}

function redactCodes(text: string): string {
 return text.replace(/([?#&]code=|(?:^|\s)code=)([^&#\s"'<>]+)/gi, (_match, prefix: string, raw: string) => {
  let decoded = raw;
  try { decoded = decodeURIComponent(raw); } catch { }
  return `${prefix}<code sha256:${codeDigest(decoded)}>`;
 });
}

function extractBootstrapUrl(text: string): { url: string; code: string } | null {
 let found: { url: string; code: string } | null = null;
 for (const match of text.matchAll(/https?:\/\/[^\s"'<>]+/g)) {
  const candidate = match[0]!.replace(/[),.;]+$/, "");
  let parsed: URL;
  try { parsed = new URL(candidate); } catch { continue; }
  let raw: string | null = null;
  if (parsed.hash.startsWith("#code=")) raw = parsed.hash.slice("#code=".length);
  if (raw === null) raw = parsed.searchParams.get("code");
  if (!raw) continue;
  let code = raw;
  try { code = decodeURIComponent(raw); } catch { }
  found = { url: candidate, code };
 }
 return found;
}

function readJson(path: string): unknown | null {
 try { return JSON.parse(readFileSync(path, "utf8")); } catch { return null; }
}

function dbFiles(root: string): string[] {
 const found: string[] = [];
 function visit(dir: string): void {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
   const path = join(dir, entry.name);
   if (entry.isDirectory()) visit(path);
   else if (entry.isFile() && entry.name.endsWith(".db")) found.push(path);
  }
 }
 if (existsSync(root)) visit(root);
 return found.sort();
}

function credentialsForDb(path: string): CredentialDb {
 let database: Database;
 try { database = new Database(path, { readonly: true }); } catch { return { path, rows: [], error: true }; }
 try {
  const rows = database.query("SELECT provider, COUNT(*) AS count FROM auth_credentials GROUP BY provider").all() as Array<{ provider?: unknown; count?: unknown }>;
  return {
   path,
   rows: rows.map(row => ({ provider: typeof row.provider === "string" ? row.provider : String(row.provider ?? ""), count: Number(row.count ?? 0) })),
  };
 } catch (error) {
  if (String(error).toLowerCase().includes("no such table")) return { path, rows: [] };
  return { path, rows: [], error: true };
 } finally {
  database.close();
 }
}

function credentialReport(root: string): CredentialReport {
 const dbs = dbFiles(root).map(credentialsForDb);
 const rows = dbs.flatMap(db => db.rows);
 const providers = [...new Set(rows.map(row => row.provider))].sort();
 return {
  dbs,
  ok: !dbs.some(db => db.error) && rows.length === 1 && rows[0]!.provider === "openai-codex" && rows[0]!.count === 1,
  providers,
  rowCount: rows.reduce((sum, row) => sum + row.count, 0),
 };
}

function agentModel(path: string): string | null {
 try {
  const text = readFileSync(path, "utf8");
  return /^model:\s*(\S+)\s*$/m.exec(text)?.[1] ?? null;
 } catch { return null; }
}

function checkConfig(root: string): { ok: boolean; roles: number; agents: number } {
 const config = readJson(join(profileAgent(root), "config.yml"));
 const settings = config !== null && typeof config === "object" ? config as Record<string, unknown> : null;
 const roles = settings?.modelRoles;
 const modelRoles = roles !== null && typeof roles === "object" && !Array.isArray(roles)
  ? roles as Record<string, unknown> : null;
 const rolesOk = modelRoles !== null
  && ROLE_KEYS.every(key => Object.prototype.hasOwnProperty.call(modelRoles, key))
  && Object.values(modelRoles).every(value => value === MODEL);
 const enabled = settings?.enabledModels;
 const enabledOk = Array.isArray(enabled) && enabled.length === 1 && enabled[0] === MODEL;
 const providers = settings?.providers;
 const providersOk = providers !== null && typeof providers === "object" && !Array.isArray(providers)
  && (providers as Record<string, unknown>).cacheWarming === "off";
 const task = settings?.task;
 const retry = settings?.retry;
 const absentOverrides = !(task !== null && typeof task === "object" && "agentModelOverrides" in task)
  && !(retry !== null && typeof retry === "object" && "fallbackChains" in retry);
 const agentDir = profileAgent(root);
 const agents = ["gd-leaf.md", "gd-branch.md"];
 const agentModels = agents.map(name => agentModel(join(agentDir, "agents", name)));
 const noModelFiles = !existsSync(join(agentDir, "models.yml")) && !existsSync(join(agentDir, "models.json"));
 return {
  ok: rolesOk && enabledOk && providersOk && absentOverrides && noModelFiles && agentModels.every(model => model === MODEL),
  roles: modelRoles ? Object.keys(modelRoles).length : 0,
  agents: agentModels.filter(model => model !== null).length,
 };
}

async function checkEnvironment(root: string, socket = SOCK, session = SESSION): Promise<EnvironmentCheck> {
 const pid = await panePid(socket, session);
 const envJson = readJson(join(root, "env.json"));
 const expected = envJson !== null && typeof envJson === "object" && !Array.isArray(envJson)
  ? envJson as Record<string, unknown> : null;
 const paneEnv = pid === null ? null : procEnvironment(pid);
 const omp = await ompRealpath();
 const paneExact = pid !== null && omp !== null && processExe(pid) === omp;
 const names = paneEnv === null ? [] : [...paneEnv.keys()].sort();
 const expectedNames = expected === null ? [] : Object.keys(expected).sort();
 const allowedNames = [...ALLOWLIST].sort();
 const valuesOk = expected !== null && paneEnv !== null
  && names.length === ALLOWLIST.length
  && expectedNames.length === allowedNames.length
  && expectedNames.every((name, index) => name === allowedNames[index])
  && names.every((name, index) => name === expectedNames[index])
  && names.every(name => paneEnv.get(name) === String(expected[name]));
 const childPids = descendants(pid);
 const differing = new Set<string>();
 if (paneEnv !== null) {
  for (const name of paneEnv.keys()) {
   if (!ALLOWLIST.includes(name as typeof ALLOWLIST[number])) differing.add(name);
  }
 }
 let descendantsOk = true;
 for (const child of childPids) {
  const childEnv = procEnvironment(child);
  if (childEnv === null) {
   descendantsOk = false;
   differing.add("<unreadable>");
   continue;
  }
  for (const name of childEnv.keys()) {
   if (!ALLOWLIST.includes(name as typeof ALLOWLIST[number])) differing.add(name);
   if (name.startsWith("ORCA_") || FORBIDDEN_ENV.test(name)) descendantsOk = false;
  }
 }
 return { ok: paneExact && valuesOk && descendantsOk, descendants: childPids.length, differing: [...differing].sort() };
}

async function guardDetails(root: string): Promise<{
 config: { ok: boolean; roles: number; agents: number };
 env: { ok: boolean; descendants: number; differing: string[] };
 live: boolean;
 credentials: CredentialReport;
}> {
 const config = checkConfig(root);
 const env = await checkEnvironment(root);
 const livePath = join(process.env.HOME ?? homedir(), ".omp", "agent", "agent.db");
 const before = readJson(join(RECEIPTS, "live-before.json"));
 const live = sameFingerprint(fileFingerprint(livePath), before as Fingerprint | null);
 const credentials = credentialReport(root);
 return { config, env, live, credentials };
}

export async function guard(print = true): Promise<boolean> {
 const result = await guardDetails(ROOT);
 if (print) {
  console.log("config " + result.config.ok + " roles " + result.config.roles + " agents " + result.config.agents);
  console.log("env " + result.env.ok + " descendants " + result.env.descendants + " differing " + (result.env.differing.length ? result.env.differing.join(",") : "none"));
  console.log("live " + result.live);
  console.log("credentials " + result.credentials.ok + " rows " + result.credentials.rowCount + " providers " + (result.credentials.providers.length ? result.credentials.providers.join(",") : "none"));
  for (const db of result.credentials.dbs) {
   const relativePath = relative(ROOT, db.path) || ".";
   const rows = db.rows.length ? db.rows.map(row => row.provider + ":" + row.count).join(",") : "none";
   console.log("db " + relativePath + " " + rows);
  }
 }
 return result.config.ok && result.env.ok && result.live && result.credentials.ok;
}
async function commandInit(): Promise<void> {
 mkdirSync(RECEIPTS, { recursive: true });
 const result = await initProfile(ROOT, { recordLiveBefore: true });
 console.log(`root ${result.root}`);
 console.log(`start ${result.start}`);
 console.log(`tmux -L ${SOCK} new-session -d -s ${SESSION} -x 400 -y 60 ${result.start}`);
}

function fetchRequests(log: string): FetchSummary {
 const requests = new Set<string>();
 const requestLinesSample: string[] = [];
 const responseStatusCounts: Record<string, number> = {};
 let lastOrigin: string | null = null;
 for (const rawLine of log.split("\n")) {
  const line = rawLine.trimEnd();
  const response = /^\s*\[fetch\]\s*<\s*(?:HTTP\/\S+\s+)?(\d{3})\b/i.exec(line);
  if (response !== null) {
   const responseUrl = /https?:\/\/[^\s'"<>]+/.exec(line)?.[0]?.replace(/[),.;]+$/, "");
   let origin = lastOrigin;
   if (responseUrl !== undefined) {
    try { origin = new URL(responseUrl).origin; } catch { }
   }
   if (origin !== null) responseStatusCounts[origin] = (responseStatusCounts[origin] ?? 0) + 1;
   continue;
  }
  const httpRequest = /^\s*\[fetch\]\s*>\s+HTTP\/\S+\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+(https?:\/\/[^\s'"<>]+)/i.exec(line);
  const isCurl = /\$\s*(?:\S*\/)?curl\b/.test(line)
   || /^\s*(?:\S*\/)?curl\b/.test(line)
   || /^\s*\[fetch\]\s+(?:\S*\/)?curl\b/.test(line);
  if (!isCurl && httpRequest === null) continue;
  const urlMatch = /https?:\/\/[^\s'"<>]+/.exec(line);
  if (urlMatch === null) continue;
  const value = urlMatch[0]!.replace(/[),.;]+$/, "");
  let parsed: URL;
  try { parsed = new URL(value); } catch { continue; }
  const methodFlag = /(?:^|\s)(?:-X|--request)\s+([A-Za-z]+)/i.exec(line);
  const method = (methodFlag?.[1] ?? httpRequest?.[1] ?? "GET").toUpperCase();
  parsed.search = "";
  parsed.hash = "";
  const canonical = method + " " + parsed.origin + (parsed.pathname || "/");
  requests.add(canonical);
  lastOrigin = parsed.origin;
  const end = (urlMatch.index ?? 0) + urlMatch[0].length;
  requestLinesSample.push(line.slice(0, end));
 }
 return { requests: [...requests].sort(), requestLinesSample, responseStatusCounts };
}

async function commandNetprobe(): Promise<void> {
 mkdirSync(RECEIPTS, { recursive: true });
 let probe: { root: string; env: Env; start: string } | null = null;
 const allPids = new Set<number>();
 const samples: ConnectionRow[] = [];
 const paneSamples: PaneSample[] = [];
 let peak = 0;
 let paneText = "";
 let probeEnvironment: EnvironmentCheck | null = null;
 try {
  probe = await initProfile(join(WORK, "probe"));
  const fetchLog = join(probe.root, "fetch.log");
  const probeStart = writeStartScript(probe.root, probe.env, { BUN_CONFIG_VERBOSE_FETCH: "curl" }, fetchLog);
  const started = await tmuxCommand(PROBE_SOCK, ["new-session", "-d", "-s", PROBE_SESSION, "-x", "200", "-y", "50", probeStart]);
  if (started.exitCode !== 0) throw new Error("probe tmux failed");
  const paneCapture = (async () => {
   await Bun.sleep(10_000);
   paneText = (await tmuxText(PROBE_SOCK, ["capture-pane", "-p", "-J", "-t", PROBE_SESSION, "-S", "-200"])) ?? "";
  })();
  for (let sample = 0; sample <= 20; sample++) {
   if (sample > 0) await Bun.sleep(3_000);
   const snapshot = await connectionSnapshot(PROBE_SOCK, PROBE_SESSION);
   const paneExe = snapshot.panePid === null ? null : processExe(snapshot.panePid);
   paneSamples.push({ verified: snapshot.verified, exe: paneExe === null ? "<missing>" : basenameSafe(paneExe) });
   if (probeEnvironment === null && snapshot.verified) {
    probeEnvironment = await checkEnvironment(probe.root, PROBE_SOCK, PROBE_SESSION);
   }
   for (const pid of snapshot.pids) allPids.add(pid);
   samples.push(...snapshot.rows);
   peak = Math.max(peak, snapshot.rows.length);
  }
  await paneCapture;
  if (probeEnvironment === null) probeEnvironment = await checkEnvironment(probe.root, PROBE_SOCK, PROBE_SESSION);
  await tmuxCommand(PROBE_SOCK, ["kill-server"]);
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline && [...allPids].some(pid => existsSync("/proc/" + pid))) await Bun.sleep(100);
  const log = existsSync(fetchLog) ? readFileSync(fetchLog, "utf8") : "";
  const endpointMap = new Map<string, { endpoint: string; ptr: string }>();
  for (const row of samples) {
   const endpoint = row.remote;
   if (!endpointMap.has(endpoint)) endpointMap.set(endpoint, { endpoint, ptr: await ptr(row.host) });
  }
  const setup = /setup|sign[ -]?in|log[ -]?in|authenticate|select .*provider|choose .*provider|api key|login/i.test(paneText);
  const fetchSummary = fetchRequests(log);
  const receipt = {
   fetchLines: fetchSummary.requests,
   requestLinesSample: fetchSummary.requestLinesSample,
   responseStatusCounts: fetchSummary.responseStatusCounts,
   endpoints: [...endpointMap.values()].sort((left, right) => left.endpoint.localeCompare(right.endpoint)),
   peakConcurrentConnections: peak,
   paneExecutableVerified: paneSamples.length > 0 && paneSamples.every(sample => sample.verified),
   samples: paneSamples,
   sampleCount: paneSamples.length,
   probeEnvironment,
   setupScreenAppeared: setup,
   paneTextAt10s: redactCodes(paneText),
  };
  writeJson(join(RECEIPTS, "netprobe.json"), receipt);
  console.log("fetch lines " + (receipt.fetchLines.length ? receipt.fetchLines.join(" | ") : "none"));
  console.log("endpoints " + (receipt.endpoints.length ? receipt.endpoints.map(item => item.endpoint + " " + item.ptr).join(" | ") : "none"));
  console.log("peak " + receipt.peakConcurrentConnections);
  console.log("setup screen " + receipt.setupScreenAppeared);
 } finally {
  await tmuxCommand(PROBE_SOCK, ["kill-server"]);
  if (probe !== null) rmSync(probe.root, { recursive: true, force: true });
 }

}
async function commandSend(text: string): Promise<void> {
 const valid = await guard(true);
 if (!valid) {
  process.exitCode = 1;
  return;
 }
 const firstPath = join(ROOT, "first-prompt.json");
 const now = Date.now();
 let first = readJson(firstPath) as { at?: unknown; epochMs?: unknown } | null;
 if (first === null) {
  first = { at: new Date(now).toISOString(), epochMs: now };
  writeJson(firstPath, first);
  const watchdog = Bun.spawn(["setsid", "sh", "-c", `sleep ${WATCHDOG_SECONDS}; tmux -L ${SOCK} kill-server`], {
   stdin: "ignore",
   stdout: "ignore",
   stderr: "ignore",
  });
  watchdog.unref();
  writeFileSync(join(ROOT, "watchdog.pid"), String(watchdog.pid) + "\n");
 }
 const epoch = typeof first.epochMs === "number" ? first.epochMs : Number.NaN;
 if (!Number.isFinite(epoch) || now > epoch + WATCHDOG_SECONDS * 1_000) {
  throw new Error("first prompt expired");
 }
 const sent = await tmuxCommand(SOCK, ["send-keys", "-t", SESSION, "-l", "--", text]);
 if (sent.exitCode !== 0) throw new Error("tmux send failed");
 await Bun.sleep(300);
 const enter = await tmuxCommand(SOCK, ["send-keys", "-t", SESSION, "Enter"]);
 if (enter.exitCode !== 0) throw new Error("tmux enter failed");
 mkdirSync(RECEIPTS, { recursive: true });
 writeFileSync(join(RECEIPTS, "sent.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), text: redactCodes(text) })}\n`, { flag: "a" });
}

async function commandScreen(linesArg: string | undefined): Promise<void> {
 const parsed = linesArg === undefined ? 200 : Number.parseInt(linesArg, 10);
 const lines = Number.isInteger(parsed) && parsed > 0 ? parsed : 200;
 const output = await tmuxText(SOCK, ["capture-pane", "-p", "-J", "-t", SESSION, "-S", `-${lines}`]);
 if (output === null) throw new Error("tmux capture failed");
 process.stdout.write(redactCodes(output));
}

async function commandUrl(): Promise<void> {
 const output = await tmuxText(SOCK, ["capture-pane", "-p", "-J", "-t", SESSION, "-S", "-3000"]);
 const found = output === null ? null : extractBootstrapUrl(output);
 if (found === null) {
  process.exitCode = 1;
  return;
 }
 writeFileSync(join(ROOT, "viewer-url"), `${found.url}\n`, { mode: 0o600 });
 chmodSync(join(ROOT, "viewer-url"), 0o600);
 console.log(`${new URL(found.url).origin} <code sha256:${codeDigest(found.code)}>`);
}

async function commandConns(): Promise<void> {
 const snapshot = await connectionSnapshot(SOCK, SESSION);
 const rows = await Promise.all(snapshot.rows.map(async row => ({
  state: row.state,
  remote: row.remote,
  ptr: await ptr(row.host),
  loopback: loopback(row.host),
 })));
 const output = rows.map(row => `${row.state} ${row.remote} ${row.ptr}${row.loopback ? " loopback" : ""}`);
 for (const line of output) console.log(line);
 mkdirSync(RECEIPTS, { recursive: true });
 writeFileSync(join(RECEIPTS, "conns.jsonl"), `${JSON.stringify({ at: new Date().toISOString(), panePid: snapshot.panePid, rows })}\n`, { flag: "a" });
}

function sessionDisplayPath(sessions: string, path: string): string {
 const names = new Set([basenameSafe(homedir()), process.env.USER ?? "", hostname()]);
 return relative(sessions, path).split(sep).map(part => names.has(part) && part ? "<session>" : part).join("/");
}

function basenameSafe(path: string): string {
 const normalized = path.replace(/[\\/]+$/, "");
 const at = normalized.lastIndexOf("/");
 return at < 0 ? normalized : normalized.slice(at + 1);
}

function numeric(value: unknown): number {
 return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function addUsage(total: { input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number; costTotal: number }, value: unknown): void {
 if (value === null || typeof value !== "object" || Array.isArray(value)) return;
 const usage = value as Record<string, unknown>;
 total.input += numeric(usage.input);
 total.output += numeric(usage.output);
 total.cacheRead += numeric(usage.cacheRead);
 total.cacheWrite += numeric(usage.cacheWrite);
 total.totalTokens += numeric(usage.totalTokens);
 const cost = usage.cost;
 if (cost !== null && typeof cost === "object" && !Array.isArray(cost)) total.costTotal += numeric((cost as Record<string, unknown>).total);
}

function usageEntries(value: unknown): unknown[] {
 if (Array.isArray(value)) return value;
 if (value !== null && typeof value === "object") return [value];
 return [];
}

async function commandUsage(): Promise<void> {
 const sessions = join(profileAgent(ROOT), "sessions");
 const files: string[] = [];
 function visit(dir: string): void {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
  for (const entry of entries) {
   const path = join(dir, entry.name);
   if (entry.isDirectory()) visit(path);
   else if (entry.isFile() && entry.name.endsWith(".jsonl")) files.push(path);
  }
 }
 visit(sessions);
 files.sort();
 const grand = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, costTotal: 0 };
 const models = new Set<string>();
 const report: Array<{ path: string; input: number; output: number; cacheRead: number; cacheWrite: number; totalTokens: number; costTotal: number }> = [];
 let invalidModel = false;
 for (const path of files) {
  const total = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, costTotal: 0 };
  for (const line of readFileSync(path, "utf8").split("\n")) {
   if (!line.trim()) continue;
   let entry: unknown;
   try { entry = JSON.parse(line); } catch { continue; }
   if (entry === null || typeof entry !== "object") continue;
   const item = entry as Record<string, unknown>;
   const message = item.message;
   if (message !== null && typeof message === "object" && !Array.isArray(message)) {
    const msg = message as Record<string, unknown>;
    if (msg.role === "assistant") {
     addUsage(total, msg.usage);
     for (const modelUsage of usageEntries(msg.model_usage)) addUsage(total, modelUsage);
     const provider = typeof msg.provider === "string" ? msg.provider : "";
     const model = typeof msg.model === "string" ? msg.model : "";
     if (model) {
      const combined = provider && !model.startsWith(`${provider}/`) ? `${provider}/${model}` : model;
      models.add(combined);
      if (model !== MODEL && combined !== MODEL) invalidModel = true;
     }
    }
   }
   if (item.type === "model_usage") {
    for (const modelUsage of usageEntries(item.usage ?? item)) addUsage(total, modelUsage);
   }
   for (const modelUsage of usageEntries(item.model_usage)) addUsage(total, modelUsage);
  }
  for (const key of Object.keys(grand) as Array<keyof typeof grand>) grand[key] += total[key];
  report.push({ path: sessionDisplayPath(sessions, path), ...total });
 }
 const receipt = { files: report, totals: grand, models: [...models].sort() };
 mkdirSync(RECEIPTS, { recursive: true });
 writeJson(join(RECEIPTS, "usage.json"), receipt);
 for (const file of report) console.log(`${file.path} input ${file.input} output ${file.output} cacheRead ${file.cacheRead} cacheWrite ${file.cacheWrite} totalTokens ${file.totalTokens} cost ${file.costTotal}`);
 console.log(`totals input ${grand.input} output ${grand.output} cacheRead ${grand.cacheRead} cacheWrite ${grand.cacheWrite} totalTokens ${grand.totalTokens} cost ${grand.costTotal}`);
 console.log(`models ${models.size ? [...models].sort().join(",") : "none"}`);
 if (invalidModel) process.exitCode = 1;
}

function pidsWithHome(root: string): number[] {
 const prefix = `${root}${sep}`;
 return procPids().filter(pid => {
  const home = procEnvironment(pid)?.get("HOME");
  return home === root || home?.startsWith(prefix) === true;
 });
}

function signalPids(pids: number[], signal: NodeJS.Signals): void {
 for (const pid of pids) {
  try { process.kill(pid, signal); } catch { }
 }
}

async function commandCleanup(): Promise<void> {
 const watchdogPath = join(ROOT, "watchdog.pid");
 if (existsSync(watchdogPath)) {
  const pid = Number.parseInt(readFileSync(watchdogPath, "utf8").trim(), 10);
  if (Number.isInteger(pid) && pid > 0) signalPids([pid], "SIGTERM");
 }
 await tmuxCommand(SOCK, ["kill-server"]);
 await tmuxCommand(PROBE_SOCK, ["kill-server"]);
 const owned = pidsWithHome(ROOT);
 signalPids(owned, "SIGTERM");
 await Bun.sleep(3_000);
 signalPids(pidsWithHome(ROOT).filter(pid => existsSync(`/proc/${pid}`)), "SIGKILL");
 const dbs = dbFiles(ROOT).map(db => ({
  path: relative(ROOT, db),
  rows: credentialsForDb(db).rows,
 }));
 const before = readJson(join(RECEIPTS, "live-before.json"));
 rmSync(ROOT, { recursive: true, force: true });
 const gone = !existsSync(ROOT);
 const after = fileFingerprint(join(process.env.HOME ?? homedir(), ".omp", "agent", "agent.db"));
 const match = sameFingerprint(after, before as Fingerprint | null);
 mkdirSync(RECEIPTS, { recursive: true });
 writeJson(join(RECEIPTS, "cleanup.json"), { dbs, before, after, match });
 console.log(`gone ${gone} before ${before !== null} after ${after !== null} match ${match}`);
}

async function main(): Promise<void> {
 const [command, ...args] = process.argv.slice(2);
 switch (command) {
  case "init":
   await commandInit();
   return;
  case "netprobe":
   await commandNetprobe();
   return;
  case "guard": {
   if (!(await guard(true))) process.exitCode = 1;
   return;
  }
  case "send":
   if (args.length === 0) throw new Error("send requires text");
   await commandSend(args.join(" "));
   return;
  case "screen":
   await commandScreen(args[0]);
   return;
  case "url":
   await commandUrl();
   return;
  case "conns":
   await commandConns();
   return;
  case "usage":
   await commandUsage();
   return;
  case "cleanup":
   await commandCleanup();
   return;
  default:
   throw new Error("usage: bun gd.ts <init|netprobe|guard|send|screen|url|conns|usage|cleanup>");
 }
}

if (import.meta.main) {
 try {
  await main();
 } catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
 }
}
```

### command transcript

Outputs are as observed; "(stdout not retained)" where only the exit code was kept.

## live baseline (manual, before init)
```
cd HOME/.omp/agent && ls -la --time-style=full-iso agent.db* && sha256sum agent.db*
agent.db      1273856  2026-10-02 18:04:09.928392842 -0500   e854fbe895067bf822969cecf07dfea34fd04672f85b013f018d1933f4dd1f44
agent.db-shm    32768  2026-10-02 18:22:15.973740925 -0500   5f550d8dcce697299e629d5f610fc7cc3f28c53792a14d591ee4301399c013e4
agent.db-wal   729272  2026-10-02 18:22:15.973740925 -0500   d27e401290e1f0c13b44829b5cef9c5b51000775294a6220bd17734f1afa4c0a
```

## init
```
cd <work> && bun gd.ts init          # cwd <work>
omp failed                            # exit 1 (observer path resolves from cwd; root removed by init's catch)
bun <work>/gd.ts init                 # cwd $PWD
root <work>/root
start <work>/root/start.sh
tmux -L gd new-session -d -s gd -x 400 -y 60 <work>/root/start.sh
exit 0
cat <work>/receipts/live-before.json → {"sha256":"e854fbe8…1f44","mtimeNs":"1790982249928392842","size":1273856}
```

## network identification
`bun <work>/gd.ts netprobe` (run by the launcher worker after the F1–F4 fixes; summary in receipts/netprobe.json).
```
for h in api.commandcode.ai api.kilo.ai api.venice.ai catalog.stencil.so coding-intl.dashscope.aliyuncs.com hyper.charm.land registry.npmjs.org zenmux.ai; do getent ahostsv4 $h | awk '{print $1}' | sort -u; done
api.commandcode.ai: 104.21.49.202 172.67.167.23
api.kilo.ai: 64.239.109.193 64.239.123.193
api.venice.ai: 104.18.28.226 104.18.29.226
catalog.stencil.so: 104.21.38.79 172.67.220.25
coding-intl.dashscope.aliyuncs.com: 43.106.123.215 43.98.246.135
hyper.charm.land: 142.250.9.121
registry.npmjs.org: 104.16.0.34 … 104.16.11.34 (12 addresses)
zenmux.ai: 172.65.90.66 172.65.90.67
```
Later (during the run): `getent ahostsv4` chatgpt.com → 104.18.32.47 172.64.155.209; auth.openai.com → 104.18.41.241 172.64.146.15; api.openai.com → 162.159.140.245 172.66.0.243.

## session start (twice: initial; restart after the TUI exited post-sign-in)
```
env -i PATH="$PATH" TERM=xterm-256color LANG=C.UTF-8 HOME="$HOME" tmux -L gd new-session -d -s gd -x 400 -y 60 <work>/root/start.sh
sleep 8 && bun <work>/gd.ts screen 60      # displayed through a sed that replaced URLs with <url>
bun <work>/gd.ts guard
```
Guard before sign-in (exit 1):
```
config true roles 15 agents 2
env true descendants 0 differing none
live true
credentials false rows 0 providers none
db home/.omp/profiles/gd/agent/agent.db none
db home/.omp/profiles/gd/agent/cache/composer.db none
db home/.omp/profiles/gd/agent/history.db none
db home/.omp/profiles/gd/agent/models.db none
db home/.omp/profiles/gd/agent/skill-descriptions.db none
db home/.omp/profiles/gd/cache/legacy-pi-extension-cache.db none
```
After Niko's sign-in + detach (exit 1; `tmux capture failed` from screen):
```
config true roles 15 agents 2
env false descendants 0 differing none
live true
credentials true rows 1 providers openai-codex
db home/.omp/profiles/gd/agent/agent.db openai-codex:1
(other five dbs none)
tmux -L gd ls → no server running on <tmux socket>
```
After restart (exit 0): config true roles 15 agents 2 / env true descendants 0 differing none / live true / credentials true rows 1 providers openai-codex / same db lines.

## model listing (orchestrator eval, Python)
```py
env=json.load(open(f"{W}/root/env.json"))
r=subprocess.run(["omp","--profile","gd","models","ls","--json"],env=env,cwd=f"{W}/root/workspace",capture_output=True,text=True,timeout=120)
→ exit 0 stderr "" ; rows 8 ; openai-codex rows 8 ; providers ['openai-codex'] ; target row present
```

## sends (orchestrator eval: `subprocess.run(["bun", f"{W}/gd.ts", "send", text], cwd=$PWD)`)
Each `send` printed the guard lines first. Retained: exit 0 for all 7 sends; for prompt 2 the first four guard lines were retained:
```
config true roles 15 agents 2
env true descendants 2 differing OMP_DAEMON_PROJECT_DIR,OMP_DAEMON_RUNTIME_DIR,OMP_PROFILE,OMP_TEXT_PREDICT_AGENT_DIR,OMP_TEXT_PREDICT_SOCKET,PI_CODING_AGENT_DIR,PI_NO_TITLE,PI_PROFILE,__PI_NATIVE_VARIANT_CACHE
live true
credentials true rows 1 providers openai-codex
```
(guard stdout for the other sends not retained; `send` exits 1 without sending when the guard fails, so exit 0 means it passed.)
Edit between prompt 1 and 2 (orchestrator, edit tool): inserted `description: phase-d branch child` as line 3 of `<work>/root/home/.omp/profiles/gd/agent/agents/gd-branch.md`.
`bun <work>/gd.ts url` → `http://127.0.0.1:<port> <code sha256:3b941f20>` (exit 0); second grant → `<code sha256:ac448596>`.
`bun <work>/gd.ts conns` after prompts (5 samples, receipts/conns.jsonl).

## viewer (orchestrator eval, Python `browser`)
```py
vurl=open(f"{W}/root/viewer-url").read().strip()
tab=await browser.open(name="gdviewer", url="about:blank", headed=False)
_=await tab.goto(vurl); del vurl, _
cur=await tab.url(); print("code in url after load:", "code=" in cur)   # → False
txt=await tab.text("body")
```
(second grant: same with name "gdviewer2"; then for each child: `tab.observe()`, click the row button `"<agent> — <childId>"`, `tab.text("body")`, check the result word after the last "Completeness"; then `observe()` for textbox/combobox/send/stop/kill/abort/revive/cancel → none.) Identity comparison cell parsed the parent session JSONL (task toolCall ids per task name; `<task-result id=… agent=… status=…>` in task toolResults) and child JSONLs (assistant provider/model) and compared with the viewer rows → receipts/identity-compare.json (all ✓).

## usage
`bun <work>/gd.ts usage` → exit 0; stdout = per-file lines + `totals input 21388 output 866 cacheRead 34816 cacheWrite 0 totalTokens 57070 cost 0.06013119999999999` + `models openai-codex/gpt-5.6-terra`.

## kill
```
tmux -L gd kill-server            → exit 0 (00:18:58Z)
kill <watchdog pid>               → watchdog alive: False
pgrep -af 'omp --profile gd'      → none
for p in /proc/[0-9]*; do …HOME=<work>/root*… ; done → no matches (unreadable /proc entries belong to other users)
```

## cleanup and live re-check
```
cp <work>/root/first-prompt.json <work>/receipts/
bun <work>/gd.ts cleanup          → gone true before true after true match false
tmux -L gd ls                     → no server running
ls -la --time-style=full-iso HOME/.omp/agent/agent.db → 1273856 2026-10-02 19:19:58.097614015 -0500
sha256sum HOME/.omp/agent/agent.db → cac283c86ccf010f9dd55fd81d6f0adbc7085f7942783d3c125a3e6ef423e688
ls -la --time-style=full-iso HOME/.omp/agent/agent.db*
  agent.db-shm 32768 19:20:29.262031110 -0500 ; agent.db-wal 4120032 19:20:29.262031110 -0500
/proc/*/fd scan for HOME/.omp/agent/agent.db* → two pids, cmdline `omp --extension <orca status extension>`, HOME=HOME, each holding agent.db, -shm, -wal
bun -e 'import {Database} from "bun:sqlite"; const d=new Database(process.env.HOME+"/.omp/agent/agent.db",{readonly:true}); console.log(JSON.stringify(d.query("SELECT provider, COUNT(*) n, MAX(created_at) maxCreated, MAX(updated_at) maxUpdated FROM auth_credentials GROUP BY provider").all())); d.close()'
→ [{"provider":"anthropic","n":1,"maxCreated":1789502549,"maxUpdated":1790981885},{"provider":"openai-codex","n":1,"maxCreated":1781281107,"maxUpdated":1790981905},{"provider":"zhipu-coding-plan","n":1,"maxCreated":1785277739,"maxUpdated":1785277739}]
```


### profile config

The disposable profile used setupVersion 2, 15 modelRoles pointing to openai-codex/gpt-5.6-terra, enabledModels set to that singleton, disabledProviders local/web/ollama/llama.cpp/apple/lm-studio, providers.cacheWarming off, and task batch true, maxConcurrency 3, maxRecursionDepth 2. gd-leaf was a blocking phase-d leaf with read; gd-branch was a blocking task agent spawning gd-leaf with task. The original spec omitted gd-branch description; it was added as phase-d branch child after the first preflight failure.

### sign-in path

The verified TUI path was /login openai-codex. In omp v18.4.12, login in packages/coding-agent/src/slash-commands/builtin-session.ts accepts a provider id matching getOAuthProviders and opens that provider's OAuth selector; a pending flow accepts a redirect URL. Codex browser/device-code support is scout-reported from packages/ai/src/registry/oauth/openai-codex.ts, not independently re-read. Source line numbers were not captured.

### pre-prompt network identification

Credential-free netprobe used a separate root, same config, only BUN_CONFIG_VERBOSE_FETCH=curl extra env, 60 seconds, and 21 samples; all were pane-executable verified and no setup screen appeared.

| host | request | endpoint |
|---|---|---|
| api.commandcode.ai | GET /provider/v1/models | 172.67.167.23:443 |
| api.kilo.ai | GET /api/gateway/models | 64.239.123.129:443; DNS 64.239.109.193/64.239.123.193 |
| api.venice.ai | GET /api/v1/models | 104.18.29.226:443 |
| catalog.stencil.so | GET /models.json.zstd | 104.21.38.79:443 |
| coding-intl.dashscope.aliyuncs.com | GET /v1/models | 43.106.123.215:443 |
| hyper.charm.land | GET /v1/models | 142.251.177.121:443; Google-hosted PTR |
| registry.npmjs.org | GET /@oh-my-pi%2Fpi-coding-agent/latest | 104.16.10.34:443 |
| zenmux.ai | GET /api/v1/models | 172.65.90.66:443 |

The kilo endpoint is a same-/16 match, not an exact match: observed 64.239.123.129 and DNS answers 64.239.109.193/64.239.123.193 share the /16. Niko decided: Expected; proceed as-is. Raw data is receipts/netprobe.json.

### live-store baseline

The first init from the work-directory cwd failed with omp failed before creating anything; the repo-root retry produced the baseline. live agent.db SHA-256 e854fbe895067bf822969cecf07dfea34fd04672f85b013f018d1933f4dd1f44, mtimeNs 1790982249928392842 (local 18:04:09.928392842, UTC-5), size 1273856. It matched the earlier manual baseline.

### session start and sign-in

A clean-env tmux session started the disposable start.sh. After eight seconds omp v18.4.12 showed welcome, no setup screen, and no usable credentials warning. Before sign-in, config (15 roles, 2 agents), environment (0 descendants), and live were true; credentials were false with 0 rows, so guard exited 1 as expected. Niko attached, ran /login openai-codex, and reported detached. The tmux server then disappeared and no omp process remained; TUI exit cause was not observed, with no session files and usage 0. Disposable db mtime was local 19:11:47. Guard then found one disposable openai-codex row and live true; env was false only because no pane existed. The same start.sh restarted in a new -L gd session; all four guards then passed and exited 0. The unexplained exit remains unverified.

### model offered

omp --profile gd models ls --json exited 0 with 8 rows, all provider openai-codex; openai-codex/gpt-5.6-terra was present as GPT-5.6-Terra, contextWindow 272000, cost input 2/output 12/cacheRead 0.2 per Mtok. Restarted TUI status: Model scope: gpt-5.6-terra.

### prompts timeline

All sends ran guard first and passed. First-prompt receipt: 2026-10-03T00:13:21.523Z; 15-minute deadline 00:28:21.5Z.

| UTC time | guard result | outcome |
|---|---|---|
| 00:13:21.8Z | passed | AlphaLeaf plus nested GammaBranch batch failed preflight because gd-branch lacked description; no child spawned. Model hallucinated DONE ALPHA and claimed ALPHA. |
| 00:14:31.4Z | passed; 2 omp helper descendants had differing omp-set names, no ORCA/key-like names | After description fix, GammaBranch completed BETA GAMMA and nested GetGamma completed GAMMA. |
| 00:15:21.9Z | passed | /observer serve. |
| 00:15:25.4Z | passed | /observer grant all; redacted bootstrap code. |
| 00:16:14.9Z | passed | /observer status ready; 2 children, 1 live credential, 0 pending codes, inventory complete. |
| 00:16:43.5Z | passed | AlphaLeaf completed ALPHA. |
| 00:17:19.9Z | passed | Second grant; redacted bootstrap code. |

Deviation: the one-short-task plan became three prompts because of the preflight failure; final children remained exactly AlphaLeaf, GammaBranch, and GammaBranch.GetGamma, with one nested child.

### approved-provider check

Sampled ss -tnpH snapshots on pane pid and descendants, not packet capture:

| UTC sample | connections | host attribution |
|---|---|---|
| 00:13:25.9Z | 104.18.32.47:443 ×3 (chatgpt.com); 104.16.2.34:443 (registry.npmjs.org startup socket); 104.21.38.79:443 (catalog.stencil.so startup socket) | chatgpt.com; registry.npmjs.org; catalog.stencil.so |
| 00:13:47Z | same | chatgpt.com; npm and stencil startup |
| 00:15:09Z | chatgpt.com x3 plus 104.16.2.34 and 104.21.38.79 | chatgpt.com; npm range; catalog.stencil.so |
| 00:17:06Z | prior plus 127.0.0.1 | chatgpt.com; npm/stencil; local viewer |
| 00:18:56Z | chatgpt.com x4 plus 127.0.0.1 | chatgpt.com and local viewer; npm/stencil closed |

auth.openai.com and api.openai.com never appeared. Qualification: sampled snapshots, not packet capture; npm/stencil sockets predated prompt 1. Usage JSONLs selected only openai-codex/gpt-5.6-terra.

### viewer check

Grant 1 after prompt 2 showed 2 rows; AlphaLeaf did not yet exist. Grant 2 after prompt 3 showed complete inventory and 3 rows:

| child | agent | parent | resolved model | registry status | outcome | completeness |
|---|---|---|---|---|---|---|
| GammaBranch | gd-branch | Main | openai-codex/gpt-5.6-terra:high | idle | completed generation 1 | unknown (native registry lacks full lineage) |
| GammaBranch.GetGamma | gd-leaf | GammaBranch | same | idle | completed generation 1 | same |
| AlphaLeaf | gd-leaf | Main | same | idle | completed generation 1 | same |

Native comparison:

| child | agent | parent | model | outcome | spawnCallId |
|---|---|---|---|---|---|
| GammaBranch | ✓ | ✓ | ✓ | ✓ | ✓ |
| GammaBranch.GetGamma | ✓ | ✓ | ✓ | ✓ | ✓ |
| AlphaLeaf | ✓ | ✓ | ✓ | ✓ | ✓ |

NOT compared directly: registry status idle against in-process AgentRegistry (not dumped), model role, activity timestamps. Each transcript showed its result word. No textbox/combobox or send/stop/kill/abort/revive/cancel controls. Viewer fragment was stripped, so no code= remained. Viewer body normalized in receipts/viewer-body.txt.

### usage vs $5

| session | input | output | cacheRead | cacheWrite | total | estimate |
|---|---:|---:|---:|---:|---:|---:|
| main | 10385 | 472 | 32256 | 0 | 43113 | $0.0328852 |
| AlphaLeaf | 2363 | 109 | 0 | 0 | 2472 | $0.006034 |
| GammaBranch | 6274 | 206 | 2560 | 0 | 9040 | $0.015532 |
| GammaBranch.GetGamma | 2366 | 79 | 0 | 0 | 2445 | $0.00568 |
| TOTAL | 21388 | 866 | 34816 | 0 | 57070 | $0.0601312 |

Total 1.2% of $5. openai-codex bills the ChatGPT subscription; this is omp's catalog-price estimate, not a bill. Cache warming configured off; one assistant message per tool-call/answer turn observed and no extra idle requests observed; absence is observed, not proven.

### kill and cleanup

At 00:18:58Z the orchestrator ran `tmux -L gd kill-server`, about 5m37s after the first prompt; the watchdog was then killed. 00:19:00Z no omp --profile gd process remained; process-environment scan found no HOME under disposable root. Cleanup counts: home/.omp/profiles/gd/agent/agent.db openai-codex:1; composer.db, history.db, models.db, skill-descriptions.db, legacy-pi-extension-cache.db no rows/table. Root gone; no tmux server.

Live after cleanup: SHA-256 cac283c86ccf010f9dd55fd81d6f0adbc7085f7942783d3c125a3e6ef423e688, mtime local 19:19:58.097614015 (=00:19:58Z), size 1273856; byte identity FAILED. Four attribution points: (1) mtime about 60s after gd kill and no processes; (2) last live=true guard at 00:17:19.9Z; (3) two live-HOME omp --extension <orca status extension> processes held agent.db/-wal/-shm and WAL grew 729272 B to 4120032 B, consistent with live-session checkpoint; (4) read-only live auth metadata had anthropic 1, openai-codex 1, zhipu-coding-plan 1, newest updated_at 2026-10-02T22:58:25Z before baseline/sign-in, so no live credential row changed. Criterion FAILED, attributed to live omp WAL checkpoint. Niko chose to revoke the openai-codex session created for this run; as of evidence time he confirmed it is not yet revoked (pending). Browser tabs were closed.

### real-run receipt archive

The 12 receipt files are one gzip+base64 JSON archive. Each member is {name, content}; content is normalized UTF-8 and the manifest hashes those bytes.

Throwaway archiver source SHA-256 e6e05d4aba8b58d46fa55efe9f49efe3f04eaf443642cb4ed3e85a89f734495a:
This corrected archiver supersedes the earlier archive run: it preserves disposable <work>/root/home paths and normalizes loopback ports.

```ts
import { createHash } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { hostname } from "node:os";

const root = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const home = process.env.HOME ?? "";
const host = hostname();
const slash = String.fromCharCode(47);
const tick = String.fromCharCode(96);
const pathTail = `[^${slash}\\s\\"'${tick}]+`;
const homePath = new RegExp(`${slash}${["home"].join("")}${slash}(?!\\.omp(?:${slash}|$))${pathTail}`, "g");
const windowsPath = new RegExp(`${slash}${["mnt", "c", "Users"].join(slash)}${slash}${pathTail}`, "gi");
const normalize = (text) => text
  .replaceAll(root, "<work>")
  .replaceAll(basename(root), "<work>")
  .replaceAll(home, "HOME")
  .replaceAll(host, "HOST")
  .replaceAll(homePath, "HOME")
  .replaceAll(windowsPath, "HOME")
  .replaceAll(/127.0.0.1:[0-9]+/g, "127.0.0.1:<port>");
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const members = [];
for (const name of (await readdir(join(root, "receipts"))).sort()) {
  const raw = await readFile(join(root, "receipts", name));
  const content = normalize(raw.toString("utf8"));
  const bytes = Buffer.from(content, "utf8");
  members.push({ name: `receipts/${name}`, content, bytes: bytes.length, sha256: sha(bytes) });
}
const payload = Buffer.from(JSON.stringify({ members }, null, 2) + "\n", "utf8");
const gz = gzipSync(payload, { level: 9, mtime: 0 });
const base64 = gz.toString("base64");
const decoded = JSON.parse(gunzipSync(Buffer.from(base64, "base64")).toString("utf8"));
if (JSON.stringify(decoded) !== JSON.stringify({ members })) throw new Error("archive decode mismatch");
const launcherRaw = await readFile(join(root, "gd.ts"));
const launcher = normalize(launcherRaw.toString("utf8"));
const source = await readFile(new URL(import.meta.url));
const result = {
  launcher,
  launcherSha256: sha(Buffer.from(launcher, "utf8")),
  launcherOriginalSha256: sha(launcherRaw),
  scriptSha256: sha(source),
  archiveSha256: sha(gz),
  gzipBytes: gz.length,
  members: members.map(({ name, content, bytes, sha256 }) => ({ name, content, bytes, sha256 })),
  base64: base64.match(/.{1,76}/g).join("\n"),
  decodedVerified: true,
};
await writeFile(out, JSON.stringify(result));
console.log(JSON.stringify({ archiveSha256: result.archiveSha256, gzipBytes: result.gzipBytes, members: members.length, launcherSha256: result.launcherSha256, launcherOriginalSha256: result.launcherOriginalSha256, scriptSha256: result.scriptSha256, decodedVerified: true }));
```

Invocation (successful, cwd <tmp>); stdout (verbatim):

```text
bun <tmp>/gd-realrun-archive2.mjs <work> <tmp>/gd-realrun-bundle2.json
{"archiveSha256":"74f9a121bd9064ad31a46536b6aa99a819acb71b2bc31f84a7e11a87cacb90fb","gzipBytes":6442,"members":12,"launcherSha256":"8ee68fe8cdff5c06aba52b038a4ff953b2ca78cd85a575980d3aee6a1b04fbd3","launcherOriginalSha256":"8ee68fe8cdff5c06aba52b038a4ff953b2ca78cd85a575980d3aee6a1b04fbd3","scriptSha256":"e6e05d4aba8b58d46fa55efe9f49efe3f04eaf443642cb4ed3e85a89f734495a","decodedVerified":true}
```

Manifest:

| name | bytes | sha256 |
|---|---:|---|
| receipts/cleanup.json | 988 | 6a565398754a720bc61540270417aabcd53b29d06ba261c9c9679cb033b90307 |
| receipts/conns.jsonl | 2427 | f2917219efc51bf221d5b8b2286faee650d613e6cce98a5d85e032716aeec4ae |
| receipts/final-screen.txt | 34080 | e1736f7171983f939abb01e10956dac4e005a6ead053d34912c8e4b15c2dbf71 |
| receipts/first-prompt.json | 67 | 05062a629a424d87c9012ce4feac10876c160c363b6fe0219c9c75e108f40259 |
| receipts/identity-compare.json | 1914 | b6692bee0448412934797a69b03d8aa57a8231f12b3d6c58599ae1daeae72c5c |
| receipts/live-before.json | 138 | 8c14ed2e969946de70a9d872be27ce948a919b53b2ac523e9a7c4bd35b88d9cc |
| receipts/models-ls.json | 768 | adff32ed5f7f52ef22b3d92f0fa366a201d974d78f63fa62f9f3e692765d1ca8 |
| receipts/netprobe.json | 7091 | cf05b64e14e7e5f4bfedd32a5ddd42c995b2a1a3f2fda22b45afb58e65f19c74 |
| receipts/sent.jsonl | 1559 | edd085d7b0b672f2e04eff31129c4f85da388c7ea75133a1c472c199e1dcb669 |
| receipts/usage.json | 1392 | 1f8bdb26f2d249c628e5cda97e3c4b3d68b0cc5bf569985c206353e3c5526374 |
| receipts/viewer-body.txt | 3170 | d28f8d85c9647d56695fc21e2228fa07051ea8351561ecac05a3c93c213b3056 |
| receipts/viewer-transcripts.json | 190 | 8379800ceed93d47f41b5a9cca61beffea366a0a2f71884f938b548f8ce83ddf |

Decode recipe: save the block as gd-realrun-archive.base64, then base64 -d gd-realrun-archive.base64 | gzip -d > gd-realrun-archive.json. Use jq -j .members[] content selection for each name. Builder decoded gzip and compared JSON before recording decodedVerified true.

```gzip-base64
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
AA==
```

### gd criteria summary

| gd criterion | qualified result |
|---|---|
| package digest | Pass: reference and post-v13 digests match for the approved 0.1.0 package bytes, including the uncommitted one-line version fix. |
| real run bounds | Qualified: exactly 3 children, one nested; single configured model and cache warming off. The one-short-task plan required three prompts after a preflight failure. The session was killed manually about 5m37s after the first prompt, within the 15-minute limit; watchdog expiry was not exercised. |
| disposable env + no ORCA/key vars | Pass with qualification: no ORCA/key-like names; prompt 2 had only omp-defined helper names. |
| credential confinement | Pass with qualification: disposable db 1 row; read-only live metadata shows rows untouched. |
| live store byte-identity | FAILED, attributed to live-session WAL checkpoint. |
| approved provider only after first prompt | Qualified: sampled connections, not packet capture. |
| viewer identity/outcome vs native facts | Qualified: fields matched; registry status not compared directly. |
| usage vs $5 | Pass: $0.0601312, 1.2%. |
| v13 omp half | Pass for the temporary npm 18.4.12 artifact: compatible-branch checks passed, including a bounded multi-page reader component check on an enlarged native transcript copy, not an HTTP/browser read. The installed compiled 18.4.12 binary separately reached observer ready during the real run. |
| v13 orca half | Gap. |
| release record | Pass: existing record unchanged. |
| cleanup | Qualified: root/processes/tmux removed; provider session revocation remains pending; live-store identity FAILED as attributed. |

## v13 — per-release smoke

### Release selection and disposable omp install

```text
gh release list -R can1357/oh-my-pi -L 3
v18.4.12  Latest  v18.4.12  2026-10-02T16:03:50Z
v18.4.11          v18.4.11  2026-10-02T15:12:46Z
v18.4.10          v18.4.10  2026-10-02T01:35:53Z
exitCode=0

gh release list -R stablyai/orca -L 3
v1.4.219  Latest  v1.4.219  2026-10-02T20:59:25Z
v1.4.218          v1.4.218  2026-09-30T20:53:08Z
v1.4.217          v1.4.217  2026-09-29T19:40:43Z
exitCode=0

npm view @oh-my-pi/pi-coding-agent@18.4.12 dist.integrity
sha512-1jVJXxwHT5fm/0UsliP/tQ4qx7GGOI9n64rdQZMcWyiWpjZO8U/e4xdcyJuzLGLXFO4mMVO44f9sEyWXqrZ0jQ==
exitCode=0

mktemp -d -t omp-gd-XXXXXXXX
<tmp>
exitCode=0

sha256sum <tmp>/install.ts
77e252648cedfba1b496d9ea74b12efd9edb611b42b1e2ae7647ce5b8bb019f5  <tmp>/install.ts
exitCode=0

env -i PATH="$PATH" HOME=<tmp> bun run <tmp>/install.ts <tmp>
{"command":["bun","add","@oh-my-pi/pi-coding-agent@18.4.12"],"cwd":"<tmp>/prefix","exitCode":0,"stdout":"bun add v1.3.14 (0d9b296a)\n\ninstalled @oh-my-pi/pi-coding-agent@18.4.12 with binaries:\n - omp\n\n114 packages installed [3.03s]\n\nBlocked 2 postinstalls. Run `bun pm untrusted` for details.\n","stderr":"Resolving dependencies\nResolved, downloaded and extracted [507]\nSaved lockfile\n"}
{"command":["omp","--version"],"cwd":"<tmp>/prefix","exitCode":0,"stdout":"omp/18.4.12\n","stderr":""}
{"binary":"<tmp>/prefix/node_modules/.bin/omp","symlink":"../@oh-my-pi/pi-coding-agent/dist/cli.js","target":"<tmp>/prefix/node_modules/@oh-my-pi/pi-coding-agent/dist/cli.js","packageVersion":"18.4.12","targetSha256":"d659505080c80a091524de1335caccdb815e05367bd825048cda4a0e98d8b7a0","lockLine":"        \"@oh-my-pi/pi-coding-agent\": \"18.4.12\","}
exitCode=0
```

The install succeeded without enabling the two blocked postinstall scripts. The published npm integrity above identifies the selected package; the installed CLI file SHA-256 identifies the temporary entry point. The symlink alone is not the harness-spawned-process proof.

Exact throwaway installation driver (`install.ts`, SHA-256 `77e252648cedfba1b496d9ea74b12efd9edb611b42b1e2ae7647ce5b8bb019f5`):

```ts
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, readFile, readlink, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const root = resolve(process.argv[2]);
const prefix = join(root, "prefix");
const receipts = join(root, "receipts");
for (const dir of [prefix, receipts, ...["home", "config", "cache", "data", "state", "tmp"].map(name => join(root, name))]) {
  await mkdir(dir, { recursive: true });
}
const env = {
  PATH: process.env.PATH ?? "", HOME: join(root, "home"),
  XDG_CONFIG_HOME: join(root, "config"), XDG_CACHE_HOME: join(root, "cache"),
  XDG_DATA_HOME: join(root, "data"), XDG_STATE_HOME: join(root, "state"),
  TMPDIR: join(root, "tmp"), BUN_INSTALL_CACHE_DIR: join(root, "cache", "bun"),
};
const normalize = (text: string) => text.replaceAll(root, "<tmp>").replaceAll(process.env.HOME ?? "\0", "HOME");
async function run(cmd: string[], name: string, path = env.PATH) {
  const proc = Bun.spawn(cmd, { cwd: prefix, env: { ...env, PATH: path }, stdout: "pipe", stderr: "pipe" });
  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited,
  ]);
  const result = { command: cmd, cwd: "<tmp>/prefix", exitCode, stdout: normalize(stdout), stderr: normalize(stderr) };
  await writeFile(join(receipts, name), JSON.stringify(result, null, 2) + "\n");
  console.log(JSON.stringify(result));
  assert.equal(exitCode, 0);
  return result;
}
await run(["bun", "add", "@oh-my-pi/pi-coding-agent@18.4.12"], "install.json");
const path = `${join(prefix, "node_modules", ".bin")}:${env.PATH}`;
await run(["omp", "--version"], "temp-version.json", path);
const binary = join(prefix, "node_modules", ".bin", "omp");
const link = await readlink(binary);
const target = resolve(prefix, "node_modules", ".bin", link);
const metadata = JSON.parse(await readFile(join(prefix, "node_modules", "@oh-my-pi", "pi-coding-agent", "package.json"), "utf8"));
const lock = await readFile(join(prefix, "bun.lock"), "utf8");
const lockLine = lock.split("\n").find(line => line.includes('"@oh-my-pi/pi-coding-agent":'));
const identity = {
  binary: normalize(binary), symlink: link, target: normalize(target), packageVersion: metadata.version,
  targetSha256: createHash("sha256").update(await readFile(target)).digest("hex"), lockLine,
};
await writeFile(join(receipts, "temp-identity.json"), JSON.stringify(identity, null, 2) + "\n");
console.log(JSON.stringify(identity));
assert.equal(metadata.version, "18.4.12");
```

### First diagnostic attempt — discarded

The existing `cold-restart.json` scenario has `fanout.count: 3`; `nested.json` creates only two children. This smoke uses only the initial three-child run of `cold-restart`, not its restart/restoration coverage. v13 requires three children, not nesting.

Exact invocation (repository root):

```text
sha256sum <tmp>/probe.ts <tmp>/compare.ts <tmp>/driver.ts
7cf06f693d1c16b5941547da6cd24a97b62175250ad6f70678e9866c1a8f83b9  <tmp>/probe.ts
833b86b8b5317fd9b0e6e14580245e8d8ff70558bcc838289b39d0aff7435e09  <tmp>/compare.ts
f65adf30b945ed6f1be1d66688f119640628d74135fd9a8cf1b9c8701d64ce03  <tmp>/driver.ts
exitCode=0

env -i PATH="<tmp>/prefix/node_modules/.bin:$PATH" HOME=<tmp>/home TMPDIR=<tmp>/tmp XDG_CONFIG_HOME=<tmp>/config XDG_CACHE_HOME=<tmp>/cache XDG_DATA_HOME=<tmp>/data XDG_STATE_HOME=<tmp>/state bun run <tmp>/driver.ts <tmp>
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gd-disposable-probe from <tmp>/probe\n","stderr":""}
COMMAND ["omp","--profile","cold-restart","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]
BINARY_IDENTITY {"pid":3653173,"executable":"HOME/.npm-global/lib/node_modules/bun/bin/bun.exe","cmdline":["bun","<tmp>/prefix/node_modules/.bin/omp","--profile","cold-restart","--mode","rpc","--no-lsp","--no-title","--model","stub/scripted"]}
RPC_COMMAND HARNESS_AGENT=main
RPC_COMMAND /gd dump
BRANCH compatible candidate; all sub-criteria are checked separately
DRIVER_ERROR TypeError: null is not an object (evaluating 'snapshot.schema')
PROCESS_EXIT 143
PROFILE_PATH <tmp>/harness
PROFILE_REMOVED true
exitCode=1
```

The probe's separately imported coordinator had `snapshot:null`; it was not the publisher's module instance. Thus this attempt is **not** accepted as an identity, load or reader verification. The native registry contained exactly `restart-1`, `restart-2`, `restart-3`, each with a completed lifecycle fact. Native RPC output also retained two `409 Unscripted turn` errors after the three background results auto-delivered beyond the scenario's two scripted main turns; neither the scenario nor provider was changed to hide them. The package's actual guidance appeared in the RPC stream. Full normalized receipts and exact executed source are retained in the single archive below.

### Real TUI/HTTP smoke and captured-artifact re-comparison

Reused the hash-identical `gc3` stdlib PTY driver, the harness `create("cold-restart")` disposable profile, the embedded v02 native-registry comparison, and the v08 native-copy reader pattern. The actual package was linked unchanged; only the disposable startup wizard/splash/update checks were disabled. No simulated TUI context, modified package, new dependency, or real provider was used.

Exact source hashes and invocation (repository root):

```text
sha256sum <tmp>/pty-driver.py <tmp>/tui-probe.ts <tmp>/compare-tui.ts <tmp>/tui-driver.ts
e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747  <tmp>/pty-driver.py
8d8af07e722805e9b0ac9e4a9fd81b2a07604242dc36e75680c182ba73bbc228  <tmp>/tui-probe.ts
daf71d555a80de1105b40186e778e60a2af782f3545c26b49c854c1e7388c707  <tmp>/compare-tui.ts
fff509854c1f2de2e60a92c001d87e2d414abbcafbdd37aba0ded60ff7cedc2e  <tmp>/tui-driver.ts
exitCode=0

env -i PATH="<tmp>/prefix/node_modules/.bin:$PATH" HOME=<tmp>/home TMPDIR=<tmp>/tmp XDG_CONFIG_HOME=<tmp>/config XDG_CACHE_HOME=<tmp>/cache XDG_DATA_HOME=<tmp>/data XDG_STATE_HOME=<tmp>/state bun run <tmp>/tui-driver.ts <tmp> "$HOME"
PROBE_LINK {"exitCode":0,"stdout":"✔ Linked gd-tui-probe from <tmp>/tui-probe\n","stderr":""}
COMMAND ["python3","<tmp>/pty-driver.py","--profile","cold-restart","--no-lsp","--no-title","--model","stub/scripted"]
READY {"type":"ready","pid":3664726,"mode":"tui","agent":{"kind":"main","id":"Main","name":"main","depth":0},"root":"<tmp>/harness/HOME/.omp/profiles/cold-restart/agent/sessions/--tmp-<scratch-key>-tmp-<profile-key>-workspace--/2026-10-02T23-48-30-262Z_01a0ff04-f5b6-7000-a51b-a4d28cf6a34e.jsonl","compat":{"state":"ready"},"probes":{"version":"18.4.12","list":"function","get":"function","onChange":"function","parseSessionContent":"function","eventsOn":"function","agentKind":"main","agentIdType":"string"},"executable":"HOME/.npm-global/lib/node_modules/bun/bin/bun.exe","cmdline":["bun","<tmp>/prefix/node_modules/.bin/omp","--profile","cold-restart","--no-lsp","--no-title","--model","stub/scripted"]}
TUI_COMMAND HARNESS_AGENT=main
TUI_COMMAND /observer status
TUI_COMMAND /observer serve
TUI_COMMAND /observer grant all
BOOTSTRAP {"origin":"http://127.0.0.1:<port>/","code":"<code sha256:9d6d3749>"}
EXCHANGE {"status":200,"schema":1,"epoch":"4dae0ea3-36e0-41ce-8459-8cd8e62733b1","credential":"<withheld>"}
SNAPSHOT {"status":200,"schema":"1","epoch":"4dae0ea3-36e0-41ce-8459-8cd8e62733b1","children":3,"inventory":{"state":"complete"}}
TUI_COMMAND /gd dump
IDENTITY {"passed":false,"nativeChildren":3,"rows":3,"fieldChecks":131,"differences":[{"field":"restart-2.completeness","actual":{"state":"unknown","reason":"native registry does not record full lineage"},"expected":{"state":"unknown","reason":"registry does not record full lineage"}},{"field":"restart-1.completeness","actual":{"state":"unknown","reason":"native registry does not record full lineage"},"expected":{"state":"unknown","reason":"registry does not record full lineage"}},{"field":"restart-3.completeness","actual":{"state":"unknown","reason":"native registry does not record full lineage"},"expected":{"state":"unknown","reason":"registry does not record full lineage"}}]}
LOAD {"processes":1,"publishers":1,"mainBindings":1,"childBindings":3,"unavailable":0,"nativeChildren":3,"allChildrenSameProcess":true}
TUI_COMMAND /gd read
READER {"parserVersion":"18.4.12","nativeBytes":14320,"copyBytes":976830,"pageLimit":262144,"pages":4,"largestPayload":254947,"largestPhysicalRead":262144,"ended":true,"exactBytes":true,"nativeUnchanged":true}
DRIVER_ERROR AssertionError [ERR_ASSERTION]: HTTP row comparison failed

false !== true

TUI_STOP {"nativeStatus":null,"wrapperExit":0,"stderr":""}
PROFILE_REMOVED true
exitCode=1
```

This exit-1 attempt is retained, not relabelled as an exit-0 run. The only three field mismatches were the driver's own over-specification of the completeness-reason wording: actual `native registry does not record full lineage` versus expected `registry does not record full lineage`. The retained v02 comparator requires `state:"unknown"` and a nonempty limitation, not that invented exact string. The orchestrator approved aligning only the disposable comparator with that existing criterion and re-comparing the same captured artifacts. No package/scenario fix and no new scenario run occurred.

```text
sha256sum <tmp>/compare-final.ts <tmp>/recompare.ts
e14b0714c2c9c5d024e447c033a034a22a764f32ac178f76d7c34be6ab912e9d  <tmp>/compare-final.ts
737fa3cbc9f973fe6bc96a58d9b45cb6ae0499bf6c4cd9ffa2abdb8d438abf5a  <tmp>/recompare.ts
exitCode=0

env -i PATH="$PATH" HOME=<tmp>/home TMPDIR=<tmp>/tmp bun run <tmp>/recompare.ts <tmp>
RECOMPARE {"passed":true,"nativeChildren":3,"rows":3,"fieldChecks":134,"differences":[],"source":"captured authenticated HTTP snapshot and independent native registry dump"}
exitCode=0
```

Both comparator versions and their exact bytes/hashes are embedded as separate archive members; the original failed receipt remains intact.

### Branch and sub-criterion results

Slice criteria, verbatim:

> **compatible:** the version floor and probes pass; v01's load clause passes (one `publisher` log line per process, children inert); a short identity check (3 children: every row field vs the registry) and a short reader check (one multi-page transcript read to the end in bounded pages) pass.
>
> **incompatible:** the log shows `omp-orca-observer: unavailable <reason>`; the observer does no work (no publisher line, no endpoint, zero observer i/o in the attributable log); the same 3-child stub scenario completes natively with results identical to a run without the package.

Observed branch: **compatible**, with the following measured scope; the incompatible branch is not applicable and was not simulated.

| Sub-criterion | Observed result |
|---|---|
| Latest official omp tag, npm identity, reported version | Verified: `v18.4.12`, npm integrity recorded above, temporary binary reports `omp/18.4.12`. |
| Binary that actually drove the harness scenario | Verified: native PID `3664726` `/proc/<pid>/cmdline` contains `<tmp>/prefix/node_modules/.bin/omp`; `/proc/<pid>/exe` is Bun's executable, not falsely described as an omp compiled binary. |
| Version floor + exact probes | Verified: native `api.pi.VERSION = 18.4.12` is above `OMP_FLOOR = 18.3.5`; `checkCompat` returns `ready`; registry `list/get/onChange`, `parseSessionContent`, `events.on` are functions; actual main/sub identities have string ids. |
| One publisher log line per process, children inert | Verified for this one process: native log PID `3664726` contains exactly one main bind, one publisher epoch, three sub binds and zero unavailable lines. All three children bind in that same PID; none elects another publisher. “Inert” here is publisher-inert, not a claim of zero native task CPU. |
| Exactly three children | Verified: `restart-1`, `restart-2`, `restart-3`; each has its independent native completed lifecycle fact. |
| Every child row field versus registry | Verified on the real HTTP snapshot and independent same-process registry dump: 134 checks, zero differences after canonical v02 re-comparison. Identity/model/status/tombstone/milestones/activity/cwd/branch use registry/live fields; outcome uses native lifecycle facts (observer timestamp compared within the retained v02 1-second tolerance); unavailable lineage/completeness fields remain explicitly unknown, not invented. Schema/keys/timestamp validity and authenticated `grantScope:"granted"` are checked separately as derived observer fields. All 16 `ChildRow` top-level fields and their nested fields are covered. |
| One multi-page bounded transcript to EOF | Verified by the reused v08 native-copy method under the native 18.4.12 parser: one 976,830-byte disposable copy, 4 pages, EOF true, byte-for-byte reconstruction, no reset/gap/overlap, all payloads ≤ 262,144 bytes; largest payload 254,947. Every physical read ≤ 262,144 bytes; continuation revalidates only the prior complete record. The original 14,320-byte native child transcript was unchanged. This is a component reader check on the explicitly approved native copy enlarged with 12 native-template records, not a claim of a multi-page HTTP/browser transcript. |

The four delivered ranges were `[0,254947)`, `[254947,495574)`, `[495574,736201)`, `[736201,976830)`; all pages reported `malformed:0`. Full page receipts, snapshot, native registry, lifecycle trace, TUI screen and stub request digests are in the archive.

### Post-v13 pack equality

Working directory `omp-orca-observer/`:

```text
bun pm pack
bun pack v1.3.14 (0d9b296a)
packed 394B package.json
packed 6.91KB auth.ts
packed 10.86KB commands.ts
packed 2.26KB compat.ts
packed 9.1KB contract.ts
packed 5.14KB coordinator.ts
packed 1.92KB guidance.ts
packed 5.61KB index.ts
packed 3.74KB outcomes.ts
packed 7.1KB reader.ts
packed 12.90KB stock-source.ts
packed 9.51KB transport.ts
packed 23.87KB viewer/index.html
omp-orca-observer-0.1.0.tgz
Total files: 13
Shasum: e82c8485d879ddb133cba4df88b18a3afb622a6f
Integrity: sha512-yTQPnjxS7u6/8[...]zDKssGvaGuyyA==
Unpacked size: 99.27KB
Packed size: 26.36KB
exitCode=0

sha256sum omp-orca-observer-0.1.0.tgz
7ea2a73a6cda54e018f7fd8152648ec84e138838730d326e4884871155dca153  omp-orca-observer-0.1.0.tgz
exitCode=0

tar -tzf omp-orca-observer-0.1.0.tgz
package/package.json
package/auth.ts
package/commands.ts
package/compat.ts
package/contract.ts
package/coordinator.ts
package/guidance.ts
package/index.ts
package/outcomes.ts
package/reader.ts
package/stock-source.ts
package/transport.ts
package/viewer/index.html
exitCode=0

rm -- omp-orca-observer-0.1.0.tgz
exitCode=0; no output
```

**Equality verified:** post-v13 tarball SHA-256 equals the reference `7ea2a73a6cda54e018f7fd8152648ec84e138838730d326e4884871155dca153`; the member inventories are identical. Evidence files and harness scripts are not in the 13-member release package.

### Orca half of v13 — gap

Installed app `1.4.217` is older than latest official `v1.4.219`. Per Niko's decision, the Orca half of v13 remains a **gap until Niko updates Orca**. This worker did not update Orca or exercise the latest app. Exceeding the package's `ORCA_FLOOR = 1.4.205` is not a substitute for testing the latest official release.

## release record

Date: **2026-10-02**. Package version **0.1.0**, orchestrator-approved one-line metadata fix, uncommitted.

```text
orca-ide skills get orca-cli
exitCode=0; full version-matched guide received and read before status

omp --version
omp/18.4.12
exitCode=0

orca-ide status --json
projection: {"ok":true,"result":{"runtime":{"state":"ready","appVersion":"1.4.217"}}}
exitCode=0

gh release view v1.4.219 -R stablyai/orca --json assets
exitCode=0; asset metadata received; this CLI's assets schema does not expose digest

gh release view v1.4.217 -R stablyai/orca --json assets
exitCode=0; asset metadata received; this CLI's assets schema does not expose digest

gh api repos/stablyai/orca/releases/tags/v1.4.219 --jq '.assets[] | {name, digest, size}'
exitCode=0; 21 asset names/sizes/SHA-256 digests recorded

gh api repos/stablyai/orca/releases/tags/v1.4.217 --jq '.assets[] | {name, digest, size}'
exitCode=0; 21 asset names/sizes/SHA-256 digests recorded
```

| Release | Artifact identity and tested state |
|---|---|
| omp `v18.4.12` | Tested temporary npm installation: `sha512-1jVJXxwHT5fm/0UsliP/tQ4qx7GGOI9n64rdQZMcWyiWpjZO8U/e4xdcyJuzLGLXFO4mMVO44f9sEyWXqrZ0jQ==`; installed CLI entry-point SHA-256 `d659505080c80a091524de1335caccdb815e05367bd825048cda4a0e98d8b7a0`. The installed live CLI separately reports the same version; its smoke was not substituted for the temporary release. |
| Orca `v1.4.217` | Installed `appVersion` observed, not a latest-release v13 pass. Official `orca-ide_1.4.217_amd64.deb`: 180,987,924 bytes, `sha256:dc84039c473833cab6f22dc911927f4ce14d7869b1a5d2e604636976ec4b71bd`. This names an official artifact, not a proof that this installed desktop was installed from that .deb. |
| Orca `v1.4.219` | Latest tag recorded, app not installed/tested. Official `orca-ide_1.4.219_amd64.deb`: 180,980,212 bytes, `sha256:b5f926e5383cbf27f160eebbac5221006b67eaa54930c8ab6562fcad77c45059`. |
| Observer reference package | `omp-orca-observer-0.1.0.tgz`, SHA-256 `7ea2a73a6cda54e018f7fd8152648ec84e138838730d326e4884871155dca153`; exact post-v13 equality verified. |

All 42 Orca release asset identities are embedded in `receipts/orca-assets.json`. These are official API metadata, not locally downloaded/rehash-verified binaries.

### receipt archive

All bulky receipts and all 11 throwaway source files are embedded once in this gzip+base64 JSON archive. `members[].content` is the exact UTF-8 source/normalized receipt, including final newlines; the manifest hashes those bytes, not a code-fence rendering. The two failed attempts, both TUI comparator versions, final captured-artifact comparison, complete normalized RPC/TUI outputs, native registry/snapshot and all official Orca asset identities are included.

Executed archiving commands (successful invocation's cwd: `<tmp>`):

```text
sha256sum <tmp>/archive.ts
bdda502fd419ad32a7660d78b448a3ebd94fa6704162d58a1f0fff4c37852646  <tmp>/archive.ts
exitCode=0

env -i PATH="$PATH" HOME=<tmp>/home TMPDIR=<tmp>/tmp bun run <tmp>/archive.ts <tmp> "$HOME"
ARCHIVE {"gzipBytes":39781,"gzipSha256":"4f770ededff221c53877c7288a11578fa1f21ff6677aa7fb7fc952ba0fbd87a0","members":31}
exitCode=0
```

Reproducible manifest:

| Member | Bytes | SHA-256 |
|---|---:|---|
| `archive.ts` | 1633 | `bdda502fd419ad32a7660d78b448a3ebd94fa6704162d58a1f0fff4c37852646` |
| `compare-final.ts` | 5965 | `e14b0714c2c9c5d024e447c033a034a22a764f32ac178f76d7c34be6ab912e9d` |
| `compare-tui.ts` | 5867 | `daf71d555a80de1105b40186e778e60a2af782f3545c26b49c854c1e7388c707` |
| `compare.ts` | 5868 | `833b86b8b5317fd9b0e6e14580245e8d8ff70558bcc838289b39d0aff7435e09` |
| `driver.ts` | 9009 | `f65adf30b945ed6f1be1d66688f119640628d74135fd9a8cf1b9c8701d64ce03` |
| `install.ts` | 2573 | `77e252648cedfba1b496d9ea74b12efd9edb611b42b1e2ae7647ce5b8bb019f5` |
| `probe.ts` | 7508 | `7cf06f693d1c16b5941547da6cd24a97b62175250ad6f70678e9866c1a8f83b9` |
| `pty-driver.py` | 1676 | `e9e31ace0bb615de881fe070e9bdb94417c715ef14e4ad01d8deec74b0e74747` |
| `receipts/final-comparison.json` | 4656 | `01cdf224baed3e21fd416df750f697fae42aff95ff8237a8236ebf64884c0c1d` |
| `receipts/install.json` | 436 | `9b6cf85ba2332a3cd7508dd4c6f971733096634dc6710e9f96bd6ee02121c298` |
| `receipts/native-and-snapshot.json` | 8322 | `8bdf3f8073dcdd5b8c338d96f5ed8f56969cb28c001fdf5e15c2c47805f0bfc7` |
| `receipts/observer-trace.jsonl` | 12474 | `07bf321cdd6a2f7ba8aede8769e90060cfa5c204ea24a7ef9aebfd2ff5337d8b` |
| `receipts/orca-assets.json` | 7694 | `074f26ee4c33bd243d9ab4d9556ed7510e6d1fae59bf3e3c778efd4c0911c30c` |
| `receipts/recompare-output.txt` | 174 | `26a01d4bbb42781897c2e92277b5cc175e480b089cb5e9a7f1e3a04693aebd0d` |
| `receipts/rpc-stderr.txt` | 0 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| `receipts/rpc-stdout.jsonl` | 81969 | `662b6ebc1d3a7edd509095e009fdd6776dff1398b647d9941365c5e5a5359fc6` |
| `receipts/smoke-output.txt` | 1447 | `700fbe63ff32fea0f3033354a755dfe6fbfacd5d04c14526b8f2f93b7eff13f9` |
| `receipts/stub-capture.jsonl` | 4967 | `0d71881eedc747aeeb0def9ddb9dfd51fa1629cdd0691c32041aa9cd4dc2718e` |
| `receipts/temp-identity.json` | 375 | `33a7bf9e4a22434c0fb4c7131dccc2e8985b6c9e3ccf9058f112c0fc8e1be778` |
| `receipts/temp-version.json` | 137 | `89b93a892051bcde45fab914cfbe19b0d7b6adf3680eec19126791bedd3e3799` |
| `receipts/tui-comparison.json` | 5394 | `3722d7a529cf095546c0fa1d932edab8a1ec3ff71c58175b7a6e5c56fc6bb7bb` |
| `receipts/tui-native-and-snapshot.json` | 16224 | `fc7abb7f3fd516f7e42ae94b2508d5f59efd2d5795f75cd6b7b1154b757078ac` |
| `receipts/tui-observer-logs.json` | 1270 | `b51011226bf80319d8102ac28e4b1abd52772189f980a3e72d6886521a17aefe` |
| `receipts/tui-observer-trace.jsonl` | 13317 | `41686d34dfcb6f9280c1b2ddb5bd0f685da5566f81ca2008d703feedc53123f9` |
| `receipts/tui-reader.json` | 1676 | `fa98efa2dfab764574e53a892cc1715ee6330591216d4989c9edd12688ddd5a5` |
| `receipts/tui-screen.txt` | 115210 | `b9ffa95fa45b0f34536194290de4ff2ee3c759e9bb656af8659b0008233fec7f` |
| `receipts/tui-smoke-output.txt` | 2605 | `9854373ee35fdcc510868893d18da0084e72d7781023b6c2034292f4e9e406f0` |
| `receipts/tui-stub-capture.jsonl` | 3974 | `8bb680b1461c9156474e52e03dcaab20119f0aa2a40eb078df27e4cd385e207d` |
| `recompare.ts` | 997 | `737fa3cbc9f973fe6bc96a58d9b45cb6ae0499bf6c4cd9ffa2abdb8d438abf5a` |
| `tui-driver.ts` | 10934 | `fff509854c1f2de2e60a92c001d87e2d414abbcafbdd37aba0ded60ff7cedc2e` |
| `tui-probe.ts` | 6423 | `8d8af07e722805e9b0ac9e4a9fd81b2a07604242dc36e75680c182ba73bbc228` |

Decode recipe, not executed during this gate: save the following block as `gd-archive.base64`, then:

```sh
base64 -d gd-archive.base64 | gzip -d > gd-archive.json
jq -j '.members[] | select(.name == "tui-driver.ts") | .content' gd-archive.json > tui-driver.ts
```

Apply the same `jq -j` selection for each member to reproduce its exact bytes. The recorded source hashes identify the first RPC attempt, the original TUI attempt and the final artifact-only re-comparison separately; `pty-driver.py` is exactly the retained gc3 source.

```gzip-base64
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
```

### cleanup receipt

Each smoke driver returned `profileTornDown: true`. Independent process receipts below confirm that neither recorded native PID remained. A pre-cleanup directory probe nevertheless found `<tmp>/tmp/omp-orca-harness-<profile-key>/HOME/.omp/`; the enclosing owned `<tmp>` was therefore removed in full rather than treating the helper teardown flag as sufficient. This deleted the temporary npm prefix, caches, disposable homes/profiles, scripts, copied transcript and archive scratch files. The embedded archive is the only retained copy.

```text
pgrep -af -- '[o]mp-gd-<scratch-key>/prefix/node_modules'
(no output)
exitCode=1; no matching temporary-CLI process

ps -p 3653173,3664726 -o pid=,args=
(no output)
exitCode=1; neither native PID remained

ls -d -- <tmp>/tmp/omp-orca-harness-*
<tmp>/tmp/omp-orca-harness-<profile-key>
exitCode=0; leftover owned directory found before enclosing cleanup

pgrep -af -- '[o]mp-gd-<scratch-key>'
(no output)
exitCode=1; no process referencing this disposable root before removal

rm -rf -- <tmp>
(no output)
exitCode=0

pgrep -af -- '[o]mp-gd-<scratch-key>'
(no output)
exitCode=1; no process referencing this disposable root after removal

ls -d -- <tmp>
ls: cannot access '<tmp>': No such file or directory
exitCode=2; owned disposable root is absent
```

Both package tarballs were removed immediately after their digest/listing receipts (`rm -- omp-orca-observer-0.1.0.tgz`, exit 0). The final independent `read` of `omp-orca-observer/omp-orca-observer-0.1.0.tgz` returned `Path not found`.

The first archiver/`pgrep`/`ps` requests from the repository cwd were rejected before execution by a sibling worktree mutation lease (`worktree mutation busy after 5.0s`); these are **not run**, not check failures or passes. The successful requests above used the disposable cwd or system temporary-directory cwd. `ncm list` found zero contracts applying to this evidence file; no declaration contract was changed.

## unverified

- **Real-run residuals:** live-store byte match FAILED and is attributed to live-session WAL checkpoint evidence; registry status was not compared directly; connection checks were sampled rather than packet capture; cache-warming absence was observed, not proven; the TUI exit after sign-in remains unexplained; the one-task plan deviated into three prompts after the preflight failure; the kilo endpoint matched only by /16; sign-in source line numbers were not captured and Codex OAuth support is scout-reported.
- **Provider revocation residual:** Niko chose to revoke the openai-codex session created for this run; as of evidence time he confirmed it is not yet revoked (pending).
- **Latest Orca half of v13 remains a gap:** latest is `v1.4.219`, installed `appVersion` is `1.4.217`. No app update was attempted. Official release-asset digests are metadata only; no downloaded asset or installed desktop binary was independently rehashed.
- The temporary omp `18.4.12` selects the **compatible** branch. The incompatible branch's zero-observer-I/O and native-equivalence criteria were not applicable and were not run.
- The bounded multi-page reader check uses a copy of an independently recorded native child transcript, expanded with native-template records, and the release's native parser. It is a production-reader component check, not an HTTP/browser multi-page check or evidence that the untouched native transcript itself spanned multiple pages. The original native file stayed byte-for-byte unchanged.
- The first RPC attempt's module-instance mismatch and the original TUI comparator's over-specific completeness-reason assertion remain preserved failures. The corrected canonical comparator passed on already captured authenticated HTTP/native artifacts; no smoke rerun, changed snapshot, weakened product assertion or production fix was substituted for them. The retained stub output also contains unscripted-turn errors after the three completed children; it is not a claim of a successful real-provider task.
- No typecheck, lint, formatter, full test suite, install into the live omp profile, commit, push or publication was performed. The orchestrator owns the remaining review/gates and any separately approved live action.
