import { useSyncExternalStore } from 'react';
import type { Runtime } from '../ports/Runtime';
import type { AuthIdentity } from '../ports/AuthPort';
import type { Entitlement } from '../model/types';
import type { PurchaseRecovery } from '../ports/SubscriptionPort';
import {
  forgetSignIn,
  rememberSignIn,
  rememberedSignInStore as useRememberedSignInStore,
  useSignedIn,
} from '../identity/rememberedSignIn';
import { forgetAdmission } from '../subscription/rememberedAdmission';

type Phase =
  | 'launch'
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
type AdmittedPhase = 'setup' | 'app';
type EntryIntent = 'onboarding' | null;
export type JourneyState = {
  phase: Phase;
  entryIntent: EntryIntent;
  admission: Admission | null;
  error: string | null;
};
let state: JourneyState = { phase: 'launch', entryIntent: null, admission: null, error: null };
const listeners = new Set<() => void>();
const snapshot = () => state;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const notify = () => listeners.forEach((listener) => listener());
const set = (next: JourneyState) => {
  state = next;
  notify();
};
type AdmissionResult = 'paid' | 'unpaid' | 'unavailable';
const RENEW_BEFORE_MS = 60_000;
const RENEW_RETRY_MS = 15_000;
const MAX_RENEW_RETRY_MS = 5 * 60_000;
let refreshing: Promise<AdmissionResult> | null = null;
let lastRenewal = Number.NEGATIVE_INFINITY;
let renewRetryMs = RENEW_RETRY_MS;
const renewing = () => refreshing !== null;
const enter = (phase: Phase) => set({ phase, entryIntent: state.entryIntent, admission: null, error: null });
export const beginOnboarding = () =>
  set({ phase: 'onboarding', entryIntent: 'onboarding', admission: null, error: null });
export const beginPaywall = () => enter('paywall');
export const beginSignIn = () => enter('signIn');
export const beginWelcome = () => set({ phase: 'welcome', entryIntent: null, admission: null, error: null });
export const beginLaunch = () => set({ phase: 'launch', entryIntent: null, admission: null, error: null });
export const currentJourney = snapshot;
export const notePurchaseRecovery = (recovery: PurchaseRecovery) => {
  if (recovery.type === 'pending') enter('pendingPurchase');
  else if (recovery.type === 'accountConnection') enter('accountRecovery');
  else if (state.phase === 'pendingPurchase' || state.phase === 'accountRecovery') enter('paywall');
};

const signedInAccount = (identity: AuthIdentity): Admission | null =>
  identity.kind === 'canonical' && !identity.isAnonymous && identity.userId
    ? { userId: identity.userId, generation: identity.generation }
    : null;
const account = (identity: AuthIdentity): Admission | null => (identity.ready ? signedInAccount(identity) : null);

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

export async function verifySelectedAccount(runtime: Runtime, next: AdmittedPhase = 'setup'): Promise<AdmissionResult> {
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
    set({ phase: next, entryIntent: state.entryIntent, admission: selected, error: null });
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

const returning = (userId: string | null, remembered: string | null, setupComplete: boolean) =>
  Boolean(userId && (remembered === userId || (remembered === null && setupComplete)));
const signedInUserId = (runtime: Runtime) => signedInAccount(runtime.auth.identity())?.userId ?? null;

export function useReturningAccount(runtime: Runtime, setupComplete: boolean) {
  const userId = useSyncExternalStore(
    (listener) => runtime.auth.subscribeIdentity(listener),
    () => signedInUserId(runtime),
    () => signedInUserId(runtime),
  );
  const remembered = useRememberedSignInStore((s) => s.data.userId);
  return returning(userId, remembered, setupComplete);
}

export function resumeReturningAccount(runtime: Runtime, setupComplete: boolean) {
  const identity = runtime.auth.identity();
  const selected = signedInAccount(identity);
  const remembered = useRememberedSignInStore.getState().data.userId;
  if (state.phase !== 'launch' || !selected || !returning(selected.userId, remembered, setupComplete)) return;
  rememberSignIn(identity);
  lastRenewal = Number.NEGATIVE_INFINITY;
  renewRetryMs = RENEW_RETRY_MS;
  const next: AdmittedPhase = setupComplete ? 'app' : 'setup';
  if (runtime.subscriptionAdmission.current(selected))
    set({ phase: next, entryIntent: null, admission: selected, error: null });
  else void verifySelectedAccount(runtime, next);
}

export function forgetAccount(runtime: Runtime) {
  forgetSignIn();
  forgetAdmission();
  runtime.subscriptionAdmission.invalidate();
  beginWelcome();
}

export function refreshAdmission(runtime: Runtime): Promise<AdmissionResult> {
  if (refreshing) return refreshing;
  const selected = account(runtime.auth.identity());
  const admitted = state.admission;
  const phase = state.phase;
  if (
    (phase !== 'app' && phase !== 'setup') ||
    !selected ||
    !admitted ||
    admitted.userId !== selected.userId ||
    admitted.generation !== selected.generation
  ) return Promise.resolve('unavailable');
  refreshing = reverify(runtime, selected, phase).finally(() => {
    refreshing = null;
    notify();
  });
  notify();
  return refreshing;
}

export function renewAdmission(runtime: Runtime) {
  const admitted = state.admission;
  if (refreshing || (state.phase !== 'app' && state.phase !== 'setup') || !admitted) return;
  if (!account(runtime.auth.identity())) return;
  if (runtime.subscriptionAdmission.remainingMs(admitted) > RENEW_BEFORE_MS) return;
  const now = Date.parse(runtime.clock.now());
  if (Math.abs(now - lastRenewal) < renewRetryMs) return;
  lastRenewal = now;
  return refreshAdmission(runtime).then((result) => {
    renewRetryMs = result === 'unavailable' ? Math.min(renewRetryMs * 2, MAX_RENEW_RETRY_MS) : RENEW_RETRY_MS;
    return result;
  });
}

async function reverify(runtime: Runtime, selected: Admission, phase: 'app' | 'setup'): Promise<AdmissionResult> {
  const result = await runtime.subscriptionAdmission.verify(selected);
  const live = account(runtime.auth.identity());
  const currentAdmission = state.admission;
  if (
    !live ||
    live.userId !== selected.userId ||
    live.generation !== selected.generation ||
    state.phase !== phase ||
    !currentAdmission ||
    currentAdmission.userId !== selected.userId ||
    currentAdmission.generation !== selected.generation
  ) return 'unavailable';
  if (result.type === 'eligible') {
    set({ phase, entryIntent: state.entryIntent, admission: selected, error: null });
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
  const identity = signedInAccount(runtime.auth.identity());
  const admission = state.admission;
  if (
    state.phase !== 'setup' ||
    !identity ||
    !admission ||
    identity.userId !== admission.userId ||
    identity.generation !== admission.generation ||
    (!renewing() && !runtime.subscriptionAdmission.current(identity))
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
  const signedIn = useSignedIn(runtime.auth);
  const identityKey = useSyncExternalStore(
    (listener) => runtime.auth.subscribeIdentity(listener),
    () => {
      const identity = runtime.auth.identity();
      return `${identity.kind}:${identity.userId}:${identity.generation}:${identity.isAnonymous}`;
    },
    () => {
      const identity = runtime.auth.identity();
      return `${identity.kind}:${identity.userId}:${identity.generation}:${identity.isAnonymous}`;
    },
  );
  const admission = current.admission;
  const matched = Boolean(
    admission && identityKey === `canonical:${admission.userId}:${admission.generation}:false`,
  );
  const now = useSyncExternalStore(runtime.clock.subscribe, runtime.clock.now, runtime.clock.now);
  void now;
  const checking = useSyncExternalStore(subscribe, renewing, renewing);
  const leased = matched && signedIn && Boolean(admission && runtime.subscriptionAdmission.current(admission));
  const paid = leased || (matched && signedIn && checking);
  return { ...current, paid, checking: paid && !leased, canEnterApp: current.phase === 'app' && paid };
}
