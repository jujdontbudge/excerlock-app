import type { PaywallProduct } from '../../ports/SubscriptionPort';
import { onboardingStore } from '../../onboarding/onboardingStore';

type Anchor = { price: string; amount: number };
let anchor: Anchor | null = null;

export function rememberMonthlyAnchor(products: readonly PaywallProduct[]) {
  const monthly = products.find((item) => item.periodUnit === 'month' && item.priceAmount);
  anchor = monthly?.priceAmount ? { price: monthly.localizedPrice, amount: monthly.priceAmount } : null;
}

export const monthlyAnchor = () => anchor;

export const closeOfferAvailable = () => anchor !== null && !onboardingStore.getState().data.closeOfferSeen;

export function markCloseOfferSeen() {
  onboardingStore.getState().patch({ closeOfferSeen: true });
}

export function discountPercent(offer: PaywallProduct, monthly: Anchor): number | null {
  if (!offer.priceAmount || offer.periodUnit !== 'year') return null;
  const percent = Math.round((1 - offer.priceAmount / 12 / monthly.amount) * 100);
  return percent > 0 ? percent : null;
}
