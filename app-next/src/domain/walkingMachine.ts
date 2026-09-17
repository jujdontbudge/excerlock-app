/** Persist timestamps, never timer handles. Raw motion/cadence OR/freshness fusion belongs to the adapter. */
export const WALK_QUALIFY_MS = 3000;
/**
 * The grace contract this reducer enforces (`reduceWalking` throws outside it).
 * The runtime clamps the user's own stop-grace into these bounds before any
 * wake reaches the reducer, so a bad setting or a bad remote bound can never
 * throw here (see `detection/strideGateConfig.ts`).
 */
export const WALK_GRACE_MIN_MS = 30_000;
export const WALK_GRACE_MAX_MS = 300_000;
export const WALK_SILENCE_MS = 5000;
/**
 * Freshness contract between the adapter and this reducer. The adapter only
 * publishes a source observation while it is younger than its own 5 s
 * horizon; the reducer accepts such an observation even when the 1 s tick has
 * already advanced the watermark past the observation's source time (Apple's
 * pedometer batches carry an endDate ~2.6 s behind the callback, so every
 * cadence sample used to arrive "late" and was dropped, which re-blocked
 * walkers mid-walk: gate-proof-s1 §5.2). Each accepted observation is anchored
 * at its own source time, so late deliveries can never extend relief past
 * sourceTime + silence + grace; only its acceptance changes.
 *
 * Rejected alternative (measured in gate-proof-s1 §6): re-anchoring late
 * evidence at the watermark recovered the same walk but added still-window
 * false positives, because stale evidence was moved to "now".
 */
export const WALK_EVIDENCE_FRESHNESS_MS = 5000;
export type WalkingState = {
  version: 1;
  phase: 'inactive' | 'verifying' | 'active' | 'grace';
  watermark: number;
  qualifyingSince: number | null;
  activeSince: number | null;
  lastEvidenceAt: number | null;
  lastQualifying: boolean | null;
  graceEndsAt: number | null;
};
export type WalkingEvent =
  | { kind: 'tick' }
  | {
      kind: 'evidence';
      at: number;
      qualifying: boolean | 'unknown';
      /**
       * Milliseconds of continuously verified walking already behind this
       * observation (the raw stride path measures a multi-second window before
       * it publishes). The 3 s qualifier is satisfied by that measurement
       * instead of by waiting; clamped to WALK_QUALIFY_MS. Apple evidence omits it.
       */
      verifiedMs?: number;
    };
function validTime(time: number): void {
  if (!Number.isFinite(time) || !Number.isFinite(new Date(time).getTime())) throw new Error('Invalid walking timestamp');
}
function validateState(state: WalkingState): void {
  if (state.version !== 1 || !['inactive', 'verifying', 'active', 'grace'].includes(state.phase)) throw new Error('Invalid persisted walking state');
  for (const value of [state.qualifyingSince, state.activeSince, state.lastEvidenceAt, state.graceEndsAt]) if (value !== null) validTime(value);
  if ((state.lastEvidenceAt !== null && state.lastEvidenceAt > state.watermark) ||
    (state.activeSince !== null && state.activeSince > state.watermark) ||
    (['verifying', 'active'].includes(state.phase) && (state.lastEvidenceAt === null || state.lastQualifying !== true)) ||
    (state.phase === 'verifying' && state.qualifyingSince === null) ||
    (['active', 'grace'].includes(state.phase) && state.activeSince === null) ||
    (state.phase === 'grace' && state.graceEndsAt === null)) throw new Error('Invalid persisted walking evidence');
}
export function createWalkingState(now: number): WalkingState {
  validTime(now);
  return { version: 1, phase: 'inactive', watermark: now, qualifyingSince: null, activeSince: null, lastEvidenceAt: null, lastQualifying: null, graceEndsAt: null };
}
export function walkingRelief(state: WalkingState): boolean {
  return state.phase === 'active' || state.phase === 'grace';
}
function deactivate(state: WalkingState): void {
  state.phase = 'inactive'; state.qualifyingSince = null; state.activeSince = null; state.graceEndsAt = null;
}
function advance(state: WalkingState, now: number, graceMs: number): void {
  if ((state.phase === 'verifying' || state.phase === 'active') && state.lastEvidenceAt !== null && now >= state.lastEvidenceAt + WALK_SILENCE_MS) {
    if (state.phase === 'verifying') deactivate(state);
    else {
      state.phase = 'grace';
      state.qualifyingSince = null;
      state.graceEndsAt = state.lastEvidenceAt + WALK_SILENCE_MS + graceMs;
    }
  }
  if (state.phase === 'grace' && state.graceEndsAt !== null && now >= state.graceEndsAt) deactivate(state);
  if (state.phase === 'verifying' && state.qualifyingSince !== null && now >= state.qualifyingSince + WALK_QUALIFY_MS) {
    state.phase = 'active'; state.activeSince = state.qualifyingSince + WALK_QUALIFY_MS;
  }
  state.watermark = Math.max(state.watermark, now);
}
/**
 * Observations the adapter has already aged out cannot recreate current relief.
 * Historical step/minute credit is a DIFFERENT idempotent history path; neither
 * grace time nor this verdict may be multiplied into fabricated steps.
 */
export function reduceWalking(previous: WalkingState, event: WalkingEvent, now: number, graceMs: number): WalkingState {
  validTime(now); validTime(previous.watermark); validateState(previous);
  if (previous.version !== 1 || !Number.isFinite(graceMs) || graceMs < WALK_GRACE_MIN_MS || graceMs > WALK_GRACE_MAX_MS) throw new Error('Invalid walking state/grace');
  const state = { ...previous };
  const current = Math.max(now, previous.watermark);
  if (event.kind === 'evidence') {
    validTime(event.at);
    if (event.at > now) throw new Error('Walking evidence is in the future');
    const verifiedMs = event.verifiedMs ?? 0;
    if (!Number.isFinite(verifiedMs) || verifiedMs < 0) throw new Error('Invalid verified walking span');
    const positive = event.qualifying === true;
    // Negative dominates contradictory observations at one timestamp. Duplicates
    // never reset verification/grace. Late history cannot revive live relief.
    const fresh = current - event.at <= WALK_EVIDENCE_FRESHNESS_MS && (state.lastEvidenceAt === null || event.at > state.lastEvidenceAt ||
      (event.at === state.lastEvidenceAt && state.lastQualifying === true && !positive));
    if (fresh) {
      advance(state, event.at, graceMs);
      state.lastEvidenceAt = event.at;
      state.lastQualifying = positive;
      if (positive) {
        const qualifyingSince = event.at - Math.min(verifiedMs, WALK_QUALIFY_MS);
        if (state.phase === 'inactive') {
          state.phase = 'verifying'; state.qualifyingSince = qualifyingSince;
        } else if (state.phase === 'verifying' && state.qualifyingSince !== null && qualifyingSince < state.qualifyingSince) {
          state.qualifyingSince = qualifyingSince;
        } else if (state.phase === 'grace') {
          state.phase = 'active'; state.qualifyingSince = event.at; state.graceEndsAt = null;
        }
      } else if (state.phase === 'verifying') deactivate(state);
      else if (state.phase === 'active') {
        state.phase = 'grace'; state.qualifyingSince = null; state.graceEndsAt = event.at + graceMs;
      }
    }
  }
  advance(state, current, graceMs);
  return state;
}
