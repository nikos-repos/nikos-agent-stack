import { readFileSync } from "node:fs";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const doctrine = readFileSync(new URL("./doctrine.md", import.meta.url), "utf8").trimEnd();

export default function nCodeMode(pi: ExtensionAPI): void {
	pi.on("before_agent_start", ({ systemPrompt }) => ({
		systemPrompt: [...systemPrompt, doctrine],
	}));
}
