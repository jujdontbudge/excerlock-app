import {
  KingstinctWorkoutModule,
  KingstinctWorkoutSample,
  WORKOUT_ACTIVITY,
  createKingstinctWorkoutEngine,
  distanceKm,
  durationMinutes,
  toWorkoutRecord,
  workoutDistanceKm,
} from '../kingstinctWorkouts';

const sample = (over: Partial<KingstinctWorkoutSample> = {}): KingstinctWorkoutSample => ({
  workoutActivityType: WORKOUT_ACTIVITY.running,
  startDate: new Date('2026-09-07T14:00:00.000Z'),
  endDate: new Date('2026-09-07T14:30:00.000Z'),
  duration: { unit: 's', quantity: 1800 },
  totalDistance: { unit: 'm', quantity: 6000 },
  metadata: {},
  ...over,
});

function moduleStub(workouts: KingstinctWorkoutSample[]) {
  const calls = { background: [] as unknown[][], authorized: false };
  const healthKit: KingstinctWorkoutModule = {
    isHealthDataAvailable: () => true,
    requestAuthorization: async () => calls.authorized,
    configureBackgroundTypes: async (types, frequency) => {
      calls.background.push([types, frequency]);
      return true;
    },
    queryWorkoutSamplesWithAnchor: async () => ({ workouts }),
  };
  return { healthKit, calls };
}

describe('Kingstinct workout engine', () => {
  test('running and cycling are recognised by their HealthKit activity numbers', () => {
    expect(toWorkoutRecord(sample()).activity).toBe('running');
    expect(toWorkoutRecord(sample({ workoutActivityType: WORKOUT_ACTIVITY.cycling })).activity).toBe('cycling');
    // A swim is neither, and the rules ignore it rather than miscounting it as a run.
    expect(toWorkoutRecord(sample({ workoutActivityType: 46 })).activity).toBe('other');
  });

  test('duration and distance are read in the unit HealthKit reports', () => {
    expect(durationMinutes({ unit: 's', quantity: 1800 })).toBe(30);
    expect(durationMinutes({ unit: 'min', quantity: 30 })).toBe(30);
    expect(durationMinutes({ unit: 'hr', quantity: 0.5 })).toBe(30);
    expect(distanceKm({ unit: 'm', quantity: 6000 })).toBe(6);
    expect(distanceKm({ unit: 'km', quantity: 6 })).toBe(6);
    expect(distanceKm({ unit: 'mi', quantity: 1 })).toBeCloseTo(1.609344, 5);
    expect(distanceKm(undefined)).toBe(0);
  });

  test('a typed-in workout carries HKWasUserEntered through', () => {
    expect(toWorkoutRecord(sample({ metadata: { HKWasUserEntered: true } })).wasUserEntered).toBe(true);
    expect(toWorkoutRecord(sample()).wasUserEntered).toBe(false);
  });

  test('a completed authorization request is as far as HealthKit will say', async () => {
    const { healthKit, calls } = moduleStub([]);
    const engine = createKingstinctWorkoutEngine(healthKit);
    expect(engine.getAuthorizationStatus()).toBe('notDetermined');
    expect(await engine.requestAuthorization()).toBe('denied');

    calls.authorized = true;
    // HealthKit withholds per-type read decisions, so "authorized" only means reads are safe to try.
    expect(await engine.requestAuthorization()).toBe('authorized');
  });

  test('a device without HealthKit is restricted and is never asked', async () => {
    const { healthKit } = moduleStub([]);
    const engine = createKingstinctWorkoutEngine({ ...healthKit, isHealthDataAvailable: () => false });
    expect(await engine.requestAuthorization()).toBe('restricted');
  });

  test('background delivery is immediate and only for workouts', async () => {
    const { healthKit, calls } = moduleStub([]);
    await createKingstinctWorkoutEngine(healthKit).configureBackgroundDelivery();
    expect(calls.background).toEqual([[['HKWorkoutTypeIdentifier'], 1]]);
  });

  test('an iOS 18 workout with no total falls back to its distance statistic', async () => {
    // Apple moved workout totals into per-workout statistics, so `totalDistance` is nil there.
    const statistics: string[] = [];
    const proxy = sample({
      totalDistance: undefined,
      getStatistic: async (type: string) => {
        statistics.push(type);
        return { sumQuantity: { unit: 'm', quantity: 6000 } };
      },
    });
    expect(await workoutDistanceKm(proxy)).toBe(6);
    expect(statistics).toEqual(['HKQuantityTypeIdentifierDistanceWalkingRunning']);

    const ride = sample({
      workoutActivityType: WORKOUT_ACTIVITY.cycling,
      totalDistance: undefined,
      getStatistic: async () => ({ sumQuantity: { unit: 'km', quantity: 20 } }),
    });
    expect(await workoutDistanceKm(ride)).toBe(20);
  });

  test('a workout with neither a total nor a statistic reports no distance', async () => {
    expect(await workoutDistanceKm(sample({ totalDistance: undefined }))).toBe(0);
    expect(await workoutDistanceKm(sample({ workoutActivityType: 46, totalDistance: undefined }))).toBe(0);
  });

  test('a query returns the workouts the day asked for', async () => {
    const { healthKit } = moduleStub([sample(), sample({ workoutActivityType: WORKOUT_ACTIVITY.cycling })]);
    const engine = createKingstinctWorkoutEngine(healthKit);
    expect(
      await engine.queryWorkouts(new Date('2026-09-07T04:00:00.000Z'), new Date('2026-09-08T04:00:00.000Z')),
    ).toEqual([
      {
        activity: 'running',
        startISO: '2026-09-07T14:00:00.000Z',
        endISO: '2026-09-07T14:30:00.000Z',
        minutes: 30,
        km: 6,
        wasUserEntered: false,
      },
      {
        activity: 'cycling',
        startISO: '2026-09-07T14:00:00.000Z',
        endISO: '2026-09-07T14:30:00.000Z',
        minutes: 30,
        km: 6,
        wasUserEntered: false,
      },
    ]);
  });
});
