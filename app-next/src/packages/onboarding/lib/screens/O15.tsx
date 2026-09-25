import { View } from 'react-native';
import { Heading } from '../../../ui';
import { TrendHero } from '../scenes/TrendHero';
import { onboardingCopy as c } from '../onboardingCopy';
export function O15() {
  return (
    <>
      <Heading title={c.O15.title} centered />
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <TrendHero />
      </View>
    </>
  );
}
