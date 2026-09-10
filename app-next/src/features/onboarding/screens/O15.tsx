import { View } from 'react-native';
import { Heading, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { TrendHero } from '../scenes/TrendHero';
import { onboardingCopy as c } from '../../../content/onboarding';
export function O15() {
  return (
    <>
      <Heading title={c.O15.title} centered />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <TrendHero />
      </View>
      {/* The promise closes the screen in the same weight as the title. */}
      <Label variant="question" style={{ textAlign: 'center', paddingHorizontal: t.space.md }}>
        {c.O15.body}
      </Label>
    </>
  );
}
