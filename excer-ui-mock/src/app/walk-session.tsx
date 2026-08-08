import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { WalkSessionScreen } from '@/features/sessions';
import { useDemo } from '@/presentation';

export default function WalkSessionRoute() {
  const { conditionId, fixture } = useLocalSearchParams<{
    conditionId?: string | string[];
    fixture?: string | string[];
  }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const requestedConditionId = Array.isArray(conditionId) ? conditionId[0] : conditionId;
  const resolvedFixture = Array.isArray(fixture) ? fixture[0] : fixture;
  const debugFixture = resolvedFixture === 'debug';
  const activeCondition = state.conditions.find(
    (condition) => condition.id === requestedConditionId && condition.kind === 'state',
  ) ?? state.conditions.find((condition) => condition.catalogId === 'walk-state');

  useEffect(() => {
    if (state.sessions.walk !== 'verifying' || debugFixture) return;
    const timer = setTimeout(() => dispatch({ type: 'walk/verified' }), 700);
    return () => clearTimeout(timer);
  }, [debugFixture, dispatch, state.sessions.walk]);

  useEffect(() => {
    if (state.sessions.walk !== 'paused' || debugFixture) return;
    const timer = setTimeout(() => dispatch({ type: 'walk/enter-grace' }), 700);
    return () => clearTimeout(timer);
  }, [debugFixture, dispatch, state.sessions.walk]);

  return (
    <WalkSessionScreen
      alwaysShow={state.settings.walkAlwaysShow}
      conditionSummary={activeCondition ? {
        ruleSummary: activeCondition.ruleSummary,
        title: activeCondition.name,
      } : undefined}
      graceDurationSeconds={activeCondition?.stateGraceSeconds ?? 42}
      onBack={() => router.replace('/(tabs)/home')}
      onCancel={() => {
        dispatch({ type: 'walk/cancel' });
        router.replace('/(tabs)/home');
      }}
      onEnd={(reason) => dispatch({ type: 'walk/end', reason })}
      onGraceExpired={() => {
        if (!debugFixture) dispatch({ type: 'walk/end', reason: 'stopped' });
      }}
      onOpenPermission={(permission) => router.push(`/settings/permission/${permission}`)}
      onPause={() => dispatch({ type: 'walk/pause' })}
      onResume={() => dispatch({ type: 'walk/resume' })}
      onStart={() => dispatch({ type: 'walk/start', conditionId: activeCondition?.id })}
      onToggleAlwaysShow={(value) => dispatch({ type: 'settings/set-walk-always-show', value })}
      onWhyLocked={() => router.push('/lock-moment/walk-ended')}
      phase={state.sessions.walk}
    />
  );
}
