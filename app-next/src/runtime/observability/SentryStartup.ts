import Constants from 'expo-constants';
import { initializeSentrySdk } from '@sentry-binding';
import { readClientConfiguration } from '../clientConfiguration';

/**
 * Best-effort install of the crash reporter at the very start of the entry
 * bundle, before the runtime boot gate and Expo Router evaluate. The boot gate
 * keeps owning user-visible configuration failures, so an unreadable embedded
 * configuration skips this install instead of throwing from the entry.
 *
 * `initializeSentryOnce` makes the later client-services call idempotent.
 */
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

// index.js imports this module first: import order is the earliest entry
// position available, so a throw on the way to the boot gate is still reported.
initializeSentryAtStartup();
