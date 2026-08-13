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
	"./gates": "./gate-checker/gates.js",
	"./delivery-contract.process": "./gate-checker/delivery-contract.process.js",
};

const expectedFiles = [
	"gate-checker/index.ts",
	"gate-checker/wiring-check.ts",
	"gate-checker/gate-cli.js",
	"gate-checker/predicates.js",
	"gate-checker/ledger.js",
	"gate-checker/config.js",
	"gate-checker/scope.js",
	"gate-checker/lease.js",
	"gate-checker/risks.js",
	"gate-checker/provenance.js",
	"gate-checker/gates.js",
	"gate-checker/journal.js",
	"gate-checker/delivery-contract.process.js",
	"ask-questionnaire/index.ts",
	"agents/terra.md",
	"README.md",
];

const oldArtifacts = [
	"ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch",
	"advisor-role/UPSTREAM_BASE",
];

type yamlValue = string | yamlObject | string[];
type yamlObject = { [key: string]: yamlValue };

function parseFrontmatter(source: string): yamlObject {
	const match = source.match(/^---\n([\s\S]*?)\n---/);
	expect(match).not.toBeNull();
	return parseYaml(match![1].split("\n"));
}

function parseYaml(lines: string[], start = 0, indent = 0): yamlObject | string[] {
	const first = lines[start];
	const list = first.trimStart().startsWith("- ");
	const value: yamlObject | string[] = list ? [] : {};
	let index = start;

	while (index < lines.length) {
		const line = lines[index];
		if (!line.trim()) {
			index++;
			continue;
		}

		const lineIndent = line.length - line.trimStart().length;
		if (lineIndent < indent) break;
		if (lineIndent > indent) throw new Error(`unexpected yaml indentation: ${line}`);

		const content = line.trim();
		if (list) {
			expect(content.startsWith("- ")).toBe(true);
			(value as string[]).push(content.slice(2));
			index++;
			continue;
		}

		const field = content.match(/^([a-zA-Z]+):(?:\s+(.*))?$/);
		if (!field) throw new Error(`invalid yaml field: ${line}`);
		const [, key, inline] = field;
		if (inline) {
			(value as yamlObject)[key] = inline;
			index++;
			continue;
		}

		const childStart = index + 1;
		const child = parseYaml(lines, childStart, indent + 2);
		(value as yamlObject)[key] = child;
		index = childStart;
		while (index < lines.length) {
			const childIndent = lines[index].length - lines[index].trimStart().length;
			if (lines[index].trim() && childIndent <= indent) break;
			index++;
		}
	}

	return value;
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

	const output = terra.output as yamlObject;
	const evidence = (output.properties as yamlObject).evidence as yamlObject;
	expect(output.type).toBe("object");
	expect(output.additionalProperties).toBe("false");
	expect(output.required).toEqual(["advice", "evidence"]);
	expect(evidence.type).toBe("object");
	expect(evidence.additionalProperties).toBe("false");
	expect(evidence.required).toEqual(["path", "line", "claim", "digest"]);
	expect(Object.keys(evidence.properties as yamlObject)).toEqual(["path", "line", "claim", "digest"]);
});
