import { createstopslot } from "../stop-slot.ts";

export type { StopDecision } from "../stop-slot.ts";

const slot = createstopslot("questionnaire");

export const installQuestionnaireStop = slot.install;
export const resetQuestionnaireStop = slot.release;
export const questionnaireStop = slot.decide;
