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

export interface ServerAnalytics {
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

  return {
    capture(distinctId, event, properties) {
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
