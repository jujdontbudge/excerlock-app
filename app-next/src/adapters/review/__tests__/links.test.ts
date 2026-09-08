import { APP_STORE_URL, MANAGE_SUBSCRIPTIONS_URL, writeReviewUrl } from '../../appStore/links';

test('store links point at the ExcerLock record and the review composer', () => {
  expect(APP_STORE_URL).toBe('https://apps.apple.com/app/id6787265352');
  expect(writeReviewUrl()).toBe('https://apps.apple.com/app/id6787265352?action=write-review');
  expect(writeReviewUrl('https://apps.apple.com/app/id1?l=en')).toBe(
    'https://apps.apple.com/app/id1?l=en&action=write-review',
  );
  expect(MANAGE_SUBSCRIPTIONS_URL).toBe('https://apps.apple.com/account/subscriptions');
});
