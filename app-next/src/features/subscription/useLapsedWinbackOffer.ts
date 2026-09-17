import { useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'expo-router';
import type { Entitlement } from '../../domain/types';
import { entitlementStore as useEntitlementStore } from '../../state/entitlementStore';
import { requestWinbackPaywall, winbackShownThisSession } from './winbackSession';

/**
 * Lapsed means the subscription ran out. `billingIssue` keeps its own restore
 * surface (the paywall already explains it), and `none` never subscribed, so
 * neither gets the discounted win-back offer.
 */
export function isLapsedEntitlement(status: Entitlement['status']): boolean {
  return status === 'expired';
}

/**
 * A lapsed subscriber who lands back on Home sees the win-back paywall once per
 * session. The root guard only covers the active→expired transition while the
 * app is open; this covers the cold start that is already expired, because the
 * subscription ran out while the app was closed and there is no transition to
 * observe.
 */
export function useLapsedWinbackOffer(): void {
  const router = useRouter(),
    pathname = usePathname(),
    status = useEntitlementStore((state) => state.data.entitlement.status);
  // A lapse that happens while Home is open belongs to the root guard, which
  // presents the in-app placement once; both effects run in the same commit, so
  // this rail must not stack a second paywall behind it.
  const settled = useRef(status);
  useEffect(() => {
    const previous = settled.current;
    if (status !== 'unknown') settled.current = status;
    if (!isLapsedEntitlement(status)) return;
    if (previous === 'trial' || previous === 'active') return;
    if (winbackShownThisSession()) return;
    // The paywall can already be presented over Home (the root guard's lapse
    // transition); never stack a second one.
    if (pathname === '/paywall') return;
    requestWinbackPaywall();
    router.push('/paywall');
  }, [pathname, router, status]);
}
