import { render, screen } from "@testing-library/react-native";

import {
  DayLedger,
  EarnedSpentCard,
  StreakCard,
  TimeReclaimedHero,
  WeekChart,
} from "../components";
import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { selectBars, selectTimeReclaimed, selectTotals } from "../model";

/** The whole fixture is one calendar month — the hero's window. */
const month = (confessedDailyMinutes: number | null) =>
  selectTimeReclaimed(FIXTURE_DAY_SUMMARIES, confessedDailyMinutes);

describe("EarnedSpentCard", () => {
  it("phrases a banking window as banked", async () => {
    await render(
      <EarnedSpentCard
        caption="This week"
        totals={{
          earnedMinutes: 120,
          spentMinutes: 45,
          usageMinutes: 45,
          netMinutes: 75,
          activeDays: 3,
          dayCount: 4,
        }}
      />,
    );

    expect(screen.getByTestId("net-total")).toHaveTextContent("+1h 15m");
    expect(screen.getByText(/banked over the window/)).toBeOnTheScreen();
  });
});

describe("StreakCard", () => {
  it("reads a broken streak as zero without dressing it up", async () => {
    await render(
      <StreakCard
        streak={{ current: 0, longest: 8 }}
        totals={selectTotals(FIXTURE_DAY_SUMMARIES.slice(0, 7))}
      />,
    );

    expect(screen.getByTestId("streak-current")).toHaveTextContent("0");
    expect(screen.getByTestId("streak-longest")).toHaveTextContent("8");
  });
});

describe("WeekChart", () => {
  it("draws a column per bar and labels the axis with weekday initials", async () => {
    await render(<WeekChart bars={selectBars(FIXTURE_DAY_SUMMARIES.slice(0, 7))} />);

    expect(screen.getAllByTestId(/^analysis-bar-/)).toHaveLength(7);
    expect(screen.getAllByText("S")).toHaveLength(2); // Saturday and Sunday.
  });

  it("survives a window where nothing was earned or spent", async () => {
    const quiet = FIXTURE_DAY_SUMMARIES.slice(0, 2).map((day) => ({
      ...day,
      earnedMinutes: 0,
      spentMinutes: 0,
    }));

    await render(<WeekChart bars={selectBars(quiet)} />);

    expect(screen.getAllByTestId(/^analysis-bar-/)).toHaveLength(2);
  });
});

describe("TimeReclaimedHero", () => {
  it("leads with the month's reclaimed hours as one big numeral", async () => {
    // 21 days against a 4h/day confession: 3882 minutes saved.
    await render(<TimeReclaimedHero reclaimed={month(240)} />);

    expect(screen.getByTestId("time-reclaimed-value")).toHaveTextContent("64");
    expect(screen.getByTestId("time-reclaimed-unit")).toHaveTextContent("h");
    expect(screen.getByText(/reclaimed this month/)).toBeOnTheScreen();
    expect(screen.getByTestId("time-reclaimed-detail")).toHaveTextContent(
      /^64h 42m against your old 4h a day, over 21 days\.$/,
    );
  });

  it("names the days that ran over the average while the month is still ahead", async () => {
    // A 60 min/day confession: 155 minutes saved, 53 given back, 8 days over.
    await render(<TimeReclaimedHero reclaimed={month(60)} />);

    expect(screen.getByTestId("time-reclaimed-value")).toHaveTextContent("2");
    expect(screen.getByTestId("time-reclaimed-net")).toHaveTextContent(
      /^8 of 21 days ran over that average; the window is \+1h 42m on balance\.$/,
    );
  });

  it("states an over-run month as the fact it is, and never as a failure", async () => {
    // A 30 min/day confession: every day ran over it, by 8h 48m in total.
    await render(<TimeReclaimedHero reclaimed={month(30)} />);

    expect(screen.getByTestId("time-reclaimed-value")).toHaveTextContent("0");
    expect(screen.getByTestId("time-reclaimed-net")).toHaveTextContent(
      /^21 of 21 days ran over that average; the window is −8h 48m on balance\.$/,
    );
    expect(screen.queryByText(/fail|missed|too much|should have|only/i)).toBeNull();
  });

  it("asks for the missing baseline instead of inventing one", async () => {
    await render(<TimeReclaimedHero reclaimed={month(null)} />);

    expect(screen.queryByTestId("time-reclaimed-value")).toBeNull();
    expect(screen.getByTestId("time-reclaimed-hero")).toHaveTextContent(/daily average/);
    // The usage is real even without a baseline, so it is still shown.
    expect(screen.getByTestId("time-reclaimed-usage")).toHaveTextContent(/19h 18m/);
  });

  it("reads a confession of zero as nothing to reclaim against", async () => {
    await render(<TimeReclaimedHero reclaimed={month(0)} />);

    expect(screen.queryByTestId("time-reclaimed-value")).toBeNull();
    expect(screen.getByTestId("time-reclaimed-hero")).toHaveTextContent(/nothing to reclaim/);
    expect(screen.getByTestId("time-reclaimed-usage")).toHaveTextContent(/19h 18m/);
  });

  it("says what window it is reading when handed one", async () => {
    await render(
      <TimeReclaimedHero
        reclaimed={selectTimeReclaimed(FIXTURE_DAY_SUMMARIES.slice(14), 240)}
        caption="reclaimed this week"
      />,
    );

    expect(screen.getByText(/reclaimed this week/)).toBeOnTheScreen();
  });
});

describe("DayLedger", () => {
  it("names the activity count on a day that met the bar", async () => {
    // Sat 25 Jul: a gym visit and a 33-minute run — two qualifying conditions.
    await render(<DayLedger days={[FIXTURE_DAY_SUMMARIES[19]]} />);

    expect(screen.getByText("2 activities")).toBeOnTheScreen();
    expect(screen.getByText("Sat 25 Jul")).toBeOnTheScreen();
  });

  it("draws nothing at all for an empty range", async () => {
    await render(<DayLedger days={[]} />);

    expect(screen.queryAllByTestId(/^analysis-day-row-/)).toEqual([]);
  });
});
