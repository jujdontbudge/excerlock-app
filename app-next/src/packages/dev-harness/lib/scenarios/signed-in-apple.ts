import { base } from './base';
export const scenario18 = base('signed-in-apple', 'Signed in with Apple', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
});
export const returningSignedIn = base('returning-signed-in', 'Returning account starts at Welcome', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
});
export const returningUnpaid = base('returning-unpaid', 'Returning account with no subscription', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  entitlement: { status: 'none', renewsAt: null },
});
export const returningUnpaidRemoteBypassAttempt = base(
  'returning-unpaid-remote-bypass-attempt',
  'Returning unpaid account with permissive and failed remote flags',
  {
    session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
    entitlement: { status: 'none', renewsAt: null },
    remoteFlags: { reviewPreset: true, paywallVariant: 'error' },
  },
);
export const returningExpired = base('returning-expired', 'Returning account with expired subscription', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  entitlement: { status: 'expired', renewsAt: null, accessExpiresAt: '2026-09-06T15:00:00.000Z' },
});
export const returningOfflineStaleProfile = base('returning-offline-stale-profile', 'Returning offline account with stale expired profile', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  entitlement: { status: 'expired', renewsAt: null, accessExpiresAt: '2026-09-06T15:00:00.000Z' },
});
export const returningOfflineRenewalDue = base('returning-offline-renewal-due', 'Returning offline subscriber whose renewal date passed', {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
  entitlement: { status: 'active', renewsAt: '2026-09-06T15:00:00.000Z', accessExpiresAt: '2026-09-06T15:00:00.000Z', willRenew: true },
});
export const reinstallKeychain = base('reinstall-keychain', 'Reinstall with saved account and receipt', {
  onboarding: 'fresh',
  profile: {},
  rules: [],
  lockedApps: { handle: null, isEmpty: true },
  ruleDays: [],
  history: [],
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' },
});
