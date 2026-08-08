import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { assetRegistry } from '@/content/assets';
import { GymSessionScreen } from '@/features/sessions';
import { useDemo } from '@/presentation';

export default function GymCheckInRoute() {
  const { conditionId, fixture } = useLocalSearchParams<{
    conditionId?: string | string[];
    fixture?: string | string[];
  }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const requestedConditionId = Array.isArray(conditionId) ? conditionId[0] : conditionId;
  const resolvedFixture = Array.isArray(fixture) ? fixture[0] : fixture;
  const debugFixture = resolvedFixture === 'debug';
  const selectedCondition = state.conditions.find((condition) => condition.id === requestedConditionId)
    ?? state.conditions.find((condition) => condition.catalogId === 'gym-arrive');
  const selectedGym = state.savedGyms.find((gym) => gym.id === selectedCondition?.gymId)
    ?? state.savedGyms.find((gym) => gym.name === selectedCondition?.context);
  const resolvedConditionId = selectedCondition?.id ?? requestedConditionId ?? 'demo-gym';
  const banner = selectedCondition && Object.prototype.hasOwnProperty.call(assetRegistry.banners, selectedCondition.bannerId)
    ? assetRegistry.banners[selectedCondition.bannerId as keyof typeof assetRegistry.banners]
    : assetRegistry.banners['gym-weights-floor'];

  useEffect(() => {
    if (state.sessions.gym !== 'verifying' || debugFixture) return;
    const timer = setTimeout(() => dispatch({ type: 'gym/verified' }), 700);
    return () => clearTimeout(timer);
  }, [debugFixture, dispatch, state.sessions.gym]);

  return (
    <GymSessionScreen
      condition={{
        kind: selectedCondition?.kind ?? 'event',
        name: selectedCondition?.name ?? 'Go to gym',
        ruleSummary: selectedCondition?.ruleSummary ?? 'Check in once to add 30 minutes.',
      }}
      gym={{
        banner,
        name: selectedGym?.name ?? selectedCondition?.context ?? 'Harbor Strength',
        radiusMeters: selectedGym?.radiusMeters ?? 100,
      }}
      onBack={() => router.replace('/(tabs)/home')}
      onCancel={() => {
        if (state.sessions.gym === 'ready') {
          router.replace('/(tabs)/home');
          return;
        }
        dispatch({ type: 'gym/cancel' });
      }}
      onDone={() => {
        if (selectedCondition?.kind === 'event') {
          dispatch({ type: 'condition/complete-event', conditionId: resolvedConditionId });
        }
        router.replace('/(tabs)/home');
      }}
      onOpenPermission={() => router.push('/settings/permission/location')}
      onRetry={() => dispatch({ type: 'gym/start', conditionId: resolvedConditionId })}
      onStart={() => dispatch({ type: 'gym/start', conditionId: resolvedConditionId })}
      onViewCondition={() => router.replace(`/(tabs)/home?conditionId=${encodeURIComponent(resolvedConditionId)}` as Href)}
      phase={state.sessions.gym}
    />
  );
}
