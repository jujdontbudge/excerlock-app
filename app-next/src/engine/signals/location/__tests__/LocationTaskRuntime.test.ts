import type { GymVisitInterval, GymVisitLog } from "../GymVisitLog";
import type { LocationSample } from "..";
import { LocationTaskRuntime } from "../LocationTaskRuntime";

describe("LocationTaskRuntime", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("absorbs a quick geofence enter-exit without logging a visit", async () => {
    jest.useFakeTimers({ now: 1_000 });
    const log = new RecordingGymVisitLog();
    const runtime = new LocationTaskRuntime(log);
    const confirmed: string[] = [];
    runtime.onRegionTransition((transition) =>
      confirmed.push(`${transition.type}:${transition.regionId}`),
    );

    const entering = runtime.handleGeofencingTask({
      eventType: 1,
      region: {
        identifier: "gym-a",
        latitude: 40.741,
        longitude: -73.989,
        radius: 100,
      },
    });
    await jest.advanceTimersByTimeAsync(4_000);
    await runtime.handleGeofencingTask({
      eventType: 2,
      region: {
        identifier: "gym-a",
        latitude: 40.741,
        longitude: -73.989,
        radius: 100,
      },
    });
    await entering;
    await jest.advanceTimersByTimeAsync(30_000);

    expect(runtime.getCachedRegionPresence("gym-a")).toBe(false);
    expect(confirmed).toEqual([]);
    expect(log.visits).toEqual([]);
  });

  it("delivers continuous task locations through the provider sample shape", () => {
    const runtime = new LocationTaskRuntime(new RecordingGymVisitLog());
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
  public readonly visits: GymVisitInterval[] = [];

  public async open(regionId: string, atMs: number): Promise<void> {
    this.visits.push({ regionId, enteredAt: atMs, exitedAt: null });
  }

  public async close(regionId: string, atMs: number): Promise<void> {
    const index = this.visits.findIndex(
      (visit) => visit.regionId === regionId && visit.exitedAt === null,
    );
    if (index !== -1) {
      this.visits[index] = { ...this.visits[index], exitedAt: atMs };
    }
  }
}
