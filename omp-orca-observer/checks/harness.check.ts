import assert from "node:assert";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, stat, writeFile, open } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { holdNextRead, reads, releaseHeldRead, waitForHeldRead } from "./harness/fs-probe.ts";
import { startGitSource } from "./harness/git-source.ts";
import { create } from "./harness/profile.ts";
import type { Capture, Scenario } from "./harness/stub-provider.ts";

const scenarioNames = ["one-child", "nested", "restricted", "detached", "eval-agent",
  "same-id-replacement", "long-labels", "explicit-long-ids", "duplicate-labels", "many-33",
  "many-135", "aborted", "parked", "tombstoned", "slow-appending", "follow-up",
  "new-session", "resume", "fork", "advisor-present", "worktree-shared", "worktree-isolated",
  "worktree-linked", "worktree-deleted", "detached-head", "cold-restart", "partial-restore"];

for (const name of scenarioNames) {
  const scenario = JSON.parse(await readFile(new URL(`./harness/scenarios/${name}.json`, import.meta.url), "utf8")) as Scenario;
  assert.equal(scenario.name, name);
  assert.ok(scenario.setup.length > 0);
  assert.ok(scenario.agents.length > 0);
  assert.ok(scenario.expected.length > 0);
  assert.ok(scenario.settings && typeof scenario.settings === "object");
  assert.ok((scenario.turns.main?.length ?? 0) > 0);
}

const root = await mkdtemp(join(tmpdir(), "omp-orca-harness-check-"));
try {
  const watch = join(root, "watch.txt");
  const capturePath = join(root, "stub.jsonl");
  const planted = "issued-code-secret-planted-only-in-user-prompt";
  const message = { role: "user", content: `HARNESS_AGENT=main ${planted}` };
  const body = {
    model: "scripted", stream: true, messages: [
      { role: "system", content: "Harness system instruction" }, message,
    ]
  };
  const scenario = fileURLToPath(new URL("./harness/scenarios/one-child.json", import.meta.url));
  await writeFile(watch, JSON.stringify([planted, "absent-code-secret"]));
  const stub = Bun.spawn([process.execPath,
  fileURLToPath(new URL("./harness/stub-provider.ts", import.meta.url)),
    "--scenario", scenario, "--capture", capturePath, "--watch", watch], {
    cwd: root, env: { PATH: process.env.PATH ?? "", HOME: root, TMPDIR: root },
    stdin: "ignore", stdout: "pipe", stderr: "pipe",
  });
  try {
    const output = stub.stdout.getReader();
    let startup = "";
    while (!startup.includes("\n")) {
      const chunk = await output.read();
      assert.equal(chunk.done, false, "Stub exited before announcing its port");
      startup += new TextDecoder().decode(chunk.value);
    }
    output.releaseLock();
    const url = startup.slice(0, startup.indexOf("\n")).trim();
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/v1$/);
    const firstResponse = await fetch(`${url}/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(firstResponse.status, 200);
    assert.match(firstResponse.headers.get("content-type") ?? "", /text\/event-stream/);
    const wire = await firstResponse.text();
    assert.match(wire, /data: \[DONE\]/);
    assert.match(wire, /"tool_calls"/);
    assert.match(wire, /solutionSpace/);
    const lines = (await readFile(capturePath, "utf8")).trimEnd().split("\n");
    assert.equal(lines.length, 1);
    const record = JSON.parse(lines[0]!) as Capture;
    assert.equal(record.method, "POST");
    assert.equal(record.path, "/v1/chat/completions");
    assert.equal(record.model, "scripted");
    assert.equal(record.messages.length, body.messages.length);
    for (const [index, sent] of body.messages.entries()) {
      const digest = createHash("sha256").update(JSON.stringify(sent)).digest("hex");
      assert.deepEqual(record.messages[index], {
        role: sent.role, byteLength: Buffer.byteLength(JSON.stringify(sent)), sha256: digest,
      });
    }
    assert.equal(record.secret_seen, true);
    assert.doesNotMatch(lines[0], /issued-code-secret|Harness system instruction|HARNESS_AGENT/);
    await writeFile(watch, JSON.stringify(["absent-code-secret"]));
    const secondResponse = await fetch(`${url}/chat/completions`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(secondResponse.status, 200);
    assert.match(await secondResponse.text(), /data: \[DONE\]/);
    const second = (await readFile(capturePath, "utf8")).trimEnd().split("\n").map(line => JSON.parse(line) as Capture);
    assert.equal(second.length, 2);
    assert.equal(second[1]?.secret_seen, false);
  } finally {
    stub.kill();
    await stub.exited;
  }

  const input = join(root, "probe-input.txt");
  await writeFile(input, "0123456789");
  const handle = await open(input);
  let held = false;
  try {
    holdNextRead(input);
    held = true;
    const buffer = Buffer.alloc(3);
    let finished = false;
    const pending = handle.read(buffer, 0, 3, 4).then(result => { finished = true; return result; });
    const observed = await waitForHeldRead();
    assert.deepEqual(observed, { path: input, offset: 4, length: 3 });
    assert.deepEqual(reads.at(-1), observed);
    await Bun.sleep(20);
    assert.equal(finished, false);
    releaseHeldRead();
    held = false;
    const result = await pending;
    assert.equal(result.bytesRead, 3);
    assert.equal(buffer.toString(), "456");
  } finally {
    if (held) releaseHeldRead();
    await handle.close();
  }

  const git = await startGitSource();
  try {
    assert.match(git.url, /^git:\/\/127\.0\.0\.1:\d+\/observer\.git$/);
    const clone = join(root, "cloned");
    const proc = Bun.spawn(["git", "clone", "-q", git.url, clone], {
      cwd: root, env: { PATH: process.env.PATH ?? "", HOME: root, GIT_CONFIG_NOSYSTEM: "1" },
      stdout: "pipe", stderr: "pipe",
    });
    const [stderr, exitCode] = await Promise.all([new Response(proc.stderr).text(), proc.exited]);
    assert.equal(exitCode, 0, stderr);
    assert.ok((await stat(join(clone, ".git"))).isDirectory());
  } finally {
    await git.stop();
  }

  const beforeKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "ambient-key-must-not-reach-profile";
  try {
    const profile = await create("one-child");
    const profileRoot = profile.root;
    try {
      const listing = await profile.run(["models", "ls", "--json"]);
      assert.equal(listing.exitCode, 0, listing.stderr);
      const models = JSON.parse(listing.stdout) as { models: { provider: string }[] };
      assert.ok(models.models.length > 0);
      assert.ok(models.models.every(model => model.provider === "stub"));
      const config = await profile.run(["config", "get", "providers.cacheWarming", "--json"]);
      assert.equal(config.exitCode, 0, config.stderr);
      const effective = JSON.parse(config.stdout) as { key: string; value: unknown };
      assert.equal(effective.key, "providers.cacheWarming");
      assert.equal(effective.value, "off");
    } finally {
      await profile.teardown();
    }
    await assert.rejects(stat(profileRoot), { code: "ENOENT" });
  } finally {
    if (beforeKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = beforeKey;
  }
} finally {
  await rm(root, { recursive: true, force: true });
}
