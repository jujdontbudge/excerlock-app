import { useBank } from '../bank/Bank';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomSheet, ChoiceRow, Label, PressableScale, ScreenShell, SegmentedControl } from '../ui';
import { Icon } from '../ui/Icon';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useMotion } from '../ui/useMotion';
import { analyticsPreferencesStore as useAnalyticsPreferencesStore } from './analyticsPreferencesStore';
import { fadeIn } from '../ui/presets';
import { tokens as t } from '../ui/tokens';
import { useClock, useHistory } from '../lock/selectors';
import { useRuntime } from '../ports/useRuntime';
import { profileStore as useProfileStore } from '../preferences/profileStore';
import { rulesStore as useRulesStore } from '../conditions/rulesStore';
import { ruleDaysStore as useRuleDaysStore } from '../conditions/ruleDaysStore';
import { dayKey } from '../schedule/calendar';
import { analyticsCopy as c } from './lib/analyticsCopy';
import { analyticsModel } from './lib/analyticsModel';
import { Period } from './lib/period';
import { MetricBars, MetricPoint } from './lib/MetricBars';
import { useAppleSteps } from './lib/useAppleSteps';
import { useShowcaseMode } from '../progress/showcaseModeStore';
import { DailyActivityRing } from './lib/DailyActivityRing';
import { MonthGrid } from './lib/MonthGrid';
import { ActivityStats, ActivityStat } from './lib/ActivityStats';
import { ActivityTrend } from './lib/ActivityTrend';
import { PeriodHeader } from './lib/PeriodHeader';
import { trendPoints } from './lib/trendModel';
import { offsetAfterPeriodSwipe } from './lib/periodSwipe';
import { haptic } from '../ui/haptics';

const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
const duration = (minutes: number) => {
  const rounded = Math.round(minutes);
  if (rounded < 60) return { value: `${rounded}`, label: 'min', spoken: `${rounded} minutes` };
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  return { value: `${hours}:${`${rest}`.padStart(2, '0')}`, label: 'h', spoken: `${hours} hours ${rest} minutes` };
};
const integer = (value: number) => Math.round(value).toLocaleString('en-US');
const periodLabels: Record<string, Period> = { D: 'Day', W: 'Week', M: 'Month' };

export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('Week');
  const [offset, setOffset] = useState(0);
  const [monthTrendOffset, setMonthTrendOffset] = useState(0);
  const [metricPickerOpen, setMetricPickerOpen] = useState(false);
  const selectedActivity = useAnalyticsPreferencesStore((state) => state.data.activity);
  const motion = useMotion();
  const { timing, spring, reduced } = motion;
  const chartX = useSharedValue(0);
  const chartWidth = useSharedValue(0);
  const transitioning = useSharedValue(false);
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
  const bank = useBank();
  const gymRules = enabledRules.filter((rule) => rule.activity === 'gym');
  const showcase = useShowcaseMode();
  const canSwitchActivity = showcase || (rules.some((condition) => condition.activity === 'walking')
    && rules.some((condition) => condition.activity === 'gym'));
  const availableChoice = selectedActivity && (showcase || rules.some((condition) => condition.activity === selectedActivity));
  const primaryActivity = availableChoice ? selectedActivity : gymRules.length ? 'gym' : 'walking';
  const metricTitle = c.metricTitles[primaryActivity];
  const walkingRule = enabledRules.find(
    (rule) => rule.activity === 'walking' && rule.mode.kind === 'target' && rule.mode.metric === 'steps',
  );
  const gymRule = gymRules.find((rule) => rule.mode.kind === 'target' && rule.mode.metric === 'minutes');
  const goal = bank?.today.minimum ?? (primaryActivity === 'walking'
    ? walkingRule?.mode.kind === 'target' ? walkingRule.mode.goal : 10_000
    : gymRule?.mode.kind === 'target' ? gymRule.mode.goal : 30);
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
  const dayLabel = offset === 0
    ? 'Today'
    : offset === -1
      ? 'Yesterday'
      : new Date(`${model.start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const trend = useMemo(
    () => trendPoints(period === 'Month' ? 'Week' : period, today, history, primaryActivity),
    [period, today, history, primaryActivity],
  );
  const previousModel = useMemo(
    () => analyticsModel(history, today, period, offset - 1, baseline, { rules, ruleDays }),
    [history, today, period, offset, baseline, rules, ruleDays],
  );
  const measuredValues = selectedValues.flatMap((value) => value === null ? [] : [value]);
  const average = measuredValues.length ? movementTotal / measuredValues.length : 0;
  const previousValues = previousModel.series
    .flatMap((point) => point.day > today ? [] : [primaryActivity === 'walking' ? point.activity.walking : point.activity.gym])
    .flatMap((value) => value === null ? [] : [value]);
  const previousAverage = previousValues.length
    ? previousValues.reduce((total, value) => total + value, 0) / previousValues.length
    : 0;
  const metricUnit = primaryActivity === 'walking' ? 'steps' : 'minutes';
  const commitPeriod = useCallback((next: number, direction: number) => {
    chartX.set(reduced ? 0 : -direction * chartWidth.get());
    setOffset(next);
    haptic('select');
  }, [chartX, chartWidth, reduced]);
  useEffect(() => {
    chartX.set(spring(0, 'control', () => {
      'worklet';
      transitioning.set(false);
    }));
  }, [offset, period, chartX, spring, transitioning]);
  const movePeriod = useCallback((translationX: number) => {
    const next = offsetAfterPeriodSwipe(offset, translationX);
    if (next === offset) {
      chartX.set(spring(0, 'control'));
      return;
    }
    if (period !== 'Week' || reduced) {
      setOffset(next);
      haptic('select');
      return;
    }
    transitioning.set(true);
    const direction = next < offset ? 1 : -1;
    chartX.set(timing(direction * chartWidth.get(), 'standard', {
      done: (finished) => {
        'worklet';
        if (finished) scheduleOnRN(commitPeriod, next, direction);
      },
    }));
  }, [offset, period, reduced, chartX, chartWidth, transitioning, spring, timing, commitPeriod]);
  const periodSwipe = useMemo(
    () => Gesture.Pan()
      .activeOffsetX([-t.space.xl, t.space.xl])
      .failOffsetY([-t.space.lg, t.space.lg])
      .onUpdate((event) => {
        if (period === 'Week' && !reduced && !transitioning.get()) {
          chartX.set(offset === 0 ? Math.max(0, event.translationX) : event.translationX);
        }
      })
      .onEnd((event) => {
        if (!transitioning.get()) scheduleOnRN(movePeriod, event.translationX);
      })
      .onFinalize((_event, success) => {
        if (!success && !transitioning.get()) chartX.set(spring(0, 'control'));
      }),
    [movePeriod, period, offset, reduced, transitioning, chartX, spring],
  );
  const chartPosition = useAnimatedStyle(() => ({ transform: [{ translateX: chartX.get() }] }));
  const title = <Label accessibilityRole="header" variant="display" style={{ flexShrink: 1 }}>{metricTitle}</Label>;
  return (
    <ScreenShell dock safeBottom={false} contentStyle={s.content}>
      <View style={s.header}>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          {canSwitchActivity ? (
            <PressableScale label={c.changeMetric(metricTitle)} accessibilityHint={c.chooseMetric}
              onPress={() => setMetricPickerOpen(true)} style={s.metricTitle}>
              {title}
              <View style={{ transform: [{ rotate: '90deg' }] }}>
                <Icon name="chevron" size={t.icon.sm} tone="muted" variant="utility" />
              </View>
            </PressableScale>
          ) : title}
        </View>
        <View style={s.periodControl}>
          <SegmentedControl
            options={['D', 'W', 'M']}
            value={period === 'Day' ? 'D' : period === 'Week' ? 'W' : 'M'}
            onChange={(label) => { setPeriod(periodLabels[label]); setOffset(0); setMonthTrendOffset(0); }}
          />
        </View>
      </View>
      <View testID="Analytics period content" style={s.periodContent}>
          <GestureDetector gesture={periodSwipe}>
            <View testID="Analytics period swipe" style={s.swipeArea}>
              {period === 'Day' ? null : (
                <PeriodHeader
                  range={rangeLabel(period, model.start, model.end, offset)}
                  total={integer(movementTotal)}
                  average={integer(average)}
                  rising={average >= previousAverage}
                  unit={metricUnit}
                />
              )}
              <Animated.View
                key={period}
                entering={fadeIn}
                style={s.chart}>
                <Animated.View
                  onLayout={(event) => chartWidth.set(event.nativeEvent.layout.width)}
                  style={[s.chart, period === 'Week' ? chartPosition : undefined]}>
                  {period === 'Day' ? (
                    <View style={s.dayStage}>
                      <PeriodStep direction="back" onPress={() => setOffset(offset - 1)} />
                      <DailyActivityRing value={movementTotal} goal={goal} unit={metricUnit} dayLabel={dayLabel} />
                      <PeriodStep direction="next" onPress={() => setOffset(offset + 1)} disabled={offset >= 0} />
                    </View>
                  ) : period === 'Month' ? (
                    <MonthGrid
                      data={model.series.map((point, index) => ({ day: point.day, value: movementValues[index] }))}
                      goal={goal}
                      unit={metricUnit}
                    />
                  ) : (
                    <MetricBars title={movementName} data={movementPoints} unit={movementUnit} />
                  )}
                </Animated.View>
              </Animated.View>
            </View>
          </GestureDetector>
          <ActivityStats stats={stats} />
          <ActivityTrend
            label={primaryActivity === 'walking' ? 'Steps trend' : 'Gym trend'}
            period={period}
            points={trend}
            selectedOffset={period === 'Month' ? monthTrendOffset : offset}
            onSelect={period === 'Month' ? setMonthTrendOffset : setOffset}
          />
      </View>
      <BottomSheet open={metricPickerOpen && canSwitchActivity} title={c.chooseMetric} onDismiss={() => setMetricPickerOpen(false)}>
        {(['walking', 'gym'] as const).map((activity) => (
          <ChoiceRow key={activity} title={c.metricTitles[activity]} selected={primaryActivity === activity}
            onPress={() => {
              useAnalyticsPreferencesStore.getState().patch({ activity });
              setMetricPickerOpen(false);
            }} />
        ))}
      </BottomSheet>
    </ScreenShell>
  );
}

function PeriodStep({ direction, onPress, disabled }: {
  direction: 'back' | 'next';
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <PressableScale
      label={direction === 'back' ? 'Previous day' : 'Next day'}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      haptic="select"
      onPress={onPress}
      style={s.step}>
      <View style={direction === 'back' ? { transform: [{ scaleX: -1 }] } : undefined}>
        <Icon name="chevron" size={t.icon.md} tone={disabled ? 'muted' : 'accent'} variant="utility" />
      </View>
    </PressableScale>
  );
}

function rangeLabel(period: Period, start: string, end: string, offset: number) {
  if (period === 'Week') {
    if (offset === 0) return 'This week';
    if (offset === -1) return 'Last week';
    return `${shortDate(start)} \u2013 ${shortDate(end)}`;
  }
  if (offset === 0) return 'This month';
  return new Date(`${start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

const shortDate = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function walkingStats(streak: number, steps: number, points: ReturnType<typeof useAppleSteps>['points']): ActivityStat[] {
  const distanceMeters = points.reduce((total, point) => total + (point.distanceMeters ?? (point.value ?? 0) * 0.705), 0);
  const activeMinutes = points.reduce((total, point) => total + (point.activeMinutes ?? (point.value ?? 0) / 107), 0);
  const floorValues = points.flatMap((point) => point.floorsAscended === null ? [] : [point.floorsAscended]);
  const floors = floorValues.length ? integer(sum(floorValues)) : '—';
  const active = duration(activeMinutes);
  return [
    streakStat(streak),
    { label: 'kcal', value: integer(steps * 0.0142), a11y: `Calories: ${integer(steps * 0.0142)} kcal` },
    { label: 'mi', value: (distanceMeters / 1609.344).toFixed(1), a11y: `Distance: ${(distanceMeters / 1609.344).toFixed(1)} miles` },
    { label: active.label, value: active.value, a11y: `Active time: ${active.spoken}` },
    { label: 'Floors', value: floors, a11y: `Floors: ${floors}` },
  ];
}

function gymStats(streak: number, minutes: number, values: (number | null)[]): ActivityStat[] {
  const active = duration(minutes);
  const days = integer(values.filter((value) => (value ?? 0) > 0).length);
  return [
    streakStat(streak),
    { label: active.label, value: active.value, a11y: `Gym time: ${active.spoken}` },
    { label: 'Days', value: days, a11y: `Days visited: ${days}` },
  ];
}

function streakStat(streak: number): ActivityStat {
  return { label: 'Streak', value: `${streak}`, a11y: `Streak: ${streak} days` };
}

const s = StyleSheet.create({
  content: { gap: t.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  metricTitle: { flexDirection: 'row', alignItems: 'center', gap: t.space.sm },
  periodControl: { width: t.control.inline * 3 },
  periodContent: { gap: t.space.lg },
  swipeArea: { gap: t.space.lg, overflow: 'hidden' },
  chart: { width: '100%' },
  dayStage: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  step: { width: t.control.inline, height: t.control.inline, alignItems: 'center', justifyContent: 'center' },
});
