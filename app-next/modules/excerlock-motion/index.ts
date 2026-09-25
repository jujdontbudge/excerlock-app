import type { ExcerlockMotionModule } from "./src/ExcerlockMotionModule";

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
