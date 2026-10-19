import { useSyncExternalStore } from 'react';
import { createPersistedStore } from '../persistence/createPersistedStore';
import * as v from '../persistence/validation';
import type { AuthPort } from '../ports/AuthPort';
import { useRuntime } from '../ports/useRuntime';
export const SHOWCASE_OWNER_ACCOUNT_IDS: readonly string[] = ['06035ee9-1f8e-4eb7-a209-5445093e5e97'];
export const SHOWCASE_POINTS = 12_000;
export const SHOWCASE_BANK_MINUTES = 17;
export const showcaseModeStore = createPersistedStore<{ on: boolean; spent: number; bought: number }>(
  'showcase-mode',
  { on: false, spent: 0, bought: 0 },
  { on: v.bool, spent: v.number(), bought: v.number() },
);
const useShowcaseModeStore = showcaseModeStore;
const accountId = (auth: AuthPort) => {
  const identity = auth.identity();
  return identity.kind === 'canonical' ? identity.userId : null;
};
const showcaseAllowed = (userId: string | null) =>
  __DEV__ || (userId !== null && SHOWCASE_OWNER_ACCOUNT_IDS.includes(userId));
export function toggleShowcaseMode(auth: AuthPort): boolean | null {
  return setShowcaseMode(auth, !showcaseModeStore.getState().data.on);
}
export function setShowcaseMode(auth: AuthPort, on: boolean): boolean | null {
  if (!showcaseAllowed(accountId(auth))) return null;
  showcaseModeStore.getState().patch(on ? { on, spent: 0, bought: 0 } : { on });
  return on;
}
export function showcaseModeActive(auth: AuthPort): boolean {
  return showcaseModeStore.getState().data.on && showcaseAllowed(accountId(auth));
}
export const showcasePoints = (spent: number) => Math.max(0, SHOWCASE_POINTS - spent);
export function useShowcasePoints(): number {
  return showcasePoints(useShowcaseModeStore((s) => s.data.spent));
}
export function useShowcaseBankMinutes(): number {
  return SHOWCASE_BANK_MINUTES + useShowcaseModeStore((s) => s.data.bought);
}
export function useShowcaseMode(): boolean {
  const { auth } = useRuntime(),
    on = useShowcaseModeStore((s) => s.data.on),
    userId = useSyncExternalStore((listener) => auth.subscribeIdentity(listener), () => accountId(auth));
  return on && showcaseAllowed(userId);
}
