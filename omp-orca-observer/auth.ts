import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import type { Grants } from "./contract.ts";

const MAX_GRANTS = 16;
const CODE_TTL_MS = 60_000;
const IDLE_TTL_MS = 60_000;

type PendingCode = {
  key: Buffer;
  childIds: Set<string>;
  ttlMs: number;
  expiresAt: number;
};

type Credential = {
  key: Buffer;
  childIds: Set<string>;
  expiresAt: number;
  lastAllowedAt: number;
  controllers: Map<string | null, AbortController>;
};

function key(token: string): Buffer {
  return createHash("sha256").update(token).digest();
}

// Scan every entry using fixed-size digests; neither token length nor a matching prefix
// changes the secret comparison, and a match never short-circuits the lookup.
function lookup<T extends { key: Buffer }>(entries: T[], token: string): T | null {
  const candidate = key(token);
  let found: T | null = null;
  for (const entry of entries) {
    if (timingSafeEqual(entry.key, candidate)) found = entry;
  }
  return found;
}

/**
 * @cc [label:security] observer-epoch-grants
 * Secrets remain in this epoch's memory only. Pending codes reserve credential slots,
 * so exchange cannot fail for capacity after bootstrap succeeds. Only successful
 * allows calls renew idleness; obtaining a signal or inspecting status does not.
 * Scope loss and credential termination abort existing signals before returning.
 */
export function createGrants(now: () => number, epoch: string): Grants {
  const codes: PendingCode[] = [];
  const credentials: Credential[] = [];
  let disposed = false;
  let timer: NodeJS.Timeout | undefined;
  let timerAt: number | null = null;

  function schedule(at: number): void {
    let next = Infinity;
    for (const code of codes) next = Math.min(next, code.expiresAt);
    for (const credential of credentials) {
      next = Math.min(next, credential.expiresAt, credential.lastAllowedAt + IDLE_TTL_MS);
    }
    if (disposed || next === Infinity) {
      clearTimeout(timer);
      timer = undefined;
      timerAt = null;
      return;
    }
    if (timer !== undefined && timerAt === next) return;
    clearTimeout(timer);
    timerAt = next;
    timer = setTimeout(() => {
      timer = undefined;
      timerAt = null;
      sweep(now());
    }, Math.max(1, Math.min(next - at, 2_147_483_647)));
    timer.unref();
  }

  function sweep(at: number): void {
    const abort: AbortController[] = [];
    for (let i = codes.length - 1; i >= 0; i--) {
      if (at >= codes[i]!.expiresAt) codes.splice(i, 1);
    }
    for (let i = credentials.length - 1; i >= 0; i--) {
      const credential = credentials[i]!;
      if (at >= credential.expiresAt || at >= credential.lastAllowedAt + IDLE_TTL_MS) {
        credentials.splice(i, 1);
        for (const controller of credential.controllers.values()) abort.push(controller);
      }
    }
    schedule(at);
    // Remove every expired grant before notifying potentially reentrant readers.
    for (const controller of abort) controller.abort();
  }

  function revoke(childIds: string[] | "all"): void {
    const at = now();
    sweep(at);
    const removed = childIds === "all" ? null : new Set(childIds);
    const abort: AbortController[] = [];
    for (let i = codes.length - 1; i >= 0; i--) {
      const code = codes[i]!;
      if (removed === null) code.childIds.clear();
      else for (const childId of removed) code.childIds.delete(childId);
      if (code.childIds.size === 0) codes.splice(i, 1);
    }
    for (let i = credentials.length - 1; i >= 0; i--) {
      const credential = credentials[i]!;
      if (removed === null) credential.childIds.clear();
      else for (const childId of removed) credential.childIds.delete(childId);
      if (credential.childIds.size === 0) {
        credentials.splice(i, 1);
        for (const controller of credential.controllers.values()) abort.push(controller);
      } else {
        for (const childId of removed!) {
          const controller = credential.controllers.get(childId);
          if (controller) {
            credential.controllers.delete(childId);
            abort.push(controller);
          }
        }
      }
    }
    schedule(at);
    // Revoke all affected scopes before any abort listener can inspect another grant.
    for (const controller of abort) controller.abort();
  }

  return {
    epoch,
    bootstrap(childIds, ttlMs) {
      const at = now();
      sweep(at);
      if (disposed) throw new Error("Observer grants are disposed");
      if (childIds.length === 0) throw new Error("Observer grant requires at least one child");
      if (credentials.length + codes.length >= MAX_GRANTS) {
        throw new Error("Observer grant capacity is 16 live credentials and reserved bootstrap codes");
      }
      const code = randomBytes(32).toString("base64url");
      const expiresAt = at + CODE_TTL_MS;
      codes.push({ key: key(code), childIds: new Set(childIds), ttlMs, expiresAt });
      schedule(at);
      return { code, expiresAt: new Date(expiresAt).toISOString() };
    },
    exchange(code) {
      const at = now();
      sweep(at);
      const pending = lookup(codes, code);
      if (disposed || pending === null) return null;
      const credential = randomBytes(32).toString("base64url");
      const expiresAt = at + pending.ttlMs;
      const serializedExpiry = new Date(expiresAt).toISOString();
      codes.splice(codes.indexOf(pending), 1);
      credentials.push({
        key: key(credential), childIds: pending.childIds, expiresAt,
        lastAllowedAt: at, controllers: new Map(),
      });
      schedule(at);
      return { credential, expiresAt: serializedExpiry };
    },
    allows(token, childId) {
      const at = now();
      sweep(at);
      const credential = lookup(credentials, token);
      if (disposed || credential === null || (childId !== null && !credential.childIds.has(childId))) {
        return false;
      }
      credential.lastAllowedAt = at;
      schedule(at);
      return true;
    },
    signal(token, childId) {
      sweep(now());
      const credential = lookup(credentials, token);
      if (disposed || credential === null || (childId !== null && !credential.childIds.has(childId))) {
        return null;
      }
      let controller = credential.controllers.get(childId);
      if (!controller) {
        controller = new AbortController();
        credential.controllers.set(childId, controller);
      }
      return controller.signal;
    },
    revoke,
    status() {
      sweep(now());
      const childIds = new Set<string>();
      for (const grants of [credentials, codes]) {
        for (const grant of grants) {
          for (const childId of grant.childIds) childIds.add(childId);
        }
      }
      return { liveCredentials: credentials.length, grantedChildIds: [...childIds], pendingCodes: codes.length };
    },
    dispose() {
      disposed = true;
      revoke("all");
    },
  };
}
