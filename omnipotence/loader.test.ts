import { afterEach, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { blueprintservice } from "./blueprints.ts";
import { orchestrationengine } from "./engine.ts";
import { loadactiveblueprints } from "./loader.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function source(root: string, version: string): string {
	const path = join(root, `source-${version}`);
	mkdirSync(join(path, "processes"), { recursive: true });
	const contracts = new URL("./contracts.ts", import.meta.url).href;
	const content = `import { defineprocess } from ${JSON.stringify(contracts)};\nexport default defineprocess({\n  id: \"delivery.pinned\",\n  version: \"1.0.0\",\n  input: { type: \"object\", additionalproperties: true },\n  output: { type: \"object\", additionalproperties: true },\n  async run(ctx) { return ctx.task(\"work\", { blueprintversion: \"${version}\" }); }\n});\n`;
	writeFileSync(join(path, "processes/pinned.ts"), content);
	writeFileSync(
		join(path, "omnipotence.blueprint.json"),
		JSON.stringify({
			schema: 1,
			name: "pinned-pack",
			version,
			engine: ">=1.0.0",
			processes: [{ id: "delivery.pinned", entry: "processes/pinned.ts" }],
			hooks: [],
			files: {
				"processes/pinned.ts": createHash("sha256").update(content).digest("hex"),
			},
			config: {},
			migrations: [],
		}),
	);
	return path;
}

test("loader retains inactive blueprint versions pinned by active runs", async () => {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-loader-"));
	roots.push(root);
	const store = new orchestrationstore(join(root, "state.sqlite"));
	const blueprints = new blueprintservice(store, join(root, "installed"));
	blueprints.install(source(root, "1.0.0"));
	const firstengine = new orchestrationengine(store);
	await loadactiveblueprints(store, firstengine);
	const started = await firstengine.start({
		processid: "delivery.pinned",
		processversion: "1.0.0",
		sessionid: "session-pinned",
		mode: "call",
		input: {},
	});
	if (started.status !== "waiting") throw new Error("expected pinned run");

	blueprints.install(source(root, "2.0.0"));
	const restarted = new orchestrationengine(store);
	await loadactiveblueprints(store, restarted);
	expect(restarted.listprocesses().map((process) => process.blueprint?.version)).toEqual([
		"1.0.0",
		"2.0.0",
	]);
	const resumed = await restarted.advance(started.run.id);
	const pinned = blueprints.list("pinned-pack").find((record) => record.version === "1.0.0");
	if (!pinned) throw new Error("expected pinned blueprint");
	writeFileSync(join(pinned.installpath, "processes/pinned.ts"), "export default null;\n");
	await expect(
		loadactiveblueprints(store, new orchestrationengine(store)),
	).rejects.toThrow("blueprint pinned-pack@1.0.0 file processes/pinned.ts hash mismatch");
	expect(resumed.status).toBe("waiting");
	store.close();
});
