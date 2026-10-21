import { useRouter } from 'expo-router';
import { RecoveryScreen } from '../src/packages/settings/RecoveryScreen';
import { beginPaywall, beginSignIn } from '../src/packages/journey/index';
import { resumeOnboarding } from '../src/packages/onboarding/resumeOnboarding';
export default function RecoveryRoute() {
  const router = useRouter();
  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace(resumeOnboarding());
  };
  const signIn = () => { beginSignIn(); router.replace({ pathname: '/sign-in', params: { purpose: 'signIn' } }); };
  const restored = () => { beginPaywall(); router.replace('/paywall'); };
  return <RecoveryScreen onBack={back} onSignIn={signIn} onRestored={restored} onSignedOut={() => { router.dismissAll(); router.replace('/'); }} />;
}
