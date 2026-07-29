jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { emptyJournal } from "@excerlock/ledger";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react-native";

import { LockController } from "../controller/lockController";
import { LockScreen } from "../screens/LockScreen";
import { DEFAULT_LOCK_STATE, useLockStore } from "../store/lockStore";
import { FakeScreenTime } from "../testing/fakeScreenTime";

const NOW = 10 * 86_400_000 + 9 * 3_600_000;

/**
 * `render` and `fireEvent.press` are both async in RNTL 14 and both must be
 * awaited: an un-awaited one leaves its `act` scope open and silently drops
 * every state update after it (`app/src/home/README.md`).
 */
async function press(name: string): Promise<void> {
  await fireEvent.press(screen.getByRole("button", { name }));
}

async function mount(screenTime: FakeScreenTime, openSettings?: () => void) {
  const controller = new LockController({
    screenTime,
    journal: () => emptyJournal(),
    now: () => NOW,
  });
  const utils = await render(
    <LockScreen controller={controller} openSettings={openSettings} />,
  );
  await waitFor(() => {
    expect(controller.getSnapshot().ready).toBe(true);
  });
  return { controller, ...utils };
}

async function authorizedScreen(screenTime = new FakeScreenTime()) {
  const mounted = await mount(screenTime);
  await press("Allow Screen Time");
  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Choose apps" })).toBeOnTheScreen();
  });
  return mounted;
}

describe("LockScreen", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useLockStore.setState(DEFAULT_LOCK_STATE);
  });

  describe("permission flow", () => {
    it("primes the undecided user with the Screen Time explanation", async () => {
      await mount(new FakeScreenTime());

      expect(
        screen.getByText("Screen Time keeps your choices honest"),
      ).toBeOnTheScreen();
      expect(
        screen.getByText(
          "You'll choose which apps ExcerLock can pause. iOS keeps the list private — ExcerLock never learns which apps you picked.",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByLabelText("Screen Time access: Not set up")).toBeOnTheScreen();
      expect(screen.queryByRole("button", { name: "Choose apps" })).toBeNull();
    });

    it("confirms the grant and opens the picker once approved", async () => {
      await authorizedScreen();

      expect(screen.getByLabelText("Screen Time access: On")).toBeOnTheScreen();
      expect(screen.getByText("Screen Time is on")).toBeOnTheScreen();
      expect(
        screen.queryByRole("button", { name: "Allow Screen Time" }),
      ).toBeNull();
    });

    it("offers a way back through Settings when the grant is refused", async () => {
      const screenTime = new FakeScreenTime();
      screenTime.nextDecision = "denied";
      const openSettings = jest.fn();
      await mount(screenTime, openSettings);

      await press("Allow Screen Time");

      expect(screen.getByText("Screen Time is off")).toBeOnTheScreen();
      expect(screen.getByLabelText("Screen Time access: Off")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "ExcerLock can't pause anything without it. Turn it back on in Settings › Screen Time, then come back here.",
        ),
      ).toBeOnTheScreen();

      await press("Open Settings");

      expect(openSettings).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("button", { name: "Choose apps" })).toBeNull();
    });
  });

  describe("app picker", () => {
    it("names the group from the boundary's summary, never from an identifier", async () => {
      const screenTime = new FakeScreenTime();
      screenTime.nextSelection = {
        handle: "ignored" as never,
        displayName: "6 apps · 1 category",
        applicationCount: 6,
        categoryCount: 1,
      };
      await authorizedScreen(screenTime);

      expect(screen.getByText("Nothing is locked yet")).toBeOnTheScreen();

      await press("Choose apps");

      expect(screen.getByText("6 apps · 1 category")).toBeOnTheScreen();
      expect(screen.getByRole("button", { name: "Change apps" })).toBeOnTheScreen();
      expect(screen.queryByText(/fake-selection/)).toBeNull();
      expect(screenTime.reconciled).toHaveLength(1);
    });

    it("keeps the empty state when the user backs out of the picker", async () => {
      const screenTime = new FakeScreenTime();
      screenTime.nextSelection = "cancel";
      await authorizedScreen(screenTime);

      await press("Choose apps");

      expect(screen.getByText("Nothing is locked yet")).toBeOnTheScreen();
      expect(screenTime.reconciled).toHaveLength(0);
    });
  });

  describe("current lock state", () => {
    it("explains a Full Lock shield and what opens it", async () => {
      const screenTime = new FakeScreenTime();
      await authorizedScreen(screenTime);

      await press("Choose apps");

      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();
      expect(
        screen.getByText("Full Lock is on — your day starts at zero."),
      ).toBeOnTheScreen();
      expect(screen.getByText("Your first earn today opens them.")).toBeOnTheScreen();
    });

    it("re-renders from the boundary's observable when a lock window opens", async () => {
      const screenTime = new FakeScreenTime();
      await authorizedScreen(screenTime);
      await press("Choose apps");
      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();

      // The OS pushing a window boundary is the one update no user gesture drives.
      await act(async () => {
        screenTime.enterLockWindow({
          id: "night",
          startsAtMs: NOW - 1,
          endsAtMs: NOW + 3_600_000,
        });
      });

      expect(screen.getByText("Apps are asleep.")).toBeOnTheScreen();
      expect(screen.getByText("A lock window is running.")).toBeOnTheScreen();
    });
  });

  describe("Full Lock", () => {
    it("confirms before letting go of Full Lock, and lifts the shields", async () => {
      const screenTime = new FakeScreenTime();
      await authorizedScreen(screenTime);
      await press("Choose apps");
      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();

      await press("Turn off Full Lock");

      expect(screen.getByText("Turn off Full Lock?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "Your daily allowance goes back to unlimited until you set one in Manage.",
        ),
      ).toBeOnTheScreen();
      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();

      await press("Yes, turn it off");

      expect(screen.getByText("Your apps are open.")).toBeOnTheScreen();
      expect(useLockStore.getState().baseAllowanceMinutes).toBeNull();
      expect(screen.queryByText("Turn off Full Lock?")).toBeNull();
    });

    it("leaves Full Lock alone when the confirmation is dismissed", async () => {
      const screenTime = new FakeScreenTime();
      await authorizedScreen(screenTime);
      await press("Choose apps");
      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();

      await press("Turn off Full Lock");
      await press("Keep it on");

      expect(screen.queryByText("Turn off Full Lock?")).toBeNull();
      expect(useLockStore.getState().baseAllowanceMinutes).toBe(0);
      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();
    });

    it("confirms before re-entering Full Lock, and reapplies the shields", async () => {
      const screenTime = new FakeScreenTime();
      await authorizedScreen(screenTime);
      await press("Choose apps");
      await press("Turn off Full Lock");
      await press("Yes, turn it off");
      expect(screen.getByText("Your apps are open.")).toBeOnTheScreen();

      await press("Turn on Full Lock");

      expect(screen.getByText("Turn on Full Lock?")).toBeOnTheScreen();
      expect(
        screen.getByText(
          "Your apps stay shielded from the day boundary until your first earn.",
        ),
      ).toBeOnTheScreen();

      await press("Yes, turn it on");

      expect(screen.getByText("Move first, scroll after.")).toBeOnTheScreen();
      expect(useLockStore.getState().baseAllowanceMinutes).toBe(0);
    });

    it("waits for a chosen app group before offering the switch", async () => {
      await authorizedScreen();

      expect(
        screen.queryByRole("button", { name: "Turn off Full Lock" }),
      ).toBeNull();
      expect(
        screen.getByText("Choose your apps to put Full Lock to work."),
      ).toBeOnTheScreen();
    });
  });
});
