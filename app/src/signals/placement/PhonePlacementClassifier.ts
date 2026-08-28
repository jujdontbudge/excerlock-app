import type {
  DeviceMotionSample,
  MotionVector3,
} from "./PhonePlacementProvider";

export const PLACEMENT_OBSERVATION_WINDOW_MS = 1_000;
export const PLACEMENT_TRANSITION_DEBOUNCE_MS = 300;

const INITIAL_PLACEMENT_DEBOUNCE_MS = 400;
const PICKUP_DEBOUNCE_MS = 1_500;
const MIN_SAMPLE_PAIRS = 8;
const GRAVITY_STILL_DELTA = 0.006;
const GRAVITY_IN_HAND_DELTA = 0.012;
const GRAVITY_STABLE_POSE_DELTA = 0.04;
const GYRO_STILL_DELTA = 0.11;
const GYRO_IN_HAND_DELTA = 0.18;
const GYRO_VIBRATION_DELTA = 0.5;
const PROPPED_EVIDENCE_RATIO = 0.8;
const VIBRATION_EVIDENCE_RATIO = 0.4;
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

interface PlacementCandidate {
  readonly placement: PhonePlacement;
  readonly initialDebounceMs: number;
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

    let gravityInHandEvidence = 0;
    let gravityStillEvidence = 0;
    let stablePoseEvidence = 0;
    let gyroStillEvidence = 0;
    let gyroInHandEvidence = 0;
    let gyroVibrationEvidence = 0;
    for (let index = 1; index < this.samples.length; index += 1) {
      const previous = this.samples[index - 1];
      const current = this.samples[index];
      const gravityDelta = distance(current.gravity, previous.gravity);
      const gyroDelta = distance(current.rotationRate, previous.rotationRate);
      if (gravityDelta >= GRAVITY_IN_HAND_DELTA) {
        gravityInHandEvidence += 1;
      }
      if (gravityDelta <= GRAVITY_STILL_DELTA) {
        gravityStillEvidence += 1;
      }
      if (gravityDelta <= GRAVITY_STABLE_POSE_DELTA) {
        stablePoseEvidence += 1;
      }
      if (gyroDelta <= GYRO_STILL_DELTA) {
        gyroStillEvidence += 1;
      }
      if (
        gyroDelta >= GYRO_IN_HAND_DELTA &&
        gyroDelta < GYRO_VIBRATION_DELTA
      ) {
        gyroInHandEvidence += 1;
      }
      if (gyroDelta >= GYRO_VIBRATION_DELTA) {
        gyroVibrationEvidence += 1;
      }
    }

    const pairs = this.samples.length - 1;
    // A running deck creates large, fast gyro deltas even though the phone's
    // overall gravity pose stays bounded. Treating gyro movement alone as a
    // hand signal turns every real treadmill into a false pickup.
    const phoneIsQuietAndStill =
      gravityStillEvidence / pairs >= PROPPED_EVIDENCE_RATIO &&
      gyroStillEvidence / pairs >= PROPPED_EVIDENCE_RATIO;
    const phoneIsVibratingInAStablePose =
      stablePoseEvidence / pairs >= PROPPED_EVIDENCE_RATIO &&
      gyroVibrationEvidence / pairs >= VIBRATION_EVIDENCE_RATIO;
    if (phoneIsQuietAndStill) {
      return { placement: "propped", initialDebounceMs: 0 };
    }
    if (phoneIsVibratingInAStablePose) {
      return {
        placement: "propped",
        initialDebounceMs: INITIAL_PLACEMENT_DEBOUNCE_MS,
      };
    }
    if (
      gravityInHandEvidence / pairs >= IN_HAND_EVIDENCE_RATIO ||
      gyroInHandEvidence / pairs >= IN_HAND_EVIDENCE_RATIO
    ) {
      return { placement: "inHand", initialDebounceMs: 0 };
    }
    return { placement: "unknown", initialDebounceMs: 0 };
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
