import type {
  DeviceMotionOptions,
  ExcerlockMotionModuleEvents,
  MagnetometerOptions,
  MotionAuthStatus,
  MotionAvailability,
  RecordedAccelerometerSample,
} from '../../../modules/excerlock-motion/src/ExcerlockMotion.types';

/**
 * Every sensor stream the ExcerlockMotion binary exposes, as one narrow boundary.
 * Nothing here decides walking; the walking gate reads only the streams it was
 * built for (`MotionAdapter`, `PlacementAdapter`). The rest are collected and
 * exposed so a later JS bundle can use them without a new binary.
 */
export interface SensorStreamModuleClient {
  getAvailability(): MotionAvailability;
  getAuthorizationStatus(): MotionAuthStatus;
  start(): Promise<void>;
  stop(): Promise<void>;
  startDeviceMotion(options?: DeviceMotionOptions): Promise<void>;
  stopDeviceMotion(): Promise<void>;
  startAltimeter(): Promise<void>;
  stopAltimeter(): Promise<void>;
  startMagnetometer(options?: MagnetometerOptions): Promise<void>;
  stopMagnetometer(): Promise<void>;
  startPedometerEvents(): Promise<void>;
  stopPedometerEvents(): Promise<void>;
  recordAccelerometer(durationSeconds: number): Promise<void>;
  queryRecordedAccelerometer(fromMs: number, toMs: number): Promise<readonly RecordedAccelerometerSample[]>;
  addListener<E extends keyof ExcerlockMotionModuleEvents>(
    event: E,
    callback: ExcerlockMotionModuleEvents[E],
  ): { remove(): void };
}

/** Loads JSI only when the iOS composition root asks for the sensor surface. */
export function createSensorStreamModuleClient(): SensorStreamModuleClient {
  const moduleSurface = require('../../../modules/excerlock-motion') as {
    getExcerlockMotionModule(): SensorStreamModuleClient;
  };
  return moduleSurface.getExcerlockMotionModule();
}

export type SensorStreamId = 'activityCadence' | 'deviceMotion' | 'altimeter' | 'magnetometer' | 'pedometerEvents';

export interface SensorStreamDescriptor {
  readonly id: SensorStreamId;
  readonly event: keyof ExcerlockMotionModuleEvents;
  /** The availability flags the Swift guard requires before this stream starts. */
  readonly availability: readonly (keyof MotionAvailability)[];
  /** CMMotionActivityManager / CMPedometer / CMAltimeter streams prompt for Motion & Fitness when undetermined. */
  readonly requiresMotionAuthorization: boolean;
  start(client: SensorStreamModuleClient): Promise<void>;
  stop(client: SensorStreamModuleClient): Promise<void>;
}

export const SENSOR_STREAMS: readonly SensorStreamDescriptor[] = [
  {
    id: 'activityCadence', event: 'onActivityChange', availability: ['activity', 'cadence', 'stepCounting'],
    requiresMotionAuthorization: true, start: (client) => client.start(), stop: (client) => client.stop(),
  },
  {
    id: 'deviceMotion', event: 'onDeviceMotion', availability: ['deviceMotion'], requiresMotionAuthorization: false,
    start: (client) => client.startDeviceMotion(), stop: (client) => client.stopDeviceMotion(),
  },
  {
    id: 'altimeter', event: 'onAltitude', availability: ['relativeAltitude'], requiresMotionAuthorization: true,
    start: (client) => client.startAltimeter(), stop: (client) => client.stopAltimeter(),
  },
  {
    id: 'magnetometer', event: 'onMagnetometer', availability: ['magnetometer'], requiresMotionAuthorization: false,
    start: (client) => client.startMagnetometer(), stop: (client) => client.stopMagnetometer(),
  },
  {
    id: 'pedometerEvents', event: 'onPedometerEvent', availability: ['pedometerEvents'], requiresMotionAuthorization: true,
    start: (client) => client.startPedometerEvents(), stop: (client) => client.stopPedometerEvents(),
  },
];

export const UNAVAILABLE_CODE = 'ERR_MOTION_UNAVAILABLE';

export type SensorCallOutcome = { readonly outcome: 'started' | 'rejected' | 'skipped'; readonly code: string | null };

export interface SensorStreamSmokeResult {
  readonly id: SensorStreamId;
  readonly available: boolean;
  readonly start: SensorCallOutcome;
  /** Events received inside the sample window (0 on a device without the sensor). */
  readonly samples: number;
  readonly stop: { readonly outcome: 'stopped' | 'rejected'; readonly code: string | null };
  /** Native told the truth: available ⇒ started and stopped; unavailable ⇒ rejected with the unavailable code. */
  readonly ok: boolean;
}

export interface SensorRecorderSmokeResult {
  readonly available: boolean;
  readonly outcome: 'recorded' | 'rejected' | 'skipped';
  readonly code: string | null;
  readonly ok: boolean;
}

export interface SensorStreamSmokeReport {
  readonly availability: MotionAvailability;
  readonly authorization: MotionAuthStatus;
  readonly streams: readonly SensorStreamSmokeResult[];
  readonly recorder: SensorRecorderSmokeResult;
  readonly ok: boolean;
}

export interface SensorStreamSmokeOptions {
  /** How long each started stream is left running to count events. */
  readonly sampleWindowMs: number;
  readonly wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code ? code : 'ERR_UNKNOWN';
}

/**
 * Starts and stops every stream the binary exposes, one at a time, and judges
 * each answer against the availability flag: this is the OTA-readiness smoke.
 * An *available* stream behind Motion & Fitness is skipped while undetermined so
 * the smoke never raises a permission prompt; an unavailable one is still
 * exercised, because the Swift guards check availability before touching Core
 * Motion and reject without prompting. Streams are stopped even when start rejected.
 */
export async function runSensorStreamSmoke(
  client: SensorStreamModuleClient,
  options: SensorStreamSmokeOptions,
): Promise<SensorStreamSmokeReport> {
  const wait = options.wait ?? sleep;
  const availability = client.getAvailability();
  const authorization = client.getAuthorizationStatus();
  const undetermined = authorization === 'notDetermined';
  const streams: SensorStreamSmokeResult[] = [];

  for (const stream of SENSOR_STREAMS) {
    const available = stream.availability.every((flag) => availability[flag]);
    let samples = 0;
    const subscription = client.addListener(stream.event, (() => { samples += 1; }) as ExcerlockMotionModuleEvents[typeof stream.event]);
    let start: SensorCallOutcome;
    if (stream.requiresMotionAuthorization && undetermined && available) {
      start = { outcome: 'skipped', code: authorization };
    } else {
      try {
        await stream.start(client);
        start = { outcome: 'started', code: null };
        if (options.sampleWindowMs > 0) await wait(options.sampleWindowMs);
      } catch (error) {
        start = { outcome: 'rejected', code: errorCode(error) };
      }
    }
    let stop: SensorStreamSmokeResult['stop'];
    try {
      await stream.stop(client);
      stop = { outcome: 'stopped', code: null };
    } catch (error) {
      stop = { outcome: 'rejected', code: errorCode(error) };
    }
    subscription.remove();
    const startConsistent = start.outcome === 'skipped'
      || (available ? start.outcome === 'started' : start.outcome === 'rejected' && start.code === UNAVAILABLE_CODE);
    streams.push({ id: stream.id, available, start, samples, stop, ok: startConsistent && stop.outcome === 'stopped' });
  }

  const recorder = await smokeRecorder(
    client, availability.sensorRecorder, undetermined && availability.sensorRecorder ? authorization : null,
  );
  return { availability, authorization, streams, recorder, ok: streams.every((stream) => stream.ok) && recorder.ok };
}

async function smokeRecorder(
  client: SensorStreamModuleClient,
  available: boolean,
  skipBecause: MotionAuthStatus | null,
): Promise<SensorRecorderSmokeResult> {
  if (skipBecause) return { available, outcome: 'skipped', code: skipBecause, ok: true };
  try {
    await client.recordAccelerometer(1);
    return { available, outcome: 'recorded', code: null, ok: available };
  } catch (error) {
    const code = errorCode(error);
    return { available, outcome: 'rejected', code, ok: !available && code === UNAVAILABLE_CODE };
  }
}

export interface SensorSnapshot {
  readonly availability: MotionAvailability;
  /** Motion & Fitness status. Named so because `authorization` is a forbidden incident-diagnostics key on the API. */
  readonly motionAccess: MotionAuthStatus;
}

/** Flags only, no readings: what an incident report may say about this phone's sensors. Null when native cannot answer. */
export function snapshotSensors(client: Pick<SensorStreamModuleClient, 'getAvailability' | 'getAuthorizationStatus'>): SensorSnapshot | null {
  try {
    return { availability: client.getAvailability(), motionAccess: client.getAuthorizationStatus() };
  } catch {
    return null;
  }
}
