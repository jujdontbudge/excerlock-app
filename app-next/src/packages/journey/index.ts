import { useSyncExternalStore } from 'react';
import type { Runtime } from '../ports/Runtime';
import type { AuthIdentity } from '../ports/AuthPort';
import type { Entitlement } from '../model/types';
import type { PurchaseRecovery } from '../ports/SubscriptionPort';
import { useLaunchSignIn } from '../identity/launchSignInGate';

type Phase =
  | 'welcome'
  | 'onboarding'
  | 'paywall'
  | 'pendingPurchase'
  | 'accountRecovery'
  | 'signIn'
  | 'verifying'
  | 'setup'
  | 'app';
type Admission = { userId: string; generation: number };
type EntryIntent = 'onboarding' | null;
export type JourneyState = {
  phase: Phase;
  entryIntent: EntryIntent;
  admission: Admission | null;
  error: string | null;
};
let state: JourneyState = { phase: 'welcome', entryIntent: null, admission: null, error: null };
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
const enter = (phase: Phase) => set({ phase, entryIntent: state.entryIntent, admission: null, error: null });
export const beginOnboarding = () =>
  set({ phase: 'onboarding', entryIntent: 'onboarding', admission: null, error: null });
export const beginPaywall = () => enter('paywall');
export const beginSignIn = () => enter('signIn');
export const beginWelcome = () => set({ phase: 'welcome', entryIntent: null, admission: null, error: null });
export const currentJourney = snapshot;
export const notePurchaseRecovery = (recovery: PurchaseRecovery) => {
  if (recovery.type === 'pending') enter('pendingPurchase');
  else if (recovery.type === 'accountConnection') enter('accountRecovery');
  else if (state.phase === 'pendingPurchase' || state.phase === 'accountRecovery') enter('paywall');
};

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

const waitForReady = (runtime: Runtime) =>
  new Promise<void>((resolve, reject) => {
    if (runtime.auth.identity().ready) {
      resolve();
      return;
    }
    const timer = setTimeout(() => {
      stop();
      reject(new Error('Identity setup timed out'));
    }, 15000);
    const stop = runtime.auth.subscribeIdentity((identity) => {
      if (!identity.ready) return;
      clearTimeout(timer);
      stop();
      resolve();
    });
    if (runtime.auth.identity().ready) {
      clearTimeout(timer);
      stop();
      resolve();
    }
  });

export async function verifySelectedAccount(runtime: Runtime): Promise<'paid' | 'unpaid' | 'unavailable'> {
  enter('verifying');
  try {
    const identity = runtime.auth.identity();
    if (identity.kind !== 'canonical' || identity.isAnonymous || !identity.userId)
      throw new Error('Sign-in is not ready.');
    await waitForReady(runtime);
    const selected = account(runtime.auth.identity());
    if (!selected || selected.userId !== identity.userId || selected.generation !== identity.generation)
      throw new Error('Account changed while checking your subscription.');
    const result = await runtime.subscriptionAdmission.verify(selected);
    const live = account(runtime.auth.identity());
    if (!live || live.userId !== selected.userId || live.generation !== selected.generation)
      throw new Error('Account changed while checking your subscription.');
    if (result.type === 'unavailable') throw new Error('Subscription verification is unavailable. Retry will not start another purchase.');
    if (result.type === 'ineligible') {
      beginPaywall();
      return 'unpaid';
    }
    await runtime.subscription.clearRecovery();
    set({ phase: 'setup', entryIntent: state.entryIntent, admission: selected, error: null });
    return 'paid';
  } catch {
    set({
      phase: 'verifying',
      entryIntent: state.entryIntent,
      admission: null,
      error: 'Subscription verification is unavailable. Retry will not start another purchase.',
    });
    return 'unavailable';
  }
}

export async function refreshAdmission(runtime: Runtime): Promise<'paid' | 'unpaid' | 'unavailable'> {
  const selected = account(runtime.auth.identity());
  const admitted = state.admission;
  if (
    state.phase !== 'app' ||
    !selected ||
    !admitted ||
    admitted.userId !== selected.userId ||
    admitted.generation !== selected.generation
  ) return 'unavailable';
  const result = await runtime.subscriptionAdmission.verify(selected);
  const live = account(runtime.auth.identity());
  const currentAdmission = state.admission;
  if (
    !live ||
    live.userId !== selected.userId ||
    live.generation !== selected.generation ||
    state.phase !== 'app' ||
    !currentAdmission ||
    currentAdmission.userId !== selected.userId ||
    currentAdmission.generation !== selected.generation
  ) return 'unavailable';
  if (result.type === 'eligible') {
    set({ phase: 'app', entryIntent: state.entryIntent, admission: selected, error: null });
    return 'paid';
  }
  if (result.type === 'ineligible') {
    beginPaywall();
    return 'unpaid';
  }
  if (!runtime.subscriptionAdmission.current(selected)) {
    set({
      phase: 'verifying',
      entryIntent: state.entryIntent,
      admission: null,
      error: 'Subscription verification is unavailable. Retry will not start another purchase.',
    });
  }
  return 'unavailable';
}

export function currentSetupAdmission(runtime: Runtime): Admission | null {
  const identity = account(runtime.auth.identity());
  const admission = state.admission;
  if (
    state.phase !== 'setup' ||
    !identity ||
    !admission ||
    identity.userId !== admission.userId ||
    identity.generation !== admission.generation ||
    !runtime.subscriptionAdmission.current(identity)
  )
    return null;
  return admission;
}

export function finishSetup(runtime: Runtime): boolean {
  const admission = currentSetupAdmission(runtime);
  if (!admission) return false;
  set({ phase: 'app', entryIntent: state.entryIntent, admission, error: null });
  return true;
}

export function useJourney(runtime: Runtime) {
  const current = useSyncExternalStore(subscribe, snapshot, snapshot);
  const signedIn = useLaunchSignIn(runtime.auth);
  const identityKey = useSyncExternalStore(
    (listener) => runtime.auth.subscribeIdentity(listener),
    () => {
      const identity = runtime.auth.identity();
      return `${identity.kind}:${identity.userId}:${identity.generation}:${identity.ready}:${identity.isAnonymous}`;
    },
    () => {
      const identity = runtime.auth.identity();
      return `${identity.kind}:${identity.userId}:${identity.generation}:${identity.ready}:${identity.isAnonymous}`;
    },
  );
  const admission = current.admission;
  const matched = Boolean(
    admission && identityKey === `canonical:${admission.userId}:${admission.generation}:true:false`,
  );
  const now = useSyncExternalStore(runtime.clock.subscribe, runtime.clock.now, runtime.clock.now);
  void now;
  const paid = matched && signedIn && Boolean(admission && runtime.subscriptionAdmission.current(admission));
  return { ...current, paid, canEnterApp: current.phase === 'app' && paid };
}
