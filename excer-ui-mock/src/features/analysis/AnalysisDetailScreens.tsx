import { Image, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';

import {
  dayDetailFixtures,
  earningBreakdownFixture,
  assetRegistry,
  monthTrendFixture,
  trendDetailCopy,
  weekTrendFixture,
  weekTrendSummary,
  yearTrendFixture,
  type MilestoneFixture,
} from '@/content';
import {
  AccessibleModal,
  ChevronIcon,
  BarChart,
  DottedSeparator,
  GradientScreen,
  FullScreenModalPage,
  LiveRing,
  PillButton,
  PillowCard,
  PressableScale,
  SegmentedControl,
  SettingsRow,
  TrendChart,
  colors,
  radius,
  space,
  type,
} from '@/design-system';

import type { AnalysisRange } from './AnalysisScreen';
import { AnalysisHeader, Eyebrow, SectionHeading, analysisFeatureStyles as s } from './components';

const rangeOptions = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
] as const;

export interface TrendDetailScreenProps {
  activityCount?: number;
  comparison: string;
  onBack: () => void;
  onChangeRange: (range: AnalysisRange) => void;
  onNextPeriod: () => void;
  onOpenComparison: () => void;
  onPreviousPeriod: () => void;
  periodLabel: string;
  periodOffset: number;
  range: AnalysisRange;
  showcase?: boolean;
  timeLockedMinutes?: number;
}

export function TrendDetailScreen({ activityCount = 0, comparison, onBack, onChangeRange, onNextPeriod, onOpenComparison, onPreviousPeriod, periodLabel, periodOffset, range, showcase = true, timeLockedMinutes = 0 }: TrendDetailScreenProps) {
  const reducedMotion = useReducedMotion();
  const model = showcase
    ? getTrendPeriodModel(range, periodOffset, periodLabel)
    : getNaturalTrendPeriodModel(periodOffset, periodLabel, timeLockedMinutes, activityCount);
  const data = model.data;
  const comparisonData = data.map((point, index) => {
    const value = Math.round(point.value * (0.72 + ((index % 3) * 0.11)));
    return { ...point, color: colors.data.blue, value, valueLabel: `${comparison}: ${value} sample units` };
  });
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <AnalysisHeader onBack={onBack} title={trendDetailCopy.title} />
        <Eyebrow>{showcase ? 'SAMPLE DATA' : 'LOCAL ACTIVITY'}</Eyebrow>
        <SegmentedControl accessibilityLabel="Trend range" onChange={onChangeRange} options={rangeOptions} value={range} />
        <View style={styles.periodRow}>
          <PeriodButton accessibilityLabel="Previous period" label="‹" onPress={onPreviousPeriod} />
          <Text accessibilityLiveRegion="polite" style={s.title}>{periodLabel}</Text>
          <PeriodButton accessibilityLabel="Next period" label="›" onPress={onNextPeriod} />
        </View>
        <PillowCard>
          <Text accessibilityLiveRegion="polite" style={s.body}>{model.conclusion}</Text>
          <TrendChart accessibilityLabel={model.accessibilityLabel} data={data} height={170} />
          {showcase && comparison !== 'None' ? (
            <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(180)} style={styles.comparisonSeries}>
              <Text style={s.title}>{comparison}</Text>
              <TrendChart
                accessibilityLabel={`Sample comparison series for ${comparison}`}
                data={comparisonData}
                height={84}
              />
            </Animated.View>
          ) : null}
        </PillowCard>
        <SectionHeading>{showcase ? 'Balance movement' : 'Current local totals'}</SectionHeading>
        {showcase ? (
          <PillowCard style={styles.seriesCard}>
            <Text style={s.title}>Earned</Text>
            <TrendChart
              accessibilityLabel="Sample minutes earned by period"
              data={data.map((point) => ({ ...point, color: colors.data.amber, value: point.value + 12, valueLabel: `${point.value + 12} min earned` }))}
              height={72}
            />
            <Text style={s.title}>Spent</Text>
            <TrendChart
              accessibilityLabel="Sample minutes spent by period"
              data={data.map((point) => ({ ...point, color: colors.data.pink, value: point.value + 24, valueLabel: `${point.value + 24} min spent` }))}
              height={72}
            />
            <Text style={s.title}>Reclaimed</Text>
            <TrendChart
              accessibilityLabel="Sample minutes reclaimed by period"
              data={data.map((point) => ({ ...point, color: colors.data.green, valueLabel: `${point.value} min reclaimed` }))}
              height={72}
            />
          </PillowCard>
        ) : (
          <PillowCard style={styles.seriesCard}>
            <Text style={s.title}>{formatDetailMinutes(timeLockedMinutes)} Time Locked</Text>
            <Text style={s.body}>{activityCount} qualifying {activityCount === 1 ? 'activity' : 'activities'} recorded.</Text>
            <Text style={s.note}>Earned, spent, and reclaimed series need more local day samples before they can be separated truthfully.</Text>
          </PillowCard>
        )}
        {showcase ? (
          <PillowCard padding="none" variant="grouped">
            <SettingsRow onPress={onOpenComparison} title={trendDetailCopy.comparisonRow.label} value={comparison} />
          </PillowCard>
        ) : null}
        <View style={styles.summaryGrid}>
          {model.summaries.map((summary) => (
            <PillowCard key={summary} style={styles.summaryCard}><Text style={s.body}>{summary}</Text></PillowCard>
          ))}
        </View>
        <SectionHeading>{trendDetailCopy.methodTitle}</SectionHeading>
        <Text style={s.body}>{trendDetailCopy.methodBody}</Text>
      </ScrollView>
    </GradientScreen>
  );
}

type TrendPoint = { color?: string; label: string; value: number; valueLabel: string };

function getTrendPeriodModel(range: AnalysisRange, offset: number, periodLabel: string): {
  accessibilityLabel: string;
  conclusion: string;
  data: TrendPoint[];
  summaries: string[];
} {
  const base: TrendPoint[] = range === 'week'
    ? weekTrendFixture.map((day) => ({
      label: day.day.slice(0, 3),
      value: day.reclaimedMinutes ?? 0,
      valueLabel: day.reclaimedMinutes ? `${day.reclaimedMinutes} min` : 'No data',
    }))
    : range === 'month'
      ? monthTrendFixture.map((period) => ({
        label: period.period.replace('Aug ', ''),
        value: period.minutes ?? 0,
        valueLabel: period.reclaimed ?? 'No data',
      }))
      : yearTrendFixture.map((month) => ({
        label: month.month === 'September–December' ? 'Sep–Dec' : month.month.slice(0, 3),
        value: month.minutes ?? 0,
        valueLabel: month.reclaimed ?? 'No data',
      }));

  if (offset > 0) {
    return {
      accessibilityLabel: `No sample reclaimed-time data for ${periodLabel}`,
      conclusion: `No sample data yet for ${periodLabel}.`,
      data: base.map((point) => ({ ...point, value: 0, valueLabel: 'No data yet' })),
      summaries: ['No comparison yet.', 'Best period —', 'Lowest period —', 'Average —'],
    };
  }

  if (offset < 0) {
    const previous = base.map((point, index) => {
      const value = point.value === 0 ? 0 : Math.max(8, Math.round(point.value * (0.58 + ((index % 3) * 0.07))));
      return { ...point, value, valueLabel: value === 0 ? 'No data' : `${value} min reclaimed` };
    });
    const total = previous.reduce((sum, point) => sum + point.value, 0);
    return {
      accessibilityLabel: `${periodLabel} sample reclaimed time totals ${total} minutes`,
      conclusion: `You reclaimed ${formatMinutes(total)} in ${periodLabel}.`,
      data: previous,
      summaries: [
        'Earlier sample period.',
        `Best mark · ${formatMinutes(Math.max(...previous.map((point) => point.value)))}.`,
        `Lowest mark · ${formatMinutes(Math.min(...previous.filter((point) => point.value > 0).map((point) => point.value)) || 0)}.`,
        `Average · ${formatMinutes(Math.round(total / Math.max(1, previous.filter((point) => point.value > 0).length)))}.`,
      ],
    };
  }

  if (range === 'month') {
    return {
      accessibilityLabel: 'August 2026 sample reclaimed time totals 18 hours 42 minutes',
      conclusion: 'You reclaimed 18h 42m in August 2026.',
      data: base,
      summaries: ['11h 13m in the strongest week.', 'Best week · Aug 3–9.', 'Lowest complete week · Aug 1–2.', 'Average · 9h 21m per complete week.'],
    };
  }
  if (range === 'year') {
    return {
      accessibilityLabel: '2026 sample reclaimed time totals 68 hours',
      conclusion: 'You reclaimed 68h across the 2026 sample year.',
      data: base,
      summaries: ['August remains current.', 'Best month · July.', 'Lowest complete month · May.', 'Average · 17h per complete month.'],
    };
  }
  return {
    accessibilityLabel: weekTrendSummary.accessibilitySummary,
    conclusion: weekTrendSummary.conclusion,
    data: base,
    summaries: [weekTrendSummary.comparison, weekTrendSummary.bestDay, weekTrendSummary.lowestDay, weekTrendSummary.average],
  };
}

function getNaturalTrendPeriodModel(
  periodOffset: number,
  periodLabel: string,
  timeLockedMinutes: number,
  activityCount: number,
) {
  if (periodOffset !== 0) {
    return {
      accessibilityLabel: `No local Time Locked data for ${periodLabel}`,
      conclusion: `No local activity is recorded for ${periodLabel}.`,
      data: [{ label: 'Total', value: 0, valueLabel: 'No local data' }],
      summaries: ['No comparison yet.', 'Best period —', 'Lowest period —', 'Average —'],
    };
  }
  return {
    accessibilityLabel: `${formatDetailMinutes(timeLockedMinutes)} of local Time Locked across ${activityCount} qualifying ${activityCount === 1 ? 'activity' : 'activities'}`,
    conclusion: `${formatDetailMinutes(timeLockedMinutes)} of Time Locked is recorded in this local sample.`,
    data: [{
      label: 'Total',
      value: timeLockedMinutes,
      valueLabel: `${formatDetailMinutes(timeLockedMinutes)} Time Locked`,
    }],
    summaries: [
      `${activityCount} qualifying ${activityCount === 1 ? 'activity' : 'activities'}.`,
      'Daily distribution needs more samples.',
      'Best period —',
      'Average —',
    ],
  };
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder}m`;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function formatDetailMinutes(minutes: number) {
  const normalized = Math.max(0, Math.floor(minutes));
  if (normalized < 60) return `${normalized} min`;
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

function PeriodButton({ accessibilityLabel, label, onPress }: { accessibilityLabel: string; label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress}>
      <View style={styles.periodButton}><ChevronIcon direction={label === '‹' ? 'left' : 'right'} /></View>
    </PressableScale>
  );
}

export type DayDetailKind = keyof typeof dayDetailFixtures;

export interface DayDetailScreenProps {
  conditionOverride?: { id: string; label: string; value: string } | null;
  dateLabel?: string;
  detailOverride?: { evidence: string; status: string; values: string };
  kind: DayDetailKind;
  onBack: () => void;
  onConditionPress?: (conditionId: string) => void;
  onPrimary: () => void;
}

export function DayDetailScreen({ conditionOverride, dateLabel, detailOverride, kind, onBack, onConditionPress, onPrimary }: DayDetailScreenProps) {
  const fixture = dayDetailFixtures[kind];
  const condition = conditionOverride === undefined ? kind === 'event'
    ? { id: 'demo-gym', label: 'Go to gym', value: 'Completed' }
    : kind === 'state'
      ? { id: 'demo-walk', label: 'While walking', value: '24 min' }
      : kind === 'rate'
        ? { id: 'demo-steps', label: 'Steps exchange', value: '2h 05m' }
        : null : conditionOverride;
  return (
    <GradientScreen variant="detail">
      <View style={s.content}>
        <AnalysisHeader onBack={onBack} title={dateLabel ?? fixture.title} />
        <PillowCard style={s.center} variant="elevated">
          <View style={[styles.dayGlyph, { backgroundColor: kind === 'missed' || kind === 'blank' ? colors.surface.cardElevated : colors.brand.primary }]}>
            <Text style={styles.dayGlyphText}>{kind === 'event' ? '✓' : kind === 'rate' ? '▥' : kind === 'state' ? '●' : kind === 'rest' ? '–' : '·'}</Text>
          </View>
          <Text style={styles.dayStatus}>{detailOverride?.status ?? fixture.status}</Text>
          <Text style={s.body}>{detailOverride?.evidence ?? fixture.evidence}</Text>
          <Text style={s.title}>{detailOverride?.values ?? fixture.values}</Text>
        </PillowCard>
        {condition && onConditionPress ? (
          <PillowCard padding="none" variant="grouped">
            <SettingsRow
              accessibilityLabel={`Open ${condition.label} earning detail`}
              onPress={() => onConditionPress(condition.id)}
              subtitle="Open the exact local condition"
              title={condition.label}
              value={condition.value}
            />
          </PillowCard>
        ) : null}
        <PillButton fullWidth label={fixture.action} onPress={onPrimary} variant="screen" />
      </View>
    </GradientScreen>
  );
}

export interface EarningDetailScreenProps {
  fallbackConditionId?: string | null;
  focusedConditionId?: string;
  naturalRows?: readonly {
    activityCount: number;
    id: string;
    name: string;
    qualifyingMinutes: number;
  }[];
  naturalTotalMinutes?: number;
  onBack: () => void;
  onConditionPress: (condition: string) => void;
  onDismissFallbackCondition?: () => void;
  onRangeChange: (range: 'week' | 'month') => void;
  range: 'week' | 'month';
  showcase?: boolean;
}

export function EarningDetailScreen({ fallbackConditionId, focusedConditionId, naturalRows = [], naturalTotalMinutes = 0, onBack, onConditionPress, onDismissFallbackCondition, onRangeChange, range, showcase = true }: EarningDetailScreenProps) {
  const segments = [{ label: 'Week', value: 'week' }, { label: 'Month', value: 'month' }] as const;
  if (!showcase) {
    const naturalActivityCount = naturalRows.reduce((sum, row) => sum + row.activityCount, 0);
    return (
      <GradientScreen variant="detail">
        <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <AnalysisHeader onBack={onBack} title={earningBreakdownFixture.title} />
          <Eyebrow>LOCAL ACTIVITY</Eyebrow>
          <Text accessibilityLiveRegion="polite" style={styles.earningHero}>{formatDetailMinutes(naturalTotalMinutes)} earned today</Text>
          <SegmentedControl accessibilityLabel="Earning range" onChange={onRangeChange} options={segments} value={range} />
          {naturalRows.length > 0 ? (
            <PillowCard padding="none" variant="grouped">
              {naturalRows.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <DottedSeparator /> : null}
                  <SettingsRow
                    accessibilityLabel={`Open ${row.name} condition detail`}
                    onPress={() => onConditionPress(row.id)}
                    style={focusedConditionId === row.id ? styles.focusedRow : undefined}
                    subtitle={`${row.activityCount} qualifying ${row.activityCount === 1 ? 'activity' : 'activities'} in local state`}
                    title={row.name}
                    value={`${row.qualifyingMinutes} min evidence`}
                  />
                </View>
              ))}
            </PillowCard>
          ) : (
            <PillowCard><Text style={s.body}>No qualifying earning activity is recorded yet.</Text></PillowCard>
          )}
          <SectionHeading>When you earn</SectionHeading>
          <PillowCard>
            <Text style={s.body}>{naturalActivityCount === 0
              ? 'Time-of-day patterns will appear after qualifying activity.'
              : `${naturalActivityCount} local ${naturalActivityCount === 1 ? 'activity is' : 'activities are'} recorded; more samples are needed for a time-of-day pattern.`}</Text>
          </PillowCard>
          <Text style={s.note}>{earningBreakdownFixture.methodBody}</Text>
        </ScrollView>
      </GradientScreen>
    );
  }
  const fallbackCondition = earningBreakdownFixture.rows.find((row) => row.id === fallbackConditionId);
  const rangeTotal = range === 'week' ? '3h 46m banked this week' : earningBreakdownFixture.total;
  const rangeScale = range === 'week' ? 0.38 : 1;
  return (
    <GradientScreen variant="detail">
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <AnalysisHeader onBack={onBack} title={earningBreakdownFixture.title} />
        <Eyebrow>SAMPLE DATA</Eyebrow>
        <Text accessibilityLiveRegion="polite" style={styles.earningHero}>{rangeTotal}</Text>
        <SegmentedControl accessibilityLabel="Earning range" onChange={onRangeChange} options={segments} value={range} />
        <PillowCard padding="none" variant="grouped">
          {earningBreakdownFixture.rows.map((row, index) => (
            <View key={row.condition}>
              {index > 0 ? <DottedSeparator /> : null}
              <SettingsRow
                accessibilityLabel={`Open ${row.condition} condition detail`}
                onPress={() => onConditionPress(row.id)}
                style={focusedConditionId === row.id ? styles.focusedRow : undefined}
                subtitle={focusedConditionId === row.id ? `Selected from day detail · ${row.subtitle}` : row.subtitle}
                title={`${row.rank}. ${row.condition}`}
                value={`${Math.round(row.minutes * rangeScale)} min · ${row.sharePercent}%`}
              />
            </View>
          ))}
        </PillowCard>
        <SectionHeading>When you earn</SectionHeading>
        <PillowCard>
          <BarChart
            accessibilityLabel="Morning 22 percent, afternoon 31 percent, evening 47 percent"
            data={earningBreakdownFixture.timeOfDay.map((slot) => ({ label: slot.label, value: slot.percent, valueLabel: `${slot.percent}%` }))}
          />
          <Text style={s.body}>{earningBreakdownFixture.conclusion}</Text>
        </PillowCard>
        <Text style={s.note}>{earningBreakdownFixture.methodBody}</Text>
      </ScrollView>
      <AccessibleModal
        accessibilityTitle={fallbackCondition?.condition ?? 'Condition earning detail'}
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => onDismissFallbackCondition?.()}
        scrollEnabled={false}
        style={styles.modalBackdrop}
        visible={Boolean(fallbackCondition)}
      >
        <PillowCard style={[styles.modalCard, styles.modalCardFull]} variant="light">
          <FullScreenModalPage
            body={fallbackCondition?.subtitle}
            footer={<PillButton fullWidth label="Done" onPress={() => onDismissFallbackCondition?.()} variant="screen" />}
          >
          <Text style={styles.modalStat}>{fallbackCondition ? `${fallbackCondition.minutes} min · ${fallbackCondition.sharePercent}% this month` : ''}</Text>
          </FullScreenModalPage>
        </PillowCard>
      </AccessibleModal>
    </GradientScreen>
  );
}

export type BadgeDetailStatus = 'locked' | 'new' | 'unlocked';

export interface BadgeDetailScreenProps {
  badge: MilestoneFixture;
  currentProgress?: number;
  onBack: () => void;
  onClearNew?: () => void;
  onPrimary: () => void;
  status: BadgeDetailStatus;
  useFixtureHistory?: boolean;
}

export function BadgeDetailScreen({ badge, currentProgress, onBack, onClearNew, onPrimary, status, useFixtureHistory = true }: BadgeDetailScreenProps) {
  const reducedMotion = useReducedMotion();
  const showNewGlint = status === 'new';
  const locked = status === 'locked';
  const unlockedMonth = useFixtureHistory && badge.unlockedAt ? formatUnlockMonth(badge.unlockedAt) : null;
  const progressCurrent = currentProgress ?? badge.progress.current;
  const progressLabel = currentProgress === undefined
    ? badge.progress.label
    : `${Math.floor(progressCurrent)}/${badge.threshold.value} ${badge.threshold.unit}`;

  const art = (
    <Animated.View entering={reducedMotion ? undefined : FadeIn.duration(220)} style={styles.badgeArtHost}>
      <Image
        accessibilityIgnoresInvertColors
        accessibilityLabel={`${badge.name} badge art`}
        source={assetRegistry.badges[badge.assetId as keyof typeof assetRegistry.badges]}
        style={[styles.badgeArt, locked && styles.badgeArtLocked]}
      />
      {showNewGlint ? <Text accessibilityElementsHidden style={styles.badgeGlint}>✦</Text> : null}
    </Animated.View>
  );

  return (
    <GradientScreen variant="detail">
      <View style={s.content}>
        <AnalysisHeader onBack={onBack} title={badge.name} />
        {showNewGlint ? <Eyebrow>NEW MILESTONE · TAP BADGE TO CLEAR</Eyebrow> : <Eyebrow>{locked ? 'LOCKED MILESTONE' : 'UNLOCKED MILESTONE'}</Eyebrow>}
        {showNewGlint ? (
          <PressableScale accessibilityLabel="Clear new badge highlight" accessibilityRole="button" onPress={() => onClearNew?.()}>
            {art}
          </PressableScale>
        ) : art}
        <LiveRing
          accessibilityLabel={`${badge.name}, ${progressLabel}`}
          caption={locked ? badge.threshold.unit.toUpperCase() : unlockedMonth ? `UNLOCKED ${unlockedMonth.toUpperCase()}` : 'UNLOCKED'}
          progress={locked ? Math.min(1, progressCurrent / badge.threshold.value) : 1}
          size={190}
          value={formatBadgeHero(badge, locked, progressCurrent)}
        />
        <Text style={s.body}>
          {locked
            ? `Reach ${badge.threshold.value} ${badge.threshold.unit} to unlock this sample milestone.`
            : `${badge.name} was unlocked${unlockedMonth ? ` in ${unlockedMonth}` : ' in this local activity history'}.`}
        </Text>
        <PillowCard>
          <Text style={s.title}>{locked ? 'How to make progress' : 'Milestone progress'}</Text>
          <Text style={s.body}>{progressLabel}</Text>
          <Text style={s.note}>Threshold: {badge.threshold.value} {badge.threshold.unit}</Text>
        </PillowCard>
        {!locked ? (
          <PillowCard>
            <Text style={s.title}>Progress history</Text>
            <Text style={s.body}>{useFixtureHistory && badge.unlockedAt ? `Unlocked ${badge.unlockedAt}` : 'Unlocked in this local sample.'}</Text>
            <Text style={s.note}>The progress ring reached {badge.threshold.value} {badge.threshold.unit}; no device activity was read.</Text>
          </PillowCard>
        ) : null}
        <PillButton fullWidth label={locked ? 'View suggested condition' : 'Share'} onPress={onPrimary} variant="screen" />
      </View>
    </GradientScreen>
  );
}

const styles = {
  dayGlyph: { alignItems: 'center' as const, borderRadius: radius.pill, height: 74, justifyContent: 'center' as const, width: 74 },
  dayGlyphText: { ...type.screenLarge, color: colors.text.primary },
  dayStatus: { ...type.sectionTitle, color: colors.text.primary, textAlign: 'center' as const },
  divider: { borderTopColor: colors.surface.divider, borderTopWidth: 1, height: 1 },
  earningHero: { ...type.screenLarge, color: colors.text.primary },
  focusedRow: { backgroundColor: colors.surface.cardElevated },
  periodButton: { alignItems: 'center' as const, backgroundColor: colors.surface.cardElevated, borderRadius: radius.pill, height: 44, justifyContent: 'center' as const, width: 44 },
  comparisonSeries: { gap: space[2], marginTop: space[3] },
  periodLabel: { ...type.sectionTitle, color: colors.text.primary },
  periodRow: { alignItems: 'center' as const, flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  seriesCard: { gap: space[3] },
  summaryCard: { width: '48%' as const },
  summaryGrid: { flexDirection: 'row' as const, flexWrap: 'wrap' as const, gap: space[3] },
  badgeArt: { height: 112, width: 112 },
  badgeArtHost: { alignItems: 'center' as const, alignSelf: 'center' as const, justifyContent: 'center' as const, minHeight: 124, minWidth: 124 },
  badgeArtLocked: { opacity: 0.3 },
  badgeGlint: { ...type.screenLarge, color: colors.brand.signatureAmber, position: 'absolute' as const, right: -4, top: -8 },
  modalBackdrop: { flex: 1 },
  modalCard: { gap: space[3], padding: space[5] },
  modalCardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalStat: { ...type.statValue, color: colors.text.primary },
  modalPage: { flex: 1 },
};

function formatBadgeHero(badge: MilestoneFixture, locked: boolean, currentProgress = badge.progress.current) {
  const suffix = badge.threshold.unit === 'hours' ? 'h' : badge.threshold.unit === 'days' ? 'd' : '';
  if (!locked) return `${badge.threshold.value}${suffix}`;
  return `${Math.floor(currentProgress)} / ${badge.threshold.value}${suffix}`;
}

function formatUnlockMonth(unlockedAt: string) {
  const [month, , year] = unlockedAt.split(' ');
  const monthNames: Record<string, string> = {
    Apr: 'April', Aug: 'August', Dec: 'December', Feb: 'February', Jan: 'January', Jul: 'July', Jun: 'June', Mar: 'March', May: 'May', Nov: 'November', Oct: 'October', Sep: 'September',
  };
  return `${monthNames[month] ?? month} ${year}`;
}
