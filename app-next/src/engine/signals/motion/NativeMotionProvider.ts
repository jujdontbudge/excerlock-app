import type {
  ExcerlockMotionModuleClient,
  MotionModuleSubscription,
} from "./MotionModuleClient";
import type {
  ActivitySample,
  CadenceSample,
  MotionAuthStatus,
  MotionAvailability,
  MotionProvider,
  Unsubscribe,
} from "./MotionProvider";

export class NativeMotionProvider implements MotionProvider {
  private readonly subscriptions = new Set<MotionModuleSubscription>();
  private started = false;

  public constructor(private readonly client: ExcerlockMotionModuleClient) {}

  public getAvailability(): MotionAvailability {
    return this.client.getAvailability();
  }

  public getAuthorizationStatus(): MotionAuthStatus {
    return this.client.getAuthorizationStatus();
  }

  public requestAuthorization(): Promise<MotionAuthStatus> {
    return this.client.requestAuthorization();
  }

  public async start(): Promise<void> {
    await this.client.start();
    this.started = true;
  }

  public async stop(): Promise<void> {
    await this.client.stop();
    this.started = false;
  }

  public queryActivity(
    fromMs: number,
    toMs: number,
  ): Promise<readonly ActivitySample[]> {
    return this.client.queryActivity(fromMs, toMs);
  }

  public querySteps(
    fromMs: number,
    toMs: number,
  ): Promise<{ readonly steps: number }> {
    return this.client.querySteps(fromMs, toMs);
  }

  public on(
    event: "activity",
    callback: (sample: ActivitySample) => void,
  ): Unsubscribe;
  public on(
    event: "cadence",
    callback: (sample: CadenceSample) => void,
  ): Unsubscribe;
  public on(
    event: "activity" | "cadence",
    callback: ((sample: ActivitySample) => void) | ((sample: CadenceSample) => void),
  ): Unsubscribe {
    const subscription = event === "activity"
      ? this.client.addListener(
          "onActivityChange",
          callback as (sample: ActivitySample) => void,
        )
      : this.client.addListener(
          "onCadence",
          callback as (sample: CadenceSample) => void,
        );
    this.subscriptions.add(subscription);

    return () => {
      subscription.remove();
      this.subscriptions.delete(subscription);
    };
  }

  public dispose(): void {
    this.subscriptions.forEach((subscription) => subscription.remove());
    this.subscriptions.clear();
    if (this.started) {
      void this.stop().catch(() => undefined);
    }
  }
}
