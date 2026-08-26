import { DiagnosticsLog, type DiagnosticsStorage } from "../DiagnosticsLog";
import { instrumentWalkingSessionDependencies } from "../walkInstrumentation";
import type { WalkingSessionDependencies } from "@/home/signals";
import type {
  ActivitySample,
  CadenceSample,
  MotionProvider,
} from "@/signals";

function memoryStorage(): DiagnosticsStorage {
  const values = new Map<string, string>();
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

function stubMotion(): MotionProvider {
  let onCadence: (sample: CadenceSample) => void = () => {};
  let onActivity: (sample: ActivitySample) => void = () => {};
  return {
    getAvailability: () => "available",
    getAuthorizationStatus: () => "authorized",
    requestAuthorization: async () => "authorized",
    start: async () => {},
    stop: async () => {},
    queryActivity: async () => [],
    querySteps: async () => 0,
    on: ((event: "activity" | "cadence", callback: unknown) => {
      if (event === "activity") {
        onActivity = callback as (sample: ActivitySample) => void;
      } else {
        onCadence = callback as (sample: CadenceSample) => void;
      }
      return () => {};
    }) as MotionProvider["on"],
    emitCadence: (sample: CadenceSample) => onCadence(sample),
    emitActivity: (sample: ActivitySample) => onActivity(sample),
  } as unknown as MotionProvider & {
    emitCadence: (sample: CadenceSample) => void;
    emitActivity: (sample: ActivitySample) => void;
  };
}

function baseDependencies(
  motion: MotionProvider,
): WalkingSessionDependencies {
  return {
    createMotion: () => motion,
    createPlacement: () =>
      ({
        start: async () => {},
        stop: async () => {},
        onSample: () => () => {},
      }) as never,
    getLocation: () => ({
      startWalkKeepAlive: async () => {},
      stopWalkKeepAlive: async () => {},
    }),
    getState: () => ({ conditions: [], disabledConditionIds: [] }),
    now: () => 0,
    wallClockNow: () => 0,
    leaseWarning: {
      schedule: async () => {},
      cancel: async () => {},
    },
  };
}

describe("instrumentWalkingSessionDependencies", () => {
  it("records cadence and activity as they reach the verifier", () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1 });
    const motion = stubMotion() as MotionProvider & {
      emitCadence: (sample: CadenceSample) => void;
      emitActivity: (sample: ActivitySample) => void;
    };
    const instrumented = instrumentWalkingSessionDependencies(
      baseDependencies(motion),
      log,
    );

    const provider = instrumented.createMotion();
    provider.on("cadence", () => {});
    provider.on("activity", () => {});
    motion.emitCadence({
      stepsPerSecond: 1.2,
      cumulativeSteps: 4,
      asOf: 1_000,
    });
    motion.emitActivity({
      classes: ["walking"],
      confidence: "high",
      startedAt: 0,
      receivedAt: 0,
    });

    const events = log.entries().map((entry) => entry.event);
    expect(events).toContain("motion.cadence");
    expect(events).toContain("motion.activity");
  });

  it("still delivers every sample to the real listener", () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1 });
    const motion = stubMotion() as MotionProvider & {
      emitCadence: (sample: CadenceSample) => void;
    };
    const instrumented = instrumentWalkingSessionDependencies(
      baseDependencies(motion),
      log,
    );
    const received: CadenceSample[] = [];

    instrumented
      .createMotion()
      .on("cadence", (sample) => received.push(sample));
    motion.emitCadence({
      stepsPerSecond: 1.2,
      cumulativeSteps: 4,
      asOf: 1_000,
    });

    expect(received).toHaveLength(1);
  });

  it("carries every dependency through, so instrumentation cannot disable a feature", () => {
    // The previous recorder hand-assembled its own dependency object and
    // silently lost createPlacement and leaseWarning when those arrived,
    // killing propped mode in the build meant to test it. Decorating the real
    // set makes that failure impossible.
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1 });
    const base = baseDependencies(stubMotion());

    const instrumented = instrumentWalkingSessionDependencies(base, log);

    expect(Object.keys(instrumented).sort()).toEqual(Object.keys(base).sort());
    expect(instrumented.createPlacement).toBeDefined();
    expect(instrumented.leaseWarning).toBeDefined();
  });

  it("records the keep-alive that background pickup detection depends on", async () => {
    const log = new DiagnosticsLog({ storage: memoryStorage(), now: () => 1 });
    const instrumented = instrumentWalkingSessionDependencies(
      baseDependencies(stubMotion()),
      log,
    );

    await instrumented.getLocation().startWalkKeepAlive();

    expect(log.entries().map((entry) => entry.event)).toContain(
      "location.startWalkKeepAlive",
    );
  });
});
