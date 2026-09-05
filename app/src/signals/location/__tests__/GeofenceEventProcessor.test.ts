import type { RegionTransition } from "..";
import type { GymVisit, GymVisitLog } from "../GymVisitLog";
import {
  GeofenceEventProcessor,
  PRESENCE_CONFIRMATION_MS,
} from "../GeofenceEventProcessor";
import { MemoryPendingRegionEntryLog } from "../testing/MemoryPendingRegionEntryLog";

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
      entries: new MemoryPendingRegionEntryLog(),
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
      entries: new MemoryPendingRegionEntryLog(),
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

  it("persists the raw enter before the dwell and answers the wake at once", async () => {
    jest.useFakeTimers();
    const entries = new MemoryPendingRegionEntryLog();
    const log = new RecordingGymVisitLog();
    const processor = new GeofenceEventProcessor({
      entries,
      log,
      onPresence: () => undefined,
      onTransition: () => undefined,
    });

    await processor.receive({ type: "enter", regionId: "gym-a", atMs: 1_000 });

    await expect(entries.readAll()).resolves.toEqual([
      { regionId: "gym-a", atMs: 1_000 },
    ]);
    expect(log.visits).toEqual([]);
  });

  it("books the visit from timestamps when the exit reaches a relaunched app", async () => {
    jest.useFakeTimers();
    const entries = new MemoryPendingRegionEntryLog();
    const log = new RecordingGymVisitLog();
    const woken = new GeofenceEventProcessor({
      entries,
      log,
      onPresence: () => undefined,
      onTransition: () => undefined,
    });

    await woken.receive({ type: "enter", regionId: "gym-a", atMs: 1_000 });

    // iOS suspends the app moments later: no JS timer survives the gap, and the
    // next region event arrives in a fresh process with fresh in-memory state.
    jest.clearAllTimers();
    const confirmed: RegionTransition[] = [];
    const relaunched = new GeofenceEventProcessor({
      entries,
      log,
      onPresence: () => undefined,
      onTransition: (transition) => confirmed.push(transition),
    });

    await relaunched.receive({
      type: "exit",
      regionId: "gym-a",
      atMs: 1_000 + PRESENCE_CONFIRMATION_MS,
    });

    expect(log.visits).toEqual([{ regionId: "gym-a", atMs: 1_000 }]);
    expect(confirmed).toEqual([
      { type: "enter", regionId: "gym-a", atMs: 1_000 },
    ]);
    await expect(entries.readAll()).resolves.toEqual([]);
  });

  it("drops a persisted enter when the exit beats the dwell", async () => {
    jest.useFakeTimers();
    const entries = new MemoryPendingRegionEntryLog();
    const log = new RecordingGymVisitLog();
    const confirmed: RegionTransition[] = [];
    const woken = new GeofenceEventProcessor({
      entries,
      log,
      onPresence: () => undefined,
      onTransition: (transition) => confirmed.push(transition),
    });

    await woken.receive({ type: "enter", regionId: "gym-a", atMs: 1_000 });
    jest.clearAllTimers();
    await woken.receive({
      type: "exit",
      regionId: "gym-a",
      atMs: 1_000 + PRESENCE_CONFIRMATION_MS - 1,
    });

    expect(log.visits).toEqual([]);
    expect(confirmed).toEqual([]);
    await expect(entries.readAll()).resolves.toEqual([]);
  });

  it("books an arrival once, so a later exit cannot pay for it twice", async () => {
    jest.useFakeTimers();
    const entries = new MemoryPendingRegionEntryLog();
    const log = new RecordingGymVisitLog();
    const confirmed: RegionTransition[] = [];
    const processor = new GeofenceEventProcessor({
      entries,
      log,
      onPresence: () => undefined,
      onTransition: (transition) => confirmed.push(transition),
    });

    const processing = processor.process({
      type: "enter",
      regionId: "gym-a",
      atMs: 1_000,
    });
    await jest.advanceTimersByTimeAsync(PRESENCE_CONFIRMATION_MS);
    await processing;

    const exit: RegionTransition = {
      type: "exit",
      regionId: "gym-a",
      atMs: 90_000,
    };
    await processor.process(exit);

    expect(log.visits).toEqual([{ regionId: "gym-a", atMs: 1_000 }]);
    expect(confirmed).toEqual([
      { type: "enter", regionId: "gym-a", atMs: 1_000 },
      exit,
    ]);
  });
});

class RecordingGymVisitLog implements GymVisitLog {
  public readonly visits: GymVisit[] = [];

  public async append(visit: GymVisit): Promise<void> {
    this.visits.push(visit);
  }
}
