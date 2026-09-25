import { base } from './base';
export const scenario26 = base('trial-lapses-in-session', 'Trial · lapses in session', {
  entitlement: { status: 'trial', renewsAt: '2026-09-06T15:00:00.000Z' },
  entitlementTimeline: [
    { status: 'trial', afterMs: 1_000 },
    { status: 'expired', afterMs: 20_000 },
  ],
});
