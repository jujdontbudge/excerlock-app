import type { Runtime } from '../ports/Runtime';
import { BankDrainUsageChanged, type BankDrainPort, type BankDrainUsage } from '../ports/BankDrainPort';
import { permissionsStore } from '../permissions/permissionsStore';
import { rulesStore } from '../conditions/rulesStore';
import { addDays, dayKey } from '../schedule/calendar';
import { bankStore, type BankAccount } from './bankStore';
import { bankRuntime, setBankRuntime, withBankDrain } from './lib/session';
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
        economyVersion: 2,
        conditionId: condition.id,
        activity: condition.activity,
        createdAt: condition.createdAt,
        difficulty: condition.mode.difficulty,
        pendingDifficulty: null,
        points: 0,
        pendingPoints: 0,
        bankMinutes: 720,
        drainUsedMinutes: 0,
        drainArmId: null,
        drainFailed: false,
        earningRanges: {},
        drainObservedAt: null,
        days: {},
        difficultyDays: { [dayKey(condition.createdAt, timezone)]: condition.mode.difficulty },
      },
    });
    const identity = bankRuntime?.auth.identity();
    if (identity?.kind === 'canonical' && identity.ready)
      bankRuntime?.analytics.track('bank_condition_created', {
        activity: condition.activity,
        difficulty: condition.mode.difficulty,
      });
    return;
  }
  const activateDifficulty = (current: BankAccount): BankAccount =>
    current.pendingDifficulty && current.pendingDifficulty.effectiveDay <= today
      ? {
          ...current,
          difficulty: current.pendingDifficulty.difficulty,
          difficultyDays: {
            ...current.difficultyDays,
            [current.pendingDifficulty.effectiveDay]: current.pendingDifficulty.difficulty,
          },
          pendingDifficulty: null,
        }
      : current;
  let next = activateDifficulty(account);
  if (condition.mode.difficulty !== (next.pendingDifficulty?.difficulty ?? next.difficulty))
    next = {
      ...next,
      pendingDifficulty:
        condition.mode.difficulty === next.difficulty
          ? null
          : { difficulty: condition.mode.difficulty, effectiveDay: addDays(dayKey(condition.updatedAt, timezone), 1) },
    };
  next = activateDifficulty(next);
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
  const changedArm =
    usage.armId !== undefined && account.drainArmId !== undefined && usage.armId !== account.drainArmId;
  const previousUsed = changedArm ? 0 : account.drainUsedMinutes;
  const used = Math.max(previousUsed, usage.usedMinutes);
  const bankMinutes = Math.max(0, account.bankMinutes - (used - previousUsed));
  const drainArmId = usage.armId === undefined ? account.drainArmId : usage.armId;
  const drainFailed = usage.failed ?? account.drainFailed ?? false;
  if (used === account.drainUsedMinutes && drainArmId === account.drainArmId && drainFailed === account.drainFailed)
    return;
  bankStore.getState().patch({
    account: {
      ...account,
      bankMinutes,
      drainUsedMinutes: used,
      drainObservedAt: usage.observedAt,
      drainArmId,
      drainFailed,
    },
  });
}
async function disarmAfterUsage(drain: BankDrainPort, consume: () => Promise<void>): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await consume();
    try {
      await drain.disarm();
      return;
    } catch (error) {
      if (!(error instanceof BankDrainUsageChanged)) throw error;
    }
  }
  throw new BankDrainUsageChanged();
}
export function settleBankDrain(drain: BankDrainPort): Promise<void> {
  return withBankDrain(() =>
    disarmAfterUsage(drain, async () => {
      applyBankDrain(await drain.usage());
      await bankStore.persistBarrier();
    }),
  );
}
export function startBankLifecycle(runtime: Runtime, reportError: (error: unknown) => void): () => void {
  setBankRuntime(runtime);
  let disposed = false;
  let initialized = false;
  let running = false;
  let requested = false;
  let reconciled = false;
  type Arm = { id: string; minutes: number; generation: number; selection: string };
  let armed: Arm | null = null;
  let previous: BankAccount | null = bankStore.getState().data.account;
  const target = (): Arm | null => {
    const identity = runtime.auth.identity();
    const status = runtime.status.snapshot();
    if (!status.hydrated || status.loading || identity.kind !== 'canonical' || !identity.ready) return null;
    const account = bankStore.getState().data.account;
    const entitlement = runtime.subscription.entitlement();
    const selection = rulesStore.getState().data.lockedApps;
    const access =
      ['active', 'trial'].includes(entitlement.status) &&
      (!entitlement.accessExpiresAt ||
        entitlement.isLifetime ||
        entitlement.isInGracePeriod ||
        Date.parse(entitlement.accessExpiresAt) > Date.parse(runtime.clock.now()));
    return access &&
      account &&
      !selection.isEmpty &&
      selection.handle &&
      permissionsStore.getState().data.screenTime === 'granted' &&
      rulesStore
        .getState()
        .data.rules.some((rule) => rule.id === account.conditionId && rule.enabled && rule.mode.kind === 'bank')
      ? {
          id: account.conditionId,
          minutes: account.bankMinutes,
          generation: identity.generation,
          selection: runtime.screenTime.selectionVersion?.() ?? selection.handle.token,
        }
      : null;
  };
  const sameOwner = (left: Arm | null, right: Arm | null) =>
    !!left &&
    !!right &&
    left.id === right.id &&
    left.generation === right.generation &&
    left.selection === right.selection;
  const consume = async () => {
    const before = bankStore.getState().data.account;
    const generation = runtime.auth.identity().generation;
    const usage = await runtime.bankDrain.usage();
    if (
      disposed ||
      runtime.auth.identity().generation !== generation ||
      bankStore.getState().data.account?.conditionId !== before?.conditionId ||
      (armed !== null && armed.id !== before?.conditionId)
    )
      return;
    const current = bankStore.getState().data.account;
    applyBankDrain(usage);
    if (usage.armId === null) armed = null;
    const after = bankStore.getState().data.account;
    if (armed && current && after && armed.id === after.conditionId)
      armed.minutes = Math.max(0, armed.minutes - (current.bankMinutes - after.bankMinutes));
    await bankStore.persistBarrier();
  };
  const sync = async () => {
    if (disposed || runtime.status.snapshot().loading) return;
    const identity = runtime.auth.identity();
    if (identity.kind === 'canonical' && identity.ready)
      syncBankCondition(runtime.clock.now(), runtime.clock.timezone());
    const account = bankStore.getState().data.account;
    const before = previous;
    previous = account;
    if (account && before?.conditionId === account.conditionId && before.bankMinutes > 0 && account.bankMinutes === 0)
      runtime.analytics.track('bank_emptied');
    const desired = target();
    if (!desired) {
      if (armed || !reconciled) {
        await disarmAfterUsage(runtime.bankDrain, consume);
        armed = null;
        reconciled = true;
      }
      return;
    }
    if (armed && (armed.id !== desired.id || armed.generation !== desired.generation)) {
      await disarmAfterUsage(runtime.bankDrain, consume);
      armed = null;
    }
    await consume();
    if (disposed || !sameOwner(desired, target())) return;
    const current = bankStore.getState().data.account!;
    if (sameOwner(armed, desired) && armed!.minutes === current.bankMinutes && !current.drainFailed) return;
    const minutes = current.bankMinutes;
    await runtime.bankDrain.arm(minutes);
    if (disposed) return;
    if (!sameOwner(desired, target())) {
      await disarmAfterUsage(runtime.bankDrain, consume);
      armed = null;
      return;
    }
    armed = { ...desired, minutes };
    reconciled = true;
    await consume();
  };
  const request = () => {
    if (disposed || !initialized) return;
    requested = true;
    if (running) return;
    running = true;
    void withBankDrain(async () => {
      do {
        requested = false;
        await sync();
      } while (requested && !disposed);
    })
      .catch((error) => {
        armed = null;
        reconciled = false;
        const account = bankStore.getState().data.account;
        if (account && !account.drainFailed) bankStore.getState().patch({ account: { ...account, drainFailed: true } });
        requested = false;
        reportError(error);
      })
      .finally(() => {
        running = false;
        if (requested) request();
      });
  };
  const stops = [
    rulesStore.subscribe(request),
    bankStore.subscribe(request),
    runtime.clock.subscribe(request),
    runtime.status.subscribe(request),
    runtime.auth.subscribeIdentity(request),
    runtime.subscription.subscribe(request),
    permissionsStore.subscribe(request),
    runtime.bankDrain.subscribe(request),
  ];
  void runtime.status
    .ready()
    .then(() => {
      if (disposed) return;
      initialized = true;
      request();
    })
    .catch(reportError);
  return () => {
    disposed = true;
    stops.forEach((stop) => stop());
    setBankRuntime(null);
  };
}
