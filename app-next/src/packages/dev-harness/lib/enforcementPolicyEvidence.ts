import { EnforcementHost, type EnforcementSnapshot, type EnforcementTransport } from '../../enforcement/EnforcementHost';
import { RuntimeEnforcementSource, type RuntimeEnforcementInput } from '../../enforcement/RuntimeEnforcementSource';
import type { FakeContext } from './FakeContext';

export async function enforcementPolicyEvidence(ctx: FakeContext) {
  if (!ctx.scenario.enforcementPolicyProof) return;
  const scenario = ctx.scenario;
  const input: RuntimeEnforcementInput = {
    now: scenario.clock.now,
    timezone: scenario.clock.timezone,
    rules: scenario.rules,
    ruleDays: scenario.ruleDays,
    walking: { ruleId: null, phase: 'inactive', since: scenario.clock.now, placement: 'unknown', proppedVerified: false, proppedSince: null },
    gymPresence: null,
    entitlement: scenario.entitlement,
    deleting: false,
    accountGeneration: 1,
    accountReady: true,
    screenTimeAuthorized: true,
    selection: scenario.lockedApps,
    selectionVersion: 'scripted-selection',
  };
  const source = new RuntimeEnforcementSource(() => input, -1);
  let published: EnforcementSnapshot | null = null;
  const errors: unknown[] = [];
  const transport: EnforcementTransport = {
    publish: async (next) => {
      if (published && (next.revision < published.revision || (next.revision === published.revision &&
        (next.state !== published.state || next.context.policyGeneration !== published.context.policyGeneration ||
        next.context.accountGeneration !== published.context.accountGeneration || next.context.selectionVersion !== published.context.selectionVersion ||
        next.eligibleUntil !== published.eligibleUntil)))) throw new Error('Enforcement revision was superseded');
      published = next;
    },
    shield: async () => true,
    unshield: async () => true,
    stageWatchdog: async () => 'scripted-watchdog',
    commitWatchdog: async () => true,
    cancelWatchdogs: async () => undefined,
    replaceWindows: async () => undefined,
    policyRevision: () => published?.revision ?? -1,
  };
  const host = new EnforcementHost({ read: source.read, transport, report: (error) => errors.push(error) });
  try {
    for (const mode of ['disabled', 'lapsed', 'outsideWindow', 'shield'] as const) {
      input.screenTimeAuthorized = mode !== 'disabled';
      input.entitlement = mode === 'lapsed' ? { status: 'expired', renewsAt: null } : scenario.entitlement;
      input.now = mode === 'outsideWindow' ? '2026-09-07T12:00:00.000Z' : scenario.clock.now;
      const first = await host.reconcile();
      const revision = source.read().revision;
      input.now = new Date(Date.parse(input.now) + 1000).toISOString();
      const second = await host.reconcile().catch(() => 'failed');
      ctx.log('enforcement_policy_checked', { mode, first, second, stableRevision: revision === source.read().revision });
    }
    ctx.log('enforcement_policy_errors', { count: errors.length });
  } finally {
    host.dispose();
  }
}
