import { useCallback, useSyncExternalStore } from 'react';
import { useRuntime } from '../ports/useRuntime';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { dayKey } from '../schedule/calendar';
import { bankStore as useBankStore } from './bankStore';
import { bankRuntime } from './lib/session';
import { offers, dailyMinimum, type OfferId, type BankView } from './economy';
export { offers, activityToGo } from './economy';
export type { Difficulty, OfferId, Offer, BankView } from './economy';
export function useBank(): BankView | null {
  const runtime = useRuntime();
  const subscribe = useCallback((notify: () => void) => runtime.clock.subscribe(notify), [runtime]);
  const read = useCallback(() => runtime.clock.now(), [runtime]);
  const now = useSyncExternalStore(subscribe, read, read);
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
    bankMinutes: account.bankMinutes,
    today: { amount: today?.amount ?? 0, minimum, met: (today?.amount ?? 0) >= minimum },
  };
}
function canUseBank(conditionId: string): boolean {
  const identity = bankRuntime?.auth.identity();
  const status = bankRuntime?.status.snapshot();
  return (
    !!status?.hydrated &&
    !status.loading &&
    identity?.kind === 'canonical' &&
    identity.ready &&
    useRulesStore
      .getState()
      .data.rules.some((rule) => rule.id === conditionId && rule.enabled && rule.mode.kind === 'bank')
  );
}
export function collectPoints(): number {
  const account = useBankStore.getState().data.account;
  if (!account || !canUseBank(account.conditionId) || account.pendingPoints <= 0) return 0;
  const collected = account.pendingPoints;
  useBankStore.getState().patch({ account: { ...account, points: account.points + collected, pendingPoints: 0 } });
  bankRuntime?.analytics.track('points_collected');
  return collected;
}
export function buyOffer(id: OfferId): 'bought' | 'insufficient' {
  const offer = offers.find((candidate) => candidate.id === id);
  const account = useBankStore.getState().data.account;
  if (!offer || !account || !canUseBank(account.conditionId) || account.points < offer.price) return 'insufficient';
  useBankStore.getState().patch({
    account: { ...account, points: account.points - offer.price, bankMinutes: account.bankMinutes + offer.minutes },
  });
  bankRuntime?.analytics.track('offer_bought', { offer_id: id });
  return 'bought';
}
