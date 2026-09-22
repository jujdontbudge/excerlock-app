export type DemoTestQuery = { demoTime?: string; demoPause?: string };
/** Preview/dev only. No draft override, permissions, detector or unlock APIs. */
export function demoTestControl(enabled: boolean, query: DemoTestQuery, total: number) {
  if (!enabled || !query.demoTime || !/^\d+(\.\d+)?$/.test(query.demoTime)) return null;
  const time = Number(query.demoTime);
  if (!Number.isFinite(time) || time < 0 || time >= total) return null;
  return { time, paused: query.demoPause === '1' };
}
