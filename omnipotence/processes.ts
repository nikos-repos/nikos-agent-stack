import type { orchestrationmode } from "./contracts.ts";

export interface modeconfiguration {
	execute: boolean;
	optionalbreakpoints: boolean;
	persistent: boolean;
}

const policies: Record<orchestrationmode, Readonly<modeconfiguration>> = {
	babysit: Object.freeze({ execute: true, optionalbreakpoints: true, persistent: false }),
	plan: Object.freeze({ execute: false, optionalbreakpoints: false, persistent: false }),
	yolo: Object.freeze({ execute: true, optionalbreakpoints: false, persistent: false }),
	forever: Object.freeze({ execute: true, optionalbreakpoints: false, persistent: true }),
};

export const publicmodes = Object.freeze(Object.keys(policies) as orchestrationmode[]);

export function modepolicy(mode: orchestrationmode): Readonly<modeconfiguration> {
	if (!Object.hasOwn(policies, mode)) throw new TypeError(`unsupported orchestration mode ${mode}`);
	return policies[mode];
}
