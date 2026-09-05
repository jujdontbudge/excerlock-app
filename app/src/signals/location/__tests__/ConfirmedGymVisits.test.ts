import { ConfirmedGymVisits } from "../ConfirmedGymVisits";
import type { GymVisit, ReadableGymVisitLog } from "../GymVisitLog";
import { PRESENCE_CONFIRMATION_MS } from "../presenceDwell";
import { MemoryPendingRegionEntryLog } from "../testing/MemoryPendingRegionEntryLog";

describe("ConfirmedGymVisits", () => {
  it("books an enter whose dwell elapsed while the app was suspended", async () => {
    const entries = new MemoryPendingRegionEntryLog();
    await entries.record({ regionId: "gym-a", atMs: 1_000 });
    const log = new MemoryGymVisitLog();
    const visits = new ConfirmedGymVisits({
      entries,
      log,
      now: () => 1_000 + PRESENCE_CONFIRMATION_MS,
    });

    await expect(visits.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
    await expect(entries.readAll()).resolves.toEqual([]);
    await expect(visits.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
  });

  it("leaves an enter younger than the dwell pending for the next claim", async () => {
    const entries = new MemoryPendingRegionEntryLog();
    await entries.record({ regionId: "gym-a", atMs: 1_000 });
    const log = new MemoryGymVisitLog();
    let nowMs = 1_000 + PRESENCE_CONFIRMATION_MS - 1;
    const visits = new ConfirmedGymVisits({ entries, log, now: () => nowMs });

    await expect(visits.readAll()).resolves.toEqual([]);
    await expect(entries.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);

    nowMs += 1;
    await expect(visits.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
  });
});

class MemoryGymVisitLog implements ReadableGymVisitLog {
  private readonly visits: GymVisit[] = [];

  public async append(visit: GymVisit): Promise<void> {
    this.visits.push({ regionId: visit.regionId, atMs: visit.atMs });
  }

  public async readAll(): Promise<readonly GymVisit[]> {
    return [...this.visits];
  }
}
