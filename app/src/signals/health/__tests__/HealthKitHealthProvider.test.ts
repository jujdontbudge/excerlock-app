import type {
  HealthAuthorizationStatus,
  HealthSample,
  HealthSignal,
} from "..";
import { HealthKitHealthProvider } from "../HealthKitHealthProvider";
import type {
  HealthKitClient,
  HealthKitObjectType,
  HealthKitQuery,
  HealthKitSamplePage,
} from "../HealthKitClient";
import { runHealthProviderContract } from "../testing/providerContract";

const NOW = new Date("2026-07-29T12:00:00-04:00");

const initialSteps: readonly HealthSample[] = [
  {
    value: 100,
    startISO: "2026-07-29T08:00:00-04:00",
    endISO: "2026-07-29T08:05:00-04:00",
    sourceRevision: { bundleIdentifier: "com.apple.health" },
    wasUserEntered: false,
  },
  {
    value: 900,
    startISO: "2026-07-29T08:05:00-04:00",
    endISO: "2026-07-29T08:06:00-04:00",
    sourceRevision: { bundleIdentifier: "com.apple.health" },
    wasUserEntered: true,
  },
];

const futureStep: HealthSample = {
  value: 50,
  startISO: "2026-07-29T08:06:00-04:00",
  endISO: "2026-07-29T08:07:00-04:00",
  sourceRevision: { bundleIdentifier: "com.apple.health" },
  wasUserEntered: false,
};

class ContractHealthKitClient implements HealthKitClient {
  private readonly callbacks = new Map<
    HealthKitObjectType,
    Set<() => void>
  >();
  private steps: readonly HealthSample[] = initialSteps;

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
    if (identifier !== "HKQuantityTypeIdentifierStepCount") {
      return { samples: [], anchor: `${identifier}:0` };
    }
    return page("steps", this.steps, query);
  }

  public async queryWorkouts(): Promise<HealthKitSamplePage> {
    return { samples: [], anchor: "workout:0" };
  }

  public subscribe(
    type: HealthKitObjectType,
    callback: () => void,
  ): () => void {
    const callbacks = this.callbacks.get(type) ?? new Set<() => void>();
    callbacks.add(callback);
    this.callbacks.set(type, callbacks);
    return () => callbacks.delete(callback);
  }

  public async advanceTo(atMs: number): Promise<void> {
    if (atMs < 2_000 || this.steps.length > initialSteps.length) {
      return;
    }
    this.steps = [...initialSteps, futureStep];
    this.callbacks
      .get("HKQuantityTypeIdentifierStepCount")
      ?.forEach((callback) => callback());
    await Promise.resolve();
  }
}

runHealthProviderContract("HealthKitHealthProvider", () => {
  const client = new ContractHealthKitClient();
  const provider = new HealthKitHealthProvider(client, () => NOW);
  return {
    provider,
    advanceTo: (atMs) => client.advanceTo(atMs),
    dispose: () => provider.dispose(),
  };
});

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
