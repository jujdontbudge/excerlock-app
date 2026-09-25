import type { PaywallOperation } from '@excerlock/analytics-events';
import type { Runtime } from '../Runtime';
import { reportRuntimeError } from './reportRuntimeError';

export type PaywallErrorOperation = PaywallOperation;

export function reportPaywallError(
  runtime: Pick<Runtime, 'analytics'>,
  error: unknown,
  operation: PaywallErrorOperation,
): void {
  reportRuntimeError(error);
  runtime.analytics.track('paywall_error', { operation });
}
