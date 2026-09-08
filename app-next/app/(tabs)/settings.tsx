import { useRouter, Href } from 'expo-router';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
export default function SettingsRoute() {
  const r = useRouter();
  return (
    <SettingsScreen
      navigate={(path) =>
        path === 'conditions'
          ? r.navigate('/(tabs)/conditions')
          : r.push(('/settings/' + path) as Href)
      }
      onDev={() => r.push('/dev')}
    />
  );
}
