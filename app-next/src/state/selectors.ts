import { todayHistory } from './todayHistory';
import { useMemo, useSyncExternalStore } from 'react';
import { useRuntime } from '../runtime/AppRuntimeProvider';
import { resolveLock } from '../domain/resolveLock';
import { currentInstances, dayKey, windowInstances } from '../domain/schedule';
import { rulesStore as useRulesStore } from './rulesStore';
import { ruleDaysStore as useRuleDaysStore } from './ruleDaysStore';
import { streak } from '../domain/streak';
export function useClock() {
  const runtime = useRuntime();
  return useSyncExternalStore(runtime.clock.subscribe, runtime.clock.now, runtime.clock.now);
}
export function useDevSnapshot() {
  const runtime = useRuntime();
  return useSyncExternalStore(runtime.dev.subscribe, runtime.dev.snapshot, runtime.dev.snapshot);
}
export function useLockDecision() {
  const runtime = useRuntime(),
    now = useClock(),
    timezone = runtime.clock.timezone(),
    rules = useRulesStore((s) => s.data.rules),
    { days, walkingSession } = useRuleDaysStore((s) => s.data);
  return useMemo(
    () => resolveLock({ now, timezone, rules, ruleDays: days, walkingSession }),
    [now, timezone, rules, days, walkingSession],
  );
}
export function useTodayProgress() {
  const runtime = useRuntime(),
    now = useClock(),
    tz = runtime.clock.timezone(),
    rules = useRulesStore((s) => s.data.rules),
    days = useRuleDaysStore((s) => s.data.days);
  return useMemo(
    () =>
      rules
        .filter((rule) => rule.enabled)
        .flatMap((rule) => {
          const instance = currentInstances(rule, now, tz)[0] ?? windowInstances(rule, dayKey(now, tz), tz)[0];
          if (!instance) return [];
          const row = days.find((d) => d.ruleId === rule.id && d.day === instance.day) ?? {
            ruleId: rule.id,
            day: instance.day,
            progress: 0,
            met: false,
            metAt: null,
          };
          return [{ rule, row, instance }];
        }),
    [rules, days, now, tz],
  );
}
export function useHistory() {
  const runtime = useRuntime(),
    now = useClock(),
    { history } = useDevSnapshot(),
    rules = useRulesStore((s) => s.data.rules),
    days = useRuleDaysStore((s) => s.data.days);
  return useMemo(
    () => todayHistory(history, rules, days, now, runtime.clock.timezone()),
    [history, rules, days, now, runtime],
  );
}
export function useStreak() {
  const runtime = useRuntime(),
    now = useClock(),
    history = useHistory();
  return useMemo(() => streak(history, dayKey(now, runtime.clock.timezone())), [history, now, runtime]);
}
