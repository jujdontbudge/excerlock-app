import type { GymVisit, GymVisitLog } from "../GymVisitLog";
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
});

class RecordingGymVisitLog implements GymVisitLog {
  public readonly visits: GymVisit[] = [];

  public async append(visit: GymVisit): Promise<void> {
    this.visits.push(visit);
  }
}
