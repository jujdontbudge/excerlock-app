import { useSyncExternalStore } from 'react';
import type { AuthIdentity, AuthPort } from '../ports/AuthPort';

type GateState = { verified: { userId: string; generation: number } | null; demoAuthorized: boolean };
let state: GateState = { verified: null, demoAuthorized: false };
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const snapshot = () => state;

export function approveLaunchSignIn(identity: AuthIdentity) {
  if (identity.kind !== 'canonical' || identity.isAnonymous || !identity.userId) return false;
  state = { verified: { userId: identity.userId, generation: identity.generation }, demoAuthorized: false };
  notify();
  return true;
}

export function clearLaunchSignIn() {
  state = { verified: null, demoAuthorized: false };
  notify();
}

export function authorizeDemoScenario(required: boolean) {
  if (!__DEV__) return;
  state = { verified: null, demoAuthorized: !required };
  notify();
}

const canonicalKey = (identity: AuthIdentity) =>
  identity.kind === 'canonical' && !identity.isAnonymous && identity.userId
    ? `${identity.userId}:${identity.generation}` : null;

export function useLaunchSignIn(auth: AuthPort) {
  const identityKey = useSyncExternalStore(
    (listener) => auth.subscribeIdentity(listener),
    () => canonicalKey(auth.identity()),
    () => canonicalKey(auth.identity()),
  );
  const approval = useSyncExternalStore(subscribe, snapshot, snapshot);
  return (__DEV__ && approval.demoAuthorized) || Boolean(
    approval.verified && identityKey === `${approval.verified.userId}:${approval.verified.generation}`,
  );
}
