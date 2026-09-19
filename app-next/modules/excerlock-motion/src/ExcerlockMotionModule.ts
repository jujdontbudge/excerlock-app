import { NativeModule, requireNativeModule } from "expo";

import type {
  ActivitySample,
  CadenceSample,
  DeviceMotionOptions,
  DeviceMotionSample,
  ExcerlockMotionModuleEvents,
  MagnetometerOptions,
  MotionAuthStatus,
  MotionAvailability,
  RecordedAccelerometerSample,
} from "./ExcerlockMotion.types";

export class ExcerlockMotionModule extends NativeModule<ExcerlockMotionModuleEvents> {
  public getAvailability!: () => MotionAvailability;
  public getAuthorizationStatus!: () => MotionAuthStatus;
  public requestAuthorization!: () => Promise<MotionAuthStatus>;
  /** CMMotionActivityManager + CMPedometer live updates (`onActivityChange`, `onCadence`). */
  public start!: () => Promise<void>;
  public stop!: () => Promise<void>;
  /** 50 Hz CMDeviceMotion (`onDeviceMotion`); the optional reference frame defaults to the historical one. */
  public startDeviceMotion!: (options?: DeviceMotionOptions) => Promise<void>;
  public stopDeviceMotion!: () => Promise<void>;
  /** CMAltimeter relative altitude (`onAltitude`). */
  public startAltimeter!: () => Promise<void>;
  public stopAltimeter!: () => Promise<void>;
  /** Raw CMMagnetometerData (`onMagnetometer`). */
  public startMagnetometer!: (options?: MagnetometerOptions) => Promise<void>;
  public stopMagnetometer!: () => Promise<void>;
  /** CMPedometer pause/resume events (`onPedometerEvent`). */
  public startPedometerEvents!: () => Promise<void>;
  public stopPedometerEvents!: () => Promise<void>;
  /** CMSensorRecorder: rejects with ERR_MOTION_UNAVAILABLE unless `availability.sensorRecorder`. */
  public recordAccelerometer!: (durationSeconds: number) => Promise<void>;
  public queryRecordedAccelerometer!: (
    fromMs: number,
    toMs: number,
  ) => Promise<readonly RecordedAccelerometerSample[]>;
  public queryActivity!: (
    fromMs: number,
    toMs: number,
  ) => Promise<readonly ActivitySample[]>;
  public querySteps!: (
    fromMs: number,
    toMs: number,
  ) => Promise<{ readonly steps: number }>;
}

export default requireNativeModule<ExcerlockMotionModule>("ExcerlockMotion");
