import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Label, ScreenShell, SegmentedControl } from '../../design-system';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, runOnJS } from 'react-native-reanimated';
import { tokens as t } from '../../design-system/tokens';
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
import { trendPoints } from './trendModel';
import { offsetAfterPeriodSwipe } from './periodSwipe';

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
  const dayLabel = offset === 0
    ? 'Today'
    : offset === -1
      ? 'Yesterday'
      : new Date(`${model.start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const trend = useMemo(
    () => trendPoints(period, today, history, primaryActivity),
    [period, today, history, primaryActivity],
  );
  const movePeriod = useCallback((translationX: number) => {
    setOffset((current) => offsetAfterPeriodSwipe(current, translationX));
  }, []);
  const periodSwipe = useMemo(
    () => Gesture.Pan()
      .activeOffsetX([-24, 24])
      .failOffsetY([-18, 18])
      .onEnd((event) => { runOnJS(movePeriod)(event.translationX); }),
    [movePeriod],
  );
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
      <Animated.View
          key={period}
          testID="Analytics period content"
          entering={FadeIn.duration(t.motion.duration.navigation)}
          style={s.periodContent}>
          <GestureDetector gesture={periodSwipe}>
            <View testID="Analytics period swipe" style={s.swipeArea}>
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
            </View>
          </GestureDetector>
          <ActivityTrend
            label={primaryActivity === 'walking' ? 'Steps trend' : 'Gym trend'}
            points={trend}
            selectedOffset={offset}
            onSelect={setOffset}
          />
      </Animated.View>
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

const s = StyleSheet.create({
  content: { paddingHorizontal: t.space.lg, paddingTop: t.space.sm, gap: t.space.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: t.space.lg },
  periodControl: { width: 180 },
  periodContent: { gap: t.space.lg },
  swipeArea: { gap: t.space.lg },
});
