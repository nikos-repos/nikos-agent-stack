import type { orchestrationmode } from "./contracts.ts";

export type publicpolicy = orchestrationmode | "resume";

export interface modeconfiguration {
	execute: boolean;
	optionalbreakpoints: boolean;
	persistent: boolean;
}

const policies: Record<publicpolicy, Readonly<modeconfiguration>> = {
	babysit: Object.freeze({ execute: true, optionalbreakpoints: true, persistent: false }),
	call: Object.freeze({ execute: true, optionalbreakpoints: true, persistent: false }),
	plan: Object.freeze({ execute: false, optionalbreakpoints: false, persistent: false }),
	yolo: Object.freeze({ execute: true, optionalbreakpoints: false, persistent: false }),
	forever: Object.freeze({ execute: true, optionalbreakpoints: false, persistent: true }),
	resume: Object.freeze({ execute: true, optionalbreakpoints: true, persistent: false }),
};

export const publicmodes = Object.freeze(Object.keys(policies) as publicpolicy[]);

export function modepolicy(mode: publicpolicy): Readonly<modeconfiguration> {
	if (!Object.hasOwn(policies, mode)) throw new TypeError(`unsupported orchestration mode ${mode}`);
	return policies[mode];
}
