import { useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { EarningDetailScreen, firstSearchParam } from '@/features/analysis';
import { useDemo } from '@/presentation';

export default function EarningDetailRoute() {
  const router = useRouter();
  const { condition, fixture } = useLocalSearchParams<{
    condition?: string | string[];
    fixture?: string | string[];
  }>();
  const { state } = useDemo();
  const [range, setRange] = useState<'week' | 'month'>('week');
  const [fallbackConditionId, setFallbackConditionId] = useState<string | null>(null);
  const showcase = state.analysis.presentationMode === 'showcase'
    || firstSearchParam(fixture) === 'showcase';
  const naturalRows = Array.from(state.analysis.activityLedger.reduce((rows, activity) => {
    const previous = rows.get(activity.conditionId);
    const conditionName = state.conditions.find((item) => item.id === activity.conditionId)?.name
      ?? 'Removed condition';
    rows.set(activity.conditionId, {
      activityCount: (previous?.activityCount ?? 0) + 1,
      id: activity.conditionId,
      name: conditionName,
      qualifyingMinutes: (previous?.qualifyingMinutes ?? 0) + activity.qualifyingMinutes,
    });
    return rows;
  }, new Map<string, { activityCount: number; id: string; name: string; qualifyingMinutes: number }>()).values());
  return (
    <EarningDetailScreen
      fallbackConditionId={fallbackConditionId}
      focusedConditionId={firstSearchParam(condition)}
      naturalRows={naturalRows}
      naturalTotalMinutes={state.home.earnedMinutesToday}
      onBack={() => router.back()}
      onConditionPress={(conditionId) => {
        if (state.conditions.some((item) => item.id === conditionId)) {
          router.push(`/(tabs)/home?conditionId=${encodeURIComponent(conditionId)}` as Href);
          return;
        }
        setFallbackConditionId(conditionId);
      }}
      onDismissFallbackCondition={() => setFallbackConditionId(null)}
      onRangeChange={setRange}
      range={range}
      showcase={showcase}
    />
  );
}
