const path_rules = [
  {
    id: "risk.auth_permissions",
    category: "auth_permissions",
    pattern: /(^|\/)(auth|authorization|permissions?|roles?|policies)(\/|\.|-)/i,
    detail: "authentication or permission behavior changed",
  },
  {
    id: "risk.dependencies",
    category: "dependencies",
    pattern: /(^|\/)(package(-lock)?\.json|bun\.lock|pnpm-lock\.yaml|yarn\.lock|cargo\.(toml|lock)|go\.(mod|sum)|requirements[^/]*\.txt|poetry\.lock)$/i,
    detail: "dependency manifest or lockfile changed",
  },
  {
    id: "risk.migration",
    category: "migration",
    pattern: /(^|\/)(migrations?|schema)(\/|\.|-)/i,
    detail: "database migration or schema changed",
  },
  {
    id: "risk.public_contract",
    category: "public_contract",
    pattern: /(^|\/)(public|api|openapi|contracts?|proto|graphql)(\/|\.|-)/i,
    detail: "public contract surface changed",
  },
];

const destructive = /\b(drop\s+(table|database|schema)|truncate\s+table|delete\s+from|rm\s+-rf)\b/i;

function evidence(file, detail, line = null) {
  return {
    path: file.path,
    line,
    change_type: file.type,
    detail,
  };
}

export function auditscope(scope) {
  const findings = [];
  const seen = new Set();
  const add = (id, category, file, detail, line = null) => {
    const key = `${id}:${file.path}:${line ?? ""}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({
      id,
      category,
      severity: "advisory",
      evidence: evidence(file, detail, line),
    });
  };

  for (const file of scope?.files ?? []) {
    for (const rule of path_rules) {
      if (rule.pattern.test(file.path)) {
        add(rule.id, rule.category, file, rule.detail);
      }
    }
    if (file.type === "deleted") {
      add("risk.file_deletion", "deletion", file, "tracked file deleted");
    }
    if (file.type === "renamed") {
      add(
        "risk.rename",
        "rename",
        file,
        `file renamed from ${file.old_path ?? "unknown"}`,
      );
    }
    if (
      file.old_mode &&
      file.new_mode &&
      file.old_mode !== "000000" &&
      file.new_mode !== "000000" &&
      file.old_mode !== file.new_mode
    ) {
      add(
        "risk.mode_change",
        "mode",
        file,
        `file mode changed from ${file.old_mode} to ${file.new_mode}`,
      );
    }
    if (file.binary) add("risk.binary", "binary", file, "binary content changed");
    if (file.submodule) add("risk.submodule", "submodule", file, "submodule pointer changed");

    for (const line of scope?.added?.[file.path] ?? []) {
      if (destructive.test(line.text)) {
        add(
          "risk.destructive_operation",
          "destructive_operation",
          file,
          "destructive operation added",
          line.line,
        );
      }
    }
  }

  findings.sort((left, right) =>
    left.id.localeCompare(right.id) ||
    left.evidence.path.localeCompare(right.evidence.path) ||
    (left.evidence.line ?? 0) - (right.evidence.line ?? 0)
  );
  return {
    scope_digest: String(scope?.digest ?? ""),
    outcome: findings.length > 0 ? "advisory_findings" : "clean",
    findings,
  };
}
