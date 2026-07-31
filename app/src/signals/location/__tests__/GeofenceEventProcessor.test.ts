import type { RegionTransition } from "..";
import type { GymVisit, GymVisitLog } from "../GymVisitLog";
import {
  GeofenceEventProcessor,
  PRESENCE_CONFIRMATION_MS,
} from "../GeofenceEventProcessor";

describe("GeofenceEventProcessor", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("confirms an arrival after the fixed 30-second debounce", async () => {
    jest.useFakeTimers();
    const log = new RecordingGymVisitLog();
    const presence: RegionTransition[] = [];
    const confirmed: RegionTransition[] = [];
    const processor = new GeofenceEventProcessor({
      log,
      onPresence: (transition) => presence.push(transition),
      onTransition: (transition) => confirmed.push(transition),
    });
    const enter: RegionTransition = {
      type: "enter",
      regionId: "gym-a",
      atMs: 1_000,
    };

    const processing = processor.process(enter);

    expect(PRESENCE_CONFIRMATION_MS).toBe(30_000);
    expect(presence).toEqual([enter]);
    expect(processor.isInside("gym-a")).toBe(true);
    expect(confirmed).toEqual([]);
    expect(log.visits).toEqual([]);

    await jest.advanceTimersByTimeAsync(29_999);
    expect(confirmed).toEqual([]);
    expect(log.visits).toEqual([]);

    await jest.advanceTimersByTimeAsync(1);
    await processing;
    expect(confirmed).toEqual([enter]);
    expect(log.visits).toEqual([{ regionId: "gym-a", atMs: 1_000 }]);
  });

  it("rejects instead of hanging when the on-device visit log fails", async () => {
    jest.useFakeTimers();
    const processor = new GeofenceEventProcessor({
      log: { append: async () => Promise.reject(new Error("storage failed")) },
      onPresence: () => undefined,
      onTransition: () => undefined,
    });
    const outcome = processor
      .process({ type: "enter", regionId: "gym-a", atMs: 1_000 })
      .then(
        () => "resolved",
        () => "rejected",
      );

    await jest.advanceTimersByTimeAsync(30_000);

    await expect(
      Promise.race([outcome, Promise.resolve("pending")]),
    ).resolves.toBe("rejected");
  });
});

class RecordingGymVisitLog implements GymVisitLog {
  public readonly visits: GymVisit[] = [];

  public async append(visit: GymVisit): Promise<void> {
    this.visits.push(visit);
  }
}
