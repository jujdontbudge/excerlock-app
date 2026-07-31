import { PostHog } from "posthog-react-native";

import type { AnalyticsKit } from "./AnalyticsKit";
import {
  buildPostHogOptions,
  createPostHogSink,
  type PostHogClientPort,
} from "./postHogSink";

export interface PostHogRuntimeConfig {
  apiKey: string | undefined;
  host: string;
}

export type PostHogClientFactory = (
  apiKey: string,
  options: ReturnType<typeof buildPostHogOptions>,
) => PostHogClientPort;

const createClient: PostHogClientFactory = (apiKey, options) =>
  new PostHog(apiKey, options);

export function initializePostHog(
  config: PostHogRuntimeConfig,
  kit: AnalyticsKit,
  factory: PostHogClientFactory = createClient,
): PostHogClientPort | null {
  const apiKey = config.apiKey?.trim();
  if (!apiKey) {
    return null;
  }

  const client = factory(apiKey, buildPostHogOptions(config.host));
  kit.installSink(createPostHogSink(client));
  return client;
}
