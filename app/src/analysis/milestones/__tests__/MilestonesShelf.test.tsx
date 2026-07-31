import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";
import { Alert, Animated } from "react-native";

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

  afterEach(() => {
    jest.restoreAllMocks();
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

  it("honors an unlocked tap when its persisted record finishes arriving", async () => {
    await render(<MilestonesShelf metrics={metrics} />);

    await fireEvent.press(
      screen.getByRole("button", { name: "3 days, unlocked" }),
    );
    expect(
      screen.queryByRole("header", { name: "Share your milestone" }),
    ).toBeNull();

    await act(async () => {
      useMilestoneUnlockStore
        .getState()
        .discoverUnlocks(["streak-3"], Date.UTC(2026, 6, 29, 12));
    });

    expect(
      await screen.findByRole("header", { name: "Share your milestone" }),
    ).toBeOnTheScreen();
    expect(screen.getByText("July 2026")).toBeOnTheScreen();
  });

  // PRD 3.14 makes the unlock moment deliberately quiet: the badge animates into
  // the shelf and wears a "New" glint, and that is the WHOLE announcement. No
  // popup anywhere, no auto-opened share sheet. Sharing stays a tap the user
  // chooses to make, so this locks the negative in -- nothing else here would
  // fail if a future change reintroduced a takeover.
  it("announces an unlock with no popup and no auto-opened share sheet", async () => {
    const shareCards = new MockShareCardModule();
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3", "activity-1"], Date.UTC(2026, 6, 29, 12));
    useMilestoneUnlockStore.getState().claimPending();

    await render(
      <MilestonesShelf
        metrics={metrics}
        shareCardModule={shareCards}
        unlockSequence={["streak-3", "activity-1"]}
      />,
    );

    expect(screen.getByTestId("milestone-new-streak-3")).toBeOnTheScreen();
    expect(screen.getByTestId("milestone-new-activity-1")).toBeOnTheScreen();

    expect(
      screen.queryByRole("header", { name: "Share your milestone" }),
    ).toBeNull();
    expect(shareCards.getPresentedCards()).toEqual([]);
    expect(shareCards.getCapturedCards()).toEqual([]);
    expect(alert).not.toHaveBeenCalled();
  });

  it("starts one staggered scale-in sequence for all pending unlocks", async () => {
    const start = jest.fn();
    const stop = jest.fn();
    const reset = jest.fn();
    const spring = jest.spyOn(Animated, "spring");
    const stagger = jest
      .spyOn(Animated, "stagger")
      .mockReturnValue({ reset, start, stop });

    await render(
      <MilestonesShelf
        metrics={metrics}
        unlockSequence={["streak-3", "activity-1"]}
      />,
    );

    expect(spring).toHaveBeenCalledTimes(2);
    expect(spring.mock.calls.map(([, config]) => config)).toEqual([
      expect.objectContaining({
        damping: 13,
        stiffness: 210,
        toValue: 1,
        useNativeDriver: true,
      }),
      expect.objectContaining({
        damping: 13,
        stiffness: 210,
        toValue: 1,
        useNativeDriver: true,
      }),
    ]);
    expect(stagger).toHaveBeenCalledWith(
      120,
      spring.mock.results.map(({ value }) => value),
    );
    expect(start).toHaveBeenCalledTimes(1);
  });
});
