import {
  HarnessRunEngine,
  type HarnessRun,
  type HarnessRunRecorder,
  type HarnessSignalSource,
  type HarnessTestDefinition,
} from "../HarnessRunEngine";

const MARKER_TASK: HarnessTestDefinition = {
  id: "marker-only",
  title: "Marker-only harness check",
  kind: "declare-truth",
  countdownMs: 3_000,
  defaultDurationMs: 10_000,
  markerLabels: ["Started", "Stopped"],
  signalSources: [],
};

describe("HarnessRunEngine", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("counts down, records for the declared duration, and ends by timeout", async () => {
    const saved: HarnessRun[] = [];
    const recorder: HarnessRunRecorder = {
      save: jest.fn(async (run) => {
        saved.push(run);
      }),
    };
    const engine = new HarnessRunEngine({
      buildCommit: "abc123",
      now: () => Date.now(),
      recorder,
    });

    const starting = engine.start(MARKER_TASK);

    expect(engine.getSnapshot()).toMatchObject({ phase: "countdown" });
    jest.advanceTimersByTime(3_000);
    await starting;
    expect(engine.getSnapshot()).toMatchObject({
      phase: "recording",
      run: { testId: "marker-only", startedAtMs: 4_000 },
    });

    await jest.advanceTimersByTimeAsync(10_000);

    expect(engine.getSnapshot()).toMatchObject({
      phase: "finished",
      run: {
        buildCommit: "abc123",
        endedAtMs: 14_000,
        endReason: "timeout",
      },
    });
    expect(saved.at(-1)?.endReason).toBe("timeout");
  });

  it("records markers, fixture samples, app state, extension, and early stop on one clock", async () => {
    const saved: HarnessRun[] = [];
    let emitSample: ((payload: Readonly<Record<string, unknown>>) => void) | undefined;
    const fixture: HarnessSignalSource = {
      id: "motion",
      start: jest.fn(async ({ record }) => {
        emitSample = (payload) => record("raw", payload);
      }),
      stop: jest.fn(async () => undefined),
    };
    const engine = new HarnessRunEngine({
      buildCommit: "abc123",
      now: () => Date.now(),
      recorder: { save: async (run) => void saved.push(run) },
      sources: { motion: fixture },
    });

    const starting = engine.start({
      ...MARKER_TASK,
      signalSources: ["motion"],
    });
    jest.advanceTimersByTime(3_000);
    await starting;

    jest.setSystemTime(4_250);
    await engine.pressMarker("Started");
    emitSample?.({ cadenceStepsPerMinute: 112 });
    await engine.recordAppState("background");
    await engine.extend(5_000);
    jest.setSystemTime(5_000);
    await engine.stop();

    const run = engine.getSnapshot().run;
    expect(run).toMatchObject({ endReason: "stopped", endedAtMs: 5_000 });
    expect(run?.events).toEqual([
      { type: "marker", atMs: 4_250, label: "Started" },
      {
        type: "signal",
        atMs: 4_250,
        source: "motion",
        track: "raw",
        payload: { cadenceStepsPerMinute: 112 },
      },
      { type: "app-state", atMs: 4_250, state: "background" },
      { type: "extension", atMs: 4_250, durationMs: 5_000 },
    ]);
    expect(engine.getSnapshot().currentMarker).toBe("Started");
    expect(fixture.stop).toHaveBeenCalledTimes(1);
    expect(saved.at(-1)).toEqual(run);
  });

  it("records placement in every run even when the task does not request it", async () => {
    let emitPlacement:
      | ((payload: Readonly<Record<string, unknown>>) => void)
      | undefined;
    const placement: HarnessSignalSource = {
      id: "placement",
      start: jest.fn(async ({ record }) => {
        emitPlacement = (payload) => record("placement-classification", payload);
      }),
      stop: jest.fn(async () => undefined),
    };
    const engine = new HarnessRunEngine({
      buildCommit: "abc123",
      now: () => Date.now(),
      recorder: { save: async () => undefined },
      sources: { placement },
    });

    const starting = engine.start(MARKER_TASK);
    jest.advanceTimersByTime(3_000);
    await starting;
    emitPlacement?.({ placement: "propped" });
    await engine.stop();

    expect(placement.start).toHaveBeenCalledTimes(1);
    expect(engine.getSnapshot().run?.events).toContainEqual({
      type: "signal",
      atMs: 4_000,
      source: "placement",
      track: "placement-classification",
      payload: { placement: "propped" },
    });
    expect(placement.stop).toHaveBeenCalledTimes(1);
  });
});
