import { useMemo, useSyncExternalStore } from 'react';
import { addDays, dayKey, localDayStart } from '../domain/calendar';
import { windowInstances } from '../domain/schedule';
import type { Rule, RuleDay } from '../domain/types';
import type { ClockPort } from '../ports/ClockPort';
import { useRuntime } from '../runtime/AppRuntimeProvider';
import { ruleDaysStore as useRuleDaysStore } from './ruleDaysStore';
import { rulesStore as useRulesStore } from './rulesStore';

export type HomeClockSnapshot = Readonly<{ now: string; timezone: string }>;

export function createHomeClockSnapshot(clock: ClockPort) {
  let rulesIdentity: readonly Rule[] | null = null;
  let daysIdentity: readonly RuleDay[] | null = null;
  let lower = Number.NEGATIVE_INFINITY;
  let upper = Number.POSITIVE_INFINITY;
  let current: HomeClockSnapshot | null = null;

  const recompute = (rules: readonly Rule[], days: readonly RuleDay[], now: string, timezone: string) => {
    const epoch = Date.parse(now);
    const today = dayKey(now, timezone);
    const boundaries = [
      Date.parse(localDayStart(today, timezone)),
      Date.parse(localDayStart(addDays(today, 1), timezone)),
      ...rules
        .filter((rule) => rule.enabled)
        .flatMap((rule) =>
          [addDays(today, -1), today, addDays(today, 1)].flatMap((day) =>
            windowInstances(rule, day, timezone).flatMap((instance) => [Date.parse(instance.start), Date.parse(instance.end)]),
          ),
        ),
      ...days.filter((row) => row.met && row.metAt).map((row) => Date.parse(row.metAt!)),
    ].filter(Number.isFinite);
    lower = Number.NEGATIVE_INFINITY;
    upper = Number.POSITIVE_INFINITY;
    for (const boundary of boundaries) {
      if (boundary <= epoch && boundary > lower) lower = boundary;
      if (boundary > epoch && boundary < upper) upper = boundary;
    }
    rulesIdentity = rules;
    daysIdentity = days;
    current = Object.freeze({ now, timezone });
    return current;
  };

  return (rules: readonly Rule[], days: readonly RuleDay[]): HomeClockSnapshot => {
    const now = clock.now();
    const timezone = clock.timezone();
    const epoch = Date.parse(now);
    if (
      !current ||
      rules !== rulesIdentity ||
      days !== daysIdentity ||
      timezone !== current.timezone ||
      epoch < lower ||
      epoch >= upper
    )
      return recompute(rules, days, now, timezone);
    return current;
  };
}

export function useHomeClock(): HomeClockSnapshot {
  const runtime = useRuntime();
  const rules = useRulesStore((state) => state.data.rules);
  const days = useRuleDaysStore((state) => state.data.days);
  const owner = useMemo(() => createHomeClockSnapshot(runtime.clock), [runtime.clock]);
  const getSnapshot = useMemo(() => () => owner(rules, days), [owner, rules, days]);
  return useSyncExternalStore(runtime.clock.subscribe, getSnapshot, getSnapshot);
}
