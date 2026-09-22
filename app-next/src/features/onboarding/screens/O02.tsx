import { View, useWindowDimensions } from 'react-native';
import { Heading, Label } from '../../../design-system';
import { tokens as t } from '../../../design-system/tokens';
import { Reveal } from '../../../motion/Reveal';
import { ProgressArtwork } from '../progress/ProgressArtwork';
import { welcomeTokens as w } from '../../../design-system/welcomeTokens';
import { welcomeCopy } from '../../../content/welcome';
import { onboardingCopy as c } from '../../../content/onboarding';
export function O02() {
  const { fontScale } = useWindowDimensions();
  const dots = (
    <View accessible accessibilityLabel={welcomeCopy.progressPagination} style={{ flexDirection: 'row', gap: t.space.sm }}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={{
            width: t.layout.dot,
            height: t.layout.dot,
            borderRadius: t.radius.pill,
            backgroundColor: i === 1 ? t.brand.primary : t.border.divider,
          }}
        />
      ))}
    </View>
  );
  return (
    <View style={{ flexGrow: 1, paddingTop: w.headingTop / Math.max(1, fontScale) }}>
      <Heading title={c.O02.title.replace('. ', '.\n')} centered variant="display" />
      {/* Artwork centres in the space under the heading; caption and dots ride just above the button. */}
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: w.progress.gap }}>
        <ProgressArtwork />
      </View>
      <Reveal index={3} style={{ marginTop: w.progress.captionGap, paddingHorizontal: t.space.xxl }}>
        <Label style={{ ...t.type.section, color: t.text.primary, textAlign: 'center' }}>
          {c.O02.body}
        </Label>
      </Reveal>
      <Reveal index={4} style={{ marginTop: w.dotsGap - t.space.lg, alignItems: 'center' }}>
        {dots}
      </Reveal>
    </View>
  );
}
