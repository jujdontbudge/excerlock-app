import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { DayDetailScreen, firstSearchParam, formatDayDetailDate, resolveDayDetailKind } from '@/features/analysis';
import { useDemo } from '@/presentation';

export default function DayDetailRoute() {
  const { date, kind } = useLocalSearchParams<{
    date?: string | string[];
    kind?: string | string[];
  }>();
  const router = useRouter();
  const { state } = useDemo();
  const requestedDate = firstSearchParam(date);
  const recordedActivity = firstSearchParam(kind) === undefined
    && state.analysis.presentationMode === 'natural'
    ? state.analysis.activityLedger.find((activity) => activity.dayKey === requestedDate)
    : undefined;
  const recordedCondition = state.conditions.find(
    (condition) => condition.id === recordedActivity?.conditionId,
  );
  const resolved = recordedCondition?.kind ?? resolveDayDetailKind(date, kind);
  const firedConditionId = recordedCondition?.id ?? (resolved === 'event'
    ? 'demo-gym'
    : resolved === 'state'
      ? 'demo-walk'
      : resolved === 'rate'
        ? 'demo-steps'
        : null);
  const openEarning = (conditionId: string) => router.push(`/analysis/earning?condition=${encodeURIComponent(conditionId)}` as Href);
  const startCheapestCondition = () => {
    const enabled = state.conditions.filter((condition) => condition.enabled);
    const condition = enabled.find((item) => item.kind === 'state') ?? enabled[0];
    if (!condition) {
      router.push('/condition-builder?returnTo=analysis');
      return;
    }
    if (condition.catalogId.startsWith('gym-')) {
      router.push(`/gym-check-in?conditionId=${encodeURIComponent(condition.id)}` as Href);
      return;
    }
    if (condition.kind === 'state' || condition.catalogId.startsWith('walk-')) {
      router.push(`/walk-session?conditionId=${encodeURIComponent(condition.id)}` as Href);
      return;
    }
    router.push(`/(tabs)/home?conditionId=${encodeURIComponent(condition.id)}` as Href);
  };

  return (
    <DayDetailScreen
      conditionOverride={recordedActivity && recordedCondition ? {
        id: recordedCondition.id,
        label: recordedCondition.name,
        value: `${recordedActivity.qualifyingMinutes} qualifying min`,
      } : undefined}
      dateLabel={formatDayDetailDate(requestedDate)}
      detailOverride={recordedActivity && recordedCondition ? {
        evidence: `${recordedCondition.name} met its ${recordedCondition.kind} condition in local demo state.`,
        status: 'Qualifying activity',
        values: `${recordedActivity.qualifyingMinutes} qualifying min`,
      } : undefined}
      kind={resolved}
      onBack={() => router.back()}
      onConditionPress={openEarning}
      onPrimary={() => {
        if (firedConditionId) {
          openEarning(firedConditionId);
          return;
        }
        if (resolved === 'missed') {
          startCheapestCondition();
          return;
        }
        router.back();
      }}
    />
  );
}
