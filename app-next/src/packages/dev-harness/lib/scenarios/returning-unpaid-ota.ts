import { base } from './base';

const unpaid = {
  session: { kind: 'signedIn', provider: 'apple', email: 'alex@example.test' } as const,
  entitlement: { status: 'none', renewsAt: null } as const,
};

export const returningUnpaidOtaHome = base('returning-unpaid-ota-home', 'Returning unpaid account with Home OTA envelope', {
  ...unpaid,
  otaResumeRoute: '/home',
});

export const returningUnpaidOtaUnlock = base('returning-unpaid-ota-unlock', 'Returning unpaid account with unlock OTA envelope', {
  ...unpaid,
  otaResumeRoute: '/unlock/gym',
});
