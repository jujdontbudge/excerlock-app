import backgroundWakeReplayJson from "./fixtures/background-wake-replay.json";
import dayMixedSourcesJson from "./fixtures/day-mixed-sources.json";
import dayStepsApproaching5kJson from "./fixtures/day-steps-approaching-5k.json";
import manualEntryDayJson from "./fixtures/manual-entry-day.json";
import type { HealthFixtureManifest } from "./fixtureManifest";

export const HEALTH_FIXTURE_NAMES = [
  "day-mixed-sources",
  "manual-entry-day",
  "background-wake-replay",
  "day-steps-approaching-5k",
] as const;

export type HealthFixtureName = (typeof HEALTH_FIXTURE_NAMES)[number];

export const HEALTH_FIXTURES: Readonly<
  Record<HealthFixtureName, HealthFixtureManifest>
> = {
  "day-mixed-sources": dayMixedSourcesJson as HealthFixtureManifest,
  "manual-entry-day": manualEntryDayJson as HealthFixtureManifest,
  "background-wake-replay": backgroundWakeReplayJson as HealthFixtureManifest,
  "day-steps-approaching-5k":
    dayStepsApproaching5kJson as HealthFixtureManifest,
};

export function getHealthFixture(name: HealthFixtureName): HealthFixtureManifest {
  return HEALTH_FIXTURES[name];
}
