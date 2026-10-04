import type { StrideMotionSample } from './StrideRhythm';

export const FILMING_STEPS = {
  riseG: 0.12,
  aliveG: 0.09,
  rearmG: -0.03,
  peakDropG: 0.04,
  smoothingSamples: 3,
  minStepGapMs: 250,
  maxStepGapMs: 1000,
  startWindowMs: 1300,
  startSteps: 2,
  stopMs: 1000,
  staleMs: 2000,
} as const;

export type FilmingVerdict = 'walking' | 'stopped' | 'unknown';

function upwardG(sample: StrideMotionSample): number | null {
  const { gravity, userAcceleration } = sample;
  const size = Math.hypot(gravity.x, gravity.y, gravity.z);
  if (!(size > 0)) return null;
  const along = -(userAcceleration.x * gravity.x + userAcceleration.y * gravity.y + userAcceleration.z * gravity.z) / size;
  return Number.isFinite(along) ? along : null;
}

export class FilmingSteps {
  private smoothing: number[] = [];
  private armed = true;
  private peak: { at: number; g: number } | null = null;
  private steps: number[] = [];
  private aliveAt: number | null = null;
  private walking = false;
  private firstAt: number | null = null;
  private lastAt: number | null = null;

  push(sample: StrideMotionSample): FilmingVerdict {
    const g = upwardG(sample);
    if (g === null || !Number.isFinite(sample.t) || (this.lastAt !== null && sample.t <= this.lastAt))
      return this.verdictAt(this.lastAt ?? sample.t);
    const at = sample.t;
    this.firstAt ??= at;
    this.lastAt = at;
    this.smoothing.push(g);
    if (this.smoothing.length > FILMING_STEPS.smoothingSamples) this.smoothing.shift();
    const smoothed = this.smoothing.reduce((sum, value) => sum + value, 0) / this.smoothing.length;
    if (Math.abs(smoothed) >= FILMING_STEPS.aliveG) this.aliveAt = at;
    if (this.armed && smoothed >= FILMING_STEPS.riseG && (this.peak === null || smoothed > this.peak.g))
      this.peak = { at, g: smoothed };
    if (this.armed && this.peak !== null && smoothed < this.peak.g - FILMING_STEPS.peakDropG) {
      const previous = this.steps[this.steps.length - 1];
      if (previous === undefined || this.peak.at - previous >= FILMING_STEPS.minStepGapMs) this.steps.push(this.peak.at);
      this.armed = false;
      this.peak = null;
    }
    if (!this.armed && smoothed <= FILMING_STEPS.rearmG) this.armed = true;
    this.steps = this.steps.filter((step) => at - step <= FILMING_STEPS.startWindowMs);
    if (!this.walking && this.rhythmic()) this.walking = true;
    else if (this.walking && !this.moving(at)) this.walking = false;
    return this.verdictAt(at);
  }

  verdictAt(at: number): FilmingVerdict {
    if (this.lastAt === null || this.firstAt === null || at - this.lastAt > FILMING_STEPS.staleMs) return 'unknown';
    if (this.walking && this.moving(at)) return 'walking';
    return at - this.firstAt < FILMING_STEPS.stopMs ? 'unknown' : 'stopped';
  }

  sampledAt(): number | null {
    return this.lastAt;
  }

  private moving(at: number): boolean {
    return this.aliveAt !== null && at - this.aliveAt <= FILMING_STEPS.stopMs;
  }

  private rhythmic(): boolean {
    if (this.steps.length < FILMING_STEPS.startSteps) return false;
    return this.steps.every(
      (step, index) =>
        index === 0 ||
        (step - this.steps[index - 1] >= FILMING_STEPS.minStepGapMs &&
          step - this.steps[index - 1] <= FILMING_STEPS.maxStepGapMs),
    );
  }
}
