import { PostHog } from "posthog-react-native";

import type { AnalyticsKit } from "./AnalyticsKit";
import {
  buildPostHogOptions,
  createPostHogSink,
  type PostHogClientPort,
} from "./postHogSink";

export interface PostHogRuntimeConfig {
  apiKey: string | undefined;
  host: string | undefined;
}

export type PostHogClientFactory = (
  apiKey: string,
  options: ReturnType<typeof buildPostHogOptions>,
) => PostHogRuntimeClient;

export interface FeatureFlagClientPort {
  ready(): Promise<void>;
  getDistinctId(): string;
  getDeviceId(): string;
  reloadFeatureFlags(): void;
}

export type PostHogRuntimeClient = PostHogClientPort & FeatureFlagClientPort;

const createClient: PostHogClientFactory = (apiKey, options) =>
  new PostHog(apiKey, options);

export function initializePostHog(
  config: PostHogRuntimeConfig,
  kit: AnalyticsKit,
  factory: PostHogClientFactory = createClient,
): PostHogRuntimeClient | null {
  const apiKey = config.apiKey?.trim();
  const host = config.host?.trim();
  if (!apiKey || !host) {
    return null;
  }

  const client = factory(apiKey, buildPostHogOptions(host));
  kit.installSink(createPostHogSink(client));
  void primeDeviceIdForFlags(client).catch(() => {
    // Analytics and experiments are best-effort; app boot must never fail here.
  });
  return client;
}

/** Ensure the RN SDK has persisted `$device_id` before its explicit flag reload. */
export async function primeDeviceIdForFlags(
  client: FeatureFlagClientPort,
): Promise<void> {
  await client.ready();
  client.getDistinctId();
  client.getDeviceId();
  client.reloadFeatureFlags();
}
