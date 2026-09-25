import { base } from './base';
export const scenario25 = base('trial-lapsed-while-closed', 'Trial · lapsed while closed', {
  entitlement: { status: 'trial', renewsAt: '2026-09-06T15:00:00.000Z' },
  entitlementTimeline: [{ status: 'expired', afterMs: 20_000 }],
});
