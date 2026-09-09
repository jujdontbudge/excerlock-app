import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Label, PrimaryButton, PressableScale } from '../../../design-system';
import { Reveal } from '../../../motion/Reveal';
import { feedback } from '../../../motion/haptics';
import { tokens as t } from '../../../design-system/tokens';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy as c } from '../../../content/welcome';
import { onboardingLabels } from '../../../content/onboarding';
import { SignInScreen } from '../../setup/SignInScreen';
import { LegalScreen } from '../../settings/LegalScreen';
export function WelcomeFooter({ onContinue }: { onContinue: () => void }) {
  const [sheet, setSheet] = useState<'signIn' | 'privacy' | 'terms' | null>(null);
  const show = (next: typeof sheet) => {
    feedback();
    setSheet(next);
  };
  return (
    <>
      <Reveal index={4} style={{ gap: t.space.xs }}>
        <PrimaryButton label={onboardingLabels.start} onPress={onContinue} />
        <View style={{ alignItems: 'center' }}>
          <PressableScale label={c.signIn} onPress={() => setSheet('signIn')}>
            <Label variant="support" style={{ textAlign: 'center' }}>
              {c.existing}
              <Label variant="support" style={{ color: t.text.primary }}>
                {c.signIn}
              </Label>
            </Label>
          </PressableScale>
        </View>
        <Label style={{ ...w.type.legal, color: t.text.muted, textAlign: 'center' }}>
          {c.legalLead}
          <Label
            accessibilityRole="button"
            accessibilityLabel={c.privacy}
            onPress={() => show('privacy')}
            style={w.type.legal}>
            {c.privacy}
          </Label>
          {c.and}
          <Label
            accessibilityRole="button"
            accessibilityLabel={c.terms}
            onPress={() => show('terms')}
            style={w.type.legal}>
            {c.terms}
          </Label>
        </Label>
      </Reveal>
      <BottomSheet
        open={sheet !== null}
        title={sheet === 'signIn' ? c.signIn : c.legalTitle}
        onDismiss={() => setSheet(null)}>
        {sheet === 'signIn' ? <SignInScreen onContinue={() => setSheet(null)} /> : null}
        {sheet === 'privacy' || sheet === 'terms' ? <LegalScreen doc={sheet} /> : null}
      </BottomSheet>
    </>
  );
}
