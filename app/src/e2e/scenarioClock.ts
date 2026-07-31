import type { ScenarioClock } from "./scenarioTypes";

export interface E2EClock {
  nowMs(): number;
}

export class PinnedScenarioClock implements E2EClock {
  private readonly initialNowMs: number;

  public constructor(clock: ScenarioClock) {
    this.initialNowMs = Date.parse(clock.now);
  }

  public nowMs(): number {
    return this.initialNowMs;
  }

  /** A pinned scenario never crosses a future boundary during one flow. */
  public scheduleAt(): () => void {
    return () => undefined;
  }
}
