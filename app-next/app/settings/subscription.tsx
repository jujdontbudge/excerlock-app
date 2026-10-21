import { useRouter } from 'expo-router';
import { SubscriptionScreen } from '../../src/packages/settings/SubscriptionScreen';
export default function SubscriptionRoute() {
  const r = useRouter();
  return <SubscriptionScreen onBack={() => r.canGoBack() ? r.back() : r.replace('/(tabs)/settings')} onPlans={() => r.push('/paywall')} />;
}
