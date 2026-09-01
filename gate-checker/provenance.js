import { extractManifest, isRecord, isText } from "./predicates.js";

const text = (value) => isText(value) && value.length ? value : null;
function manifest(result) {
  const structured = isRecord(result.structuredOutput) ? result.structuredOutput.data : undefined;
  if (structured !== undefined) {
    const files = extractManifest(JSON.stringify(structured));
    if (files !== null) return { files, source: "structured" };
  }
  const files = extractManifest(String(result.output ?? ""));
  return { files, source: files === null ? null : "report" };
}
function status(result) {
  return result.aborted ? "aborted" : result.exitCode === 0 ? "completed" : "failed";
}

export function provenancefromdetails(task_call_id, details) {
  if (!isRecord(details) || !Array.isArray(details.results)) return [];
  return details.results.filter((result) => isRecord(result) && isText(result.id)).map((result) => {
    const changed = manifest(result);
    return {
      task_call_id: task_call_id || null,
      id: result.id,
      agent: text(result.agent),
      status: status(result),
      exit_code: Number.isInteger(result.exitCode) ? result.exitCode : null,
      error: text(result.error) || text(result.abortReason),
      duration_ms: Number.isFinite(result.durationMs) ? result.durationMs : null,
      model: text(result.resolvedModel),
      session_file: null,
      output_path: text(result.outputPath),
      patch_path: text(result.patchPath),
      branch_name: text(result.branchName),
      branch_base_sha: text(result.branchBaseSha),
      report: String(result.output ?? ""),
      manifest: changed.files,
      manifest_source: changed.source,
    };
  });
}

export function provenancefromevent(payload) {
  if (!isRecord(payload) || !isText(payload.id) || !isRecord(payload.event) ||
      payload.event.type !== "message_end" || !isRecord(payload.event.message) ||
      payload.event.message.role !== "assistant") return null;
  const content = payload.event.message.content;
  const report = Array.isArray(content)
    ? content.filter((item) => isRecord(item) && item.type === "text").map((item) => String(item.text ?? "")).join("\n")
    : String(content ?? "");
  if (!report) return null;
  const files = extractManifest(report);
  return {
    task_call_id: null, id: payload.id, agent: null, status: "running", exit_code: null,
    error: null, duration_ms: null, model: null, session_file: null, output_path: null,
    patch_path: null, branch_name: null, branch_base_sha: null, report,
    manifest: files, manifest_source: files === null ? null : "report",
  };
}

export function provenancefromlifecycle(payload) {
  if (!isRecord(payload) || !isText(payload.id)) return null;
  return {
    task_call_id: text(payload.parentToolCallId), id: payload.id, agent: text(payload.agent),
    status: text(payload.status) || "unknown", exit_code: null, error: null, duration_ms: null,
    model: null, session_file: text(payload.sessionFile), output_path: null, patch_path: null,
    branch_name: null, branch_base_sha: null, report: "", manifest: null, manifest_source: null,
  };
}

export function mergeprovenance(records, incoming) {
  if (!incoming) return records;
  const index = records.findIndex((record) => record.id === incoming.id);
  if (index < 0) return [...records, incoming];
  const current = records[index];
  const merged = {};
  for (const key of new Set([...Object.keys(current), ...Object.keys(incoming)])) {
    const value = incoming[key];
    merged[key] = value === null || value === "" ? current[key] ?? value : value;
  }
  return records.map((record, item) => item === index ? merged : record);
}
