import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import * as prompt from "@oh-my-pi/pi-utils/prompt";
import { getAgentDir } from "@oh-my-pi/pi-utils/dirs";

export default function (pi: ExtensionAPI) {
	pi.on("context", async ({ messages }, ctx) => {
		if (!messages.some(m => m.role === "custom" && m.customType === "orchestrate-notice")) return;

		try {
			let template: string;
			try {
				template = await readFile(join(getAgentDir(), "extensions/orchestrate-prompt/prompt.md"), "utf8");
			} catch (error) {
				if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
				template = await readFile(new URL("./prompt.md", import.meta.url), "utf8");
			}
			const content = prompt.render(template, { tools: pi.getActiveTools() }).trim();
			if (!content) throw new Error("orchestration prompt is empty");
			return {
				messages: messages.map(m =>
					m.role === "custom" && m.customType === "orchestrate-notice" ? { ...m, content } : m,
				),
			};
		} catch (error) {
			ctx.abort();
			throw error;
		}
	});
}
