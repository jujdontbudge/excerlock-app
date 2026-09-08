import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { entitlementAccess } from '../../domain/entitlementAccess';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { onboardingStore as useOnboardingStore } from '../../state/onboardingStore';

/** Presents a lapse once per status transition, allowing an explicit dismissal to stick. */
export function PaywallGate() {
  const router = useRouter(),
    pathname = usePathname(),
    status = useEntitlementStore((state) => state.data.entitlement.status),
    setupComplete = useOnboardingStore((state) => state.data.setupComplete),
    presented = useRef<string | null>(null),
    access = entitlementAccess(status);

  useEffect(() => {
    if (access.paywall !== 'modal') {
      presented.current = null;
      return;
    }
    if (!setupComplete || pathname === '/') return;
    // Already showing — record it so closing the modal is not undone by a second push.
    if (pathname === '/paywall') {
      presented.current = status;
      return;
    }
    if (presented.current === status) return;
    presented.current = status;
    router.push('/paywall');
  }, [access.paywall, pathname, router, setupComplete, status]);

  return null;
}
