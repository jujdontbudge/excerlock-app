/**
 * The treadmill placement machine: scanning → propped → handheld → handoff.
 *
 * Finding 88 leaves this to P2-T05 because it is the one piece of the treadmill flow the domain
 * does not own. Everything about time and credit belongs to P2-T15's `stepWalkingSession`: this
 * machine only decides *whether a motion verdict is allowed to mean anything*, and emits the two
 * events the session understands. It holds no timers; the adapter arms every `deadline` through
 * `ClockPort.at`.
 *
 * Why each rule exists:
 * - A phone propped on a running console rattles. Core Motion happily reports walking cadence for
 *   the machine, not the human, so while the phone is propped no motion verdict counts and the
 *   camera scan is the only evidence. That is what makes the 15-minute lease the propped session's
 *   only bound (`docs/specs/treadmill-mode.md`).
 * - Picking the phone up hands verification back to the pedometer, but only if the user really is
 *   walking. A pickup that produces no verified cadence within the grace is an `unverified` event,
 *   which puts the session into the domain's stop grace rather than ending it outright.
 * - Setting the phone down is not evidence of stopping, so it emits nothing. The lease keeps
 *   running while the user re-seats the phone; if they never do, the lease lapses on its own and
 *   the session ends with `leaseLapsed`.
 *
 * Timings are ported from `app/src/home/signals/walkingSessionController.ts`.
 */

/** A real pickup keeps the phone in hand far longer than a console rattle. */
export const PICKUP_CADENCE_GRACE_MS = 20_000;
/** Long enough to step off, re-seat the phone and start the next scan. */
export const PROPPED_HANDOFF_MS = 60_000;

export type PlacementPhase = 'scanning' | 'propped' | 'handheld' | 'handoff';

export type PlacementState = {
  phase: PlacementPhase;
  enteredAt: string;
  /** The instant this phase expires, armed by the adapter through `ClockPort.at`. */
  deadline: string | null;
  /** While false, a `WalkVerifier` verdict is the treadmill shaking, not the user walking. */
  motionCounts: boolean;
};

export type PlacementEvent =
  | { type: 'scanCompleted'; at: string }
  | { type: 'pickedUp'; at: string }
  | { type: 'setDown'; at: string }
  | { type: 'verified'; at: string }
  | { type: 'unverified'; at: string }
  | { type: 'deadline'; at: string };

/** `verified` / `unverified` go straight to `stepWalkingSession`; `rescan` reopens the ceremony. */
export type PlacementEffect =
  | { type: 'verified'; at: string }
  | { type: 'unverified'; at: string }
  | { type: 'rescan'; at: string };

export function startPlacement(at: string): PlacementState {
  return { phase: 'scanning', enteredAt: at, deadline: null, motionCounts: false };
}

/** Handheld sessions never enter this machine; motion is trusted from the first sample. */
export function startHandheld(at: string): PlacementState {
  return { phase: 'handheld', enteredAt: at, deadline: null, motionCounts: true };
}

const enter = (
  phase: PlacementPhase,
  at: string,
  options: { deadline?: number | null; motionCounts: boolean },
): PlacementState => ({
  phase,
  enteredAt: at,
  deadline: options.deadline ? new Date(Date.parse(at) + options.deadline).toISOString() : null,
  motionCounts: options.motionCounts,
});

export function stepPlacement(
  state: PlacementState,
  event: PlacementEvent,
): { state: PlacementState; effects: PlacementEffect[] } {
  const unchanged = { state, effects: [] as PlacementEffect[] };

  switch (event.type) {
    case 'scanCompleted':
      // The camera scan is the propped session's only verification, and it is a `verified` event.
      return state.phase === 'scanning'
        ? {
            state: enter('propped', event.at, { motionCounts: false }),
            effects: [{ type: 'verified', at: event.at }],
          }
        : unchanged;

    case 'pickedUp':
      // From propped or from an abandoned handoff: the pedometer takes over, on probation.
      return state.phase === 'propped' || state.phase === 'handoff'
        ? {
            state: enter('handheld', event.at, {
              deadline: PICKUP_CADENCE_GRACE_MS,
              motionCounts: true,
            }),
            effects: [],
          }
        : unchanged;

    case 'setDown':
      // Not evidence of stopping. The lease, not this machine, bounds the gap.
      return state.phase === 'handheld'
        ? {
            state: enter('handoff', event.at, { deadline: PROPPED_HANDOFF_MS, motionCounts: false }),
            effects: [],
          }
        : unchanged;

    case 'verified':
      if (!state.motionCounts) return unchanged;
      // Cadence answered the pickup, so the probation deadline is spent.
      return {
        state: state.deadline === null ? state : { ...state, deadline: null },
        effects: [{ type: 'verified', at: event.at }],
      };

    case 'unverified':
      if (!state.motionCounts) return unchanged;
      // Probation is the answer to a pickup, and nothing else is. Cadence takes a few seconds to
      // qualify after the phone leaves the console, so "not walking yet" is not "stopped walking"
      // until the deadline says so — which is the whole reason the grace exists.
      if (state.phase === 'handheld' && state.deadline !== null) return unchanged;
      return { state, effects: [{ type: 'unverified', at: event.at }] };

    case 'deadline':
      if (state.deadline === null || Date.parse(event.at) < Date.parse(state.deadline)) return unchanged;
      if (state.phase === 'handheld') {
        // Picked up and never walked. The domain's stop grace decides what happens next.
        return {
          state: { ...state, deadline: null },
          effects: [{ type: 'unverified', at: state.deadline }],
        };
      }
      // Handoff expired: back to the framing view, and motion goes quiet again.
      return {
        state: enter('scanning', state.deadline, { motionCounts: false }),
        effects: [{ type: 'rescan', at: state.deadline }],
      };
  }
}
