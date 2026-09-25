import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import { installadvisor } from "./install.js";

// registers /advisor-install; terra itself is a native omp watchdog advisor, not an extension.
export default function advisor(pi: ExtensionAPI): void {
  pi.registerCommand("advisor-install", {
    description: "install or update the bundled advisor (optional model selector)",
    handler: async (args, context) => {
      try {
        const file = installadvisor(args.trim() || undefined);
        context.ui.notify(
          `advisor install: installed terra at ${file}\nstart a new omp session to activate the advisor`,
          "info",
        );
      } catch (error) {
        context.ui.notify(`advisor install: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    },
  });
}
