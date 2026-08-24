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
