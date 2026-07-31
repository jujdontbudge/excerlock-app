import Constants from "expo-constants";
import { Platform } from "react-native";

import {
  createExcerlockMotionModuleClient,
  FixtureMotionProvider,
  getMotionFixture,
  NativeMotionProvider,
  type MotionProvider,
} from "@/signals";

import type { HomeRuntimeEnvironment } from "./runtimeSelection";

export type WalkingMotionRuntime = Readonly<{
  provider: MotionProvider;
  /** Same timestamp domain emitted by this provider's samples. */
  now: () => number;
}>;

/** Applies the existing dev-client-only native selection to Walk Sessions. */
export function createWalkingMotionRuntime(
  environment: HomeRuntimeEnvironment = currentEnvironment(),
  createNative: () => MotionProvider = () =>
    new NativeMotionProvider(createExcerlockMotionModuleClient()),
): WalkingMotionRuntime {
  if (shouldUseNativeWalkingMotion(environment)) {
    return { provider: createNative(), now: Date.now };
  }

  const provider = new FixtureMotionProvider(
    getMotionFixture("steady-walk"),
  );
  return { provider, now: () => provider.currentTimeMs };
}

function shouldUseNativeWalkingMotion(
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
