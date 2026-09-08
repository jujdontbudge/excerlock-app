import { FakeContext } from './FakeContext';
import { stepCount } from './stepCount';
import { dayKey } from '../domain/calendar';
import { rulesStore } from '../state/rulesStore';
import { ruleDaysStore } from '../state/ruleDaysStore';
import { historyStore } from '../state/historyStore';
import { pruneRuleDays, sealDays } from '../domain/sealDay';
import { pruneEarnedUnlocks } from '../domain/earnedUnlock';
/** Reconcile today's fake facts; historical measurements remain unchanged. */
export function activityHistory(ctx: FakeContext) {
  const refresh = () => {
    const s = ctx.snapshot();
    if (s.loading || !s.hydrated) return;
    const day = dayKey(ctx.clock.now(), ctx.clock.timezone()),
      sameDay = day === dayKey(ctx.scenario.clock.now, ctx.clock.timezone());
    const storedHistory = historyStore.getState().data.days;
    const lastSealedDay = storedHistory
      .filter((row) => row.sealedAt)
      .map((row) => row.day)
      .sort()
      .at(-1) ?? null;
    const ruleDays = ruleDaysStore.getState().data.days;
    const sealedHistory = sealDays({
      history: storedHistory,
      rules: rulesStore.getState().data.rules,
      ruleDays,
      lastSealedDay,
      today: day,
      timezone: ctx.clock.timezone(),
      sealedAt: ctx.clock.now(),
    });
    if (JSON.stringify(storedHistory) !== JSON.stringify(sealedHistory)) {
      historyStore.getState().patch({ days: sealedHistory });
    }
    const retainedRuleDays = pruneRuleDays(ruleDays, day);
    if (retainedRuleDays.length !== ruleDays.length) {
      ruleDaysStore.getState().patch({ days: retainedRuleDays });
    }
    // Sealing is the rollover, so the two-day earned-unlock retention is applied here too: a claim from
    // the day before yesterday can no longer unlock anything.
    const unlocks = ruleDaysStore.getState().data.earnedUnlocks;
    const retainedUnlocks = pruneEarnedUnlocks(unlocks, day);
    if (retainedUnlocks.length !== unlocks.length) {
      ruleDaysStore.getState().patch({ earnedUnlocks: retainedUnlocks });
    }
    const history = historyStore.getState().data.days;
    const base = history.find((d) => d.day === day) ?? {
      day,
      usageMinutes: null,
      activity: { walking: 0, gym: 0, running: 0, biking: 0 },
      met: false,
      scheduled: false,
    };
    const workouts = sameDay
      ? (ctx.scenario.health?.workoutsToday ?? []).filter((workout) => workout.source === 'device')
      : [];
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
    if (JSON.stringify(base) === JSON.stringify(current) && history.some((d) => d.day === day)) return;
    const days = [...history.filter((d) => d.day !== day), current].sort((a, b) => a.day.localeCompare(b.day));
    historyStore.getState().patch({ days });
    ctx.update({ history: days });
  };
  const stops = [
    ctx.subscribe(refresh),
    ctx.clock.observe(refresh),
    ruleDaysStore.subscribe(refresh),
    rulesStore.subscribe(refresh),
  ];
  return { refresh, dispose: () => stops.forEach((stop) => stop()) };
}
