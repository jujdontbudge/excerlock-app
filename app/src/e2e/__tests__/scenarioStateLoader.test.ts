jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";
import {
  DEFAULT_CONFESSION,
  DEFAULT_ONBOARDING_PROGRESS,
  useConfessionStore,
  useOnboardingStore,
} from "@/onboarding";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  useNotificationPreferencesStore,
} from "@/notifications";
import {
  ALL_DAYS_ACTIVE,
  useScheduleStore,
} from "@/schedule";
import {
  DEFAULT_SETTINGS,
  useSettingsStore,
} from "@/settings";

import {
  getScenarioManifest,
  loadScenarioState,
  parseScenarioManifest,
} from "..";

function statefulScenario() {
  const baseline = getScenarioManifest("baseline-fresh-install");
  return parseScenarioManifest("baseline-fresh-install", {
    ...baseline,
    state: {
      ...baseline.state,
      onboarding: "complete",
      entitlement: "premium",
      ledger: {
        baseAllowanceMinutes: 75,
        journal: [
          {
            kind: "drainTick",
            source: "screentime",
            id: "tick-1",
            atMs: Date.parse(baseline.clock.now) - 60_000,
            minutes: 1,
          },
        ],
      },
      conditions: [
        {
          kind: "event",
          signal: "steps",
          source: "health",
          threshold: 5_000,
          reward: { type: "fixedChunk", minutes: 20 },
        },
      ],
      shield: { armedMonitors: ["dayBoundary", "balanceDrain"] },
      vendors: {
        strava: "connected",
        oura: "disconnected",
        whoop: "error",
        polar: "connecting",
      },
    },
  });
}

describe("E2E scenario state loader", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useHomeStore.setState(DEFAULT_HOME_STATE);
    useOnboardingStore.setState(DEFAULT_ONBOARDING_PROGRESS);
    useConfessionStore.setState(DEFAULT_CONFESSION);
    useNotificationPreferencesStore.setState(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    useScheduleStore.setState(ALL_DAYS_ACTIVE);
    useSettingsStore.setState(DEFAULT_SETTINGS);
  });

  it("resets and preloads the complete deterministic app state", async () => {
    useHomeStore.setState({
      connectedSources: ["oura"],
      savedPlaces: [{ id: "stale", name: "Old gym" }],
    });
    useOnboardingStore.setState({ isComplete: false });
    useConfessionStore.setState({ confessedDailyMinutes: 300 });
    useNotificationPreferencesStore.setState({
      enabled: {
        afternoonNudge: true,
        streakLastCall: true,
        weeklyRecap: true,
      },
      afternoonNudgeMinuteOfDay: 13 * 60,
    });
    useScheduleStore.setState({
      recurringRestWeekdays: [0],
      holidays: [],
      overrides: [],
    });
    useSettingsStore.setState({
      walkAndScrollGracePeriodSeconds: 60,
    });

    const loaded = await loadScenarioState(statefulScenario());

    expect(useHomeStore.getState()).toMatchObject({
      ledgerConfig: {
        baseAllowanceMinutes: 75,
        dayBoundaryOffsetMinutes: 0,
        rollover: null,
      },
      journal: {
        entries: [
          {
            kind: "drainTick",
            source: "screentime",
            id: "tick-1",
            minutes: 1,
          },
        ],
      },
      conditions: [
        {
          id: "e2e-condition-1",
          catalogId: "steps-goal",
          source: "appleHealth",
          settings: {
            kind: "event",
            threshold: 5_000,
            reward: { type: "fixedMinutes", minutes: 20 },
            repeatable: false,
            perDayCap: null,
            cooldownMs: 0,
          },
        },
      ],
      connectedSources: ["strava"],
      savedPlaces: [],
    });
    expect(useOnboardingStore.getState()).toMatchObject({
      isComplete: true,
    });
    expect(useConfessionStore.getState()).toMatchObject(
      DEFAULT_CONFESSION,
    );
    expect(useNotificationPreferencesStore.getState()).toMatchObject(
      DEFAULT_NOTIFICATION_PREFERENCES,
    );
    expect(useScheduleStore.getState()).toMatchObject(
      ALL_DAYS_ACTIVE,
    );
    expect(useSettingsStore.getState()).toMatchObject(DEFAULT_SETTINGS);
    expect(loaded).toMatchObject({
      scenarioName: "baseline-fresh-install",
      entitlement: "premium",
      armedMonitors: ["dayBoundary", "balanceDrain"],
      vendors: {
        strava: "connected",
        oura: "disconnected",
        whoop: "error",
        polar: "connecting",
      },
    });

    await loadScenarioState(statefulScenario());

    expect(useHomeStore.getState().journal.entries).toHaveLength(1);
    expect(useHomeStore.getState().conditions).toHaveLength(1);
  });
});
