import { todayHistory } from '../progress/todayHistory';
import { useMemo, useSyncExternalStore } from 'react';
import { useRuntime } from '../ports/useRuntime';
import { resolveLock } from './resolveLock';
import { currentInstances, dayKey, windowInstances } from '../schedule/schedule';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { ruleDaysStore as useRuleDaysStore } from '../conditions/ruleDaysStore';
import { profileStore as useProfileStore } from '../preferences/profileStore';
import { streak } from '../progress/streak';
import { reclaimedPeriod } from '../progress/reclaimed';
import { addDays } from '../schedule/calendar';
import { inactiveWalkingStatus } from '../ports/WalkingPort';
const noopSubscribe = () => () => undefined;
function useClockValue(supplied?: string) {
  const runtime = useRuntime();
  return useSyncExternalStore(
    supplied === undefined ? runtime.clock.subscribe : noopSubscribe,
    supplied === undefined ? runtime.clock.now : () => supplied,
    supplied === undefined ? runtime.clock.now : () => supplied,
  );
}
export function useClock() {
  return useClockValue();
}
export function useDevSnapshot() {
  const runtime = useRuntime();
  if (!runtime.dev) throw new Error('Development controls are unavailable in the real runtime');
  return useSyncExternalStore(runtime.dev.subscribe, runtime.dev.snapshot, runtime.dev.snapshot);
}
export function useRuntimeStatus() {
  const { status } = useRuntime();
  return useSyncExternalStore(status.subscribe, status.snapshot, status.snapshot);
}
export function useLockDecision(suppliedNow?: string) {
  const runtime = useRuntime(),
    now = useClockValue(suppliedNow),
    timezone = runtime.clock.timezone(),
    rules = useRulesStore((s) => s.data.rules),
    { days, gymPresence } = useRuleDaysStore((s) => s.data),
    walking = useSyncExternalStore((notify) => runtime.walking.observe(notify), () => runtime.walking.snapshot(), () => inactiveWalkingStatus);
  return useMemo(
    () => resolveLock({
      now, timezone, rules, ruleDays: days,
      detection: { state: walking.phase === 'active' || walking.phase === 'grace' ? 'active' : walking.phase === 'unknown' ? 'unknown' : 'inactive', since: walking.since },
      placement: { state: walking.placement, liveRelief: walking.proppedVerified, since: walking.proppedSince },
      gymPresence,
    }),
    [now, timezone, rules, days, walking, gymPresence],
  );
}
export function useWalkingStatus() {
  const runtime = useRuntime();
  return useSyncExternalStore((notify) => runtime.walking.observe(notify), () => runtime.walking.snapshot(), () => inactiveWalkingStatus);
}
export function useTodayProgress(suppliedNow?: string) {
  const runtime = useRuntime(),
    now = useClockValue(suppliedNow),
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
export function useHistory(suppliedNow?: string) {
  const runtime = useRuntime(),
    now = useClockValue(suppliedNow),
    timezone = runtime.clock.timezone(),
    { history } = useRuntimeStatus(),
    rules = useRulesStore((s) => s.data.rules),
    days = useRuleDaysStore((s) => s.data.days);
  return useMemo(
    () => todayHistory(history, rules, days, now, timezone),
    [history, rules, days, now, timezone],
  );
}
export function useStreak(suppliedNow?: string) {
  const runtime = useRuntime(),
    now = useClockValue(suppliedNow),
    timezone = runtime.clock.timezone(),
    history = useHistory(now);
  return useMemo(() => streak(history, dayKey(now, timezone)), [history, now, timezone]);
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
