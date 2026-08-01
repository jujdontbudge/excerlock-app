import type { AdaptyProfile } from "react-native-adapty";

import type {
  ActivePremiumEntitlement,
  PremiumEntitlement,
} from "./SubscriptionModule";

export function entitlementFromAdaptyProfile(
  profile: AdaptyProfile,
): PremiumEntitlement {
  const access = profile.accessLevels?.premium;
  return access?.isActive === true
    ? activeEntitlement(access)
    : Object.freeze({ status: "inactive" as const });
}

function activeEntitlement(
  access: NonNullable<AdaptyProfile["accessLevels"]>[string],
): ActivePremiumEntitlement {
  return Object.freeze({
    status: "active",
    productId: access.vendorProductId,
    purchasedAtMs: (access.startsAt ?? access.activatedAt).getTime(),
    renewsAtMs: access.expiresAt?.getTime() ?? Number.MAX_SAFE_INTEGER,
  });
}
