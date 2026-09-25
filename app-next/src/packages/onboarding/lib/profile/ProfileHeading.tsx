import { View } from 'react-native';
import { Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { onboardingCopy as c } from '../onboardingCopy';
import { Reveal } from '../../../ui/Reveal';
export function ProfileHeading({ step }: { step: 'O04' | 'O05' | 'O06' }) {
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
          variant="display"
          style={{ width: '100%', textAlign: 'center' }}>
          {title}
        </Label>

      </View>
    </Reveal>
  );
}
