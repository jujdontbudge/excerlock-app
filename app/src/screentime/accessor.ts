import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { MockScreenTimeModule } from "./MockScreenTimeModule";
import type { ScreenTimeModule } from "./ScreenTimeModule";
import { screenTimeAppClock } from "./appRuntime";

let screenTimeModule: ScreenTimeModule | undefined;

/**
 * The composition root for ScreenTime. Tests, Expo Go, and non-iOS previews
 * retain the persistent mock; the iOS development client owns the real seam.
 */
export function getScreenTimeModule(): ScreenTimeModule {
  screenTimeModule ??= createScreenTimeModule();
  return screenTimeModule;
}

type ScreenTimeRuntime = Readonly<{
  nodeEnv: string | undefined;
  platform: string;
  executionEnvironment: ExecutionEnvironment;
  expoGoConfig: unknown | null;
}>;

export function shouldUseNativeScreenTimeModule(
  runtime: ScreenTimeRuntime,
): boolean {
  return (
    runtime.nodeEnv !== "test" &&
    runtime.platform === "ios" &&
    runtime.executionEnvironment === ExecutionEnvironment.StoreClient &&
    runtime.expoGoConfig === null
  );
}

function createScreenTimeModule(): ScreenTimeModule {
  if (
    shouldUseNativeScreenTimeModule({
      nodeEnv: process.env.NODE_ENV,
      platform: Platform.OS,
      executionEnvironment: Constants.executionEnvironment,
      expoGoConfig: Constants.expoGoConfig,
    })
  ) {
    const { createNativeScreenTimeModule } = require(
      "./native/createNativeScreenTimeModule"
    ) as typeof import("./native/createNativeScreenTimeModule");
    return createNativeScreenTimeModule();
  }
  // The clock is not optional here: #77 made the mock share the E2E scenario
  // clock, which is what lets a flow drive the balance to zero and reach the
  // "Time's up" lock state. Dropping it silently breaks locked-apps-states.
  return new MockScreenTimeModule({ clock: screenTimeAppClock });
}
