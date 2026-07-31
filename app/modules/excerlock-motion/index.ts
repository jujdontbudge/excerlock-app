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
  CadenceSample,
  ExcerlockMotionModuleEvents,
  MotionAuthStatus,
  MotionAvailability,
  MotionConfidence,
} from "./src/ExcerlockMotion.types";
