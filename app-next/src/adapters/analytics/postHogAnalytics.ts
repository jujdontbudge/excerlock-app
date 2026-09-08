import { PropValue } from '@excerlock/analytics-events';
import { AnalyticsPort } from '../../ports/AnalyticsPort';
import { PostHogClientPort, SafeProperties } from './PostHogClientPort';
import { SUPER_PROPERTIES } from './postHogOptions';
import { isClientEvent, safeProperties, safeScreen } from './privacy';

/** The adapter plus the one control the Settings switch drives. */
export interface PostHogAnalytics extends AnalyticsPort {
  /** Push the current consent answer into the SDK. Called on every emit and on a settings change. */
  syncConsent(): void;
}

export type PostHogAnalyticsOptions = {
  /** D9b — the "Share usage analytics" answer. Read fresh on every emit, never cached. */
  isEnabled: () => boolean;
  /** True while the session has no real user id, so `identify` must not run. */
  isAnonymous: (userId: string) => boolean;
};

/**
 * `AnalyticsPort` over a PostHog client.
 *
 * Three rules live here and nowhere else:
 *
 * 1. **Consent first.** Every emit re-reads the switch. Off means nothing is captured, no screen
 *    is reported, no person is identified, and the SDK itself is opted out.
 * 2. **Registry only.** An event the registry does not give the client is dropped rather than
 *    sent under a name no insight knows, and its properties cross `privacy.ts` first.
 * 3. **Identify only a real user.** An anonymous session leaves the SDK on its own anonymous
 *    distinct id, so signing in merges that history into the Supabase id instead of stranding it.
 */
export function createPostHogAnalytics(
  client: PostHogClientPort,
  { isEnabled, isAnonymous }: PostHogAnalyticsOptions,
): PostHogAnalytics {
  let consent: boolean | null = null;
  let registered = false;

  const syncConsent = (): boolean => {
    const enabled = isEnabled();
    if (enabled !== consent) {
      consent = enabled;
      if (enabled) client.optIn();
      else client.optOut();
    }
    if (enabled && !registered) {
      registered = true;
      client.register(SUPER_PROPERTIES);
    }
    return enabled;
  };

  return {
    syncConsent: () => void syncConsent(),
    track(event, props) {
      if (!syncConsent() || !isClientEvent(event)) return;
      client.capture(event, safeProperties(event, props ?? {}));
    },
    screen(name) {
      const screen = safeScreen(name);
      if (!syncConsent() || screen === null) return;
      client.screen(screen, {});
    },
    identify(id) {
      if (!syncConsent() || isAnonymous(id)) return;
      client.identify(id);
    },
    setPersonProperties(properties) {
      if (!syncConsent()) return;
      const safe = personProperties(properties);
      if (Object.keys(safe).length > 0) client.setPersonProperties(safe);
    },
    reset() {
      client.reset();
      consent = null;
      registered = false;
    },
  };
}

/**
 * The person-property floor. O06–O09 are single choices from closed option lists, so they are
 * short enum-shaped strings; anything long or non-primitive is a free-text field that has no
 * business on a person record (D12).
 */
const MAX_PERSON_VALUE_LENGTH = 64;

function personProperties(properties: Readonly<Record<string, unknown>>): SafeProperties {
  return Object.fromEntries(
    Object.entries(properties).flatMap<[string, PropValue]>(([key, value]) => {
      if (typeof value === 'number' || typeof value === 'boolean') return [[key, value]];
      if (typeof value !== 'string' || value.length === 0) return [];
      return value.length <= MAX_PERSON_VALUE_LENGTH ? [[key, value]] : [];
    }),
  );
}
