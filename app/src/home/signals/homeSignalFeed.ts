import type { Signal } from "@excerlock/condition-model";

import {
  WALK_CADENCE_FRESHNESS_MS,
  WalkVerifier,
  type HealthProvider,
  type HealthSignal,
  type MotionProvider,
  type WalkVerdict,
} from "@/signals";

import type { SignalReading } from "../model/reading";

/**
 * Home's window onto SignalKit.
 *
 * It flattens the provider interfaces into the one snapshot the cards need, and
 * it is the only place that knows a HealthKit quantity type maps to a condition
 * signal. Home never touches a provider directly, so swapping fixtures for the
 * Phase-3 native implementations changes only the composition root.
 */
export interface HomeSignalFeed {
  /** Begin live delivery. Denied permissions leave the feed readable and empty. */
  start(): Promise<void>;
  read(): Promise<SignalReading>;
  subscribe(listener: (reading: SignalReading) => void): () => void;
  dispose(): void;
}

/**
 * `walkingRunningDistance` backs the catalog's run-distance entries — HealthKit
 * publishes one distance series for both gaits (research #17).
 */
const HEALTH_SIGNALS: Readonly<Record<HealthSignal, Signal>> = {
  steps: "steps",
  activeEnergy: "activeCalories",
  appleExerciseTime: "activeMinutes",
  walkingRunningDistance: "runDistance",
  cyclingDistance: "cycleDistance",
  swimmingDistance: "swimDistance",
  workout: "workoutDuration",
};

export interface HomeSignalProviders {
  readonly health: HealthProvider;
  readonly motion: MotionProvider;
  readonly walking: WalkingVerificationOptions | null;
}

export interface WalkingVerificationOptions {
  readonly gracePeriodMs: number;
  readonly now: () => number;
}

export function createHomeSignalFeed({
  health,
  motion,
  walking,
}: HomeSignalProviders): HomeSignalFeed {
  const listeners = new Set<(reading: SignalReading) => void>();
  const unsubscribes: (() => void)[] = [];
  const walkVerifier = walking === null
    ? null
    : new WalkVerifier({ gracePeriodMs: walking.gracePeriodMs });
  let walkingTimer: ReturnType<typeof setTimeout> | undefined;
  let motionStarted = false;

  async function read(): Promise<SignalReading> {
    const entries = await Promise.all(
      (Object.keys(HEALTH_SIGNALS) as HealthSignal[]).map(
        async (healthSignal) =>
          [HEALTH_SIGNALS[healthSignal], await health.getTodayTotal(healthSignal)] as const,
      ),
    );

    return {
      totals: Object.fromEntries(entries) as SignalReading["totals"],
      activeSignals: activeSignals(walkVerifier, walking?.now()),
    };
  }

  function publish(): void {
    if (listeners.size === 0) {
      return;
    }
    void read().then((reading) => {
      listeners.forEach((listener) => listener(reading));
    });
  }

  function scheduleWalkingEvaluation(
    verdict: WalkVerdict,
    cadenceExpiresAt?: number,
  ): void {
    if (walkingTimer !== undefined) {
      clearTimeout(walkingTimer);
      walkingTimer = undefined;
    }
    if (walking === null || walkVerifier === null) {
      return;
    }

    const evaluateAt = verdict.phase === "grace"
      ? verdict.graceEndsAt
      : verdict.phase === "verified"
        ? cadenceExpiresAt
        : undefined;
    if (evaluateAt === undefined) {
      return;
    }

    walkingTimer = setTimeout(() => {
      walkingTimer = undefined;
      const nextVerdict = walkVerifier.getVerdict(walking.now());
      scheduleWalkingEvaluation(nextVerdict);
      publish();
    }, Math.max(0, evaluateAt - walking.now()));
  }

  return {
    async start() {
      await health.requestAuth();
      const healthSignals = Object.keys(HEALTH_SIGNALS) as HealthSignal[];
      await Promise.all(
        healthSignals.map((healthSignal) =>
          health.getNewSamples(healthSignal, null).catch(() => undefined),
        ),
      );
      for (const healthSignal of healthSignals) {
        unsubscribes.push(health.onChange(healthSignal, publish));
      }
      if (walkVerifier !== null) {
        unsubscribes.push(
          motion.on("activity", (sample) => {
            scheduleWalkingEvaluation(walkVerifier.processActivity(sample));
            publish();
          }),
          motion.on("cadence", (sample) => {
            scheduleWalkingEvaluation(
              walkVerifier.processCadence(sample),
              sample.asOf + WALK_CADENCE_FRESHNESS_MS + 1,
            );
            publish();
          }),
        );
        // A refused motion authorization is a normal state, not a crash: the
        // cards simply never go live. Permissions repair belongs to Settings.
        await motion.start().then(
          () => {
            motionStarted = true;
          },
          () => undefined,
        );
      }
    },

    read,

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    dispose() {
      if (walkingTimer !== undefined) {
        clearTimeout(walkingTimer);
        walkingTimer = undefined;
      }
      unsubscribes.splice(0).forEach((unsubscribe) => unsubscribe());
      listeners.clear();
      if (motionStarted) {
        motionStarted = false;
        void motion.stop().catch(() => undefined);
      }
    },
  };
}

function activeSignals(
  verifier: WalkVerifier | null,
  atMs: number | undefined,
): readonly Signal[] {
  return verifier !== null && atMs !== undefined && verifier.getVerdict(atMs).isWalking
    ? ["walking"]
    : [];
}
