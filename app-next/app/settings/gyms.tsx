import { useRouter } from 'expo-router';
import { GymsScreen } from '../../src/packages/settings/GymsScreen';
export default function GymsRoute() {
  const r = useRouter();
  return <GymsScreen onBack={() => r.back()} />;
}
