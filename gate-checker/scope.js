import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, lstatSync, openSync, readFileSync, readlinkSync, readSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { contentToAdded, diffByLineSet, parseDiffAdditions, isRecord, isText } from "./predicates.js";

const max_buffer = 64 * 1024 * 1024;
// ponytail: count ceiling on snapshotted baseline dirt; add a byte budget if a few huge dirty files ever matter.
const max_baseline_paths = 2_000;
const scope_kinds = new Set(["request", "uncommitted", "base", "commit"]);

function git(cwd, args, input) {
  return execFileSync("git", args, {
    cwd, encoding: "utf8", input, timeout: 10_000, maxBuffer: max_buffer,
    stdio: ["ignore", "pipe", "pipe"],
  });
}
function resolve_ref(cwd, ref) {
  if (!isText(ref) || ref.includes("\0") || ref.includes("\r") || ref.includes("\n")) throw new Error("invalid git ref");
  const sha = git(cwd, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
  if (!/^[a-f0-9]{40,64}$/.test(sha)) throw new Error(`could not resolve git ref: ${ref}`);
  return sha;
}
function diff_args(options, repo_root) {
  const head = resolve_ref(repo_root, "HEAD");
  const resolved = { head };
  if (options.kind === "request") {
    const base = options.baseline_sha ? resolve_ref(repo_root, options.baseline_sha) : head;
    resolved.base = base;
    return { args: [base], resolved };
  }
  if (options.kind === "uncommitted") return { args: [head], resolved };
  if (options.kind === "base") {
    const requested = resolve_ref(repo_root, options.base_ref);
    const base = git(repo_root, ["merge-base", requested, head]).trim();
    if (!base) throw new Error(`could not resolve merge base: ${options.base_ref}`);
    resolved.base = base;
    return { args: [base, head], resolved };
  }
  const commit = resolve_ref(repo_root, options.commit_ref);
  const parents = git(repo_root, ["rev-list", "--parents", "-n", "1", commit]).trim().split(/\s+/);
  const parent = parents[1] || null;
  resolved.base = parent;
  resolved.head = commit;
  const base = parent || git(repo_root, ["hash-object", "-t", "tree", "--stdin"], "").trim();
  return { args: [base, commit], resolved };
}
function path_args(folder) {
  if (!folder) return [];
  if (folder.includes("\u0000")) throw new Error("invalid folder filter");
  return ["--", folder.replace(/^\.\//, "")];
}
function change_type(status) {
  return {
    a: "added", c: "copied", d: "deleted", m: "modified", r: "renamed",
    t: "type_changed", u: "unmerged",
  }[status[0].toLowerCase()] || "unknown";
}
function parse_name_status(raw, staged, out) {
  const fields = raw.split("\0");
  for (let i = 0; i < fields.length - 1;) {
    const status = fields[i++];
    if (!status) continue;
    const renamed = status[0] === "R" || status[0] === "C";
    const old_path = renamed ? fields[i++] : null;
    const path = fields[i++];
    if (!path) continue;
    const current = out.get(path) || {
      path, type: change_type(status), staged: false, unstaged: false,
      old_path: null, old_mode: null, new_mode: null, binary: false, submodule: false,
    };
    current.type = change_type(status);
    if (staged === true) current.staged = true;
    if (staged === false) current.unstaged = true;
    if (old_path) current.old_path = old_path;
    out.set(path, current);
  }
}
function parse_raw(raw, out) {
  const fields = raw.split("\0");
  for (let i = 0; i < fields.length - 1;) {
    const header = fields[i++];
    if (!header || !header.startsWith(":")) continue;
    const match = header.match(/^:(\d{6}) (\d{6}) [a-f0-9]+ [a-f0-9]+ ([a-z]\d*)$/i);
    if (!match) continue;
    const old_path = /^[rc]/i.test(match[3]) ? fields[i++] : null;
    const path = fields[i++];
    const current = out.get(path);
    if (!current) continue;
    current.old_mode = match[1];
    current.new_mode = match[2];
    current.submodule = match[1] === "160000" || match[2] === "160000";
    if (old_path) current.old_path = old_path;
  }
}
function parse_numstat(raw, out) {
  const fields = raw.split("\0");
  for (let i = 0; i < fields.length - 1; i++) {
    const match = fields[i].match(/^([^\t]+)\t([^\t]+)\t(.*)$/s);
    if (!match) continue;
    let path = match[3];
    if (!path) { i += 2; path = fields[i]; }
    const current = out.get(path);
    if (current) current.binary = match[1] === "-" || match[2] === "-";
  }
}
function collect_diff(repo_root, args, folder, records, added) {
  const common = ["diff", "--no-ext-diff", "--no-textconv", "--find-renames"];
  const paths = path_args(folder);
  parse_name_status(git(repo_root, [...common, "--name-status", "-z", ...args, ...paths]), null, records);
  parse_raw(git(repo_root, [...common, "--raw", "-z", ...args, ...paths]), records);
  parse_numstat(git(repo_root, [...common, "--numstat", "-z", ...args, ...paths]), records);
  parseDiffAdditions(git(repo_root, [...common, "-U0", "--diff-filter=ACMR", ...args, ...paths]), added);
}
function mark_worktree_flags(repo_root, folder, records) {
  const paths = path_args(folder);
  for (const [args, field] of [
    [["diff", "--name-status", "-z", ...paths], "unstaged"],
    [["diff", "--cached", "--name-status", "-z", ...paths], "staged"],
  ]) {
    const parsed = new Map();
    parse_name_status(git(repo_root, args), field === "staged", parsed);
    for (const [path, value] of parsed) {
      const current = records.get(path);
      if (!current) continue;
      current[field] = true;
      if (value.old_path) current.old_path = value.old_path;
    }
  }
}
function hash_file(absolute) {
  const hash = createHash("sha256");
  const buffer = Buffer.allocUnsafe(64 * 1024);
  const fd = openSync(absolute, "r");
  let binary = false;
  try {
    for (let size; (size = readSync(fd, buffer, 0, buffer.length, null)) > 0;) {
      const chunk = buffer.subarray(0, size);
      binary ||= chunk.includes(0);
      hash.update(chunk);
    }
  } finally { closeSync(fd); }
  return { hash: hash.digest("hex"), binary };
}
function snapshot(repo_root, path, untracked = false) {
  const absolute = resolvePath(repo_root, path);
  try {
    const stat = lstatSync(absolute);
    // git lists an untracked nested repository as a directory; keep it opaque, as git does.
    if (stat.isDirectory()) return { exists: true, hash: "directory", content: null, binary: true, untracked };
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(absolute);
      return { exists: true, hash: createHash("sha256").update(target).digest("hex"), content: null, binary: true, untracked };
    }
    if (stat.size > 2 * 1024 * 1024) {
      const large = hash_file(absolute);
      return { exists: true, hash: large.hash, content: null, binary: large.binary, untracked };
    }
    const buffer = readFileSync(absolute);
    const binary = buffer.includes(0);
    return { exists: true, hash: createHash("sha256").update(buffer).digest("hex"), content: binary ? null : buffer.toString("utf8"), binary, untracked };
  } catch (error) {
    if (String(error?.code ?? "").toLowerCase() === "enoent")
      return { exists: false, hash: null, content: null, binary: false, untracked };
    throw error;
  }
}
function collect_untracked(repo_root, folder, records, added) {
  const raw = git(repo_root, ["ls-files", "--others", "--exclude-standard", "-z", ...path_args(folder)]);
  for (const path of raw.split("\0").filter(Boolean)) {
    const current = snapshot(repo_root, path, true);
    records.set(path, { path, type: "untracked", staged: false, unstaged: true, old_path: null, old_mode: null, new_mode: null, binary: current.binary, submodule: false });
    if (current.content !== null) {
      for (const [key, lines] of contentToAdded(path, current.content)) added.set(key, lines);
    } else if (!current.binary) throw new Error(`untracked text file is too large to adjudicate: ${path}`);
  }
}
function freeze(value) {
  if (value === null || (!isRecord(value) && !Array.isArray(value)) || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) freeze(item);
  return value;
}
function matches_folder(path, folder) {
  if (!folder) return true;
  const normalized = folder.replace(/^\.\//, "").replace(/\/+$/, "");
  return path === normalized || path.startsWith(`${normalized}/`);
}

export function reporoot(cwd = ".") {
  try { return git(cwd, ["rev-parse", "--show-toplevel"]).trim() || null; }
  catch { return null; }
}

// only a missing repository or commit means no git; any later failure keeps git mode and reports `error`.
export function capturebaseline(cwd = ".") {
  const none = { sha: null, dirty: new Set(), snapshots: {}, repo_root: null, error: null };
  const repo_root = reporoot(cwd);
  if (!repo_root) return none;
  let sha;
  try { sha = resolve_ref(repo_root, "HEAD"); } catch { return none; }
  try {
    const fields = git(repo_root, ["status", "--porcelain=v1", "-z", "--untracked-files=all"]).split("\0");
    const dirty = new Set();
    const snapshots = {};
    for (let i = 0; i < fields.length - 1; i++) {
      const field = fields[i];
      if (field.length < 4) continue;
      if (dirty.size >= max_baseline_paths)
        throw new Error(`more than ${max_baseline_paths} dirty paths; gitignore generated or scratch trees`);
      const status = field.slice(0, 2);
      const path = field.slice(3);
      dirty.add(path);
      snapshots[path] = snapshot(repo_root, path, status === "??");
      if (/[rc]/i.test(status) && fields[i + 1]) {
        const old_path = fields[++i];
        dirty.add(old_path);
        snapshots[old_path] = snapshot(repo_root, old_path, false);
      }
    }
    return { sha, dirty, snapshots, repo_root, error: null };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return { sha, dirty: new Set(), snapshots: {}, repo_root, error: `request baseline unavailable: ${detail}` };
  }
}

/**
 * @typedef {{ path: string, type: string, staged: boolean, unstaged: boolean, old_path: string | null,
 *   old_mode: string | null, new_mode: string | null, binary: boolean, submodule: boolean }} ScopeFile
 * @typedef {{ version: number, kind: string, repo_root: string, resolved: object, folder: string | null,
 *   files: ScopeFile[], added: Record<string, Array<{ line: number, text: string }>>, digest: string }} Scope
 */
/** @returns {Scope} */
export function resolvescope(options) {
  if (!isRecord(options) || !scope_kinds.has(options.kind)) throw new Error("unknown gate scope");
  const cwd = options.cwd || ".";
  const repo_root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const { args, resolved } = diff_args(options, repo_root);
  const records = new Map();
  const added = new Map();
  collect_diff(repo_root, args, options.folder, records, added);
  if (options.kind === "request" || options.kind === "uncommitted") {
    mark_worktree_flags(repo_root, options.folder, records);
    collect_untracked(repo_root, options.folder, records, added);
  }
  const excluded = options.baseline_dirty || new Set();
  const snapshots = options.baseline_snapshots || {};
  for (const path of excluded) {
    const observed = records.get(path);
    records.delete(path);
    added.delete(path);
    const before = snapshots[path];
    if (!before || !matches_folder(path, options.folder)) continue;
    const after = snapshot(repo_root, path, before.untracked);
    if (before.exists === after.exists && before.hash === after.hash) continue;
    if ((before.exists && before.content === null && !before.binary) || (after.exists && after.content === null && !after.binary))
      throw new Error(`baseline-dirty text file is too large to adjudicate: ${path}`);
    records.set(path, {
      path,
      type: !after.exists ? "deleted" : !before.exists ? "added" : before.untracked ? "untracked" : "modified",
      staged: observed?.staged ?? false, unstaged: observed?.unstaged ?? true,
      old_path: observed?.old_path ?? null, old_mode: observed?.old_mode ?? null,
      new_mode: observed?.new_mode ?? null, binary: after.binary, submodule: observed?.submodule ?? false,
    });
    if (!after.exists || after.content === null) continue;
    const additions = before.exists && before.content !== null
      ? diffByLineSet(path, before.content, after.content) : contentToAdded(path, after.content);
    for (const [key, lines] of additions) added.set(key, lines);
  }
  const files = [...records.values()].sort((left, right) => left.path.localeCompare(right.path));
  const additions = Object.fromEntries([...added.entries()]
    .filter(([path]) => records.has(path)).sort(([left], [right]) => left.localeCompare(right)));
  const identity = { version: 1, kind: options.kind, repo_root, resolved, folder: options.folder || null, files, added: additions };
  const digest = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
  return freeze({ ...identity, digest });
}
