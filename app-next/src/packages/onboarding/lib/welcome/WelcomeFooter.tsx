import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, PressableScale } from '../../../ui';
import { Reveal } from '../../../ui/Reveal';
import { tokens as t } from '../../../ui/tokens';
import { welcomeCopy as c } from '../welcomeCopy';
import { onboardingLabels } from '../onboardingCopy';
import { SignInScreen } from '../../../identity/SignInScreen';
import { beginOnboarding, verifySelectedAccount } from '../../../journey/index';
import { useRuntime } from '../../../ports/useRuntime';
export function WelcomeFooter({ onContinue }: { onContinue: () => void }) {
  const [signInOpen, setSignInOpen] = useState(false);
  const runtime = useRuntime();
  const router = useRouter();
  const complete = async () => {
    setSignInOpen(false);
    const result = await verifySelectedAccount(runtime);
    if (result === 'paid') router.replace('/setup/X1');
    else if (result === 'unpaid') router.replace('/paywall');
    else router.replace('/sign-in');
  };
  return (
    <>
      <Reveal index={4} style={{ gap: t.space.xs }}>
        <PrimaryButton label={onboardingLabels.start} onPress={() => { beginOnboarding(); onContinue(); }} />
        <View style={{ alignItems: 'center' }}>
          <PressableScale label={c.signIn} onPress={() => setSignInOpen(true)}>
            <Label variant="support" style={{ textAlign: 'center' }}>
              {c.existing}
              <Label variant="support" style={{ color: t.text.primary }}>
                {c.signIn}
              </Label>
            </Label>
          </PressableScale>
        </View>
      </Reveal>
      <BottomSheet open={signInOpen} title={c.signIn} onDismiss={() => setSignInOpen(false)}>
        <SignInScreen onContinue={() => void complete()} signInRequired={true} requireFreshSignIn />
      </BottomSheet>
    </>
  );
}
