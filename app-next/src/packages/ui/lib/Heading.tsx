import { Text, View } from 'react-native';
import { Label } from '../Label';
import { tokens as t } from '../tokens';
import { Reveal } from '../Reveal';
import { useSetupPresentation } from '../SetupPresentation';
export function Heading({
  title,
  support,
  variant = 'display',
  centered = false,
  accent,
}: {
  title: string;
  support?: string;
  variant?: 'display' | 'section';
  centered?: boolean;
  accent?: string;
}) {
  const setupScreen = useSetupPresentation();
  const alignCenter = centered;
  const accentStart = accent ? title.indexOf(accent) : -1;
  return (
    <Reveal>
      <View style={{ gap: t.space.xs }}>
        <Label
          accessibilityLabel={title.replace(/\s+/g, ' ')}
          accessibilityRole="header"
          variant={variant}
          style={{ textAlign: alignCenter ? 'center' : 'left' }}>
          {accentStart < 0 ? title : <>{title.slice(0, accentStart)}<Text style={{ color: t.brand.primary }}>{accent}</Text>{title.slice(accentStart + accent!.length)}</>}
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
