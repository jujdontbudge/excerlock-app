import {
  isInsideActiveWindow,
  type ConfiguredCondition,
} from "@excerlock/condition-model";

import {
  getLocationProvider,
  PhonePlacementClassifier,
  WalkVerifier,
  WALK_CADENCE_FRESHNESS_MS,
  type LocationProvider,
  type MotionProvider,
  type PhonePlacementProvider,
  type PhonePlacementResult,
  type WalkVerdict,
} from "@/signals";
import { useHomeStore } from "../store/homeStore";
import { localWallClockNow } from "../model/clock";
import { createWalkingMotionRuntime } from "./walkingMotionRuntime";
import { createWalkingPlacementRuntime } from "./walkingPlacementRuntime";

const DAY_MS = 86_400_000;
export const PICKUP_CADENCE_GRACE_MS = 20_000;
export const PROPPED_HANDOFF_MS = 60_000;

type WalkingConditionState = Readonly<{
  conditions: readonly ConfiguredCondition[];
  disabledConditionIds: readonly string[];
}>;

export type WalkingSessionSnapshot = Readonly<{
  active: boolean;
  conditionId: string | null;
  walking: boolean;
}>;

export type WalkingSessionMode = "handheld" | "propped";
export type TreadmillSessionPhase =
  | "scanning"
  | "propped"
  | "handheld"
  | "handoff";

export type TreadmillSessionSnapshot = Readonly<{
  mode: WalkingSessionMode | null;
  phase: TreadmillSessionPhase | null;
}>;

export interface WalkingSessionDependencies {
  readonly createMotion: () => MotionProvider;
  readonly createPlacement?: () => PhonePlacementProvider;
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

const TREADMILL_IDLE: TreadmillSessionSnapshot = Object.freeze({
  mode: null,
  phase: null,
});

/** Explicit-session owner for live walking verification and its keep-alive. */
export class WalkingSessionController {
  private activeWindowTimer: ReturnType<typeof setTimeout> | undefined;
  private cadenceExpiresAt: number | undefined;
  private readonly listeners = new Set<() => void>();
  private location:
    | Pick<LocationProvider, "startWalkKeepAlive" | "stopWalkKeepAlive">
    | undefined;
  private handoffTimer: ReturnType<typeof setTimeout> | undefined;
  private motion: MotionProvider | undefined;
  private placement: PhonePlacementProvider | undefined;
  private placementClassifier: PhonePlacementClassifier | undefined;
  private pickupCadenceTimer: ReturnType<typeof setTimeout> | undefined;
  private proppedExitGraceMs: number | undefined;
  private proppedExitTimer: ReturnType<typeof setTimeout> | undefined;
  private proppedMotionVerified = false;
  private snapshot: WalkingSessionSnapshot = IDLE;
  private treadmillSnapshot: TreadmillSessionSnapshot = TREADMILL_IDLE;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private unsubscribes: (() => void)[] = [];
  private verifier: WalkVerifier | undefined;

  public constructor(
    private readonly dependencies: WalkingSessionDependencies,
  ) {}

  public getSnapshot(): WalkingSessionSnapshot {
    return this.snapshot;
  }

  public getTreadmillSnapshot(): TreadmillSessionSnapshot {
    return this.treadmillSnapshot;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Records a foreground gait-verification success from the scan screen. */
  public completeProppedScan(): boolean {
    if (
      !this.snapshot.active ||
      this.treadmillSnapshot.mode !== "propped" ||
      this.treadmillSnapshot.phase !== "scanning"
    ) {
      return false;
    }
    this.treadmillSnapshot = Object.freeze({
      mode: "propped",
      phase: "propped",
    });
    if (this.handoffTimer !== undefined) {
      clearTimeout(this.handoffTimer);
      this.handoffTimer = undefined;
    }
    this.proppedMotionVerified = false;
    this.publishWalking(true);
    return true;
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

  public async start(
    conditionId: string,
    mode: WalkingSessionMode = "handheld",
  ): Promise<boolean> {
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
    const placement = mode === "propped"
      ? this.dependencies.createPlacement?.()
      : undefined;
    if (mode === "propped" && placement === undefined) {
      throw new Error("Propped walking requires a phone-placement provider");
    }
    const location = this.dependencies.getLocation();
    await location.startWalkKeepAlive();
    const verifier = new WalkVerifier({
      gracePeriodMs: condition.settings.exitGraceMs,
    });
    this.motion = motion;
    this.placement = placement;
    this.location = location;
    this.verifier = verifier;
    this.proppedExitGraceMs = mode === "propped"
      ? condition.settings.exitGraceMs
      : undefined;
    this.proppedMotionVerified = false;
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
    if (placement !== undefined) {
      const placementClassifier = new PhonePlacementClassifier();
      this.placementClassifier = placementClassifier;
      this.unsubscribes.push(
        placement.onSample((sample) => {
          this.applyPlacement(placementClassifier.process(sample));
        }),
      );
    }
    this.treadmillSnapshot = Object.freeze({
      mode,
      phase: mode === "propped" ? "scanning" : null,
    });
    this.publish({
      active: true,
      conditionId,
      walking: false,
    });
    try {
      await motion.start();
      await placement?.start();
    } catch (error) {
      this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
      this.motion = undefined;
      this.placement = undefined;
      this.placementClassifier = undefined;
      this.location = undefined;
      this.verifier = undefined;
      this.treadmillSnapshot = TREADMILL_IDLE;
      this.publish(IDLE);
      await Promise.all([
        motion.stop().catch(() => undefined),
        placement?.stop().catch(() => undefined),
        location.stopWalkKeepAlive().catch(() => undefined),
      ]);
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
    if (this.pickupCadenceTimer !== undefined) {
      clearTimeout(this.pickupCadenceTimer);
      this.pickupCadenceTimer = undefined;
    }
    if (this.proppedExitTimer !== undefined) {
      clearTimeout(this.proppedExitTimer);
      this.proppedExitTimer = undefined;
    }
    if (this.handoffTimer !== undefined) {
      clearTimeout(this.handoffTimer);
      this.handoffTimer = undefined;
    }
    this.unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
    const motion = this.motion;
    const placement = this.placement;
    const location = this.location;
    this.motion = undefined;
    this.placement = undefined;
    this.placementClassifier = undefined;
    this.location = undefined;
    this.verifier = undefined;
    this.cadenceExpiresAt = undefined;
    this.proppedExitGraceMs = undefined;
    this.proppedMotionVerified = false;
    this.treadmillSnapshot = TREADMILL_IDLE;
    if (this.snapshot.active) {
      this.publish(IDLE);
    }
    await Promise.all([
      motion?.stop().catch(() => undefined),
      placement?.stop().catch(() => undefined),
      location?.stopWalkKeepAlive().catch(() => undefined),
    ]);
  }

  private applyVerdict(verdict: WalkVerdict): void {
    if (this.treadmillSnapshot.mode === "propped") {
      this.applyProppedVerdict(verdict);
      return;
    }
    this.scheduleWatchdog(verdict);
    if (!verdict.isWalking && this.snapshot.walking) {
      void this.stop();
      return;
    }
    if (
      verdict.phase === "verified" &&
      verdict.isWalking &&
      this.snapshot.walking
    ) {
      this.notifyListeners();
      return;
    }
    this.publishWalking(verdict.isWalking);
  }

  private applyProppedVerdict(verdict: WalkVerdict): void {
    if (this.treadmillSnapshot.phase !== "handheld") {
      return;
    }
    if (verdict.phase === "verified") {
      this.proppedMotionVerified = true;
      if (this.pickupCadenceTimer !== undefined) {
        clearTimeout(this.pickupCadenceTimer);
        this.pickupCadenceTimer = undefined;
      }
      if (this.proppedExitTimer !== undefined) {
        clearTimeout(this.proppedExitTimer);
        this.proppedExitTimer = undefined;
      }
      this.scheduleWatchdog(verdict);
      this.notifyListeners();
      return;
    }
    if (!this.proppedMotionVerified) {
      return;
    }
    this.scheduleWatchdog(verdict);
    if (!verdict.isWalking) {
      void this.stop();
    }
  }

  private applyPlacement(result: PhonePlacementResult): void {
    if (
      this.treadmillSnapshot.phase === "propped" &&
      result.transition?.kind === "pickedUp"
    ) {
      this.treadmillSnapshot = Object.freeze({
        mode: "propped",
        phase: "handheld",
      });
      this.pickupCadenceTimer = setTimeout(() => {
        this.pickupCadenceTimer = undefined;
        this.startProppedExitGrace();
      }, PICKUP_CADENCE_GRACE_MS);
      this.notifyListeners();
      return;
    }
    if (
      this.treadmillSnapshot.phase === "handheld" &&
      result.transition?.kind === "setDown"
    ) {
      if (this.pickupCadenceTimer !== undefined) {
        clearTimeout(this.pickupCadenceTimer);
        this.pickupCadenceTimer = undefined;
      }
      if (this.proppedExitTimer !== undefined) {
        clearTimeout(this.proppedExitTimer);
        this.proppedExitTimer = undefined;
      }
      if (this.timer !== undefined) {
        clearTimeout(this.timer);
        this.timer = undefined;
      }
      this.proppedMotionVerified = false;
      this.treadmillSnapshot = Object.freeze({
        mode: "propped",
        phase: "handoff",
      });
      this.handoffTimer = setTimeout(() => {
        this.handoffTimer = undefined;
        if (this.treadmillSnapshot.phase !== "handoff") {
          return;
        }
        this.treadmillSnapshot = Object.freeze({
          mode: "propped",
          phase: "scanning",
        });
        this.publishWalking(false);
      }, PROPPED_HANDOFF_MS);
      this.notifyListeners();
    }
  }

  private startProppedExitGrace(): void {
    const exitGraceMs = this.proppedExitGraceMs;
    if (
      exitGraceMs === undefined ||
      this.treadmillSnapshot.phase !== "handheld"
    ) {
      return;
    }
    this.proppedExitTimer = setTimeout(() => {
      this.proppedExitTimer = undefined;
      void this.stop();
    }, exitGraceMs);
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
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener());
  }
}

let sharedController: WalkingSessionController | undefined;

/** App-lifetime session; both sensor adapters remain lazy until start(). */
export function getWalkingSessionController(): WalkingSessionController {
  let sessionNow = Date.now;
  sharedController ??= new WalkingSessionController({
    createMotion: () => {
      const runtime = createWalkingMotionRuntime();
      sessionNow = runtime.now;
      return runtime.provider;
    },
    createPlacement: () => createWalkingPlacementRuntime(),
    getLocation: () => getLocationProvider(),
    getState: () => useHomeStore.getState(),
    now: () => sessionNow(),
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
