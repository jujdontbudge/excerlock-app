import { DEFAULT_TRIAL_OFFER, trialOfferFromProducts } from '../trialOffer';
import { annualProduct, monthlyProduct } from './profiles';

test('the trial offer comes from the product that carries the free trial', () => {
  expect(trialOfferFromProducts([monthlyProduct(), annualProduct()])).toEqual({
    trialDays: 7,
    reminderDaysBefore: 2,
    label: '7-day free trial',
  });
});

test('a trial priced in weeks is counted in days', () => {
  const twoWeeks = annualProduct({
    subscription: {
      subscriptionPeriod: { numberOfUnits: 1, unit: 'year' },
      offer: {
        identifier: { id: 'intro', type: 'introductory' },
        phases: [
          {
            numberOfPeriods: 2,
            paymentMode: 'free_trial',
            subscriptionPeriod: { numberOfUnits: 1, unit: 'week' },
            price: { amount: 0, currencyCode: 'USD', currencySymbol: '$', localizedString: '$0.00' },
          },
        ],
      },
    },
  } as never);
  expect(trialOfferFromProducts([twoWeeks])).toMatchObject({ trialDays: 14, label: '14-day free trial' });
});

test('a catalog with no free trial produces no offer, so the caller keeps the one it had', () => {
  expect(trialOfferFromProducts([monthlyProduct()])).toBeNull();
  expect(trialOfferFromProducts([])).toBeNull();
});

test('the reminder always lands at least a day before billing', () => {
  const oneDay = annualProduct({
    subscription: {
      subscriptionPeriod: { numberOfUnits: 1, unit: 'year' },
      offer: {
        identifier: { id: 'intro', type: 'introductory' },
        phases: [
          {
            numberOfPeriods: 1,
            paymentMode: 'free_trial',
            subscriptionPeriod: { numberOfUnits: 1, unit: 'day' },
            price: { amount: 0, currencyCode: 'USD', currencySymbol: '$', localizedString: '$0.00' },
          },
        ],
      },
    },
  } as never);
  expect(trialOfferFromProducts([oneDay])).toEqual({ trialDays: 1, reminderDaysBefore: 1, label: '1-day free trial' });
});

test('the default offer is only a placeholder until Adapty answers', () => {
  expect(DEFAULT_TRIAL_OFFER).toEqual({ trialDays: 7, reminderDaysBefore: 2, label: '7-day free trial' });
});
