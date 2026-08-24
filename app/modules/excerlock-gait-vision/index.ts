import type { ExcerlockGaitVisionModule } from "./src/ExcerlockGaitVisionModule";
import type { ComponentType } from "react";
import type { GaitVisionPreviewProps } from "./src/GaitVisionPreview";

/** Keeps native loading out of fixture and Jest composition roots. */
export function getExcerlockGaitVisionModule(): ExcerlockGaitVisionModule {
  return (
    require("./src/ExcerlockGaitVisionModule") as {
      default: ExcerlockGaitVisionModule;
    }
  ).default;
}

/** Keeps the native view manager out of fixture and Jest composition roots. */
export function getExcerlockGaitVisionPreview(): ComponentType<GaitVisionPreviewProps> {
  return (
    require("./src/GaitVisionPreview") as {
      default: ComponentType<GaitVisionPreviewProps>;
    }
  ).default;
}

export type { ExcerlockGaitVisionModuleEvents } from "./src/ExcerlockGaitVision.types";
export type { GaitVisionPreviewProps } from "./src/GaitVisionPreview";
