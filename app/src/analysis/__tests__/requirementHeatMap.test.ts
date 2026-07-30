import {
  DAY_MS,
  type ConditionDaySummary,
  type DaySummary,
} from "@excerlock/ledger";

import { classifyScheduleDay } from "@/schedule";

import { buildRequirementHeatMap } from "../model";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

const MONDAY = Date.UTC(2026, 6, 6) / DAY_MS;

function condition(
  values: Partial<ConditionDaySummary>,
): ConditionDaySummary {
  return {
    eventsFired: 0,
    rateMinutes: 0,
    stateSustainedMinutes: 0,
    earnedMinutes: 0,
    meaningfulActivity: false,
    ...values,
  };
}

function day(
  dayIndex: number,
  conditions: Readonly<Record<string, ConditionDaySummary>>,
): DaySummary {
  const meaningfulConditionCount = Object.values(conditions).filter(
    ({ meaningfulActivity }) => meaningfulActivity,
  ).length;

  return {
    dayIndex,
    dayStartMs: dayIndex * DAY_MS,
    baseAllowance: 30,
    rolloverIn: 0,
    startBalance: 30,
    endBalance: 30,
    earnedMinutes: 0,
    spentMinutes: 0,
    usageMinutes: 0,
    holidays: [],
    conditions,
    meaningfulActivity: meaningfulConditionCount > 0,
    meaningfulConditionCount,
  };
}

describe("buildRequirementHeatMap", () => {
  it("chooses the smallest defined first-qualified instant, including zero", () => {
    const summary = day(MONDAY, {
      "later-state": condition({
        stateSustainedMinutes: 10,
        firstQualifiedAtMs: 20,
        meaningfulActivity: true,
      }),
      "absent-event": condition({
        eventsFired: 1,
        meaningfulActivity: true,
      }),
      "boundary-rate": condition({
        rateMinutes: 15,
        firstQualifiedAtMs: 0,
        meaningfulActivity: true,
      }),
      "later-event": condition({
        eventsFired: 1,
        firstQualifiedAtMs: 10,
        meaningfulActivity: true,
      }),
    });

    expect(
      buildRequirementHeatMap([summary], {
        throughDayIndex: MONDAY,
      }).weeks[0]?.[0],
    ).toMatchObject({
      dayIndex: MONDAY,
      state: "metByRate",
      qualifiedConditionId: "boundary-rate",
    });
  });

  it("keeps all six requirement states visually addressable in the week", () => {
    const schedule = {
      recurringRestWeekdays: [5],
      holidays: [],
      overrides: [],
    } as const;
    const summaries = [
      day(MONDAY, {
        event: condition({
          eventsFired: 1,
          firstQualifiedAtMs: 10,
          meaningfulActivity: true,
        }),
      }),
      day(MONDAY + 1, {
        rate: condition({
          rateMinutes: 15,
          firstQualifiedAtMs: 20,
          meaningfulActivity: true,
        }),
      }),
      day(MONDAY + 2, {
        state: condition({
          stateSustainedMinutes: 10,
          firstQualifiedAtMs: 30,
          meaningfulActivity: true,
        }),
      }),
      day(MONDAY + 3, {}),
      day(MONDAY + 4, {
        "rest-day-event": condition({
          eventsFired: 1,
          firstQualifiedAtMs: 40,
          meaningfulActivity: true,
        }),
      }),
    ];

    expect(
      buildRequirementHeatMap(summaries, {
        throughDayIndex: MONDAY + 4,
        classifyDay: (dayIndex) =>
          classifyScheduleDay({ dayIndex, schedule }),
      }).weeks[0]?.map(({ state }) => state),
    ).toEqual([
      "metByEvent",
      "metByRate",
      "metByState",
      "missed",
      "rest",
      "blank",
      "blank",
    ]);
  });

  it("pads a mid-week first history with honest before-history and future cells", () => {
    const wednesday = {
      ...day(MONDAY + 2, {
        gym: condition({
          eventsFired: 1,
          earnedMinutes: 25,
          firstQualifiedAtMs: 30,
          meaningfulActivity: true,
        }),
      }),
      earnedMinutes: 25,
    };
    const thursday = day(MONDAY + 3, {});

    const cells = buildRequirementHeatMap([wednesday, thursday], {
      throughDayIndex: MONDAY + 3,
      conditionNames: { gym: "Gym visit" },
    }).weeks[0];

    expect(cells).toMatchObject([
      { state: "blank", blankReason: "beforeHistory" },
      { state: "blank", blankReason: "beforeHistory" },
      {
        state: "metByEvent",
        label: "Wed 8 Jul",
        detail: {
          earnedMinutes: 25,
          qualifiedConditions: [
            {
              conditionId: "gym",
              kind: "event",
              name: "Gym visit",
            },
          ],
        },
      },
      {
        state: "missed",
        label: "Thu 9 Jul",
        detail: {
          earnedMinutes: 0,
          qualifiedConditions: [],
        },
      },
      { state: "blank", blankReason: "future" },
      { state: "blank", blankReason: "future" },
      { state: "blank", blankReason: "future" },
    ]);
  });
});
