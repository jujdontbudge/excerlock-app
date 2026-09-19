import { useRouter } from 'expo-router';
import { SensorSmokeScreen } from '../../src/features/diagnostics/SensorSmokeScreen';
export default function SensorSmokeRoute() {
  const r = useRouter();
  return <SensorSmokeScreen onBack={() => (r.canGoBack() ? r.back() : r.replace('/'))} />;
}
