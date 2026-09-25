import { SHIPPED_STRIDE_GATE, type StrideGateParams } from './strideGateConfig';
export type StrideVector = { readonly x: number; readonly y: number; readonly z: number };

export type StrideMotionSample = {
  readonly t: number;
  readonly gravity: StrideVector;
  readonly rotationRate: StrideVector;
  readonly userAcceleration: StrideVector;
};

export type StrideVerdict = 'walking' | 'notStride' | 'still' | 'unknown';

export type StrideFeatures = {
  readonly windowMs: number;
  readonly verticalRms: number;
  readonly recentRms: number;
  readonly periodicity: number;
  readonly stepHz: number;
  readonly intervalCv: number;
  readonly axisPurity: number;
  readonly rotationRms: number;
  readonly rotationRatio: number;
};

export type StrideWindowClass = 'still' | 'stride' | 'nonGait' | 'ambiguous';

export type StrideAssessment = {
  readonly verdict: StrideVerdict;
  readonly at: number | null;
  readonly since: number | null;
  readonly features: StrideFeatures | null;
  readonly windowClass: StrideWindowClass | null;
  readonly recentVeto: boolean;
  readonly gaitLike: boolean;
  readonly stillSince: number | null;
};

export const UNKNOWN_STRIDE: StrideAssessment = {
  verdict: 'unknown', at: null, since: null, features: null, windowClass: null, recentVeto: false, gaitLike: false, stillSince: null,
};

export const STRIDE_SAMPLE_HZ = 50;

export const STRIDE_WINDOW_MS = SHIPPED_STRIDE_GATE.windowMs;
export const STRIDE_EVALUATION_INTERVAL_MS = SHIPPED_STRIDE_GATE.evaluationIntervalMs;
export const STRIDE_STALENESS_MS = SHIPPED_STRIDE_GATE.stalenessMs;
export const STRIDE_FILTER_HZ = Object.freeze({ low: SHIPPED_STRIDE_GATE.filterLowHz, high: SHIPPED_STRIDE_GATE.filterHighHz });
export const STRIDE_LAG_MS = Object.freeze({ low: SHIPPED_STRIDE_GATE.lagLowMs, high: SHIPPED_STRIDE_GATE.lagHighMs });
export const STRIDE_STILL_G = SHIPPED_STRIDE_GATE.stillG;
export const STRIDE_RECENT_MS = SHIPPED_STRIDE_GATE.recentMs;
export const STRIDE_WALK_MIN_G = SHIPPED_STRIDE_GATE.walkMinG;
export const STRIDE_VETO_MIN_G = SHIPPED_STRIDE_GATE.vetoMinG;
export const STRIDE_MIN_PERIODICITY = SHIPPED_STRIDE_GATE.minPeriodicity;
export const STRIDE_WALK_HZ = Object.freeze({ low: SHIPPED_STRIDE_GATE.walkLowHz, high: SHIPPED_STRIDE_GATE.walkHighHz });
export const STRIDE_VETO_HZ = SHIPPED_STRIDE_GATE.vetoHz;
export const STRIDE_MAX_INTERVAL_CV = SHIPPED_STRIDE_GATE.maxIntervalCv;
export const STRIDE_MAX_AXIS_PURITY = SHIPPED_STRIDE_GATE.maxAxisPurity;
export const STRIDE_VETO_AXIS_PURITY = SHIPPED_STRIDE_GATE.vetoAxisPurity;
export const STRIDE_MAX_ROTATION_RATIO = SHIPPED_STRIDE_GATE.maxRotationRatio;
export const STRIDE_VETO_ROTATION_RATIO = SHIPPED_STRIDE_GATE.vetoRotationRatio;
export const STRIDE_VETO_ROTATION_RMS = SHIPPED_STRIDE_GATE.vetoRotationRms;
export const STRIDE_WALK_DWELL = SHIPPED_STRIDE_GATE.walkDwell;
export const STRIDE_VETO_DWELL = SHIPPED_STRIDE_GATE.vetoDwell;
export const STRIDE_PENALTY_MS = SHIPPED_STRIDE_GATE.penaltyMs;
export const STRIDE_HZ_TOLERANCE = SHIPPED_STRIDE_GATE.hzTolerance;

export interface StrideMotionSource {
  onSample(callback: (sample: StrideMotionSample) => void): () => void;
}

export function gaitShapedWindow(features: StrideFeatures, gate: StrideGateParams = SHIPPED_STRIDE_GATE): boolean {
  return (
    features.verticalRms >= gate.walkMinG &&
    features.recentRms >= gate.stillG &&
    features.stepHz >= gate.walkLowHz &&
    features.stepHz <= gate.walkHighHz &&
    features.intervalCv <= gate.maxIntervalCv &&
    features.axisPurity <= gate.maxAxisPurity &&
    features.rotationRatio <= gate.maxRotationRatio
  );
}

export function classifyStrideWindow(features: StrideFeatures, gate: StrideGateParams = SHIPPED_STRIDE_GATE): StrideWindowClass {
  if (features.verticalRms < gate.stillG) return 'still';
  const periodic = features.periodicity >= gate.minPeriodicity;
  if (periodic && gaitShapedWindow(features, gate)) return 'stride';
  if (
    features.verticalRms >= gate.vetoMinG &&
    periodic &&
    (features.stepHz > gate.vetoHz ||
      features.axisPurity > gate.vetoAxisPurity ||
      features.rotationRatio > gate.vetoRotationRatio)
  ) {
    return 'nonGait';
  }
  if (features.rotationRms >= gate.vetoRotationRms && features.rotationRatio > gate.vetoRotationRatio) return 'nonGait';
  return 'ambiguous';
}

type Grid = { readonly vertical: number[]; readonly acceleration: StrideVector[]; readonly rotation: number[] };

function magnitude(value: StrideVector): number {
  return Math.sqrt(value.x * value.x + value.y * value.y + value.z * value.z);
}

function lerp(from: StrideVector, to: StrideVector, ratio: number): StrideVector {
  return { x: from.x + (to.x - from.x) * ratio, y: from.y + (to.y - from.y) * ratio, z: from.z + (to.z - from.z) * ratio };
}

function mean(values: readonly number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return values.length ? total / values.length : 0;
}

function rms(values: readonly number[]): number {
  const center = mean(values);
  let total = 0;
  for (const value of values) total += (value - center) * (value - center);
  return values.length ? Math.sqrt(total / values.length) : 0;
}

type Biquad = { readonly b0: number; readonly b2: number; readonly a1: number; readonly a2: number };

function bandPassCoefficients(sampleRate: number, low: number, high: number): Biquad {
  const center = Math.sqrt(low * high);
  const omega = (2 * Math.PI * center) / sampleRate;
  const alpha = Math.sin(omega) / (2 * (center / (high - low)));
  const a0 = 1 + alpha;
  return { b0: alpha / a0, b2: -alpha / a0, a1: (-2 * Math.cos(omega)) / a0, a2: (1 - alpha) / a0 };
}

function biquad(input: readonly number[], c: Biquad): number[] {
  const output: number[] = new Array(input.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let index = 0; index < input.length; index += 1) {
    const x0 = input[index];
    const y0 = c.b0 * x0 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    output[index] = y0;
    x2 = x1; x1 = x0; y2 = y1; y1 = y0;
  }
  return output;
}

function bandPass(values: readonly number[], sampleRate: number, gate: StrideGateParams): number[] {
  const c = bandPassCoefficients(sampleRate, gate.filterLowHz, gate.filterHighHz);
  return biquad(biquad(values, c).reverse(), c).reverse();
}

function autocorrelationPeak(signal: readonly number[], sampleRate: number, gate: StrideGateParams): { periodicity: number; stepHz: number } {
  const count = signal.length;
  const center = mean(signal);
  let energy = 0;
  for (let index = 0; index < count; index += 1) energy += (signal[index] - center) ** 2;
  const lowLag = Math.max(1, Math.round((gate.lagLowMs * sampleRate) / 1000));
  const highLag = Math.min(count - 1, Math.round((gate.lagHighMs * sampleRate) / 1000));
  let best = -Infinity;
  let bestLag = lowLag;
  for (let lag = lowLag; lag <= highLag; lag += 1) {
    let sum = 0;
    for (let index = lag; index < count; index += 1) sum += (signal[index] - center) * (signal[index - lag] - center);
    const normalized = energy > 0 ? sum / energy : 0;
    if (normalized > best) { best = normalized; bestLag = lag; }
  }
  return { periodicity: energy > 0 ? best : 0, stepHz: sampleRate / bestLag };
}

function intervalCv(signal: readonly number[], sampleRate: number, gate: StrideGateParams): number {
  const threshold = gate.peakHeightFraction * rms(signal);
  const minDistance = Math.round((gate.peakMinDistanceMs * sampleRate) / 1000);
  const peaks: number[] = [];
  for (let index = 1; index < signal.length - 1; index += 1) {
    if (signal[index] < threshold || signal[index] <= signal[index - 1] || signal[index] < signal[index + 1]) continue;
    const last = peaks[peaks.length - 1];
    if (last !== undefined && index - last < minDistance) {
      if (signal[index] > signal[last]) peaks[peaks.length - 1] = index;
      continue;
    }
    peaks.push(index);
  }
  if (peaks.length < 3) return 9.9;
  const intervals: number[] = [];
  for (let index = 1; index < peaks.length; index += 1) intervals.push(peaks[index] - peaks[index - 1]);
  const average = mean(intervals);
  return average > 0 ? rms(intervals) / average : 9.9;
}

function axisPurity(acceleration: readonly StrideVector[]): number {
  const count = acceleration.length;
  if (count === 0) return 0;
  const center = { x: mean(acceleration.map((a) => a.x)), y: mean(acceleration.map((a) => a.y)), z: mean(acceleration.map((a) => a.z)) };
  let xx = 0, yy = 0, zz = 0, xy = 0, xz = 0, yz = 0;
  for (const a of acceleration) {
    const dx = a.x - center.x, dy = a.y - center.y, dz = a.z - center.z;
    xx += dx * dx; yy += dy * dy; zz += dz * dz; xy += dx * dy; xz += dx * dz; yz += dy * dz;
  }
  const trace = xx + yy + zz;
  if (trace <= 0) return 0;
  let v = { x: 1, y: 1, z: 1 };
  let eigen = 0;
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const w = { x: xx * v.x + xy * v.y + xz * v.z, y: xy * v.x + yy * v.y + yz * v.z, z: xz * v.x + yz * v.y + zz * v.z };
    const size = magnitude(w);
    if (!(size > 0)) break;
    eigen = size;
    v = { x: w.x / size, y: w.y / size, z: w.z / size };
  }
  return Math.min(1, eigen / trace);
}

export function computeStrideFeatures(
  grid: Grid,
  windowMs: number,
  sampleRate = STRIDE_SAMPLE_HZ,
  gate: StrideGateParams = SHIPPED_STRIDE_GATE,
): StrideFeatures {
  const verticalRms = rms(grid.vertical);
  const recentRms = rms(grid.vertical.slice(-Math.round((gate.recentMs * sampleRate) / 1000)));
  const filtered = bandPass(grid.vertical.map((value) => value), sampleRate, gate);
  const { periodicity, stepHz } = autocorrelationPeak(filtered, sampleRate, gate);
  const rotationRms = rms(grid.rotation);
  return {
    windowMs,
    verticalRms,
    recentRms,
    periodicity,
    stepHz,
    intervalCv: intervalCv(filtered, sampleRate, gate),
    axisPurity: axisPurity(grid.acceleration),
    rotationRms,
    rotationRatio: rotationRms / (verticalRms + 1e-9),
  };
}

export class StrideRhythmAnalyzer {
  private samples: StrideMotionSample[] = [];
  private assessment: StrideAssessment = UNKNOWN_STRIDE;
  private evaluatedAt = Number.NEGATIVE_INFINITY;
  private walkRun = 0;
  private walkRunHz: number | null = null;
  private walkSince: number | null = null;
  private vetoRun = 0;
  private lastVetoAt = Number.NEGATIVE_INFINITY;
  private stillSince: number | null = null;

  constructor(private readonly gate: StrideGateParams = SHIPPED_STRIDE_GATE) {}

  push(sample: StrideMotionSample): StrideAssessment | null {
    if (!Number.isFinite(sample.t)) return null;
    const newest = this.samples[this.samples.length - 1];
    if (newest !== undefined && sample.t < newest.t) return null;
    this.samples.push(sample);
    const horizon = sample.t - this.gate.windowMs;
    while (this.samples.length && this.samples[0].t < horizon) this.samples.shift();
    if (sample.t - this.evaluatedAt < this.gate.evaluationIntervalMs) return null;
    this.evaluatedAt = sample.t;
    this.assessment = this.evaluate(sample.t);
    return this.assessment;
  }

  assessmentAt(at: number): StrideAssessment {
    const observedAt = this.assessment.at;
    if (observedAt === null || at < observedAt || at - observedAt >= this.gate.stalenessMs) return UNKNOWN_STRIDE;
    return this.assessment;
  }

  reset(): void {
    this.samples = [];
    this.assessment = UNKNOWN_STRIDE;
    this.evaluatedAt = Number.NEGATIVE_INFINITY;
    this.walkRun = 0;
    this.walkRunHz = null;
    this.walkSince = null;
    this.vetoRun = 0;
    this.lastVetoAt = Number.NEGATIVE_INFINITY;
    this.stillSince = null;
  }

  private evaluate(at: number): StrideAssessment {
    const window = this.samples;
    const first = window[0];
    const span = first === undefined ? 0 : at - first.t;
    const minimumSamples = (this.gate.windowMs / 1000) * STRIDE_SAMPLE_HZ * this.gate.minCoverage;
    const grid = first === undefined || span < this.gate.minSpanMs || window.length < minimumSamples
      ? null
      : resample(window, at - this.gate.windowMs, at, this.gate);
    if (grid === null) {
      this.walkRun = 0; this.walkRunHz = null; this.walkSince = null; this.vetoRun = 0; this.stillSince = null;
      return { verdict: 'unknown', at, since: null, features: null, windowClass: null, recentVeto: this.recentVeto(at), gaitLike: false, stillSince: null };
    }
    const features = computeStrideFeatures(grid, span, STRIDE_SAMPLE_HZ, this.gate);
    const windowClass = classifyStrideWindow(features, this.gate);
    const verdict = this.smooth(windowClass, features.stepHz, at);
    this.stillSince = windowClass === 'still' ? this.stillSince ?? Math.max(at - this.gate.windowMs, first!.t) : null;
    return {
      verdict,
      at,
      since: verdict === 'walking' ? this.walkSince : null,
      features,
      windowClass,
      recentVeto: this.recentVeto(at),
      gaitLike: gaitShapedWindow(features, this.gate),
      stillSince: verdict === 'still' ? this.stillSince : null,
    };
  }

  private smooth(windowClass: StrideWindowClass, stepHz: number, at: number): StrideVerdict {
    const stable = this.walkRunHz === null || Math.abs(stepHz - this.walkRunHz) <= this.gate.hzTolerance * this.walkRunHz;
    if (windowClass === 'stride') {
      this.walkRun = stable ? this.walkRun + 1 : 1;
      if (this.walkRun === 1) this.walkSince = at - this.gate.windowMs;
      this.walkRunHz = stepHz;
    } else {
      this.walkRun = 0; this.walkRunHz = null; this.walkSince = null;
    }
    this.vetoRun = windowClass === 'nonGait' ? this.vetoRun + 1 : 0;
    if (this.vetoRun >= this.gate.vetoDwell) this.lastVetoAt = at;
    if (windowClass === 'still') return 'still';
    if (this.vetoRun >= this.gate.vetoDwell) return 'notStride';
    if (this.walkRun >= this.gate.walkDwell && !this.recentVeto(at)) return 'walking';
    return 'unknown';
  }

  private recentVeto(at: number): boolean {
    return at - this.lastVetoAt < this.gate.penaltyMs;
  }
}

export function resample(
  window: readonly StrideMotionSample[],
  from: number,
  to: number,
  gate: StrideGateParams = SHIPPED_STRIDE_GATE,
): Grid | null {
  const step = 1000 / STRIDE_SAMPLE_HZ;
  const vertical: number[] = [];
  const acceleration: StrideVector[] = [];
  const rotation: number[] = [];
  let cursor = 0;
  for (let time = Math.max(from, window[0].t); time <= to; time += step) {
    while (cursor < window.length - 2 && window[cursor + 1].t < time) cursor += 1;
    const left = window[cursor];
    const right = window[Math.min(cursor + 1, window.length - 1)];
    if (left === undefined || right === undefined) return null;
    if (right.t < time) continue;
    const span = right.t - left.t;
    const ratio = span > 0 ? Math.min(1, Math.max(0, (time - left.t) / span)) : 0;
    const gravity = lerp(left.gravity, right.gravity, ratio);
    const userAcceleration = lerp(left.userAcceleration, right.userAcceleration, ratio);
    const rotationRate = lerp(left.rotationRate, right.rotationRate, ratio);
    const gravitySize = magnitude(gravity);
    if (!(gravitySize > 0)) return null;
    const along = (userAcceleration.x * gravity.x + userAcceleration.y * gravity.y + userAcceleration.z * gravity.z) / gravitySize;
    vertical.push(along);
    acceleration.push(userAcceleration);
    rotation.push(magnitude(rotationRate));
  }
  if (vertical.length < (gate.windowMs / 1000) * STRIDE_SAMPLE_HZ * gate.minCoverage) return null;
  return { vertical, acceleration, rotation };
}
