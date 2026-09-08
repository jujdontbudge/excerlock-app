import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  createPhonePlacementModuleClient,
  FixturePhonePlacementProvider,
  NativePhonePlacementProvider,
  type PhonePlacementProvider,
} from "../signals";

import {
  shouldUseNativeIosRuntime,
  type NativeIosRuntimeEnvironment,
} from "../nativeIosRuntime";

export function createWalkingPlacementRuntime(
  environment: NativeIosRuntimeEnvironment = currentEnvironment(),
  createNative: () => PhonePlacementProvider = () =>
    new NativePhonePlacementProvider(createPhonePlacementModuleClient()),
): PhonePlacementProvider {
  if (shouldUseNativeIosRuntime(environment)) {
    return createNative();
  }
  return new FixturePhonePlacementProvider([]);
}

function currentEnvironment(): NativeIosRuntimeEnvironment {
  return {
    nodeEnv: process.env.NODE_ENV,
    platform: Platform.OS,
    expoVersion: Constants.expoVersion,
  };
}
