jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DesiredOsState } from "@excerlock/ledger";

import { MockScreenTimeModule } from "../MockScreenTimeModule";
import type { ScreenTimeModule } from "../ScreenTimeModule";

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
});
