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
  return (
    <Reveal>
      <View style={{ gap: t.space.xs }}>
        <Label
          accessibilityLabel={title.replace(/\s+/g, ' ')}
          accessibilityRole="header"
          variant={variant}
          style={{ textAlign: centered ? 'center' : 'left' }}>
          {title}
        </Label>
        {support && !setupScreen ? (
          <Label tone="secondary" style={{ textAlign: centered ? 'center' : 'left' }}>
            {support}
          </Label>
        ) : null}
      </View>
    </Reveal>
  );
}
