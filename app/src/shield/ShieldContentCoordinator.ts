import type {
  ShieldCause,
  ShieldContentPublisher,
  ShieldCopyOverrides,
} from "./ShieldContentPublisher";

export interface ShieldOfferSource {
  current(cause: ShieldCause): string;
}

/** #87 installs the PostHog flag payload behind this vendor-free seam. */
export interface ShieldCopySource {
  current(): ShieldCopyOverrides;
}

export interface ShieldRouteHomeSource {
  available(): Promise<boolean>;
}

export type ShieldContentCoordinatorOptions = Readonly<{
  publisher: Pick<ShieldContentPublisher, "publish">;
  offerSource: ShieldOfferSource;
  copySource: ShieldCopySource;
  routeHomeSource: ShieldRouteHomeSource;
}>;

/** Resolves one fresh extension snapshot whenever lock policy reconciles. */
export class ShieldContentCoordinator {
  public constructor(
    private readonly options: ShieldContentCoordinatorOptions,
  ) {}

  public async publish(cause: ShieldCause): Promise<void> {
    const routeHomeAvailable = await this.options.routeHomeSource.available();
    this.options.publisher.publish({
      cause,
      offerSubtitle: this.options.offerSource.current(cause),
      routeHomeAvailable,
      copyOverrides: this.options.copySource.current(),
    });
  }
}
