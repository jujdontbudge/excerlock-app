/**
 * merge: P2-T15 provides every declaration in this file. It is here because build/P2-T05 forked
 * from rebuild/phase-2 before the session-and-credit engine landed, and an adapter cannot be
 * written against a shape that does not exist yet.
 *
 * When P2-T15 is on this branch, delete `src/adapters/pending/` and repoint the imports:
 *   WalkingPlacement, WalkingSessionEndReason, WalkingSession, GymVisit → `domain/types`
 *   Workout                                                            → `ports/models`
 *   WalkingStartError, WalkingStartErrorCode                           → `ports/WalkingPort`
 *   WalkingPort, GymPort, HealthPort                                   → `ports/*Port`
 * `pending/__tests__/landed.test.ts` fails the moment that happens, so the cleanup cannot be
 * forgotten.
 */
import { DayKey } from '../../domain/types';
import { Unsubscribe } from '../../ports/models';
import { GymPort as PhaseOneGymPort } from '../../ports/GymPort';
import { HealthPort as PhaseOneHealthPort } from '../../ports/HealthPort';
import { WalkingPort as PhaseOneWalkingPort } from '../../ports/WalkingPort';

/* --------------------------------------------------- domain/types (P2-T15) */

export type WalkingPlacement = 'propped' | 'handheld';

export type WalkingSessionEndReason =
  | 'leaseLapsed'
  | 'graceExpired'
  | 'windowEnded'
  | 'dayRollover'
  | 'ruleChanged'
  | 'stopped';

export type WalkingSession = {
  id: string;
  ruleId: string; // the state-mode rule it belongs to
  placement: WalkingPlacement;
  instanceDay: DayKey;
  startedAt: string;
  verifiedAt: string | null;
  leaseUntil: string; // Apple's 15-minute renewable lease; a lapsed lease ends the session
  creditedThrough: string;
  endedAt: string | null;
  endReason: WalkingSessionEndReason | null;
  graceUntil?: string | null;
  phase: 'verifying' | 'walking' | 'grace' | 'ended';
};

export type GymVisit = {
  id: string;
  placeId: string;
  enteredAt: string;
  exitedAt: string | null;
  source: 'geofence' | 'manual';
};

/* --------------------------------------------------- ports/models (P2-T15) */

export type Workout = {
  kind: 'running' | 'biking';
  minutes: number;
  km: number;
  source: 'device' | 'manual';
};

/* --------------------------------------------- ports/WalkingPort (P2-T15) */

export type WalkingStartErrorCode = 'invalidRule' | 'notScheduled';

export class WalkingStartError extends Error {
  readonly code: WalkingStartErrorCode;
  constructor(code: WalkingStartErrorCode) {
    super(code);
    this.name = 'WalkingStartError';
    this.code = code;
  }
}

/* ------------------------------------------------------- ports (P2-T15) */

/** The three members P2-T15 adds to `GymPort`; `checkIn` there returns the visit it opened. */
export interface GymVisitSurface {
  visits(sinceDay: DayKey): Promise<GymVisit[]>;
  observeVisits(callback: (visits: GymVisit[]) => void): Unsubscribe;
  checkIn(placeId: string, confirmation?: { milliseconds: number; signal: AbortSignal }): Promise<GymVisit>;
}

/**
 * The ports as P2-T15 leaves them, expressed as deltas on this branch's versions so that the parts
 * P2-T15 does not touch cannot drift.
 */
export type GymPort = Omit<PhaseOneGymPort, 'checkIn'> & GymVisitSurface;

export type HealthPort = Omit<PhaseOneHealthPort, 'workoutsToday'> & {
  workoutsToday(kind: 'running' | 'biking'): Promise<Workout[]>;
};

export type WalkingPort = Omit<PhaseOneWalkingPort, 'start' | 'observe'> & {
  start(
    rule: import('../../domain/types').Rule,
    options?: { placement: WalkingPlacement },
  ): Promise<WalkingSession>;
  observe(callback: (session: WalkingSession | null) => void): Unsubscribe;
};
