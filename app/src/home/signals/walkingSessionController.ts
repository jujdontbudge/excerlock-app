import {
  isInsideActiveWindow,
  type ConfiguredCondition,
} from "@excerlock/condition-model";

import {
  createExcerlockMotionModuleClient,
  getLocationProvider,
  NativeMotionProvider,
  WalkVerifier,
  WALK_CADENCE_FRESHNESS_MS,
  type LocationProvider,
  type MotionProvider,
  type WalkVerdict,
} from "@/signals";
import { useHomeStore } from "../store/homeStore";
import { localWallClockNow } from "../model/clock";

const DAY_MS = 86_400_000;

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
  readonly wallClockNow?: () => number;
}

const IDLE: WalkingSessionSnapshot = Object.freeze({
  active: false,
  conditionId: null,
  walking: false,
});

/** Explicit-session owner for live walking verification and its keep-alive. */
export class WalkingSessionController {
  private activeWindowTimer: ReturnType<typeof setTimeout> | undefined;
  private cadenceExpiresAt: number | undefined;
  private readonly listeners = new Set<() => void>();
  private location:
    | Pick<LocationProvider, "startWalkKeepAlive" | "stopWalkKeepAlive">
    | undefined;
  private motion: MotionProvider | undefined;
  private snapshot: WalkingSessionSnapshot = IDLE;
  private timer: ReturnType<typeof setTimeout> | undefined;
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

  /** Ends native work when the condition owning this session no longer applies. */
  public async reconcileCondition(): Promise<void> {
    const conditionId = this.snapshot.conditionId;
    if (conditionId === null) {
      return;
    }
    const state = this.dependencies.getState();
    const condition = state.conditions.find(({ id }) => id === conditionId);
    const wallClockNow =
      this.dependencies.wallClockNow?.() ?? this.dependencies.now();
    if (
      condition?.catalogId !== "walking-state" ||
      condition.settings.kind !== "state" ||
      state.disabledConditionIds.includes(conditionId) ||
      !isInsideActiveWindow(
        condition.activeWindow,
        wallClockNow,
        Math.floor(wallClockNow / DAY_MS) * DAY_MS,
      )
    ) {
      await this.stop();
    }
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
    const wallClockNow =
      this.dependencies.wallClockNow?.() ?? this.dependencies.now();
    if (
      !isInsideActiveWindow(
        condition.activeWindow,
        wallClockNow,
        Math.floor(wallClockNow / DAY_MS) * DAY_MS,
      )
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
        this.applyVerdict(verifier.processActivity(sample));
      }),
      motion.on("cadence", (sample) => {
        this.cadenceExpiresAt =
          sample.asOf + WALK_CADENCE_FRESHNESS_MS + 1;
        this.applyVerdict(verifier.processCadence(sample));
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
    this.scheduleActiveWindowEnd(condition.activeWindow, wallClockNow);
    return true;
  }

  public async stop(): Promise<void> {
    if (this.activeWindowTimer !== undefined) {
      clearTimeout(this.activeWindowTimer);
      this.activeWindowTimer = undefined;
    }
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
    const motion = this.motion;
    const location = this.location;
    this.motion = undefined;
    this.location = undefined;
    this.verifier = undefined;
    this.cadenceExpiresAt = undefined;
    if (this.snapshot.active) {
      this.publish(IDLE);
    }
    await Promise.all([
      motion?.stop().catch(() => undefined),
      location?.stopWalkKeepAlive().catch(() => undefined),
    ]);
  }

  private applyVerdict(verdict: WalkVerdict): void {
    this.scheduleWatchdog(verdict);
    if (!verdict.isWalking && this.snapshot.walking) {
      void this.stop();
      return;
    }
    this.publishWalking(verdict.isWalking);
  }

  private scheduleActiveWindowEnd(
    window: ConfiguredCondition["activeWindow"],
    wallClockNow: number,
  ): void {
    if (window === undefined || window.endMinute === undefined) {
      return;
    }
    const endMinute = window.endMinute;
    const dayStart = Math.floor(wallClockNow / DAY_MS) * DAY_MS;
    const minute = (wallClockNow - dayStart) / 60_000;
    const crossesMidnight =
      window.startMinute !== undefined &&
      window.startMinute > endMinute;
    const endAt =
      dayStart +
      endMinute * 60_000 +
      (crossesMidnight && minute >= window.startMinute ? DAY_MS : 0);
    this.activeWindowTimer = setTimeout(() => {
      this.activeWindowTimer = undefined;
      void this.stop();
    }, Math.max(0, endAt - wallClockNow));
  }

  private scheduleWatchdog(verdict: WalkVerdict): void {
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    const evaluateAt = verdict.phase === "grace"
      ? verdict.graceEndsAt
      : verdict.phase === "verified"
        ? this.cadenceExpiresAt
        : undefined;
    if (evaluateAt === undefined) {
      return;
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      const verifier = this.verifier;
      if (verifier !== undefined) {
        this.applyVerdict(verifier.getVerdict(this.dependencies.now()));
      }
    }, Math.max(0, evaluateAt - this.dependencies.now()));
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

let sharedController: WalkingSessionController | undefined;

/** App-lifetime session; both sensor adapters remain lazy until start(). */
export function getWalkingSessionController(): WalkingSessionController {
  sharedController ??= new WalkingSessionController({
    createMotion: () =>
      new NativeMotionProvider(createExcerlockMotionModuleClient()),
    getLocation: () => getLocationProvider(),
    getState: () => useHomeStore.getState(),
    now: Date.now,
    wallClockNow: localWallClockNow,
  });
  return sharedController;
}

/** Installs fixture composition before E2E app surfaces mount. */
export function installWalkingSessionController(
  controller: WalkingSessionController,
): () => void {
  const previous = sharedController;
  sharedController = controller;
  return () => {
    if (sharedController === controller) {
      void controller.stop();
      sharedController = previous;
    }
  };
}
