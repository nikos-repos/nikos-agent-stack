import { readFileSync } from "node:fs";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const ladder = readFileSync(new URL("./doctrine.md", import.meta.url), "utf8")
	.split("\nContracts\n", 1)[0]
	.trimEnd();

export default function nCodeMode(pi: ExtensionAPI): void {
	pi.on("before_agent_start", ({ systemPrompt }) => ({
		systemPrompt: [...systemPrompt, ladder],
	}));
}
