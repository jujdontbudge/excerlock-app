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
}

export interface MotionAvailability {
  readonly activity: boolean;
  readonly cadence: boolean;
  readonly stepCounting: boolean;
}

export interface MotionVector3 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface DeviceMotionSample {
  readonly timestampMs: number;
  readonly gravity: MotionVector3;
  readonly rotationRate: MotionVector3;
}

export type ExcerlockMotionModuleEvents = {
  onActivityChange: (sample: ActivitySample) => void;
  onCadence: (sample: CadenceSample) => void;
  onDeviceMotion: (sample: DeviceMotionSample) => void;
};
