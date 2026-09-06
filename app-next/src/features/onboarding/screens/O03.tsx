import { View } from 'react-native';
import { Heading, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Icon, IconName } from '../../../icons/Icon';
import { LivingIcon } from '../../../motion/LivingIcon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy, onboardingLabels as c } from '../../../content/onboarding';
export function O03() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', gap: t.space.xxl }}>
      <LivingIcon name="lock-open" size={t.layout.logo} />
      {[
        { icon: 'clock', label: c.yourSchedule },
        { icon: 'walking', label: c.yourExercise },
        { icon: 'shield', label: c.yourApps },
      ].map((row, i) => (
        <Reveal key={row.label} index={i + 1}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: t.space.lg,
              padding: t.space.lg,
              borderRadius: t.radius.card,
              borderWidth: t.stroke.hairline,
              borderColor: t.border.default,
            }}>
            <Icon name={row.icon as IconName} />
            <Label variant="label">{row.label}</Label>
          </View>
        </Reveal>
      ))}
      <Reveal index={4}>
        <Heading title={onboardingCopy.O03.title} support={onboardingCopy.O03.body} centered variant="hero" />
      </Reveal>
    </View>
  );
}
