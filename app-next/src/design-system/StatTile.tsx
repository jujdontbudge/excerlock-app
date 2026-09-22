import { View } from 'react-native';
import { Label } from './Label';
import { tokens as t } from './tokens';
import { Reveal } from '../motion/Reveal';
export function StatTile({ label, value, support }: { label: string; value: string; support?: string }) {
  return (
    <Reveal style={{ flex: 1 }}>
      <View
        style={{
          padding: t.space.lg,
          borderRadius: t.radius.card,
          borderWidth: t.stroke.hairline,
          borderColor: t.border.outline,
          gap: t.space.sm,
        }}>
        <Label variant="support" tone="secondary">
          {label}
        </Label>
        <Reveal key={value}>
          <Label variant="metricSmall">{value}</Label>
        </Reveal>
        {support ? (
          <Label variant="support" tone="secondary">
            {support}
          </Label>
        ) : null}
      </View>
    </Reveal>
  );
}
