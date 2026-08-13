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
	"gate-checker/config.js",
	"gate-checker/scope.js",
	"gate-checker/lease.js",
	"gate-checker/risks.js",
	"gate-checker/provenance.js",
	"gate-checker/journal.js",
	"ask-questionnaire/index.ts",
	"agents/terra.md",
	"README.md",
];

const oldArtifacts = [
	"ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch",
	"advisor-role/UPSTREAM_BASE",
];

function parseFrontmatter(source: string): any {
	const match = source.match(/^---\n([\s\S]*?)\n---/);
	expect(match).not.toBeNull();
	return Bun.YAML.parse(match![1]);
}

test("the package exposes only the declared public surface", async () => {
	expect(pkg.name).toBe("nikos-agent-stack");
	expect(pkg.version).toBe("1.0.0");
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

	// imports manifest-selected entries because static imports cannot exercise runtime loading.
	for (const entry of pkg.omp.extensions) {
		const extension = await import(new URL(entry, import.meta.url).href);
		expect(typeof extension.default).toBe("function");
	}
});

test("terra remains a read-only advisor with source-backed evidence", () => {
	const terra = parseFrontmatter(readFileSync(resolve(root, "agents/terra.md"), "utf8"));

	expect(Object.keys(terra)).toEqual(["name", "description", "model", "thinking", "tools", "output"]);
	expect(terra.name).toBe("terra-advisor");
	expect(terra.model).toBe("openai-codex/gpt-5.6-terra");
	expect(terra.thinking).toBe("high");
	expect(terra.tools).toEqual(["read", "grep", "glob"]);

	const output = terra.output;
	const evidence = output.properties.evidence;
	expect(output.type).toBe("object");
	// a closed schema is the contract, so the value must be the boolean false —
	// the string "false" would be a truthy, open schema anywhere it is consumed.
	expect(output.additionalProperties).toBe(false);
	expect(output.required).toEqual(["advice", "evidence"]);
	expect(evidence.type).toBe("object");
	expect(evidence.additionalProperties).toBe(false);
	expect(evidence.required).toEqual(["path", "line", "claim", "digest"]);

	const fields = evidence.properties;
	expect(Object.keys(fields)).toEqual(["path", "line", "claim", "digest"]);
	expect(fields.path.type).toBe("string");
	expect(fields.line.type).toBe("integer");
	expect(fields.claim.type).toBe("string");
	expect(fields.digest.type).toBe("string");
});
