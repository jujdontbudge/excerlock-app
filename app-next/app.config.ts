import 'tsx/cjs'; // Expo transpiles only the entry; register external TS config imports.
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { buildClientExtra, resolveBuildEnvironment, updateChannel } from './config/environment';
import { loadBuildEnvironment } from './config/loadEnvironment';
import { nativeConfig } from './config/native';
import { googleOAuthRedirect } from './config/googleOAuth';
import {
  LINKED_RECORDER_BUNDLE_IDS,
  LINKED_RECORDER_RUNTIME,
  LINKED_RECORDER_SCHEME,
  linkedRecorderResearchEnabled,
  linkedRecorderUpdatesConfig,
} from './config/linkedRecorderResearch';

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug) throw new Error('app.json must define name and slug');
  const linkedRecorderResearch = linkedRecorderResearchEnabled(process.env);
  const environment = resolveBuildEnvironment(process.env);
  const values = loadBuildEnvironment();
  const extra = buildClientExtra(values, environment, { requireUploadToken: process.env.EAS_BUILD === 'true' });
  // Upload tooling reads this at build time. Never include the token in Expo config.
  if (!linkedRecorderResearch && process.env.NODE_ENV !== 'test' && values.SENTRY_AUTH_TOKEN && !process.env.SENTRY_AUTH_TOKEN) {
    process.env.SENTRY_AUTH_TOKEN = values.SENTRY_AUTH_TOKEN;
  }
  const google = values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ? googleOAuthRedirect(values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) : null;
  const plugins = linkedRecorderResearch
    ? nativeConfig.plugins.filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== '@sentry/react-native/expo')
    : nativeConfig.plugins;
  return {
    ...config,
    scheme: [linkedRecorderResearch ? LINKED_RECORDER_SCHEME : 'excerlock', ...(google ? [google.scheme] : [])],
    name: config.name,
    slug: config.slug,
    runtimeVersion: linkedRecorderResearch ? LINKED_RECORDER_RUNTIME : '2',
    ios: {
      ...config.ios,
      ...nativeConfig.ios,
      ...(linkedRecorderResearch ? { bundleIdentifier: LINKED_RECORDER_BUNDLE_IDS.app } : {}),
      infoPlist: {
        ...config.ios?.infoPlist,
        ...nativeConfig.ios?.infoPlist,
        ...(linkedRecorderResearch ? {
          CFBundleDisplayName: 'ExcerLock Trace Lab',
          EXCERLOCK_LINKED_RECORDER_TRACE: true,
        } : {}),
      },
    },
    plugins: [...plugins],
    extra: {
      ...config.extra,
      ...extra,
      ...(linkedRecorderResearch ? { clientObservability: {} } : {}),
      clientAuth: { ...extra.clientAuth, googleRedirectUri: google?.redirectUri },
      ...(linkedRecorderResearch ? { linkedRecorderResearch: true } : {}),
    },
    updates: linkedRecorderResearch ? linkedRecorderUpdatesConfig() : {
      url: 'https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2',
      enabled: true,
      requestHeaders: { 'expo-channel-name': updateChannel(environment) },
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 3000,
      useEmbeddedUpdate: true,
      // EAS Free does not support code signing. Do not add a phantom certificate.
    },
  };
};
