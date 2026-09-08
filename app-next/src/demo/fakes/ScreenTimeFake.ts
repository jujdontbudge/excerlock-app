import { dayKey } from '../../domain/calendar';
import { ScreenTimePort } from '../../ports/ScreenTimePort';
import { permissionsStore } from '../../state/permissionsStore';
import { rulesStore } from '../../state/rulesStore';
import { ApplyResult } from '../../runtime/upstreamCompatibility';
import { FakeContext } from '../FakeContext';
export function ScreenTimeFake(ctx: FakeContext): ScreenTimePort {
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
    applyLock: async (decision, plan) => {
      const key = JSON.stringify({ decision, plan });
      if (previous?.key === key) return previous.result;
      if (plan.shields === 'apply') ctx.log('shield_applied', { state: decision.state });
      else ctx.log('shields_cleared', { state: decision.state });
      const failed = plan.shields === 'apply' && ctx.snapshot().outcome === 'error';
      if (failed) ctx.log('monitor_registration_failed');
      else ctx.log('lock_applied', { state: decision.state, shields: plan.shields });
      const result: ApplyResult = {
        applied: !failed,
        shields: plan.shields === 'apply' ? 'up' : 'down',
        monitors: plan.monitors === 'keep' ? 1 : 0,
        ...(failed ? { reason: 'monitorRegistration' } : {}),
      };
      // Idempotent only once it succeeded: a failed apply is never a settled state, so a retry re-runs.
      previous = result.applied ? { key, result } : undefined;
      return result;
    },
    describeSelection: async () => rulesStore.getState().data.lockedApps,
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
