import type { GaitKeypointSample, GaitLandmark } from '../../../ports/GaitVisionProvider';
export type CorroborationRejection = 'cameraMotion' | 'cameraCoverage' | 'kneeCoverage' | 'kneeAlternation';
type Settings = {
  windowMs: number;
  binMs: number;
  maxGapMs: number;
  coverage: number;
  minCameraQuality: number;
  maxCameraRms: number;
  minKneeRms: number;
  maxKneeCorrelation: number;
};
export function windowCoverage(
  points: readonly { timestampMs: number }[],
  now: number,
  settings: Pick<Settings, 'windowMs' | 'binMs' | 'maxGapMs' | 'coverage'>,
): boolean {
  if (points.length < 2) return false;
  const start = now - settings.windowMs,
    count = settings.windowMs / settings.binMs;
  const bins = new Set(points.map((p) => Math.min(count - 1, Math.floor((p.timestampMs - start) / settings.binMs))));
  const gaps = [
    points[0].timestampMs - start,
    now - points[points.length - 1].timestampMs,
    ...points.slice(1).map((p, i) => p.timestampMs - points[i].timestampMs),
  ];
  return bins.size / count >= settings.coverage && Math.max(...gaps) <= settings.maxGapMs;
}
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
function detrend(values: readonly number[]) {
  const center = (values.length - 1) / 2,
    avg = mean(values);
  const denominator = values.reduce((a, _, i) => a + (i - center) ** 2, 0);
  const slope = values.reduce((a, v, i) => a + (i - center) * (v - avg), 0) / denominator;
  return values.map((v, i) => v - avg - slope * (i - center));
}
const valid = (p: GaitLandmark | undefined): p is GaitLandmark =>
  !!p &&
  [p.x, p.y, p.confidence].every(Number.isFinite) &&
  p.confidence >= 0.6 &&
  p.x >= 0 &&
  p.x <= 1 &&
  p.y >= 0 &&
  p.y <= 1;
export function inspectCorroboration(
  samples: readonly GaitKeypointSample[],
  now: number,
  scale: number,
  settings: Settings,
): CorroborationRejection | undefined {
  if (samples.some((s) => s.cameraMotion !== undefined)) {
    const camera = samples.filter(
      (s) =>
        s.cameraMotion &&
        [s.cameraMotion.x, s.cameraMotion.y, s.cameraMotion.quality].every(Number.isFinite) &&
        s.cameraMotion.quality >= settings.minCameraQuality,
    );
    if (!windowCoverage(camera, now, settings)) return 'cameraCoverage';
    let x = 0,
      y = 0;
    const positions = camera.map((s) => {
      x += s.cameraMotion!.x / scale;
      y += s.cameraMotion!.y / scale;
      return { x, y };
    });
    const horizontal = detrend(positions.map((p) => p.x)),
      vertical = detrend(positions.map((p) => p.y));
    if (Math.sqrt(mean(horizontal.map((v, i) => v * v + vertical[i] ** 2))) > settings.maxCameraRms)
      return 'cameraMotion';
  }
  const visible = samples.filter((s) => valid(s.landmarks.leftKnee) || valid(s.landmarks.rightKnee));
  if (visible.length / Math.max(1, samples.length) < 0.25) return undefined;
  const knees = samples.filter(
    (s) =>
      valid(s.landmarks.leftKnee) &&
      valid(s.landmarks.rightKnee) &&
      valid(s.landmarks.leftHip) &&
      valid(s.landmarks.rightHip) &&
      Math.abs(s.landmarks.leftKnee!.x - s.landmarks.rightKnee!.x) >= 0.03 &&
      s.landmarks.leftKnee!.y > s.landmarks.leftHip!.y &&
      s.landmarks.rightKnee!.y > s.landmarks.rightHip!.y,
  );
  if (!windowCoverage(knees, now, settings)) return 'kneeCoverage';
  const left = detrend(knees.map((s) => (s.landmarks.leftKnee!.y - s.landmarks.leftHip!.y) / scale));
  const right = detrend(knees.map((s) => (s.landmarks.rightKnee!.y - s.landmarks.rightHip!.y) / scale));
  const lv = mean(left.map((v) => v * v)),
    rv = mean(right.map((v) => v * v));
  if (
    Math.sqrt(lv) < settings.minKneeRms ||
    Math.sqrt(rv) < settings.minKneeRms ||
    mean(left.map((v, i) => v * right[i])) / Math.sqrt(lv * rv) > settings.maxKneeCorrelation
  )
    return 'kneeAlternation';
  return undefined;
}
