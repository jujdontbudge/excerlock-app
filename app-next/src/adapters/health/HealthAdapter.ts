import { addDays, dayKey, localInstant } from '../../domain/calendar';
import { ClockPort } from '../../ports/ClockPort';
import { HealthWorkoutEngine, WorkoutRecord } from '../engine/contracts';
import { recordHealth } from '../permissions';
import { HealthPort, Workout } from '../pending/types';

export type HealthAdapterDependencies = {
  clock: ClockPort;
  engine: HealthWorkoutEngine;
  onError?: (error: unknown) => void;
};

export type HealthAdapter = HealthPort & {
  /** Turns on immediate background delivery once per launch; safe to call again. */
  bootstrap(): Promise<void>;
};

const ACTIVITY: Record<'running' | 'biking', WorkoutRecord['activity']> = {
  running: 'running',
  biking: 'cycling',
};

/**
 * Running and cycling workouts for today.
 *
 * The adapter reports `source` rather than filtering: a manually typed workout is real data the
 * user can see in Health, and hiding it here would make the app look broken. `progressSync` is the
 * one place that decides a manual entry never counts (P2-T15 §5).
 *
 * "Today" is the local day, and a workout belongs to the day it started, so a run begun at 23:50
 * counts for the day the user thinks they ran.
 */
export function createHealthAdapter({
  clock,
  engine,
  onError = () => undefined,
}: HealthAdapterDependencies): HealthAdapter {
  let bootstrapped: Promise<void> | undefined;

  const bootstrap = () => {
    bootstrapped ??= engine.configureBackgroundDelivery().catch((error) => {
      bootstrapped = undefined;
      onError(error);
    });
    return bootstrapped;
  };

  const localDay = () => {
    const timezone = clock.timezone();
    const today = dayKey(clock.now(), timezone);
    return {
      from: new Date(Date.parse(String(localInstant(today, 0, timezone)))),
      to: new Date(Date.parse(String(localInstant(addDays(today, 1), 0, timezone)))),
    };
  };

  return {
    authorizationStatus: () => recordHealth(engine.getAuthorizationStatus()),
    request: async () => {
      const status = recordHealth(await engine.requestAuthorization());
      if (status === 'granted') await bootstrap();
      return status;
    },
    workoutsToday: async (kind): Promise<Workout[]> => {
      const { from, to } = localDay();
      try {
        const workouts = await engine.queryWorkouts(from, to);
        return workouts
          .filter((workout) => workout.activity === ACTIVITY[kind])
          .filter((workout) => Date.parse(workout.startISO) >= from.getTime())
          .map((workout) => ({
            kind,
            minutes: Math.max(0, workout.minutes),
            km: Math.max(0, workout.km),
            source: workout.wasUserEntered ? ('manual' as const) : ('device' as const),
          }));
      } catch (error) {
        onError(error);
        return [];
      }
    },
    bootstrap,
  };
}
