import { PostHog } from "posthog-node";
import { config } from "../config.js";

export type ServerAnalyticsEvent =
  | "support_submitted"
  | "vendor_connected"
  | "vendor_disconnected"
  | "vendor_webhook_received"
  | "entitlement_mirror_updated";

export interface AnalyticsOptions {
  apiKey: string | undefined;
  host: string;
}

export interface ServerAnalytics {
  capture(
    distinctId: string,
    event: ServerAnalyticsEvent,
    properties?: Record<string, unknown>,
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

  return {
    capture(distinctId, event, properties = {}) {
      // posthog-node's stateless capture path does not merge registered
      // properties, so stamp the server super property explicitly as well.
      client?.capture({
        distinctId,
        event,
        properties: { ...properties, app: "excerlock" },
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
