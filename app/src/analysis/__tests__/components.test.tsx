import { render, screen } from "@testing-library/react-native";

import { DayLedger, EarnedSpentCard, StreakCard, WeekChart } from "../components";
import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { selectBars, selectTotals } from "../model";

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
