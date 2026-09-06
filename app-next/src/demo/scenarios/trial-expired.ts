import { base } from './base';
export const scenario16 = base('trial-expired', 'Trial · expired', {
  entitlement: { status: 'expired', renewsAt: '2026-09-06T15:00:00.000Z' },
});
