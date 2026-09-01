export type StopDecision =
  | { decision: "block"; reason: string }
  | { continue: true; additionalContext?: string }
  | undefined;

export type StopEvent = { timestamp?: number };
export type StopContext = { cwd: string };
type StopFn = (event: StopEvent, context: StopContext) => Promise<StopDecision> | StopDecision;

export interface stopslot {
  install(fn: StopFn): void;
  release(): void;
  decide(event: StopEvent, context: StopContext): Promise<StopDecision>;
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
      return installed ? installed(event, context) : undefined;
    },
  };
}
