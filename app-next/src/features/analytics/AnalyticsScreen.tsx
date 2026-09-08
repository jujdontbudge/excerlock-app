import { useState } from 'react';
import { View } from 'react-native';
import {
  ScreenShell,
  SegmentedControl,
  PressableScale,
  Label,
  EmptyState,
  BottomSheet,
  StatTile,
} from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { useClock } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { dayKey } from '../../domain/calendar';
import { Activity } from '../../domain/types';
import { analyticsCopy as c } from '../../content/analytics';
import { analyticsModel } from './analyticsModel';
import { Period } from './period';
import { UsageChart } from './UsageChart';
import { ComparisonChart } from './ComparisonChart';
import { useAnalyticsHistory } from './history';
import { WeeklyRecap } from './WeeklyRecap';
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('Week'),
    [offset, setOffset] = useState(0),
    [activity, setActivity] = useState<Activity | null>(null),
    runtime = useRuntime(),
    now = useClock(),
    history = useAnalyticsHistory(),
    rules = useRulesStore((state) => state.data.rules),
    baseline = useProfileStore((s) => s.data.estimatedDailyMinutes),
    model = analyticsModel(history, dayKey(now, runtime.clock.timezone()), period, offset, baseline);
  const activities = (Object.keys(c.activities) as Activity[]).filter(
    (a) => a === 'walking' || a === 'gym' || model.activities[a] > 0,
  );
  return (
    <ScreenShell
      safeBottom={false}
      contentStyle={{ paddingHorizontal: 20, paddingTop: 8, gap: 8 }}
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
      <Label accessibilityRole="header" variant="section" style={{ textAlign: 'center' }}>
        {c.title}
      </Label>
      <SegmentedControl
        prominent
        options={c.periods}
        value={period}
        onChange={(p) => {
          setPeriod(p as Period);
          setOffset(0);
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale
          label={c.previous}
          onPress={() => setOffset(offset - 1)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="back" variant="utility" size={20} tint={t.brand.primary} />
        </PressableScale>
        <Label variant="label" style={{ color: t.brand.primary, textAlign: 'center', flex: 1 }}>
          {offset === 0 ? c.thisPeriod(period) : c.range(model.start, model.end)}
        </Label>
        <PressableScale
          label={c.next}
          disabled={offset === 0}
          onPress={() => setOffset(offset + 1)}
          style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="chevron" variant="utility" size={20} tint={t.brand.primary} />
        </PressableScale>
      </View>
      {rules.length === 0 ? (
        <EmptyState icon="clock" title={c.noRules} body={c.noRulesBody} />
      ) : (
        <>
          {model.reclaimed.measuredDays ? (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Label variant="metric" style={{ fontSize: 38, lineHeight: 44 }}>
                {c.duration(model.reclaimed.minutes)}
              </Label>
              <Label variant="section">{c.timeReclaimed}</Label>
              <Label variant="support" tone="secondary">
                {c.comparedWithEstimate}
              </Label>
              <Label variant="support" tone="secondary">
                {c.measured(model.reclaimed.measuredDays, model.elapsedDays)}
              </Label>
              <Label variant="support" tone="secondary">
                {model.previous.measuredDays ? c.delta(model.delta) : c.noComparison}
              </Label>
            </View>
          ) : (
            <EmptyState
              icon="clock"
              title={model.dayZero ? c.dayZero : c.noData}
              body={model.dayZero ? c.dayZeroBody : c.noDataBody}
            />
          )}
          <ComparisonChart data={model.series} estimate={baseline} />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <StatTile
              label={c.daysMet}
              value={c.metOfScheduled(model.met, model.scheduled)}
              support={c.scheduled(model.scheduled)}
            />
            <StatTile
              label={c.current}
              value={c.streakDays(model.streak.current)}
              support={c.bestEver(model.streak.longest)}
            />
            <StatTile label={c.longest} value={c.streakDays(model.streak.longest)} />
          </View>
          <CompactGroup title={c.exercise}>
            {activities.map((a) => (
              <CompactRow
                key={a}
                icon={a}
                title={c.activities[a]}
                subtitle={c.activityTotal(a, model.activities[a])}
                onPress={() => setActivity(a)}
              />
            ))}
          </CompactGroup>
          {period === 'Week' ? <WeeklyRecap model={model} /> : null}
          <Label variant="support" tone="secondary">
            {c.gaps}
          </Label>
        </>
      )}
    </ScreenShell>
  );
}
