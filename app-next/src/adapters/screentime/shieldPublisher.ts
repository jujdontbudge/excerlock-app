import { ShieldCause, ShieldContent } from '../../domain/shieldContent';
import { APP_GROUP_KEYS } from './appGroup';
import { DeviceActivityApi } from './deviceActivity';

/**
 * The shipped extensions still spell two causes the old way (`ShieldContent.swift`,
 * `ShieldActionRoute.swift`), and the deep link each shield opens is derived from the spelling:
 * `fullLock` and `lockWindow` go to `excerlock://locked-apps`, everything else to `excerlock://`.
 *
 * merge: P2-T03 moves the targets; P2-T11 renames the Swift cases to the domain's three. Until
 * then this map is the entire contract between the new content model and the extensions.
 */
export const NATIVE_CAUSE: Readonly<Record<ShieldCause, string>> = Object.freeze({
  locked: 'fullLock',
  lockWindow: 'lockWindow',
  walkingEnded: 'walkAndScrollEnded',
});

/**
 * What one shield shows. `offerSubtitle` is the field the extension reads today; the rest is the
 * new model, published alongside it so the Swift change is a read, not a protocol change.
 */
export type PublishedShield = {
  cause: string;
  offerSubtitle: string;
  routeHomeAvailable: boolean;
  title: string;
  subtitle: string;
  primary: string;
  secondary?: string;
};

/** A shield offers the app only when it can say something there; otherwise it just closes. */
export function publishedShield(cause: ShieldCause, content: ShieldContent): PublishedShield {
  return {
    cause: NATIVE_CAUSE[cause],
    offerSubtitle: content.subtitle,
    routeHomeAvailable: content.secondary !== undefined,
    title: content.title,
    subtitle: content.subtitle,
    primary: content.primary,
    ...(content.secondary === undefined ? {} : { secondary: content.secondary }),
  };
}

/**
 * Publishes the shield the user would see right now, plus one per monitor (B36) that the monitor
 * extension promotes when its window starts. Context first, then cause, so a shield that is
 * already on screen never pairs a new cause with the previous cause's copy.
 */
export function publishShieldContent(
  api: DeviceActivityApi,
  current: { cause: ShieldCause; content: ShieldContent },
  byMonitor: Record<string, ShieldContent>,
): Record<string, PublishedShield> {
  const monitors = Object.fromEntries(
    Object.entries(byMonitor).map(([name, content]) => [name, publishedShield('lockWindow', content)]),
  );
  const shield = publishedShield(current.cause, current.content);
  api.setSharedValue(APP_GROUP_KEYS.lockWindowContexts, monitors);
  api.setSharedValue(APP_GROUP_KEYS.copyOverrides, { [shield.cause]: { title: shield.title, subtitle: shield.subtitle } });
  api.setSharedValue(APP_GROUP_KEYS.runtimeContext, shield);
  api.setSharedValue(APP_GROUP_KEYS.currentCause, shield.cause);
  return monitors;
}
