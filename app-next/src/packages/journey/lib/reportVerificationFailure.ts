import type { Runtime } from '../../ports/Runtime';
import type { SubscriptionVerificationFailure } from '../../ports/SubscriptionPort';
import { reportRuntimeError } from '../../telemetry/reportRuntimeError';

export function reportVerificationFailure(
  runtime: Runtime,
  reason: SubscriptionVerificationFailure,
  stage: 'selected_account' | 'renewal',
  destination: 'paywall' | 'recovery' | 'retained',
) {
  const error = new Error(`Subscription verification failed: ${reason}`);
  error.name = 'SubscriptionVerificationError';
  try { reportRuntimeError(error); } catch {
  }
  try {
    runtime.analytics.track('subscription_verification_failed', {
      reason_code: reason,
      stage,
      recovery: runtime.subscription.recovery().type,
      destination,
    });
  } catch {
  }
}
