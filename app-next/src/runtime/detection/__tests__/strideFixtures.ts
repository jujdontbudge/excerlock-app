import captures from './fixtures/strideRhythmCaptures.json';
import type { StrideMotionSample } from '../StrideRhythm';

export type StrideSegmentName = keyof typeof captures.segments;

/** Real 50 Hz capture segments as analyzer samples, `t` offset by `startAt`. */
export function strideSegment(name: StrideSegmentName, startAt = 0): StrideMotionSample[] {
  return captures.segments[name].rows.map(([t, ux, uy, uz, gx, gy, gz, rx, ry, rz]) => ({
    t: startAt + t,
    userAcceleration: { x: ux, y: uy, z: uz },
    gravity: { x: gx, y: gy, z: gz },
    rotationRate: { x: rx, y: ry, z: rz },
  }));
}

/** A phone lying flat and untouched: gravity on -z, sensor noise only. */
export function stillSamples(startAt: number, durationMs: number, seed = 1): StrideMotionSample[] {
  const out: StrideMotionSample[] = [];
  let state = seed;
  const noise = () => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return (state / 2147483648 - 0.5) * 0.004;
  };
  for (let t = 0; t <= durationMs; t += 20) {
    out.push({
      t: startAt + t,
      userAcceleration: { x: noise(), y: noise(), z: noise() },
      gravity: { x: 0.01, y: -0.02, z: -0.999 },
      rotationRate: { x: noise(), y: noise(), z: noise() },
    });
  }
  return out;
}

/** A perfectly one-dimensional oscillation along gravity: a metronomic vertical shake. */
export function pureVerticalOscillation(startAt: number, durationMs: number, hz: number, amplitudeG: number): StrideMotionSample[] {
  const out: StrideMotionSample[] = [];
  for (let t = 0; t <= durationMs; t += 20) {
    const phase = (2 * Math.PI * hz * t) / 1000;
    out.push({
      t: startAt + t,
      userAcceleration: { x: 0, y: 0, z: -amplitudeG * Math.sin(phase) },
      gravity: { x: 0, y: 0, z: -1 },
      rotationRate: { x: 0, y: 0, z: 0 },
    });
  }
  return out;
}
