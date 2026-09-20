import { ReactNode, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Label, PressableScale, ScreenShell } from '../../design-system';
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
import { MetricBars, MetricPoint } from './MetricBars';
import { useAppleSteps } from './useAppleSteps';

const sum = (values: (number | null)[]) => values.reduce<number>((total, value) => total + (value ?? 0), 0);
const measuredAverage = (values: (number | null)[]) => {
  const measured = values.flatMap((value) => value === null ? [] : [value]);
  return measured.length ? sum(measured) / measured.length : 0;
};
const duration = (minutes: number) => {
  const rounded = Math.round(minutes);
  return rounded < 60 ? `${rounded}m` : `${Math.floor(rounded / 60)}h ${rounded % 60}m`;
};
export function AnalyticsScreen() {
  const [offset, setOffset] = useState(0);
  const runtime = useRuntime();
  const now = useClock();
  const history = useHistory();
  const baseline = useProfileStore((state) => state.data.estimatedDailyMinutes);
  const rules = useRulesStore((state) => state.data.rules);
  const ruleDays = useRuleDaysStore((state) => state.data.days);
  const today = dayKey(now, runtime.clock.timezone());
  const model = useMemo(
    () => analyticsModel(history, today, 'Week', offset, baseline, { rules, ruleDays }),
    [history, today, offset, baseline, rules, ruleDays],
  );
  const enabledRules = useMemo(
    () => rules.filter((rule) => rule.enabled).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [rules],
  );
  const primaryActivity = enabledRules.some((rule) => rule.activity === 'gym') ? 'gym' : 'walking';
  const stepDays = useMemo(() => model.series.map((point) => point.day), [model.series]);
  const stepFallback = useMemo(
    () => model.series.map((point) => ({ day: point.day, value: point.day > today ? null : point.activity.walking })),
    [model.series, today],
  );
  const apple = useAppleSteps(stepDays, today, stepFallback);
  const walkingValues = apple.points.map((point) => point.value);
  const gymValues = model.series.map((point) => point.day > today ? null : point.activity.gym);
  const movementValues = primaryActivity === 'walking' ? walkingValues : gymValues;
  const screenValues = model.series.map((point) => point.day > today ? null : point.value);
  const screenPeriodValues = model.rows.map((row) => row.usageMinutes);
  const rangeLabel = offset === 0 ? c.thisPeriod('Week') : c.range(model.start, model.end);
  const movementPoints: MetricPoint[] = model.series.map((point, index) => ({
    label: point.label,
    value: movementValues[index],
  }));
  const screenPoints: MetricPoint[] = model.series.map((point, index) => ({
    label: point.label,
    value: screenValues[index],
  }));
  const movementName = primaryActivity === 'walking' ? 'Walking' : 'Gym';
  const movementUnit = primaryActivity === 'walking' ? 'steps from Apple Motion & Fitness' : 'minutes at the gym';
  return (
    <ScreenShell dock safeBottom={false} contentStyle={s.content}>
      <Label accessibilityRole="header" variant="question">{c.title}</Label>
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
      <View style={s.section}>
        {primaryActivity === 'walking' && apple.status !== 'granted' ? (
          <PressableScale label="Connect Apple steps" onPress={() => void apple.request()} style={s.connect}>
            <Icon name="walking" variant="utility" size={20} tint={t.brand.primary} />
            <Label variant="label">Connect Apple steps</Label>
          </PressableScale>
        ) : null}
        <MetricBars title={movementName} data={movementPoints} unit={movementUnit} />
      </View>
      <AnalyticsSection
        title="Screen Time"
        icon="phone"
        total={duration(sum(screenPeriodValues))}
        totalLabel="Total"
        average={`AVG ${duration(measuredAverage(screenPeriodValues))}`}
        chips={[
          { label: 'Time replaced', value: duration(model.reclaimed.minutes) },
          { label: 'Days measured', value: `${model.reclaimed.measuredDays}` },
        ]}>
        <MetricBars title="Screen Time" data={screenPoints} unit="locked-app usage" />
      </AnalyticsSection>
    </ScreenShell>
  );
}

function AnalyticsSection({ title, icon, total, totalLabel, average, chips, children }: {
  title: string;
  icon: 'walking' | 'gym' | 'phone';
  total: string;
  totalLabel: string;
  average: string;
  chips: { label: string; value: string }[];
  children: ReactNode;
}) {
  return (
    <View style={s.section}>
      <View style={s.sectionTitle}>
        <Icon name={icon} variant="utility" size={32} tint={t.brand.primary} />
        <Label accessibilityRole="header" variant="section" style={{ flex: 1 }}>{title}</Label>
      </View>
      <View style={s.summary}>
        <View style={{ flex: 1 }}>
          <Label variant="support" tone="secondary">{totalLabel}</Label>
          <Label variant="metric">{total}</Label>
        </View>
        <View style={s.average}><Label variant="support">{average}</Label></View>
      </View>
      <View style={s.chips}>
        {chips.map((chip) => (
          <View key={chip.label} style={s.chip}>
            <Label variant="label">{chip.value}</Label>
            <Label variant="badge" tone="secondary">{chip.label}</Label>
          </View>
        ))}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  content: { paddingHorizontal: t.space.lg, paddingTop: t.space.sm, gap: t.space.lg },
  nav: { flexDirection: 'row', alignItems: 'center' },
  arrow: { width: t.layout.touch, height: t.layout.touch, alignItems: 'center' },
  range: { flex: 1, textAlign: 'center' },
  section: { gap: t.space.lg, paddingVertical: t.space.sm },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: t.space.md },
  average: { borderRadius: t.radius.pill, backgroundColor: t.surface.solid,
    borderWidth: t.stroke.hairline, borderColor: t.border.divider, paddingHorizontal: t.space.md, paddingVertical: t.space.sm },
  chips: { flexDirection: 'row', gap: t.space.md },
  chip: { flex: 1, backgroundColor: t.surface.solid, borderRadius: t.radius.card,
    borderWidth: t.stroke.hairline, borderColor: t.border.divider, padding: t.space.md, gap: t.space.xs },
  connect: { minHeight: t.layout.button, borderRadius: t.radius.pill, backgroundColor: t.surface.solid,
    borderWidth: t.stroke.hairline, borderColor: t.brand.primary, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: t.space.sm },
});
