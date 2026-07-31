import { act, render, waitFor } from "@testing-library/react-native";
import type { EffectCallback } from "expo-router";
import * as Haptics from "expo-haptics";

import AnalysisRoute from "../../../app/(tabs)/analysis";
import { useMilestoneUnlockStore } from "../milestones/unlockStore";

let mockFocusCallback: EffectCallback | undefined;

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: EffectCallback) => {
    mockFocusCallback = callback;
  },
}));

jest.mock(
  "expo-haptics",
  () => ({
    NotificationFeedbackType: { Success: "success" },
    notificationAsync: jest.fn().mockResolvedValue(undefined),
  }),
  { virtual: true },
);

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("AnalysisRoute", () => {
  beforeEach(() => {
    mockFocusCallback = undefined;
    jest.mocked(Haptics.notificationAsync).mockClear();
    useMilestoneUnlockStore.setState({ records: {} });
  });

  it("claims unlocks only on focused Analysis visits, including the first", async () => {
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3"], Date.UTC(2026, 6, 30, 12));

    await render(<AnalysisRoute />);

    expect(mockFocusCallback).toBeDefined();
    expect(
      useMilestoneUnlockStore.getState().records["streak-3"]?.pending,
    ).toBe(true);

    await act(async () => {
      mockFocusCallback?.();
    });
    await waitFor(() => {
      expect(
        useMilestoneUnlockStore.getState().records["streak-3"]?.pending,
      ).toBe(false);
    });

    await act(async () => {
      useMilestoneUnlockStore
        .getState()
        .discoverUnlocks(["activity-1"], Date.UTC(2026, 6, 31, 12));
    });
    expect(
      useMilestoneUnlockStore.getState().records["activity-1"]?.pending,
    ).toBe(true);

    await act(async () => {
      mockFocusCallback?.();
    });

    await waitFor(() => {
      expect(
        useMilestoneUnlockStore.getState().records["activity-1"]?.pending,
      ).toBe(false);
    });
  });

  it("plays one success haptic for a multi-badge sequence and none for an empty visit", async () => {
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(
        ["streak-3", "activity-1"],
        Date.UTC(2026, 6, 31, 12),
      );

    await render(<AnalysisRoute />);

    await act(async () => {
      mockFocusCallback?.();
    });
    await waitFor(() => {
      expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Success,
    );

    await act(async () => {
      mockFocusCallback?.();
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});
