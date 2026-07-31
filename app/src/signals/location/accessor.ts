import Constants from "expo-constants";
import { Platform } from "react-native";

import { FixtureLocationProvider } from "./FixtureLocationProvider";
import type { AppLocationProvider } from "./ManualGymCheckIn";
import { getLocationFixture } from "./fixtures";

type LocationRuntime = Readonly<{
  nodeEnv: string | undefined;
  platform: string;
  executionEnvironment: string | null | undefined;
  expoGoConfig: unknown | null;
}>;

let locationProvider: AppLocationProvider | undefined;

/** Fixtures are the default; only an iOS development client loads Expo Location. */
export function getLocationProvider(): AppLocationProvider {
  locationProvider ??= createLocationProvider();
  return locationProvider;
}

export function shouldUseNativeLocationProvider(
  runtime: LocationRuntime,
): boolean {
  return (
    runtime.nodeEnv !== "test" &&
    runtime.platform === "ios" &&
    runtime.executionEnvironment === "storeClient" &&
    runtime.expoGoConfig === null
  );
}

function createLocationProvider(): AppLocationProvider {
  if (
    shouldUseNativeLocationProvider({
      nodeEnv: process.env.NODE_ENV,
      platform: Platform.OS,
      executionEnvironment: Constants.executionEnvironment,
      expoGoConfig: Constants.expoGoConfig,
    })
  ) {
    const { createNativeLocationProvider } = require(
      "./createNativeLocationProvider"
    ) as typeof import("./createNativeLocationProvider");
    return createNativeLocationProvider();
  }
  return new FixtureLocationProvider(getLocationFixture("quiet"));
}
