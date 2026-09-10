import { addDays, dayKey, localDayStart } from '../../domain/calendar';

export const MAX_VERIFIED_OBSERVATION_GAP_MS = 5_000;
const KEY = 'excerlock-next.walking-duration-ledger.v1';

export type WalkingDurationCursor = {
  generation: number;
  at: number;
  verified: boolean;
  timezone: string;
};
export type PendingWalkingDuration = {
  idempotencyKey: string;
  generation: number;
  day: string;
  milliseconds: number;
  endedAt: number;
};
export type VerifiedWalkingSegment = {
  from: number;
  to: number;
  day: string;
  timezone: string;
};
export type WalkingDurationState = {
  version: 1;
  generation: number | null;
  cursor: WalkingDurationCursor | null;
  millisecondsByDay: Record<string, number>;
  pending: PendingWalkingDuration[];
  segments: VerifiedWalkingSegment[];
};
export interface WalkingDurationStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export type WalkingDurationObservation = WalkingDurationCursor;

const empty = (generation: number | null = null): WalkingDurationState => ({
  version: 1, generation, cursor: null, millisecondsByDay: {}, pending: [], segments: [],
});

/**
 * Durable measured-time authority. Only adjacent committed verified samples
 * create time; the five-second cap prevents suspension from fabricating it.
 * Totals, cursor and projection intents share one atomic storage write.
 */
export class WalkingDurationLedger {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: WalkingDurationStorage) {}

  read(): Promise<WalkingDurationState> { return this.serialize(() => this.load()); }

  observe(observation: WalkingDurationObservation): Promise<WalkingDurationState> {
    return this.serialize(async () => {
      validateObservation(observation);
      let state = await this.load();
      if (state.generation !== observation.generation) {
        if (state.generation !== null && observation.generation < state.generation)
          throw new Error('Obsolete walking duration generation');
        state = empty(observation.generation);
      }
      const prior = state.cursor;
      if (prior && observation.at < prior.at) throw new Error('Obsolete walking duration observation');
      if (prior && observation.at === prior.at) {
        // A negative observation dominates at the same timestamp.
        if (prior.verified && !observation.verified) {
          state = { ...state, cursor: observation };
          await this.save(state);
        }
        return state;
      }
      let next = state;
      // A timezone change cannot reframe an in-flight verified run. The first
      // verified observation owns its temporal frame until negative evidence
      // closes continuity; only the next run adopts the device's new timezone.
      const cursor = prior?.verified && observation.verified
        ? { ...observation, timezone: prior.timezone }
        : observation;
      if (prior?.verified && observation.verified) {
        const end = Math.min(observation.at, prior.at + MAX_VERIFIED_OBSERVATION_GAP_MS);
        next = addInterval(next, prior.at, end, prior.timezone, observation.generation);
      }
      next = { ...next, cursor };
      await this.save(next);
      return next;
    });
  }

  acknowledge(idempotencyKeys: readonly string[], generation: number): Promise<WalkingDurationState> {
    return this.serialize(async () => {
      const state = await this.load();
      if (state.generation !== generation) throw new Error('Obsolete walking duration generation');
      const keys = new Set(idempotencyKeys);
      const next = { ...state, pending: state.pending.filter((intent) => !keys.has(intent.idempotencyKey)) };
      if (next.pending.length !== state.pending.length) await this.save(next);
      return next;
    });
  }

  reset(): Promise<void> { return this.serialize(() => this.save(empty())); }

  /** Removes only sealed daily totals. Cursor, generation, and unacknowledged
   * projection intents remain authoritative even when older than the cutoff. */
  pruneBeforeDay(cutoffDay: string): Promise<WalkingDurationState> {
    return this.serialize(async () => {
      validateRetentionDay(cutoffDay);
      const state = await this.load();
      const pendingDays = new Set(state.pending.map(({ day }) => day));
      const millisecondsByDay = Object.fromEntries(
        Object.entries(state.millisecondsByDay).filter(([day]) => day >= cutoffDay || pendingDays.has(day)),
      );
      const segments = state.segments.filter((segment) =>
        segment.day >= cutoffDay || state.pending.some((intent) => intent.day === segment.day &&
          intent.endedAt > segment.from && intent.endedAt - intent.milliseconds < segment.to));
      const next = { ...state, millisecondsByDay, segments };
      if (Object.keys(millisecondsByDay).length !== Object.keys(state.millisecondsByDay).length || segments.length !== state.segments.length)
        await this.save(next);
      return next;
    });
  }

  private async load(): Promise<WalkingDurationState> {
    const raw = await this.storage.getItem(KEY);
    if (raw === null) return empty();
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error('Invalid walking duration ledger'); }
    if (!validState(value)) throw new Error('Invalid walking duration ledger');
    // v1 aggregates predate exact evidence. Never fabricate segments from totals.
    return { ...value, segments: Array.isArray((value as Partial<WalkingDurationState>).segments) ?
      (value as WalkingDurationState).segments : [] };
  }
  private save(state: WalkingDurationState): Promise<void> { return this.storage.setItem(KEY, JSON.stringify(state)); }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
}
function validateRetentionDay(day: string): void {
  const parsed = Date.parse(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(parsed) || new Date(parsed).toISOString().slice(0, 10) !== day)
    throw new Error('Invalid walking retention day');
}

function addInterval(state: WalkingDurationState, start: number, end: number, timezone: string, generation: number): WalkingDurationState {
  if (end <= start) return state;
  const totals = { ...state.millisecondsByDay };
  const pending = [...state.pending];
  const segments = [...state.segments];
  let cursor = start;
  while (cursor < end) {
    const day = dayKey(new Date(cursor).toISOString(), timezone);
    const midnight = Date.parse(localDayStart(addDays(day, 1), timezone));
    if (!Number.isFinite(midnight) || midnight <= cursor) throw new Error('Invalid local walking boundary');
    const segmentEnd = Math.min(end, midnight);
    const milliseconds = segmentEnd - cursor;
    const total = (totals[day] ?? 0) + milliseconds;
    if (!Number.isSafeInteger(total)) throw new Error('Walking duration exceeds supported range');
    totals[day] = total;
    pending.push({
      idempotencyKey: `walking:${generation}:${cursor}:${segmentEnd}`,
      generation, day, milliseconds, endedAt: segmentEnd,
    });
    const previous = segments[segments.length - 1];
    if (previous && previous.to === cursor && previous.day === day && previous.timezone === timezone)
      segments[segments.length - 1] = { ...previous, to: segmentEnd };
    else segments.push({ from: cursor, to: segmentEnd, day, timezone });
    cursor = segmentEnd;
  }
  return { ...state, millisecondsByDay: totals, pending, segments };
}

function validateObservation(value: WalkingDurationObservation): void {
  if (!Number.isSafeInteger(value.generation) || value.generation < 0 || !Number.isFinite(value.at) ||
    typeof value.verified !== 'boolean' || !value.timezone) throw new Error('Invalid walking duration observation');
  // Validate the IANA identifier now, rather than corrupting a durable cursor.
  dayKey(new Date(value.at).toISOString(), value.timezone);
}
function validState(value: unknown): value is WalkingDurationState {
  if (!value || typeof value !== 'object') return false;
  const state = value as WalkingDurationState;
  if (state.version !== 1 || (state.generation !== null && (!Number.isSafeInteger(state.generation) || state.generation < 0)) ||
    !state.millisecondsByDay || typeof state.millisecondsByDay !== 'object' || !Array.isArray(state.pending) ||
    (state.segments !== undefined && !Array.isArray(state.segments))) return false;
  if (state.cursor !== null) {
    try { validateObservation(state.cursor); } catch { return false; }
    if (state.cursor.generation !== state.generation) return false;
  }
  const segments = state.segments ?? [];
  return Object.entries(state.millisecondsByDay).every(([day, ms]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(ms) && ms >= 0) &&
    state.pending.every((p) => p && typeof p.idempotencyKey === 'string' && p.generation === state.generation &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.day) && Number.isSafeInteger(p.milliseconds) && p.milliseconds > 0 && Number.isFinite(p.endedAt)) &&
    validSegments(segments);
}
function validSegments(segments: readonly VerifiedWalkingSegment[]): boolean {
  let previousTo = -Infinity;
  for (const segment of segments) {
    if (!segment || !Number.isSafeInteger(segment.from) || !Number.isSafeInteger(segment.to) || segment.to <= segment.from ||
      segment.from < previousTo || typeof segment.timezone !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(segment.day)) return false;
    try {
      if (dayKey(new Date(segment.from).toISOString(), segment.timezone) !== segment.day ||
        dayKey(new Date(segment.to - 1).toISOString(), segment.timezone) !== segment.day) return false;
    } catch { return false; }
    previousTo = segment.to;
  }
  return true;
}
