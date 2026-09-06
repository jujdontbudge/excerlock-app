import { useRef, type ComponentRef, type RefObject } from 'react';
import { Image, StyleSheet, Text, View, type LayoutChangeEvent, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';

import {
  analysisEmptyShell,
  analysisOverviewCopy,
  assetRegistry,
  earningBreakdownFixture,
  heatMapFixture,
  milestoneFixtures,
  monthTrendFixture,
  weekTrendFixture,
  weekTrendSummary,
  weeklyRecapFixture,
  yearTrendFixture,
} from '@/content';
import {
  ContentFadeMask,
  GradientScreen,
  HeatMap,
  LiveRing,
  PillButton,
  PillowCard,
  PressableScale,
  SegmentedControl,
  TrendChart,
  VectorIcon,
  colors,
  iconSize,
  layout,
  radius,
  space,
  type,
} from '@/design-system';

import { AnalysisHeader, Eyebrow, SectionHeading, analysisFeatureStyles as s } from './components';

export type AnalysisRange = 'week' | 'month' | 'year';
export type AnalysisScrollHandle = ComponentRef<typeof ScrollView>;

export interface AnalysisScreenProps {
  activityCount?: number;
  activityDays?: readonly { date: string; kind: 'event' | 'state' | 'rate' }[];
  currentStreakDays?: number;
  earnedMinutes?: number;
  timeLockedMinutes?: number;
  entryContext?: 'recap';
  freshRecap?: boolean;
  history?: 'empty' | 'populated';
  onBadgePress: (badgeId: string) => void;
  onDayPress: (date: string) => void;
  onEarningPress: () => void;
  onMethodPress: () => void;
  onDismissEntryContext?: () => void;
  onMilestoneShelfVisible?: () => void;
  onRangeChange: (range: AnalysisRange) => void;
  onShareRecap: () => void;
  onStartToday: () => void;
  onTrendPress: () => void;
  range?: AnalysisRange;
  scrollRef?: RefObject<AnalysisScrollHandle | null>;
  showcase?: boolean;
  showRecap?: boolean;
  startWeek?: 'device' | 'sunday' | 'monday';
}

const rangeOptions = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Year', value: 'year' },
] as const;

export function AnalysisScreen({
  activityCount = 0,
  activityDays = [],
  currentStreakDays = 0,
  earnedMinutes = 0,
  entryContext,
  freshRecap = false,
  history = 'populated',
  onBadgePress,
  onDayPress,
  onEarningPress,
  onMethodPress,
  onDismissEntryContext,
  onMilestoneShelfVisible,
  onRangeChange,
  onShareRecap,
  onStartToday,
  onTrendPress,
  range = 'week',
  scrollRef,
  showcase = false,
  showRecap = false,
  startWeek = 'device',
  timeLockedMinutes = 0,
}: AnalysisScreenProps) {
  const milestoneShelfY = useRef<number | null>(null);
  const milestoneShelfReported = useRef(false);
  const hasHistory = history === 'populated';
  const showcasePopulated = hasHistory && showcase;
  const visibleStreakDays = showcasePopulated ? 12 : currentStreakDays;
  const naturalActivityCells = activityDays.slice(-28).map((activity) => ({
    id: activity.date,
    label: `${activity.date}. Active day met by a ${activity.kind} condition.`,
    state: activity.kind,
  }));
  const heatCells = showcasePopulated
    ? heatMapFixture.map((cell) => ({ id: cell.date, label: `${cell.label}. ${cell.accessibilitySummary}`, state: cell.kind }))
    : [
        ...Array.from(
          { length: Math.max(0, analysisEmptyShell.heatMap.cells - naturalActivityCells.length) },
          (_, index) => ({ id: `blank-${index}`, label: `Blank sample day ${index + 1}`, state: 'blank' as const }),
        ),
        ...naturalActivityCells,
      ];
  const sundayFirst = startWeek !== 'monday';
  const orderedHeatCells = sundayFirst
    ? Array.from({ length: Math.ceil(heatCells.length / 7) }, (_, week) => {
      const cells = heatCells.slice(week * 7, week * 7 + 7);
      return cells.length === 7 ? [cells[6], ...cells.slice(0, 6)] : cells;
    }).flat()
    : heatCells;
  const weekdayLabels = sundayFirst
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const preview = getRangePreview(range);
  const trend = showcasePopulated
    ? preview.data
    : preview.data.map((point) => ({ ...point, value: 0, valueLabel: 'No sample data' }));
  const activeDayCount = new Set(activityDays.map((activity) => activity.date)).size;
  const naturalHistorySummary = `${activityCount} qualifying ${activityCount === 1 ? 'activity' : 'activities'} recorded across ${activeDayCount} ${activeDayCount === 1 ? 'day' : 'days'}.`;

  const reportMilestoneShelfIfVisible = (scrollY: number, viewportHeight: number) => {
    const shelfY = milestoneShelfY.current;
    if (milestoneShelfReported.current || shelfY === null || scrollY + viewportHeight < shelfY + space[4]) return;
    milestoneShelfReported.current = true;
    onMilestoneShelfVisible?.();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    reportMilestoneShelfIfVisible(
      event.nativeEvent.contentOffset.y,
      event.nativeEvent.layoutMeasurement.height,
    );
  };

  const handleMilestoneLayout = (event: LayoutChangeEvent) => {
    milestoneShelfY.current = event.nativeEvent.layout.y;
  };

  return (
    <GradientScreen edges={['top', 'left', 'right']} variant="content">
      <ContentFadeMask>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[s.content, styles.tabContent]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          testID="analysis-scroll"
        >
        <AnalysisHeader title={analysisOverviewCopy.title} />
        <Eyebrow>{analysisOverviewCopy.sampleLabel.toUpperCase()}</Eyebrow>

        {entryContext === 'recap' ? (
          <PillowCard style={styles.entryContext} variant="elevated">
            <Eyebrow>WEEKLY RECAP PREVIEW</Eyebrow>
            <Text style={s.title}>You reclaimed 6h 20m last week.</Text>
            <Text style={s.body}>Five active days, seven earns, and 6h 20m reclaimed—take a look or make a share card.</Text>
            <Text style={s.note}>Opened from a sample notification. Nothing was delivered.</Text>
            <PillButton label="Dismiss notification preview context" onPress={() => onDismissEntryContext?.()} variant="text" />
          </PillowCard>
        ) : null}

        {!hasHistory ? (
          <PillowCard style={styles.emptyIntro} variant="elevated">
            <Text style={s.title}>{analysisOverviewCopy.empty.title}</Text>
            <Text style={s.body}>{analysisOverviewCopy.empty.body}</Text>
          </PillowCard>
        ) : null}

        {hasHistory && !showcasePopulated ? (
          <PillowCard style={styles.emptyIntro} variant="elevated">
            <Text style={s.title}>Your real local sample has started.</Text>
            <Text style={s.body}>{naturalHistorySummary}</Text>
          </PillowCard>
        ) : null}

        {showRecap && showcasePopulated ? (
          <PillowCard style={[styles.recap, freshRecap ? styles.freshRecap : null]} testID="weekly-recap-card" variant="elevated">
            <Eyebrow>{freshRecap ? 'FRESH WEEKLY RECAP' : 'WEEKLY RECAP'} · {weeklyRecapFixture.range}</Eyebrow>
            <Text style={styles.recapHero}>{weeklyRecapFixture.hero}</Text>
            <Text style={s.body}>{weeklyRecapFixture.delta}</Text>
            <View style={styles.statPair}>
              <Text style={s.note}>{weeklyRecapFixture.activeDays}</Text>
              <Text style={s.note}>{weeklyRecapFixture.earnCount}</Text>
              <Text style={s.note}>{weeklyRecapFixture.earnedVsSpent}</Text>
              <Text style={s.note}>{weeklyRecapFixture.streak}</Text>
            </View>
            <PillButton label={weeklyRecapFixture.cta} onPress={onShareRecap} variant="screen" />
          </PillowCard>
        ) : null}

        <PressableScale accessibilityLabel="Open Time Reclaimed trend" accessibilityRole="button" onPress={onTrendPress} pressedScale={0.98}>
          <PillowCard style={styles.heroCard} variant="elevated">
            <View style={styles.heroGlyph}>
              <VectorIcon source={assetRegistry.glyphs['icon-tab-spiral']} />
            </View>
            <Eyebrow>{analysisOverviewCopy.hero.eyebrow.toUpperCase()}</Eyebrow>
            <Text style={styles.heroValue}>{showcasePopulated
              ? analysisOverviewCopy.hero.value
              : hasHistory
                ? formatMetricMinutes(timeLockedMinutes)
                : analysisEmptyShell.timeReclaimed.value}</Text>
            <Text style={s.body}>{showcasePopulated
              ? analysisOverviewCopy.hero.conclusion
              : hasHistory
                ? `${formatMetricMinutes(timeLockedMinutes)} of Time Locked is recorded in this local sample.`
                : analysisEmptyShell.timeReclaimed.conclusion}</Text>
          </PillowCard>
        </PressableScale>
        <PillButton label={analysisOverviewCopy.hero.methodLink} onPress={onMethodPress} variant="text" />

        <SectionHeading>{analysisOverviewCopy.trend.title}</SectionHeading>
        <SegmentedControl accessibilityLabel="Analysis range" onChange={onRangeChange} options={rangeOptions} value={range} />
        <PressableScale accessibilityLabel="Open detailed trend" accessibilityRole="button" onPress={onTrendPress} pressedScale={0.98}>
          <PillowCard>
            <Text accessibilityLiveRegion="polite" style={s.note}>{preview.periodLabel}</Text>
            <Text style={s.body}>{showcasePopulated ? preview.conclusion : hasHistory ? naturalHistorySummary : analysisEmptyShell.trend.conclusion}</Text>
            <TrendChart accessibilityLabel={showcasePopulated ? preview.accessibilityLabel : `No aggregate trend yet for ${preview.periodLabel}`} data={trend} height={110} selectedLabel={showcasePopulated ? preview.selectedLabel : undefined} />
          </PillowCard>
        </PressableScale>

        <SectionHeading>{analysisOverviewCopy.streak.title}</SectionHeading>
        <PillowCard>
          <View style={styles.streakRow}>
            <LiveRing accessibilityLabel={`Current streak, ${visibleStreakDays} ${visibleStreakDays === 1 ? 'day' : 'days'}`} caption="CURRENT" progress={showcasePopulated ? 12 / 21 : Math.min(1, visibleStreakDays / 7)} size={128} value={String(visibleStreakDays)} />
            <View style={s.rowCopy}>
              <Text style={s.title}>{showcasePopulated ? analysisOverviewCopy.streak.value : `${currentStreakDays} days current`}</Text>
              <Text style={s.note}>Tap any day for the sample evidence behind it.</Text>
            </View>
          </View>
          <View accessibilityLabel={`Week starts on ${sundayFirst ? 'Sunday' : 'Monday'}`} style={styles.weekdayRow}>
            {weekdayLabels.map((label) => <Text key={label} style={styles.weekdayLabel}>{label}</Text>)}
          </View>
          <HeatMap cells={orderedHeatCells} onCellPress={onDayPress} />
        </PillowCard>

        <SectionHeading action={onEarningPress} actionLabel="View all">{analysisOverviewCopy.earning.title}</SectionHeading>
        <PressableScale accessibilityLabel="Open earning breakdown" accessibilityRole="button" onPress={onEarningPress} pressedScale={0.98}>
          <PillowCard>
            <Text style={styles.earningTotal}>{showcasePopulated ? earningBreakdownFixture.total : hasHistory ? `${formatMetricMinutes(earnedMinutes)} earned` : analysisEmptyShell.earning.total}</Text>
            <Text style={s.body}>{showcasePopulated ? earningBreakdownFixture.conclusion : hasHistory ? naturalHistorySummary : analysisEmptyShell.earning.body}</Text>
            {showcasePopulated ? earningBreakdownFixture.rows.slice(0, 3).map((row) => (
              <View key={row.condition} style={styles.earningRow}>
                <Text style={s.title}>{row.condition}</Text>
                <Text style={s.note}>{row.sharePercent}%</Text>
              </View>
            )) : null}
          </PillowCard>
        </PressableScale>

        <View onLayout={handleMilestoneLayout} testID="analysis-milestone-shelf">
          <SectionHeading>{analysisOverviewCopy.milestones.title}</SectionHeading>
          {!hasHistory ? <Text style={s.note}>All 22 milestones stay visible as locked sample progress.</Text> : null}
          {(['Streaks', 'Activities', 'Time Reclaimed'] as const).map((group) => (
            <View key={group} style={s.cardGap}>
              <Eyebrow>{group.toUpperCase()}</Eyebrow>
              <View style={styles.badgeGrid}>
                {milestoneFixtures.filter((badge) => badge.group === group).map((badge) => {
                  const naturalProgress = badge.group === 'Streaks'
                    ? currentStreakDays
                    : badge.group === 'Activities'
                      ? activityCount
                      : 0;
                  const badgeStatus = showcasePopulated
                    ? badge.status
                    : naturalProgress >= badge.threshold.value ? 'unlocked' : 'locked';
                  const badgeProgress = showcasePopulated
                    ? badge.progress.label
                    : `${naturalProgress}/${badge.threshold.value}`;
                  return (
                  <PressableScale
                    accessibilityLabel={`${badge.name}, ${badgeStatus}, ${badgeProgress}`}
                    accessibilityRole="button"
                    key={badge.assetId}
                    onPress={() => onBadgePress(badge.assetId)}
                    style={styles.badgeHost}
                  >
                    <View style={styles.badge}>
                      <Image
                        accessibilityIgnoresInvertColors
                        source={assetRegistry.badges[badge.assetId]}
                        style={[styles.badgeImage, badgeStatus === 'locked' && styles.badgeLocked]}
                      />
                      <Text numberOfLines={2} style={styles.badgeName}>{badge.name}</Text>
                      <Text numberOfLines={1} style={styles.badgeProgress}>{badgeProgress}</Text>
                    </View>
                  </PressableScale>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {!hasHistory ? <PillButton fullWidth label={analysisOverviewCopy.empty.primary} onPress={onStartToday} variant="screen" /> : null}
        </ScrollView>
      </ContentFadeMask>
    </GradientScreen>
  );
}

function formatMetricMinutes(minutes: number) {
  const normalized = Math.max(0, Math.floor(minutes));
  if (normalized < 60) return `${normalized} min`;
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', gap: space[1], minHeight: 118, padding: space[2] },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
  badgeHost: { width: '31%' },
  badgeImage: { height: 60, width: 60 },
  badgeLocked: { opacity: 0.32 },
  badgeName: { ...type.caption, color: colors.text.primary, textAlign: 'center' },
  badgeProgress: { ...type.micro, color: colors.text.secondary },
  earningRow: { alignItems: 'center', borderTopColor: colors.surface.divider, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3], paddingTop: space[3] },
  earningTotal: { ...type.statValue, color: colors.text.primary },
  emptyIntro: { gap: space[2] },
  entryContext: { borderColor: colors.brand.signatureAmber, borderWidth: 1, gap: space[2] },
  freshRecap: { borderColor: colors.brand.signatureAmber, borderWidth: 2 },
  heroCard: { alignItems: 'center', gap: space[2], paddingVertical: space[6] },
  heroGlyph: { height: iconSize.feature, width: iconSize.feature },
  heroValue: { ...type.heroLg, color: colors.text.primary },
  recap: { gap: space[2] },
  recapHero: { ...type.screenLarge, color: colors.text.primary },
  statPair: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3] },
  streakRow: { alignItems: 'center', flexDirection: 'row', gap: space[4], marginBottom: space[3] },
  tabContent: { paddingBottom: layout.tabBarContentInset },
  weekdayLabel: { ...type.micro, color: colors.text.tertiary, textAlign: 'center', width: '14.2857%' },
  weekdayRow: { flexDirection: 'row', marginBottom: space[1] },
});

function getRangePreview(range: AnalysisRange) {
  if (range === 'month') {
    return {
      accessibilityLabel: 'Sample reclaimed time by week in August 2026',
      conclusion: 'You reclaimed 18h 42m so far this month.',
      data: monthTrendFixture.map((period) => ({
        label: period.period.replace('Aug ', ''),
        value: period.minutes ?? 0,
        valueLabel: period.reclaimed ?? 'No sample data',
      })),
      periodLabel: 'August 2026 · weekly view',
      selectedLabel: '3–9',
    };
  }
  if (range === 'year') {
    return {
      accessibilityLabel: 'Sample reclaimed time by month in 2026',
      conclusion: 'You reclaimed 68h across the sample year.',
      data: yearTrendFixture.map((month) => ({
        label: month.month.slice(0, 3),
        value: month.minutes ?? 0,
        valueLabel: month.reclaimed ?? 'No sample data',
      })),
      periodLabel: '2026 · monthly view',
      selectedLabel: 'Aug',
    };
  }
  return {
    accessibilityLabel: weekTrendSummary.accessibilitySummary,
    conclusion: weekTrendSummary.conclusion,
    data: weekTrendFixture.map((day) => ({
      label: day.day.slice(0, 3),
      value: day.reclaimedMinutes ?? 0,
      valueLabel: day.reclaimedMinutes ? `${day.reclaimedMinutes} min reclaimed` : 'No sample data',
    })),
    periodLabel: 'Aug 3–9, 2026 · daily view',
    selectedLabel: 'Fri',
  };
}
