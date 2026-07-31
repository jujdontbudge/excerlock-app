import type { ConfiguredCondition } from "@excerlock/condition-model";

import type {
  LocationProvider,
  MotionProvider,
} from "@/signals";

type WalkingConditionState = Readonly<{
  conditions: readonly ConfiguredCondition[];
  disabledConditionIds: readonly string[];
}>;

export type WalkingSessionSnapshot = Readonly<{
  active: boolean;
  conditionId: string | null;
  walking: boolean;
}>;

export interface WalkingSessionDependencies {
  readonly createMotion: () => MotionProvider;
  readonly getLocation: () => Pick<
    LocationProvider,
    "startWalkKeepAlive" | "stopWalkKeepAlive"
  >;
  readonly getState: () => WalkingConditionState;
  readonly now: () => number;
}

const IDLE: WalkingSessionSnapshot = Object.freeze({
  active: false,
  conditionId: null,
  walking: false,
});

/** Explicit-session owner for live walking verification and its keep-alive. */
export class WalkingSessionController {
  private snapshot: WalkingSessionSnapshot = IDLE;

  public constructor(
    private readonly dependencies: WalkingSessionDependencies,
  ) {}

  public getSnapshot(): WalkingSessionSnapshot {
    return this.snapshot;
  }

  public async start(conditionId: string): Promise<boolean> {
    const state = this.dependencies.getState();
    const condition = state.conditions.find(({ id }) => id === conditionId);
    if (
      condition?.catalogId !== "walking-state" ||
      condition.settings.kind !== "state" ||
      state.disabledConditionIds.includes(conditionId)
    ) {
      return false;
    }

    return false;
  }
}
