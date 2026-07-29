// `@/home`'s public surface reaches its store, and the store reaches storage.
jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";

import { toConditionRows } from "../conditionRows";

const stepGoal: ConfiguredCondition = {
  id: "c-event",
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

const gymArrival: ConfiguredCondition = {
  id: "c-arrival",
  catalogId: "gym-arrival",
  source: "location",
  placeId: "gym-1",
  settings: {
    kind: "event",
    reward: { type: "restOfDay" },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

const walking: ConfiguredCondition = {
  id: "c-state",
  catalogId: "walking-state",
  source: "motion",
  settings: { kind: "state", reward: { type: "sustainedUnlock" }, exitGraceMs: 120_000 },
};

const stepsExchange: ConfiguredCondition = {
  id: "c-rate",
  catalogId: "steps-rate",
  source: "appleHealth",
  settings: { kind: "rate", reward: { type: "proportionalCredit", minutesPerUnit: 0.005 } },
};

describe("toConditionRows", () => {
  it("gives one row per condition, in the order they were built", () => {
    const rows = toConditionRows({ conditions: [stepGoal, walking, stepsExchange] });

    expect(rows.map(({ id }) => id)).toEqual(["c-event", "c-state", "c-rate"]);
  });

  it("names the condition and where its signal comes from", () => {
    const [row] = toConditionRows({ conditions: [stepGoal] });

    expect(row).toMatchObject({ title: "Step goal", sourceLabel: "Apple Health" });
  });

  it("names the saved place for a condition scoped to one", () => {
    const [row] = toConditionRows({
      conditions: [gymArrival],
      placeNames: { "gym-1": "Barry's" },
    });

    expect(row?.sourceLabel).toBe("Barry's");
  });

  it("says what an event with a goal earns, and what it takes", () => {
    const [row] = toConditionRows({ conditions: [stepGoal] });

    expect(row?.earnLabel).toBe("10,000 steps → +30 min");
  });

  it("says what a thresholdless event earns", () => {
    const [row] = toConditionRows({ conditions: [gymArrival] });

    expect(row?.earnLabel).toBe("Rest of day");
  });

  it("says a rate condition's exchange rate", () => {
    const [row] = toConditionRows({ conditions: [stepsExchange] });

    expect(row?.earnLabel).toBe("1,000 steps = 5 min");
  });

  it("says a state condition holds the apps open, and for how long after", () => {
    const [row] = toConditionRows({ conditions: [walking] });

    expect(row?.earnLabel).toBe("Unlocked while active · 2 min grace");
  });

  it("is enabled unless the store says the condition is switched off", () => {
    const rows = toConditionRows({
      conditions: [stepGoal, walking],
      disabledConditionIds: ["c-state"],
    });

    expect(rows.map(({ enabled }) => enabled)).toEqual([true, false]);
  });
});
