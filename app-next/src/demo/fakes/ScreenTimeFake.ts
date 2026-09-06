import { dayKey } from '../../domain/calendar';
import { ScreenTimePort } from '../../ports/ScreenTimePort';
import { permissionsStore } from '../../state/permissionsStore';
import { rulesStore } from '../../state/rulesStore';
import { FakeContext } from '../FakeContext';
export function ScreenTimeFake(ctx: FakeContext): ScreenTimePort {
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
    applyLock: (decision) => ctx.log('lock_applied', { state: decision.state }),
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
