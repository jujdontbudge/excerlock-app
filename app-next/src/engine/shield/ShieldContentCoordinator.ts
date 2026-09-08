import type {
  NativeShieldCause,
  ShieldContentPublisher,
  NativeShieldCopyOverrides,
} from "./ShieldContentPublisher";

export interface ShieldOfferSource {
  resolveOffer(
    cause: NativeShieldCause,
    context: ShieldOfferContext,
  ): string | Promise<string>;
}

export type ShieldOfferContext = Readonly<{
  lockWindowEndsAtMs?: number;
}>;

/** #87 installs the PostHog flag payload behind this vendor-free seam. */
export interface ShieldCopySource {
  getOverrides(): NativeShieldCopyOverrides;
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

  public async publish(
    cause: NativeShieldCause,
    context: ShieldOfferContext = {},
  ): Promise<void> {
    const [routeHomeAvailable, offerSubtitle] = await Promise.all([
      this.options.routeHomeSource.available(),
      this.options.offerSource.resolveOffer(cause, context),
    ]);
    this.options.publisher.publish({
      cause,
      offerSubtitle,
      routeHomeAvailable,
      copyOverrides: this.options.copySource.getOverrides(),
    });
  }
}
