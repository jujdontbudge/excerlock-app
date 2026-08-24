export interface TreadmillSessionActions {
  completeProppedScan(): boolean;
  start(conditionId: string, mode: "handheld"): Promise<boolean>;
  stop(): Promise<void>;
}

export interface TreadmillScanRouter {
  back(): void;
}

/** Coordinates scan outcomes without coupling the detector to navigation. */
export class TreadmillScanCoordinator {
  public constructor(
    private readonly conditionId: string,
    private readonly session: TreadmillSessionActions,
    private readonly router: TreadmillScanRouter,
  ) {}

  public async verified(): Promise<void> {
    if (this.session.completeProppedScan()) {
      this.router.back();
    }
  }

  public async permissionDenied(): Promise<void> {
    await this.session.stop();
    await this.session.start(this.conditionId, "handheld");
  }

  public continueHandheld(): void {
    this.router.back();
  }

  public async expired(): Promise<void> {
    await this.session.stop();
    this.router.back();
  }
}
