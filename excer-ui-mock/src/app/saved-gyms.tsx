import { Alert } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { SavedGymsScreen } from '@/features/manage';
import { useDemo } from '@/presentation';

export default function SavedGymsRoute() {
  const router = useRouter();
  const { state, dispatch } = useDemo();
  return (
    <SavedGymsScreen
      gyms={state.savedGyms.map((gym) => ({
        id: gym.id,
        name: gym.name,
        subtitle: `${gym.radiusMeters} m · ${gym.detection === 'auto' ? 'Auto-detect preview' : 'Manual check-in'} · ${gym.placeType === 'verified' ? 'Verified gym' : 'Honor system'}${gym.wifi === 'sample' ? ' · Sample Wi-Fi' : ''}`,
      }))}
      onAdd={() => router.push('/gym/new')}
      onBack={() => router.back()}
      onEdit={(gymId) => router.push(`/gym/${gymId}` as Href)}
      onRemove={(gymId) => {
        const gym = state.savedGyms.find((item) => item.id === gymId);
        if (!gym) return;
        Alert.alert(
          `Remove ${gym.name}?`,
          'Conditions using this sample gym will need another place. Past sample Analysis entries remain.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove', style: 'destructive', onPress: () => dispatch({ type: 'gym/remove', gymId }) },
          ],
        );
      }}
    />
  );
}
