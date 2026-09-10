import { addDays, dayKey, localInstant } from '../../domain/calendar';

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
export type WalkingDurationState = {
  version: 1;
  generation: number | null;
  cursor: WalkingDurationCursor | null;
  millisecondsByDay: Record<string, number>;
  pending: PendingWalkingDuration[];
};
export interface WalkingDurationStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}
export type WalkingDurationObservation = WalkingDurationCursor;

const empty = (generation: number | null = null): WalkingDurationState => ({
  version: 1, generation, cursor: null, millisecondsByDay: {}, pending: [],
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
      if (prior?.verified && observation.verified) {
        const end = Math.min(observation.at, prior.at + MAX_VERIFIED_OBSERVATION_GAP_MS);
        next = addInterval(next, prior.at, end, prior.timezone, observation.generation);
      }
      next = { ...next, cursor: observation };
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

  private async load(): Promise<WalkingDurationState> {
    const raw = await this.storage.getItem(KEY);
    if (raw === null) return empty();
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error('Invalid walking duration ledger'); }
    if (!validState(value)) throw new Error('Invalid walking duration ledger');
    return value;
  }
  private save(state: WalkingDurationState): Promise<void> { return this.storage.setItem(KEY, JSON.stringify(state)); }
  private serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = this.queue.catch(() => undefined).then(operation);
    this.queue = next.catch(() => undefined);
    return next;
  }
}

function addInterval(state: WalkingDurationState, start: number, end: number, timezone: string, generation: number): WalkingDurationState {
  if (end <= start) return state;
  const totals = { ...state.millisecondsByDay };
  const pending = [...state.pending];
  let cursor = start;
  while (cursor < end) {
    const day = dayKey(new Date(cursor).toISOString(), timezone);
    const midnight = Date.parse(localInstant(addDays(day, 1), 0, timezone));
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
    cursor = segmentEnd;
  }
  return { ...state, millisecondsByDay: totals, pending };
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
    !state.millisecondsByDay || typeof state.millisecondsByDay !== 'object' || !Array.isArray(state.pending)) return false;
  if (state.cursor !== null) {
    try { validateObservation(state.cursor); } catch { return false; }
    if (state.cursor.generation !== state.generation) return false;
  }
  return Object.entries(state.millisecondsByDay).every(([day, ms]) => /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isSafeInteger(ms) && ms >= 0) &&
    state.pending.every((p) => p && typeof p.idempotencyKey === 'string' && p.generation === state.generation &&
      /^\d{4}-\d{2}-\d{2}$/.test(p.day) && Number.isSafeInteger(p.milliseconds) && p.milliseconds > 0 && Number.isFinite(p.endedAt));
}
