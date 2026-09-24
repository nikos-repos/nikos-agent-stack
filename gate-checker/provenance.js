import { extractManifest, isRecord, isText } from "./predicates.js";

function manifest(result) {
  const structured = isRecord(result.structuredOutput) ? result.structuredOutput.data : undefined;
  const files = structured === undefined ? null : extractManifest(JSON.stringify(structured));
  return files ?? extractManifest(String(result.output ?? ""));
}

export function provenancefromdetails(details) {
  if (!isRecord(details) || !Array.isArray(details.results)) return [];
  return details.results
    .filter((result) => isRecord(result) && isText(result.id))
    .map((result) => ({ id: result.id, report: String(result.output ?? ""), manifest: manifest(result) }));
}

export function provenancefromevent(payload) {
  if (!isRecord(payload) || !isText(payload.id) || !isRecord(payload.event) ||
      payload.event.type !== "message_end" || !isRecord(payload.event.message) ||
      payload.event.message.role !== "assistant") return null;
  const content = payload.event.message.content;
  const report = Array.isArray(content)
    ? content.filter((item) => isRecord(item) && item.type === "text").map((item) => String(item.text ?? "")).join("\n")
    : String(content ?? "");
  return report ? { id: payload.id, report, manifest: extractManifest(report) } : null;
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
