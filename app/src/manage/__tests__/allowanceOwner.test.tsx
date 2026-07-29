jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyJournal, UNLIMITED } from "@excerlock/ledger";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, deriveLockHero, useHomeStore } from "@/home";
import { FakeScreenTime, LockController } from "@/lock";

import { ManageScreen } from "../screens/ManageScreen";

const NOW = 10 * 86_400_000 + 9 * 3_600_000;

/**
 * `baseAllowanceMinutes` has exactly one owner (#53). This is the round trip
 * that proves it: the picker in Manage writes, and both readers — Home's hero
 * balance and the lock surface's shield decision — change together, because
 * there is only one number for them to read.
 *
 * With two writable copies every assertion below could pass on one side and
 * fail on the other, which is precisely the bug the ticket names.
 */
async function press(name: string): Promise<void> {
  await fireEvent.press(await screen.findByRole("button", { name }));
}

/** Home's hero, over whatever the owner currently holds. */
function homeHero() {
  const { journal, ledgerConfig } = useHomeStore.getState();
  return deriveLockHero({ journal, config: ledgerConfig, atMs: NOW, liveStates: [] });
}

/** The lock surface's controller, reading the same owner through its seam. */
async function lockOver(screenTime: FakeScreenTime): Promise<LockController> {
  const controller = new LockController({
    screenTime,
    journal: () => emptyJournal(),
    now: () => NOW,
  });
  await controller.start();
  await controller.requestAuthorization();
  await controller.pickApps();
  return controller;
}

describe("the one owner of the base allowance", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("carries an allowance set in Manage into Home's balance and the lock state", async () => {
    const screenTime = new FakeScreenTime();
    useHomeStore.getState().setBaseAllowanceMinutes(30);
    const controller = await lockOver(screenTime);
    await controller.setFullLock(true);
    controller.stop();

    // Full Lock is an explicit choice: zero balance, shields up, no free time.
    expect(homeHero().balanceMinutes).toBe(0);
    expect(homeHero().status).toBe("locked");
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    await render(<ManageScreen lockController={controller} />);
    await press("Increase daily allowance");
    await press("Yes, turn it off");

    // One write in Manage; both readers moved.
    expect(useHomeStore.getState().ledgerConfig.baseAllowanceMinutes).toBe(30);
    expect(homeHero().balanceMinutes).toBe(30);
    expect(homeHero().status).toBe("unlocked");
    expect(homeHero().balance).toEqual({ value: "30", unit: "min left" });

    await waitFor(() => {
      expect(controller.getSnapshot().fullLock).toBe(false);
      expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    });
    controller.stop();
  });

  it("gives a Manage-set allowance back after a Full Lock round trip", async () => {
    const screenTime = new FakeScreenTime();
    useHomeStore.getState().setBaseAllowanceMinutes(25);
    const controller = await lockOver(screenTime);
    controller.stop();

    await render(<ManageScreen lockController={controller} />);
    await press("Increase daily allowance");
    expect(homeHero().balanceMinutes).toBe(30);

    // Full Lock is that same number going to zero (PRD §3.2), not a mode.
    await act(async () => {
      await controller.setFullLock(true);
    });
    expect(useHomeStore.getState().ledgerConfig.baseAllowanceMinutes).toBe(0);
    expect(homeHero().balanceMinutes).toBe(0);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");
    await waitFor(() => {
      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent(
        "Full Lock",
      );
    });

    await act(async () => {
      await controller.setFullLock(false);
    });

    // The 30 minutes Manage chose come back — not the zero a stale second copy
    // would have restored, and not the unlimited an unset one would have.
    expect(useHomeStore.getState().ledgerConfig.baseAllowanceMinutes).toBe(30);
    expect(homeHero().balanceMinutes).toBe(30);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    await waitFor(() => {
      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent("30m");
    });
    controller.stop();
  });

  it("survives the JSON round trip that turns Unlimited into null", async () => {
    await render(<ManageScreen />);
    await act(async () => {
      useHomeStore.getState().setBaseAllowanceMinutes(UNLIMITED);
    });

    // `JSON.stringify(Infinity)` is `null` (packages/ledger/README.md), so the
    // rehydrate path has to read that back as UNLIMITED rather than as zero —
    // otherwise a relaunch silently locks a user who chose no limit at all.
    await act(async () => {
      await useHomeStore.persist.rehydrate();
    });

    expect(useHomeStore.getState().ledgerConfig.baseAllowanceMinutes).toBe(UNLIMITED);
    expect(homeHero().balance).toEqual({ value: "∞", unit: "no limit set" });
    await waitFor(() => {
      expect(screen.getByTestId("manage-allowance-value")).toHaveTextContent(
        "Unlimited",
      );
    });
  });
});
