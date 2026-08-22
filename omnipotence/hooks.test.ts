import { describe, expect, test } from "bun:test";
import { definehook, hookdispatcherror, hookregistry } from "./hooks.ts";

const payload = { runid: "run-1", state: "running" };

describe("ordered orchestration hooks", () => {
	test("hooks run by priority then id and return recorded outcomes", async () => {
		const order: string[] = [];
		const registry = new hookregistry();
		registry.register(
			definehook({
				id: "audit.second",
				version: "1.0.0",
				phase: "before_advance",
				priority: 20,
				timeoutms: 100,
				async run() {
					order.push("second");
					return { accepted: true };
				},
			}),
		);
		registry.register(
			definehook({
				id: "audit.first",
				version: "1.0.0",
				phase: "before_advance",
				priority: 10,
				timeoutms: 100,
				async run() {
					order.push("first");
					return { accepted: true };
				},
			}),
		);

		const results = await registry.dispatch("before_advance", payload);
		expect(order).toEqual(["first", "second"]);
		expect(results.map((result) => result.hookid)).toEqual(["audit.first", "audit.second"]);
		expect(results.every((result) => result.durationms >= 0)).toBe(true);
	});
	test("hook resolution orders semantic versions and rejects active ties", () => {
		const registry = new hookregistry();
		const hook = (version: string, blueprint: { name: string; version: string }) =>
			definehook({
				id: "audit.versioned",
				version,
				phase: "before_advance",
				timeoutms: 100,
				blueprint,
				async run() {
					return {};
				},
			});
		registry.register(hook("1.0.0-rc.1", { name: "alpha-pack", version: "1.0.0" }));
		registry.register(hook("1.0.0", { name: "alpha-pack", version: "1.0.0" }));
		expect(registry.resolve("audit.versioned").version).toBe("1.0.0");

		registry.register(hook("1.0.0", { name: "beta-pack", version: "1.0.0" }));
		expect(() => registry.resolve("audit.versioned")).toThrow(
			"hook audit.versioned@1.0.0 is ambiguous across blueprints",
		);
		expect(
			registry.resolve("audit.versioned", {
				blueprintname: "beta-pack",
				blueprintversion: "1.0.0",
			}).blueprint?.name,
		).toBe("beta-pack");
	});

	test("a timeout identifies the exact hook and aborts its signal", async () => {
		const registry = new hookregistry();
		let aborted = false;
		registry.register(
			definehook({
				id: "audit.slow",
				version: "1.0.0",
				phase: "effect_requested",
				timeoutms: 5,
				async run(_input, signal) {
					await new Promise<void>((resolve) => {
						signal.addEventListener("abort", () => {
							aborted = true;
							resolve();
						});
					});
					return null;
				},
			}),
		);

		try {
			await registry.dispatch("effect_requested", payload);
			expect.unreachable();
		} catch (error) {
			expect(error).toBeInstanceOf(hookdispatcherror);
			expect(error instanceof Error ? error.message : "").toBe(
				"hook audit.slow timed out after 5ms during effect_requested",
			);
		}
		expect(aborted).toBe(true);
	});

	test("duplicate identities and non-json results fail closed", async () => {
		const registry = new hookregistry();
		const hook = definehook({
			id: "audit.result",
			version: "1.0.0",
			phase: "run_completed",
			timeoutms: 100,
			async run() {
				return new Date();
			},
		});
		registry.register(hook);
		expect(() => registry.register(hook)).toThrow("hook audit.result is already registered");
		await expect(registry.dispatch("run_completed", payload)).rejects.toThrow(
			"hook audit.result failed during run_completed: hook output: expected plain object",
		);
	});

	test("inactive blueprint hooks stay addressable without joining lifecycle dispatch", async () => {
		const registry = new hookregistry();
		registry.register(
			definehook({
				id: "audit.versioned",
				version: "1.0.0",
				phase: "before_advance",
				timeoutms: 100,
				blueprint: { name: "audit-pack", version: "1.0.0" },
				active: false,
				async run() {
					return { version: 1 };
				},
			}),
		);
		registry.register(
			definehook({
				id: "audit.versioned",
				version: "1.0.0",
				phase: "before_advance",
				timeoutms: 100,
				blueprint: { name: "audit-pack", version: "2.0.0" },
				active: true,
				async run() {
					return { version: 2 };
				},
			}),
		);
		expect(registry.list("before_advance")).toHaveLength(1);
		expect((await registry.dispatch("before_advance", payload))[0]?.output).toEqual({ version: 2 });
		expect(
			(
				await registry.dispatchone("audit.versioned", payload, {
					version: "1.0.0",
					blueprintname: "audit-pack",
					blueprintversion: "1.0.0",
				})
			).output,
		).toEqual({ version: 1 });
		expect(
			(
				await registry.dispatchfor("before_advance", payload, {
					name: "audit-pack",
					version: "1.0.0",
				})
			)[0]?.output,
		).toEqual({ version: 1 });
	});
});
