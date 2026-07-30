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

test("Analysis flow covers recorded history and period controls", async () => {
  const flow = await read("flows/analysis-recorded-history.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(
    flow,
    /excerlock:\/\/e2e\/scenario\/\$\{SCENARIO\}\?overrides=\$\{SCENARIO_OVERRIDES\}/,
  );
  assert.match(flow, /id: earned-spent-card/);
  assert.match(flow, /id: earned-total/);
  assert.match(flow, /id: spent-total/);
  assert.match(flow, /tapOn: Month/);
  assert.match(flow, /id: condition-breakdown-card/);
  assert.match(flow, /id: day-ledger/);
  assert.match(flow, /takeScreenshot: analysis-recorded-history/);
});

test("Settings flow covers persisted grace and signed-out versus signed-in", async () => {
  const flow = await read("flows/settings-account.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(flow, /id: settings-screen/);
  assert.match(flow, /No grace period selected/);
  assert.match(flow, /Selected grace period: 2 minutes/);
  assert.match(flow, /Signed out/);
  assert.match(flow, /tapOn: Sign in/);
  assert.match(flow, /member@excerlock\.test/);
  assert.match(flow, /tapOn: Sign out/);
  assert.match(flow, /takeScreenshot: settings-signed-out/);
});

test("Settings flow covers notification opt-in and support submissions", async () => {
  const flow = await read("flows/settings-notifications-support.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(flow, /id: notification-settings-card/);
  assert.match(flow, /id: notification-toggle-afternoonNudge/);
  assert.match(flow, /id: notification-permission-primer/);
  assert.match(flow, /Allow notifications/);
  assert.match(flow, /id: support-composer/);
  assert.match(flow, /Send support request/);
  assert.match(flow, /Submit feature request/);
  assert.match(flow, /Vote for E2E dashboard/);
  assert.match(flow, /takeScreenshot: settings-support-history/);
});

test("Onboarding flow covers every rail screen with premium entitlement", async () => {
  const flow = await read("flows/onboarding-premium.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(
    flow,
    /excerlock:\/\/e2e\/scenario\/\$\{SCENARIO\}\?overrides=\$\{SCENARIO_OVERRIDES\}/,
  );
  [
    "Earn your screen time",
    "How much time do you spend on your phone each day?",
    "That's ~76 days a year",
    "Screen Time keeps your choices honest",
    "Pick the apps that can wait",
    "Your ExcerLock plan is active",
    "Create your account",
  ].forEach((copy) => assert.match(flow, new RegExp(escapeRegExp(copy))));
  assert.match(flow, /tapOn: Create account/);
  assert.match(flow, /id: home-screen/);
  assert.match(flow, /takeScreenshot: onboarding-premium-paywall/);
});

test("Paywall flow covers free entitlement and a monthly purchase", async () => {
  const flow = await read("flows/paywall-free-tier.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(
    flow,
    /excerlock:\/\/e2e\/scenario\/\$\{SCENARIO\}\?overrides=\$\{SCENARIO_OVERRIDES\}/,
  );
  assert.match(flow, /Unlock the full ExcerLock plan/);
  assert.match(flow, /Annual, \$59\.99 \/ year/);
  assert.match(flow, /Monthly, \$9\.99 \/ month/);
  assert.match(flow, /Continue with monthly/);
  assert.match(flow, /takeScreenshot: paywall-free-monthly/);
  assert.match(flow, /Create your account/);
});

test("Locked-apps flow covers shields, an active window, and Full Lock", async () => {
  const flow = await read("flows/locked-apps-states.yaml");

  assert.match(flow, new RegExp(`^appId: ${APP_ID}$`, "m"));
  assert.match(flow, new RegExp(`^  SCENARIO: ${BUNDLED_SCENARIO}$`, "m"));
  assert.match(flow, /openLink:\n    link: excerlock:\/\/locked-apps/);
  assert.match(flow, /id: lock-screen/);
  assert.match(flow, /Time's up — for now\./);
  assert.match(flow, /Add lock window/);
  assert.match(flow, /Apps are asleep\./);
  assert.match(flow, /Full Lock is off/);
  assert.match(flow, /Yes, turn it on/);
  assert.match(flow, /Full Lock is on/);
  assert.match(flow, /Move first, scroll after\./);
  assert.match(flow, /takeScreenshot: locked-apps-full-lock/);
});

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
