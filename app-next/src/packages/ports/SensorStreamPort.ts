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
