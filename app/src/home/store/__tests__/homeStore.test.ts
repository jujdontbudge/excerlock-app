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
