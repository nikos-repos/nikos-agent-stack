import { createHash } from "node:crypto";
import { open } from "node:fs/promises";
import type { FileHandle } from "node:fs/promises";
import { PAGE_MAX_BYTES } from "./contract.ts";
import type { ParseSessionContent, ReadRequest, ReadResult } from "./contract.ts";

type LastRecord = { start: number; end: number; sha256: string };
type PageToken = {
  childId: string;
  epoch: string;
  sessionFile: string;
  inode: string;
  size: number;
  cursor: number;
  lastRecord: LastRecord | null;
  scanStart: number | null;
};

function decodeToken(value: string): PageToken | null {
  try {
    const token: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof token !== "object" || token === null) return null;
    const page = token as Record<string, unknown>;
    const last = page.lastRecord;
    if (
      typeof page.childId !== "string" || typeof page.epoch !== "string" ||
      typeof page.sessionFile !== "string" || typeof page.inode !== "string" ||
      !Number.isSafeInteger(page.size) || (page.size as number) < 0 ||
      !Number.isSafeInteger(page.cursor) || (page.cursor as number) < 0 ||
      (page.cursor as number) > (page.size as number) ||
      (page.scanStart !== null &&
        (!Number.isSafeInteger(page.scanStart) || (page.scanStart as number) < 0 ||
          (page.scanStart as number) > (page.cursor as number))) ||
      (last !== null &&
        (typeof last !== "object" ||
          !Number.isSafeInteger((last as LastRecord).start) ||
          !Number.isSafeInteger((last as LastRecord).end) ||
          (last as LastRecord).start < 0 ||
          (last as LastRecord).end <= (last as LastRecord).start ||
          (last as LastRecord).end > (page.cursor as number) ||
          (last as LastRecord).end - (last as LastRecord).start > PAGE_MAX_BYTES ||
          typeof (last as LastRecord).sha256 !== "string" ||
          !/^[a-f0-9]{64}$/.test((last as LastRecord).sha256)))
    ) return null;
    return page as PageToken;
  } catch {
    return null;
  }
}

function encodeToken(token: PageToken): string {
  return Buffer.from(JSON.stringify(token)).toString("base64url");
}

/**
 * @cc [label:product] reader-bounded-page
 * Each page reads at most one bounded payload window; a changed continuation resets to byte zero.
 * @cc [label:security] reader-admitted-file
 * The caller admits sessionFile; this reader does not resolve child ids or authorize file paths.
 */
export async function readPage(request: ReadRequest, parse: ParseSessionContent): Promise<ReadResult> {
  if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };

  const limit = Number.isNaN(request.maxBytes)
    ? 0
    : Math.max(0, Math.min(Math.floor(request.maxBytes), PAGE_MAX_BYTES));
  let token = request.token === null ? null : decodeToken(request.token);
  let reset = request.token !== null && token === null;
  let revalidating = false;
  let handle: FileHandle | undefined;

  try {
    handle = await open(request.sessionFile, "r");
    if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };
    const stat = await handle.stat();
    if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };
    if (!Number.isSafeInteger(stat.size)) return { kind: "unavailable", reason: "unreadable" };
    const inode = String(stat.ino);

    if (token && (
      token.childId !== request.childId || token.epoch !== request.epoch ||
      token.sessionFile !== request.sessionFile || token.inode !== inode ||
      stat.size < token.size || stat.size < token.cursor
    )) {
      token = null;
      reset = true;
    }

    const buffer = Buffer.allocUnsafe(Math.max(limit, token?.lastRecord
      ? token.lastRecord.end - token.lastRecord.start : 0));
    if (token?.lastRecord) {
      const last = token.lastRecord;
      revalidating = true;
      const { bytesRead } = await handle.read(buffer, 0, last.end - last.start, last.start);
      if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };
      if (bytesRead !== last.end - last.start) return { kind: "unavailable", reason: "stale" };
      if (createHash("sha256").update(buffer.subarray(0, bytesRead)).digest("hex") !== last.sha256) {
        token = null;
        reset = true;
      }
      revalidating = false;
    }

    const cursor = token?.cursor ?? 0;
    const toRead = Math.min(limit, stat.size - cursor);
    const { bytesRead } = await handle.read(buffer, 0, toRead, cursor);
    if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };
    const next = {
      childId: request.childId,
      epoch: request.epoch,
      sessionFile: request.sessionFile,
      inode,
      size: stat.size,
      cursor,
      lastRecord: token?.lastRecord ?? null,
      scanStart: token?.scanStart ?? null,
    } satisfies PageToken;

    if (next.scanStart !== null) {
      const start = next.scanStart;
      const newline = buffer.indexOf(10);
      const end = newline < 0 || newline >= bytesRead ? null : cursor + newline + 1;
      next.cursor = end ?? cursor + bytesRead;
      if (end !== null) next.scanStart = null;
      return {
        kind: "record_too_large",
        start,
        end,
        reset,
        scannedTo: cursor + bytesRead,
        token: encodeToken(next),
      };
    }

    const lastNewline = bytesRead === 0 ? -1 : buffer.lastIndexOf(10, bytesRead - 1);
    if (lastNewline < 0 && limit > 0 && bytesRead === limit) {
      next.cursor = cursor + bytesRead;
      next.scanStart = cursor;
      return {
        kind: "record_too_large",
        start: cursor,
        end: null,
        reset,
        scannedTo: next.cursor,
        token: encodeToken(next),
      };
    }

    const completeBytes = lastNewline + 1;
    next.cursor += completeBytes;
    if (completeBytes > 0) {
      const previousNewline = lastNewline === 0 ? -1 : buffer.lastIndexOf(10, lastNewline - 1);
      const start = previousNewline + 1;
      next.lastRecord = {
        start: cursor + start,
        end: next.cursor,
        sha256: createHash("sha256").update(buffer.subarray(start, completeBytes)).digest("hex"),
      };
    }
    const parsed = completeBytes > 0 ? parse(buffer.toString("utf8", 0, completeBytes))
      : { entries: [], malformedRecords: 0 };
    if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };
    return {
      kind: "page",
      mode: request.mode,
      entries: request.mode === "entries" ? parsed.entries : null,
      bytesBase64: request.mode === "bytes" ? buffer.toString("base64", 0, completeBytes) : null,
      malformed: parsed.malformedRecords,
      reset,
      atEnd: next.cursor === stat.size,
      token: encodeToken(next),
    };
  } catch (error) {
    if (request.signal.aborted) return { kind: "unavailable", reason: "cancelled" };
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return { kind: "unavailable", reason: "missing" };
    }
    return { kind: "unavailable", reason: revalidating ? "stale" : "unreadable" };
  } finally {
    await handle?.close();
  }
}
