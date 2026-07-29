jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DesiredOsState } from "@excerlock/ledger";

import { MockScreenTimeModule } from "../MockScreenTimeModule";
import { ManualScreenTimeClock } from "../clock";
import type {
  ScreenTimeModule,
  ScreenTimeSelectionHandle,
} from "../ScreenTimeModule";

describe("MockScreenTimeModule", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("moves authorization from not determined to one terminal decision", async () => {
    const denied = new MockScreenTimeModule();

    expect(await denied.getAuthorizationStatus()).toBe("notDetermined");
    denied.setNextAuthorizationResult("denied");
    await expect(denied.requestAuthorization()).resolves.toBe("denied");
    denied.setNextAuthorizationResult("approved");
    await expect(denied.requestAuthorization()).resolves.toBe("denied");

    await AsyncStorage.clear();
    const approved = new MockScreenTimeModule();
    approved.setNextAuthorizationResult("approved");

    await expect(approved.requestAuthorization()).resolves.toBe("approved");
    await expect(approved.getAuthorizationStatus()).resolves.toBe("approved");
  });

  it("picks an opaque selection and reconciles Ledger shield states idempotently", async () => {
    const mock = new MockScreenTimeModule();
    const screenTime: ScreenTimeModule = mock;
    mock.setNextAuthorizationResult("approved");
    await screenTime.requestAuthorization();

    const selection = await screenTime.pickSelection();
    expect(selection).not.toBeNull();

    const shieldsUp: DesiredOsState = {
      shields: "up",
      drainThresholds: [],
    };
    await screenTime.reconcile(selection!, shieldsUp);
    const applied = await screenTime.getCurrentShieldState();

    expect(applied).toEqual({
      selection,
      desiredOsState: shieldsUp,
      effectiveShields: "up",
      activeLockWindowId: null,
    });

    await screenTime.reconcile(selection!, shieldsUp);
    expect(await screenTime.getCurrentShieldState()).toEqual(applied);

    const shieldsDown: DesiredOsState = {
      shields: "down",
      drainThresholds: [],
    };
    await screenTime.reconcile(selection!, shieldsDown);
    await screenTime.reconcile(selection!, shieldsDown);

    expect(await screenTime.getCurrentShieldState()).toEqual({
      selection,
      desiredOsState: shieldsDown,
      effectiveShields: "down",
      activeLockWindowId: null,
    });
  });

  it("enforces a lock window at its inclusive start and exclusive end", async () => {
    const clock = new ManualScreenTimeClock(0);
    const mock = new MockScreenTimeModule({ clock });
    const screenTime: ScreenTimeModule = mock;
    mock.setNextAuthorizationResult("approved");
    await screenTime.requestAuthorization();
    const selection = (await screenTime.pickSelection())!;
    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [3, 4],
    });

    await screenTime.scheduleLockWindow(selection, {
      id: "morning",
      startsAtMs: 1_000,
      endsAtMs: 2_000,
    });

    expect((await screenTime.getCurrentShieldState()).effectiveShields).toBe(
      "down",
    );

    clock.advanceTo(999);
    expect((await screenTime.getCurrentShieldState()).effectiveShields).toBe(
      "down",
    );

    clock.advanceTo(1_000);
    expect(await screenTime.getCurrentShieldState()).toMatchObject({
      effectiveShields: "up",
      activeLockWindowId: "morning",
      desiredOsState: { shields: "up", drainThresholds: [3, 4] },
    });

    clock.advanceTo(1_999);
    expect((await screenTime.getCurrentShieldState()).effectiveShields).toBe(
      "up",
    );

    clock.advanceTo(2_000);
    expect(await screenTime.getCurrentShieldState()).toMatchObject({
      effectiveShields: "down",
      activeLockWindowId: null,
    });
  });

  it("notifies subscribers once per shield change and stops after unsubscribe", async () => {
    const mock = new MockScreenTimeModule();
    const screenTime: ScreenTimeModule = mock;
    mock.setNextAuthorizationResult("approved");
    await screenTime.requestAuthorization();
    const selection = (await screenTime.pickSelection())!;
    const observed: string[] = [];
    const unsubscribe = screenTime.subscribe((state) => {
      observed.push(state.effectiveShields);
    });

    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [],
    });
    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [],
    });
    await screenTime.reconcile(selection, {
      shields: "down",
      drainThresholds: [],
    });

    expect(observed).toEqual(["up", "down"]);

    unsubscribe();
    await screenTime.reconcile(selection, {
      shields: "up",
      drainThresholds: [],
    });
    expect(observed).toEqual(["up", "down"]);
  });

  it("describes a selection by count only, never by identifier", async () => {
    const mock = new MockScreenTimeModule();
    const screenTime: ScreenTimeModule = mock;
    mock.setNextAuthorizationResult("approved");
    await screenTime.requestAuthorization();

    mock.setNextSelectionContents({ applicationCount: 4, categoryCount: 2 });
    const selection = (await screenTime.pickSelection())!;

    await expect(screenTime.describeSelection(selection)).resolves.toEqual({
      handle: selection,
      displayName: "4 apps · 2 categories",
      applicationCount: 4,
      categoryCount: 2,
    });

    mock.setNextSelectionContents({ applicationCount: 1, categoryCount: 0 });
    const single = (await screenTime.pickSelection())!;
    await expect(screenTime.describeSelection(single)).resolves.toMatchObject({
      displayName: "1 app",
    });

    mock.setNextSelectionContents({ applicationCount: 0, categoryCount: 1 });
    const category = (await screenTime.pickSelection())!;
    await expect(screenTime.describeSelection(category)).resolves.toMatchObject({
      displayName: "1 category",
    });
  });

  it("returns no description for a handle it did not issue", async () => {
    const screenTime: ScreenTimeModule = new MockScreenTimeModule();

    await expect(
      screenTime.describeSelection("never-issued" as ScreenTimeSelectionHandle),
    ).resolves.toBeNull();
  });

  it("reports its scheduled lock windows in start order", async () => {
    const mock = new MockScreenTimeModule({
      clock: new ManualScreenTimeClock(0),
    });
    const screenTime: ScreenTimeModule = mock;
    mock.setNextAuthorizationResult("approved");
    await screenTime.requestAuthorization();
    const selection = (await screenTime.pickSelection())!;

    await screenTime.scheduleLockWindow(selection, {
      id: "night",
      startsAtMs: 5_000,
      endsAtMs: 6_000,
    });
    await screenTime.scheduleLockWindow(selection, {
      id: "morning",
      startsAtMs: 1_000,
      endsAtMs: 2_000,
    });

    await expect(screenTime.getLockWindows()).resolves.toEqual([
      { id: "morning", startsAtMs: 1_000, endsAtMs: 2_000 },
      { id: "night", startsAtMs: 5_000, endsAtMs: 6_000 },
    ]);

    await screenTime.cancelLockWindow("morning");
    await expect(screenTime.getLockWindows()).resolves.toEqual([
      { id: "night", startsAtMs: 5_000, endsAtMs: 6_000 },
    ]);
  });

  it("restores authorization, selection, desired state, and lock windows", async () => {
    const first = new MockScreenTimeModule({
      clock: new ManualScreenTimeClock(1_000),
    });
    first.setNextAuthorizationResult("approved");
    await first.requestAuthorization();
    const selection = (await first.pickSelection())!;
    await first.reconcile(selection, {
      shields: "up",
      drainThresholds: [8, 9],
    });
    await first.scheduleLockWindow(selection, {
      id: "persisted-window",
      startsAtMs: 500,
      endsAtMs: 1_500,
    });

    const restored: ScreenTimeModule = new MockScreenTimeModule({
      clock: new ManualScreenTimeClock(1_000),
    });

    await expect(restored.getAuthorizationStatus()).resolves.toBe("approved");
    await expect(restored.getCurrentShieldState()).resolves.toEqual({
      selection,
      desiredOsState: { shields: "up", drainThresholds: [8, 9] },
      effectiveShields: "up",
      activeLockWindowId: "persisted-window",
    });
  });
});
