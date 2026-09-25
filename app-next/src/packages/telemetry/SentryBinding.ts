import { init } from '@sentry/react-native';
import { initializeSentryOnce, type SentryBuildMetadata } from './lib/sentry';

export function initializeSentrySdk(dsn: string | undefined, metadata: SentryBuildMetadata): boolean {
  return initializeSentryOnce(init, dsn, metadata);
}
