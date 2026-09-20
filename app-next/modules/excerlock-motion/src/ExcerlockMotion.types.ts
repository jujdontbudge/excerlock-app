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
  /** CMPedometerData.distance, metres since start; null when the device does not estimate distance. */
  readonly distanceMeters: number | null;
  /** CMPedometerData.currentPace, seconds per metre; null when pace is unavailable or the walker is still. */
  readonly currentPaceSecondsPerMeter: number | null;
  /** CMPedometerData.floorsAscended / floorsDescended since start; null without a barometer. */
  readonly floorsAscended: number | null;
  readonly floorsDescended: number | null;
}

/**
 * One flag per Core Motion capability the module guards on. Every `start*` call
 * rejects with `ERR_MOTION_UNAVAILABLE` when its flag(s) are false; nothing is
 * faked. `sensorRecorder` is `CMSensorRecorder.isAccelerometerRecordingAvailable()`,
 * which is false on every iPhone to date.
 */
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

/** CMAttitude Euler angles in radians. Yaw is relative to the attitude reference frame. */
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

/** CMDeviceMotion.magneticField: calibrated, in microteslas; only meaningful with a magnetic reference frame. */
export interface CalibratedMagneticField extends MotionVector3 {
  readonly accuracy: MagneticFieldAccuracy;
}

/**
 * CMAttitudeReferenceFrame. The default (omitted) keeps the module's historical
 * behaviour: `xArbitraryZVertical`, no magnetometer, `heading` null.
 * `xTrueNorthZVertical` additionally needs Location Services.
 */
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
  /** Gravity-removed acceleration in g, phone frame (needed by the stride discriminator). */
  readonly userAcceleration: MotionVector3;
  readonly attitude: MotionAttitude;
  readonly quaternion: MotionQuaternion;
  /** Degrees [0, 360) relative to the reference frame; null when the frame carries no heading (CMDeviceMotion reports -1). */
  readonly heading: number | null;
  readonly magneticField: CalibratedMagneticField;
}

/** CMAltimeter relative altitude since the stream started. */
export interface AltitudeSample {
  readonly timestampMs: number;
  readonly relativeAltitudeMeters: number;
  readonly pressureKilopascals: number;
}

export interface MagnetometerOptions {
  /** Sampling interval; the module clamps to [20, 1000] ms. Default 100 ms. */
  readonly intervalMs?: number;
}

/** Raw CMMagnetometerData in microteslas, phone frame, uncalibrated. */
export interface MagnetometerSample {
  readonly timestampMs: number;
  readonly magneticField: MotionVector3;
}

/** CMPedometerEvent: the pedometer noticed walking pause or resume. */
export interface PedometerEventSample {
  readonly type: "pause" | "resume";
  readonly atMs: number;
}

/** One CMRecordedAccelerometerData row from CMSensorRecorder, in g. */
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
