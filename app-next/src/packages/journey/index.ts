import { useSyncExternalStore } from 'react';
import type { Runtime } from '../ports/Runtime';
import type { Entitlement } from '../model/types';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';

type Phase = 'launch' | 'welcome' | 'onboarding' | 'paywall' | 'signIn' | 'setup' | 'app';
type EntryIntent = 'onboarding' | null;
export type JourneyState = { phase: Phase; entryIntent: EntryIntent };

let state: JourneyState = { phase: 'launch', entryIntent: null };
const listeners = new Set<() => void>();
const snapshot = () => state;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const set = (next: JourneyState) => {
  state = next;
  listeners.forEach((listener) => listener());
};
const enter = (phase: Phase) => set({ phase, entryIntent: state.entryIntent });

export const beginLaunch = () => set({ phase: 'launch', entryIntent: null });
export const beginWelcome = () => set({ phase: 'welcome', entryIntent: null });
export const beginOnboarding = () => set({ phase: 'onboarding', entryIntent: 'onboarding' });
export const beginPaywall = () => enter('paywall');
export const beginSignIn = () => enter('signIn');
export const currentJourney = snapshot;

const RENEWAL_OFFLINE_GRACE_MS = 3 * 86_400_000;

export function eligible(entitlement: Entitlement, now = Date.now()) {
  if (entitlement.status !== 'active' && entitlement.status !== 'trial') return false;
  if (entitlement.isLifetime) return true;
  const end = Date.parse(entitlement.accessExpiresAt ?? entitlement.renewsAt ?? '');
  if (Number.isNaN(end)) return !(entitlement.accessExpiresAt ?? entitlement.renewsAt);
  return end + (entitlement.willRenew ? RENEWAL_OFFLINE_GRACE_MS : 0) > now;
}

const access = (runtime: Runtime, entitlement: Entitlement = runtime.subscription.entitlement()) =>
  entitlement.status === 'unknown' ? 'checking' : eligible(entitlement, Date.parse(runtime.clock.now())) ? 'paid' : 'unpaid';

export function admitPaid(runtime: Runtime, setupComplete: boolean): boolean {
  if (access(runtime) !== 'paid') return false;
  enter(setupComplete ? 'app' : 'setup');
  return true;
}

export function resumeLaunch(runtime: Runtime, progress: { setupComplete: boolean; step: string }) {
  if (state.phase !== 'launch') return;
  const status = access(runtime);
  if (progress.setupComplete && status !== 'unpaid') return enter('app');
  if (progress.setupComplete) return enter('paywall');
  if (status === 'paid' && progress.step === 'P') return enter('setup');
  if (progress.step === 'O01') return beginWelcome();
  beginOnboarding();
  if (progress.step === 'P') beginPaywall();
}

export function finishSetup(runtime: Runtime): boolean {
  if (state.phase !== 'setup' || access(runtime) === 'unpaid') return false;
  enter('app');
  return true;
}

export function forgetAccount() {
  beginWelcome();
}

export function useJourney(runtime: Runtime) {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  const status = access(runtime, useEntitlementStore((s) => s.data.entitlement));
  const paid = status !== 'unpaid';
  return {
    ...current,
    paid,
    checking: status === 'checking',
    canEnterApp: current.phase === 'app' && paid,
  };
}
