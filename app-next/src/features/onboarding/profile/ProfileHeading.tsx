import { View } from 'react-native';
import { Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { profileTokens as p } from '../../../design-system/profileTokens';
import { onboardingCopy as c } from '../../../content/onboarding';
import { Reveal } from '../../../motion/Reveal';
export function ProfileHeading({ step }: { step: 'O04' | 'O05' | 'O06' | 'O07' }) {
  const copy = c[step];
  const title =
    step === 'O04'
      ? copy.title.replace(' we', '\nwe')
      : step === 'O05'
        ? copy.title.replace(' about', '\nabout')
        : copy.title;
  return (
    <Reveal>
      <View style={{ gap: t.space.md }}>
        <Label
          accessibilityRole="header"
          accessibilityLabel={copy.title}
          style={step === 'O04' || step === 'O05' ? p.largeTitle : p.title}>
          {title}
        </Label>

      </View>
    </Reveal>
  );
}
