import { View } from 'react-native';
import { Heading, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { LivingIcon } from '../../../motion/LivingIcon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
export function O19() {
  return (
    <>
      <Heading title={onboardingCopy.O19.title} support={onboardingCopy.O19.body} />
      <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxxl }}>
        {c.principles.map((row, index) => (
          <Reveal key={row.title} index={index}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.xl }}>
              <LivingIcon name={row.icon} size={t.space.huge} />
              <View style={{ flex: 1, gap: t.space.sm }}>
                <Label variant="section">{row.title}</Label>
                <Label tone="secondary">{row.body}</Label>
              </View>
            </View>
          </Reveal>
        ))}
      </View>
    </>
  );
}
