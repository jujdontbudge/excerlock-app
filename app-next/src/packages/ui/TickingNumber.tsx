import { TextInput, View } from 'react-native';
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { tokens as t } from './tokens';
import { Label } from './Label';
import { useTickingNumber } from './lib/useTickingNumber';
import { Reveal } from './Reveal';
const NumberInput = Animated.createAnimatedComponent(TextInput);
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
  const number = useTickingNumber(value, delay, duration),
    props = useAnimatedProps(() => ({
      text: number.get().toFixed(precision).replace(/\.0$/, ''),
      defaultValue: number.get().toFixed(precision).replace(/\.0$/, ''),
    }));
  return (
    <Reveal>
      <View
        accessible
        accessibilityLabel={`${Number(value.toFixed(precision)).toLocaleString('en-US')} ${label}`}
        style={{ alignItems: 'center', gap: t.space.sm }}>
        <NumberInput
          editable={false}
          pointerEvents="none"
          accessible={false}
          allowFontScaling
          maxFontSizeMultiplier={t.a11y.textScale}
          defaultValue={value.toFixed(precision).replace(/\.0$/, '')}
          animatedProps={props}
          style={[t.type.metric, { color: t.text.primary, textAlign: 'center', padding: 0, width: '100%' }]}
        />
        <Label tone="secondary" style={{ textAlign: 'center' }}>
          {label}
        </Label>
      </View>
    </Reveal>
  );
}
