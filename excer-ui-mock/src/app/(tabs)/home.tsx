import { useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import {
  HomeScreen,
  shouldPlayHomeUnlockHaptic,
  type HomeScrollHandle,
} from '@/features/home';
import {
  formatMinutes,
  getCurrentAllowanceMinutes,
  getCurrentRewardOverride,
  getHomeModel,
  isCurrentRestDayAllowanceOnly,
  isConditionExecutableNow,
  useDemo,
} from '@/presentation';

type HomeTabNavigation = {
  addListener: (event: 'tabPress', listener: () => void) => () => void;
  isFocused: () => boolean;
};

export default function HomeRoute() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as HomeTabNavigation;
  const { conditionId, entry } = useLocalSearchParams<{
    conditionId?: string | string[];
    entry?: string | string[];
  }>();
  const { state, dispatch } = useDemo();
  const reduceMotion = useReducedMotion();
  const hasHapticked = useRef(false);
  const scrollRef = useRef<HomeScrollHandle>(null);
  const model = getHomeModel(state);
  const visibleConditions = state.conditions.filter((condition) => condition.enabled);
  const currentRewardOverrides = Object.fromEntries(
    visibleConditions.flatMap((condition) => {
      const override = getCurrentRewardOverride(state, condition.id);
      return override ? [[condition.id, override] as const] : [];
    }),
  );
  const executableConditionIds = visibleConditions
    .filter((condition) => isConditionExecutableNow(state, condition))
    .map((condition) => condition.id);
  const requestedConditionId = Array.isArray(conditionId) ? conditionId[0] : conditionId;
  const currentDayActivity = [...state.analysis.activityLedger]
    .reverse()
    .find((activity) => activity.dayKey === state.clock.dayKey);
  const currentDayActivityKind = state.conditions.find(
    (condition) => condition.id === currentDayActivity?.conditionId,
  )?.kind;
  const walkStatus =
    state.sessions.walk === 'active'
      ? 'active'
      : state.sessions.walk === 'verifying'
        ? 'verifying'
        : state.sessions.walk === 'ended-by-user' || state.sessions.walk === 'ended-stopped'
          ? 'ended'
          : 'inactive';
  const gymStatus =
    state.sessions.gym === 'verified'
      ? 'active'
      : state.sessions.gym === 'verifying'
        ? 'verifying'
        : state.sessions.gym === 'failed'
          ? 'ended'
          : 'inactive';
  const shouldHaptic = shouldPlayHomeUnlockHaptic(
    state.home.mode,
    state.home.earnTransition?.targetMode,
  );

  useEffect(() => navigation.addListener('tabPress', () => {
    if (navigation.isFocused()) scrollRef.current?.scrollTo({ animated: !reduceMotion, y: 0 });
  }), [navigation, reduceMotion]);

  useEffect(() => {
    if (!state.home.earnTransition) {
      hasHapticked.current = false;
      return;
    }
    if (!hasHapticked.current && shouldHaptic && state.settings.haptics) {
      hasHapticked.current = true;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const timer = setTimeout(() => dispatch({ type: 'home/settle-earn' }), 900);
    return () => clearTimeout(timer);
  }, [dispatch, shouldHaptic, state.home.earnTransition, state.settings.haptics]);

  return (
    <HomeScreen
      accessHoliday={state.home.accessHoliday}
      conditions={visibleConditions}
      currentRewardOverrides={currentRewardOverrides}
      currentStreakDays={state.analysis.currentStreakDays}
      dailyAllowanceMinutes={getCurrentAllowanceMinutes(state)}
      earnTransitionMinutes={state.home.earnTransition?.pendingMinutes}
      earnedMinutesToday={state.home.earnedMinutesToday}
      executableConditionIds={executableConditionIds}
      entry={(Array.isArray(entry) ? entry[0] : entry) === 'nudge' ? 'nudge' : (Array.isArray(entry) ? entry[0] : entry) === 'lastCall' ? 'lastCall' : undefined}
      hasMeaningfulActivityToday={currentDayActivity !== undefined}
      mode={model.mode}
      onAddCondition={() => router.push('/condition-builder?returnTo=home')}
      onAnalysis={() => router.push('/(tabs)/analysis')}
      onDismissEntry={() => {
        dispatch({ type: 'notification/dismiss' });
        router.replace('/(tabs)/home');
      }}
      onEdit={() => router.push('/(tabs)/manage')}
      onEventAction={(conditionId) => {
        const condition = state.conditions.find((item) => item.id === conditionId);
        if (!condition || !isConditionExecutableNow(state, condition)) return;
        if (condition.catalogId.startsWith('gym-')) {
          router.push(`/gym-check-in?conditionId=${conditionId}` as Href);
          return;
        }
        dispatch({ type: 'condition/complete-event', conditionId });
      }}
      onOpenCondition={(conditionId) => router.push(`/condition-builder?conditionId=${conditionId}&returnTo=home` as Href)}
      onOpenEarning={(conditionId) => router.push(`/analysis/earning?condition=${encodeURIComponent(conditionId)}` as Href)}
      onOpenRules={() => router.push('/manage/rules')}
      onOpenTimeLocked={() => router.push(
        `/analysis/day/${state.clock.dayKey}?kind=${state.analysis.history === 'empty' ? 'blank' : currentDayActivityKind ?? 'rate'}` as Href,
      )}
      onOpenTrend={() => router.push('/analysis/trend/time-reclaimed')}
      onStartCondition={(conditionId) => {
        const condition = state.conditions.find((item) => item.id === conditionId);
        if (!condition || !isConditionExecutableNow(state, condition)) return;
        const pathname = condition?.catalogId.startsWith('gym-') ? '/gym-check-in' : '/walk-session';
        router.push(`${pathname}?conditionId=${encodeURIComponent(conditionId)}` as Href);
      }}
      openConditionId={requestedConditionId}
      remainingMinutes={model.remainingMinutes}
      restDayAllowanceOnly={isCurrentRestDayAllowanceOnly(state)}
      scrollRef={scrollRef}
      screenTimeLabel={formatMinutes(state.home.screenTimeUsedMinutes)}
      screenTimeUsedMinutes={state.home.screenTimeUsedMinutes}
      showcaseAnalysis={state.analysis.presentationMode === 'showcase'}
      statusBody={model.body}
      statusTitle={model.status}
      timeLockedLabel={model.timeLockedLabel}
      gymStatus={gymStatus}
      walkStatus={walkStatus}
    />
  );
}
