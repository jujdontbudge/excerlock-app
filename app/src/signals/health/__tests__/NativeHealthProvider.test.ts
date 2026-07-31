import type {
  HealthAuthorizationStatus,
  HealthSample,
  HealthSignal,
} from "..";
import { NativeHealthProvider } from "../NativeHealthProvider";
import type {
  HealthKitClient,
  HealthKitObjectType,
  HealthKitQuery,
  HealthKitSamplePage,
} from "../HealthKitClient";
import { KingstinctHealthKitClient } from "../KingstinctHealthKitClient";
import { ContractKingstinctHealthKitModule } from "../testing/ContractKingstinctHealthKitModule";
import { runHealthProviderContract } from "../testing/providerContract";

const NOW = new Date("2026-07-29T12:00:00-04:00");

runHealthProviderContract("NativeHealthProvider", () => {
  const healthKit = new ContractKingstinctHealthKitModule();
  const provider = new NativeHealthProvider(
    new KingstinctHealthKitClient(healthKit),
    () => NOW,
  );
  return {
    provider,
    advanceTo: (atMs) => healthKit.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

describe("NativeHealthProvider active minutes", () => {
  it("picks Watch exercise time or recorded workouts independently per day", async () => {
    let now = new Date("2026-07-29T12:00:00-04:00");
    const provider = new NativeHealthProvider(
      new HybridHealthKitClient(),
      () => now,
    );

    expect(await provider.getTodayTotal("appleExerciseTime")).toBe(18);

    now = new Date("2026-07-30T12:00:00-04:00");
    expect(await provider.getTodayTotal("appleExerciseTime")).toBe(35);

    provider.dispose();
  });
});

describe("NativeHealthProvider background delivery", () => {
  it("keeps successful authorization when background registration fails", async () => {
    const provider = new NativeHealthProvider(
      new BackgroundFailureHealthKitClient(),
      () => NOW,
    );

    await expect(provider.requestAuth()).resolves.toBe("authorized");
    expect(provider.getAuthorizationStatus()).toBe("authorized");

    provider.dispose();
  });
});

describe("NativeHealthProvider signal coverage", () => {
  it("reads every HealthProvider signal in its condition-domain unit", async () => {
    const provider = new NativeHealthProvider(
      new AllSignalsHealthKitClient(),
      () => NOW,
    );
    const signals: readonly HealthSignal[] = [
      "steps",
      "activeEnergy",
      "appleExerciseTime",
      "walkingRunningDistance",
      "cyclingDistance",
      "swimmingDistance",
      "workout",
    ];

    const totals = await Promise.all(
      signals.map(async (signal) => [signal, await provider.getTodayTotal(signal)]),
    );
    expect(Object.fromEntries(totals)).toEqual({
      steps: 1_234,
      activeEnergy: 321,
      appleExerciseTime: 18,
      walkingRunningDistance: 4.2,
      cyclingDistance: 12.5,
      swimmingDistance: 750,
      workout: 35,
    });

    const anchored = await Promise.all(
      signals.map(async (signal) => [
        signal,
        (await provider.getNewSamples(signal, null)).samples[0]?.value,
      ]),
    );
    expect(Object.fromEntries(anchored)).toEqual({
      steps: 1_234,
      activeEnergy: 321,
      appleExerciseTime: 18,
      walkingRunningDistance: 4.2,
      cyclingDistance: 12.5,
      swimmingDistance: 750,
      workout: 35,
    });

    provider.dispose();
  });
});

class AllSignalsHealthKitClient implements HealthKitClient {
  public getAuthorizationStatus(): HealthAuthorizationStatus {
    return "authorized";
  }

  public async requestAuthorization(): Promise<HealthAuthorizationStatus> {
    return "authorized";
  }

  public async configureBackgroundDelivery(): Promise<void> {}

  public async queryQuantity(
    identifier: HealthKitObjectType,
    unit: string,
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage> {
    const fixture = quantityFixtures[String(identifier)];
    if (fixture === undefined || fixture.unit !== unit) {
      return { samples: [], anchor: `${identifier}:0` };
    }
    return page(fixture.signal, [sample(fixture.value, NOW.toISOString(), false)], query);
  }

  public async queryWorkouts(
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage> {
    return page("workout", [sample(35, NOW.toISOString(), false)], query);
  }

  public subscribe(): () => void {
    return () => undefined;
  }
}

class BackgroundFailureHealthKitClient extends AllSignalsHealthKitClient {
  public override async configureBackgroundDelivery(): Promise<void> {
    throw new Error("background delivery unavailable");
  }
}

const quantityFixtures: Readonly<
  Record<string, { signal: HealthSignal; unit: string; value: number }>
> = {
  HKQuantityTypeIdentifierStepCount: {
    signal: "steps",
    unit: "count",
    value: 1_234,
  },
  HKQuantityTypeIdentifierActiveEnergyBurned: {
    signal: "activeEnergy",
    unit: "kcal",
    value: 321,
  },
  HKQuantityTypeIdentifierAppleExerciseTime: {
    signal: "appleExerciseTime",
    unit: "min",
    value: 18,
  },
  HKQuantityTypeIdentifierDistanceWalkingRunning: {
    signal: "walkingRunningDistance",
    unit: "km",
    value: 4.2,
  },
  HKQuantityTypeIdentifierDistanceCycling: {
    signal: "cyclingDistance",
    unit: "km",
    value: 12.5,
  },
  HKQuantityTypeIdentifierDistanceSwimming: {
    signal: "swimmingDistance",
    unit: "m",
    value: 750,
  },
};

class HybridHealthKitClient implements HealthKitClient {
  public getAuthorizationStatus(): HealthAuthorizationStatus {
    return "authorized";
  }

  public async requestAuthorization(): Promise<HealthAuthorizationStatus> {
    return "authorized";
  }

  public async configureBackgroundDelivery(): Promise<void> {}

  public async queryQuantity(
    identifier: HealthKitObjectType,
    _unit: string,
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage> {
    if (String(identifier) !== "HKQuantityTypeIdentifierAppleExerciseTime") {
      return { samples: [], anchor: `${identifier}:0` };
    }
    return page("appleExerciseTime", exerciseSamples, query);
  }

  public async queryWorkouts(
    query: HealthKitQuery,
  ): Promise<HealthKitSamplePage> {
    return page("workout", workoutSamples, query);
  }

  public subscribe(): () => void {
    return () => undefined;
  }
}

const exerciseSamples: readonly HealthSample[] = [
  sample(18, "2026-07-29T08:00:00-04:00", false),
];

const workoutSamples: readonly HealthSample[] = [
  sample(45, "2026-07-29T07:00:00-04:00", false),
  sample(20, "2026-07-30T07:00:00-04:00", false),
  sample(15, "2026-07-30T09:00:00-04:00", false),
  sample(100, "2026-07-30T10:00:00-04:00", true),
];

function page(
  signal: HealthSignal,
  samples: readonly HealthSample[],
  query: HealthKitQuery,
): HealthKitSamplePage {
  const prefix = `${signal}:`;
  const sequence = query.anchor?.startsWith(prefix)
    ? Number(query.anchor.slice(prefix.length))
    : 0;
  const inRange = samples.filter((sample) => {
    const start = new Date(sample.startISO).getTime();
    return (
      (query.from === undefined || start >= query.from.getTime()) &&
      (query.to === undefined || start <= query.to.getTime())
    );
  });
  return {
    samples: query.anchor === null ? inRange : samples.slice(sequence),
    anchor: `${signal}:${samples.length}`,
  };
}

function sample(
  value: number,
  startISO: string,
  wasUserEntered: boolean,
): HealthSample {
  return {
    value,
    startISO,
    endISO: startISO,
    sourceRevision: { bundleIdentifier: "com.apple.health" },
    wasUserEntered,
  };
}
