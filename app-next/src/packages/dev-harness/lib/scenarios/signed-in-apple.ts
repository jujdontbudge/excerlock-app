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
export const returningUnpaidRemoteBypassAttempt = base(
  'returning-unpaid-remote-bypass-attempt',
  'Returning unpaid account with permissive and failed remote flags',
  {
    session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
    entitlement: { status: 'none', renewsAt: null },
    launchSignInRequired: true,
    remoteFlags: { signInRequired: false, reviewPreset: true, paywallVariant: 'error' },
  },
);
export const returningExpired = base('returning-expired', 'Returning account with expired subscription', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  entitlement: { status: 'expired', renewsAt: null, accessExpiresAt: '2026-09-06T15:00:00.000Z' },
  launchSignInRequired: true,
});
export const reinstallKeychain = base('reinstall-keychain', 'Reinstall with saved account and receipt', {
  onboarding: 'fresh',
  profile: {},
  rules: [],
  lockedApps: { handle: null, isEmpty: true },
  ruleDays: [],
  history: [],
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
});
export const subscriptionProofMatching = base('subscription-proof-matching', 'Account-bound subscription proof matches', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
  subscriptionProof: 'matching',
});
export const subscriptionProofWrongAccount = base('subscription-proof-wrong-account', 'Subscription proof names another account', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
  subscriptionProof: 'wrongAccount',
});
export const subscriptionProofWrongEnvironment = base('subscription-proof-wrong-environment', 'Subscription proof names another environment', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
  subscriptionProof: 'wrongEnvironment',
});
export const subscriptionProofUnavailable = base('subscription-proof-unavailable', 'Subscription proof is unavailable', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  launchSignInRequired: true,
  subscriptionProof: 'unavailable',
});
