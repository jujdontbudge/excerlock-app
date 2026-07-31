jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const mockWalkingListeners = new Set<() => void>();
const mockWalkingSession = {
  snapshot: {
    active: false,
    conditionId: null,
    walking: false,
  } as { active: boolean; conditionId: string | null; walking: boolean },
  getSnapshot() {
    return this.snapshot;
  },
  subscribe(listener: () => void) {
    mockWalkingListeners.add(listener);
    return () => mockWalkingListeners.delete(listener);
  },
};

jest.mock("@/home/signals/walkingSessionController", () => ({
  getWalkingSessionController: () => mockWalkingSession,
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  appendEntries,
  emptyJournal,
  type Journal,
} from "@excerlock/ledger";
import { waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";

import { weekdayForWallClock } from "../../model/recurringLockWindow";
import { LockScheduleStore } from "../../store/lockScheduleStore";
import { FakeScreenTime } from "../../testing/fakeScreenTime";
import { installLockAppRuntime } from "../appRuntime";
import { LockController } from "../lockController";

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

function spentToday(minutes: number): Journal {
  return appendEntries(emptyJournal(), [
    {
      kind: "drainTick",
      source: "test",
      id: "drain-1",
      atMs: NOW - 60_000,
      minutes,
    },
  ]).journal;
}

function controllerOver(
  screenTime: FakeScreenTime,
  journal: Journal = emptyJournal(),
  options: {
    scheduleStore?: LockScheduleStore;
    walking?: () => boolean;
    subscribeWalking?: (listener: () => void) => () => void;
    now?: () => number;
  } = {},
): LockController {
  return new LockController({
    screenTime,
    journal: () => journal,
    now: options.now ?? (() => NOW),
    ...options,
  });
}

function activeDefinition(
  id = "current",
  overrides: Partial<{
    startMinute: number;
    endMinute: number;
  }> = {},
) {
  return {
    id,
    days: [weekdayForWallClock(NOW)] as const,
    startMinute: 8 * 60,
    endMinute: 10 * 60,
    ...overrides,
  };
}

describe("LockController", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // The allowance has one owner (#53); the controller reads Home's copy of it
    // through `controller/ledgerSource.ts` and keeps none of its own.
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useHomeStore.getState().setBaseAllowanceMinutes(0);
    mockWalkingSession.snapshot = {
      active: false,
      conditionId: null,
      walking: false,
    };
    mockWalkingListeners.clear();
  });

  it("reports the boundary's authorization state once started", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);

    expect(controller.getSnapshot().ready).toBe(false);
    await controller.start();

    expect(controller.getSnapshot()).toMatchObject({
      ready: true,
      authorization: "notDetermined",
      selection: null,
      fullLock: true,
    });
    controller.stop();
  });

  it("records when effective shields become active for review-prompt suppression", async () => {
    const screenTime = new FakeScreenTime();
    const onShieldShown = jest.fn();
    const controller = new LockController({
      screenTime,
      journal: () => emptyJournal(),
      now: () => NOW,
      scheduleStore: new LockScheduleStore(),
      onShieldShown,
    });
    await controller.start();
    await controller.requestAuthorization();

    await controller.pickApps();

    expect(onShieldShown).toHaveBeenCalledWith(NOW);
    controller.stop();
  });

  it("carries a denied decision back to callers and to subscribers", async () => {
    const screenTime = new FakeScreenTime();
    screenTime.nextDecision = "denied";
    const controller = controllerOver(screenTime);
    await controller.start();
    let notifications = 0;
    controller.subscribe(() => {
      notifications += 1;
    });

    await expect(controller.requestAuthorization()).resolves.toBe("denied");

    expect(controller.getSnapshot().authorization).toBe("denied");
    expect(notifications).toBeGreaterThan(0);
    controller.stop();
  });

  it("round-trips a picked selection through the boundary and reconciles it", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();

    await controller.pickApps();

    expect(controller.getSnapshot().selection).toMatchObject({
      displayName: "4 apps · 2 categories",
      applicationCount: 4,
    });
    expect(screenTime.reconciled).toEqual([
      {
        selection: controller.getSnapshot().shield?.selection,
        desiredOsState: { shields: "up", drainThresholds: [] },
      },
    ]);
    controller.stop();
  });

  it("uses the composition-root clock for the owned ledger by default", async () => {
    const screenTime = new FakeScreenTime();
    useHomeStore.setState({
      journal: spentToday(5),
      ledgerConfig: {
        ...DEFAULT_HOME_STATE.ledgerConfig,
        baseAllowanceMinutes: 5,
      },
    });
    const uninstallRuntime = installLockAppRuntime({ now: () => NOW });
    const controller = new LockController({
      screenTime,
      scheduleStore: new LockScheduleStore(),
    });

    try {
      await controller.start();
      await controller.requestAuthorization();
      await controller.pickApps();

      expect(controller.getSnapshot().precedence.cause).toBe("emptyBalance");
      expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");
    } finally {
      controller.stop();
      uninstallRuntime();
    }
  });

  it("leaves everything alone when the picker is cancelled", async () => {
    const screenTime = new FakeScreenTime();
    screenTime.nextSelection = "cancel";
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();

    await expect(controller.pickApps()).resolves.toBeNull();

    expect(controller.getSnapshot().selection).toBeNull();
    expect(screenTime.reconciled).toEqual([]);
    controller.stop();
  });

  it("will not open the picker without authorization", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);
    await controller.start();

    await expect(controller.pickApps()).resolves.toBeNull();
    expect(screenTime.reconciled).toEqual([]);
    controller.stop();
  });

  it("lifts and reapplies shields as Full Lock is turned off and on", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();

    await controller.setFullLock(false);

    expect(controller.getSnapshot().fullLock).toBe(false);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");

    await controller.setFullLock(true);

    expect(controller.getSnapshot().fullLock).toBe(true);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");
    controller.stop();
  });

  // The case two writable copies would have broken: with a non-zero allowance,
  // entering and exiting Full Lock have something to lose and something to put
  // back, and every shield decision has to follow the same number.
  it("zeroes a non-zero allowance on entering Full Lock, and restores it on exit", async () => {
    const screenTime = new FakeScreenTime();
    useHomeStore.getState().setBaseAllowanceMinutes(60);
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();

    expect(controller.getSnapshot().fullLock).toBe(false);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");

    await controller.setFullLock(true);

    expect(useHomeStore.getState().ledgerConfig.baseAllowanceMinutes).toBe(0);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    await controller.setFullLock(false);

    expect(useHomeStore.getState().ledgerConfig.baseAllowanceMinutes).toBe(60);
    expect(controller.getSnapshot().fullLock).toBe(false);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    controller.stop();
  });

  it("spends the allowance the owner holds, whoever set it", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    // Manage's picker writes to the same place Full Lock does.
    useHomeStore.getState().setBaseAllowanceMinutes(30);
    await controller.pickApps();

    expect(controller.getSnapshot().fullLock).toBe(false);
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    controller.stop();
  });

  it("keeps ledger reconciliation active until every lifecycle owner stops", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);

    // Manage and the pushed lock route can overlap under the tab navigator.
    await controller.start();
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    // Popping the lock route releases one owner; Manage still owns the other.
    controller.stop();
    useHomeStore.getState().setBaseAllowanceMinutes(30);

    await waitFor(() => {
      expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    });
    controller.stop();
  });

  it("keeps shields down under Full Lock once the day has an earn", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime, earnedToday(30));
    await controller.start();
    await controller.requestAuthorization();

    await controller.pickApps();

    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    controller.stop();
  });

  it("reconciles when an earn changes Home's owned journal", async () => {
    const screenTime = new FakeScreenTime();
    const controller = new LockController({
      screenTime,
      now: () => NOW,
      scheduleStore: new LockScheduleStore(),
    });
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    useHomeStore.setState({ journal: earnedToday(30) });

    await waitFor(() => {
      expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    });
    expect(controller.getSnapshot().precedence.cause).toBe("earnedBalance");
    controller.stop();
  });

  it("keeps apps open when an earned balance meets an active lock window", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime, earnedToday(30));
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    const seen: string[] = [];
    controller.subscribe(() => {
      seen.push(controller.getSnapshot().shield!.effectiveShields);
    });

    screenTime.enterLockWindow({
      id: "night",
      startsAtMs: NOW + 1,
      endsAtMs: NOW + 2,
    });

    expect(seen).toEqual(["down"]);
    expect(controller.getSnapshot().shield?.activeLockWindowId).toBe("night");
    controller.stop();
  });

  it("stops following the boundary once stopped", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    controller.stop();
    const before = controller.getSnapshot();

    screenTime.enterLockWindow({
      id: "night",
      startsAtMs: NOW + 1,
      endsAtMs: NOW + 2,
    });

    expect(controller.getSnapshot()).toBe(before);
  });

  it("materializes persisted recurrence for the chosen group, then resyncs edits and deletion", async () => {
    const screenTime = new FakeScreenTime();
    const scheduleStore = new LockScheduleStore();
    const controller = controllerOver(screenTime, emptyJournal(), {
      scheduleStore,
    });
    await controller.start();

    await expect(
      controller.saveRecurringLockWindow(activeDefinition()),
    ).resolves.toMatchObject({ ok: true });
    expect(await screenTime.getLockWindows()).toEqual([]);

    await controller.requestAuthorization();
    await controller.pickApps();

    const first = await screenTime.getLockWindows();
    expect(first.length).toBeGreaterThan(0);
    expect(
      first.every(
        ({ startsAtMs, endsAtMs }) =>
          endsAtMs - startsAtMs === 2 * 60 * 60_000,
      ),
    ).toBe(true);

    await controller.saveRecurringLockWindow({
      ...activeDefinition(),
      endMinute: 11 * 60,
    });

    const edited = await screenTime.getLockWindows();
    expect(edited.length).toBeGreaterThan(0);
    expect(
      edited.every(
        ({ startsAtMs, endsAtMs }) =>
          endsAtMs - startsAtMs === 3 * 60 * 60_000,
      ),
    ).toBe(true);

    await expect(controller.deleteRecurringLockWindow("current")).resolves.toBe(
      true,
    );
    expect(await screenTime.getLockWindows()).toEqual([]);
    controller.stop();
  });

  it("enters Full Lock while a lock window is active", async () => {
    useHomeStore.getState().setBaseAllowanceMinutes(60);
    const screenTime = new FakeScreenTime();
    const scheduleStore = new LockScheduleStore();
    await scheduleStore.load();
    await scheduleStore.save(activeDefinition());
    const controller = controllerOver(screenTime, emptyJournal(), {
      scheduleStore,
    });
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    screenTime.enterLockWindow((await screenTime.getLockWindows())[0]!);

    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");

    await controller.setFullLock(true);

    expect(controller.getSnapshot().precedence.cause).toBe("fullLock");
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");
    controller.stop();
  });

  it("raises shields when a window starts during Full Lock", async () => {
    let currentTime = NOW;
    const screenTime = new FakeScreenTime();
    const scheduleStore = new LockScheduleStore();
    await scheduleStore.load();
    await scheduleStore.save(
      activeDefinition("current", {
        startMinute: 10 * 60,
        endMinute: 11 * 60,
      }),
    );
    const controller = controllerOver(screenTime, emptyJournal(), {
      scheduleStore,
      now: () => currentTime,
    });
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    const concrete = (await screenTime.getLockWindows())[0]!;

    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");

    currentTime = NOW + 60 * 60_000;
    screenTime.enterLockWindow(concrete);
    await controller.whenReconciled();

    expect(controller.getSnapshot().precedence.cause).toBe("fullLock");
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");
    controller.stop();
  });

  it("opens without draining when a window ends at zero balance", async () => {
    let currentTime = NOW;
    useHomeStore.getState().setBaseAllowanceMinutes(30);
    const screenTime = new FakeScreenTime();
    const scheduleStore = new LockScheduleStore();
    await scheduleStore.load();
    await scheduleStore.save(activeDefinition());
    const controller = controllerOver(screenTime, spentToday(30), {
      scheduleStore,
      now: () => currentTime,
    });
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    screenTime.enterLockWindow((await screenTime.getLockWindows())[0]!);
    await controller.whenReconciled();
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    currentTime = NOW + 60 * 60_000;
    screenTime.exitLockWindow();
    await controller.whenReconciled();

    expect(controller.getSnapshot().precedence).toMatchObject({
      shields: "down",
      drainsBalance: false,
      cause: "outsideWindow",
    });
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    controller.stop();
  });

  it("keeps an active window open when verified walking beats Full Lock", async () => {
    const screenTime = new FakeScreenTime();
    const scheduleStore = new LockScheduleStore();
    await scheduleStore.load();
    await scheduleStore.save(activeDefinition());
    const controller = controllerOver(screenTime, emptyJournal(), {
      scheduleStore,
      walking: () => true,
    });
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();
    screenTime.enterLockWindow((await screenTime.getLockWindows())[0]!);
    await controller.whenReconciled();

    expect(controller.getSnapshot().precedence).toMatchObject({
      shields: "down",
      drainsBalance: false,
      cause: "walking",
    });
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    controller.stop();
  });

  it("reconciles Full Lock when a verified walking session changes live", async () => {
    let walking = false;
    let publishWalking = () => {};
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime, emptyJournal(), {
      walking: () => walking,
      subscribeWalking: (listener) => {
        publishWalking = listener;
        return () => {
          publishWalking = () => {};
        };
      },
    });
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();

    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    walking = true;
    publishWalking();
    await controller.whenReconciled();

    expect(controller.getSnapshot().precedence).toMatchObject({
      shields: "down",
      cause: "walking",
    });
    expect(controller.getSnapshot().shield?.effectiveShields).toBe("down");
    controller.stop();
  });

  it("uses the production walking session by default", async () => {
    const screenTime = new FakeScreenTime();
    const controller = controllerOver(screenTime);
    await controller.start();
    await controller.requestAuthorization();
    await controller.pickApps();

    expect(controller.getSnapshot().shield?.effectiveShields).toBe("up");

    mockWalkingSession.snapshot = {
      active: true,
      conditionId: "walking-condition",
      walking: true,
    };
    mockWalkingListeners.forEach((listener) => listener());
    await controller.whenReconciled();

    expect(controller.getSnapshot().precedence).toMatchObject({
      shields: "down",
      cause: "walking",
    });
    controller.stop();
  });
});
