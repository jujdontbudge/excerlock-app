import type { GymLocationFix } from '../ports/GymPort';
import type { SavedPlace } from '../model/models';
import { distanceMetres } from '../gyms/geometry';
export const GYM_FIX_MAX_AGE_MS = 10_000;
export const GYM_FIX_MAX_ACCURACY_METRES = 50;
export const GYM_FIX_RADIUS_ACCURACY_RATIO = 0.5;
export const GYM_FIX_RETRY_MS = 10_000;
export const GYM_FIX_SAMPLE_MS = 1_000;
export const GYM_CONFIRM_RECHECK_MS = 3_000;
export type GymFixStatus = 'inside' | 'outside' | 'uncertain';
export function gymFixStatus(fix: GymLocationFix | null, gym: Pick<SavedPlace, 'latitude' | 'longitude' | 'radiusMeters'>, now = Date.now()): GymFixStatus {
  if (!fix || !Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude) || !Number.isFinite(fix.atMs) || !Number.isFinite(fix.accuracy) || fix.accuracy < 0 || fix.atMs > now || now - fix.atMs > GYM_FIX_MAX_AGE_MS) return 'uncertain';
  const distance = distanceMetres(fix, gym);
  if (distance - fix.accuracy > gym.radiusMeters) return 'outside';
  return distance <= gym.radiusMeters && fix.accuracy <= Math.min(GYM_FIX_MAX_ACCURACY_METRES, gym.radiusMeters * GYM_FIX_RADIUS_ACCURACY_RATIO) ? 'inside' : 'uncertain';
}
export class GymCheckInError extends Error {
  constructor(public readonly reason: GymFixStatus | 'cancelled') { super(`Gym check-in ${reason}`); }
}
export function gymWait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (error?: Error) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); if (error) reject(error); else resolve(); };
    const abort = () => finish(new GymCheckInError('cancelled'));
    const timer = setTimeout(() => finish(), milliseconds);
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
  });
}
export function requestGymFix(read: () => Promise<GymLocationFix | null>, milliseconds = GYM_FIX_RETRY_MS, signal?: AbortSignal): Promise<GymLocationFix | null> {
  return new Promise((resolve, reject) => {
    const finish = (fix: GymLocationFix | null, error?: unknown) => { clearTimeout(timer); signal?.removeEventListener('abort', abort); if (error) reject(error); else resolve(fix); };
    const abort = () => finish(null, new GymCheckInError('cancelled'));
    const timer = setTimeout(() => finish(null, new GymCheckInError('uncertain')), Math.max(0, milliseconds));
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) return abort();
    void read().then((fix) => finish(fix), (error: unknown) => finish(null, error));
  });
}
