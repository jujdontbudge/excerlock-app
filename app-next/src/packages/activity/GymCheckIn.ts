import type { SavedPlace } from '../model/models';
import type { GymLocationFix } from '../ports/GymPort';
import { PRESENCE_CONFIRM_MS } from './presence';
import { GYM_CONFIRM_RECHECK_MS, GymCheckInError, gymFixStatus, gymWait, requestGymFix } from './gymFix';
export async function confirmGymCheckIn(options: {
  gym: Pick<SavedPlace, 'id' | 'latitude' | 'longitude' | 'radiusMeters'>;
  read(): Promise<GymLocationFix | null>;
  transition(type: 'enter' | 'exit', atMs: number): Promise<void>;
  confirmation?: { milliseconds: number; signal: AbortSignal };
}) {
  const signal = options.confirmation?.signal;
  const duration = options.confirmation?.milliseconds ?? PRESENCE_CONFIRM_MS;
  if (!Number.isFinite(duration) || duration < 0) throw new Error('Invalid gym confirmation duration');
  const first = await requestGymFix(options.read, undefined, signal);
  const status = gymFixStatus(first, options.gym);
  if (status !== 'inside') throw new GymCheckInError(status);
  if (signal?.aborted) throw new GymCheckInError('cancelled');
  const started = Date.now();
  await options.transition('enter', started);
  try {
    do {
      await gymWait(Math.min(GYM_CONFIRM_RECHECK_MS, Math.max(0, started + duration - Date.now())), signal);
      const sample = await requestGymFix(options.read, undefined, signal);
      const next = gymFixStatus(sample, options.gym);
      if (next !== 'inside') throw new GymCheckInError(next);
      if (signal?.aborted) throw new GymCheckInError('cancelled');
    } while (Date.now() < started + duration);
  } catch (error) {
    await options.transition('exit', Date.now());
    throw error;
  }
}
