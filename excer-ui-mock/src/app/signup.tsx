import { useLocalSearchParams, useRouter, type Href } from 'expo-router';

import { SignupScreen, type SignupFixturePhase } from '@/features/identity';
import { useDemo } from '@/presentation';

const fixturePhases: readonly SignupFixturePhase[] = ['choice', 'email', 'processing', 'success', 'failure'];

export default function SignupRoute() {
  const { fixture, mode, returnTo } = useLocalSearchParams<{ fixture?: string; mode?: string; returnTo?: string }>();
  const router = useRouter();
  const { dispatch } = useDemo();
  const recovery = mode === 'recovery';
  const initialPhase = fixturePhases.includes(fixture as SignupFixturePhase)
    ? fixture as SignupFixturePhase
    : undefined;

  return (
    <SignupScreen
      initialPhase={initialPhase}
      mode={recovery ? 'recovery' : 'postPurchase'}
      onBack={recovery ? () => router.back() : undefined}
      onComplete={() => {
        dispatch({ type: recovery ? 'account/sign-in' : 'account/complete-signup' });
        router.replace(
          recovery && returnTo === 'account'
            ? '/settings/account?recovered=1' as Href
            : '/(tabs)/home',
        );
      }}
      onOpenLegal={(document) => router.push(`/legal/${document}`)}
    />
  );
}
