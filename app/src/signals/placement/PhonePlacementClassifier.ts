import type {
  DeviceMotionSample,
  MotionVector3,
} from "./PhonePlacementProvider";

export const PLACEMENT_OBSERVATION_WINDOW_MS = 1_000;
/** Set-down: a propped phone must read propped this long before it counts. */
export const PLACEMENT_TRANSITION_DEBOUNCE_MS = 1_500;
/** Pickup: a real pickup stays in hand far longer than a console rattle. */
export const PICKUP_DEBOUNCE_MS = 3_000;

const INITIAL_PLACEMENT_DEBOUNCE_MS = 400;
const MIN_SAMPLE_PAIRS = 8;
/** Per-window features are pooled over this horizon before deciding. */
const FEATURE_HORIZON_MS = 3_000;
const GRAVITY_STILL_DELTA = 0.006;
const GYRO_STILL_DELTA = 0.11;
const PROPPED_EVIDENCE_RATIO = 0.8;
/**
 * Measured on a physical treadmill (2026-09-05, #128): a hand holding a phone
 * while walking swings gravity by ≥0.039 g per second in 95 % of windows and
 * rotates at a median ≥0.32 rad/s, whereas a phone propped on the running
 * console stays within 0.015 g and 0.26 rad/s except for sub-second jolts.
 * The medians below sit between those bands; the pooled horizon absorbs the
 * jolts.
 */
const IN_HAND_GRAVITY_RANGE = 0.03;
const IN_HAND_ROTATION_RATE = 0.45;

export type PhonePlacement = "propped" | "inHand" | "unknown";
export type PhonePlacementTransitionKind = "pickedUp" | "setDown";

export interface PhonePlacementTransition {
  readonly kind: PhonePlacementTransitionKind;
  readonly timestampMs: number;
}

export interface PhonePlacementResult {
  readonly placement: PhonePlacement;
  readonly transition: PhonePlacementTransition | null;
  readonly evaluatedAtMs: number | null;
}

interface PendingPlacement {
  readonly placement: Exclude<PhonePlacement, "unknown">;
  readonly sinceMs: number;
}

interface PlacementCandidate {
  readonly placement: PhonePlacement;
  readonly initialDebounceMs: number;
}

interface WindowFeatures {
  readonly timestampMs: number;
  /** Largest deviation of gravity from the window mean, in g. */
  readonly gravityRange: number;
  /** Median rotation-rate magnitude, rad/s. */
  readonly rotationRate: number;
  readonly quietAndStill: boolean;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

function magnitude(vector: MotionVector3): number {
  return Math.sqrt(
    vector.x * vector.x + vector.y * vector.y + vector.z * vector.z,
  );
}

function distance(left: MotionVector3, right: MotionVector3): number {
  return magnitude({
    x: left.x - right.x,
    y: left.y - right.y,
    z: left.z - right.z,
  });
}

export class PhonePlacementClassifier {
  private placement: PhonePlacement = "unknown";
  private pending: PendingPlacement | undefined;
  private samples: DeviceMotionSample[] = [];
  private features: WindowFeatures[] = [];
  private observationStartedAtMs: number | null = null;
  private evaluatedAtMs: number | null = null;

  public process(sample: DeviceMotionSample): PhonePlacementResult {
    if (
      this.evaluatedAtMs !== null &&
      sample.timestampMs <= this.evaluatedAtMs
    ) {
      throw new Error("Device-motion samples must have increasing timestamps");
    }
    this.observationStartedAtMs ??= sample.timestampMs;
    this.evaluatedAtMs = sample.timestampMs;
    this.samples.push(sample);
    const windowStartsAt = sample.timestampMs - PLACEMENT_OBSERVATION_WINDOW_MS;
    this.samples = this.samples.filter(
      ({ timestampMs }) => timestampMs >= windowStartsAt,
    );

    const candidateResult = this.classifyWindow();
    const candidate = candidateResult.placement;
    if (candidate === "unknown") {
      this.pending = undefined;
      return this.result(null);
    }
    if (this.placement === "unknown") {
      if (candidateResult.initialDebounceMs === 0) {
        this.placement = candidate;
        this.pending = undefined;
        return this.result(null);
      }
      if (this.pending?.placement !== candidate) {
        this.pending = { placement: candidate, sinceMs: sample.timestampMs };
        return this.result(null);
      }
      if (
        sample.timestampMs - this.pending.sinceMs <
        candidateResult.initialDebounceMs
      ) {
        return this.result(null);
      }
      this.placement = candidate;
      this.pending = undefined;
      return this.result(null);
    }
    if (candidate === this.placement) {
      this.pending = undefined;
      return this.result(null);
    }

    if (this.pending?.placement !== candidate) {
      this.pending = { placement: candidate, sinceMs: sample.timestampMs };
      return this.result(null);
    }
    // Leaving propped mode costs more evidence than entering it: short bursts
    // recur on a running console, while a real pickup remains in-hand for far
    // longer than this hysteresis window.
    const debounceMs =
      candidate === "inHand"
        ? PICKUP_DEBOUNCE_MS
        : PLACEMENT_TRANSITION_DEBOUNCE_MS;
    if (sample.timestampMs - this.pending.sinceMs < debounceMs) {
      return this.result(null);
    }

    const previous = this.placement;
    this.placement = candidate;
    this.pending = undefined;
    return this.result({
      kind: previous === "propped" ? "pickedUp" : "setDown",
      timestampMs: sample.timestampMs,
    });
  }

  public getResult(): PhonePlacementResult {
    return this.result(null);
  }

  private classifyWindow(): PlacementCandidate {
    if (
      this.samples.length < MIN_SAMPLE_PAIRS + 1 ||
      this.observationStartedAtMs === null ||
      this.evaluatedAtMs === null ||
      this.evaluatedAtMs - this.observationStartedAtMs <
        PLACEMENT_OBSERVATION_WINDOW_MS
    ) {
      return { placement: "unknown", initialDebounceMs: 0 };
    }

    const window = this.samples;
    const pairs = window.length - 1;
    let gravityStillEvidence = 0;
    let gyroStillEvidence = 0;
    const mean = { x: 0, y: 0, z: 0 };
    for (const { gravity } of window) {
      mean.x += gravity.x / window.length;
      mean.y += gravity.y / window.length;
      mean.z += gravity.z / window.length;
    }
    let gravityRange = 0;
    const rotationRates: number[] = [];
    for (let index = 0; index < window.length; index += 1) {
      const current = window[index];
      gravityRange = Math.max(gravityRange, distance(current.gravity, mean));
      rotationRates.push(magnitude(current.rotationRate));
      if (index === 0) continue;
      const previous = window[index - 1];
      if (distance(current.gravity, previous.gravity) <= GRAVITY_STILL_DELTA) {
        gravityStillEvidence += 1;
      }
      if (
        distance(current.rotationRate, previous.rotationRate) <= GYRO_STILL_DELTA
      ) {
        gyroStillEvidence += 1;
      }
    }
    const latest = window[window.length - 1].timestampMs;
    this.features.push({
      timestampMs: latest,
      gravityRange,
      rotationRate: median(rotationRates),
      quietAndStill:
        gravityStillEvidence / pairs >= PROPPED_EVIDENCE_RATIO &&
        gyroStillEvidence / pairs >= PROPPED_EVIDENCE_RATIO,
    });
    this.features = this.features.filter(
      ({ timestampMs }) => timestampMs >= latest - FEATURE_HORIZON_MS,
    );

    // A running deck creates fast, jagged gyro deltas and sub-second jolts,
    // but the phone's pose stays put. A hand cannot hold a pose that steadily
    // while its owner walks: gravity swings with every stride. Pooling the
    // per-window features over a few seconds lets one jolt pass unnoticed.
    const pooledRange = median(this.features.map((f) => f.gravityRange));
    const pooledRotation = median(this.features.map((f) => f.rotationRate));
    if (
      pooledRange > IN_HAND_GRAVITY_RANGE ||
      pooledRotation > IN_HAND_ROTATION_RATE
    ) {
      return { placement: "inHand", initialDebounceMs: 0 };
    }
    const quiet = this.features[this.features.length - 1].quietAndStill;
    return {
      placement: "propped",
      initialDebounceMs: quiet ? 0 : INITIAL_PLACEMENT_DEBOUNCE_MS,
    };
  }

  private result(
    transition: PhonePlacementTransition | null,
  ): PhonePlacementResult {
    return {
      placement: this.placement,
      transition,
      evaluatedAtMs: this.evaluatedAtMs,
    };
  }
}
