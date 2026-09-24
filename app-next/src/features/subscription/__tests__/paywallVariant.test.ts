import { defaultPlanHandle } from '../paywallVariant';
import type { PaywallProduct } from '../../../ports/SubscriptionPort';

const product = (handle: string, recommended: boolean): PaywallProduct => ({
  handle,
  vendorProductId: handle,
  title: handle,
  detail: '',
  localizedPrice: '$1.00',
  localizedPeriod: 'month',
  localizedMonthlyPrice: null,
  periodUnit: 'month',
  offerLabel: null,
  recommended,
});

const products = [product('monthly', false), product('annual', true)];

test('control keeps the remote catalog order and variant_b starts on the recommended plan', () => {
  expect(defaultPlanHandle(products, 'control')).toBe('monthly');
  expect(defaultPlanHandle(products, 'variant_b')).toBe('annual');
});

test('an unknown or missing recommendation never leaves the paywall without a plan', () => {
  expect(defaultPlanHandle([product('monthly', false), product('annual', false)], 'variant_b')).toBe('monthly');
  expect(defaultPlanHandle([], 'variant_b')).toBe('');
  expect(defaultPlanHandle([], 'control')).toBe('');
});
