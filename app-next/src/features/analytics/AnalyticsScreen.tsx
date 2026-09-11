import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ScreenShell, SegmentedControl, PressableScale, Label, EmptyState, BottomSheet } from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { useClock, useHistory } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { ruleDaysStore as useRuleDaysStore } from '../../state/ruleDaysStore';
import { dayKey } from '../../domain/calendar';
import { Activity } from '../../domain/types';
import { analyticsCopy as c } from '../../content/analytics';
import { analyticsModel, AnalyticsModel } from './analyticsModel';
import { Period } from './period';
import { UsageChart } from './UsageChart';
import { ReplacedChart } from './ReplacedChart';
import { WeekDots } from './WeekDots';
import { StatGrid, Stat } from './StatGrid';
const duration = (minutes: number) => {
  const m = Math.round(minutes);
  return m < 60 ? `${m}m` : `${Math.floor(m / 60)}h ${m % 60}m`;
};
const count = (n: number) => Math.round(n).toLocaleString('en-US');
/** Tiles follow the user's enabled conditions; streak is always present. Other movement stays in the earned list. */
export function statsFor(model: AnalyticsModel): Stat[] {
  const k = model.conditions,
    a = model.activities,
    stats: Stat[] = [];
  if (k.gymMinutes) stats.push({ key: 'gymMinutes', label: c.tiles.gymMinutes, value: duration(a.gym), icon: 'gym' });
  if (k.gymArrival)
    stats.push({ key: 'gymArrival', label: c.tiles.gymArrival, value: count(model.arrivals), icon: 'gym' });
  if (k.steps) stats.push({ key: 'steps', label: c.tiles.steps, value: count(a.walking), icon: 'walking' });
  if (k.walking)
    stats.push({ key: 'walking', label: c.tiles.walking, value: duration(model.walkingMinutes), icon: 'walking' });
  if (k.running) stats.push({ key: 'running', label: c.tiles.running, value: duration(a.running), icon: 'running' });
  if (k.biking) stats.push({ key: 'biking', label: c.tiles.biking, value: duration(a.biking), icon: 'biking' });
  stats.push({
    key: 'streak',
    label: c.tiles.streak,
    value: `${model.streak.current} ${c.dayUnit(model.streak.current)}`,
    support: c.best(model.streak.longest),
    icon: 'flame',
  });
  return stats;
}
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('Week'),
    [offset, setOffset] = useState(0),
    [activity, setActivity] = useState<Activity | null>(null),
    runtime = useRuntime(),
    now = useClock(),
    history = useHistory(),
    baseline = useProfileStore((s) => s.data.estimatedDailyMinutes),
    rules = useRulesStore((s) => s.data.rules),
    ruleDays = useRuleDaysStore((s) => s.data.days),
    today = dayKey(now, runtime.clock.timezone()),
    model = analyticsModel(history, today, period, offset, baseline, { rules, ruleDays });
  const activities = (Object.keys(c.activities) as Activity[]).filter(
    (a) => rules.some((r) => r.enabled && r.activity === a) || model.activities[a] > 0,
  );
  const periodLabel = (Object.keys(c.periodIds) as (keyof typeof c.periodIds)[]).find(
    (label) => c.periodIds[label] === period,
  )!;
  const rangeLabel =
    period === 'All' ? c.since(model.start) : offset === 0 ? c.thisPeriod(period) : c.range(model.start, model.end);
  return (
    <ScreenShell
      dock
      safeBottom={false}
      contentStyle={s.content}
      overlay={
        <BottomSheet
          open={activity !== null}
          title={activity ? c.activities[activity] : ''}
          onDismiss={() => setActivity(null)}>
          {activity ? (
            <UsageChart
              data={model.series.map((d) => ({ label: d.label, value: d.activity[activity] }))}
              label={c.activityUnit(activity)}
              color={t.brand.primary}
            />
          ) : null}
        </BottomSheet>
      }>
      <Label accessibilityRole="header" variant="section" style={s.title}>
        {c.title}
      </Label>
      <SegmentedControl
        variant="outline"
        options={c.periods}
        value={periodLabel}
        onChange={(label) => {
          setPeriod(c.periodIds[label as keyof typeof c.periodIds]);
          setOffset(0);
        }}
      />
      <View style={s.nav}>
        {period !== 'All' ? (
          <PressableScale label={c.previous} onPress={() => setOffset(offset - 1)} style={s.arrow}>
            <Icon name="back" variant="utility" size={20} tint={t.text.primary} />
          </PressableScale>
        ) : (
          <View style={s.arrow} />
        )}
        <Label variant="label" style={s.range}>
          {rangeLabel}
        </Label>
        {period !== 'All' ? (
          <PressableScale
            label={c.next}
            disabled={offset === 0}
            onPress={() => setOffset(offset + 1)}
            style={[s.arrow, offset === 0 && { opacity: 0.3 }]}>
            <Icon name="chevron" variant="utility" size={20} tint={t.text.primary} />
          </PressableScale>
        ) : (
          <View style={s.arrow} />
        )}
      </View>
      {model.reclaimed.measuredDays ? (
        <View style={s.hero}>
          <Label variant="metric" style={{ color: t.brand.primary }}>
            {duration(model.reclaimed.minutes)}
          </Label>
          <Label variant="section">{c.replaced}</Label>
          <Label variant="support" tone="secondary">
            {c.replacedSupport(baseline, period)}
          </Label>
        </View>
      ) : (
        <View style={s.empty}>
          <EmptyState
            icon="clock"
            title={model.dayZero ? c.dayZero : c.noData}
            body={model.dayZero ? c.dayZeroBody : c.noDataBody}
          />
          <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
            {c.gaps}
          </Label>
        </View>
      )}
      <StatGrid stats={statsFor(model)} />
      {period === 'Day' ? (
        <WeekDots
          days={model.series.map((d) => ({
            label: d.label,
            met: d.met,
            scheduled: d.scheduled,
            today: d.day === today,
            future: d.day > today,
          }))}
        />
      ) : (
        <ReplacedChart
          data={model.series.map((d) => ({ label: d.label, reclaimed: d.day > today ? null : d.reclaimed }))}
        />
      )}
      {activities.length ? (
        <CompactGroup title={c.earned} outline>
          {activities.map((a) => (
            <CompactRow
              key={a}
              icon={a}
              title={c.activities[a]}
              subtitle={`${count(model.activities[a])} ${c.activityUnit(a)}`}
              onPress={() => setActivity(a)}
            />
          ))}
        </CompactGroup>
      ) : null}
      {model.reclaimed.measuredDays ? (
        <Label variant="support" tone="secondary" style={{ textAlign: 'center' }}>
          {c.measured(model.reclaimed.measuredDays, model.elapsedDays)} · {c.daysMet(model.met, model.scheduled)}
        </Label>
      ) : null}
    </ScreenShell>
  );
}
const s = StyleSheet.create({
  content: { paddingHorizontal: t.space.lg, paddingTop: t.space.sm, gap: t.space.lg },
  title: { textAlign: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: -t.space.xs },
  arrow: { width: t.layout.touch, height: t.layout.touch, alignItems: 'center', justifyContent: 'center' },
  range: { textAlign: 'center', flex: 1 },
  hero: { alignItems: 'center', gap: t.space.xs, paddingVertical: t.space.sm },
  empty: { gap: t.space.sm },
});
