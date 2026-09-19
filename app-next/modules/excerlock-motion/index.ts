import type { ExcerlockMotionModule } from "./src/ExcerlockMotionModule";

/**
 * Native loading is deliberately explicit. Fixture/test composition can import
 * this package without touching JSI; only an iOS dev-client root calls here.
 */
export function getExcerlockMotionModule(): ExcerlockMotionModule {
  return (
    require("./src/ExcerlockMotionModule") as {
      default: ExcerlockMotionModule;
    }
  ).default;
}

export type {
  ActivityClass,
  ActivitySample,
  AltitudeSample,
  AttitudeReferenceFrame,
  CadenceSample,
  CalibratedMagneticField,
  DeviceMotionOptions,
  DeviceMotionSample,
  ExcerlockMotionModuleEvents,
  MagneticFieldAccuracy,
  MagnetometerOptions,
  MagnetometerSample,
  MotionAttitude,
  MotionAuthStatus,
  MotionAvailability,
  MotionConfidence,
  MotionQuaternion,
  MotionVector3,
  PedometerEventSample,
  RecordedAccelerometerSample,
} from "./src/ExcerlockMotion.types";
