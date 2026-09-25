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
  PedometerMeasurement,
  RecordedAccelerometerSample,
} from "./ExcerlockMotion.types";

export class ExcerlockMotionModule extends NativeModule<ExcerlockMotionModuleEvents> {
  public getAvailability!: () => MotionAvailability;
  public getAuthorizationStatus!: () => MotionAuthStatus;
  public requestAuthorization!: () => Promise<MotionAuthStatus>;
  public start!: () => Promise<void>;
  public stop!: () => Promise<void>;
  public startDeviceMotion!: (options?: DeviceMotionOptions) => Promise<void>;
  public stopDeviceMotion!: () => Promise<void>;
  public startAltimeter!: () => Promise<void>;
  public stopAltimeter!: () => Promise<void>;
  public startMagnetometer!: (options?: MagnetometerOptions) => Promise<void>;
  public stopMagnetometer!: () => Promise<void>;
  public startPedometerEvents!: () => Promise<void>;
  public stopPedometerEvents!: () => Promise<void>;
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
  ) => Promise<PedometerMeasurement>;
}

export default requireNativeModule<ExcerlockMotionModule>("ExcerlockMotion");
