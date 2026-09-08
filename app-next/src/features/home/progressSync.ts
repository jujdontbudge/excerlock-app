import { Runtime } from '../../runtime/Runtime';
import { rulesStore } from '../../state/rulesStore';
import { ruleDaysStore } from '../../state/ruleDaysStore';
import { permissionsStore } from '../../state/permissionsStore';
import { dayKey, windowInstances, currentInstances } from '../../domain/schedule';
import { localInstant } from '../../domain/calendar';
import { applyProgress } from '../../domain/progress';
import { collectEarnedUnlocks, pruneEarnedUnlocks } from '../../domain/earnedUnlock';
import { Workout } from '../../ports/models';
/** Synchronizes port observations into persisted per-rule facts; no UI owns counters. */
export function createProgressSync(runtime: Runtime) {
  let active = true,
    steps = 0,
    workouts: Workout[] = [],
    generation = 0,
    workoutsKey = '';
  const signalKey = () =>
    `${runtime.dev.snapshot().scenarioId}:${dayKey(runtime.clock.now(), runtime.clock.timezone())}`;
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
      if (!rule.enabled || m.kind !== 'target' || rule.activity === 'gym') return [];
      if ((rule.activity === 'walking' ? permissions.motion : permissions.health) !== 'granted') return [];
      const instance = currentInstances(rule, now, tz)[0] ?? windowInstances(rule, today, tz)[0];
      if (!instance) return [];
      const row = old.find((d) => d.ruleId === rule.id && d.day === instance.day) ?? {
        ruleId: rule.id,
        day: instance.day,
        progress: 0,
        met: false,
        metAt: null,
      };
      const value =
        m.activity === 'walking'
          ? steps
          : (workoutsKey === signalKey() ? workouts : [])
              .filter((w) => w.kind === rule.activity)
              .reduce(
                (sum, w) =>
                  sum +
                  (m.metric === 'minutes'
                    ? w.minutes
                    : w.km / (m.metric === 'distance' && m.unit === 'mi' ? 1.609344 : 1)),
                0,
              );
      const next = applyProgress(rule, row, value, now);
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
  };
  const refresh = async () => {
    const id = ++generation,
      key = signalKey();
    const start = localInstant(dayKey(runtime.clock.now(), runtime.clock.timezone()), 0, runtime.clock.timezone());
    await Promise.all([
      runtime.steps.stepsSince(start).then((value) => {
        if (active && id === generation && key === signalKey()) steps = value;
      }),
      Promise.all([runtime.health.workoutsToday('running'), runtime.health.workoutsToday('biking')]).then((rows) => {
        if (!active || id !== generation || key !== signalKey()) return;
        workoutsKey = key;
        workouts = rows.flat();
      }),
    ]);
    if (active && id === generation && key === signalKey()) update();
  };
  const stops = [
    runtime.steps.subscribe((value) => {
      steps = value;
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
    runtime.dev.subscribe(() => void refresh()),
    runtime.clock.subscribe(() => {
      if (workoutsKey !== signalKey()) void refresh();
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
