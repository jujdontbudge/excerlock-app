import { useState } from 'react';
import { View } from 'react-native';
import { ScreenShell, SegmentedControl, PressableScale, Label, EmptyState, BottomSheet } from '../../design-system';
import { CompactGroup, CompactRow } from '../../design-system/CompactGroup';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { useClock, useHistory } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { dayKey } from '../../domain/calendar';
import { Activity } from '../../domain/types';
import { analyticsCopy as c } from '../../content/analytics';
import { analyticsModel } from './analyticsModel';
import { Period } from './period';
import { UsageChart } from './UsageChart';
import { ComparisonChart } from './ComparisonChart';
const duration = (minutes: number) => `${Math.floor(Math.round(minutes) / 60)}h ${Math.round(minutes) % 60}m`;
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('Week'),
    [offset, setOffset] = useState(0),
    [activity, setActivity] = useState<Activity | null>(null),
    runtime = useRuntime(),
    now = useClock(),
    history = useHistory(),
    baseline = useProfileStore((s) => s.data.estimatedDailyMinutes),
    model = analyticsModel(history, dayKey(now, runtime.clock.timezone()), period, offset, baseline);
  const activities = (Object.keys(c.activities) as Activity[]).filter(
    (a) => a === 'walking' || a === 'gym' || model.activities[a] > 0,
  );
  return (
    <ScreenShell dock
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
        <Label variant="label" style={{ color: t.text.primary, textAlign: 'center', flex: 1 }}>
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
      {model.reclaimed.measuredDays ? (
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Label variant="metric" style={{ fontSize: 38, lineHeight: 44 }}>
            {duration(model.reclaimed.minutes)}
          </Label>
          <Label variant="section">Time reclaimed</Label>
          <Label variant="support" tone="secondary">
            Compared with your starting screen time
          </Label>
        </View>
      ) : (
        <EmptyState
          icon="clock"
          title={model.dayZero ? c.dayZero : c.noData}
          body={model.dayZero ? c.dayZeroBody : c.noDataBody}
        />
      )}
      <ComparisonChart data={model.series} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: t.surface.card,
            borderWidth: 1,
            borderColor: t.border.default,
            borderRadius: 16,
            padding: 8,
            gap: 4,
          }}>
          <Label variant="support">Exercise</Label>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Label variant="metricSmall">
              {duration(model.activities.gym + model.activities.running + model.activities.biking)}
            </Label>
            <Icon name="walking" size={36} tint={t.brand.primary} />
          </View>
          <Label variant="badge" tone="secondary">
            {Math.round(model.activities.walking).toLocaleString('en-US')} steps
          </Label>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: t.surface.card,
            borderWidth: 1,
            borderColor: t.border.default,
            borderRadius: 16,
            padding: 8,
            gap: 4,
          }}>
          <Label variant="support">{model.streak.current}-day streak</Label>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Label variant="metricSmall">{model.streak.current}</Label>
            <Icon name="flame" size={36} tint={t.brand.primary} />
          </View>
          <Label variant="badge" tone="secondary">
            Best: {model.streak.longest} days
          </Label>
        </View>
      </View>
      <CompactGroup title="How you earned time">
        {activities.map((a) => (
          <CompactRow
            key={a}
            icon={a}
            title={c.activities[a]}
            subtitle={`${Math.round(model.activities[a]).toLocaleString('en-US')} ${c.activityUnit(a)}`}
            onPress={() => setActivity(a)}
          />
        ))}
      </CompactGroup>
      <Label variant="support" tone="secondary">
        {c.gaps}
      </Label>
      <Label variant="support" tone="secondary">
        {c.measured(model.reclaimed.measuredDays, model.elapsedDays)} · {model.met} / {model.scheduled} days met
      </Label>
    </ScreenShell>
  );
}
