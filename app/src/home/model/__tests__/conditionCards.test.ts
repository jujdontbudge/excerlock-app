import type { ConfiguredCondition } from "@excerlock/condition-model";

import { toConditionCards } from "../conditionCards";

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

const walking: ConfiguredCondition = {
  id: "c-state",
  catalogId: "walking-state",
  source: "motion",
  settings: {
    kind: "state",
    reward: { type: "sustainedUnlock" },
    exitGraceMs: 120_000,
  },
};

const stepsExchange: ConfiguredCondition = {
  id: "c-rate",
  catalogId: "steps-rate",
  source: "appleHealth",
  settings: {
    kind: "rate",
    reward: { type: "proportionalCredit", minutesPerUnit: 0.02 },
  },
};

const gymArrival: ConfiguredCondition = {
  id: "c-gym",
  catalogId: "gym-arrival",
  source: "location",
  placeId: "gym-home",
  settings: {
    kind: "event",
    reward: { type: "restOfDay" },
    repeatable: false,
    perDayCap: null,
    cooldownMs: 0,
  },
};

const EMPTY_READING = { totals: {}, activeSignals: [] } as const;

describe("toConditionCards", () => {
  it("returns nothing for an empty condition list", () => {
    expect(toConditionCards({ conditions: [], reading: EMPTY_READING })).toEqual([]);
  });

  it("builds an event card with its goal, progress and payout", () => {
    const [card] = toConditionCards({
      conditions: [stepGoal],
      reading: { totals: { steps: 6_240 }, activeSignals: [] },
    });

    expect(card).toMatchObject({
      kind: "event",
      id: "c-event",
      title: "Step goal",
      sourceLabel: "Apple Health",
      goalLabel: "10,000 steps",
      progressLabel: "6,240 of 10,000 steps",
      rewardLabel: "+30 min",
      completed: false,
    });
    expect(card).toHaveProperty("progress", 0.624);
  });

  it("marks an event card completed once the threshold is met", () => {
    const [card] = toConditionCards({
      conditions: [stepGoal],
      reading: { totals: { steps: 12_000 }, activeSignals: [] },
    });

    expect(card).toMatchObject({ completed: true, progress: 1 });
  });

  it("marks an event card completed when the ledger already paid it out today", () => {
    const [card] = toConditionCards({
      conditions: [stepGoal],
      reading: EMPTY_READING,
      firedConditionIds: ["c-event"],
    });

    expect(card).toMatchObject({ completed: true });
  });

  it("leaves a thresholdless event card without a meter and names its place", () => {
    const [card] = toConditionCards({
      conditions: [gymArrival],
      reading: EMPTY_READING,
      placeNames: { "gym-home": "Iron Works" },
    });

    expect(card).toMatchObject({
      kind: "event",
      title: "Arrive at gym",
      sourceLabel: "Iron Works",
      rewardLabel: "Rest of day",
    });
    expect(card).not.toHaveProperty("progressLabel");
  });

  it("builds a live state card while its signal is active", () => {
    const [card] = toConditionCards({
      conditions: [walking],
      reading: { totals: {}, activeSignals: ["walking"] },
    });

    expect(card).toMatchObject({
      kind: "state",
      title: "While walking",
      active: true,
      statusLabel: "Active · apps unlocked",
      graceLabel: "2 min grace",
      startsProppedWalkingSession: true,
    });
  });

  it("builds an idle state card when the signal is not active", () => {
    const [card] = toConditionCards({ conditions: [walking], reading: EMPTY_READING });

    expect(card).toMatchObject({ active: false, statusLabel: "Waiting to start" });
    expect(card).toMatchObject({ startsProppedWalkingSession: true });
  });

  it("marks the walking card that owns the active explicit session", () => {
    const [card] = toConditionCards({
      conditions: [walking],
      reading: EMPTY_READING,
      activeWalkingConditionId: "c-state",
    });

    expect(card).toMatchObject({ hasActiveWalkingSession: true });
  });

  it("builds a rate card as the ratio plus today's banked total", () => {
    const [card] = toConditionCards({
      conditions: [stepsExchange],
      reading: { totals: { steps: 6_240 }, activeSignals: [] },
    });

    expect(card).toMatchObject({
      kind: "rate",
      title: "Steps exchange",
      ratioLabel: "1,000 steps = 20 min",
      meterLabel: "6,240 steps → 2h 4m banked today",
      bankedMinutes: 124.8,
    });
  });

  it("keeps the stored condition order", () => {
    const cards = toConditionCards({
      conditions: [walking, stepGoal, stepsExchange],
      reading: EMPTY_READING,
    });

    expect(cards.map((card) => card.id)).toEqual(["c-state", "c-event", "c-rate"]);
  });
});
