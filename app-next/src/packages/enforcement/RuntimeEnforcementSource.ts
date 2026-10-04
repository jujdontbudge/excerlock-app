import { resolveLock } from '../lock/resolveLock';
import { currentInstances } from '../schedule/schedule';
import { planScheduleWindows } from '../schedule/scheduleWindowPlan';
import type { Entitlement, GymPresence, LockedApps, Rule, RuleDay } from '../model/types';
import type { WalkingStatus } from '../ports/WalkingPort';
import { projectEnforcement } from './lib/projectEnforcement';
import type { EnforcementSnapshot } from './EnforcementHost';

export type RuntimeEnforcementInput = {
  now: string;
  timezone: string;
  rules: Rule[];
  ruleDays: RuleDay[];
  walking: WalkingStatus;
  gymPresence: GymPresence | null;
  entitlement: Entitlement;
  deleting: boolean;
  accountGeneration: number;
  accountReady: boolean;
  screenTimeAuthorized: boolean;
  selection: LockedApps;
  selectionVersion: string;
};

export class RuntimeEnforcementSource {
  private revision: number;
  private signature: string | null = null;
  constructor(
    private readonly input: () => RuntimeEnforcementInput,
    nativeRevision: number,
  ) {
    if (!Number.isSafeInteger(nativeRevision) || nativeRevision < -1) throw new Error('Invalid native policy revision');
    this.revision = nativeRevision;
  }
  read = (): EnforcementSnapshot => {
    const input = this.input();
    const { walking } = input;
    const decision = resolveLock({
      now: input.now,
      timezone: input.timezone,
      rules: input.rules,
      ruleDays: input.ruleDays,
      detection: {
        state:
          walking.phase === 'active' || walking.phase === 'grace'
            ? 'active'
            : walking.phase === 'unknown'
              ? 'unknown'
              : 'inactive',
        since: walking.since,
      },
      placement: { state: walking.placement, liveRelief: walking.proppedVerified, since: walking.proppedSince },
      gymPresence: input.gymPresence,
    });
    const plan = planScheduleWindows(input.rules, input.now, input.timezone);
    const ends = input.rules
      .flatMap((rule) => currentInstances(rule, input.now, input.timezone))
      .map((instance) => Date.parse(instance.end));
    const activeUntil = ends.length ? Math.max(...ends) : null;
    let projected: EnforcementSnapshot = projectEnforcement({
      revision: Math.max(0, this.revision),
      now: Date.parse(input.now),
      context: {
        policyGeneration: Math.max(0, this.revision),
        accountGeneration: input.accountGeneration,
        selectionVersion: input.selectionVersion,
      },
      decision,
      entitlement: input.entitlement,
      deleting: input.deleting,
      screenTimeAuthorized: input.screenTimeAuthorized,
      selectionEmpty: input.selection.isEmpty || input.selection.handle === null,
      activeUntil,
      windows: plan.ok ? plan.windows : [],
    });
    if (projected.state === 'conditional' && walking.proppedVerified) {
      const until = walking.proppedEligibleUntil;
      projected =
        until !== null && Number.isFinite(until) && until > projected.now
          ? { ...projected, eligibleUntil: Math.min(projected.eligibleUntil, until) }
          : { ...projected, state: 'shield' };
    }
    if (!input.accountReady && !input.deleting) projected = { ...projected, state: 'unknown', openReason: undefined };
    if (!plan.ok) {
      const clearing = ['deleting', 'disabled', 'lapsed'].includes(projected.openReason ?? '');
      if (!clearing)
        projected = { ...projected, state: 'unknown', scheduleIssue: { reason: plan.reason, required: plan.required } };
    }
    const signature = JSON.stringify({
      rules: input.rules,
      timezone: input.timezone,
      account: input.accountGeneration,
      selection: input.selectionVersion,
      state: projected.state,
      reason: projected.openReason,
      relief: projected.state === 'conditional' ? projected.relief : null,
      deadline: projected.state === 'conditional' || projected.openReason === 'earned' ? projected.eligibleUntil : null,
      future: projected.futureEnforcementEligible,
      windows: projected.windows,
    });
    if (signature !== this.signature) {
      if (this.revision >= Number.MAX_SAFE_INTEGER) throw new Error('Native policy revision exhausted');
      this.revision++;
      this.signature = signature;
    }
    return {
      ...projected,
      revision: this.revision,
      context: { ...projected.context, policyGeneration: this.revision },
    };
  };
}
