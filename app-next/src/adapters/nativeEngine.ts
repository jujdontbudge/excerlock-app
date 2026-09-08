import { PlaceSearch } from '../ports/PlaceSearch';
import { ClockPort } from '../ports/ClockPort';
import { GymVisit } from '../domain/types';
import { GymAdapter, createGymAdapter } from './gym/GymAdapter';
import { HealthAdapter, createHealthAdapter } from './health/HealthAdapter';
import { requireKingstinctWorkoutEngine } from './health/kingstinctWorkouts';
import { StepsAdapter, createStepsAdapter } from './steps/StepsAdapter';
import { WalkingAdapter, createWalkingAdapter } from './walking/WalkingAdapter';
import {
  GymLocationEngine,
  MotionProvider,
  PhonePlacementClassifierLike,
  PhonePlacementProvider,
  WalkVerifierLike,
} from './engine/contracts';

/**
 * The four adapters bound to the real engine.
 *
 * Every `require` below is inside a function on purpose. `engine/signals` reaches native modules
 * through `expo-modules-core`, so importing this file must not be enough to load them: the
 * composition root (P2-T17) decides when, and every test in `src/adapters` runs without ever
 * getting here. This is the same lazy-accessor shape `engine/signals/location/accessor.ts` uses.
 *
 * Wiring one of these is what promotes its accessor out of the pending list in
 * `guardrails/phase3-production-callers.test.ts`.
 */

/** `CMMotionActivityManager` + `CMPedometer`, through the ported `excerlock-motion` module. */
export function nativeMotion(): MotionProvider {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const signals = require('../engine/signals') as typeof import('../engine/signals');
  return new signals.NativeMotionProvider(signals.createExcerlockMotionModuleClient());
}

/** Expo Location on a development client, the recorded fixture everywhere else. */
export function nativeLocation(): GymLocationEngine {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const signals = require('../engine/signals') as typeof import('../engine/signals');
  return signals.getLocationProvider();
}

function nativePlacement(): PhonePlacementProvider {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const signals = require('../engine/signals') as typeof import('../engine/signals');
  return new signals.NativePhonePlacementProvider(signals.createPhonePlacementModuleClient());
}

function nativeVerifier(options: { gracePeriodMs: number }): WalkVerifierLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const signals = require('../engine/signals') as typeof import('../engine/signals');
  return new signals.WalkVerifier(options);
}

function nativeClassifier(): PhonePlacementClassifierLike {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const signals = require('../engine/signals') as typeof import('../engine/signals');
  return new signals.PhonePlacementClassifier();
}

/**
 * Arrivals the geofence task confirmed while the app was closed (decision B31).
 *
 * The log stores region intervals, not product visits, so an open interval stays open here: the
 * gym adapter and `domain/gymDwell` are what turn a pair of instants into minutes.
 */
export function backgroundGymVisits(): () => Promise<GymVisit[]> {
  return async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const signals = require('../engine/signals') as typeof import('../engine/signals');
    const intervals = await signals.createAsyncStorageGymVisitLog().readAll();
    return intervals.map((interval, index) => ({
      id: `geofence:${interval.regionId}:${interval.enteredAt}:${index}`,
      placeId: interval.regionId,
      enteredAt: new Date(interval.enteredAt).toISOString(),
      exitedAt: interval.exitedAt === null ? null : new Date(interval.exitedAt).toISOString(),
      source: 'geofence' as const,
    }));
  };
}

export type NativeAdapters = {
  steps: StepsAdapter;
  walking: WalkingAdapter;
  gym: GymAdapter;
  health: HealthAdapter;
};

export function createNativeAdapters(options: {
  clock: ClockPort;
  search: PlaceSearch;
  onError?: (error: unknown) => void;
}): NativeAdapters {
  const { clock, search, onError } = options;
  const motion = nativeMotion();
  const location = nativeLocation();
  return {
    steps: createStepsAdapter({ motion, clock, onError }),
    walking: createWalkingAdapter({
      clock,
      motion,
      location,
      createVerifier: nativeVerifier,
      createPlacement: nativePlacement,
      createClassifier: nativeClassifier,
      onError,
    }),
    gym: createGymAdapter({
      clock,
      engine: location,
      search,
      backgroundVisits: backgroundGymVisits(),
      onError,
    }),
    health: createHealthAdapter({ clock, engine: requireKingstinctWorkoutEngine(), onError }),
  };
}
