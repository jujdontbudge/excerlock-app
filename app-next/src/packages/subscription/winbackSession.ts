import type { Entitlement } from '../model/types';

let requested = false;
let shown = false;
let observed: Entitlement['status'] | null = null;
let lapsesInSession = 0;

export function noteObservedEntitlement(status: Entitlement['status']): void {
  if ((status === 'expired' || status === 'billingIssue') && (observed === 'trial' || observed === 'active')) lapsesInSession += 1;
  if (status !== 'unknown') observed = status;
}

export function forgetObservedEntitlement(): void {
  observed = null;
  lapsesInSession = 0;
}

export function lapsedDuringSession(): boolean {
  return lapsesInSession > 0;
}

export function sessionLapseCount(): number {
  return lapsesInSession;
}

export function requestWinbackPaywall(): void {
  requested = true;
}

export function winbackPaywallRequested(): boolean {
  return requested;
}

export function markWinbackShown(): void {
  requested = false;
  shown = true;
}

export function winbackShownThisSession(): boolean {
  return shown;
}
