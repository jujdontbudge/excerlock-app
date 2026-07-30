import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react-native";

import {
  classifyScheduleDay,
  type ScheduleRules,
} from "@/schedule";
import { MockShareCardModule } from "@/shareCards";

import { RecapCard } from "../components";
import {
  FIXTURE_CONDITION_NAMES,
  FIXTURE_DAY_SUMMARIES,
} from "../fixtures";
import { buildRecap, conditionNameMap } from "../model";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const recap = (
  days: readonly (typeof FIXTURE_DAY_SUMMARIES)[number][],
  confessedDailyMinutes: number | null,
) =>
  buildRecap(days, {
    confessedDailyMinutes,
    conditionNames: FIXTURE_CONDITION_NAMES,
  })!;

describe("RecapCard", () => {
  it("renders the PRD's five rows for the week it covers", async () => {
    await render(<RecapCard recap={recap(FIXTURE_DAY_SUMMARIES, 240)} />);

    expect(screen.getByText(/20–26 Jul/)).toBeOnTheScreen();
    // ① 1306 minutes reclaimed, 44 more than last week's 1262.
    expect(screen.getByTestId("recap-reclaimed")).toHaveTextContent(/^21h 46m$/);
    expect(screen.getByTestId("recap-delta")).toHaveTextContent(/^44m more than last week$/);
    // ② ③ ④ ⑤
    expect(screen.getByTestId("recap-active-days")).toHaveTextContent(/^6 of 7 days$/);
    expect(screen.getByTestId("recap-activities")).toHaveTextContent(
      /^7 earns · most from Gym visit$/,
    );
    expect(screen.getByTestId("recap-earned-spent")).toHaveTextContent(/^3h 41m · 6h 14m$/);
    expect(screen.getByTestId("recap-streak")).toHaveTextContent(/^5 days$/);
  });

  it("breaks level top sources by first-qualified time, including zero", async () => {
    const templateDay = FIXTURE_DAY_SUMMARIES.at(-1)!;
    const tiedDay = {
      ...templateDay,
      dayIndex: 0,
      dayStartMs: 0,
      earnedMinutes: 60,
      conditions: {
        "later-gym": {
          eventsFired: 1,
          rateMinutes: 0,
          stateSustainedMinutes: 0,
          earnedMinutes: 30,
          meaningfulActivity: true,
          firstQualifiedAtMs: 10,
        },
        "first-steps": {
          eventsFired: 1,
          rateMinutes: 0,
          stateSustainedMinutes: 0,
          earnedMinutes: 30,
          meaningfulActivity: true,
          firstQualifiedAtMs: 0,
        },
      },
      meaningfulActivity: true,
      meaningfulConditionCount: 2,
    };
    const tiedRecap = buildRecap([tiedDay], {
      confessedDailyMinutes: 240,
      conditionNames: conditionNameMap([
        { id: "later-gym", catalogId: "gym-arrival" },
        { id: "first-steps", catalogId: "steps-goal" },
      ]),
    })!;

    await render(<RecapCard recap={tiedRecap} />);

    expect(screen.getByTestId("recap-activities")).toHaveTextContent(
      /^2 earns · most from Step goal$/,
    );
  });

  it("does not claim a top source when any attribution was not recorded", async () => {
    const templateDay = FIXTURE_DAY_SUMMARIES.at(-1)!;
    const legacyDay = {
      ...templateDay,
      earnedMinutes: 10,
      conditions: {
        "recorded-gym": {
          eventsFired: 1,
          rateMinutes: 0,
          stateSustainedMinutes: 0,
          earnedMinutes: 10,
          meaningfulActivity: true,
          firstQualifiedAtMs: 10,
        },
        "legacy-steps": {
          eventsFired: 1,
          rateMinutes: 0,
          stateSustainedMinutes: 0,
          meaningfulActivity: true,
          firstQualifiedAtMs: 0,
        },
      },
      meaningfulActivity: true,
      meaningfulConditionCount: 2,
    };
    const legacyRecap = buildRecap([legacyDay], {
      confessedDailyMinutes: 240,
      conditionNames: conditionNameMap([
        { id: "recorded-gym", catalogId: "gym-arrival" },
        { id: "legacy-steps", catalogId: "steps-goal" },
      ]),
    })!;

    await render(<RecapCard recap={legacyRecap} />);

    expect(screen.getByTestId("recap-activities")).toHaveTextContent(
      /^2 earns$/,
    );
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
    expect(screen.getByTestId("recap-activities")).toHaveTextContent(
      /^7 earns · most from Gym visit$/,
    );
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

  it("projects the full recap into a privacy-safe card and runs the mocked share flow", async () => {
    const shareCards = new MockShareCardModule();
    await render(
      <RecapCard
        recap={recap(FIXTURE_DAY_SUMMARIES, 240)}
        shareCardModule={shareCards}
      />,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Share" }));
    const canvas = screen.getByTestId("share-card-canvas");
    const card = within(canvas);
    expect(card.getByTestId("share-reclaimed")).toHaveTextContent(/^21h 46m$/);
    expect(card.getByTestId("share-active-days")).toHaveTextContent(/^6 of 7 active days$/);
    expect(card.getByTestId("share-earn-count")).toHaveTextContent(/^7 earns$/);
    // Negative control witnessed 2026-07-30: a temporary projection appended
    // `topSourceName`, and this exact assertion rejected the rendered
    // "20–26 Jul · Gym visit" leak. The recap row may name a source; the share
    // card may not.
    expect(card.queryByText(/Gym visit/i)).toBeNull();

    await fireEvent.press(screen.getByRole("button", { name: "Feed · 1:1" }));
    await fireEvent.press(screen.getByRole("button", { name: "Share card" }));
    await waitFor(() => expect(shareCards.getPresentedCards()).toHaveLength(1));
    expect(shareCards.getPresentedCards()[0]).toMatchObject({
      template: "recap",
      ratio: "feed",
    });
  });
});
