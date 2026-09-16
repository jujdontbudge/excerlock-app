import type { Runtime } from '../Runtime';
import { reportRuntimeError } from '../productionRuntime';

export type PaywallErrorOperation = 'load' | 'purchase' | 'restore';

/**
 * B2: paywall failures must never be silent. Sentry owns the stack; one client
 * `paywall_error` event keeps the top of the purchase funnel observable even
 * when Adapty's server-side events never fire (cancel, offline, identity gate).
 */
export function reportPaywallError(
  runtime: Pick<Runtime, 'analytics'>,
  error: unknown,
  operation: PaywallErrorOperation,
): void {
  reportRuntimeError(error);
  runtime.analytics.track('paywall_error', { operation });
}
