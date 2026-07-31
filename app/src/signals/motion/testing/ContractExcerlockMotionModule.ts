import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
} from "../MotionProvider";
import type {
  ExcerlockMotionEvent,
  ExcerlockMotionModuleClient,
  MotionModuleSubscription,
} from "../MotionModuleClient";

const historicalActivity: ActivitySample = {
  classes: ["walking"],
  confidence: "high",
  startedAt: -1_000,
  receivedAt: -1_000,
};

export class ContractExcerlockMotionModule
  implements ExcerlockMotionModuleClient
{
  private readonly activityCallbacks = new Set<
    (sample: ActivitySample) => void
  >();
  private readonly cadenceCallbacks = new Set<
    (sample: CadenceSample) => void
  >();
  private started = false;
  public startCalls = 0;

  public getAvailability(): MotionAvailability {
    return { activity: true, cadence: true, stepCounting: true };
  }

  public getAuthorizationStatus(): MotionAuthStatus {
    return "authorized";
  }

  public async requestAuthorization(): Promise<MotionAuthStatus> {
    return "authorized";
  }

  public async start(): Promise<void> {
    this.started = true;
    this.startCalls += 1;
  }

  public async stop(): Promise<void> {
    this.started = false;
  }

  public async queryActivity(
    fromMs: number,
    toMs: number,
  ): Promise<readonly ActivitySample[]> {
    return historicalActivity.startedAt >= fromMs && historicalActivity.startedAt <= toMs
      ? [historicalActivity]
      : [];
  }

  public async querySteps(
    fromMs: number,
    toMs: number,
  ): Promise<{ readonly steps: number }> {
    return { steps: fromMs <= 0 && toMs >= 1_000 ? 12 : 0 };
  }

  public addListener(
    event: "onActivityChange",
    callback: (sample: ActivitySample) => void,
  ): MotionModuleSubscription;
  public addListener(
    event: "onCadence",
    callback: (sample: CadenceSample) => void,
  ): MotionModuleSubscription;
  public addListener(
    event: ExcerlockMotionEvent,
    callback:
      | ((sample: ActivitySample) => void)
      | ((sample: CadenceSample) => void),
  ): MotionModuleSubscription {
    if (event === "onActivityChange") {
      const activityCallback = callback as (sample: ActivitySample) => void;
      this.activityCallbacks.add(activityCallback);
      return { remove: () => this.activityCallbacks.delete(activityCallback) };
    }

    const cadenceCallback = callback as (sample: CadenceSample) => void;
    this.cadenceCallbacks.add(cadenceCallback);
    return { remove: () => this.cadenceCallbacks.delete(cadenceCallback) };
  }

  public emitActivity(sample: ActivitySample): void {
    if (this.started) {
      this.activityCallbacks.forEach((callback) => callback(sample));
    }
  }

  public emitCadence(sample: CadenceSample): void {
    if (this.started) {
      this.cadenceCallbacks.forEach((callback) => callback(sample));
    }
  }

  public advanceTo(atMs: number): void {
    if (!this.started) {
      return;
    }
    if (atMs === 1_000) {
      const cadence: CadenceSample = {
        stepsPerSecond: 1.2,
        cumulativeSteps: 12,
        asOf: 1_000,
      };
      this.emitCadence(cadence);
    }
    if (atMs === 2_000) {
      const activity: ActivitySample = {
        classes: ["stationary"],
        confidence: "medium",
        startedAt: 2_000,
        receivedAt: 2_000,
      };
      this.emitActivity(activity);
    }
  }
}
