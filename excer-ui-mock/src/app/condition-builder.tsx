import { useEffect, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import {
  ConditionBuilderScreen,
  hasBuilderAppleHealthAccess,
} from '@/features/condition-builder';
import { getBuilderScreen, useDemo } from '@/presentation';

export default function ConditionBuilderRoute() {
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const params = useLocalSearchParams<{ conditionId?: string | string[]; mode?: string | string[]; returnTo?: string | string[] }>();
  const conditionId = firstParam(params.conditionId);
  const mode = firstParam(params.mode);
  const returnTo = firstParam(params.returnTo);
  const initializationKey = conditionId ? `edit:${conditionId}` : `new:${mode ?? 'default'}`;
  const initializedRef = useRef<string | null>(null);

  useEffect(() => {
    if (initializedRef.current === initializationKey) return;
    initializedRef.current = initializationKey;
    if (conditionId) dispatch({ type: 'builder/start-edit', conditionId });
    else dispatch({ type: 'builder/start' });
  }, [conditionId, dispatch, initializationKey]);

  const model = getBuilderScreen(state);
  const hasDraftChanges = useMemo(
    () => Boolean(
      state.builder.editingConditionId ||
      state.builder.catalogId ||
      state.builder.gymId ||
      state.builder.eventThreshold !== null ||
      state.builder.stateGraceSeconds !== null ||
      state.builder.rateMinutes !== null ||
      state.builder.reward ||
      state.builder.bannerId,
    ),
    [state.builder],
  );

  const close = () => {
    const discard = () => {
      dispatch({ type: 'builder/cancel' });
      router.back();
    };
    if (!hasDraftChanges) {
      discard();
      return;
    }
    Alert.alert(
      'Discard this condition?',
      'Your unfinished choices will be removed from this demo.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: discard },
      ],
    );
  };

  const destination = conditionId || returnTo === 'manage'
    ? returnTo === 'analysis'
      ? '/(tabs)/analysis'
      : returnTo === 'home'
        ? '/(tabs)/home'
        : '/(tabs)/manage'
    : mode === 'customReward' || returnTo === 'weekly-rules'
      ? '/weekly-rules'
      : '/(tabs)/home';

  return (
    <ConditionBuilderScreen
      canContinue={model.canContinue}
      draft={state.builder}
      appleHealthAvailable={hasBuilderAppleHealthAccess({
        connected: state.settings.healthConnected,
        permissionOutcome: state.onboarding.permissionOutcomes.health,
      })}
      existingConditions={state.conditions.filter(
        (condition) => condition.id !== state.builder.editingConditionId,
      )}
      onAddGym={() => router.push('/gym/new?returnTo=builder')}
      onBack={() => dispatch({ type: 'builder/back' })}
      onClose={close}
      onContinue={() => dispatch({ type: 'builder/continue' })}
      onDelete={conditionId ? () => Alert.alert(
        `Delete “${state.builder.name}”?`,
        'The condition will leave Home and Manage. Past sample Analysis entries stay in place.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'condition/remove', conditionId });
              dispatch({ type: 'builder/cancel' });
              router.replace('/(tabs)/manage');
            },
          },
        ],
      ) : undefined}
      onEditGym={(gymId) => router.push(`/gym/${gymId}?returnTo=builder` as Href)}
      onPreviewAction={() => Alert.alert('Exact card preview', 'This is the saved card’s local appearance. Complete and detail actions become active after you save it.')}
      onSave={() => {
        dispatch({ type: 'builder/save' });
        router.replace(destination as Href);
      }}
      onSelectActiveWindow={(value) => dispatch({ type: 'builder/set-active-window', value })}
      onSelectActiveWindowTime={(edge, minutes) => dispatch({
        type: 'builder/set-active-window-time',
        edge,
        minutes,
      })}
      onSelectBanner={(bannerId) => dispatch({ type: 'builder/set-banner', bannerId })}
      onSelectCatalog={(catalogId) => dispatch({ type: 'builder/select-catalog', catalogId })}
      onSelectCooldown={(minutes) => dispatch({ type: 'builder/set-cooldown', minutes })}
      onSelectDailyCap={(value) => dispatch({ type: 'builder/set-daily-cap', value })}
      onSetEnabled={(enabled) => dispatch({ type: 'builder/set-enabled', enabled })}
      onSetName={(name) => dispatch({ type: 'builder/set-name', name })}
      onSelectEventThreshold={(value) => dispatch({ type: 'builder/set-event-threshold', value })}
      onSelectGym={(gymId) => dispatch({ type: 'builder/set-place', gymId })}
      onSelectRateMinutes={(minutes) => dispatch({ type: 'builder/set-rate-minutes', minutes })}
      onSelectRepeatable={(value) => dispatch({ type: 'builder/set-repeatable', value })}
      onSelectReward={(reward, minutes) => dispatch({ type: 'builder/set-reward', reward, minutes })}
      onSelectStateGrace={(seconds) => dispatch({ type: 'builder/set-state-grace', seconds })}
      primaryLabel={model.primaryLabel}
      savedGyms={state.savedGyms}
      title={model.title}
      units={state.settings.units}
    />
  );
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
