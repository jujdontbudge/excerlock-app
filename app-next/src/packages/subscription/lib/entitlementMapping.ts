import type { Entitlement } from '../../model/types';

export type AdaptyProfileLike = {
  customerUserId?: string;
  accessLevels?: Record<
    string,
    {
      isActive: boolean;
      isLifetime?: boolean;
      isInGracePeriod?: boolean;
      expiresAt?: Date | string;
      willRenew?: boolean;
      billingIssueDetectedAt?: Date | string;
      activeIntroductoryOfferType?: string;
    }
  >;
};

const iso = (value: Date | string | undefined) => (value ? new Date(value).toISOString() : null);

export function mapEntitlement(profile: AdaptyProfileLike | null, now = new Date()): Entitlement {
  if (!profile) return { status: 'unknown', renewsAt: null, observedAt: now.toISOString() };
  const access = profile.accessLevels?.premium;
  if (!access)
    return { status: 'none', renewsAt: null, accessExpiresAt: null, willRenew: null, observedAt: now.toISOString() };
  const expiresAt = iso(access.expiresAt);
  const metadata = {
    renewsAt: access.willRenew ? expiresAt : null,
    accessExpiresAt: expiresAt,
    willRenew: access.willRenew ?? null,
    isInGracePeriod: access.isInGracePeriod === true,
    isLifetime: access.isLifetime === true,
    observedAt: now.toISOString(),
  };
  if (access.isActive) {
    return { ...metadata, status: access.activeIntroductoryOfferType === 'free_trial' ? 'trial' : 'active' };
  }
  if (access.billingIssueDetectedAt) return { ...metadata, status: 'billingIssue' };
  return { ...metadata, status: 'expired' };
}

export type ProfileSource = 'initial' | 'refresh' | 'listener' | 'purchase' | 'restore-return' | 'restore-callback';
export function reduceEntitlement(current: Entitlement, next: Entitlement, source: ProfileSource): Entitlement {
  const restorePaired = source === 'restore-return' || source === 'restore-callback';
  if (
    restorePaired &&
    ['trial', 'active'].includes(current.status) &&
    ['none', 'expired', 'unknown'].includes(next.status)
  )
    return current;
  return next.status === 'unknown' && current.status !== 'unknown' ? current : next;
}
