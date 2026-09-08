import { dayKey } from '../../domain/calendar';
import { assertMonitorBudget } from '../../domain/monitorPlan';
import { ApplyResult, ScreenTimePort } from '../../ports/ScreenTimePort';
import { permissionsStore } from '../../state/permissionsStore';
import { rulesStore } from '../../state/rulesStore';
import { FakeContext } from '../FakeContext';
export function ScreenTimeFake(ctx: FakeContext): ScreenTimePort {
  const enforcementListeners = new Set<(result: ApplyResult) => void>();
  let lastAppliedKey = '';
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
    applyLock: async (decision, plan) => {
      const budget = assertMonitorBudget(plan);
      const result: ApplyResult = budget.applied
        ? {
            applied: true,
            shields: decision.state === 'locked' ? 'up' : 'down',
            monitors: plan.monitors.length,
          }
        : budget;
      const key = JSON.stringify({ decision: decision.state, planHash: plan.planHash, result });
      if (key !== lastAppliedKey) {
        lastAppliedKey = key;
        ctx.log('lock_applied', { state: decision.state, ...result });
        enforcementListeners.forEach((callback) => callback(result));
      }
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
