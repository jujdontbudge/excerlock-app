import { Entitlement } from './types';

export type EntitlementAccess = {
  appAccess: boolean;
  paywall: 'hard' | 'modal' | null;
};

/** Unknown remains on the boot surface until the runtime restores a known-good status. */
export function entitlementAccess(status: Entitlement['status']): EntitlementAccess {
  if (status === 'trial' || status === 'active') return { appAccess: true, paywall: null };
  if (status === 'expired' || status === 'billingIssue') return { appAccess: true, paywall: 'modal' };
  if (status === 'none') return { appAccess: false, paywall: 'hard' };
  return { appAccess: false, paywall: null };
}
