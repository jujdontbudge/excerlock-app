/**
 * The engine surface the adapters are written over.
 *
 * P2-T03 moved the built-and-tested native engine into `src/engine/signals`, so every provider type
 * below is that engine's own declaration, re-exported here rather than redeclared. This file adds
 * only what the engine does not have: the two narrow class-shaped interfaces the adapters accept in
 * place of a concrete `WalkVerifier` / `PhonePlacementClassifier` so a test can substitute one, and
 * the workout half of HealthKit the engine's `HealthProvider` does not model.
 *
 * Every re-export is `export type`, so importing an adapter never loads a native module and the
 * whole layer runs under jest with no dev-client build.
 */

import type {
  ActivitySample,
  CadenceSample,
  WalkVerdict,
} from '../../engine/signals/motion';
import type {
  DeviceMotionSample,
  PhonePlacementResult,
} from '../../engine/signals/placement';
import type {
  LocationProvider,
  ManualGymCheckIn,
} from '../../engine/signals/location';
import type { HealthAuthorizationStatus } from '../../engine/signals/health';

export type {
  ActivityClass,
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
  MotionConfidence,
  MotionProvider,
  Unsubscribe,
  WalkVerdict,
} from '../../engine/signals/motion';

export type {
  DeviceMotionSample,
  MotionVector3,
  PhonePlacement,
  PhonePlacementProvider,
  PhonePlacementResult,
  PhonePlacementTransition,
  PhonePlacementTransitionKind,
} from '../../engine/signals/placement';

export type {
  GeofenceRegion,
  LocationAuthorizationStatus,
  LocationProvider,
  LocationSample,
  ManualGymCheckIn,
  RegionTransition,
} from '../../engine/signals/location';

export type { HealthAuthorizationStatus } from '../../engine/signals/health';

/**
 * What `WalkingAdapter` needs of a `WalkVerifier`: its four public methods and nothing else.
 * The engine's class satisfies this (`__tests__/contracts.test.ts` proves it), and a test can hand
 * the adapter a scripted verdict without constructing the real cadence window.
 */
export interface WalkVerifierLike {
  processActivity(sample: ActivitySample): WalkVerdict;
  processCadence(sample: CadenceSample): WalkVerdict;
  processAuthorizationDenied(atMs: number): WalkVerdict;
  getVerdict(atMs: number): WalkVerdict;
}

/** The same narrowing for `PhonePlacementClassifier`. */
export interface PhonePlacementClassifierLike {
  process(sample: DeviceMotionSample): PhonePlacementResult;
  getResult(): PhonePlacementResult;
}

/**
 * The gym half of the location engine. `NativeLocationProvider` implements both halves; the
 * adapter asks for exactly the two it uses, so a stub does not have to grow a `locateForGymSetup`
 * it will never be asked for.
 */
export type GymLocationEngine = LocationProvider & ManualGymCheckIn;

/**
 * A HealthKit workout with the three facts the rules need and the engine's `HealthKitClient` drops:
 * which activity it was, how far it went, and whether a human typed it in.
 */
export interface WorkoutRecord {
  readonly activity: 'running' | 'cycling' | 'other';
  readonly startISO: string;
  readonly endISO: string;
  readonly minutes: number;
  readonly km: number;
  readonly wasUserEntered: boolean;
}

export interface HealthWorkoutEngine {
  getAuthorizationStatus(): HealthAuthorizationStatus;
  requestAuthorization(): Promise<HealthAuthorizationStatus>;
  /** Immediate background delivery for the workout type; bootstrapped once per launch. */
  configureBackgroundDelivery(): Promise<void>;
  queryWorkouts(from: Date, to: Date): Promise<readonly WorkoutRecord[]>;
}
