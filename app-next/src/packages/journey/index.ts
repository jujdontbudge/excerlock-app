import { useSyncExternalStore } from 'react';
import type { Runtime } from '../ports/Runtime';
import type { AuthIdentity } from '../ports/AuthPort';
import type { Entitlement } from '../model/types';
import { useLaunchSignIn } from '../identity/launchSignInGate';
import { entitlementStore as useEntitlementStore } from '../subscription/entitlementStore';

type Phase = 'welcome' | 'onboarding' | 'paywall' | 'signIn' | 'verifying' | 'setup' | 'app';
type Admission = { userId: string; generation: number };
export type JourneyState = { phase: Phase; admission: Admission | null; error: string | null };
let state: JourneyState = { phase: 'welcome', admission: null, error: null };
const listeners = new Set<() => void>();
const snapshot = () => state;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const set = (next: JourneyState) => {
  state = next;
  listeners.forEach((listener) => listener());
};
const enter = (phase: Phase) => set({ phase, admission: null, error: null });
export const beginOnboarding = () => enter('onboarding');
export const beginPaywall = () => enter('paywall');
export const beginSignIn = () => enter('signIn');
export const beginWelcome = () => enter('welcome');
export const currentJourney = snapshot;

const account = (identity: AuthIdentity): Admission | null =>
  identity.kind === 'canonical' && !identity.isAnonymous && identity.ready && identity.userId
    ? { userId: identity.userId, generation: identity.generation }
    : null;

export function eligible(entitlement: Entitlement, now = Date.now()) {
  if (entitlement.status !== 'active' && entitlement.status !== 'trial') return false;
  if (entitlement.isLifetime) return true;
  const end = entitlement.accessExpiresAt ?? entitlement.renewsAt;
  return !end || (Number.isFinite(Date.parse(end)) && Date.parse(end) > now);
}

const waitForReady = (runtime: Runtime) => new Promise<void>((resolve, reject) => {
  if (runtime.auth.identity().ready) { resolve(); return; }
  const timer = setTimeout(() => { stop(); reject(new Error('Identity setup timed out')); }, 15000);
  const stop = runtime.auth.subscribeIdentity((identity) => {
    if (!identity.ready) return;
    clearTimeout(timer);
    stop();
    resolve();
  });
  if (runtime.auth.identity().ready) { clearTimeout(timer); stop(); resolve(); }
});

export async function verifySelectedAccount(runtime: Runtime): Promise<'paid' | 'unpaid' | 'unavailable'> {
  enter('verifying');
  try {
    const identity = runtime.auth.identity();
    if (identity.kind !== 'canonical' || identity.isAnonymous || !identity.userId) throw new Error('Sign-in is not ready.');
    await waitForReady(runtime);
    const entitlement = await runtime.subscription.refresh();
    const selected = account(runtime.auth.identity());
    if (!selected || selected.userId !== identity.userId || selected.generation !== identity.generation) throw new Error('Account changed while checking your subscription.');
    if (entitlement.status === 'unknown') throw new Error('Your subscription could not be checked. Retry when connected.');
    if (!eligible(entitlement, Date.parse(runtime.clock.now()))) {
      beginPaywall();
      return 'unpaid';
    }
    set({ phase: 'setup', admission: selected, error: null });
    return 'paid';
  } catch {
    set({ phase: 'verifying', admission: null, error: 'Your subscription could not be checked. Retry when connected.' });
    return 'unavailable';
  }
}

export function finishSetup(runtime: Runtime): boolean {
  const identity = account(runtime.auth.identity());
  const admission = state.admission;
  if (state.phase !== 'setup' || !identity || !admission ||
      identity.userId !== admission.userId || identity.generation !== admission.generation ||
      !eligible(runtime.subscription.entitlement(), Date.parse(runtime.clock.now()))) return false;
  set({ phase: 'app', admission, error: null });
  return true;
}

export function useJourney(runtime: Runtime) {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  const signedIn = useLaunchSignIn(runtime.auth);
  const entitlement = useEntitlementStore((value) => value.data.entitlement);
  const identityKey = useSyncExternalStore(
    (listener) => runtime.auth.subscribeIdentity(listener),
    () => { const identity = runtime.auth.identity(); return `${identity.kind}:${identity.userId}:${identity.generation}:${identity.ready}:${identity.isAnonymous}`; },
    () => { const identity = runtime.auth.identity(); return `${identity.kind}:${identity.userId}:${identity.generation}:${identity.ready}:${identity.isAnonymous}`; },
  );
  const admission = current.admission;
  const matched = Boolean(admission && identityKey === `canonical:${admission.userId}:${admission.generation}:true:false`);
  const now = useSyncExternalStore(runtime.clock.subscribe, runtime.clock.now, runtime.clock.now);
  const paid = matched && signedIn && eligible(entitlement, Date.parse(now));
  return { ...current, paid, canEnterApp: current.phase === 'app' && paid };
}
