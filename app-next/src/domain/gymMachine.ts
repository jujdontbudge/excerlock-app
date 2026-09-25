import type { GymTransitionRecord } from '../engine/signals/location/GymVisitLog';
export const GYM_CONFIRM_MS = 10_000;
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
  coverageLostAt: Record<string, number>;
};
export type GymEvent =
  | { kind: 'records'; records: readonly GymTransitionRecord[] }
  | { kind: 'tick' }
  | { kind: 'coverageLost'; regionId?: string };
export function createGymState(now: number): GymDetectionState {
  valid(now);
  return { version: 1, watermark: now, records: [], regions: {}, intervals: [], coverageLostAt: {} };
}
export function reduceGym(previous: GymDetectionState, event: GymEvent, now: number): GymDetectionState {
  valid(now);
  validate(previous);
  const current = Math.max(now, previous.watermark);
  let records = previous.records;
  let coverageLostAt = { ...previous.coverageLostAt };
  if (event.kind === 'records') {
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const record of event.records) if (record.atMs <= now && !byId.has(record.id)) byId.set(record.id, record);
    records = [...byId.values()];
  } else if (event.kind === 'coverageLost') {
    const ids = event.regionId
      ? [event.regionId]
      : new Set([...Object.keys(previous.regions), ...records.map((record) => record.regionId)]);
    for (const id of ids) coverageLostAt[id] = current;
  }
  const derived = derive(records, current, coverageLostAt, previous.intervals);
  return { version: 1, watermark: current, records, coverageLostAt, ...derived };
}
function derive(
  records: readonly GymTransitionRecord[],
  now: number,
  coverageLostAt: Record<string, number>,
  knownIntervals: readonly GymInterval[],
) {
  const regions: Record<string, GymRegionState> = {};
  const intervals: GymInterval[] = [];
  for (const record of [...records].sort(
    (a, b) => a.atMs - b.atMs || transitionRank(a.type) - transitionRank(b.type) || a.id.localeCompare(b.id),
  )) {
    applyCoverageDue(regions, intervals, coverageLostAt, knownIntervals, record.atMs);
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
  applyCoverageDue(regions, intervals, coverageLostAt, knownIntervals, now);
  confirmDue(regions, intervals, now);
  return { regions, intervals };
}
function applyCoverageDue(
  regions: Record<string, GymRegionState>,
  intervals: GymInterval[],
  coverageLostAt: Record<string, number>,
  knownIntervals: readonly GymInterval[],
  at: number,
): void {
  for (const [regionId, lostAt] of Object.entries(coverageLostAt)) {
    if (lostAt > at) continue;
    const region = regions[regionId];
    if (!region || (region.lastEventAt ?? -Infinity) > lostAt) continue;
    const open = [...intervals].reverse().find((visit) => visit.regionId === regionId && visit.exitedAt === null);
    if (open) open.exitedAt = Math.max(open.confirmedAt, lostAt);
    else {
      const known = [...knownIntervals]
        .reverse()
        .find((visit) => visit.regionId === regionId && visit.exitedAt === null);
      if (known && !intervals.some(({ id }) => id === known.id))
        intervals.push({ ...known, exitedAt: Math.max(known.confirmedAt, lostAt) });
    }
    region.pendingEnterAt = null;
    region.confirmedSince = null;
  }
}
const transitionRank = (type: GymTransitionRecord['type']) => (type === 'enter' ? 0 : 1);
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
export function pruneGymHistoryBefore(state: GymDetectionState, cutoffMs: number): GymDetectionState {
  valid(cutoffMs);
  validate(state);
  const records = retainTransitions(state.records, cutoffMs);
  const intervals = state.intervals.filter((visit) => visit.exitedAt === null || visit.exitedAt >= cutoffMs);
  return { ...state, records, intervals };
}
function retainTransitions(records: readonly GymTransitionRecord[], cutoffMs: number): GymTransitionRecord[] {
  const retained = records.filter(({ atMs }) => atMs >= cutoffMs);
  for (const regionId of new Set(records.map(({ regionId }) => regionId))) {
    const boundary = records.filter((r) => r.regionId === regionId && r.atMs < cutoffMs)
      .sort((a, b) => b.atMs - a.atMs || b.id.localeCompare(a.id))[0];
    if (boundary?.type === 'enter') retained.push(boundary);
  }
  return retained.sort((a, b) => a.atMs - b.atMs || a.id.localeCompare(b.id));
}
function valid(value: number): void {
  if (!Number.isFinite(value)) throw new Error('Invalid gym timestamp');
}
function validate(state: GymDetectionState): void {
  if (
    state.version !== 1 ||
    !Number.isFinite(state.watermark) ||
    !Array.isArray(state.records) ||
    state.records.some(
      (row) =>
        !row ||
        typeof row.id !== 'string' ||
        typeof row.regionId !== 'string' ||
        !['enter', 'exit'].includes(row.type) ||
        !Number.isFinite(row.atMs) ||
        !Number.isFinite(row.receivedAtMs),
    ) ||
    typeof state.coverageLostAt !== 'object' ||
    Object.values(state.coverageLostAt).some((value) => !Number.isFinite(value))
  )
    throw new Error('Invalid persisted gym state');
}
