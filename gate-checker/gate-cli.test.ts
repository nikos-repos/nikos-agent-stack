import { afterEach as aftereach, expect, test } from "bun:test";
import { execFileSync as execfilesync, spawnSync as spawnsync } from "node:child_process";
import {
  mkdirSync as mkdirsync,
  mkdtempSync as mkdtempsync,
  rmSync as rmsync,
  writeFileSync as writefilesync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const repos: string[] = [];

aftereach(() => {
  for (const repo of repos.splice(0)) rmsync(repo, { recursive: true, force: true });
});

function repo() {
  const cwd = mkdtempsync(join(tmpdir(), "gate-cli-audit-"));
  repos.push(cwd);
  const git = (...args: string[]) => execfilesync("git", args, { cwd, encoding: "utf8" });
  git("init", "-q", "-b", "main");
  git("config", "user.email", "test@example.invalid");
  git("config", "user.name", "test");
  mkdirsync(join(cwd, "src"));
  writefilesync(join(cwd, "src/a.txt"), "one\n");
  git("add", ".");
  git("commit", "-q", "-m", "initial");
  return cwd;
}

test("audit prints a deterministic uncommitted scope without exposing a model tool", () => {
  const cwd = repo();
  writefilesync(join(cwd, "src/a.txt"), "two\n");
  const result = spawnsync(
    "bun",
    ["run", join(import.meta.dir, "gate-cli.js"), "audit", "--kind", "uncommitted", "--cwd", cwd, "--json"],
    { encoding: "utf8" },
  );

  expect(result.status).toBe(0);
  const output = JSON.parse(result.stdout);
  expect(output.kind).toBe("uncommitted");
  expect(output.files.map((file) => file.path)).toEqual(["src/a.txt"]);
  expect(output.digest).toMatch(/^[a-f0-9]{64}$/);
});
