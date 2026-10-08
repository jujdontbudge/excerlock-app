import { View } from 'react-native';
import { Label } from '../../ui/Label';
import { Reveal } from '../../ui/Reveal';
import { tokens as t } from '../../ui/tokens';
import { HotWord } from './HotWord';
import { headlineLook } from './PaywallHeadline';
import { paywallCopy as copy } from './paywallCopy';

const wordGap = t.space.xs + t.stroke.hairline,
  shineAfterHeadline = headlineLook.landing * 6,
  shineStagger = headlineLook.landing * 2;

export function PaywallTagline() {
  const hotWords: readonly string[] = copy.tagline.hot;
  return (
    <Reveal index={2}>
      <View accessible accessibilityLabel={copy.tagline.text} style={{ alignItems: 'center' }}>
        {copy.tagline.lines.map((line) => (
          <View key={line} style={{ flexDirection: 'row', justifyContent: 'center', columnGap: wordGap }}>
            {line.split(' ').map((word, index) =>
              hotWords.includes(word) ? (
                <HotWord
                  key={index}
                  text={word}
                  variant="label"
                  style={{ fontFamily: t.font.extraBold }}
                  glow={headlineLook.glow / 2}
                  shineDelay={shineAfterHeadline + hotWords.indexOf(word) * shineStagger}
                />
              ) : (
                <Label key={index} variant="label" accessible={false} style={{ textAlign: 'center' }}>
                  {word}
                </Label>
              ),
            )}
          </View>
        ))}
      </View>
    </Reveal>
  );
}
