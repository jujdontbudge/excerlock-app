import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
import { useSolidChoices } from './ChoiceAppearance';
export function Heading({
  title,
  support,
  variant = 'question',
  centered = false,
}: {
  title: string;
  support?: string;
  variant?: 'hero' | 'question' | 'section';
  centered?: boolean;
}) {
  const setupScreen = useSolidChoices();
  const alignCenter = centered || title.trim().endsWith('?');
  return (
    <Reveal>
      <View style={{ gap: t.space.xs }}>
        <Label
          accessibilityLabel={title.replace(/\s+/g, ' ')}
          accessibilityRole="header"
          variant={variant}
          style={{ textAlign: alignCenter ? 'center' : 'left' }}>
          {title}
        </Label>
        {support && !setupScreen ? (
          <Label style={{ textAlign: alignCenter ? 'center' : 'left' }}>
            {support}
          </Label>
        ) : null}
      </View>
    </Reveal>
  );
}
