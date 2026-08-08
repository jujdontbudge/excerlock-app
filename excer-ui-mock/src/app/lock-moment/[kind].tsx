import { useEffect } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { timeOutNotice } from '@/content';
import { cheapestAvailableCondition } from '@/features/home';
import { ShieldPreviewScreen, TimeOutScreen, type ShieldVariantId } from '@/features/lock-moments';
import { isConditionExecutableNow, useDemo, type DemoCondition } from '@/presentation';

const shieldKinds: ShieldVariantId[] = ['balance-empty', 'full-lock', 'walk-ended', 'schedule'];

function conditionDestination(condition: DemoCondition): Href {
  const conditionId = encodeURIComponent(condition.id);
  if (condition.catalogId.startsWith('gym-')) return `/gym-check-in?conditionId=${conditionId}` as Href;
  if (condition.kind === 'state') return `/walk-session?conditionId=${conditionId}` as Href;
  return `/(tabs)/home?conditionId=${conditionId}` as Href;
}

function conditionPrimaryLabel(condition: DemoCondition) {
  if (condition.catalogId.startsWith('gym-')) return timeOutNotice.gymPrimary;
  if (condition.kind === 'state') return timeOutNotice.primary;
  return timeOutNotice.conditionPrimary(condition.name);
}

export default function LockMomentRoute() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const cheapestCondition = cheapestAvailableCondition(
    state.conditions.filter((condition) => isConditionExecutableNow(state, condition)),
  );
  const noCandidateCopy = state.conditions.some((condition) => condition.enabled)
    ? timeOutNotice.unavailable
    : timeOutNotice.empty;
  const recoveryBody = cheapestCondition
    ? timeOutNotice.conditionBody(cheapestCondition.name)
    : noCandidateCopy.body;
  const primaryDestination = cheapestCondition
    ? conditionDestination(cheapestCondition)
    : '/(tabs)/home';
  const seeAllDestination = cheapestCondition
    ? `/(tabs)/home?conditionId=${encodeURIComponent(cheapestCondition.id)}` as Href
    : '/(tabs)/home';

  useEffect(() => {
    dispatch({ type: 'review/suppress-after-shield' });
  }, [dispatch]);

  if (kind === 'time-out') {
    return (
      <TimeOutScreen
        body={recoveryBody}
        helper={cheapestCondition ? undefined : noCandidateCopy.helper}
        onBackHome={cheapestCondition ? () => router.replace('/(tabs)/home') : undefined}
        onPrimary={() => router.replace(primaryDestination)}
        onSeeAll={cheapestCondition ? () => router.replace(seeAllDestination) : undefined}
        primaryLabel={cheapestCondition
          ? conditionPrimaryLabel(cheapestCondition)
          : noCandidateCopy.primary}
      />
    );
  }

  const variant = shieldKinds.includes(kind as ShieldVariantId) ? kind as ShieldVariantId : 'balance-empty';
  return (
    <ShieldPreviewScreen
      onClose={() => router.back()}
      onPrimary={(selected) => {
        if (selected === 'walk-ended') {
          dispatch({ type: 'walk/start' });
          router.replace('/walk-session');
        }
        else if (selected === 'schedule') router.back();
        else router.replace('/lock-moment/time-out');
      }}
      subtitle={variant === 'balance-empty' || variant === 'full-lock' ? recoveryBody : undefined}
      variant={variant}
    />
  );
}
