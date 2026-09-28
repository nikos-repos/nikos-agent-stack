import assert from "node:assert";
import { readFileSync } from "node:fs";
import {
  OMP_FLOOR,
  ORCA_FLOOR,
  PAGE_MAX_BYTES,
  ROUTES,
  SCHEMA_HEADER,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_SCHEMA_VERSION,
} from "../contract.ts";

assert.strictEqual(SNAPSHOT_SCHEMA_VERSION, 1);
assert.strictEqual(OMP_FLOOR, "18.3.5");
assert.strictEqual(ORCA_FLOOR, "1.4.205");
assert.strictEqual(PAGE_MAX_BYTES, 262_144);
assert.strictEqual(SNAPSHOT_MAX_BYTES, 1_048_576);
assert.deepStrictEqual(ROUTES, {
  viewer: "/",
  session: "/v1/session",
  snapshot: "/v1/snapshot",
  page: "/v1/children/:childId/page",
});
assert.strictEqual(SCHEMA_HEADER, "x-observer-schema");

const { files }: { files: string[] } = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
assert.deepStrictEqual(files, [
  "index.ts",
  "contract.ts",
  "compat.ts",
  "coordinator.ts",
  "reader.ts",
  "stock-source.ts",
  "outcomes.ts",
  "auth.ts",
  "transport.ts",
  "commands.ts",
  "guidance.ts",
  "viewer/",
]);
