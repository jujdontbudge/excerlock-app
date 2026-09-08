import type {
  PropsOf,
  ServerEventName,
} from "@excerlock/analytics-events";
import { PostHog } from "posthog-node";
import { config } from "../config.js";

export type {
  ServerEventName as ServerAnalyticsEvent,
} from "@excerlock/analytics-events";

export interface AnalyticsOptions {
  apiKey: string | undefined;
  host: string;
}

type AnalyticsSupportCategory =
  PropsOf<"support_request_submitted">["category"];

export interface SupportAnalytics {
  supportRequestSubmitted(
    distinctId: string,
    category: AnalyticsSupportCategory,
  ): void;
}

// v1 ships no direct vendor connections, so the three `vendor_*` events left the registry (P2-T07),
// and P2-T02 removed the OAuth exchange and the webhook receivers that used to report them (D1).
export interface ServerAnalytics extends SupportAnalytics {
  capture<Event extends ServerEventName>(
    distinctId: string,
    event: Event,
    properties?: PropsOf<Event>,
  ): void;
  shutdown(): Promise<void>;
}

export function createAnalytics(options: AnalyticsOptions): ServerAnalytics {
  const client = options.apiKey
    ? new PostHog(options.apiKey, {
        host: options.host,
        flushAt: 10,
        flushInterval: 5_000,
      })
    : null;

  void client?.register({ app: "excerlock" });

  function forwardCapture<Event extends ServerEventName>(
    distinctId: string,
    event: Event,
    properties?: PropsOf<Event>,
  ): void {
    // posthog-node's stateless capture path does not merge registered
    // properties, so stamp the server super property explicitly as well.
    client?.capture({
      distinctId,
      event,
      properties: { ...properties, app: "excerlock" },
    });
  }

  return {
    capture: forwardCapture,
    supportRequestSubmitted(distinctId, category) {
      forwardCapture(distinctId, "support_request_submitted", {
        category,
      });
    },
    async shutdown() {
      await client?.shutdown();
    },
  };
}

export const analytics = createAnalytics({
  apiKey: config.posthogApiKey,
  host: config.posthogHost,
});
