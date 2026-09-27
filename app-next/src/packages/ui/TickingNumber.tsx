import { useState } from 'react';
import { View } from 'react-native';
import { useAnimatedReaction } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { useTickingNumber } from './lib/useTickingNumber';
import { useMotion } from './useMotion';
import { Reveal } from './Reveal';
const format = (value: number, precision: number) => value.toFixed(precision).replace(/\.0$/, '');
export function TickingNumber({
  value,
  label,
  delay = 0,
  precision = 0,
  duration,
}: {
  value: number;
  label: string;
  delay?: number;
  precision?: number;
  duration?: number;
}) {
  const m = useMotion(),
    number = useTickingNumber(value, delay, duration),
    factor = 10 ** precision,
    [shown, setShown] = useState(m.reduced ? value : 0);
  useAnimatedReaction(
    () => Math.round(number.get() * factor) / factor,
    (current, previous) => {
      if (current !== previous) scheduleOnRN(setShown, current);
    },
    [factor],
  );
  return (
    <Reveal>
      <View
        accessible
        accessibilityLabel={`${Number(value.toFixed(precision)).toLocaleString('en-US')} ${label}`}
        style={{ alignItems: 'center', gap: t.space.xs }}>
        <Label
          variant="metric"
          maxFontSizeMultiplier={t.a11y.textScale}
          style={{ textAlign: 'center', fontVariant: ['tabular-nums'], marginBottom: -t.space.xl }}>
          {format(shown, precision)}
        </Label>
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {label}
        </Label>
      </View>
    </Reveal>
  );
}
