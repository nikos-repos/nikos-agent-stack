import { createHash, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    timeout: 5_000,
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function identity(cwd) {
  const repo_root = realpathSync(git(cwd, ["rev-parse", "--show-toplevel"]));
  const common_raw = git(cwd, ["rev-parse", "--git-common-dir"]);
  const common_dir = realpathSync(
    common_raw.startsWith("/") ? common_raw : resolve(cwd, common_raw),
  );
  const key = createHash("sha256")
    .update(`${common_dir}\n${repo_root}`)
    .digest("hex")
    .slice(0, 24);
  return { repo_root, common_dir, key };
}

function readjson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

function processalive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return String(error?.code ?? "").toLowerCase() === "eperm";
  }
}

function nextfence(parent, key, token) {
  const path = join(parent, `${key}.fence`);
  const previous = Number(readFileSync(path, { encoding: "utf8", flag: "a+" })) || 0;
  const fence = previous + 1;
  const temporary = `${path}.${token}.tmp`;
  writeFileSync(temporary, `${fence}\n`, "utf8");
  renameSync(temporary, path);
  return fence;
}

export function acquirelease(options) {
  const now = Number.isFinite(options.now) ? options.now : Date.now();
  const stale_ms = Number.isFinite(options.stale_ms)
    ? options.stale_ms
    : 30 * 60 * 1000;
  const pid = Number.isInteger(options.pid) ? options.pid : process.pid;
  const owner_id = String(options.owner_id ?? "");
  const request_id = String(options.request_id ?? "");
  if (!owner_id || !request_id) throw new Error("lease owner and request are required");

  const scope = identity(options.cwd || ".");
  const parent = join(scope.common_dir, "omp-gates", "leases");
  const path = join(parent, scope.key);
  const data_path = join(path, "lease.json");
  mkdirSync(parent, { recursive: true });

  let recovered = false;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      mkdirSync(path);
      const token = randomUUID();
      const fence = nextfence(parent, scope.key, token);
      const lease = {
        acquired: true,
        recovered,
        path,
        token,
        fence,
        owner_id,
        request_id,
        pid,
        started_at: now,
        repo_root: scope.repo_root,
        common_dir: scope.common_dir,
      };
      writeFileSync(data_path, JSON.stringify(lease, null, 2) + "\n", "utf8");
      return lease;
    } catch (error) {
      if (String(error?.code ?? "").toLowerCase() !== "eexist") throw error;
      const conflict = readjson(data_path);
      if (
        attempt === 0 &&
        conflict &&
        now - Number(conflict.started_at) > stale_ms &&
        !processalive(Number(conflict.pid))
      ) {
        rmSync(path, { recursive: true, force: true });
        recovered = true;
        continue;
      }
      return {
        acquired: false,
        recovered: false,
        path,
        token: null,
        fence: null,
        owner_id,
        request_id,
        repo_root: scope.repo_root,
        common_dir: scope.common_dir,
        conflict,
      };
    }
  }
  throw new Error("lease acquisition did not settle");
}

export function releaselease(lease) {
  if (!lease?.acquired || !lease.path || !lease.token) return false;
  const current = readjson(join(lease.path, "lease.json"));
  if (
    !current ||
    current.token !== lease.token ||
    current.fence !== lease.fence ||
    current.owner_id !== lease.owner_id
  ) return false;
  rmSync(lease.path, { recursive: true, force: true });
  return true;
}
