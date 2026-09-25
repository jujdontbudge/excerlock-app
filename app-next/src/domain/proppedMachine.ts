export const PICKUP_GRACE_MS = 20_000;
export const HANDOFF_MS = 60_000;
export type ProppedState = {
  version: 1;
  phase: 'inactive' | 'scanning' | 'propped' | 'handheld' | 'active' | 'handoff';
  generation: number;
  watermark: number;
  deadlineAt: number | null;
  scanGeneration: number | null;
  verifiedSince?: number | null;
};
export type ProppedEvent =
  | { kind: 'tick' }
  | { kind: 'startScan'; at: number; foreground: boolean }
  | { kind: 'scanPass'; at: number; generation: number; foreground: boolean }
  | { kind: 'scanCancel' | 'background' | 'pickup' | 'putDown' | 'walkingQualified' | 'walkingStopped' | 'coverageLost' | 'reset'; at: number };
function time(value: number): void {
  if (!Number.isFinite(value) || !Number.isFinite(new Date(value).getTime())) throw new Error('Invalid propped timestamp');
}
export function createProppedState(now: number): ProppedState {
  time(now);
  return { version: 1, phase: 'inactive', generation: 0, watermark: now, deadlineAt: null, scanGeneration: null, verifiedSince: null };
}
function validate(state: ProppedState): void {
  time(state.watermark);
  if (state.deadlineAt !== null) time(state.deadlineAt);
  if (state.verifiedSince !== undefined && state.verifiedSince !== null) time(state.verifiedSince);
  if (state.version !== 1 || !['inactive', 'scanning', 'propped', 'handheld', 'active', 'handoff'].includes(state.phase) ||
    !Number.isSafeInteger(state.generation) || state.generation < 0 ||
    (state.phase === 'scanning' ? state.scanGeneration !== state.generation : state.scanGeneration !== null) ||
    (['handheld', 'handoff'].includes(state.phase) && state.deadlineAt === null) ||
    (['inactive', 'propped', 'active'].includes(state.phase) && state.deadlineAt !== null)) throw new Error('Invalid persisted propped state');
}
function clear(state: ProppedState): void {
  state.phase = 'inactive'; state.deadlineAt = null; state.scanGeneration = null;
  state.verifiedSince = null;
  state.generation++;
}
function expire(state: ProppedState, now: number): void {
  if (state.deadlineAt !== null && now >= state.deadlineAt) clear(state);
}
export function proppedRelief(state: ProppedState): boolean {
  return state.verifiedSince != null && (['propped', 'handheld', 'active', 'handoff'].includes(state.phase) ||
    (state.phase === 'scanning' && state.deadlineAt !== null));
}
export function reducePropped(previous: ProppedState, event: ProppedEvent, now: number): ProppedState {
  validate(previous); time(now);
  const state = { ...previous, verifiedSince: previous.verifiedSince ?? null };
  if (state.verifiedSince === null && ['propped', 'handheld', 'active', 'handoff'].includes(state.phase)) clear(state);
  const current = Math.max(now, state.watermark);
  if (event.kind !== 'tick') {
    time(event.at);
    if (event.at > now) throw new Error('Propped evidence is in the future');
    if (event.at >= state.watermark) {
      expire(state, event.at);
      switch (event.kind) {
        case 'reset': case 'coverageLost': clear(state); break;
        case 'startScan':
          if (event.foreground && ['inactive', 'handoff'].includes(state.phase)) {
            state.phase = 'scanning'; state.generation++; state.scanGeneration = state.generation;
          }
          break;
        case 'scanPass':
          if (event.foreground && state.phase === 'scanning' && event.generation === state.scanGeneration) {
            state.phase = 'propped'; state.deadlineAt = null; state.scanGeneration = null;
            state.verifiedSince = event.at;
          }
          break;
        case 'background': case 'scanCancel':
          if (state.phase === 'scanning') {
            state.scanGeneration = null; state.generation++;
            if (state.deadlineAt !== null) state.phase = 'handoff'; else clear(state);
          }
          break;
        case 'pickup':
          if (state.phase === 'propped') { state.phase = 'handheld'; state.deadlineAt = event.at + PICKUP_GRACE_MS; }
          break;
        case 'walkingQualified':
          if (state.phase === 'handheld') { state.phase = 'active'; state.deadlineAt = null; }
          break;
        case 'putDown':
          if (state.phase === 'active') { state.phase = 'handoff'; state.deadlineAt = event.at + HANDOFF_MS; }
          break;
        case 'walkingStopped': if (state.phase === 'active') clear(state); break;
      }
    }
  }
  expire(state, current);
  state.watermark = current;
  return state;
}
