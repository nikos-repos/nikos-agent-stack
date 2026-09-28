import assert from "node:assert/strict";
import { appendFile, mkdtemp, rename, rm, stat, truncate, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readPage } from "../reader.ts";
import type { ParseSessionContent, ReadRequest } from "../contract.ts";

const parse: ParseSessionContent = (content) => {
  const entries: unknown[] = [];
  let malformedRecords = 0;
  for (const line of content.split("\n")) {
    if (!line) continue;
    try {
      entries.push(JSON.parse(line) as unknown);
    } catch {
      malformedRecords++;
    }
  }
  return { entries, malformedRecords };
};

const controller = new AbortController();
const requestFor = (sessionFile: string, overrides: Partial<ReadRequest> = {}): ReadRequest => ({
  childId: "child-a",
  epoch: "epoch-a",
  sessionFile,
  token: null,
  mode: "entries",
  maxBytes: 64,
  signal: controller.signal,
  ...overrides,
});

const directory = await mkdtemp(join(tmpdir(), "omp-reader-"));
try {
  const limit = 64;
  const file = join(directory, "pages.jsonl");
  const content = Buffer.from(Array.from({ length: 50 }, (_, index) =>
    `${JSON.stringify({ index, text: "abcdefghijklmnopqrst" })}\n`).join(""));
  assert.ok(content.length >= 10 * limit);
  await writeFile(file, content);

  let token: string | null = null;
  const chunks: Buffer[] = [];
  let pages = 0;
  while (true) {
    const page = await readPage(requestFor(file, { token, mode: "bytes", maxBytes: limit }), parse);
    assert.ok(page.kind === "page");
    assert.equal(page.mode, "bytes");
    assert.equal(page.entries, null);
    const chunk = Buffer.from(page.bytesBase64!, "base64");
    assert.ok(chunk.length <= limit);
    chunks.push(chunk);
    token = page.token;
    pages++;
    assert.ok(pages <= 50, "continuation must advance");
    if (page.atEnd) break;
  }
  assert.deepEqual(Buffer.concat(chunks), content);

  const appended = Buffer.from(`${JSON.stringify({ index: 50, text: "appended" })}\n`);
  await appendFile(file, appended);
  const appendPage = await readPage(requestFor(file, { token, mode: "bytes" }), parse);
  assert.ok(appendPage.kind === "page");
  assert.equal(appendPage.reset, false);
  assert.deepEqual(Buffer.from(appendPage.bytesBase64!, "base64"), appended);

  await truncate(file, 0);
  const truncated = await readPage(requestFor(file, { token: appendPage.token }), parse);
  assert.ok(truncated.kind === "page");
  assert.equal(truncated.reset, true);
  assert.equal(truncated.atEnd, true);

  const changedFile = join(directory, "changed.jsonl");
  const firstLine = `${JSON.stringify({ value: "aaa" })}\n`;
  const original = firstLine + `${JSON.stringify({ value: "ccc" })}\n`;
  await writeFile(changedFile, original);
  const initial = await readPage(requestFor(changedFile, { maxBytes: Buffer.byteLength(firstLine) }), parse);
  assert.ok(initial.kind === "page");
  const inode = (await stat(changedFile)).ino;
  await writeFile(changedFile, original.replace("aaa", "bbb"));
  assert.equal((await stat(changedFile)).ino, inode);
  const rewritten = await readPage(requestFor(changedFile, {
    token: initial.token, maxBytes: Buffer.byteLength(firstLine),
  }), parse);
  assert.ok(rewritten.kind === "page");
  assert.equal(rewritten.reset, true);
  assert.deepEqual(rewritten.entries, [{ value: "bbb" }]);

  await rename(changedFile, join(directory, "old.jsonl"));
  await writeFile(changedFile, original);
  assert.notEqual((await stat(changedFile)).ino, inode);
  const replaced = await readPage(requestFor(changedFile, {
    token: initial.token, maxBytes: Buffer.byteLength(firstLine),
  }), parse);
  assert.ok(replaced.kind === "page");
  assert.equal(replaced.reset, true);
  assert.deepEqual(replaced.entries, [{ value: "aaa" }]);

  const current = await readPage(requestFor(changedFile, { maxBytes: Buffer.byteLength(firstLine) }), parse);
  assert.ok(current.kind === "page");
  for (const overrides of [{ childId: "child-b" }, { epoch: "epoch-b" }]) {
    const wrongOwner = await readPage(requestFor(changedFile, {
      token: current.token, maxBytes: Buffer.byteLength(firstLine), ...overrides,
    }), parse);
    assert.ok(wrongOwner.kind === "page");
    assert.equal(wrongOwner.reset, true);
    assert.deepEqual(wrongOwner.entries, [{ value: "aaa" }]);
  }

  const hugeFile = join(directory, "huge.jsonl");
  const hugeRecord = `${JSON.stringify({ payload: "x".repeat(3 * limit - 15) })}\n`;
  assert.equal(Buffer.byteLength(hugeRecord), 3 * limit);
  await writeFile(hugeFile, hugeRecord + `${JSON.stringify({ after: true })}\n`);
  let scanToken: string | null = null;
  for (let step = 1; step <= 3; step++) {
    const scan = await readPage(requestFor(hugeFile, { token: scanToken }), parse);
    assert.ok(scan.kind === "record_too_large");
    assert.equal(scan.start, 0);
    assert.equal(scan.scannedTo, step * limit);
    assert.equal(scan.end, step === 3 ? 3 * limit : null);
    scanToken = scan.token;
  }
  const afterHuge = await readPage(requestFor(hugeFile, { token: scanToken }), parse);
  assert.ok(afterHuge.kind === "page");
  assert.deepEqual(afterHuge.entries, [{ after: true }]);
  assert.equal(afterHuge.atEnd, true);

  const resetFile = join(directory, "reset-huge.jsonl");
  const beforeReset = `${JSON.stringify({ beforeReset: true })}\n`;
  await writeFile(resetFile, beforeReset);
  const beforeResetPage = await readPage(requestFor(resetFile, { maxBytes: limit }), parse);
  assert.ok(beforeResetPage.kind === "page");
  const beforeResetInode = (await stat(resetFile)).ino;
  await rename(resetFile, join(directory, "reset-old.jsonl"));
  await writeFile(resetFile, hugeRecord + `${JSON.stringify({ afterReset: true })}\n`);
  assert.notEqual((await stat(resetFile)).ino, beforeResetInode);

  const firstResetScan = await readPage(requestFor(resetFile, {
    token: beforeResetPage.token, maxBytes: limit,
  }), parse);
  assert.ok(firstResetScan.kind === "record_too_large");
  assert.equal(firstResetScan.reset, true);
  assert.equal(firstResetScan.start, 0);
  assert.equal(firstResetScan.end, null);
  assert.equal(firstResetScan.scannedTo, limit);
  let resetToken: string | null = firstResetScan.token;
  for (let step = 2; step <= 3; step++) {
    const scan = await readPage(requestFor(resetFile, { token: resetToken, maxBytes: limit }), parse);
    assert.ok(scan.kind === "record_too_large");
    assert.equal(scan.reset, false);
    assert.equal(scan.start, 0);
    assert.equal(scan.end, step === 3 ? 3 * limit : null);
    assert.equal(scan.scannedTo, step * limit);
    resetToken = scan.token;
  }
  const afterReset = await readPage(requestFor(resetFile, { token: resetToken, maxBytes: limit }), parse);
  assert.ok(afterReset.kind === "page");
  assert.equal(afterReset.reset, false);
  assert.deepEqual(afterReset.entries, [{ afterReset: true }]);
  assert.equal(afterReset.atEnd, true);

  const utf8File = join(directory, "utf8.jsonl");
  const utf8Line = Buffer.from(`${JSON.stringify({ message: "é" })}\n`);
  const split = utf8Line.indexOf(Buffer.from("é")) + 1;
  await writeFile(utf8File, utf8Line.subarray(0, split));
  const incomplete = await readPage(requestFor(utf8File), parse);
  assert.ok(incomplete.kind === "page");
  assert.deepEqual(incomplete.entries, []);
  assert.equal(incomplete.atEnd, false);
  await appendFile(utf8File, utf8Line.subarray(split));
  const complete = await readPage(requestFor(utf8File, { token: incomplete.token }), parse);
  assert.ok(complete.kind === "page");
  assert.deepEqual(complete.entries, [{ message: "é" }]);
  assert.equal(complete.atEnd, true);

  const malformedFile = join(directory, "malformed.jsonl");
  await writeFile(malformedFile, `not json\n${JSON.stringify({ ok: true })}\n`);
  const malformed = await readPage(requestFor(malformedFile), parse);
  assert.ok(malformed.kind === "page");
  assert.equal(malformed.malformed, 1);
  assert.deepEqual(malformed.entries, [{ ok: true }]);

  const missing = await readPage(requestFor(join(directory, "missing.jsonl")), parse);
  assert.deepEqual(missing, { kind: "unavailable", reason: "missing" });
  const aborted = new AbortController();
  aborted.abort();
  const cancelled = await readPage(requestFor(malformedFile, { signal: aborted.signal }), parse);
  assert.deepEqual(cancelled, { kind: "unavailable", reason: "cancelled" });
} finally {
  await rm(directory, { recursive: true, force: true });
}
