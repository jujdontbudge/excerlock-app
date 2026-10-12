export type GaitPoint = { timestampMs: number; x: number; y: number; scale: number };
const mean = (values: readonly number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
function detrend(values: readonly number[]): number[] {
  const center = (values.length - 1) / 2;
  const average = mean(values);
  const slope = values.reduce((sum, value, index) => sum + (index - center) * (value - average), 0) /
    values.reduce((sum, _, index) => sum + (index - center) ** 2, 0);
  return values.map((value, index) => value - average - slope * (index - center));
}
function correlation(values: readonly number[], lag: number): number {
  const a = values.slice(0, -lag), b = values.slice(lag);
  const ma = mean(a), mb = mean(b);
  const aa = a.reduce((sum, value) => sum + (value - ma) ** 2, 0);
  const bb = b.reduce((sum, value) => sum + (value - mb) ** 2, 0);
  return a.reduce((sum, value, index) => sum + (value - ma) * (b[index] - mb), 0) / Math.sqrt(aa * bb);
}
export function lateralGait(points: readonly GaitPoint[], now: number, windowMs: number, minCorrelation: number): boolean {
  const start = now - windowMs;
  const p = points.filter((value) => value.timestampMs >= start && value.timestampMs <= now);
  if (p.length < windowMs * 0.0065 || p[0].timestampMs - start > 200 || now - p[p.length - 1].timestampMs > 200) return false;
  if (p.slice(1).some((value, index) => value.timestampMs - p[index].timestampMs > 200)) return false;
  const scales = p.map((value) => value.scale).sort((a, b) => a - b);
  const scale = scales[Math.floor(scales.length / 2)];
  if (scales[Math.floor(scales.length * 0.9)] / scales[Math.floor(scales.length * 0.1)] > 2) return false;
  const axes: number[][] = [];
  for (const axis of ['x', 'y'] as const) {
    const values: number[] = [];
    let index = 1;
    for (let at = start + 100; at < now - 100; at += 1000 / 30) {
      while (index < p.length - 1 && p[index].timestampMs < at) index++;
      const a = p[index - 1], b = p[index];
      const fraction = (at - a.timestampMs) / (b.timestampMs - a.timestampMs);
      values.push((a[axis] + fraction * (b[axis] - a[axis])) / scale);
    }
    axes.push(detrend(values.map((value, i) => (values[Math.max(0, i - 1)] + value + values[Math.min(values.length - 1, i + 1)]) / 3)));
  }
  const recent = p.filter((value) => value.timestampMs >= now - 1500).map((value) => value.x / scale);
  const recentMean = mean(recent);
  if (mean(recent.map((value) => (value - recentMean) ** 2)) < 0.08 ** 2) return false;
  const [x, y] = axes;
  const energy = mean(x.map((value) => value * value));
  if (energy < 0.15 ** 2 || mean(y.map((value) => value * value)) / energy > 0.5) return false;
  for (let lag = 24; lag <= x.length / 2; lag++) {
    if (correlation(x, lag) >= minCorrelation) return true;
  }
  return false;
}
export function recentGaitMotion(points: readonly GaitPoint[], now: number): boolean {
  const recent = points.filter((point) => point.timestampMs >= now - 1200);
  if (recent.length < 6) return false;
  const scale = mean(recent.map((point) => point.scale));
  const times = recent.map((point) => point.timestampMs - now);
  const center = mean(times);
  const variance = mean(times.map((time) => (time - center) ** 2));
  let energy = 0;
  for (const axis of ['x', 'y'] as const) {
    const average = mean(recent.map((point) => point[axis] / scale));
    const slope = mean(recent.map((point, index) => (point[axis] / scale - average) * (times[index] - center))) / variance;
    energy += mean(recent.map((point, index) => (point[axis] / scale - average - slope * (times[index] - center)) ** 2));
  }
  return energy >= 0.025 ** 2;
}
