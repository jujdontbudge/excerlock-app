import { init } from '@sentry/react-native';
import { initializeSentryOnce, type SentryBuildMetadata } from './sentry';

/** Root calls this once before rendering. The concrete SDK type checks options. */
export function initializeSentrySdk(dsn: string | undefined, metadata: SentryBuildMetadata): boolean {
  return initializeSentryOnce(init, dsn, metadata);
}
