import { gymDwellMinutes, mergedGymVisitIntervals } from '../../domain/gymDwell';
import { applyProgress } from '../../domain/progress';
import { progressDay } from '../../domain/progressDay';
import { addDays, dayKey } from '../../domain/calendar';
import { GymVisit } from '../../domain/types';
import { Workout } from '../../ports/models';
import { Runtime } from '../../runtime/Runtime';
import { historyStore } from '../../state/historyStore';
import { permissionsStore } from '../../state/permissionsStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';

/** Synchronizes port observations into persisted per-rule facts; no UI owns counters. */
export function startProgressSync(runtime: Runtime) {
  let active = true;
  let steps = 0;
  let workouts: Workout[] = [];
  let visits: GymVisit[] = [];
  let generation = 0;
  let workoutsKey = '';
  let visitsKey = '';

  const signalKey = () =>
    `${runtime.dev.snapshot().scenarioId}:${dayKey(runtime.clock.now(), runtime.clock.timezone())}`;

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
      days: [
        ...days.filter((row) => row.day !== day),
        { ...existing, activity: { ...existing.activity, gym } },
      ].sort((a, b) => a.day.localeCompare(b.day)),
    });
  };

  const update = () => {
    if (!active || runtime.dev.snapshot().loading) return;
    const now = runtime.clock.now();
    const timezone = runtime.clock.timezone();
    const permissions = permissionsStore.getState().data;
    const old = ruleDaysStore.getState().data.days;
    const changes = rulesStore.getState().data.rules.flatMap((rule) => {
      const mode = rule.mode;
      if (!rule.enabled || (mode.kind !== 'target' && mode.kind !== 'event')) return [];
      const permission =
        rule.activity === 'walking'
          ? permissions.motion
          : rule.activity === 'gym'
            ? permissions.location
            : permissions.health;
      if (
        (rule.activity === 'gym' && !['whenInUse', 'always'].includes(permission)) ||
        (rule.activity !== 'gym' && permission !== 'granted')
      ) {
        return [];
      }
      const day = progressDay(rule, now, timezone);
      if (!day) return [];
      const row = old.find((candidate) => candidate.ruleId === rule.id && candidate.day === day) ?? {
        ruleId: rule.id,
        day,
        progress: 0,
        met: false,
        metAt: null,
      };

      let value = 0;
      let measuredAt = now;
      if (mode.activity === 'walking') {
        value = steps;
      } else if (mode.activity === 'gym') {
        const currentVisits = visitsKey === signalKey() ? visits : [];
        const calendarDay = dayKey(now, timezone);
        const accountingDays = day === calendarDay ? [day] : [day, calendarDay];
        const intervals = accountingDays.flatMap((accountingDay) =>
          mergedGymVisitIntervals(currentVisits, accountingDay, timezone, now),
        );
        value =
          mode.kind === 'event'
            ? intervals.length
              ? 1
              : 0
            : accountingDays.reduce(
                (minutes, accountingDay) =>
                  minutes + gymDwellMinutes(currentVisits, accountingDay, timezone, now),
                0,
              );
        if (mode.kind === 'event' && intervals[0]) measuredAt = intervals[0].from;
      } else {
        value = (workoutsKey === signalKey() ? workouts : [])
          .filter((workout) => workout.kind === rule.activity && workout.source === 'device')
          .reduce(
            (sum, workout) =>
              sum +
              (mode.metric === 'minutes'
                ? workout.minutes
                : workout.km / (mode.metric === 'distance' && mode.unit === 'mi' ? 1.609344 : 1)),
            0,
          );
      }
      const next = applyProgress(rule, row, value, measuredAt);
      return next.progress === row.progress && next.met === row.met && old.includes(row) ? [] : [next];
    });

    if (changes.length) {
      ruleDaysStore.getState().patch({
        days: [
          ...old.filter(
            (row) => !changes.some((next) => next.ruleId === row.ruleId && next.day === row.day),
          ),
          ...changes,
        ],
      });
    }
    updateHistoryGym(now, timezone);
  };

  const refresh = () => {
    const id = ++generation;
    const key = signalKey();
    const sinceDay = addDays(dayKey(runtime.clock.now(), runtime.clock.timezone()), -1);
    void Promise.all([
      runtime.health.workoutsToday('running'),
      runtime.health.workoutsToday('biking'),
      runtime.gym.visits(sinceDay),
    ]).then(([running, biking, visitRows]) => {
      if (active && id === generation && key === signalKey()) {
        workoutsKey = key;
        visitsKey = key;
        workouts = [...running, ...biking];
        visits = visitRows;
        update();
      }
    });
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
      refresh();
    }),
    permissionsStore.subscribe(() => {
      update();
      refresh();
    }),
    runtime.dev.subscribe(refresh),
    runtime.clock.subscribe(() => {
      if (workoutsKey !== signalKey() || visitsKey !== signalKey()) refresh();
      else update();
    }),
  ];
  refresh();
  return () => {
    active = false;
    stops.forEach((stop) => stop());
  };
}
