import {
  SCREENTIME_FIXTURE_NAMES,
  FixtureScreenTimeProvider,
  type ScreenTimeEvent,
  type ScreenTimeFixtureManifest,
} from "..";

describe("FixtureScreenTimeProvider", () => {
  it("returns event history and emits future tick and monitor callbacks in order", async () => {
    const manifest: ScreenTimeFixtureManifest = {
      name: "provider-contract",
      version: 1,
      description: "A spent tick followed by a future tick and day boundary.",
      timeline: [
        {
          atMs: -1_000,
          event: "screentime.tick",
          payload: { thresholdIndex: 1 },
        },
        {
          atMs: 1_000,
          event: "screentime.tick",
          payload: { thresholdIndex: 2 },
        },
        {
          atMs: 2_000,
          event: "screentime.monitorFired",
          payload: { monitor: "dayBoundary" },
        },
      ],
    };
    const provider = new FixtureScreenTimeProvider(manifest);
    const emitted: ScreenTimeEvent[] = [];
    provider.onEvent((event) => emitted.push(event));

    expect(await provider.getEvents()).toEqual([
      { type: "tick", atMs: -1_000, thresholdIndex: 1 },
    ]);

    provider.advanceTo(2_000);

    expect(emitted).toEqual([
      { type: "tick", atMs: 1_000, thresholdIndex: 2 },
      { type: "monitorFired", atMs: 2_000, monitor: "dayBoundary" },
    ]);
    expect(await provider.getEvents(0)).toEqual(emitted);
  });

  it("publishes every canonical Screen Time fixture name", () => {
    expect(SCREENTIME_FIXTURE_NAMES).toEqual([
      "tick-ladder-basic",
      "tick-ladder-jitter",
      "re-arm-race",
    ]);
  });
});
