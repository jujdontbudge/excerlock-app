import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  createExcerlockMotionModuleClient,
  FixtureMotionProvider,
  getMotionFixture,
  NativeMotionProvider,
  type MotionProvider,
} from "@/signals";

import {
  shouldUseNativeIosRuntime,
  type NativeIosRuntimeEnvironment,
} from "@/runtime/nativeIosRuntime";

export type WalkingMotionRuntime = Readonly<{
  provider: MotionProvider;
  /** Same timestamp domain emitted by this provider's samples. */
  now: () => number;
}>;

/** Selects the real motion provider in native iOS builds. */
export function createWalkingMotionRuntime(
  environment: NativeIosRuntimeEnvironment = currentEnvironment(),
  createNative: () => MotionProvider = () =>
    new NativeMotionProvider(createExcerlockMotionModuleClient()),
): WalkingMotionRuntime {
  if (shouldUseNativeIosRuntime(environment)) {
    return { provider: createNative(), now: Date.now };
  }

  const provider = new FixtureMotionProvider(
    getMotionFixture("steady-walk"),
  );
  return { provider, now: () => provider.currentTimeMs };
}

function currentEnvironment(): NativeIosRuntimeEnvironment {
  return {
    nodeEnv: process.env.NODE_ENV,
    platform: Platform.OS,
    expoVersion: Constants.expoVersion,
  };
}
