import { PostHog } from 'posthog-react-native';
import { AnalyticsPort } from '../../ports/AnalyticsPort';
import { Unsubscribe } from '../../ports/models';
import { readClientObservabilityConfig } from '../../observability/runtimeConfig';
import { ANONYMOUS_USER_ID, sessionStore } from '../../state/sessionStore';
import { settingsStore } from '../../state/settingsStore';
import { buildPostHogOptions } from './postHogOptions';
import { createPostHogAnalytics } from './postHogAnalytics';

export type AnalyticsAdapter = { analytics: AnalyticsPort; stop: Unsubscribe };

/**
 * Builds the real adapter, or returns `null` when the project is not configured — a missing key
 * is a build without analytics, never a crash and never a branch at a call site.
 *
 * Consent is read straight from the settings store, and only once that store has hydrated: the
 * default is on, so answering the read before hydration would send the first events of a session
 * belonging to someone who had already opted out.
 */
export function createAnalyticsAdapter(
  config = readClientObservabilityConfig(),
): AnalyticsAdapter | null {
  if (!config.posthogApiKey || !config.posthogHost) return null;

  const client = new PostHog(config.posthogApiKey, buildPostHogOptions(config.posthogHost));
  const analytics = createPostHogAnalytics(client, {
    isEnabled: () =>
      settingsStore.persist.hasHydrated() && settingsStore.getState().data.shareAnalytics,
    isAnonymous: (userId) =>
      userId === ANONYMOUS_USER_ID || sessionStore.getState().data.session.kind === 'anonymous',
  });

  // The switch must reach the SDK even when nothing is emitted afterwards, so a session that ends
  // right after opting out does not flush what it already queued.
  const stop = settingsStore.subscribe(() => analytics.syncConsent());
  analytics.syncConsent();
  return { analytics, stop };
}
