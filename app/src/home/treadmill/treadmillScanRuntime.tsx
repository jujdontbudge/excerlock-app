import Constants from "expo-constants";
import { Platform, View } from "react-native";

import {
  NativeGaitVisionProvider,
  type GaitVisionModuleClient,
  type GaitVisionProvider,
} from "@/signals";
import type { HomeRuntimeEnvironment } from "../signals/runtimeSelection";

import type { GaitPreviewComponent } from "./TreadmillScanScreen";

export type NativeTreadmillScanParts = Readonly<{
  client: GaitVisionModuleClient;
  Preview: GaitPreviewComponent;
}>;

export type TreadmillScanRuntime = Readonly<{
  provider: GaitVisionProvider;
  Preview: GaitPreviewComponent;
}>;

/** Keeps the local camera module lazy and unavailable to Expo Go and tests. */
export function createTreadmillScanRuntime(
  environment: HomeRuntimeEnvironment = currentEnvironment(),
  createNative: () => NativeTreadmillScanParts = loadNativeParts,
): TreadmillScanRuntime {
  if (shouldUseNativeGaitVision(environment)) {
    const native = createNative();
    return {
      provider: new NativeGaitVisionProvider(native.client),
      Preview: native.Preview,
    };
  }
  return {
    provider: new UnavailableGaitVisionProvider(),
    Preview: EmptyPreview,
  };
}

function loadNativeParts(): NativeTreadmillScanParts {
  const surface = require("../../../modules/excerlock-gait-vision") as {
    getExcerlockGaitVisionModule(): GaitVisionModuleClient;
    getExcerlockGaitVisionPreview(): GaitPreviewComponent;
  };
  return {
    client: surface.getExcerlockGaitVisionModule(),
    Preview: surface.getExcerlockGaitVisionPreview(),
  };
}

function shouldUseNativeGaitVision(
  environment: HomeRuntimeEnvironment,
): boolean {
  return (
    environment.nodeEnv !== "test" &&
    environment.platform === "ios" &&
    !environment.hasExpoGoConfig
  );
}

function currentEnvironment(): HomeRuntimeEnvironment {
  return {
    executionEnvironment: Constants.executionEnvironment,
    hasExpoGoConfig: Constants.expoGoConfig !== null,
    nodeEnv: process.env.NODE_ENV,
    platform: Platform.OS,
  };
}

const EmptyPreview: GaitPreviewComponent = ({ style }) => <View style={style} />;

class UnavailableGaitVisionProvider implements GaitVisionProvider {
  public async start(): Promise<void> {
    throw Object.assign(new Error("Native gait vision is unavailable"), {
      code: "ERR_GAIT_VISION_DENIED",
    });
  }

  public async stop(): Promise<void> {}

  public onSample(): () => void {
    return () => {};
  }
}
