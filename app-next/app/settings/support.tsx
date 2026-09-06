import { useRouter } from 'expo-router';
import { SupportScreen } from '../../src/features/settings/SupportScreen';
export default function SupportRoute() {
  const r = useRouter();
  return <SupportScreen onBack={() => r.back()} />;
}
