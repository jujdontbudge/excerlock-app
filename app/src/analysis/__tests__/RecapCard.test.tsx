import { render, screen } from "@testing-library/react-native";

import {
  classifyScheduleDay,
  type ScheduleRules,
} from "@/schedule";

import { RecapCard } from "../components";
import { FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { buildRecap } from "../model";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const recap = (
  days: readonly (typeof FIXTURE_DAY_SUMMARIES)[number][],
  confessedDailyMinutes: number | null,
) => buildRecap(days, { confessedDailyMinutes })!;

describe("RecapCard", () => {
  it("renders the PRD's five rows for the week it covers", async () => {
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES, 240)} />);

    expect(screen.getByText(/20–26 Jul/)).toBeOnTheScreen();
    // ① 1306 minutes reclaimed, 44 more than last week's 1262.
    expect(screen.getByTestId("recap-reclaimed")).toHaveTextContent(/^21h 46m$/);
    expect(screen.getByTestId("recap-delta")).toHaveTextContent(/^44m more than last week$/);
    // ② ③ ④ ⑤
    expect(screen.getByTestId("recap-active-days")).toHaveTextContent(/^6 of 7 days$/);
    expect(screen.getByTestId("recap-activities")).toHaveTextContent(/^7$/);
    expect(screen.getByTestId("recap-earned-spent")).toHaveTextContent(/^3h 41m · 6h 14m$/);
    expect(screen.getByTestId("recap-streak")).toHaveTextContent(/^5 days$/);
  });

  it("states a down week as a fact and nothing more", async () => {
    // Week 2 reclaimed 52 minutes fewer than week 1.
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES.slice(0, 14), 240)} />);

    expect(screen.getByTestId("recap-delta")).toHaveTextContent(/^52m less than last week$/);
    expect(screen.queryByText(/fail|missed|slipped|worse|only/i)).toBeNull();
  });

  it("has nothing to compare a first week against, and says so", async () => {
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES.slice(14), 240)} />);

    expect(screen.getByTestId("recap-delta")).toHaveTextContent(/^Your first week on record$/);
  });

  it("adds the truth when the week ran over the confessed average", async () => {
    // A 30 min/day confession against a week that used 374 minutes.
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES, 30)} />);

    expect(screen.getByTestId("recap-reclaimed")).toHaveTextContent(/^0m$/);
    expect(screen.getByTestId("recap-over")).toHaveTextContent(
      /^This week ran 2h 44m over your old daily average\.$/,
    );
  });

  it("recaps the week without a confession by reporting usage instead", async () => {
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES, null)} />);

    expect(screen.queryByTestId("recap-reclaimed")).toBeNull();
    expect(screen.getByTestId("recap-usage")).toHaveTextContent(/^6h 14m$/);
    expect(screen.getByTestId("recap-delta")).toHaveTextContent(/daily average/);
    // The rest of the week is unaffected by the missing baseline.
    expect(screen.getByTestId("recap-activities")).toHaveTextContent(/^7$/);
  });

  it("reads a week that closed without a streak plainly", async () => {
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES.slice(0, 7), 240)} />);

    expect(screen.getByTestId("recap-streak")).toHaveTextContent(/^None running$/);
  });

  it("reads an entirely restful schedule as a rest week", async () => {
    const schedule: ScheduleRules = {
      recurringRestWeekdays: [0, 1, 2, 3, 4, 5, 6],
      holidays: [],
      overrides: [],
    };
    const restfulRecap = buildRecap(FIXTURE_DAY_SUMMARIES, {
      confessedDailyMinutes: 240,
      classifyDay: (dayIndex) =>
        classifyScheduleDay({ dayIndex, schedule }),
    })!;

    await render(<RecapCard recap={restfulRecap} />);

    expect(screen.getByTestId("recap-active-days")).toHaveTextContent(
      /^Rest week$/,
    );
    expect(screen.queryByText(/missed|failed|should have/i)).toBeNull();
  });
});
