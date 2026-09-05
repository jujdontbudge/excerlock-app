import type { GymVisit, GymVisitLog } from "../GymVisitLog";
import type { LocationSample } from "..";
import { LocationTaskRuntime } from "../LocationTaskRuntime";
import { PRESENCE_CONFIRMATION_MS } from "../presenceDwell";
import { MemoryPendingRegionEntryLog } from "../testing/MemoryPendingRegionEntryLog";

const gymRegion = {
  identifier: "gym-a",
  latitude: 40.741,
  longitude: -73.989,
  radius: 100,
} as const;

describe("LocationTaskRuntime", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("absorbs a quick geofence enter-exit without logging a visit", async () => {
    jest.useFakeTimers({ now: 1_000 });
    const log = new RecordingGymVisitLog();
    const runtime = new LocationTaskRuntime(
      log,
      new MemoryPendingRegionEntryLog(),
    );
    const confirmed: string[] = [];
    runtime.onRegionTransition((transition) =>
      confirmed.push(`${transition.type}:${transition.regionId}`),
    );

    const entering = runtime.handleGeofencingTask({
      eventType: 1,
      region: gymRegion,
    });
    await jest.advanceTimersByTimeAsync(4_000);
    await runtime.handleGeofencingTask({ eventType: 2, region: gymRegion });
    await entering;
    await jest.advanceTimersByTimeAsync(30_000);

    expect(runtime.getCachedRegionPresence("gym-a")).toBe(false);
    expect(confirmed).toEqual([]);
    expect(log.visits).toEqual([]);
  });

  it("returns from a background wake without waiting out the dwell", async () => {
    jest.useFakeTimers({ now: 1_000 });
    const entries = new MemoryPendingRegionEntryLog();
    const runtime = new LocationTaskRuntime(new RecordingGymVisitLog(), entries);
    let handled = false;

    void runtime
      .handleGeofencingTask({ eventType: 1, region: gymRegion })
      .then(() => {
        handled = true;
      });
    await jest.advanceTimersByTimeAsync(1_000);

    expect(handled).toBe(true);
    await expect(entries.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
  });

  it("logs the visit on the exit that reaches a relaunched app", async () => {
    jest.useFakeTimers({ now: 1_000 });
    const entries = new MemoryPendingRegionEntryLog();
    const log = new RecordingGymVisitLog();
    const wake = new LocationTaskRuntime(log, entries);
    await wake.handleGeofencingTask({ eventType: 1, region: gymRegion });

    // The app is suspended before its dwell timer could fire; the exit arrives
    // in a relaunched process with no in-memory presence at all.
    jest.clearAllTimers();
    jest.setSystemTime(1_000 + PRESENCE_CONFIRMATION_MS);
    const relaunched = new LocationTaskRuntime(log, entries);
    const confirmed: string[] = [];
    relaunched.onRegionTransition((transition) =>
      confirmed.push(`${transition.type}:${transition.regionId}`),
    );

    await relaunched.handleGeofencingTask({ eventType: 2, region: gymRegion });

    expect(log.visits).toEqual([{ regionId: "gym-a", atMs: 1_000 }]);
    expect(confirmed).toEqual(["enter:gym-a"]);
  });

  it("delivers continuous task locations through the provider sample shape", () => {
    const runtime = new LocationTaskRuntime(
      new RecordingGymVisitLog(),
      new MemoryPendingRegionEntryLog(),
    );
    const samples: LocationSample[] = [];
    runtime.onLocation((sample) => samples.push(sample));

    runtime.handleLocationTask({
      locations: [
        {
          coords: { latitude: 40.741, longitude: -73.989, accuracy: 8 },
          timestamp: 2_000,
        },
      ],
    });

    expect(samples).toEqual([
      { lat: 40.741, lon: -73.989, accuracy: 8, atMs: 2_000 },
    ]);
    expect(runtime.getLastLocation()).toEqual(samples[0]);
  });
});

class RecordingGymVisitLog implements GymVisitLog {
  public readonly visits: GymVisit[] = [];

  public async append(visit: GymVisit): Promise<void> {
    this.visits.push(visit);
  }
}
