import type { DiagnosticsStorage } from "@/diagnostics/DiagnosticsLog";
import type { HarnessRun } from "../HarnessRunEngine";
import { HarnessRunStore } from "../HarnessRunStore";
import { describeRunOutcome, finalizeStrandedRuns } from "../strandedRuns";

function memoryStorage(): DiagnosticsStorage {
  const values = new Map<string, string>();
  return {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => void values.set(key, value),
    removeItem: async (key) => void values.delete(key),
  };
}

const UNFINISHED: HarnessRun = {
  version: 1,
  id: "m2-1000",
  testId: "m2-outdoor-walk",
  buildCommit: "abc123",
  startedAtMs: 1_000,
  events: [
    { type: "marker", atMs: 2_000, label: "I started" },
    { type: "app-state", atMs: 67_500, state: "background" },
  ],
};

describe("finalizeStrandedRuns", () => {
  it("closes a run the app never came back to, at its last evidence", async () => {
    const store = new HarnessRunStore(memoryStorage());
    await store.save(UNFINISHED);

    const stranded = await finalizeStrandedRuns(store);

    expect(stranded.map((run) => run.id)).toEqual(["m2-1000"]);
    expect(await store.get("m2-1000")).toMatchObject({
      endReason: "stranded",
      endedAtMs: 67_500,
    });
  });

  it("closes an empty run at its own start", async () => {
    const store = new HarnessRunStore(memoryStorage());
    await store.save({ ...UNFINISHED, events: [] });

    await finalizeStrandedRuns(store);

    expect(await store.get("m2-1000")).toMatchObject({
      endReason: "stranded",
      endedAtMs: 1_000,
    });
  });

  it("leaves a run that ended on its own terms alone", async () => {
    const store = new HarnessRunStore(memoryStorage());
    const finished: HarnessRun = {
      ...UNFINISHED,
      endedAtMs: 301_000,
      endReason: "timeout",
    };
    await store.save(finished);

    expect(await finalizeStrandedRuns(store)).toEqual([]);
    expect(await store.get("m2-1000")).toEqual(finished);
  });
});

describe("describeRunOutcome", () => {
  it("asks for attention for a reconstructed end and an open one", () => {
    expect(
      describeRunOutcome({ ...UNFINISHED, endedAtMs: 67_500, endReason: "stranded" }),
    ).toEqual({ label: "stranded · needs attention", needsAttention: true });
    expect(describeRunOutcome(UNFINISHED)).toEqual({
      label: "in progress · needs attention",
      needsAttention: true,
    });
  });

  it("states a watched end plainly", () => {
    expect(
      describeRunOutcome({ ...UNFINISHED, endedAtMs: 301_000, endReason: "timeout" }),
    ).toEqual({ label: "timeout", needsAttention: false });
    expect(
      describeRunOutcome({ ...UNFINISHED, endedAtMs: 9_000, endReason: "stopped" }),
    ).toEqual({ label: "stopped", needsAttention: false });
  });
});
