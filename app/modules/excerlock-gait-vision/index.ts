import type { ExcerlockGaitVisionModule } from "./src/ExcerlockGaitVisionModule";

/** Keeps native loading out of fixture and Jest composition roots. */
export function getExcerlockGaitVisionModule(): ExcerlockGaitVisionModule {
  return (
    require("./src/ExcerlockGaitVisionModule") as {
      default: ExcerlockGaitVisionModule;
    }
  ).default;
}

export type { ExcerlockGaitVisionModuleEvents } from "./src/ExcerlockGaitVision.types";
