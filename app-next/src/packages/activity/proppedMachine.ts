export const PICKUP_GRACE_MS = 20_000;
export const HANDOFF_MS = 60_000;
export const PROPPED_LIMIT_MS = 15 * 60_000;
export const PROPPED_WARNING_MS = 30_000;
export type ProppedState = {
  version: 2;
  phase: 'inactive' | 'scanning' | 'propped' | 'handheld' | 'active' | 'handoff';
  generation: number;
  watermark: number;
  deadlineAt: number | null;
  eligibleUntil: number | null;
  scanGeneration: number | null;
  verifiedSince?: number | null;
};
export type ProppedEvent =
  | { kind: 'tick' }
  | { kind: 'startScan'; at: number; foreground: boolean }
  | { kind: 'scanPass'; at: number; generation: number; foreground: boolean }
  | {
      kind:
        | 'scanCancel'
        | 'background'
        | 'pickup'
        | 'putDown'
        | 'walkingQualified'
        | 'walkingStopped'
        | 'coverageLost'
        | 'reset';
      at: number;
    };
function time(value: number): void {
  if (!Number.isFinite(value) || !Number.isFinite(new Date(value).getTime()))
    throw new Error('Invalid propped timestamp');
}
export function createProppedState(now: number): ProppedState {
  time(now);
  return {
    version: 2,
    phase: 'inactive',
    generation: 0,
    watermark: now,
    deadlineAt: null,
    eligibleUntil: null,
    scanGeneration: null,
    verifiedSince: null,
  };
}
export function migrateProppedState(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || !('version' in value) || value.version !== 1) return value;
  const old = value as { watermark?: number; generation?: number };
  const state = createProppedState(Number.isFinite(old.watermark) ? old.watermark! : 0);
  state.generation = Number.isSafeInteger(old.generation) && old.generation! >= 0 ? old.generation! + 1 : 0;
  return state;
}
function validate(state: ProppedState): void {
  time(state.watermark);
  if (state.deadlineAt !== null) time(state.deadlineAt);
  if (state.eligibleUntil !== null) time(state.eligibleUntil);
  if (state.verifiedSince !== undefined && state.verifiedSince !== null) time(state.verifiedSince);
  if (
    state.version !== 2 ||
    !['inactive', 'scanning', 'propped', 'handheld', 'active', 'handoff'].includes(state.phase) ||
    !Number.isSafeInteger(state.generation) ||
    state.generation < 0 ||
    (state.phase === 'scanning' ? state.scanGeneration !== state.generation : state.scanGeneration !== null) ||
    (['handheld', 'handoff'].includes(state.phase) && state.deadlineAt === null) ||
    (['inactive', 'propped', 'active'].includes(state.phase) && state.deadlineAt !== null) ||
    (['propped', 'handheld', 'active', 'handoff'].includes(state.phase) &&
      (state.eligibleUntil === null || state.verifiedSince == null))
  )
    throw new Error('Invalid persisted propped state');
}
function clear(state: ProppedState): void {
  state.phase = 'inactive';
  state.deadlineAt = null;
  state.eligibleUntil = null;
  state.scanGeneration = null;
  state.verifiedSince = null;
  state.generation++;
}
function expire(state: ProppedState, now: number): void {
  if (
    (state.deadlineAt !== null && now >= state.deadlineAt) ||
    (state.eligibleUntil !== null && now >= state.eligibleUntil)
  )
    clear(state);
}
export function proppedRelief(state: ProppedState, now = state.watermark): boolean {
  return (
    state.verifiedSince != null &&
    state.eligibleUntil !== null &&
    now < state.eligibleUntil &&
    (state.deadlineAt === null || now < state.deadlineAt) &&
    (['propped', 'handheld', 'active', 'handoff'].includes(state.phase) ||
      (state.phase === 'scanning' && state.deadlineAt !== null))
  );
}
export function reducePropped(previous: ProppedState, event: ProppedEvent, now: number): ProppedState {
  validate(previous);
  time(now);
  const state = { ...previous, verifiedSince: previous.verifiedSince ?? null };
  const current = Math.max(now, state.watermark);
  if (event.kind !== 'tick') {
    time(event.at);
    if (event.at > now) throw new Error('Propped evidence is in the future');
    if (event.at >= state.watermark) {
      expire(state, event.at);
      switch (event.kind) {
        case 'reset':
        case 'coverageLost':
          clear(state);
          break;
        case 'startScan':
          if (event.foreground && state.phase !== 'scanning') {
            if (state.phase === 'propped' || state.phase === 'active') state.deadlineAt = state.eligibleUntil;
            state.phase = 'scanning';
            state.generation++;
            state.scanGeneration = state.generation;
          }
          break;
        case 'scanPass':
          if (event.foreground && state.phase === 'scanning' && event.generation === state.scanGeneration) {
            state.phase = 'propped';
            state.deadlineAt = null;
            state.scanGeneration = null;
            state.verifiedSince = event.at;
            state.eligibleUntil = event.at + PROPPED_LIMIT_MS;
          }
          break;
        case 'background':
        case 'scanCancel':
          if (state.phase === 'scanning') {
            state.scanGeneration = null;
            state.generation++;
            if (state.deadlineAt !== null && state.eligibleUntil !== null) state.phase = 'handoff';
            else clear(state);
          }
          break;
        case 'pickup':
          if (state.phase === 'propped') {
            state.phase = 'handheld';
            state.deadlineAt = Math.min(event.at + PICKUP_GRACE_MS, state.eligibleUntil!);
          }
          break;
        case 'walkingQualified':
          if (state.phase === 'handheld' || state.phase === 'active') {
            state.phase = 'active';
            state.deadlineAt = null;
            state.eligibleUntil = event.at + PROPPED_LIMIT_MS;
          }
          break;
        case 'putDown':
          if (state.phase === 'active') {
            state.phase = 'handoff';
            state.deadlineAt = Math.min(event.at + HANDOFF_MS, state.eligibleUntil!);
          }
          break;
        case 'walkingStopped':
          if (state.phase === 'active') clear(state);
          break;
      }
    }
  }
  expire(state, current);
  state.watermark = current;
  return state;
}
