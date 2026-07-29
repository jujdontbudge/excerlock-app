import baselineFreshInstallJson from "../../../e2e/scenarios/baseline-fresh-install.json";

import type { ScenarioManifest } from "./scenarioTypes";

export const SCENARIO_NAMES = ["baseline-fresh-install"] as const;

const SCENARIOS: Readonly<Record<(typeof SCENARIO_NAMES)[number], ScenarioManifest>> = {
  "baseline-fresh-install": baselineFreshInstallJson as ScenarioManifest,
};

export function getScenarioManifest(name: string): ScenarioManifest {
  return SCENARIOS[name as (typeof SCENARIO_NAMES)[number]];
}
