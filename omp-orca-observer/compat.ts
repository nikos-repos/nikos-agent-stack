import type { ExtensionAgentIdentity, ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { OMP_FLOOR, type ObserverState } from "./contract.ts";
const [floorMajor, floorMinor, floorPatch] = OMP_FLOOR.split(".").map(Number);

/** Incompatibility leaves native work untouched and names the failed capability. */
export function checkCompat(pi: ExtensionAPI, agent: ExtensionAgentIdentity | undefined): ObserverState {
  let version: unknown;
  try {
    version = pi.pi.VERSION;
  } catch {
    version = undefined;
  }
  const parsed = typeof version === "string" ? /^(\d+)\.(\d+)\.(\d+)$/.exec(version) : null;
  if (
    !parsed ||
    Number(parsed[1]) < floorMajor ||
    (Number(parsed[1]) === floorMajor && Number(parsed[2]) < floorMinor) ||
    (Number(parsed[1]) === floorMajor && Number(parsed[2]) === floorMinor && Number(parsed[3]) < floorPatch)
  ) {
    return { state: "unavailable", reason: `incompatible: omp ${typeof version === "string" ? version : "unknown"} < ${OMP_FLOOR}` };
  }

  let registry: { list?: unknown; get?: unknown; onChange?: unknown } | null;
  try {
    registry = pi.pi.AgentRegistry.global();
  } catch {
    return { state: "unavailable", reason: "incompatible: AgentRegistry.global" };
  }
  for (const method of ["list", "get", "onChange"] as const) {
    try {
      if (typeof registry?.[method] !== "function") {
        return { state: "unavailable", reason: `incompatible: AgentRegistry.${method}` };
      }
    } catch {
      return { state: "unavailable", reason: `incompatible: AgentRegistry.${method}` };
    }
  }
  if (!agent || (agent.kind !== "main" && agent.kind !== "sub") || typeof agent.id !== "string") {
    return { state: "unavailable", reason: "incompatible: ctx.agent" };
  }
  try {
    if (typeof pi.pi.parseSessionContent !== "function") {
      return { state: "unavailable", reason: "incompatible: parseSessionContent" };
    }
  } catch {
    return { state: "unavailable", reason: "incompatible: parseSessionContent" };
  }
  try {
    if (typeof pi.events?.on !== "function") {
      return { state: "unavailable", reason: "incompatible: events.on" };
    }
  } catch {
    return { state: "unavailable", reason: "incompatible: events.on" };
  }
  return { state: "ready" };
}
