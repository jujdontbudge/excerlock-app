import { WalkingSession } from '../../domain/types';

/** The warning fires this long before the lease lapses. */
export const LEASE_WARNING_LEAD_MS = 30_000;
/** A renewal that moves the fire time by less than this keeps the pending warning as it is. */
export const LEASE_WARNING_MOVE_MIN_MS = 5_000;

export function leaseWarningAt(leaseUntil: string): string {
  return new Date(Date.parse(leaseUntil) - LEASE_WARNING_LEAD_MS).toISOString();
}

/** Whether a new fire time is far enough from the pending one to be worth a cancel and reschedule. */
export function leaseWarningMoved(pending: string | null, next: string): boolean {
  return pending === null || Math.abs(Date.parse(next) - Date.parse(pending)) >= LEASE_WARNING_MOVE_MIN_MS;
}


export function sessionIsLive(session: WalkingSession | null): session is WalkingSession {
  return session !== null && session.phase !== 'ended';
}
