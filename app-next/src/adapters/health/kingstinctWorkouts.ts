import { HealthAuthorizationStatus, HealthWorkoutEngine, WorkoutRecord } from '../engine/contracts';

/**
 * The workout half of HealthKit.
 *
 * `engine/signals/health`'s `KingstinctHealthKitClient` collapses a workout to its duration and
 * throws away the three facts the rules need: which activity it was, how far it went, and whether a
 * human typed it in. This module reads the same Kingstinct module and keeps them.
 *
 * Every shape below is taken from the installed `@kingstinct/react-native-healthkit@14.0.2`
 * typings, not from memory: `WorkoutSample` in `lib/typescript/types/Workouts.d.ts`, the
 * `WorkoutActivityType` enum in `lib/typescript/generated/healthkit.generated.d.ts`
 * (`cycling = 13`, `running = 37`), and the `HKWasUserEntered` metadata key.
 */

/** `WorkoutActivityType` members, by value, for the two activities the product reads. */
export const WORKOUT_ACTIVITY = { cycling: 13, running: 37 } as const;

export const WORKOUT_TYPE = 'HKWorkoutTypeIdentifier';
/** Raw v14 enum value for `HKUpdateFrequency.immediate`, as the Phase 1 client uses. */
const IMMEDIATE_BACKGROUND_DELIVERY = 1;
export const DISTANCE_TYPE = {
  running: 'HKQuantityTypeIdentifierDistanceWalkingRunning',
  cycling: 'HKQuantityTypeIdentifierDistanceCycling',
} as const;
const DISTANCE_TYPES = Object.values(DISTANCE_TYPE);

type Quantity = { readonly unit: string; readonly quantity: number };

export interface KingstinctWorkoutSample {
  readonly workoutActivityType: number;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly duration: Quantity;
  readonly totalDistance?: Quantity;
  readonly metadata?: { readonly HKWasUserEntered?: boolean };
  /**
   * iOS 18 moved workout totals into per-workout statistics, so `totalDistance` is nil for newer
   * workouts and the distance has to be asked for (`docs/research/healthkit-coverage.md`, S3).
   */
  getStatistic?(
    quantityType: string,
    unitOverride?: string,
  ): Promise<{ readonly sumQuantity?: Quantity } | undefined>;
}

export interface KingstinctWorkoutModule {
  isHealthDataAvailable(): boolean;
  requestAuthorization(options: { readonly toRead: readonly string[] }): Promise<boolean>;
  configureBackgroundTypes(typeIdentifiers: readonly string[], updateFrequency: number): Promise<boolean>;
  queryWorkoutSamplesWithAnchor(options: {
    readonly limit: number;
    readonly filter?: {
      readonly date: {
        readonly startDate?: Date;
        readonly endDate?: Date;
        readonly strictStartDate: true;
        readonly strictEndDate: true;
      };
    };
  }): Promise<{ readonly workouts: readonly KingstinctWorkoutSample[] }>;
}

/** Minutes, whatever unit HealthKit chose to express the duration in. */
export function durationMinutes(duration: Quantity): number {
  if (duration.unit === 'min') return duration.quantity;
  if (duration.unit === 'hr') return duration.quantity * 60;
  // The Phase 1 client's shipped assumption: an unlabelled duration is seconds.
  return duration.quantity / 60;
}

export function distanceKm(distance: Quantity | undefined): number {
  if (!distance) return 0;
  if (distance.unit === 'km') return distance.quantity;
  if (distance.unit === 'mi') return distance.quantity * 1.609344;
  // HealthKit's default distance unit is metres.
  return distance.quantity / 1000;
}

export function workoutActivity(type: number): WorkoutRecord['activity'] {
  if (type === WORKOUT_ACTIVITY.running) return 'running';
  return type === WORKOUT_ACTIVITY.cycling ? 'cycling' : 'other';
}

export function toWorkoutRecord(sample: KingstinctWorkoutSample, km?: number): WorkoutRecord {
  const activity = workoutActivity(sample.workoutActivityType);
  return {
    activity,
    startISO: sample.startDate.toISOString(),
    endISO: sample.endDate.toISOString(),
    minutes: durationMinutes(sample.duration),
    km: km ?? distanceKm(sample.totalDistance),
    wasUserEntered: sample.metadata?.HKWasUserEntered === true,
  };
}

/** `totalDistance` when HealthKit filled it in, else the workout's own distance statistic. */
export async function workoutDistanceKm(sample: KingstinctWorkoutSample): Promise<number> {
  if (sample.totalDistance) return distanceKm(sample.totalDistance);
  const activity = workoutActivity(sample.workoutActivityType);
  if (activity === 'other' || !sample.getStatistic) return 0;
  const statistic = await sample.getStatistic(DISTANCE_TYPE[activity]);
  return distanceKm(statistic?.sumQuantity);
}

export function createKingstinctWorkoutEngine(healthKit: KingstinctWorkoutModule): HealthWorkoutEngine {
  let status: HealthAuthorizationStatus = healthKit.isHealthDataAvailable() ? 'notDetermined' : 'restricted';
  return {
    getAuthorizationStatus: () => status,
    requestAuthorization: async () => {
      if (status === 'restricted') return status;
      // HealthKit withholds per-type read decisions, so a completed request is as far as this can
      // go: an empty result may still mean the user withheld access.
      status = (await healthKit.requestAuthorization({ toRead: [WORKOUT_TYPE, ...DISTANCE_TYPES] }))
        ? 'authorized'
        : 'denied';
      return status;
    },
    configureBackgroundDelivery: async () => {
      await healthKit.configureBackgroundTypes([WORKOUT_TYPE], IMMEDIATE_BACKGROUND_DELIVERY);
    },
    queryWorkouts: async (from, to) => {
      const { workouts } = await healthKit.queryWorkoutSamplesWithAnchor({
        limit: 0,
        filter: { date: { startDate: from, endDate: to, strictStartDate: true, strictEndDate: true } },
      });
      return Promise.all(
        workouts.map(async (workout) => toWorkoutRecord(workout, await workoutDistanceKm(workout))),
      );
    },
  };
}

/** Loads Nitro only when the composition root asks; importing this module never touches JSI. */
export function requireKingstinctWorkoutEngine(): HealthWorkoutEngine {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const healthKit = require('@kingstinct/react-native-healthkit') as KingstinctWorkoutModule;
  return createKingstinctWorkoutEngine(healthKit);
}
