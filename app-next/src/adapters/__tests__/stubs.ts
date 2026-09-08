import { distanceMetres } from '../../features/gym-picker/geometry';
import {
  ActivitySample,
  CadenceSample,
  DeviceMotionSample,
  GymLocationEngine,
  GeofenceRegion,
  HealthAuthorizationStatus,
  LocationAuthorizationStatus,
  LocationSample,
  MotionAuthStatus,
  MotionProvider,
  PhonePlacementClassifierLike,
  PhonePlacementProvider,
  PhonePlacementResult,
  RegionTransition,
  Unsubscribe,
  WalkVerdict,
  WalkVerifierLike,
  WorkoutRecord,
} from '../engine/contracts';

/**
 * Signal-injection stubs. The port contract suites need a way to hand an adapter the events a
 * device would otherwise deliver; these provide it without pretending to model the sensors.
 */

export type MotionStub = {
  provider: MotionProvider;
  emitActivity(sample: Partial<ActivitySample> & { receivedAt: number }): void;
  emitCadence(sample: Partial<CadenceSample> & { asOf: number }): void;
  running(): boolean;
  steps: { value: number; queries: { fromMs: number; toMs: number }[] };
  authorization: MotionAuthStatus;
};

export function motionStub(): MotionStub {
  const activity = new Set<(sample: ActivitySample) => void>();
  const cadence = new Set<(sample: CadenceSample) => void>();
  let started = false;
  const stub: MotionStub = {
    steps: { value: 0, queries: [] },
    authorization: 'authorized',
    running: () => started,
    emitActivity: (sample) =>
      activity.forEach((listener) =>
        listener({
          classes: ['walking'],
          confidence: 'high',
          startedAt: sample.receivedAt,
          ...sample,
        } as ActivitySample),
      ),
    emitCadence: (sample) =>
      cadence.forEach((listener) =>
        listener({ stepsPerSecond: 1.6, cumulativeSteps: 0, ...sample } as CadenceSample),
      ),
    provider: {
      getAvailability: () => ({ activity: true, cadence: true, stepCounting: true }),
      getAuthorizationStatus: () => stub.authorization,
      requestAuthorization: async () => stub.authorization,
      start: async () => {
        started = true;
      },
      stop: async () => {
        started = false;
      },
      queryActivity: async () => [],
      querySteps: async (fromMs, toMs) => {
        stub.steps.queries.push({ fromMs, toMs });
        return { steps: stub.steps.value };
      },
      on: ((event: 'activity' | 'cadence', callback: (sample: never) => void): Unsubscribe => {
        const set = event === 'activity' ? activity : cadence;
        set.add(callback as never);
        return () => set.delete(callback as never);
      }) as MotionProvider['on'],
    },
  };
  return stub;
}

export type VerifierStub = WalkVerifierLike & { verdict: WalkVerdict['phase']; graceMs: number };

/** A verifier whose answer the test sets directly; `WalkVerifier` has its own suite. */
export function verifierStub(options: { gracePeriodMs: number }): VerifierStub {
  const stub = {
    graceMs: options.gracePeriodMs,
    verdict: 'notWalking' as WalkVerdict['phase'],
    answer: (atMs: number): WalkVerdict =>
      stub.verdict === 'verified'
        ? { isWalking: true, phase: 'verified', evaluatedAt: atMs }
        : stub.verdict === 'grace'
          ? { isWalking: true, phase: 'grace', evaluatedAt: atMs, graceEndsAt: atMs + stub.graceMs }
          : { isWalking: false, phase: 'notWalking', evaluatedAt: atMs },
    processActivity: (sample: ActivitySample) => stub.answer(sample.receivedAt),
    processCadence: (sample: CadenceSample) => stub.answer(sample.asOf),
    processAuthorizationDenied: (atMs: number) => stub.answer(atMs),
    getVerdict: (atMs: number) => stub.answer(atMs),
  };
  return stub;
}

export type PlacementStub = {
  provider: PhonePlacementProvider;
  classifier: PhonePlacementClassifierLike;
  pickUp(atMs: number): void;
  setDown(atMs: number): void;
  running(): boolean;
};

export function placementStub(): PlacementStub {
  const listeners = new Set<(sample: DeviceMotionSample) => void>();
  let started = false;
  let result: PhonePlacementResult = { placement: 'propped', transition: null, evaluatedAtMs: null };
  const emit = (atMs: number, next: PhonePlacementResult) => {
    result = next;
    const zero = { x: 0, y: 0, z: 0 };
    listeners.forEach((listener) => listener({ timestampMs: atMs, gravity: zero, rotationRate: zero }));
  };
  return {
    running: () => started,
    pickUp: (atMs) =>
      emit(atMs, { placement: 'inHand', transition: { kind: 'pickedUp', timestampMs: atMs }, evaluatedAtMs: atMs }),
    setDown: (atMs) =>
      emit(atMs, { placement: 'propped', transition: { kind: 'setDown', timestampMs: atMs }, evaluatedAtMs: atMs }),
    classifier: { process: () => result, getResult: () => result },
    provider: {
      start: async () => {
        started = true;
      },
      stop: async () => {
        started = false;
      },
      onSample: (callback) => {
        listeners.add(callback);
        return () => listeners.delete(callback);
      },
    },
  };
}

export type KeepAliveStub = {
  startWalkKeepAlive(): Promise<void>;
  stopWalkKeepAlive(): Promise<void>;
  active(): boolean;
};

export function keepAliveStub(): KeepAliveStub {
  let active = false;
  return {
    active: () => active,
    startWalkKeepAlive: async () => {
      active = true;
    },
    stopWalkKeepAlive: async () => {
      active = false;
    },
  };
}

export type LocationStub = {
  engine: GymLocationEngine;
  /** Every authorization scope the adapter asked for, in order; the Always guard reads this. */
  requests: ('whenInUse' | 'always')[];
  monitored: GeofenceRegion[][];
  authorization: LocationAuthorizationStatus;
  /** True when a region is entered manually; `checkIn` answers with it. */
  insideOnCheckIn: boolean;
  transition(transition: RegionTransition): void;
  locate(sample: LocationSample): void;
};

export function locationStub(): LocationStub {
  const regions = new Set<(transition: RegionTransition) => void>();
  const locations = new Set<(sample: LocationSample) => void>();
  const authorizations = new Set<(status: LocationAuthorizationStatus) => void>();
  let last: LocationSample | null = null;
  const presence = new Map<string, boolean>();
  const stub: LocationStub = {
    requests: [],
    monitored: [],
    authorization: 'authorizedWhenInUse',
    insideOnCheckIn: true,
    transition: (transition) => {
      presence.set(transition.regionId, transition.type === 'enter');
      regions.forEach((listener) => listener(transition));
    },
    locate: (sample) => {
      last = sample;
      locations.forEach((listener) => listener(sample));
    },
    engine: {
      requestAuthorization: async () => {
        stub.requests.push('whenInUse');
        if (stub.authorization === 'notDetermined') stub.authorization = 'authorizedWhenInUse';
        authorizations.forEach((listener) => listener(stub.authorization));
        return stub.authorization;
      },
      getAuthorizationStatus: () => stub.authorization,
      startMonitoringRegions: async (next) => {
        stub.requests.push('always');
        if (stub.authorization !== 'authorizedAlways') throw new Error('Always location is required');
        stub.monitored.push([...next]);
      },
      stopMonitoringRegions: async () => {
        stub.monitored.push([]);
      },
      isInsideRegion: (regionId) => presence.get(regionId) ?? null,
      getLastLocation: () => last,
      startWalkKeepAlive: async () => undefined,
      stopWalkKeepAlive: async () => undefined,
      isWalkKeepAliveActive: () => false,
      checkIn: async (region) => {
        // `NativeLocationProvider.checkIn` takes one foreground fix and answers with whether it
        // lands inside the region, then pushes the matching transition through the processor.
        stub.requests.push('whenInUse');
        const fix = last;
        const inside =
          stub.insideOnCheckIn &&
          fix !== null &&
          distanceMetres({ latitude: fix.lat, longitude: fix.lon }, region) <= region.radiusMeters;
        stub.transition({ type: inside ? 'enter' : 'exit', regionId: region.id, atMs: fix?.atMs ?? 0 });
        return inside;
      },
      on: ((event: 'region' | 'location' | 'authorization', callback: (value: never) => void): Unsubscribe => {
        const set = event === 'region' ? regions : event === 'location' ? locations : authorizations;
        set.add(callback as never);
        return () => set.delete(callback as never);
      }) as GymLocationEngine['on'],
    },
  };
  return stub;
}

export type HealthStub = {
  engine: {
    getAuthorizationStatus(): HealthAuthorizationStatus;
    requestAuthorization(): Promise<HealthAuthorizationStatus>;
    configureBackgroundDelivery(): Promise<void>;
    queryWorkouts(from: Date, to: Date): Promise<readonly WorkoutRecord[]>;
  };
  authorization: HealthAuthorizationStatus;
  workouts: WorkoutRecord[];
  backgroundDeliveryCalls: number;
  queries: { from: Date; to: Date }[];
};

export function healthStub(workouts: WorkoutRecord[] = []): HealthStub {
  const stub: HealthStub = {
    authorization: 'authorized',
    workouts,
    backgroundDeliveryCalls: 0,
    queries: [],
    engine: {
      getAuthorizationStatus: () => stub.authorization,
      requestAuthorization: async () => stub.authorization,
      configureBackgroundDelivery: async () => {
        stub.backgroundDeliveryCalls += 1;
      },
      queryWorkouts: async (from, to) => {
        stub.queries.push({ from, to });
        return stub.workouts.filter(
          (workout) =>
            Date.parse(workout.startISO) >= from.getTime() && Date.parse(workout.startISO) < to.getTime(),
        );
      },
    },
  };
  return stub;
}
