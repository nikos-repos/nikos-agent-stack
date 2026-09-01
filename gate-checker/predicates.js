import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve as resolvePath } from "node:path";

const tag = Object.prototype.toString;
export const isText = (value) => tag.call(value) === "[object String]";
export const isRecord = (value) => value !== null && tag.call(value) === "[object Object]";
export const isFunction = (value) => tag.call(value) === "[object Function]";
export function parseJsonObject(source) {
  try {
    const value = JSON.parse(source);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

export const DEFAULT_FORBIDDEN_MARKERS = [
  "to" + "do: implement", "fix" + "me:", "not " + "implemented", "not yet " + "implemented",
  "/" + "/ stub", "# " + "stub", "/" + "* stub", "def " + "stub(", "pass " + "# ",
  "unimplemented!" + "()", "notimplemented" + "error", "raise notimplemented" + "error",
  "/" + "/ placeholder", "/" + "* placeholder", "# " + "placeholder", "/" + "/ noop", "# " + "noop",
  "coming " + "soon",
];

export const CODE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go",
  ".java", ".rb", ".sh", ".c", ".h", ".cpp", ".cs", ".swift", ".kt",
]);
const DEFAULT_HOME_PATH_CONDITIONS = [
  "/home/(?:[a-z][a-z0-9._-]*)/",
  "/Users/(?:[A-Za-z][A-Za-z0-9._-]*)/",
  "[A-Za-z]:[\\\\/]+Users[\\\\/]+[^\\\\/\\s\"']+[\\\\/]",
];
let cachedHomePathConditions = null;

function yamlConditionValue(value) {
  const text = value.trim();
  if (text.startsWith('"') || text.endsWith('"')) {
    if (!text.startsWith('"') || !text.endsWith('"')) return null;
    try { return JSON.parse(text); } catch { return null; }
  }
  if (text.startsWith("'") || text.endsWith("'")) {
    if (!text.startsWith("'") || !text.endsWith("'")) return null;
    return text.slice(1, -1).replace(/''/g, "'");
  }
  return text || null;
}

function homePathPatterns() {
  const root = process.env.PI_CODING_AGENT_DIR || join(homedir(), ".omp", "agent");
  try {
    const raw = readFileSync(join(root, "rules", "no-absolute-home-path.md"), "utf8");
    const frontMatter = raw.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    if (!frontMatter) return DEFAULT_HOME_PATH_CONDITIONS;
    const lines = frontMatter[1].split(/\r?\n/);
    const start = lines.findIndex((line) => /^\s*condition:\s*$/.test(line));
    if (start < 0) return DEFAULT_HOME_PATH_CONDITIONS;
    const patterns = [];
    for (let i = start + 1; i < lines.length; i++) {
      const match = lines[i].match(/^\s*-\s+(.+?)\s*$/);
      if (!lines[i].trim()) continue;
      if (!match) break;
      const value = yamlConditionValue(match[1]);
      if (value === null) return DEFAULT_HOME_PATH_CONDITIONS;
      patterns.push(value);
    }
    return patterns.length ? patterns : DEFAULT_HOME_PATH_CONDITIONS;
  } catch {
    return DEFAULT_HOME_PATH_CONDITIONS;
  }
}

function compileHomePathConditions(patterns) {
  const compiled = [];
  for (const pattern of patterns) {
    try { compiled.push(new RegExp(pattern)); } catch {}
  }
  return compiled;
}

export function homePathConditions() {
  if (cachedHomePathConditions) return cachedHomePathConditions;
  cachedHomePathConditions = compileHomePathConditions(homePathPatterns());
  if (!cachedHomePathConditions.length)
    cachedHomePathConditions = compileHomePathConditions(DEFAULT_HOME_PATH_CONDITIONS);
  return cachedHomePathConditions;
}

export function loadForbiddenMarkers(dir, explicitPath = null) {
  const markerPath = isText(explicitPath) && explicitPath.trim()
    ? resolvePath(explicitPath)
    : resolvePath(dir, ".omp/gates-markers.txt");
  if (!existsSync(markerPath)) return DEFAULT_FORBIDDEN_MARKERS;
  try {
    const extra = readFileSync(markerPath, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    return DEFAULT_FORBIDDEN_MARKERS.concat(extra);
  } catch {
    return DEFAULT_FORBIDDEN_MARKERS;
  }
}

export function parseDiffAdditions(diff, out, fallbackPath = null) {
  let file = fallbackPath;
  if (file && !out.has(file)) out.set(file, []);
  let newLine = 0;
  for (const raw of diff.split("\n")) {
    if (raw.startsWith("+++ ")) {
      const path = raw.slice(4).trim();
      file = path === "/dev/null" ? null : path.replace(/^b\//, "");
      if (file && !out.has(file)) out.set(file, []);
      continue;
    }
    if (raw.startsWith("@@")) {
      const match = raw.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
      if (match) newLine = Number(match[1]);
      continue;
    }
    if (!file) continue;
    if (raw.startsWith("+")) {
      out.get(file).push({ line: newLine++, text: raw.slice(1) });
    } else if (raw.startsWith(" ")) newLine++;
  }
}

export function contentToAdded(path, content) {
  const out = new Map();
  out.set(path, content.split("\n").map((text, line) => ({ line: line + 1, text })));
  return out;
}

export function diffByLineSet(path, before, after) {
  const remaining = new Map();
  for (const line of before.split("\n")) remaining.set(line, (remaining.get(line) || 0) + 1);
  const added = [];
  const lines = after.split("\n");
  for (let line = 0; line < lines.length; line++) {
    const count = remaining.get(lines[line]) || 0;
    if (count) remaining.set(lines[line], count - 1);
    else added.push({ line: line + 1, text: lines[line] });
  }
  const out = new Map();
  if (added.length) out.set(path, added);
  return out;
}

export function checkAddedLines(added, markers) {
  const failures = [];
  const lowered = markers.map((marker) => [marker, marker.toLowerCase()]);
  for (const [path, lines] of added) {
    const dot = path.lastIndexOf(".");
    if (dot < 0 || !CODE_EXTENSIONS.has(path.slice(dot).toLowerCase())) continue;
    for (const entry of lines) {
      const text = entry.text.toLowerCase();
      for (const [marker, needle] of lowered) {
        if (text.includes(needle)) failures.push({
          gate: "completion",
          rule: "forbidden_marker",
          detail: `\`${path}\` line ${entry.line}: this turn added a forbidden marker "${marker}" — implement it or remove it.`,
        });
      }
    }
  }
  return failures;
}

export const normalizePath = (path) => path.replace(/^\.\//, "");
export function makeClaimMatcher(changedFiles, repoRoot, cwd) {
  const normalized = new Set([...changedFiles].map(normalizePath));
  if (!repoRoot) return (claim) => normalized.has(normalizePath(claim));
  const absolute = new Set([...changedFiles].map((file) => resolvePath(repoRoot, normalizePath(file))));
  return (claim) => {
    const path = normalizePath(claim);
    return normalized.has(path) || (isAbsolute(path)
      ? absolute.has(path)
      : absolute.has(resolvePath(cwd, path)) || absolute.has(resolvePath(repoRoot, path)));
  };
}

export const MANIFEST_OPEN = "<changed-files>";
export const MANIFEST_CLOSE = "</changed-files>";
export const MANIFEST_JSON_KEYS = ["changed", "changedFiles", "changed_files", "manifest"];

function manifestLines(raw) {
  return raw.replace(/\\r\\n|\\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, "").replace(/^`|`$/g, "").trim())
    .filter((line) => line && line.toLowerCase() !== "none");
}

function manifestFromLiteral(text) {
  const open = text.lastIndexOf(MANIFEST_OPEN);
  if (open < 0) return null;
  const close = text.indexOf(MANIFEST_CLOSE, open);
  return close < 0 ? null : manifestLines(text.slice(open + MANIFEST_OPEN.length, close));
}

function looksLikePath(path) {
  return !/\s/.test(path) && (path.includes("/") || /\.[A-Za-z0-9]{1,8}$/.test(path));
}

function manifestValue(value) {
  if (value === null) return [];
  if (Array.isArray(value)) return value.filter(isText).map((item) => item.trim()).filter(Boolean);
  if (!isText(value)) return null;
  const literal = manifestFromLiteral(value);
  if (literal !== null) return literal;
  const lines = manifestLines(value);
  return lines.length && lines.every(looksLikePath) ? lines : null;
}

function manifestFromJson(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch {
    const open = text.indexOf("{");
    const close = text.lastIndexOf("}");
    if (open < 0 || close <= open) return null;
    try { parsed = JSON.parse(text.slice(open, close + 1)); } catch { return null; }
  }
  let found = null;
  const walk = (node, depth) => {
    if (found !== null || depth > 8 || node === null) return;
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1);
      return;
    }
    if (!isRecord(node)) return;
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

export function extractManifest(text) {
  const literal = manifestFromLiteral(text);
  return literal === null ? manifestFromJson(text) : literal;
}

export const COMMIT_CLEAN_CMD = "git status --porcelain --untracked-files=no";
export function hashContent(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 16);
}
export function readSnapshot(path, maxBytes = 2 * 1024 * 1024) {
  try {
    if (!existsSync(path)) return null;
    const content = readFileSync(path, "utf8");
    return content.length > maxBytes ? null : content;
  } catch {
    return null;
  }
}
