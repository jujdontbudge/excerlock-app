import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const CHECKLIST = new URL("../DEVICE-SMOKE.md", import.meta.url);
const RESULTS = new URL("../DEVICE-SMOKE-RESULTS.md", import.meta.url);

test("device smoke checklist preserves every Phase 3 hardware gap", async () => {
  const checklist = await readFile(CHECKLIST, "utf8");

  for (const required of [
    /FamilyControls authorization/i,
    /FamilyActivityPicker/i,
    /shield applies/i,
    /shield lifts on earn/i,
    /15-minute.*re-arm/is,
    /notification tap-through/i,
    /real HealthKit read/i,
    /cold-launch.*background delivery/is,
    /classification latency/i,
    /treadmill/i,
    /force-quit/i,
    /geofence arrival/i,
    /terminated-app region wake/i,
    /30-second confirmation/i,
    /blue.*location indicator/is,
    /Walk & Scroll start.*stop/is,
  ]) {
    assert.match(checklist, required);
  }

  assert.match(checklist, /EXPO_NO_DOTENV=1 EXPO_PUBLIC_E2E=0/);
  assert.match(checklist, /npx expo run:ios --device/);
  assert.match(checklist, /iOS 17\.4/);
  assert.match(checklist, /balance-empty variant/i);
  assert.match(checklist, /Apple does not expose per-type read permission/i);
});

test("recorded results cannot imply an unavailable device run", async () => {
  const results = await readFile(RESULTS, "utf8");
  const normalized = results.replace(/\n>\s?/g, " ");

  assert.match(normalized, /no connected physical iPhone/i);
  assert.match(normalized, /NOT RUN/i);
  assert.match(normalized, /generic.*iphoneOS.*PASS/is);
  assert.match(normalized, /EAS project.*not configured/is);
  assert.match(normalized, /geofence.*no production caller/is);
  assert.match(normalized, /Walk Session.*no production caller/is);
  assert.doesNotMatch(normalized, /physical-device.*(passed|verified)/i);
});
