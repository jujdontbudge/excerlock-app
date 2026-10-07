import { View, useWindowDimensions } from 'react-native';
import { Heading, Label } from '../../../ui';
import { tokens as t } from '../../../ui/tokens';
import { Reveal } from '../../../ui/Reveal';
import { illustrationTokens as art } from '../../../ui/illustrationTokens';
import { ProgressArtwork } from '../progress/ProgressArtwork';
import { welcomeCopy } from '../welcomeCopy';
import { onboardingCopy as c } from '../onboardingCopy';
export function O03() {
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
            backgroundColor: i === 2 ? t.brand.primary : t.border.divider,
          }}
        />
      ))}
    </View>
  );
  return (
    <View style={{ flexGrow: 1, paddingTop: t.space.xl / Math.max(1, fontScale) }}>
      <Heading title={c.O03.title.replace('. ', '.\n')} centered variant="display" />
      <View style={{ flex: 1, justifyContent: 'center', paddingTop: art.welcome.gap.progress }}>
        <ProgressArtwork />
      </View>
      <Reveal index={3} style={{ marginTop: t.space.xl, paddingHorizontal: t.space.lg }}>
        <Label style={{ ...t.type.section, color: t.text.primary, textAlign: 'center' }}>
          {c.O03.body}
        </Label>
      </Reveal>
      <Reveal index={4} style={{ marginTop: art.welcome.gap.dots, alignItems: 'center' }}>
        {dots}
      </Reveal>
    </View>
  );
}
