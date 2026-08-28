/**
 * @module gate-checker/predicates
 * @description single source of truth for every gate predicate in the stack.
 *
 * the extension (index.ts) and the CLI (gate-cli.js) previously each carried
 * their own copy of the marker list and their own added-line extraction — one
 * in TypeScript, one as a shell `grep '^+'` pipeline. they drifted: a fix to
 * the pre-existing-marker false positive had to be written twice, in two
 * languages, with two behaviors.
 *
 * plain JS with JSDoc types on purpose: the extension is TypeScript run through
 * bun and the CLI is plain JS. a .js module with JSDoc is the form both can
 * import with no build step and no `any`.
 *
 * @typedef {{ line: number, text: string }} AddedLine
 * @typedef {Map<string, AddedLine[]>} AddedMap
 * @typedef {{ gate: string, rule: string, detail: string }} GateFailure
 */

import { existsSync, readFileSync } from "fs";
import { createHash } from "crypto";
import { resolve as resolvePath, isAbsolute, join } from "path";
import { homedir } from "os";

// ── forbidden markers ───────────────────────────────────────────────────────

/**
 * bare "placeholder" / "STUB" / "FIXME" / "noop" are deliberately absent: they
 * match legitimate code (PLACEHOLDER_USER_ID, sinon.stub(), noopMiddleware) and
 * produced false blocks. every entry here must be specific enough that its
 * presence in an added line is unambiguous evidence of unfinished work.
 *
 * @type {string[]}
 */
export const DEFAULT_FORBIDDEN_MARKERS = [
  "todo: implement",
  "fixme:",
  "not implemented",
  "not yet implemented",
  "// stub",
  "# stub",
  "/* stub",
  "def stub(",
  "pass  # ",
  "unimplemented!()",
  "notimplementederror",
  "raise notimplementederror",
  "// placeholder",
  "/* placeholder",
  "# placeholder",
  "// noop",
  "# noop",
  "coming soon",
];

// scope marker checks to code: the marker gate fired 22 times and was wrong 22 times — 19 .md, 3 .html, zero code.
/**
 * @type {Set<string>}
 */
export const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go",
  ".java", ".rb", ".sh", ".c", ".h", ".cpp", ".cs", ".swift", ".kt",
]);
// Keep these patterns aligned with rules/no-absolute-home-path.md. The rule
// file is authoritative; this fallback covers a missing or malformed install.
const DEFAULT_HOME_PATH_CONDITIONS = [
  "/home/[a-z][a-z0-9._-]*/",
  "/Users/[A-Za-z][A-Za-z0-9._-]*/",
  "[A-Za-z]:[\\\\/]+Users[\\\\/]+[^\\\\/\\s\"']+[\\\\/]",
];
let cachedHomePathConditions = null;

function yamlConditionValue(value) {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') || trimmed.endsWith('"')) {
    if (!trimmed.startsWith('"') || !trimmed.endsWith('"')) return null;
    try {
      return JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (trimmed.startsWith("'") || trimmed.endsWith("'")) {
    if (!trimmed.startsWith("'") || !trimmed.endsWith("'")) return null;
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed || null;
}

function homePathPatterns() {
  const agentDir =
    process.env.PI_CODING_AGENT_DIR || join(homedir(), ".omp", "agent");
  const rulePath = join(agentDir, "rules", "no-absolute-home-path.md");
  try {
    const raw = readFileSync(rulePath, "utf-8");
    const frontMatter = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontMatter) return DEFAULT_HOME_PATH_CONDITIONS;
    const lines = frontMatter[1].split(/\r?\n/);
    const start = lines.findIndex((line) => /^\s*condition:\s*$/.test(line));
    if (start < 0) return DEFAULT_HOME_PATH_CONDITIONS;
    const patterns = [];
    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      const item = line.match(/^\s*-\s+(.+?)\s*$/);
      if (!item) break;
      const value = yamlConditionValue(item[1]);
      if (value === null) return DEFAULT_HOME_PATH_CONDITIONS;
      patterns.push(value);
    }
    return patterns.length > 0 ? patterns : DEFAULT_HOME_PATH_CONDITIONS;
  } catch {
    return DEFAULT_HOME_PATH_CONDITIONS;
  }
}

function compileHomePathConditions(patterns) {
  const compiled = [];
  for (const pattern of patterns) {
    try {
      compiled.push(new RegExp(pattern));
    } catch {
      // A malformed condition must not break the completion gate.
    }
  }
  return compiled;
}

export function homePathConditions() {
  if (cachedHomePathConditions) return cachedHomePathConditions;
  const compiled = compileHomePathConditions(homePathPatterns());
  cachedHomePathConditions =
    compiled.length > 0
      ? compiled
      : compileHomePathConditions(DEFAULT_HOME_PATH_CONDITIONS);
  return cachedHomePathConditions;
}

/**
 * loads `<dir>/.omp/gates-markers.txt` (one marker per line, `#` for comments)
 * and appends it to the defaults.
 *
 * @param {string} dir directory to resolve the marker file against.
 * @returns {string[]}
 */
export function loadForbiddenMarkers(dir) {
  const markerFile = resolvePath(dir, ".omp/gates-markers.txt");
  if (!existsSync(markerFile)) return DEFAULT_FORBIDDEN_MARKERS;
  try {
    const raw = readFileSync(markerFile, "utf-8");
    return [
      ...DEFAULT_FORBIDDEN_MARKERS,
      ...raw
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith("#")),
    ];
  } catch {
    return DEFAULT_FORBIDDEN_MARKERS;
  }
}

// ── diff parsing ────────────────────────────────────────────────────────────

/**
 * parses unified-diff text into per-file added lines, keyed by repo-root-
 * relative path with the line number in the new file.
 *
 * accepts both full `git diff` output and a bare hunk list (the omp edit tool
 * returns `details.diff` with `@@` headers but no `+++` line), hence
 * `fallbackPath`.
 *
 * @param {string} diff
 * @param {AddedMap} out accumulator, mutated in place.
 * @param {string} [fallbackPath] path to attribute hunks that have no `+++`.
 */
export function parseDiffAdditions(diff, out, fallbackPath) {
  let file = fallbackPath ?? null;
  if (file && !out.has(file)) out.set(file, []);
  let newLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const p = raw.slice(4).trim();
      file = p === "/dev/null" ? null : p.replace(/^b\//, "");
      if (file && !out.has(file)) out.set(file, []);
      continue;
    }
    if (raw.startsWith("@@")) {
      const m = raw.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (m) newLine = Number(m[1]);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("+")) {
      out.get(file)?.push({ line: newLine, text: raw.slice(1) });
      newLine++;
    } else if (raw.startsWith(" ")) {
      newLine++;
    }
    // "-" lines are deletions: they do not advance the new-file counter
  }
}
/**
 * treats an entire file body as added — for `write`, which replaces the whole
 * file, and for the no-git first-touch snapshot of a new file.
 *
 * @param {string} path
 * @param {string} content
 * @returns {AddedMap}
 */
export function contentToAdded(path, content) {
  /** @type {AddedMap} */
  const out = new Map();
  out.set(
    path,
    content.split("\n").map((text, i) => ({ line: i + 1, text })),
  );
  return out;
}

/**
 * lines whose occurrence count increased in `after`. this is the no-git
 * equivalent of a diff: it preserves duplicate additions without reporting a
 * pre-existing occurrence as new.
 *
 * @param {string} path
 * @param {string} before
 * @param {string} after
 * @returns {AddedMap}
 */
export function diffByLineSet(path, before, after) {
  const remaining = new Map();
  for (const line of before.split("\n")) {
    remaining.set(line, (remaining.get(line) ?? 0) + 1);
  }
  /** @type {AddedLine[]} */
  const added = [];
  const lines = after.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const count = remaining.get(lines[i]) ?? 0;
    if (count > 0) remaining.set(lines[i], count - 1);
    else added.push({ line: i + 1, text: lines[i] });
  }
  /** @type {AddedMap} */
  const out = new Map();
  if (added.length > 0) out.set(path, added);
  return out;
}

// ── the completion predicate ────────────────────────────────────────────────

/**
 * the completion check. judges only lines added by this unit of work, never
 * whole files: a pre-existing marker on an untouched line used to trap the
 * agent in a continuation loop it could only escape by editing unrelated code.
 *
 * both layers and the inline (tool_result) gate route through this function.
 * @param {AddedMap} added
 * @param {string[]} markers
 * @returns {GateFailure[]}
 */
export function checkAddedLines(added, markers) {
  /** @type {GateFailure[]} */
  const failures = [];
  const lowered = markers.map((m) => ({ marker: m, lm: m.toLowerCase() }));

  for (const [relPath, lines] of added) {
    const dot = relPath.lastIndexOf(".");
    if (dot < 0 || !CODE_EXTENSIONS.has(relPath.slice(dot).toLowerCase())) continue;
    for (const { line, text } of lines) {
      const lower = text.toLowerCase();
      for (const { marker, lm } of lowered) {
        if (lower.includes(lm)) {
          failures.push({
            gate: "completion",
            rule: "forbidden_marker",
            detail: `\`${relPath}\` line ${line}: this turn added a forbidden marker "${marker}" — implement it or remove it.`,
          });
        }
      }
    }
  }

  return failures;
}

// ── path / claim matching ───────────────────────────────────────────────────

/** @param {string} p @returns {string} */
export const normalizePath = (p) => p.replace(/^\.\//, "");

/**
 * changed-file paths come from git and are repo-root-relative; the agent writes
 * paths relative to its cwd. when those differ (omp launched from a
 * subdirectory) a naive string compare marks every honest claim fabricated.
 * accepts a claim that resolves to a changed file from either anchor.
 * @param {string | null} repoRoot
 * @param {string} cwd
 * @returns {(claim: string) => boolean}
 */
export function makeClaimMatcher(changedFiles, repoRoot, cwd) {
  const norm = new Set([...changedFiles].map(normalizePath));
  if (!repoRoot) return (claim) => norm.has(normalizePath(claim));

  const abs = new Set(
    [...changedFiles].map((f) => resolvePath(repoRoot, normalizePath(f))),
  );
  return (claim) => {
    const c = normalizePath(claim);
    if (norm.has(c)) return true;
    if (isAbsolute(c)) return abs.has(c);
    return abs.has(resolvePath(cwd, c)) || abs.has(resolvePath(repoRoot, c));
  };
}

// ── subagent manifest ───────────────────────────────────────────────────────

export const MANIFEST_OPEN = "<changed-files>";
export const MANIFEST_CLOSE = "</changed-files>";

/**
 * JSON keys that carry a manifest when a subagent is bound to an output schema
 * and cannot emit the literal block.
 * @type {string[]}
 */
export const MANIFEST_JSON_KEYS = ["changed", "changedFiles", "changed_files", "manifest"];

/**
 * parses the structured manifest a subagent must emit.
 *
 * the citation gate only ever fired on prose matching a verb + backticked path,
 * so the cheapest way to satisfy "do not claim changes you did not make" was to
 * stop making checkable claims at all — vagueness passed silently. requiring an
 * explicit manifest inverts that: absence is the failure, so there is no reward
 * for saying less.
 *
 * an empty manifest is valid and is how a read-only subagent reports "i changed
 * nothing" — the point is an explicit statement, not a non-empty one.
 *
 * @param {string} text
 * @returns {string[] | null} listed paths, or null when no manifest is present.
 */
export function extractManifest(text) {
  const literal = manifestFromLiteral(text);
  if (literal !== null) return literal;
  return manifestFromJson(text);
}

/** @param {string} raw @returns {string[]} */
function manifestLines(raw) {
  return raw
    // a subagent that yields structured output has its report JSON-encoded by
    // the harness, so a manifest inside a string value arrives with escaped
    // newlines. without this the whole block reads as one bogus path.
    .replace(/\\r\\n|\\n/g, "\n")
    .split("\n")
    .map((l) => l.trim().replace(/^[-*]\s*/, "").replace(/^`|`$/g, "").trim())
    .filter(Boolean)
    .filter((l) => l.toLowerCase() !== "none");
}

/** @param {string} text @returns {string[] | null} */
function manifestFromLiteral(text) {
  const open = text.lastIndexOf(MANIFEST_OPEN);
  if (open === -1) return null;
  const close = text.indexOf(MANIFEST_CLOSE, open);
  if (close === -1) return null;
  return manifestLines(text.slice(open + MANIFEST_OPEN.length, close));
}

/**
 * recovers a manifest from a JSON subagent report.
 *
 * the literal-block-only check was unsatisfiable for any subagent bound to an
 * output schema: the harness serializes its result, so the block can never
 * appear as free prose. a report carrying `"changed": []` states exactly the
 * required fact and was still rejected. accepting the JSON forms costs a little
 * strictness and buys a rule an agent can actually satisfy.
 *
 * @param {string} text
 * @returns {string[] | null}
 */
function manifestFromJson(text) {
  const parsed = parseLooseJson(text);
  if (parsed === undefined) return null;

  /** @type {string[] | null} */
  let found = null;
  /** @param {unknown} node @param {number} depth */
  const walk = (node, depth) => {
    if (found !== null || depth > 8 || node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    for (const [key, value] of Object.entries(node)) {
      if (MANIFEST_JSON_KEYS.includes(key)) {
        found = manifestValue(value);
        if (found !== null) return;
      }
    }
    for (const value of Object.values(node)) walk(value, depth + 1);
  };
  walk(parsed, 0);
  return found;
}

/** @param {unknown} value @returns {string[] | null} */
function manifestValue(value) {
  // `"changed": null` and `"changed": []` both mean "i changed nothing", which
  // is a valid manifest — the rule demands an explicit statement, not a
  // non-empty one.
  if (value === null) return [];
  if (Array.isArray(value)) {
    return value.filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const nested = manifestFromLiteral(value);
    if (nested !== null) return nested;
    // a bare string is only a manifest if it reads like paths. `"changed": "yes"`
    // would otherwise become a manifest naming one file called "yes", which the
    // diff cannot contain — a fabricated `subagent_manifest_mismatch` produced
    // entirely by the parser.
    const lines = manifestLines(value);
    return lines.length > 0 && lines.every(looksLikePath) ? lines : null;
  }
  return null;
}

/** @param {string} s @returns {boolean} */
function looksLikePath(s) {
  return !/\s/.test(s) && (s.includes("/") || /\.[A-Za-z0-9]{1,8}$/.test(s));
}

/**
 * parses json that may be wrapped in surrounding text (fences, log lines, the
 * harness's own `<output>` envelope).
 *
 * @param {string} text
 * @returns {unknown}
 */
function parseLooseJson(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}
  const open = trimmed.indexOf("{");
  const close = trimmed.lastIndexOf("}");
  if (open === -1 || close <= open) return undefined;
  try {
    return JSON.parse(trimmed.slice(open, close + 1));
  } catch {
    return undefined;
  }
}

// ── shell predicates ────────────────────────────────────────────────────────

/**
 * working tree carries no uncommitted change to a tracked file.
 *
 * `--untracked-files=no`: an untracked build artifact, log, or scratch file is
 * not an uncommitted *change*, but it made the gate unpassable. it also keeps
 * this predicate consistent with the `--diff-filter=ACMR` diffs the rest of the
 * stack reads — those do not report untracked files either.
 *
 * the commit gate in index.ts runs this string directly.
 */
export const COMMIT_CLEAN_CMD =
  'git status --porcelain --untracked-files=no';

// ── content hashing (no git) ────────────────────────────────────────────────

/** @param {string} content @returns {string} */
export function hashContent(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}

/**
 * reads a file for snapshotting. returns null when absent or too large to be
 * worth holding in memory for a whole request.
 *
 * @param {string} abs
 * @param {number} [maxBytes]
 * @returns {string | null}
 */
export function readSnapshot(abs, maxBytes = 2 * 1024 * 1024) {
  try {
    if (!existsSync(abs)) return null;
    const content = readFileSync(abs, "utf-8");
    return content.length > maxBytes ? null : content;
  } catch {
    return null;
  }
}
