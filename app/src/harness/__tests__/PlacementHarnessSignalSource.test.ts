import {
  FixturePhonePlacementProvider,
  type DeviceMotionSample,
} from "@/signals/placement";
import { PlacementHarnessSignalSource } from "../PlacementHarnessSignalSource";
import { HarnessRunEngine, type HarnessRun } from "../HarnessRunEngine";
import { HARNESS_TEST_DEFINITIONS } from "../testDefinitions";

function treadmillVibrationSamples(): readonly DeviceMotionSample[] {
  return Array.from({ length: 21 }, (_, index) => {
    const direction = index % 2 === 0 ? 1 : -1;
    return {
      timestampMs: index * 100,
      gravity: { x: direction * 0.002, y: -0.7, z: -0.714 },
      rotationRate: {
        x: direction * 0.04,
        y: direction * 0.025,
        z: 0.015,
      },
    };
  });
}

describe("PlacementHarnessSignalSource", () => {
  it("records treadmill-vibration samples and the production classifier verdict as separate tracks", async () => {
    const provider = new FixturePhonePlacementProvider(
      treadmillVibrationSamples(),
    );
    const source = new PlacementHarnessSignalSource(provider);
    const records: Array<{
      track: string;
      payload: Readonly<Record<string, unknown>>;
    }> = [];

    await source.start({
      record: (track, payload) => records.push({ track, payload }),
    });
    provider.advanceTo(2_000);
    await source.stop();

    expect(records.filter(({ track }) => track === "raw-device-motion")).toHaveLength(21);
    expect(records[0]).toEqual({
      track: "raw-device-motion",
      payload: {
        timestampMs: 0,
        gravity: { x: 0.002, y: -0.7, z: -0.714 },
        rotationRate: { x: 0.04, y: 0.025, z: 0.015 },
      },
    });

    const classifications = records.filter(
      ({ track }) => track === "placement-classification",
    );
    expect(classifications).toHaveLength(21);
    expect(classifications.at(-1)?.payload).toEqual({
      placement: "propped",
      transition: null,
      evaluatedAtMs: 2_000,
    });
    expect(
      classifications.some(({ payload }) => payload.transition !== null),
    ).toBe(false);
  });

  it("exercises P3 against the fixture while the tester declares the phone propped", async () => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000);
    const samples = treadmillVibrationSamples();
    const provider = new FixturePhonePlacementProvider(samples);
    const saved: HarnessRun[] = [];
    const engine = new HarnessRunEngine({
      buildCommit: "abc123",
      now: () => Date.now(),
      recorder: { save: async (run) => void saved.push(run) },
      sources: { placement: new PlacementHarnessSignalSource(provider) },
    });
    const definition = HARNESS_TEST_DEFINITIONS.find(({ id }) => id === "P3");
    expect(definition).toBeDefined();

    const starting = engine.start(definition!);
    jest.advanceTimersByTime(10_000);
    await starting;
    await engine.pressMarker("The phone is propped");
    for (const sample of samples) {
      jest.setSystemTime(11_000 + sample.timestampMs);
      provider.advanceTo(sample.timestampMs);
    }
    await engine.stop();

    const events = engine.getSnapshot().run?.events ?? [];
    expect(events[0]).toEqual({
      type: "marker",
      atMs: 11_000,
      label: "The phone is propped",
    });
    expect(events).toContainEqual({
      type: "signal",
      atMs: 13_000,
      source: "placement",
      track: "placement-classification",
      payload: {
        placement: "propped",
        transition: null,
        evaluatedAtMs: 2_000,
      },
    });
    expect(saved.at(-1)?.endReason).toBe("stopped");
    jest.useRealTimers();
  });

  it("records pickup and set-down transitions on the classification track", async () => {
    const samples: DeviceMotionSample[] = [];
    for (let timestampMs = 0; timestampMs <= 1_000; timestampMs += 100) {
      samples.push({
        timestampMs,
        gravity: { x: 0, y: 0, z: -1 },
        rotationRate: { x: 0.005, y: -0.004, z: 0.003 },
      });
    }
    for (let timestampMs = 1_100; timestampMs <= 2_300; timestampMs += 100) {
      samples.push({
        timestampMs,
        gravity: { x: (timestampMs - 1_000) / 5_000, y: -1, z: 0 },
        rotationRate: { x: 0.18, y: 0.14, z: 0.1 },
      });
    }
    for (let timestampMs = 2_400; timestampMs <= 3_800; timestampMs += 100) {
      samples.push({
        timestampMs,
        gravity: { x: 0, y: 0, z: -1 },
        rotationRate: { x: 0.005, y: -0.004, z: 0.003 },
      });
    }
    const provider = new FixturePhonePlacementProvider(samples);
    const source = new PlacementHarnessSignalSource(provider);
    const transitions: unknown[] = [];

    await source.start({
      record: (track, payload) => {
        if (track === "placement-classification" && payload.transition !== null) {
          transitions.push(payload.transition);
        }
      },
    });
    provider.advanceTo(3_800);
    await source.stop();

    expect(transitions).toEqual([
      expect.objectContaining({ kind: "pickedUp" }),
      expect.objectContaining({ kind: "setDown" }),
    ]);
  });
});
