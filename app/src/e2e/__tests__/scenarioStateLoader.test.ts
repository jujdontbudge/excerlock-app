jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import { DEFAULT_HOME_STATE, useHomeStore } from "@/home";
import {
  DEFAULT_ONBOARDING_PROGRESS,
  useOnboardingStore,
} from "@/onboarding";

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
  });

  it("resets and preloads the complete deterministic app state", async () => {
    useHomeStore.setState({
      connectedSources: ["oura"],
      savedPlaces: [{ id: "stale", name: "Old gym" }],
    });
    useOnboardingStore.setState({ isComplete: false });

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
