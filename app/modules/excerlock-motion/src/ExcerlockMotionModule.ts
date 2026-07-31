import { NativeModule, requireNativeModule } from "expo";

import type {
  ActivitySample,
  CadenceSample,
  ExcerlockMotionModuleEvents,
  MotionAuthStatus,
  MotionAvailability,
} from "./ExcerlockMotion.types";

export class ExcerlockMotionModule extends NativeModule<ExcerlockMotionModuleEvents> {
  public getAvailability!: () => MotionAvailability;
  public getAuthorizationStatus!: () => MotionAuthStatus;
  public requestAuthorization!: () => Promise<MotionAuthStatus>;
  public start!: () => Promise<void>;
  public stop!: () => Promise<void>;
  public queryActivity!: (
    fromMs: number,
    toMs: number,
  ) => Promise<readonly ActivitySample[]>;
  public querySteps!: (
    fromMs: number,
    toMs: number,
  ) => Promise<{ readonly steps: number }>;
}

export default requireNativeModule<ExcerlockMotionModule>("ExcerlockMotion");
