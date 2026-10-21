import { useSyncExternalStore } from 'react';
import type { Runtime } from '../ports/Runtime';
import type { AuthIdentity } from '../ports/AuthPort';
import type { Entitlement } from '../model/types';
import type { SubscriptionVerificationFailure, PurchaseRecovery } from '../ports/SubscriptionPort';
import {
  forgetSignIn,
  rememberSignIn,
  rememberedSignInStore as useRememberedSignInStore,
  useSignedIn,
} from '../identity/rememberedSignIn';
import { forgetAdmission, rememberedAdmissionStore } from '../subscription/rememberedAdmission';
import { reportVerificationFailure } from './lib/reportVerificationFailure';

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
let verificationRequest = 0;
const enter = (phase: Phase) => { verificationRequest += 1; set({ phase, entryIntent: state.entryIntent, admission: null, error: null }); };
export const beginOnboarding = () => { verificationRequest += 1; set({ phase: 'onboarding', entryIntent: 'onboarding', admission: null, error: null }); };
export const beginPaywall = () => enter('paywall');
export const beginSignIn = () => enter('signIn');
export const beginWelcome = () => { verificationRequest += 1; set({ phase: 'welcome', entryIntent: null, admission: null, error: null }); };
export const beginLaunch = () => { verificationRequest += 1; set({ phase: 'launch', entryIntent: null, admission: null, error: null }); };
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

export function checkoutNeedsVerification(runtime: Runtime) {
  const identity = runtime.auth.identity();
  const remembered = rememberedAdmissionStore.getState().data.admission;
  return runtime.subscription.entitlement().status !== 'none' || Boolean(remembered && remembered.userId === identity.userId);
}

export async function verifySelectedAccount(runtime: Runtime, next: AdmittedPhase = 'setup'): Promise<AdmissionResult> {
  const started = ++verificationRequest;
  const checkingPaywall = state.phase === 'paywall';
  set({ phase: checkingPaywall ? 'paywall' : 'verifying', entryIntent: state.entryIntent, admission: null, error: checkingPaywall ? state.error : null });
  const identity = runtime.auth.identity();
  let failure: SubscriptionVerificationFailure = 'identity_not_ready';
  let recoveryReady = false;
  try {
    if (identity.kind !== 'canonical' || identity.isAnonymous || !identity.userId)
      throw new Error('Sign-in is not ready.');
    failure = 'purchase_recovery';
    await runtime.subscription.recoveryReady();
    recoveryReady = true;
    failure = 'identity_timeout';
    await runtime.auth.waitForReady({ timeoutMs: 15000 });
    if (started !== verificationRequest) return 'unavailable';
    failure = 'identity_changed';
    const selected = account(runtime.auth.identity());
    if (!selected || selected.userId !== identity.userId || selected.generation !== identity.generation)
      throw new Error('Account changed while checking your subscription.');
    failure = 'purchase_recovery';
    const recovery = runtime.subscription.recovery();
    if (recovery.type === 'pending' || (recovery.type === 'accountConnection' && recovery.checkoutUserId !== selected.userId)) {
      await runtime.subscription.restore();
      const connected = runtime.subscription.recovery();
      if (connected.type !== 'accountConnection' || connected.checkoutUserId !== selected.userId)
        throw new Error('Your purchase could not be connected. Retry will not start another purchase.');
    }
    if (started !== verificationRequest) return 'unavailable';
    failure = 'verification_failed';
    const result = await runtime.subscriptionAdmission.verify(selected);
    if (started !== verificationRequest) return 'unavailable';
    failure = 'identity_changed';
    const live = account(runtime.auth.identity());
    if (!live || live.userId !== selected.userId || live.generation !== selected.generation)
      throw new Error('Account changed while checking your subscription.');
    if (result.type === 'unavailable') {
      failure = result.reason ?? 'verification_failed';
      throw new Error('Subscription verification is unavailable');
    }
    if (result.type === 'ineligible') {
      failure = 'purchase_recovery';
      if (runtime.subscription.recovery().type !== 'none')
        throw new Error('Your purchase is still being checked. Retry will not start another purchase.');
      beginPaywall();
      return 'unpaid';
    }
    failure = 'purchase_recovery';
    await runtime.subscription.clearRecovery();
    if (started !== verificationRequest) return 'unavailable';
    failure = 'identity_changed';
    const admitted = account(runtime.auth.identity());
    if (!admitted || admitted.userId !== selected.userId || admitted.generation !== selected.generation)
      throw new Error('Account changed while checking your subscription.');
    set({ phase: next, entryIntent: state.entryIntent, admission: selected, error: null });
    return 'paid';
  } catch {
    if (started !== verificationRequest) return 'unavailable';
    const live = signedInAccount(runtime.auth.identity());
    const canOpenPaywall = recoveryReady && runtime.subscription.recovery().type === 'none' && live &&
      live.userId === identity.userId && live.generation === identity.generation;
    reportVerificationFailure(runtime, failure, 'selected_account', canOpenPaywall ? 'paywall' : 'recovery');
    if (canOpenPaywall) {
      set({ phase: 'paywall', entryIntent: state.entryIntent, admission: null, error: failure });
      return 'unpaid';
    }
    set({
      phase: 'verifying',
      entryIntent: state.entryIntent,
      admission: null,
      error: failure,
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
  if (runtime.subscription.recovery().type === 'none' && runtime.subscriptionAdmission.current(selected))
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
  const result = await runtime.subscriptionAdmission.verify(selected).catch(() => ({ type: 'unavailable' as const, reason: 'verification_failed' as const }));
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
  const retained = Boolean(runtime.subscriptionAdmission.current(selected));
  reportVerificationFailure(runtime, result.reason ?? 'verification_failed', 'renewal', retained ? 'retained' : 'paywall');
  if (!retained && runtime.subscription.recovery().type === 'none') {
    set({ phase: 'paywall', entryIntent: state.entryIntent, admission: null, error: result.reason ?? 'verification_failed' });
  } else if (!retained) {
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
