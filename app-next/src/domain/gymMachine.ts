import type { GymTransitionRecord } from '../engine/signals/location/GymVisitLog';
export const GYM_CONFIRM_MS = 30_000;
export type GymInterval = {
  id: string;
  regionId: string;
  enteredAt: number;
  confirmedAt: number;
  exitedAt: number | null;
};
export type GymRegionState = {
  pendingEnterAt: number | null;
  confirmedSince: number | null;
  lastEventAt: number | null;
};
export type GymDetectionState = {
  version: 1;
  watermark: number;
  records: GymTransitionRecord[];
  regions: Record<string, GymRegionState>;
  intervals: GymInterval[];
  coverageLostAt: number | null;
};
export type GymEvent =
  | { kind: 'records'; records: readonly GymTransitionRecord[] }
  | { kind: 'tick' }
  | { kind: 'coverageLost'; regionId?: string };
export function createGymState(now: number): GymDetectionState {
  valid(now);
  return { version: 1, watermark: now, records: [], regions: {}, intervals: [], coverageLostAt: null };
}
export function reduceGym(previous: GymDetectionState, event: GymEvent, now: number): GymDetectionState {
  valid(now);
  validate(previous);
  const current = Math.max(now, previous.watermark);
  let records = previous.records;
  let coverageLostAt = previous.coverageLostAt;
  if (event.kind === 'records') {
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const record of event.records) if (record.atMs <= now && !byId.has(record.id)) byId.set(record.id, record);
    records = [...byId.values()];
  } else if (event.kind === 'coverageLost' && event.regionId === undefined) coverageLostAt = current;
  const derived = derive(records, current, coverageLostAt);
  if (event.kind === 'coverageLost' && event.regionId !== undefined && derived.regions[event.regionId]) {
    derived.regions[event.regionId] = {
      ...derived.regions[event.regionId],
      pendingEnterAt: null,
      confirmedSince: null,
    };
  }
  return { version: 1, watermark: current, records, coverageLostAt, ...derived };
}
function derive(records: readonly GymTransitionRecord[], now: number, coverageLostAt: number | null) {
  const regions: Record<string, GymRegionState> = {};
  const intervals: GymInterval[] = [];
  for (const record of [...records].sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id))) {
    confirmDue(regions, intervals, record.atMs);
    const region = regions[record.regionId] ?? { pendingEnterAt: null, confirmedSince: null, lastEventAt: null };
    if (record.type === 'enter') {
      if (region.confirmedSince === null && region.pendingEnterAt === null) region.pendingEnterAt = record.atMs;
    } else {
      if (region.confirmedSince !== null) {
        const open = [...intervals]
          .reverse()
          .find((visit) => visit.regionId === record.regionId && visit.exitedAt === null);
        if (open) open.exitedAt = Math.max(region.confirmedSince, record.atMs);
      }
      region.pendingEnterAt = null;
      region.confirmedSince = null;
    }
    region.lastEventAt = Math.max(region.lastEventAt ?? record.atMs, record.atMs);
    regions[record.regionId] = region;
  }
  confirmDue(regions, intervals, now);
  if (coverageLostAt !== null)
    for (const region of Object.values(regions))
      if ((region.lastEventAt ?? -Infinity) <= coverageLostAt) {
        region.pendingEnterAt = null;
        region.confirmedSince = null;
      }
  return { regions, intervals };
}
function confirmDue(regions: Record<string, GymRegionState>, intervals: GymInterval[], at: number): void {
  for (const [regionId, region] of Object.entries(regions))
    if (region.pendingEnterAt !== null && at >= region.pendingEnterAt + GYM_CONFIRM_MS) {
      const confirmedAt = region.pendingEnterAt + GYM_CONFIRM_MS;
      region.confirmedSince = confirmedAt;
      intervals.push({
        id: `${regionId}:${region.pendingEnterAt}`,
        regionId,
        enteredAt: region.pendingEnterAt,
        confirmedAt,
        exitedAt: null,
      });
      region.pendingEnterAt = null;
    }
}
export function confirmedGymRegions(state: GymDetectionState): string[] {
  return Object.entries(state.regions)
    .filter(([, value]) => value.confirmedSince !== null)
    .map(([id]) => id);
}
export function gymDwellMs(state: GymDetectionState, regionId: string, now: number): number {
  return state.intervals
    .filter((v) => v.regionId === regionId)
    .reduce((sum, visit) => sum + Math.max(0, (visit.exitedAt ?? now) - visit.confirmedAt), 0);
}
function valid(value: number): void {
  if (!Number.isFinite(value)) throw new Error('Invalid gym timestamp');
}
function validate(state: GymDetectionState): void {
  if (state.version !== 1 || !Number.isFinite(state.watermark) || !Array.isArray(state.records))
    throw new Error('Invalid persisted gym state');
}
