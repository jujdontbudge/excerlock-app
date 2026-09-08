import { dayKey } from '../../domain/calendar';
import { assertMonitorBudget } from '../../domain/monitorPlan';
import { ApplyResult, ScreenTimePort } from '../../ports/ScreenTimePort';
import { permissionsStore } from '../../state/permissionsStore';
import { rulesStore } from '../../state/rulesStore';
import { FakeContext } from '../FakeContext';
export function ScreenTimeFake(ctx: FakeContext): ScreenTimePort {
  const enforcementListeners = new Set<(result: ApplyResult) => void>();
  let previous: { key: string; result: ApplyResult } | undefined;
  return {
    authorizationStatus: () => permissionsStore.getState().data.screenTime,
    requestAuthorization: () => ctx.request('screenTime'),
    presentAppPicker: async () => {
      const initial = rulesStore.getState().data.lockedApps;
      const result = await ctx.prompt({ kind: 'picker', initial });
      const selected = typeof result === 'boolean' ? initial : result;
      rulesStore.getState().patch({ lockedApps: selected });
      return selected;
    },
    describeSelection: async () => {
      const selection = rulesStore.getState().data.lockedApps;
      return selection.handle ? selection : { handle: null, appCount: 0, categoryCount: 0 };
    },
    applyLock: async (decision, plan, monitors) => {
      const key = JSON.stringify({ decision: decision.state, plan, planHash: monitors.planHash });
      if (previous?.key === key) return previous.result;
      ctx.log(plan.shields === 'apply' ? 'shield_applied' : 'shields_cleared', { state: decision.state });
      const keeping = plan.monitors === 'keep';
      const budget = keeping
        ? assertMonitorBudget(monitors)
        : ({ applied: true, shields: 'up' as const, monitors: 0 } as const);
      // The shield is raised before any failure is reported, so a broken monitor never opens apps.
      const failed = plan.shields === 'apply' && ctx.snapshot().outcome === 'error';
      if (failed) ctx.log('monitor_registration_failed');
      const result: ApplyResult = failed
        ? { applied: false, shields: 'up', monitors: budget.monitors, reason: 'monitorRegistration' }
        : budget.applied
          ? { applied: true, shields: plan.shields === 'apply' ? 'up' : 'down', monitors: budget.monitors }
          : budget;
      if (!failed) ctx.log('lock_applied', { state: decision.state, ...result });
      enforcementListeners.forEach((callback) => callback(result));
      // Idempotent only once it succeeded: a failed apply is never a settled state, so a retry re-runs.
      previous = result.applied ? { key, result } : undefined;
      return result;
    },
    observeEnforcement: (callback) => {
      enforcementListeners.add(callback);
      return () => {
        enforcementListeners.delete(callback);
      };
    },
    observeUsage: (callback) => {
      const update = () =>
        callback(
          dayKey(ctx.clock.now(), ctx.clock.timezone()) === dayKey(ctx.scenario.clock.now, ctx.clock.timezone())
            ? ctx.scenario.usageMinutesToday
            : null,
        );
      update();
      const stops = [ctx.subscribe(update), ctx.clock.observe(update)];
      return () => stops.forEach((stop) => stop());
    },
  };
}
