jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import type { ConfiguredCondition } from "@excerlock/condition-model";
import { remainingMinutes } from "@excerlock/ledger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { waitFor } from "@testing-library/react-native";

import {
  DEFAULT_HOME_STATE,
  HOME_STORAGE_KEY,
  selectActiveConditions,
  selectPickerContext,
  useHomeStore,
} from "../homeStore";

const NOON = 12 * 60 * 60 * 1_000;

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
  settings: { kind: "state", reward: { type: "sustainedUnlock" }, exitGraceMs: 120_000 },
};

describe("useHomeStore", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
  });

  it("starts with no conditions and a Full Lock day", () => {
    const state = useHomeStore.getState();

    expect(state.conditions).toEqual([]);
    expect(state.journal.entries).toEqual([]);
    expect(state.ledgerConfig.baseAllowanceMinutes).toBe(0);
  });

  it("adds a condition", () => {
    useHomeStore.getState().addCondition(stepGoal);

    expect(useHomeStore.getState().conditions).toEqual([stepGoal]);
  });

  it("ignores a second condition with the same id", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().addCondition({ ...stepGoal, source: "strava" });

    expect(useHomeStore.getState().conditions).toEqual([stepGoal]);
  });

  it("removes a condition", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().addCondition(walking);
    useHomeStore.getState().removeCondition("c-event");

    expect(useHomeStore.getState().conditions).toEqual([walking]);
  });

  it("edits a condition in place, keeping its position and its id", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().addCondition(walking);
    const edited = { ...stepGoal, settings: { ...stepGoal.settings, threshold: 4_000 } };
    useHomeStore.getState().updateCondition(edited);

    expect(useHomeStore.getState().conditions).toEqual([edited, walking]);
  });

  it("ignores an edit to a condition that no longer exists", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().updateCondition({ ...walking, id: "gone" });

    expect(useHomeStore.getState().conditions).toEqual([stepGoal]);
  });

  it("starts every condition enabled and disables one on request", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().addCondition(walking);

    expect(selectActiveConditions(useHomeStore.getState())).toEqual([stepGoal, walking]);

    useHomeStore.getState().setConditionEnabled("c-event", false);

    expect(useHomeStore.getState().disabledConditionIds).toEqual(["c-event"]);
    expect(selectActiveConditions(useHomeStore.getState())).toEqual([walking]);
  });

  it("re-enables a condition without duplicating the disabled entry", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().setConditionEnabled("c-event", false);
    useHomeStore.getState().setConditionEnabled("c-event", false);
    useHomeStore.getState().setConditionEnabled("c-event", true);

    expect(useHomeStore.getState().disabledConditionIds).toEqual([]);
    expect(selectActiveConditions(useHomeStore.getState())).toEqual([stepGoal]);
  });

  it("forgets a deleted condition's disabled flag", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().setConditionEnabled("c-event", false);
    useHomeStore.getState().removeCondition("c-event");
    useHomeStore.getState().addCondition(stepGoal);

    expect(useHomeStore.getState().disabledConditionIds).toEqual([]);
  });

  it("refuses to bank a payout for a disabled condition", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().setConditionEnabled("c-event", false);
    useHomeStore.getState().recordEventPayout("c-event", NOON);

    expect(useHomeStore.getState().journal.entries).toEqual([]);
  });

  it("keeps a disabled condition in the picker context — off is not deleted", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().setConditionEnabled("c-event", false);

    expect(selectPickerContext(useHomeStore.getState()).conditions).toHaveLength(1);
  });

  it("banks an event condition's payout into the journal", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().recordEventPayout("c-event", NOON);

    const { journal, ledgerConfig } = useHomeStore.getState();
    expect(remainingMinutes(journal, ledgerConfig, NOON)).toBe(30);
  });

  it("pays an event out once per day, however many times it is recorded", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().recordEventPayout("c-event", NOON);
    useHomeStore.getState().recordEventPayout("c-event", NOON + 60_000);

    const { journal, ledgerConfig } = useHomeStore.getState();
    expect(journal.entries).toHaveLength(1);
    expect(remainingMinutes(journal, ledgerConfig, NOON + 60_000)).toBe(30);
  });

  it("refuses to bank a payout for a state condition", () => {
    useHomeStore.getState().addCondition(walking);
    useHomeStore.getState().recordEventPayout("c-state", NOON);

    expect(useHomeStore.getState().journal.entries).toEqual([]);
  });

  it("reports which conditions the ledger fired today", () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().recordEventPayout("c-event", NOON);

    expect(useHomeStore.getState().firedConditionIds(NOON)).toEqual(["c-event"]);
    expect(useHomeStore.getState().firedConditionIds(NOON + 86_400_000)).toEqual([]);
  });

  it("builds the picker context the condition model expects", () => {
    useHomeStore.getState().addCondition(stepGoal);

    expect(selectPickerContext(useHomeStore.getState())).toEqual({
      conditions: [{ id: "c-event", catalogId: "steps-goal", source: "appleHealth" }],
      connectedSources: [],
      savedPlaceIds: [],
    });
  });

  it("persists conditions across a reload", async () => {
    useHomeStore.getState().addCondition(stepGoal);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(HOME_STORAGE_KEY)).toContain("steps-goal");
    });
  });

  it("persists which conditions are switched off", async () => {
    useHomeStore.getState().addCondition(stepGoal);
    useHomeStore.getState().setConditionEnabled("c-event", false);

    await waitFor(async () => {
      expect(await AsyncStorage.getItem(HOME_STORAGE_KEY)).toContain("disabledConditionIds");
    });

    await useHomeStore.persist.rehydrate();

    expect(useHomeStore.getState().disabledConditionIds).toEqual(["c-event"]);
  });

  it("drops persisted disabled ids that are not strings", async () => {
    await useHomeStore.persist.rehydrate();
    useHomeStore.setState(DEFAULT_HOME_STATE);
    await AsyncStorage.setItem(
      HOME_STORAGE_KEY,
      JSON.stringify({
        state: { conditions: [stepGoal], disabledConditionIds: ["c-event", 7] },
        version: 0,
      }),
    );

    await useHomeStore.persist.rehydrate();

    expect(useHomeStore.getState().disabledConditionIds).toEqual(["c-event"]);
  });

  it("drops persisted conditions the catalog no longer knows", async () => {
    await useHomeStore.persist.rehydrate();
    useHomeStore.setState(DEFAULT_HOME_STATE);
    await AsyncStorage.setItem(
      HOME_STORAGE_KEY,
      JSON.stringify({
        state: {
          conditions: [stepGoal, { ...stepGoal, id: "gone", catalogId: "retired-entry" }],
        },
        version: 0,
      }),
    );

    await useHomeStore.persist.rehydrate();

    expect(useHomeStore.getState().conditions).toEqual([stepGoal]);
  });
});
