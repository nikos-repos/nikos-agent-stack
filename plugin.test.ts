import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const expectedExtensions = [
	"./gate-checker/index.ts",
	"./ask-questionnaire/index.ts",
];

const expectedExports = {
	"./gate-cli": "./gate-checker/gate-cli.js",
};

const expectedFiles = [
	"gate-checker/index.ts",
	"gate-checker/gate-cli.js",
	"gate-checker/predicates.js",
	"gate-checker/ledger.js",
	"gate-checker/frustrations.js",
	"gate-checker/config.js",
	"gate-checker/scope.js",
	"gate-checker/lease.js",
	"gate-checker/risks.js",
	"gate-checker/provenance.js",
	"gate-checker/journal.js",
	"ask-questionnaire/index.ts",
	"advisor/install.js",
	"advisor/WATCHDOG.yml",
	"README.md",
];

const oldArtifacts = [
	"ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch",
	"advisor-role/UPSTREAM_BASE",
];


test("the package exposes only the declared public surface", async () => {
	expect(pkg.name).toBe("nikos-agent-stack");
	expect(pkg.version).toBe("1.0.0");
	expect(pkg.engines).toEqual({ bun: ">=1.2.22" });
	expect(pkg.omp.extensions).toEqual(expectedExtensions);
	expect(pkg.bin).toEqual({ "nikos-gates": "gate-checker/gate-cli.js" });
	expect(pkg.exports).toEqual(expectedExports);
	expect(pkg.files).toEqual(expectedFiles);

	for (const artifact of oldArtifacts) {
		expect(pkg.files).not.toContain(artifact);
	}

	for (const entry of [
		...pkg.omp.extensions,
		...Object.values(pkg.exports),
		pkg.bin["nikos-gates"],
	]) {
		expect(existsSync(resolve(root, entry))).toBe(true);
	}
	for (const entry of pkg.files) {
		expect(existsSync(resolve(root, entry))).toBe(true);
	}

	// imports manifest-selected entries because static imports cannot exercise runtime loading.
	for (const entry of pkg.omp.extensions) {
		const extension = await import(new URL(entry, import.meta.url).href);
		expect(typeof extension.default).toBe("function");
	}
});

test("terra is a native passive advisor with source-backed notes", () => {
	const watchdog = Bun.YAML.parse(
		readFileSync(resolve(root, "advisor/WATCHDOG.yml"), "utf8"),
	);

	expect(Object.keys(watchdog)).toEqual(["advisors"]);
	expect(watchdog.advisors).toHaveLength(1);

	const [terra] = watchdog.advisors;
	expect(terra.name).toBe("terra");
	expect(terra.enabled).toBe(true);
	expect(terra.model).toBe("openai-codex/gpt-5.6-terra:high");
	expect(terra.tools).toEqual(["read", "grep", "glob"]);
	expect(terra.instructions).toContain("path");
	expect(terra.instructions).toContain("line");
	expect(terra.instructions).toContain("claim");
	expect(terra.instructions).toContain("read-snapshot digest");
	expect(terra.instructions).toContain("omp validates only note and severity");
});
