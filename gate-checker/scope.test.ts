import { afterEach as aftereach, describe, expect, test } from "bun:test";
import { execFileSync as execfilesync } from "node:child_process";
import {
  mkdirSync as mkdirsync,
  mkdtempSync as mkdtempsync,
  renameSync as renamesync,
  rmSync as rmsync,
  writeFileSync as writefilesync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capturebaseline, resolvescope } from "./scope.js";

const repos: string[] = [];

aftereach(() => {
  for (const repo of repos.splice(0)) rmsync(repo, { recursive: true, force: true });
});

function repo() {
  const cwd = mkdtempsync(join(tmpdir(), "gate-scope-"));
  repos.push(cwd);
  const git = (...args: string[]) =>
    execfilesync("git", args, { cwd, encoding: "utf8" }).trim();
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "test");
  mkdirsync(join(cwd, "src"));
  writefilesync(join(cwd, "src/a.txt"), "one\n");
  writefilesync(join(cwd, "src/old.txt"), "old\n");
  git("add", ".");
  git("commit", "-q", "-m", "initial");
  return { cwd, git };
}

describe("canonical gate scopes", () => {
  test("request scope excludes files dirty before its baseline", () => {
    const { cwd, git } = repo();
    writefilesync(join(cwd, "src/old.txt"), "dirty before\n");
    writefilesync(join(cwd, "src/preexisting.txt"), "untracked before\n");
    const baseline = capturebaseline(cwd);
    expect([...baseline.dirty].sort()).toEqual([
      "src/old.txt",
      "src/preexisting.txt",
    ]);

    writefilesync(join(cwd, "src/a.txt"), "two\n");
    writefilesync(join(cwd, "src/new.txt"), "new\n");

    const scope = resolvescope({
      kind: "request",
      cwd,
      baseline_sha: baseline.sha,
      baseline_dirty: baseline.dirty,
    });

    expect(scope.files.map((file) => file.path)).toEqual([
      "src/a.txt",
      "src/new.txt",
    ]);
    expect(scope.added["src/a.txt"]).toEqual([{ line: 1, text: "two" }]);
    expect(scope.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(Object.isFrozen(scope)).toBe(true);
  });

  test("uncommitted scope normalizes staged unstaged untracked and renamed files", () => {
    const { cwd, git } = repo();
    writefilesync(join(cwd, "src/a.txt"), "two\n");
    git("add", "src/a.txt");
    renamesync(join(cwd, "src/old.txt"), join(cwd, "src/moved.txt"));
    git("add", "-\u0041", "src/old.txt", "src/moved.txt");
    writefilesync(join(cwd, "src/new.txt"), "new\n");

    const scope = resolvescope({ kind: "uncommitted", cwd });
    const by_path = new Map(scope.files.map((file) => [file.path, file]));

    expect(by_path.get("src/a.txt")?.staged).toBe(true);
    expect(by_path.get("src/moved.txt")?.type).toBe("renamed");
    expect(by_path.get("src/moved.txt")?.old_path).toBe("src/old.txt");
    expect(by_path.get("src/new.txt")?.type).toBe("untracked");
  });

  test("base and commit scopes resolve immutable commit identifiers", () => {
    const { cwd, git } = repo();
    const base = git("rev-parse", "\u0048\u0045\u0041\u0044");
    writefilesync(join(cwd, "src/a.txt"), "two\n");
    git("add", ".");
    git("commit", "-q", "-m", "second");
    const head = git("rev-parse", "\u0048\u0045\u0041\u0044");

    const base_scope = resolvescope({ kind: "base", cwd, base_ref: base });
    const commit_scope = resolvescope({ kind: "commit", cwd, commit_ref: head });

    expect(base_scope.resolved.base).toBe(base);
    expect(base_scope.resolved.head).toBe(head);
    expect(commit_scope.resolved.head).toBe(head);
    expect(commit_scope.files.map((file) => file.path)).toEqual(["src/a.txt"]);
  });
});
