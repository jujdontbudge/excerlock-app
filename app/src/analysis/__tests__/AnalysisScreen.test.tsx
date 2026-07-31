import type { ConfiguredCondition } from "@excerlock/condition-model";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react-native";
import { processColor } from "react-native";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";
import { useConfessionStore } from "@/onboarding";
import { useScheduleStore } from "@/schedule";
import { gradients } from "@/ui";
import { MockShareCardModule } from "@/shareCards";

import { AnalysisScreen } from "..";
import {
  FIXTURE_CONDITION_NAMES,
  FIXTURE_DAY_SUMMARIES,
} from "../fixtures";
import { useMilestoneUnlockStore } from "../milestones/unlockStore";

// The screen reads the confession store, which persists through AsyncStorage.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const stepGoal: ConfiguredCondition = {
  id: "saved-step-goal",
  catalogId: "steps-goal",
  source: "appleHealth",
  settings: {
    kind: "event",
    threshold: 10_000,
    reward: { type: "fixedMinutes", minutes: 30 },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

const fixtureProps = {
  days: FIXTURE_DAY_SUMMARIES,
  conditionNames: FIXTURE_CONDITION_NAMES,
  clock: { nowMs: () => Date.UTC(2026, 6, 26, 18) },
} as const;

function historyEntry(id: string, atMs: number, minutes: number) {
  return {
    kind: "earn",
    source: "history-test",
    id,
    atMs,
    conditionId: stepGoal.id,
    payout: { type: "fixedChunk", minutes },
  } as const;
}

const historyConfig = {
  dayBoundaryOffsetMinutes: 0,
  baseAllowanceMinutes: 30,
  rollover: null,
} as const;

function setRealHistory(
  entries: readonly ReturnType<typeof historyEntry>[],
) {
  useHomeStore.setState({
    ...DEFAULT_HOME_STATE,
    conditions: [stepGoal],
    journal: { entries: [...entries] },
    ledgerConfig: historyConfig,
  });
}

describe("AnalysisScreen", () => {
  // Reset before, not after: an `afterEach` here runs while the tree is still
  // mounted, and the store update lands outside `act`.
  beforeEach(() => {
    useConfessionStore.setState({ confessedDailyMinutes: null });
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useScheduleStore.setState({
      recurringRestWeekdays: [],
      holidays: [],
      overrides: [],
    });
    useMilestoneUnlockStore.setState({ records: {} });
  });

  it("sits on the brand gradient under the screen title", async () => {
    await render(<AnalysisScreen />);

    expect(screen.getByRole("header", { name: "Analysis" })).toBeOnTheScreen();
    expect(screen.getByTestId("analysis-screen").props.colors).toEqual(
      gradients.screen.colors.map((hex) => processColor(hex)),
    );
  });

  it("defaults to the real Home journal rather than the Phase 2 fixture", async () => {
    setRealHistory([
      historyEntry("real-first-day", Date.UTC(2025, 0, 1, 12), 5),
    ]);

    await render(<AnalysisScreen />);

    const rows = screen.getAllByTestId(/^analysis-day-row-/);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent(/^Wed 1 Jan/);
    expect(
      screen.getByTestId(`condition-earning-${stepGoal.id}`),
    ).toHaveTextContent(/^Step goal5m$/);
  });

  it("derives the real journal through the injected instant using the configured day boundary", async () => {
    const beforeBoundary = Date.UTC(2025, 0, 5, 3, 30);
    const afterBoundary = Date.UTC(2025, 0, 5, 4, 30);
    useHomeStore.setState({
      ...DEFAULT_HOME_STATE,
      conditions: [stepGoal],
      journal: {
        entries: [
          {
            kind: "drainTick",
            source: "screen-time",
            id: "before-boundary",
            atMs: beforeBoundary,
            minutes: 5,
          },
          {
            kind: "earn",
            source: "health",
            id: "after-boundary",
            atMs: afterBoundary,
            conditionId: stepGoal.id,
            payout: { type: "fixedChunk", minutes: 30 },
          },
        ],
      },
      ledgerConfig: {
        dayBoundaryOffsetMinutes: 4 * 60,
        baseAllowanceMinutes: 30,
        rollover: null,
      },
    });

    await render(<AnalysisScreen throughMs={afterBoundary} />);

    const rows = screen.getAllByTestId(/^analysis-day-row-/);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/^Sun 5 Jan/);
    expect(rows[1]).toHaveTextContent(/^Sat 4 Jan/);
    expect(
      screen.getByTestId(`condition-earning-${stepGoal.id}`),
    ).toHaveTextContent(/^Step goal30m$/);
  });

  it("generates a recap for an install that is only two days old", async () => {
    const installedAtMs = Date.UTC(2026, 6, 24, 18);
    const recapMomentMs = Date.UTC(2026, 6, 26, 18);
    setRealHistory([
      historyEntry("first-install-entry", installedAtMs, 5),
    ]);

    await render(
      <AnalysisScreen
        clock={{ nowMs: () => recapMomentMs }}
        confessedDailyMinutes={240}
      />,
    );

    expect(screen.getByTestId("recap-card")).toHaveTextContent(
      /WEEKLY RECAP · 24–26 Jul/,
    );
    expect(screen.getByTestId("recap-delta")).toHaveTextContent(
      /^Your first week on record$/,
    );
  });

  it("leads with the recap and the Time Reclaimed hero, in that order", async () => {
    await render(
      <AnalysisScreen {...fixtureProps} confessedDailyMinutes={240} />,
    );

    // 21 July days against a 4h/day confession.
    expect(screen.getByTestId("time-reclaimed-value")).toHaveTextContent("64");
    expect(screen.getByTestId("recap-reclaimed")).toHaveTextContent(/^21h 46m$/);
    expect(screen.getByTestId("recap-delta")).toHaveTextContent(/^44m more than last week$/);
  });

  it("takes the baseline from the onboarding confession when it has one", async () => {
    useConfessionStore.setState({ confessedDailyMinutes: 240 });

    await render(<AnalysisScreen {...fixtureProps} />);

    expect(screen.getByTestId("time-reclaimed-value")).toHaveTextContent("64");
  });

  it("says what is missing when onboarding was skipped, rather than showing a zero", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    expect(screen.queryByTestId("time-reclaimed-value")).toBeNull();
    expect(screen.getByTestId("time-reclaimed-hero")).toHaveTextContent(/daily average/);
    expect(screen.getByTestId("recap-usage")).toHaveTextContent(/^6h 14m$/);
  });

  it("keeps the hero truthful when the month ran over the confession", async () => {
    await render(
      <AnalysisScreen {...fixtureProps} confessedDailyMinutes={30} />,
    );

    expect(screen.getByTestId("time-reclaimed-net")).toHaveTextContent(/−8h 48m on balance/);
    expect(screen.queryByText(/fail|too much|should have/i)).toBeNull();
  });

  it("leads with this week's earned-versus-spent balance", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    // Week 3 of the fixture: 221 min earned against 374 min spent.
    expect(screen.getByTestId("earned-total")).toHaveTextContent("3h 41m");
    expect(screen.getByTestId("spent-total")).toHaveTextContent("6h 14m");
    expect(screen.getByTestId("net-total")).toHaveTextContent("−2h 33m");
  });

  it("shows the current streak against the best one", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    expect(screen.getByTestId("streak-current")).toHaveTextContent("5");
    expect(screen.getByTestId("streak-longest")).toHaveTextContent("8");
    expect(screen.getByTestId("streak-active-days")).toHaveTextContent(/^6 of 7 days\b/);
  });

  it("keeps the visible streak running across a rest day from the schedule store", async () => {
    useScheduleStore.setState({ recurringRestWeekdays: [2] });

    await render(
      <AnalysisScreen
        days={FIXTURE_DAY_SUMMARIES.slice(14, 17)}
        conditionNames={FIXTURE_CONDITION_NAMES}
        clock={{ nowMs: () => Date.UTC(2026, 6, 22, 18) }}
        weekStartsOn={4}
      />,
    );

    expect(screen.getByTestId("streak-current")).toHaveTextContent(/^2$/);
    expect(screen.getByTestId("recap-streak")).toHaveTextContent(/^2 days$/);
  });

  it("uses scheduled-active days for the visible recap denominator", async () => {
    useScheduleStore.setState({ recurringRestWeekdays: [2] });

    await render(<AnalysisScreen {...fixtureProps} />);

    expect(screen.getByTestId("recap-active-days")).toHaveTextContent(
      /^6 of 6 days$/,
    );
  });

  it("uses the real schedule classification for requirement cells", async () => {
    useScheduleStore.setState({ recurringRestWeekdays: [2] });
    const monday = FIXTURE_DAY_SUMMARIES[14];
    const tuesday = FIXTURE_DAY_SUMMARIES[15];
    const gym = monday.conditions["gym-visit"]!;

    await render(
      <AnalysisScreen
        days={[
          {
            ...monday,
            conditions: {
              ...monday.conditions,
              "gym-visit": {
                ...gym,
                firstQualifiedAtMs: 0,
              },
            },
          },
          tuesday,
        ]}
        conditionNames={FIXTURE_CONDITION_NAMES}
      />,
    );

    expect(
      screen.getByRole("button", {
        name: "Mon 20 Jul, requirement met by event",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Tue 21 Jul, rest day",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.queryByRole("button", {
        name: "Tue 21 Jul, no qualifying activity",
      }),
    ).toBeNull();
  });

  it("shows what each condition banked this week", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    expect(
      screen.getByRole("header", { name: "Earning breakdown" }),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("condition-earning-gym-visit")).toHaveTextContent(
      /^Gym visit2h 15m$/,
    );
    expect(
      screen.getByTestId("condition-earning-standing-desk"),
    ).toHaveTextContent(/^Standing desk0m$/);
  });

  it("renders the complete milestone shelf from the real all-record selectors", async () => {
    await render(
      <AnalysisScreen {...fixtureProps} confessedDailyMinutes={240} />,
    );

    expect(
      screen.getByRole("header", { name: "Milestones" }),
    ).toBeOnTheScreen();
    expect(screen.getAllByTestId(/^milestone-badge-/)).toHaveLength(22);
    expect(screen.getByRole("header", { name: "Streaks" })).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Activities" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("header", { name: "Time Reclaimed" }),
    ).toBeOnTheScreen();
  });

  it("claims pending unlocks as one quiet sequence without opening or sharing anything", async () => {
    const haptics = { success: jest.fn().mockResolvedValue(undefined) };
    const shareCards = new MockShareCardModule();
    const unlockedAtMs = Date.UTC(2026, 6, 26, 18);
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3", "activity-1"], unlockedAtMs);

    const view = await render(
      <AnalysisScreen
        {...fixtureProps}
        confessedDailyMinutes={240}
        milestoneHaptics={haptics}
        milestoneShareCardModule={shareCards}
      />,
    );

    expect(
      await screen.findByLabelText("New milestone 1 of 2"),
    ).toBeOnTheScreen();
    expect(
      screen.getByLabelText("New milestone 2 of 2"),
    ).toBeOnTheScreen();
    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(
      useMilestoneUnlockStore.getState().records["streak-3"]?.pending,
    ).toBe(false);
    expect(
      screen.queryByRole("header", { name: "Share your milestone" }),
    ).toBeNull();
    expect(shareCards.getCapturedCards()).toEqual([]);
    expect(shareCards.getPresentedCards()).toEqual([]);

    await view.rerender(
      <AnalysisScreen
        key="remounted-analysis"
        {...fixtureProps}
        confessedDailyMinutes={240}
        milestoneHaptics={haptics}
        milestoneShareCardModule={shareCards}
      />,
    );

    expect(haptics.success).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole("header", { name: "Share your milestone" }),
    ).toBeNull();
  });

  it("waits for persisted unlocks to hydrate before claiming the current visit", async () => {
    let hydrated = false;
    let finishHydration: (() => void) | undefined;
    const hasHydrated = jest
      .spyOn(useMilestoneUnlockStore.persist, "hasHydrated")
      .mockImplementation(() => hydrated);
    const onFinishHydration = jest
      .spyOn(useMilestoneUnlockStore.persist, "onFinishHydration")
      .mockImplementation((listener) => {
        finishHydration = listener as () => void;
        return jest.fn();
      });
    const haptics = { success: jest.fn().mockResolvedValue(undefined) };
    useMilestoneUnlockStore
      .getState()
      .discoverUnlocks(["streak-3"], Date.UTC(2026, 6, 26, 18));

    await render(
      <AnalysisScreen
        {...fixtureProps}
        confessedDailyMinutes={240}
        milestoneHaptics={haptics}
      />,
    );

    expect(
      useMilestoneUnlockStore.getState().records["streak-3"]?.pending,
    ).toBe(true);
    expect(haptics.success).not.toHaveBeenCalled();
    expect(finishHydration).toBeDefined();

    hydrated = true;
    await act(async () => {
      finishHydration?.();
    });

    await waitFor(() => {
      expect(
        useMilestoneUnlockStore.getState().records["streak-3"]?.pending,
      ).toBe(false);
    });
    expect(haptics.success).toHaveBeenCalledTimes(1);

    hasHydrated.mockRestore();
    onFinishHydration.mockRestore();
  });

  it("joins real ledger condition ids to their names in the condition store", async () => {
    useHomeStore.setState({ ...DEFAULT_HOME_STATE, conditions: [stepGoal] });
    const source = FIXTURE_DAY_SUMMARIES[14];
    const day = {
      ...source,
      earnedMinutes: 30,
      conditions: {
        [stepGoal.id]: {
          eventsFired: 1,
          rateMinutes: 0,
          stateSustainedMinutes: 0,
          earnedMinutes: 30,
          meaningfulActivity: true,
        },
      },
      meaningfulActivity: true,
      meaningfulConditionCount: 1,
    };

    await render(<AnalysisScreen days={[day]} />);

    expect(
      screen.getByTestId(`condition-earning-${stepGoal.id}`),
    ).toHaveTextContent(/^Step goal30m$/);
  });

  it("draws one earned/spent bar pair per day of the week", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    expect(screen.getAllByTestId(/^analysis-bar-/)).toHaveLength(7);
    expect(
      screen.getByLabelText("Mon 20 Jul — earned 45m, spent 44m"),
    ).toBeOnTheScreen();
  });

  it("switches the real multi-year record between distinct week, month and year windows", async () => {
    setRealHistory([
      historyEntry("installed", Date.UTC(2023, 10, 15, 12), 5),
      historyEntry("january", Date.UTC(2025, 0, 10, 12), 10),
      historyEntry("february", Date.UTC(2025, 1, 2, 12), 20),
    ]);

    await render(<AnalysisScreen throughMs={Date.UTC(2025, 1, 3, 12)} />);

    expect(
      screen.getByRole("button", { name: "Week" }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getAllByTestId(/^analysis-day-row-/)).toHaveLength(1);
    expect(screen.getByTestId("earned-total")).toHaveTextContent("0m");

    await fireEvent.press(screen.getByRole("button", { name: "Month" }));

    expect(
      screen.getByRole("button", { name: "Month" }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getAllByTestId(/^analysis-day-row-/)).toHaveLength(3);
    expect(screen.getByTestId("earned-total")).toHaveTextContent("20m");

    await fireEvent.press(screen.getByRole("button", { name: "Year" }));

    expect(
      screen.getByRole("button", { name: "Year" }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getAllByTestId(/^analysis-day-row-/)).toHaveLength(34);
    expect(screen.getByTestId("earned-total")).toHaveTextContent("30m");
  });

  it("keeps a three-day history honest when the user asks for Year", async () => {
    setRealHistory([
      historyEntry("first-day", Date.UTC(2025, 0, 1, 12), 5),
    ]);

    await render(<AnalysisScreen throughMs={Date.UTC(2025, 0, 3, 12)} />);
    await fireEvent.press(screen.getByRole("button", { name: "Year" }));

    expect(
      screen.getByRole("button", { name: "Year" }).props.accessibilityState,
    ).toEqual({ selected: true });
    expect(screen.getAllByTestId(/^analysis-day-row-/)).toHaveLength(3);
    expect(screen.getByTestId("earned-total")).toHaveTextContent("5m");
    expect(screen.getAllByText("No activity")).toHaveLength(2);
    expect(screen.queryByText(/missed|failed|should have/i)).toBeNull();
  });

  it("lists the recorded days newest first", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    const rows = screen.getAllByTestId(/^analysis-day-row-/);

    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent(/^Sun 26 Jul/);
    expect(rows.at(-1)).toHaveTextContent(/^Mon 20 Jul/);
    // Sunday earned 20m, spent 47m and closed on 1h 3m.
    expect(rows[0]).toHaveTextContent(/\+20m−47m1h 3m left$/);
  });

  it("reads a quiet day without scolding it", async () => {
    await render(<AnalysisScreen {...fixtureProps} />);

    // Tue 21 Jul earned nothing and burned the balance to zero. Stated, never shamed.
    expect(screen.getByText("No activity")).toBeOnTheScreen();
    expect(screen.queryByText(/missed|failed/i)).toBeNull();
  });

  it("renders whatever range it is handed", async () => {
    await render(<AnalysisScreen days={FIXTURE_DAY_SUMMARIES.slice(0, 2)} />);

    expect(screen.getAllByTestId(/^analysis-day-row-/)).toHaveLength(2);
  });

  it("starts empty for a day-zero user — no zeroed cards, just the invitation", async () => {
    await render(<AnalysisScreen days={[]} />);

    expect(screen.getByRole("header", { name: "Nothing to analyse yet" })).toBeOnTheScreen();
    expect(screen.queryByTestId("earned-total")).toBeNull();
    expect(screen.queryByTestId("streak-current")).toBeNull();
    expect(screen.queryAllByTestId(/^analysis-bar-/)).toEqual([]);
    // Nothing recorded means no recap and no hero — not a zeroed one.
    expect(screen.queryByTestId("recap-card")).toBeNull();
    expect(screen.queryByTestId("time-reclaimed-hero")).toBeNull();
    expect(screen.queryByTestId("requirement-heat-map-card")).toBeNull();
  });
});
