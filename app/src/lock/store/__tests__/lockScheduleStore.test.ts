jest.mock(
  "@react-native-async-storage/async-storage",
  () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  LOCK_SCHEDULE_STORAGE_KEY,
  LockScheduleStore,
} from "../lockScheduleStore";

const MORNING = {
  id: "morning",
  days: ["monday", "wednesday"] as const,
  startMinute: 8 * 60,
  endMinute: 10 * 60,
};

describe("LockScheduleStore", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("persists created and edited recurring windows across store instances", async () => {
    const first = new LockScheduleStore();
    await first.load();

    await expect(first.save(MORNING)).resolves.toMatchObject({ ok: true });
    await expect(
      first.save({ ...MORNING, endMinute: 11 * 60 }),
    ).resolves.toMatchObject({ ok: true });

    const restored = new LockScheduleStore();
    await restored.load();

    expect(restored.getSnapshot()).toEqual({
      ready: true,
      windows: [{ ...MORNING, endMinute: 11 * 60 }],
    });
  });

  it("persists deletion and treats deleting a missing id as a no-op", async () => {
    const first = new LockScheduleStore();
    await first.load();
    await first.save(MORNING);

    await expect(first.delete("missing")).resolves.toBe(false);
    await expect(first.delete("morning")).resolves.toBe(true);

    const restored = new LockScheduleStore();
    await restored.load();
    expect(restored.getSnapshot().windows).toEqual([]);
  });

  it("rejects overlap without changing or persisting the prior snapshot", async () => {
    const store = new LockScheduleStore();
    await store.load();
    await store.save(MORNING);

    await expect(
      store.save({
        id: "collision",
        days: ["monday"],
        startMinute: 9 * 60,
        endMinute: 12 * 60,
      }),
    ).resolves.toEqual({
      ok: false,
      error: "overlap",
      conflictingWindowId: "morning",
    });

    expect(store.getSnapshot().windows).toEqual([MORNING]);
    const restored = new LockScheduleStore();
    await restored.load();
    expect(restored.getSnapshot().windows).toEqual([MORNING]);
  });

  it("drops malformed and overlapping persisted rows during hydration", async () => {
    await AsyncStorage.setItem(
      LOCK_SCHEDULE_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        windows: [
          MORNING,
          { ...MORNING, id: "overlap", startMinute: 9 * 60 },
          { ...MORNING, id: "", days: ["nonday"] },
        ],
      }),
    );

    const store = new LockScheduleStore();
    await store.load();

    expect(store.getSnapshot().windows).toEqual([MORNING]);
  });

  it("notifies subscribers only when the persisted schedule changes", async () => {
    const store = new LockScheduleStore();
    const seen: string[][] = [];
    store.subscribe(() => {
      seen.push(store.getSnapshot().windows.map(({ id }) => id));
    });

    await store.load();
    await store.save(MORNING);
    await store.delete("missing");
    await store.delete("morning");

    expect(seen).toEqual([[], ["morning"], []]);
  });
});
