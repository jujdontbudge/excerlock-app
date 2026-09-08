import type { RegionTransition } from "..";
import type { GymVisitInterval, GymVisitLog } from "../GymVisitLog";
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
    expect(log.visits).toEqual([
      { regionId: "gym-a", enteredAt: 1_000, exitedAt: null },
    ]);
  });

  it("closes the visit on a confirmed exit before announcing the transition", async () => {
    jest.useFakeTimers();
    const log = new RecordingGymVisitLog();
    const confirmed: RegionTransition[] = [];
    const processor = new GeofenceEventProcessor({
      log,
      onPresence: () => undefined,
      onTransition: (transition) => {
        // A reader woken by the exit must already see the closed stay.
        if (transition.type === "exit") {
          expect(log.visits).toEqual([
            { regionId: "gym-a", enteredAt: 1_000, exitedAt: 3_601_000 },
          ]);
        }
        confirmed.push(transition);
      },
    });

    const arriving = processor.process({
      type: "enter",
      regionId: "gym-a",
      atMs: 1_000,
    });
    await jest.advanceTimersByTimeAsync(30_000);
    await arriving;
    confirmed.length = 0;

    await processor.process({
      type: "exit",
      regionId: "gym-a",
      atMs: 3_601_000,
    });

    expect(confirmed).toHaveLength(1);
    expect(log.visits).toEqual([
      { regionId: "gym-a", enteredAt: 1_000, exitedAt: 3_601_000 },
    ]);
  });

  it("rejects instead of hanging when the on-device visit log fails", async () => {
    jest.useFakeTimers();
    const processor = new GeofenceEventProcessor({
      log: {
        open: async () => Promise.reject(new Error("storage failed")),
        close: async () => undefined,
      },
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
