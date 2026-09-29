import { base } from './base';
export const scenario18 = base('signed-in-apple', 'Signed in with Apple', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
});
export const returningSignedIn = base('returning-signed-in', 'Returning account requires sign-in', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
});
