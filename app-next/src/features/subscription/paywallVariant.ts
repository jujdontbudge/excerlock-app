import type { PaywallProduct } from '../../ports/SubscriptionPort';
import type { PaywallVariant } from '../../runtime/analytics/PostHogAnalyticsAdapter';

/**
 * The plan the mounted paywall starts on (B7 UI variation).
 *
 * `control` keeps the remote catalog order. `variant_b` starts on the plan
 * Adapty marks recommended. Which plans exist, their order and their prices
 * stay Adapty-owned — the PostHog variant only changes the initial choice, and
 * a variant is never applied after the user has picked a plan themselves.
 */
export function defaultPlanHandle(products: readonly PaywallProduct[], variant: PaywallVariant): string {
  if (variant === 'variant_b') {
    const recommended = products.find((product) => product.recommended);
    if (recommended) return recommended.handle;
  }
  return products[0]?.handle ?? '';
}
