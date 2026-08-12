import { afterEach as aftereach, expect, test } from "bun:test";
import { execFileSync as execfilesync } from "node:child_process";
import { mkdtempSync as mkdtempsync, rmSync as rmsync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { acquirelease, releaselease } from "./lease.js";

const repos: string[] = [];

aftereach(() => {
  for (const repo of repos.splice(0)) rmsync(repo, { recursive: true, force: true });
});

function repo() {
  const cwd = mkdtempsync(join(tmpdir(), "gate-lease-"));
  repos.push(cwd);
  execfilesync("git", ["init", "-q", "-b", "main"], { cwd });
  return cwd;
}

test("only one gate-aware request owns a worktree mutation lease", () => {
  const cwd = repo();
  const first = acquirelease({ cwd, owner_id: "owner-1", request_id: "request-1" });
  const second = acquirelease({ cwd, owner_id: "owner-2", request_id: "request-2" });

  expect(first.acquired).toBe(true);
  expect(second).toEqual(expect.objectContaining({
    acquired: false,
    conflict: expect.objectContaining({ owner_id: "owner-1" }),
  }));
  expect(releaselease({ ...first, token: "wrong" })).toBe(false);
  expect(releaselease(first)).toBe(true);

  const next = acquirelease({ cwd, owner_id: "owner-2", request_id: "request-2" });
  expect(next.acquired).toBe(true);
  expect(next.fence).toBeGreaterThan(first.fence);
  expect(releaselease(next)).toBe(true);
});

test("a dead stale owner can be recovered with a higher fence", () => {
  const cwd = repo();
  const first = acquirelease({
    cwd,
    owner_id: "dead-owner",
    request_id: "request-1",
    pid: 2_147_483_000,
    now: 1,
    stale_ms: 10,
  });
  const recovered = acquirelease({
    cwd,
    owner_id: "owner-2",
    request_id: "request-2",
    now: 20,
    stale_ms: 10,
  });

  expect(recovered.acquired).toBe(true);
  expect(recovered.recovered).toBe(true);
  expect(recovered.fence).toBeGreaterThan(first.fence);
  expect(releaselease(recovered)).toBe(true);
});
