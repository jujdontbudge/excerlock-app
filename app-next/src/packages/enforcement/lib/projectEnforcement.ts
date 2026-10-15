import type { Entitlement, LockDecision } from '../../model/types';
import type { WatchdogContext } from '../../ports/watchdog';
import type { EnforcementSnapshot } from '../EnforcementHost';

export type EnforcementProjection = {
  revision: number;
  now: number;
  context: WatchdogContext;
  decision: LockDecision;
  entitlement: Entitlement;
  deleting: boolean;
  screenTimeAuthorized: boolean;
  selectionEmpty: boolean;
  activeUntil: number | null;
  windows: NonNullable<EnforcementSnapshot['windows']>;
};

export function projectEnforcement(input: EnforcementProjection): EnforcementSnapshot {
  const { now, windows, decision } = input;
  if (!Number.isFinite(now) || !Number.isSafeInteger(input.revision) || input.revision < 0) throw new Error('Invalid enforcement clock/revision');
  if (windows.length > 7 || windows.some(w => !w.id || !Number.isFinite(w.start) || !Number.isFinite(w.end) || w.end <= w.start)) throw new Error('Invalid exact enforcement windows');
  const snapshot: EnforcementSnapshot = {
    revision: input.revision, now, context: input.context,
    state: 'open', relief: 'unlockedWalking', eligibleUntil: now,
    futureEnforcementEligible: false, windows: [],
  };
  if (input.deleting) return { ...snapshot, openReason: 'deleting' };
  if (!input.screenTimeAuthorized || input.selectionEmpty) return { ...snapshot, openReason: 'disabled' };
  if (input.entitlement.status === 'unknown') return { ...snapshot, state: 'unknown' };
  if (!['active', 'trial'].includes(input.entitlement.status)) return { ...snapshot, openReason: 'lapsed' };
  const expiry = input.entitlement.accessExpiresAt ? Date.parse(input.entitlement.accessExpiresAt) : null;
  if (expiry !== null && !Number.isFinite(expiry)) throw new Error('Invalid access expiry');
  if (expiry !== null && expiry <= now && !input.entitlement.isLifetime && !input.entitlement.isInGracePeriod) return { ...snapshot, openReason: 'lapsed' };
  const eligible = { ...snapshot, windows, futureEnforcementEligible: windows.length > 0 };
  if (decision.state === 'locked' && decision.nextUnlockHint.action === 'shop') return { ...snapshot, state: 'shield', eligibleUntil: 0 };
  if (decision.state === 'unlockedBank') return { ...snapshot, openReason: 'outsideWindow', eligibleUntil: 0 };
  if (decision.state === 'unlockedMet') {
    const relock = decision.relockAt === null ? now : Date.parse(decision.relockAt);
    if (!Number.isFinite(relock) || relock < now) throw new Error('Stale earned suppression boundary');
    return { ...eligible, openReason: 'earned', eligibleUntil: relock };
  }
  if (decision.state === 'noRulesToday' || decision.state === 'beforeWindow' || decision.state === 'afterWindow') return { ...eligible, openReason: 'outsideWindow' };
  if (input.activeUntil === null || !Number.isFinite(input.activeUntil) || input.activeUntil <= now) throw new Error('Active decision has no current window');
  const active = { ...eligible, eligibleUntil: input.activeUntil };
  if (decision.state === 'locked') return { ...active, state: 'shield' };
  return { ...active, state: 'conditional', relief: decision.state };
}
