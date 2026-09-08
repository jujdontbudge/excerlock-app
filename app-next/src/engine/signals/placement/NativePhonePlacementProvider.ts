import type {
  PhonePlacementModuleClient,
  PhonePlacementModuleSubscription,
} from "./PhonePlacementModuleClient";
import type {
  DeviceMotionSample,
  PhonePlacementProvider,
  PhonePlacementSubscription,
} from "./PhonePlacementProvider";

export class NativePhonePlacementProvider implements PhonePlacementProvider {
  private readonly subscriptions = new Set<PhonePlacementModuleSubscription>();
  private started = false;

  public constructor(private readonly client: PhonePlacementModuleClient) {}

  public async start(): Promise<void> {
    await this.client.startDeviceMotion();
    this.started = true;
  }

  public async stop(): Promise<void> {
    await this.client.stopDeviceMotion();
    this.started = false;
  }

  public onSample(
    callback: (sample: DeviceMotionSample) => void,
  ): PhonePlacementSubscription {
    const subscription = this.client.addListener("onDeviceMotion", callback);
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
