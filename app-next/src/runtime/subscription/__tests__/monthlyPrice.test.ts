import { monthlyPrice } from '../monthlyPrice';

test.each([
  [{ amount: 29.99, currencyCode: 'USD' }, { unit: 'year', numberOfUnits: 1 }, 'en-US', '$2.50'],
  [{ amount: 9.99, currencyCode: 'USD' }, { unit: 'month', numberOfUnits: 1 }, 'en-US', '$9.99'],
  [{ amount: 24.99, currencyCode: 'USD' }, { unit: 'month', numberOfUnits: 3 }, 'en-US', '$8.33'],
  [{ amount: 79.99, currencyCode: 'EUR' }, { unit: 'year', numberOfUnits: 1 }, 'de-DE', '6,67 €'],
] as const)('%j billed every %j is %s a month', (price, period, locale, expected) => {
  expect(monthlyPrice(price, period, locale)).toBe(expected);
});

test('has no monthly price without an amount, a currency or a subscription period', () => {
  expect(monthlyPrice(undefined, { unit: 'year', numberOfUnits: 1 }, 'en-US')).toBeNull();
  expect(monthlyPrice({ amount: 9.99, currencyCode: 'USD' }, undefined, 'en-US')).toBeNull();
  expect(monthlyPrice({ amount: 9.99 }, { unit: 'month', numberOfUnits: 1 }, 'en-US')).toBeNull();
});
