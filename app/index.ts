import * as Sentry from "@sentry/react-native";
import Constants from "expo-constants";

import { analytics, initializePostHog } from "./src/analytics";
import {
  buildSentryOptions,
  readClientObservabilityConfig,
} from "./src/observability";
import { getSubscriptionModule } from "./src/subscription";

const runtimeConfig = readClientObservabilityConfig(
  Constants.expoConfig?.extra,
);
const sentryOptions = buildSentryOptions(runtimeConfig.sentryDsn);

if (sentryOptions) {
  Sentry.init(sentryOptions);
}

initializePostHog(
  {
    apiKey: runtimeConfig.posthogApiKey,
    host: runtimeConfig.posthogHost,
  },
  analytics,
);
getSubscriptionModule();

require("expo-router/entry");
