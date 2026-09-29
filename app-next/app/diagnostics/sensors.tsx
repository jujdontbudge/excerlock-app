import { useRouter } from 'expo-router';
import { SensorSmokeScreen } from '../../src/packages/dev-harness/SensorSmokeScreen';
import { useDevProtectedRouteMount } from '../../src/packages/launch/DevProtectedRouteMount';
export default function SensorSmokeRoute() {
  useDevProtectedRouteMount();
  const r = useRouter();
  return <SensorSmokeScreen onBack={() => (r.canGoBack() ? r.back() : r.replace('/'))} />;
}
