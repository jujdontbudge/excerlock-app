import {
  GAIT_FIXTURE_NAMES,
  getGaitFixture,
  type GaitFixtureName,
} from "../fixtures";
import { GaitPeriodicityDetector } from "../GaitPeriodicityDetector";
import { FixtureGaitVisionProvider } from "../FixtureGaitVisionProvider";
import type { GaitDetectionResult } from "../GaitPeriodicityDetector";

/**
 * These fixtures are real Vision output, not synthesised samples. They exist to
 * catch the failure mode synthetic data cannot show: real pose estimation
 * jitters frame to frame, and a detector tuned on clean signals can read that
 * jitter as strides (or lose real ones).
 */
function runScan(name: GaitFixtureName): GaitDetectionResult {
  const { samples } = getGaitFixture(name);
  const detector = new GaitPeriodicityDetector({
    startedAtMs: samples[0].timestampMs,
  });
  let result = detector.getResult(samples[0].timestampMs);
  for (const sample of samples) {
    result = detector.process(sample);
    if (result.complete) {
      return result;
    }
  }
  return result;
}

describe("gait detection against real footage", () => {
  it("classifies a close single walker as walking", () => {
    expect(runScan("real-walk-single").classification).toBe("walking");
  });

  // Not a shortcoming. The propped scan must verify its owner standing close to
  // the phone, and must NOT verify off people at middle distance — otherwise
  // aiming the phone at a window or a busy room would satisfy the check. This
  // footage is four subjects far enough away that their normalised torso bob
  // barely clears the jitter floor, and it correctly fails to verify.
  it("does not verify from distant multi-subject footage", () => {
    expect(runScan("real-walk-group").classification).not.toBe("walking");
  });

  it.each(GAIT_FIXTURE_NAMES)(
    "reaches a verdict for %s within the scan timeout",
    (name) => {
      const { samples } = getGaitFixture(name);
      const result = runScan(name);
      expect(result.evaluatedAtMs - samples[0].timestampMs).toBeLessThanOrEqual(
        5_000,
      );
    },
  );

  it.each(GAIT_FIXTURE_NAMES)("replays %s through the provider", async (name) => {
    const { samples } = getGaitFixture(name);
    const provider = new FixtureGaitVisionProvider(samples);
    const received: number[] = [];
    provider.onSample((sample) => received.push(sample.timestampMs));
    await provider.start();
    provider.advanceTo(samples[samples.length - 1].timestampMs);
    expect(received).toHaveLength(samples.length);
  });

  it.each(GAIT_FIXTURE_NAMES)("records provenance for %s", (name) => {
    const fixture = getGaitFixture(name);
    expect(fixture.license).not.toHaveLength(0);
    expect(fixture.sourceUrl).not.toHaveLength(0);
    expect(fixture.samples.length).toBeGreaterThan(60);
  });
});
