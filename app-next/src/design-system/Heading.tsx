import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
export function Heading({
  title,
  support,
  variant = 'question',
  centered = false,
}: {
  title: string;
  support?: string;
  variant?: 'hero' | 'question';
  centered?: boolean;
}) {
  return (
    <Reveal>
      <View style={{ gap: t.space.md }}>
        <Label accessibilityRole="header" variant={variant} style={{ textAlign: centered ? 'center' : 'left' }}>
          {title}
        </Label>
        {support ? (
          <Label tone="secondary" style={{ textAlign: centered ? 'center' : 'left' }}>
            {support}
          </Label>
        ) : null}
      </View>
    </Reveal>
  );
}
