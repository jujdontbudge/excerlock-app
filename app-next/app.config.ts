import 'tsx/cjs'; // Expo transpiles only the entry; register external TS config imports.
import type { ConfigContext, ExpoConfig } from 'expo/config';
import { buildClientExtra, resolveBuildEnvironment } from './config/environment';
import { loadBuildEnvironment } from './config/loadEnvironment';
import { nativeConfig } from './config/native';

export default ({ config }: ConfigContext): ExpoConfig => {
  if (!config.name || !config.slug) throw new Error('app.json must define name and slug');
  const environment = resolveBuildEnvironment(process.env);
  const values = loadBuildEnvironment();
  const extra = buildClientExtra(values, environment, { requireUploadToken: process.env.EAS_BUILD === 'true' });
  // Upload tooling reads this at build time. Never include the token in Expo config.
  if (process.env.NODE_ENV !== 'test' && values.SENTRY_AUTH_TOKEN && !process.env.SENTRY_AUTH_TOKEN) {
    process.env.SENTRY_AUTH_TOKEN = values.SENTRY_AUTH_TOKEN;
  }
  return {
    ...config,
    name: config.name,
    slug: config.slug,
    runtimeVersion: '1',
    ios: { ...config.ios, ...nativeConfig.ios, infoPlist: { ...config.ios?.infoPlist, ...nativeConfig.ios?.infoPlist } },
    plugins: [...nativeConfig.plugins],
    extra: { ...config.extra, ...extra },
    updates: {
      url: 'https://u.expo.dev/9a358379-d939-4c56-bcea-de3ac5699be2',
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 3000,
      useEmbeddedUpdate: true,
      // EAS Free does not support code signing. Do not add a phantom certificate.
    },
  };
};
