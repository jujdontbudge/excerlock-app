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
