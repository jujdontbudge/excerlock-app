import type { PaywallProduct } from '../../ports/SubscriptionPort';
import type { PaywallVariant } from '../../telemetry/PostHogAnalyticsAdapter';

export function defaultPlanHandle(products: readonly PaywallProduct[], variant: PaywallVariant): string {
  if (variant === 'variant_b') {
    const recommended = products.find((product) => product.recommended);
    if (recommended) return recommended.handle;
  }
  return products[0]?.handle ?? '';
}
