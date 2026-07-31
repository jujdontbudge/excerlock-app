export { FixtureMotionProvider } from "./FixtureMotionProvider";
export { MotionFixtureError } from "./MotionFixtureError";
export { NativeMotionProvider } from "./NativeMotionProvider";
export {
  WALK_CADENCE_FRESHNESS_MS,
  WALK_CADENCE_THRESHOLD_STEPS_PER_MINUTE,
  WALK_REQUIRED_QUALIFYING_CADENCE_SAMPLES,
} from "./constants";
export {
  getMotionFixture,
  MOTION_FIXTURE_NAMES,
  MOTION_FIXTURES,
} from "./fixtures";
export { WalkVerifier } from "./WalkVerifier";
export type {
  ExcerlockMotionEvent,
  ExcerlockMotionModuleClient,
  MotionModuleSubscription,
} from "./MotionModuleClient";
export type {
  MotionActivityChangePayload,
  MotionFixtureEvent,
  MotionFixtureManifest,
  MotionFixturePayload,
  MotionPedometerUpdatePayload,
  MotionTimelineRow,
} from "./fixtureManifest";
export { MOTION_FIXTURE_EVENTS } from "./fixtureManifest";
export type { MotionFixtureName } from "./fixtures";
export type {
  ActivityClass,
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
  MotionConfidence,
  MotionProvider,
  Unsubscribe,
} from "./MotionProvider";
export type {
  WalkVerdict,
  WalkVerifierOptions,
} from "./WalkVerifier";
