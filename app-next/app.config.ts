import 'tsx/cjs'; // Expo transpiles only the entry; register external TS config imports.
import type { ConfigContext, ExpoConfig } from 'expo/config';
import type { LinkedRecorderIdentifiers } from './plugins/linkedRecorderResearchConfig';
import { buildClientExtra, resolveBuildEnvironment, updateChannel } from './config/environment';
import { loadBuildEnvironment } from './config/loadEnvironment';
import { nativeConfig } from './config/native';
import { googleOAuthRedirect } from './config/googleOAuth';
// CommonJS is the single executable owner used by Expo config, target configs,
// Babel, and Metro so research identifiers and opt-in parsing cannot drift.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const linkedRecorderConfig = require('./plugins/linkedRecorderResearchConfig') as typeof import('./plugins/linkedRecorderResearchConfig');

// Trace Lab carries only its own identity: the lab bundle identifier and App
// Group, with no universal links. A production universal link or OAuth
// redirect must never open the co-installed research app.
function researchIos(ios: ExpoConfig['ios'], identifiers: LinkedRecorderIdentifiers): ExpoConfig['ios'] {
  const entitlements: Record<string, unknown> = {
    ...ios?.entitlements,
    'com.apple.security.application-groups': [identifiers.appGroup],
  };
  delete entitlements['com.apple.developer.associated-domains'];
  const lab = { ...ios, bundleIdentifier: identifiers.bundleIds.app, entitlements };
  delete lab.associatedDomains;
  return lab;
}

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug) throw new Error('app.json must define name and slug');
  const linkedRecorderResearch = linkedRecorderConfig.assertResearchBuildAllowed(process.env);
  const linkedRecorderStandalone = linkedRecorderConfig.standaloneEnabled(process.env);
  const linkedIdentifiers = linkedRecorderConfig.identifiers(process.env);
  const environment = resolveBuildEnvironment(process.env);
  const values = loadBuildEnvironment();
  const extra = buildClientExtra(values, environment, { requireUploadToken: process.env.EAS_BUILD === 'true' });
  // A research bundle (Metro dev or standalone lab) runs the lab-local identity
  // graph, which reads no client identity group. It embeds only the environment
  // marker, so neither a production value nor a placeholder can reach it.
  const clientExtra = linkedRecorderResearch ? { environment } : extra;
  // Upload tooling reads this at build time. Never include the token in Expo config.
  if (!linkedRecorderResearch && process.env.NODE_ENV !== 'test' && values.SENTRY_AUTH_TOKEN && !process.env.SENTRY_AUTH_TOKEN) {
    process.env.SENTRY_AUTH_TOKEN = values.SENTRY_AUTH_TOKEN;
  }
  const googleIosClientId = linkedRecorderResearch ? undefined : values.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
  const google = googleIosClientId ? googleOAuthRedirect(googleIosClientId) : null;
  const plugins = linkedRecorderResearch
    ? [
        ...nativeConfig.plugins
          .filter((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== '@sentry/react-native/expo')
          // A standalone Release research build must not carry the dev client:
          // no launcher, no dev menu, no expo-development-client URL scheme.
          .filter((plugin) => {
            if (!linkedRecorderStandalone) return true;
            const name = Array.isArray(plugin) ? plugin[0] : plugin;
            return typeof name !== 'string' || !linkedRecorderConfig.DEV_CLIENT_MODULES.includes(name);
          })
          .map((plugin) => {
            if (!Array.isArray(plugin) || plugin[0] !== 'react-native-device-activity') return plugin;
            return [plugin[0], { ...(plugin[1] as Record<string, unknown>), appGroup: linkedIdentifiers.appGroup }] as [string, Record<string, unknown>];
          }),
        ...(linkedRecorderStandalone ? ['./plugins/withLinkedRecorderStandalone'] : []),
      ]
    : nativeConfig.plugins;
  return {
    ...config,
    scheme: linkedRecorderResearch ? [linkedRecorderConfig.URL_SCHEME] : ['excerlock', ...(google ? [google.scheme] : [])],
    name: config.name,
    slug: config.slug,
    // 5: the residency module and the watchdog warning are new native code (ADR 0076);
    // EXCERLOCK_OTA_RUNTIME=4 is set only by `excer ota --runtime 4`, after the ship proofs passed on a runtime-4 build.
    runtimeVersion: linkedRecorderResearch ? linkedRecorderConfig.RUNTIME_VERSION : process.env.EXCERLOCK_OTA_RUNTIME === '4' ? '4' : '5',
    ios: {
      ...config.ios,
      ...(linkedRecorderResearch ? researchIos(nativeConfig.ios, linkedIdentifiers) : nativeConfig.ios),
      infoPlist: {
        ...config.ios?.infoPlist,
        ...nativeConfig.ios?.infoPlist,
        ...(linkedRecorderResearch ? { CFBundleDisplayName: 'ExcerLock Trace Lab' } : {}),
      },
    },
    plugins: [...plugins],
    extra: {
      ...config.extra,
      ...clientExtra,
      // Trace Lab omits every client identity group: no Supabase/Adapty/API
      // placeholder and no Google OAuth client or redirect scheme. The lab
      // identity graph is local, and the artifact proof rejects the presence of
      // any production identity field.
      ...(!linkedRecorderResearch && extra.clientAuth
        ? { clientAuth: { ...extra.clientAuth, googleIosClientId, googleRedirectUri: google?.redirectUri } }
        : {}),
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
