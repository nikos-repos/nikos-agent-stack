import { expect, test } from "bun:test";
import { auditscope } from "./risks.js";

test("risk audit reports stable evidence for high-impact changes", () => {
  const result = auditscope({
    digest: "scope-1",
    files: [
      {
        path: "db/migrations/001_drop.sql",
        type: "added",
        old_path: null,
        old_mode: null,
        new_mode: "100644",
        binary: false,
        submodule: false,
      },
      {
        path: "package-lock.json",
        type: "modified",
        old_path: null,
        old_mode: "100644",
        new_mode: "100644",
        binary: false,
        submodule: false,
      },
      {
        path: "src/auth/permissions.ts",
        type: "modified",
        old_path: null,
        old_mode: "100644",
        new_mode: "100755",
        binary: false,
        submodule: false,
      },
      {
        path: "public/old-contract.json",
        type: "deleted",
        old_path: null,
        old_mode: "100644",
        new_mode: "000000",
        binary: false,
        submodule: false,
      },
    ],
    added: {
      "db/migrations/001_drop.sql": [
        { line: 1, text: "drop table accounts;" },
      ],
    },
  });

  expect(result.outcome).toBe("advisory_findings");
  expect(result.findings.map((finding) => finding.id)).toEqual([
    "risk.auth_permissions",
    "risk.dependencies",
    "risk.destructive_operation",
    "risk.file_deletion",
    "risk.migration",
    "risk.mode_change",
    "risk.public_contract",
  ]);
  expect(result.findings.find((finding) => finding.id === "risk.destructive_operation"))
    .toEqual(expect.objectContaining({
      severity: "advisory",
      evidence: expect.objectContaining({
        path: "db/migrations/001_drop.sql",
        line: 1,
      }),
    }));
});

test("risk audit stays clean when no deterministic rule matches", () => {
  const result = auditscope({
    digest: "scope-2",
    files: [{
      path: "src/math.ts",
      type: "modified",
      old_path: null,
      old_mode: "100644",
      new_mode: "100644",
      binary: false,
      submodule: false,
    }],
    added: { "src/math.ts": [{ line: 1, text: "return left + right;" }] },
  });

  expect(result).toEqual({
    scope_digest: "scope-2",
    outcome: "clean",
    findings: [],
  });
});
