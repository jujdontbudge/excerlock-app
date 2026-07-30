import {
  CONDITION_CATALOG,
  type CatalogId,
  type ConditionSource,
  type ConfiguredCondition,
} from "@excerlock/condition-model";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  DEFAULT_HOME_STATE,
  useHomeStore,
} from "@/home";
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
import type { Vendor } from "@/signals";
import {
  DEFAULT_SETTINGS,
  useSettingsStore,
} from "@/settings";

import type {
  ScenarioCondition,
  ScenarioConditionSource,
  ScenarioManifest,
  ScenarioVendorState,
} from "./scenarioTypes";

export type LoadedScenarioState = Readonly<{
  scenarioName: string;
  entitlement: ScenarioManifest["state"]["entitlement"];
  armedMonitors: readonly string[];
  vendors: Readonly<Record<Vendor, ScenarioVendorState>>;
}>;

export async function loadScenarioState(
  scenario: ScenarioManifest,
): Promise<LoadedScenarioState> {
  await AsyncStorage.clear();

  useConfessionStore.setState(DEFAULT_CONFESSION);
  useNotificationPreferencesStore.setState(
    DEFAULT_NOTIFICATION_PREFERENCES,
  );
  useScheduleStore.setState(ALL_DAYS_ACTIVE);
  useSettingsStore.setState(DEFAULT_SETTINGS);
  useHomeStore.setState({
    ...DEFAULT_HOME_STATE,
    conditions: scenario.state.conditions.map(toConfiguredCondition),
    journal: { entries: scenario.state.ledger.journal },
    ledgerConfig: {
      ...DEFAULT_HOME_STATE.ledgerConfig,
      baseAllowanceMinutes:
        scenario.state.ledger.baseAllowanceMinutes,
    },
    connectedSources: Object.entries(scenario.state.vendors)
      .filter(([, state]) => state === "connected")
      .map(([vendor]) => vendor as Vendor),
  });
  useOnboardingStore.setState({
    ...DEFAULT_ONBOARDING_PROGRESS,
    isComplete: scenario.state.onboarding === "complete",
  });

  return Object.freeze({
    scenarioName: scenario.name,
    entitlement: scenario.state.entitlement,
    armedMonitors: Object.freeze([
      ...scenario.state.shield.armedMonitors,
    ]),
    vendors: Object.freeze({ ...scenario.state.vendors }),
  });
}

function toConfiguredCondition(
  condition: ScenarioCondition,
  index: number,
): ConfiguredCondition {
  const source = toConditionSource(condition.source);
  const catalog = CONDITION_CATALOG.find(
    (entry) =>
      entry.kind === condition.kind &&
      entry.signal === condition.signal &&
      entry.baseSources.includes(source),
  );
  if (catalog === undefined) {
    throw new Error(
      `Invalid E2E scenario condition ${condition.kind}/${condition.signal}/${condition.source}`,
    );
  }

  const base = {
    id: `e2e-condition-${index + 1}`,
    catalogId: catalog.id as CatalogId,
    source,
    ...(condition.placeId === undefined
      ? {}
      : { placeId: condition.placeId }),
  };
  switch (condition.kind) {
    case "event":
      return {
        ...base,
        settings: {
          kind: "event",
          ...(condition.threshold === undefined
            ? {}
            : { threshold: condition.threshold }),
          reward:
            condition.reward.type === "fixedChunk"
              ? {
                  type: "fixedMinutes" as const,
                  minutes: condition.reward.minutes,
                }
              : condition.reward.type === "setPeriod"
                ? {
                    type: "setPeriod" as const,
                    durationMinutes: condition.reward.minutes,
                  }
                : { type: "restOfDay" as const },
          repeatable: false,
          perDayCap: null,
          cooldownMs: 0,
        },
      };
    case "rate":
      return {
        ...base,
        settings: {
          kind: "rate",
          reward: condition.reward,
        },
      };
    case "state":
      return {
        ...base,
        settings: {
          kind: "state",
          reward: condition.reward,
          exitGraceMs: condition.exitGraceMs,
        },
      };
  }
}

function toConditionSource(
  source: ScenarioConditionSource,
): ConditionSource {
  return source === "health" ? "appleHealth" : source;
}
