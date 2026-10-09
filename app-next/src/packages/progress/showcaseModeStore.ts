import { useSyncExternalStore } from 'react';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
import type { AuthPort } from '../ports/AuthPort';
import { useRuntime } from '../ports/useRuntime';
export const SHOWCASE_OWNER_ACCOUNT_IDS: readonly string[] = ['06035ee9-1f8e-4eb7-a209-5445093e5e97'];
export const showcaseModeStore = createPersistedStore<{ on: boolean }>('showcase-mode', { on: false }, { on: v.bool });
const useShowcaseModeStore = showcaseModeStore;
const accountId = (auth: AuthPort) => {
  const identity = auth.identity();
  return identity.kind === 'canonical' ? identity.userId : null;
};
const showcaseAllowed = (userId: string | null) =>
  __DEV__ || (userId !== null && SHOWCASE_OWNER_ACCOUNT_IDS.includes(userId));
export function toggleShowcaseMode(auth: AuthPort): boolean | null {
  if (!showcaseAllowed(accountId(auth))) return null;
  const on = !showcaseModeStore.getState().data.on;
  showcaseModeStore.getState().patch({ on });
  return on;
}
export function useShowcaseMode(): boolean {
  const { auth } = useRuntime(),
    on = useShowcaseModeStore((s) => s.data.on),
    userId = useSyncExternalStore(auth.subscribeIdentity, () => accountId(auth));
  return on && showcaseAllowed(userId);
}
