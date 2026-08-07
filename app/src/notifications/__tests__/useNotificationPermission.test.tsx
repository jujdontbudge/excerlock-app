jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import { act, renderHook, waitFor } from "@testing-library/react-native";

import { MockNotificationModule } from "../MockNotificationModule";
import type { NotificationModule } from "../NotificationModule";
import { useNotificationPermission } from "../hooks/useNotificationPermission";

/** A module whose native calls fail — the device-smoke Finding 4 scenario. */
function failingModule(
  overrides: Partial<NotificationModule> = {},
): NotificationModule {
  const mock = new MockNotificationModule();
  return {
    getAuthorizationStatus: () => Promise.reject(new Error("native bridge down")),
    requestAuthorization: () => Promise.reject(new Error("native bridge down")),
    schedule: (n) => mock.schedule(n),
    cancel: (id) => mock.cancel(id),
    getScheduled: () => mock.getScheduled(),
    getDeliveries: () => mock.getDeliveries(),
    subscribe: (l) => mock.subscribe(l),
    ...overrides,
  };
}

describe("useNotificationPermission failure resilience", () => {
  it("still becomes ready when the initial status read rejects, keeping the opt-in flow alive", async () => {
    const module = failingModule();
    const onApproved = jest.fn();
    const { result } = await renderHook(() =>
      useNotificationPermission(module, onApproved),
    );

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.authorization).toBe("notDetermined");

    // The user can still start the opt-in flow — the card is not dead.
    await act(async () => {
      result.current.beginOptIn("weeklyRecap");
    });
    expect(result.current.primerVisible).toBe(true);
  });

  it("dismisses the primer without approving or throwing when requestAuthorization rejects", async () => {
    const module = failingModule();
    const onApproved = jest.fn();
    const { result } = await renderHook(() =>
      useNotificationPermission(module, onApproved),
    );
    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });

    await act(async () => {
      result.current.beginOptIn("weeklyRecap");
    });
    expect(result.current.primerVisible).toBe(true);

    await act(async () => {
      await result.current.requestAuthorization();
    });

    expect(result.current.primerVisible).toBe(false);
    expect(result.current.authorization).toBe("notDetermined");
    expect(onApproved).not.toHaveBeenCalled();
  });

  it("keeps the happy path intact: a working module reports its real status", async () => {
    const mock = new MockNotificationModule();
    mock.setNextAuthorizationResult("approved");
    await mock.requestAuthorization();
    const { result } = await renderHook(() =>
      useNotificationPermission(mock, jest.fn()),
    );

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
    expect(result.current.authorization).toBe("approved");
  });
});
