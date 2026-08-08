import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { milestoneFixtures } from '@/content';
import { BadgeDetailScreen, firstSearchParam, type BadgeDetailStatus } from '@/features/analysis';
import { useDemo } from '@/presentation';

export default function BadgeDetailRoute() {
  const { badgeId, fixture } = useLocalSearchParams<{
    badgeId?: string | string[];
    fixture?: string | string[];
  }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const requestedBadgeId = firstSearchParam(badgeId);
  const requestedFixture = firstSearchParam(fixture);
  const badge = milestoneFixtures.find((item) => item.assetId === requestedBadgeId) ?? milestoneFixtures[0];
  const naturalPresentation = requestedFixture === undefined
    && state.analysis.presentationMode === 'natural';
  const naturalProgress = badge.threshold.unit === 'days'
    ? state.analysis.currentStreakDays
    : badge.threshold.unit === 'activities'
      ? state.analysis.activityCount
      : state.analysis.timeLockedMinutes / 60;
  const status: BadgeDetailStatus = requestedFixture === 'new'
    ? 'new'
    : requestedFixture === 'unlocked'
      ? 'unlocked'
      : requestedFixture === 'locked' || state.analysis.history === 'empty'
        ? 'locked'
        : state.analysis.newBadgeIds.includes(badge.assetId)
          ? 'new'
          : state.analysis.presentationMode === 'natural'
            ? naturalProgress >= badge.threshold.value ? 'unlocked' : 'locked'
            : badge.status === 'unlocked' || badge.status === 'new'
              ? 'unlocked'
              : 'locked';
  const locked = status === 'locked';
  const suggestedCondition = state.conditions.find((condition) => condition.enabled);
  return (
    <BadgeDetailScreen
      badge={badge}
      currentProgress={naturalPresentation ? naturalProgress : undefined}
      onBack={() => router.back()}
      onClearNew={() => dispatch({ type: 'analysis/clear-badge-new', badgeId: badge.assetId })}
      onPrimary={() => locked
        ? suggestedCondition
          ? router.push(`/(tabs)/home?conditionId=${encodeURIComponent(suggestedCondition.id)}` as Href)
          : router.push('/condition-builder?returnTo=analysis')
        : router.push(`/share-achievement?type=milestone&badgeId=${encodeURIComponent(badge.assetId)}` as Href)}
      status={status}
      useFixtureHistory={!naturalPresentation}
    />
  );
}
