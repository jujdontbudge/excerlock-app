import type { DiagnosticsStorage } from "@/diagnostics/DiagnosticsLog";
import type { HarnessRun } from "../HarnessRunEngine";
import {
  HARNESS_RUN_INDEX_KEY,
  HARNESS_RUN_KEY_PREFIX,
  HarnessRunStore,
  parseHarnessJsonLines,
  serializeHarnessJsonLines,
} from "../HarnessRunStore";

const RUN: HarnessRun = {
  version: 1,
  id: "marker-only-1000",
  testId: "marker-only",
  buildCommit: "abc123",
  startedAtMs: 1_000,
  endedAtMs: 2_000,
  endReason: "timeout",
  parameters: { treadmillSpeedMph: "2.5" },
  note: "Belt juddered once",
  events: [{ type: "marker", atMs: 1_250, label: "Started" }],
};

function memoryStorage(): DiagnosticsStorage & { keys(): string[] } {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => void values.set(key, value),
    removeItem: async (key) => void values.delete(key),
    keys: () => [...values.keys()],
  };
}

describe("HarnessRunStore", () => {
  it("persists runs individually under harness-only keys and reloads them", async () => {
    const storage = memoryStorage();
    await new HarnessRunStore(storage).save(RUN);

    expect(storage.keys()).toEqual([
      `${HARNESS_RUN_KEY_PREFIX}${RUN.id}`,
      HARNESS_RUN_INDEX_KEY,
    ]);
    expect(storage.keys()).not.toContain("excerlock.diagnostics.v1");

    const reopened = new HarnessRunStore(storage);
    await expect(reopened.list()).resolves.toEqual([RUN]);
    await expect(reopened.get(RUN.id)).resolves.toEqual(RUN);
  });

  it("round-trips one or many runs through the JSON Lines contract", () => {
    const second = { ...RUN, id: "marker-only-3000", startedAtMs: 3_000 };
    const exported = serializeHarnessJsonLines([RUN, second]);

    expect(exported.split("\n")).toHaveLength(4);
    expect(parseHarnessJsonLines(exported)).toEqual([RUN, second]);
  });
});
