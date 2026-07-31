import { render, waitFor } from "@testing-library/react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";
import {
  DEFAULT_CONFESSION,
  useConfessionStore,
} from "@/onboarding";
import { ALL_DAYS_ACTIVE, useScheduleStore } from "@/schedule";

import { LiveMilestoneDiscovery } from "../LiveMilestoneDiscovery";
import {
  selectPendingMilestoneIds,
  useMilestoneUnlockStore,
} from "../unlockStore";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const FIRST_NOON = Date.UTC(2026, 6, 27, 12);
const DAY_MS = 24 * 60 * 60 * 1_000;

describe("LiveMilestoneDiscovery", () => {
  beforeEach(() => {
    useHomeStore.setState({
      ...DEFAULT_HOME_STATE,
      journal: {
        entries: [0, 1, 2].map((offset) => ({
          kind: "earn" as const,
          source: "milestone-live-test",
          id: `activity-${offset}`,
          atMs: FIRST_NOON + offset * DAY_MS,
          conditionId: "daily-activity",
          payout: { type: "fixedChunk" as const, minutes: 10 },
        })),
      },
    });
    useConfessionStore.setState(DEFAULT_CONFESSION);
    useScheduleStore.setState(ALL_DAYS_ACTIVE);
    useMilestoneUnlockStore.setState({ records: {} });
  });

  it("discovers from the persisted live record before Analysis is visited", async () => {
    const observedAtMs = FIRST_NOON + 2 * DAY_MS;

    await render(
      <LiveMilestoneDiscovery
        clock={{ nowMs: () => observedAtMs }}
      />,
    );

    await waitFor(() => {
      expect(
        selectPendingMilestoneIds(useMilestoneUnlockStore.getState()),
      ).toEqual(["streak-3", "activity-1"]);
    });
    expect(
      useMilestoneUnlockStore.getState().records["streak-3"]?.unlockedAtMs,
    ).toBe(observedAtMs);
  });
});
