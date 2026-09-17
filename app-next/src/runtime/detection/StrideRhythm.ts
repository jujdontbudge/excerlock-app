/**
 * Stride-rhythm discriminator over the raw 50 Hz device-motion stream.
 *
 * Why it exists (measured in gate-proof-s1 / gate-fix-s2 on the recorder
 * captures): CMPedometer counted a deliberate seated shake as 118-134
 * steps/min while real walking in the same capture read 98-110, so cadence
 * magnitude cannot tell a shake from a walk, and CMMotionActivity is 8-15 s
 * late on a cold walk. The raw stream can answer both questions earlier:
 * is this periodic motion a gait, and is it a gait at all.
 *
 * The verdict is deliberately a small set of physical checks, each with a
 * measured margin (data/gate-fix-s2/report.md), not a fitted score:
 *  - vertical (gravity-axis) acceleration RMS: a stepping body moves;
 *  - periodicity: normalized autocorrelation of the band-passed vertical
 *    signal peaks at the step period (lags 0.3-0.85 s);
 *  - step frequency: 1.2-2.3 Hz is walking; the captured shakes ran 2.3-3.3 Hz;
 *  - interval regularity: coefficient of variation of the inter-peak intervals;
 *  - axis purity: a hand shake is a one-dimensional oscillation (principal-axis
 *    share of the 3-D acceleration energy >= 0.92); a walking body accelerates
 *    vertically, forward and sideways (share <= 0.90 in 95 % of walking windows);
 *  - rotation ratio: rotation-rate RMS over vertical RMS; a twisted phone
 *    rotates without translating (and, at >= 1 rad/s and >= 8x the vertical
 *    RMS, is being handled whether or not the motion is periodic).
 *
 * Verdicts: `walking` (confident stride: the checks held for a dwell of eight
 * consecutive evaluations, 1.75 s, at a stable step frequency, the newest
 * second of the window is still stepping, and no non-gait verdict in the
 * preceding 8 s), `notStride` (periodic motion that violates the
 * gait band, purity or rotation bound for two evaluations), `still` (vertical
 * RMS below the still floor over the whole window) and `unknown` (everything
 * else, including no raw data). A still phone never yields `walking`.
 *
 * Every threshold below is a field of `StrideGateParams`; the shipped values
 * and their remote clamps live in `strideGateConfig.ts`, and each function
 * defaults to the shipped gate so callers that do not pass one keep today's
 * measured behaviour exactly.
 */
import { SHIPPED_STRIDE_GATE, type StrideGateParams } from './strideGateConfig';
export type StrideVector = { readonly x: number; readonly y: number; readonly z: number };

/** One raw device-motion observation. `t` is the receipt wall clock in ms. */
export type StrideMotionSample = {
  readonly t: number;
  readonly gravity: StrideVector;
  readonly rotationRate: StrideVector;
  readonly userAcceleration: StrideVector;
};

export type StrideVerdict = 'walking' | 'notStride' | 'still' | 'unknown';

export type StrideFeatures = {
  /** Window span actually covered, ms. */
  readonly windowMs: number;
  /** RMS of the gravity-axis user acceleration over the whole window, g. */
  readonly verticalRms: number;
  /** Same RMS over the newest STRIDE_RECENT_MS of the window, g: is the body still stepping right now. */
  readonly recentRms: number;
  /** Normalized autocorrelation peak of the band-passed vertical signal within the step-lag band. */
  readonly periodicity: number;
  /** Step frequency implied by the autocorrelation peak lag, Hz. */
  readonly stepHz: number;
  /** Coefficient of variation of inter-peak intervals (9.9 when fewer than three peaks). */
  readonly intervalCv: number;
  /** Share of 3-D user-acceleration energy on its principal axis (1 = one-dimensional). */
  readonly axisPurity: number;
  /** RMS of the rotation-rate magnitude, rad/s. */
  readonly rotationRms: number;
  /** rotationRms / verticalRms. */
  readonly rotationRatio: number;
};

/** Per-window classification before dwell/penalty smoothing. */
export type StrideWindowClass = 'still' | 'stride' | 'nonGait' | 'ambiguous';

export type StrideAssessment = {
  readonly verdict: StrideVerdict;
  /** Newest raw sample time covered by this assessment (null before any evaluation). */
  readonly at: number | null;
  /**
   * Start of the continuously verified stride interval behind a `walking`
   * verdict (the start of the first analysis window of the run); null otherwise.
   */
  readonly since: number | null;
  readonly features: StrideFeatures | null;
  readonly windowClass: StrideWindowClass | null;
  /**
   * A `notStride` verdict was issued within STRIDE_PENALTY_MS. While set, the
   * pedometer's cadence must not stand alone: the captured shakes alternated
   * non-gait phases with 1.5-9.4 s of aperiodic handling during which
   * CMPedometer kept reporting 118-134 steps/min with steps accruing.
   */
  readonly recentVeto: boolean;
};

export const UNKNOWN_STRIDE: StrideAssessment = { verdict: 'unknown', at: null, since: null, features: null, windowClass: null, recentVeto: false };

/**
 * The native device-motion stream contract: the module samples at 50 Hz and
 * the analyzer grids onto it. Not remote-tunable on purpose - changing it
 * would decimate or interpolate a physical stream, which is a build change.
 */
export const STRIDE_SAMPLE_HZ = 50;

// Shipped values, re-exported for readers and tests. The single source of
// truth is `SHIPPED_STRIDE_GATE` in `strideGateConfig.ts`, where each field
// also carries its remote clamp.
export const STRIDE_WINDOW_MS = SHIPPED_STRIDE_GATE.windowMs;
export const STRIDE_EVALUATION_INTERVAL_MS = SHIPPED_STRIDE_GATE.evaluationIntervalMs;
/** No raw samples for this long: the stream stopped telling us anything. */
export const STRIDE_STALENESS_MS = SHIPPED_STRIDE_GATE.stalenessMs;
/** Band-pass applied before periodicity/peak analysis, Hz. */
export const STRIDE_FILTER_HZ = Object.freeze({ low: SHIPPED_STRIDE_GATE.filterLowHz, high: SHIPPED_STRIDE_GATE.filterHighHz });
/** Step-period search band for the autocorrelation peak, ms. */
export const STRIDE_LAG_MS = Object.freeze({ low: SHIPPED_STRIDE_GATE.lagLowMs, high: SHIPPED_STRIDE_GATE.lagHighMs });
/** Vertical RMS below this over the window is a still phone (sitting windows: p95 0.07 g incl. handling; walking p5 0.08 g). */
export const STRIDE_STILL_G = SHIPPED_STRIDE_GATE.stillG;
/**
 * A stride window must still be stepping in its newest second (recent RMS at
 * or above the still floor): a shake that is dying out looks like walking on
 * every whole-window feature for the two seconds after the hand stops
 * (f09377f9 shake 1, +13.6..+14.4 s: recent RMS 0.049 → 0.007 g), while
 * treadmill/walking stride windows measured 0.061 g at their very lowest and
 * 0.073 g at p1. A verdict must also not outlive the walker's last step.
 */
export const STRIDE_RECENT_MS = SHIPPED_STRIDE_GATE.recentMs;
/** A stride verdict needs at least this much vertical motion. */
export const STRIDE_WALK_MIN_G = SHIPPED_STRIDE_GATE.walkMinG;
/** A non-gait verdict needs real motion to stand on. */
export const STRIDE_VETO_MIN_G = SHIPPED_STRIDE_GATE.vetoMinG;
export const STRIDE_MIN_PERIODICITY = SHIPPED_STRIDE_GATE.minPeriodicity;
export const STRIDE_WALK_HZ = Object.freeze({ low: SHIPPED_STRIDE_GATE.walkLowHz, high: SHIPPED_STRIDE_GATE.walkHighHz });
/** Periodic motion faster than this is not a walk (captured shakes: 2.3-3.3 Hz; walking p95 2.08 Hz). */
export const STRIDE_VETO_HZ = SHIPPED_STRIDE_GATE.vetoHz;
export const STRIDE_MAX_INTERVAL_CV = SHIPPED_STRIDE_GATE.maxIntervalCv;
/** Walking windows: p95 0.89, p99 0.91. Captured shakes in their steady phases: 0.87-0.97. */
export const STRIDE_MAX_AXIS_PURITY = SHIPPED_STRIDE_GATE.maxAxisPurity;
export const STRIDE_VETO_AXIS_PURITY = SHIPPED_STRIDE_GATE.vetoAxisPurity;
/** Walking p95 4.6; rotation-dominated shake phases 5-18. */
export const STRIDE_MAX_ROTATION_RATIO = SHIPPED_STRIDE_GATE.maxRotationRatio;
export const STRIDE_VETO_ROTATION_RATIO = SHIPPED_STRIDE_GATE.vetoRotationRatio;
/**
 * A phone twisted about far more than it is lifted (rotation RMS at or above
 * this, and STRIDE_VETO_ROTATION_RATIO times the vertical RMS) is being
 * handled, not carried by a stepping body, periodic or not: 0 of the 1,300
 * walking/treadmill windows inside labels, 58 sitting (handling) windows and
 * 28 shake windows.
 */
export const STRIDE_VETO_ROTATION_RMS = SHIPPED_STRIDE_GATE.vetoRotationRms;
/**
 * Consecutive stride evaluations (250 ms apart) before `walking` is published:
 * 8 evaluations = 4.75 s of stride-quality motion from its start. The four
 * captured seated shakes never sustained stride-quality motion for more than
 * five consecutive evaluations (4.0-4.25 s) between changes of rhythm; a
 * steady walk sustains it indefinitely. Three evaluations (0.75 s) of margin.
 */
export const STRIDE_WALK_DWELL = SHIPPED_STRIDE_GATE.walkDwell;
/** Consecutive non-gait evaluations before `notStride` is published. */
export const STRIDE_VETO_DWELL = SHIPPED_STRIDE_GATE.vetoDwell;
/** A walk does not begin from a shake: no `walking` verdict this soon after a non-gait one. */
export const STRIDE_PENALTY_MS = SHIPPED_STRIDE_GATE.penaltyMs;
/** Step frequency must stay within this fraction of the previous evaluation across the dwell. */
export const STRIDE_HZ_TOLERANCE = SHIPPED_STRIDE_GATE.hzTolerance;

/** Streams the raw device-motion samples the discriminator needs. */
export interface StrideMotionSource {
  onSample(callback: (sample: StrideMotionSample) => void): () => void;
}

export function classifyStrideWindow(features: StrideFeatures, gate: StrideGateParams = SHIPPED_STRIDE_GATE): StrideWindowClass {
  if (features.verticalRms < gate.stillG) return 'still';
  const periodic = features.periodicity >= gate.minPeriodicity;
  if (
    features.verticalRms >= gate.walkMinG &&
    features.recentRms >= gate.stillG &&
    periodic &&
    features.stepHz >= gate.walkLowHz &&
    features.stepHz <= gate.walkHighHz &&
    features.intervalCv <= gate.maxIntervalCv &&
    features.axisPurity <= gate.maxAxisPurity &&
    features.rotationRatio <= gate.maxRotationRatio
  ) {
    return 'stride';
  }
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

/** Forward-then-backward band-pass: zero phase, so peaks stay time-aligned. */
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

/** Largest-eigenvalue share of the 3x3 covariance of the acceleration samples (power iteration). */
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

/**
 * Sliding-window analyzer. Push raw samples as they arrive; it re-evaluates
 * every STRIDE_EVALUATION_INTERVAL_MS and keeps the newest assessment.
 */
export class StrideRhythmAnalyzer {
  private samples: StrideMotionSample[] = [];
  private assessment: StrideAssessment = UNKNOWN_STRIDE;
  private evaluatedAt = Number.NEGATIVE_INFINITY;
  private walkRun = 0;
  private walkRunHz: number | null = null;
  private walkSince: number | null = null;
  private vetoRun = 0;
  private lastVetoAt = Number.NEGATIVE_INFINITY;

  constructor(private readonly gate: StrideGateParams = SHIPPED_STRIDE_GATE) {}

  /** Returns the new assessment when this sample triggered an evaluation, else null. */
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

  /** Newest assessment, or `unknown` when the stream has gone quiet or moved backwards. */
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
  }

  private evaluate(at: number): StrideAssessment {
    const window = this.samples;
    const first = window[0];
    const span = first === undefined ? 0 : at - first.t;
    const minimumSamples = (this.gate.windowMs / 1000) * STRIDE_SAMPLE_HZ * this.gate.minCoverage;
    if (first === undefined || span < this.gate.minSpanMs || window.length < minimumSamples) {
      this.walkRun = 0; this.walkRunHz = null; this.walkSince = null; this.vetoRun = 0;
      return { verdict: 'unknown', at, since: null, features: null, windowClass: null, recentVeto: this.recentVeto(at) };
    }
    const grid = resample(window, at - this.gate.windowMs, at, this.gate);
    if (grid === null) {
      this.walkRun = 0; this.walkRunHz = null; this.walkSince = null; this.vetoRun = 0;
      return { verdict: 'unknown', at, since: null, features: null, windowClass: null, recentVeto: this.recentVeto(at) };
    }
    const features = computeStrideFeatures(grid, span, STRIDE_SAMPLE_HZ, this.gate);
    const windowClass = classifyStrideWindow(features, this.gate);
    const verdict = this.smooth(windowClass, features.stepHz, at);
    return { verdict, at, since: verdict === 'walking' ? this.walkSince : null, features, windowClass, recentVeto: this.recentVeto(at) };
  }

  /**
   * Dwell/penalty smoothing: `walking` needs STRIDE_WALK_DWELL consecutive
   * stride windows at a stable step frequency and no non-gait verdict within
   * STRIDE_PENALTY_MS; `notStride` needs STRIDE_VETO_DWELL consecutive non-gait
   * windows; `still` is immediate because the window itself spans 3 s.
   */
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

/** Linear resample onto a uniform 50 Hz grid over [from, to]; null when the window cannot be gridded. */
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
