jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { MockScreenTimeModule } from "../MockScreenTimeModule";
import {
  installScreenTimeAppRuntime,
  screenTimeAppClock,
} from "../appRuntime";
import { ManualScreenTimeClock } from "../clock";

describe("Screen Time app runtime", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("lets an existing adapter follow a replaced composition-root clock", async () => {
    const firstClock = new ManualScreenTimeClock(0);
    const uninstallFirst = installScreenTimeAppRuntime({ clock: firstClock });
    const screenTime = new MockScreenTimeModule({ clock: screenTimeAppClock });
    await screenTime.requestAuthorization();
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [],
    });

    const scenarioClock = new ManualScreenTimeClock(1_500);
    const uninstallScenario = installScreenTimeAppRuntime({
      clock: scenarioClock,
    });
    await screenTime.scheduleLockWindow(selection, {
      id: "scenario-window",
      startsAtMs: 1_000,
      endsAtMs: 2_000,
    });

    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      effectiveShields: "up",
      activeLockWindowId: "scenario-window",
    });

    uninstallScenario();
    uninstallFirst();
  });
});
