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

  it("plays future rows at the configured accelerated real-time speed", () => {
    jest.useFakeTimers();
    const emitted: TimelineRow<TestEvent>[] = [];
    const manifest: FixtureManifest<TestEvent> = {
      name: "auto-story",
      version: 1,
      description: "Two virtual minutes played at sixty times speed.",
      timeline: [
        { atMs: 60_000, event: "test.changed", payload: { minute: 1 } },
        { atMs: 120_000, event: "test.changed", payload: { minute: 2 } },
      ],
    };
    const player = new TimelinePlayer({
      manifest,
      allowedEvents: ["test.changed"],
      playback: { mode: "auto", speed: 60 },
      onEvent: (row) => emitted.push(row),
    });

    jest.advanceTimersByTime(999);
    expect(emitted).toEqual([]);

    jest.advanceTimersByTime(1_001);
    expect(emitted.map((row) => row.payload)).toEqual([
      { minute: 1 },
      { minute: 2 },
    ]);
    expect(player.currentTimeMs).toBe(120_000);

    player.dispose();
    jest.useRealTimers();
  });

  it("rejects non-JSON payload values during fixture load", () => {
    const manifest = {
      name: "invalid-json",
      version: 1,
      description: "An invalid payload must fail before playback.",
      timeline: [
        {
          atMs: 0,
          event: "test.changed",
          payload: { invalid: undefined },
        },
      ],
    } as unknown as FixtureManifest<TestEvent>;

    expect(
      () =>
        new TimelinePlayer({
          manifest,
          allowedEvents: ["test.changed"],
          playback: { mode: "manual" },
          onEvent: () => undefined,
        }),
    ).toThrow("Fixture payload must contain JSON values");
  });

  it("rejects malformed manifest metadata during fixture load", () => {
    const missingName = {
      version: 1,
      description: "Missing its required story name.",
      timeline: [],
    } as unknown as FixtureManifest<TestEvent>;
    const nonStringDescription = {
      name: "bad-description",
      version: 1,
      description: 42,
      timeline: [],
    } as unknown as FixtureManifest<TestEvent>;

    const load = (manifest: FixtureManifest<TestEvent>) =>
      new TimelinePlayer({
        manifest,
        allowedEvents: ["test.changed"],
        playback: { mode: "manual" },
        onEvent: () => undefined,
      });

    expect(() => load(missingName)).toThrow("Invalid fixture name");
    expect(() => load(nonStringDescription)).toThrow(
      'Invalid fixture description for "bad-description"',
    );
  });

  it("runs provider payload validation for future rows during load", () => {
    const manifest: FixtureManifest<TestEvent> = {
      name: "future-invalid",
      version: 1,
      description: "A future row whose domain payload is invalid.",
      timeline: [
        {
          atMs: 10_000,
          event: "test.changed",
          payload: { wrongField: true },
        },
      ],
    };

    expect(
      () =>
        new TimelinePlayer({
          manifest,
          allowedEvents: ["test.changed"],
          playback: { mode: "manual" },
          validateRow: () => {
            throw new Error("Invalid test.changed payload");
          },
          onEvent: () => undefined,
        }),
    ).toThrow("Invalid test.changed payload");
  });
});
