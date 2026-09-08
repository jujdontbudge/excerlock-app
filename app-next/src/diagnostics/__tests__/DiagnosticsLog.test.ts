import { DiagnosticsLog, type DiagnosticsStorage } from "../DiagnosticsLog";

function memoryStorage(seed: Record<string, string> = {}): DiagnosticsStorage {
  const values = new Map(Object.entries(seed));
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => {
      values.set(key, value);
    },
    removeItem: async (key) => {
      values.delete(key);
    },
  };
}

describe("DiagnosticsLog", () => {
  it("keeps appended entries in order", () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1 });

    log.append("motion.cadence", { stepsPerSecond: 1.2 });
    log.append("session.snapshot", { walking: true });

    expect(log.entries().map((entry) => entry.event)).toEqual([
      "motion.cadence",
      "session.snapshot",
    ]);
    expect(log.entries()[0].data).toEqual({ stepsPerSecond: 1.2 });
  });

  it("drops the oldest entries past its cap so a long walk cannot exhaust memory", () => {
    const log = new DiagnosticsLog({
      storage: memoryStorage(),
      now: () => 1,
      maxEntries: 3,
    });

    for (let index = 0; index < 5; index += 1) {
      log.append("tick", { index });
    }

    expect(log.entries().map((entry) => entry.data.index)).toEqual([2, 3, 4]);
  });

  it("survives the walk it was recording: entries persist to a new instance", async () => {
    // The whole point is that the phone is away from the Mac with no Metro
    // attached. Anything only held in memory dies with the process.
    const storage = memoryStorage();
    const first = new DiagnosticsLog({ storage, now: () => 7 });
    first.append("motion.cadence", { stepsPerSecond: 1.4 });
    await first.flush();

    const second = new DiagnosticsLog({ storage, now: () => 9 });
    await second.hydrate();

    expect(second.entries()).toEqual([
      { atMs: 7, event: "motion.cadence", data: { stepsPerSecond: 1.4 } },
    ]);
  });

  it("appends after hydrating rather than replacing what was recovered", async () => {
    const storage = memoryStorage();
    const first = new DiagnosticsLog({ storage, now: () => 1 });
    first.append("before", {});
    await first.flush();

    const second = new DiagnosticsLog({ storage, now: () => 2 });
    await second.hydrate();
    second.append("after", {});

    expect(second.entries().map((entry) => entry.event)).toEqual([
      "before",
      "after",
    ]);
  });

  it("clears memory and storage together", async () => {
    const storage = memoryStorage();
    const log = new DiagnosticsLog({ storage, now: () => 1 });
    log.append("motion.cadence", {});
    await log.flush();

    await log.clear();

    expect(log.entries()).toEqual([]);
    const revived = new DiagnosticsLog({ storage, now: () => 1 });
    await revived.hydrate();
    expect(revived.entries()).toEqual([]);
  });

  it("notifies subscribers so a screen can follow a walk live", () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1 });
    const listener = jest.fn();
    const unsubscribe = log.subscribe(listener);

    log.append("motion.cadence", {});
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    log.append("motion.cadence", {});
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it("never lets a storage failure break the app it is observing", async () => {
    const log = new DiagnosticsLog({
      storage: {
        getItem: async () => {
          throw new Error("disk full");
        },
        setItem: async () => {
          throw new Error("disk full");
        },
        removeItem: async () => {
          throw new Error("disk full");
        },
      },
      now: () => 1,
    });

    log.append("motion.cadence", {});
    await expect(log.flush()).resolves.toBeUndefined();
    await expect(log.hydrate()).resolves.toBeUndefined();
    expect(log.entries()).toHaveLength(1);
  });

  it("renders as shareable text", () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 12 });
    log.append("motion.cadence", { stepsPerSecond: 1.2 });

    expect(log.toText()).toBe(
      '12\tmotion.cadence\t{"stepsPerSecond":1.2}',
    );
  });
});
