import type { DiagnosticsStorage } from "@/diagnostics/DiagnosticsLog";
import type { HarnessRun } from "../HarnessRunEngine";
import {
  HARNESS_RUN_INDEX_KEY,
  HarnessRunStore,
  serializeHarnessJsonLines,
} from "../HarnessRunStore";

function memoryStorage(): DiagnosticsStorage & { keys(): string[] } {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => void values.set(key, value),
    removeItem: async (key) => void values.delete(key),
    keys: () => [...values.keys()],
  };
}

describe("camera footage privacy", () => {
  it("keeps footage out of the JSON Lines export", () => {
    const run: HarnessRun = {
      version: 1,
      id: "c1-1000",
      testId: "c1-treadmill-walking",
      buildCommit: "abc123",
      startedAtMs: 1_000,
      footage: { fileUri: "file:///private/c1-1000.mp4" },
      events: [],
    };

    expect(serializeHarnessJsonLines([run])).not.toContain("fileUri");
    expect(serializeHarnessJsonLines([run])).not.toContain(".mp4");
  });

  it("deletes all footage metadata with one store operation", async () => {
    const storage = memoryStorage();
    const footage = { deleteAll: jest.fn(async () => undefined) };
    const store = new HarnessRunStore(storage, footage);
    await store.save({
      version: 1,
      id: "c1-1000",
      testId: "c1-treadmill-walking",
      buildCommit: "abc123",
      startedAtMs: 1_000,
      footage: { fileUri: "file:///private/c1-1000.mp4" },
      events: [],
    });

    await store.deleteAllFootage();

    expect(footage.deleteAll).toHaveBeenCalledTimes(1);
    await expect(store.get("c1-1000")).resolves.not.toHaveProperty("footage");
    expect(storage.keys()).toContain(HARNESS_RUN_INDEX_KEY);
  });
});
