import { useState } from 'react';
import { Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { GymDetailScreen } from '@/features/manage';
import { useDemo, type SavedGym } from '@/presentation';

function availableGymId(gyms: readonly SavedGym[]) {
  for (let index = 1; index <= 5; index += 1) {
    const id = `sample-gym-${index}`;
    if (!gyms.some((gym) => gym.id === id)) return id;
  }
  return 'sample-gym-5';
}

export default function GymDetailRoute() {
  const { gymId = 'new', returnTo } = useLocalSearchParams<{ gymId?: string; returnTo?: string }>();
  const router = useRouter();
  const { state, dispatch } = useDemo();
  const existing = state.savedGyms.find((gym) => gym.id === gymId);
  const initial: SavedGym = existing ? { ...existing } : {
    id: availableGymId(state.savedGyms),
    name: `Sample Gym ${state.savedGyms.length + 1}`,
    radiusMeters: 100,
    detection: 'manual',
    placeType: 'honor',
    wifi: 'off',
    autoPermission: 'notAsked',
  };
  const [draft, setDraft] = useState<SavedGym>(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  const cancel = () => {
    if (!dirty) {
      router.back();
      return;
    }
    Alert.alert('Discard gym changes?', 'The saved gym will stay as it was.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  return (
    <GymDetailScreen
      autoPermission={draft.autoPermission}
      mode={draft.detection}
      name={draft.name}
      onBack={cancel}
      onChangeAutoPermission={(autoPermission) => setDraft((current) => ({ ...current, autoPermission }))}
      onChangeMode={(detection) => setDraft((current) => ({ ...current, detection }))}
      onChangeName={(name) => setDraft((current) => ({ ...current, name }))}
      onChangePlaceType={(placeType) => setDraft((current) => ({ ...current, placeType }))}
      onChangeRadius={(radiusMeters) => setDraft((current) => ({ ...current, radiusMeters }))}
      onChangeWifi={(wifi) => setDraft((current) => ({ ...current, wifi }))}
      onRemove={existing ? () => Alert.alert(
        `Remove ${existing.name}?`,
        'Conditions using this sample gym will need another place. Past sample Analysis entries remain.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              dispatch({ type: 'gym/remove', gymId: existing.id });
              router.replace('/saved-gyms');
            },
          },
        ],
      ) : undefined}
      onSave={() => {
        dispatch({ type: 'gym/save', gym: draft });
        if (returnTo === 'builder') router.back();
        else router.replace('/saved-gyms');
      }}
      placeType={draft.placeType}
      radiusMeters={draft.radiusMeters}
      screenTitle={existing ? draft.name : 'Add a gym'}
      wifi={draft.wifi}
    />
  );
}
