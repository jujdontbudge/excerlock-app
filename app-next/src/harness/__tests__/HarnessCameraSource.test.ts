import {
  FixtureGaitVisionProvider,
} from "../../engine/signals/gait";
import { getGaitFixture } from "../../engine/signals/gait/fixtures";
import { HarnessCameraSource } from "../HarnessCameraSource";
import {
  HarnessRunEngine,
  type HarnessRun,
  type HarnessRunEvent,
  type HarnessTestDefinition,
} from "../HarnessRunEngine";
import { HARNESS_TEST_DEFINITIONS } from "../testDefinitions";

const CAMERA_CASES = [
  ["c1-treadmill-walking", "real-walk-single", "walking"],
  ["c2-empty-running-belt", "real-walk-group", "notWalking"],
] as const;

describe("camera harness tasks", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
  });

  afterEach(() => jest.useRealTimers());

  it.each(CAMERA_CASES)(
    "%s replays real footage through the production provider and detector",
    async (testId, fixtureName, expectedVerdict) => {
      const definition = definitionFor(testId);
      const fixture = getGaitFixture(fixtureName);
      const provider = new FixtureGaitVisionProvider(fixture.samples);
      const capture = {
        begin: jest.fn(async () => undefined),
        end: jest.fn(async () => undefined),
        deleteAll: jest.fn(async () => undefined),
      };
      const saved: HarnessRun[] = [];
      const engine = new HarnessRunEngine({
        buildCommit: "abc123",
        now: () => Date.now(),
        recorder: { save: async (run) => void saved.push(run) },
        sources: {
          camera: new HarnessCameraSource({ capture, provider }),
        },
      });

      const starting = engine.start(definition);
      await jest.advanceTimersByTimeAsync(definition.countdownMs);
      await starting;
      provider.advanceTo(fixture.samples.at(-1)?.timestampMs ?? 0);
      await engine.stop();

      const cameraEvents = engine.getSnapshot().run?.events.filter(
        (event): event is Extract<HarnessRunEvent, { type: "signal" }> =>
          event.type === "signal" && event.source === "camera",
      );
      expect(cameraEvents?.some((event) => event.track === "landmarks")).toBe(
        true,
      );
      expect(
        cameraEvents?.some(
          (event) =>
            event.track === "detector" &&
            event.payload.complete === true &&
            event.payload.classification === expectedVerdict,
        ),
      ).toBe(true);
      expect(capture.begin).toHaveBeenCalledWith(
        expect.stringContaining(testId),
      );
      expect(capture.end).toHaveBeenCalledTimes(1);
      expect(saved.at(-1)?.endReason).toBe("stopped");
    },
  );

  it("does not prepare or start camera for a task that does not declare it", async () => {
    const camera = {
      id: "camera" as const,
      prepare: jest.fn(async () => undefined),
      start: jest.fn(async () => undefined),
      stop: jest.fn(async () => undefined),
    };
    const engine = new HarnessRunEngine({
      buildCommit: "abc123",
      now: () => Date.now(),
      recorder: { save: async () => undefined },
      sources: { camera },
    });
    const starting = engine.start({
      id: "no-camera",
      title: "No camera",
      kind: "declare-truth",
      countdownMs: 1,
      defaultDurationMs: 1_000,
      markerLabels: ["Ready"],
      signalSources: [],
    });
    await jest.advanceTimersByTimeAsync(1);
    await starting;

    expect(camera.prepare).not.toHaveBeenCalled();
    expect(camera.start).not.toHaveBeenCalled();
  });
});

function definitionFor(id: string): HarnessTestDefinition {
  const definition = HARNESS_TEST_DEFINITIONS.find((item) => item.id === id);
  if (definition === undefined) {
    throw new Error(`Missing definition ${id}`);
  }
  return definition;
}
