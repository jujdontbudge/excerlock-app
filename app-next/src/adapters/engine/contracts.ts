/**
 * merge: P2-T03 provides these under `src/engine/signals/**`. Every declaration below is copied
 * from `app/src/signals/{motion,placement,location,health}` so that landing P2-T03 is an import
 * swap, not a rewrite: delete this file and re-export from the engine instead.
 *
 * Nothing here imports a native module. The adapters depend on these interfaces only, which is why
 * they run under jest with no dev-client build.
 */

export type Unsubscribe = () => void;

/* ------------------------------------------------------------------ motion */
/** app/src/signals/motion/MotionProvider.ts */

export type MotionAuthStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized';

export type ActivityClass =
  | 'walking'
  | 'running'
  | 'cycling'
  | 'automotive'
  | 'stationary'
  | 'unknown';

export type MotionConfidence = 'low' | 'medium' | 'high';

export interface ActivitySample {
  readonly classes: readonly ActivityClass[];
  readonly confidence: MotionConfidence;
  readonly startedAt: number;
  readonly receivedAt: number;
}

export interface CadenceSample {
  readonly stepsPerSecond: number | null;
  /** Steps since live pedometer updates began, not since local midnight. */
  readonly cumulativeSteps: number;
  readonly asOf: number;
}

export interface MotionAvailability {
  readonly activity: boolean;
  readonly cadence: boolean;
  readonly stepCounting: boolean;
}

export interface MotionProvider {
  getAvailability(): MotionAvailability;
  getAuthorizationStatus(): MotionAuthStatus;
  requestAuthorization(): Promise<MotionAuthStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  queryActivity(fromMs: number, toMs: number): Promise<readonly ActivitySample[]>;
  querySteps(fromMs: number, toMs: number): Promise<{ readonly steps: number }>;
  on(event: 'activity', callback: (sample: ActivitySample) => void): Unsubscribe;
  on(event: 'cadence', callback: (sample: CadenceSample) => void): Unsubscribe;
}

/** app/src/signals/motion/WalkVerifier.ts */
export type WalkVerdict =
  | { readonly isWalking: false; readonly phase: 'notWalking'; readonly evaluatedAt: number }
  | { readonly isWalking: true; readonly phase: 'verified'; readonly evaluatedAt: number }
  | {
      readonly isWalking: true;
      readonly phase: 'grace';
      readonly evaluatedAt: number;
      readonly graceEndsAt: number;
    };

export interface WalkVerifierLike {
  processActivity(sample: ActivitySample): WalkVerdict;
  processCadence(sample: CadenceSample): WalkVerdict;
  processAuthorizationDenied(atMs: number): WalkVerdict;
  getVerdict(atMs: number): WalkVerdict;
}

/* --------------------------------------------------------------- placement */
/** app/src/signals/placement/PhonePlacementProvider.ts + PhonePlacementClassifier.ts */

export interface MotionVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DeviceMotionSample {
  readonly timestampMs: number;
  readonly gravity: MotionVector3;
  readonly rotationRate: MotionVector3;
}

export interface PhonePlacementProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(callback: (sample: DeviceMotionSample) => void): Unsubscribe;
}

export type PhonePlacement = 'propped' | 'inHand' | 'unknown';
export type PhonePlacementTransitionKind = 'pickedUp' | 'setDown';

export interface PhonePlacementResult {
  readonly placement: PhonePlacement;
  readonly transition: { readonly kind: PhonePlacementTransitionKind; readonly timestampMs: number } | null;
  readonly evaluatedAtMs: number | null;
}

export interface PhonePlacementClassifierLike {
  process(sample: DeviceMotionSample): PhonePlacementResult;
  getResult(): PhonePlacementResult;
}

/* ---------------------------------------------------------------- location */
/** app/src/signals/location/LocationProvider.ts */

export type LocationAuthorizationStatus =
  | 'notDetermined'
  | 'restricted'
  | 'denied'
  | 'authorizedWhenInUse'
  | 'authorizedAlways';

export interface GeofenceRegion {
  readonly id: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly radiusMeters: number;
}

export interface LocationSample {
  readonly lat: number;
  readonly lon: number;
  readonly accuracy: number;
  readonly atMs: number;
}

export interface RegionTransition {
  readonly type: 'enter' | 'exit';
  readonly regionId: string;
  readonly atMs: number;
}

export interface LocationProvider {
  requestAuthorization(): Promise<LocationAuthorizationStatus>;
  getAuthorizationStatus(): LocationAuthorizationStatus;
  startMonitoringRegions(regions: readonly GeofenceRegion[]): Promise<void>;
  stopMonitoringRegions(regionIds?: readonly string[]): Promise<void>;
  isInsideRegion(regionId: string): boolean | null;
  getLastLocation(): LocationSample | null;
  startWalkKeepAlive(): Promise<void>;
  stopWalkKeepAlive(): Promise<void>;
  isWalkKeepAliveActive(): boolean;
  on(event: 'region', callback: (transition: RegionTransition) => void): Unsubscribe;
  on(event: 'location', callback: (sample: LocationSample) => void): Unsubscribe;
  on(event: 'authorization', callback: (status: LocationAuthorizationStatus) => void): Unsubscribe;
}

/**
 * The manual, When-in-use tier. `NativeLocationProvider` implements it alongside `LocationProvider`;
 * `checkIn` resolves true when the device is inside the region it was handed.
 */
export interface ManualGymCheckIn {
  checkIn(region: GeofenceRegion): Promise<boolean>;
}

export type GymLocationEngine = LocationProvider & ManualGymCheckIn;

/* ------------------------------------------------------------------ health */
/** app/src/signals/health/HealthProvider.ts */

export type HealthAuthorizationStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized';

/**
 * A HealthKit workout with the three facts the domain needs and the old `HealthKitClient` dropped:
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
