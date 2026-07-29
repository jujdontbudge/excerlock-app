import type {
  ScreenTimeEvent,
  ScreenTimeProvider,
} from "..";

export interface ScreenTimeProviderHarness {
  readonly provider: ScreenTimeProvider;
  advanceTo(atMs: number): void;
  dispose(): void;
}

export function runScreenTimeProviderContract(
  implementation: string,
  createHarness: () => ScreenTimeProviderHarness,
): void {
  describe(`${implementation} ScreenTimeProvider contract`, () => {
    it("returns event history and emits future events in order", async () => {
      const harness = createHarness();
      const emitted: ScreenTimeEvent[] = [];
      harness.provider.onEvent((event) => emitted.push(event));

      expect(await harness.provider.getEvents()).toEqual([
        { type: "tick", atMs: -1_000, thresholdIndex: 1 },
      ]);

      harness.advanceTo(2_000);

      expect(emitted).toEqual([
        { type: "tick", atMs: 1_000, thresholdIndex: 2 },
        { type: "monitorFired", atMs: 2_000, monitor: "dayBoundary" },
      ]);
      expect(await harness.provider.getEvents(0)).toEqual(emitted);
      harness.dispose();
    });
  });
}
