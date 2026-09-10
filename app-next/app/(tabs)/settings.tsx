import { useRouter, Href } from 'expo-router';
import { SettingsScreen } from '../../src/features/settings/SettingsScreen';
export default function SettingsRoute() {
  const r = useRouter();
  return <SettingsScreen navigate={(p) => r.push(('/settings/' + p) as Href)} onDev={__DEV__ ? () => r.push('/dev') : undefined} />;
}
