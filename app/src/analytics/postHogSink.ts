import type { PropValue } from "@excerlock/analytics-events";
import type { PostHogOptions } from "posthog-react-native";

import { EXPERIMENT_FLAG_BUDGET_MS } from "../experiments";
import type { AnalyticsPayload, AnalyticsSink } from "./sink";

export const FLAG_BUDGET_MS = EXPERIMENT_FLAG_BUDGET_MS;

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
  register(properties: Readonly<Record<string, PropValue>>): void | Promise<void>;
  capture(event: string, properties: Readonly<Record<string, PropValue>>): void;
  screen(screen: string, properties: Readonly<Record<string, PropValue>>): void;
  identify(
    distinctId: string,
    properties: Readonly<Record<string, PropValue>>,
  ): void;
  reset(): void;
}

function definedProperties(
  properties: AnalyticsPayload,
): Readonly<Record<string, PropValue>> {
  return Object.fromEntries(
    Object.entries(properties).filter(
      (entry): entry is [string, PropValue] => entry[1] !== undefined,
    ),
  );
}

export function createPostHogSink(client: PostHogClientPort): AnalyticsSink {
  return {
    register(properties) {
      void client.register(definedProperties(properties));
    },
    capture(event, properties) {
      client.capture(event, definedProperties(properties));
    },
    screen(screen, properties) {
      client.screen(screen, definedProperties(properties));
    },
    identify(distinctId, properties) {
      client.identify(distinctId, definedProperties(properties));
    },
    reset() {
      client.reset();
    },
  };
}
