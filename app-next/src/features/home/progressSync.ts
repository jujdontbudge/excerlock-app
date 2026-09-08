import { gymDwellMinutes, mergedGymVisitIntervals } from '../../domain/gymDwell';
import { applyProgress } from '../../domain/progress';
import { collectEarnedUnlocks, pruneEarnedUnlocks } from '../../domain/earnedUnlock';
import { addDays, dayKey, localInstant } from '../../domain/calendar';
import { currentInstances, windowInstances } from '../../domain/schedule';
import { GymVisit } from '../../domain/types';
import { Workout } from '../../ports/models';
import { Runtime } from '../../runtime/Runtime';
import { historyStore } from '../../state/historyStore';
import { permissionsStore } from '../../state/permissionsStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { rulesStore } from '../../state/rulesStore';

/** Synchronizes port observations into persisted per-rule facts; no UI owns counters. */
export function createProgressSync(runtime: Runtime) {
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
      days: [...days.filter((row) => row.day !== day), { ...existing, activity: { ...existing.activity, gym } }].sort(
        (a, b) => a.day.localeCompare(b.day),
      ),
    });
  };

  const applyUpdate = () => {
    const now = runtime.clock.now();
    const timezone = runtime.clock.timezone();
    const today = dayKey(now, timezone);
    const permissions = permissionsStore.getState().data;
    const stored = ruleDaysStore.getState().data;
    const old = stored.days;
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
      const instance = currentInstances(rule, now, timezone)[0] ?? windowInstances(rule, today, timezone)[0];
      if (!instance) return [];
      const day = instance.day;
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
        // The pedometer answers a steps goal only; a duration goal is filled by its walking session.
        value = mode.kind === 'target' && mode.metric === 'steps' ? steps : row.progress;
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
                (minutes, accountingDay) => minutes + gymDwellMinutes(currentVisits, accountingDay, timezone, now),
                0,
              );
        // An arrival is booked at the moment the visit started, not when its confirmation finished.
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
      return next.progress === row.progress && next.met === row.met && old.includes(row)
        ? []
        : [{ rule, before: row, after: next, instance }];
    });

    const retainedUnlocks = pruneEarnedUnlocks(stored.earnedUnlocks, today);
    const earnedUnlocks = collectEarnedUnlocks(retainedUnlocks, changes);
    if (changes.length || retainedUnlocks.length !== stored.earnedUnlocks.length) {
      ruleDaysStore.getState().patch({
        days: [
          ...old.filter((row) => !changes.some((change) => change.after.ruleId === row.ruleId && change.after.day === row.day)),
          ...changes.map((change) => change.after),
        ],
        earnedUnlocks,
      });
    }
    updateHistoryGym(now, timezone);
  };

  // Writing a rule day wakes the observers that feed this sync, so an update that starts while one is
  // running would recompute from the same instant forever; the running pass already has the freshest facts.
  let updating = false;
  const update = () => {
    if (!active || updating || runtime.dev.snapshot().loading) return;
    updating = true;
    try {
      applyUpdate();
    } finally {
      updating = false;
    }
  };

  const refresh = async () => {
    const id = ++generation;
    const key = signalKey();
    const start = localInstant(dayKey(runtime.clock.now(), runtime.clock.timezone()), 0, runtime.clock.timezone());
    const sinceDay = addDays(dayKey(runtime.clock.now(), runtime.clock.timezone()), -1);
    await Promise.all([
      runtime.steps.stepsSince(start).then((value) => {
        if (active && id === generation && key === signalKey()) steps = value;
      }),
      Promise.all([
        runtime.health.workoutsToday('running'),
        runtime.health.workoutsToday('biking'),
        runtime.gym.visits(sinceDay),
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
