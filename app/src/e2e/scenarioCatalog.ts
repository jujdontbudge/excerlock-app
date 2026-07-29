import baselineFreshInstallJson from "../../../e2e/scenarios/baseline-fresh-install.json";

import { parseScenarioManifest } from "./parseScenarioManifest";
import type { ScenarioManifest } from "./scenarioTypes";

export const SCENARIO_NAMES = ["baseline-fresh-install"] as const;

const SCENARIOS: Readonly<Record<(typeof SCENARIO_NAMES)[number], ScenarioManifest>> = {
  "baseline-fresh-install": parseScenarioManifest(
    "baseline-fresh-install",
    baselineFreshInstallJson,
  ),
};

export function getScenarioManifest(name: string): ScenarioManifest {
  const scenario = SCENARIOS[name as (typeof SCENARIO_NAMES)[number]];
  if (scenario === undefined) {
    throw new Error(`Unknown E2E scenario "${name}"`);
  }
  return scenario;
}
