import { FIXTURE_CONDITIONS, FIXTURE_DAY_SUMMARIES } from "../fixtures";
import { selectConditionBreakdown } from "../model";

const CONDITION_NAMES = Object.fromEntries(
  Object.values(FIXTURE_CONDITIONS).map(({ id, label }) => [id, label]),
);

describe("selectConditionBreakdown", () => {
  it("sums banked minutes independently over the fixture week and month windows", () => {
    const week = selectConditionBreakdown(
      FIXTURE_DAY_SUMMARIES.slice(14),
      CONDITION_NAMES,
    );
    const month = selectConditionBreakdown(FIXTURE_DAY_SUMMARIES, CONDITION_NAMES);

    expect({ week, month }).toEqual({
      week: [
        {
          conditionId: FIXTURE_CONDITIONS.gym.id,
          name: FIXTURE_CONDITIONS.gym.label,
          status: "recorded",
          earnedMinutes: 135,
        },
        {
          conditionId: FIXTURE_CONDITIONS.run.id,
          name: FIXTURE_CONDITIONS.run.label,
          status: "recorded",
          earnedMinutes: 77,
        },
        {
          conditionId: FIXTURE_CONDITIONS.steps.id,
          name: FIXTURE_CONDITIONS.steps.label,
          status: "recorded",
          earnedMinutes: 9,
        },
        {
          conditionId: FIXTURE_CONDITIONS.desk.id,
          name: FIXTURE_CONDITIONS.desk.label,
          status: "recorded",
          earnedMinutes: 0,
        },
      ],
      month: [
        {
          conditionId: FIXTURE_CONDITIONS.gym.id,
          name: FIXTURE_CONDITIONS.gym.label,
          status: "recorded",
          earnedMinutes: 315,
        },
        {
          conditionId: FIXTURE_CONDITIONS.run.id,
          name: FIXTURE_CONDITIONS.run.label,
          status: "recorded",
          earnedMinutes: 230,
        },
        {
          conditionId: FIXTURE_CONDITIONS.steps.id,
          name: FIXTURE_CONDITIONS.steps.label,
          status: "recorded",
          earnedMinutes: 50,
        },
        {
          conditionId: FIXTURE_CONDITIONS.desk.id,
          name: FIXTURE_CONDITIONS.desk.label,
          status: "recorded",
          earnedMinutes: 0,
        },
      ],
    });
  });

  it("keeps missing historical attribution distinct from a recorded zero", () => {
    const source = FIXTURE_DAY_SUMMARIES[14];
    const gym = source.conditions[FIXTURE_CONDITIONS.gym.id];
    const { earnedMinutes: _missing, ...legacyGym } = gym;
    const legacyDay = {
      ...source,
      conditions: {
        ...source.conditions,
        [FIXTURE_CONDITIONS.gym.id]: legacyGym,
      },
    };

    const breakdown = selectConditionBreakdown(
      [legacyDay, ...FIXTURE_DAY_SUMMARIES.slice(15)],
      CONDITION_NAMES,
    );

    expect({
      missing: breakdown.find(
        ({ conditionId }) => conditionId === FIXTURE_CONDITIONS.gym.id,
      ),
      zero: breakdown.find(
        ({ conditionId }) => conditionId === FIXTURE_CONDITIONS.desk.id,
      ),
    }).toEqual({
      missing: {
        conditionId: FIXTURE_CONDITIONS.gym.id,
        name: FIXTURE_CONDITIONS.gym.label,
        status: "notRecorded",
        earnedMinutes: null,
      },
      zero: {
        conditionId: FIXTURE_CONDITIONS.desk.id,
        name: FIXTURE_CONDITIONS.desk.label,
        status: "recorded",
        earnedMinutes: 0,
      },
    });
  });
});
