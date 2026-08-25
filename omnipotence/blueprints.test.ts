import { afterEach, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { blueprintservice } from "./blueprints.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function hash(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}

function fixture(root: string, version: string, migration = false, engine = ">=1.0.0"): string {
	const source = join(root, `source-${version}`);
	const processpath = "processes/review.ts";
	const hookpath = "hooks/audit.ts";
	const processcontent = `export const version = "${version}";\n`;
	const hookcontent = `export const version = "${version}";\n`;
	mkdirSync(join(source, "processes"), { recursive: true });
	mkdirSync(join(source, "hooks"), { recursive: true });
	writeFileSync(join(source, processpath), processcontent);
	writeFileSync(join(source, hookpath), hookcontent);
	writeFileSync(
		join(source, "omnipotence.blueprint.json"),
		JSON.stringify({
			schema: 1,
			name: "delivery-pack",
			version,
			engine,
			processes: [{ id: "delivery.review", entry: processpath }],
			hooks: [{ id: "delivery.audit", entry: hookpath }],
			files: {
				[processpath]: hash(processcontent),
				[hookpath]: hash(hookcontent),
			},
			config: version === "1.0.0" ? { feature: false, legacy: true } : {},
			migrations: migration ? [{ from: "1.0.0", patch: { feature: true } }] : [],
		}),
	);
	return source;
}

function nonregularfixture(root: string): string {
	const source = join(root, "non-regular");
	const path = "declared-directory";
	mkdirSync(join(source, path), { recursive: true });
	writeFileSync(
		join(source, "omnipotence.blueprint.json"),
		JSON.stringify({
			schema: 1,
			name: "directory-file-pack",
			version: "1.0.0",
			engine: ">=1.0.0",
			processes: [],
			hooks: [],
			files: { [path]: hash("") },
			config: {},
			migrations: [],
		}),
	);
	return source;
}

function openblueprints() {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-blueprints-"));
	roots.push(root);
	const store = new orchestrationstore(join(root, "state.sqlite"));
	const installroot = join(root, "installed");
	return { root, store, installroot, blueprints: new blueprintservice(store, installroot) };
}

test("install enforces blueprint minimum engine versions", () => {
	const { root, store, blueprints } = openblueprints();
	expect(blueprints.install(fixture(root, "0.9.0", false, ">=0.9.0")).version).toBe("0.9.0");
	expect(blueprints.install(fixture(root, "1.0.0", false, ">=1.0.0")).version).toBe("1.0.0");
	expect(() => blueprints.install(fixture(root, "9.0.0", false, ">=999.0.0"))).toThrow(
		"blueprint delivery-pack@9.0.0 requires engine >=999.0.0, current engine 2.0.0",
	);
	store.close();
});

describe("local blueprint lifecycle", () => {
	test("install, update, migrate, rollback, pin, and remove are transactional", () => {
		const { root, store, installroot, blueprints } = openblueprints();
		const firstsource = fixture(root, "1.0.0");
		const preview = blueprints.install(firstsource, { dryrun: true });
		expect(preview.action).toBe("install");
		expect(blueprints.list()).toEqual([]);
		expect(existsSync(join(installroot, "delivery-pack", "1.0.0"))).toBe(false);

		const first = blueprints.install(firstsource);
		expect(first.active).toBe(true);
		expect(first.config).toEqual({ feature: false, legacy: true });
		expect(existsSync(join(first.installpath, "processes/review.ts"))).toBe(true);

		const second = blueprints.install(fixture(root, "2.0.0", true));
		expect(second.active).toBe(true);
		expect(second.config).toEqual({ feature: true, legacy: true });
		expect(blueprints.list()).toHaveLength(2);

		const rolledback = blueprints.rollback("delivery-pack");
		expect(rolledback.version).toBe("1.0.0");
		expect(rolledback.config).toEqual({ feature: false, legacy: true });

		const run = store.createrun({
			processid: "delivery.review",
			processversion: "1.0.0",
			processhash: "hash-1",
			blueprintname: "delivery-pack",
			blueprintversion: "1.0.0",
			sessionid: "session-blueprint",
			mode: "babysit",
			input: {},
			maxturns: 10,
		});
		expect(() => blueprints.remove("delivery-pack", "1.0.0")).toThrow(
			`blueprint delivery-pack@1.0.0 is pinned by active run ${run.id}`,
		);
		store.transitionrun(run.id, "halted", null, "test complete");
		blueprints.remove("delivery-pack", "1.0.0");
		expect(blueprints.active("delivery-pack")?.version).toBe("2.0.0");
		store.close();
	});
	test("remove rejects an incompatible replacement before mutating active state", () => {
		const { root, store, blueprints } = openblueprints();
		const legacy = blueprints.install(fixture(root, "1.0.0"));
		const active = blueprints.install(fixture(root, "2.0.0"));
		const manifestpath = join(legacy.installpath, "omnipotence.blueprint.json");
		const manifest = JSON.parse(readFileSync(manifestpath, "utf8")) as Record<string, unknown>;
		manifest.engine = ">=999.0.0";
		writeFileSync(manifestpath, JSON.stringify(manifest));
		store.writeblueprint({ ...legacy, manifest, active: false });

		expect(() => blueprints.remove("delivery-pack", active.version)).toThrow(
			"blueprint delivery-pack@1.0.0 requires engine >=999.0.0, current engine 2.0.0",
		);
		expect(blueprints.active("delivery-pack")?.version).toBe(active.version);
		expect(existsSync(active.installpath)).toBe(true);
		expect(readFileSync(join(active.installpath, "processes/review.ts"), "utf8")).toContain(
			'version = "2.0.0"',
		);
		store.close();
	});

	test("rollback selects the previous prerelease before its stable release", () => {
		const { root, store, blueprints } = openblueprints();
		blueprints.install(fixture(root, "1.0.0-rc.1"));
		blueprints.install(fixture(root, "1.0.0"));
		expect(blueprints.rollback("delivery-pack").version).toBe("1.0.0-rc.1");
		store.close();
	});

	test("install rejects traversal and escaping symlinks before copying", () => {
		const { root, store, blueprints } = openblueprints();
		const traversal = join(root, "traversal");
		mkdirSync(traversal, { recursive: true });
		writeFileSync(
			join(traversal, "omnipotence.blueprint.json"),
			JSON.stringify({
				schema: 1,
				name: "unsafe-pack",
				version: "1.0.0",
				engine: ">=1.0.0",
				processes: [],
				hooks: [],
				files: { "../escape.ts": hash("escape") },
				config: {},
				migrations: [],
			}),
		);
		expect(() => blueprints.install(traversal)).toThrow(
			"blueprint.files ../escape.ts escapes package root",
		);

		const linked = fixture(root, "3.0.0");
		const outside = join(root, "outside.ts");
		writeFileSync(outside, "outside\n");
		const link = join(linked, "processes/review.ts");
		rmSync(link);
		mkdirSync(dirname(link), { recursive: true });
		symlinkSync(outside, link);
		expect(() => blueprints.install(linked)).toThrow(
			"blueprint file processes/review.ts escapes package root",
		);
		store.close();
	});

	test("install accepts an in-root symlink file", () => {
		const { root, store, blueprints } = openblueprints();
		const linked = fixture(root, "3.0.0");
		const target = join(linked, "processes/review.ts");
		rmSync(target);
		writeFileSync(join(linked, "processes/source.ts"), `export const version = "3.0.0";\n`);
		symlinkSync("source.ts", target);

		const installed = blueprints.install(linked);
		expect(readFileSync(join(installed.installpath, "processes/review.ts"), "utf8")).toBe(
			`export const version = "3.0.0";\n`,
		);
		store.close();
	});

	test("install rejects an in-root directory file before mutating state", () => {
		const { root, store, installroot, blueprints } = openblueprints();
		expect(() => blueprints.install(nonregularfixture(root))).toThrow(
			"not a regular file",
		);
		expect(existsSync(join(installroot, "directory-file-pack", "1.0.0"))).toBe(false);
		expect(blueprints.list()).toEqual([]);
		store.close();
	});

	test("an in-root name beginning with two dots remains valid", () => {
		const { root, store, blueprints } = openblueprints();
		const source = join(root, "dot-name");
		const path = "..cache/safe.ts";
		const content = "export const safe = true;\n";
		mkdirSync(join(source, "..cache"), { recursive: true });
		writeFileSync(join(source, path), content);
		writeFileSync(
			join(source, "omnipotence.blueprint.json"),
			JSON.stringify({
				schema: 1,
				name: "dot-name-pack",
				version: "1.0.0",
				engine: ">=1.0.0",
				processes: [],
				hooks: [],
				files: { [path]: hash(content) },
				config: {},
				migrations: [],
			}),
		);
		expect(blueprints.install(source).name).toBe("dot-name-pack");
		store.close();
	});

	test("doctor detects missing installed blueprint files", () => {
		const { root, store, blueprints } = openblueprints();
		const installed = blueprints.install(fixture(root, "4.0.0"));
		rmSync(join(installed.installpath, "processes/review.ts"));
		const report = blueprints.doctor();
		expect(report.ok).toBe(false);
		expect(report.issues).toContain(
			"blueprint delivery-pack@4.0.0 file processes/review.ts is missing",
		);
		store.close();
	});

	test("install rejects duplicate process identities", () => {
		const { root, store, blueprints } = openblueprints();
		const source = fixture(root, "5.0.0");
		const manifestpath = join(source, "omnipotence.blueprint.json");
		const parsed: unknown = JSON.parse(readFileSync(manifestpath, "utf8"));
		if (
			!parsed ||
			typeof parsed !== "object" ||
			!("processes" in parsed) ||
			!Array.isArray(parsed.processes)
		) {
			throw new Error("expected blueprint process list");
		}
		parsed.processes.push({ id: "delivery.review", entry: "processes/review.ts" });
		writeFileSync(manifestpath, JSON.stringify(parsed));
		expect(() => blueprints.install(source)).toThrow(
			"blueprint.processes duplicate id delivery.review",
		);
		store.close();
	});
});
