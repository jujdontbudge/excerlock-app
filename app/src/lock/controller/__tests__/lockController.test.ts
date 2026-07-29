jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import { appendEntries, emptyJournal, type Journal } from "@excerlock/ledger";
import { waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";

import { FakeScreenTime } from "../../testing/fakeScreenTime";
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

function controllerOver(
  screenTime: FakeScreenTime,
  journal: Journal = emptyJournal(),
): LockController {
  return new LockController({
    screenTime,
    journal: () => journal,
    now: () => NOW,
  });
}

describe("LockController", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    // The allowance has one owner (#53); the controller reads Home's copy of it
    // through `controller/ledgerSource.ts` and keeps none of its own.
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useHomeStore.getState().setBaseAllowanceMinutes(0);
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

  it("keeps allowance reconciliation active until every lifecycle owner stops", async () => {
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

  it("follows the boundary's observable when a lock window opens", async () => {
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

    expect(seen).toEqual(["up"]);
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
});
