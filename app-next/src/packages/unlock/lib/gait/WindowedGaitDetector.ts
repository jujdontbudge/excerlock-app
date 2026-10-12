import { lateralGait, recentGaitMotion } from './LateralGait';
import { inspectCorroboration, type CorroborationRejection } from './GaitCorroboration';
import type { GaitKeypointSample, GaitLandmark } from '../../../ports/GaitVisionProvider';

export const GAIT_SETTINGS = Object.freeze({
  version: 'windowed-5',
  windowMs: 4_000,
  lateralWindowMs: 8_000,
  lateralCorrelation: 0.7,
  evaluateMs: 250,
  holdMs: 500,
  timeoutMs: 30_000,
  maxGapMs: 200,
  binMs: 100,
  coverage: 0.6,
  sampleHz: 30,
  minHz: 1.2,
  maxHz: 2.5,
  minRepeatCorrelation: 0.5,
  minRms: 0.015,
  minRange: 0.04,
  varianceFloor: 0.000025,
  cycleVariation: 0.65,
  minCameraQuality: 0.7,
  maxCameraRms: 0.015,
  minKneeRms: 0.025,
  maxKneeCorrelation: -0.25,
});
export type GaitRejection =
  | CorroborationRejection
  | 'warmingUp'
  | 'timestamp'
  | 'coverage'
  | 'framingJump'
  | 'recentStillness'
  | 'smallBob'
  | 'rhythm'
  | 'cycles'
  | 'holding'
  | 'walking';
export type WindowedGaitResult = {
  classification: 'walking' | 'notWalking' | 'insufficientSignal';
  confidence: number;
  complete: boolean;
  evaluatedAtMs: number;
  reason: GaitRejection;
  source?: 'face' | 'shoulders';
  rms?: number;
  r?: number;
  r2?: number;
  hz?: number;
};
type Point = { timestampMs: number; x: number; y: number; scale: number };
type Track = 'face' | 'shoulders';
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const quantile = (v: readonly number[], q: number) => [...v].sort((a, b) => a - b)[Math.floor((v.length - 1) * q)];
const valid = (p: GaitLandmark | undefined, confidence: number): p is GaitLandmark =>
  p !== undefined &&
  [p.x, p.y, p.confidence].every(Number.isFinite) &&
  p.confidence >= confidence &&
  p.x >= 0 &&
  p.x <= 1 &&
  p.y >= 0 &&
  p.y <= 1;
function point(sample: GaitKeypointSample, source: Track): Point | undefined {
  const h = sample.head;
  const face = valid(h, 0.5) && h !== undefined && Number.isFinite(h.height) && h.height >= 0.05 && h.height <= 1;
  if (source === 'face')
    return face ? { timestampMs: sample.timestampMs, x: h!.x, y: h!.y, scale: h!.height } : undefined;
  if (sample.bodyAssociated !== true || sample.associationAmbiguous === true) return undefined;
  const l = sample.landmarks?.leftShoulder,
    r = sample.landmarks?.rightShoulder;
  if (!valid(l, 0.6) || !valid(r, 0.6) || Math.abs(l.x - r.x) < 0.03) return undefined;
  const lh = sample.landmarks.leftHip,
    rh = sample.landmarks.rightHip;
  const torso = valid(lh, 0.6) && valid(rh, 0.6) ? Math.abs((lh.y + rh.y - l.y - r.y) / 2) : 0;
  const scale = face ? h!.height : torso * 0.5;
  return scale >= 0.05 ? { timestampMs: sample.timestampMs, x: (l.x + r.x) / 2, y: (l.y + r.y) / 2, scale } : undefined;
}
function pearson(values: readonly number[], lag: number): number {
  const a = values.slice(0, values.length - lag),
    b = values.slice(lag);
  const ma = mean(a),
    mb = mean(b);
  let aa = 0,
    bb = 0,
    ab = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i] - ma,
      y = b[i] - mb;
    aa += x * x;
    bb += y * y;
    ab += x * y;
  }
  if (aa / a.length < GAIT_SETTINGS.varianceFloor || bb / b.length < GAIT_SETTINGS.varianceFloor) return 0;
  return ab / Math.sqrt(aa * bb);
}
function rhythm(values: readonly number[]) {
  let lag = 0,
    r = -1;
  for (
    let k = Math.ceil(GAIT_SETTINGS.sampleHz / GAIT_SETTINGS.maxHz);
    k <= Math.floor(GAIT_SETTINGS.sampleHz / GAIT_SETTINGS.minHz);
    k++
  ) {
    let candidate = pearson(values, k);
    if (candidate > r) {
      r = candidate;
      lag = k;
    }
  }
  return { lag, r, r2: pearson(values, 2 * lag), hz: GAIT_SETTINGS.sampleHz / lag };
}
function evaluate(points: readonly Point[], now: number, source: Track): WindowedGaitResult {
  const start = now - GAIT_SETTINGS.windowMs;
  const p = points.filter((v) => v.timestampMs >= start && v.timestampMs <= now);
  const fail = (reason: GaitRejection, details = {}): WindowedGaitResult => ({
    classification: 'notWalking',
    confidence: 0,
    complete: false,
    evaluatedAtMs: now,
    reason,
    source,
    ...details,
  });
  if (p.length < 2) return fail('coverage');
  const gaps = [
    p[0].timestampMs - start,
    now - p[p.length - 1].timestampMs,
    ...p.slice(1).map((v, i) => v.timestampMs - p[i].timestampMs),
  ];
  if (
    p.length < GAIT_SETTINGS.windowMs * 0.0065 ||
    Math.max(...gaps) > GAIT_SETTINGS.maxGapMs
  )
    return fail('coverage');
  const scale = quantile(
    p.map((v) => v.scale),
    0.5,
  );
  if (
    quantile(
      p.map((v) => v.scale),
      0.9,
    ) /
      quantile(
        p.map((v) => v.scale),
        0.1,
      ) >
    2
  )
    return fail('framingJump');
  const values: number[] = [];
  let j = 1;
  for (let t = start + GAIT_SETTINGS.maxGapMs; t <= now - GAIT_SETTINGS.maxGapMs; t += 1000 / GAIT_SETTINGS.sampleHz) {
    while (j < p.length - 1 && p[j].timestampMs < t) j++;
    const a = p[j - 1],
      b = p[j];
    const f = (t - a.timestampMs) / (b.timestampMs - a.timestampMs);
    values.push((a.y + (b.y - a.y) * f) / scale);
  }
  const smooth = values.map(
    (v, i) => (values[Math.max(0, i - 1)] + v + values[Math.min(values.length - 1, i + 1)]) / 3,
  );
  const detrended = smooth.map((v, i) => v - mean(smooth.slice(Math.max(0, i - 15), Math.min(smooth.length, i + 16))));
  const signal = detrended.slice(15, -15);
  const rms = Math.sqrt(mean(signal.map((v) => v * v)));
  const recent = smooth.slice(-GAIT_SETTINGS.sampleHz);
  const recentMean = mean(recent);
  const recentRms = Math.sqrt(mean(recent.map((v) => (v - recentMean) ** 2)));
  if (recentRms < GAIT_SETTINGS.minRms) return fail('smallBob', { rms, recentRms });
  const result = rhythm(signal),
    details = { rms, r: result.r, r2: result.r2, hz: result.hz };
  if (rms < GAIT_SETTINGS.minRms || quantile(signal, 0.9) - quantile(signal, 0.1) < GAIT_SETTINGS.minRange)
    return fail('smallBob', details);
  if (result.r < GAIT_SETTINGS.minRepeatCorrelation || result.r2 < GAIT_SETTINGS.minRepeatCorrelation)
    return fail('rhythm', details);

  const amplitudes: number[] = [];
  for (let i = 0; i + result.lag <= signal.length; i += result.lag) {
    const cycle = signal.slice(i, i + result.lag);
    amplitudes.push(Math.max(...cycle) - Math.min(...cycle));
  }
  const avg = mean(amplitudes),
    variation = Math.sqrt(mean(amplitudes.map((v) => (v - avg) ** 2))) / avg;
  if (amplitudes.length < 3 || variation > GAIT_SETTINGS.cycleVariation || Math.min(...amplitudes) < avg * 0.25)
    return fail('cycles', details);
  return { ...fail('holding', details), classification: 'walking' };
}
export class WindowedGaitDetector {
  private tracks: Record<Track, Point[]> = { face: [], shoulders: [] };
  private samples: GaitKeypointSample[] = [];
  private lastSequence: number | undefined;
  private lastTimestamp = -Infinity;
  private lastEvaluation = -Infinity;
  private evidenceSince: number | undefined;
  private source: Track | undefined;
  private startedAtMs: number;
  private result: WindowedGaitResult;
  constructor(options: { startedAtMs: number }) {
    if (!Number.isFinite(options.startedAtMs)) throw new Error('Invalid gait start');
    this.startedAtMs = options.startedAtMs;
    this.result = {
      classification: 'insufficientSignal',
      confidence: 0,
      complete: false,
      evaluatedAtMs: options.startedAtMs,
      reason: 'warmingUp',
    };
  }
  process(sample: GaitKeypointSample, receivedAtMs = sample.timestampMs): WindowedGaitResult {
    const now = sample.timestampMs;
    if (
      !Number.isFinite(now) ||
      now <= this.lastTimestamp ||
      now < this.startedAtMs ||
      !Number.isFinite(receivedAtMs) ||
      now > receivedAtMs ||
      receivedAtMs - now > GAIT_SETTINGS.maxGapMs
    ) {
      this.resetEvidence();
      this.result = {
        classification: 'insufficientSignal',
        confidence: 0,
        complete: false,
        evaluatedAtMs: Number.isFinite(receivedAtMs) ? receivedAtMs : this.startedAtMs,
        reason: 'timestamp',
      };
      return this.result;
    }
    if (sample.sequence !== undefined) {
      if (
        !Number.isSafeInteger(sample.sequence) ||
        sample.sequence < 0 ||
        (this.lastSequence !== undefined && sample.sequence <= this.lastSequence)
      ) {
        this.resetEvidence();
        this.result = {
          classification: 'insufficientSignal',
          confidence: 0,
          complete: false,
          evaluatedAtMs: now,
          reason: 'timestamp',
        };
        return this.result;
      }
      this.lastSequence = sample.sequence;
    }
    this.lastTimestamp = now;
    if (sample.empty) this.resetEvidence();
    this.samples.push(sample);
    this.samples = this.samples.filter((s) => s.timestampMs >= now - GAIT_SETTINGS.windowMs);
    for (const source of ['face', 'shoulders'] as const) {
      const next = point(sample, source),
        track = this.tracks[source];
      const previous = track[track.length - 1];
      if (
        next &&
        previous &&
        (Math.abs(next.x - previous.x) > previous.scale * 0.75 ||
          Math.abs(next.y - previous.y) > previous.scale * 0.75 ||
          Math.max(next.scale / previous.scale, previous.scale / next.scale) > 1.5)
      )
        this.resetEvidence();
      if (next) this.tracks[source].push(next);
      this.tracks[source] = this.tracks[source].filter((v) => v.timestampMs >= now - GAIT_SETTINGS.lateralWindowMs);
    }
    if (now - this.startedAtMs < GAIT_SETTINGS.windowMs || now - this.lastEvaluation < GAIT_SETTINGS.evaluateMs)
      return this.getResult(receivedAtMs);
    this.lastEvaluation = now;
    const face = evaluate(this.tracks.face, now, 'face'),
      shoulders = evaluate(this.tracks.shoulders, now, 'shoulders');
    let candidate =
      this.source === 'shoulders' && shoulders.classification === 'walking'
        ? shoulders
        : face.classification === 'walking'
          ? face
          : shoulders.classification === 'walking'
            ? shoulders
            : face.reason === 'coverage'
              ? shoulders
              : face;
    if (candidate.classification !== 'walking' &&
      [4_000, 5_000, 6_000, 7_000, GAIT_SETTINGS.lateralWindowMs].some((duration) => lateralGait(this.tracks.face, now, duration, GAIT_SETTINGS.lateralCorrelation)))
      candidate = { ...face, source: 'face', classification: 'walking', reason: 'holding' };
    if (candidate.source && candidate.reason !== 'coverage' && !recentGaitMotion(this.tracks[candidate.source], now))
      candidate = { ...candidate, classification: 'notWalking', reason: 'recentStillness' };
    if (candidate.classification === 'walking') {
      const track = this.tracks[candidate.source!];
      const rejection = inspectCorroboration(
        this.samples,
        now,
        quantile(
          track.map((p) => p.scale),
          0.5,
        ),
        GAIT_SETTINGS,
      );
      if (rejection) candidate = { ...candidate, classification: 'notWalking', reason: rejection };
    }
    if (candidate.classification !== 'walking') {
      this.evidenceSince = undefined;
      this.source = undefined;
      this.result = candidate;
    } else {
      if (this.source !== candidate.source) this.evidenceSince = undefined;
      this.source = candidate.source;
      this.evidenceSince ??= now;
      const held = now - this.evidenceSince,
        complete = held >= GAIT_SETTINGS.holdMs;
      this.result = {
        ...candidate,
        confidence: Math.min(1, (held + GAIT_SETTINGS.evaluateMs) / (GAIT_SETTINGS.holdMs + GAIT_SETTINGS.evaluateMs)),
        complete,
        reason: complete ? 'walking' : 'holding',
      };
    }
    return this.getResult(receivedAtMs);
  }
  getResult(now: number): WindowedGaitResult {
    if (now - this.lastTimestamp > GAIT_SETTINGS.maxGapMs) {
      this.evidenceSince = undefined;
      this.source = undefined;
      this.result = {
        classification: 'insufficientSignal',
        confidence: 0,
        complete: false,
        evaluatedAtMs: now,
        reason: 'coverage',
      };
    }
    return this.result;
  }
  private resetEvidence(): void {
    this.tracks = { face: [], shoulders: [] };
    this.samples = [];
    this.evidenceSince = undefined;
    this.source = undefined;
    this.lastEvaluation = -Infinity;
    this.result = {
      classification: 'insufficientSignal',
      confidence: 0,
      complete: false,
      evaluatedAtMs: this.lastTimestamp,
      reason: 'framingJump',
    };
  }
}
