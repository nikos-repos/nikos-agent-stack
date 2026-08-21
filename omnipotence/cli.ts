#!/usr/bin/env bun

import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { blueprintservice } from "./blueprints.ts";
import { assertvalid, jsonvalueof, parsejson } from "./contracts.ts";
import type { jsonvalue, orchestrationmode } from "./contracts.ts";
import { orchestrationengine } from "./engine.ts";
import type { advanceresult } from "./engine.ts";
import { loadactiveblueprints } from "./loader.ts";
import { publicmodes } from "./processes.ts";
import { mergepatch, profileservice } from "./profiles.ts";
import { orchestrationstore } from "./store.ts";

export interface clioptions {
	dbpath?: string;
	blueprintroot?: string;
	cwd?: string;
	stdout?: (text: string) => void;
	stderr?: (text: string) => void;
}

class clierror extends Error {
	readonly exitcode: number;
	readonly code: string;

	constructor(message: string, exitcode = 2, code = "usage_error") {
		super(message);
		this.exitcode = exitcode;
		this.code = code;
	}
}

const usage = `omnipotence commands:
  run start|status|events|resume|halt|list
  effect list|show|post|resolve-uncertain
  session status|bind|unbind
  process list|show|validate|plan
  profile show|write|merge|render
  blueprint list|inspect|install|update|rollback|remove
  hook list|inspect|probe
  doctor
  repair

global flags: --json --dry-run --help --version`;

const commandflags: Record<string, readonly string[]> = {
	"run start": ["--mode", "--input", "--profile", "--process-version", "--session"],
	"run resume": ["--input"],
	"run halt": ["--reason"],
	"effect post": ["--root", "--fence", "--input-hash", "--status", "--value", "--error"],
	"effect resolve-uncertain": ["--root", "--fence", "--input-hash", "--decision", "--value", "--error"],
	"session bind": ["--force"],
	"process plan": ["--input"],
	"profile show": ["--root"],
	"profile write": ["--root", "--input"],
	"profile merge": ["--root", "--input"],
	"profile render": ["--root"],
	"hook probe": ["--input"],
};

function assertknownflags(args: readonly string[], command: string): void {
	const allowed = commandflags[command] ?? [];
	for (const value of args) {
		if (value.startsWith("--") && !allowed.includes(value)) {
			throw new clierror(`unknown flag ${value} for ${command}`);
		}
	}
}

function pullflag(args: string[], name: string): string | undefined {
	const index = args.indexOf(name);
	if (index < 0) return undefined;
	const value = args[index + 1];
	if (value === undefined || value.startsWith("--")) throw new clierror(`${name} requires a value`);
	args.splice(index, 2);
	return value;
}

function pullboolean(args: string[], name: string): boolean {
	const index = args.indexOf(name);

	if (index < 0) return false;
	args.splice(index, 1);
	return true;
}
function parsehash(value: string | undefined, label: string): string {
	if (value === undefined || !/^[a-f0-9]{64}$/.test(value)) {
		throw new clierror(`${label} requires a sha256 value`);
	}
	return value;
}

function required(args: string[], index: number, label: string): string {
	const value = args[index];
	if (!value || value.startsWith("--")) throw new clierror(`${label} is required`);
	return value;
}

function jsonargument(args: string[], name: string, fallback: jsonvalue): jsonvalue {
	const value = pullflag(args, name);
	return value === undefined ? fallback : parsejson(value, name);
}

function parseinteger(value: string | undefined, label: string): number {
	if (value === undefined || !/^\d+$/.test(value)) throw new clierror(`${label} requires an integer`);
	return Number(value);
}

function parsemode(value: string | undefined): orchestrationmode {
	const mode = value ?? "babysit";
	if (mode === "resume" || !publicmodes.includes(mode)) throw new clierror(`unsupported run mode ${mode}`);
	return mode;
}

function human(data: jsonvalue): string {
	return `${JSON.stringify(data, null, 2)}\n`;
}

function resultvalue(result: advanceresult): jsonvalue {
	return jsonvalueof(result, "cli result");
}

function resultcode(result: advanceresult): number {
	return result.status === "blocked" ? 3 : 0;
}

export async function runcli(argv: readonly string[], options: clioptions = {}): Promise<number> {
	const args = [...argv];
	const json = pullboolean(args, "--json");
	const dryrun = pullboolean(args, "--dry-run");
	const stdout = options.stdout ?? ((text: string) => process.stdout.write(text));
	const stderr = options.stderr ?? ((text: string) => process.stderr.write(text));
	const cwd = resolve(options.cwd ?? process.cwd());
	const dbpath = resolve(
		options.dbpath ?? process.env.OMNIPOTENCE_DB ?? join(homedir(), ".omp", "nikos-agent-stack", "omnipotence.sqlite"),
	);
	const blueprintroot = resolve(
		options.blueprintroot ??
			process.env.OMNIPOTENCE_BLUEPRINTS ??
			join(homedir(), ".omp", "nikos-agent-stack", "blueprints"),
	);

	if (pullboolean(args, "--help") || args.length === 0) {
		stdout(`${usage}\n`);
		return 0;
	}
	if (pullboolean(args, "--version")) {
		stdout("1.0.0\n");
		return 0;
	}

	let store: orchestrationstore | undefined;
	const emit = (data: jsonvalue): void => {
		stdout(json ? `${JSON.stringify({ ok: true, data })}\n` : human(data));
	};
	try {
		const group = required(args, 0, "command");
		const action = args[1];
		const command = action ? `${group} ${action}` : group;
		assertknownflags(args, command);
		if (group === "doctor" && !existsSync(dbpath)) {
			emit({ ok: false, issues: [`database ${dbpath} does not exist`] });
			return 3;
		}
		const readonly = dryrun || group === "doctor";
		const statepath = readonly && !existsSync(dbpath) ? ":memory:" : dbpath;
		store = new orchestrationstore(statepath, {
			readonly: readonly && statepath !== ":memory:",
		});
		const engine = new orchestrationengine(store);
		const profiles = new profileservice(store);
		const blueprints = new blueprintservice(store, blueprintroot);
		const needsengine =
			group === "process" ||
			group === "hook" ||
			(group === "run" && (action === "start" || action === "resume")) ||
			(group === "effect" && (action === "post" || action === "resolve-uncertain"));
		if (needsengine) await loadactiveblueprints(store, engine);

		if (group === "doctor") {
			const statereport = store.doctor();
			const blueprintreport = blueprints.doctor();
			const report = {
				ok: statereport.ok && blueprintreport.ok,
				issues: [...statereport.issues, ...blueprintreport.issues],
			};
			emit(jsonvalueof(report));
			return report.ok ? 0 : 3;
		}
		if (group === "repair") {
			if (dryrun) {
				emit({ action: "repair", dbpath });
				return 0;
			}
			emit(jsonvalueof(store.repair()));
			return 0;
		}

		if (group === "run") {
			if (action === "start") {
				const processid = required(args, 2, "process id");
				const mode = parsemode(pullflag(args, "--mode"));
				const input = jsonargument(args, "--input", {});
				const profilepatch = jsonargument(args, "--profile", { schema: 1 });
				const version = pullflag(args, "--process-version");
				const sessionid = pullflag(args, "--session") ?? null;
				const process = engine.resolveprocess(processid, version);
				assertvalid(process.input, input, "run.input");
				const profile = profiles.snapshot(
					cwd,
					process.profiledefaults ?? { schema: 1 },
					profilepatch,
				);
				if (dryrun) {
					emit({
						action: "start",
						processid,
						processversion: process.version,
						mode,
						input,
						profile: profile.effective,
						sessionid,
					});
					return 0;
				}
				const started = await engine.start({
					processid,
					processversion: process.version,
					blueprintname: process.blueprint?.name,
					blueprintversion: process.blueprint?.version,
					sessionid,
					mode,
					input,
					profile: profile.effective,
					userprofileversion: profile.userprofileversion,
					projectprofileversion: profile.projectprofileversion,
				});
				emit(resultvalue(started));
				return resultcode(started);
			}
			if (action === "status") {
				const runid = required(args, 2, "run id");
				const run = store.getrun(runid);
				if (!run) throw new Error(`run ${runid} does not exist`);
				emit(jsonvalueof(run));
				return 0;
			}
			if (action === "events") {
				emit({ events: jsonvalueof(store.events(required(args, 2, "run id"))) });
				return 0;
			}
			if (action === "list") {
				emit({ runs: jsonvalueof(store.listruns()) });
				return 0;
			}
			if (action === "resume") {
				const runid = required(args, 2, "run id");
				const run = store.getrun(runid);
				if (!run) throw new Error(`run ${runid} does not exist`);
				const response = pullflag(args, "--input");
				if (dryrun) {
					emit({ action: "resume", runid, response: response === undefined ? null : parsejson(response, "--input") });
					return 0;
				}
				const resumed = await engine.resume(
					runid,
					response === undefined ? undefined : parsejson(response, "--input"),
				);
				emit(resultvalue(resumed));
				return resultcode(resumed);
			}
			if (action === "halt") {
				const runid = required(args, 2, "run id");
				const run = store.getrun(runid);
				if (!run) throw new Error(`run ${runid} does not exist`);
				const reason = pullflag(args, "--reason") ?? "halted by user";
				if (dryrun) {
					emit({ action: "halt", runid, reason });
					return 0;
				}
				emit(jsonvalueof(store.transitionrun(runid, "halted", null, reason)));
				return 0;
			}
			throw new clierror("run command must be start, status, events, resume, halt, or list");
		}

		if (group === "effect") {
			if (action === "list") {
				emit({ effects: jsonvalueof(store.listeffects(required(args, 2, "run id"))) });
				return 0;
			}
			if (action === "show") {
				const runid = required(args, 2, "run id");
				const effectid = required(args, 3, "effect id");
				const effect = store.geteffect(runid, effectid);
				if (!effect) throw new Error(`effect ${effectid} does not exist`);
				emit(jsonvalueof(effect));
				return 0;
			}
			if (action === "post") {
				const runid = required(args, 2, "run id");
				const effectid = required(args, 3, "effect id");
				const rootrunid = pullflag(args, "--root") ?? runid;
				const fence = parseinteger(pullflag(args, "--fence"), "--fence");
				const inputhash = parsehash(pullflag(args, "--input-hash"), "--input-hash");
				const status = pullflag(args, "--status");
				if (status !== "ok" && status !== "error" && status !== "uncertain" && status !== "cancelled") {
					throw new clierror("--status must be ok, error, uncertain, or cancelled");
				}
				const value = jsonargument(args, "--value", null);
				const target = store.geteffect(runid, effectid);
				if (!target) throw new Error(`effect ${effectid} does not exist`);
				if (target.fence !== fence) {
					throw new Error(`stale effect fence ${target.fence}; current fence is ${fence}`);
				}
				if (target.inputhash !== inputhash) {
					throw new TypeError(`effect ${effectid} input hash mismatch`);
				}
				const error = jsonargument(args, "--error", null);
				if (dryrun) {
					emit({ action: "effect_post", rootrunid, runid, effectid, fence, inputhash, status, value, error });
					return 0;
				}
				const posted = await engine.posteffect({
					rootrunid,
					runid,
					effectid,
					fence,
					inputhash,
					status,
					value,
					error,
				});
				emit(resultvalue(posted));
				return resultcode(posted);
			}
			if (action === "resolve-uncertain") {
				const runid = required(args, 2, "run id");
				const effectid = required(args, 3, "effect id");
				const rootrunid = pullflag(args, "--root") ?? runid;
				const fence = parseinteger(pullflag(args, "--fence"), "--fence");
				const inputhash = parsehash(pullflag(args, "--input-hash"), "--input-hash");
				const decision = pullflag(args, "--decision");
				if (decision !== "confirm" && decision !== "fail" && decision !== "retry") {
					throw new clierror("--decision must be confirm, fail, or retry");
				}
				const value = jsonargument(args, "--value", null);
				const target = store.geteffect(runid, effectid);
				if (!target) throw new Error(`effect ${effectid} does not exist`);
				if (target.status !== "uncertain") throw new Error(`effect ${effectid} is not uncertain`);
				if (target.fence !== fence) {
					throw new Error(`stale effect fence ${target.fence}; current fence is ${fence}`);
				}
				if (target.inputhash !== inputhash) {
					throw new TypeError(`effect ${effectid} input hash mismatch`);
				}
				const error = jsonargument(args, "--error", null);
				if (dryrun) {
					emit({ action: "resolve_uncertain", rootrunid, runid, effectid, fence, inputhash, decision, value, error });
					return 0;
				}
				const resolved = await engine.resolveuncertain({
					rootrunid,
					runid,
					effectid,
					fence,
					inputhash,
					decision,
					value,
					error,
				});
				emit(resultvalue(resolved));
				return resultcode(resolved);
			}
			throw new clierror("effect command must be list, show, post, or resolve-uncertain");
		}

		if (group === "session") {
			const sessionid = required(args, 2, "session id");
			if (action === "status") {
				const run = store.getsessionrun(sessionid);
				emit({ sessionid, run: run ? jsonvalueof(run) : null });
				return 0;
			}
			if (action === "bind") {
				const runid = required(args, 3, "run id");
				const force = pullboolean(args, "--force");
				if (dryrun) {
					emit({ action: "session_bind", sessionid, runid, force });
					return 0;
				}
				emit(jsonvalueof(store.bindsession(sessionid, runid, force)));
				return 0;
			}
			if (action === "unbind") {
				if (dryrun) {
					emit({ action: "session_unbind", sessionid });
					return 0;
				}
				emit({ run: jsonvalueof(store.unbindsession(sessionid)) });
				return 0;
			}
			throw new clierror("session command must be status, bind, or unbind");
		}

		if (group === "process") {
			if (action === "list") {
				emit({
					processes: engine.listprocesses().map((process) => ({
						id: process.id,
						version: process.version,
						blueprint: process.blueprint ? `${process.blueprint.name}@${process.blueprint.version}` : null,
					})),
				});
				return 0;
			}
			if (action === "show" || action === "validate") {
				const processid = required(args, 2, "process id");
				const process = engine.resolveprocess(processid);
				emit({
					id: process.id,
					version: process.version,
					maxturns: process.maxturns,
					input: jsonvalueof(process.input),
					output: jsonvalueof(process.output),
				});
				return 0;
			}
			if (action === "plan") {
				const processid = required(args, 2, "process id");
				const input = jsonargument(args, "--input", {});
				const process = engine.resolveprocess(processid);
				assertvalid(process.input, input, "run.input");
				if (dryrun) {
					emit({ action: "process_plan", processid, input });
					return 0;
				}
				const profile = profiles.snapshot(
					cwd,
					process.profiledefaults ?? { schema: 1 },
					{ schema: 1 },
				);
				const planned = await engine.start({
					processid,
					processversion: process.version,
					blueprintname: process.blueprint?.name,
					blueprintversion: process.blueprint?.version,
					sessionid: null,
					mode: "plan",
					input,
					profile: profile.effective,
					userprofileversion: profile.userprofileversion,
					projectprofileversion: profile.projectprofileversion,
				});
				emit(resultvalue(planned));
				return resultcode(planned);
			}
			throw new clierror("process command must be list, show, validate, or plan");
		}

		if (group === "profile") {
			const scope = required(args, 2, "profile scope");
			if (scope !== "user" && scope !== "project") throw new clierror("profile scope must be user or project");
			const root = scope === "user" ? "" : pullflag(args, "--root") ?? cwd;
			if (action === "show") {
				const profile = profiles.read(scope, root);
				if (!profile) throw new Error(`${scope} profile does not exist`);
				emit(jsonvalueof(profile));
				return 0;
			}
			if (action === "write" || action === "merge") {
				const input = jsonargument(args, "--input", {});
				let document = input;
				if (action === "merge") {
					const current = profiles.read(scope, root);
					document = mergepatch(current?.document ?? { schema: 1 }, input);
				}
				document = profiles.validate(document);
				if (dryrun) {
					emit({ action: `profile_${action}`, scope, root, document });
					return 0;
				}
				emit(jsonvalueof(profiles.write(scope, root, document)));
				return 0;
			}
			if (action === "render") {
				const profile = profiles.read(scope, root);
				if (!profile) throw new Error(`${scope} profile does not exist`);
				emit({ rendered: profiles.render(profile.document) });
				return 0;
			}
			throw new clierror("profile command must be show, write, merge, or render");
		}

		if (group === "blueprint") {
			if (action === "list") {
				emit({ blueprints: jsonvalueof(blueprints.list()) });
				return 0;
			}
			if (action === "install" || action === "update" || action === "inspect") {
				const source = required(args, 2, "blueprint source");
				if (action === "inspect" || dryrun) {
					emit(jsonvalueof(blueprints.install(source, { dryrun: true })));
					return 0;
				}
				emit(jsonvalueof(blueprints.install(source)));
				return 0;
			}
			if (action === "rollback") {
				const name = required(args, 2, "blueprint name");
				if (dryrun) {
					emit({ action: "blueprint_rollback", name });
					return 0;
				}
				emit(jsonvalueof(blueprints.rollback(name)));
				return 0;
			}
			if (action === "remove") {
				const name = required(args, 2, "blueprint name");
				const version = required(args, 3, "blueprint version");
				if (dryrun) {
					emit({ action: "blueprint_remove", name, version });
					return 0;
				}
				blueprints.remove(name, version);
				emit({ removed: `${name}@${version}` });
				return 0;
			}
			throw new clierror("blueprint command must be list, inspect, install, update, rollback, or remove");
		}

		if (group === "hook") {
			if (action === "list") {
				emit({
					hooks: engine.hooks.list().map((hook) => ({
						id: hook.id,
						version: hook.version,
						phase: hook.phase,
						priority: hook.priority,
						timeoutms: hook.timeoutms,
					})),
				});
				return 0;
			}
			if (action === "inspect") {
				const hookid = required(args, 2, "hook id");
				const hook = engine.hooks.list().find((entry) => entry.id === hookid);
				if (!hook) throw new Error(`hook ${hookid} is not registered`);
				emit({
					id: hook.id,
					version: hook.version,
					phase: hook.phase,
					priority: hook.priority,
					timeoutms: hook.timeoutms,
				});
				return 0;
			}
			if (action === "probe") {
				const hookid = required(args, 2, "hook id");
				const input = jsonargument(args, "--input", {});
				if (dryrun) {
					emit({ action: "hook_probe", hookid, input });
					return 0;
				}
				emit(jsonvalueof(await engine.hooks.dispatchone(hookid, input)));
				return 0;
			}
			throw new clierror("hook command must be list, inspect, or probe");
		}

		throw new clierror(`unknown command ${group}`);
	} catch (error) {
		const known = error instanceof clierror;
		const message = error instanceof Error ? error.message : String(error);
		const conflict =
			/stale .*fence|blocked|uncertain|conflict|leased|terminal|already has active run/u.test(message);
		const validation = error instanceof TypeError;
		const exitcode = known ? error.exitcode : validation ? 2 : conflict ? 3 : 1;
		const code = known
			? error.code
			: validation
				? "validation_error"
				: conflict
					? "state_conflict"
					: "operational_error";
		if (json) {
			stdout(`${JSON.stringify({ ok: false, error: { code, message } })}\n`);
		} else {
			stderr(`${message}\n`);
		}
		return exitcode;
	} finally {
		store?.close();
	}
}

if (import.meta.main) process.exitCode = await runcli(process.argv.slice(2));
