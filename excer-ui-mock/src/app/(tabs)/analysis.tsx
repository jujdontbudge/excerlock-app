import { useEffect, useRef, useState } from 'react';
import { useLocalSearchParams, useNavigation, useRouter, type Href } from 'expo-router';

import { AnalysisScreen, type AnalysisRange, type AnalysisScrollHandle } from '@/features/analysis';
import { useDemo } from '@/presentation';

type AnalysisTabNavigation = {
  addListener: (event: 'tabPress', listener: () => void) => () => void;
  isFocused: () => boolean;
};

export default function AnalysisRoute() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as AnalysisTabNavigation;
  const { entry, fixture, scrollToTop } = useLocalSearchParams<{
    entry?: string;
    fixture?: string;
    scrollToTop?: string | string[];
  }>();
  const { state, dispatch } = useDemo();
  const [range, setRange] = useState<AnalysisRange>('week');
  const scrollRef = useRef<AnalysisScrollHandle>(null);
  const enteredFromRecap = entry === 'recap';
  const history = enteredFromRecap
    ? 'populated'
    : fixture === 'empty' || fixture === 'populated'
    ? fixture
    : state.analysis.history;
  const showcase = fixture === 'empty'
    ? false
    : enteredFromRecap
      || fixture === 'populated'
      || state.analysis.presentationMode === 'showcase';
  const activityDays = Array.from(new Map(
    state.analysis.activityLedger.map((activity) => {
      const kind = state.conditions.find(
        (condition) => condition.id === activity.conditionId,
      )?.kind ?? 'event';
      return [activity.dayKey, { date: activity.dayKey, kind }] as const;
    }),
  ).values());

  useEffect(() => navigation.addListener('tabPress', () => {
    if (navigation.isFocused()) scrollRef.current?.scrollTo({ animated: true, y: 0 });
  }), [navigation]);

  useEffect(() => {
    if (scrollToTop !== undefined) scrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, [scrollToTop]);

  return (
    <AnalysisScreen
      activityCount={state.analysis.activityCount}
      activityDays={activityDays}
      currentStreakDays={state.analysis.currentStreakDays}
      earnedMinutes={state.home.earnedMinutesToday}
      entryContext={enteredFromRecap ? 'recap' : undefined}
      freshRecap={enteredFromRecap}
      history={history}
      onBadgePress={(badgeId) => router.push(`/analysis/badge/${badgeId}` as Href)}
      onDayPress={(date) => router.push(`/analysis/day/${encodeURIComponent(date)}` as Href)}
      onEarningPress={() => router.push('/analysis/earning')}
      onMethodPress={() => router.push('/analysis/trend/time-reclaimed')}
      onDismissEntryContext={() => {
        dispatch({ type: 'notification/dismiss' });
        router.replace('/(tabs)/analysis');
      }}
      onMilestoneShelfVisible={() => dispatch({ type: 'analysis/mark-milestone-shelf-seen' })}
      onRangeChange={setRange}
      onShareRecap={() => router.push('/share-achievement?type=recap')}
      onStartToday={() => router.push('/condition-builder')}
      onTrendPress={() => router.push('/analysis/trend/time-reclaimed')}
      range={range}
      scrollRef={scrollRef}
      showcase={showcase}
      showRecap={enteredFromRecap || (history === 'populated' && showcase)}
      startWeek={state.settings.startWeek}
      timeLockedMinutes={state.analysis.timeLockedMinutes}
    />
  );
}
