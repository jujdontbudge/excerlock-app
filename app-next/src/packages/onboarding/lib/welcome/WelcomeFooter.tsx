import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, PressableScale } from '../../../ui';
import { Reveal } from '../../../ui/Reveal';
import { tokens as t } from '../../../ui/tokens';
import { welcomeCopy as c } from '../welcomeCopy';
import { onboardingLabels } from '../onboardingCopy';
import { SignInScreen } from '../../../identity/SignInScreen';
import { useSignInRequiredSource } from '../../../identity/useSignInRequiredSource';
export function WelcomeFooter({ onContinue }: { onContinue: () => void }) {
  const signInRequired = useSignInRequiredSource();
  const [signInOpen, setSignInOpen] = useState(false);
  return (
    <>
      <Reveal index={4} style={{ gap: t.space.xs }}>
        <PrimaryButton label={onboardingLabels.start} onPress={onContinue} />
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
        <SignInScreen onContinue={() => setSignInOpen(false)} signInRequired={signInRequired} />
      </BottomSheet>
    </>
  );
}
