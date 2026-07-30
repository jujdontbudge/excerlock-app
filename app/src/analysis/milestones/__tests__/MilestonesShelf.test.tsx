import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";

import { MockShareCardModule } from "@/shareCards";

import { MilestonesShelf } from "../MilestonesShelf";
import { useMilestoneUnlockStore } from "../unlockStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const metrics = {
  currentStreakDays: 22,
  longestStreakDays: 22,
  activityCount: 7,
  timeReclaimedMinutes: 26 * 60,
} as const;

describe("MilestonesShelf", () => {
  beforeEach(() => {
    useMilestoneUnlockStore.setState({ records: {} });
  });

  it("renders all three visible ladders with locked, unlocked and next-up art", async () => {
    await render(<MilestonesShelf metrics={metrics} />);

    expect(screen.getByRole("header", { name: "Streaks" })).toBeOnTheScreen();
    expect(screen.getByRole("header", { name: "Activities" })).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Time Reclaimed" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^milestone-badge-/)).toHaveLength(22);

    expect(
      screen.getByTestId("milestone-art-streak-14").props.tintColor,
    ).toBeUndefined();
    expect(
      screen.getByTestId("milestone-art-streak-60").props.tintColor,
    ).toBe("#7E7781");
    expect(screen.getByText("60 days")).toBeOnTheScreen();

    expect(
      screen.getByLabelText("22/30 days milestone progress"),
    ).toBeOnTheScreen();
    expect(
      screen.queryByLabelText("22/60 days milestone progress"),
    ).toBeNull();
  });

  it("shows progress detail when a locked badge is tapped", async () => {
    await render(<MilestonesShelf metrics={metrics} />);

    await fireEvent.press(
      screen.getByRole("button", {
        name: "30 days, locked, 22/30 days",
      }),
    );

    expect(screen.getByTestId("milestone-progress-detail")).toHaveTextContent(
      /^30-Day Streak22 of 30 daysCurrent streak · best 22 days$/,
    );
  });

  it("opens the existing share preview for an unlocked badge and acknowledges New", async () => {
    const shareCards = new MockShareCardModule();
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3"], Date.UTC(2026, 6, 29, 12));
    useMilestoneUnlockStore.getState().claimPending();

    await render(
      <MilestonesShelf
        metrics={metrics}
        shareCardModule={shareCards}
      />,
    );

    expect(screen.getByTestId("milestone-new-streak-3")).toHaveTextContent(
      /^New$/,
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "3 days, unlocked" }),
    );

    expect(
      screen.getByRole("header", { name: "Share your milestone" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("3-Day Streak")).toBeOnTheScreen();
    expect(screen.getByText("July 2026")).toBeOnTheScreen();
    expect(screen.queryByTestId("milestone-new-streak-3")).toBeNull();
    expect(shareCards.getCapturedCards()).toEqual([]);
    expect(shareCards.getPresentedCards()).toEqual([]);
  });
});
