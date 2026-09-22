import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
import { useSolidChoices } from './ChoiceAppearance';
export function Heading({
  title,
  support,
  variant = 'display',
  centered = false,
}: {
  title: string;
  support?: string;
  variant?: 'display' | 'section';
  centered?: boolean;
}) {
  const setupScreen = useSolidChoices();
  const alignCenter = centered;
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
