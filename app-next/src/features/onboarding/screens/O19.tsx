import { View } from 'react-native';
import { Heading, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Icon } from '../../../icons/Icon';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy, onboardingLabels } from '../../../content/onboarding';

export function O19() {
  return (
    <>
      <Heading title={onboardingCopy.O19.title} />
      <View style={{ gap: t.space.xl }}>
        {onboardingLabels.principles.map((principle, index) => (
          <Reveal key={principle.title} index={index + 1}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.space.lg }}>
              <Icon name={principle.icon} label={principle.title} size={t.layout.glyph} tint={t.brand.primary} />
              <View style={{ flex: 1, gap: t.space.xs }}>
                <Label variant="label">{principle.title}</Label>
                <Label variant="support" tone="secondary">
                  {principle.body}
                </Label>
              </View>
            </View>
          </Reveal>
        ))}
      </View>
    </>
  );
}
