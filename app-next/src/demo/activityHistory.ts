import { FakeContext } from './FakeContext';
import { stepCount } from './stepCount';
import { dayKey } from '../domain/calendar';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
/** Reconcile today's fake facts; historical measurements remain unchanged. */
export function activityHistory(ctx: FakeContext) {
  const refresh = () => {
    const s = ctx.snapshot();
    if (s.loading || !s.hydrated) return;
    const day = dayKey(ctx.clock.now(), ctx.clock.timezone()),
      sameDay = day === dayKey(ctx.scenario.clock.now, ctx.clock.timezone());
    const base = s.history.find((d) => d.day === day) ?? {
      day,
      usageMinutes: null,
      activity: { walking: 0, gym: 0, running: 0, biking: 0 },
      met: false,
      scheduled: false,
    };
    const workouts = sameDay ? (ctx.scenario.health?.workoutsToday ?? []) : [];
    const gymRules = rulesStore
      .getState()
      .data.rules.filter((r) => r.activity === 'gym' && r.mode.kind === 'target' && r.mode.metric === 'minutes');
    const gym = Math.max(
      base.activity.gym,
      0,
      ...ruleDaysStore
        .getState()
        .data.days.filter((d) => d.day === day && gymRules.some((r) => r.id === d.ruleId))
        .map((d) => d.progress),
    );
    const current = {
      ...base,
      usageMinutes: sameDay ? ctx.scenario.usageMinutesToday : base.usageMinutes,
      activity: {
        walking: stepCount(ctx),
        gym,
        running: workouts.filter((w) => w.kind === 'running').reduce((n, w) => n + w.minutes, 0),
        biking: workouts.filter((w) => w.kind === 'biking').reduce((n, w) => n + w.minutes, 0),
      },
    };
    if (JSON.stringify(base) === JSON.stringify(current) && s.history.some((d) => d.day === day)) return;
    ctx.update({
      history: [...s.history.filter((d) => d.day !== day), current].sort((a, b) => a.day.localeCompare(b.day)),
    });
  };
  const stops = [
    ctx.subscribe(refresh),
    ctx.clock.observe(refresh),
    ruleDaysStore.subscribe(refresh),
    rulesStore.subscribe(refresh),
  ];
  return { refresh, dispose: () => stops.forEach((stop) => stop()) };
}
