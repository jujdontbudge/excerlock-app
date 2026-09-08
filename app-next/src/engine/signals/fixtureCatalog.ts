import { HEALTH_FIXTURES } from "./health";
import type { HealthFixtureManifest } from "./health";
import { LOCATION_FIXTURES } from "./location";
import type { LocationFixtureManifest } from "./location";
import { MOTION_FIXTURES } from "./motion";
import type { MotionFixtureManifest } from "./motion";

export type SignalDomain =
  | "health"
  | "motion"
  | "location";

export type SignalFixtureManifest =
  | HealthFixtureManifest
  | MotionFixtureManifest
  | LocationFixtureManifest;

export const SIGNAL_FIXTURE_CATALOG = {
  health: HEALTH_FIXTURES,
  motion: MOTION_FIXTURES,
  location: LOCATION_FIXTURES,
} as const;

export function getSignalFixture(
  domain: SignalDomain,
  name: string,
): SignalFixtureManifest {
  const catalog = SIGNAL_FIXTURE_CATALOG[domain] as Readonly<
    Record<string, SignalFixtureManifest | undefined>
  >;
  const fixture = catalog[name];
  if (fixture === undefined) {
    throw new Error(`Unknown ${domain} fixture "${name}"`);
  }
  return fixture;
}
