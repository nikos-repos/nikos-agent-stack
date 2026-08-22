import { afterEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stablejson } from "./contracts.ts";
import { orchestrationstore } from "./store.ts";

const roots: string[] = [];

afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function openstore(): { store: orchestrationstore; path: string } {
	const root = mkdtempSync(join(tmpdir(), "omnipotence-store-"));
	roots.push(root);
	const path = join(root, "state.sqlite");
	return { store: new orchestrationstore(path), path };
}

function createrun(store: orchestrationstore, sessionid: string | null = "session-1") {
	return store.createrun({
		processid: "delivery.review",
		processversion: "1.0.0",
		processhash: "hash-1",
		sessionid,
		mode: "babysit",
		input: { request: "ship" },
		maxturns: 12,
	});
}

describe("authoritative orchestration store", () => {
	test("one session binds one active run with a chained event record", () => {
		const { store } = openstore();
		const run = createrun(store);

		expect(store.getsessionrun("session-1")?.id).toBe(run.id);
		expect(() => createrun(store)).toThrow("session session-1 already has active run");

		const events = store.events(run.id);
		expect(events.map((event) => event.type)).toEqual(["run_created", "session_bound"]);
		expect(events[1]?.previoushash).toBe(events[0]?.hash);
		expect(store.doctor()).toEqual({ ok: true, issues: [] });
		store.close();
	});

	test("effect requests and posts are idempotent and fenced", () => {
		const { store } = openstore();
		const run = createrun(store);
		const effect = store.requesteffect(run.id, {
			key: "review",
			kind: "task",
			input: { scope: "diff" },
		});
		const duplicate = store.requesteffect(run.id, {
			key: "review",
			kind: "task",
			input: { scope: "diff" },
		});
		expect(duplicate.id).toBe(effect.id);
		expect(() =>
			store.requesteffect(run.id, {
				key: "review",
				kind: "task",
				input: { scope: "repository" },
			}),
		).toThrow("effect review input changed during replay");

		const resolved = store.posteffect({
			runid: run.id,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { approved: true },
		});
		const repeated = store.posteffect({
			runid: run.id,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "ok",
			value: { approved: true },
		});
		expect(repeated).toEqual(resolved);

		const nextfence = store.bumpfence(run.id);
		expect(nextfence).toBe(effect.fence + 1);
		const second = store.requesteffect(run.id, {
			key: "publish",
			kind: "task",
			input: { target: "local" },
		});
		expect(() =>
			store.posteffect({
				runid: run.id,
				effectid: second.id,
				fence: effect.fence,
				inputhash: second.inputhash,
				status: "ok",
				value: null,
			}),
		).toThrow("stale fence");
		store.close();
	});

	test("uncertain effects block until an explicit recovery decision", () => {
		const { store } = openstore();
		const run = createrun(store, "session-uncertain");
		const effect = store.requesteffect(run.id, {
			key: "publish",
			kind: "task",
			input: { target: "external" },
		});
		const uncertain = store.posteffect({
			runid: run.id,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			status: "uncertain",
			error: { message: "connection closed after dispatch" },
		});

		expect(uncertain.status).toBe("uncertain");
		expect(store.getrun(run.id)?.status).toBe("blocked");
		expect(store.getrun(run.id)?.blockedreason).toBe(`effect ${effect.id} outcome is uncertain`);
		expect(() =>
			store.posteffect({
				runid: run.id,
				effectid: effect.id,
				fence: effect.fence,
				inputhash: effect.inputhash,
				status: "ok",
				value: { published: true },
			}),
		).toThrow(`effect ${effect.id} is uncertain; use explicit recovery`);

		const recovered = store.resolveuncertain({
			runid: run.id,
			effectid: effect.id,
			fence: effect.fence,
			inputhash: effect.inputhash,
			decision: "confirm",
			value: { published: true },
		});
		expect(recovered.status).toBe("resolved_ok");
		expect(store.getrun(run.id)?.status).toBe("running");
		store.close();
	});


	test("retry refences every pending sibling effect", () => {
		const { store } = openstore();
		const run = createrun(store, "session-retry");
		const first = store.requesteffect(run.id, {
			key: "first",
			kind: "task",
			input: { order: 1 },
		});
		const second = store.requesteffect(run.id, {
			key: "second",
			kind: "task",
			input: { order: 2 },
		});
		store.markeffectdispatching(run.id, second.id, second.fence);
		store.markeffectdispatched(run.id, second.id, second.fence);
		store.posteffect({
			runid: run.id,
			effectid: first.id,
			fence: first.fence,
			inputhash: first.inputhash,
			status: "uncertain",
			error: { message: "unknown" },
		});
		const retried = store.resolveuncertain({
			runid: run.id,
			effectid: first.id,
			fence: first.fence,
			inputhash: first.inputhash,
			decision: "retry",
		});
		const sibling = store.geteffect(run.id, second.id);
		expect(retried.fence).toBe(2);
		expect(sibling?.fence).toBe(2);
		expect(sibling?.dispatchedat).toBeNull();
		expect(sibling?.dispatchingat).toBeNull();
		store.close();
	});

	test("session rebind increments the run and pending-effect fence", () => {
		const { store } = openstore();
		const run = createrun(store, "session-old");
		const effect = store.requesteffect(run.id, {
			key: "pending",
			kind: "task",
			input: {},
		});
		const rebound = store.bindsession("session-new", run.id);
		expect(rebound.fence).toBe(2);
		expect(store.geteffect(run.id, effect.id)?.fence).toBe(2);
		expect(store.getsessionrun("session-old")).toBeNull();
		expect(store.getsessionrun("session-new")?.id).toBe(run.id);
		expect(store.doctor()).toEqual({ ok: true, issues: [] });
		expect(() =>
			store.posteffect({
				runid: run.id,
				effectid: effect.id,
				fence: effect.fence,
				inputhash: effect.inputhash,
				status: "ok",
				value: null,
			}),
		).toThrow("stale fence");
		const pending = store.geteffect(run.id, effect.id);
		if (!pending) throw new Error("expected refenced effect");
		store.markeffectdispatching(run.id, pending.id, pending.fence);
		store.markeffectdispatched(run.id, pending.id, pending.fence);
		expect(() => store.unbindsession("session-new")).toThrow(
			`run ${run.id} has dispatched effect ${pending.id}; resolve it before session ownership changes`,
		);
		store.close();
	});
	test("a dispatched descendant blocks an atomic session rebind", () => {
		const { store } = openstore();
		const root = createrun(store, "session-old");
		const child = createrun(store, null);
		const nested = createrun(store, null);
		const rootchild = store.requesteffect(root.id, {
			key: "child",
			kind: "subprocess",
			input: { childrunid: child.id },
		});
		const childnested = store.requesteffect(child.id, {
			key: "nested",
			kind: "subprocess",
			input: { childrunid: nested.id },
		});
		const childwork = store.requesteffect(child.id, {
			key: "work",
			kind: "task",
			input: {},
		});
		store.markeffectdispatching(child.id, childwork.id, childwork.fence);
		store.markeffectdispatched(child.id, childwork.id, childwork.fence);

		expect(() => store.bindsession("session-new", root.id)).toThrow(
			`run ${child.id} has dispatched effect ${childwork.id}; resolve it before session ownership changes`,
		);
		expect(store.getrun(root.id)?.fence).toBe(root.fence);
		expect(store.getrun(child.id)?.fence).toBe(child.fence);
		expect(store.getrun(nested.id)?.fence).toBe(nested.fence);
		expect(store.geteffect(root.id, rootchild.id)?.fence).toBe(rootchild.fence);
		expect(store.geteffect(child.id, childnested.id)?.fence).toBe(childnested.fence);
		expect(store.geteffect(child.id, childwork.id)?.fence).toBe(childwork.fence);
		expect(store.getsessionrun("session-old")?.id).toBe(root.id);
		store.close();
	});

	test("a safe session rebind refences every owned run and requested effect", () => {
		const { store } = openstore();
		const root = createrun(store, "session-old");
		const child = createrun(store, null);
		const nested = createrun(store, null);
		const rootchild = store.requesteffect(root.id, {
			key: "child",
			kind: "subprocess",
			input: { childrunid: child.id },
		});
		const rootwork = store.requesteffect(root.id, {
			key: "work",
			kind: "task",
			input: {},
		});
		const childnested = store.requesteffect(child.id, {
			key: "nested",
			kind: "subprocess",
			input: { childrunid: nested.id },
		});
		const childwork = store.requesteffect(child.id, {
			key: "work",
			kind: "task",
			input: {},
		});
		const nestedwork = store.requesteffect(nested.id, {
			key: "work",
			kind: "task",
			input: {},
		});

		const rebound = store.bindsession("session-new", root.id);
		expect(rebound.fence).toBe(root.fence + 1);
		expect(store.getrun(root.id)?.fence).toBe(root.fence + 1);
		expect(store.getrun(child.id)?.fence).toBe(child.fence + 1);
		expect(store.getrun(nested.id)?.fence).toBe(nested.fence + 1);
		for (const effect of [rootchild, rootwork]) {
			expect(store.geteffect(root.id, effect.id)?.fence).toBe(root.fence + 1);
			expect(store.geteffect(root.id, effect.id)?.dispatchingat).toBeNull();
			expect(store.geteffect(root.id, effect.id)?.dispatchedat).toBeNull();
		}
		for (const effect of [childnested, childwork]) {
			expect(store.geteffect(child.id, effect.id)?.fence).toBe(child.fence + 1);
			expect(store.geteffect(child.id, effect.id)?.dispatchingat).toBeNull();
			expect(store.geteffect(child.id, effect.id)?.dispatchedat).toBeNull();
		}
		expect(store.geteffect(nested.id, nestedwork.id)?.fence).toBe(nested.fence + 1);
		expect(store.events(root.id).filter((event) => event.type === "effect_refenced")).toHaveLength(2);
		expect(store.events(child.id).filter((event) => event.type === "effect_refenced")).toHaveLength(2);
		expect(store.events(nested.id).filter((event) => event.type === "effect_refenced")).toHaveLength(1);
		expect(() =>
			store.posteffect({
				runid: nested.id,
				effectid: nestedwork.id,
				fence: nestedwork.fence,
				inputhash: nestedwork.inputhash,
				status: "ok",
				value: null,
			}),
		).toThrow("stale fence");
		store.close();
	});
	test("doctor detects projection drift and repair restores it from events", () => {
		const { store, path } = openstore();
		const run = createrun(store);
		const effect = store.requesteffect(run.id, {
			key: "repair-check",
			kind: "task",
			input: { value: 1 },
		});
		store.transitionrun(run.id, "running");

		const external = new Database(path);
		external.query("update runs set status = 'failed' where id = ?").run(run.id);
		external.query("delete from effects where id = ?").run(effect.id);
		external.close();

		const report = store.doctor();
		expect(report.ok).toBe(false);
		expect(report.issues).toContain(`run ${run.id} projection status failed does not match running`);
		expect(report.issues).toContain(`effect ${effect.id} projection is missing`);

		const repaired = store.repair();
		expect(existsSync(repaired.backup)).toBe(true);
		expect(store.getrun(run.id)?.status).toBe("running");
		expect(store.geteffect(run.id, effect.id)?.status).toBe("requested");
		expect(store.doctor()).toEqual({ ok: true, issues: [] });
		store.close();
	});
	test("doctor compares durable run and effect projection fields", () => {
		const { store, path } = openstore();
		const run = createrun(store, null);
		const effect = store.requesteffect(run.id, {
			key: "projection-check",
			kind: "task",
			input: { value: 1 },
		});

		const external = new Database(path);
		external
			.query("update runs set process_hash = ?, input_json = ?, fence = fence + 1 where id = ?")
			.run("corrupt-process-hash", stablejson({ value: "corrupt" }), run.id);
		external
			.query("update effects set input_hash = ?, fence = fence + 1 where id = ?")
			.run("corrupt-effect-input-hash", effect.id);
		external.close();

		const report = store.doctor();
		expect(report.ok).toBe(false);
		expect(report.issues).toContain(
			`run ${run.id} projection processhash corrupt-process-hash does not match ${run.processhash}`,
		);
		expect(report.issues).toContain(
			`run ${run.id} projection input ${stablejson({ value: "corrupt" })} does not match ${stablejson(run.input)}`,
		);
		expect(report.issues).toContain(`run ${run.id} projection fence ${run.fence + 1} does not match ${run.fence}`);
		expect(report.issues).toContain(
			`effect ${effect.id} projection inputhash corrupt-effect-input-hash does not match ${effect.inputhash}`,
		);
		expect(report.issues).toContain(
			`effect ${effect.id} projection fence ${effect.fence + 1} does not match ${effect.fence}`,
		);
		store.close();
	});
	test("repair clears released leases while preserving durable run state", () => {
		const { store } = openstore();
		const run = createrun(store, "session-repair-lease");
		const epoch = store.claimrun(run.id, "old-engine", 60_000);
		const transitioned = store.transitionrun(run.id, "running", { output: "kept" });
		const fence = store.bumpfence(run.id);
		expect(store.releaserun(run.id, "old-engine", epoch)).toBe(true);

		store.repair();
		const repaired = store.getrun(run.id);
		expect(repaired).toMatchObject({
			status: "running",
			output: { output: "kept" },
			fence,
			turns: transitioned.turns,
			leaseowner: null,
			leaseexpiresat: null,
			leaseepoch: epoch,
		});
		expect(store.claimrun(run.id, "new-engine", 60_000)).toBe(epoch + 1);
		store.close();
	});
	test("lease claims stay outside event projection and survive repair", () => {
		const { store } = openstore();
		const run = createrun(store, null);
		const epoch = store.claimrun(run.id, "old-engine", 60_000);
		expect(store.releaserun(run.id, "old-engine", epoch)).toBe(true);

		expect(store.doctor()).toEqual({ ok: true, issues: [] });

		store.repair();
		expect(store.getrun(run.id)).toMatchObject({
			leaseowner: null,
			leaseexpiresat: null,
			leaseepoch: epoch,
		});
		expect(store.claimrun(run.id, "new-engine", 60_000)).toBe(epoch + 1);
		store.close();
	});

	test("doctor detects session binding disagreement", () => {
		const { store, path } = openstore();
		const run = createrun(store);
		const external = new Database(path);
		external.query("update runs set session_id = 'other-session' where id = ?").run(run.id);
		external.close();
		const report = store.doctor();
		expect(report.ok).toBe(false);
		expect(report.issues).toContain(
			`session session-1 points to run ${run.id} with projection session other-session`,
		);
		store.close();
	});

	test("repair replays legacy run events with default profile and lease fields", () => {
		const { store, path } = openstore();
		const run = store.createrun({
			processid: "delivery.legacy",
			processversion: "1.0.0",
			processhash: "legacy-hash",
			sessionid: null,
			mode: "call",
			input: {},
			maxturns: 10,
		});
		const external = new Database(path);
		const event = external
			.query("select seq, type, payload_json from events where run_id = ?")
			.get(run.id) as { seq: number; type: string; payload_json: string } | null;
		if (!event) throw new Error("expected legacy event");
		const parsed: unknown = JSON.parse(event.payload_json);
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
			throw new Error("expected legacy event object");
		}
		const payload = parsed as Record<string, unknown>;
		delete payload.profile;
		delete payload.userprofileversion;
		delete payload.projectprofileversion;
		delete payload.leaseowner;
		delete payload.leaseepoch;
		delete payload.leaseexpiresat;
		const payloadjson = stablejson(payload);
		const hash = createHash("sha256")
			.update(`${run.id}\n${event.seq}\n${event.type}\n${payloadjson}\n`)
			.digest("hex");
		external
			.query("update events set payload_json = ?, hash = ? where run_id = ? and seq = ?")
			.run(payloadjson, hash, run.id, event.seq);
		external
			.query("update runs set profile_json = '{\"schema\":1,\"metadata\":{\"corrupt\":true}}' where id = ?")
			.run(run.id);
		external.close();
		store.repair();
		const repaired = store.getrun(run.id);
		expect(repaired?.profile).toEqual({ schema: 1 });
		expect(repaired?.leaseowner).toBeNull();
		expect(repaired?.leaseepoch).toBe(0);
		expect(store.doctor()).toEqual({ ok: true, issues: [] });
		store.close();
	});

	test("failed repair leaves existing projections unchanged", () => {
		const { store, path } = openstore();
		const run = createrun(store, "session-repair-failure");
		const external = new Database(path);
		external.query("update runs set status = 'failed' where id = ?").run(run.id);
		external.query("update events set hash = 'invalid' where run_id = ? and seq = 1").run(run.id);
		external.close();
		expect(() => store.repair()).toThrow("repair event verification failed");
		expect(store.getrun(run.id)?.status).toBe("failed");
		store.close();
	});

	test("migration refuses an existing projection disagreement", () => {
		const { store, path } = openstore();
		const run = createrun(store, "session-migration-failure");
		store.close();
		const external = new Database(path);
		external.query("update runs set status = 'failed' where id = ?").run(run.id);
		external.exec("pragma user_version = 6");
		external.close();
		expect(() => new orchestrationstore(path)).toThrow("database migration blocked");
		const check = new Database(path, { readonly: true });
		const version = check.query("pragma user_version").get() as { user_version: number };
		expect(version.user_version).toBe(6);
		check.close();
	});
});
