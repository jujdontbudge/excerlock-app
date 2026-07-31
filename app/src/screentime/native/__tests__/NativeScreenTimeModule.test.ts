jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ScreenTimeModule } from "../../ScreenTimeModule";
import type { DeviceActivityApi } from "../deviceActivityTypes";
import { NativeScreenTimeModule } from "../NativeScreenTimeModule";
import type { NativeSelectionPicker } from "../NativeSelectionPicker";
import { NATIVE_SCREENTIME_STORAGE_KEY } from "../nativeStore";

type ControlledDeviceActivityApi = DeviceActivityApi & {
  getFamilyActivitySelectionId(id: string): string | undefined;
  setShieldActive(active: boolean): void;
};

function createDeviceActivityApi(
  initialAuthorizationStatus = 0,
): ControlledDeviceActivityApi {
  let authorizationStatus: ReturnType<DeviceActivityApi["authorizationStatus"]> =
    initialAuthorizationStatus as ReturnType<
      DeviceActivityApi["authorizationStatus"]
    >;
  let shieldActive = false;

  return {
    authorizationStatus: () => authorizationStatus,
    requestAuthorization: jest.fn(async () => {
      authorizationStatus = 2;
    }),
    blockSelection: jest.fn(() => {
      shieldActive = true;
    }),
    unblockSelection: jest.fn(() => {
      shieldActive = false;
    }),
    configureActions: jest.fn(),
    startMonitoring: jest.fn(async () => undefined),
    stopMonitoring: jest.fn(),
    isShieldActive: jest.fn(() => shieldActive),
    onDeviceActivityMonitorEvent: jest.fn(() => ({ remove: jest.fn() })),
    getFamilyActivitySelectionId: jest.fn(
      () => "opaque-apple-selection-token",
    ),
    setShieldActive(active) {
      shieldActive = active;
    },
  };
}

function createPicker(
  result: Awaited<ReturnType<NativeSelectionPicker["pick"]>>,
): NativeSelectionPicker {
  return { pick: jest.fn(async () => result) };
}

describe("NativeScreenTimeModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("maps FamilyControls authorization through the existing interface", async () => {
    const deviceActivity = createDeviceActivityApi();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
    });

    await expect(screenTime.getAuthorizationStatus()).resolves.toBe(
      "notDetermined",
    );
    await expect(screenTime.requestAuthorization()).resolves.toBe("approved");
    expect(deviceActivity.requestAuthorization).toHaveBeenCalledWith(
      "individual",
    );
  });

  it("returns only an opaque persisted picker handle and a count summary", async () => {
    const picker = createPicker({ applicationCount: 4, categoryCount: 2 });
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity: createDeviceActivityApi(2),
      picker,
    });

    const selection = await screenTime.pickSelection();

    expect(selection).toBe("excerlock.selection.locked.v1");
    expect(picker.pick).toHaveBeenCalledWith(selection);
    await expect(screenTime.describeSelection(selection!)).resolves.toEqual({
      handle: selection,
      displayName: "4 apps · 2 categories",
      applicationCount: 4,
      categoryCount: 2,
    });
  });

  it("keeps the existing selection unchanged when the system picker cancels", async () => {
    const selected = createPicker({ applicationCount: 1, categoryCount: 0 });
    const screenTime = new NativeScreenTimeModule({
      deviceActivity: createDeviceActivityApi(2),
      picker: selected,
    });
    const selection = (await screenTime.pickSelection())!;

    selected.pick = jest.fn(async () => null);

    await expect(screenTime.pickSelection()).resolves.toBeNull();
    await expect(screenTime.describeSelection(selection)).resolves.toMatchObject({
      displayName: "1 app",
    });
  });

  it("applies and clears ManagedSettings shields for the opaque selection", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 2, categoryCount: 1 }),
    });
    const selection = (await screenTime.pickSelection())!;

    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [],
    });
    expect(deviceActivity.blockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      effectiveShields: "up",
    });

    await screenTime.reconcile(selection, {
      shields: "down",
      drainThresholds: [],
    });
    expect(deviceActivity.unblockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      effectiveShields: "down",
    });
  });

  it("renews every fail-safe unlock for exactly 15 future minutes", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    let nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    const unlocked = { shields: "down" as const, drainThresholds: [] };

    await screenTime.reconcile(selection, unlocked);

    expect(deviceActivity.configureActions).toHaveBeenLastCalledWith({
      activityName: "excerlock.unlock-lease.v1",
      callbackName: "intervalDidEnd",
      actions: [
        {
          type: "blockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    expect(deviceActivity.startMonitoring).toHaveBeenLastCalledWith(
      "excerlock.unlock-lease.v1",
      {
        intervalStart: {
          year: 2026,
          month: 7,
          day: 31,
          hour: 12,
          minute: 0,
          second: 0,
        },
        intervalEnd: {
          year: 2026,
          month: 7,
          day: 31,
          hour: 12,
          minute: 15,
          second: 0,
        },
        repeats: false,
      },
      [],
    );

    nowMs += 5 * 60_000;
    await screenTime.reconcile(selection, unlocked);

    expect(deviceActivity.stopMonitoring).toHaveBeenLastCalledWith([
      "excerlock.unlock-lease.v1",
    ]);
    expect(deviceActivity.startMonitoring).toHaveBeenLastCalledWith(
      "excerlock.unlock-lease.v1",
      expect.objectContaining({
        intervalStart: expect.objectContaining({ minute: 5 }),
        intervalEnd: expect.objectContaining({ minute: 20 }),
      }),
      [],
    );
  });

  it("re-arms the OS usage ladder and blocks when its final rung fires", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;

    await screenTime.reconcile(selection, {
      shields: "down",
      drainThresholds: [15, 30.5],
    });

    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: "excerlock.balance-drain.v1",
      callbackName: "eventDidReachThreshold",
      eventName: "excerlock.balance-rung.1",
      actions: [
        {
          type: "blockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    expect(deviceActivity.startMonitoring).toHaveBeenLastCalledWith(
      "excerlock.balance-drain.v1",
      {
        intervalStart: {
          year: 2026,
          month: 7,
          day: 31,
          hour: 0,
          minute: 0,
          second: 0,
        },
        intervalEnd: {
          year: 2026,
          month: 8,
          day: 1,
          hour: 0,
          minute: 0,
          second: 0,
        },
        repeats: false,
      },
      [
        {
          familyActivitySelection: "opaque-apple-selection-token",
          threshold: { minute: 15, second: 0 },
          eventName: "excerlock.balance-rung.0",
          includesPastActivity: true,
        },
        {
          familyActivitySelection: "opaque-apple-selection-token",
          threshold: { minute: 30, second: 30 },
          eventName: "excerlock.balance-rung.1",
          includesPastActivity: true,
        },
      ],
    );
    expect(deviceActivity.startMonitoring).not.toHaveBeenCalledWith(
      "excerlock.unlock-lease.v1",
      expect.anything(),
      expect.anything(),
    );
  });

  it("fails closed when the persisted picker token is unavailable", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    deviceActivity.getFamilyActivitySelectionId = jest.fn(() => undefined);
    const screenTime = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
    });
    const selection = (await screenTime.pickSelection())!;

    await expect(
      screenTime.reconcile(selection, {
        shields: "down",
        drainThresholds: [1],
      }),
    ).rejects.toThrow("persisted FamilyActivity selection is unavailable");
    expect(deviceActivity.blockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
    expect(deviceActivity.startMonitoring).not.toHaveBeenCalledWith(
      "excerlock.balance-drain.v1",
      expect.anything(),
      expect.anything(),
    );
  });

  it("does not arm an unlock lease outside every scheduled lock window", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, {
      shields: "down",
      drainThresholds: [],
    });
    jest.clearAllMocks();

    await screenTime.scheduleLockWindow(selection, {
      id: "later",
      startsAtMs: nowMs + 60 * 60_000,
      endsAtMs: nowMs + 2 * 60 * 60_000,
    });

    expect(deviceActivity.startMonitoring).not.toHaveBeenCalledWith(
      "excerlock.unlock-lease.v1",
      expect.anything(),
      expect.anything(),
    );
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      effectiveShields: "down",
      activeLockWindowId: null,
    });
  });

  it("registers concrete lock windows with OS-side start and end actions", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [],
    });
    const window = {
      id: "afternoon",
      startsAtMs: new Date(2026, 6, 31, 13, 0, 0).getTime(),
      endsAtMs: new Date(2026, 6, 31, 14, 0, 0).getTime(),
    };

    await screenTime.scheduleLockWindow(selection, window);

    const startAction = (deviceActivity.configureActions as jest.Mock).mock.calls
      .map(([input]) => input)
      .find(
        (input) =>
          input.callbackName === "intervalDidStart" &&
          input.activityName.startsWith("excerlock.lock-window."),
      );
    const monitorName = startAction.activityName as string;
    expect(monitorName).not.toContain(window.id);
    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: monitorName,
      callbackName: "intervalDidStart",
      actions: [
        {
          type: "blockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: monitorName,
      callbackName: "intervalDidEnd",
      actions: [
        {
          type: "unblockSelection",
          familyActivitySelectionId: selection,
        },
      ],
    });
    expect(deviceActivity.startMonitoring).toHaveBeenLastCalledWith(
      monitorName,
      {
        intervalStart: {
          year: 2026,
          month: 7,
          day: 31,
          hour: 13,
          minute: 0,
          second: 0,
        },
        intervalEnd: {
          year: 2026,
          month: 7,
          day: 31,
          hour: 14,
          minute: 0,
          second: 0,
        },
        repeats: false,
      },
      [],
    );
    await expect(screenTime.getLockWindows()).resolves.toEqual([window]);
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      effectiveShields: "down",
      activeLockWindowId: null,
    });

    await screenTime.cancelLockWindow(window.id);

    expect(deviceActivity.stopMonitoring).toHaveBeenCalledWith([
      monitorName,
    ]);
    await expect(screenTime.getLockWindows()).resolves.toEqual([]);
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      effectiveShields: "up",
    });
  });

  it("restores opaque selection metadata, desired state, and windows after relaunch", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const first = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 3, categoryCount: 1 }),
      nowMs: () => nowMs,
    });
    const selection = (await first.pickSelection())!;
    await first.reconcile(selection, {
      shields: "up",
      drainThresholds: [15, 30],
    });
    await first.scheduleLockWindow(selection, {
      id: "later",
      startsAtMs: nowMs + 60 * 60_000,
      endsAtMs: nowMs + 2 * 60 * 60_000,
    });

    const restored: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      nowMs: () => nowMs,
    });

    await expect(restored.describeSelection(selection)).resolves.toMatchObject({
      displayName: "3 apps · 1 category",
    });
    await expect(restored.getLockWindows()).resolves.toEqual([
      {
        id: "later",
        startsAtMs: nowMs + 60 * 60_000,
        endsAtMs: nowMs + 2 * 60 * 60_000,
      },
    ]);
    await expect(restored.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      desiredOsState: { shields: "up", drainThresholds: [15, 30] },
      effectiveShields: "down",
      activeLockWindowId: null,
    });
  });

  it("rejects persisted strings that are not the adapter-owned opaque handle", async () => {
    const leakedIdentifier = "com.private.locked-app";
    await AsyncStorage.setItem(
      NATIVE_SCREENTIME_STORAGE_KEY,
      JSON.stringify({
        selection: leakedIdentifier,
        desiredOsState: { shields: "up", drainThresholds: [] },
        lockWindows: [
          {
            id: "private",
            startsAtMs: 1,
            endsAtMs: 2,
            selection: leakedIdentifier,
          },
        ],
        selectionContents: {
          [leakedIdentifier]: { applicationCount: 1, categoryCount: 0 },
        },
      }),
    );
    const screenTime = new NativeScreenTimeModule({
      deviceActivity: createDeviceActivityApi(2),
    });

    await expect(
      screenTime.describeSelection(
        leakedIdentifier as Parameters<
          ScreenTimeModule["describeSelection"]
        >[0],
      ),
    ).resolves.toBeNull();
    await expect(screenTime.getLockWindows()).resolves.toEqual([]);
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection: null,
    });
  });

  it("observes the OS-side re-shield when a lease lapses", async () => {
    let monitorListener:
      | ((event: { callbackName: string }) => void)
      | undefined;
    let shieldActive = false;
    const deviceActivity: DeviceActivityApi = {
      ...createDeviceActivityApi(2),
      isShieldActive: () => shieldActive,
      onDeviceActivityMonitorEvent: jest.fn((listener) => {
        monitorListener = listener;
        return { remove: jest.fn() };
      }),
    };
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
    });
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, {
      shields: "down",
      drainThresholds: [],
    });
    const observed: string[] = [];
    screenTime.subscribe((state) => observed.push(state.effectiveShields));

    shieldActive = true;
    monitorListener?.({ callbackName: "intervalDidEnd" });

    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      effectiveShields: "up",
    });
    expect(observed).toEqual(["up"]);
  });

  it("refreshes actual ManagedSettings state after returning to the app", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
    });
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, {
      shields: "down",
      drainThresholds: [],
    });

    deviceActivity.setShieldActive(true);

    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      desiredOsState: { shields: "down" },
      effectiveShields: "up",
    });
  });
});
