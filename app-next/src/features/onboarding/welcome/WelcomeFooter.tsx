import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, PressableScale } from '../../../design-system';
import { Reveal } from '../../../motion/Reveal';
import { tokens as t } from '../../../design-system/tokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { onboardingLabels } from '../../../content/onboarding';
import { SignInScreen } from '../../setup/SignInScreen';
import { useSignInRequiredSource } from '../../setup/useSignInRequiredSource';
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
