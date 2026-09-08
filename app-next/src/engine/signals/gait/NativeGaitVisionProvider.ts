import type {
  GaitVisionModuleClient,
  GaitVisionModuleSubscription,
} from "./GaitVisionModuleClient";
import type {
  GaitKeypointSample,
  GaitSampleSubscription,
  GaitVisionProvider,
} from "./GaitVisionProvider";

export class NativeGaitVisionProvider implements GaitVisionProvider {
  private readonly subscriptions = new Set<GaitVisionModuleSubscription>();
  private started = false;

  public constructor(private readonly client: GaitVisionModuleClient) {}

  public async start(): Promise<void> {
    await this.client.start();
    this.started = true;
  }

  public async stop(): Promise<void> {
    await this.client.stop();
    this.started = false;
  }

  public onSample(
    callback: (sample: GaitKeypointSample) => void,
  ): GaitSampleSubscription {
    const subscription = this.client.addListener("onGaitSample", callback);
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
