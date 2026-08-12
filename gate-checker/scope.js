import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { closeSync, lstatSync, openSync, readFileSync, readlinkSync, readSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { contentToAdded, diffByLineSet, parseDiffAdditions } from "./predicates.js";

const max_buffer = 64 * 1024 * 1024;
const scope_kinds = new Set(["request", "uncommitted", "base", "commit"]);

function git(cwd, args, input = undefined) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    input,
    timeout: 10_000,
    maxBuffer: max_buffer,
    stdio: ["ignore", "pipe", "pipe"],
  });
}


function resolve_ref(cwd, ref) {
  if (!ref || /[\u0000\r\n]/.test(ref)) throw new Error("invalid git ref");
  const sha = git(cwd, ["rev-parse", "--verify", `${ref}^{commit}`]).trim();
  if (!/^[a-f0-9]{40,64}$/.test(sha)) throw new Error(`could not resolve git ref: ${ref}`);
  return sha;
}

function diff_specs(options, repo_root) {
  const head = resolve_ref(repo_root, "\u0048\u0045\u0041\u0044");
  const specs = [];
  const resolved = { head };

  if (options.kind === "request") {
    const base = options.baseline_sha
      ? resolve_ref(repo_root, options.baseline_sha)
      : head;
    resolved.base = base;
    specs.push({ args: [base], staged: null, worktree: true });
  } else if (options.kind === "uncommitted") {
    specs.push({ args: [head], staged: null, worktree: true });
  } else if (options.kind === "base") {
    const requested = resolve_ref(repo_root, options.base_ref);
    const base = git(repo_root, ["merge-base", requested, head]).trim();
    if (!base) throw new Error(`could not resolve merge base: ${options.base_ref}`);
    resolved.base = base;
    specs.push({ args: [base, head], staged: null, worktree: false });
  } else {
    const commit = resolve_ref(repo_root, options.commit_ref);
    const parents = git(repo_root, ["rev-list", "--parents", "-n", "1", commit])
      .trim()
      .split(/\s+/);
    const parent = parents[1] || null;
    resolved.base = parent;
    resolved.head = commit;
    const base = parent || git(repo_root, ["hash-object", "-t", "tree", "--stdin"], "").trim();
    specs.push({ args: [base, commit], staged: null, worktree: false });
  }

  return { specs, resolved };
}

function path_args(folder) {
  if (!folder) return [];
  if (folder.includes("\u0000")) throw new Error("invalid folder filter");
  return ["--", folder.replace(/^\.\//, "")];
}

function change_type(status) {
  const code = status[0];
  return {
    a: "added",
    c: "copied",
    d: "deleted",
    m: "modified",
    r: "renamed",
    t: "type_changed",
    u: "unmerged",
  }[code.toLowerCase()] || "unknown";
}

function parse_name_status(raw, staged, out) {
  const fields = raw.split("\0");
  for (let i = 0; i < fields.length - 1; ) {
    const status = fields[i++];
    if (!status) continue;
    const renamed = status[0] === "R" || status[0] === "C";
    const old_path = renamed ? fields[i++] : null;
    const path = fields[i++];
    if (!path) continue;
    const current = out.get(path) || {
      path,
      type: change_type(status),
      staged: false,
      unstaged: false,
      old_path: null,
      old_mode: null,
      new_mode: null,
      binary: false,
      submodule: false,
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
  for (let i = 0; i < fields.length - 1; ) {
    const header = fields[i++];
    if (!header?.startsWith(":")) continue;
    const match = header.match(/^:(\d{6}) (\d{6}) [a-f0-9]+ [a-f0-9]+ ([a-z]\d*)$/i);
    if (!match) continue;
    const renamed = /^[rc]/i.test(match[3]);
    const old_path = renamed ? fields[i++] : null;
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
    const field = fields[i];
    const match = field.match(/^([^\t]+)\t([^\t]+)\t(.*)$/s);
    if (!match) continue;
    let path = match[3];
    if (!path) {
      i += 2;
      path = fields[i];
    }
    const current = out.get(path);
    if (current) current.binary = match[1] === "-" || match[2] === "-";
  }
}

function collect_diff(repo_root, spec, folder, records, added) {
  const common = ["diff", "--no-ext-diff", "--no-textconv", "--find-renames"];
  const paths = path_args(folder);
  parse_name_status(
    git(repo_root, [...common, "--name-status", "-z", ...spec.args, ...paths]),
    spec.staged,
    records,
  );
  parse_raw(
    git(repo_root, [...common, "--raw", "-z", ...spec.args, ...paths]),
    records,
  );
  parse_numstat(
    git(repo_root, [...common, "--numstat", "-z", ...spec.args, ...paths]),
    records,
  );
  parseDiffAdditions(
    git(repo_root, [...common, "-\u00550", "--diff-filter=\u0041\u0043\u004d\u0052", ...spec.args, ...paths]),
    added,
  );
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
    for (let size; (size = readSync(fd, buffer, 0, buffer.length, null)) > 0; ) {
      const chunk = buffer.subarray(0, size);
      binary ||= chunk.includes(0);
      hash.update(chunk);
    }
  } finally {
    closeSync(fd);
  }
  return { hash: hash.digest("hex"), binary };
}

function snapshot(repo_root, path, untracked = false) {
  const absolute = resolvePath(repo_root, path);
  try {
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(absolute);
      return {
        exists: true,
        hash: createHash("sha256").update(target).digest("hex"),
        content: null,
        binary: true,
        untracked,
      };
    }
    if (stat.size > 2 * 1024 * 1024) {
      const large = hash_file(absolute);
      return {
        exists: true,
        hash: large.hash,
        content: null,
        binary: large.binary,
        untracked,
      };
    }
    const buffer = readFileSync(absolute);
    const binary = buffer.includes(0);
    return {
      exists: true,
      hash: createHash("sha256").update(buffer).digest("hex"),
      content: binary ? null : buffer.toString("utf8"),
      binary,
      untracked,
    };
  } catch (error) {
    if (String(error?.code ?? "").toLowerCase() === "enoent") {
      return { exists: false, hash: null, content: null, binary: false, untracked };
    }
    throw error;
  }
}

function collect_untracked(repo_root, folder, records, added) {
  const paths = path_args(folder);
  const raw = git(repo_root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    ...paths,
  ]);
  for (const path of raw.split("\0").filter(Boolean)) {
    const current = snapshot(repo_root, path, true);
    records.set(path, {
      path,
      type: "untracked",
      staged: false,
      unstaged: true,
      old_path: null,
      old_mode: null,
      new_mode: null,
      binary: current.binary,
      submodule: false,
    });
    if (current.content !== null) {
      for (const [key, lines] of contentToAdded(path, current.content)) {
        added.set(key, lines);
      }
    } else if (!current.binary) {
      throw new Error(`untracked text file is too large to adjudicate: ${path}`);
    }
  }
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) freeze(item);
  return value;
}

function matches_folder(path, folder) {
  if (!folder) return true;
  const normalized = folder.replace(/^\.\//, "").replace(/\/+$/, "");
  return path === normalized || path.startsWith(`${normalized}/`);
}

export function capturebaseline(cwd = ".") {
  try {
    const repo_root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
    const sha = resolve_ref(repo_root, "\u0048\u0045\u0041\u0044");
    const fields = git(repo_root, [
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
    ]).split("\0");
    const dirty = new Set();
    const snapshots = {};
    for (let i = 0; i < fields.length - 1; i++) {
      const field = fields[i];
      if (field.length < 4) continue;
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
    return { sha, dirty, snapshots, repo_root };
  } catch {
    return { sha: null, dirty: new Set(), snapshots: {}, repo_root: null };
  }
}

export function resolvescope(options) {
  if (!options || !scope_kinds.has(options.kind)) throw new Error("unknown gate scope");
  const cwd = options.cwd || ".";
  const repo_root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const { specs, resolved } = diff_specs(options, repo_root);
  const records = new Map();
  const added = new Map();

  for (const spec of specs) {
    collect_diff(repo_root, spec, options.folder, records, added);
    if (spec.worktree) mark_worktree_flags(repo_root, options.folder, records);
  }
  if (options.kind === "request" || options.kind === "uncommitted") {
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
    if (
      (before.exists && before.content === null && !before.binary) ||
      (after.exists && after.content === null && !after.binary)
    ) throw new Error(`baseline-dirty text file is too large to adjudicate: ${path}`);

    records.set(path, {
      path,
      type: !after.exists
        ? "deleted"
        : !before.exists
          ? "added"
          : before.untracked
            ? "untracked"
            : "modified",
      staged: observed?.staged ?? false,
      unstaged: observed?.unstaged ?? true,
      old_path: observed?.old_path ?? null,
      old_mode: observed?.old_mode ?? null,
      new_mode: observed?.new_mode ?? null,
      binary: after.binary,
      submodule: observed?.submodule ?? false,
    });
    if (!after.exists || after.content === null) continue;
    const additions = before.exists && before.content !== null
      ? diffByLineSet(path, before.content, after.content)
      : contentToAdded(path, after.content);
    for (const [key, lines] of additions) added.set(key, lines);
  }

  const files = [...records.values()].sort((a, b) => a.path.localeCompare(b.path));
  const additions = Object.fromEntries(
    [...added.entries()]
      .filter(([path]) => records.has(path))
      .sort(([a], [b]) => a.localeCompare(b)),
  );
  const identity = {
    version: 1,
    kind: options.kind,
    repo_root,
    resolved,
    folder: options.folder || null,
    files,
    added: additions,
  };
  const digest = createHash("sha256").update(JSON.stringify(identity)).digest("hex");
  return freeze({ ...identity, digest });
}
