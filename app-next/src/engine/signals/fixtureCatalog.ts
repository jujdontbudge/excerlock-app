import { HEALTH_FIXTURES } from "./health";
import type { HealthFixtureManifest } from "./health";
import { LOCATION_FIXTURES } from "./location";
import type { LocationFixtureManifest } from "./location";
import { MOTION_FIXTURES } from "./motion";
import type { MotionFixtureManifest } from "./motion";

// T01 port note (B12 port-don't-rewrite, T01 step 1 exclusion): the old
// `signals/screentime` fixture catalog and `signals/vendor` integrations are
// deliberately not ported. Screen Time composition/fakes are owned by T11
// adapters; vendor integrations are out of scope for the native manifest.
// Gait/placement/timeline fixtures resolve through their own domain manifests.
import { GAIT_FIXTURES } from "./gait/fixtures";
import type { GaitFixture } from "./gait/fixtures";

export type SignalDomain = "health" | "motion" | "location" | "gait";

export type SignalFixtureManifest =
  | HealthFixtureManifest
  | MotionFixtureManifest
  | LocationFixtureManifest
  | GaitFixture;

export const SIGNAL_FIXTURE_CATALOG = {
  health: HEALTH_FIXTURES,
  motion: MOTION_FIXTURES,
  location: LOCATION_FIXTURES,
  gait: GAIT_FIXTURES,
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
