import type { DeviceMotionSample } from "../../../../../modules/excerlock-motion/src/ExcerlockMotion.types";

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

export function createPhonePlacementModuleClient(): PhonePlacementModuleClient {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- loaded lazily so fake runtimes never touch the native module
  const moduleSurface = require("../../../../../modules/excerlock-motion") as {
    getExcerlockMotionModule(): PhonePlacementModuleClient;
  };
  return moduleSurface.getExcerlockMotionModule();
}
