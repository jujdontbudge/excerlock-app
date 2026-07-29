import {
  TimelinePlayer,
  type FixtureManifest,
  type TimelineRow,
} from "..";

type TestEvent = "test.changed";

describe("TimelinePlayer", () => {
  it("applies history at load and waits for manual clock advancement before emitting future rows", () => {
    const emitted: TimelineRow<TestEvent>[] = [];
    const manifest: FixtureManifest<TestEvent> = {
      name: "manual-story",
      version: 1,
      description: "History followed by two future changes.",
      timeline: [
        { atMs: -1_000, event: "test.changed", payload: { value: "past" } },
        { atMs: 0, event: "test.changed", payload: { value: "present" } },
        { atMs: 500, event: "test.changed", payload: { value: "first" } },
        { atMs: 1_000, event: "test.changed", payload: { value: "second" } },
      ],
    };

    const player = new TimelinePlayer({
      manifest,
      allowedEvents: ["test.changed"],
      playback: { mode: "manual" },
      onEvent: (row) => emitted.push(row),
    });

    expect(emitted.map((row) => row.payload)).toEqual([
      { value: "past" },
      { value: "present" },
    ]);

    player.advanceBy(999);

    expect(emitted.map((row) => row.payload)).toEqual([
      { value: "past" },
      { value: "present" },
      { value: "first" },
    ]);

    player.advanceTo(1_000);

    expect(emitted.map((row) => row.payload)).toEqual([
      { value: "past" },
      { value: "present" },
      { value: "first" },
      { value: "second" },
    ]);
    expect(player.currentTimeMs).toBe(1_000);
  });
});
