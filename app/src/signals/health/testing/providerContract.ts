import type {
  HealthChange,
  HealthProvider,
} from "..";

export interface HealthProviderHarness {
  readonly provider: HealthProvider;
  advanceTo(atMs: number): void | Promise<void>;
  dispose(): void;
}

export function runHealthProviderContract(
  implementation: string,
  createHarness: () => HealthProviderHarness,
): void {
  describe(`${implementation} HealthProvider contract`, () => {
    it("replays anchored samples, excludes manual entries from totals, and emits future wakes", async () => {
      const harness = createHarness();
      const initial = await harness.provider.getNewSamples("steps", null);
      const changes: HealthChange[] = [];
      harness.provider.onChange("steps", (change) => changes.push(change));

      expect(initial.samples).toHaveLength(2);
      expect(initial.samples[1].wasUserEntered).toBe(true);
      expect(await harness.provider.getTodayTotal("steps")).toBe(100);

      await harness.advanceTo(2_000);

      expect(changes.map((change) => change.reason)).toEqual([
        "backgroundWake",
        "samplesAdded",
      ]);
      expect(
        await harness.provider.getNewSamples("steps", initial.anchor),
      ).toMatchObject({
        samples: [{ value: 50, wasUserEntered: false }],
      });
      expect(await harness.provider.getTodayTotal("steps")).toBe(150);
      harness.dispose();
    });
  });
}
