import { useRouter } from 'expo-router';
import { RecoveryScreen } from '../src/packages/settings/RecoveryScreen';
import { beginPaywall, beginSignIn, beginWelcome } from '../src/packages/journey/index';
export default function RecoveryRoute() {
  const router = useRouter();
  const back = () => { beginWelcome(); router.replace('/onboarding/O01'); };
  const signIn = () => { beginSignIn(); router.replace({ pathname: '/sign-in', params: { purpose: 'signIn' } }); };
  const restored = () => { beginPaywall(); router.replace('/paywall'); };
  return <RecoveryScreen onBack={back} onSignIn={signIn} onRestored={restored} />;
}
