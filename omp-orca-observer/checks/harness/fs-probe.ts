import { appendFileSync, readlinkSync } from "node:fs";
import { mkdtemp, open, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Linux/WSL observations resolve each file-handle path through /proc/self/fd. */
export type ProbeRead = { path: string; offset: number | null; length: number | null };

/** In-memory observations are available to scripts that preload and import this module. */
export const reads: ProbeRead[] = [];

let armedPath: string | null | undefined;
let heldRead: Promise<ProbeRead> | undefined;
let notifyHeld: ((read: ProbeRead) => void) | undefined;
let release: (() => void) | undefined;

/** Holds the next matching read after logging it, until releaseHeldRead is called. */
export function holdNextRead(path?: string): void {
  if (armedPath !== undefined || release) throw new Error("Probe already holds a read");
  armedPath = path ?? null;
  const gate = Promise.withResolvers<ProbeRead>();
  heldRead = gate.promise;
  notifyHeld = gate.resolve;
}

/** Resolves when the held read has reached the deterministic pre-I/O boundary. */
export function waitForHeldRead(): Promise<ProbeRead> {
  if (!heldRead) throw new Error("Call holdNextRead first");
  return heldRead;
}

/** Releases the recorded read so the underlying file handle may continue. */
export function releaseHeldRead(): void {
  if (!release) throw new Error("No read has reached the hold point");
  release();
  release = undefined;
  heldRead = undefined;
}

const probeDirectory = await mkdtemp(join(tmpdir(), "omp-fs-probe-"));
try {
  const probeHandle = await open(join(probeDirectory, "probe"), "w+");
  try {
    const prototype = Object.getPrototypeOf(probeHandle) as { read: (...args: unknown[]) => Promise<unknown> };
    const originalRead = prototype.read;
    Object.defineProperty(prototype, "read", {
      configurable: true,
      writable: true,
      value: async function(this: { fd: number }, ...readArgs: unknown[]) {
        const path = readlinkSync(`/proc/self/fd/${this.fd}`);
        const options = readArgs[1] && typeof readArgs[1] === "object" ? readArgs[1] : readArgs[0];
        const offset = typeof readArgs[3] === "number" ? readArgs[3]
          : options && typeof options === "object" && "position" in options && typeof options.position === "number"
            ? options.position : null;
        const length = typeof readArgs[2] === "number" ? readArgs[2]
          : options && typeof options === "object" && "length" in options && typeof options.length === "number"
            ? options.length
            : ArrayBuffer.isView(readArgs[0]) ? readArgs[0].byteLength : null;
        const observation: ProbeRead = { path, offset, length };
        reads.push(observation);
        if (process.env.FS_PROBE_LOG) appendFileSync(process.env.FS_PROBE_LOG, `${JSON.stringify(observation)}\n`);
        if (armedPath !== undefined && (armedPath === null || armedPath === path)) {
          armedPath = undefined;
          notifyHeld?.(observation);
          const gate = Promise.withResolvers<void>();
          release = gate.resolve;
          await gate.promise;
        }
        return originalRead.apply(this, readArgs);
      },
    });
  } finally {
    await probeHandle.close();
  }
} finally {
  await rm(probeDirectory, { recursive: true, force: true });
}
