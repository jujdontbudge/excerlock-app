import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  MILESTONE_UNLOCK_STORAGE_KEY,
  selectNewMilestoneIds,
  selectPendingMilestoneIds,
  useMilestoneUnlockStore,
} from "../unlockStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("milestone unlock persistence", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useMilestoneUnlockStore.setState({ records: {} });
  });

  it("records each unlock once while pending and new advance independently", () => {
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3", "activity-1"], 1_753_747_200_000);
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3"], 1_753_833_600_000);

    expect(
      useMilestoneUnlockStore.getState().records["streak-3"],
    ).toEqual({
      unlockedAtMs: 1_753_747_200_000,
      pending: true,
      isNew: true,
    });
    expect(
      selectPendingMilestoneIds(useMilestoneUnlockStore.getState()),
    ).toEqual(["streak-3", "activity-1"]);

    expect(useMilestoneUnlockStore.getState().claimPending()).toEqual([
      "streak-3",
      "activity-1",
    ]);
    expect(
      selectPendingMilestoneIds(useMilestoneUnlockStore.getState()),
    ).toEqual([]);
    expect(selectNewMilestoneIds(useMilestoneUnlockStore.getState())).toEqual([
      "streak-3",
      "activity-1",
    ]);

    useMilestoneUnlockStore.getState().markTapped("streak-3");

    expect(selectNewMilestoneIds(useMilestoneUnlockStore.getState())).toEqual([
      "activity-1",
    ]);
  });

  it("does not re-announce a claimed badge after persisted state remounts", async () => {
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3"], 1_753_747_200_000);
    useMilestoneUnlockStore.getState().claimPending();

    const persisted = await AsyncStorage.getItem(
      MILESTONE_UNLOCK_STORAGE_KEY,
    );
    expect(persisted).not.toBeNull();

    // Simulate a fresh in-memory store without erasing the device record.
    useMilestoneUnlockStore.setState({ records: {} });
    await AsyncStorage.setItem(MILESTONE_UNLOCK_STORAGE_KEY, persisted!);
    await useMilestoneUnlockStore.persist.rehydrate();

    expect(
      useMilestoneUnlockStore.getState().records["streak-3"],
    ).toEqual({
      unlockedAtMs: 1_753_747_200_000,
      pending: false,
      isNew: true,
    });
    expect(
      selectPendingMilestoneIds(useMilestoneUnlockStore.getState()),
    ).toEqual([]);
  });
});
