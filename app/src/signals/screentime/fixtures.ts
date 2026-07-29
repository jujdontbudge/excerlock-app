import reArmRaceJson from "./fixtures/re-arm-race.json";
import tickLadderBasicJson from "./fixtures/tick-ladder-basic.json";
import tickLadderJitterJson from "./fixtures/tick-ladder-jitter.json";
import type { ScreenTimeFixtureManifest } from "./FixtureScreenTimeProvider";

export const SCREENTIME_FIXTURE_NAMES = [
  "tick-ladder-basic",
  "tick-ladder-jitter",
  "re-arm-race",
] as const;

export type ScreenTimeFixtureName =
  (typeof SCREENTIME_FIXTURE_NAMES)[number];

export const SCREENTIME_FIXTURES: Readonly<
  Record<ScreenTimeFixtureName, ScreenTimeFixtureManifest>
> = {
  "tick-ladder-basic": tickLadderBasicJson as ScreenTimeFixtureManifest,
  "tick-ladder-jitter": tickLadderJitterJson as ScreenTimeFixtureManifest,
  "re-arm-race": reArmRaceJson as ScreenTimeFixtureManifest,
};

export function getScreenTimeFixture(
  name: ScreenTimeFixtureName,
): ScreenTimeFixtureManifest {
  return SCREENTIME_FIXTURES[name];
}
