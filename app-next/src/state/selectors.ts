import { todayHistory } from './todayHistory';
import { useMemo, useSyncExternalStore } from 'react';
import { useRuntime } from '../runtime/AppRuntimeProvider';
import { resolveLock } from '../domain/resolveLock';
import { currentInstances, dayKey, windowInstances } from '../domain/schedule';
import { rulesStore as useRulesStore } from './rulesStore';
import { ruleDaysStore as useRuleDaysStore } from './ruleDaysStore';
import { profileStore as useProfileStore } from './profileStore';
import { streak } from '../domain/streak';
import { reclaimedPeriod } from '../domain/reclaimed';
import { addDays } from '../domain/calendar';
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
    { days, walkingSession, gymPresence } = useRuleDaysStore((s) => s.data);
  return useMemo(
    () => resolveLock({ now, timezone, rules, ruleDays: days, walkingSession, gymPresence }),
    [now, timezone, rules, days, walkingSession, gymPresence],
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
export function useAnalytics(period: 'Week' | 'Month' | 'Year') {
  const runtime = useRuntime(),
    now = useClock(),
    history = useHistory(),
    baseline = useProfileStore((s) => s.data.estimatedDailyMinutes),
    today = dayKey(now, runtime.clock.timezone());
  return useMemo(() => {
    const length = period === 'Week' ? 7 : period === 'Month' ? 30 : 365;
    const start = addDays(today, 1 - length),
      previousStart = addDays(start, -length);
    const rows = history.filter((d) => d.day >= start && d.day <= today),
      previous = history.filter((d) => d.day >= previousStart && d.day < start);
    return {
      rows,
      previous,
      reclaimed: reclaimedPeriod(
        baseline,
        rows.map((d) => d.usageMinutes),
      ),
      previousReclaimed: reclaimedPeriod(
        baseline,
        previous.map((d) => d.usageMinutes),
      ),
      scheduled: rows.filter((d) => d.scheduled).length,
      met: rows.filter((d) => d.scheduled && d.met).length,
    };
  }, [period, today, history, baseline]);
}
