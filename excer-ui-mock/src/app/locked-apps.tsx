import { useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { LockedAppsScreen } from '@/features/manage';
import { lockedAppsCopy } from '@/content';
import { useDemo } from '@/presentation';

export default function LockedAppsRoute() {
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const [selectedIds, setSelectedIds] = useState<string[]>(() => [...state.onboarding.selectedApps]);
  const initialKey = useMemo(() => [...state.onboarding.selectedApps].sort().join('|'), [state.onboarding.selectedApps]);
  const draftKey = [...selectedIds].sort().join('|');
  const dirty = draftKey !== initialKey;

  const cancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert(
      'Discard app changes?',
      'Your current locked-app selection will stay as it was.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: () => router.back() },
      ],
    );
  };

  const commit = () => {
    const allIds = new Set([...state.onboarding.selectedApps, ...selectedIds]);
    allIds.forEach((appId) => {
      if (selectedIds.includes(appId) !== state.onboarding.selectedApps.includes(appId)) {
        dispatch({ type: 'onboarding/toggle-app', appId });
      }
    });
    router.back();
  };

  return (
    <LockedAppsScreen
      onBack={cancel}
      onDone={commit}
      onOpenExplainer={() => Alert.alert(
        lockedAppsCopy.explainer.title,
        `${lockedAppsCopy.explainer.body}\n\n${lockedAppsCopy.explainer.note}`,
        [{ text: lockedAppsCopy.explainer.action }],
      )}
      onToggleApp={(appId, selected) => {
        setSelectedIds((current) => selected
          ? current.includes(appId) ? current : [...current, appId]
          : current.filter((id) => id !== appId));
      }}
      selectedIds={selectedIds}
    />
  );
}
