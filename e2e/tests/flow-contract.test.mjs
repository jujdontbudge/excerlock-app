import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const E2E_ROOT = new URL("../", import.meta.url);
const APP_ID = "com.johansardar.excerlock";
const BUNDLED_SCENARIO = "baseline-fresh-install";

async function read(relativePath) {
  return readFile(new URL(relativePath, E2E_ROOT), "utf8");
}

test("Home flow loads the bundled scenario and covers zero-balance walking", async () => {
  const [flow, scenarioText] = await Promise.all([
    read("flows/smoke-home.yaml"),
    read("scenarios/baseline-fresh-install.json"),
  ]);
  const scenario = JSON.parse(scenarioText);

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(
    flow,
    /excerlock:\/\/e2e\/scenario\/\$\{SCENARIO\}\?overrides=\$\{SCENARIO_OVERRIDES\}/,
  );
  assert.match(flow, /id: home-screen/);
  assert.match(flow, /id: lock-hero-unlocked/);
  assert.match(flow, /Active · apps unlocked/);
  assert.match(flow, /takeScreenshot: home-walking-zero-balance/);

  assert.ok(
    scenario.state.conditions.some(
      (condition) =>
        condition.kind === "state" &&
        condition.signal === "walking" &&
        condition.source === "motion",
    ),
    "the bundled scenario should include the walking condition exercised by Home",
  );
});

test("Manage flow changes the allowance and condition state", async () => {
  const flow = await read("flows/manage-condition.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(flow, /excerlock:\/\/e2e\/scenario\/\$\{SCENARIO\}/);
  assert.match(flow, /id: manage-screen/);
  assert.match(flow, /id: manage-allowance-value/);
  assert.match(flow, /id: manage-toggle-e2e-condition-1/);
  assert.match(flow, /id: manage-switch-label-e2e-condition-1/);
  assert.match(flow, /takeScreenshot: manage-condition-enabled/);
});

test("Analysis flow covers the empty-history state", async () => {
  const flow = await read("flows/analysis-empty-history.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(flow, /excerlock:\/\/e2e\/scenario\/\$\{SCENARIO\}/);
  assert.match(flow, /id: analysis-screen/);
  assert.match(flow, /id: analysis-empty/);
  assert.match(flow, /Nothing to analyse yet/);
  assert.match(flow, /takeScreenshot: analysis-empty-history/);
});
