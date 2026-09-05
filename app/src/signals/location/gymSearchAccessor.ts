import Constants from "expo-constants";
import { Platform } from "react-native";

import { FixtureGymSearchClient } from "./FixtureGymSearchClient";
import type { GymSearchClient } from "./GymSearchClient";
import { shouldUseNativeLocationProvider } from "./accessor";

let gymSearchClient: GymSearchClient | undefined;

/**
 * Fixtures are the default; only a runtime that already loads Expo Location
 * loads its geocoder, so Jest and Expo Go never reach `expo-location` here.
 */
export function getGymSearchClient(): GymSearchClient {
  gymSearchClient ??= createGymSearchClient();
  return gymSearchClient;
}

function createGymSearchClient(): GymSearchClient {
  if (
    shouldUseNativeLocationProvider({
      nodeEnv: process.env.NODE_ENV,
      platform: Platform.OS,
      expoVersion: Constants.expoVersion,
    })
  ) {
    const { createExpoGymSearchClient } = require(
      "./createExpoGymSearchClient"
    ) as typeof import("./createExpoGymSearchClient");
    return createExpoGymSearchClient();
  }
  return new FixtureGymSearchClient();
}
