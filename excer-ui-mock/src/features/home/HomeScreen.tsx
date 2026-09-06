import type { ComponentRef, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ImageBackground, StyleSheet, Text, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import {
  AccessibleModal,
  ConditionCard,
  ContentFadeMask,
  ChevronIcon,
  FullScreenModalPage,
  HeroLock,
  IconChip,
  PillowCard,
  PillButton,
  PressableScale,
  colors,
  layout,
  radius,
  space,
  type,
} from '@/design-system';
import {
  accessHolidayFixtures,
  balanceDetailFixtures,
  conditionCardFixtures,
  homeShellCopy,
  holidayCardCopy,
  notificationEntrySharedCopy,
  assetRegistry,
} from '@/content';
import type {
  AccessHolidayState,
  DemoCondition,
  HomeMode,
  WeeklyConditionRewardOverride,
} from '@/presentation';
import { LowTimeBanner } from '@/features/lock-moments';
import { FeatureScaffold } from '@/features/shared';

import {
  cheapestAvailableCondition,
  conditionDetailPresentation,
  enabledHomeConditions,
  eventConditionSubtitle,
  homeEntryPresentation,
  isHomeModeOpen,
  rateConditionPresentation,
  type HomeSessionStatus,
} from './homeModel';

export type HomeScrollHandle = ComponentRef<typeof ScrollView>;

export type HomeScreenProps = {
  accessHoliday?: AccessHolidayState | null;
  conditions: DemoCondition[];
  currentRewardOverrides?: Readonly<Record<string, WeeklyConditionRewardOverride>>;
  currentStreakDays?: number;
  dailyAllowanceMinutes?: number | 'unlimited';
  earnTransitionMinutes?: number;
  earnedMinutesToday?: number;
  executableConditionIds?: readonly string[];
  entry?: 'nudge' | 'lastCall';
  hasMeaningfulActivityToday?: boolean;
  mode: HomeMode;
  onAddCondition: () => void;
  onAnalysis: () => void;
  onDismissEntry?: () => void;
  onEdit: () => void;
  onEventAction: (conditionId: string) => void;
  onOpenCondition: (conditionId: string) => void;
  onOpenEarning: (conditionId: string) => void;
  onOpenRules: () => void;
  onOpenTimeLocked: () => void;
  onOpenTrend: () => void;
  onStartCondition: (conditionId: string) => void;
  openConditionId?: string;
  remainingMinutes: number;
  restDayAllowanceOnly?: boolean;
  scrollRef?: RefObject<HomeScrollHandle | null>;
  screenTimeLabel?: string;
  screenTimeUsedMinutes?: number;
  showcaseAnalysis?: boolean;
  statusBody: string;
  statusTitle: string;
  timeLockedLabel?: string;
  gymStatus?: HomeSessionStatus;
  walkStatus?: HomeSessionStatus;
};

const fallbackBanners = {
  event: assetRegistry.banners['gym-weights-floor'],
  state: assetRegistry.banners['walk-city-sidewalk'],
  rate: assetRegistry.banners['walk-park-path'],
} as const;

export function HomeScreen({
  accessHoliday = null,
  conditions,
  currentRewardOverrides = {},
  currentStreakDays = 0,
  dailyAllowanceMinutes = 45,
  earnTransitionMinutes,
  earnedMinutesToday = 0,
  executableConditionIds,
  entry,
  hasMeaningfulActivityToday = false,
  mode,
  onAddCondition,
  onAnalysis,
  onDismissEntry,
  onEdit,
  onEventAction,
  onOpenCondition,
  onOpenEarning,
  onOpenRules,
  onOpenTimeLocked,
  onOpenTrend,
  onStartCondition,
  openConditionId,
  remainingMinutes,
  restDayAllowanceOnly = false,
  scrollRef,
  screenTimeLabel = '45 min',
  screenTimeUsedMinutes = 170,
  showcaseAnalysis = false,
  statusBody,
  statusTitle,
  timeLockedLabel = '0 min',
  gymStatus = 'inactive',
  walkStatus = 'inactive',
}: HomeScreenProps) {
  const reduceMotion = useReducedMotion();
  const [displayedEarnMinutes, setDisplayedEarnMinutes] = useState(
    reduceMotion ? earnTransitionMinutes ?? 0 : 0,
  );
  const [detail, setDetail] = useState<{ type: 'balance' | 'rules' } | { type: 'condition'; id: string } | null>(null);
  const [conditionsSectionY, setConditionsSectionY] = useState<number | null>(null);
  const [cardListY, setCardListY] = useState<number | null>(null);
  const [entryTargetY, setEntryTargetY] = useState<number | null>(null);
  const [lowDismissed, setLowDismissed] = useState(false);
  const consumedOpenConditionId = useRef<string | null>(null);
  const localScrollRef = useRef<HomeScrollHandle>(null);
  const activeScrollRef = scrollRef ?? localScrollRef;
  const visibleConditions = enabledHomeConditions(conditions);
  const executableConditionIdSet = new Set(
    executableConditionIds ?? visibleConditions.map((condition) => condition.id),
  );
  const executableConditions = visibleConditions.filter((condition) =>
    executableConditionIdSet.has(condition.id),
  );
  const lockOpen = isHomeModeOpen(mode);
  const onHoliday = ['rest-of-day', 'set-period', 'rest-day-no-locking', 'outside-window'].includes(mode);
  const ruleHoliday = mode === 'rest-day-no-locking' || mode === 'outside-window';
  const conditionsReadOnly = ruleHoliday || restDayAllowanceOnly;
  const eventHoliday = mode === 'rest-of-day' || mode === 'set-period';
  const holidayKind = accessHoliday?.kind ?? (
    mode === 'rest-of-day' ? 'restOfDay'
      : mode === 'set-period' ? 'setPeriod'
        : mode === 'rest-day-no-locking' ? 'restDayNoLocking'
          : mode === 'outside-window' ? 'outsideLockWindow' : null
  );
  const holidayFixture = holidayKind ? accessHolidayFixtures[holidayKind] : null;
  const holidayConditionLabel = mode === 'rest-day-no-locking'
    ? 'REST DAY'
    : mode === 'outside-window'
      ? 'OUTSIDE WINDOW'
      : restDayAllowanceOnly ? 'REST DAY' : undefined;
  const transitioning = earnTransitionMinutes !== undefined;
  const selectedCondition = detail?.type === 'condition'
    ? visibleConditions.find((condition) => condition.id === detail.id)
    : undefined;
  const selectedRewardOverride = selectedCondition
    ? currentRewardOverrides[selectedCondition.id]
    : undefined;
  const selectedEffectiveRateMinutes = selectedCondition?.kind === 'rate'
    ? selectedRewardOverride?.kind === 'off'
      ? null
      : selectedRewardOverride?.kind === 'fixed'
        ? selectedRewardOverride.minutes
        : undefined
    : undefined;
  const selectedConditionUnavailable = selectedCondition !== undefined
    && !executableConditionIdSet.has(selectedCondition.id);
  const cheapestCondition = cheapestAvailableCondition(executableConditions);
  const actionableCondition = cheapestCondition;
  const entryPresentation = homeEntryPresentation(entry);
  const entryTargetId = entryPresentation ? cheapestCondition?.id ?? 'empty' : null;
  const selectedDetail = selectedCondition
    ? conditionDetailPresentation(
        selectedCondition,
        accessHoliday,
        gymStatus,
        walkStatus,
        selectedEffectiveRateMinutes,
      )
    : null;
  const balanceFixture = remainingMinutes > 0 ? balanceDetailFixtures.positive : balanceDetailFixtures.empty;
  const balanceRows = [
    {
      label: 'Daily free time',
      value: dailyAllowanceMinutes === 'unlimited'
        ? 'Unlimited'
        : formatBalanceMinutes(dailyAllowanceMinutes),
    },
    { label: 'Earned', value: formatBalanceMinutes(earnedMinutesToday) },
    { label: 'Used', value: formatBalanceMinutes(screenTimeUsedMinutes) },
  ];
  const holidaySourceCondition = accessHoliday?.sourceConditionId
    ? visibleConditions.find((condition) => condition.id === accessHoliday.sourceConditionId)
    : undefined;
  const holidayCause = eventHoliday
    ? mode === 'rest-of-day'
      ? `${accessHoliday?.sourceName ?? 'A completed event'} opened the selected apps for the rest of today.`
      : `${accessHoliday?.sourceName ?? 'A completed event'} opened the selected apps for ${accessHoliday?.durationMinutes ?? 90} minutes.`
    : holidayFixture?.cause;
  const selectedPrimaryLabel = selectedCondition
    ? conditionPrimaryLabel(selectedCondition, gymStatus, walkStatus)
    : null;

  const earnMore = () => {
    if (actionableCondition?.kind === 'state') {
      onStartCondition(actionableCondition.id);
    } else if (actionableCondition?.kind === 'event') {
      onEventAction(actionableCondition.id);
    } else if (actionableCondition?.kind === 'rate') {
      onOpenEarning(actionableCondition.id);
    } else {
      onAddCondition();
    }
  };

  useEffect(() => {
    if (!transitioning) {
      setDisplayedEarnMinutes(0);
      return;
    }
    const target = earnTransitionMinutes ?? 0;
    if (reduceMotion) {
      setDisplayedEarnMinutes(target);
      return;
    }
    const step = Math.max(1, Math.ceil(target / 12));
    const timer = setInterval(() => {
      setDisplayedEarnMinutes((value) => {
        const next = Math.min(target, value + step);
        if (next >= target) clearInterval(timer);
        return next;
      });
    }, 55);
    return () => clearInterval(timer);
  }, [earnTransitionMinutes, reduceMotion, transitioning]);

  useEffect(() => {
    if (!entry) return;
    AccessibilityInfo.announceForAccessibility(
      entry === 'nudge'
        ? visibleConditions.length === 0
          ? 'Afternoon nudge opened. Add your first way to earn.'
          : `Afternoon nudge opened. ${cheapestCondition?.name ?? 'Ways to earn'} is highlighted.`
        : `Streak last call opened. ${cheapestCondition?.name ?? 'The add condition action'} is highlighted.`,
    );
  }, [cheapestCondition?.name, entry, visibleConditions.length]);

  useEffect(() => {
    if (mode !== 'low') setLowDismissed(false);
  }, [mode]);

  useEffect(() => {
    if (!openConditionId) {
      consumedOpenConditionId.current = null;
      return;
    }
    if (consumedOpenConditionId.current === openConditionId) return;
    if (!visibleConditions.some((condition) => condition.id === openConditionId)) return;
    consumedOpenConditionId.current = openConditionId;
    setDetail({ type: 'condition', id: openConditionId });
  }, [openConditionId, visibleConditions]);

  useEffect(() => {
    if (!entryPresentation || conditionsSectionY === null || cardListY === null || entryTargetY === null) return;
    activeScrollRef.current?.scrollTo({
      animated: !reduceMotion,
      y: Math.max(0, conditionsSectionY + cardListY + entryTargetY - 96),
    });
  }, [activeScrollRef, cardListY, conditionsSectionY, entryPresentation, entryTargetY, reduceMotion]);

  return (
    <FeatureScaffold accessibilityLabel="Home" canvasVariant="heat" dockOverlay scroll={false}>
      <ContentFadeMask>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          ref={activeScrollRef}
          showsVerticalScrollIndicator={false}
        >
      {entryPresentation ? (
        <PillowCard style={styles.entryCard} variant="bubble">
          <View style={styles.entryHeader}>
            <Text style={styles.entryChip}>{entryPresentation.chip}</Text>
            {onDismissEntry ? (
              <PressableScale
                accessibilityLabel={notificationEntrySharedCopy.dismissAccessibilityLabel}
                accessibilityRole="button"
                onPress={onDismissEntry}
              >
                <Text style={styles.entryDismiss}>Dismiss</Text>
              </PressableScale>
            ) : null}
          </View>
          <Text style={styles.entryConclusion}>{entryPresentation.conclusion}</Text>
          <Text style={styles.entryBody}>{entryPresentation.body}</Text>
          <Text style={styles.entryDisclosure}>{notificationEntrySharedCopy.disclosure}</Text>
        </PillowCard>
      ) : null}

      <PressableScale
        accessibilityLabel={ruleHoliday ? 'Open rules summary' : 'Open balance and access details'}
        accessibilityRole="button"
        onPress={() => setDetail({ type: ruleHoliday ? 'rules' : 'balance' })}
      >
        <View style={styles.heroBlock}>
          <HeroLock
            accessibilityLabel={lockOpen ? 'Sample apps are open' : 'Sample apps are locked'}
            size={224}
            state={transitioning ? 'transitioning' : lockOpen ? 'unlocked' : 'locked'}
          />
          {onHoliday ? <Text style={styles.holidayChip}>{holidayFixture?.chip ?? 'BALANCE ON HOLD'}</Text> : null}
          <Text accessibilityLiveRegion="polite" style={styles.heroTitle}>
            {transitioning
              ? (earnTransitionMinutes ?? 0) > 0
                ? `Adding ${Math.max(1, displayedEarnMinutes)} min`
                : 'Opening access…'
              : statusTitle}
          </Text>
          <Text style={styles.heroBody}>{transitioning
            ? (earnTransitionMinutes ?? 0) > 0
              ? 'Your sample balance is updating right here.'
              : 'Your sample access window is opening right here.'
            : statusBody}</Text>
        </View>
      </PressableScale>

      <View style={styles.statsRow}>
        <PressableScale
          accessibilityLabel="Open today’s Time Locked detail"
          accessibilityRole="button"
          onPress={onOpenTimeLocked}
          style={styles.statPressable}
        >
          <View style={styles.stat}>
            <IconChip size="sm" source={assetRegistry.glyphs['icon-padlock-chip']} variant="white" />
            <View>
              <Text style={styles.statLabel}>Time Locked</Text>
              <Text style={styles.statValue}>{timeLockedLabel}</Text>
            </View>
          </View>
        </PressableScale>
        <PressableScale
          accessibilityLabel="Open Screen Time balance details"
          accessibilityRole="button"
          onPress={() => setDetail({ type: 'balance' })}
          style={styles.statPressable}
        >
          <View style={[styles.stat, styles.statRight]}>
            <View>
              <Text style={[styles.statLabel, styles.alignRight]}>Screen Time</Text>
              <Text style={[styles.statValue, styles.alignRight]}>{screenTimeLabel}</Text>
            </View>
            <IconChip size="sm" source={assetRegistry.glyphs['icon-tab-alarm']} variant="dark" />
          </View>
        </PressableScale>
      </View>

      <View
        onLayout={(event) => setConditionsSectionY(event.nativeEvent.layout.y)}
        style={styles.conditionsSection}
        testID="home-conditions-section"
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today’s ways to earn</Text>
          {visibleConditions.length > 0 ? <PillButton label="Add" onPress={onAddCondition} variant="text" /> : null}
        </View>
        <View
          onLayout={(event) => setCardListY(event.nativeEvent.layout.y)}
          style={styles.cardList}
          testID="home-condition-list"
        >
          {visibleConditions.length === 0 ? (
            <View
              onLayout={(event) => entryTargetId === 'empty' && setEntryTargetY(event.nativeEvent.layout.y)}
              testID="home-entry-target-empty"
            >
              <PillowCard style={[styles.emptyCard, entryTargetId === 'empty' && styles.entryCardFocus]} variant="subtle">
                <Text style={styles.emptyTitle}>{homeShellCopy.natural.emptyCard.title}</Text>
                <Text style={styles.emptyBody}>{homeShellCopy.natural.emptyCard.body}</Text>
                <PillButton fullWidth label={homeShellCopy.natural.emptyCard.action} onPress={onAddCondition} variant="screen" />
              </PillowCard>
            </View>
            ) : (
            <>
            {conditionsReadOnly ? (
              <Text style={styles.ruleNotice}>
                {mode === 'outside-window' ? 'OUTSIDE WINDOW' : 'REST DAY'} · Conditions are read-only right now
              </Text>
            ) : null}
            {visibleConditions.map((condition) => {
              const banner = bannerForCondition(condition);
              const focused = entryTargetId === condition.id;
              const rewardOverride = currentRewardOverrides[condition.id];
              const offToday = rewardOverride?.kind === 'off';
              const executableNow = executableConditionIdSet.has(condition.id);
              const conditionReadOnly = conditionsReadOnly || !executableNow;
              const policyStatusLabel = conditionsReadOnly
                ? holidayConditionLabel
                : offToday
                  ? 'OFF TODAY'
                  : !executableNow
                    ? 'NOT AVAILABLE NOW'
                    : undefined;
              const policyBody = conditionsReadOnly
                ? mode === 'outside-window' ? holidayCardCopy.outsideWindow : holidayCardCopy.restDay
                : offToday
                  ? 'Off this weekday. This condition cannot earn credit today.'
                  : !executableNow
                    ? 'Not available in its current active window.'
                    : null;
              const cardStyle = [conditionReadOnly && styles.ruleCard, focused && styles.entryCardFocus];
              if (condition.kind === 'event') {
                const holidaySource = eventHoliday && accessHoliday?.sourceConditionId === condition.id;
                const displayStatus = holidaySource
                  ? 'completed'
                  : condition.todayStatus === 'crediting'
                    ? 'completing'
                    : condition.todayStatus === 'completed'
                      ? 'completed'
                      : 'eligible';
                return (
                  <View
                    key={condition.id}
                    onLayout={(event) => focused && setEntryTargetY(event.nativeEvent.layout.y)}
                    testID={`home-entry-target-${condition.id}`}
                  >
                    <ConditionCard
                      banner={banner}
                      onAction={conditionReadOnly || displayStatus === 'completed' ? undefined : () => onEventAction(condition.id)}
                      onInfo={() => setDetail({ type: 'condition', id: condition.id })}
                      onOpen={() => setDetail({ type: 'condition', id: condition.id })}
                      status={displayStatus}
                      statusLabel={holidaySource ? 'OPEN TIME' : policyStatusLabel}
                      style={cardStyle}
                      subtitle={holidaySource
                        ? mode === 'rest-of-day' ? holidayCardCopy.restOfDay : holidayCardCopy.setPeriod
                        : policyBody
                          ? policyBody
                          : eventConditionSubtitle(condition)}
                      title={condition.name}
                      variant="event"
                    />
                  </View>
                );
              }
              if (condition.kind === 'state') {
                const gymCondition = condition.catalogId.startsWith('gym-');
                const sessionStatus = gymCondition ? gymStatus : walkStatus;
                const actionLabel = gymCondition
                  ? sessionStatus === 'ended' ? 'Try again' : 'Check in'
                  : sessionStatus === 'ended' ? 'Start again' : 'Start walking';
                const subtitle = gymCondition
                  ? sessionStatus === 'active'
                    ? `${condition.context ?? 'Selected gym'} verified · balance drains normally`
                    : sessionStatus === 'verifying'
                      ? `Checking ${condition.context ?? 'the selected gym'}…`
                      : sessionStatus === 'ended'
                        ? `${condition.context ?? 'Gym'} verification needs attention`
                        : `Check in at ${condition.context ?? 'your saved gym'} to keep apps open`
                  : sessionStatus === 'active'
                    ? conditionCardFixtures.state.activeBody
                    : conditionCardFixtures.state.inactiveHelper;
                return (
                  <View
                    key={condition.id}
                    onLayout={(event) => focused && setEntryTargetY(event.nativeEvent.layout.y)}
                    testID={`home-entry-target-${condition.id}`}
                  >
                    <ConditionCard
                      actionLabel={actionLabel}
                      banner={banner}
                      onAction={conditionReadOnly ? undefined : () => onStartCondition(condition.id)}
                      onInfo={() => setDetail({ type: 'condition', id: condition.id })}
                      onOpen={() => conditionReadOnly ? setDetail({ type: 'condition', id: condition.id }) : onStartCondition(condition.id)}
                      status={sessionStatus}
                      statusLabel={policyStatusLabel}
                      style={cardStyle}
                      subtitle={policyBody
                        ? policyBody
                        : subtitle}
                      title={condition.name}
                      variant="state"
                    />
                  </View>
                );
              }
              const effectiveRateMinutes = rewardOverride?.kind === 'fixed'
                ? rewardOverride.minutes
                : undefined;
              const rate = rateConditionPresentation(condition, effectiveRateMinutes);
              return (
                <View
                  key={condition.id}
                  onLayout={(event) => focused && setEntryTargetY(event.nativeEvent.layout.y)}
                  testID={`home-entry-target-${condition.id}`}
                >
                  <ConditionCard
                    banner={banner}
                    earnedValue={offToday ? 'No credit today' : rate.earnedValue}
                    onInfo={() => setDetail({ type: 'condition', id: condition.id })}
                    onOpen={() => conditionReadOnly ? setDetail({ type: 'condition', id: condition.id }) : onOpenEarning(condition.id)}
                    progress={rate.progress}
                    ratioLabel={policyBody
                      ? policyBody
                      : rate.ratioLabel}
                    sourceValue={rate.sourceValue}
                    statusLabel={policyStatusLabel}
                    style={cardStyle}
                    title={condition.name}
                    variant="rate"
                  />
                </View>
              );
            })}
            </>
          )}
        </View>
      </View>

      {mode === 'low' && !restDayAllowanceOnly && !lowDismissed ? (
        <LowTimeBanner
          onDismiss={() => setLowDismissed(true)}
          onEarnMore={earnMore}
          onOpenBalance={() => setDetail({ type: 'balance' })}
        />
      ) : null}

      <View style={styles.shortcuts}>
        <Shortcut label="Edit" onPress={onEdit} />
        <Shortcut label="Analysis" onPress={onAnalysis} />
      </View>
      {remainingMinutes > 0 && mode === 'unlocked' ? (
        <Text style={styles.balanceNote}>{remainingMinutes} minutes remain in this sample balance.</Text>
      ) : null}
        </ScrollView>
      </ContentFadeMask>

      <AccessibleModal
        accessibilityTitle={detail?.type === 'condition' ? selectedCondition?.name ?? 'Condition details' : detail?.type === 'rules' ? statusTitle : 'Today’s balance'}
        contentContainerStyle={styles.modalPage}
        onRequestClose={() => setDetail(null)}
        scrollEnabled={false}
        style={styles.modalBackdrop}
        visible={detail !== null}
      >
        <PillowCard style={[styles.modalCard, styles.modalCardFull]} variant="light">
          {detail?.type === 'condition' && selectedCondition ? (
            <FullScreenModalPage
              footer={(
                <>
                  {!conditionsReadOnly && !selectedConditionUnavailable && selectedPrimaryLabel ? (
                    <PillButton
                      fullWidth
                      label={selectedPrimaryLabel}
                      onPress={() => {
                        setDetail(null);
                        if (selectedCondition.kind === 'rate') onOpenEarning(selectedCondition.id);
                        else if (selectedCondition.kind === 'state') onStartCondition(selectedCondition.id);
                        else onEventAction(selectedCondition.id);
                      }}
                      variant="screen"
                    />
                  ) : null}
                  <PillButton fullWidth label="Edit condition" onPress={() => { setDetail(null); onOpenCondition(selectedCondition.id); }} variant="secondary" />
                  <PillButton fullWidth label="Done" onPress={() => setDetail(null)} variant="text" />
                </>
              )}
            >
              <View style={styles.modalContentStack}>
              <ImageBackground
                accessibilityIgnoresInvertColors
                imageStyle={styles.detailBannerImage}
                source={bannerForCondition(selectedCondition)}
                style={styles.detailBanner}
              >
                <View pointerEvents="none" style={styles.detailBannerScrim} />
                <Text style={styles.detailBannerEyebrow}>{selectedCondition.kind.toUpperCase()} CONDITION</Text>
                <Text style={styles.detailBannerTitle}>{selectedCondition.name}</Text>
                <Text style={styles.detailBannerStatus}>{selectedDetail?.status.toUpperCase()}</Text>
              </ImageBackground>
              <Text style={styles.modalBody}>{selectedDetail?.rule}</Text>
              <ModalMetricRow label="Today" value={selectedDetail?.evidence ?? 'No sample evidence today.'} />
              <ModalMetricRow label="Active window" value={selectedDetail?.window ?? 'Anytime'} />
              {accessHoliday?.sourceConditionId === selectedCondition.id ? (
                <ModalMetricRow
                  label="Access result"
                  value={`Balance on hold · expires ${accessHoliday.expiresAt}`}
                />
              ) : null}
              {conditionsReadOnly || selectedConditionUnavailable ? (
                <Text style={styles.modalBody}>
                  {conditionsReadOnly
                    ? 'This condition is read-only while today’s neutral rule holiday is active.'
                    : selectedRewardOverride?.kind === 'off'
                      ? 'This condition is Off for the current Custom weekday.'
                      : 'This condition is not available in its current active window.'}
                </Text>
              ) : null}
              </View>
            </FullScreenModalPage>
          ) : detail?.type === 'rules' ? (
            <FullScreenModalPage
              footer={(
                <>
                  <PillButton fullWidth label="Edit rules" onPress={() => { setDetail(null); onOpenRules(); }} variant="screen" />
                  <PillButton fullWidth label="Done" onPress={() => setDetail(null)} variant="text" />
                </>
              )}
            >
              <View style={styles.modalCenteredCopy}>
              <Text style={styles.modalHero}>Balance on hold</Text>
              <Text style={styles.modalBody}>{statusBody}</Text>
              <Text style={styles.modalBody}>
                {mode === 'rest-day-no-locking'
                  ? 'Today is a planned Rest day. Your streak stays neutral and limits resume tomorrow.'
                  : 'You are outside the configured lock window. Limits start at 7:00 PM.'}
              </Text>
              </View>
            </FullScreenModalPage>
          ) : (
            <FullScreenModalPage
              footer={(
                <>
                  {eventHoliday && holidaySourceCondition ? (
                    <PillButton fullWidth label="View condition" onPress={() => setDetail({ type: 'condition', id: holidaySourceCondition.id })} variant="screen" />
                  ) : ruleHoliday || restDayAllowanceOnly ? (
                    <PillButton fullWidth label="View weekly rules" onPress={() => { setDetail(null); onOpenRules(); }} variant="screen" />
                  ) : (
                    <PillButton fullWidth label={visibleConditions.length === 0 ? 'Add a way to earn' : balanceFixture.primary} onPress={() => { setDetail(null); earnMore(); }} variant="screen" />
                  )}
                  <PillButton fullWidth label="See trend" onPress={() => { setDetail(null); onOpenTrend(); }} variant="text" />
                  <PillButton fullWidth label="Done" onPress={() => setDetail(null)} variant="text" />
                </>
              )}
            >
              <View style={styles.modalContentStack}>
              <Text style={styles.modalHero}>{onHoliday
                ? holidayFixture?.hero ?? statusTitle
                : dailyAllowanceMinutes === 'unlimited'
                  ? 'Unlimited'
                  : `${remainingMinutes} min left`}</Text>
              <Text style={styles.modalBody}>{onHoliday
                ? holidayCause
                : dailyAllowanceMinutes === 'unlimited'
                  ? 'Your selected apps stay available without a daily time limit.'
                  : balanceFixture.body}</Text>
              {onHoliday && holidayFixture ? (
                <>
                  <ModalMetricRow label={holidayFixture.balanceRow.label} value={`${remainingMinutes} min`} />
                  <ModalMetricRow label={holidayFixture.resumeRow.label} value={accessHoliday?.expiresAt ?? holidayFixture.resumeRow.value} />
                  <Text style={styles.modalDisclosure}>{balanceDetailFixtures.accessHolidayFooter}</Text>
                </>
              ) : balanceRows.map((row) => (
                <ModalMetricRow key={row.label} label={row.label} value={row.value} />
              ))}
              </View>
            </FullScreenModalPage>
          )}
        </PillowCard>
      </AccessibleModal>
    </FeatureScaffold>
  );
}

function formatBalanceMinutes(minutes: number) {
  const normalized = Math.max(0, Math.floor(minutes));
  if (normalized < 60) return `${normalized} min`;
  const hours = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return remainder === 0 ? `${hours}h` : `${hours}h ${String(remainder).padStart(2, '0')}m`;
}

function bannerForCondition(condition: DemoCondition) {
  if (Object.prototype.hasOwnProperty.call(assetRegistry.banners, condition.bannerId)) {
    return assetRegistry.banners[condition.bannerId as keyof typeof assetRegistry.banners];
  }
  return fallbackBanners[condition.kind];
}

function conditionPrimaryLabel(
  condition: DemoCondition,
  gymStatus: HomeSessionStatus,
  walkStatus: HomeSessionStatus,
) {
  if (condition.kind === 'rate') return 'View analysis';
  if (condition.kind === 'event') {
    if (condition.todayStatus === 'completed' || condition.todayStatus === 'crediting') return null;
    return condition.catalogId.startsWith('gym-') ? 'Check in' : 'Complete';
  }
  if (condition.catalogId.startsWith('gym-')) {
    return gymStatus === 'active' ? 'View check-in' : 'Check in';
  }
  return walkStatus === 'active' ? 'View walking session' : 'Start walking';
}

function ModalMetricRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.modalMetricRow}>
      <Text style={styles.modalMetricLabel}>{label}</Text>
      <Text style={styles.modalMetricValue}>{value}</Text>
    </View>
  );
}

function Shortcut({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <PressableScale accessibilityLabel={label} accessibilityRole="button" onPress={onPress}>
      <View style={styles.shortcut}>
        <Text style={styles.shortcutLabel}>{label}</Text>
        <ChevronIcon />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  alignRight: { textAlign: 'right' },
  balanceNote: { ...type.caption, color: colors.text.secondary, textAlign: 'center' },
  cardList: { gap: space[3] },
  conditionsSection: { gap: space[3], marginTop: space[5] },
  emptyBody: { ...type.body, color: colors.text.secondary },
  emptyCard: { alignItems: 'flex-start', gap: space[3], paddingHorizontal: 0, paddingVertical: space[3] },
  emptyTitle: { ...type.cardHeroTitle, color: colors.text.primary },
  entryBody: { ...type.body, color: colors.text.secondary },
  entryCard: { borderColor: colors.brand.signatureAmber, borderWidth: 2, gap: space[2], marginBottom: space[4] },
  entryCardFocus: { borderColor: colors.brand.signatureAmber, borderWidth: 3 },
  entryChip: { ...type.label, color: colors.text.primary },
  entryConclusion: { ...type.cardHeroTitle, color: colors.text.primary },
  entryDisclosure: { ...type.caption, color: colors.text.tertiary },
  entryDismiss: { ...type.label, color: colors.text.primary, paddingHorizontal: space[2], paddingVertical: space[2] },
  entryHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  modalBackdrop: { flex: 1 },
  modalBody: { ...type.body, color: colors.text.ink },
  modalCard: { gap: space[3], padding: space[5] },
  modalCardFull: { flex: 1, paddingBottom: 0, paddingTop: 0 },
  modalCenteredCopy: { alignItems: 'center', gap: space[3] },
  modalContentStack: { gap: space[3] },
  modalDisclosure: { ...type.caption, color: colors.text.ink },
  modalEyebrow: { ...type.micro, color: colors.text.primary },
  modalHero: { ...type.heroLg, color: colors.text.ink },
  modalMetricLabel: { ...type.label, color: colors.text.primary, width: 92 },
  modalMetricRow: { borderTopColor: colors.surface.divider, borderTopWidth: 1, flexDirection: 'row', gap: space[3], paddingTop: space[3] },
  modalMetricValue: { ...type.bodyEmphasis, color: colors.text.ink, flex: 1 },
  modalPage: { flex: 1 },
  detailBanner: { borderRadius: radius.card, gap: space[1], justifyContent: 'flex-end', minHeight: 132, overflow: 'hidden', padding: space[4] },
  detailBannerEyebrow: { ...type.label, color: colors.text.primary },
  detailBannerImage: { borderRadius: radius.card },
  detailBannerScrim: { backgroundColor: colors.surface.mediaScrim, bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  detailBannerStatus: { ...type.label, color: colors.text.primary },
  detailBannerTitle: { ...type.screenTitle, color: colors.text.primary },
  heroBlock: { alignItems: 'center', gap: space[2] },
  heroBody: { ...type.body, color: colors.text.secondary, maxWidth: 320, textAlign: 'center' },
  heroTitle: { ...type.screenTitle, color: colors.text.primary, textAlign: 'center' },
  holidayChip: { ...type.label, backgroundColor: colors.surface.cardStrong, borderRadius: radius.pill, color: colors.text.primary, overflow: 'hidden', paddingHorizontal: space[3], paddingVertical: space[2] },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitle: { ...type.sectionTitle, color: colors.text.primary },
  shortcut: { alignItems: 'center', backgroundColor: colors.surface.bubble, borderColor: colors.surface.bubbleBorder, borderRadius: radius.card, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', minHeight: layout.controlHeight, paddingHorizontal: space[4] },
  shortcutLabel: { ...type.cardTitle, color: colors.text.primary },
  shortcuts: { gap: space[2], marginBottom: space[6], marginTop: space[3] },
  stat: { alignItems: 'center', flex: 1, flexDirection: 'row', gap: space[2] },
  statPressable: { flex: 1 },
  statLabel: { ...type.statLabel, color: colors.text.secondary },
  statRight: { justifyContent: 'flex-end' },
  statValue: { ...type.statValue, color: colors.text.primary },
  statsRow: { alignItems: 'center', flexDirection: 'row', gap: space[4], marginTop: space[3], paddingVertical: space[2] },
  ruleNotice: { ...type.label, color: colors.text.primary, textAlign: 'center' },
  ruleCard: { opacity: 0.72 },
  scrollContent: { paddingBottom: layout.tabBarContentInset },
});
