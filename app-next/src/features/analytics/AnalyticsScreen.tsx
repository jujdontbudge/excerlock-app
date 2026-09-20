import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Label, PressableScale, ScreenShell, SegmentedControl } from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { useClock, useHistory } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { dayKey } from '../../domain/calendar';
import { analyticsCopy as c } from '../../content/analytics';
import { analyticsModel } from './analyticsModel';
import { Period } from './period';
import { MetricBars, MetricPoint } from './MetricBars';
import { useAppleSteps } from './useAppleSteps';
import { DailyActivityRing } from './DailyActivityRing';
import { MonthGrid } from './MonthGrid';
import { ActivityStats, ActivityStat } from './ActivityStats';
import { ActivityTrend } from './ActivityTrend';

const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
const duration = (minutes: number) => {
  const rounded = Math.round(minutes);
  return rounded < 60 ? `${rounded}m` : `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
};
const integer = (value: number) => Math.round(value).toLocaleString('en-US');
const periodLabels: Record<string, Period> = { D: 'Day', W: 'Week', M: 'Month' };

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('Week');
  const [offset, setOffset] = useState(0);
  const runtime = useRuntime();
  const now = useClock();
  const history = useHistory();
  const baseline = useProfileStore((state) => state.data.estimatedDailyMinutes);
  const rules = useRulesStore((state) => state.data.rules);
  const ruleDays = useRuleDaysStore((state) => state.data.days);
  const today = dayKey(now, runtime.clock.timezone());
  const model = useMemo(
    () => analyticsModel(history, today, period, offset, baseline, { rules, ruleDays }),
    [history, today, period, offset, baseline, rules, ruleDays],
  );
  const enabledRules = useMemo(
    () => rules.filter((rule) => rule.enabled).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [rules],
  );
  const gymRules = enabledRules.filter((rule) => rule.activity === 'gym');
  const primaryActivity = gymRules.length ? 'gym' : 'walking';
  const walkingRule = enabledRules.find(
    (rule) => rule.activity === 'walking' && rule.mode.kind === 'target' && rule.mode.metric === 'steps',
  );
  const gymRule = gymRules.find((rule) => rule.mode.kind === 'target' && rule.mode.metric === 'minutes');
  const goal = primaryActivity === 'walking'
    ? walkingRule?.mode.kind === 'target' ? walkingRule.mode.goal : 10_000
    : gymRule?.mode.kind === 'target' ? gymRule.mode.goal : 30;
  const stepDays = useMemo(() => model.series.map((point) => point.day), [model.series]);
  const stepFallback = useMemo(
    () => model.series.map((point) => ({ day: point.day, value: point.day > today ? null : point.activity.walking })),
    [model.series, today],
  );
  const apple = useAppleSteps(stepDays, today, stepFallback);
  const walkingValues = apple.points.map((point) => point.value);
  const gymValues = model.series.map((point) => point.day > today ? null : point.activity.gym);
  const movementValues = primaryActivity === 'walking' ? walkingValues : gymValues;
  const movementName = primaryActivity === 'walking' ? 'Walking' : 'Gym';
  const movementUnit = primaryActivity === 'walking' ? 'steps from Apple Motion & Fitness' : 'minutes at the gym';
  const movementPoints: MetricPoint[] = model.series.map((point, index) => ({
    label: point.label,
    value: movementValues[index],
    selected: period === 'Day' && point.day === model.start,
  }));
  const selectedIndexes = model.series.flatMap((point, index) =>
    point.day >= model.start && point.day <= model.end ? [index] : [],
  );
  const selectedValues = selectedIndexes.map((index) => movementValues[index]);
  const movementTotal = sum(selectedValues);
  const selectedApple = selectedIndexes.map((index) => apple.points[index]).filter(Boolean);
  const stats = primaryActivity === 'walking'
    ? walkingStats(model.streak.current, movementTotal, selectedApple)
    : gymStats(model.streak.current, movementTotal, selectedValues);
  const rangeLabel = offset === 0 ? c.thisPeriod(period) : c.range(model.start, model.end);
  const dayLabel = offset === 0 ? 'Today' : new Date(`${model.start}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long' });
  const monthlyTrend = useMemo(() => monthTrend(history, model.end, primaryActivity), [history, model.end, primaryActivity]);
  const trendValues = period === 'Month' ? monthlyTrend.values : movementValues.map((value) => value ?? 0);
  const trendStart = period === 'Month' ? monthlyTrend.startLabel : monthName(model.series[0]?.day);
  const trendEnd = period === 'Month' ? monthlyTrend.endLabel : monthName(model.series.at(-1)?.day);
  return (
    <ScreenShell dock safeBottom={false} contentStyle={s.content}>
      <View style={s.header}>
        <Label accessibilityRole="header" variant="question" style={{ flex: 1 }}>{c.title}</Label>
        <View style={s.periodControl}>
          <SegmentedControl
            options={['D', 'W', 'M']}
            value={period === 'Day' ? 'D' : period === 'Week' ? 'W' : 'M'}
            onChange={(label) => { setPeriod(periodLabels[label]); setOffset(0); }}
          />
        </View>
      </View>
      <View style={s.nav}>
        <PressableScale label={c.previous} onPress={() => setOffset((value) => value - 1)} style={s.arrow}>
          <Icon name="back" variant="utility" size={20} tint={t.text.primary} />
        </PressableScale>
        <Label variant="label" style={s.range}>{rangeLabel}</Label>
        <PressableScale label={c.next} disabled={offset === 0} onPress={() => setOffset((value) => value + 1)}
          style={[s.arrow, offset === 0 && { opacity: 0.3 }]}>
          <Icon name="chevron" variant="utility" size={20} tint={t.text.primary} />
        </PressableScale>
      </View>
      {primaryActivity === 'walking' && apple.status !== 'granted' ? (
        <PressableScale label="Connect Apple steps" onPress={() => void apple.request()} style={s.connect}>
          <Icon name="walking" variant="utility" size={20} tint={t.brand.primary} />
          <Label variant="label">Connect Apple steps</Label>
        </PressableScale>
      ) : null}
      {period === 'Day' ? (
        <DailyActivityRing value={movementTotal} goal={goal} unit={primaryActivity === 'walking' ? 'steps' : 'minutes'} dayLabel={dayLabel} />
      ) : period === 'Month' ? (
        <MonthGrid
          data={model.series.map((point, index) => ({ day: point.day, value: movementValues[index] }))}
          goal={goal}
          unit={primaryActivity === 'walking' ? 'steps' : 'minutes'}
        />
      ) : (
        <MetricBars title={movementName} data={movementPoints} unit={movementUnit} />
      )}
      <ActivityStats stats={stats} />
      <ActivityTrend
        label={primaryActivity === 'walking' ? 'Steps trend' : 'Gym trend'}
        values={trendValues}
        startLabel={trendStart}
        endLabel={trendEnd}
      />
    </ScreenShell>
  );
}

function walkingStats(streak: number, steps: number, points: ReturnType<typeof useAppleSteps>['points']): ActivityStat[] {
  const distanceMeters = points.reduce((total, point) => total + (point.distanceMeters ?? (point.value ?? 0) * 0.705), 0);
  const activeMinutes = points.reduce((total, point) => total + (point.activeMinutes ?? (point.value ?? 0) / 107), 0);
  const floorValues = points.flatMap((point) => point.floorsAscended === null ? [] : [point.floorsAscended]);
  return [
    { label: 'Streak', value: `${streak}d` },
    { label: 'Calories', value: `${integer(steps * 0.0142)} kcal` },
    { label: 'Distance', value: `${(distanceMeters / 1609.344).toFixed(1)} mi` },
    { label: 'Minutes', value: duration(activeMinutes) },
    { label: 'Floors', value: floorValues.length ? integer(sum(floorValues)) : '—' },
  ];
}

function gymStats(streak: number, minutes: number, values: (number | null)[]): ActivityStat[] {
  return [
    { label: 'Streak', value: `${streak}d` },
    { label: 'Minutes', value: duration(minutes) },
    { label: 'Days visited', value: integer(values.filter((value) => (value ?? 0) > 0).length) },
  ];
}

function monthTrend(history: ReturnType<typeof useHistory>, end: string, activity: 'walking' | 'gym') {
  const endDate = new Date(`${end.slice(0, 7)}-01T12:00:00Z`);
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(endDate);
    date.setUTCMonth(date.getUTCMonth() - (11 - index));
    return date.toISOString().slice(0, 7);
  });
  return {
    values: months.map((month) => history
      .filter((row) => row.day.startsWith(month))
      .reduce((total, row) => total + row.activity[activity], 0)),
    startLabel: monthName(`${months[0]}-01`),
    endLabel: monthName(`${months.at(-1)}-01`),
  };
}

function monthName(day?: string) {
  return day ? new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short' }).toUpperCase() : '';
}

const s = StyleSheet.create({
  content: { paddingHorizontal: t.space.lg, paddingTop: t.space.sm, gap: t.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  periodControl: { width: 180 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: t.layout.touch, height: t.layout.touch, alignItems: 'center' },
  range: { flex: 1, textAlign: 'center' },
  connect: { minHeight: t.layout.button, borderRadius: t.radius.pill, backgroundColor: t.surface.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.outline, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: t.space.sm },
});
