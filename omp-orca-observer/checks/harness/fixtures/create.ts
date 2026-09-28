import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PAGE_MAX_BYTES } from "../../../contract.ts";

/** Caller supplies an existing disposable directory; no generated transcript touches the checkout. */
export async function createFixtures(directory: string): Promise<{
  tenPages: string;
  oversized: string;
  splitMultibyte: string;
}> {
  const tenPages = join(directory, "ten-pages.jsonl");
  const oversized = join(directory, "oversized.jsonl");
  const splitMultibyte = join(directory, "split-multibyte.jsonl");
  const header = JSON.stringify({
    type: "session", version: 3,
    id: "generated-fixture-root", timestamp: "2026-01-01T00:00:00.000Z", cwd: directory
  }) + "\n";
  const entry = (id: number, text: string) => JSON.stringify({
    type: "message", id: `fixture-${id}`, parentId: null,
    timestamp: "2026-01-01T00:00:00.000Z",
    message: { role: "user", content: [{ type: "text", text }] },
  }) + "\n";
  const lines: string[] = [header];
  let bytes = Buffer.byteLength(header);
  for (let id = 0; bytes <= PAGE_MAX_BYTES * 10; id++) {
    const line = entry(id, "x".repeat(32_768));
    lines.push(line);
    bytes += Buffer.byteLength(line);
  }
  await writeFile(tenPages, lines.join(""));
  await writeFile(oversized, header + entry(0, "x".repeat(PAGE_MAX_BYTES + 1)));
  const prefix = '{"type":"message","id":"split","parentId":null,"timestamp":"2026-01-01T00:00:00.000Z","message":{"role":"user","content":[{"type":"text","text":"';
  const suffix = '"}]}}\n';
  const padding = "x".repeat(PAGE_MAX_BYTES - 1 - Buffer.byteLength(header) - Buffer.byteLength(prefix));
  await writeFile(splitMultibyte, `${header}${prefix}${padding}🌍${suffix}`);
  return { tenPages, oversized, splitMultibyte };
}
