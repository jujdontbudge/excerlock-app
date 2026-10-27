import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { Label, PrimaryButton, PressableScale } from '../../../ui';
import { Reveal } from '../../../ui/Reveal';
import { tokens as t } from '../../../ui/tokens';
import { welcomeCopy as c } from '../welcomeCopy';
import { onboardingLabels } from '../onboardingCopy';
import { beginOnboarding, beginSignIn } from '../../../journey/index';
export function WelcomeFooter({ onContinue }: { onContinue: () => void }) {
  const router = useRouter();
  return (
    <Reveal index={4} style={{ gap: t.space.xs }}>
      <PrimaryButton label={onboardingLabels.start} onPress={() => { beginOnboarding(); onContinue(); }} />
      <View style={{ alignItems: 'center' }}>
        <PressableScale label={c.signIn} onPress={() => { beginSignIn(); router.replace('/sign-in?purpose=signIn'); }}>
          <Label variant="support" style={{ textAlign: 'center' }}>
            {c.existing}
            <Label variant="support" style={{ color: t.text.primary }}>
              {c.signIn}
            </Label>
          </Label>
        </PressableScale>
      </View>
    </Reveal>
  );
}
