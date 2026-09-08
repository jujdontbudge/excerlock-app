import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

import { buildSentryOptions, readClientObservabilityConfig } from './src/observability';

// Sentry initialises before the router entry so a throw during module evaluation — the errors no
// boundary can catch — is still reported. Nothing above this line may import app code.
const sentryOptions = buildSentryOptions(
  readClientObservabilityConfig(Constants.expoConfig?.extra).sentryDsn,
);

if (sentryOptions) {
  Sentry.init(sentryOptions);
}

require('expo-router/entry');
