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

export type PhonePlacementSubscription = () => void;

export interface PhonePlacementProvider {
  start(): Promise<void>;
  stop(): Promise<void>;
  onSample(
    callback: (sample: DeviceMotionSample) => void,
  ): PhonePlacementSubscription;
}
