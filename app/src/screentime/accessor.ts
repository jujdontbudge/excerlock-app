import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { MockScreenTimeModule } from "./MockScreenTimeModule";
import type { ScreenTimeModule } from "./ScreenTimeModule";
import { screenTimeAppClock } from "./appRuntime";

let screenTimeModule: ScreenTimeModule | undefined;

/**
 * The composition root for ScreenTime. Tests, Expo Go, and non-iOS previews
 * retain the persistent mock; every other iOS runtime owns the real seam.
 */
export function getScreenTimeModule(): ScreenTimeModule {
  screenTimeModule ??= createScreenTimeModule();
  return screenTimeModule;
}

/**
 * Scenario-owned override for the E2E runtime, mirroring the other fixture
 * installs. A scenario that keeps mock semantics installs a fresh mock here;
 * one that says `screenTimeModule: "native"` installs nothing and the seam
 * above resolves the real adapter.
 */
export function installScreenTimeModule(
  module: ScreenTimeModule,
): () => void {
  const previous = screenTimeModule;
  screenTimeModule = module;

  return () => {
    if (screenTimeModule === module) {
      screenTimeModule = previous;
    }
  };
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
  if (runtime.nodeEnv === "test" || runtime.platform !== "ios") {
    return false;
  }

  if (
    runtime.executionEnvironment === ExecutionEnvironment.Standalone &&
    runtime.expoGoConfig !== null
  ) {
    throw new Error("Refusing to start an iOS release with mock Screen Time");
  }

  return runtime.expoGoConfig === null;
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
