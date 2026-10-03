import { useSyncExternalStore } from 'react';
import type { AuthIdentity, AuthPort } from '../ports/AuthPort';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';

export const rememberedSignInStore = createPersistedStore<{ userId: string | null }>(
  'remembered-sign-in',
  { userId: null },
  { userId: v.nullable(v.text) },
);
const useRememberedSignInStore = rememberedSignInStore;
let demoAuthorized = false;
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const demoSnapshot = () => demoAuthorized;
const setDemoAuthorized = (value: boolean) => {
  demoAuthorized = value;
  listeners.forEach((listener) => listener());
};

const signedInUser = (identity: AuthIdentity) =>
  identity.kind === 'canonical' && !identity.isAnonymous && identity.userId ? identity.userId : null;

export function rememberSignIn(identity: AuthIdentity) {
  const userId = signedInUser(identity);
  if (!userId) return false;
  setDemoAuthorized(false);
  rememberedSignInStore.getState().patch({ userId });
  return true;
}

export function forgetSignIn() {
  setDemoAuthorized(false);
  rememberedSignInStore.getState().patch({ userId: null });
}

export function authorizeDemoScenario(required: boolean) {
  if (!__DEV__) return;
  setDemoAuthorized(!required);
}

export function useSignedIn(auth: AuthPort) {
  const userId = useSyncExternalStore(
    (listener) => auth.subscribeIdentity(listener),
    () => signedInUser(auth.identity()),
    () => signedInUser(auth.identity()),
  );
  const remembered = useRememberedSignInStore((state) => state.data.userId);
  const demo = useSyncExternalStore(subscribe, demoSnapshot, demoSnapshot);
  return (__DEV__ && demo) || Boolean(userId && remembered === userId);
}
