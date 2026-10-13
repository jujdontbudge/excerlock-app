import { BACKGROUND_CHECK_RENEW_MS } from '../../notifications/notificationPlan';

type Timer = ReturnType<typeof setInterval>;

export type BackgroundCheckDeps = Readonly<{
  arm(): Promise<unknown>;
  disarm(): Promise<unknown>;
  report(error: unknown): void;
}>;

export class BackgroundCheck {
  private timer: Timer | null = null;
  private armed = true;
  private disposed = false;

  constructor(private readonly deps: BackgroundCheckDeps) {}

  sync(needed: boolean): void {
    if (this.disposed) return;
    if (needed) {
      if (this.timer) return;
      this.arm();
      this.timer = setInterval(() => this.arm(), BACKGROUND_CHECK_RENEW_MS);
      return;
    }
    this.stop();
  }

  dispose(): void {
    this.stop();
    this.disposed = true;
  }

  private arm(): void {
    this.armed = true;
    void Promise.resolve().then(() => this.deps.arm()).catch((error: unknown) => this.deps.report(error));
  }

  private stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (!this.armed) return;
    this.armed = false;
    void Promise.resolve().then(() => this.deps.disarm()).catch((error: unknown) => this.deps.report(error));
  }
}
