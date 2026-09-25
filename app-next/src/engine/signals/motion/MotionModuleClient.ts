import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
  PedometerMeasurement,
} from "./MotionProvider";

export type ExcerlockMotionEvent = "onActivityChange" | "onCadence";

export interface MotionModuleSubscription {
  remove(): void;
}

export interface ExcerlockMotionModuleClient {
  getAvailability(): MotionAvailability;
  getAuthorizationStatus(): MotionAuthStatus;
  requestAuthorization(): Promise<MotionAuthStatus>;
  start(): Promise<void>;
  stop(): Promise<void>;
  queryActivity(
    fromMs: number,
    toMs: number,
  ): Promise<readonly ActivitySample[]>;
  querySteps(fromMs: number, toMs: number): Promise<PedometerMeasurement>;
  addListener(
    event: "onActivityChange",
    callback: (sample: ActivitySample) => void,
  ): MotionModuleSubscription;
  addListener(
    event: "onCadence",
    callback: (sample: CadenceSample) => void,
  ): MotionModuleSubscription;
}

export function createExcerlockMotionModuleClient(): ExcerlockMotionModuleClient {
  const moduleSurface = require("../../../../modules/excerlock-motion") as {
    getExcerlockMotionModule(): ExcerlockMotionModuleClient;
  };
  return moduleSurface.getExcerlockMotionModule();
}
