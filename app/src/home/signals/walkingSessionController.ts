import type { ConfiguredCondition } from "@excerlock/condition-model";

import type {
  LocationProvider,
  MotionProvider,
} from "@/signals";
import { WalkVerifier } from "@/signals";

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
  private readonly listeners = new Set<() => void>();
  private location:
    | Pick<LocationProvider, "startWalkKeepAlive" | "stopWalkKeepAlive">
    | undefined;
  private motion: MotionProvider | undefined;
  private snapshot: WalkingSessionSnapshot = IDLE;
  private unsubscribes: (() => void)[] = [];
  private verifier: WalkVerifier | undefined;

  public constructor(
    private readonly dependencies: WalkingSessionDependencies,
  ) {}

  public getSnapshot(): WalkingSessionSnapshot {
    return this.snapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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

    if (this.snapshot.active) {
      return this.snapshot.conditionId === conditionId;
    }

    const motion = this.dependencies.createMotion();
    const location = this.dependencies.getLocation();
    await location.startWalkKeepAlive();
    const verifier = new WalkVerifier({
      gracePeriodMs: condition.settings.exitGraceMs,
    });
    this.motion = motion;
    this.location = location;
    this.verifier = verifier;
    this.unsubscribes = [
      motion.on("activity", (sample) => {
        this.publishWalking(verifier.processActivity(sample).isWalking);
      }),
      motion.on("cadence", (sample) => {
        this.publishWalking(verifier.processCadence(sample).isWalking);
      }),
    ];
    this.publish({
      active: true,
      conditionId,
      walking: false,
    });
    try {
      await motion.start();
    } catch (error) {
      this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
      this.motion = undefined;
      this.location = undefined;
      this.verifier = undefined;
      this.publish(IDLE);
      await location.stopWalkKeepAlive().catch(() => undefined);
      throw error;
    }
    return true;
  }

  private publishWalking(walking: boolean): void {
    if (!this.snapshot.active || this.snapshot.walking === walking) {
      return;
    }
    this.publish({ ...this.snapshot, walking });
  }

  private publish(snapshot: WalkingSessionSnapshot): void {
    this.snapshot = Object.freeze(snapshot);
    this.listeners.forEach((listener) => listener());
  }
}
