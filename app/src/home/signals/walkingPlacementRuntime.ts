import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  createPhonePlacementModuleClient,
  FixturePhonePlacementProvider,
  NativePhonePlacementProvider,
  type PhonePlacementProvider,
} from "@/signals";

import type { HomeRuntimeEnvironment } from "./runtimeSelection";

export function createWalkingPlacementRuntime(
  environment: HomeRuntimeEnvironment = currentEnvironment(),
  createNative: () => PhonePlacementProvider = () =>
    new NativePhonePlacementProvider(createPhonePlacementModuleClient()),
): PhonePlacementProvider {
  if (
    environment.nodeEnv !== "test" &&
    environment.platform === "ios" &&
    !environment.hasExpoGoConfig
  ) {
    return createNative();
  }
  return new FixturePhonePlacementProvider([]);
}

function currentEnvironment(): HomeRuntimeEnvironment {
  return {
    executionEnvironment: Constants.executionEnvironment,
    hasExpoGoConfig: Constants.expoGoConfig !== null,
    nodeEnv: process.env.NODE_ENV,
    platform: Platform.OS,
  };
}
