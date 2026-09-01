import { afterEach as aftereach, expect, test } from "bun:test";
import { execFileSync as execfilesync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  acquirelease,
  acquireleaseasync,
  heartbeatlease,
  identity,
  inspectlease,
  releaselease,
  releasestalelease,
  validatelease,
} from "./lease.js";

const repos: string[] = [];

aftereach(() => {
  for (const repo of repos.splice(0)) rmSync(repo, { recursive: true, force: true });
});

function repo() {
  const cwd = mkdtempSync(join(tmpdir(), "gate-lease-"));
  repos.push(cwd);
  execfilesync("git", ["init", "-q", "-b", "main"], { cwd });
  return cwd;
}

function options(cwd: string, overrides: Record<string, unknown> = {}) {
  return {
    cwd,
    owner_id: "owner-1",
    request_id: "request-1",
    session_id: "session-1",
    session_file: "session-1.jsonl",
    agent_id: null,
    tool_call_id: "call-1",
    tool_name: "edit",
    target: "docs/file.md",
    pid: process.pid,
    acquisition_wait_ms: 0,
    poll_jitter_ms: 0,
    now: 0,
    ...overrides,
  };
}

function leasepath(cwd: string) {
  const scope = identity(cwd);
  const path = join(scope.common_dir, "omp-gates", "leases", scope.key);
  mkdirSync(path, { recursive: true });
  return join(path, "lease.json");
}

function claimspath(leasepath: string) {
  return join(leasepath, "lease.json.claims");
}

function candidatepath(leasepath: string, name: string) {
  return join(claimspath(leasepath), name);
}

function writecandidate(
  leasepath: string,
  name: string,
  candidate: { token: string; pid: number; claimed_at: number },
) {
  mkdirSync(claimspath(leasepath), { recursive: true });
  writeFileSync(candidatepath(leasepath, name), `${JSON.stringify(candidate)}\n`, "utf8");
}

test("identity uses one canonical repository and common-directory key", () => {
  const cwd = repo();
  const first = identity(cwd);
  const second = identity(join(cwd, "."));

  expect(second).toEqual(first);
  expect(first.repo_root).toBe(cwd);
  expect(first.common_dir).toBe(join(cwd, ".git"));
  expect(first.key).toMatch(/^[0-9a-f]{24}$/);
});

test("acquisition writes and validates an operation schema-2 record", () => {
  const cwd = repo();
  const lease = acquirelease(options(cwd));
  const record = JSON.parse(readFileSync(join(lease.path, "lease.json"), "utf8"));

  expect(lease).toMatchObject({
    schema: 2,
    acquired: true,
    scope: "worktree",
    owner_id: "owner-1",
    request_id: "request-1",
    session_id: "session-1",
    session_file: "session-1.jsonl",
    agent_id: null,
    tool_call_id: "call-1",
    tool_name: "edit",
    target: "docs/file.md",
    pid: process.pid,
    acquired_at: 0,
    heartbeat_at: 0,
  });
  expect(Object.keys(record).sort()).toEqual([
    "acquired",
    "acquired_at",
    "agent_id",
    "common_dir",
    "fence",
    "heartbeat_at",
    "owner_id",
    "path",
    "pid",
    "repo_root",
    "request_id",
    "schema",
    "scope",
    "session_file",
    "session_id",
    "target",
    "token",
    "tool_call_id",
    "tool_name",
  ]);
  expect(validatelease(record)).toMatchObject({ ok: true, kind: "v2" });
  expect(inspectlease(options(cwd))).toMatchObject({
    status: "held",
    valid: true,
    fence: lease.fence,
    heartbeat_age_ms: 0,
  });
  expect(releaselease(lease)).toBe(true);
});

test("fenced release refuses wrong identity and stale owners cannot delete successors", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  expect(releaselease({ ...first, tool_call_id: "wrong-call" })).toBe(false);
  expect(releasestalelease({ ...first, tool_call_id: "wrong-call" }, options(cwd))).toBe(false);

  rmSync(first.path, { recursive: true, force: true });
  const successor = acquirelease(
    options(cwd, { owner_id: "owner-2", request_id: "request-2", tool_call_id: "call-2", now: 1 }),
  );
  expect(successor.fence).toBeGreaterThan(first.fence);
  expect(releaselease(first)).toBe(false);
  expect(inspectlease(options(cwd, { now: 1 })).record.token).toBe(successor.token);
  expect(releaselease(successor)).toBe(true);
});

test("release and heartbeat reject isolated owner, tool, and fence mismatches", () => {
  const cwd = repo();
  const lease = acquirelease(options(cwd));
  const path = join(lease.path, "lease.json");
  const source = readFileSync(path, "utf8");

  for (const mismatch of [
    { owner_id: "wrong-owner" },
    { tool_call_id: "wrong-call" },
    { fence: lease.fence + 1 },
  ]) {
    expect(releaselease({ ...lease, ...mismatch })).toBe(false);
    expect(heartbeatlease({ ...lease, ...mismatch }, { now: 1 })).toBe(false);
    expect(readFileSync(path, "utf8")).toBe(source);
    expect(readdirSync(claimspath(lease.path))).toEqual([]);
  }

  expect(releaselease(lease)).toBe(true);
});

test("a rejected candidate leaves the canonical record and no candidate", () => {
  const cwd = repo();
  const lease = acquirelease(options(cwd));
  const path = join(lease.path, "lease.json");
  const source = readFileSync(path, "utf8");

  expect(heartbeatlease({ ...lease, token: "wrong-token" }, { now: 1 })).toBe(false);
  expect(readFileSync(path, "utf8")).toBe(source);
  expect(readdirSync(claimspath(lease.path))).toEqual([]);
  expect(heartbeatlease(lease, { now: 1 })).toBe(true);
  expect(releaselease(lease)).toBe(true);
});

test("candidate election scans unique files in deterministic order", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  const path = join(first.path, "lease.json");
  const source = readFileSync(path, "utf8");
  writecandidate(first.path, "a", { token: "a", pid: 2_000_000_000, claimed_at: 30_000 });
  writecandidate(first.path, "b", { token: "b", pid: 2_000_000_000, claimed_at: 0 });

  const conflict = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 30_000,
      stale_heartbeat_ms: 30_000,
      dead_pid_grace_ms: 2_000,
    }),
  );
  expect(conflict).toMatchObject({ acquired: false, timed_out: true });
  expect(readFileSync(path, "utf8")).toBe(source);
  expect(existsSync(candidatepath(first.path, "a"))).toBe(true);
  expect(existsSync(candidatepath(first.path, "b"))).toBe(true);
  rmSync(candidatepath(first.path, "a"), { force: true });
  rmSync(candidatepath(first.path, "b"), { force: true });
  expect(releaselease(first)).toBe(true);
});

test("a completed contender is absent without candidate restoration", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  const completed_path = candidatepath(first.path, "completed");
  writecandidate(first.path, "completed", {
    token: "completed",
    pid: 2_000_000_000,
    claimed_at: 0,
  });
  let completed = false;
  const timing = options(cwd, { now: 30_000, stale_heartbeat_ms: 30_000 });
  Object.defineProperty(timing, "dead_pid_grace_ms", {
    get() {
      const names = existsSync(claimspath(first.path)) ? readdirSync(claimspath(first.path)) : [];
      if (!completed && names.includes("completed") && names.length > 1) {
        completed = true;
        rmSync(completed_path, { force: true });
      }
      return 2_000;
    },
  });

  expect(releasestalelease(first, timing)).toBe(true);
  expect(completed).toBe(true);
  expect(existsSync(completed_path)).toBe(false);
  const successor = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 30_000,
    }),
  );
  expect(successor.acquired).toBe(true);
  expect(releaselease(successor)).toBe(true);
});

test("a dead candidate is cleaned after grace and recovery succeeds", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  const dead_path = candidatepath(first.path, "dead");
  writecandidate(first.path, "dead", {
    token: "dead",
    pid: 2_000_000_000,
    claimed_at: 0,
  });

  const recovered = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 30_000,
      stale_heartbeat_ms: 30_000,
      dead_pid_grace_ms: 2_000,
    }),
  );
  expect(recovered).toMatchObject({ acquired: true, recovered: true });
  expect(existsSync(dead_path)).toBe(false);
  expect(releaselease(recovered)).toBe(true);
});

test("a live candidate remains protected while the holder is stale", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  const path = join(first.path, "lease.json");
  const source = readFileSync(path, "utf8");
  const live_path = candidatepath(first.path, "live");
  const live = { token: "live", pid: process.pid, claimed_at: 0 };
  writecandidate(first.path, "live", live);

  const conflict = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 30_000,
      stale_heartbeat_ms: 30_000,
      dead_pid_grace_ms: 2_000,
    }),
  );
  expect(conflict).toMatchObject({
    acquired: false,
    status: "held",
    stale: true,
    timed_out: true,
  });
  expect(readFileSync(path, "utf8")).toBe(source);
  expect(readFileSync(live_path, "utf8")).toBe(`${JSON.stringify(live)}\n`);
  rmSync(live_path, { force: true });
  expect(releaselease(first)).toBe(true);
});
test("a stale release cannot delete a successor during two releasers", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  let interleaved = false;
  let secondreleased: boolean | null = null;
  let contenderacquired: boolean | null = null;
  const stale = { ...first };
  Object.defineProperty(stale, "token", {
    get() {
      if (!interleaved) {
        interleaved = true;
        secondreleased = releaselease(first, options(cwd, { now: 30_000 }));
        contenderacquired = acquirelease(
          options(cwd, {
            owner_id: "owner-2",
            request_id: "request-2",
            tool_call_id: "call-2",
            now: 30_000,
          }),
        ).acquired;
      }
      return first.token;
    },
  });

  expect(releaselease(stale, options(cwd, { now: 30_000 }))).toBe(true);
  expect(interleaved).toBe(true);
  expect(secondreleased).toBe(false);
  expect(contenderacquired).toBe(false);

  const successor = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 30_000,
    }),
  );
  expect(successor.acquired).toBe(true);
  expect(inspectlease(options(cwd, { now: 1 })).record.token).toBe(successor.token);
  expect(releaselease(successor)).toBe(true);
});

test("a stale heartbeat cannot overwrite a successor during interleaving", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  let interleaved = false;
  let secondreleased: boolean | null = null;
  let contenderacquired: boolean | null = null;
  const stale = { ...first };
  Object.defineProperty(stale, "token", {
    get() {
      if (!interleaved) {
        interleaved = true;
        secondreleased = releaselease(first, options(cwd, { now: 30_000 }));
        contenderacquired = acquirelease(
          options(cwd, {
            owner_id: "owner-2",
            request_id: "request-2",
            tool_call_id: "call-2",
            now: 30_000,
          }),
        ).acquired;
      }
      return first.token;
    },
  });

  expect(heartbeatlease(stale, options(cwd, { now: 30_000 }))).toBe(true);
  expect(interleaved).toBe(true);
  expect(secondreleased).toBe(false);
  expect(contenderacquired).toBe(false);
  expect(inspectlease(options(cwd, { now: 1 })).record).toMatchObject({
    token: first.token,
    heartbeat_at: 30_000,
  });

  expect(releaselease(first)).toBe(true);
  const successor = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 2,
    }),
  );
  expect(successor.acquired).toBe(true);
  expect(inspectlease(options(cwd, { now: 2 })).record.token).toBe(successor.token);
  expect(releaselease(successor)).toBe(true);
});

test("a stale predecessor heartbeat cannot overwrite a successor after replacement", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd));
  let interleaved = false;
  let successor = first;
  const stale = { ...first };
  Object.defineProperty(stale, "path", {
    get() {
      if (!interleaved) {
        interleaved = true;
        expect(releaselease(first)).toBe(true);
        successor = acquirelease(
          options(cwd, {
            owner_id: "owner-2",
            request_id: "request-2",
            tool_call_id: "call-2",
            now: 1,
          }),
        );
      }
      return first.path;
    },
  });

  expect(heartbeatlease(stale, { now: 2 })).toBe(false);
  expect(successor.acquired).toBe(true);
  expect(inspectlease(options(cwd, { now: 2 })).record).toMatchObject({
    token: successor.token,
    heartbeat_at: 1,
  });
  expect(releaselease(successor)).toBe(true);
});

test("heartbeat renewal stays fresh beyond the old fixed age windows", () => {
  const cwd = repo();
  const lease = acquirelease(options(cwd));
  const thirteen_hours = 13 * 60 * 60 * 1_000;
  expect(heartbeatlease(lease, { now: thirteen_hours })).toBe(true);
  expect(heartbeatlease(lease, { now: thirteen_hours + thirteen_hours })).toBe(true);

  const status = inspectlease(options(cwd, { now: 2 * thirteen_hours, stale_heartbeat_ms: 30_000 }));
  expect(status.stale).toBe(false);
  expect(status.heartbeat_age_ms).toBe(0);
  const conflict = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 2 * thirteen_hours,
      stale_heartbeat_ms: 30_000,
    }),
  );
  expect(conflict.acquired).toBe(false);
  expect(conflict.timed_out).toBe(true);
  expect(releaselease(lease)).toBe(true);
});

test("stale heartbeat is reclaimable while the shared pid is live", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd, { pid: process.pid }));
  const recovered = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 30_001,
      stale_heartbeat_ms: 30_000,
    }),
  );

  expect(recovered.acquired).toBe(true);
  expect(recovered.recovered).toBe(true);
  expect(recovered.fence).toBeGreaterThan(first.fence);
  expect(releaselease(first)).toBe(false);
  expect(releaselease(recovered)).toBe(true);
});

test("fresh heartbeat refuses reclaim even when acquisition is bounded to zero", () => {
  const cwd = repo();
  const first = acquirelease(options(cwd, { pid: process.pid }));
  const conflict = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 29_999,
      stale_heartbeat_ms: 30_000,
    }),
  );

  expect(conflict.acquired).toBe(false);
  expect(conflict.conflict.token).toBe(first.token);
  expect(conflict.stale).toBe(false);
  expect(releaselease(first)).toBe(true);
});

test("legacy and malformed records refuse without deletion", () => {
  const cwd = repo();
  const path = leasepath(cwd);
  writeFileSync(path, JSON.stringify({ acquired: true, owner_id: "legacy-owner" }), "utf8");
  const legacy = acquirelease(options(cwd));
  expect(legacy.acquired).toBe(false);
  expect(legacy.status).toBe("legacy");
  expect(legacy.diagnostic).toContain("nikos-gates lease status");
  expect(readFileSync(path, "utf8")).toContain("legacy-owner");

  rmSync(join(path, ".."), { recursive: true, force: true });
  const malformed_path = leasepath(cwd);
  writeFileSync(malformed_path, "{not-json", "utf8");
  const malformed = acquirelease(options(cwd));
  expect(malformed.acquired).toBe(false);
  expect(malformed.status).toBe("malformed");
  expect(malformed.diagnostic).toContain("nikos-gates lease status");
  expect(readFileSync(malformed_path, "utf8")).toBe("{not-json");
});

test("an empty legacy lease directory is atomically replaced and cleaned up", () => {
  const cwd = repo();
  const data_path = leasepath(cwd);
  const acquired = acquirelease(options(cwd));
  expect(acquired).toMatchObject({ acquired: true, recovered: false, schema: 2 });
  expect(JSON.parse(readFileSync(data_path, "utf8"))).toMatchObject({
    acquired: true,
    schema: 2,
  });
  expect(releaselease(acquired)).toBe(true);
  expect(existsSync(acquired.path)).toBe(false);
});

test("a live initializer is never reclaimed while paused", () => {
  const cwd = repo();
  leasepath(cwd);
  const status = inspectlease(options(cwd));
  const init_path = status.initialization_path;
  const initializer = { pid: process.pid, claimed_at: 0, token: "live-initializer" };
  writeFileSync(init_path, `${JSON.stringify(initializer)}\n`, "utf8");

  const conflict = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 2_000,
      dead_pid_grace_ms: 2_000,
    }),
  );
  expect(conflict).toMatchObject({
    acquired: false,
    status: "initializing",
    stale: false,
    pid_alive: true,
    timed_out: true,
  });
  expect(readFileSync(init_path, "utf8")).toBe(`${JSON.stringify(initializer)}\n`);
});

test("a dead initializer is reclaimed after its grace period", () => {
  const cwd = repo();
  leasepath(cwd);
  const status = inspectlease(options(cwd));
  const initializer = { pid: 2_000_000_000, claimed_at: 0, token: "dead-initializer" };
  writeFileSync(status.initialization_path, `${JSON.stringify(initializer)}\n`, "utf8");

  const recovered = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      now: 2_000,
      dead_pid_grace_ms: 2_000,
    }),
  );
  expect(recovered).toMatchObject({ acquired: true, recovered: true });
  expect(existsSync(status.initialization_path)).toBe(false);
  expect(releaselease(recovered)).toBe(true);
});

test("malformed initializers without a complete identity are never reclaimed", () => {
  for (const initializer of [
    { pid: 2_000_000_000, claimed_at: 0, token: "" },
    { pid: 2_000_000_000, claimed_at: 0 },
  ]) {
    const cwd = repo();
    leasepath(cwd);
    const status = inspectlease(options(cwd));
    writeFileSync(status.initialization_path, `${JSON.stringify(initializer)}\n`, "utf8");

    const conflict = acquirelease(
      options(cwd, {
        owner_id: "owner-2",
        request_id: "request-2",
        tool_call_id: "call-2",
        now: 2_000,
        dead_pid_grace_ms: 2_000,
      }),
    );
    expect(conflict).toMatchObject({
      acquired: false,
      status: "initializing",
      valid: false,
      stale: false,
      pid_alive: false,
      timed_out: true,
    });
    expect(readFileSync(status.initialization_path, "utf8")).toBe(
      `${JSON.stringify(initializer)}\n`,
    );
  }
});


test("bounded acquisition uses injected clock, sleep, and random timing", () => {
  const cwd = repo();
  let now = 0;
  const holder = acquirelease(options(cwd, { clock: () => now }));
  const sleeps: number[] = [];
  const conflict = acquirelease(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      clock: () => now,
      sleep: (milliseconds: number) => {
        sleeps.push(milliseconds);
        now += milliseconds;
      },
      random: () => 0.5,
      poll_interval_ms: 25,
      poll_jitter_ms: 0,
      acquisition_wait_ms: 75,
    }),
  );

  expect(conflict.acquired).toBe(false);
  expect(conflict.timed_out).toBe(true);
  expect(conflict.waited_ms).toBe(75);
  expect(sleeps).toEqual([25, 25, 25]);
  expect(releaselease(holder)).toBe(true);
});

test("async bounded acquisition yields while waiting", async () => {
  const cwd = repo();
  let now = 0;
  const holder = acquirelease(options(cwd, { clock: () => now }));
  let sleeping = false;
  let resume: (() => void) | null = null;
  const contenderPromise = acquireleaseasync(
    options(cwd, {
      owner_id: "owner-2",
      request_id: "request-2",
      tool_call_id: "call-2",
      clock: () => now,
      sleep: async (milliseconds: number) => {
        sleeping = true;
        await new Promise<void>((resolve) => {
          resume = () => {
            now += milliseconds;
            resolve();
          };
        });
      },
      random: () => 0.5,
      poll_interval_ms: 25,
      poll_jitter_ms: 0,
      acquisition_wait_ms: 75,
    }),
  );

  expect(sleeping).toBe(true);
  expect(resume).not.toBeNull();
  expect(releaselease(holder)).toBe(true);
  resume!();

  const contender = await contenderPromise;
  expect(contender).toMatchObject({ acquired: true });
  expect(contender.timed_out).not.toBe(true);
  expect(now).toBe(25);
  expect(releaselease(contender)).toBe(true);
});

test("bounded acquisition uses the default five-second wait", () => {
  const cwd = repo();
  let now = 0;
  const holder = acquirelease(options(cwd, { clock: () => now }));
  const { acquisition_wait_ms: _acquisition_wait_ms, ...contender } = options(cwd, {
    owner_id: "owner-2",
    request_id: "request-2",
    tool_call_id: "call-2",
    clock: () => now,
    sleep: (milliseconds: number) => {
      now += milliseconds;
    },
    random: () => 0.5,
    poll_interval_ms: 1_000,
  });
  const conflict = acquirelease(contender);

  expect(conflict.timed_out).toBe(true);
  expect(conflict.waited_ms).toBe(5_000);
  expect(releaselease(holder)).toBe(true);
});

test("non-eexist filesystem failures propagate as infrastructure errors", () => {
  const cwd = repo();
  const scope = identity(cwd);
  const gates = join(scope.common_dir, "omp-gates");
  const holder = join(gates, "leases", scope.key);
  mkdirSync(join(gates, "leases", `${scope.key}.fence`), { recursive: true });

  expect(() => acquirelease(options(cwd))).toThrow();
  expect(existsSync(holder)).toBe(false);
});
