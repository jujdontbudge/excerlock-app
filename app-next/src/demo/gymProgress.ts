import { FakeContext } from './FakeContext';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { settingsStore } from '../state/settingsStore';
import { permissionsStore } from '../state/permissionsStore';
import { dayKey, currentInstances } from '../domain/schedule';
import { applyProgress } from '../domain/progress';
import { collectEarnedUnlocks } from '../domain/earnedUnlock';
/** Local presence clock: time is credited only after a manual or authorized automatic arrival. */
export function gymProgress(ctx: FakeContext) {
  let last: number | null = null;
  const arrive = () => {
    last = Date.parse(ctx.clock.now());
  };
  const stopPresence = ctx.subscribe(() => {
    const s = ctx.snapshot();
    if (s.loading || s.presence === 'outside') last = null;
    else if (
      last === null &&
      settingsStore.getState().data.gymAutoDetect &&
      permissionsStore.getState().data.location === 'always'
    )
      arrive();
  });
  const stopClock = ctx.clock.observe(() => {
    if (last === null || ctx.snapshot().loading || ctx.snapshot().presence !== 'inside') return;
    const now = ctx.clock.now(),
      instant = Date.parse(now),
      minutes = Math.max(0, instant - last) / 60000;
    last = instant;
    const day = dayKey(now, ctx.clock.timezone()),
      stored = ruleDaysStore.getState().data,
      days = stored.days,
      updates = rulesStore
        .getState()
        .data.rules.filter((r) => r.enabled && r.activity === 'gym')
        .flatMap((rule) => {
          const instance = currentInstances(rule, now, ctx.clock.timezone())[0];
          if (!instance) return [];
          const before = days.find((d) => d.ruleId === rule.id && d.day === instance.day) ?? {
            ruleId: rule.id,
            day: instance.day,
            progress: 0,
            met: false,
            metAt: null,
          };
          const after = applyProgress(rule, before, rule.mode.kind === 'event' ? 1 : before.progress + minutes, now);
          return [{ rule, before, after, instance }];
        });
    const history = ctx
      .snapshot()
      .history.map((row) =>
        row.day === day ? { ...row, activity: { ...row.activity, gym: row.activity.gym + minutes } } : row,
      );
    ruleDaysStore.getState().patch({
      days: [
        ...days.filter(
          (row) => !updates.some((update) => update.after.ruleId === row.ruleId && update.after.day === row.day),
        ),
        ...updates.map((update) => update.after),
      ],
      earnedUnlocks: collectEarnedUnlocks(stored.earnedUnlocks, updates),
    });
    ctx.update({ history });
  });
  return {
    arrive,
    dispose: () => {
      stopPresence();
      stopClock();
    },
  };
}
