export type Unsubscribe = () => void;

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

export type PedometerMeasurement = {
  readonly steps: number;
  readonly distanceMeters?: number | null;
  readonly floorsAscended?: number | null;
  readonly activeMinutes?: number | null;
};

export interface MotionProvider {
  getAvailability(): MotionAvailability;
  getAuthorizationStatus(): MotionAuthStatus;
  requestAuthorization(): Promise<MotionAuthStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  queryActivity(fromMs: number, toMs: number): Promise<readonly ActivitySample[]>;
  querySteps(fromMs: number, toMs: number): Promise<PedometerMeasurement>;
  on(event: "activity", callback: (sample: ActivitySample) => void): Unsubscribe;
  on(event: "cadence", callback: (sample: CadenceSample) => void): Unsubscribe;
}
