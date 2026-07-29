import noneConnectedJson from "./fixtures/none-connected.json";
import ouraDailyActivityJson from "./fixtures/oura-daily-activity.json";
import polarUnflaggedManualJson from "./fixtures/polar-unflagged-manual.json";
import stravaManualEntryJson from "./fixtures/strava-manual-entry.json";
import stravaMorningRunJson from "./fixtures/strava-morning-run.json";
import stravaTrainerRideJson from "./fixtures/strava-trainer-ride.json";
import whoopPendingScoreJson from "./fixtures/whoop-pending-score.json";
import type { VendorFixtureManifest } from "./fixtureManifest";

export const VENDOR_FIXTURE_NAMES = [
  "strava-morning-run",
  "strava-manual-entry",
  "strava-trainer-ride",
  "whoop-pending-score",
  "polar-unflagged-manual",
  "oura-daily-activity",
  "none-connected",
] as const;

export type VendorFixtureName = (typeof VENDOR_FIXTURE_NAMES)[number];

export const VENDOR_FIXTURES: Readonly<
  Record<VendorFixtureName, VendorFixtureManifest>
> = {
  "strava-morning-run": stravaMorningRunJson as VendorFixtureManifest,
  "strava-manual-entry": stravaManualEntryJson as VendorFixtureManifest,
  "strava-trainer-ride": stravaTrainerRideJson as VendorFixtureManifest,
  "whoop-pending-score": whoopPendingScoreJson as VendorFixtureManifest,
  "polar-unflagged-manual": polarUnflaggedManualJson as VendorFixtureManifest,
  "oura-daily-activity": ouraDailyActivityJson as VendorFixtureManifest,
  "none-connected": noneConnectedJson as VendorFixtureManifest,
};

export function getVendorFixture(
  name: VendorFixtureName,
): VendorFixtureManifest {
  return VENDOR_FIXTURES[name];
}
