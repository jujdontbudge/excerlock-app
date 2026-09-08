import type { PostHogOptions } from 'posthog-react-native';

/** D2 — stamped onto every mobile event so ExcerLock's stay separable in the project. */
export const SUPER_PROPERTIES = { app: 'excerlock' } as const;

/**
 * One auditable SDK policy: explicit product events and feature-flag exposure only. No lifecycle,
 * UI, crash, survey, GeoIP, or replay collection — Sentry owns crashes, and everything the app
 * measures about a person's body or apps stays on the device.
 *
 * `personProfiles: 'identified_only'` is what keeps the anonymous half of the funnel from minting
 * a person record per install: see the identity note in README.md.
 */
export function buildPostHogOptions(host: string): PostHogOptions {
  return {
    host,
    captureAppLifecycleEvents: false,
    disableGeoip: true,
    disableSurveys: true,
    enableSessionReplay: false,
    errorTracking: { autocapture: false, exceptionSteps: { enabled: false } },
    featureFlagsRequestMaxRetries: 0,
    personProfiles: 'identified_only',
    preloadFeatureFlags: true,
    sendFeatureFlagEvent: true,
  };
}
