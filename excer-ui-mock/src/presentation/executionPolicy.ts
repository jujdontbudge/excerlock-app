import type {
  DemoCondition,
  DemoState,
  HomeMode,
  RuleWeekday,
  WeeklyConditionRewardOverride,
} from './types';

const WEEKDAYS: readonly RuleWeekday[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

export type CurrentRuleAccess = {
  mode: Extract<HomeMode, 'rest-day-no-locking' | 'outside-window'>;
  sourceName: string;
  expiresAt: string;
};

export type EffectiveEventReward =
  | { kind: 'off' }
  | { kind: 'fixed'; minutes: number }
  | { kind: 'rest-of-day' }
  | { kind: 'set-period'; minutes: number };

export function weekdayForDayKey(dayKey: string): RuleWeekday {
  const date = new Date(`${dayKey}T12:00:00Z`);
  const index = Number.isNaN(date.getTime()) ? 5 : date.getUTCDay();
  return WEEKDAYS[index] ?? 'friday';
}

export function isMinuteInsideWindow(minuteOfDay: number, start: number, end: number) {
  const minute = normalizeMinute(minuteOfDay);
  const normalizedStart = normalizeMinute(start);
  const normalizedEnd = normalizeMinute(end);
  return normalizedStart <= normalizedEnd
    ? minute >= normalizedStart && minute <= normalizedEnd
    : minute >= normalizedStart || minute <= normalizedEnd;
}

export function isConditionInsideActiveWindow(
  condition: Pick<
    DemoCondition,
    'activeWindow' | 'activeWindowStartMinutes' | 'activeWindowEndMinutes'
  >,
  minuteOfDay: number,
) {
  const { activeWindow, activeWindowStartMinutes: start, activeWindowEndMinutes: end } = condition;
  if (activeWindow === 'anytime') return true;
  if (activeWindow === 'start-only') return start !== null && normalizeMinute(minuteOfDay) >= start;
  if (activeWindow === 'end-only') return end !== null && normalizeMinute(minuteOfDay) <= end;
  return start !== null && end !== null && isMinuteInsideWindow(minuteOfDay, start, end);
}

export function isConditionExecutableNow(state: DemoState, condition: DemoCondition) {
  return condition.enabled
    && !isRestDayForStreak(state, state.clock.dayKey)
    && getCurrentRuleAccess(state) === null
    && getCurrentRewardOverride(state, condition.id)?.kind !== 'off'
    && isConditionInsideActiveWindow(condition, state.clock.minuteOfDay);
}

export function getCurrentRewardOverride(
  state: DemoState,
  conditionId: string,
): WeeklyConditionRewardOverride | undefined {
  const weekday = weekdayForDayKey(state.clock.dayKey);
  if (state.rules.weekly.dayModes[weekday] !== 'custom') return undefined;
  return state.rules.weekly.customValues[weekday].rewardOverrides[conditionId];
}

export function getCurrentAllowanceMinutes(
  state: DemoState,
  dayKey = state.clock.dayKey,
): number | 'unlimited' {
  const weekday = weekdayForDayKey(dayKey);
  if (state.rules.weekly.dayModes[weekday] !== 'custom') {
    return state.rules.allowanceMinutes;
  }
  return parseAllowanceLabel(state.rules.weekly.customValues[weekday].allowance)
    ?? state.rules.allowanceMinutes;
}

export function getCurrentBalanceMinutes(state: DemoState) {
  const allowance = getCurrentAllowanceMinutes(state);
  if (allowance === 'unlimited') return state.home.remainingMinutes;
  return Math.max(
    0,
    allowance + state.home.earnedMinutesToday - state.home.screenTimeUsedMinutes,
  );
}

export function isRestDayForStreak(state: DemoState, dayKey: string) {
  const weekday = weekdayForDayKey(dayKey);
  return state.rules.weekly.dayModes[weekday] === 'rest'
    || state.rules.weekly.plannedDaysOff.some((day) => day.date === dayKey)
    || (dayKey === state.clock.dayKey && Boolean(state.rules.weekly.todayRestReason?.trim()));
}

export function isCurrentRestDayAllowanceOnly(state: DemoState) {
  const weekday = weekdayForDayKey(state.clock.dayKey);
  return state.rules.weekly.dayModes[weekday] === 'rest'
    && state.rules.weekly.restBehaviors[weekday] === 'allowance-only';
}

export function getEffectiveEventReward(
  state: DemoState,
  condition: DemoCondition,
): EffectiveEventReward {
  const override = getCurrentRewardOverride(state, condition.id);
  if (override) {
    if (override.kind === 'off') return override;
    if (override.kind === 'fixed') return { kind: 'fixed', minutes: override.minutes };
    if (override.kind === 'rest-of-day') return override;
    return { kind: 'set-period', minutes: override.minutes };
  }
  const reward = condition.reward ?? { kind: 'fixed' as const, minutes: 30 };
  if (reward.kind === 'fixed') return { kind: 'fixed', minutes: reward.minutes ?? 30 };
  if (reward.kind === 'rest-of-day') return { kind: 'rest-of-day' };
  return { kind: 'set-period', minutes: reward.minutes ?? 90 };
}

export function getEffectiveRateMinutes(
  state: DemoState,
  condition: DemoCondition,
): number | null {
  if (condition.kind !== 'rate') return null;
  const override = getCurrentRewardOverride(state, condition.id);
  if (override?.kind === 'off') return null;
  if (override?.kind === 'fixed') return override.minutes;
  return condition.rateMinutes ?? 5;
}

export function getCurrentRuleAccess(state: DemoState): CurrentRuleAccess | null {
  const { weekly } = state.rules;
  const weekday = weekdayForDayKey(state.clock.dayKey);
  const isPlannedDayOff = weekly.plannedDaysOff.some((day) => day.date === state.clock.dayKey);
  const isTodayOverride = Boolean(weekly.todayRestReason?.trim());
  const dayMode = weekly.dayModes[weekday];
  const restWithoutLocking = isTodayOverride
    || isPlannedDayOff
    || (dayMode === 'rest' && weekly.restBehaviors[weekday] === 'no-locking');

  if (restWithoutLocking) {
    return {
      mode: 'rest-day-no-locking',
      sourceName: isTodayOverride
        ? `Today’s rest-day override${weekly.todayRestReason ? ` · ${weekly.todayRestReason}` : ''}`
        : isPlannedDayOff
          ? 'Planned day off'
          : `${capitalize(weekday)} Rest day rule`,
      expiresAt: state.settings.dayBoundary === 'midnight'
        ? 'Midnight'
        : state.settings.dayBoundary,
    };
  }

  const customWindow = dayMode === 'custom'
    ? weekly.customValues[weekday].window
    : null;
  const lockWindow = dayMode === 'custom'
    ? customWindow === 'All day' ? null : parseWindowLabel(customWindow ?? '')
    : weekly.lockWindowEnabled
      ? {
          start: parseClockLabel(weekly.lockWindowFrom),
          end: parseClockLabel(weekly.lockWindowTo),
          startLabel: weekly.lockWindowFrom,
        }
      : null;

  if (
    lockWindow
    && lockWindow.start !== null
    && lockWindow.end !== null
    && !isMinuteInsideWindow(state.clock.minuteOfDay, lockWindow.start, lockWindow.end)
  ) {
    return {
      mode: 'outside-window',
      sourceName: dayMode === 'custom'
        ? `${capitalize(weekday)} Custom lock window`
        : 'Weekly lock window',
      expiresAt: lockWindow.startLabel,
    };
  }
  return null;
}

export function getBalanceDerivedHomeMode(state: DemoState): HomeMode {
  if (getCurrentAllowanceMinutes(state) === 'unlimited') return 'unlimited';
  if (state.home.remainingMinutes <= 0) {
    return state.conditions.some((condition) => condition.enabled)
      ? 'locked'
      : 'first-home-empty';
  }
  return state.home.remainingMinutes <= 10 ? 'low' : 'unlocked';
}

export function formatMinutes(minutes: number) {
  const normalized = Math.max(0, Math.floor(minutes));
  if (normalized < 60) return `${normalized} min`;
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function parseWindowLabel(value: string) {
  const [startLabel, endLabel] = value.split(/[–-]/).map((part) => part.trim());
  if (!startLabel || !endLabel) return null;
  return {
    start: parseClockLabel(startLabel),
    end: parseClockLabel(endLabel),
    startLabel,
  };
}

function parseClockLabel(value: string) {
  const match = /^(\d{1,2})(?::(\d{2}))?\s*([AP]M)$/i.exec(value.trim());
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
  const normalizedHour = hour % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0);
  return normalizedHour * 60 + minute;
}

function parseAllowanceLabel(value: string): number | 'unlimited' | null {
  const normalized = value.trim();
  if (/^unlimited$/i.test(normalized)) return 'unlimited';
  const hourMatch = /^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/i.exec(normalized);
  if (hourMatch) return Math.max(0, Math.min(240, Math.round(Number(hourMatch[1]) * 60)));
  const minuteMatch = /^(\d+)\s*min(?:utes?)?(?:\s*·.*)?$/i.exec(normalized);
  if (minuteMatch) return Math.max(0, Math.min(240, Number(minuteMatch[1])));
  return null;
}

function normalizeMinute(value: number) {
  return ((Math.floor(value) % 1440) + 1440) % 1440;
}

function capitalize(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}
