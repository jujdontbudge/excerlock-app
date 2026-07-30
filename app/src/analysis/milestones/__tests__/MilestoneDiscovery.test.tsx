import {
  act,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";

import { AnalysisTabIcon } from "../AnalysisTabIcon";
import { MilestoneDiscovery } from "../MilestoneDiscovery";
import {
  selectPendingMilestoneIds,
  useMilestoneUnlockStore,
} from "../unlockStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

describe("MilestoneDiscovery", () => {
  beforeEach(() => {
    useMilestoneUnlockStore.setState({ records: {} });
  });

  it("persists newly achieved badges and adds one Analysis tab dot", async () => {
    await render(
      <>
        <MilestoneDiscovery
          metrics={{
            currentStreakDays: 3,
            longestStreakDays: 3,
            activityCount: 1,
            timeReclaimedMinutes: 0,
          }}
          unlockedAtMs={Date.UTC(2026, 6, 30, 12)}
        />
        <AnalysisTabIcon color="#FFFFFF" size={26} />
      </>,
    );

    await waitFor(() => {
      expect(
        selectPendingMilestoneIds(useMilestoneUnlockStore.getState()),
      ).toEqual(["streak-3", "activity-1"]);
    });
    expect(
      screen.getByLabelText("New milestone waiting in Analysis"),
    ).toBeOnTheScreen();

    await act(async () => {
      useMilestoneUnlockStore.getState().claimPending();
    });

    await waitFor(() => {
      expect(
        screen.queryByLabelText("New milestone waiting in Analysis"),
      ).toBeNull();
    });
  });
});
