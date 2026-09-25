import { useRouter } from 'expo-router';
import { UnitsScreen } from '../../src/packages/settings/UnitsScreen';
export default function UnitsRoute() {
  const r = useRouter();
  return <UnitsScreen onBack={() => r.back()} />;
}
