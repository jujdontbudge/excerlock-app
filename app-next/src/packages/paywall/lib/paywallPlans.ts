import type { PaywallProduct } from '../../ports/SubscriptionPort';

export type PlanPair = { period: string; trial?: PaywallProduct; plain?: PaywallProduct; recommended: boolean };

export function planPairs(products: readonly PaywallProduct[]): PlanPair[] {
  const pairs: PlanPair[] = [];
  for (const product of products) {
    const period = product.periodUnit ?? product.handle;
    let pair = pairs.find((item) => item.period === period);
    if (!pair) {
      pair = { period, recommended: false };
      pairs.push(pair);
    }
    const side = product.offerLabel ? 'trial' : 'plain';
    if (!pair[side]) pair[side] = product;
    if (product.recommended) pair.recommended = true;
  }
  if (!pairs.some((pair) => pair.recommended)) {
    const yearly = pairs.find((pair) => pair.period === 'year');
    if (yearly && pairs.length > 1) yearly.recommended = true;
  }
  return pairs;
}

export const trialSwitchable = (pairs: readonly PlanPair[]) => pairs.some((pair) => pair.trial && pair.plain);

export function planFor(pair: PlanPair, trial: boolean): PaywallProduct {
  return (trial ? (pair.trial ?? pair.plain) : (pair.plain ?? pair.trial))!;
}

export const pairOf = (pairs: readonly PlanPair[], handle: string) =>
  pairs.find((pair) => pair.trial?.handle === handle || pair.plain?.handle === handle);

export function withTrial(products: readonly PaywallProduct[], handle: string): string {
  const pair = pairOf(planPairs(products), handle);
  return pair ? planFor(pair, true).handle : handle;
}

export function zeroPrice(price: string): string {
  return price.replace(/\d(?:[\d.,   ]*\d)?/, (amount) => {
    const decimals = /[.,](\d{1,2})$/.exec(amount);
    return decimals ? `0${amount[amount.length - decimals[1].length - 1]}${'0'.repeat(decimals[1].length)}` : '0';
  });
}
