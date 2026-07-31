import type { PostHogOptions } from "posthog-react-native";

import type { AnalyticsPayload, AnalyticsSink } from "./sink";

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

export interface PostHogClientPort {
  register(properties: AnalyticsPayload): void | Promise<void>;
  capture(event: string, properties: AnalyticsPayload): void;
  screen(screen: string, properties: AnalyticsPayload): void;
  identify(distinctId: string, properties: AnalyticsPayload): void;
  reset(): void;
}

export function createPostHogSink(client: PostHogClientPort): AnalyticsSink {
  return {
    register(properties) {
      void client.register(properties);
    },
    capture(event, properties) {
      client.capture(event, properties);
    },
    screen(screen, properties) {
      client.screen(screen, properties);
    },
    identify(distinctId, properties) {
      client.identify(distinctId, properties);
    },
    reset() {
      client.reset();
    },
  };
}
