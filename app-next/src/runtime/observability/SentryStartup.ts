import Constants from 'expo-constants';
import { initializeSentrySdk } from '@sentry-binding';
import { readClientConfiguration } from '../clientConfiguration';

export function initializeSentryAtStartup(): boolean {
  try {
    const expoConfig = Constants.expoConfig;
    const config = readClientConfiguration(expoConfig?.extra);
    return initializeSentrySdk(config.sentryDsn, {
      version: expoConfig?.version ?? '1.0.0',
      build: expoConfig?.ios?.buildNumber ?? '1',
      environment: config.environment,
    });
  } catch {
    return false;
  }
}

initializeSentryAtStartup();
