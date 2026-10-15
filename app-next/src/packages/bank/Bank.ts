import { useCallback, useSyncExternalStore } from 'react';
import { useRuntime } from '../ports/useRuntime';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { dayKey } from '../schedule/calendar';
import { bankStore as useBankStore, type BankAccount } from './bankStore';
import { bankRuntime } from './lib/session';
import { offers, dailyMinimum, type OfferId, type BankView } from './economy';
export { offers, activityToGo } from './economy';
export type { Difficulty, OfferId, Offer, BankView } from './economy';
export function useBank(): BankView | null {
  const runtime = useRuntime();
  const subscribe = useCallback((notify: () => void) => runtime.clock.subscribe(notify), [runtime]);
  const read = useCallback(() => runtime.clock.now(), [runtime]);
  const now = useSyncExternalStore(
    subscribe,
    read,
    read,
  );
  const account = useBankStore((state) => state.data.account);
  const enabled = useRulesStore((state) =>
    state.data.rules.some((rule) => rule.enabled && rule.mode.kind === 'bank' && rule.id === account?.conditionId),
  );
  if (!account || !enabled) return null;
  const day = dayKey(now, runtime.clock.timezone());
  const today = account.days[day];
  const difficulty = today?.difficulty ?? account.difficulty;
  const minimum = dailyMinimum(account.activity, difficulty);
  return {
    activity: account.activity,
    difficulty,
    points: account.points,
    pendingPoints: account.pendingPoints,
    firstCollect: neverCollected(account),
    bankMinutes: account.bankMinutes,
    today: { amount: today?.amount ?? 0, minimum, met: (today?.amount ?? 0) >= minimum },
  };
}
function neverCollected(account: BankAccount) {
  const earned = Object.values(account.days).reduce((sum, day) => sum + day.points, 0);
  return account.points === 0 && earned <= account.pendingPoints;
}
export function collectPoints(): number {
  const account = useBankStore.getState().data.account;
  if (!account || account.pendingPoints <= 0) return 0;
  const collected = account.pendingPoints;
  useBankStore.getState().patch({ account: { ...account, points: account.points + collected, pendingPoints: 0 } });
  bankRuntime?.analytics.track('points_collected');
  return collected;
}
export function buyOffer(id: OfferId): 'bought' | 'insufficient' {
  const offer = offers.find((candidate) => candidate.id === id);
  const account = useBankStore.getState().data.account;
  if (!offer || !account || account.points < offer.price) return 'insufficient';
  useBankStore
    .getState()
    .patch({
      account: { ...account, points: account.points - offer.price, bankMinutes: account.bankMinutes + offer.minutes },
    });
  bankRuntime?.analytics.track('offer_bought', { offer_id: id });
  return 'bought';
}
