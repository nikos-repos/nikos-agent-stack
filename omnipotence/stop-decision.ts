import { createstopslot } from "../stop-slot.ts";

export type { StopDecision } from "../stop-slot.ts";

const slot = createstopslot("omnipotence");

export const installOmnipotenceStop = slot.install;
export const resetOmnipotenceStop = slot.release;
export const omnipotenceStop = slot.decide;
