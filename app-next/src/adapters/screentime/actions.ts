import { EnforcementPlan } from '../../domain/enforcement';
import { LockWindowMonitor } from '../../domain/monitorPlan';
import { LockDecision } from '../../domain/types';
import { DeviceActivityAction } from './deviceActivity';

/**
 * How long the apps stay open for a reason that expires. The extension decides nothing: the app
 * writes the answer into each monitor's action list while it runs, which is safe because every
 * fact that opens the apps — a met goal, a gym arrival, a walking lease — can only be recorded
 * while the app runs.
 */
export type OpenWindow = { kind: 'none' } | { kind: 'until'; at: string } | { kind: 'openEnded' };

export type MonitorActions = {
  name: string;
  atStart: DeviceActivityAction[];
  atEnd: DeviceActivityAction[];
};

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

export function startAction(monitor: LockWindowMonitor, open: OpenWindow): DeviceActivityAction['type'] {
  if (open.kind === 'openEnded') return 'unblockSelection';
  if (open.kind === 'until' && Date.parse(monitor.start) < Date.parse(open.at)) return 'unblockSelection';
  return 'blockSelection';
}

export function monitorActions(
  monitors: readonly LockWindowMonitor[],
  open: OpenWindow,
  familyActivitySelectionId: string,
): MonitorActions[] {
  return monitors.map((monitor) => ({
    name: monitor.name,
    atStart: [{ type: startAction(monitor, open), familyActivitySelectionId }],
    atEnd: [{ type: 'unblockSelection', familyActivitySelectionId }],
  }));
}
