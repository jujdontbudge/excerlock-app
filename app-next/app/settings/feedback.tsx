import { useRouter } from 'expo-router';
import { FeedbackScreen } from '../../src/features/settings/FeedbackScreen';
export default function FeedbackRoute() {
  const r = useRouter();
  return <FeedbackScreen onBack={() => r.back()} />;
}
