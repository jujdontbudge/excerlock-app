import { captureException } from '@sentry/react-native';

export function reportSentryError(error: unknown): void {
  captureException(error);
}
