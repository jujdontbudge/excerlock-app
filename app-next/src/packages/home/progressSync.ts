import { Runtime } from '../ports/Runtime';
import { rulesStore } from '../conditions/rulesStore';
import { ruleDaysStore } from '../conditions/ruleDaysStore';
import { permissionsStore } from '../permissions/permissionsStore';
import { dayKey, windowInstances, currentInstances } from '../schedule/schedule';
import { applyProgress } from '../progress/progress';
export function startProgressSync(runtime: Runtime) {
  if (runtime.kind !== 'fake') return () => undefined;
  let active = true,
    steps = 0;
  const update = () => {
    if (!active || runtime.status.snapshot().loading) return;
    const now = runtime.clock.now(),
      tz = runtime.clock.timezone(),
      today = dayKey(now, tz),
      permissions = permissionsStore.getState().data;
    const old = ruleDaysStore.getState().data.days;
    const changes = rulesStore.getState().data.rules.flatMap((rule) => {
      const m = rule.mode;
      if (!rule.enabled || m.kind !== 'target' || m.activity !== 'walking' || m.metric !== 'steps') return [];
      if (permissions.motion !== 'granted') return [];
      const instance = currentInstances(rule, now, tz)[0] ?? windowInstances(rule, today, tz)[0];
      if (!instance) return [];
      const row = old.find((d) => d.ruleId === rule.id && d.day === instance.day) ?? {
        ruleId: rule.id,
        day: instance.day,
        progress: 0,
        met: false,
        metAt: null,
      };
      const next = applyProgress(rule, row, steps, now);
      return next.progress === row.progress && next.met === row.met && old.includes(row) ? [] : [next];
    });
    if (changes.length)
      ruleDaysStore
        .getState()
        .patch({
          days: [...old.filter((d) => !changes.some((n) => n.ruleId === d.ruleId && n.day === d.day)), ...changes],
        });
  };
  const stops = [
    runtime.steps.subscribe((value) => {
      steps = value;
      update();
    }),
    rulesStore.subscribe(update),
    permissionsStore.subscribe(update),
    runtime.status.subscribe(update),
    runtime.clock.subscribe(update),
  ];
  return () => {
    active = false;
    stops.forEach((stop) => stop());
  };
}
