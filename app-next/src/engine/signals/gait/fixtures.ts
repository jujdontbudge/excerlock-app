import realWalkGroupJson from "./fixtures/real-walk-group.json";
import realWalkSingleJson from "./fixtures/real-walk-single.json";
import type { GaitKeypointSample } from "./GaitVisionProvider";

/**
 * Gait fixtures extracted from real footage by `tools/gait-fixture-extractor`,
 * which runs the same Vision request as the on-device module. Unlike synthetic
 * samples these carry real pose jitter, so they exercise the detector against
 * the signal quality it actually receives.
 */
export interface GaitFixture {
  readonly source: string;
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly license: string;
  readonly description: string;
  readonly extraction: string;
  readonly samples: readonly GaitKeypointSample[];
}

export const GAIT_FIXTURE_NAMES = [
  "real-walk-single",
  "real-walk-group",
] as const;

export type GaitFixtureName = (typeof GAIT_FIXTURE_NAMES)[number];

export const GAIT_FIXTURES: Readonly<Record<GaitFixtureName, GaitFixture>> = {
  "real-walk-single": realWalkSingleJson as GaitFixture,
  "real-walk-group": realWalkGroupJson as GaitFixture,
};

export function getGaitFixture(name: GaitFixtureName): GaitFixture {
  return GAIT_FIXTURES[name];
}
