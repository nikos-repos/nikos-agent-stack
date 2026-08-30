// the single session_stop owner is gate-checker: the harness runner returns on the
// first qualifying continuation, so precedence must be a line of code in one owner
// rather than a property of module load order. each extension owns a slot here. a slot
// holds no engine and opens no database — the extension factory installs its own closure,
// which keeps that extension's single sqlite handle and single `pi` instance.
//
// load order is irrelevant by construction: every extension factory runs at load, and
// the first session_stop fires strictly later, so the slot is always filled by then.
//
// the slots stay independent on purpose. one shared cell would let whichever extension
// loaded last silently win the precedence the gate-checker chain spells out explicitly.
export type StopDecision =
	| { decision: "block"; reason: string }
	| { continue: true; additionalContext?: string }
	| undefined;

type StopFn = (event: unknown, context: unknown) => Promise<StopDecision> | StopDecision;

export interface stopslot {
	/** called once by the extension factory. write-once: a second install is a wiring bug. */
	install(fn: StopFn): void;
	/** releases the slot: the production session_shutdown path, and tests building a fresh factory. */
	release(): void;
	decide(event: unknown, context: unknown): Promise<StopDecision>;
}

export function createstopslot(owner: string): stopslot {
	let installed: StopFn | null = null;
	return {
		install(fn) {
			if (installed) throw new Error(`${owner} stop decision already installed`);
			installed = fn;
		},
		release() {
			installed = null;
		},
		async decide(event, context) {
			return installed ? await installed(event, context) : undefined;
		},
	};
}
