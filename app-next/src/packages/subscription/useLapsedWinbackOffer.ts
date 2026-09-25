import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import type { Entitlement } from '../model/types';
import { entitlementStore as useEntitlementStore } from './entitlementStore';
import { requestWinbackPaywall, winbackShownThisSession } from './winbackSession';

export function isLapsedEntitlement(status: Entitlement['status']): boolean {
  return status === 'expired';
}

export function useLapsedWinbackOffer(): void {
  const router = useRouter(),
    pathname = usePathname(),
    status = useEntitlementStore((state) => state.data.entitlement.status);
  const settled = useRef(status);
  useEffect(() => {
    const previous = settled.current;
    if (status !== 'unknown') settled.current = status;
    if (!isLapsedEntitlement(status)) return;
    if (previous === 'trial' || previous === 'active') return;
    if (winbackShownThisSession()) return;
    if (pathname === '/paywall') return;
    requestWinbackPaywall();
    router.push('/paywall');
  }, [pathname, router, status]);
}
