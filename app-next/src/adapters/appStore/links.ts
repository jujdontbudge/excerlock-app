/** ExcerLock's App Store record (App Store Connect app id, read with `asc apps list`). */
export const APP_STORE_ID = '6787265352';
export const APP_STORE_URL = `https://apps.apple.com/app/id${APP_STORE_ID}`;
/** Apple's deep link into the user's subscription list; the only place a subscription is managed. */
export const MANAGE_SUBSCRIPTIONS_URL = 'https://apps.apple.com/account/subscriptions';

/** The product page opened straight onto the review composer, as the store guidelines require for a manual Rate row. */
export function writeReviewUrl(storeUrl: string = APP_STORE_URL): string {
  return `${storeUrl}${storeUrl.includes('?') ? '&' : '?'}action=write-review`;
}
