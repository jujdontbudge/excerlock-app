export type MotionAuthStatus =
  | "notDetermined"
  | "restricted"
  | "denied"
  | "authorized";

export type ActivityClass =
  | "walking"
  | "running"
  | "cycling"
  | "automotive"
  | "stationary"
  | "unknown";

export type MotionConfidence = "low" | "medium" | "high";

export interface ActivitySample {
  readonly classes: readonly ActivityClass[];
  readonly confidence: MotionConfidence;
  readonly startedAt: number;
  readonly receivedAt: number;
}

export interface CadenceSample {
  readonly stepsPerSecond: number | null;
  readonly cumulativeSteps: number;
  readonly asOf: number;
  readonly distanceMeters: number | null;
  readonly currentPaceSecondsPerMeter: number | null;
  readonly floorsAscended: number | null;
  readonly floorsDescended: number | null;
}

export interface PedometerMeasurement {
  readonly steps: number;
  readonly distanceMeters: number | null;
  readonly floorsAscended: number | null;
  readonly activeMinutes: number | null;
}

export interface MotionAvailability {
  readonly activity: boolean;
  readonly cadence: boolean;
  readonly stepCounting: boolean;
  readonly deviceMotion: boolean;
  readonly magnetometer: boolean;
  readonly relativeAltitude: boolean;
  readonly floorCounting: boolean;
  readonly distance: boolean;
  readonly pace: boolean;
  readonly pedometerEvents: boolean;
  readonly sensorRecorder: boolean;
}

export interface MotionVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface MotionAttitude {
  readonly roll: number;
  readonly pitch: number;
  readonly yaw: number;
}

export interface MotionQuaternion {
  readonly x: number;
  readonly y: number;
  readonly z: number;
  readonly w: number;
}

export type MagneticFieldAccuracy = "uncalibrated" | "low" | "medium" | "high";

export interface CalibratedMagneticField extends MotionVector3 {
  readonly accuracy: MagneticFieldAccuracy;
}

export type AttitudeReferenceFrame =
  | "xArbitraryZVertical"
  | "xArbitraryCorrectedZVertical"
  | "xMagneticNorthZVertical"
  | "xTrueNorthZVertical";

export interface DeviceMotionOptions {
  readonly referenceFrame?: AttitudeReferenceFrame;
}

export interface DeviceMotionSample {
  readonly timestampMs: number;
  readonly gravity: MotionVector3;
  readonly rotationRate: MotionVector3;
  readonly userAcceleration: MotionVector3;
  readonly attitude: MotionAttitude;
  readonly quaternion: MotionQuaternion;
  readonly heading: number | null;
  readonly magneticField: CalibratedMagneticField;
}

export interface AltitudeSample {
  readonly timestampMs: number;
  readonly relativeAltitudeMeters: number;
  readonly pressureKilopascals: number;
}

export interface MagnetometerOptions {
  readonly intervalMs?: number;
}

export interface MagnetometerSample {
  readonly timestampMs: number;
  readonly magneticField: MotionVector3;
}

export interface PedometerEventSample {
  readonly type: "pause" | "resume";
  readonly atMs: number;
}

export interface RecordedAccelerometerSample {
  readonly timestampMs: number;
  readonly identifier: number;
  readonly acceleration: MotionVector3;
}

export type ExcerlockMotionModuleEvents = {
  onActivityChange: (sample: ActivitySample) => void;
  onCadence: (sample: CadenceSample) => void;
  onDeviceMotion: (sample: DeviceMotionSample) => void;
  onAltitude: (sample: AltitudeSample) => void;
  onMagnetometer: (sample: MagnetometerSample) => void;
  onPedometerEvent: (sample: PedometerEventSample) => void;
};
