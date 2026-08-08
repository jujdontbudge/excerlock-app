import {
  type NotificationPreviewSlug,
} from '@/content';
import type {
  AccessHolidayState,
  DemoCondition,
  HomeMode,
} from '@/presentation';

export type HomeSessionStatus = 'inactive' | 'verifying' | 'active' | 'ended';

export type HomeEntryPresentation = {
  slug: Extract<NotificationPreviewSlug, 'nudge' | 'last-call'>;
  chip: string;
  conclusion: string;
  body: string;
};

const openModes = new Set<HomeMode>([
  'unlocked',
  'low',
  'unlimited',
  'rest-of-day',
  'set-period',
  'rest-day-no-locking',
  'outside-window',
]);

export function enabledHomeConditions(conditions: readonly DemoCondition[]) {
  return conditions.filter((condition) => condition.enabled);
}

export function cheapestAvailableCondition(conditions: readonly DemoCondition[]) {
  const available = enabledHomeConditions(conditions).filter(
    (condition) => condition.kind !== 'event'
      || (condition.todayStatus !== 'completed' && condition.todayStatus !== 'crediting'),
  );
  return available.find((condition) => condition.kind === 'state')
    ?? available.find((condition) => condition.kind === 'event')
    ?? available.find((condition) => condition.kind === 'rate');
}

export function isHomeModeOpen(mode: HomeMode) {
  return openModes.has(mode);
}

export function shouldPlayHomeUnlockHaptic(mode: HomeMode, targetMode?: HomeMode) {
  return targetMode !== undefined && !isHomeModeOpen(mode) && isHomeModeOpen(targetMode);
}

export function homeEntryPresentation(entry?: 'nudge' | 'lastCall'): HomeEntryPresentation | null {
  if (entry === 'nudge') {
    return {
      slug: 'nudge',
      chip: 'FROM NOTIFICATION PREVIEW',
      conclusion: 'A little room is waiting.',
      body: 'Choose a workout or walk when it fits. Your sample setup is ready.',
    };
  }
  if (entry === 'lastCall') {
    return {
      slug: 'last-call',
      chip: 'STREAK REMINDER PREVIEW',
      conclusion: 'Keep the 12-day rhythm going.',
      body: 'One meaningful activity today keeps the sample streak moving. No rush from this prototype.',
    };
  }
  return null;
}

type HomeHeaderMetrics = {
  currentStreakDays: number;
  earnedMinutesToday: number;
  hasConditions: boolean;
  hasMeaningfulActivityToday: boolean;
  restDayAllowanceOnly: boolean;
  showcase: boolean;
};

export function homeHeaderPresentation(
  mode: HomeMode,
  metricsOrLegacyShowcase: HomeHeaderMetrics | boolean,
) {
  const metrics: HomeHeaderMetrics = typeof metricsOrLegacyShowcase === 'boolean'
    ? {
        currentStreakDays: metricsOrLegacyShowcase ? 12 : 0,
        earnedMinutesToday: metricsOrLegacyShowcase ? 125 : 0,
        hasConditions: metricsOrLegacyShowcase,
        hasMeaningfulActivityToday: metricsOrLegacyShowcase,
        restDayAllowanceOnly: false,
        showcase: metricsOrLegacyShowcase,
      }
    : metricsOrLegacyShowcase;
  const streak = metrics.currentStreakDays;
  const goalPercent = metrics.showcase ? 50 : metrics.hasMeaningfulActivityToday ? 100 : 0;
  if (metrics.restDayAllowanceOnly) {
    return {
      dayLabel: 'Friday · Rest day',
      earnedLabel: 'Allowance only · streak unchanged',
      goalAccessibilityLabel: 'Rest day. Earning is paused and the streak is unchanged.',
      goalCaption: 'Rest day · earning paused',
      goalPercent: 0,
      streak,
      streakAccessibilityLabel: `${streak}-day streak, unchanged on this Rest day.`,
    };
  }
  if (mode === 'rest-day-no-locking') {
    return {
      dayLabel: 'Sunday · Rest day',
      earnedLabel: 'No goal today · streak unchanged',
      goalAccessibilityLabel: 'Rest day. Today’s goal is paused and the streak is unchanged.',
      goalCaption: 'Rest day · goal paused',
      goalPercent,
      streak,
      streakAccessibilityLabel: `${streak}-day streak, unchanged on this Rest day.`,
    };
  }
  if (mode === 'outside-window') {
    return {
      dayLabel: 'Friday · Outside lock window',
      earnedLabel: 'Limits paused · today stays neutral',
      goalAccessibilityLabel: 'Outside the lock window. Today’s goal and streak remain neutral until limits begin.',
      goalCaption: 'Outside window · goal neutral',
      goalPercent,
      streak,
      streakAccessibilityLabel: `${streak}-day streak, neutral outside the lock window.`,
    };
  }
  return {
    dayLabel: 'Friday · Active day',
    earnedLabel: `${formatEarnedMinutes(metrics.earnedMinutesToday)} earned today`,
    goalAccessibilityLabel: metrics.hasMeaningfulActivityToday
      ? `${goalPercent}% of today’s streak goal completed.`
      : 'Today’s meaningful-activity goal has not started.',
    goalCaption: metrics.hasMeaningfulActivityToday
      ? `${goalPercent}% of goal completed`
      : metrics.hasConditions ? 'Today’s goal is ready' : 'Your first active day starts here',
    goalPercent,
    streak,
    streakAccessibilityLabel: streak > 0
      ? `${streak}-day streak, active day.`
      : 'No streak yet; active day.',
  };
}

function formatClock(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period = hour >= 12 ? 'PM' : 'AM';
  return `${hour % 12 || 12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function activeWindowLabel(condition: DemoCondition) {
  const start = condition.activeWindowStartMinutes === null
    ? null
    : formatClock(condition.activeWindowStartMinutes);
  const end = condition.activeWindowEndMinutes === null
    ? null
    : formatClock(condition.activeWindowEndMinutes);
  switch (condition.activeWindow) {
    case 'start-only':
      return start ? `From ${start}` : 'Choose a start time';
    case 'end-only':
      return end ? `Until ${end}` : 'Choose an end time';
    case 'start-end':
    case 'guided':
      return start && end ? `${start}–${end}` : 'Choose start and end times';
    case 'anytime':
      return 'Anytime';
  }
}

export function eventConditionSubtitle(condition: DemoCondition) {
  const segments = condition.ruleSummary
    .split(' · ')
    .map((segment) => segment.trim())
    .filter(Boolean);
  if (segments.length <= 1) return condition.ruleSummary;
  return segments
    .slice(0, condition.catalogId.startsWith('gym-') ? 3 : 2)
    .join(' · ');
}

type RateSample = {
  amount: number;
  progress: number;
  quantum: number;
  source: (formattedAmount: string) => string;
  evidence: (formattedAmount: string) => string;
};

function formatSampleAmount(amount: number) {
  return amount.toLocaleString('en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  });
}

function formatEarnedMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function configuredDistanceUnit(condition: DemoCondition) {
  const quantum = condition.ruleSummary.split('=')[0] ?? '';
  if (/\bkm\b/.test(quantum)) return 'km';
  if (/\byd\b/.test(quantum)) return 'yd';
  if (/\bmi\b/.test(quantum)) return 'mi';
  if (/\bm\b/.test(quantum)) return 'm';
  return condition.catalogId === 'swim-distance-rate' ? 'yd' : 'mi';
}

function rateSample(condition: DemoCondition): RateSample {
  const unit = configuredDistanceUnit(condition);
  switch (condition.catalogId) {
    case 'run-distance-rate': {
      const amount = unit === 'km' ? 5.5 : 3.4;
      return {
        amount,
        evidence: (value) => `${value} ${unit} recorded`,
        progress: 0.68,
        quantum: 1,
        source: (value) => `${value} ${unit} recorded`,
      };
    }
    case 'cycle-distance-rate': {
      const metric = unit === 'km';
      return {
        amount: metric ? 13.8 : 8.6,
        evidence: (value) => `${value} ${unit} recorded`,
        progress: 0.72,
        quantum: metric ? 5 : 3,
        source: (value) => `${value} ${unit} recorded`,
      };
    }
    case 'swim-distance-rate': {
      const metric = unit === 'm';
      return {
        amount: metric ? 1100 : 1200,
        evidence: (value) => `${value} ${unit} recorded`,
        progress: 0.6,
        quantum: 100,
        source: (value) => `${value} ${unit} recorded`,
      };
    }
    case 'calories-rate':
      return {
        amount: 480,
        evidence: (value) => `${value} active kcal`,
        progress: 0.8,
        quantum: 100,
        source: (value) => `${value} active kcal`,
      };
    case 'active-minutes-rate':
      return {
        amount: 54,
        evidence: (value) => `${value} active min`,
        progress: 0.67,
        quantum: 10,
        source: (value) => `${value} active min`,
      };
    case 'gym-time':
      return {
        amount: 36,
        evidence: (value) => `${value} min present`,
        progress: 0.6,
        quantum: 10,
        source: (value) => `${value} min present`,
      };
    case 'walk-steps-rate':
    default:
      return {
        amount: 6240,
        evidence: (value) => `${value} steps`,
        progress: 0.624,
        quantum: 1000,
        source: (value) => `${value} steps today`,
      };
  }
}

export function rateConditionPresentation(
  condition: DemoCondition,
  effectiveRateMinutes?: number,
) {
  const sample = rateSample(condition);
  const formattedAmount = formatSampleAmount(sample.amount);
  const rateMinutes = effectiveRateMinutes ?? condition.rateMinutes ?? 5;
  const earnedMinutes = Math.round(
    sample.amount / sample.quantum * rateMinutes,
  );
  const earned = formatEarnedMinutes(earnedMinutes);
  return {
    earnedValue: `${earned} earned`,
    evidence: `${sample.evidence(formattedAmount)} · ${earned} credited.`,
    progress: sample.progress,
    ratioLabel: effectiveRateMinutes === undefined
      ? condition.ruleSummary
      : `${rateRuleWithMinutes(condition.ruleSummary, rateMinutes)} · Custom today`,
    sourceValue: sample.source(formattedAmount),
  };
}

function rateRuleWithMinutes(ruleSummary: string, minutes: number) {
  const [exchange, ...details] = ruleSummary.split(' · ');
  const effectiveExchange = exchange?.includes('=')
    ? `${exchange.slice(0, exchange.indexOf('=')).trim()} = ${minutes} min`
    : `${exchange ?? ruleSummary} = ${minutes} min`;
  return [effectiveExchange, ...details].filter(Boolean).join(' · ');
}

function eventEvidence(condition: DemoCondition, accessHoliday: AccessHolidayState | null) {
  if (accessHoliday?.sourceConditionId === condition.id) {
    return accessHoliday.kind === 'restOfDay'
      ? `Completed today · open until ${accessHoliday.expiresAt}.`
      : `Completed today · open until ${accessHoliday.expiresAt}${accessHoliday.durationMinutes ? ` (${accessHoliday.durationMinutes} min)` : ''}.`;
  }
  if (condition.todayStatus === 'completed') return 'Completed today.';
  if (condition.todayStatus === 'crediting') return 'Completion verified · reward is settling.';
  if (condition.cooldownRemainingMinutes > 0) {
    return `Completed ${condition.completionCountToday}× today · ${condition.cooldownRemainingMinutes} min cooldown left.`;
  }
  return condition.catalogId === 'gym-arrive'
    ? 'Not completed today.'
    : `Today’s sample progress is ready for the ${condition.eventThreshold ?? 'configured'} goal.`;
}

function stateEvidence(
  condition: DemoCondition,
  gymStatus: HomeSessionStatus,
  walkStatus: HomeSessionStatus,
) {
  const status = condition.catalogId.startsWith('gym-') ? gymStatus : walkStatus;
  switch (status) {
    case 'active':
      return condition.catalogId.startsWith('gym-')
        ? 'Check-in verified today.'
        : '18 min active today · balance drains normally.';
    case 'verifying':
      return 'Verification is in progress in this local demo.';
    case 'ended':
      return 'The most recent sample session ended.';
    case 'inactive':
      return condition.catalogId.startsWith('gym-') ? 'Not checked in today.' : '0 min active today.';
  }
}

function rateEvidence(condition: DemoCondition, effectiveRateMinutes?: number | null) {
  if (effectiveRateMinutes === null) return 'Off this weekday · no credit can be earned today.';
  return rateConditionPresentation(condition, effectiveRateMinutes).evidence;
}

export function conditionDetailPresentation(
  condition: DemoCondition,
  accessHoliday: AccessHolidayState | null,
  gymStatus: HomeSessionStatus,
  walkStatus: HomeSessionStatus,
  effectiveRateMinutes?: number | null,
) {
  const status = condition.kind === 'state'
    ? condition.catalogId.startsWith('gym-') ? gymStatus : walkStatus
    : condition.todayStatus;
  const evidence = condition.kind === 'event'
    ? eventEvidence(condition, accessHoliday)
    : condition.kind === 'state'
      ? stateEvidence(condition, gymStatus, walkStatus)
      : rateEvidence(condition, effectiveRateMinutes);
  return {
    evidence,
    rule: condition.kind === 'rate' && effectiveRateMinutes !== undefined
      ? effectiveRateMinutes === null
        ? `${condition.ruleSummary} · Off this weekday`
        : `${rateRuleWithMinutes(condition.ruleSummary, effectiveRateMinutes)} · Custom today`
      : condition.ruleSummary,
    status: effectiveRateMinutes === null ? 'off today' : status.replaceAll('-', ' '),
    window: activeWindowLabel(condition),
  };
}
