export const APP_GROUP_SHIELD_KEYS = Object.freeze({
  currentCause: "excerlock.shield.current-cause.v1",
  runtimeContext: "excerlock.shield.runtime-context.v1",
  copyOverrides: "excerlock.shield.copy-overrides.v1",
});

export type ShieldCause =
  | "balanceEmpty"
  | "fullLock"
  | "walkAndScrollEnded"
  | "lockWindow";

export type ShieldCopyOverride = Readonly<{
  title?: string;
  subtitle?: string;
}>;

export type ShieldCopyOverrides = Readonly<
  Partial<Record<ShieldCause, ShieldCopyOverride>>
>;

export type ShieldContent = Readonly<{
  cause: ShieldCause;
  offerSubtitle: string;
  routeHomeAvailable: boolean;
  copyOverrides: ShieldCopyOverrides;
}>;

type AppGroupValue =
  | string
  | boolean
  | Readonly<Record<string, unknown>>;

export interface AppGroupWriter {
  set(key: string, value: AppGroupValue): void;
}

/** Writes the one immutable shield snapshot consumed by both extensions. */
export class ShieldContentPublisher {
  public constructor(private readonly appGroup: AppGroupWriter) {}

  public publish(content: ShieldContent): void {
    this.appGroup.set(APP_GROUP_SHIELD_KEYS.currentCause, content.cause);
    this.appGroup.set(APP_GROUP_SHIELD_KEYS.runtimeContext, {
      cause: content.cause,
      offerSubtitle: content.offerSubtitle,
      routeHomeAvailable: content.routeHomeAvailable,
    });
    this.appGroup.set(APP_GROUP_SHIELD_KEYS.copyOverrides, content.copyOverrides);
  }
}
