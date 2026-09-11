import { useRouter } from 'expo-router';
import { SubscriptionScreen } from '../../src/features/settings/SubscriptionScreen';
export default function SubscriptionRoute() {
  const r = useRouter();
  return <SubscriptionScreen onBack={() => r.back()} />;
}
