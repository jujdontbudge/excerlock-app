import { base } from './base';
export const scenario18 = base('signed-in-apple', 'Signed in with Apple', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
});
export const returningSignedIn = base('returning-signed-in', 'Returning account starts at Welcome', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
});
export const returningUnpaid = base('returning-unpaid', 'Returning account with no subscription', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  entitlement: { status: 'none', renewsAt: null },
  launchSignInRequired: true,
});
