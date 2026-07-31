import type { PostHogOptions } from "posthog-react-native";

export const FLAG_BUDGET_MS = 500;

/**
 * One auditable SDK policy: explicit product events and feature-flag exposure
 * events only. No lifecycle, UI, crash, survey, GeoIP, or replay collection.
 */
export function buildPostHogOptions(host: string): PostHogOptions {
  return {
    host,
    captureAppLifecycleEvents: false,
    disableGeoip: true,
    disableSurveys: true,
    enableSessionReplay: false,
    errorTracking: {
      autocapture: false,
      exceptionSteps: { enabled: false },
    },
    featureFlagsRequestMaxRetries: 0,
    featureFlagsRequestTimeoutMs: FLAG_BUDGET_MS,
    personProfiles: "identified_only",
    preloadFeatureFlags: true,
    sendFeatureFlagEvent: true,
  };
}
