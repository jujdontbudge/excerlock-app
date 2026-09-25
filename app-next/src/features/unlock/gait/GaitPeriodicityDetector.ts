import type { GaitKeypointSample, GaitLandmark, GaitLandmarkName } from './GaitVisionProvider';

export const GAIT_SCAN_TIMEOUT_MS = 5_000;
export const GAIT_MIN_FREQUENCY_HZ = 1.2;
export const GAIT_MAX_FREQUENCY_HZ = 3;
export const GAIT_REQUIRED_QUALIFYING_STRIDES = 4;

const LANDMARK_CONFIDENCE_THRESHOLD = 0.6;
const HEAD_CONFIDENCE_THRESHOLD = 0.5;
const MIN_TORSO_HEIGHT = 0.05;
const MIN_HEAD_HEIGHT = 0.05;
const HEAD_SCALE_HISTORY = 15;
const MIN_NORMALIZED_VERTICAL_RANGE = 0.04;
const MIN_VALID_SAMPLES_FOR_SIGNAL = 10;
const MIN_VALID_SAMPLE_RATIO = 0.6;
const LANDMARK_NAMES: readonly GaitLandmarkName[] = ['leftShoulder', 'rightShoulder', 'leftHip', 'rightHip'];

export type GaitClassification = 'walking' | 'notWalking' | 'insufficientSignal';

export interface GaitDetectionResult {
  readonly classification: GaitClassification;
  readonly confidence: number;
  readonly complete: boolean;
  readonly evaluatedAtMs: number;
}

export interface GaitPeriodicityDetectorOptions {
  readonly startedAtMs: number;
}

interface SignalPoint {
  readonly timestampMs: number;
  readonly value: number;
}

function validLandmarks(sample: GaitKeypointSample): readonly GaitLandmark[] | undefined {
  const landmarks = LANDMARK_NAMES.map((name) => sample.landmarks[name]);
  if (
    landmarks.some(
      (landmark) =>
        landmark === undefined ||
        !Number.isFinite(landmark.x) ||
        !Number.isFinite(landmark.y) ||
        !Number.isFinite(landmark.confidence) ||
        landmark.confidence < LANDMARK_CONFIDENCE_THRESHOLD,
    )
  ) {
    return undefined;
  }
  return landmarks as readonly GaitLandmark[];
}

function normalizedVerticalPosition(
  sample: GaitKeypointSample,
  headScale: (height: number) => number,
): number | undefined {
  const landmarks = validLandmarks(sample);
  if (landmarks !== undefined) {
    const shoulderY = (landmarks[0].y + landmarks[1].y) / 2;
    const hipY = (landmarks[2].y + landmarks[3].y) / 2;
    const torsoHeight = Math.abs(hipY - shoulderY);
    if (torsoHeight >= MIN_TORSO_HEIGHT) {
      return (shoulderY + hipY) / 2 / torsoHeight;
    }
  }
  const head = sample.head;
  if (
    head === undefined ||
    !Number.isFinite(head.y) ||
    !Number.isFinite(head.height) ||
    head.confidence < HEAD_CONFIDENCE_THRESHOLD ||
    head.height < MIN_HEAD_HEIGHT
  ) {
    return undefined;
  }
  return head.y / headScale(head.height);
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

export class GaitPeriodicityDetector {
  private readonly startedAtMs: number;
  private completedResult: GaitDetectionResult | undefined;
  private previousPoints: SignalPoint[] = [];
  private lastPeakAtMs: number | undefined;
  private segmentMinimum = Number.POSITIVE_INFINITY;
  private qualifyingStrides = 0;
  private totalSamples = 0;
  private validSamples = 0;
  private samplingToleranceMs = 0;
  private headHeights: number[] = [];

  public constructor(options: GaitPeriodicityDetectorOptions) {
    if (!Number.isFinite(options.startedAtMs)) {
      throw new Error('Gait scan start time must be finite');
    }
    this.startedAtMs = options.startedAtMs;
  }

  public process(sample: GaitKeypointSample): GaitDetectionResult {
    if (this.completedResult !== undefined) {
      return this.completedResult;
    }
    if (sample.timestampMs >= this.startedAtMs + GAIT_SCAN_TIMEOUT_MS) {
      return this.completeAtTimeout();
    }

    this.totalSamples += 1;
    const value = normalizedVerticalPosition(sample, (height) => {
      this.headHeights.push(height);
      if (this.headHeights.length > HEAD_SCALE_HISTORY) {
        this.headHeights.shift();
      }
      return median(this.headHeights);
    });
    if (value === undefined) {
      this.resetConsecutiveSignal();
      return this.currentResult(sample.timestampMs);
    }

    this.validSamples += 1;
    const point = { timestampMs: sample.timestampMs, value };
    const previousPoint = this.previousPoints[this.previousPoints.length - 1];
    if (previousPoint !== undefined) {
      this.samplingToleranceMs = Math.max(this.samplingToleranceMs, point.timestampMs - previousPoint.timestampMs);
    }
    this.segmentMinimum = Math.min(this.segmentMinimum, value);
    this.previousPoints.push(point);
    if (this.previousPoints.length > 3) {
      this.previousPoints.shift();
    }

    if (this.previousPoints.length === 3) {
      const [before, candidate, after] = this.previousPoints;
      if (candidate.value > before.value && candidate.value >= after.value) {
        this.recordPeak(candidate);
      }
    }

    if (this.qualifyingStrides >= GAIT_REQUIRED_QUALIFYING_STRIDES) {
      this.completedResult = {
        classification: 'walking',
        confidence: 1,
        complete: true,
        evaluatedAtMs: sample.timestampMs,
      };
      return this.completedResult;
    }
    return this.currentResult(sample.timestampMs);
  }

  public getResult(atMs: number): GaitDetectionResult {
    if (this.completedResult !== undefined) {
      return this.completedResult;
    }
    if (atMs >= this.startedAtMs + GAIT_SCAN_TIMEOUT_MS) {
      return this.completeAtTimeout();
    }
    return this.currentResult(atMs);
  }

  private recordPeak(peak: SignalPoint): void {
    if (peak.value - this.segmentMinimum < MIN_NORMALIZED_VERTICAL_RANGE) {
      return;
    }

    const previousPeakAtMs = this.lastPeakAtMs;
    this.lastPeakAtMs = peak.timestampMs;
    this.segmentMinimum = peak.value;
    if (previousPeakAtMs === undefined) {
      return;
    }

    const periodMs = peak.timestampMs - previousPeakAtMs;
    const minimumPeriodMs = 1_000 / GAIT_MAX_FREQUENCY_HZ - this.samplingToleranceMs;
    const maximumPeriodMs = 1_000 / GAIT_MIN_FREQUENCY_HZ + this.samplingToleranceMs;
    if (periodMs >= minimumPeriodMs && periodMs <= maximumPeriodMs) {
      this.qualifyingStrides += 1;
      return;
    }
    this.qualifyingStrides = 0;
  }

  private resetConsecutiveSignal(): void {
    this.previousPoints = [];
    this.lastPeakAtMs = undefined;
    this.segmentMinimum = Number.POSITIVE_INFINITY;
    this.qualifyingStrides = 0;
  }

  private currentResult(atMs: number): GaitDetectionResult {
    return {
      classification: this.validSamples === 0 ? 'insufficientSignal' : 'notWalking',
      confidence: Math.min(1, this.qualifyingStrides / GAIT_REQUIRED_QUALIFYING_STRIDES),
      complete: false,
      evaluatedAtMs: atMs,
    };
  }

  private completeAtTimeout(): GaitDetectionResult {
    const hasUsableSignal =
      this.validSamples >= MIN_VALID_SAMPLES_FOR_SIGNAL &&
      this.validSamples / Math.max(1, this.totalSamples) >= MIN_VALID_SAMPLE_RATIO;
    this.completedResult = {
      classification: hasUsableSignal ? 'notWalking' : 'insufficientSignal',
      confidence: Math.min(1, this.qualifyingStrides / GAIT_REQUIRED_QUALIFYING_STRIDES),
      complete: true,
      evaluatedAtMs: this.startedAtMs + GAIT_SCAN_TIMEOUT_MS,
    };
    return this.completedResult;
  }
}
