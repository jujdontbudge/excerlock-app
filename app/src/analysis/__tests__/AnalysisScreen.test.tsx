import { render, screen } from "@testing-library/react-native";
import { processColor } from "react-native";

import { gradients } from "@/ui";

import { AnalysisScreen } from "..";
import { FIXTURE_DAY_SUMMARIES } from "../fixtures";

describe("AnalysisScreen", () => {
  it("sits on the brand gradient under the screen title", async () => {
    await render(<AnalysisScreen />);

    expect(screen.getByRole("header", { name: "Analysis" })).toBeOnTheScreen();
    expect(screen.getByTestId("analysis-screen").props.colors).toEqual(
      gradients.screen.colors.map((hex) => processColor(hex)),
    );
  });

  it("leads with this week's earned-versus-spent balance", async () => {
    await render(<AnalysisScreen />);

    // Week 3 of the fixture: 221 min earned against 374 min spent.
    expect(screen.getByTestId("earned-total")).toHaveTextContent("3h 41m");
    expect(screen.getByTestId("spent-total")).toHaveTextContent("6h 14m");
    expect(screen.getByTestId("net-total")).toHaveTextContent("−2h 33m");
  });

  it("shows the current streak against the best one", async () => {
    await render(<AnalysisScreen />);

    expect(screen.getByTestId("streak-current")).toHaveTextContent("5");
    expect(screen.getByTestId("streak-longest")).toHaveTextContent("8");
    expect(screen.getByTestId("streak-active-days")).toHaveTextContent(/^6 of 7 days\b/);
  });

  it("draws one earned/spent bar pair per day of the week", async () => {
    await render(<AnalysisScreen />);

    expect(screen.getAllByTestId(/^analysis-bar-/)).toHaveLength(7);
    expect(
      screen.getByLabelText("Mon 20 Jul — earned 45m, spent 44m"),
    ).toBeOnTheScreen();
  });

  it("lists the recorded days newest first", async () => {
    await render(<AnalysisScreen />);

    const rows = screen.getAllByTestId(/^analysis-day-row-/);

    expect(rows).toHaveLength(7);
    expect(rows[0]).toHaveTextContent(/^Sun 26 Jul/);
    expect(rows.at(-1)).toHaveTextContent(/^Mon 20 Jul/);
    // Sunday earned 20m, spent 47m and closed on 1h 3m.
    expect(rows[0]).toHaveTextContent(/\+20m−47m1h 3m left$/);
  });

  it("reads a quiet day without scolding it", async () => {
    await render(<AnalysisScreen />);

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
  });
});
