import 'tsx/cjs'; // Expo transpiles only the entry; register external TS config imports.
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { buildClientExtra, resolveBuildEnvironment, updateChannel } from './config/environment';
import { loadBuildEnvironment } from './config/loadEnvironment';
import { nativeConfig } from './config/native';
import { googleOAuthRedirect } from './config/googleOAuth';
// CommonJS is the single executable owner used by Expo config, target configs,
// Babel, and Metro so research identifiers and opt-in parsing cannot drift.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const linkedRecorderConfig = require('./plugins/linkedRecorderResearchConfig') as typeof import('./plugins/linkedRecorderResearchConfig');

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug) throw new Error('app.json must define name and slug');
  const linkedRecorderResearch = linkedRecorderConfig.assertResearchBuildAllowed(process.env);
  const linkedIdentifiers = linkedRecorderConfig.identifiers(process.env);
  const environment = resolveBuildEnvironment(process.env);
  const values = loadBuildEnvironment();
  const extra = buildClientExtra(values, environment, { requireUploadToken: process.env.EAS_BUILD === 'true' });
  // Upload tooling reads this at build time. Never include the token in Expo config.
  if (!linkedRecorderResearch && process.env.NODE_ENV !== 'test' && values.SENTRY_AUTH_TOKEN && !process.env.SENTRY_AUTH_TOKEN) {
    process.env.SENTRY_AUTH_TOKEN = values.SENTRY_AUTH_TOKEN;
  }
  const google = values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ? googleOAuthRedirect(values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID) : null;
  const plugins = linkedRecorderResearch
    ? nativeConfig.plugins
      .filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== '@sentry/react-native/expo')
      .map((plugin) => {
        if (!Array.isArray(plugin) || plugin[0] !== 'react-native-device-activity') return plugin;
        return [plugin[0], { ...(plugin[1] as Record<string, unknown>), appGroup: linkedIdentifiers.appGroup }] as [string, Record<string, unknown>];
      })
    : nativeConfig.plugins;
  return {
    ...config,
    scheme: [linkedRecorderResearch ? linkedRecorderConfig.URL_SCHEME : 'excerlock', ...(google ? [google.scheme] : [])],
    name: config.name,
    slug: config.slug,
    runtimeVersion: linkedRecorderResearch ? linkedRecorderConfig.RUNTIME_VERSION : '2',
    ios: {
      ...config.ios,
      ...nativeConfig.ios,
      ...(linkedRecorderResearch ? {
        bundleIdentifier: linkedIdentifiers.bundleIds.app,
        entitlements: {
          ...nativeConfig.ios?.entitlements,
          'com.apple.security.application-groups': [linkedIdentifiers.appGroup],
        },
      } : {}),
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
      ...(linkedRecorderResearch ? {
        clientObservability: {
          posthogApiKey: 'linked-trace-local',
          posthogHost: 'https://localhost',
          sentryDsn: 'https://localhost',
        },
      } : {}),
      clientAuth: { ...extra.clientAuth, googleRedirectUri: google?.redirectUri },
    },
    updates: linkedRecorderResearch ? linkedRecorderConfig.updatesConfig() : {
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
