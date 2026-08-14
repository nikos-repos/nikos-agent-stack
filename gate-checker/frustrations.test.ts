import { afterEach as aftereach, expect, test } from "bun:test";
import {
  mkdirSync as mkdirsync,
  mkdtempSync as mkdtempsync,
  readFileSync as readfilesync,
  rmSync as rmsync,
  writeFileSync as writefilesync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  automaticGateRecord,
  appendRecord,
  loadTaxonomy,
  missingIdentities,
  readRecords,
  validateRecord,
} from "./frustrations.js";

const scratch: string[] = [];

aftereach(() => {
  for (const dir of scratch.splice(0)) rmsync(dir, { recursive: true, force: true });
});

function repo(): string {
  const dir = mkdtempsync(join(tmpdir(), "gate-frustrations-"));
  scratch.push(dir);
  return dir;
}

function validrecord(
  reporoot: string,
  requestid = "request-1",
  agentid = "main",
  type = "tooling",
  severity = "high",
  sessionfile = `/sessions/${agentid}.jsonl`,
  sessionid = `session-${agentid}`,
) {
  return validateRecord(
    {
      agent_id: agentid,
      primary_goal: "recover provider quota feedback",
      complaint: "the provider denied the assigned task",
      type,
      severity,
      evidence: [
        {
          kind: "command",
          command: "record frustration",
          exit_code: 1,
          output: "quota exceeded",
        },
      ],
    },
    {
      repoRoot: reporoot,
      requestId: requestid,
      cwd: reporoot,
      sessionFile: sessionfile,
      sessionId: sessionid,
    },
  );
}

test("valid frustration records append as jsonl and read back", () => {
  const reporoot = repo();
  const path = join(reporoot, "frustrations.jsonl");
  const first = validrecord(reporoot);
  const second = validrecord(reporoot, "request-1", "subagent-1");
  expect(first.ok).toBe(true);
  expect(second.ok).toBe(true);
  if (!first.ok || !second.ok) return;

  expect(appendRecord(first.record, path)).toEqual({ ok: true });
  expect(appendRecord(second.record, path)).toEqual({ ok: true });
  expect(readRecords(path)).toEqual([first.record, second.record]);
  expect(readfilesync(path, "utf8").trim().split("\n").map((line) => JSON.parse(line))).toEqual([
    first.record,
    second.record,
  ]);
});

test("records without evidence are rejected and never appended", () => {
  const reporoot = repo();
  const path = join(reporoot, "frustrations.jsonl");
  const invalid = {
    request_id: "request-1",
    agent_id: "main",
    primary_goal: "recover provider quota feedback",
    complaint: "the provider denied the assigned task",
    type: "tooling",
    severity: "high",
    evidence: [],
    session_file: "/sessions/main.jsonl",
    session_id: "session-main",
  };

  expect(
    validateRecord(invalid, {
      repoRoot: reporoot,
      requestId: "request-1",
      cwd: reporoot,
      sessionFile: "/sessions/main.jsonl",
      sessionId: "session-main",
    }).ok,
  ).toBe(false);
  expect(appendRecord(invalid, path).ok).toBe(false);
  expect(readRecords(path)).toEqual([]);
});

test("records require trusted server session file and id options", () => {
  const reporoot = repo();
  const result = validateRecord(
    {
      request_id: "forged-request",
      agent_id: "main",
      primary_goal: "recover provider quota feedback",
      complaint: "the provider denied the assigned task",
      type: "tooling",
      severity: "high",
      session_file: "/sessions/forged.jsonl",
      session_id: "forged-session",
      evidence: [{ kind: "command", command: "record frustration", exit_code: 1, output: "quota exceeded" }],
    },
    { repoRoot: reporoot, requestId: "request-1", cwd: reporoot },
  );
  expect(result).toEqual({ ok: false, error: "session_file is required" });
});

test("the fixed taxonomy accepts only the documented defaults", () => {
  const reporoot = repo();
  expect(loadTaxonomy(reporoot)).toEqual({
    types: ["tooling", "environment", "requirements", "workflow", "test", "dependency", "performance", "other", "none"],
    severities: ["low", "medium", "high", "blocker"],
  });
  expect(validrecord(reporoot, "request-1", "main", "invented").ok).toBe(false);
  expect(validrecord(reporoot, "request-1", "main", "tooling", "urgent").ok).toBe(false);
});

test("a project taxonomy extends the fixed taxonomy", () => {
  const reporoot = repo();
  const omproot = join(reporoot, ".omp");
  mkdirsync(omproot);
  writefilesync(
    join(omproot, "gates-frustrations.json"),
    JSON.stringify({ types: ["provider"], severities: ["urgent"] }),
  );

  const taxonomy = loadTaxonomy(reporoot);
  expect(taxonomy.types).toContain("tooling");
  expect(taxonomy.types).toContain("provider");
  expect(taxonomy.severities).toContain("high");
  expect(taxonomy.severities).toContain("urgent");
  expect(validrecord(reporoot, "request-1", "main", "provider", "urgent").ok).toBe(true);
});

test("identity records use trusted session fields across local requests", () => {
  const reporoot = repo();
  const mainidentity = { agent_id: "main", session_file: "/sessions/main.jsonl" };
  const subagentidentity = { agent_id: "subagent-1", session_file: "/sessions/subagent-1.jsonl" };
  const parent = validrecord(
    reporoot,
    "parent-local-request",
    "main",
    "tooling",
    "high",
    mainidentity.session_file,
    "session-main",
  );
  const later = validrecord(
    reporoot,
    "later-local-request",
    "main",
    "tooling",
    "high",
    mainidentity.session_file,
    "session-main",
  );
  const forged = validateRecord(
    {
      request_id: "forged-request",
      agent_id: "subagent-1",
      primary_goal: "check the assigned change",
      complaint: "the provider denied the assigned task",
      type: "tooling",
      severity: "high",
      session_file: subagentidentity.session_file,
      session_id: "session-subagent-1",
      evidence: [{ kind: "command", command: "record frustration", exit_code: 1, output: "quota exceeded" }],
    },
    {
      repoRoot: reporoot,
      requestId: "parent-local-request",
      cwd: reporoot,
      sessionFile: mainidentity.session_file,
      sessionId: "session-main",
    },
  );
  const noLocalRequest = validateRecord(
    {
      request_id: "forged-request",
      agent_id: "main",
      primary_goal: "recover provider quota feedback",
      complaint: "the provider denied the assigned task",
      type: "tooling",
      severity: "high",
      evidence: [{ kind: "command", command: "record frustration", exit_code: 1, output: "quota exceeded" }],
    },
    {
      repoRoot: reporoot,
      cwd: reporoot,
      sessionFile: mainidentity.session_file,
      sessionId: "session-main",
    },
  );
  const child = validrecord(
    reporoot,
    "child-local-request",
    "subagent-1",
    "tooling",
    "high",
    subagentidentity.session_file,
    "session-subagent-1",
  );
  expect(parent.ok).toBe(true);
  expect(later.ok).toBe(true);
  expect(forged.ok).toBe(true);
  expect(noLocalRequest).toEqual({ ok: false, error: "request_id is required" });
  expect(child.ok).toBe(true);
  if (!parent.ok || !later.ok || !forged.ok || !child.ok) return;

  expect(forged.record).toEqual(expect.objectContaining({
    request_id: "parent-local-request",
    agent_id: "subagent-1",
    session_file: mainidentity.session_file,
    session_id: "session-main",
  }));
  expect(missingIdentities([parent.record], [mainidentity])).toEqual([]);
  expect(missingIdentities([later.record], [mainidentity])).toEqual([]);
  expect(missingIdentities([forged.record], [subagentidentity])).toEqual(["subagent-1"]);
  expect(missingIdentities([parent.record, child.record], [mainidentity, subagentidentity])).toEqual([]);

  const unbound = { ...parent.record };
  delete unbound.session_file;
  delete unbound.session_id;
  expect(missingIdentities([unbound], [mainidentity])).toEqual(["main"]);
});

test("automatic gate records contain valid gate evidence", () => {
  const reporoot = repo();
  const record = automaticGateRecord({
    request_id: "request-1",
    rule: "forbidden_marker",
    detail: "a forbidden marker blocked delivery",
    blocking: true,
    event_id: "gate-event-1",
    session_file: "/sessions/main.jsonl",
    session_id: "session-main",
  });

  expect(record).toEqual(expect.objectContaining({
    request_id: "request-1",
    agent_id: "main",
    primary_goal: "complete the active request",
    complaint: "a forbidden marker blocked delivery",
    type: "workflow",
    severity: "high",
    evidence: [{ kind: "gate", event_id: "gate-event-1", rule: "forbidden_marker" }],
    source: "auto",
    session_file: "/sessions/main.jsonl",
    session_id: "session-main",
  }));
  expect(
    validateRecord(record, {
      repoRoot: reporoot,
      requestId: "request-1",
      cwd: reporoot,
      sessionFile: "/sessions/main.jsonl",
      sessionId: "session-main",
    }).ok,
  ).toBe(true);
  expect(
    automaticGateRecord({
      request_id: "request-1",
      rule: "subagent_missing_manifest",
      detail: "a report is incomplete",
      blocking: false,
      event_id: "gate-event-2",
    }).severity,
  ).toBe("medium");
});

test("none records inject trusted gate evidence and keep the agent source", () => {
  const reporoot = repo();
  const result = validateRecord(
    {
      agent_id: "main",
      primary_goal: "close the assigned slice",
      complaint: "none",
      type: "none",
      severity: "low",
      source: "auto",
      evidence: [{ kind: "command", command: "forge evidence", exit_code: 0, output: "forged" }],
    },
    {
      repoRoot: reporoot,
      requestId: "request-1",
      cwd: reporoot,
      sessionFile: "/sessions/main.jsonl",
      sessionId: "session-main",
    },
  );
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  expect(result.record.source).toBe("agent");
  expect(result.record.evidence).toEqual([
    expect.objectContaining({ kind: "gate", rule: "clean_turn", event_id: expect.any(String) }),
  ]);
});

test("none records reject a complaint other than none", () => {
  const reporoot = repo();
  const result = validateRecord(
    {
      agent_id: "main",
      primary_goal: "close the assigned slice",
      complaint: "the provider denied the assigned task",
      type: "none",
      severity: "low",
      evidence: [{ kind: "command", command: "record frustration", exit_code: 1, output: "quota exceeded" }],
    },
    {
      repoRoot: reporoot,
      requestId: "request-1",
      cwd: reporoot,
      sessionFile: "/sessions/main.jsonl",
      sessionId: "session-main",
    },
  );
  expect(result).toEqual({ ok: false, error: 'type "none" requires complaint "none"' });
});

test("none records reject a severity other than low", () => {
  const reporoot = repo();
  const result = validateRecord(
    {
      agent_id: "main",
      primary_goal: "close the assigned slice",
      complaint: "none",
      type: "none",
      severity: "high",
      evidence: [{ kind: "command", command: "record frustration", exit_code: 1, output: "quota exceeded" }],
    },
    {
      repoRoot: reporoot,
      requestId: "request-1",
      cwd: reporoot,
      sessionFile: "/sessions/main.jsonl",
      sessionId: "session-main",
    },
  );
  expect(result).toEqual({ ok: false, error: 'type "none" requires severity "low"' });
});

test("stored records accept a missing source and reject unknown sources", () => {
  const reporoot = repo();
  const path = join(reporoot, "frustrations.jsonl");
  const result = validrecord(reporoot);
  expect(result.ok).toBe(true);
  if (!result.ok) return;
  const legacy = { ...result.record };
  delete legacy.source;
  expect(appendRecord(legacy, path)).toEqual({ ok: true });
  expect(readRecords(path)).toEqual([legacy]);
  expect(appendRecord({ ...legacy, source: "client" }, path).ok).toBe(false);
  expect(readRecords(path)).toEqual([legacy]);
});
