import { View } from 'react-native';
import { Heading } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { TrendHero } from '../scenes/TrendHero';
import { onboardingCopy as c } from '../../../content/onboarding';
export function O15() {
  return (
    <>
      <Heading title={c.O15.title} support={c.O15.body} centered />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <TrendHero />
      </View>
    </>
  );
}
