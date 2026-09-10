import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  FixturePhonePlacementProvider,
  NativePhonePlacementProvider,
  createPhonePlacementModuleClient,
  type PhonePlacementProvider,
} from "../signals/placement";
import treadmillRecordings from "../signals/placement/__tests__/fixtures/treadmillRecordings.json";

import {
  shouldUseNativeIosRuntime,
  type NativeIosRuntimeEnvironment,
} from "../nativeIosRuntime";

export type WalkingPlacementRuntime = Readonly<{
  provider: PhonePlacementProvider;
}>;

/** Selects the real placement provider in native iOS builds (T11 wires the adapter). */
export function createWalkingPlacementRuntime(
  environment: NativeIosRuntimeEnvironment = currentEnvironment(),
  createNative: () => PhonePlacementProvider = () =>
    new NativePhonePlacementProvider(createPhonePlacementModuleClient()),
): WalkingPlacementRuntime {
  if (shouldUseNativeIosRuntime(environment)) {
    return { provider: createNative() };
  }
  return {
    provider: new FixturePhonePlacementProvider(
      treadmillRecordings.proppedOnQuietConsole,
    ),
  };
}

function currentEnvironment(): NativeIosRuntimeEnvironment {
  return {
    nodeEnv: process.env.NODE_ENV,
    platform: Platform.OS,
    expoVersion: Constants.expoVersion,
  };
}
