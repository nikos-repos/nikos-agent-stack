import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { defineprocess } from "./contracts.ts";
import { orchestrationengine } from "./engine.ts";
import { join } from "node:path";
import { profileservice } from "./profiles.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function openprofiles() {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-profiles-"));
	roots.push(root);
	const path = join(root, "state.sqlite");
	const store = new orchestrationstore(path);
	return { store, profiles: new profileservice(store), path };
}

describe("versioned orchestration profiles", () => {
	test("defaults, user, project, and run patches merge in declared order", () => {
		const { store, profiles } = openprofiles();
		profiles.write("user", "", {
			schema: 1,
			instructions: ["user instruction"],
			tools: { review: false },
			metadata: { remove: null, user: true },
		});
		profiles.write("project", "/workspace/project", {
			schema: 1,
			tools: { format: "strict" },
			processes: { default: "delivery.review" },
		});

		const effective = profiles.effective(
			"/workspace/project",
			{
				schema: 1,
				instructions: ["default instruction"],
				tools: { review: true, format: "compact" },
				metadata: { remove: "value", default: true },
			},
			{ schema: 1, tools: { review: true } },
		);
		expect(effective).toEqual({
			schema: 1,
			instructions: ["user instruction"],
			tools: { review: true, format: "strict" },
			metadata: { default: true, user: true },
			processes: { default: "delivery.review" },
		});
		expect(profiles.render(effective)).toBe(
			'omnipotence profile\n{"instructions":["user instruction"],"metadata":{"default":true,"user":true},"processes":{"default":"delivery.review"},"schema":1,"tools":{"format":"strict","review":true}}',
		);
		store.close();
	});

	test("writes retain versions and reject unknown profile fields", () => {
		const { store, profiles } = openprofiles();
		const first = profiles.write("user", "", { schema: 1, instructions: ["first"] });
		const second = profiles.write("user", "", { schema: 1, instructions: ["second"] });
		expect(first.version).toBe(1);
		expect(second.version).toBe(2);
		expect(profiles.history("user", "").map((entry) => entry.version)).toEqual([1, 2]);

		expect(() =>
			profiles.write("project", "/workspace/project", {
				schema: 1,
				unknown: true,
			}),
		).toThrow("profile.unknown: unknown field");
		store.close();
	});

	test("schema one profiles migrate with a backup and retained history", () => {
		const root = mkdtempSync(join(tmpdir(), "omnipotence-profile-migration-"));
		roots.push(root);
		const path = join(root, "state.sqlite");
		const legacy = new Database(path, { create: true });
		legacy.exec(`
			create table runs (id text primary key);
			create table effects (id text primary key);
			create table profiles (
				scope text not null,
				project_root text not null,
				version integer not null,
				document_json text not null,
				source_hash text not null,
				updated_at text not null,
				primary key(scope, project_root)
			);
			insert into profiles values (
				'user', '', 1, '{"instructions":["legacy"],"schema":1}', 'legacy-hash', '2026-08-20T00:00:00.000Z'
			);
			pragma user_version = 1;
		`);
		legacy.close();

		const store = new orchestrationstore(path);
		const profiles = new profileservice(store);
		const migrated = new Database(path);
		expect(migrated.query("pragma user_version").get()).toEqual({ user_version: 8 });
		migrated.close();
		expect(profiles.history("user", "").map((entry) => entry.version)).toEqual([1]);
		expect(profiles.write("user", "", { schema: 1, instructions: ["current"] }).version).toBe(2);
		expect(profiles.history("user", "").map((entry) => entry.version)).toEqual([1, 2]);
		expect(readdirSync(root).some((name) => name.includes(".migration-v1-"))).toBe(true);
		store.close();
	});

	test("doctor detects profile history disagreement", () => {
		const { store, profiles, path } = openprofiles();
		profiles.write("user", "", { schema: 1, instructions: ["trusted"] });
		const external = new Database(path);
		external
			.query("update profiles set document_json = '{\"schema\":1,\"instructions\":[\"changed\"]}' where scope = 'user'")
			.run();
		external.close();
		const report = store.doctor();
		expect(report.ok).toBe(false);
		expect(report.issues).toContain(
			"profile user:<global> current record does not match retained version 1",
		);
		store.repair();
		expect(profiles.read("user", "")?.document).toEqual({
			schema: 1,
			instructions: ["trusted"],
		});
		expect(store.doctor()).toEqual({ ok: true, issues: [] });
		store.close();
	});

	test("engine runs pin and expose the effective profile snapshot", async () => {
		const { store, profiles } = openprofiles();
		profiles.write("user", "", { schema: 1, instructions: ["user"] });
		profiles.write("project", "/workspace/project", {
			schema: 1,
			tools: { review: true },
		});
		const snapshot = profiles.snapshot(
			"/workspace/project",
			{ schema: 1 },
			{ schema: 1, metadata: { request: true } },
		);
		const engine = new orchestrationengine(store);
		engine.register(
			defineprocess({
				id: "delivery.profile",
				version: "1.0.0",
				input: { type: "object", additionalproperties: true },
				output: { type: "object", additionalproperties: true },
				async run(ctx) {
					return { profile: ctx.profile };
				},
			}),
		);
		const result = await engine.start({
			processid: "delivery.profile",
			sessionid: "session-profile",
			mode: "babysit",
			input: {},
			profile: snapshot.effective,
			userprofileversion: snapshot.userprofileversion,
			projectprofileversion: snapshot.projectprofileversion,
		});
		expect(result.status).toBe("completed");
		if (result.status !== "completed") throw new Error("expected profile completion");
		expect(result.run.userprofileversion).toBe(1);
		expect(result.run.projectprofileversion).toBe(1);
		expect(result.output).toEqual({ profile: snapshot.effective });
		store.close();
	});
});
