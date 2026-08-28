// the single session_stop owner is gate-checker: the harness runner returns on the
// first qualifying continuation, so precedence must be a line of code in one owner
// rather than a property of module load order. this module is the seam. it holds no
// engine and opens no database — the extension factory installs its own closure here,
// which keeps one sqlite handle and one `pi` instance.
//
// load order is irrelevant by construction: every extension factory runs at load, and
// the first session_stop fires strictly later, so the slot is always filled by then.
export type StopDecision =
	| { decision: "block"; reason: string }
	| { continue: true; additionalContext?: string }
	| undefined;

type StopFn = (event: unknown, context: unknown) => Promise<StopDecision> | StopDecision;

let installed: StopFn | null = null;

/** called once by the extension factory. write-once: a second install is a wiring bug. */
export function installOmnipotenceStop(fn: StopFn): void {
	if (installed) throw new Error("omnipotence stop decision already installed");
	installed = fn;
}

/** test-only: release the slot so a fresh factory can install. */
export function resetOmnipotenceStop(): void {
	installed = null;
}

export async function omnipotenceStop(event: unknown, context: unknown): Promise<StopDecision> {
	return installed ? await installed(event, context) : undefined;
}
