import { useRouter } from 'expo-router';
import { UnitsScreen } from '../../src/features/settings/UnitsScreen';
export default function UnitsRoute() {
  const r = useRouter();
  return <UnitsScreen onBack={() => r.back()} />;
}
