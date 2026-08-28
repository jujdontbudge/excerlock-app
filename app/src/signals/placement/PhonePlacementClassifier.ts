import type {
  DeviceMotionSample,
  MotionVector3,
} from "./PhonePlacementProvider";

export const PLACEMENT_OBSERVATION_WINDOW_MS = 1_000;
export const PLACEMENT_TRANSITION_DEBOUNCE_MS = 300;

const MIN_SAMPLE_PAIRS = 8;
const GRAVITY_STILL_DELTA = 0.006;
const GRAVITY_MOVING_DELTA = 0.012;
const GYRO_STILL_DELTA = 0.11;
const GYRO_MOVING_DELTA = 0.18;
const PROPPED_EVIDENCE_RATIO = 0.8;
const IN_HAND_EVIDENCE_RATIO = 0.6;

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

    const candidate = this.classifyWindow();
    if (candidate === "unknown") {
      this.pending = undefined;
      return this.result(null);
    }
    if (this.placement === "unknown") {
      this.placement = candidate;
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
    if (
      sample.timestampMs - this.pending.sinceMs <
      PLACEMENT_TRANSITION_DEBOUNCE_MS
    ) {
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

  private classifyWindow(): PhonePlacement {
    if (
      this.samples.length < MIN_SAMPLE_PAIRS + 1 ||
      this.observationStartedAtMs === null ||
      this.evaluatedAtMs === null ||
      this.evaluatedAtMs - this.observationStartedAtMs <
        PLACEMENT_OBSERVATION_WINDOW_MS
    ) {
      return "unknown";
    }

    let inHandEvidence = 0;
    let proppedEvidence = 0;
    for (let index = 1; index < this.samples.length; index += 1) {
      const previous = this.samples[index - 1];
      const current = this.samples[index];
      const gravityDelta = distance(current.gravity, previous.gravity);
      const gyroDelta = distance(current.rotationRate, previous.rotationRate);
      if (
        gravityDelta >= GRAVITY_MOVING_DELTA ||
        gyroDelta >= GYRO_MOVING_DELTA
      ) {
        inHandEvidence += 1;
      }
      if (
        gravityDelta <= GRAVITY_STILL_DELTA &&
        gyroDelta <= GYRO_STILL_DELTA
      ) {
        proppedEvidence += 1;
      }
    }

    const pairs = this.samples.length - 1;
    if (inHandEvidence / pairs >= IN_HAND_EVIDENCE_RATIO) {
      return "inHand";
    }
    if (proppedEvidence / pairs >= PROPPED_EVIDENCE_RATIO) {
      return "propped";
    }
    return "unknown";
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
