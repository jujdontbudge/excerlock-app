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

export interface MotionProvider {
  getAvailability(): MotionAvailability;
  getAuthorizationStatus(): MotionAuthStatus;
  requestAuthorization(): Promise<MotionAuthStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  queryActivity(fromMs: number, toMs: number): Promise<readonly ActivitySample[]>;
  querySteps(fromMs: number, toMs: number): Promise<{ readonly steps: number }>;
  on(event: "activity", callback: (sample: ActivitySample) => void): Unsubscribe;
  on(event: "cadence", callback: (sample: CadenceSample) => void): Unsubscribe;
}
