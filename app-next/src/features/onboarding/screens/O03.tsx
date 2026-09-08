import { View, useWindowDimensions } from 'react-native';
import { Heading, Label, PressableScale } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { ControlArtwork } from '../control/ControlArtwork';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy } from '../../../content/welcome';
import { onboardingCopy as c } from '../../../content/onboarding';
export function O03({ onBack }: { onBack?: () => void }) {
  const { fontScale } = useWindowDimensions();
  const dots = (
    <View accessibilityLabel={welcomeCopy.controlPagination} style={{ flexDirection: 'row', gap: t.space.sm }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: t.layout.dot,
            height: t.layout.dot,
            borderRadius: t.radius.pill,
            backgroundColor: i === 2 ? t.brand.primary : t.border.default,
          }}
        />
      ))}
    </View>
  );
  return (
    <View style={{ flexGrow: 1, paddingTop: w.headingTop / Math.max(1, fontScale) }}>
      <Heading title={c.O03.title} centered variant="hero" />
      <View style={{ marginTop: w.control.gap }}>
        <ControlArtwork />
      </View>
      <Reveal index={3} style={{ marginTop: w.control.captionGap, paddingHorizontal: t.space.xxl }}>
        <Label variant="support" style={{ textAlign: 'center', maxWidth: w.control.captionWidth, alignSelf: 'center' }}>
          {c.O03.body}
        </Label>
      </Reveal>
      <Reveal index={4} style={{ marginTop: w.dotsGap - t.space.lg, alignItems: 'center' }}>
        {onBack ? (
          <PressableScale
            label={welcomeCopy.back}
            onPress={onBack}
            style={{ minWidth: t.layout.touch, alignItems: 'center' }}>
            {dots}
          </PressableScale>
        ) : (
          dots
        )}
      </Reveal>
    </View>
  );
}
