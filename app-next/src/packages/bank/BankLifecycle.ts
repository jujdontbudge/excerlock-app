import type { Runtime } from '../ports/Runtime';
import type { BankDrainUsage } from '../ports/BankDrainPort';
import { permissionsStore } from '../permissions/permissionsStore';
import { rulesStore } from '../conditions/rulesStore';
import { addDays, dayKey } from '../schedule/calendar';
import { bankStore, type BankAccount } from './bankStore';
import { setBankRuntime } from './lib/session';
export function removeBankCondition(id: string): void {
  if (bankStore.getState().data.account?.conditionId === id) bankStore.getState().patch({ account: null });
}
export function syncBankCondition(now: string, timezone: string): void {
  const condition = rulesStore.getState().data.rules.find((rule) => rule.mode.kind === 'bank');
  const account = bankStore.getState().data.account;
  if (!condition || condition.mode.kind !== 'bank') {
    if (account) bankStore.getState().patch({ account: null });
    return;
  }
  const today = dayKey(now, timezone);
  if (!account || account.conditionId !== condition.id) {
    bankStore.getState().patch({
      account: {
        conditionId: condition.id,
        activity: condition.activity,
        createdAt: condition.createdAt,
        difficulty: condition.mode.difficulty,
        pendingDifficulty: null,
        points: 0,
        pendingPoints: 0,
        bankMinutes: 720,
        drainUsedMinutes: 0,
        drainObservedAt: null,
        days: {},
        difficultyDays: { [dayKey(condition.createdAt, timezone)]: condition.mode.difficulty },
      },
    });
    return;
  }
  let next = account;
  if (account.pendingDifficulty && account.pendingDifficulty.effectiveDay <= today)
    next = {
      ...next,
      difficulty: account.pendingDifficulty.difficulty,
      difficultyDays: {
        ...next.difficultyDays,
        [account.pendingDifficulty.effectiveDay]: account.pendingDifficulty.difficulty,
      },
      pendingDifficulty: null,
    };
  if (condition.mode.difficulty !== (next.pendingDifficulty?.difficulty ?? next.difficulty))
    next = {
      ...next,
      pendingDifficulty:
        condition.mode.difficulty === next.difficulty
          ? null
          : { difficulty: condition.mode.difficulty, effectiveDay: addDays(today, 1) },
    };
  if (next !== account) bankStore.getState().patch({ account: next });
}
export function applyBankDrain(usage: BankDrainUsage): void {
  const account = bankStore.getState().data.account;
  if (
    !account ||
    !Number.isFinite(usage.usedMinutes) ||
    usage.usedMinutes < 0 ||
    !Number.isFinite(Date.parse(usage.observedAt))
  )
    return;
  if (account.drainObservedAt && Date.parse(usage.observedAt) < Date.parse(account.drainObservedAt)) return;
  const used = Math.max(account.drainUsedMinutes, usage.usedMinutes);
  const bankMinutes = Math.max(0, account.bankMinutes - (used - account.drainUsedMinutes));
  if (used === account.drainUsedMinutes) return;
  bankStore
    .getState()
    .patch({ account: { ...account, bankMinutes, drainUsedMinutes: used, drainObservedAt: usage.observedAt } });
}
export function startBankLifecycle(runtime: Runtime, reportError: (error: unknown) => void): () => void {
  setBankRuntime(runtime);
  let disposed = false;
  let syncing = false;
  let initialized = false;
  let queue = Promise.resolve();
  let armed: { id: string; minutes: number; generation: number; selection: string } | null = null;
  let previous: BankAccount | null = bankStore.getState().data.account;
  const sync = () => {
    if (!initialized || syncing || !runtime.status.snapshot().hydrated || runtime.status.snapshot().loading) return;
    syncing = true;
    try {
      const identity = runtime.auth.identity();
      const accountReady = identity.kind === 'canonical' && identity.ready;
      if (accountReady) syncBankCondition(runtime.clock.now(), runtime.clock.timezone());
      const account = bankStore.getState().data.account;
      const before = previous;
      previous = account;
      if (accountReady && account && before?.conditionId !== account.conditionId)
        runtime.analytics.track('bank_condition_created', {
          activity: account.activity,
          difficulty: account.difficulty,
        });
      if (account && before?.conditionId === account.conditionId && before.bankMinutes > 0 && account.bankMinutes === 0)
        runtime.analytics.track('bank_emptied');
      const entitlement = runtime.subscription.entitlement();
      const access =
        ['active', 'trial'].includes(entitlement.status) &&
        (!entitlement.accessExpiresAt ||
          entitlement.isLifetime ||
          entitlement.isInGracePeriod ||
          Date.parse(entitlement.accessExpiresAt) > Date.parse(runtime.clock.now()));
      const selection = rulesStore.getState().data.lockedApps;
      const enabled =
        access &&
        !selection.isEmpty &&
        selection.handle !== null &&
        permissionsStore.getState().data.screenTime === 'granted' &&
        accountReady &&
        account &&
        rulesStore.getState().data.rules.some((rule) => rule.id === account.conditionId && rule.enabled);
      const target =
        enabled && account
          ? {
              id: account.conditionId,
              minutes: account.bankMinutes,
              generation: identity.generation,
              selection: selection.handle!.token,
            }
          : null;
      if (JSON.stringify(target) === JSON.stringify(armed)) return;
      armed = target;
      queue = queue
        .catch(reportError)
        .then(async () => {
          if (disposed) return;
          if (!target) await runtime.bankDrain.disarm();
          else {
            if (bankStore.getState().data.account?.conditionId !== target.id || runtime.auth.identity().generation !== target.generation) return;
            const usage = await runtime.bankDrain.usage();
            if (bankStore.getState().data.account?.conditionId !== target.id || runtime.auth.identity().generation !== target.generation) return;
            applyBankDrain(usage);
            const current = bankStore.getState().data.account;
            if (!current || current.conditionId !== target.id || current.bankMinutes !== target.minutes) return;
            await runtime.bankDrain.arm(target.minutes);
            const after = bankStore.getState().data.account;
            if (after?.conditionId === current.conditionId)
              bankStore
                .getState()
                .patch({ account: { ...after, drainUsedMinutes: 0, drainObservedAt: runtime.clock.now() } });
          }
        })
        .catch((error) => {
          armed = null;
          reportError(error);
        });
    } finally {
      syncing = false;
    }
  };
  const stops = [
    rulesStore.subscribe(sync),
    bankStore.subscribe(sync),
    runtime.clock.subscribe(sync),
    runtime.status.subscribe(sync),
    runtime.auth.subscribeIdentity(sync),
    runtime.subscription.subscribe(sync),
    permissionsStore.subscribe(sync),
    runtime.bankDrain.subscribe((usage) => {
      const identity = runtime.auth.identity();
      if (
        initialized && !disposed && !runtime.status.snapshot().loading &&
        identity.kind === 'canonical' && identity.ready &&
        armed?.generation === identity.generation &&
        armed.id === bankStore.getState().data.account?.conditionId
      ) applyBankDrain(usage);
    }),
  ];
  void runtime.status
    .ready()
    .then(async () => {
      if (disposed) return;
      const identity = runtime.auth.identity();
      const conditionId = bankStore.getState().data.account?.conditionId;
      const usage = await runtime.bankDrain.usage();
      if (disposed) return;
      const currentIdentity = runtime.auth.identity();
      if (
        currentIdentity.kind === 'canonical' && currentIdentity.ready &&
        currentIdentity.generation === identity.generation &&
        conditionId === bankStore.getState().data.account?.conditionId
      ) applyBankDrain(usage);
      initialized = true;
      sync();
    })
    .catch(reportError);
  return () => {
    disposed = true;
    stops.forEach((stop) => stop());
    setBankRuntime(null);
  };
}
