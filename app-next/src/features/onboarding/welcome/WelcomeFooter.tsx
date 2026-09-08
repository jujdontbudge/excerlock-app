import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, PressableScale } from '../../../design-system';
import { Reveal } from '../../../motion/Reveal';
import { tokens as t } from '../../../design-system/tokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { onboardingLabels } from '../../../content/onboarding';
import { SignInScreen } from '../../setup/SignInScreen';
import { LegalLinks } from '../../settings/LegalLinks';
import { useRuntime } from '../../../runtime/AppRuntimeProvider';
import { resumeAfterSignIn } from '../../../onboarding/resumeAfterSignIn';
import { Session } from '../../../domain/types';
export function WelcomeFooter({ onContinue }: { onContinue: () => void }) {
  const runtime = useRuntime(),
    [sheet, setSheet] = useState<'signIn' | null>(null),
    [note, setNote] = useState('');
  const signedIn = async (session: Session) => {
    setSheet(null);
    setNote(c.welcomeBack);
    const result = await resumeAfterSignIn(runtime, session);
    setNote(result === 'entitled' ? '' : result === 'noSubscription' ? c.noSubscription : c.signInError);
  };
  return (
    <>
      <Reveal index={4} style={{ gap: t.space.xs }}>
        <PrimaryButton label={onboardingLabels.start} onPress={onContinue} />
        <View style={{ alignItems: 'center' }}>
          <PressableScale label={c.signIn} onPress={() => setSheet('signIn')}>
            <Label variant="support" style={{ textAlign: 'center' }}>
              {c.existing}
              <Label variant="support" style={{ color: t.brand.primary }}>
                {c.signIn}
              </Label>
            </Label>
          </PressableScale>
        </View>
        {note ? <Label accessibilityRole="alert">{note}</Label> : null}
        <LegalLinks lead={c.legalLead} />
      </Reveal>
      <BottomSheet
        open={sheet !== null}
        title={c.signIn}
        onDismiss={() => setSheet(null)}>
        {sheet === 'signIn' ? <SignInScreen onContinue={(session) => void signedIn(session)} /> : null}
      </BottomSheet>
    </>
  );
}
