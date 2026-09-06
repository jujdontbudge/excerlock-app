import { useRouter } from 'expo-router';
import { GymsScreen } from '../../src/features/settings/GymsScreen';
export default function GymsRoute() {
  const r = useRouter();
  return <GymsScreen onBack={() => r.back()} />;
}
