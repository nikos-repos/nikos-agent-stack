import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runcli } from "./cli.ts";
import type { clioptions } from "./cli.ts";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function hash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

function objectvalue(value: unknown, path: string): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path}: expected object`);
	return value as Record<string, unknown>;
}

function processfixture(root: string, marker?: string): string {
	const source = join(root, "blueprint-source");
	mkdirSync(join(source, "processes"), { recursive: true });
	const contracts = new URL("./contracts.ts", import.meta.url).href;
	const sideeffect = marker
		? `import { writeFileSync } from \"node:fs\";\nwriteFileSync(${JSON.stringify(marker)}, \"loaded\");\n`
		: "";
	const processcontent = `${sideeffect}import { defineprocess } from ${JSON.stringify(contracts)};\nexport default defineprocess({\n  id: "delivery.cli",\n  version: "1.0.0",\n  input: { type: "object", additionalproperties: true },\n  output: { type: "object", additionalproperties: true },\n  async run(ctx) { return ctx.task(\"work\", { request: \"cli\" }); }\n});\n`;
	writeFileSync(join(source, "processes/cli.ts"), processcontent);
	writeFileSync(
		join(source, "omnipotence.blueprint.json"),
		JSON.stringify({
			schema: 1,
			name: "cli-pack",
			version: "1.0.0",
			engine: ">=1.0.0",
			processes: [{ id: "delivery.cli", entry: "processes/cli.ts" }],
			hooks: [],
			files: { "processes/cli.ts": hash(processcontent) },
			config: {},
			profile: { schema: 1, metadata: { blueprint: true } },
			migrations: [],
		}),
	);
	return source;
}

function opencli() {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-cli-"));
	roots.push(root);
	const options: clioptions = {
		dbpath: join(root, "state.sqlite"),
		blueprintroot: join(root, "blueprints"),
		cwd: root,
		stdout: () => {},
		stderr: () => {},
	};
	return { root, options };
}

async function invoke(base: clioptions, args: string[]) {
	let stdout = "";
	let stderr = "";
	const code = await runcli(args, {
		...base,
		stdout: (text) => {
			stdout += text;
		},
		stderr: (text) => {
			stderr += text;
		},
	});
	const parsed: unknown = stdout.length > 0 ? JSON.parse(stdout) : null;
	return { code, stdout, stderr, parsed };
}

describe("omnipotence cli", () => {
	test("a local blueprint drives one run through json commands", async () => {
		const { root, options } = opencli();
		const source = processfixture(root);
		const preview = await invoke(options, ["--json", "--dry-run", "blueprint", "install", source]);
		expect(preview.code).toBe(0);
		expect(objectvalue(objectvalue(preview.parsed, "preview").data, "preview.data").action).toBe("install");
		if (!options.dbpath) throw new Error("expected cli database path");
		expect(existsSync(options.dbpath)).toBe(false);
		const rejected = await invoke(options, [
			"--json",
			"blueprint",
			"install",
			source,
			"--network",
		]);
		expect(rejected.code).toBe(2);
		expect(existsSync(options.dbpath)).toBe(false);

		const installed = await invoke(options, ["--json", "blueprint", "install", source]);
		expect(installed.code).toBe(0);
		const processes = await invoke(options, ["--json", "process", "list"]);
		const processdata = objectvalue(objectvalue(processes.parsed, "processes").data, "processes.data");
		expect(processdata.processes).toEqual([
			{ blueprint: "cli-pack@1.0.0", id: "delivery.cli", version: "1.0.0" },
		]);

		const started = await invoke(options, [
			"--json",
			"run",
			"start",
			"delivery.cli",
			"--session",
			"cli-session",
			"--input",
			"{}",
		]);
		expect(started.code).toBe(0);
		const startdata = objectvalue(objectvalue(started.parsed, "started").data, "started.data");
		expect(startdata.status).toBe("waiting");
		const run = objectvalue(startdata.run, "started.run");
		expect(objectvalue(objectvalue(run.profile, "started.profile").metadata, "started.metadata").blueprint).toBe(
			true,
		);
		const effects = startdata.effects;
		if (!Array.isArray(effects) || effects.length !== 1) throw new Error("expected one effect");
		const effect = objectvalue(effects[0], "started.effect");

		const completed = await invoke(options, [
			"--json",
			"effect",
			"post",
			String(run.id),
			String(effect.id),
			"--root",
			String(run.id),
			"--fence",
			String(effect.fence),
			"--input-hash",
			String(effect.inputhash),
			"--status",
			"ok",
			"--value",
			'{"done":true}',
		]);
		expect(completed.code).toBe(0);
		expect(objectvalue(objectvalue(completed.parsed, "completed").data, "completed.data").status).toBe(
			"completed",
		);

		const status = await invoke(options, ["--json", "run", "status", String(run.id)]);
		expect(objectvalue(objectvalue(status.parsed, "status").data, "status.data").status).toBe("completed");
	});

	test("profile and doctor commands use stable envelopes and exit codes", async () => {
		const { options } = opencli();
		if (!options.dbpath) throw new Error("expected cli database path");
		const missingdoctor = await invoke(options, ["--json", "doctor"]);
		expect(missingdoctor.code).toBe(3);
		expect(existsSync(options.dbpath)).toBe(false);
		const invaliddryrun = await invoke(options, [
			"--json",
			"--dry-run",
			"profile",
			"write",
			"user",
			"--input",
			'{"schema":1,"unknown":true}',
		]);
		expect(invaliddryrun.code).toBe(2);
		expect(existsSync(options.dbpath)).toBe(false);
		const written = await invoke(options, [
			"--json",
			"profile",
			"write",
			"user",
			"--input",
			'{"schema":1,"instructions":["concise"]}',
		]);
		expect(written.code).toBe(0);
		const shown = await invoke(options, ["--json", "profile", "show", "user"]);
		const profile = objectvalue(objectvalue(shown.parsed, "profile").data, "profile.data");
		expect(objectvalue(profile.document, "profile.document").instructions).toEqual(["concise"]);

		const doctor = await invoke(options, ["--json", "doctor"]);
		expect(doctor.code).toBe(0);
		expect(objectvalue(objectvalue(doctor.parsed, "doctor").data, "doctor.data").ok).toBe(true);

		const invalid = await invoke(options, ["--json", "run", "status", "missing"]);
		expect(invalid.code).toBe(1);
		expect(objectvalue(objectvalue(invalid.parsed, "invalid").error, "invalid.error").code).toBe(
			"operational_error",
		);
	});

	test("doctor does not execute active blueprint modules", async () => {
		const { root, options } = opencli();
		const marker = join(root, "module-loaded");
		const source = processfixture(root, marker);
		expect((await invoke(options, ["--json", "blueprint", "install", source])).code).toBe(0);
		expect(existsSync(marker)).toBe(false);
		expect((await invoke(options, ["--json", "doctor"])).code).toBe(0);
		expect(existsSync(marker)).toBe(false);
	});
});
