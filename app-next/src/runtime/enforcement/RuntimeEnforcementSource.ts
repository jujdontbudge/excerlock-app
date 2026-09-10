import { resolveLock } from '../../domain/resolveLock';
import { currentInstances } from '../../domain/schedule';
import { planScheduleWindows } from '../../domain/scheduleWindowPlan';
import type { Entitlement, GymPresence, LockedApps, Rule, RuleDay } from '../../domain/types';
import type { WalkingStatus } from '../../ports/WalkingPort';
import { projectEnforcement } from './projectEnforcement';
import type { EnforcementSnapshot } from './EnforcementHost';

export type RuntimeEnforcementInput = {
  now: string; timezone: string; rules: Rule[]; ruleDays: RuleDay[];
  walking: WalkingStatus; gymPresence: GymPresence | null;
  entitlement: Entitlement; deleting: boolean; accountGeneration: number;
  screenTimeAuthorized: boolean; selection: LockedApps; selectionVersion: string;
};

/** Read synchronously from LIVE owners even while an awaited native operation is
 * in flight. A policy change must revoke its revision before queued JS catches up.
 * Construct only after hydration, seeded from the native durable revision.
 */
export class RuntimeEnforcementSource {
  private revision: number;
  private signature: string | null = null;
  constructor(private readonly input: () => RuntimeEnforcementInput, nativeRevision: number) {
    if (!Number.isSafeInteger(nativeRevision) || nativeRevision < -1) throw new Error('Invalid native policy revision');
    this.revision = nativeRevision;
  }
  read = (): EnforcementSnapshot => {
    const input = this.input();
    const { walking } = input;
    const decision = resolveLock({
      now: input.now, timezone: input.timezone, rules: input.rules, ruleDays: input.ruleDays,
      detection: { state: walking.phase === 'active' || walking.phase === 'grace' ? 'active' : walking.phase === 'unknown' ? 'unknown' : 'inactive', since: walking.since },
      placement: { state: walking.placement, liveRelief: walking.proppedVerified, since: walking.proppedSince },
      gymPresence: input.gymPresence,
    });
    const plan = planScheduleWindows(input.rules, input.now, input.timezone);
    const ends = input.rules.flatMap(rule => currentInstances(rule, input.now, input.timezone)).map(instance => Date.parse(instance.end));
    const activeUntil = ends.length ? Math.max(...ends) : null;
    let projected: EnforcementSnapshot = projectEnforcement({
      revision: Math.max(0, this.revision), now: Date.parse(input.now),
      context: { policyGeneration: Math.max(0, this.revision), accountGeneration: input.accountGeneration, selectionVersion: input.selectionVersion },
      decision, entitlement: input.entitlement, deleting: input.deleting,
      screenTimeAuthorized: input.screenTimeAuthorized, selectionEmpty: input.selection.isEmpty || input.selection.handle === null,
      activeUntil, windows: plan.ok ? plan.windows : [],
    });
    if (!plan.ok) {
      const clearing = ['deleting', 'disabled', 'lapsed'].includes(projected.openReason ?? '');
      // Keep boot and repair UI available without publishing an inexact policy.
      // Explicit lifecycle cleanup must still revoke the old native protection.
      projected = { ...projected, state: clearing ? projected.state : 'unknown',
        scheduleIssue: { reason: plan.reason, required: plan.required } };
    }
    // Clock ticks and progress below a target do not churn native registrations.
    // A rule edit still invalidates callbacks even if its current decision matches.
    const signature = JSON.stringify({
      rules: input.rules, timezone: input.timezone, account: input.accountGeneration,
      selection: input.selectionVersion, state: projected.state, reason: projected.openReason,
      relief: projected.state === 'conditional' ? projected.relief : null,
      deadline: projected.state === 'conditional' || projected.openReason === 'earned' ? projected.eligibleUntil : null,
      future: projected.futureEnforcementEligible, windows: projected.windows,
    });
    if (signature !== this.signature) {
      if (this.revision >= Number.MAX_SAFE_INTEGER) throw new Error('Native policy revision exhausted');
      this.revision++; this.signature = signature;
    }
    return { ...projected, revision: this.revision, context: { ...projected.context, policyGeneration: this.revision } };
  };
}
