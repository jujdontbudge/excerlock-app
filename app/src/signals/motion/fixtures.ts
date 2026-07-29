import deniedPermissionJson from "./fixtures/denied-permission.json";
import driveOffJson from "./fixtures/drive-off.json";
import lateClassificationJson from "./fixtures/late-classification.json";
import redLightJson from "./fixtures/red-light.json";
import shakyCheatJson from "./fixtures/shaky-cheat.json";
import steadyWalkJson from "./fixtures/steady-walk.json";
import stopForGoodJson from "./fixtures/stop-for-good.json";
import type { MotionFixtureManifest } from "./FixtureMotionProvider";

export const MOTION_FIXTURE_NAMES = [
  "steady-walk",
  "red-light",
  "stop-for-good",
  "drive-off",
  "shaky-cheat",
  "late-classification",
  "denied-permission",
] as const;

export type MotionFixtureName = (typeof MOTION_FIXTURE_NAMES)[number];

export const MOTION_FIXTURES: Readonly<
  Record<MotionFixtureName, MotionFixtureManifest>
> = {
  "steady-walk": steadyWalkJson as MotionFixtureManifest,
  "red-light": redLightJson as MotionFixtureManifest,
  "stop-for-good": stopForGoodJson as MotionFixtureManifest,
  "drive-off": driveOffJson as MotionFixtureManifest,
  "shaky-cheat": shakyCheatJson as MotionFixtureManifest,
  "late-classification": lateClassificationJson as MotionFixtureManifest,
  "denied-permission": deniedPermissionJson as MotionFixtureManifest,
};

export function getMotionFixture(name: MotionFixtureName): MotionFixtureManifest {
  return MOTION_FIXTURES[name];
}
