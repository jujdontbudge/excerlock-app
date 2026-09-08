/**
 * merge: P2-T15 provides this as `domain/sessions/walkingSession.ts`, byte for byte apart from
 * the import below. Delete on merge; see ./README.md.
 */
import { WalkingSession, WalkingSessionEndReason } from './types';
import { renewWalkLease } from './lease';

export type WalkingSessionEvent =
  | { type: 'verified'; at: string }
  | { type: 'unverified'; at: string }
  | { type: 'tick'; at: string }
  | { type: 'stop'; at: string; reason: WalkingSessionEndReason };

export type WalkingSessionConfig = {
  leaseMs: number;
  graceMs: number;
  windowEnd: string;
  dayEnd: string;
};

export type SessionEffect =
  | { type: 'creditMinutes'; from: string; to: string }
  | { type: 'leaseWarning'; at: string }
  | { type: 'cancelWarning' }
  | { type: 'ended'; reason: WalkingSessionEndReason };

export function stepWalkingSession(
  session: WalkingSession,
  event: WalkingSessionEvent,
  config: WalkingSessionConfig,
): { session: WalkingSession; effects: SessionEffect[] } {
  if (session.phase === 'ended') return { session, effects: [] };

  const eventAt = Date.parse(event.at);
  const creditThrough = (to: string, effects: SessionEffect[]) => {
    if (session.phase === 'walking' && Date.parse(to) > Date.parse(session.creditedThrough)) {
      effects.push({ type: 'creditMinutes', from: session.creditedThrough, to });
    }
  };
  const end = (at: string, reason: WalkingSessionEndReason) => {
    const effects: SessionEffect[] = [];
    creditThrough(at, effects);
    effects.push({ type: 'ended', reason });
    return {
      session: {
        ...session,
        phase: 'ended' as const,
        creditedThrough:
          session.phase === 'walking' && Date.parse(at) > Date.parse(session.creditedThrough)
            ? at
            : session.creditedThrough,
        endedAt: at,
        endReason: reason,
        graceUntil: null,
      },
      effects,
    };
  };

  if (event.type === 'stop') {
    const boundedAt = new Date(
      Math.min(eventAt, Date.parse(session.leaseUntil), Date.parse(config.windowEnd), Date.parse(config.dayEnd)),
    ).toISOString();
    return end(boundedAt, event.reason);
  }

  const deadlines: { at: string; reason: WalkingSessionEndReason }[] = [
    { at: config.windowEnd, reason: 'windowEnded' },
    { at: config.dayEnd, reason: 'dayRollover' },
    { at: session.leaseUntil, reason: 'leaseLapsed' },
  ];
  if (session.phase === 'grace' && session.graceUntil) {
    deadlines.push({ at: session.graceUntil, reason: 'graceExpired' });
  }
  const elapsedDeadline = deadlines
    .filter((deadline) => Date.parse(deadline.at) <= eventAt)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0];
  if (elapsedDeadline) return end(elapsedDeadline.at, elapsedDeadline.reason);

  if (event.type === 'tick') {
    const effects: SessionEffect[] = [];
    creditThrough(event.at, effects);
    const warningAt = Date.parse(session.leaseUntil) - 30_000;
    if (
      session.phase === 'walking' &&
      Date.parse(session.creditedThrough) < warningAt &&
      warningAt <= eventAt
    ) {
      effects.push({ type: 'leaseWarning', at: new Date(warningAt).toISOString() });
    }
    return {
      session: {
        ...session,
        creditedThrough:
          session.phase === 'walking' && eventAt > Date.parse(session.creditedThrough)
            ? event.at
            : session.creditedThrough,
      },
      effects,
    };
  }

  if (event.type === 'unverified') {
    const effects: SessionEffect[] = [];
    creditThrough(event.at, effects);
    return {
      session: {
        ...session,
        phase: 'grace',
        creditedThrough:
          session.phase === 'walking' && eventAt > Date.parse(session.creditedThrough)
            ? event.at
            : session.creditedThrough,
        graceUntil: new Date(eventAt + config.graceMs).toISOString(),
      },
      effects,
    };
  }

  const leaseUntil = renewWalkLease(session.leaseUntil, event.at, config.leaseMs);
  if (!leaseUntil) return end(session.leaseUntil, 'leaseLapsed');
  const effects: SessionEffect[] = [];
  creditThrough(event.at, effects);
  if (session.phase === 'grace') effects.push({ type: 'cancelWarning' });
  return {
    session: {
      ...session,
      phase: 'walking',
      verifiedAt: session.verifiedAt ?? event.at,
      leaseUntil,
      creditedThrough:
        Date.parse(event.at) > Date.parse(session.creditedThrough) ? event.at : session.creditedThrough,
      graceUntil: null,
    },
    effects,
  };
}
