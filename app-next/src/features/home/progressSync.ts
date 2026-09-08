import { Runtime } from '../../runtime/Runtime';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { permissionsStore } from '../../state/permissionsStore';
import { historyStore } from '../../state/historyStore';
import { dayKey, windowInstances, currentInstances } from '../../domain/schedule';
import { addDays, localInstant } from '../../domain/calendar';
import { applyProgress } from '../../domain/progress';
import { progressDay } from '../../domain/progressDay';
import { gymDwellMinutes, mergedGymVisitIntervals } from '../../domain/gymDwell';
import { collectEarnedUnlocks } from '../../domain/earnedUnlock';
import { pruneEarnedUnlocks } from '../../domain/sealDay';
import { GymVisit } from '../../domain/types';
import { Workout } from '../../ports/models';

/**
 * Synchronizes port observations into persisted per-rule facts; no UI owns counters.
 * This is the single applier for steps, workouts and gym dwell alike: every write recomputes a
 * row from recorded instants, and `progressDay` decides which day owns it.
 */
export function createProgressSync(runtime: Runtime) {
  let active = true,
    steps = 0,
    workouts: Workout[] = [],
    visits: GymVisit[] = [],
    generation = 0,
    workoutsKey = '',
    visitsKey = '';
  const signalKey = () =>
    `${runtime.dev.snapshot().scenarioId}:${dayKey(runtime.clock.now(), runtime.clock.timezone())}`;

  /** Gym dwell is a calendar-day activity fact, so it lands on the history row for that date. */
  const updateHistoryGym = (now: string, timezone: string) => {
    if (visitsKey !== signalKey()) return;
    const day = dayKey(now, timezone);
    const days = historyStore.getState().data.days;
    const existing = days.find((row) => row.day === day) ?? {
      day,
      usageMinutes: null,
      activity: { walking: 0, gym: 0, running: 0, biking: 0 },
      met: false,
      scheduled: false,
    };
    const gym = gymDwellMinutes(visits, day, timezone, now);
    if (existing.activity.gym === gym && days.includes(existing)) return;
    historyStore.getState().patch({
      days: [...days.filter((row) => row.day !== day), { ...existing, activity: { ...existing.activity, gym } }].sort(
        (a, b) => a.day.localeCompare(b.day),
      ),
    });
  };

  const update = () => {
    if (!active || runtime.dev.snapshot().loading) return;
    const now = runtime.clock.now(),
      tz = runtime.clock.timezone(),
      today = dayKey(now, tz),
      permissions = permissionsStore.getState().data;
    const stored = ruleDaysStore.getState().data,
      old = stored.days;
    const changes = rulesStore.getState().data.rules.flatMap((rule) => {
      const m = rule.mode;
      if (!rule.enabled || (m.kind !== 'target' && m.kind !== 'event')) return [];
      const permission =
        rule.activity === 'walking'
          ? permissions.motion
          : rule.activity === 'gym'
            ? permissions.location
            : permissions.health;
      if (rule.activity === 'gym' ? !['whenInUse', 'always'].includes(permission) : permission !== 'granted')
        return [];
      const day = progressDay(rule, now, tz);
      if (!day) return [];
      const instance = currentInstances(rule, now, tz)[0] ?? windowInstances(rule, day, tz)[0];
      if (!instance) return [];
      const row = old.find((d) => d.ruleId === rule.id && d.day === day) ?? {
        ruleId: rule.id,
        day,
        progress: 0,
        met: false,
        metAt: null,
      };
      let value = 0,
        measuredAt = now;
      if (m.activity === 'walking') {
        value = steps;
      } else if (m.activity === 'gym') {
        // Dwell accrues per calendar day; a window that opened yesterday still owns both dates.
        const currentVisits = visitsKey === signalKey() ? visits : [];
        const accountingDays = day === today ? [day] : [day, today];
        const intervals = accountingDays.flatMap((accountingDay) =>
          mergedGymVisitIntervals(currentVisits, accountingDay, tz, now),
        );
        value =
          m.kind === 'event'
            ? intervals.length
              ? 1
              : 0
            : accountingDays.reduce(
                (minutes, accountingDay) => minutes + gymDwellMinutes(currentVisits, accountingDay, tz, now),
                0,
              );
        if (m.kind === 'event' && intervals[0]) measuredAt = intervals[0].from;
      } else {
        // A manually entered workout never counts.
        value = (workoutsKey === signalKey() ? workouts : [])
          .filter((w) => w.kind === rule.activity && w.source === 'device')
          .reduce(
            (sum, w) =>
              sum +
              (m.metric === 'minutes' ? w.minutes : w.km / (m.metric === 'distance' && m.unit === 'mi' ? 1.609344 : 1)),
            0,
          );
      }
      const next = applyProgress(rule, row, value, measuredAt);
      return next.progress === row.progress && next.met === row.met && old.includes(row)
        ? []
        : [{ before: row, next, rule, instance }];
    });
    const retainedUnlocks = pruneEarnedUnlocks(stored.earnedUnlocks, today);
    const earnedUnlocks = collectEarnedUnlocks(
      retainedUnlocks,
      changes.map((change) => ({ ...change, after: change.next })),
    );
    if (changes.length || retainedUnlocks.length !== stored.earnedUnlocks.length)
      ruleDaysStore.getState().patch({
        days: [
          ...old.filter(
            (day) => !changes.some((change) => change.next.ruleId === day.ruleId && change.next.day === day.day),
          ),
          ...changes.map((change) => change.next),
        ],
        earnedUnlocks,
      });
    updateHistoryGym(now, tz);
  };

  const refresh = async () => {
    const id = ++generation,
      key = signalKey();
    const tz = runtime.clock.timezone(),
      today = dayKey(runtime.clock.now(), tz);
    const start = localInstant(today, 0, tz).instant;
    await Promise.all([
      runtime.steps.stepsSince(start).then((value) => {
        if (active && id === generation && key === signalKey()) steps = value;
      }),
      Promise.all([
        runtime.health.workoutsToday('running'),
        runtime.health.workoutsToday('biking'),
        runtime.gym.visits(addDays(today, -1)),
      ]).then(([running, biking, visitRows]) => {
        if (!active || id !== generation || key !== signalKey()) return;
        workoutsKey = key;
        visitsKey = key;
        workouts = [...running, ...biking];
        visits = visitRows;
      }),
    ]);
    if (active && id === generation && key === signalKey()) update();
  };

  const stops = [
    runtime.steps.subscribe((value) => {
      steps = value;
      update();
    }),
    runtime.gym.observeVisits((rows) => {
      visits = rows;
      visitsKey = signalKey();
      update();
    }),
    rulesStore.subscribe(() => {
      update();
      void refresh();
    }),
    permissionsStore.subscribe(() => {
      update();
      void refresh();
    }),
    runtime.dev.subscribe(() => void refresh()),
    runtime.clock.subscribe(() => {
      if (workoutsKey !== signalKey() || visitsKey !== signalKey()) void refresh();
      else update();
    }),
  ];
  void refresh();
  const stop = () => {
    active = false;
    stops.forEach((stop) => stop());
  };
  return { refresh, stop };
}

export function startProgressSync(runtime: Runtime) {
  return createProgressSync(runtime).stop;
}
