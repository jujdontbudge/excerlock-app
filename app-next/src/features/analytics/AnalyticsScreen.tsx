import { useState } from 'react';
import { View } from 'react-native';
import {
  ScreenShell,
  Heading,
  SegmentedControl,
  PressableScale,
  Label,
  StatTile,
  SettingsGroup,
  SettingsRow,
  EmptyState,
} from '../../design-system';
import { tokens as t } from '../../design-system/tokens';
import { Icon } from '../../icons/Icon';
import { LivingIcon } from '../../motion/LivingIcon';
import { TickingNumber } from '../../motion/TickingNumber';
import { Reveal } from '../../motion/Reveal';
import { useClock, useHistory } from '../../state/selectors';
import { useRuntime } from '../../runtime/AppRuntimeProvider';
import { profileStore as useProfileStore } from '../../state/profileStore';
import { rulesStore as useRulesStore } from '../../state/rulesStore';
import { dayKey } from '../../domain/calendar';
import { Activity } from '../../domain/types';
import { analyticsCopy as c } from '../../content/analytics';
import { analyticsModel } from './analyticsModel';
import { Period } from './period';
import { UsageChart } from './UsageChart';
export function AnalyticsScreen() {
  const [period, setPeriod] = useState<Period>('Week'),
    [offset, setOffset] = useState(0),
    [activity, setActivity] = useState<Activity>('walking'),
    runtime = useRuntime(),
    now = useClock(),
    history = useHistory(),
    baseline = useProfileStore((s) => s.data.estimatedDailyMinutes),
    rules = useRulesStore((s) => s.data.rules),
    model = analyticsModel(history, dayKey(now, runtime.clock.timezone()), period, offset, baseline);
  const chartKey = period + offset;
  return (
    <ScreenShell safeBottom={false}>
      <Heading title={c.title} />
      <SegmentedControl
        options={c.periods}
        value={period}
        onChange={(p) => {
          setPeriod(p as Period);
          setOffset(0);
        }}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.md }}>
        <PressableScale label={c.previous} onPress={() => setOffset(offset - 1)}>
          <Icon name="back" variant="utility" />
        </PressableScale>
        <View style={{ flex: 1 }}>
          <Label variant="label" style={{ textAlign: 'center' }}>
            {offset === 0 ? c.thisPeriod(period) : c.range(model.start, model.end)}
          </Label>
        </View>
        <PressableScale label={c.next} disabled={offset === 0} onPress={() => setOffset(offset + 1)}>
          <Icon name="chevron" variant="utility" />
        </PressableScale>
      </View>
      <LivingIcon name="clock" size={t.space.hero} />
      {model.reclaimed.measuredDays ? (
        <>
          <TickingNumber value={model.reclaimed.minutes} label={c.reclaimed} />
          <Label tone="secondary">{c.measured(model.reclaimed.measuredDays, model.elapsedDays)}</Label>
          <Reveal key={chartKey}>
            <Label tone="secondary">{model.previous.measuredDays ? c.delta(model.delta) : c.noComparison}</Label>
          </Reveal>
        </>
      ) : (
        <EmptyState
          icon="clock"
          title={model.dayZero ? c.dayZero : c.noData}
          body={model.dayZero ? c.dayZeroBody : c.noDataBody}
        />
      )}
      <Reveal key={'usage' + chartKey}>
        <UsageChart data={model.series} label={period === 'Week' ? c.usage : c.average} estimate={baseline} />
        <Label variant="support" tone="secondary">
          {c.gaps}
        </Label>
      </Reveal>
      <Heading title={c.exercise} />
      <SegmentedControl
        options={Object.values(c.activities)}
        value={c.activities[activity]}
        onChange={(value) =>
          setActivity((Object.keys(c.activities) as Activity[]).find((a) => c.activities[a] === value)!)
        }
      />
      <Reveal key={'exercise' + chartKey + activity}>
        <UsageChart
          data={model.series.map((d) => ({ label: d.label, value: d.activity[activity] }))}
          label={c.activityUnit(activity)}
          color={t.chart.exercise}
        />
      </Reveal>
      <StatTile label={c.daysMet} value={`${model.met} / ${model.scheduled}`} support={c.scheduled(model.scheduled)} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.space.md }}>
        <StatTile label={c.current} value={String(model.streak.current)} support={c.days} />
        <StatTile label={c.longest} value={String(model.streak.longest)} support={c.days} />
      </View>
      {period === 'Week' ? (
        <Reveal>
          <SettingsGroup title={c.recap}>
            <SettingsRow title={c.reclaimed} value={String(model.reclaimed.minutes)} />
            <SettingsRow title={c.daysMet} value={`${model.met} / ${model.scheduled}`} />
            {(Object.keys(c.activities) as Activity[]).map((a) => (
              <SettingsRow
                key={a}
                title={c.activities[a]}
                icon={a}
                value={`${model.activities[a].toLocaleString('en-US')} ${c.activityUnit(a)}`}
              />
            ))}
            <SettingsRow title={c.current} value={`${model.streak.current} ${c.days}`} />
          </SettingsGroup>
        </Reveal>
      ) : null}
      {!rules.length ? <EmptyState title={c.noRules} body={c.noRulesBody} icon="walking" /> : null}
    </ScreenShell>
  );
}
