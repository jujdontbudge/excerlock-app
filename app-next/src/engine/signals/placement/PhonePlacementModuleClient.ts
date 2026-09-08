import type { DeviceMotionSample } from "./PhonePlacementProvider";

export interface PhonePlacementModuleSubscription {
  remove(): void;
}

export interface PhonePlacementModuleClient {
  startDeviceMotion(): Promise<void>;
  stopDeviceMotion(): Promise<void>;
  addListener(
    event: "onDeviceMotion",
    callback: (sample: DeviceMotionSample) => void,
  ): PhonePlacementModuleSubscription;
}

/** Loads JSI only when the iOS composition root asks for placement sensing. */
export function createPhonePlacementModuleClient(): PhonePlacementModuleClient {
  const moduleSurface = require("../../../modules/excerlock-motion") as {
    getExcerlockMotionModule(): PhonePlacementModuleClient;
  };
  return moduleSurface.getExcerlockMotionModule();
}
