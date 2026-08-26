import { FixtureMotionProvider, type MotionFixtureManifest } from "@/signals";
import { HarnessRunEngine, type HarnessRun } from "../HarnessRunEngine";
import { MotionHarnessSource } from "../sources/MotionHarnessSource";
import { HARNESS_TEST_DEFINITIONS } from "../testDefinitions";

const phantomCadence: MotionFixtureManifest = {
  name: "stationary-with-cadence",
  version: 1,
  description: "Stationary truth while the pedometer emits cadence.",
  timeline: [
    {
      atMs: 1_000,
      event: "motion.activityChange",
      payload: { activity: "stationary", confidence: "high" },
    },
    {
      atMs: 2_000,
      event: "motion.pedometerUpdate",
      payload: { steps: 3, cadence: 1.8 },
    },
  ],
};

describe("MotionHarnessSource", () => {
  it.each(["M6", "M7"])(
    "records raw and observe-only derived tracks for %s while truth is stationary",
    async (testId) => {
      jest.useFakeTimers();
      jest.setSystemTime(0);
      const provider = new FixtureMotionProvider(phantomCadence);
      const saved: HarnessRun[] = [];
      const definition = HARNESS_TEST_DEFINITIONS.find(({ id }) => id === testId);
      expect(definition).toBeDefined();
      const engine = new HarnessRunEngine({
        buildCommit: "abc123",
        now: () => Date.now(),
        recorder: { save: async (run) => void saved.push(run) },
        sources: { motion: new MotionHarnessSource(() => provider) },
      });

      const starting = engine.start({ ...definition!, countdownMs: 0 });
      await jest.advanceTimersByTimeAsync(0);
      await starting;
      await engine.pressMarker("I am stationary");
      jest.setSystemTime(1_000);
      provider.advanceTo(1_000);
      jest.setSystemTime(2_000);
      provider.advanceTo(2_000);
      await engine.stop();

      expect(engine.getSnapshot().run?.events).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: "motion", track: "raw.activity" }),
          expect.objectContaining({
            source: "motion",
            track: "raw.cadence",
            payload: expect.objectContaining({ stepsPerSecond: 1.8 }),
          }),
          expect.objectContaining({
            source: "motion",
            track: "derived.verdict",
            payload: expect.objectContaining({ isWalking: false }),
          }),
        ]),
      );
      expect(saved.at(-1)?.endReason).toBe("stopped");
      jest.useRealTimers();
    },
  );
});
