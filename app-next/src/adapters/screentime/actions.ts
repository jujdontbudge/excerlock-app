import { EnforcementPlan } from '../../domain/enforcement';
import { LockWindowMonitor } from '../../domain/monitorPlan';
import { LockDecision } from '../../domain/types';
import { ShieldIntent } from '../../engine/screentime/ScreenTimeModule';

/**
 * How long the apps stay open for a reason that expires. The extension decides nothing: the app
 * writes the answer into each monitor's action list while it runs, which is safe because every
 * fact that opens the apps — a met goal, a gym arrival, a walking lease — can only be recorded
 * while the app runs.
 */
export type OpenWindow = { kind: 'none' } | { kind: 'until'; at: string } | { kind: 'openEnded' };

/** The policy wins over the decision: a plan that says shield closes every future interval too. */
export function openWindow(decision: LockDecision, plan: EnforcementPlan): OpenWindow {
  if (plan.shields === 'apply') return { kind: 'none' };
  switch (decision.state) {
    case 'unlockedMet':
      return decision.relockAt ? { kind: 'until', at: decision.relockAt } : { kind: 'openEnded' };
    case 'unlockedProvisional':
      return { kind: 'until', at: decision.holdsUntil };
    case 'unlockedWalking':
      return { kind: 'until', at: decision.leaseUntil };
    default:
      // Open now only because no rule is active. Every future window still has to shield.
      return { kind: 'none' };
  }
}

/** A window that starts while the unlock still holds opens; every other window shields. */
export function startAction(monitor: LockWindowMonitor, open: OpenWindow): ShieldIntent {
  if (open.kind === 'openEnded') return 'down';
  if (open.kind === 'until' && Date.parse(monitor.start) < Date.parse(open.at)) return 'down';
  return 'up';
}

/**
 * The per-monitor `intervalDidStart` intent the engine's one re-arm routine takes. Interval ends
 * are not here: a merged window ending can only mean no rule is active, so the engine always
 * clears at one.
 */
export function startIntents(
  monitors: readonly LockWindowMonitor[],
  open: OpenWindow,
): Record<string, ShieldIntent> {
  return Object.fromEntries(monitors.map((monitor) => [monitor.name, startAction(monitor, open)]));
}
