import { expect, test } from "bun:test";
import { execFileSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { installadvisor } from "./advisor/install.js";

const root = fileURLToPath(new URL(".", import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));

const expectedExtensions = [
	"./gate-checker/index.ts",
	"./omnipotence/index.ts",
	"./ask-questionnaire/index.ts",
	"./orchestrate-prompt/index.ts",
	"./n-code-mode/index.ts",
	"./advisor/index.ts",
];

const expectedExports = {
	"./gate-cli": "./gate-checker/gate-cli.js",
	"./omnipotence": "./omnipotence/api.ts",
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
	"gate-checker/mutation-lease.ts",
	"gate-checker/risks.js",
	"gate-checker/provenance.js",
	"gate-checker/journal.js",
	"stop-slot.ts",
	"omnipotence/index.ts",
	"omnipotence/factory.ts",
	"omnipotence/status.ts",
	"omnipotence/stop-decision.ts",
	"omnipotence/cli.ts",
	"omnipotence/api.ts",
	"omnipotence/contracts.ts",
	"omnipotence/store.ts",
	"omnipotence/engine.ts",
	"omnipotence/hooks.ts",
	"omnipotence/profiles.ts",
	"omnipotence/blueprints.ts",
	"omnipotence/loader.ts",
	"omnipotence/processes.ts",
	"docs/omnipotence-user-guide.md",
	"ask-questionnaire/index.ts",
	"ask-questionnaire/stop-decision.ts",
	"orchestrate-prompt/index.ts",
	"orchestrate-prompt/prompt.md",
	"docs/orchestrate-prompt-user-guide.md",
	"n-code-mode/index.ts",
	"n-code-mode/ncm.ts",
	"n-code-mode/.claude-plugin/plugin.json",
	"n-code-mode/.claude-plugin/marketplace.json",
	"n-code-mode/hooks/hooks.json",
	"n-code-mode/hooks/stop.ts",
	"n-code-mode/skills/review/SKILL.md",
	"n-code-mode/doctrine.md",
	"docs/n-code-mode-user-guide.md",
	"advisor/index.ts",
	"advisor/cli.js",
	"advisor/install.js",
	"advisor/WATCHDOG.yml",
	"README.md",
];

const oldArtifacts = [
	"ask-questionnaire/0001-feat-ask-add-questionnaire-workflow.patch",
	"advisor-role/UPSTREAM_BASE",
];

const expectedHelp =
	[
		"omnipotence commands:",
		"  run start|status|events|resume|halt|list",
		"  effect list|show|post|resolve-uncertain",
		"  session status|bind|unbind",
		"  process list|show|validate|plan",
		"  profile show|write|merge|render",
		"  blueprint list|inspect|install|update|rollback|remove",
		"  hook list|inspect|probe",
		"  doctor",
		"  repair",
		"",
		"global flags: --json --dry-run --help --version",
	].join("\n") + "\n";

test("a local bun link exposes the omnipotence cli", () => {
	const bunExecutable = Bun.which("bun");
	expect(bunExecutable).not.toBeNull();
	expect(existsSync(bunExecutable!)).toBe(true);
	const buninstall = mkdtempSync(resolve(tmpdir(), "nikos-agent-stack-bun-"));
	try {
		const globalroot = resolve(buninstall, "install/global");
		mkdirSync(globalroot, { recursive: true });
		writeFileSync(
			resolve(globalroot, "package.json"),
			'{"name":"global","dependencies":{}}\n',
		);
		const env = {
			...process.env,
			BUN_INSTALL: buninstall,
			BUN_INSTALL_GLOBAL_DIR: globalroot,
			BUN_INSTALL_BIN: resolve(buninstall, "bin"),
		};
		execFileSync("bun", ["link"], {
			cwd: root,
			env,
			encoding: "utf8",
			stdio: "pipe",
		});
		const globalbin = execFileSync("bun", ["pm", "bin", "-g"], {
			env,
			encoding: "utf8",
		}).trim();
		expect(existsSync(resolve(globalbin, "omnipotence"))).toBe(true);
		expect(existsSync(resolve(globalbin, "ncm"))).toBe(true);
		const result = spawnSync("omnipotence", ["--help"], {
			cwd: root,
			env: {
				...env,
				PATH: [globalbin, dirname(bunExecutable!)].join(delimiter),
			},
			encoding: "utf8",
		});

		expect(result.status).toBe(0);
		expect(result.stdout).toBe(expectedHelp);
	} finally {
		rmSync(buninstall, { recursive: true, force: true });
	}
});

test("the package exposes only the declared public surface", async () => {
	expect(pkg.name).toBe("nikos-agent-stack");
	expect(pkg.version).toBe("2.5.0");
	expect(pkg.engines).toEqual({ bun: ">=1.3.14" });
	expect(pkg.omp.extensions).toEqual(expectedExtensions);
	expect(pkg.bin).toEqual({
		"nikos-gates": "gate-checker/gate-cli.js",
		omnipotence: "omnipotence/cli.ts",
		ncm: "n-code-mode/ncm.ts",
		"nikos-advisor": "advisor/cli.js",
	});
	expect(pkg.exports).toEqual(expectedExports);
	expect(pkg.files).toEqual(expectedFiles);
	expect(pkg.dependencies).toEqual({ "@oh-my-pi/pi-utils": "^17.2.15" });

	for (const artifact of oldArtifacts) {
		expect(pkg.files).not.toContain(artifact);
	}

	for (const entry of [
		...pkg.omp.extensions,
		...Object.values(pkg.exports),
		...Object.values(pkg.bin),
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
	// the omnipotence api is the authoring surface: a wildcard barrel would make every
	// internal export public by accident, so pin no wildcards and exactly these values.
	const apisource = readFileSync(resolve(root, "omnipotence/api.ts"), "utf8");
	expect(apisource).not.toContain("export *");
	const api = await import(new URL("omnipotence/api.ts", import.meta.url).href);
	expect(Object.keys(api).sort()).toEqual([
		"assertvalid",
		"definehook",
		"defineprocess",
		"jsonvalueof",
		"stablejson",
	]);
});

test("terra advisor installation selects models and preserves peers", () => {
	const directory = mkdtempSync(resolve(tmpdir(), "nikos-agent-stack-advisor-"));
	const previousDirectory = process.env.PI_CODING_AGENT_DIR;
	process.env.PI_CODING_AGENT_DIR = directory;
	const watchdogfile = resolve(directory, "WATCHDOG.yml");
	const readwatchdog = () => Bun.YAML.parse(readFileSync(watchdogfile, "utf8")) as {
		advisors: Array<{ name: string; model?: string;[key: string]: unknown }>;
	};

	try {
		installadvisor();
		let installed = readwatchdog();
		expect(installed.advisors).toHaveLength(1);
		expect(installed.advisors[0].name).toBe("terra");
		expect(installed.advisors[0].model).toBeUndefined();

		installadvisor("arbitrary/provider-model");
		installed = readwatchdog();
		expect(installed.advisors[0].model).toBe("arbitrary/provider-model");

		installadvisor();
		installed = readwatchdog();
		expect(installed.advisors[0].model).toBe("arbitrary/provider-model");

		installadvisor("override/provider-model");
		installed = readwatchdog();
		expect(installed.advisors[0].model).toBe("override/provider-model");

		const peer = { name: "reviewer", enabled: true, model: "peer/model" };
		writeFileSync(watchdogfile, Bun.YAML.stringify({ advisors: [peer, ...installed.advisors] }));
		installadvisor();
		installed = readwatchdog();
		expect(installed.advisors).toContainEqual(peer);
		expect(installed.advisors.find((advisor) => advisor.name === "terra")?.model).toBe(
			"override/provider-model",
		);
	} finally {
		if (previousDirectory === undefined) delete process.env.PI_CODING_AGENT_DIR;
		else process.env.PI_CODING_AGENT_DIR = previousDirectory;
		rmSync(directory, { recursive: true, force: true });
	}
});
