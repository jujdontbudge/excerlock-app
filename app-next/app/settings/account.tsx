import { useRouter } from 'expo-router';
import { AccountScreen } from '../../src/features/settings/AccountScreen';
export default function AccountRoute() {
  const r = useRouter();
  return <AccountScreen onBack={() => r.back()} onSignIn={() => r.push('/sign-in')} />;
}
