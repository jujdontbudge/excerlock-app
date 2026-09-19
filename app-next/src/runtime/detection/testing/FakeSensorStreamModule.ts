import type {
  ExcerlockMotionModuleEvents,
  MotionAuthStatus,
  MotionAvailability,
  RecordedAccelerometerSample,
} from '../../../../modules/excerlock-motion/src/ExcerlockMotion.types';
import type { SensorStreamModuleClient } from '../sensorStreams';

type EventName = keyof ExcerlockMotionModuleEvents;
type Listener = (sample: never) => void;

/** Rejects like the native module: same code, and the reason names the stream. */
export class FakeNativeMotionError extends Error {
  public constructor(public readonly code: string, reason: string) {
    super(reason);
    this.name = 'FakeNativeMotionError';
  }
}

export const EVERYTHING_UNAVAILABLE: MotionAvailability = {
  activity: false, cadence: false, stepCounting: false, deviceMotion: false, magnetometer: false,
  relativeAltitude: false, floorCounting: false, distance: false, pace: false, pedometerEvents: false,
  sensorRecorder: false,
};

export const EVERYTHING_AVAILABLE: MotionAvailability = {
  activity: true, cadence: true, stepCounting: true, deviceMotion: true, magnetometer: true,
  relativeAltitude: true, floorCounting: true, distance: true, pace: true, pedometerEvents: true,
  sensorRecorder: true,
};

/**
 * Stands in for the ExcerlockMotion native module in tests: start() rejects with
 * ERR_MOTION_UNAVAILABLE when the stream's availability flags are off (as the Swift
 * guards do), and an available stream emits `samplesPerStart` events per start.
 */
export class FakeSensorStreamModule implements SensorStreamModuleClient {
  public readonly calls: string[] = [];
  public readonly running = new Set<string>();
  private readonly listeners = new Map<EventName, Set<Listener>>();

  public constructor(
    private availability: MotionAvailability,
    private authorization: MotionAuthStatus = 'authorized',
    private readonly samplesPerStart = 0,
  ) {}

  public getAvailability(): MotionAvailability {
    this.calls.push('getAvailability');
    return this.availability;
  }

  public getAuthorizationStatus(): MotionAuthStatus {
    return this.authorization;
  }

  public async requestAuthorization(): Promise<MotionAuthStatus> {
    return this.authorization;
  }

  public start = () => this.begin('activityCadence', ['activity', 'cadence', 'stepCounting'], 'onActivityChange');
  public stop = () => this.end('activityCadence');
  public startDeviceMotion = () => this.begin('deviceMotion', ['deviceMotion'], 'onDeviceMotion');
  public stopDeviceMotion = () => this.end('deviceMotion');
  public startAltimeter = () => this.begin('altimeter', ['relativeAltitude'], 'onAltitude');
  public stopAltimeter = () => this.end('altimeter');
  public startMagnetometer = () => this.begin('magnetometer', ['magnetometer'], 'onMagnetometer');
  public stopMagnetometer = () => this.end('magnetometer');
  public startPedometerEvents = () => this.begin('pedometerEvents', ['pedometerEvents'], 'onPedometerEvent');
  public stopPedometerEvents = () => this.end('pedometerEvents');

  public async recordAccelerometer(durationSeconds: number): Promise<void> {
    this.calls.push(`recordAccelerometer:${durationSeconds}`);
    if (!this.availability.sensorRecorder) throw new FakeNativeMotionError('ERR_MOTION_UNAVAILABLE', 'sensorRecorder unavailable');
  }

  public async queryRecordedAccelerometer(): Promise<readonly RecordedAccelerometerSample[]> {
    if (!this.availability.sensorRecorder) throw new FakeNativeMotionError('ERR_MOTION_UNAVAILABLE', 'sensorRecorder unavailable');
    return [];
  }

  public addListener<E extends EventName>(event: E, callback: ExcerlockMotionModuleEvents[E]): { remove(): void } {
    const set = this.listeners.get(event) ?? new Set<Listener>();
    set.add(callback as Listener);
    this.listeners.set(event, set);
    return { remove: () => set.delete(callback as Listener) };
  }

  public listenerCount(event: EventName): number {
    return this.listeners.get(event)?.size ?? 0;
  }

  private async begin(stream: string, flags: (keyof MotionAvailability)[], event: EventName): Promise<void> {
    this.calls.push(`start:${stream}`);
    if (flags.some((flag) => !this.availability[flag])) {
      throw new FakeNativeMotionError('ERR_MOTION_UNAVAILABLE', `${stream} is unavailable on this device`);
    }
    this.running.add(stream);
    for (let i = 0; i < this.samplesPerStart; i += 1) {
      this.listeners.get(event)?.forEach((listener) => listener({ timestampMs: i } as never));
    }
  }

  private async end(stream: string): Promise<void> {
    this.calls.push(`stop:${stream}`);
    this.running.delete(stream);
  }
}
