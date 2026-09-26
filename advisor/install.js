import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join } from "node:path";

const watchdogyml = "WATCHDOG.yml";
const watchdogyaml = "WATCHDOG.yaml";

function ismapping(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validatewatchdog(document, source) {
  if (!ismapping(document)) {
    throw new Error(`${source} watchdog config must be a yaml mapping`);
  }
  if (document.instructions !== undefined && typeof document.instructions !== "string") {
    throw new Error(`${source} watchdog instructions must be a string`);
  }
  if (document.advisors !== undefined && !Array.isArray(document.advisors)) {
    throw new Error(`${source} watchdog advisors must be a list`);
  }
  for (const [index, advisor] of (document.advisors ?? []).entries()) {
    if (!ismapping(advisor)) {
      throw new Error(`${source} watchdog advisor ${index + 1} must be a yaml mapping`);
    }
    if (typeof advisor.name !== "string") {
      throw new Error(`${source} watchdog advisor ${index + 1} must have a string name`);
    }
    if (advisor.model !== undefined && typeof advisor.model !== "string") {
      throw new Error(`${source} watchdog advisor ${index + 1} model must be a string`);
    }
    if (advisor.instructions !== undefined && typeof advisor.instructions !== "string") {
      throw new Error(`${source} watchdog advisor ${index + 1} instructions must be a string`);
    }
    if (
      advisor.tools !== undefined &&
      (!Array.isArray(advisor.tools) || advisor.tools.some((tool) => typeof tool !== "string"))
    ) {
      throw new Error(`${source} watchdog advisor ${index + 1} tools must be a string list`);
    }
    if (advisor.enabled !== undefined && typeof advisor.enabled !== "boolean") {
      throw new Error(`${source} watchdog advisor ${index + 1} enabled must be a boolean`);
    }
  }
  return document;
}

function watchdogpath(directory) {
  const yml = join(directory, watchdogyml);
  if (existsSync(yml)) return yml;
  const yaml = join(directory, watchdogyaml);
  return existsSync(yaml) ? yaml : yml;
}

function packagedterra() {
  const profile = validatewatchdog(
    Bun.YAML.parse(readFileSync(new URL("./WATCHDOG.yml", import.meta.url), "utf8")),
    "packaged",
  );
  if (!Array.isArray(profile.advisors) || profile.advisors.length !== 1) {
    throw new Error("packaged watchdog profile is invalid");
  }
  const [terra] = profile.advisors;
  if (terra.name !== "terra") {
    throw new Error("packaged watchdog profile has no terra advisor");
  }
  return terra;
}

function replacewatchdog(file, contents) {
  const directory = dirname(file);
  const temporary = mkdtempSync(join(directory, ".watchdog-"));
  const replacement = join(temporary, basename(file));
  try {
    writeFileSync(replacement, contents, "utf8");
    renameSync(replacement, file);
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
function backupwatchdog(file, contents) {
  const temporary = mkdtempSync(join(dirname(file), ".watchdog-backup-"));
  try {
    writeFileSync(join(temporary, basename(file)), contents, { encoding: "utf8", mode: 0o600 });
  } catch (error) {
    rmSync(temporary, { recursive: true, force: true });
    throw error;
  }
}
function normalizedname(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function installadvisor(model) {
  const directory = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".omp", "agent");
  const file = watchdogpath(directory);
  const current = existsSync(file) ? readFileSync(file, "utf8") : null;
  const document = current === null ? {} : validatewatchdog(Bun.YAML.parse(current), "existing");
  const terra = packagedterra();
  if (model !== undefined) {
    const chosenModel = model.trim();
    if (!chosenModel) throw new Error("advisor model must not be empty");
    terra.model = chosenModel;
  }
  const contents = Bun.YAML.stringify({
    ...document,
    advisors: [
      ...(document.advisors ?? []).filter((advisor) => normalizedname(advisor.name) !== "terra"),
      terra,
    ],
  });

  mkdirSync(directory, { recursive: true });
  if (current === contents) return file;
  if (current !== null) backupwatchdog(file, current);
  replacewatchdog(file, contents);
  return file;
}
