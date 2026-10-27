import { useRouter } from 'expo-router';
import { AccountScreen } from '../../src/packages/settings/AccountScreen';
export default function AccountRoute() {
  const r = useRouter();
  return <AccountScreen onBack={() => r.back()} onSave={() => r.push('/sign-in?purpose=save')} />;
}
