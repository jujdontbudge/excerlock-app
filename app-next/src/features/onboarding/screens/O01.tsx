import { View } from 'react-native';
import { Heading, ScheduleWidget } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
export function O01() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxl }}>
      <LivingIcon name="gym" />
      <ScheduleWidget start={c.introStart} end={c.introEnd} status={c.introStatus} />
      <Reveal index={2}>
        <Heading
          {...{ title: onboardingCopy.O01.title.replace('. ', '.\n'), support: onboardingCopy.O01.body }}
          centered
          variant="hero"
        />
      </Reveal>
    </View>
  );
}
