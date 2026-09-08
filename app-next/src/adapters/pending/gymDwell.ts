/**
 * merge: P2-T15 provides this as `domain/gymDwell.ts`. The only edit is the `instantOf` shim: on
 * P2-T15 `localInstant` returns a `LocalInstant` ({ instant, converged }), while this branch's
 * still returns a plain ISO string. Delete on merge; see ./README.md.
 */
import { addDays, localInstant } from '../../domain/calendar';
import { DayKey, Rule } from '../../domain/types';
import { GymVisit } from './types';

type MaybeLocalInstant = string | { instant: string; converged: boolean };
const instantOf = (value: MaybeLocalInstant) => (typeof value === 'string' ? value : value.instant);
const converged = (value: MaybeLocalInstant) => typeof value === 'string' || value.converged;

export const VISIT_CONFIRM_MS = 30_000;
export const VISIT_MERGE_GAP_MS = 120_000;
export const CEREMONY_REPLAY_GAP_MS = 300_000;

export type GymDwellInterval = { from: string; to: string; visitIds: string[] };

export function mergedGymVisitIntervals(
  visits: GymVisit[],
  day: DayKey,
  timezone: string,
  now: string,
): GymDwellInterval[] {
  const start = localInstant(day, 0, timezone);
  const end = localInstant(addDays(day, 1), 0, timezone);
  if (__DEV__ && (!converged(start) || !converged(end))) throw new Error('LOCAL_MIDNIGHT_DID_NOT_CONVERGE');
  const dayStart = Date.parse(instantOf(start));
  const dayEnd = Date.parse(instantOf(end));
  const nowMs = Date.parse(now);
  const intervals = visits
    .flatMap((visit) => {
      const enteredAt = Date.parse(visit.enteredAt);
      const exitedAt = visit.exitedAt === null ? nowMs : Date.parse(visit.exitedAt);
      if (!Number.isFinite(enteredAt) || !Number.isFinite(exitedAt) || exitedAt - enteredAt < VISIT_CONFIRM_MS) {
        return [];
      }
      const from = Math.max(dayStart, enteredAt);
      const to = Math.min(dayEnd, exitedAt, nowMs);
      return to > from ? [{ from, to, visitId: visit.id }] : [];
    })
    .sort((a, b) => a.from - b.from || a.to - b.to);

  const merged: { from: number; to: number; visitIds: string[] }[] = [];
  for (const interval of intervals) {
    const previous = merged.at(-1);
    if (previous && interval.from <= previous.to + VISIT_MERGE_GAP_MS) {
      previous.to = Math.max(previous.to, interval.to);
      previous.visitIds.push(interval.visitId);
    } else {
      merged.push({ from: interval.from, to: interval.to, visitIds: [interval.visitId] });
    }
  }
  return merged.map((interval) => ({
    from: new Date(interval.from).toISOString(),
    to: new Date(interval.to).toISOString(),
    visitIds: interval.visitIds,
  }));
}

export function gymDwellMinutes(visits: GymVisit[], day: DayKey, timezone: string, now: string): number {
  return mergedGymVisitIntervals(visits, day, timezone, now).reduce(
    (minutes, interval) => minutes + (Date.parse(interval.to) - Date.parse(interval.from)) / 60_000,
    0,
  );
}

export type GymPresence = { placeId: string; confirmedAt: string; holdsUntil: string };

export function arrivalFor(rules: Rule[], visits: GymVisit[], now: string): GymPresence | null {
  if (!rules.some((rule) => rule.enabled && rule.activity === 'gym')) return null;
  const nowMs = Date.parse(now);
  const visit = visits
    .filter((candidate) => candidate.exitedAt === null && nowMs - Date.parse(candidate.enteredAt) >= VISIT_CONFIRM_MS)
    .sort((a, b) => Date.parse(a.enteredAt) - Date.parse(b.enteredAt))[0];
  return visit
    ? {
        placeId: visit.placeId,
        confirmedAt: new Date(Date.parse(visit.enteredAt) + VISIT_CONFIRM_MS).toISOString(),
        holdsUntil: new Date(nowMs + 1).toISOString(),
      }
    : null;
}

export function shouldReplayArrival(previousExitAt: string | null, enteredAt: string): boolean {
  return previousExitAt === null || Date.parse(enteredAt) - Date.parse(previousExitAt) >= CEREMONY_REPLAY_GAP_MS;
}
