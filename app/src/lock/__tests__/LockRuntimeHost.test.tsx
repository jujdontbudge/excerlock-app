jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockWalkingSession = {
  getSnapshot: () => ({ active: false, conditionId: null, walking: false }),
  subscribe: () => () => {},
};

jest.mock("@/home/signals", () => ({
  getWalkingSessionController: () => mockWalkingSession,
}));

jest.mock("@/shield/shieldContentRuntime", () => ({
  getShieldContentCoordinator: () => ({ publish: async () => undefined }),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { appendEntries, emptyJournal, type Journal } from "@excerlock/ledger";
import { render, waitFor } from "@testing-library/react-native";
import { AppState } from "react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";

import { LockController } from "../controller/lockController";
import { LockRuntimeHost } from "../LockRuntimeHost";
import { LockScheduleStore } from "../store/lockScheduleStore";
import { FakeScreenTime } from "../testing/fakeScreenTime";

const NOW = 10 * 86_400_000 + 9 * 3_600_000;

function earnedToday(minutes: number): Journal {
  return appendEntries(emptyJournal(), [
    {
      kind: "earn",
      source: "test",
      id: "earn-1",
      atMs: NOW - 60_000,
      conditionId: "walk",
      payout: { type: "fixedChunk", minutes },
    },
  ]).journal;
}

describe("LockRuntimeHost (device-smoke Finding 3)", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useHomeStore.getState().setBaseAllowanceMinutes(0);
  });

  it("reconciles an earn into the shield boundary with no lock screen mounted", async () => {
    const screenTime = new FakeScreenTime();
    const controller = new LockController({
      screenTime,
      now: () => NOW,
      scheduleStore: new LockScheduleStore(),
      ledgerReady: () => Promise.resolve(),
    });
    const view = await render(<LockRuntimeHost controller={controller} />);
    await waitFor(() => expect(controller.getSnapshot().ready).toBe(true));
    await controller.requestAuthorization();
    await controller.pickApps();
    expect(screenTime.reconciled.at(-1)?.desiredOsState.shields).toBe("up");

    // The earn lands in Home's journal while only Home is on screen.
    useHomeStore.setState({ journal: earnedToday(30) });
    await controller.whenReconciled();

    expect(screenTime.reconciled.at(-1)?.desiredOsState.shields).toBe("down");

    await view.unmount();
  });

  it("ingests native drains and reconciles when the app returns to the foreground", async () => {
    const appStateListeners = new Set<(state: string) => void>();
    const addListener = jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_type, listener) => {
        appStateListeners.add(listener as (state: string) => void);
        return {
          remove: () => appStateListeners.delete(listener as (state: string) => void),
        } as ReturnType<typeof AppState.addEventListener>;
      });
    try {
      const screenTime = new FakeScreenTime();
      const controller = new LockController({
        screenTime,
        journal: () => useHomeStore.getState().journal,
        now: () => NOW,
        scheduleStore: new LockScheduleStore(),
        ledgerReady: () => Promise.resolve(),
      });
      const view = await render(<LockRuntimeHost controller={controller} />);
      await waitFor(() => expect(controller.getSnapshot().ready).toBe(true));
      await controller.requestAuthorization();
      await controller.pickApps();

      // While backgrounded, the OS drained a rung the JS ledger cannot see yet.
      screenTime.firedDrainRungs = [
        { id: "balance-rung-0@1", atMs: NOW - 60_000 },
      ];
      appStateListeners.forEach((listener) => listener("active"));
      await controller.whenReconciled();

      expect(
        useHomeStore
          .getState()
          .journal.entries.filter(({ kind }) => kind === "drainTick"),
      ).toHaveLength(1);

      await view.unmount();
      expect(appStateListeners.size).toBe(0);
    } finally {
      addListener.mockRestore();
    }
  });

  it("renders nothing", async () => {
    const screenTime = new FakeScreenTime();
    const controller = new LockController({
      screenTime,
      now: () => NOW,
      scheduleStore: new LockScheduleStore(),
      ledgerReady: () => Promise.resolve(),
    });
    const view = await render(<LockRuntimeHost controller={controller} />);

    expect(view.toJSON()).toBeNull();
    await view.unmount();
  });
});
