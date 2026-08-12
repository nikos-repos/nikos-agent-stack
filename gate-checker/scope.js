import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve as resolvePath } from "node:path";
import { contentToAdded, parseDiffAdditions } from "./predicates.js";

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

function git_or_empty(cwd, args) {
  try {
    return git(cwd, args);
  } catch {
    return "";
  }
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
    if (base !== head) specs.push({ args: [base, head], staged: false });
    specs.push({ args: [], staged: false }, { args: ["--cached"], staged: true });
  } else if (options.kind === "uncommitted") {
    specs.push({ args: [], staged: false }, { args: ["--cached"], staged: true });
  } else if (options.kind === "base") {
    const requested = resolve_ref(repo_root, options.base_ref);
    const base = git(repo_root, ["merge-base", requested, head]).trim();
    if (!base) throw new Error(`could not resolve merge base: ${options.base_ref}`);
    resolved.base = base;
    specs.push({ args: [base, head], staged: false });
  } else {
    const commit = resolve_ref(repo_root, options.commit_ref);
    const parent = git_or_empty(repo_root, ["rev-parse", "--verify", `${commit}^`]).trim();
    resolved.base = parent || null;
    resolved.head = commit;
    const base = parent || git(repo_root, ["hash-object", "-t", "tree", "--stdin"], "").trim();
    specs.push({ args: [base, commit], staged: false });
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
    current.staged ||= staged;
    current.unstaged ||= !staged;
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
    git_or_empty(repo_root, [...common, "--name-status", "-z", ...spec.args, ...paths]),
    spec.staged,
    records,
  );
  parse_raw(
    git_or_empty(repo_root, [...common, "--raw", "-z", ...spec.args, ...paths]),
    records,
  );
  parse_numstat(
    git_or_empty(repo_root, [...common, "--numstat", "-z", ...spec.args, ...paths]),
    records,
  );
  parseDiffAdditions(
    git_or_empty(repo_root, [...common, "-\u00550", "--diff-filter=\u0041\u0043\u004d\u0052", ...spec.args, ...paths]),
    added,
  );
}

function collect_untracked(repo_root, folder, records, added) {
  const paths = path_args(folder);
  const raw = git_or_empty(repo_root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "-z",
    ...paths,
  ]);
  for (const path of raw.split("\0").filter(Boolean)) {
    records.set(path, {
      path,
      type: "untracked",
      staged: false,
      unstaged: true,
      old_path: null,
      old_mode: null,
      new_mode: null,
      binary: false,
      submodule: false,
    });
    try {
      const content = readFileSync(resolvePath(repo_root, path), "utf8");
      if (content.length <= 2 * 1024 * 1024) {
        for (const [key, lines] of contentToAdded(path, content)) added.set(key, lines);
      }
    } catch {
      records.get(path).binary = true;
    }
  }
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const item of Object.values(value)) freeze(item);
  return value;
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
    for (let i = 0; i < fields.length - 1; i++) {
      const field = fields[i];
      if (field.length < 4) continue;
      const status = field.slice(0, 2);
      dirty.add(field.slice(3));
      if (/[rc]/i.test(status) && fields[i + 1]) dirty.add(fields[++i]);
    }
    return { sha, dirty, repo_root };
  } catch {
    return { sha: null, dirty: new Set(), repo_root: null };
  }
}

export function resolvescope(options) {
  if (!options || !scope_kinds.has(options.kind)) throw new Error("unknown gate scope");
  const cwd = options.cwd || ".";
  const repo_root = git(cwd, ["rev-parse", "--show-toplevel"]).trim();
  const { specs, resolved } = diff_specs(options, repo_root);
  const records = new Map();
  const added = new Map();

  for (const spec of specs) collect_diff(repo_root, spec, options.folder, records, added);
  if (options.kind === "request" || options.kind === "uncommitted") {
    collect_untracked(repo_root, options.folder, records, added);
  }

  const excluded = options.baseline_dirty || new Set();
  for (const path of excluded) {
    records.delete(path);
    added.delete(path);
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
