jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { compileMonitorPlan, type MonitorPlan } from "../../../../domain/monitorPlan";
import type { LockInterval } from "../../../../domain/lockIntervals";
import type { ScreenTimeModule } from "../../ScreenTimeModule";
import type { DeviceActivityApi } from "../deviceActivityTypes";
import { NativeScreenTimeModule } from "../NativeScreenTimeModule";
import type { NativeSelectionPicker } from "../NativeSelectionPicker";
import { NATIVE_SCREENTIME_STORAGE_KEY } from "../nativeStore";

type ControlledDeviceActivityApi = DeviceActivityApi & {
  getFamilyActivitySelectionId(id: string): string | undefined;
  setShieldActive(active: boolean): void;
  setAuthorizationStatus(status: 0 | 1 | 2): void;
  requestAuthorization: jest.Mock<Promise<void>, [("individual" | "child")?]>;
};

function createDeviceActivityApi(
  initialAuthorizationStatus = 0,
): ControlledDeviceActivityApi {
  let authorizationStatus: ReturnType<DeviceActivityApi["authorizationStatus"]> =
    initialAuthorizationStatus as ReturnType<
      DeviceActivityApi["authorizationStatus"]
    >;
  let shieldActive = false;
  const sharedValues = new Map<string, unknown>();

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
    setSharedValue: jest.fn((key: string, value: unknown) => {
      sharedValues.set(key, value);
    }),
    getSharedValue: <T>(key: string) => sharedValues.get(key) as T | undefined,
    selectionMetadata: jest.fn(() => ({
      applicationCount: 3,
      categoryCount: 1,
      webDomainCount: 0,
      includeEntireCategory: false,
    })),
    startMonitoring: jest.fn(async () => undefined),
    stopMonitoring: jest.fn(),
    getActivities: jest.fn(() => []),
    getEvents: jest.fn(() => []),
    cleanUpAfterActivity: jest.fn(),
    isShieldActive: jest.fn(() => shieldActive),
    onDeviceActivityMonitorEvent: jest.fn(() => ({ remove: jest.fn() })),
    getFamilyActivitySelectionId: jest.fn(
      () => "opaque-apple-selection-token",
    ),
    setShieldActive(active) {
      shieldActive = active;
    },
    setAuthorizationStatus(status) {
      authorizationStatus = status;
    },
  };
}

const TZ = "America/New_York";

/** The enforcer always hands the adapter a compiled plan, so tests do too. */
function planOf(nowMs: number, ...windows: [number, number][]): MonitorPlan {
  const intervals: LockInterval[] = windows.map(([startMs, endMs]) => ({
    start: new Date(startMs).toISOString(),
    end: new Date(endMs).toISOString(),
    ruleIds: ["rule-a"],
    timezone: TZ,
  }));
  return compileMonitorPlan(intervals, new Date(nowMs).toISOString());
}

const EMPTY_PLAN = (nowMs: number) => planOf(nowMs);

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

  it("reports a denial as denied instead of rejecting", async () => {
    // On a real device "Don't Allow" makes the OS call throw AND record the
    // refusal; the re-read status is the truthful answer, not the error.
    const deviceActivity = createDeviceActivityApi();
    deviceActivity.requestAuthorization = jest.fn(async () => {
      deviceActivity.setAuthorizationStatus(1);
      throw new Error("Family Controls authorization canceled.");
    });
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
    });

    await expect(screenTime.requestAuthorization()).resolves.toBe("denied");
  });

  it("stays notDetermined when the sheet dies without answering", async () => {
    // Observed on one 2026-08-01 simulator device: the OS call throws
    // "canceled" while the recorded status never changes.
    const deviceActivity = createDeviceActivityApi();
    deviceActivity.requestAuthorization = jest.fn(async () => {
      throw new Error("Family Controls authorization canceled.");
    });
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
    });

    await expect(screenTime.requestAuthorization()).resolves.toBe(
      "notDetermined",
    );
  });

  it("never re-asks the OS after a recorded refusal", async () => {
    const deviceActivity = createDeviceActivityApi(1);
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
    });

    await expect(screenTime.requestAuthorization()).resolves.toBe("denied");
    expect(deviceActivity.requestAuthorization).not.toHaveBeenCalled();
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
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 2, categoryCount: 1 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;

    await screenTime.reconcile(selection, "up", EMPTY_PLAN(nowMs));
    expect(deviceActivity.blockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      effectiveShields: "up",
    });

    await screenTime.reconcile(selection, "down", EMPTY_PLAN(nowMs));
    expect(deviceActivity.unblockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      effectiveShields: "down",
    });
  });

  it("arms the walking lease to the deadline the session machine gave it", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    let nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;

    await screenTime.armUnlockLease(selection, nowMs + 15 * 60_000);

    expect(deviceActivity.configureActions).toHaveBeenLastCalledWith({
      activityName: "excerlock.unlock-lease.v1",
      callbackName: "intervalDidEnd",
      actions: [
        { type: "blockSelection", familyActivitySelectionId: selection },
      ],
    });
    expect(deviceActivity.startMonitoring).toHaveBeenLastCalledWith(
      "excerlock.unlock-lease.v1",
      {
        intervalStart: { year: 2026, month: 7, day: 31, hour: 12, minute: 0, second: 0 },
        intervalEnd: { year: 2026, month: 7, day: 31, hour: 12, minute: 15, second: 0 },
        repeats: false,
      },
      [],
    );

    // A verified event five minutes in renews to one increment from then.
    nowMs += 5 * 60_000;
    await screenTime.armUnlockLease(selection, nowMs + 15 * 60_000);

    expect(deviceActivity.stopMonitoring).toHaveBeenCalledWith([
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

  it("raises the shield before a failed monitor registration escapes", async () => {
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const deviceActivity = {
      ...createDeviceActivityApi(2),
      startMonitoring: jest.fn(async () => {
        throw new Error("DeviceActivity refused the schedule");
      }),
    };
    const screenTime = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;

    await expect(
      screenTime.reconcile(
        selection,
        "down",
        planOf(nowMs, [nowMs + 3_600_000, nowMs + 7_200_000]),
      ),
    ).rejects.toThrow("DeviceActivity refused the schedule");
    expect(deviceActivity.blockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
  });

  it("starts a window on the caller's per-monitor intent, not the run's", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    const plan = planOf(
      nowMs,
      [nowMs + 3_600_000, nowMs + 7_200_000],
      [nowMs + 90_000_000, nowMs + 93_600_000],
    );
    const [earned, later] = plan.monitors;

    // A goal already met holds tonight open; tomorrow's window still shields.
    await screenTime.reconcile(selection, "up", plan, { [earned.name]: "down" });

    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: earned.name,
      callbackName: "intervalDidStart",
      actions: [
        { type: "unblockSelection", familyActivitySelectionId: selection },
      ],
    });
    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: later.name,
      callbackName: "intervalDidStart",
      actions: [
        { type: "blockSelection", familyActivitySelectionId: selection },
      ],
    });
  });

  it("keeps shields down outside every monitored window whatever the intent", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;

    await screenTime.reconcile(
      selection,
      "up",
      planOf(nowMs, [nowMs + 3_600_000, nowMs + 7_200_000]),
    );

    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      desiredShields: "up",
      effectiveShields: "down",
      activeMonitorName: null,
    });
    expect(deviceActivity.unblockSelection).toHaveBeenCalledWith({
      activitySelectionId: selection,
    });
  });

  it("registers the plan's monitors with OS-side start and end actions", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const startsAtMs = new Date(2026, 6, 31, 13, 0, 0).getTime();
    const endsAtMs = new Date(2026, 6, 31, 14, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    const plan = planOf(nowMs, [startsAtMs, endsAtMs]);
    const monitorName = plan.monitors[0].name;

    await screenTime.reconcile(selection, "up", plan);

    // The name hashes the interval, so nothing a rule is called reaches the OS log.
    expect(monitorName).toMatch(/^excerlock\.lock\./);
    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: monitorName,
      callbackName: "intervalDidStart",
      actions: [
        { type: "blockSelection", familyActivitySelectionId: selection },
      ],
    });
    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: monitorName,
      callbackName: "intervalDidEnd",
      actions: [
        { type: "unblockSelection", familyActivitySelectionId: selection },
      ],
    });
    expect(deviceActivity.startMonitoring).toHaveBeenLastCalledWith(
      monitorName,
      {
        intervalStart: { year: 2026, month: 7, day: 31, hour: 13, minute: 0, second: 0 },
        intervalEnd: { year: 2026, month: 7, day: 31, hour: 14, minute: 0, second: 0 },
        repeats: false,
      },
      [],
    );
    await expect(screenTime.getMonitors()).resolves.toEqual([
      { name: monitorName, startsAtMs, endsAtMs },
    ]);
  });

  it("expresses met-today by swapping the monitor's start action, not by unregistering", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    const plan = planOf(nowMs, [nowMs + 3_600_000, nowMs + 7_200_000]);
    const monitorName = plan.monitors[0].name;
    await screenTime.reconcile(selection, "up", plan);
    jest.clearAllMocks();

    await screenTime.reconcile(selection, "down", plan);

    expect(deviceActivity.configureActions).toHaveBeenCalledWith({
      activityName: monitorName,
      callbackName: "intervalDidStart",
      actions: [
        { type: "unblockSelection", familyActivitySelectionId: selection },
      ],
    });
    expect(deviceActivity.stopMonitoring).not.toHaveBeenCalledWith([monitorName]);
    await expect(screenTime.getMonitors()).resolves.toHaveLength(1);
  });

  it("retires a monitor the next plan no longer names", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    const plan = planOf(nowMs, [nowMs + 3_600_000, nowMs + 7_200_000]);
    const monitorName = plan.monitors[0].name;
    await screenTime.reconcile(selection, "up", plan);

    await screenTime.reconcile(selection, "up", EMPTY_PLAN(nowMs));

    expect(deviceActivity.stopMonitoring).toHaveBeenCalledWith([monitorName]);
    await expect(screenTime.getMonitors()).resolves.toEqual([]);
    // With nothing scheduled the intent applies directly again.
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      effectiveShields: "up",
    });
  });

  it("restores opaque selection metadata, intent and monitors after relaunch", async () => {
    const deviceActivity = createDeviceActivityApi(2);
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const startsAtMs = nowMs + 60 * 60_000;
    const endsAtMs = nowMs + 2 * 60 * 60_000;
    const first = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 3, categoryCount: 1 }),
      nowMs: () => nowMs,
    });
    const selection = (await first.pickSelection())!;
    const plan = planOf(nowMs, [startsAtMs, endsAtMs]);
    await first.reconcile(selection, "up", plan);

    const restored: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      nowMs: () => nowMs,
    });

    await expect(restored.describeSelection(selection)).resolves.toMatchObject({
      displayName: "3 apps · 1 category",
    });
    await expect(restored.getMonitors()).resolves.toEqual([
      { name: plan.monitors[0].name, startsAtMs, endsAtMs },
    ]);
    await expect(restored.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      desiredShields: "up",
      effectiveShields: "down",
      activeMonitorName: null,
    });
  });

  it("rejects persisted strings that are not the adapter-owned opaque handle", async () => {
    const leakedIdentifier = "com.private.locked-app";
    await AsyncStorage.setItem(
      NATIVE_SCREENTIME_STORAGE_KEY,
      JSON.stringify({
        selection: leakedIdentifier,
        desiredShields: "up",
        monitors: [
          {
            name: "excerlock.lock.private",
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
    await expect(screenTime.getMonitors()).resolves.toEqual([]);
    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection: null,
    });
  });

  it("observes the OS-side re-shield when a lease lapses", async () => {
    let monitorListener:
      | ((event: { callbackName: string }) => void)
      | undefined;
    let shieldActive = false;
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
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
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, "down", EMPTY_PLAN(nowMs));
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
    const nowMs = new Date(2026, 6, 31, 12, 0, 0).getTime();
    const screenTime: ScreenTimeModule = new NativeScreenTimeModule({
      deviceActivity,
      picker: createPicker({ applicationCount: 1, categoryCount: 0 }),
      nowMs: () => nowMs,
    });
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, "down", EMPTY_PLAN(nowMs));

    deviceActivity.setShieldActive(true);

    await expect(screenTime.getCurrentShieldState()).resolves.toMatchObject({
      selection,
      desiredShields: "down",
      effectiveShields: "up",
    });
  });
});
