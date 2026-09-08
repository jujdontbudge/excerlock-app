import gymEnterExitJson from "./fixtures/gym-enter-exit.json";
import quietJson from "./fixtures/quiet.json";
import regionBlipJson from "./fixtures/region-blip.json";
import type { LocationFixtureManifest } from "./fixtureManifest";

export const LOCATION_FIXTURE_NAMES = [
  "gym-enter-exit",
  "region-blip",
  "quiet",
] as const;

export type LocationFixtureName = (typeof LOCATION_FIXTURE_NAMES)[number];

export const LOCATION_FIXTURES: Readonly<
  Record<LocationFixtureName, LocationFixtureManifest>
> = {
  "gym-enter-exit": gymEnterExitJson as LocationFixtureManifest,
  "region-blip": regionBlipJson as LocationFixtureManifest,
  quiet: quietJson as LocationFixtureManifest,
};

export function getLocationFixture(
  name: LocationFixtureName,
): LocationFixtureManifest {
  return LOCATION_FIXTURES[name];
}
