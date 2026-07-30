import {
  FixtureHealthProvider,
  FixtureLocationProvider,
  FixtureMotionProvider,
  FixtureScreenTimeProvider,
  FixtureVendorProvider,
  getSignalFixture,
  type HealthFixtureManifest,
  type LocationFixtureManifest,
  type MotionFixtureManifest,
  type ScreenTimeFixtureManifest,
  type SignalDomain,
  type SignalFixtureManifest,
  type TimelinePlayback,
  type VendorFixtureManifest,
} from "@/signals";

import { PinnedScenarioClock } from "./scenarioClock";
import type { ScenarioManifest } from "./scenarioTypes";

export type FixtureProviders = Readonly<{
  health: FixtureHealthProvider;
  motion: FixtureMotionProvider;
  location: FixtureLocationProvider;
  screentime: FixtureScreenTimeProvider;
  vendor: FixtureVendorProvider;
}>;

export type FixtureProviderComposition = Readonly<{
  clock: PinnedScenarioClock;
  providers: FixtureProviders;
  selectedFixtures: Readonly<Record<SignalDomain, string>>;
  dispose(): void;
}>;

export function createFixtureProviderComposition(
  scenario: ScenarioManifest,
): FixtureProviderComposition {
  const playback = toTimelinePlayback(scenario);
  const providers: FixtureProviders = {
    health: new FixtureHealthProvider(
      combinedFixture("health", scenario) as HealthFixtureManifest,
      playback,
    ),
    motion: new FixtureMotionProvider(
      combinedFixture("motion", scenario) as MotionFixtureManifest,
      playback,
    ),
    location: new FixtureLocationProvider(
      combinedFixture("location", scenario) as LocationFixtureManifest,
      playback,
    ),
    screentime: new FixtureScreenTimeProvider(
      combinedFixture("screentime", scenario) as ScreenTimeFixtureManifest,
      playback,
    ),
    vendor: new FixtureVendorProvider(
      combinedFixture("vendor", scenario) as VendorFixtureManifest,
      playback,
    ),
  };

  return {
    clock: new PinnedScenarioClock(scenario.clock),
    providers,
    selectedFixtures: Object.fromEntries(
      Object.entries(scenario.providers).map(([domain, { fixture }]) => [
        domain,
        fixture,
      ]),
    ) as Record<SignalDomain, string>,
    dispose() {
      Object.values(providers).forEach((provider) => provider.dispose());
    },
  };
}

function combinedFixture(
  domain: SignalDomain,
  scenario: ScenarioManifest,
): SignalFixtureManifest {
  const fixture = getSignalFixture(
    domain,
    scenario.providers[domain].fixture,
  );
  const extraRows = (scenario.timeline ?? []).filter(({ event }) =>
    event.startsWith(`${domain}.`),
  );

  return {
    ...fixture,
    timeline: [...fixture.timeline, ...extraRows].sort(
      (left, right) => left.atMs - right.atMs,
    ),
  } as SignalFixtureManifest;
}

function toTimelinePlayback(
  scenario: ScenarioManifest,
): TimelinePlayback {
  return scenario.clock.playback === "manual"
    ? { mode: "manual" }
    : { mode: "auto", speed: scenario.clock.speed };
}
