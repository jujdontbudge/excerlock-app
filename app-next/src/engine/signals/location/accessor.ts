import Constants from "expo-constants";
import { Platform } from "react-native";

import { FixtureLocationProvider } from "./FixtureLocationProvider";
import type { AppLocationProvider } from "./ManualGymCheckIn";
import { getLocationFixture } from "./fixtures";

import {
  shouldUseNativeIosRuntime,
  type NativeIosRuntimeEnvironment,
} from "../../nativeIosRuntime";

type LocationRuntime = NativeIosRuntimeEnvironment;

let locationProvider: AppLocationProvider | undefined;

/** Fixtures are the default; only an iOS development client loads Expo Location. */
export function getLocationProvider(): AppLocationProvider {
  locationProvider ??= createLocationProvider();
  return locationProvider;
}

/** Same discriminator as the other native runtimes (#130): `expoGoConfig` is non-null in bare Release builds. */
export function shouldUseNativeLocationProvider(
  runtime: LocationRuntime,
): boolean {
  return shouldUseNativeIosRuntime(runtime);
}

function createLocationProvider(): AppLocationProvider {
  if (
    shouldUseNativeLocationProvider({
      nodeEnv: process.env.NODE_ENV,
      platform: Platform.OS,
      expoVersion: Constants.expoVersion,
    })
  ) {
    const { createNativeLocationProvider } = require(
      "./createNativeLocationProvider"
    ) as typeof import("./createNativeLocationProvider");
    return createNativeLocationProvider();
  }
  return new FixtureLocationProvider(getLocationFixture("quiet"));
}
