import type { GaitKeypointSample } from "./GaitVisionProvider";

export interface GaitVisionModuleSubscription {
  remove(): void;
}

export interface GaitVisionModuleClient {
  start(): Promise<void>;
  stop(): Promise<void>;
  addListener(
    event: "onGaitSample",
    callback: (sample: GaitKeypointSample) => void,
  ): GaitVisionModuleSubscription;
}

/** Loads the local Expo Module only from the native runtime composition root. */
export function createExcerlockGaitVisionModuleClient(): GaitVisionModuleClient {
  const moduleSurface = require("../../../../modules/excerlock-gait-vision") as {
    getExcerlockGaitVisionModule(): GaitVisionModuleClient;
  };
  return moduleSurface.getExcerlockGaitVisionModule();
}
