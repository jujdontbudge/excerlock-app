import type { AdaptyAccessLevel, AdaptyProfile } from 'react-native-adapty';
import { Entitlement } from '../../domain/types';

/** The single access level ExcerLock sells, configured in the Adapty dashboard. */
export const PREMIUM_ACCESS_LEVEL = 'premium';

/**
 * The one translation from Adapty's profile to the app's entitlement. Every path into the app —
 * launch, purchase, restore and the profile refresh that mirrors a server webhook — goes through here,
 * so the status the app enforces on can never depend on which call produced it.
 */
export function entitlementFromProfile(profile: AdaptyProfile): Entitlement {
  const access = profile.accessLevels?.[PREMIUM_ACCESS_LEVEL];
  if (!access) return { status: 'none', renewsAt: null };
  return { status: entitlementStatus(access), renewsAt: access.expiresAt?.toISOString() ?? null };
}

function entitlementStatus(access: AdaptyAccessLevel): Entitlement['status'] {
  if (access.isActive) {
    // A billing retry is not a lapse. v1 has no `grace` status, so grace is `active` and shields stay up.
    if (access.isInGracePeriod) return 'active';
    return access.activeIntroductoryOfferType === 'free_trial' ? 'trial' : 'active';
  }
  // A refund ends access outright; it is not a payment Apple will retry.
  if (access.isRefund) return 'expired';
  return access.billingIssueDetectedAt ? 'billingIssue' : 'expired';
}
