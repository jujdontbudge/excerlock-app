import type {
  ActivitySample,
  CadenceSample,
  MotionProvider,
} from "..";

export interface MotionProviderHarness {
  readonly provider: MotionProvider;
  advanceBy(milliseconds: number): void;
  advanceTo(atMs: number): void;
  dispose(): void;
}

export function runMotionProviderContract(
  implementation: string,
  createHarness: () => MotionProviderHarness,
): void {
  describe(`${implementation} MotionProvider contract`, () => {
    it("streams and queries schema activity and cadence samples", async () => {
      const harness = createHarness();
      const activityEvents: ActivitySample[] = [];
      const cadenceEvents: CadenceSample[] = [];
      harness.provider.on("activity", (sample) => activityEvents.push(sample));
      harness.provider.on("cadence", (sample) => cadenceEvents.push(sample));

      expect(harness.provider.getAvailability()).toEqual({
        activity: true,
        cadence: true,
        stepCounting: true,
      });
      expect(harness.provider.getAuthorizationStatus()).toBe("authorized");
      expect(await harness.provider.queryActivity(-2_000, 0)).toEqual([
        {
          classes: ["walking"],
          confidence: "high",
          startedAt: -1_000,
          receivedAt: -1_000,
        },
      ]);

      await harness.provider.start();
      harness.advanceTo(1_000);

      expect(cadenceEvents).toEqual([
        {
          stepsPerSecond: 1.2,
          cumulativeSteps: 12,
          asOf: 1_000,
        },
      ]);
      expect(await harness.provider.querySteps(0, 1_000)).toEqual({
        steps: 12,
      });

      harness.advanceBy(1_000);

      expect(activityEvents).toEqual([
        {
          classes: ["stationary"],
          confidence: "medium",
          startedAt: 2_000,
          receivedAt: 2_000,
        },
      ]);
      harness.dispose();
    });
  });
}
