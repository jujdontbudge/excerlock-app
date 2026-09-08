import { ShieldCause, ShieldContent } from '../../domain/shieldContent';
import { DeviceActivityApi } from '../../engine/screentime/native/deviceActivityTypes';
import {
  NativeShieldCause,
  NativeShieldCopyOverrides,
  ShieldContentPublisher,
} from '../../engine/shield/ShieldContentPublisher';
import { APP_GROUP_KEYS } from './appGroup';

/**
 * The Swift extensions key on four cause strings (`ShieldContent.swift`, `ShieldActionRoute.swift`)
 * and derive each shield's deep link from the spelling: `fullLock` and `lockWindow` open
 * `excerlock://locked-apps`, everything else `excerlock://`. The domain has three causes, and the
 * fourth — `balanceEmpty` — belonged to the retired balance economy and is never published.
 */
export const NATIVE_CAUSE: Readonly<Record<ShieldCause, NativeShieldCause>> = Object.freeze({
  locked: 'fullLock',
  lockWindow: 'lockWindow',
  walkingEnded: 'walkAndScrollEnded',
});

/** What one shield shows. `offerSubtitle` is the field both extensions read. */
export type PublishedShield = {
  cause: NativeShieldCause;
  offerSubtitle: string;
  routeHomeAvailable: boolean;
};

/**
 * A shield offers the app only when it can say something there: `domain/shieldContent` gives a
 * secondary label exactly when a notification can carry the user home, and the ShieldAction
 * extension's tap-through is what that route is made of.
 */
export function publishedShield(cause: ShieldCause, content: ShieldContent): PublishedShield {
  return {
    cause: NATIVE_CAUSE[cause],
    offerSubtitle: content.subtitle,
    routeHomeAvailable: content.secondary !== undefined,
  };
}

/**
 * Publishes the shield the user would see right now through the ported transport, plus one per
 * monitor (B36) that the monitor extension promotes when its window starts.
 *
 * Titles travel as copy overrides. Every window shares one title, so a single `lockWindow` override
 * is enough: the per-monitor context supplies the subtitle when the extension promotes it.
 */
export function publishShieldContent(
  api: DeviceActivityApi,
  current: { cause: ShieldCause; content: ShieldContent },
  byMonitor: Record<string, ShieldContent>,
): Record<string, PublishedShield> {
  const monitors = Object.fromEntries(
    Object.entries(byMonitor).map(([name, content]) => [name, publishedShield('lockWindow', content)]),
  );
  const window = Object.values(byMonitor)[0];
  const overrides: NativeShieldCopyOverrides = {
    [NATIVE_CAUSE[current.cause]]: { title: current.content.title, subtitle: current.content.subtitle },
    ...(window ? { lockWindow: { title: window.title, subtitle: window.subtitle } } : {}),
  };

  api.setSharedValue(APP_GROUP_KEYS.lockWindowContexts, monitors);
  new ShieldContentPublisher({ set: (key, value) => api.setSharedValue(key, value) }).publish({
    ...publishedShield(current.cause, current.content),
    copyOverrides: overrides,
  });
  return monitors;
}
