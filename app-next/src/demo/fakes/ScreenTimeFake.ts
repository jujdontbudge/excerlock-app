import { dayKey } from '../../domain/calendar';
import { ScreenTimePort } from '../../ports/ScreenTimePort';
import { permissionsStore } from '../../state/permissionsStore';
import { rulesStore } from '../../state/rulesStore';
import { FakeContext } from '../FakeContext';
import { ScreenTimeAuthorizationError } from '../../screentime/ScreenTimeAuthorizationError';
export function ScreenTimeFake(ctx: FakeContext): ScreenTimePort {
  return {
    authorizationStatus: () => permissionsStore.getState().data.screenTime,
    requestAuthorization: () => ctx.request('screenTime'),
    presentAppPicker: async () => {
      let status = permissionsStore.getState().data.screenTime;
      if (status === 'notDetermined') status = await ctx.request('screenTime');
      if (status !== 'granted') throw new ScreenTimeAuthorizationError(status);
      const initial = rulesStore.getState().data.lockedApps;
      const result = await ctx.prompt({ kind: 'picker', initial });
      const selected = typeof result === 'boolean' ? initial : result;
      rulesStore.getState().patch({ lockedApps: selected });
      return selected;
    },
    applyLock: async (decision) => { ctx.log('lock_applied', { state: decision.state }); return { applied: true }; },
    registerWatchdog: async (plan) => plan,
    cancelWatchdog: async () => undefined,
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
