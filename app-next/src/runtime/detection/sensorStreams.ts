import type {
  DeviceMotionOptions,
  ExcerlockMotionModuleEvents,
  MagnetometerOptions,
  MotionAuthStatus,
  MotionAvailability,
  RecordedAccelerometerSample,
} from '../../../modules/excerlock-motion/src/ExcerlockMotion.types';

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
  readonly availability: readonly (keyof MotionAvailability)[];
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
  readonly samples: number;
  readonly stop: { readonly outcome: 'stopped' | 'rejected'; readonly code: string | null };
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
  readonly sampleWindowMs: number;
  readonly wait?: (ms: number) => Promise<void>;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' && code ? code : 'ERR_UNKNOWN';
}

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
  readonly motionAccess: MotionAuthStatus;
}

export function snapshotSensors(client: Pick<SensorStreamModuleClient, 'getAvailability' | 'getAuthorizationStatus'>): SensorSnapshot | null {
  try {
    return { availability: client.getAvailability(), motionAccess: client.getAuthorizationStatus() };
  } catch {
    return null;
  }
}
