export const APP_GROUP_SHIELD_KEYS = Object.freeze({
  currentCause: "excerlock.shield.current-cause.v1",
  runtimeContext: "excerlock.shield.runtime-context.v1",
  copyOverrides: "excerlock.shield.copy-overrides.v1",
});

/**
 * The cause strings the two Swift extensions key on (ShieldContent.swift).
 * Deliberately NOT domain/shieldContent.ShieldCause, whose three causes
 * (locked | lockWindow | walkingEnded) are the product model's. P2-T04 maps
 * one to the other and decides whether the Swift raw values change with it.
 */
export type NativeShieldCause =
  | "balanceEmpty"
  | "fullLock"
  | "walkAndScrollEnded"
  | "lockWindow";

export type NativeShieldCopyOverride = Readonly<{
  title?: string;
  subtitle?: string;
}>;

export type NativeShieldCopyOverrides = Readonly<
  Partial<Record<NativeShieldCause, NativeShieldCopyOverride>>
>;

export type NativeShieldContent = Readonly<{
  cause: NativeShieldCause;
  offerSubtitle: string;
  routeHomeAvailable: boolean;
  copyOverrides: NativeShieldCopyOverrides;
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

  public publish(content: NativeShieldContent): void {
    this.appGroup.set(APP_GROUP_SHIELD_KEYS.currentCause, content.cause);
    this.appGroup.set(APP_GROUP_SHIELD_KEYS.runtimeContext, {
      cause: content.cause,
      offerSubtitle: content.offerSubtitle,
      routeHomeAvailable: content.routeHomeAvailable,
    });
    this.appGroup.set(APP_GROUP_SHIELD_KEYS.copyOverrides, content.copyOverrides);
  }
}
