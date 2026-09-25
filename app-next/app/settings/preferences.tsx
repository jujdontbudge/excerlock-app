import { useRouter, Href } from 'expo-router';
import { PreferencesScreen } from '../../src/packages/settings/PreferencesScreen';
export default function PreferencesRoute() {
  const r = useRouter();
  return <PreferencesScreen onBack={() => r.back()} navigate={(p) => r.push(('/settings/' + p) as Href)} />;
}
