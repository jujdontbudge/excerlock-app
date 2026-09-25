import { View } from 'react-native';
import { Heading, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { onboardingCopy } from '../../../content/onboarding';
import { welcomeCopy } from '../../../content/welcome';
import { illustrationTokens as art } from '../../../design-system/illustrationTokens';
import { WelcomeArtwork } from '../welcome/WelcomeArtwork';
export function O01() {
  return (
    <View style={{ flexGrow: 1, paddingTop: t.space.xl }}>
      <Heading title={onboardingCopy.O01.title.replace('. ', '.\n')} centered variant="display" />
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: art.welcome.gap.hero }}>
        <WelcomeArtwork />
      </View>
      <Reveal index={3} style={{ marginTop: t.space.xl }}>
        <Label style={{ ...t.type.section, color: t.text.primary, textAlign: 'center' }}>
          {onboardingCopy.O01.body}
        </Label>
      </Reveal>
      <Reveal index={4} style={{ marginTop: art.welcome.gap.dots, alignItems: 'center' }}>
        <View accessible accessibilityLabel={welcomeCopy.pagination} style={{ flexDirection: 'row', gap: t.space.sm }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                width: t.layout.dot,
                height: t.layout.dot,
                borderRadius: t.radius.pill,
                backgroundColor: i === 0 ? t.brand.primary : t.border.divider,
              }}
            />
          ))}
        </View>
      </Reveal>
    </View>
  );
}
