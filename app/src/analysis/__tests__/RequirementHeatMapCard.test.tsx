import {
  fireEvent,
  render,
  screen,
} from "@testing-library/react-native";

import { RequirementHeatMapCard } from "../components";
import type {
  QualifiedConditionDetail,
  RequirementDayDetail,
  RequirementHeatMap,
  RequirementMetKind,
} from "../model";

function qualified(
  conditionId: string,
  name: string,
  kind: RequirementMetKind,
): QualifiedConditionDetail {
  return {
    conditionId,
    name,
    kind,
    firstQualifiedAtMs: 10,
  };
}

function activeDetail(
  earnedMinutes: number,
  qualifiedConditions: readonly QualifiedConditionDetail[] = [],
): RequirementDayDetail {
  return {
    earnedMinutes,
    qualifiedConditions,
    scheduleDay: { kind: "scheduledActive", isActive: true },
  };
}

const HEAT_MAP = {
  weeks: [
    [
      {
        dayIndex: 1,
        label: "Mon 6 Jul",
        state: "metByEvent",
        qualifiedConditionId: "gym",
        detail: activeDetail(30, [qualified("gym", "Gym visit", "event")]),
      },
      {
        dayIndex: 2,
        label: "Tue 7 Jul",
        state: "metByRate",
        qualifiedConditionId: "run",
        detail: activeDetail(20, [qualified("run", "Morning run", "rate")]),
      },
      {
        dayIndex: 3,
        label: "Wed 8 Jul",
        state: "metByState",
        qualifiedConditionId: "walk",
        detail: activeDetail(0, [qualified("walk", "Walking", "state")]),
      },
      {
        dayIndex: 4,
        label: "Thu 9 Jul",
        state: "missed",
        detail: activeDetail(0),
      },
      {
        dayIndex: 5,
        label: "Fri 10 Jul",
        state: "rest",
        detail: {
          earnedMinutes: 0,
          qualifiedConditions: [],
          scheduleDay: { kind: "rest", isActive: false },
        },
      },
      {
        dayIndex: 6,
        label: "Sat 11 Jul",
        state: "blank",
        blankReason: "future",
      },
      {
        dayIndex: 7,
        label: "Sun 12 Jul",
        state: "blank",
        blankReason: "future",
      },
    ],
  ],
} as const satisfies RequirementHeatMap;

describe("RequirementHeatMapCard", () => {
  it("renders six distinct accessible states with kind glyphs", async () => {
    await render(<RequirementHeatMapCard heatMap={HEAT_MAP} />);

    expect(
      screen.getByRole("button", {
        name: "Mon 6 Jul, requirement met by event",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Tue 7 Jul, requirement met by rate",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Wed 8 Jul, requirement met by state",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Thu 9 Jul, no qualifying activity",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Fri 10 Jul, rest day",
      }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", {
        name: "Sat 11 Jul, future day",
      }),
    ).toBeOnTheScreen();

    expect(screen.getByTestId("requirement-kind-event-1")).toBeOnTheScreen();
    expect(screen.getByTestId("requirement-kind-rate-2")).toBeOnTheScreen();
    expect(screen.getByTestId("requirement-kind-state-3")).toBeOnTheScreen();
  });

  it("opens the selected day detail with what qualified and what was earned", async () => {
    await render(<RequirementHeatMapCard heatMap={HEAT_MAP} />);

    const eventCell = screen.getByRole("button", {
      name: "Mon 6 Jul, requirement met by event",
    });
    await fireEvent.press(eventCell);

    expect(eventCell.props.accessibilityState).toEqual({ selected: true });
    expect(
      screen.getByLabelText(
        "Mon 6 Jul. Requirement met by event. 30m earned. Gym visit, Event.",
      ),
    ).toBeOnTheScreen();
    expect(screen.getByTestId("requirement-day-detail")).toHaveTextContent(
      /^Mon 6 JulRequirement met by event30m earnedGym visit · Event$/,
    );
  });
});
