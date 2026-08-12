import { expect, test } from "bun:test";
import {
  mergeprovenance,
  provenancefromevent,
  provenancefromdetails,
  provenancefromlifecycle,
} from "./provenance.js";

test("task details preserve native identity status artifacts and structured manifests", () => {
  const records = provenancefromdetails("call-1", {
    results: [
      {
        id: "reviewer-1",
        agent: "reviewer",
        exitCode: 0,
        output: "review complete",
        stderr: "",
        durationMs: 42,
        resolvedModel: "provider/model",
        outputPath: "/tmp/reviewer-1.md",
        patchPath: "/tmp/reviewer-1.patch",
        branchBaseSha: "abc123",
        structuredOutput: {
          data: { changed_files: ["src/a.ts"] },
          valid: true,
        },
      },
    ],
  });

  expect(records).toEqual([
    {
      task_call_id: "call-1",
      id: "reviewer-1",
      agent: "reviewer",
      status: "completed",
      exit_code: 0,
      error: null,
      duration_ms: 42,
      model: "provider/model",
      session_file: null,
      output_path: "/tmp/reviewer-1.md",
      patch_path: "/tmp/reviewer-1.patch",
      branch_name: null,
      branch_base_sha: "abc123",
      report: "review complete",
      manifest: ["src/a.ts"],
      manifest_source: "structured",
    },
  ]);
});

test("lifecycle records merge without replacing settled task evidence", () => {
  const started = provenancefromlifecycle({
    id: "worker-1",
    agent: "task",
    status: "started",
    parentToolCallId: "call-2",
    sessionFile: "/tmp/worker-1.jsonl",
  });
  const completed = provenancefromdetails("call-2", {
    results: [{
      id: "worker-1",
      agent: "task",
      exitCode: 0,
      output: "<changed-files>\nsrc/b.ts\n</changed-files>",
      durationMs: 7,
    }],
  })[0];

  expect(mergeprovenance([started], completed)).toEqual([
    expect.objectContaining({
      id: "worker-1",
      status: "completed",
      session_file: "/tmp/worker-1.jsonl",
      manifest: ["src/b.ts"],
      manifest_source: "report",
    }),
  ]);
});

test("task message events recover reports for background agents", () => {
  const record = provenancefromevent({
    id: "worker-2",
    event: {
      type: "message_end",
      message: {
        role: "assistant",
        content: [{ type: "text", text: "done\n<changed-files>\nsrc/c.ts\n</changed-files>" }],
      },
    },
  });

  expect(record).toEqual(expect.objectContaining({
    id: "worker-2",
    status: "running",
    report: "done\n<changed-files>\nsrc/c.ts\n</changed-files>",
    manifest: ["src/c.ts"],
  }));
});
