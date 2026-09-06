import { View } from 'react-native';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { TrendHero } from '../scenes/TrendHero';
import { onboardingCopy as c } from '../../../content/onboarding';
export function O02() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxxl }}>
      <TrendHero />
      <Reveal index={2}>
        <Heading title={c.O02.title} support={c.O02.body} centered variant="hero" />
      </Reveal>
    </View>
  );
}
