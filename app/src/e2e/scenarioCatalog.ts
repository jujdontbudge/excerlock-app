import baselineFreshInstallJson from "../../../e2e/scenarios/baseline-fresh-install.json";
import balanceDrainJson from "../../../e2e/scenarios/balance-drain.json";
import screentimePermissionJson from "../../../e2e/scenarios/screentime-permission.json";

import { parseScenarioManifest } from "./parseScenarioManifest";
import type { ScenarioManifest } from "./scenarioTypes";

export const SCENARIO_NAMES = [
  "baseline-fresh-install",
  "balance-drain",
  "screentime-permission",
] as const;

const SCENARIOS: Readonly<Record<(typeof SCENARIO_NAMES)[number], ScenarioManifest>> = {
  "baseline-fresh-install": parseScenarioManifest(
    "baseline-fresh-install",
    baselineFreshInstallJson,
  ),
  "balance-drain": parseScenarioManifest(
    "balance-drain",
    balanceDrainJson,
  ),
  "screentime-permission": parseScenarioManifest(
    "screentime-permission",
    screentimePermissionJson,
  ),
};

export function getScenarioManifest(name: string): ScenarioManifest {
  const scenario = SCENARIOS[name as (typeof SCENARIO_NAMES)[number]];
  if (scenario === undefined) {
    throw new Error(`Unknown E2E scenario "${name}"`);
  }
  return scenario;
}
