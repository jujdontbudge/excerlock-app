import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNavigation, useRouter, type Href } from 'expo-router';

import { ManageScreen, type ManageScrollHandle } from '@/features/manage';
import { assetRegistry } from '@/content';
import { useDemo } from '@/presentation';

type ManageTabNavigation = {
  addListener: (event: 'tabPress', listener: () => void) => () => void;
  isFocused: () => boolean;
};

export default function ManageRoute() {
  const router = useRouter();
  const navigation = useNavigation() as unknown as ManageTabNavigation;
  const { state, dispatch } = useDemo();
  const scrollRef = useRef<ManageScrollHandle>(null);

  useEffect(() => navigation.addListener('tabPress', () => {
    if (navigation.isFocused()) scrollRef.current?.scrollTo({ animated: true, y: 0 });
  }), [navigation]);

  return (
    <ManageScreen
      conditions={state.conditions.map((condition) => ({
        banner: Object.prototype.hasOwnProperty.call(assetRegistry.banners, condition.bannerId)
          ? assetRegistry.banners[condition.bannerId as keyof typeof assetRegistry.banners]
          : undefined,
        enabled: condition.enabled,
        id: condition.id,
        name: condition.name,
        subtitle: condition.ruleSummary,
      }))}
      lockedAppCount={state.onboarding.selectedApps.length}
      onAddCondition={() => router.push('/condition-builder?returnTo=manage')}
      onEditCondition={(id) => router.push(`/condition-builder?conditionId=${id}&returnTo=manage` as Href)}
      onMoveCondition={(conditionId) => Alert.alert(
        'Move condition',
        'Choose where this condition should move in the local list.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Move up', onPress: () => dispatch({ type: 'condition/move', conditionId, direction: 'up' }) },
          { text: 'Move down', onPress: () => dispatch({ type: 'condition/move', conditionId, direction: 'down' }) },
        ],
      )}
      onOpenLockedApps={() => router.push('/locked-apps')}
      onOpenRules={() => router.push('/manage/rules')}
      onRemoveCondition={(conditionId) => {
        const condition = state.conditions.find((item) => item.id === conditionId);
        Alert.alert(
          `Remove ${condition ? `“${condition.name}”` : 'this condition'}?`,
          'The condition will leave Home and Manage. Past sample Analysis entries remain.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'condition/remove', conditionId }) },
          ],
        );
      }}
      onToggleCondition={(conditionId, enabled) => dispatch({ type: 'condition/toggle', conditionId, enabled })}
      rulesSummary={[
        state.rules.allowanceMinutes === 'unlimited' ? 'Unlimited' : `${state.rules.allowanceMinutes} min`,
        state.rules.rolloverEnabled ? `${state.rules.rolloverCapMinutes} min rollover` : 'Rollover off',
        state.rules.missedDayPolicy === 'grace' ? 'One cushion' : 'Reset streak',
        `${Object.values(state.rules.weekly.dayModes).filter((mode) => mode === 'active').length} active days`,
        ...(state.rules.weekly.todayRestReason ? ['Rest today'] : []),
        `${state.savedGyms.length} ${state.savedGyms.length === 1 ? 'gym' : 'gyms'}`,
      ].join(' · ')}
      scrollRef={scrollRef}
    />
  );
}
